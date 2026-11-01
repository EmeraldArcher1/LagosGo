const { rankDrivers } = require('../../lib/dispatch');

const MAX_RIDES_PER_RUN = 20;
const MAX_CANDIDATES_PER_RIDE = 25;
const MAX_DRIVER_AGE_MS = 3 * 60 * 1000;
const MAX_PICKUP_RADIUS_KM = 5;

function haversineKm(aLat, aLng, bLat, bLng) {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function routeMatrixRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.elements)) return payload.elements;
  return [];
}

async function fetchRouteMatrix(drivers, ride, apiKey) {
  const response = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition'
    },
    body: JSON.stringify({
      origins: drivers.map(driver => ({
        waypoint: { location: { latLng: {
          latitude: driver.last_location_latitude,
          longitude: driver.last_location_longitude
        } } }
      })),
      destinations: [{ waypoint: { location: { latLng: {
        latitude: ride.pickup_latitude,
        longitude: ride.pickup_longitude
      } } } }],
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      units: 'METRIC'
    })
  });
  if (!response.ok) throw new Error('google_route_matrix_' + response.status);
  return routeMatrixRows(await response.json());
}

function secondsFromDuration(value) {
  const parsed = Number.parseFloat(String(value || '').replace(/s$/, ''));
  return Number.isFinite(parsed) ? Math.ceil(parsed) : null;
}

async function restRequest(base, serviceKey, path, options = {}) {
  const response = await fetch(base + path, {
    method: options.method || 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
      ...(options.prefer ? { Prefer: options.prefer } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = raw; }
  if (!response.ok) {
    const error = new Error('supabase_rest_' + response.status);
    error.details = data;
    throw error;
  }
  return data;
}

function createHandler(deps = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'method_not_allowed' });
    }
    const secret = process.env.LAGOSGO_DISPATCH_CRON_SECRET;
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!secret || supplied !== secret) return res.status(401).json({ error: 'unauthorized' });

    const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!base || !serviceKey || !mapsKey) {
      return res.status(503).json({ error: 'dispatch_not_configured', missing: [
        ...(!base ? ['SUPABASE_URL'] : []),
        ...(!serviceKey ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
        ...(!mapsKey ? ['GOOGLE_MAPS_SERVER_KEY'] : [])
      ] });
    }

    const rest = (path, options) => restRequest(base, serviceKey, path, options);
    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() - MAX_DRIVER_AGE_MS).toISOString();
      const rideQuery = '/rest/v1/rides?select=id,passenger_user_id,pickup_latitude,pickup_longitude,destination_latitude,destination_longitude,ride_fare_offers!inner(id,offered_by,amount_kobo,status,expires_at)&status=eq.requested&driver_user_id=is.null&ride_fare_offers.status=eq.pending&ride_fare_offers.expires_at=gt.' + encodeURIComponent(now.toISOString()) + '&order=requested_at.asc&limit=' + MAX_RIDES_PER_RUN;
      const rides = await rest(rideQuery);
      if (!Array.isArray(rides) || rides.length === 0) return res.status(200).json({ ok: true, processed: 0, offers_created: 0 });

      const driverQuery = '/rest/v1/driver_profiles?select=user_id,last_location_latitude,last_location_longitude,location_updated_at,vehicles!inner(review_status)&review_status=eq.approved&is_online=eq.true&location_updated_at=gte.' + encodeURIComponent(cutoff) + '&vehicles.review_status=eq.approved&limit=500';
      const [driverRows, busyRows, attemptRows] = await Promise.all([
        rest(driverQuery),
        rest('/rest/v1/rides?select=driver_user_id&status=in.(accepted,driver_en_route,arrived,in_progress)&driver_user_id=not.is.null&limit=1000'),
        rest('/rest/v1/ride_dispatch_offers?select=ride_id,driver_user_id,created_at&created_at=gte.' + encodeURIComponent(new Date(now.getTime() - 86400000).toISOString()) + '&limit=5000')
      ]);

      const busy = new Set((busyRows || []).map(row => row.driver_user_id));
      const attemptsByRide = new Map();
      const recentOfferCounts = new Map();
      for (const attempt of attemptRows || []) {
        if (!attemptsByRide.has(attempt.ride_id)) attemptsByRide.set(attempt.ride_id, new Set());
        attemptsByRide.get(attempt.ride_id).add(attempt.driver_user_id);
        recentOfferCounts.set(attempt.driver_user_id, (recentOfferCounts.get(attempt.driver_user_id) || 0) + 1);
      }
      const drivers = (driverRows || []).filter(row =>
        row.last_location_latitude !== null && row.last_location_longitude !== null &&
        !busy.has(row.user_id) &&
        (!row.vehicles || row.vehicles.some(vehicle => vehicle.review_status === 'approved'))
      );

      let offersCreated = 0;
      const results = [];
      for (const ride of rides) {
        const passengerOffer = (ride.ride_fare_offers || [])
          .filter(offer => offer.offered_by === ride.passenger_user_id && offer.status === 'pending')
          .sort((a, b) => new Date(b.expires_at) - new Date(a.expires_at))[0];
        if (!passengerOffer) continue;

        const attempted = attemptsByRide.get(ride.id) || new Set();
        const nearby = drivers.filter(driver =>
          !attempted.has(driver.user_id) &&
          haversineKm(driver.last_location_latitude, driver.last_location_longitude,
            ride.pickup_latitude, ride.pickup_longitude) <= MAX_PICKUP_RADIUS_KM
        ).slice(0, MAX_CANDIDATES_PER_RIDE);
        if (!nearby.length) {
          results.push({ ride_id: ride.id, result: 'no_eligible_driver_in_radius' });
          continue;
        }

        const matrix = await fetchRouteMatrix(nearby, ride, mapsKey);
        const byIndex = new Map(matrix.map(row => [Number(row.originIndex), row]));
        const candidates = nearby.map((driver, index) => {
          const route = byIndex.get(index);
          const etaSeconds = route && route.condition === 'ROUTE_EXISTS' ? secondsFromDuration(route.duration) : null;
          const distanceMeters = route && Number(route.distanceMeters);
          if (!etaSeconds || !Number.isFinite(distanceMeters) || etaSeconds > 25 * 60 || distanceMeters <= 0) return null;
          const attemptCount = recentOfferCounts.get(driver.user_id) || 0;
          return {
            driverId: driver.user_id,
            roadEtaMinutes: etaSeconds / 60,
            qualityRating: 3,
            fairnessScore: Math.max(0, 1 - attemptCount / 20),
            reliabilityScore: 0.5,
            directionScore: 0.5,
            isOnline: true,
            isAvailable: true,
            driverApproved: true,
            vehicleApproved: true,
            documentsCurrent: true,
            inServiceZone: true,
            locationUpdatedAt: new Date(driver.location_updated_at).getTime(),
            roadEtaSeconds: etaSeconds,
            routeDistanceMeters: Math.round(distanceMeters)
          };
        }).filter(Boolean);
        const ranked = rankDrivers(candidates);
        if (!ranked.length) {
          results.push({ ride_id: ride.id, result: 'no_route_eligible_driver' });
          continue;
        }
        const best = ranked[0];
        const created = await rest('/rest/v1/rpc/lagosgo_dispatch_create_offer', {
          method: 'POST',
          body: {
            p_ride_id: ride.id,
            p_driver_user_id: best.driverId,
            p_road_eta_seconds: best.roadEtaSeconds,
            p_route_distance_meters: best.routeDistanceMeters,
            p_dispatch_score: Number(best.dispatchScore.toFixed(6))
          }
        });
        if (created && created.created) offersCreated += 1;
        results.push({ ride_id: ride.id, result: created && created.reason || 'offer_created', offer_id: created && created.offer_id || null });
      }

      return res.status(200).json({ ok: true, processed: rides.length, offers_created: offersCreated, results });
    } catch (error) {
      return res.status(502).json({ error: 'dispatch_worker_failed', detail: error.message });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.haversineKm = haversineKm;
module.exports.routeMatrixRows = routeMatrixRows;
module.exports.secondsFromDuration = secondsFromDuration;

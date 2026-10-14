module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return res.status(503).json({ error: "maps_not_configured", message: "Route services are not configured yet." });
  const body = req.body || {};
  const pickup = typeof body.pickup === "string" ? body.pickup.trim().slice(0, 250) : "";
  const destination = typeof body.destination === "string" ? body.destination.trim().slice(0, 250) : "";
  const coords = body.pickupCoordinates;
  const destinationCoords = body.destinationCoordinates;
  const validCoords = coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude) &&
    Math.abs(coords.latitude) <= 90 && Math.abs(coords.longitude) <= 180;
  const validDestinationCoords = destinationCoords && Number.isFinite(destinationCoords.latitude) && Number.isFinite(destinationCoords.longitude) &&
    Math.abs(destinationCoords.latitude) <= 90 && Math.abs(destinationCoords.longitude) <= 180;
  if ((!pickup && !validCoords) || (!destination && !validDestinationCoords)) {
    return res.status(400).json({ error: "missing_locations", message: "Enter both pickup and destination." });
  }
  const origin = validCoords
    ? { location: { latLng: { latitude: coords.latitude, longitude: coords.longitude } } }
    : { address: pickup };
  const lowerDestination = destination.toLowerCase();
  const destinationAddress = lowerDestination.includes("lagos") || lowerDestination.includes("nigeria") ? destination : destination + ", Lagos, Nigeria";
  const destinationInput = validDestinationCoords
    ? { location: { latLng: { latitude: destinationCoords.latitude, longitude: destinationCoords.longitude } } }
    : { address: destinationAddress };
  try {
    const upstream = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction.instructions,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.startLocation,routes.legs.endLocation"
      },
      body: JSON.stringify({
        origin,
        destination: destinationInput,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        departureTime: new Date().toISOString(),
        languageCode: "en",
        units: "METRIC"
      })
    });
    const data = await upstream.json();
    if (!upstream.ok || !Array.isArray(data.routes) || !data.routes[0]) {
      return res.status(422).json({ error: "route_unavailable", message: "We couldn't calculate this route. Check the locations or try a nearby landmark." });
    }
    const route = data.routes[0];
    const leg = (route.legs || [])[0] || {};
    const durationSeconds = Number.parseInt(String(route.duration || "").replace("s", ""), 10);
    return res.status(200).json({
      distanceMeters: route.distanceMeters,
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      polyline: route.polyline && route.polyline.encodedPolyline || null,
      originLocation: leg.startLocation && leg.startLocation.latLng || null,
      destinationLocation: leg.endLocation && leg.endLocation.latLng || null,
      steps: (leg.steps || []).slice(0, 80).map(step => ({
        instruction: step.navigationInstruction && step.navigationInstruction.instructions || "Continue on the route",
        distanceMeters: step.distanceMeters || 0,
        duration: step.staticDuration || null
      }))
    });
  } catch (_error) {
    return res.status(502).json({ error: "routing_provider_unavailable", message: "The route service is temporarily unavailable." });
  }
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return res.status(503).json({ error: "maps_not_configured", message: "Landmark search is not configured yet." });
  const body = req.body || {};
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: "invalid_coordinates" });
  }
  try {
    const upstream = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.primaryType,places.formattedAddress,places.googleMapsUri,places.location"
      },
      body: JSON.stringify({
        includedTypes: ["tourist_attraction", "museum", "park", "shopping_mall", "university", "place_of_worship"],
        maxResultCount: 6,
        rankPreference: "DISTANCE",
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 2200 } },
        languageCode: "en"
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(502).json({ error: "landmark_search_failed", message: "Nearby landmarks could not be loaded." });
    const places = (data.places || []).map(place => ({
      name: place.displayName && place.displayName.text || "Local place",
      type: (place.primaryType || "point of interest").replace(/_/g, " "),
      address: place.formattedAddress || "",
      url: place.googleMapsUri || null,
      location: place.location || null
    }));
    return res.status(200).json({ places });
  } catch (_error) {
    return res.status(502).json({ error: "landmark_provider_unavailable", message: "Landmark search is temporarily unavailable." });
  }
};

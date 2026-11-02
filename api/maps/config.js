module.exports = function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const key = process.env.GOOGLE_MAPS_BROWSER_KEY || "";
  const rideMutationsEnabled = process.env.VERCEL_ENV === "production" &&
    process.env.LAGOSGO_RIDE_MUTATIONS_ENABLED === "true";
  return res.status(200).json({
    configured: Boolean(key),
    browserKey: key || null,
    rideMutationsEnabled
  });
};

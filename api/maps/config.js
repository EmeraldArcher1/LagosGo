module.exports = function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const key = process.env.GOOGLE_MAPS_BROWSER_KEY || "";
  return res.status(200).json({ configured: Boolean(key), browserKey: key || null });
};

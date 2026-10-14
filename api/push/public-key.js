module.exports = function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // Do not expose a public key or prompt for notification permission until
  // the complete authenticated subscription and delivery flow is enabled.
  return res.status(503).json({
    error: "push_not_configured",
    message: "LagosGo ride alerts are not configured."
  });
};

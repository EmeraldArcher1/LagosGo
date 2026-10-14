module.exports = function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // Fail closed until authenticated accounts, durable subscription storage,
  // VAPID credentials, and an event-driven delivery worker are configured.
  return res.status(503).json({
    enabled: false,
    reason: "push_backend_not_configured",
    message: "Ride alerts are not enabled yet."
  });
};

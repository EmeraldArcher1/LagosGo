module.exports = function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (_req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  // Intentionally fail closed: no account-authentication provider or durable
  // subscription store is connected yet. Never accept and discard subscriptions.
  return res.status(503).json({
    error: "push_not_configured",
    message: "Ride alerts cannot be saved until account authentication and durable storage are configured."
  });
};

module.exports = async function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !publishableKey || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
    return res.status(503).json({ error: "auth_not_configured" });
  }
  return res.status(200).json({ url, publishableKey });
};
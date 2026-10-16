const { getAuthenticatedUser } = require("../_lib/supabase-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    const user = await getAuthenticatedUser(req);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const profileResponse = await fetch(
      url + "/rest/v1/profiles?select=role,display_name&id=eq." + encodeURIComponent(user.id),
      { headers: { apikey: key, Authorization: req.headers.authorization, Accept: "application/json" }, cache: "no-store" }
    );
    if (!profileResponse.ok) return res.status(502).json({ error: "profile_lookup_failed" });
    const profiles = await profileResponse.json();
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile) return res.status(403).json({ error: "profile_not_available" });
    return res.status(200).json({ id: user.id, email: user.email || null, role: profile.role, displayName: profile.display_name || null });
  } catch (error) {
    return res.status(error.statusCode || 502).json({ error: error.statusCode === 401 ? "unauthorized" : error.statusCode === 503 ? "auth_not_configured" : "auth_check_failed" });
  }
};
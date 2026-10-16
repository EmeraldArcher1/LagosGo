const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

async function getAuthenticatedUser(req) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const error = new Error("Authentication is not configured.");
    error.statusCode = 503;
    throw error;
  }
  const header = req.headers && req.headers.authorization;
  const match = typeof header === "string" && header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("Sign in is required.");
    error.statusCode = 401;
    throw error;
  }
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + match[1] },
    cache: "no-store"
  });
  if (!response.ok) {
    const error = new Error("Your session is invalid or expired.");
    error.statusCode = 401;
    throw error;
  }
  return response.json();
}

module.exports = { getAuthenticatedUser };
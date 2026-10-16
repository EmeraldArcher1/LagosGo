const test = require("node:test");
const assert = require("node:assert/strict");

function responseMock() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}
async function invoke(handler, req) {
  const res = responseMock();
  await handler(req, res);
  return res;
}

const original = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
};
process.env.SUPABASE_URL = "https://example-project.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";
delete process.env.SUPABASE_ANON_KEY;

const configHandler = require("../api/auth/config");
const meHandler = require("../api/auth/me");

test("auth config exposes only the public project URL and publishable key", async () => {
  const res = await invoke(configHandler, { method: "GET" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.url, "https://example-project.supabase.co");
  assert.equal(res.body.publishableKey, "sb_publishable_test_only");
  assert.equal("serviceRoleKey" in res.body, false);
  assert.equal(res.headers["cache-control"], "no-store");
});

test("auth config rejects unsupported methods", async () => {
  const res = await invoke(configHandler, { method: "POST" });
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "GET");
});

test("protected account API rejects unsupported methods and missing bearer tokens", async () => {
  let res = await invoke(meHandler, { method: "POST", headers: {} });
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "GET");

  res = await invoke(meHandler, { method: "GET", headers: {} });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "unauthorized");
  assert.equal(res.headers["cache-control"], "no-store");
});

test.after(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

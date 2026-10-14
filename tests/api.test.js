const test = require("node:test");
const assert = require("node:assert/strict");

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

async function invoke(handler, req) {
  const res = mockResponse();
  await handler(req, res);
  return res;
}

test("API handlers reject unsupported methods, invalid input, and missing configuration safely", async () => {
  const envKeys = [
    "RESEND_API_KEY",
    "LAGOSGO_LEADS_TO",
    "LAGOSGO_FROM_EMAIL",
    "GOOGLE_MAPS_SERVER_KEY",
    "GOOGLE_MAPS_BROWSER_KEY"
  ];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  try {
    const leads = require("../api/leads");
    const route = require("../api/maps/route");
    const landmarks = require("../api/maps/landmarks");

    for (const key of envKeys) delete process.env[key];

    let res = await invoke(leads, { method: "GET" });
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, "POST");

    res = await invoke(leads, { method: "POST", body: {} });
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, "lead_intake_not_configured");

    process.env.RESEND_API_KEY = "test-only-placeholder";
    process.env.LAGOSGO_LEADS_TO = "pilot@example.test";
    process.env.LAGOSGO_FROM_EMAIL = "lagosgo@example.test";
    res = await invoke(leads, { method: "POST", body: { type: "driver" } });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "invalid_form");

    res = await invoke(route, { method: "GET" });
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, "POST");

    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    res = await invoke(route, { method: "POST", body: { pickup: "Ikeja", destination: "Yaba" } });
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, "maps_not_configured");

    process.env.GOOGLE_MAPS_SERVER_KEY = "test-only-placeholder";
    res = await invoke(route, {
      method: "POST",
      body: {
        pickup: "",
        destination: "Yaba",
        pickupCoordinates: { latitude: 999, longitude: 3 }
      }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "missing_locations");

    res = await invoke(landmarks, { method: "GET" });
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, "POST");

    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    res = await invoke(landmarks, { method: "POST", body: { latitude: 6.5, longitude: 3.4 } });
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, "maps_not_configured");

  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

"use strict";

const { PaystackAdapter } = require("../../lib/payments/paystack-adapter");
const { parseJsonBuffer, normalizeHeaders, readRawBody } = require("../../lib/payments/webhook-utils");

module.exports.config = { api: { bodyParser: false } };

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  const adapter = new PaystackAdapter();
  try {
    const rawBody = await readRawBody(req);
    if (!adapter.verifyWebhook(normalizeHeaders(req.headers), rawBody)) return res.status(401).json({ error: "invalid_webhook_signature" });
    const event = parseJsonBuffer(rawBody);
    if (!event || typeof event.event !== "string" || !event.data) return res.status(400).json({ error: "invalid_webhook_payload" });
    const { recordVerifiedWebhook } = require("../../lib/payments/supabase-repository");
    await recordVerifiedWebhook({ provider: "paystack", eventType: event.event, eventId: event.data.id == null ? event.data.reference : String(event.data.id), payload: event });
    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(error.message === "webhook_body_too_large" ? 413 : 503).json({ error: error.message === "webhook_body_too_large" ? "payload_too_large" : "webhook_processing_unavailable" });
  }
};

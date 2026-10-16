"use strict";

const { FlutterwaveAdapter } = require("../../lib/payments/flutterwave-adapter");
const { parseJsonBuffer, normalizeHeaders, readRawBody } = require("../../lib/payments/webhook-utils");

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  const adapter = new FlutterwaveAdapter();
  try {
    const rawBody = await readRawBody(req);
    if (!adapter.verifyWebhook(normalizeHeaders(req.headers))) return res.status(401).json({ error: "invalid_webhook_signature" });
    const event = parseJsonBuffer(rawBody);
    if (!event || typeof event.event !== "string" || !event.data) return res.status(400).json({ error: "invalid_webhook_payload" });
    let verified = null;
    if (event.event === "charge.completed" && event.data.id != null && event.data.tx_ref) {
      verified = await adapter.verifyCollection(String(event.data.tx_ref), event.data.id);
      const eventAmount = Math.round(Number(event.data.amount) * 100);
      if (verified.status !== "succeeded" || verified.reference !== event.data.tx_ref ||
          verified.currency !== "NGN" || verified.amountKobo !== eventAmount) {
        return res.status(202).json({ received: true, verification: "pending_review" });
      }
    }
    const { recordVerifiedWebhook } = require("../../lib/payments/supabase-repository");
    const eventId = event.data.id == null ? event.data.reference : String(event.data.id);
    if (eventId == null || String(eventId) === "") return res.status(400).json({ error: "missing_event_id" });
    await recordVerifiedWebhook({ provider: "flutterwave", eventType: event.event, eventId: String(eventId), payload: event, verified });
    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(error.message === "webhook_body_too_large" ? 413 : 503).json({ error: error.message === "webhook_body_too_large" ? "payload_too_large" : "webhook_processing_unavailable" });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };

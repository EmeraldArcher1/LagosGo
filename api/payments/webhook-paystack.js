"use strict";

const crypto = require("node:crypto");
const { PaystackAdapter } = require("../../lib/payments/paystack-adapter");
const { parseJsonBuffer, normalizeHeaders, readRawBody } = require("../../lib/payments/webhook-utils");

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  const adapter = new PaystackAdapter();
  try {
    const rawBody = await readRawBody(req);
    if (!adapter.verifyWebhook(normalizeHeaders(req.headers), rawBody)) return res.status(401).json({ error: "invalid_webhook_signature" });
    const event = parseJsonBuffer(rawBody);
    if (!event || typeof event.event !== "string" || !event.data) return res.status(400).json({ error: "invalid_webhook_payload" });
    let verified = null;
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      if (typeof reference !== "string" || !reference) return res.status(400).json({ error: "missing_payment_reference" });
      verified = await adapter.verifyCollection(reference);
      if (verified.status !== "succeeded" || verified.reference !== reference ||
          verified.currency !== "NGN" || verified.amountKobo !== Number(event.data.amount)) {
        return res.status(202).json({ received: true, verification: "pending_review" });
      }
    }
    const eventId = crypto.createHash("sha256").update(rawBody).digest("hex");
    const { recordVerifiedWebhook, processVerifiedWebhook } = require("../../lib/payments/supabase-repository");
    await recordVerifiedWebhook({ provider: "paystack", eventType: event.event, eventId, payload: event, verified });
    if (verified && verified.status === "succeeded") await processVerifiedWebhook({ provider: "paystack", eventId });
    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(error.message === "webhook_body_too_large" ? 413 : 503).json({ error: error.message === "webhook_body_too_large" ? "payload_too_large" : "webhook_processing_unavailable" });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };

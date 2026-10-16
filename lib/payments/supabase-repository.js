"use strict";

async function supabaseRequest(path, { method = "POST", body } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("payments_database_not_configured");
  const response = await fetch(url.replace(/\/$/, "") + "/rest/v1/" + path, {
    method,
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    const error = new Error("payments_database_request_failed");
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json().catch(() => null);
}

async function recordVerifiedWebhook({ provider, eventType, eventId, payload }) {
  if (!eventId) throw new Error("webhook_event_id_required");
  // The database unique key makes provider/event idempotency enforceable even on retries.
  await supabaseRequest("payment_webhook_events?on_conflict=provider,event_id", {
    method: "POST",
    body: { provider, event_id: eventId, event_type: eventType, payload, signature_verified: true, received_at: new Date().toISOString() }
  });
}

module.exports = { supabaseRequest, recordVerifiedWebhook };

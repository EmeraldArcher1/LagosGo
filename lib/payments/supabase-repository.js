"use strict";

async function supabaseRequest(path, { method = "POST", body, prefer = "return=minimal" } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("payments_database_not_configured");
  const response = await fetch(url.replace(/\/$/, "") + "/rest/v1/" + path, {
    method,
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    const error = new Error("payments_database_request_failed");
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json().catch(() => null);
}

async function recordVerifiedWebhook({ provider, eventType, eventId, payload, verified = null }) {
  if (eventId == null || String(eventId) === "") throw new Error("webhook_event_id_required");
  // Unique (provider,event_id) plus ignore-duplicates makes provider retries idempotent.
  await supabaseRequest("payment_webhook_events?on_conflict=provider,event_id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: {
      provider, event_id: String(eventId), event_type: eventType, payload,
      signature_verified: true, verified_transaction: verified, received_at: new Date().toISOString()
    }
  });
}

async function processVerifiedWebhook({ provider, eventId }) {
  const result = await supabaseRequest("rpc/process_payment_webhook", {
    body: { p_provider: provider, p_event_id: String(eventId) },
    prefer: "return=representation"
  });
  return Array.isArray(result) ? result[0] : result;
}

module.exports = { supabaseRequest, recordVerifiedWebhook, processVerifiedWebhook };

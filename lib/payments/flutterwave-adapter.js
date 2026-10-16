"use strict";

const crypto = require("node:crypto");
const { PaymentProvider, assertKobo, requireText, safeReference } = require("./provider");

class FlutterwaveAdapter extends PaymentProvider {
  constructor({ secretKey = process.env.FLW_SECRET_KEY, webhookSecret = process.env.FLW_WEBHOOK_SECRET_HASH, fetchImpl = fetch } = {}) {
    super("flutterwave");
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
    this.fetchImpl = fetchImpl;
  }

  async request(path, { method = "GET", body } = {}) {
    if (!this.secretKey) throw new Error("flutterwave_not_configured");
    const response = await this.fetchImpl("https://api.flutterwave.com/v3" + path, {
      method,
      headers: { Authorization: "Bearer " + this.secretKey, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || (data.status && data.status !== "success")) {
      const error = new Error("flutterwave_request_failed");
      error.status = response.status;
      error.providerMessage = typeof data.message === "string" ? data.message.slice(0, 180) : undefined;
      throw error;
    }
    return data.data ?? data;
  }

  async createCollection({ amountKobo, email, reference, metadata = {}, callbackUrl, name }) {
    assertKobo(amountKobo); requireText(email, "email"); safeReference(reference);
    const data = await this.request("/payments", { method: "POST", body: {
      tx_ref: reference, amount: (amountKobo / 100).toFixed(2), currency: "NGN", payment_options: "card,banktransfer,ussd",
      customer: { email, name: typeof name === "string" ? name.slice(0, 120) : "LagosGo rider" },
      meta: metadata, ...(callbackUrl ? { redirect_url: callbackUrl } : {})
    }});
    return { provider: this.name, reference, authorizationUrl: data.link, status: "pending" };
  }

  async verifyCollection(reference, gatewayTransactionId) {
    // Flutterwave's transaction verification endpoint is keyed by its numeric transaction id.
    if (!Number.isSafeInteger(Number(gatewayTransactionId)) || Number(gatewayTransactionId) <= 0) throw new TypeError("flutterwave_transaction_id_required");
    const data = await this.request("/transactions/" + Number(gatewayTransactionId) + "/verify");
    const amountKobo = Math.round(Number(data.amount) * 100);
    const referenceMatches = data.tx_ref === safeReference(reference);
    const status = data.status === "successful" && data.currency === "NGN" && referenceMatches ? "succeeded" : data.status === "failed" ? "failed" : "pending";
    return { provider: this.name, reference: data.tx_ref, amountKobo, currency: data.currency, status, gatewayTransactionId: data.id == null ? null : String(data.id), raw: data };
  }

  async refund({ transactionId, amountKobo }) {
    if (!Number.isSafeInteger(Number(transactionId)) || Number(transactionId) <= 0) throw new TypeError("transactionId_required");
    const data = await this.request("/transactions/" + Number(transactionId) + "/refund", {
      method: "POST", body: amountKobo == null ? {} : { amount: (assertKobo(amountKobo) / 100).toFixed(2) }
    });
    return { provider: this.name, reference: String(data.id ?? transactionId), status: data.status || "pending", raw: data };
  }

  async createPayout({ amountKobo, accountBank, accountNumber, reference, narration }) {
    assertKobo(amountKobo); requireText(accountBank, "accountBank"); requireText(accountNumber, "accountNumber"); safeReference(reference);
    const data = await this.request("/transfers", { method: "POST", body: {
      account_bank: accountBank, account_number: accountNumber, amount: amountKobo / 100, currency: "NGN",
      reference, narration: String(narration || "LagosGo driver payout").slice(0, 180)
    }});
    return { provider: this.name, reference: data.reference || reference, status: data.status || "pending", transferId: data.id == null ? null : String(data.id) };
  }

  async verifyPayout(reference) {
    const data = await this.request("/transfers/" + encodeURIComponent(safeReference(reference)));
    return { provider: this.name, reference: data.reference || reference, status: data.status === "SUCCESSFUL" || data.status === "successful" ? "paid" : data.status === "FAILED" || data.status === "failed" ? "failed" : "processing", raw: data };
  }

  verifyWebhook(headers) {
    const supplied = headers["verif-hash"];
    if (typeof this.webhookSecret !== "string" || !this.webhookSecret || typeof supplied !== "string") return false;
    const a = Buffer.from(supplied), b = Buffer.from(this.webhookSecret);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

module.exports = { FlutterwaveAdapter };

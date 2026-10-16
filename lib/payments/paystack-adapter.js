"use strict";

const crypto = require("node:crypto");
const { PaymentProvider, assertKobo, requireText, safeReference } = require("./provider");

class PaystackAdapter extends PaymentProvider {
  constructor({ secretKey = process.env.PAYSTACK_SECRET_KEY, fetchImpl = fetch } = {}) {
    super("paystack");
    this.secretKey = secretKey;
    this.fetchImpl = fetchImpl;
  }

  async request(path, { method = "GET", body } = {}) {
    if (!this.secretKey) throw new Error("paystack_not_configured");
    const response = await this.fetchImpl("https://api.paystack.co" + path, {
      method,
      headers: { Authorization: "Bearer " + this.secretKey, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status === false) {
      const error = new Error("paystack_request_failed");
      error.status = response.status;
      error.providerMessage = typeof data.message === "string" ? data.message.slice(0, 180) : undefined;
      throw error;
    }
    return data.data ?? data;
  }

  async createCollection({ amountKobo, email, reference, metadata = {}, callbackUrl }) {
    assertKobo(amountKobo); requireText(email, "email"); safeReference(reference);
    const data = await this.request("/transaction/initialize", {
      method: "POST",
      body: {
        amount: amountKobo, email, currency: "NGN", reference,
        metadata, ...(callbackUrl ? { callback_url: callbackUrl } : {})
      }
    });
    return { provider: this.name, reference, authorizationUrl: data.authorization_url, accessCode: data.access_code, status: "pending" };
  }

  async verifyCollection(reference) {
    const data = await this.request("/transaction/verify/" + encodeURIComponent(safeReference(reference)));
    return {
      provider: this.name, reference: data.reference, amountKobo: Number(data.amount),
      currency: data.currency, status: data.status === "success" ? "succeeded" : data.status === "failed" ? "failed" : "pending",
      gatewayTransactionId: data.id == null ? null : String(data.id), raw: data
    };
  }

  async refund({ transactionReference, amountKobo, reason }) {
    safeReference(transactionReference);
    const body = { transaction: transactionReference, ...(amountKobo == null ? {} : { amount: assertKobo(amountKobo) }), ...(reason ? { customer_note: String(reason).slice(0, 180) } : {}) };
    const data = await this.request("/refund", { method: "POST", body });
    return { provider: this.name, reference: String(data.id ?? transactionReference), status: data.status || "pending", raw: data };
  }

  async createPayout({ amountKobo, recipientCode, reference, reason }) {
    assertKobo(amountKobo); requireText(recipientCode, "recipientCode"); safeReference(reference);
    const data = await this.request("/transfer", { method: "POST", body: {
      source: "balance", amount: amountKobo / 100, recipient: recipientCode, reference,
      reason: String(reason || "LagosGo driver payout").slice(0, 180)
    }});
    return { provider: this.name, reference: data.reference || reference, status: data.status || "pending", transferCode: data.transfer_code || null };
  }

  async verifyPayout(reference) {
    const data = await this.request("/transfer/verify/" + encodeURIComponent(safeReference(reference)));
    return { provider: this.name, reference: data.reference || reference, status: data.status === "success" ? "paid" : data.status === "failed" || data.status === "reversed" ? data.status : "processing", raw: data };
  }

  verifyWebhook(headers, rawBody) {
    if (!this.secretKey) throw new Error("paystack_not_configured");
    const supplied = headers["x-paystack-signature"];
    if (typeof supplied !== "string" || !Buffer.isBuffer(rawBody)) return false;
    const expected = crypto.createHmac("sha512", this.secretKey).update(rawBody).digest("hex");
    const a = Buffer.from(supplied, "utf8"), b = Buffer.from(expected, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

module.exports = { PaystackAdapter };

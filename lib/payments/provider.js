"use strict";

class PaymentProvider {
  constructor(name) { this.name = name; }
  async createCollection(_input) { throw new Error("createCollection_not_implemented"); }
  async verifyCollection(_reference) { throw new Error("verifyCollection_not_implemented"); }
  async refund(_input) { throw new Error("refund_not_implemented"); }
  async createPayout(_input) { throw new Error("createPayout_not_implemented"); }
  async verifyPayout(_reference) { throw new Error("verifyPayout_not_implemented"); }
  verifyWebhook(_headers, _rawBody) { throw new Error("verifyWebhook_not_implemented"); }
}

function assertKobo(amountKobo) {
  if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
    throw new TypeError("amountKobo_must_be_a_positive_safe_integer");
  }
  return amountKobo;
}

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(field + "_required");
  return value.trim();
}

function safeReference(value) {
  return requireText(value, "reference").slice(0, 120);
}

module.exports = { PaymentProvider, assertKobo, requireText, safeReference };

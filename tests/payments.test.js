"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { assertKobo } = require("../lib/payments/provider");
const { PaystackAdapter } = require("../lib/payments/paystack-adapter");
const { FlutterwaveAdapter } = require("../lib/payments/flutterwave-adapter");
const { validatePosting, PaymentLedger } = require("../lib/payments/ledger");
const { PayoutService } = require("../lib/payments/payout-service");
const { ReconciliationService } = require("../lib/payments/reconciliation-service");

test("money validation rejects fractional, unsafe and non-positive kobo", () => {
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "500"]) assert.throws(() => assertKobo(value));
  assert.equal(assertKobo(500), 500);
});

test("ledger requires balanced, append-only idempotent postings", () => {
  const posting = { idempotencyKey: "ride:abc:collection", entries: [
    { account: "gateway_clearing", direction: "debit", amountKobo: 5000 },
    { account: "driver_payable", direction: "credit", amountKobo: 4500 },
    { account: "platform_revenue", direction: "credit", amountKobo: 500 }
  ]};
  assert.equal(validatePosting(posting).totalKobo, 5000);
  assert.throws(() => validatePosting({ ...posting, entries: posting.entries.slice(0, 2) }), /unbalanced/);
  let saved;
  const ledger = new PaymentLedger({ postLedgerTransaction: async (entry) => { saved = entry; return entry; } });
  return ledger.post(posting).then(() => assert.equal(saved.currency, "NGN"));
});

test("Paystack webhook signature validates exact raw bytes", () => {
  const secret = "test-secret";
  const raw = Buffer.from('{"event":"charge.success","data":{"reference":"ref-1"}}');
  const signature = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  const adapter = new PaystackAdapter({ secretKey: secret });
  assert.equal(adapter.verifyWebhook({ "x-paystack-signature": signature }, raw), true);
  assert.equal(adapter.verifyWebhook({ "x-paystack-signature": "nope" }, raw), false);
  assert.equal(adapter.verifyWebhook({ "x-paystack-signature": signature }, Buffer.from(raw.toString() + " ")), false);
});

test("Flutterwave webhook requires configured shared hash", () => {
  const adapter = new FlutterwaveAdapter({ secretKey: "test", webhookSecret: "webhook-hash" });
  assert.equal(adapter.verifyWebhook({ "verif-hash": "webhook-hash" }), true);
  assert.equal(adapter.verifyWebhook({ "verif-hash": "wrong" }), false);
});

test("payout service blocks any unverified or ineligible beneficiary", async () => {
  const service = new PayoutService({
    repository: {
      getPayoutEligibility: async () => ({ eligible: true, driverVerified: true, vehicleRelationshipVerified: true, beneficiaryVerified: false, rideCompleted: true, collectionVerified: true, amountKobo: 5000, provider: "paystack", beneficiaryReference: "recipient_x" }),
      createPayoutInstruction: async () => { throw new Error("must_not_create"); }
    },
    providerFor: () => { throw new Error("must_not_call_gateway"); }
  });
  await assert.rejects(service.pay({ driverId: "driver", rideId: "ride", amountKobo: 5000, idempotencyKey: "payout-1" }), /payout_not_eligible/);
});

test("reconciliation reports missing and mismatched records", async () => {
  let saved;
  const service = new ReconciliationService({
    getInternalPaymentRecords: async () => [{ providerReference: "a", amountKobo: 100, currency: "NGN", status: "succeeded" }],
    getProviderReport: async () => [{ reference: "a", amountKobo: 90, currency: "NGN", status: "succeeded" }, { reference: "b", amountKobo: 20, currency: "NGN", status: "succeeded" }],
    saveReconciliationRun: async (run) => { saved = run; }
  });
  const run = await service.reconcile({ provider: "paystack", from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" });
  assert.equal(run.discrepancyCount, 2);
  assert.equal(saved.provider, "paystack");
});

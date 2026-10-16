"use strict";

const { assertKobo, requireText } = require("./provider");

const ACCOUNT_TYPES = new Set(["gateway_clearing", "driver_payable", "platform_revenue", "gateway_fee_expense", "refund_payable", "adjustment", "cash_reserve"]);

function validatePosting(posting) {
  if (!posting || !Array.isArray(posting.entries) || posting.entries.length < 2) throw new TypeError("ledger_requires_two_or_more_entries");
  requireText(posting.idempotencyKey, "idempotencyKey");
  let debits = 0, credits = 0;
  for (const entry of posting.entries) {
    if (!ACCOUNT_TYPES.has(entry.account)) throw new TypeError("invalid_ledger_account");
    assertKobo(entry.amountKobo);
    if (entry.direction === "debit") debits += entry.amountKobo;
    else if (entry.direction === "credit") credits += entry.amountKobo;
    else throw new TypeError("invalid_ledger_direction");
  }
  if (!Number.isSafeInteger(debits) || !Number.isSafeInteger(credits) || debits !== credits) throw new Error("unbalanced_ledger_posting");
  return { ...posting, currency: "NGN", totalKobo: debits };
}

class PaymentLedger {
  constructor(repository) {
    if (!repository || typeof repository.postLedgerTransaction !== "function") throw new TypeError("ledger_repository_required");
    this.repository = repository;
  }

  post(posting) {
    return this.repository.postLedgerTransaction(validatePosting(posting));
  }

  recordCollection({ rideId, reference, amountKobo, gatewayFeeKobo = 0, driverPayableKobo, platformRevenueKobo = 0 }) {
    assertKobo(amountKobo);
    for (const n of [gatewayFeeKobo, driverPayableKobo, platformRevenueKobo]) {
      if (!Number.isSafeInteger(n) || n < 0) throw new TypeError("invalid_ledger_amount");
    }
    if (gatewayFeeKobo + driverPayableKobo + platformRevenueKobo !== amountKobo) throw new Error("collection_allocation_must_equal_gross");
    return this.post({ idempotencyKey: "collection:" + reference, rideId, sourceReference: reference, kind: "collection", entries: [
      { account: "gateway_clearing", direction: "debit", amountKobo: amountKobo },
      ...(gatewayFeeKobo ? [{ account: "gateway_fee_expense", direction: "credit", amountKobo: gatewayFeeKobo }] : []),
      ...(driverPayableKobo ? [{ account: "driver_payable", direction: "credit", amountKobo: driverPayableKobo }] : []),
      ...(platformRevenueKobo ? [{ account: "platform_revenue", direction: "credit", amountKobo: platformRevenueKobo }] : [])
    ]});
  }
}

module.exports = { PaymentLedger, validatePosting };

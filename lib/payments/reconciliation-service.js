"use strict";

class ReconciliationService {
  constructor(repository) {
    if (!repository || typeof repository.getInternalPaymentRecords !== "function" || typeof repository.getProviderReport !== "function" || typeof repository.saveReconciliationRun !== "function") throw new TypeError("reconciliation_repository_required");
    this.repository = repository;
  }

  async reconcile({ provider, from, to }) {
    if (!["paystack", "flutterwave"].includes(provider)) throw new TypeError("unsupported_provider");
    if (!from || !to || new Date(from) >= new Date(to)) throw new TypeError("valid_reconciliation_window_required");
    const [internal, external] = await Promise.all([
      this.repository.getInternalPaymentRecords({ provider, from, to }),
      this.repository.getProviderReport({ provider, from, to })
    ]);
    const localByReference = new Map(internal.map((row) => [row.providerReference, row]));
    const externalByReference = new Map(external.map((row) => [row.reference, row]));
    const discrepancies = [];
    for (const [reference, local] of localByReference) {
      const gateway = externalByReference.get(reference);
      if (!gateway) discrepancies.push({ reference, type: "missing_from_gateway_report" });
      else if (local.amountKobo !== gateway.amountKobo || local.currency !== gateway.currency || local.status !== gateway.status) {
        discrepancies.push({ reference, type: "record_mismatch", local: { amountKobo: local.amountKobo, currency: local.currency, status: local.status }, gateway: { amountKobo: gateway.amountKobo, currency: gateway.currency, status: gateway.status } });
      }
    }
    for (const reference of externalByReference.keys()) if (!localByReference.has(reference)) discrepancies.push({ reference, type: "missing_from_lagosgo" });
    const run = { provider, from, to, checkedAt: new Date().toISOString(), localCount: internal.length, gatewayCount: external.length, discrepancyCount: discrepancies.length, discrepancies };
    await this.repository.saveReconciliationRun(run);
    return run;
  }
}

module.exports = { ReconciliationService };

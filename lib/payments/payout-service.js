"use strict";

const { assertKobo, requireText } = require("./provider");

class PayoutService {
  constructor({ repository, providerFor }) {
    if (!repository || typeof repository.getPayoutEligibility !== "function" || typeof repository.createPayoutInstruction !== "function") throw new TypeError("payout_repository_required");
    if (typeof providerFor !== "function") throw new TypeError("provider_selector_required");
    this.repository = repository;
    this.providerFor = providerFor;
  }

  async pay({ driverId, rideId, amountKobo, idempotencyKey }) {
    requireText(driverId, "driverId"); requireText(rideId, "rideId"); requireText(idempotencyKey, "idempotencyKey"); assertKobo(amountKobo);
    const eligibility = await this.repository.getPayoutEligibility({ driverId, rideId });
    if (!eligibility || eligibility.eligible !== true || eligibility.driverVerified !== true ||
        eligibility.vehicleRelationshipVerified !== true || eligibility.beneficiaryVerified !== true ||
        eligibility.rideCompleted !== true || eligibility.collectionVerified !== true) {
      throw new Error("payout_not_eligible_or_verification_incomplete");
    }
    if (eligibility.amountKobo !== amountKobo || !eligibility.provider || !eligibility.beneficiaryReference) {
      throw new Error("payout_instruction_does_not_match_verified_payable");
    }
    const existing = await this.repository.createPayoutInstruction({
      driverId, rideId, amountKobo, idempotencyKey, provider: eligibility.provider,
      beneficiaryReference: eligibility.beneficiaryReference, status: "queued"
    });
    if (existing.created === false) return existing.instruction;
    const provider = this.providerFor(eligibility.provider);
    try {
      const result = await provider.createPayout({
        amountKobo, reference: existing.instruction.reference,
        recipientCode: eligibility.recipientCode,
        accountBank: eligibility.accountBank, accountNumber: eligibility.accountNumber,
        reason: "LagosGo driver payout", narration: "LagosGo driver payout"
      });
      return await this.repository.updatePayoutInstruction(existing.instruction.id, {
        status: result.status === "success" || result.status === "SUCCESSFUL" ? "processing" : "processing",
        providerReference: result.reference, providerResponseStatus: result.status
      });
    } catch (error) {
      await this.repository.updatePayoutInstruction(existing.instruction.id, { status: "needs_review", failureCode: "provider_request_failed" });
      throw error;
    }
  }

  async refresh(instruction) {
    if (!instruction || !instruction.provider || !instruction.providerReference) throw new TypeError("payout_instruction_reference_required");
    const result = await this.providerFor(instruction.provider).verifyPayout(instruction.providerReference);
    return this.repository.updatePayoutInstruction(instruction.id, {
      status: result.status === "paid" ? "paid" : result.status === "failed" || result.status === "reversed" ? result.status : "processing",
      providerStatus: result.status, confirmedAt: result.status === "paid" ? new Date().toISOString() : null
    });
  }
}

module.exports = { PayoutService };

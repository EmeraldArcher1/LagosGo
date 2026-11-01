const WEIGHTS = Object.freeze({ eta: 0.55, quality: 0.15, fairness: 0.15, reliability: 0.10, direction: 0.05 });
function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function scoreCandidate(candidate, options = {}) {
  const maxEtaMinutes = Number.isFinite(options.maxEtaMinutes) ? options.maxEtaMinutes : 25;
  const eta = Number(candidate.roadEtaMinutes);
  if (!Number.isFinite(eta) || eta < 0 || maxEtaMinutes <= 0) return null;
  const etaScore = 1 - clamp01(eta / maxEtaMinutes);
  const qualityScore = clamp01((Number(candidate.qualityRating) - 1) / 4);
  return WEIGHTS.eta * etaScore + WEIGHTS.quality * qualityScore +
    WEIGHTS.fairness * clamp01(candidate.fairnessScore) +
    WEIGHTS.reliability * clamp01(candidate.reliabilityScore) +
    WEIGHTS.direction * clamp01(candidate.directionScore);
}
function isEligible(candidate, nowMs = Date.now()) {
  return !!candidate && candidate.isOnline === true && candidate.isAvailable === true &&
    candidate.driverApproved === true && candidate.vehicleApproved === true &&
    candidate.documentsCurrent === true && candidate.inServiceZone === true &&
    Number.isFinite(candidate.locationUpdatedAt) &&
    nowMs >= candidate.locationUpdatedAt && nowMs - candidate.locationUpdatedAt <= 180000;
}
function rankDrivers(candidates, options = {}) {
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  return (Array.isArray(candidates) ? candidates : []).filter(c => isEligible(c, nowMs))
    .map(c => ({ ...c, dispatchScore: scoreCandidate(c, options) }))
    .filter(c => c.dispatchScore !== null)
    .sort((a,b) => b.dispatchScore-a.dispatchScore || a.roadEtaMinutes-b.roadEtaMinutes ||
      String(a.driverId).localeCompare(String(b.driverId)));
}
module.exports = { WEIGHTS, isEligible, scoreCandidate, rankDrivers };

const test = require('node:test');
const assert = require('node:assert/strict');
const { WEIGHTS, isEligible, scoreCandidate, rankDrivers } = require('../lib/dispatch');
const now = 1800000000000;
const candidate = (overrides={}) => ({ driverId:'driver-a',isOnline:true,isAvailable:true,
  driverApproved:true,vehicleApproved:true,documentsCurrent:true,inServiceZone:true,
  locationUpdatedAt:now-30000,roadEtaMinutes:5,qualityRating:5,fairnessScore:.8,
  reliabilityScore:.9,directionScore:1,...overrides });
test('dispatch weights total one and preserve agreed ETA priority',()=>{
  assert.equal(Object.values(WEIGHTS).reduce((a,b)=>a+b,0),1); assert.equal(WEIGHTS.eta,.55);
});
test('ETA and quality are normalised consistently',()=>{
  assert.ok(scoreCandidate(candidate())>scoreCandidate(candidate({roadEtaMinutes:20})));
  assert.ok(scoreCandidate(candidate({qualityRating:5}))>scoreCandidate(candidate({qualityRating:1})));
  assert.equal(scoreCandidate(candidate({roadEtaMinutes:30})),null);
});
test('eligibility gates reject unverified, busy, stale and out-of-zone drivers',()=>{
  assert.equal(isEligible(candidate(),now),true);
  for(const patch of [{driverApproved:false},{vehicleApproved:false},{documentsCurrent:false},
    {isOnline:false},{isAvailable:false},{inServiceZone:false},{locationUpdatedAt:now-181000}])
    assert.equal(isEligible(candidate(patch),now),false);
});
test('ranking excludes ineligible drivers and sorts by weighted score',()=>{
  const ranked=rankDrivers([candidate({driverId:'far',roadEtaMinutes:18}),
    candidate({driverId:'fast',roadEtaMinutes:4}),candidate({driverId:'bad',driverApproved:false})],{nowMs:now});
  assert.deepEqual(ranked.map(x=>x.driverId),['fast','far']);
});
test('ranking tie break is deterministic',()=>{
  const ranked=rankDrivers([candidate({driverId:'z'}),candidate({driverId:'a'})],{nowMs:now});
  assert.deepEqual(ranked.map(x=>x.driverId),['a','z']);
});

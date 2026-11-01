const test = require('node:test');
const assert = require('node:assert/strict');
const { haversineKm, routeMatrixRows, secondsFromDuration } = require('../api/dispatch/run');

test('haversine distance is near zero for identical coordinates',()=>{
  assert.equal(haversineKm(6.5244,3.3792,6.5244,3.3792),0);
});
test('haversine distance returns a plausible Lagos local distance',()=>{
  const km=haversineKm(6.5244,3.3792,6.6018,3.3515);
  assert.ok(km>8 && km<10);
});
test('route matrix supports the Routes API array response',()=>{
  const rows=[{originIndex:0,destinationIndex:0,duration:'120s',distanceMeters:900}];
  assert.deepEqual(routeMatrixRows(rows),rows);
});
test('route matrix rejects unknown payload shapes',()=>{
  assert.deepEqual(routeMatrixRows({error:'bad'}),[]);
});
test('duration parser converts Google duration strings',()=>{
  assert.equal(secondsFromDuration('125s'),125);
  assert.equal(secondsFromDuration('1.5s'),2);
  assert.equal(secondsFromDuration(null),null);
});

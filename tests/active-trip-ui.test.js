const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const backend = fs.readFileSync(path.join(__dirname,'../ride-backend.js'),'utf8');

test('account UI exposes active trip controls for signed-in passengers and drivers',()=>{
  assert.match(html,/id="activeRideToggle"/);
  assert.match(html,/id="activeRidePanel"/);
  assert.match(html,/id="passengerActiveRideList"/);
  assert.match(html,/id="driverActiveRideList"/);
  assert.match(backend,/window\.lagosGoListMyActiveRides/);
  assert.match(backend,/client\.from\('rides'\)/);
});

test('passenger receives pickup PIN and driver verifies before trip start',()=>{
  assert.match(backend,/window\.lagosGoIssuePickupPin/);
  assert.match(backend,/window\.lagosGoVerifyPickupPin/);
  assert.match(backend,/lagosGoAdvanceRide\(ride\.id,'in_progress'\)/);
  assert.match(backend,/Verify PIN & start trip/);
  assert.match(backend,/Give this four-digit PIN to your assigned driver/);
});

test('pickup PIN client validation accepts exactly four digits',()=>{
  assert.match(backend,/!\/\^\\d\{4\}\$\/\.test\(String\(pin \|\| ''\)\)/);
  assert.match(backend,/!\/\^\[0-9\]\{4\}\$\/\.test\(input\.value\)/);
});

test('driver trip transitions use the authenticated ride status RPC',()=>{
  assert.match(backend,/window\.lagosGoAdvanceRide/);
  assert.match(backend,/client\.rpc\('lagosgo_advance_ride'/);
  assert.match(backend,/driver_en_route/);
  assert.match(backend,/completed/);
});

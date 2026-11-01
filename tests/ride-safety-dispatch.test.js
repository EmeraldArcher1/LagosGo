const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261101090000_dispatch_and_pickup_safety.sql'),'utf8');

test('pickup PIN is random, salted, hashed, short-lived and attempt-limited',()=>{
  assert.match(sql,/public\.gen_random_bytes\(2\)/);
  assert.match(sql,/public\.digest\(v_pin \|\| v_salt::text,'sha256'\)/);
  assert.match(sql,/interval '30 minutes'/);
  assert.match(sql,/attempts between 0 and 5/);
  assert.match(sql,/attempts>=5/);
});

test('trip cannot start until assigned driver verifies pickup PIN',()=>{
  assert.match(sql,/v_uid is distinct from v_ride\.driver_user_id/);
  assert.match(sql,/v_ride\.status<>'arrived'/);
  assert.match(sql,/pickup_pin_verification_required/);
  assert.match(sql,/before update of status on public\.rides/i);
});

test('safety intake is participant-authorised and does not claim dispatch',()=>{
  assert.match(sql,/r\.passenger_user_id=v_uid or r\.driver_user_id=v_uid/);
  assert.match(sql,/severity.*critical/s);
  assert.match(sql,/submitted_not_emergency_dispatch/);
  assert.match(sql,/grant execute on function public\.lagosgo_report_safety_incident/);
});

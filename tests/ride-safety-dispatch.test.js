const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261101090000_dispatch_and_pickup_safety.sql'),'utf8');

test('pickup PIN is random, salted, hashed, short-lived and attempt-limited',()=>{
  assert.match(sql,/extensions\.gen_random_bytes\(2\)/);
  assert.match(sql,/extensions\.digest\(v_pin \|\| v_salt::text,'sha256'\)/);
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

test('browser exposes authenticated wrappers for pickup and incident RPCs',()=>{
  const auth=fs.readFileSync(path.join(__dirname,'../ride-backend.js'),'utf8');
  assert.match(auth,/window\.lagosGoIssuePickupPin/);
  assert.match(auth,/window\.lagosGoVerifyPickupPin/);
  assert.match(auth,/window\.lagosGoReportSafetyIncident/);
  assert.match(auth,/client\.rpc\('lagosgo_issue_pickup_pin'/);
  assert.match(auth,/client\.rpc\('lagosgo_verify_pickup_pin'/);
  assert.match(auth,/client\.rpc\('lagosgo_report_safety_incident'/);
});

test('privileged SQL implementations stay in private schema behind invoker wrappers',()=>{
  assert.match(sql,/create schema if not exists private/i);
  assert.match(sql,/function private\.lagosgo_issue_pickup_pin_impl[\s\S]*?security definer/i);
  assert.match(sql,/function public\.lagosgo_issue_pickup_pin[\s\S]*?security invoker/i);
  assert.match(sql,/function public\.lagosgo_verify_pickup_pin[\s\S]*?security invoker/i);
  assert.match(sql,/function public\.lagosgo_report_safety_incident[\s\S]*?security invoker/i);
});

test('pickup PIN enforcement is rollout-safe for rides without an issued challenge',()=>{
  const rollout=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261101110000_pickup_pin_graceful_rollout.sql'),'utf8');
  assert.match(rollout,/exists\s*\(\s*select 1 from public\.ride_pickup_pin_challenges c\s+where c\.ride_id\s*=\s*new\.id/s);
  assert.match(rollout,/pickup_pin_verification_required/);
});

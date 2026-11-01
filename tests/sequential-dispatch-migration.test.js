const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261101100000_sequential_driver_dispatch.sql'),'utf8');

test('dispatch offer storage is private to server-side access and prevents parallel offers',()=>{
  assert.match(sql,/alter table public\.ride_dispatch_offers enable row level security/i);
  assert.match(sql,/revoke all on public\.ride_dispatch_offers from anon,authenticated/i);
  assert.match(sql,/unique index if not exists ride_dispatch_one_open_offer_per_ride/i);
  assert.match(sql,/unique index if not exists ride_dispatch_one_open_offer_per_driver/i);
});

test('only the service role can create a dispatch offer',()=>{
  assert.match(sql,/coalesce\(auth\.role\(\),'\'\'\) <> 'service_role'/);
  assert.match(sql,/grant execute on function public\.lagosgo_dispatch_create_offer[\s\S]*?to service_role/i);
  assert.match(sql,/from public,anon,authenticated/i);
});

test('drivers can only list their own active offers',()=>{
  assert.match(sql,/o\.driver_user_id=v_uid and o\.status='offered'/);
  assert.match(sql,/r\.status='requested' and r\.driver_user_id is null/);
  assert.match(sql,/grant execute on function public\.lagosgo_list_my_dispatch_offers\(\) to authenticated/i);
});

test('acceptance is driver-authenticated, time-limited and atomically assigns ride',()=>{
  assert.match(sql,/v_offer\.driver_user_id is distinct from v_uid/);
  assert.match(sql,/v_offer\.expires_at<=now\(\)/);
  assert.match(sql,/update public\.rides set driver_user_id=v_uid,status='accepted'/);
  assert.match(sql,/where id=v_ride\.id and status='requested' and driver_user_id is null/);
  assert.match(sql,/update public\.ride_dispatch_offers set status='superseded'/);
});

test('passenger fare offer is extended to allow five-minute scheduler cadence',()=>{
  assert.match(sql,/new\.expires_at:=greatest\(coalesce\(new\.expires_at,now\(\)\),now\(\)\+interval '20 minutes'\)/);
});

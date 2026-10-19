const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261019130000_secure_ride_request_and_fare_negotiation_rpc.sql'), 'utf8');
const discovery = fs.readFileSync(path.join(root, 'supabase/migrations/20261019131000_driver_offer_discovery.sql'), 'utf8');
const guard = fs.readFileSync(path.join(root, 'supabase/migrations/20261019132500_guard_driver_eligibility_and_radius.sql'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'ride-backend.js'), 'utf8');

test('ride mutations are exposed through authenticated RPCs', () => {
  for (const name of ['lagosgo_request_ride', 'lagosgo_respond_to_fare_offer', 'lagosgo_set_driver_presence', 'lagosgo_advance_ride']) {
    assert.match(migration, new RegExp('function public\\.' + name));
  }
  assert.match(migration, /revoke insert,update,delete on table public\.rides from authenticated/i);
  assert.match(migration, /revoke insert,update,delete on table public\.ride_fare_offers from authenticated/i);
  assert.match(migration, /grant execute on function public\.lagosgo_request_ride[\s\S]*?to authenticated/i);
});

test('fare negotiation has bounds, expiry and duplicate-request protection', () => {
  assert.match(migration, /p_initial_offer_kobo<100000 or p_initial_offer_kobo>10000000/);
  assert.match(migration, /now\(\)\+interval '2 minutes'/);
  assert.match(migration, /driver_already_assigned/);
  assert.match(migration, /on conflict\(passenger_user_id,idempotency_key\) do nothing/i);
});

test('ride lifecycle checks participants and ordered transitions', () => {
  assert.match(migration, /passenger_transition_not_allowed/);
  assert.match(migration, /driver_transition_not_allowed/);
  assert.match(migration, /not_a_ride_participant/);
  assert.match(migration, /insert into public\.ride_events/i);
});

test('the product remains LagosGo-only and does not misrepresent live rides', () => {
  assert.doesNotMatch(html, /POSH9JA|OJA|posh9jaexport\.co\.uk|ecosystemPartners/i);
  assert.doesNotMatch(app, /POSH9JA|OJA|posh9jaexport\.co\.uk|data-ecosystem-partner/i);
  assert.match(app, /window\.lagosGoCreateRideRequest/);
  assert.match(app, /a driver has not accepted yet/i);
});

test('driver discovery requires approved online driver, fresh location and proximity', () => {
  assert.match(discovery, /lagosgo_list_driver_offers/);
  assert.match(discovery, /review_status='approved'/);
  assert.match(discovery, /is_online=true/);
  assert.match(discovery, /location_updated_at>now\(\)-interval '3 minutes'/);
  assert.match(discovery, /candidate\.distance_km<=p_radius_km/);
  assert.match(discovery, /grant execute on function public\.lagosgo_list_driver_offers[\s\S]*?to authenticated/i);
});

test('database guards enforce driver eligibility and radius during assignment', () => {
  assert.match(guard, /lagosgo_guard_driver_fare_offer/);
  assert.match(guard, /lagosgo_guard_ride_driver_assignment/);
  assert.match(guard, /v_distance>5/);
  assert.match(guard, /driver_already_assigned/);
  assert.match(guard, /before update of driver_user_id on public\.rides/i);
});

test('passenger booking requires a signed-in user and real coordinates', () => {
  assert.match(auth, /window\.lagosGoCreateRideRequest/);
  assert.match(auth, /client\.rpc\('lagosgo_request_ride'/);
  assert.match(auth, /getSession\(\)/);
  assert.match(auth, /pickupCoordinates/);
  assert.match(auth, /destinationCoordinates/);
  assert.match(html, /id="authDialog"/);
  assert.match(html, /supabase-js@2\/dist\/umd\/supabase\.js/);
  assert.match(app, /Select both pickup and destination from LagosGo map suggestions/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261019130000_secure_ride_request_and_fare_negotiation_rpc.sql'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('ride mutations are exposed only through authenticated RPCs', () => {
  for (const name of [
    'lagosgo_request_ride',
    'lagosgo_respond_to_fare_offer',
    'lagosgo_set_driver_presence',
    'lagosgo_advance_ride'
  ]) assert.match(migration, new RegExp('function public\\.' + name));
  assert.match(migration, /revoke insert,update,delete on table public\\.rides from authenticated/i);
  assert.match(migration, /revoke insert,update,delete on table public\\.ride_fare_offers from authenticated/i);
  assert.match(migration, /grant execute on function public\\.lagosgo_request_ride[\\s\\S]*?to authenticated/i);
});

test('fare negotiation has absolute bounds, expiry and duplicate-assignment protection', () => {
  assert.match(migration, /p_initial_offer_kobo<100000 or p_initial_offer_kobo>10000000/);
  assert.match(migration, /now\(\)\+interval '2 minutes'/);
  assert.match(migration, /driver_already_assigned/);
  assert.match(migration, /on conflict\(passenger_user_id,idempotency_key\) do nothing/i);
});

test('ride lifecycle enforces participant and ordered transitions', () => {
  assert.match(migration, /passenger_transition_not_allowed/);
  assert.match(migration, /driver_transition_not_allowed/);
  assert.match(migration, /not_a_ride_participant/);
  assert.match(migration, /insert into public\\.ride_events/i);
});

test('the live interface remains honest while ride APIs are not wired to the UI', () => {
  assert.doesNotMatch(html, /POSH9JA|OJA|posh9jaexport\\.co\\.uk|ecosystemPartners/i);
  assert.doesNotMatch(app, /POSH9JA|OJA|posh9jaexport\\.co\\.uk|data-ecosystem-partner/i);
  assert.match(app, /Live booking is not connected yet/i);
});

test('driver discovery requires an approved online driver and returns nearby offers only', () => {
  const discovery = fs.readFileSync(path.join(root, 'supabase/migrations/20261019131000_driver_offer_discovery.sql'), 'utf8');
  assert.match(discovery, /lagosgo_list_driver_offers/);
  assert.match(discovery, /review_status='approved'/);
  assert.match(discovery, /is_online=true/);
  assert.match(discovery, /location_updated_at>now\(\)-interval '3 minutes'/);
  assert.match(discovery, /candidate\.distance_km<=p_radius_km/);
  assert.match(discovery, /grant execute on function public\.lagosgo_list_driver_offers[\s\S]*?to authenticated/i);
});

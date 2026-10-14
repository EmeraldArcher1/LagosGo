const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "001_core_schema.sql");
const migration = fs.readFileSync(migrationPath, "utf8");

test("Supabase core migration defines the ride and identity foundation", () => {
  for (const table of [
    "public.profiles",
    "public.driver_profiles",
    "public.vehicles",
    "public.rides",
    "public.ride_events"
  ]) {
    assert.match(migration, new RegExp("create table " + table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `missing table: ${table}`);
  }

  for (const state of [
    "requested", "accepted", "driver_en_route", "arrived",
    "in_progress", "completed", "cancelled", "no_driver"
  ]) {
    assert.match(migration, new RegExp("'" + state + "'"), `missing ride state: ${state}`);
  }

  assert.match(migration, /enable row level security/gi);
  assert.match(migration, /values\s*\([\s\S]*?'passenger'/i, "new auth users must default to passenger");
  assert.match(migration, /grant select on public\.rides to authenticated/i);
  assert.match(migration, /revoke all on public\.rides from anon, authenticated/i);
  assert.match(migration, /grant all on public\.[\s\S]*?to service_role/i);
  assert.match(migration, /record_ride_event/i);
  assert.match(migration, /guard_ride_mutation/i);
});

test("clients cannot directly write rides or change privileged profile fields", () => {
  assert.match(migration, /revoke all on public\.profiles from anon, authenticated/i);
  assert.match(migration, /grant update \(display_name, phone\) on public\.profiles to authenticated/i);
  assert.match(migration, /revoke all on public\.rides from anon, authenticated/i);
  assert.match(migration, /grant select on public\.rides to authenticated/i);
  assert.match(migration, /grant update \(is_online, last_location_latitude, last_location_longitude, location_updated_at\)/i);
  assert.match(migration, /grant update \(make, model, model_year, colour, registration_number\) on public\.vehicles/i);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/dispatch/run');

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name,value) { this.headers[name]=value; },
    status(code) { this.statusCode=code; return this; },
    json(body) { this.body=body; return this; }
  };
}

test('dispatch worker rejects requests without the cron bearer secret',async()=>{
  const old=process.env.LAGOSGO_DISPATCH_CRON_SECRET;
  process.env.LAGOSGO_DISPATCH_CRON_SECRET='test-secret';
  try {
    const res=responseRecorder();
    await createHandler({fetch:async()=>{throw new Error('must not fetch');}})({method:'GET',headers:{authorization:'Bearer wrong'}},res);
    assert.equal(res.statusCode,401);
    assert.equal(res.body.error,'unauthorized');
  } finally {
    if(old===undefined) delete process.env.LAGOSGO_DISPATCH_CRON_SECRET;
    else process.env.LAGOSGO_DISPATCH_CRON_SECRET=old;
  }
});

test('dispatch worker reports missing server configuration without calling providers',async()=>{
  const keys=['SUPABASE_URL','POSTGRES_HOST_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','POSTGRES_HOST_SUPABASE_SERVICE_ROLE_KEY','GOOGLE_MAPS_SERVER_KEY','LAGOSGO_DISPATCH_CRON_SECRET','VERCEL_ENV','LAGOSGO_DISPATCH_ENABLED'];
  const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  keys.forEach(key=>delete process.env[key]);
  try {
    const res=responseRecorder();
    await createHandler()({method:'GET',headers:{}},res);
    assert.equal(res.statusCode,401);
    process.env.LAGOSGO_DISPATCH_CRON_SECRET='configured';
    process.env.VERCEL_ENV='production';
    process.env.LAGOSGO_DISPATCH_ENABLED='true';
    const configuredRes=responseRecorder();
    await createHandler()({method:'GET',headers:{authorization:'Bearer configured'}},configuredRes);
    assert.equal(configuredRes.statusCode,503);
    assert.deepEqual(configuredRes.body.missing,['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GOOGLE_MAPS_SERVER_KEY']);
  } finally {
    keys.forEach(key=>{ if(old[key]===undefined) delete process.env[key]; else process.env[key]=old[key]; });
  }
});

test('dispatch worker refuses preview deployments even with a valid cron secret', async () => {
  const keys=['LAGOSGO_DISPATCH_CRON_SECRET','VERCEL_ENV','LAGOSGO_DISPATCH_ENABLED'];
  const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  process.env.LAGOSGO_DISPATCH_CRON_SECRET='configured';
  process.env.VERCEL_ENV='preview';
  process.env.LAGOSGO_DISPATCH_ENABLED='true';
  try {
    const res=responseRecorder();
    await createHandler()({method:'GET',headers:{authorization:'Bearer configured'}},res);
    assert.equal(res.statusCode,503);
    assert.equal(res.body.error,'dispatch_disabled');
  } finally {
    keys.forEach(key=>{ if(old[key]===undefined) delete process.env[key]; else process.env[key]=old[key]; });
  }
});

test('dispatch worker fails closed until document and service-zone verification exists', async () => {
  const keys=['SUPABASE_URL','POSTGRES_HOST_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','POSTGRES_HOST_SUPABASE_SERVICE_ROLE_KEY','GOOGLE_MAPS_SERVER_KEY','LAGOSGO_DISPATCH_CRON_SECRET','VERCEL_ENV','LAGOSGO_DISPATCH_ENABLED'];
  const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  Object.assign(process.env,{
    SUPABASE_URL:'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY:'test-service-role',
    GOOGLE_MAPS_SERVER_KEY:'test-maps-key',
    LAGOSGO_DISPATCH_CRON_SECRET:'configured',
    VERCEL_ENV:'production',
    LAGOSGO_DISPATCH_ENABLED:'true'
  });
  delete process.env.POSTGRES_HOST_SUPABASE_URL;
  delete process.env.POSTGRES_HOST_SUPABASE_SERVICE_ROLE_KEY;
  try {
    const res=responseRecorder();
    await createHandler()({method:'GET',headers:{authorization:'Bearer configured'}},res);
    assert.equal(res.statusCode,503);
    assert.equal(res.body.error,'dispatch_eligibility_not_configured');
    assert.deepEqual(res.body.missing,['driver_document_verification','service_zone_membership']);
  } finally {
    keys.forEach(key=>{ if(old[key]===undefined) delete process.env[key]; else process.env[key]=old[key]; });
  }
});

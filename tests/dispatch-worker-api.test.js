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
  const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GOOGLE_MAPS_SERVER_KEY','LAGOSGO_DISPATCH_CRON_SECRET'];
  const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  keys.forEach(key=>delete process.env[key]);
  try {
    const res=responseRecorder();
    await createHandler()({method:'GET',headers:{}},res);
    assert.equal(res.statusCode,401);
    process.env.LAGOSGO_DISPATCH_CRON_SECRET='configured';
    const configuredRes=responseRecorder();
    await createHandler()({method:'GET',headers:{authorization:'Bearer configured'}},configuredRes);
    assert.equal(configuredRes.statusCode,503);
    assert.deepEqual(configuredRes.body.missing,['SUPABASE_SERVICE_ROLE_KEY','GOOGLE_MAPS_SERVER_KEY']);
  } finally {
    keys.forEach(key=>{ if(old[key]===undefined) delete process.env[key]; else process.env[key]=old[key]; });
  }
});

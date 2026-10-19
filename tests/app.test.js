const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

test('LagosGo product stays separate from other businesses', () => {
  assert.doesNotMatch(html, /POSH9JA|OJA|posh9jaexport\.co\.uk|ecosystemPartners/i);
  assert.doesNotMatch(app, /POSH9JA|OJA|posh9jaexport\.co\.uk|data-ecosystem-partner/i);
  assert.match(readme, /standalone ride-hailing and mobility product/i);
  assert.match(readme, /Do not display or promote POSH9JA EXPORT & LOGISTICS, OJA/i);
});

test('primary ride booking remains visible and prototype limitations are honest', () => {
  assert.match(html, /id="pickup"/);
  assert.match(html, /id="destination"/);
  assert.match(html, /id="bookBtn"/);
  assert.match(html, /id="routePreviewBtn"/);
  assert.match(html, /illustrative/i);
  assert.match(app, /Live booking is not connected yet/i);
});

test('LagosGo-native future services are not represented as live', () => {
  assert.match(html, /Go Send/);
  assert.match(html, /GoShare/);
  assert.match(app, /planned/i);
  assert.match(html, /No merchants, menus, payments or deliveries are connected yet/i);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentTypeFor } from '../scripts/deploy-r2.mjs';

test('contentTypeFor maps the static extensions the arcade ships', () => {
  assert.equal(contentTypeFor('index.html'), 'text/html; charset=utf-8');
  assert.equal(contentTypeFor('assets/main-abc123.js'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('assets/main-abc123.mjs'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('assets/index-x.css'), 'text/css; charset=utf-8');
  assert.equal(contentTypeFor('assets/data.json'), 'application/json');
  assert.equal(contentTypeFor('assets/main.js.map'), 'application/json');
  assert.equal(contentTypeFor('sprite.svg'), 'image/svg+xml');
  assert.equal(contentTypeFor('fonts/VectorBattle-e9XO.ttf'), 'font/ttf');
  assert.equal(contentTypeFor('fonts/x.woff2'), 'font/woff2');
  assert.equal(contentTypeFor('icon.png'), 'image/png');
  assert.equal(contentTypeFor('favicon.ico'), 'image/x-icon');
});

test('contentTypeFor is case-insensitive on the extension', () => {
  assert.equal(contentTypeFor('README.HTML'), 'text/html; charset=utf-8');
});

test('contentTypeFor falls back to octet-stream for unknown extensions', () => {
  assert.equal(contentTypeFor('mystery.xyz'), 'application/octet-stream');
  assert.equal(contentTypeFor('noextension'), 'application/octet-stream');
});

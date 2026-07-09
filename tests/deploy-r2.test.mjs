import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { contentTypeFor, collectUploads } from '../scripts/deploy-r2.mjs';

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

test('collectUploads walks a nested tree into correct keys and content-types', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'deploy-r2-'));
  try {
    writeFileSync(join(tmp, 'index.html'), '<html></html>');
    mkdirSync(join(tmp, 'assets'));
    writeFileSync(join(tmp, 'assets', 'main-abc.js'), 'console.log(1)');
    mkdirSync(join(tmp, 'fonts'));
    writeFileSync(join(tmp, 'fonts', 'x.ttf'), 'font-bytes');

    const uploads = collectUploads(tmp);
    const keys = uploads.map((u) => u.key).sort();
    assert.deepEqual(keys, ['assets/main-abc.js', 'fonts/x.ttf', 'index.html']);

    const byKey = Object.fromEntries(uploads.map((u) => [u.key, u]));
    assert.equal(byKey['assets/main-abc.js'].contentType, 'text/javascript; charset=utf-8');
    assert.equal(byKey['index.html'].contentType, 'text/html; charset=utf-8');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('collectUploads throws a friendly error on an empty dist dir', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'deploy-r2-empty-'));
  try {
    assert.throws(() => collectUploads(tmp), /did the build run/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('collectUploads throws the same friendly error when the dist dir does not exist', () => {
  const base = mkdtempSync(join(tmpdir(), 'deploy-r2-missing-'));
  try {
    const missing = join(base, 'does-not-exist-dist');
    assert.throws(() => collectUploads(missing), /did the build run/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

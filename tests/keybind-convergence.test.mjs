// Story sa1-5 — keybind convergence: every game exposes a remappable
// CONTROL_MANIFEST and reads input through resolveBindings, so a new game
// cannot silently ship un-rebindable controls. Sibling of shell-convergence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const GAMES = [
  'tempest',
  'star-wars',
  'asteroids',
  'battlezone',
  'red-baron',
  'centipede',
  'joust',
  'missile-command',
  'pac-man',
  'millipede',
  'defender',
];

/**
 * Source with comments removed.
 *
 * Every source-text assertion in this file goes through this. Without it a guard
 * cannot tell code from prose ABOUT code, so commenting a line out leaves the
 * guard green — the mechanism is gone and nothing says so.
 *
 * Block comments first, then line comments. The `//` pattern is anchored to
 * start-of-line-or-whitespace so it cannot eat the `//` inside a `https://` URL.
 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');

for (const id of GAMES) {
  test(`${id} declares a ControlManifest`, () => {
    const controls = `plugins/${id}/src/shell/controls.ts`;
    assert.ok(existsSync(join(ROOT, controls)), `${controls} missing`);
    const src = stripComments(readFileSync(join(ROOT, controls), 'utf8'));
    assert.match(src, /export const CONTROL_MANIFEST/, `${id} must export CONTROL_MANIFEST`);
    assert.match(src, /action:/, `${id} manifest looks empty`);
  });

  test(`${id} input reads resolveBindings`, () => {
    const input = join(ROOT, `plugins/${id}/src/shell/input.ts`);
    const src = stripComments(readFileSync(input, 'utf8'));
    assert.match(src, /resolveBindings/, `${id} input.ts must resolve bindings, not hard-code keys`);
  });
}

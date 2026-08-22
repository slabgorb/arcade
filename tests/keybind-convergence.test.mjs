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

  // A manifest + resolveBindings is inert unless main.ts actually stands the
  // overlay up and gives it the two powers the whole feature rests on: freezing
  // the sim while it is open, and drawing itself. Without this, a future game
  // could pass the two checks above yet ship an un-openable, un-freezing overlay
  // — a manifest nobody can reach. Bind every assertion to the overlay VARIABLE
  // (captured from its construction), so `.isOpen()`/`.draw(` on some unrelated
  // object cannot satisfy the guard.
  test(`${id} main.ts wires the controls overlay`, () => {
    const main = join(ROOT, `plugins/${id}/src/main.ts`);
    const src = stripComments(readFileSync(main, 'utf8'));
    const built = src.match(/const\s+(\w+)\s*=\s*createControlsOverlay\s*\(/);
    assert.ok(built, `${id} main.ts must construct the overlay (const <v> = createControlsOverlay(...))`);
    const v = built[1];
    assert.match(
      src,
      new RegExp(`\\b${v}\\.isOpen\\s*\\(\\s*\\)`),
      `${id} main.ts must gate the sim freeze on ${v}.isOpen()`,
    );
    assert.match(
      src,
      new RegExp(`\\b${v}\\.draw\\s*\\(`),
      `${id} main.ts must render the overlay with ${v}.draw(...)`,
    );
  });
}

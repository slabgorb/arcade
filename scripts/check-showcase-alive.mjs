// Showcase LIVENESS gate — Story uf1-20.
//
// The lobby carousel frames each `showcase: true` game in a same-origin iframe at
// `/<id>/`. Every EXISTING guard around it asserts MEMBERSHIP, WIRING, or HTTP-200 —
// none asks whether the framed game actually renders. hosting.md says it plainly: "A
// game serving a broken build still fires load and looks healthy from the lobby", and
// `just check-showcase` "measures the HTTP status of /<id>/, and nothing else". A
// black, frozen, or exception-throwing pane therefore ships green.
//
// This automates the by-hand method proven on ad1-2: reach the framed game's canvas
// and sample its lit-pixel count over ten 250 ms ticks. A live game's counts VARY; a
// static (dead) frame's do not — and a black frame is all zero. That verdict is
// `isAlive()`.
//
// AC-4 DECISION (uf1-20, 2026-08-06): this is a DOCUMENTED, ON-DEMAND MANUAL GATE, not
// a CI gate. Observing real pixels needs a real browser, and this repo deliberately has
// no browser harness — every vitest project runs `environment: 'node'` and CI is
// `npm ci → lint → orchestrator → vitest → build`. Playwright is therefore imported
// DYNAMICALLY and is NOT a committed dependency: adding it would make every `npm ci`
// pay the browser-install cost for a gate CI never runs. Install it on demand to run
// this locally (see the recipe / hosting.md). The two pure functions below carry the
// contract the orchestrator suite pins (tests/showcase-liveness.test.mjs); `main()` is
// the browser leg that cannot run there.

import { pathToFileURL } from 'node:url';
import { GAMES, gamePath } from '../src/host/registry.ts';

/** Ten samples at 250 ms — the cadence ad1-2 measured ten distinct counts across. */
export const LIVENESS_TICKS = 10;
export const LIVENESS_TICK_MS = 250;

/**
 * The games the liveness gate probes: every `showcase: true` game, at its `/<id>/`
 * path. DERIVED from the roster (defaults to the live registry) rather than hand-kept,
 * so it tracks ad1-1/ad1-3/ad1-4/ad1-5 as they opt games into the carousel.
 */
export function showcaseLivenessTargets(games = GAMES) {
  return games.filter((g) => g.showcase).map((g) => ({ id: g.id, path: gamePath(g.id) }));
}

/**
 * A game is alive iff its lit-pixel counts VARY across the samples and at least one is
 * non-zero. A frozen frame yields one repeated count; a black/blank frame yields all
 * zero. Both are dead — which is exactly the regression this gate exists to catch.
 */
export function isAlive(counts) {
  return new Set(counts).size >= 2 && counts.some((c) => c > 0);
}

/**
 * Count lit (non-near-black) pixels in the page's game canvas. Games draw glowing lines
 * on black, so a low luminance floor separates drawn pixels from the background. Copies
 * the game canvas onto a scratch 2D canvas so the read works whatever context the game
 * itself holds. Returns -1 when no sized canvas is present (a dead frame reads as
 * static, so this too resolves to "not alive").
 */
async function sampleLitPixels(page) {
  return page.evaluate(() => {
    const src = document.querySelector('canvas');
    if (!src || !src.width || !src.height) return -1;
    const scratch = document.createElement('canvas');
    scratch.width = src.width;
    scratch.height = src.height;
    const ctx = scratch.getContext('2d');
    ctx.drawImage(src, 0, 0);
    const { data } = ctx.getImageData(0, 0, scratch.width, scratch.height);
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] + data[i + 1] + data[i + 2] > 24) lit++;
    }
    return lit;
  });
}

async function main() {
  const origin = process.env.ARCADE_ORIGIN || 'http://127.0.0.1:5270';
  const targets = showcaseLivenessTargets();

  let pw;
  try {
    pw = await import('playwright');
  } catch {
    console.error(
      'check-showcase-alive requires Playwright — a real browser harness this repo does\n' +
        'NOT install for CI (see the AC-4 decision in docs/ops/hosting.md). Install on demand:\n' +
        '\n  npm i -D playwright && npx playwright install chromium\n',
    );
    process.exit(2);
  }

  console.log(`check-showcase-alive: probing ${targets.length} showcase game(s) at ${origin}`);
  const browser = await pw.chromium.launch();
  let dead = 0;
  try {
    for (const { id, path } of targets) {
      const page = await browser.newPage();
      const counts = [];
      try {
        await page.goto(origin + path, { waitUntil: 'load' });
        for (let i = 0; i < LIVENESS_TICKS; i++) {
          counts.push(await sampleLitPixels(page));
          if (i < LIVENESS_TICKS - 1) await page.waitForTimeout(LIVENESS_TICK_MS);
        }
      } catch (err) {
        console.error(`${id}: ${err.message}`);
      } finally {
        await page.close();
      }
      const alive = isAlive(counts);
      if (!alive) dead++;
      console.log(`${id.padEnd(12)} ${alive ? 'ALIVE' : 'DEAD '}  counts=[${counts.join(', ')}]`);
    }
  } finally {
    await browser.close();
  }

  if (dead > 0) {
    console.error(`\ncheck-showcase-alive: ${dead} showcase game(s) not rendering — see counts above`);
    process.exit(1);
  }
  console.log(`\ncheck-showcase-alive: all ${targets.length} showcase games are alive`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

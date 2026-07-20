// td1-8 — `just serve` must not swallow a failed launch.
//
// THE DEFECT (justfile:139-164 as of 2026-07-20):
//   set -euo pipefail            # does NOT catch a failure inside a backgrounded subshell
//   echo "  lobby → http://localhost:5270/"   # …×8, printed BEFORE any bind is attempted
//   (cd .../lobby && npm run dev) &          # …×8
//   wait                                      # returns 0 no matter which jobs died
// Seven servers up, one dead: `wait` blocks forever, exit code 0, no summary line.
// That re-attenuates the loud-failure guarantee td1-1 bought at the socket layer.
//
// WHY THESE TESTS ARE SHAPED THIS WAY
// A test that greps the justfile for `wait -n`, or for the ABSENCE of a bare `wait`,
// would pass the moment someone types the right string — whether or not the recipe
// actually reports a dead server. This epic keeps finding exactly that failure mode
// (td1-4's whole finding; td1-5 exists to sweep such assertions out of joust). So the
// load-bearing tests below EXERCISE the launcher: they hand it synthetic "servers"
// (node one-liners that bind a port, or exit 7 after 200ms) and assert on the real
// result — exit code, named failures, and WHEN the ready banner is emitted.
//
// THE CONTRACT THIS PINS (TEA design decision, RED phase)
// The launch/supervise logic moves OUT of the justfile recipe and INTO
// `scripts/serve.mjs`, which the recipe then calls. This is the established idiom
// here — the recipe already delegates its preflight to `node scripts/deps-doctor.mjs`,
// and scripts/ already holds release.mjs, deploy-r2.mjs, vendor-source.mjs. A bash
// recipe cannot be tested with fast synthetic jobs; a node module can.
//
//   scripts/serve.mjs exports:
//     SERVERS                     [{ name, port }, …] — the canonical cabinet, in launch order
//     jobsFor(root[, servers])    -> [{ name, port, command, args, cwd }]
//     supervise(jobs, opts)       -> Promise<{ exitCode, failures: [{name, code, …}], ready: [name] }>
//       opts.log     (line) => void   every human-readable line the launcher emits (default: console.log)
//       opts.signal  AbortSignal      abort => shut every child down (the Ctrl-C path)
//
//   scripts/serve.mjs CLI:  node scripts/serve.mjs [root]
//     builds jobsFor(root), supervises, and exits with the resulting exit code.
//
// Behaviours pinned: a dead job makes the launcher exit NON-ZERO and NAME the job;
// survivors get torn down instead of hanging on `wait`; a ready URL is printed only
// AFTER that port is observed accepting a connection; and an all-healthy fleet still
// exits 0 (so a "fix" that always fails cannot pass).
//
// ONE NON-OBVIOUS REQUIREMENT, called out so it is not discovered the hard way:
// tearing the fleet down the instant the FIRST job dies loses the others' names.
// Port collisions arrive in a burst — three games whose ports a sibling checkout
// already holds all EADDRINUSE within milliseconds — and an operator who is told
// about one of them fixes one port, re-runs, and meets the next. So the launcher
// must drain concurrent deaths for a short window before killing survivors. The
// MULTIPLE-dead-jobs test below spaces two deaths 100ms apart to require it.
//
// (TEA verified during RED that this suite is satisfiable: a reference launcher
// greened all 13 non-justfile tests, and a launcher reproducing today's exact
// defect — banner up front, background everything, always return 0 — reds 13 of
// 16. These tests are not passable by typing the right string into the justfile.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import net from 'node:net';
import { execFileSync, spawnSync, spawn } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');
const SERVE_SCRIPT = join(root, 'scripts', 'serve.mjs');

// Import lazily and per-test, so a missing module reds each test individually with
// its own reason instead of killing the whole file at collection time.
async function loadServe() {
  try {
    return await import('../scripts/serve.mjs');
  } catch (err) {
    assert.fail(`scripts/serve.mjs must exist and be importable — ${err.message}`);
  }
}

// Same recipe-body extractor contract as canonical-serve.test.mjs / deps-doctor.test.mjs:
// header at column 0, indented body, `:=` assignments excluded.
function recipeBody(justfile, name) {
  const lines = justfile.split('\n');
  const header = new RegExp(`^${name}(\\s|:)`);
  const isAssignment = /:=/;
  const start = lines.findIndex((line) => header.test(line) && !isAssignment.test(line));
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { body.push(line); continue; }
    if (!/^\s/.test(line)) break;
    body.push(line);
  }
  return body.join('\n');
}

// ---------------------------------------------------------------------------
// Synthetic "servers". Each is a real child process with real exit codes and a
// real TCP bind — the only thing faked is that they are fast.
// ---------------------------------------------------------------------------

const NODE = process.execPath;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

// Every long-lived synthetic server carries a self-destruct. Tearing the fleet
// down is the launcher's job, so a launcher that fails to do it would otherwise
// leave orphan node processes behind on every red run. WATCHDOG_MS is far beyond
// every deadline asserted below, so it can never rescue a broken launcher — it
// only stops a failing run from littering the machine.
const WATCHDOG_MS = 25000;

// Binds `port` after `delayMs`, then stays up (like a real dev server).
const healthy = (name, port, delayMs = 0) => ({
  name,
  port,
  command: NODE,
  args: ['-e', `setTimeout(()=>{require('net').createServer(c=>c.end()).listen(${port},'127.0.0.1')},${delayMs});setTimeout(()=>process.exit(0),${WATCHDOG_MS})`],
  cwd: root,
});

// Never binds; exits `code` after `delayMs` — the EADDRINUSE shape.
const diesAtStartup = (name, port, delayMs, code) => ({
  name,
  port,
  command: NODE,
  args: ['-e', `setTimeout(()=>process.exit(${code}),${delayMs})`],
  cwd: root,
});

// Binds, serves for a while, THEN dies — the crash-after-startup shape, which a
// launcher that only checks the first second of life would miss.
const diesLate = (name, port, bindMs, dieMs, code) => ({
  name,
  port,
  command: NODE,
  args: ['-e', `const s=require('net').createServer(c=>c.end());setTimeout(()=>s.listen(${port},'127.0.0.1'),${bindMs});setTimeout(()=>{try{s.close()}catch{}process.exit(${code})},${dieMs})`],
  cwd: root,
});

// Alive but deaf: the process runs and never binds. A hung server must never get
// a "ready" URL printed for it.
const neverBinds = (name, port) => ({
  name,
  port,
  command: NODE,
  args: ['-e', `setTimeout(()=>process.exit(0),${WATCHDOG_MS})`],
  cwd: root,
});

// A launcher that never notices a dead job HANGS (that is the bare-`wait` bug
// itself). Racing it against a deadline turns that hang into a readable failure
// instead of a bare test-runner timeout.
async function resolvesWithin(promise, ms, what) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`the launcher did not finish within ${ms}ms — ${what}`)), ms);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

async function waitFor(pred, timeoutMs, what) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (pred()) return;
    await sleep(25);
  }
  assert.fail(`timed out after ${timeoutMs}ms waiting for ${what}`);
}

const readyRe = (port) => new RegExp(`http://localhost:${port}\\b`);

// ---------------------------------------------------------------------------
// The launcher exists and is delegated to
// ---------------------------------------------------------------------------

test('td1-8: the launch/supervise logic lives in scripts/serve.mjs, not inline in the recipe', () => {
  assert.ok(
    existsSync(SERVE_SCRIPT),
    'scripts/serve.mjs must exist — a bash recipe that backgrounds eight jobs cannot be tested for whether it notices one dying',
  );
});

// ---------------------------------------------------------------------------
// BEHAVIOUR: a dead job is detected, named, and makes the launcher exit non-zero
// ---------------------------------------------------------------------------

test('td1-8 AC2: one job of N exits non-zero -> the launcher exit code is NON-ZERO', { timeout: 30000 }, async () => {
  const { supervise } = await loadServe();
  const [pA, pDead, pC] = [await freePort(), await freePort(), await freePort()];

  const result = await resolvesWithin(
    supervise(
      [healthy('tempest', pA), diesAtStartup('red-baron', pDead, 200, 7), healthy('joust', pC)],
      { log: () => {} },
    ),
    8000,
    'red-baron died at t+200ms and two long-running siblings kept it blocked (this is bare `wait`)',
  );

  assert.notEqual(
    result.exitCode,
    0,
    'a dead server must not be reported as a healthy fleet — this is the bare `wait` returning 0',
  );
});

test('td1-8 AC1: the failure is NAMED — a silent non-zero exit is barely better than silence', { timeout: 30000 }, async () => {
  const { supervise } = await loadServe();
  const lines = [];
  const [pA, pDead] = [await freePort(), await freePort()];

  const result = await resolvesWithin(
    supervise([healthy('tempest', pA), diesAtStartup('red-baron', pDead, 200, 7)], { log: (l) => lines.push(l) }),
    8000,
    'red-baron died and the launcher never reported it',
  );

  assert.ok(
    result.failures.some((f) => f.name === 'red-baron'),
    `the result must carry the dead job by name; got ${JSON.stringify(result.failures)}`,
  );
  const named = lines.filter((l) => /red-baron/.test(l) && /fail/i.test(l));
  assert.ok(
    named.length > 0,
    `the launcher must print a line naming the dead server (e.g. "FAILED: red-baron did not start"); it printed:\n${lines.join('\n')}`,
  );
  assert.ok(
    !lines.some((l) => /tempest/.test(l) && /fail/i.test(l)),
    'a healthy server must not be reported as failed',
  );
});

test('td1-8: the dead job\'s exit code is reported, not flattened to a bare boolean', { timeout: 30000 }, async () => {
  const { supervise } = await loadServe();
  const pDead = await freePort();

  const result = await resolvesWithin(
    supervise([diesAtStartup('red-baron', pDead, 150, 7)], { log: () => {} }),
    8000,
    'the only server died at t+150ms',
  );

  const failure = result.failures.find((f) => f.name === 'red-baron');
  assert.ok(failure, 'red-baron must appear in failures');
  assert.equal(failure.code, 7, 'the child\'s real exit status must survive to the report');
});

test('td1-8: survivors are torn down — the launcher does NOT block forever like bare `wait`', { timeout: 30000 }, async () => {
  const { supervise } = await loadServe();
  const [pForever, pDead] = [await freePort(), await freePort()];
  const started = Date.now();

  // `healthy` runs until killed. Under today's recipe this is precisely the hang:
  // seven long-running servers keep `wait` blocked while the eighth is dead.
  const result = await resolvesWithin(
    supervise([healthy('tempest', pForever), diesAtStartup('red-baron', pDead, 200, 7)], { log: () => {} }),
    8000,
    'a long-running sibling kept the launcher blocked after red-baron died — exactly the bare-`wait` hang',
  );

  const elapsed = Date.now() - started;
  assert.notEqual(result.exitCode, 0);
  assert.ok(
    elapsed < 8000,
    `the launcher must tear the fleet down once a server dies; it took ${elapsed}ms (a long-running sibling kept it blocked)`,
  );
});

test('td1-8: MULTIPLE dead jobs are all named, not just the first one to die', { timeout: 30000 }, async () => {
  const { supervise } = await loadServe();
  const lines = [];
  const [pA, pB, pC] = [await freePort(), await freePort(), await freePort()];

  const result = await resolvesWithin(
    supervise(
      [
        healthy('tempest', pA),
        diesAtStartup('red-baron', pB, 150, 7),
        diesAtStartup('centipede', pC, 250, 3),
      ],
      { log: (l) => lines.push(l) },
    ),
    8000,
    'two servers died and the launcher never reported either',
  );

  const names = result.failures.map((f) => f.name).sort();
  assert.deepEqual(
    names,
    ['centipede', 'red-baron'],
    `both dead servers must be reported; got ${JSON.stringify(result.failures)}`,
  );
  for (const name of ['red-baron', 'centipede']) {
    assert.ok(
      lines.some((l) => new RegExp(name).test(l) && /fail/i.test(l)),
      `the summary must name ${name}; it printed:\n${lines.join('\n')}`,
    );
  }
});

test('td1-8: a job that dies LATE (after binding) is still caught — not just startup failures', { timeout: 30000 }, async () => {
  const { supervise } = await loadServe();
  const lines = [];
  const [pA, pLate] = [await freePort(), await freePort()];

  const result = await resolvesWithin(
    supervise([healthy('tempest', pA), diesLate('joust', pLate, 100, 700, 4)], { log: (l) => lines.push(l) }),
    8000,
    'joust bound, served, then crashed at t+700ms and the launcher never noticed',
  );

  assert.notEqual(result.exitCode, 0, 'a server that crashes after startup must still fail the run');
  assert.ok(
    result.failures.some((f) => f.name === 'joust'),
    `a late death must be reported; got ${JSON.stringify(result.failures)}`,
  );
  assert.ok(
    lines.some((l) => /joust/.test(l) && /fail/i.test(l)),
    `the summary must name the late-dying server; it printed:\n${lines.join('\n')}`,
  );
});

// ---------------------------------------------------------------------------
// BEHAVIOUR: the ready banner must not assert readiness it has not observed
// ---------------------------------------------------------------------------

test('td1-8 AC4: a ready URL is printed only AFTER that port is observed accepting a connection', { timeout: 30000 }, async () => {
  const { supervise } = await loadServe();
  const lines = [];
  const port = await freePort();
  const ac = new AbortController();

  // Binds at t+700ms. Today's recipe echoes all eight URLs before the first
  // `npm run dev` even runs, so any pre-bind ready line is the defect itself.
  const running = supervise([healthy('lobby', port, 700)], { log: (l) => lines.push(l), signal: ac.signal });

  await sleep(250);
  assert.ok(
    !lines.some((l) => readyRe(port).test(l)),
    `the ready URL for :${port} was printed before the server bound — the banner is asserting readiness it has not observed. Printed so far:\n${lines.join('\n')}`,
  );

  await waitFor(() => lines.some((l) => readyRe(port).test(l)), 6000, `the ready URL for :${port} after the bind`);
  ac.abort();
  const result = await resolvesWithin(running, 8000, 'the launcher must shut the fleet down when its AbortSignal fires (the Ctrl-C path)');

  assert.deepEqual(result.failures, [], 'a healthy server must not be reported as failed');
  assert.ok(result.ready.includes('lobby'), 'a server whose port accepted a connection must be reported ready');
});

test('td1-8 AC4: a server that runs but never binds NEVER gets a ready URL printed', { timeout: 30000 }, async () => {
  const { supervise } = await loadServe();
  const lines = [];
  const [pGood, pDeaf] = [await freePort(), await freePort()];
  const ac = new AbortController();

  const running = supervise(
    [healthy('tempest', pGood), neverBinds('red-baron', pDeaf)],
    { log: (l) => lines.push(l), signal: ac.signal },
  );

  await waitFor(() => lines.some((l) => readyRe(pGood).test(l)), 6000, 'tempest to be reported ready');
  await sleep(400);
  ac.abort();
  const result = await resolvesWithin(running, 8000, 'the launcher must shut the fleet down when its AbortSignal fires (the Ctrl-C path)');

  assert.ok(
    !lines.some((l) => readyRe(pDeaf).test(l)),
    `a hung server that never bound must not be advertised as ready. Printed:\n${lines.join('\n')}`,
  );
  assert.ok(!result.ready.includes('red-baron'), 'red-baron never bound — it must not appear in `ready`');
  assert.ok(result.ready.includes('tempest'), 'tempest did bind — it must appear in `ready`');
});

// ---------------------------------------------------------------------------
// GUARD: a launcher that "passes" by always failing must not pass
// ---------------------------------------------------------------------------

test('td1-8: an all-healthy fleet stays up and shuts down with exit code 0', { timeout: 30000 }, async () => {
  const { supervise } = await loadServe();
  const lines = [];
  const [pA, pB, pC] = [await freePort(), await freePort(), await freePort()];
  const ac = new AbortController();

  const running = supervise(
    [healthy('lobby', pA), healthy('tempest', pB, 150), healthy('joust', pC, 300)],
    { log: (l) => lines.push(l), signal: ac.signal },
  );

  await waitFor(
    () => [pA, pB, pC].every((p) => lines.some((l) => readyRe(p).test(l))),
    8000,
    'all three servers to be reported ready',
  );

  // Nothing has died; the launcher must still be running (this is the Ctrl-C path).
  ac.abort();
  const result = await resolvesWithin(running, 8000, 'the launcher must shut the fleet down when its AbortSignal fires (the Ctrl-C path)');

  assert.deepEqual(result.failures, [], `no server died, so nothing may be reported failed: ${JSON.stringify(result.failures)}`);
  assert.equal(result.exitCode, 0, 'a healthy fleet shut down by the operator must exit 0');
  assert.deepEqual(result.ready.sort(), ['joust', 'lobby', 'tempest']);
});

// ---------------------------------------------------------------------------
// END TO END: the CLI's own exit code, through a real process boundary.
// Guards the seam where supervise() reports non-zero and the CLI ignores it.
// ---------------------------------------------------------------------------

test('td1-8 AC2: the serve CLI itself exits non-zero and names the servers that did not start', () => {
  assert.ok(existsSync(SERVE_SCRIPT), 'scripts/serve.mjs must exist for the CLI contract to be testable');

  // An empty root: every subrepo directory is missing, so every launch fails
  // immediately (spawn ENOENT / npm error). No real vite, no real ports, fast.
  const emptyRoot = mkdtempSync(join(tmpdir(), 'td1-8-serve-empty-'));

  let status = null;
  let output = '';
  let signal = null;
  try {
    output = execFileSync(NODE, [SERVE_SCRIPT, emptyRoot], { encoding: 'utf8', stdio: 'pipe', timeout: 60000 });
    status = 0;
  } catch (err) {
    status = err.status;
    signal = err.signal;
    output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
  }

  assert.equal(signal, null, `the launcher must not hang — it was killed by ${signal} after the timeout`);
  // Reviewer HIGH (td1-8, review round): `notEqual(status, 0)` alone cannot tell
  // "correctly non-zero because a server died" from "killed by a signal, code
  // discarded" — both are non-zero. A signal-death is exactly the failure mode of
  // the recipe's `trap 'kill 0' EXIT` (it SIGTERMs its own shell, so $? is 143 =
  // 128+15 regardless of health). So require a GENUINE exit code: a real integer,
  // not the 128+N a shell reports for a signal-kill, and not null (a raw signal).
  assert.notEqual(status, 0, `every server failed to launch, so the CLI must exit non-zero. Output:\n${output}`);
  assert.ok(
    Number.isInteger(status) && status > 0 && status < 128,
    `the CLI must exit with a genuine non-zero code carrying health information, not be killed by a signal (128+N) or hang; got status=${status}, signal=${signal}. Output:\n${output}`,
  );
  for (const name of ['lobby', 'joust']) {
    assert.match(output, new RegExp(name), `the CLI must name the servers that did not start (missing ${name}). Output:\n${output}`);
  }
});

// ---------------------------------------------------------------------------
// WIRING: the recipe must actually route through the tested launcher.
// These are text contracts on purpose — they carry no behavioural claim of their
// own (the tests above do that); they exist so the justfile cannot keep its own
// untested copy of the launch logic alongside the fixed one.
// ---------------------------------------------------------------------------

test('td1-8 wiring: the `serve` recipe delegates to scripts/serve.mjs', () => {
  const body = recipeBody(read('justfile'), 'serve') ?? '';
  assert.match(
    body,
    /serve\.mjs/,
    'the serve recipe must call scripts/serve.mjs — the launcher under test is the one that must actually run',
  );
});

// Comments must be stripped before this guard runs. The recipe legitimately DESCRIBES
// what it used to do, and prose about `npm run dev` or a `localhost:5270` example must
// not trip a guard aimed at executable text — the same false-positive class
// extract-audio.test.mjs's stripComments() exists to avoid.
const stripShellComments = (body) => body.replace(/^\s*#.*$/gm, '');

// This is a TEXT guard, deliberately, and it is the one thing the behavioural tests
// above cannot check: they prove scripts/serve.mjs supervises correctly, but they can
// say nothing about the justfile ALSO launching servers behind its back. Two launchers,
// one of them untested, is precisely the state td1-8 exists to end.
//
// Kept broad (any `npm run dev` in executable recipe text) rather than pinned to the
// old bash spelling `(cd {{root}}/X && npm run dev) &`: the anti-goal is "the recipe
// launches a dev server itself", not "the recipe uses that particular syntax". A
// narrower pattern would wave through `cd x; npm run dev &` or a for-loop rewrite,
// which are the same defect wearing different clothes.
test('td1-8 wiring: the recipe does not launch dev servers itself, beside scripts/serve.mjs', () => {
  const body = stripShellComments(recipeBody(read('justfile'), 'serve') ?? '');
  assert.doesNotMatch(
    body,
    /npm run dev/,
    'the recipe must not keep a second, untested copy of the launch loop beside scripts/serve.mjs',
  );
});

test('td1-8 wiring: the recipe no longer prints ready URLs it has not observed', () => {
  const body = stripShellComments(recipeBody(read('justfile'), 'serve') ?? '');
  assert.doesNotMatch(
    body,
    /localhost:52\d\d/,
    'the ready banner must be emitted by the launcher AFTER a bind, not echoed unconditionally by the recipe',
  );
});

test('td1-8 wiring: SERVERS is the whole cabinet, in the justfile\'s launch order', { timeout: 30000 }, async () => {
  const { SERVERS } = await loadServe();
  const justfile = read('justfile');
  const subrepos = justfile.match(/^subrepos\s*:=\s*"([^"]*)"/m);
  assert.notEqual(subrepos, null, 'justfile must still define the canonical `subrepos` list');

  assert.deepEqual(
    SERVERS.map((s) => s.name),
    subrepos[1].trim().split(/\s+/),
    'moving the port table into scripts/serve.mjs must not drop or reorder a subrepo',
  );
});

test('td1-8 wiring: every SERVERS port matches the port CLAUDE.md publishes for that subrepo', { timeout: 30000 }, async () => {
  const { SERVERS } = await loadServe();
  const claude = read('CLAUDE.md').split('\n');
  for (const { name, port } of SERVERS) {
    const row = claude.find((l) => new RegExp(`\\b${name}\\b`).test(l) && /localhost:52\d\d/.test(l));
    assert.ok(row, `CLAUDE.md must document a localhost port for ${name}`);
    assert.match(
      row,
      new RegExp(`localhost:${port}\\b`),
      `scripts/serve.mjs pins ${name} to ${port}, but CLAUDE.md documents "${row.trim()}"`,
    );
  }
});

// ---------------------------------------------------------------------------
// The launcher must not SWALLOW its children's output.
//
// THIS IS A GAP IN THIS FILE'S OWN RED PHASE, found at verify. Every test above
// asserts what the launcher PRINTS ITSELF, through the injected `log` sink — so
// none of them notice that `spawn(cmd, args, { cwd })` with no `stdio` option
// defaults to 'pipe', leaving every dev server's stdout and stderr going into
// pipes nobody reads. Measured: a child printing a marker produces ZERO
// occurrences of it in the launcher's combined output.
//
// It inverts the story exactly. td1-8's complaint was that a failure's only
// signal was "that repo's vite stack trace interleaved with seven repos'
// concurrent startup chatter". A launcher that removes the interleaving by
// removing the OUTPUT names the corpse and destroys the autopsy: `just serve`
// says "FAILED: red-baron did not start (exit code 1)" and offers no way to
// learn why. In normal operation the loss is worse — no "VITE ready in 340ms",
// no HMR, no compile errors, for any of the eight servers.
//
// NOT A HANG. A tempting adjacent theory — undrained pipes fill and deadlock the
// child — was tested and DISPROVED: a child wrote 2MB and exited normally in
// 485ms. Do not "fix" a deadlock that does not exist; the defect is output loss.
//
// HOW THIS OBSERVES OUTPUT WITHOUT PINNING THE MECHANISM
// Two reasonable fixes exist and this must pass under BOTH:
//   (a) stdio: 'inherit' — the child writes straight to the launcher's fd 1/2;
//   (b) pipe each stream and prefix every line with its server name — the
//       launcher writes to its own fd 1/2.
// Either way the text lands on THE LAUNCHER PROCESS'S stdout/stderr. So these
// run the launcher in a subprocess and read its fds, rather than inspecting the
// `log` sink or asserting on spawn options. Asserting `stdio: 'inherit'` would
// foreclose (b) — the implementation-coupling disease this story spent a phase
// curing on six other tests.
//
// The launcher's own `log` is silenced in the driver, so ANY captured text can
// only have come from a child. Attribution (which server said what) is
// deliberately NOT pinned: (b) satisfies it and (a) does not, and forcing (b)
// through a test would make this design decision for Dev rather than leaving it.

const CHILD_STDOUT_MARKER = 'CHILD_SAYS_VITE_READY_ON_STDOUT';
const CHILD_STDERR_MARKER = 'CHILD_SAYS_STACK_TRACE_ON_STDERR';

// Runs supervise() in a real subprocess and returns everything that reached its
// stdout and stderr. `log` is silenced inside the driver.
function captureLauncherOutput(jobs, { abortAfterMs = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'td1-8-child-output-'));
  const driver = join(dir, 'driver.mjs');
  writeFileSync(driver, `
    const { supervise } = await import(process.argv[2]);
    const spec = JSON.parse(process.argv[3]);
    const ac = new AbortController();
    if (spec.abortAfterMs) setTimeout(() => ac.abort(), spec.abortAfterMs);
    // The launcher's OWN reporting is silenced: anything on this process's
    // stdout/stderr must therefore have come from a child.
    await supervise(spec.jobs, { log: () => {}, signal: ac.signal });
    process.exit(0);
  `);

  const res = spawnSync(
    NODE,
    [driver, pathToFileURL(SERVE_SCRIPT).href, JSON.stringify({ jobs, abortAfterMs })],
    { encoding: 'utf8', timeout: 30000 },
  );

  assert.equal(res.error?.code, undefined, `the launcher subprocess failed to run: ${res.error?.message}`);
  assert.notEqual(res.signal, 'SIGTERM', 'the launcher subprocess timed out rather than finishing');
  const stdout = res.stdout ?? '';
  const stderr = res.stderr ?? '';
  return { stdout, stderr, combined: `${stdout}${stderr}` };
}

// A dev server that greets on stdout, throws on stderr, then dies — the exact
// scenario the story is about (a server that did not come up, and the operator
// needing to know why). The 120ms delay lets both writes flush before exit.
const chattyThenDies = (name, port) => ({
  name,
  port,
  command: NODE,
  args: ['-e', `process.stdout.write('${CHILD_STDOUT_MARKER}\\n');process.stderr.write('${CHILD_STDERR_MARKER}\\n');setTimeout(()=>process.exit(1),120)`],
  cwd: root,
});

// A healthy dev server that greets and keeps running — guards against a "fix"
// that only surfaces child output on death, which would still lose every HMR
// message and compile error during a normal session.
const chattyAndHealthy = (name, port) => ({
  name,
  port,
  command: NODE,
  args: ['-e', `process.stdout.write('${CHILD_STDOUT_MARKER}\\n');process.stderr.write('${CHILD_STDERR_MARKER}\\n');require('net').createServer(c=>c.end()).listen(${port},'127.0.0.1');setTimeout(()=>process.exit(0),${WATCHDOG_MS})`],
  cwd: root,
});

test('td1-8: a dead server\'s STDOUT reaches the operator, not a pipe nobody reads', { timeout: 30000 }, async () => {
  const port = await freePort();
  const { combined } = captureLauncherOutput([chattyThenDies('red-baron', port)]);

  assert.ok(
    combined.includes(CHILD_STDOUT_MARKER),
    `the launcher discarded the server's stdout. Naming a dead server while destroying its output leaves the operator no way to diagnose it. Captured:\n${JSON.stringify(combined)}`,
  );
});

test('td1-8: a dead server\'s STDERR reaches the operator — that is where the stack trace is', { timeout: 30000 }, async () => {
  const port = await freePort();
  const { combined } = captureLauncherOutput([chattyThenDies('red-baron', port)]);

  // Asserted separately from stdout on purpose: a fix that forwards only stdout
  // would pass the test above while still destroying the vite stack trace, which
  // is the single piece of output td1-8's story text actually names.
  assert.ok(
    combined.includes(CHILD_STDERR_MARKER),
    `the launcher discarded the server's stderr — the vite stack trace the story is about. Captured:\n${JSON.stringify(combined)}`,
  );
});

test('td1-8: a HEALTHY server\'s output reaches the operator too, not just a dying one', { timeout: 30000 }, async () => {
  const port = await freePort();
  const { combined } = captureLauncherOutput([chattyAndHealthy('tempest', port)], { abortAfterMs: 1500 });

  // A launcher that buffered child output and flushed it only on failure would
  // pass both tests above and still lose every HMR message and compile error in
  // a normal session — the dev loop `just serve` exists to serve.
  assert.ok(
    combined.includes(CHILD_STDOUT_MARKER),
    `a running server's stdout never reached the operator (no HMR, no "VITE ready", no compile errors). Captured:\n${JSON.stringify(combined)}`,
  );
  assert.ok(
    combined.includes(CHILD_STDERR_MARKER),
    `a running server's stderr never reached the operator. Captured:\n${JSON.stringify(combined)}`,
  );
});

// ---------------------------------------------------------------------------
// The RECIPE seam — the thing the operator actually runs.
//
// GAP THIS CLOSES (Reviewer HIGH, td1-8 review round): every test above drives
// `node scripts/serve.mjs` directly. Nothing exercised the justfile `serve`
// recipe — and that is exactly where the story's core defect survived. The
// recipe still ends `trap 'kill 0' EXIT` … `node scripts/serve.mjs`, and
// `kill 0` SIGTERMs the recipe's OWN shell, so the recipe dies of signal 15 and
// returns 143 no matter what the script computed. The launcher went from
// ALWAYS 0 (the original bug) to ALWAYS 143 — still no health information in
// the exit code a caller checks. Same lesson as the stdio miss, one layer out:
// validate the wiring, not just the component.
//
// HOW THIS TESTS THE RECIPE WITHOUT BINDING THE EIGHT PINNED PORTS
// It extracts the REAL recipe body from the repo justfile (via recipeBody, the
// same helper the other suites use — never a hand-pasted copy, which would be
// the vacuity this epic keeps killing), renders just's `{{root}}`/`{{subrepos}}`
// against a throwaway fixture tree, and points `{{root}}` at that fixture. The
// fixture's scripts/serve.mjs is a STUB that just `process.exit(code)` — no
// vite, no npm, no ports. The stub deps-doctor exits 0. So the recipe runs its
// real preflight+trap+delegation shape end to end, and the only thing faked is
// what the launcher would have computed.
//
// PROCESS-GROUP ISOLATION: the recipe is spawned `detached: true`, so it leads
// its own process group and its `kill 0` reaches only itself — never this test
// runner. (Verified: without detach, `kill 0` would take the runner down too.)
//
// MECHANISM NOT PINNED: this asserts the OBSERVABLE contract — the recipe's exit
// code distinguishes a healthy shutdown (0) from a dead server (non-zero), and a
// signal-kill (128+N / null) is not a health signal. Whether Dev disarms the
// trap and forwards the code, or moves group teardown into the script with
// detached children, is left open.

// Render a `just` recipe body: substitute {{root}} and {{subrepos}}. just also
// strips the recipe's common leading indentation before running; do the same so
// the shebang line lands at column 0, faithfully reproducing what `just` runs.
function renderRecipe(body, { root, subrepos }) {
  const lines = body.replace(/\n+$/, '').split('\n');
  const indents = lines.filter((l) => l.trim() !== '').map((l) => l.match(/^\s*/)[0].length);
  const common = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((l) => l.slice(common))
    .join('\n')
    .replaceAll('{{root}}', root)
    .replaceAll('{{subrepos}}', subrepos) + '\n';
}

// Run the REAL `serve` recipe against a fixture whose stub launcher exits with
// `serveExitCode`. Returns the recipe process's { status, signal }. Binds nothing.
function runServeRecipe(serveExitCode) {
  const dir = mkdtempSync(join(tmpdir(), 'td1-8-recipe-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  // Stub launcher: the whole fleet, reduced to one line — exit with a code we choose.
  writeFileSync(join(dir, 'scripts', 'serve.mjs'), `process.exit(${serveExitCode});\n`);
  // Stub preflight: always clean, so it never masks the exit-code question under test.
  writeFileSync(join(dir, 'scripts', 'deps-doctor.mjs'), 'process.exit(0);\n');

  const body = recipeBody(read('justfile'), 'serve');
  assert.notEqual(body, null, 'justfile must define a `serve` recipe');
  // Guard against a vacuous run: we must be exercising the real trap+delegation.
  assert.match(body, /serve\.mjs/, 'the recipe under test must delegate to scripts/serve.mjs');

  const script = join(dir, 'recipe.sh');
  writeFileSync(script, renderRecipe(body, { root: dir, subrepos: 'stub' }));

  return new Promise((resolvePromise) => {
    // detached => the recipe leads its OWN process group, so its `kill 0` (if the
    // trap still fires one) cannot reach this test runner. Never unref'd; we wait.
    const child = spawn('bash', [script], { detached: true, stdio: 'ignore' });
    const killTimer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }, 20000);
    child.on('exit', (status, signal) => {
      clearTimeout(killTimer);
      resolvePromise({ status, signal });
    });
  });
}

test('td1-8: the `serve` recipe exits 0 when the launcher shut down healthy', { timeout: 30000 }, async () => {
  const { status, signal } = await runServeRecipe(0);
  assert.equal(
    signal,
    null,
    `a healthy shutdown must be a genuine exit, not a signal-kill — the recipe's \`trap 'kill 0' EXIT\` SIGTERMs its own shell (got signal=${signal}, status=${status})`,
  );
  assert.equal(
    status,
    0,
    `the launcher exited 0 (healthy), but the recipe returned ${status} — the recipe throws away the launcher's exit code`,
  );
});

test('td1-8: the `serve` recipe exit code DISTINGUISHES a dead server from a healthy fleet', { timeout: 30000 }, async () => {
  const healthy = await runServeRecipe(0);
  const failed = await runServeRecipe(1);

  // The whole point of the story: `$?` must carry health information. Today both
  // come back signal SIGTERM / status 143, so they are INDISTINGUISHABLE — this
  // is the assertion that fails against the always-143 recipe.
  assert.notDeepEqual(
    { status: failed.status, signal: failed.signal },
    { status: healthy.status, signal: healthy.signal },
    `a dead server and a healthy fleet produced the SAME recipe result (${JSON.stringify(failed)}); the recipe's exit code carries no health information — exactly the defect td1-8 was filed to fix`,
  );
  // …and specifically: healthy is 0, failed is a genuine non-zero code (not a
  // signal-kill, which is what the trap currently turns every outcome into).
  assert.equal(healthy.status, 0, `healthy fleet must be exit 0; got ${JSON.stringify(healthy)}`);
  assert.equal(failed.signal, null, `a dead server must be reported by a genuine exit code, not a signal-kill; got ${JSON.stringify(failed)}`);
  assert.ok(
    Number.isInteger(failed.status) && failed.status > 0 && failed.status < 128,
    `a dead server must yield a genuine non-zero exit code (not 128+N signal-kill, not null); got ${JSON.stringify(failed)}`,
  );
});

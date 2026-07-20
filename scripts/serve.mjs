#!/usr/bin/env node
// serve — launch the whole cabinet (lobby + every game) and actually notice when
// one of them dies. Replaces the old justfile `serve` recipe body, which backgrounded
// eight `npm run dev` jobs under a bare `wait`: `wait` returns 0 no matter which job
// died, and the recipe printed all eight "ready" URLs before any server had bound.
// See td1-8 and tests/serve-launcher.test.mjs for the full contract this satisfies.
//
// USAGE:  node scripts/serve.mjs [root]
//   root defaults to the orchestrator checkout containing this script.
// Exits with the supervised fleet's exit code: 0 if every server was still healthy
// when shut down (Ctrl-C), non-zero if any server died — with its name printed.
//
// Teardown (including reaping each `npm run dev`'s vite GRANDCHILD) lives here, not
// in the justfile recipe. The recipe used to end `trap 'kill 0' EXIT`, which signals
// the recipe's own shell along with everything else — so the recipe always died of
// SIGTERM and returned 143 regardless of what this script computed, silently
// re-erasing the exit code td1-8 exists to carry. See killAll() below for how a
// child's grandchild gets reaped without that trap.

import { spawn } from 'node:child_process';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// The canonical cabinet, in launch order — must match justfile's `subrepos` list
// and the port table in CLAUDE.md (tests/serve-launcher.test.mjs pins both).
export const SERVERS = [
  { name: 'lobby', port: 5270 },
  { name: 'tempest', port: 5273 },
  { name: 'star-wars', port: 5274 },
  { name: 'asteroids', port: 5275 },
  { name: 'battlezone', port: 5276 },
  { name: 'red-baron', port: 5277 },
  { name: 'centipede', port: 5278 },
  { name: 'joust', port: 5279 },
];

export function jobsFor(root, servers = SERVERS) {
  return servers.map(({ name, port }) => ({
    name,
    port,
    command: 'npm',
    args: ['run', 'dev'],
    cwd: join(root, name),
  }));
}

// How long to wait, after the first death, for siblings dying in the same burst
// (a sibling checkout holding several ports fails several servers within
// milliseconds) before naming everyone and tearing the survivors down. Resets on
// every new death so a whole burst is captured, not just the first one.
const DRAIN_MS = 300;
const POLL_MS = 50;

// Forward a child's stdout/stderr to the launcher's OWN stdout/stderr, one line at
// a time, prefixed with the server's name. Without this, `spawn()`'s default
// 'pipe' stdio leaves every dev server's output going into a pipe nobody reads —
// which un-does the whole point of naming a dead server: there is no "why" left to
// read (no vite stack trace, and in normal operation no HMR or compile output
// either). Naming AND showing the failure is strictly better than the old raw,
// unattributed interleaving of eight concurrent `npm run dev` streams — this keeps
// the attribution while still surfacing everything.
//
// Deliberately NOT routed through `opts.log`: `log` is the launcher's own status
// channel (ready/failed lines), which callers may redirect or silence — a child's
// own output must reach the real stdout/stderr regardless.
//
// Buffers across chunk boundaries so a prefix is never split mid-line, and flushes
// whatever is left unterminated when the stream ends (a child that dies mid-write
// without a trailing newline must not lose that partial line).
//
// setEncoding('utf8') (rather than chunk.toString('utf8') per chunk) puts a
// StringDecoder in front of the stream: a multi-byte character split across a
// chunk boundary is held back until its continuation bytes arrive, instead of
// being decoded twice as two invalid partials. vite's own startup banner
// ("➜  Local: ...") is exactly this shape — a 3-byte glyph — so this is not
// theoretical.
function pipeWithPrefix(readable, name, target) {
  readable.setEncoding('utf8');
  let buf = '';
  readable.on('data', (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      target.write(`[${name}] ${buf.slice(0, nl)}\n`);
      buf = buf.slice(nl + 1);
    }
  });
  readable.on('end', () => {
    if (buf) {
      target.write(`[${name}] ${buf}\n`);
      buf = '';
    }
  });
}

export function supervise(jobs, opts = {}) {
  const log = opts.log ?? ((line) => console.log(line));
  const signal = opts.signal;

  return new Promise((resolvePromise) => {
    const children = new Map();
    const pollers = new Map();
    const failures = [];
    const ready = new Set();
    let settled = false;
    let drainTimer = null;

    const stopPoller = (name) => {
      const handle = pollers.get(name);
      if (handle) {
        clearInterval(handle);
        pollers.delete(name);
      }
    };

    const killAll = () => {
      for (const name of children.keys()) stopPoller(name);
      for (const child of children.values()) {
        if (child.exitCode === null && child.signalCode === null) {
          try {
            // Each child is spawned `detached: true` (see below), which on POSIX
            // makes it the leader of its OWN process group (its pgid === its pid).
            // `npm run dev` execs `vite` as a GRANDCHILD in that same group, so
            // signalling the NEGATIVE pid reaches npm AND vite together. Plain
            // `child.kill()` only reaches npm — vite survives as an orphan holding
            // the port, which is exactly the leak `trap 'kill 0' EXIT` used to
            // paper over in the justfile (and which ate the launcher's real exit
            // code doing it — teardown now lives here instead).
            process.kill(-child.pid, 'SIGTERM');
          } catch {
            try { child.kill(); } catch { /* already gone */ }
          }
        }
      }
    };

    const finish = (exitCode) => {
      if (settled) return;
      settled = true;
      if (drainTimer) clearTimeout(drainTimer);
      killAll();
      resolvePromise({ exitCode, failures, ready: [...ready] });
    };

    const recordFailure = (name, code) => {
      if (settled) return;
      if (failures.some((f) => f.name === name)) return;
      failures.push({ name, code });
      log(`FAILED: ${name} did not start (exit code ${code})`);
      if (drainTimer) clearTimeout(drainTimer);
      drainTimer = setTimeout(() => finish(1), DRAIN_MS);
    };

    const pollReady = (name, port) => {
      const attempt = () => {
        if (settled || ready.has(name)) return;
        const socket = net.connect({ port, host: '127.0.0.1' });
        socket.once('connect', () => {
          socket.destroy();
          if (settled || ready.has(name)) return;
          ready.add(name);
          log(`ready: ${name} -> http://localhost:${port}/`);
          stopPoller(name);
        });
        socket.once('error', () => socket.destroy());
      };
      const handle = setInterval(attempt, POLL_MS);
      pollers.set(name, handle);
      attempt();
    };

    for (const job of jobs) {
      // detached: true — the child leads its own process group instead of sharing
      // ours, so killAll() can take it down together with the vite grandchild
      // `npm run dev` execs (see killAll's negative-pid kill, below).
      const child = spawn(job.command, job.args, { cwd: job.cwd, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
      children.set(job.name, child);
      pipeWithPrefix(child.stdout, job.name, process.stdout);
      pipeWithPrefix(child.stderr, job.name, process.stderr);
      pollReady(job.name, job.port);

      child.on('exit', (code, sig) => {
        stopPoller(job.name);
        recordFailure(job.name, code ?? (sig ? 1 : 0));
      });
      child.on('error', (err) => {
        stopPoller(job.name);
        recordFailure(job.name, err.code ?? 1);
      });
    }

    if (signal) {
      if (signal.aborted) finish(0);
      else signal.addEventListener('abort', () => finish(0), { once: true });
    }
  });
}

const isMain = Boolean(process.argv[1]) && (() => {
  try {
    return fileURLToPath(import.meta.url) === resolve(process.argv[1]);
  } catch {
    return false;
  }
})();

async function main() {
  const root = process.argv[2] ? resolve(process.argv[2]) : join(HERE, '..');
  const jobs = jobsFor(root);
  const ac = new AbortController();
  const onSignal = () => ac.abort();
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const result = await supervise(jobs, { log: (line) => console.log(line), signal: ac.signal });

  process.off('SIGINT', onSignal);
  process.off('SIGTERM', onSignal);
  process.exit(result.exitCode);
}

if (isMain) {
  main();
}

// scripts/audio/render/pokey.mjs
// Drives the vendored web-pokey core (vendor/pokey.js, MIT, Mariusz Kryński,
// commit 0c6327b) headlessly. Events are a flat [reg, value, timeSeconds, ...]
// stream; the renderer returns Float32 mono PCM.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));

// SECURITY: node:vm is NOT a sandbox. It is used here ONLY to supply the
// AudioWorklet globals that vendor/pokey.js expects (it extends
// AudioWorkletProcessor and calls registerProcessor at top level) so we can lift
// the POKEY class out. vendor/pokey.js is a COMMITTED, trusted, MIT dependency —
// equivalent to importing it. Never run untrusted or fetched source through this.
function loadPokeyClass(sampleRate) {
  const src = `${readFileSync(join(HERE, '..', 'vendor', 'pokey.js'), 'utf8')}\n;globalThis.__POKEY = POKEY;`;
  const sandbox = {
    sampleRate,
    currentFrame: 0,
    console,
    AudioWorkletProcessor: class {},
    registerProcessor: () => {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'vendor/pokey.js' });
  if (typeof sandbox.__POKEY !== 'function') throw new Error('failed to load POKEY from vendor/pokey.js');
  return sandbox.__POKEY;
}

// web-pokey supports only these rates.
const RATES = new Set([48000, 44100, 56000]);

export function renderPokey(events, { durationMs, sampleRate = 48000 }) {
  if (!RATES.has(sampleRate)) throw new Error(`unsupported sample rate ${sampleRate}`);
  const POKEY = loadPokeyClass(sampleRate);

  // web-pokey walks the feed MONOTONICALLY. Unsorted events are applied in a lump
  // at the end -> silent or wrong sound. Sort by time before feeding.
  const triples = [];
  for (let i = 0; i + 2 < events.length; i += 3) triples.push([events[i], events[i + 1], events[i + 2]]);
  triples.sort((a, b) => a[2] - b[2]);

  const p = new POKEY('L');
  p.feed(triples.flat());

  const n = Math.max(1, Math.ceil((durationMs / 1000) * sampleRate));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    p.processEvents(i);
    out[i] = p.get();
  }
  return out;
}

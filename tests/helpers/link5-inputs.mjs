// tests/helpers/link5-inputs.mjs
// TEST HELPER (td1-4) — the presence probe for LINK 5's shipped inputs.
//
// LINK 5 (COMPARE) reads the GAMES' shipped source. That used to mean reaching
// outside the orchestrator into gitignored sibling subrepos; since the monorepo
// collapse every one of those trees is tracked here under plugins/<id>/, so both
// halves of link 5 are always present in a complete checkout. Links 1-4 read the
// vendored ROM images in reference/atari-source/, also in-repo.
//
// WHY THIS EXISTS (AC2): the two link-5 audit tests assert concrete verdicts
// (ROM-VERIFIED / MISMATCH). If their shipped inputs are absent, EVERY row
// collapses to UNVERIFIED and those assertions fail with a message about a
// verdict, which reads as "the port regressed" when the truth is "the input was
// never here". Absent-input and wrong-input must not produce the same-looking
// red. This probe is what lets a test SKIP self-describingly — naming the file
// it could not find — instead of failing misleadingly.
//
// It is deliberately a real filesystem MEASUREMENT, not a standing constant:
// `link5Inputs()` takes the root it probes, so a test can point it at an empty
// directory and prove the probe actually looks (the same discipline
// compareBattlezoneShipped was forced into — see shipped.mjs's header).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

// Every file the two red link-5 audits actually open, and which audit needs it.
const LINK5_INPUTS = [
  // MONOREPO MIGRATION — tempest (Task 6) and red-baron (Task 10) were both
  // imported into this repo as plugins/<id>, so NEITHER is a gitignored sibling
  // subrepo any more and both halves of link 5 are always present, in-repo.
  //
  // The probe is NOT retired, and these paths still had to move. `existsSync` on a
  // stale path is the quietest failure in this file's design: it reports "absent",
  // link5SkipReason() hands back a plausible "run `just install-all`" message, and
  // the two link-5 audits SKIP — announcing that the shipped port was not compared,
  // when in truth the port is sitting right there and only the probe was looking in
  // the wrong place. That is precisely the absent-vs-wrong confusion the header
  // above says must never happen, arriving from the other direction. Task 12 has
  // since imported joust as well, so no game is a gitignored subrepo any more; the
  // probe now earns its keep purely as an absent-vs-wrong discriminator, and its
  // skip message (below) had to stop telling readers to go looking for a subrepo.
  { audit: 'tempest', path: join('plugins', 'tempest', 'tools', 'pokey-bake', 'sfx-data.mjs') },
  { audit: 'tempest', path: join('plugins', 'tempest', 'tools', 'pokey-bake', 'bake-sfx.mjs') },
  { audit: 'red-baron', path: join('plugins', 'red-baron', 'src', 'shell', 'pokey.ts') },
];

/** Every link-5 input, each tagged with whether it is present under `root`. */
export function link5Inputs(root = REPO_ROOT) {
  return LINK5_INPUTS.map((i) => ({ ...i, present: existsSync(join(root, i.path)) }));
}

/** Just the absent ones, optionally narrowed to one audit. */
export function missingLink5Inputs(audit = null, root = REPO_ROOT) {
  return link5Inputs(root).filter((i) => !i.present && (audit === null || i.audit === audit));
}

/**
 * `null` when the audit's inputs are all present (so it MUST run — a skip would
 * be a silent pass), otherwise a self-describing reason that NAMES each missing
 * file. Returning null on "everything present" is the load-bearing half: it is
 * what makes it impossible to skip your way to green.
 */
export function link5SkipReason(audit = null, root = REPO_ROOT) {
  const missing = missingLink5Inputs(audit, root);
  if (missing.length === 0) return null;
  return (
    `link 5 (COMPARE) input(s) absent from this checkout — ${missing.map((m) => m.path).join(', ')}. ` +
    'These are TRACKED in this repo under plugins/<id>/ — they are not a sibling subrepo you ' +
    'forgot to clone — so an absent one means an incomplete checkout or a stale path in this ' +
    'file. Re-sync the working tree (`git status`), then `just install-all` for dependencies. ' +
    'SKIPPED, not passed: the shipped port was NOT compared against the ROM.'
  );
}

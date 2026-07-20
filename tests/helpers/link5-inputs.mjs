// tests/helpers/link5-inputs.mjs
// TEST HELPER (td1-4) — the presence probe for LINK 5's shipped inputs.
//
// LINK 5 (COMPARE) is the only link in the audit chain that reaches OUTSIDE the
// orchestrator: it reads the sibling game repos' checked-out working trees,
// which are separate GITIGNORED subrepos. Links 1-4 run anywhere (the vendored
// ROM images live in reference/atari-source/, in-repo); link 5 needs a full
// `just install-all` checkout.
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
  { audit: 'tempest', path: join('tempest', 'tools', 'pokey-bake', 'sfx-data.mjs') },
  { audit: 'tempest', path: join('tempest', 'tools', 'pokey-bake', 'bake-sfx.mjs') },
  { audit: 'red-baron', path: join('red-baron', 'src', 'shell', 'pokey.ts') },
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
    'These live in gitignored sibling subrepos; run `just install-all`. ' +
    'SKIPPED, not passed: the shipped port was NOT compared against the ROM.'
  );
}

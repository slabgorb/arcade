// citation-guard: ignore-file — this suite injects a deliberately-stale citation as
// the AC3 mutation fixture, so it must be opted out of the very guard it proves. After
// this line the file quotes no citation it intends the guard to accept.
//
// tests/audit/sw8-24-citation-sweep.test.ts — RED for sw8-24.
//
// == THE STORY =====================================================================
// sw8-18 shipped tools/audit/check-comment-citations.mjs and hard-gated its own 11
// files, leaving the rest of plugins/star-wars under a tree-wide RATCHET. sw8-23
// widened the scan (tools/, .mts) and lowered the ratchet to 29. sw8-24 SWEEPS the
// remainder: at RED the guard reports 28 stale citations across the plugin — 23
// "verbatim not in the cited span" drifts (each a one-number re-anchor the guard
// relocates itself) and 5 "cited file does not exist" refs (findings.md,
// shootable-fireballs.ts, tie-peel-away.test.ts, trench-catwalk-hazard.test.ts,
// fragments.test.ts — each re-pointed or disowned with the RETIRED: marker).
//
// == WHERE THE RED LIVES ===========================================================
// The forcing functions are the three tree-wide ratchets, lowered from 29 to a
// zero-FLOOR in the same sweep (they fail until Dev's remediation lands):
//   comment-citations.test.ts        'holds the tree-wide count at ... floor of 0'
//   sw8-23-guard-hardening.test.ts   'the widened scan carries zero stale citations'
//   sw8-23-guard-hardening.test.ts   '...and the DEFAULT scan ... is clean too'
//
// This file adds the piece those three cannot state about themselves: the AC3 proof
// that the new zero-floor BITES. sw8-23 established that a threshold changed without a
// live mutation is just a different unfalsifiable assertion, and typescript.md #15
// requires every guard be mutation-tested as executable code, not a comment nobody
// re-ran (#17). So the proof is a test, below.
//
// == THE ONE TRAP THIS FILE DELIBERATELY DOES NOT PIN ==============================
// One live drift is the duplicate-verbatim hazard td1-14 exists to fix (still backlog
// at this story's setup): tests/core/trench-traversal-speed.test.ts cites
// `ADDD M$TX+M.S1` at WSMAIN.MAC:2654 (routine S1MVBS, per the file's own prose), and
// the guard's FIRST-OCCURRENCE relocator suggests :2539 — a DIFFERENT routine (S1MVGD)
// that contains the identical instruction. The correct S1MVBS anchor is :2656, already
// established by comment-citations.test.ts's state.ts fix. checkCitations() cannot tell
// the wrong routine from the right one (both hold the verbatim), so no assertion here
// pins it — that would both rot when ROM lines shift and violate this suite's rule
// against literal line numbers. It is called out for the Reviewer to verify by hand
// instead: confirm the resolved citation lands in S1MVBS, not the guard's :2539 hint.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkCitations } from '../../tools/audit/check-comment-citations.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const swRoot = join(here, '..', '..')
const repoRoot = join(swRoot, '..', '..')
const romDir = join(repoRoot, 'reference', 'atari-source', 'star-wars-1983')
const opts = { swRoot, romDir }

describe('sw8-24 AC3 — the zero-floor ratchet is mutation-proven, not merely asserted', () => {
  it('detects a single stale citation injected into a scanned file (the floor bites)', () => {
    // Take a real scanned file and prepend ONE citation whose quoted verbatim cannot be
    // at the span it names. The guard MUST report strictly more errors than it does for
    // the file untouched — this is the exact mutation the story asks for ("prepend one
    // stale citation to a scanned file and require red"), run in code. If this ever
    // fails, the detector has gone blind and the tree-wide zero-floor above is vacuous.
    const clean = readFileSync(join(swRoot, 'src', 'core', 'sim.ts'), 'utf8')
    const mutant =
      '// AC3 mutation fixture: (`ADDD #DEFINITELY-NOT-REAL-TEXT`, `WSMAIN.MAC:100-101`)\n'
    const before = checkCitations(clean, opts).length
    const after = checkCitations(mutant + clean, opts).length
    expect(after).toBe(before + 1)
  })
})

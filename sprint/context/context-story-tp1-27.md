# Story tp1-27 Context

## Title
PLAYER_RIM_DEPTH = 0.92 is an invented constant, and tp1-24 just made it load-bearing — derive the grab line from the ROM byte or ratify it

## Metadata
- **Story ID:** tp1-27
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** tempest
- **Epic:** Tempest — ROM fidelity against Theurer's original 1981 source

## Problem
Filed by Obi-Wan out of the tp1-24 review (2026-07-14). WHAT IT IS: PLAYER_RIM_DEPTH (src/core/rules.ts:84) is `export const PLAYER_RIM_DEPTH = 0.92` with a bare comment and no ROM derivation. Invert it: INVAY = 0xf0 - 0.92 * 224 = 33.92 — NOT a clean ROM byte. Every neighbouring constant in that file is derived from one ((0xf0 - 0x20) / WARP_ALONG_SPAN; PULSAR_ALONG_PER_FRAME * ROM_FPS / WARP_ALONG_SPAN), and a round decimal with a bare comment is the exact fingerprint of the two constants this epic has ALREADY caught and killed: TANKER_SPLIT_DEPTH = 0.9 (tp1-5) and SPLIT_CHILD_DEPTH = 0.85 (tp1-24). No finding tracks it — it appears only inside OTHER findings' prose (W-010's `ours`, W-030's claim, WD-016), never as a claim of its own. WHY IT MATTERS NOW: it was harmless while a tanker's children were clamped to 0.85 and could never reach it. tp1-24 deleted that clamp and ratified a DIFFICULTY CHANGE expressed entirely in terms of this constant — 'the children are born ABOVE PLAYER_RIM_DEPTH, therefore a player on a flanking lane dies on the burst frame'. The grab line is now load-bearing for how lethal the game is, and nobody has ever audited it. If 0.92 is wrong, the lethality window is wrong. THE LIKELY ROM SIDE: the grab is JKITST/kill-check territory (ALWELG.MAC ~1981-82 is already cited by W-010 for the mid-jump gate); find the byte the ROM actually compares INVAY against and derive the constant from it exactly as SPLIT_TOO_CLOSE_DEPTH derives from $20. A CONSEQUENCE WORTH TESTING EITHER WAY: because the grab line (0.92) and the no-flip line (0.9286) are different numbers, there is a band [0.92, 0.9286) in which a BULLET-split child is born both LETHAL (above the grab line) and FLIPPING (below the too-close line, so it runs the wave's cam and can jump onto the player). That band was unreachable under the old clamp and is reachable now. The two-threshold structure is authentic — the ROM's grab and no-flip tests genuinely are different bytes — but the sliver's WIDTH is set by this unaudited 0.92, and no test covers it.

## Technical Approach

This is a ROM-fidelity audit first and a code change second. The order matters: do
not touch `rules.ts` until the ROM byte is quoted.

1. **Find the byte.** The grab/kill-check is JKITST territory. W-010 already cites
   `ALWELG.MAC` (~lines 1981-82) for the mid-jump gate on the same routine — start
   there and read outward for the comparison the kill-check makes against INVAY.
   The `rom-fidelity-audit` skill is the right tool for this.
2. **Derive or ratify.** The neighbouring constants in `rules.ts` are all derived —
   `SPLIT_TOO_CLOSE_DEPTH` from `$20` via `(0xf0 - BYTE) / WARP_ALONG_SPAN`. Follow
   that exact form. If the ROM has no such constant, 0.92 is ratified as a
   deliberate divergence — but the reasoning goes in the audit finding, not in a
   code comment.
3. **Either outcome produces a finding** in `docs/audit/findings/` with both
   citations. Today the grab line exists only inside *other* findings' prose
   (W-010's `ours`, W-030, WD-016) and is the one number in `rules.ts` nobody has
   ever checked.

**The trap (from tp1-24's review):** tp1-24's suite asserts children are born above
`PLAYER_RIM_DEPTH`. If this story MOVES the constant, those assertions re-derive
from the new value and go green *vacuously* — they would pass against a wrong line.
Pin the expected depths to literals when re-verifying, or the suite proves nothing.

**Fixture warning (project memory):** a fixture that sets `s.level` without
`s.tube = tubeForLevel(level)` silently tests level 1's closed circle. Waves
8/9/10/11/14/15 are OPEN sheets. Any test placing a player on a *flanking lane*
must set the tube explicitly or the flank geometry is a lie.

## Scope
- In scope: deriving or ratifying `PLAYER_RIM_DEPTH` (`src/core/rules.ts:84`), the
  audit finding, and test coverage of the `[0.92, 0.9286)` lethal-and-flipping band.
- Out of scope: changing `SPLIT_TOO_CLOSE_DEPTH` / the no-flip line, or revisiting
  tp1-24's removal of the child-depth clamp. The two-threshold structure is
  authentic; only the *width* of the sliver is in question here.

## Acceptance Criteria
- Find the ROM byte the kill-check actually compares INVAY against (JKITST / the grab path — W-010 already cites ALWELG.MAC:1981-82 for the mid-jump gate on the same routine) and quote it byte-exact.
- EITHER derive PLAYER_RIM_DEPTH from that byte the way SPLIT_TOO_CLOSE_DEPTH derives from $20 — (0xf0 - BYTE) / WARP_ALONG_SPAN, no round decimals — OR, if the ROM genuinely has no such constant, ratify 0.92 as a deliberate divergence with the reasoning recorded in the audit, not in a code comment alone.
- Whichever way it goes, it is a FINDING in docs/audit/findings/ with both citations, so the grab line stops being the one number in rules.ts that nobody has ever checked. Today it is referenced only inside other findings' prose.
- If the value MOVES: tp1-24's suite (tests/core/tp1-24.split-child-depth.test.ts) asserts children are born above PLAYER_RIM_DEPTH and that a flanking-lane player dies on the burst frame. Re-verify both against the new line — do not just let them re-derive and go green vacuously.
- Cover the newly-reachable sliver [PLAYER_RIM_DEPTH, SPLIT_TOO_CLOSE_DEPTH): a tanker SHOT in that band drops children that are both lethal (above the grab line) AND flipping (below the too-close line). Untested today, and unreachable before tp1-24 removed the 0.85 clamp.
- npm test -- citations stays green, and `node tools/audit/reanchor-citations.mjs` reports 0 lost.

---
_Generated by `pf context create story tp1-27` from the sprint YAML._

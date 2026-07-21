---
story_id: "cp4-3"
jira_key: "cp4-3"
epic: "cp4"
workflow: "tdd"
---
# Story cp4-3: Per-wave colour walk — LCOLOR advance on the all-dead re-lay

## Story Details
- **ID:** cp4-3
- **Jira Key:** cp4-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/cp4-3-per-wave-colour-walk)

## Workflow Tracking
**Workflow:** tdd
**Phase:** red
**Phase Started:** 2026-07-21T00:22:25Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T00:20:12Z | 2026-07-21T00:22:25Z | 2m 13s |
| red | 2026-07-21T00:22:25Z | - | - |

## Sm Assessment

**Story:** cp4-3 — Per-wave colour walk — LCOLOR advance on the all-dead re-lay (2pt, centipede, tdd/phased).

**Routing:** setup → RED. Handing off to O'Brien (TEA) to write the failing tests.

**What this story is:** the third and last of the CENTPC per-wave effects in the cp4 wave triad. cp4-1 (speed) and cp4-2 (fragmentation) are both DONE and merged to origin/develop — they built the all-dead-guarded wave-clear re-lay block that this story extends. cp4-3 makes the centipede's COLOUR walk wave to wave.

**The one distinction that decides the story (AC-1):** the colour advance (`LDA X,LCOLOR-1 / ORA I,80 / STA X,LCOLOR-1` at CENTPC :461-463) sits inside the same all-dead guard (:459-460 ';NO CHANGE IN COLOR OR SPEED UNTIL ALL DEAD') as the speed/length walk — so it fires on the **wave-clear re-lay ONLY, never the death re-lay.** The pinning test must clear a wave and assert LCOLOR changed, then die a player and assert it did NOT.

**Boundary ruling (AC-4):** spans src/core (LCOLOR flag on SimState, advanced on wave-clear re-lay) and src/shell (render.ts/palette.ts consuming it). The sim change and render change go in SEPARATE commits — the epic's explicit boundary ruling.

**Ground truth for the render side (AC-2):** LCOLOR → rendered colour goes through the ROM's CLRCH mapping — transcribe it from `centipede/docs/rom-study/subsystems.md` (CLRCH :879), do not invent. This is per-wave colour SELECT, not the IRQ colour cycling.

**Discipline:** citation gate LIVE; CENTI4.MAC inherits `.RADIX 16` (0x80 is hex) — every transcribed constant needs a radix-cited comment + claims entry; cite the VENDORED tree (`reference/atari-source/centipede/revision.v4/CENTI4.MAC`), re-anchor + machine-verify at delivery.

**Quarry for TEA:** `sprint/archive/cp4-2-session.md` and `sprint/archive/cp4-1-session.md` (Delivery Findings / reviewer notes) — the same re-lay block.

**End-of-story gates:** AC-3 human smoke test on a server proven to be THIS checkout (lsof port 5278's cwd — port-ownership trap). At finish, human merge approval is required (AI self-approval guardrail).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (RED phase) — 2026-07-21

- **Conflict / STORY-SUBSUMED (blocking the RED phase):** cp4-3's deliverable — the per-wave
  LCOLOR colour walk — was **already shipped end-to-end by cp2-13** ("Per-round colour cycling",
  merged to centipede develop as **#19 on 2026-07-19 18:14**, the evening BEFORE the cp4 design
  spec was authored 2026-07-20). Every AC is already satisfied:
  - **AC-1 (selector advances on wave-clear ONLY, not death):** the colour selector is
    `SimState.wave`, which advances only on the wave-clear re-lay (`sim.ts:512` `wave: state.wave + 1`)
    and is left unchanged on the death respawn (`sim.ts:462` `wave: state.wave`), resetting to 1 on
    a fresh game (`createSim`). `src/shell/palette.ts:colorIndexForWave = ((wave-1)*3) % 42` is the
    closed form of the ROM's flag-gated `ORA 0x80` → IRQ `AND 3F / ADC 3 / wrap 42` walk. The
    "advance on clear, not on death" behaviour the AC demands is therefore already correct and
    already regression-locked.
  - **AC-1 (claims + radix):** claims **CL-17..CL-27** (docs/rom-study/claims/08-render-color.json)
    already transcribe the whole mechanism — `LCOLOR` (CENDE4.MAC:208), `ORA I,80` (CENTI4.MAC:462),
    the IRQ `+3` (CENIR4.MAC:319), decimal wrap `CMP I,42.` (CENIR4.MAC:320), `INITSC` reset
    (CENTI4.MAC:1206) — with radix-cited comments. Nothing left to transcribe.
  - **AC-2 (render draws colour via CLRCH mapping):** `src/shell/atlas.ts:buildAtlas(wave)` bakes
    the sprite/playfield atlas from `spritePensForWave`/`playfieldPensForWave` (decoded via
    `decodeClrchColor`); `src/main.ts:143` rebakes the atlas whenever `schemeNumberForWave(sim.wave)`
    crosses into a new scheme. A cp2-13 TEA finding recorded verbatim: *"render.ts needs no change …
    the whole feature is three shell edits."*
  - **AC-3 (visibly different colour wave 2 vs wave 1):** this WAS the user-reported fix cp2-13
    shipped ("colours should change per round, as the arcade does", 2026-07-19). Live in production.
  - **AC-4:** moot — nothing to build.
  - Existing coverage: `tests/palette-cycle.test.ts` pins the table byte-for-byte, the `+3`/wrap-42
    walk across waves 1..60, the per-wave pens, and the wave-1↔wave-2 change.
- **Consequence for RED:** there is NO legitimately-failing test to write. The only thing the
  literal spec text ("SimState carries the LCOLOR selector") could still add is a **dedicated
  `SimState.lcolor` byte mirroring `((wave-1)*3) % 42`** — redundant derived state (drift risk, zero
  new behaviour), which would be a quality regression, not an improvement. **Escalated to the user
  for a scoping decision rather than manufacturing vacuous tests or duplicate state.** The cp4 design
  spec's "Genuine gaps" list (row cp4-3) and the epic description are STALE on this point — they were
  written without accounting for cp2-13's same-epic pull-forward landing hours earlier.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
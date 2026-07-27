# Story sw8-14 Context

## Title
music-bake pipeline cannot reproduce finish_ground.wav: sw7-18's PMREB one-shot exists only in R2 — OUTPUT_FILES has no entry, so 'just deploy-assets' never re-uploads it and a bucket wipe loses it. Add finishGround (REB, TUNTAB 19-22) to gen-music-data TUNE_SPEC + bake OUTPUT_FILES and drop the carve-out in bake-music.test.mjs's manifest-agreement test (gap surfaced/documented by sw8-12)

## Metadata
- **Story ID:** sw8-14
- **Type:** chore
- **Points:** 1
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Cabinet feel: the flight and combat loop — render/experiential fidelity vs the cabinet longplay

## Problem
`finish_ground.wav` is served from R2 but **cannot be regenerated from this repo**.
sw7-18 added the `finishGround` one-shot to the shell's `TUNES` manifest and uploaded
the asset by hand; the bake pipeline was never widened to match. Consequences:

- `tools/music-bake/gen-music-data.mjs` `TUNE_SPEC` has no `finishGround` entry, so
  the tune is never rendered.
- `tools/music-bake/bake-music.mjs` `OUTPUT_FILES` has no `finishGround` entry, so
  `just deploy-assets` never re-uploads it.
- A bucket wipe (or a fresh bucket) loses the asset permanently — and a 404 is
  silence, which is the exact class of bug this epic exists to end.

sw8-12 surfaced and **documented** the gap rather than deepening the mask: the
manifest-agreement test used to scrape only the manifest's first five entries
(hiding the missing entry positionally); it now destructures `finishGround` out
and states the carve-out in a comment, with this story named as the owner.

**Source of record:** `sprint/archive/sw8-12-session.md` — Delivery Findings, Dev
entry: *"Gap (non-blocking): the music-bake pipeline cannot reproduce
finish_ground.wav … Filed as sw8-14"*, plus the matching deviation justification
(*"extending the positional count to 6 would have deepened the mask; a test that
'agrees' by not looking is the epic's own silent-404 bug wearing a green suit"*).

## Technical Approach
_Hints only — TEA owns the contract, Dev owns the implementation._

Known anchors (verified on `origin/develop` at setup time):

| Site | Path | Note |
|------|------|------|
| `TUNE_SPEC` | `tools/music-bake/gen-music-data.mjs:285` | the six one-shots; `themeB` (sw8-12) is the most recent precedent for adding one |
| `TRACK_SPEC` | `tools/music-bake/gen-music-data.mjs:265` | **already contains `REB` / TUNTAB 19-22** as the towers track's second segment |
| `OUTPUT_FILES` | `tools/music-bake/bake-music.mjs:46` | logical track → R2 filename; must mirror `audio.ts` MUSIC + TUNES |
| carve-out | `tools/music-bake/bake-music.test.mjs:111-117` | the `const { finishGround, ...bakedTunes } = tunes` destructure to remove |
| ROM caller | `WSMAIN.MAC:1673` — `PMREB ";FINISH GROUND WITH REBEL"` | the caller-truth rule the pipeline's comments follow |
| sibling pin | `tools/music-bake/music-data.test.mjs` | has `segmentsOf(...)` pins that run in `npm test`; re-seat if a track's segments move |

**Open question routed to TEA (do not assume an answer):** `REB` / TUNTAB 19-22
already renders today as the tail segment of the **towers** track. Adding
`finishGround` to `TUNE_SPEC` therefore makes the same ROM tune render twice, in
two files. TEA must settle, from the ROM callers rather than from convenience,
whether the towers track keeps its `REB` tail once the standalone one-shot exists
(WSMAIN.MAC:1636 `PM4TH` then :1673 `PMREB` are two separate `JSR PM*` sites).
Either answer is defensible; the one that is not defensible is picking silently.
If towers changes, the `music-data.test.mjs` segment pins need a matching re-seat.

**Ops consequence to carry into the Impact Summary:** whatever this story bakes is
only live after an orchestrator `just deploy-assets`. Note that sw8-12 already left
a standing release-ordering obligation (`theme_b.wav` / `space_theme.wav`); see the
memory note *star-wars release needs deploy-assets*. Do not silently re-upload over
a production asset without stating it.

## Scope
- **In scope:** `finishGround` added to `gen-music-data.mjs` `TUNE_SPEC` and
  `bake-music.mjs` `OUTPUT_FILES`; the `bake-music.test.mjs` manifest-agreement
  carve-out dropped so the test compares the manifests whole; any sibling pin
  re-seat that the change forces; the towers/`REB` question settled and recorded.
- **Out of scope:** the sw8-13 tune-channel-priority work; any change to the shell's
  `TUNES` manifest or playback routing (`finish_ground.wav` already ships and plays);
  re-tuning the bake's synthesis. Anything discovered outside this scope must be
  **filed as a story**, not merely noted.

## Acceptance Criteria
_No acceptance criteria are recorded in the sprint YAML — TEA defines them during RED._

Shape the contract is expected to pin (TEA's call on the exact wording):
1. The bake renders `finishGround` to real audio, not silence — via the suite's
   existing "bakes %s to real audio" idiom, not a new bespoke harness.
2. `OUTPUT_FILES` equals the shell's `MUSIC` + `TUNES` manifests **with no
   destructured exception** — the carve-out comment goes with it.
3. The `finishGround` segment resolves TUNTAB 19-22 to the ROM's `REB` voice labels.
4. The towers/`REB` decision is pinned by a test that would fail if a later change
   flipped it back by accident.

---
_Hand-authored by SM at setup from the sw8-12 archive + verified source anchors.
Supersedes the `pf context create` stub. Do not regenerate._

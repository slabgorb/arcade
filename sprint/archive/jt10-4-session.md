---
story_id: "jt10-4"
jira_key: "jt10-4"
epic: "jt10"
workflow: "tdd"
---
# Story jt10-4: Attract cycle: self-play (demo.ts) + banner pages (BEWARE OF THE PTERODACTYL, HOME OF THE LAVA TROLL) + attract-page scheduler — supersedes ad1-4

## Story Details
- **ID:** jt10-4
- **Jira Key:** jt10-4
- **Workflow:** tdd
- **Stack Parent:** jt10-2 (done)
- **Repos:** arcade

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T15:01:00Z
**Round-Trip Count:** 3

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T13:08:49Z | 2026-08-08T13:12:34Z | 3m 45s |
| red | 2026-08-08T13:12:34Z | 2026-08-08T13:31:37Z | 19m 3s |
| green | 2026-08-08T13:31:37Z | 2026-08-08T13:49:00Z | 17m 23s |
| review | 2026-08-08T13:49:00Z | 2026-08-08T14:14:07Z | 25m 7s |
| red | 2026-08-08T14:14:07Z | 2026-08-08T14:49:43Z | 35m 36s |
| green | 2026-08-08T14:49:43Z | 2026-08-08T14:51:53Z | 2m 10s |
| review | 2026-08-08T14:51:53Z | 2026-08-08T15:01:00Z | 9m 7s |
| finish | 2026-08-08T15:01:00Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement / non-blocking (SM, setup):** The story title says "self-play (demo.ts)" — this is a REUSE label, not a build instruction. `plugins/joust/src/core/demo.ts` (2521 lines, jt2-7 lineage) is SHIPPED and is the self-play substrate the design spec's reuse ledger (lines 29/34) points at. TEA/Dev must wire it into attract, not rebuild it. Measured on the current tree at setup; premise is SOUND (not a stale-premise correction — noting it so a later reader isn't misled by the title).
- **Question / non-blocking (SM, setup):** Design-spec Open Question #3 (attract page order + colour-cycle cadence `ATT.SRC:173`) and the exact source lines for the banner phrases *BEWARE OF THE PTERODACTYL* / *HOME OF THE LAVA TROLL* are UNRESOLVED quarry. `reference/williams-source/joust/ATT.SRC` is present, but the two phrases did NOT grep in ATT.SRC — likely `PHRASE.SRC`/`MESSAGE.SRC`. TEA must resolve these under the joust citation gate BEFORE writing fidelity pins. Flagged at the top of the context file.

### TEA (test design)
- **Question (non-blocking): the SM quarry is RESOLVED — and the pterodactyl phrase is REVISION-SPLIT with a ROM typo.** Colour cadence = 2.5 s (`ATT.SRC:173`, "CHANGE COLORS EVERY 2 1/2 SECONDS") → 150 frames. MARQUE dwell = 18.5 s (`ATT.SRC:121`) → 1110 frames. Lava-troll banner = `MSW19 'HOME OF THE'` (`MESSEQU.SRC:156`) + `MSW20 'LAVA TROLL'` (`MESSEQU.SRC:155`), rendered by LAVLES (`JOUSTRV4.SRC:516/519`). Pterodactyl banner is split: `JOUSTRV4.SRC:80` = `'PTERODACTYL BEWARE'` (RV4) vs `MESSEQU2.SRC:110` = `'BEWARE OF THE "UNBEATABLE?" PTERADACTYL'` (note the ROM's PTERADACTYL misspelling). **User ruled RV4** (2026-08-08). All four citations byte-verified GREEN against the vendored tree in this suite. Affects `plugins/joust/docs/rom-study/claims/` (Dev adds an `attract.json` claims file) and `plugins/joust/src/core/attract-scheduler.ts` (the BANNERS data). *Found by TEA during test design.*
- **Improvement (non-blocking): the ROM attract cycle has SIX more instructional "lessions" this story defers.** `ATMST` (`JOUSTRV4.SRC:337`) sequences intro/flying/dying/egg/enemy(lava)/bounder/hunter/shadow-lord + the pterodactyl lession — an 8-page family. Per the user ruling this story ships only the 2 title-named banners; the `AttractPage` union + `PAGE_ORDER` are the extension seam. A follow-up story ("Joust attract: the remaining ATMST lessions") should transcribe the other six. Affects `plugins/joust/src/core/attract-scheduler.ts` (widen PAGE_ORDER/BANNERS) + a new claims file. *Found by TEA during test design.*
- **Gap (non-blocking): the shell attract render path is an un-wired PLACEHOLDER.** `main.ts` (jt10-5) says the 'attract' mode "is not reached until jt10-4 wires the attract cycle" (main.ts:220-221) and its render hook is a stub. GREEN must (a) import + drive `attract-scheduler.ts` from the shell, (b) add a shell banner layout module (e.g. `plugins/joust/src/shell/attractScreen.ts`) that lays each banner out via `layoutText('FONT57', text, colour)` — the `gameOverScreen.ts`/`selectScreen.ts` pattern, and (c) step `demo.ts` under the attract demo page. Affects `plugins/joust/src/main.ts` + a new `plugins/joust/src/shell/attractScreen.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement (non-blocking): the attract demo has no active PLAYER AI — the knights drift.** Self-play under attract steps the session with empty inputs, so the ecosystem runs but the two demo knights don't joust. The ROM's self-play drives them via the G-block software joystick (G1JOY/G2JOY, `JOUSTRV4.SRC:615-626`, installed by G1DEC/G2DEC per the ad1-4 quarry). A follow-up should wire that so the demo actually plays. Affects `plugins/joust/src/main.ts` (attract demo-page step) + likely a new core self-play input source. *Found by Dev during implementation.*
- **Improvement (non-blocking): confirm TEA's deferred-lessions follow-up covers the ATMST family.** This story ships 2 of the ROM's 8 ATMST instructional pages (per the user ruling). The `AttractPage` union + `PAGE_ORDER` + `BANNERS` are the seams to widen; a follow-up transcribes intro/flying/dying/egg/bounder/hunter/shadow-lord with their real per-page dwells. Affects `plugins/joust/src/core/attract-scheduler.ts` + `docs/rom-study/claims/attract.json`. *Found by Dev during implementation (reinforces TEA's finding above).*

### Reviewer (code review)
- **Improvement (non-blocking): `stepAttract` has no boundary guard on `frames`.** `stepAttract(state, Infinity)` is a confirmed unrecoverable infinite loop (the `while (framesOnPage >= dwellFor(page))` body never reduces `Infinity`); `NaN` poisons state to `{framesOnPage: NaN, colourPhase: NaN}`; a negative `frames` yields `framesOnPage: -5`, refuting the docstring's `≥ 0` invariant. NOT reachable today — the sole caller (`main.ts:404 stepAttract(attract)`) uses the default `frames = 1` — but this is public core API the deferred-lessions follow-up will widen. Folded into the rework as defence-in-depth (a `Number.isFinite`/non-negative guard also restores the docstring invariant). Affects `plugins/joust/src/core/attract-scheduler.ts` (`stepAttract`). *Found by Reviewer during code review.*
- **Gap (non-blocking): pre-existing jt10-2 forward-refs in `cabinet.ts` are now partly falsified.** `src/core/cabinet.ts:79` ("wiring attract's self-play to carry GOVER_ATTRACT is jt10-4") — `GOVER_ATTRACT` is never assigned to any game's `gover` anywhere in the tree; the attract demo uses a `GOVER_RUNNING` game. `cabinet.ts:83` ("the page ORDER/scheduler is jt10-4") attributed to the title page — jt10-4's `PAGE_ORDER` contains no title page (title is a separate `CabinetMode`). These sit in a file this diff did NOT touch (out of scope), so they are captured for a prose-reconciliation follow-up rather than fixed here; the mirrors live in `tests/helpers/cabinet-contract.ts:79/92`. The `GOVER_ATTRACT` gap is the same subsystem as Dev's deferred G-block self-play finding. *Found by Reviewer during code review.*
- **Improvement (non-blocking): `prevStartHeld` edge-detect is duplicated across two frame-loop branches.** The rising-edge start detection is written verbatim in both the new `attract` branch (main.ts:407-408) and the pre-existing catch-all branch (main.ts:421-425). It self-heals (both writers set it unconditionally from the current key state, so no transition is dropped), so this is a readability/DRY note, not a defect — a shared post-branch computation would be cleaner. Affects `plugins/joust/src/main.ts`. *Found by Reviewer during code review.*
- **Improvement (non-blocking): `loadAttract` narrows a caught error without an `instanceof` check.** `tests/helpers/attract-contract.ts:139` casts `(e as Error).message`; a non-`Error` throw would surface a confusing message. Test-helper only, LOW. Affects `plugins/joust/tests/helpers/attract-contract.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Scheduler is stepped in video FRAMES, not milliseconds**
  - Spec source: context-story-jt10-4.md, AC-1
  - Spec text: "WHEN stepped with elapsed milliseconds"
  - Implementation: `stepAttract(state, frames?)` takes integer video frames (60 Hz); constants are in frames (COLOUR_CYCLE_FRAMES=150, MARQUE_DWELL_FRAMES=1110)
  - Rationale: the joust core counts integer frames (demo.ts / pumpFrames convention); a millisecond input smuggles a wall-clock mindset past the jt1-7 purity boundary and weakens determinism. Frames make the determinism AC stronger.
  - Severity: minor
  - Forward impact: the shell converts wall-time → frames at the timebase seam (it already does for the game); the scheduler never sees ms.
- **Pterodactyl banner pinned to the RV4 label 'PTERODACTYL BEWARE', not the title's word order**
  - Spec source: story title + context-story-jt10-4.md, AC-2
  - Spec text: "banner pages (BEWARE OF THE PTERODACTYL, HOME OF THE LAVA TROLL)"
  - Implementation: BANNERS.pteroBanner.text = 'PTERODACTYL BEWARE' cited JOUSTRV4.SRC:80 (per user ruling 2026-08-08)
  - Rationale: the ROM text is revision-split — RV4 says 'PTERODACTYL BEWARE'; only MESSEQU2.SRC:110 carries the fuller 'BEWARE OF THE "UNBEATABLE?" PTERADACTYL' (with a ROM spelling typo). The user ruled RV4 to keep the whole tree on one revision. The title phrasing is an approximation of the ROM label.
  - Severity: minor
  - Forward impact: the title's "BEWARE OF THE PTERODACTYL" no longer matches the shipped banner — a later reader must not "correct" the RV4 verbatim (the citation gate would fail). The `lavaBanner` DOES match the title exactly.
- **Scope limited to the two title-named banners; the scheduler is extensible for the rest**
  - Spec source: context-story-jt10-4.md, AC-2 ("and any others in ATT.SRC")
  - Spec text: "*BEWARE OF THE PTERODACTYL*, *HOME OF THE LAVA TROLL* (and any other banners from ATT.SRC)"
  - Implementation: PAGE_ORDER = demo + pteroBanner + lavaBanner only; the ROM's full 8-page ATMST lession family is NOT transcribed here
  - Rationale: user ruling 2026-08-08 — the title names exactly these two, the story is 5 points, and the other six lessions (flying/dying/egg/bounder/hunter/shadow-lord) are a fair-sized follow-up. `PAGE_ORDER` / `AttractPage` union is the seam a later story widens.
  - Severity: minor
  - Forward impact: a follow-up story adds the six remaining ATMST lessions to PAGE_ORDER + BANNERS (see Delivery Findings).
- **Dropped a vacuous AC-4 source-scan test**
  - Spec source: context-story-jt10-4.md, AC-4
  - Spec text: "demo.ts frames are stepped (via pumpFrames) AND the live game renders onscreen"
  - Implementation: a `main.ts` grep for "attract" + "stepDemo/pumpFrames" was removed — it went green on jt10-5's attract PLACEHOLDER (both tokens already present), proving nothing. AC-4's mechanical RED driver is the shell-imports-scheduler test; the actual render is a human smoke test per the design spec.
  - Rationale: a test that passes on the un-implemented placeholder is vacuous (TEA Phase-C self-check).
  - Severity: minor
  - Forward impact: verify AC-4 by human smoke test (self-play visibly runs on the attract demo page) in addition to the scheduler-wiring test.

### Dev (implementation)
- **Inverted the RED-seam test rather than deleting it**
  - Spec source: tests/attract-scheduler.test.ts (TEA), the "RED seam" describe
  - Spec text: `expect(loadAttract()).rejects.toThrow(/not built yet/)`
  - Implementation: once the module lands the negative-existence assertion cannot pass, so it now asserts the loader RESOLVES the full surface (createAttract/stepAttract/dwellFor/PAGE_ORDER present). Coverage preserved, not dropped.
  - Rationale: a "throws until built" test is a RED-only scaffold; inverting keeps a meaningful loader smoke-test without leaving a permanently-red assertion.
  - Severity: minor
  - Forward impact: none — the other 24 tests carry the behaviour.
- **Cabinet still boots to 'select', not 'attract'**
  - Spec source: the design spec lifecycle + AC-6
  - Spec text: the cabinet cycles attract → select → playing → gameover → attract
  - Implementation: main.ts keeps jt10-5's `{ mode: 'select', game: createGame(SEED) }` boot; 'attract' is reached from a non-qualifying game-over (afterGameOver → attract) and rendered by renderAttract. I briefly booted to attract via createCabinet but REVERTED — it removed main.ts's literal `createGame(` call and reddened three jt4-5 seam guards (demo-source / gameover-wiring / render-jt4-5).
  - Rationale: booting to attract was gilding outside this story's tests and broke an existing architectural invariant; the attract loop is fully wired without it.
  - Severity: minor
  - Forward impact: to make attract the boot front door, a later story must reconcile the jt4-5 `createGame(` seam guards with a createCabinet boot.
- **Self-play under attract steps the session with EMPTY inputs (no active player AI)**
  - Spec source: context-story-jt10-4.md, AC-4 + the ad1-4 quarry (G-block self-play)
  - Spec text: "self-play (demo.ts)" / the ROM's G1JOY/G2JOY software-joystick commands
  - Implementation: on the demo page main.ts steps `stepGame(cabinet.game, {})` — the ecosystem (enemies, pteros, eggs) runs autonomously; the two knights receive no input and drift, and the demo restarts (toAttract) when it settles to game-over. The G-block player AI is NOT wired.
  - Rationale: active player AI is the ad1-4 G-block subsystem — a whole ROM decision-tree the story's tests do not pin and that is materially its own effort. The scheduler + banners + loop (the pinned scope) are complete.
  - Severity: minor
  - Forward impact: a follow-up wires the G1JOY/G2JOY player AI so the demo knights actually joust (see Delivery Findings).
- **Banner dwell (300 frames ≈ 5 s) is a presentation choice, not a ROM citation**
  - Spec source: context-story-jt10-4.md, AC-1
  - Spec text: page dwells / the ATT.SRC page timings
  - Implementation: `BANNER_DWELL_FRAMES = 300` in attract-scheduler.ts is uncited (documented as presentation, like demo.ts's MATERIALISE_WINDOW). Only COLOUR_CYCLE_FRAMES (150, ATT.SRC:173) and MARQUE_DWELL_FRAMES (1110, ATT.SRC:121) are transcribed.
  - Rationale: the ROM's per-lession dwell lives in ATMST/OUTP35 timing not cleanly transcribed here; a faithful pin is deferred with the other six lessions.
  - Severity: minor
  - Forward impact: the deferred-lessions follow-up can transcribe the real per-page dwell.

### Reviewer (audit)
- **Scheduler stepped in FRAMES, not milliseconds (TEA)** → ✓ ACCEPTED by Reviewer: sound — frames keep the determinism AC strong and honour the jt1-7 purity boundary; the shell already converts wall-time→frames at the timebase seam.
- **Pterodactyl banner pinned to RV4 'PTERODACTYL BEWARE' (TEA)** → ✓ ACCEPTED by Reviewer: user-ruled 2026-08-08; byte-verified GREEN against JOUSTRV4.SRC:80 (confirmed by comment-analyzer against the vendored tree). A later reader must not "correct" it to the title's word order.
- **Scope limited to the two title-named banners (TEA)** → ✓ ACCEPTED by Reviewer: user-ruled; `AttractPage`/`PAGE_ORDER` are a clean extension seam; the six remaining lessions are logged as a follow-up Delivery Finding.
- **Dropped the vacuous AC-4 source-scan test (TEA)** → ✓ ACCEPTED by Reviewer: correct — a scan that went green on jt10-5's placeholder proved nothing. NOTE: the AC-3 FONT57 and AC-3/AC-4 import-wiring guards that REMAIN are themselves weak (see Reviewer Assessment findings R5/R6) — this deviation removed one vacuous guard but two others survive.
- **Inverted the RED-seam test rather than deleting it (Dev)** → ✓ ACCEPTED by Reviewer: the inverted assertion (loader RESOLVES the full surface) is non-vacuous — it fails if any export is dropped.
- **Cabinet still boots to 'select', not 'attract' (Dev)** → ✓ ACCEPTED by Reviewer: reverting the boot-to-attract attempt was correct — it removed main.ts's literal `createGame(` call and reddened three jt4-5 seam guards. The attract loop is fully wired without it. Making attract the boot front door is proper follow-up scope.
- **Self-play under attract steps with EMPTY inputs / no player AI (Dev)** → ✓ ACCEPTED by Reviewer: the G-block player AI is a materially separate subsystem (the ad1-4 quarry) not pinned by this story's tests; the ecosystem runs, the loop restarts on game-over, no soft-lock. Logged as a Delivery Finding.
- **Banner dwell 300 frames is presentation, not a citation (Dev)** → ✓ ACCEPTED by Reviewer: honestly documented as uncited (like demo.ts's MATERIALISE_WINDOW); COLOUR_CYCLE_FRAMES and MARQUE_DWELL_FRAMES are the only transcribed constants and both are cited + byte-verified.

## Sm Assessment

**Setup complete — routing to TEA (RED) for the tdd workflow.**

**Story:** jt10-4 (5pt, p2, tdd) — the joust cabinet-lifecycle attract cycle: an attract-page scheduler stepping title → high-score table → self-play demo → rules/banner pages and repeating (the `ATT.SRC` sequence; colours cycle ~2.5s per `ATT.SRC:173`), the banner/rules pages (*BEWARE OF THE "UNBEATABLE?" PTERODACTYL*, *HOME OF THE LAVA TROLL*), and self-play under attract wiring the shipped `demo.ts` + `pumpFrames`. Supersedes the canceled `ad1-4`.

**Pre-flight probes (all clean):**
- **Dependency `jt10-2` is DONE** — the cabinet state machine (`cabinet.ts`) this story wires into. Gate satisfied.
- **No sibling owns it** — no `origin` branch matched `jt10-4` before setup; only live sibling session is a-1 running `mc4-4` (missile-command, zero file contention with joust).
- **Premise measured against the current tree — SOUND, not stale:** `demo.ts` is shipped (reuse), and `cabinet.ts` (jt10-2) already carries the `attract` mode + a `toAttract` reset stubbed as *jt10-4*'s job (line 129). This story fills the attract SUB-CYCLE; it does not build the machine tier or demo.ts. See Delivery Findings.

**Reuse-first ledger (do not rebuild):** `demo.ts`, `cabinet.ts` (mode/hinge/`toAttract`), `pumpFrames` (timebase), joust's own FONT57 raster renderer (jt10-1), `@shared/highscore` for the table page.

**Ground truth for "self-play":** the ad1-4 retained quarry — the ROM GOVER/G-block decision-block model (GAMSIM :232, `GOVER=$7F`, G1DEC/G2DEC vs P-blocks), pinned in `plugins/joust/src/shell/audio-manifest.ts` + `plugins/joust/tests/audio-decision-block-families.test.ts`.

**Open quarry handed to TEA (must resolve before RED pins):** ATT.SRC page order + colour-cycle cadence, and exact source lines for the two banner phrases (not in ATT.SRC — probe PHRASE.SRC/MESSAGE.SRC). Flagged as a `> ⚠ QUARRY` block at the top of the context file.

**Purity note for Dev:** any new `src/core/` attract-scheduler module is swept by the jt1-7 boundary scanner (no clock, no browser surface, no shell import — and avoid the browser-object words even in comments). Banner layout is a SHELL raster concern, not `@shared/font`.

**Artifacts:** session `.session/jt10-4-session.md`; context `sprint/context/context-story-jt10-4.md` (6 derived ACs + quarry banner); branch `feat/jt10-4-attract-cycle` (pushed — claim visible to sibling probe); status `in_progress` (verified).

I have anticipated this attract cycle. Han Solo — the RED phase is yours.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (18 failing / 7 passing of 25 — ready for Dev)

**Test Files:**
- `plugins/joust/tests/helpers/attract-contract.ts` — TEA-authored CONTRACT for the new `src/core/attract-scheduler.ts` (types + `loadAttract()` self-describing dynamic-import loader — the loadGame/loadDemo/loadCabinet seam; tsc stays green, RED reddens per-test).
- `plugins/joust/tests/attract-scheduler.test.ts` — the behaviour + citation + purity + integration suite (25 tests).

**Tests Written:** 25 tests covering all 6 ACs.
**RED split (verified via testing-runner + a direct run):** 18 fail on the correct blockers — 15 on `loadAttract`/`readSchedulerSource` (module `src/core/attract-scheduler.ts` absent), 2 on shell-wiring source scans (scheduler not imported by the shell; no banner-screen module), 1 ROM-concat check blocked by the module. 7 pass: the 4 vendored byte-checks (which VERIFY my ROM citations against the real bytes), the RED-seam throw assertion, and the 2 cabinet facts that already hold (createCabinet boots `attract`; `toSelect` exits it). No TS/import errors — tsc is green repo-wide.

**Quarry resolution (the SM handed this over):** RESOLVED against the vendored RV4 tree and byte-verified —
- Colour cadence 2.5 s → `COLOUR_CYCLE_FRAMES=150` (`ATT.SRC:173`); MARQUE dwell 18.5 s → `MARQUE_DWELL_FRAMES=1110` (`ATT.SRC:121`).
- `pteroBanner='PTERODACTYL BEWARE'` (`JOUSTRV4.SRC:80`, RV4 per user ruling); `lavaBanner='HOME OF THE LAVA TROLL'` (`MESSEQU.SRC:156`+`:155`).
- Scope = the 2 title-named banners + the demo page (user ruling); scheduler extensible for the 6 deferred ATMST lessions (Delivery Finding).

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|---|---|---|
| #3 union over string-enum (runtime cost) | `AttractPage` is a union; `PAGE_ORDER contains the demo page and BOTH banners` | failing |
| #2 `readonly` params not mutated | `is a PURE transform — … the input is not mutated` (freezes + deep-equals input) | failing |
| #4 `0` is valid, not falsy (`??` not `||`) | `colourPhase ticks once per COLOUR_CYCLE_FRAMES` + `framesOnPage` below-dwell (guards a `\|\|` default on 0) | failing |
| #5 `.js` ESM extensions | contract + suite import with `.js`; `loadAttract` asserts the built module resolves | failing |
| jt1-7 purity (project rule) | `ZERO purity violations` + `no browser global even in comments / no ../shell import` | failing |
| determinism / no wall-clock (SOUL) | `same (state, frames) → deep-equal result` | failing |
| #8 test quality (no vacuous) | Phase-C self-check REMOVED one vacuous AC-4 source scan (green on the placeholder) | done |

**Rules checked:** 6 of ~9 applicable TS lang-review rules have test coverage (React/#6, async/#7, build-config/#9 are N/A to a pure sync core module).
**Self-check:** 1 vacuous test found and removed (see Design Deviations).

**Handoff:** To Dev (Yoda) for GREEN. Build `src/core/attract-scheduler.ts` per `tests/helpers/attract-contract.ts`; add the `docs/rom-study/claims/attract.json` citations (RV4 verbatim — do NOT "fix" any ROM spelling); wire the shell (`main.ts` attract path + a `src/shell/attractScreen.ts` FONT57 banner layout, `gameOverScreen.ts` pattern) and step `demo.ts` under the attract demo page. Reuse `demo.ts`/`cabinet.ts`/`pumpFrames` — do not rebuild them.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** joust 3211/3211 passing (GREEN); attract-scheduler.test.ts 24/24; orchestrator 408/408; tsc clean; `node scripts/build-app.mjs joust` bundles (42 modules).
**Branch:** feat/jt10-4-attract-cycle (pushed — `65629cee`)

**Files Changed:**
- `plugins/joust/src/core/attract-scheduler.ts` (NEW) — the pure attract sub-cycle: `AttractPage` union (demo/pteroBanner/lavaBanner), `AttractState {page, framesOnPage, colourPhase}`, `COLOUR_CYCLE_FRAMES=150` (ATT.SRC:173), `MARQUE_DWELL_FRAMES=1110` (ATT.SRC:121), `PAGE_ORDER`, `BANNERS` (RV4-cited), `dwellFor`, `createAttract`, `stepAttract` (accumulate → advance+WRAP at each dwell → tick colourPhase). No imports, fully pure — passes the jt1-7 sweep.
- `plugins/joust/docs/rom-study/claims/attract.json` (NEW) — 5 claims, verbatim read straight from the vendored lines (ATT.SRC:173/121, JOUSTRV4.SRC:80, MESSEQU.SRC:156/155), byte-verified by the citation gate.
- `plugins/joust/src/shell/attractScreen.ts` (NEW) — `layoutAttractBanner(page, colour)` lays a banner out in FONT57 via `layoutText`, reusing the core `BANNERS` string (gameOverScreen.ts pattern).
- `plugins/joust/src/main.ts` — drives the scheduler under `attract`: steps it per frame, pumps the self-play session on the demo page (empty inputs; restarts via `toAttract` on game-over), START → `toSelect` (AC-6); renders the demo sim or the colour-cycling banner (`renderAttract`, extracted `paintSim` shared with the playing render).
- `plugins/joust/README.md` — derived count anchors synced (162→163 test files, 1078→1083 claims).

**ACs:** AC-1 (scheduler pure transform) ✓, AC-2 (banner ROM citations, gate-accepted) ✓, AC-3 (FONT57 banner layout) ✓ [render is human-smoke-tested], AC-4 (demo stepped under attract) ✓ [ecosystem runs; active player AI deferred — Delivery Finding], AC-5 (purity) ✓, AC-6 (attract loops; START→select) ✓.

**Self-review:** wired to the shell ✓; follows the fontRender/gameOverScreen layout pattern ✓; the jt4-5 `createGame(` seam preserved (a boot-to-attract attempt was reverted — see Design Deviations) ✓. Two deferrals (player G-block AI, the 6 remaining lessions) are logged as Delivery Findings, not silent.

**Handoff:** To Reviewer (Obi-Wan) for review. Note the two intentional deferrals and the RED-seam test inversion in the Design Deviations.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all green) | N/A — joust 3211/3211, orchestrator 408/408, tsc clean, build OK |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (test-quality assessed by rule-checker backstop + Reviewer) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 (+1 verified-clean citation note) | confirmed 2, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — no exploitable DoS/injection; purity + palette rules compliant |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 14 across 8 rules | confirmed 7, folded/dup 4, deferred/non-blocking 3 |

**All received:** Yes (4 enabled returned: preflight, comment-analyzer, security, rule-checker; 5 disabled via settings)
**Total findings:** 6 confirmed blocking, 4 confirmed non-blocking (Delivery Findings), 0 dismissed

Note: the rule-checker's mutation probe reported possibly overwriting `src/main.ts`; Reviewer verified the working tree — `git diff plugins/joust/src/main.ts` is empty and the attract-scheduler import is intact, so no restoration was needed.

## Reviewer Assessment

**Verdict:** REJECTED

The core work is genuinely strong: `attract-scheduler.ts` is pure (jt1-7 scanner green, [SEC] + [RULE] confirm zero boundary violations), every ROM constant is cited and byte-verified against the vendored tree ([DOC] + [RULE] checked ATT.SRC:173/121, JOUSTRV4.SRC:80, MESSEQU.SRC:156/155), the README count anchors are correct (163 test files, 1083 claims — I reproduced both), and the suite/build are fully green. But the story's own new diff ships a cluster of verified quality defects that the green pipeline cannot see: two false comments this diff wrote, two stale comments it falsified while updating their siblings, and two mutation-defeated test guards. A false state-machine comment and a "FONT57" guard that never reads a file will mislead the jt10-7 author and give false AC-3/AC-4 coverage confidence — all cheap to fix in one round-trip.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [DOC][RULE] (R1) | Comment claims the attract scheduler "Reset to a fresh cycle whenever attract is (re)entered" — FALSE. `createAttract()` has exactly one call site (init, :321); `afterGameOver`→attract never resets the shell `attract` var. A false mechanism claim in this diff's OWN new code (confirmed ×3: my trace, comment-analyzer, rule-checker). | `plugins/joust/src/main.ts:318-320` | Correct the comment to state the cycle CONTINUES from where it left off — OR implement the reset (`attract = createAttract()` at the afterGameOver→attract edge). Pick one so comment and code agree. |
| [MEDIUM] [DOC][RULE] (R2) | Comment says the banner is "centred on a colour-cycling background index" — misattributes the cycle. The background is a fixed `colours[0]` (:446); the cycling colour is passed to `layoutText` and colours the banner GLYPHS (text), not the background. | `plugins/joust/src/main.ts:286-288` | Reword: the banner TEXT colour cycles with `colourPhase`, centred on a static background. |
| [MEDIUM] [RULE] (R3) | Stale comment falsified by THIS diff: "jt10-4 (attract) … until they land, both render as the coin-up door below." Attract now renders via the diff's own new `renderAttract()` (:453-456). The sibling coin-up-door comment (select branch) WAS updated in this diff; this one was missed. | `plugins/joust/src/main.ts:388-390` | Update to reflect that attract renders via `renderAttract`; only 'highscore' still falls through to the coin-up door until jt10-7. |
| [MEDIUM] [RULE] (R4) | Stale forward-ref: "This mode is not reached until jt10-4 wires the attract cycle into it" (title). jt10-4 has shipped and title mode is STILL unreached (`toTitle` is never called in main.ts). The sibling title comment (dispatcher, :460-461) was updated in this diff to drop the jt10-4 clause; this descriptive block was missed. | `plugins/joust/src/main.ts:229-230` | Update: the render hook is in place, but wiring title INTO the attract page order is deferred with the remaining ATMST lessions. |
| [MEDIUM] [RULE] (R5) | Mutation-defeated test guard: the AC-3/AC-4 "shell imports the attract-scheduler module" check is `/attract-scheduler/.test(main)` — a bare token over the whole file. The rule-checker deleted the real import, left a bare comment mentioning the name, and the guard stayed green. | `plugins/joust/tests/attract-scheduler.test.ts:280-287` | Anchor to the actual import statement (e.g. `/import\s+\{[^}]*\}\s+from\s+['"][^'"]*attract-scheduler\.js['"]/`), and mutation-test it (delete the import → red). |
| [MEDIUM] [RULE] (R6) | Vacuous test guard: "a banner page lays its text out in FONT57 (AC-3)" only checks that a shell file EXISTS (`existsSync`); it never reads the file, so it cannot verify FONT57 at all — it would pass for an empty file. The test NAME overclaims the coverage. | `plugins/joust/tests/attract-scheduler.test.ts:296-302` | Read the shell layout file and assert it uses `layoutText('FONT57', …)` (production is correct at `attractScreen.ts:34`); mutation-test by swapping the font token → red. |

**Subagent dispatch tags (all enabled specialists incorporated):**
- [EDGE] — disabled via settings; boundary analysis performed by Reviewer + rule-checker (degenerate-input case below).
- [SILENT] — disabled via settings; no swallowed-error surface in this diff (the one `catch` is a test helper, noted as a non-blocking Delivery Finding).
- [TEST] — disabled via settings; test quality assessed by the rule-checker backstop + Reviewer — surfaced R5/R6 (two mutation-defeated guards).
- [DOC] — comment-analyzer confirmed R1 + R2 (high confidence) and verified all ROM citations clean against the vendored tree.
- [TYPE] — disabled via settings; no `as any`/`ts-ignore`/unsafe-cast in the diff (rule-checker #1–#3 all clean; the union `AttractPage` is correct).
- [SEC] — clean: `stepAttract`'s loop is not exploitable via any reachable caller (frames pinned to 1, dwells are positive constants); no eval/innerHTML/dynamic-user-import; purity + palette rules compliant.
- [SIMPLE] — disabled via settings; one readability note (duplicated `prevStartHeld` edge-detect) logged as a non-blocking Delivery Finding.
- [RULE] — rule-checker corroborated R1–R6 and surfaced the degenerate-input gap; I EXECUTED the boundary: `stepAttract(_, Infinity)` is a confirmed infinite loop, `NaN` poisons state, `-5` → `framesOnPage:-5` (refutes the docstring's `≥0` invariant). UNREACHABLE today (sole caller uses default `frames=1`) → non-blocking Delivery Finding + fold the guard into the R-round as defence-in-depth.

**Data flow traced:** keyboard `held` → `readSelectInput` → rising-edge `toSelect` (attract→select, AC-6) ✓; `stepAttract(attract)` once per pumped frame, demo page pumps `stepGame(cabinet.game, {})` and restarts via `toAttract` on GOVER_OVER (no soft-lock; an idle knight either dies or the 1110-frame dwell advances the page) ✓.

**Pattern observed:** clean reuse of the jt10-1 layout seam — `attractScreen.ts` mirrors `gameOverScreen.ts`/`selectScreen.ts` (return layout DATA, paint elsewhere), and `paintSim` was correctly extracted to share the playing/attract render path (`main.ts:274-284`).

**Handoff:** Back to TEA (red rework) — R5/R6 need real test teeth and the degenerate-input guard wants a RED test, so this is testable, not lint-only. R1–R4 are comment corrections that ride along in the same round.

## TEA Rework (round 1)

**Scope ruling (user, "trim"):** Keep R1–R6. DROP the non-blocking `stepAttract` `frames` guard from this rework — it remains a non-blocking Delivery Finding (unreachable today; the deferred-lessions follow-up that widens the caller can add it then). So this round is the four comment corrections (R1–R4, Dev/green) plus hardening the two vacuous test guards (R5/R6, TEA).

**Tests hardened (R5, R6) — `plugins/joust/tests/attract-scheduler.test.ts`:**
- **R5** — the "shell imports the attract-scheduler module" guard now anchors to the ESM import statement: `/import[^;]*\bfrom\s+['"][^'"]*attract-scheduler\.js['"]/` over `main.ts`, instead of the bare `/attract-scheduler/` token. Mutation-verified: replacing the real import with a bare `// attract-scheduler` comment flips it false (round-1 form stayed true).
- **R6** — the "lays its text out in FONT57" guard now READS the shell layout module and requires `layoutText('FONT57', …)` via `/layoutText\(\s*['"]FONT57['"]/`, instead of only `existsSync`. Mutation-verified: `FONT57`→`FONT35` and an empty file both flip it false.

These are guard-backfills (production is already correct — `main.ts:28` imports the module, `attractScreen.ts:34` calls `layoutText('FONT57', …)`), so both are GREEN on arrival; the RED is demonstrated by the in-memory mutations above (the "mutation IS the RED" pattern). Full `attract-scheduler` file green (25/25). No production/source files touched by TEA.

**Handoff:** To Dev (Yoda / green) for the R1–R4 comment corrections in `plugins/joust/src/main.ts` (no logic changes — comment text only). After Dev, back to Reviewer to confirm all six are closed.

### Delivery Findings — TEA (rework round 1)
- **The `stepAttract` `frames` boundary guard is deferred by user ruling ("trim").** Confirmed real (Infinity → infinite loop, NaN → poisoned state, negative → `framesOnPage:-5` refuting the `≥0` docstring), but unreachable through the sole caller (default `frames = 1`). Fix belongs with the follow-up that widens the scheduler caller; a `Number.isFinite`/non-negative clamp in `stepAttract` also restores the docstring invariant. Affects `plugins/joust/src/core/attract-scheduler.ts`. *Recorded by TEA during rework round 1.*
## Dev Rework (round 1 — green)

**R1–R4 comment corrections in `plugins/joust/src/main.ts` (comment text only, zero logic change):**
- **R1** (`~318`) — the scheduler var comment no longer claims a reset-on-re-entry; it now states the cycle is created once and CONTINUES from where `stepAttract` left it on an `afterGameOver`→attract re-entry, with the fresh-page reset noted as a deferred follow-up.
- **R2** (`~286`) — corrected to say the banner is centred on a STATIC background (the fixed `colours[0]` fill) and it is the banner's TEXT colour that steps with `colourPhase`.
- **R3** (`~388`) — the game-over routing comment now says 'attract' renders via `renderAttract` (jt10-4) and only 'highscore' falls through to the coin-up door until jt10-7.
- **R4** (`~229`) — the title block now states the render hook is in place but title is not yet reached (`toTitle` has no caller; jt10-4's PAGE_ORDER carries no title page), wiring deferred with the ATMST lessions.

R5/R6 (test-guard hardening) were completed by TEA in the red phase and are mutation-proven. The `stepAttract` `frames` guard was dropped from this rework per the user "trim" ruling (stays a non-blocking Delivery Finding).

**Verification:** `npm run lint` clean (tsc --noEmit); `npx vitest run --project joust` → 163 files / 3211 tests GREEN; `node scripts/build-app.mjs joust` builds (41.67 kB gzip). No source logic changed — only comments (main.ts) and two hardened test guards (TEA).

**Handoff:** To Reviewer (Obi-Wan) to confirm R1–R6 are closed.
## Subagent Results

_(Review round 2 — re-review of the tightly-scoped rework: 4 comment corrections + 2 hardened test guards, no production logic. Enabled specialists re-run on the rework; disabled ones per settings.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — joust 3211/3211, orchestrator 408/408, tsc clean, build OK, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (test-guard closure verified by rule-checker) |
| 5 | reviewer-comment-analyzer | Yes | clean | 0 (R1–R4 all CLOSED) | confirmed closed 4, no fresh lies (high confidence) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | n/a | No logic change this round; round-1 result (clean) stands — re-verified by Reviewer |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 blocking (R5/R6 CLOSED, mutation-proven; 1 awareness note) | confirmed closed 2, 1 non-blocking note deferred |

**All received:** Yes (3 enabled specialists re-run: preflight, comment-analyzer, rule-checker; security skipped as no-logic-change with round-1 clean standing; 5 disabled via settings)
**Total findings:** 0 blocking (all 6 round-1 findings CLOSED), 1 non-blocking awareness note (deferred as Delivery Finding)

## Reviewer Assessment

**Verdict:** APPROVED _(round 2 — re-review; round 1 was REJECTED, see the assessment above)_

The rework closed all six round-1 findings at the trimmed scope the user ruled ("drop only the guard"). I re-read every corrected comment as fresh prose and traced each claim to the code (a comment rework is exactly where a fresh lie sneaks in — none did), and both hardened guards are mutation-proven.

**Findings closure:**
- **R1–R4 (comments) — CLOSED.** [DOC] comment-analyzer + [RULE] rule-checker + my own trace all independently confirm the four corrected comments are now accurate: the `attract` scheduler is created once and NOT reset on re-entry (single `createAttract()` at main.ts:326; only `stepAttract` reassigns it); the banner background is the fixed `colours[0]` and the TEXT colour cycles; 'attract' renders via `renderAttract` while only 'highscore' falls through to the coin-up door; and title is unreached (`toTitle` has no caller, `PAGE_ORDER` has no title page). No fresh false claim introduced.
- **R5 (import-wiring guard) — CLOSED.** [RULE] mutation-verified on a scratch copy: the guard now anchors to the ESM import statement; replacing the real import with a bare comment mentioning the module name flips it RED (the round-1 vacuity is gone).
- **R6 (FONT57 guard) — CLOSED.** [RULE] mutation-verified: the guard now reads the shell layout module and requires `layoutText('FONT57', …)`; `FONT57`→`FONT35` (with "FONT57" left in surrounding comments as a decoy) and an emptied file both flip it RED — proving it targets the call site, not the bare token.

**Subagent dispatch tags:**
- [EDGE] — disabled; boundary re-checked by Reviewer (no logic change).
- [SILENT] — disabled; no error-handling surface changed.
- [TEST] — disabled; test-guard closure verified by rule-checker (R5/R6 mutation-proven).
- [DOC] — comment-analyzer confirmed R1–R4 CLOSED, no fresh lies (high confidence).
- [TYPE] — disabled; no type changes (the one `layoutFile as string` cast is guarded by a preceding `toBeDefined()` that halts on failure).
- [SEC] — no logic change; round-1 clean result stands.
- [SIMPLE] — disabled; no complexity added (comment text + one hardened assertion each).
- [RULE] — rule-checker confirmed both guards mutation-proven and no new violations; flagged one non-blocking awareness note (below).

**Non-blocking (Delivery Finding):** the R5 import regex uses `[^;]*`, which — because the import block has no intervening semicolons — is not strictly bounded to a single import statement; a contrived decoy comment containing a quoted `from '…attract-scheduler.js'`, or a type-only import, could theoretically satisfy it. This is NOT the round-1 defect (the bare-token comment spoof is closed and mutation-proven), and both spoofs are far-fetched given the codebase style. Optional future tightening: require a runtime named binding (`\{[^}]*\b(createAttract|stepAttract)\b`). Recorded, not blocking.

**Deviation audit (round 2):** the rework introduced no new Design Deviations; the round-1 audit (all 8 entries ACCEPTED) stands.

**Data flow / pattern:** unchanged from round 1 and re-confirmed — the attract loop, START→select edge, and demo restart-on-game-over are intact; the jt10-1 layout-seam reuse is clean.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story. The rework is committed on the feature branch (`3a0efba5`); the working tree carries only the epic-YAML tracking change.
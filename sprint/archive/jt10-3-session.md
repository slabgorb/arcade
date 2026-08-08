---
story_id: "jt10-3"
jira_key: "jt10-3"
epic: "jt10"
workflow: "tdd"
---
# Story jt10-3: Title screen (MARQUE): transcribe the JOUST vector logo + (C)1982 copyright + EXTRA-MOUNT lines in FONT57, with the ATT.SRC colour cycle

<!-- Retitled at RED (jt8-6-shape): "PRESENTED-BY" was refuted by quarry — it exists in no ROM revision. See Design Deviations. -->
<!-- Original title: "Title screen: transcribe the JOUST logo picture + PRESENTED-BY / EXTRA-MOUNT / (C)1982 lines in FONT57, with the ATT.SRC colour cycle" -->

## Story Details
- **ID:** jt10-3
- **Jira Key:** jt10-3
- **Workflow:** tdd
- **Stack Parent:** jt10-2 (DONE — cabinet state machine, PR #68)
- **Repos:** arcade
- **Branch Strategy:** gitflow (feat/jt10-3-title-screen-logo-font57)
- **Branch:** feat/jt10-3-title-screen-logo-font57
- **PR:** 100

## Background

The cabinet lifecycle epic jt10 is building the full state machine and screens for Joust (attract/title/select/playing/gameover/highscore). Story **jt10-2 (DONE)** laid the cabinet tier (`core/cabinet.ts`) with mode transitions, including the `'title'` mode. This story implements the **title screen** — the overlay rendered when the cabinet is in `'title'` mode, displaying the JOUST logo picture and ROM text strings in Joust's own FONT57 (5×7 stylized font), with the ATT.SRC colour cycle.

**Design authority:** [docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md](../../docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md), §Screens table (row "Title") and §Open questions (quarry for TEA before RED).

**Font resources** (jt10-1, DONE):
- `FONT57` (5×7 glyphs, actually 6×7 cell size) — the stylized ROM font for the title text lines
- Shell raster text renderer (`layoutText`) from jt10-1, reusable via `blit`/`paintText` pipeline

**Cabinet state machine seam** (jt10-2, DONE):
- Cabinet mode `'title'` already exists in `CabinetMode`
- The `toTitle(cab)` transition is already pinned (pure mode edge)

**Scope of THIS story:**
1. **Core title data** — transcribed ROM strings (once TEA quarries them: title-line phrases, logo geometry).
2. **Shell title overlay** — render the JOUST logo picture + title text in FONT57 via the existing atlas/blit path.
3. **Wiring in main.ts** — render the title overlay when `cabinet.mode === 'title'`, with the ATT.SRC colour cycle (~2.5s cadence).

**Out of Scope:**
- Attract cycle page scheduler (jt10-4), 1P/2P select (jt10-5), game-over screen (jt10-6), high-score entry (jt10-7).
- The full attract sub-cycle; this story owns the title *screen* alone (whether entered as `'title'` mode or as an attract sub-page is jt10-2/jt10-4's design question).

## Acceptance Criteria

**QUARRY RESOLVED (see Delivery Findings + Design Deviations).** The title screen is the ROM's **MARQUE** routine (ATT.SRC:50): a diagonal-stripe background, the **vector** JOUST wordmark, and up to two FONT57 phrase lines, with the marquee palette flashing on a colour cycle. "PRESENTED-BY" was refuted and dropped (retitle). Concrete ACs:

1. **Core title text (pure DATA, `src/core/title.ts`)** — the three MARQUE strings, transcribed VERBATIM, each cited to its primary source:
   - `TITLE_COPYRIGHT = '(C) 1982 WILLIAMS ELECTRONICS INC.'` (MSCOPY $6C — MESSEQU.SRC:129; bytes PHRASE.SRC:599)
   - `TITLE_EXTRA_MOUNT = 'EXTRA MOUNT EVERY '` (MSW17 $F7 — MESSEQU.SRC:158)
   - `TITLE_POINTS_SUFFIX = ',000 POINTS'` (MSW18 $F8 — MESSEQU.SRC:157)

2. **Core logo geometry (`JOUST_LOGO`, pure DATA)** — the vector wordmark transcribed from the `LIST` table (ATT.SRC:423-531): five letter-groups whose stored x-offsets are [5,68,110,170,222] (J,O,U,S,T left-to-right; XPOS=4 folded in), each a set of polyline strokes carrying a fill flag (NOFILL=0 / FILL=$80) and a CL1..CL4 colour pair ($11/$22/$33/$44). Cited to ATT.SRC.

3. **Core colour cycle (pure DATA + pure fn)** — `TITLE_COLOR_CADENCE = 87` (ATT.SRC:173, NOT 88); `TITLE_PALETTE` = the `MARCOL` table (ATT.SRC:288-294), 6 rows × 8 bytes, radix-faithful (@300=192, @377=255, @350=232); and a pure `titleColorRow(tick)` that cycles through the 5 cycling rows (MARCOL+8..MAREND), advancing every cadence and wrapping — deterministic, no clock.

4. **Shell title overlay (`src/shell/titleScreen.ts`, `layoutTitleScreen(colour)`)** — mirrors `gameOverScreen`/`selectScreen`: lays the copyright + extra-mount phrase lines out in FONT57 via `layoutText`, REUSING the core strings (never re-hardcoded), threads the caller's colour, and exposes the `JOUST_LOGO` geometry for the caller to draw. Returns layout DATA; pixels/positions are main.ts's job.

5. **Wiring in `main.ts`** — a `'title'` mode branch that renders the title overlay and drives the colour cycle from the shell frame counter via `titleColorRow` (the shell owns the clock). Follows the select/gameover render-branch precedent.

6. **ROM fidelity + purity** — every transcription cites its `.SRC` source line (comment idiom, protected by `comment-line-refs`); `src/core/title.ts` passes the single `tests/purity.test.ts` core-boundary scanner (no `window.`/`document.`/`Date.now`/`Math.random`, even in comments). The derived test-FILE count in README stays green (`audio-seam-scope`).

## Quarry — RESOLVED

All three items resolved by primary-source inspection before RED (details in Delivery Findings): Q1 logo = vector `LIST` table (ATT.SRC:423-531), not a bitmap; Q2 phrasing = MSCOPY/MSW17/MSW18, "PRESENTED-BY" refuted (zero hits) → retitle; Q3 cadence = 87 (ATT.SRC:173), palette MARCOL. The title screen lives in ATT.SRC (shared across JOUSTRV1..4) → no revision ambiguity.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T12:35:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T21:26:00Z | 2026-08-08T09:59:13Z | -41207s |
| red | 2026-08-08T09:59:13Z | 2026-08-08T12:11:13Z | 2h 12m |
| green | 2026-08-08T12:11:13Z | 2026-08-08T12:27:29Z | 16m 16s |
| review | 2026-08-08T12:27:29Z | 2026-08-08T12:35:17Z | 7m 48s |
| finish | 2026-08-08T12:35:17Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Quarry RESOLVED — Q1 logo geometry] Gap/non-blocking.** The JOUST logo is a **vector line-drawing wordmark**, NOT a bitmap picture. Geometry = the polyline table `LIST` (ATT.SRC:423-531), interpreted by the `GO`/`TOP`/`DEMO` loop (ATT.SRC:85-118) and drawn by `LINE` (ATT.SRC:340-417). Five letter-groups, positioned left-to-right into J-O-U-S-T by stored x-offset (J=`1+XPOS`=5, O=`$40+XPOS`=68, U=`$6A+XPOS`=110, S=`166+XPOS`=170, T=`218+XPOS`=222; XPOS=4 at ATT.SRC:47). Colours CL1=$11,CL2=$22,CL3=$33,CL4=$44 (ATT.SRC:43-46); fill flags NOFILL=0 / FILL=$80 (ATT.SRC:41-42). No `JOUST.PIC` exists — the design spec's "nibble-packed bitmap / .PIC" guess is refuted.
- **[Quarry RESOLVED — Q2 title phrasing] Conflict/non-blocking (drove the retitle).** The three title-line strings the MARQUE routine emits: `MSCOPY $6C '(C) 1982 WILLIAMS ELECTRONICS INC.'` (MESSEQU.SRC:129; bytes PHRASE.SRC:599), `MSW17 $F7 'EXTRA MOUNT EVERY '` (MESSEQU.SRC:158), `MSW18 $F8 ',000 POINTS'` (MESSEQU.SRC:157) — all output via OUTPHR (5×7 = FONT57; the `35`-suffixed routines are the 3×5 ones, MESSAGE.SRC:33-36). "PRESENTED BY" has **zero hits across every .SRC file**; the only near-match is the operator-configurable `OPMESS`/`OPWRT` (EQU.SRC:129,236), a blank-by-default RAM message entered via the test menu (TB12REV1.SRC:150). No joust title capture exists in the repo. The title screen lives entirely in ATT.SRC (shared across JOUSTRV1..4) → no revision ambiguity. → story retitled to drop PRESENTED-BY (user ruling, see Design Deviations).
- **[Quarry RESOLVED — Q3 colour cycle] Gap/non-blocking.** Cadence at ATT.SRC:173 is `LDD #((((2*60+30)/16)+1)*8)+7` = **87** (NOT the spec's guessed 88), comment "CHANGE COLORS EVERY 2 1/2 SECONDS". Cycler = `FLASH` routine (ATT.SRC:142-184), stepping palette `MARCOL` (ATT.SRC:288-294; 6 rows × 8 bytes, `MARCOL`..`MAREND`) — cycling window is `MARCOL+8`..`MAREND` (the 5 rows after the initial row), advancing +8 bytes each cycle and wrapping (ATT.SRC:159-163). Palette bytes are @-octal (RADIX trap: @300=192 not 300, @377=255 not 377, @350=232).

- **Improvement** (non-blocking): `TITLE_PALETTE` (MARCOL) is transcribed + tested but not consumed by the render, which cycles the game `colours[]` as a placeholder.
  Affects `plugins/joust/src/main.ts` (`renderTitleScreen` should decode MARCOL→RGB and use `TITLE_PALETTE[1+titleColorRow(...)]` once a reference capture defines the decode).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): the title logo's screen position, y-orientation, and exact colours are unverified placeholders — no live/visual check because `'title'` is unreachable until jt10-4 wires the attract cycle.
  Affects `plugins/joust/src/main.ts` (`TITLE_LOGO_Y`/`TITLE_COPYRIGHT_Y`/`TITLE_EXTRA_MOUNT_Y` + logo y-flip; needs a human smoke test against a reference capture, likely folded into jt10-4).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Dropped the "PRESENTED-BY" title line — it exists in no revision of Joust's ROM.**
  - Spec source: story title + provisional AC1 (session Story Details), and design spec Open Question 2 (docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md).
  - Spec text: "transcribe the JOUST logo picture + PRESENTED-BY / EXTRA-MOUNT / (C)1982 lines in FONT57"
  - Implementation: RED covers only the three real MARQUE-routine strings (MSCOPY copyright, MSW17/MSW18 extra-mount); NO "PRESENTED BY" test is written. Quarry: zero hits for "presented" across every .SRC file; the only near-match is the blank-by-default operator message OPMESS/OPWRT (EQU.SRC:129,236). Story retitled to remove PRESENTED-BY.
  - Rationale: user ruling at RED (repurpose + retitle) after the quarry refuted the premise — a faithful clone must not invent a ROM line that does not exist (jt8-6 precedent).
  - Severity: major
  - Forward impact: minor — jt10-4 (attract) inherits the corrected title scope; no other story assumed a PRESENTED-BY line.

- **JOUST logo transcribed as VECTOR line-drawing data, not a bitmap picture.**
  - Spec source: design spec Open Question 1 + Screens table row "Title" ("logo blit").
  - Spec text: "most likely an ATT.SRC picture routine … is it a nibble-packed bitmap like the glyph tables, a vector shape, or a lookup table?"
  - Implementation: the logo is the `LIST` polyline table (ATT.SRC:423-531) drawn by the `LINE` subroutine — tests assert vector geometry (letter x-offsets, CL1..CL4 colours, NOFILL/FILL flags), not a pixel bitmap. No `JOUST.PIC` exists.
  - Rationale: the ROM builds the wordmark from line segments, not a blit — a bitmap representation would be unfaithful.
  - Severity: minor
  - Forward impact: none.

- **Colour-cycle cadence pinned at 87, not the spec's provisional ~88.**
  - Spec source: provisional AC3 (session) / design spec ("`ATT.SRC:173` ≈ 88 ticks").
  - Spec text: "based on `ATT.SRC:173` ≈ 88 ticks at ~37.5ms per tick"
  - Implementation: the constant is `((((2*60+30)/16)+1)*8)+7` = 87 (ATT.SRC:173, "CHANGE COLORS EVERY 2 1/2 SECONDS"); the RED asserts 87 and explicitly ≠ 88.
  - Rationale: 88 was the SM/spec estimate; the byte-exact ROM value is 87.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)

Every logged deviation audited; all ACCEPTED (none flagged).

- **TEA-1 Dropped "PRESENTED-BY"** → ✓ ACCEPTED. Independently re-verified: `grep -i presented reference/williams-source/joust/*.SRC` returns zero; the only near-match is the blank-by-default operator message. Dropping an invented ROM line is correct fidelity; retitle is sound.
- **TEA-2 Logo is vector, not bitmap** → ✓ ACCEPTED. Confirmed the LIST table (ATT.SRC:423-531) is polyline data drawn by LINE; no `JOUST.PIC` exists. Representation matches the ROM.
- **TEA-3 Cadence 87, not 88** → ✓ ACCEPTED. `ATT.SRC:173` `((((2*60+30)/16)+1)*8)+7` = 87; the RED pins 87 with an explicit ≠88 leg (mutation-confirmed red at 88).
- **Dev-1 Colour decode + positions are placeholders** → ✓ ACCEPTED (jt10-5/jt10-6 precedent). One follow-up note (non-blocking, see Delivery Findings): `TITLE_PALETTE` is transcribed + tested but not yet consumed by the render, which uses the game `colours[]` placeholder — the MARCOL→RGB decode should wire it in.
- **Dev-2 `'title'` mode unreachable at runtime** → ✓ ACCEPTED. The render branch + cycle drive are in place; the cabinet reaches `'title'` once jt10-4 wires attract — identical to jt10-6's `'attract'`/`'highscore'` render hooks.
- **UNDOCUMENTED (out-of-scope, user-instructed): `sprint/epic-mc4.yaml` routing fix** → ✓ ACCEPTED. `repos: pennyfarthing` at mc4-5/mc4-6 was a pre-existing red on `origin/develop` (mc4-3 bookkeeping), reddening `tests/sprint-repo-routing.test.mjs`; corrected to `arcade` at the user's explicit instruction, committed separately (`chore(mc4)`). Not jt10-3 scope but a correct, isolated fix; orchestrator green after. No collision with the a-3 sibling (mc4-5/mc4-6 are backlog, not their active mc9-3).

## Sm Assessment

**Routing:** New Work Flow, phased `tdd`. Setup complete; handing off to TEA (Tyr One-Handed) for the RED phase. The phase pointer read `setup` on arrival and advances to `red` at handoff.

**Pre-setup probes (clean):**
- Sibling branch probe — `git fetch --prune` + `git branch -r | grep jt10-3`: no branch existed on origin before this claim. No sibling owns the story.
- Session sweep across checkouts — only live sibling session was a-3 on `mc9-3` (missing-command, no file overlap).
- Merge gate — `gh pr list -R slabgorb/arcade --state open`: empty. Not blocked.
- Dependency — `jt10-2` (cabinet state machine) is DONE; `jt10-1` (fonts) DONE. Prerequisites in place.

**Premise measured before setup (the reason for the quarry gate):** the epic YAML carries **null description and null acceptance_criteria** for jt10-3, so the ACs above are DERIVED (from the design spec + the story title), not copied. The design spec's "Open questions (quarry for TEA before RED)" section flags two items as unresolved, and the story TITLE bakes in "PRESENTED-BY" phrasing that the spec says disagrees with `PHRASE.SRC`. I raised this fork to the user (setup→TEA-quarries vs Architect-quarry-first); the user chose **setup→TEA quarries** — the design-sanctioned path where TEA's first RED-phase act is the quarry pass. The three quarry items are recorded as BLOCKING for RED both in this session (§Quarry) and at the top of the context file (⚠ QUARRY GATE banner). The provisional ACs are marked PENDING and phrased to become checkable once TEA pins each source line.

**TEA's mandate before writing any RED test:**
1. Locate + cite the JOUST logo picture routine in the ROM (suspected `ATT.SRC`, not among `.PIC` files).
2. Resolve which `JOUSTRV1..4.SRC` revision matches the target capture and pin the EXACT title-line phrases + source lines (do not treat the title's "PRESENTED-BY" as ground truth).
3. Confirm the colour-cycle cadence/tick count and palette sequence (`ATT.SRC:173` ≈ 2.5s is provisional).
If the quarry REFUTES the title's phrasing, surface it for a backlog-shape ruling (jt8-6 precedent) rather than silently repricing the story.

**Claim pushed (gitflow, one remote):** stamp `in_progress` + `started: 2026-08-08` on `sprint/epic-jt10.yaml`, context file `sprint/context/context-story-jt10-3.md`, committed to `feat/jt10-3-title-screen-logo-font57` (`195e5b6c`) and pushed to origin — `origin/feat/jt10-3-title-screen-logo-font57` is live, so the sibling branch probe now lights up. `.session/` stays per-checkout (uncommitted).

**Verification of sm-setup outputs:** session present with all three fields (Workflow/Repos/Phase); exactly one phase token; status confirmed `in_progress` via `pf sprint story show`; correction banner present at top of context. No corrections needed (ACs were derived, not copied, so no verbatim-drift to repair).

## TEA Assessment

**Phase written during:** red (the phase pointer read `red` on arrival). **Status:** RED — failing tests ready for Dev.

**The quarry came first (it was the gate).** Before any test, I resolved the three open questions from primary source — see Delivery Findings for the pinned citations. Two of the spec's premises were wrong and one story premise was a ghost:
- **Logo = VECTOR, not bitmap.** The JOUST wordmark is the `LIST` polyline table (ATT.SRC:423-531) drawn by `LINE` — no `.PIC`, no nibble bitmap. The five letters lay out J-O-U-S-T by stored x-offset [5,68,110,170,222].
- **"PRESENTED BY" is a ghost** — zero hits across every `.SRC`; the near-match is the blank operator message. User ruled repurpose+retitle; story retitled, deviation logged, no PRESENTED-BY test written.
- **Cadence = 87, not 88** (ATT.SRC:173). Pinned with an explicit `≠ 88` leg.

**RED (evidence, not assertion):** `npx vitest run --project joust` → `1 failed | 160 passed (161)` files, `20 failed | 3158 passed (3178)` tests — the only reds are the 20 new `title.test.ts` tests, each failing with a self-describing "not built yet" error. `npm run lint` (tsc --noEmit): clean. Census/comment-line-refs/purity gates: green (121 tests).

**Test files:**
- `tests/title.test.ts` — the RED. AC-1 core strings (verbatim, incl. the trailing/leading spaces + a `not.toContain('PRESENTED')` guard + the `EXTRA MAN` paraphrase guard); AC-2 the vector logo (5 letters, exact x-offsets, CL1..CL4 colour set, both fill modes, ≥80 points/≥15 strokes anti-stub floor); AC-3 the colour cycle (cadence `87`≠`88`, MARCOL 6×8, row-0 verbatim, the @-octal RADIX anchors @300=192/@377=255/@050=40/@100=64, and the pure `titleColorRow` cadence-cycle-wrap); AC-4 `layoutTitleScreen` (FONT57 metrics tied to CORE string lengths, one-op-per-char, colour threading two-ways, logo reused by identity `.toBe`); AC-5/6 source wiring + `.SRC` citations.
- `tests/helpers/title-contract.ts` — the value+citation contract and the `loadTitleCore`/`loadTitleScreen` loaders (the jt1-2 loadGame idiom; runtime-assembled specifier so a missing module reddens per-test, not the whole file).

**Core transitions not re-pinned.** `toTitle(cab)→'title'` is already GREEN in `cabinet.test.ts` (jt10-2); re-asserting it would be vacuous. This story's new core is pure DATA + one pure fn, so RED lives on the absent surfaces (core/title.ts, shell/titleScreen.ts, main.ts wiring).

### Rule Coverage (typescript lang-review checklist)

| Rule / constraint | Test(s) | Status |
|---|---|---|
| ROM fidelity — strings verbatim + cited (spaces/punct exact) | AC-1 `TITLE_COPYRIGHT/EXTRA_MOUNT/POINTS_SUFFIX … MESSEQU.SRC` | failing |
| Faithful transcription — no invented ROM line ("PRESENTED BY") | AC-1 `carries NO "PRESENTED BY" line …` | failing |
| Comment paraphrase ≠ constant (guard the ATT.SRC:67 "EXTRA MAN" paraphrase) | AC-1 `not.toContain('EXTRA MAN')` | failing |
| RADIX faithfulness — @ octal decoded by radix, not digits | AC-3 `@ octal anchors … @300=192, not 300` | failing |
| Corrected constant (cadence 87, not the spec's 88) | AC-3 `TITLE_COLOR_CADENCE is 87 … not.toBe(88)` | failing |
| No re-hardcoded ROM text in shell (one string, one citation) | AC-5/6 `titleScreen reuses the core strings … no re-hardcoded` | failing |
| Reuse by identity, not re-transcription (logo) | AC-4 `hands through the core JOUST_LOGO … .toBe(JOUST_LOGO)` | failing |
| Colour threaded, not hard-wired | AC-4 `threads the caller's colour … two distinct colours` | failing |
| Anti-vacuity / anti-stub geometry floor | AC-2 `≥15 strokes, ≥80 points; each point an [x,y] pair` | failing |
| Purity — new core module is pure DATA | covered by the single `tests/purity.test.ts` core scanner (auto-sweeps `core/title.ts`); no new scanner added | n/a |
| Derived test-FILE census stays honest | README 160→161 (`audio-seam-scope`) | passing |

**Self-check:** 0 vacuous tests — every assertion ties to a ROM-derived value, a font metric, an object identity, or a source form. No `let _ =`, no `assert(true)`, no always-`None`/`undefined` checks. The value gates (verbatim strings, exact offsets, radix anchors, cadence) ARE the faithful-transcription guard.

**Key guidance for Dev (Loki):** build `src/core/title.ts` (pure DATA — no clock/`window.`/`document.`, even in comments; the single `purity.test.ts` scanner sweeps it) and `src/shell/titleScreen.ts` (mirror `gameOverScreen.ts`), then wire the `'title'` branch + `titleColorRow`-driven colour cycle into `main.ts`. Transcribe the full `LIST` (ATT.SRC:423-531) and the full MARCOL palette (ATT.SRC:288-294) — the tests pin the structure + the trap-prone anchors, not every byte, so transcribe faithfully. Watch the @-octal radix (the anchors will catch a wrong base). The colour/position on screen and the stripe background are out of scope here (deferred like jt10-5/jt10-6 placeholders); a human smoke test confirms pixels.

**Handoff:** → Dev (Loki Silvertongue) for GREEN.

## Dev Assessment

**Phase written during:** green. **Status:** GREEN — all tests pass, ready for review.

**What I built (minimal, faithful):**
- `src/core/title.ts` (pure DATA + one pure fn) — the three MARQUE strings (verbatim, incl. the trailing/leading spaces), `JOUST_LOGO` (the vector wordmark), `TITLE_PALETTE` (MARCOL, radix-exact via TS `0o` octal literals), `TITLE_COLOR_CADENCE = 87`, and `titleColorRow(tick) = floor(tick/87) mod 5` (wraps, negative-safe). Cites ATT.SRC + MESSEQU.SRC; no clock/browser surface (swept clean by `purity.test.ts`).
- `src/shell/titleScreen.ts` — `layoutTitleScreen(colour)`, mirrors `gameOverScreen.ts`: FONT57 phrase lines via `layoutText`, reusing the core strings (no ROM text re-typed, not even in comments — the "no re-hardcode" scan reads comments, which reddened my first draft and I reworded to cite constants/lines instead).
- `main.ts` — the `'title'` render branch: `strokeLogo` draws the wordmark polylines, `paintText` the phrase lines, colour cycling via `titleColorRow` off a shell frame counter (shell owns the clock).

**The logo transcription — how I avoided hand-error.** The `LIST` table is 108 lines of dense polyline FCB with two traps: a mid-number line-wrap (446/447: `...,47,123,5`⏎`2,121` = `52,121`) and legal `x=0` coordinates. I wrote a parser (scratchpad) matching the `GO` interpreter exactly — **read a point, THEN peek the next x for the `0`-terminator** — so `(0,58)` at :494 is preserved and letter S isn't dropped. First pass had the naive "x==0 ⇒ terminator" bug (4 letters, a bogus `0x0` colour); the corrected pass gives 5 letters, offsets [5,68,110,170,222], colours exactly CL1..CL4, 68 strokes / 264 points. Spot-checked O's opening stroke and the wrap against the ROM.

**Verification (evidence, not assertion):**
- Full joust suite: `161 passed (161)` files, `3179 passed (3179)` tests (the 20 jt10-3 tests now green; `purity`/`comment-line-refs`/`audio-seam-scope` census all green).
- `npm run lint` (tsc --noEmit): clean (exit 0), re-run after every edit.
- `npm run test:orchestrator`: `408 pass | 0 fail` (see deviation below re: a pre-existing mc4 routing red I fixed at the user's instruction).
- `node scripts/build-app.mjs joust`: built (`dist/joust/assets/main-*.js 165.57 kB`).
- **Visual smoke test: NOT performed.** `'title'` mode is unreachable in the running app until jt10-4 wires the attract cycle into it (the cabinet boots to `'select'`). The render is source-wired and geometry is test-pinned; colour decode, screen position, and y-orientation are placeholders deferred to a human smoke test — the same deferral jt10-5/jt10-6 logged. I did not claim a visual check I could not make.

**Out-of-scope fix (user-instructed):** while verifying, the orchestrator's `sprint-repo-routing` gate was red on `sprint/epic-mc4.yaml:76,89` — mc4-5/mc4-6 carried a stale `repos: pennyfarthing` (from the mc4-3 bookkeeping commits, pre-existing on origin/develop; NOT caused by jt10-3). The user directed me to fix it; committed separately (`chore(mc4): route mc4-5/mc4-6 to arcade`). Orchestrator green after. Flagging for the Reviewer: this touches another epic and may appear in the diff — it is a deliberate, user-approved routing correction, not jt10-3 scope.

**Handoff:** → Reviewer (Heimdall).

### Dev (implementation)

- **Colour decode + screen positions are placeholders.**
  - Spec source: context-story-jt10-3.md, AC-4/AC-5; design spec §Screens (Title).
  - Spec text: "Uses transcribed palette colours … Paint the overlay with the current cycle colour."
  - Implementation: `titleColorRow` selects the MARCOL row, but the row is mapped to an existing `colours[]` palette entry (`colours[1+row]`) rather than a faithful MARCOL→RGB hardware decode; logo/line Y positions are constants (`TITLE_LOGO_Y=40`, etc.).
  - Rationale: the exact MARCOL→RGB decode and layout need a reference capture + human smoke test; a legible, visibly-cycling placeholder ships the slice (jt10-5/jt10-6 precedent).
  - Severity: minor
  - Forward impact: minor — jt10-4 (attract) reaches this mode and a follow-up can tune colour/position against a capture.

- **`'title'` mode is not yet reachable at runtime.**
  - Spec source: context-story-jt10-3.md, AC-5 (main.ts wiring).
  - Spec text: "a `'title'` mode branch that renders the title overlay and drives the colour cycle"
  - Implementation: the render branch + colour-cycle drive are in place, but the cabinet boots to `'select'` and nothing transitions to `'title'` yet — that is jt10-4's attract cycle.
  - Rationale: same coherent-slice pattern as jt10-6's `'attract'`/`'highscore'` render hooks that await their stories.
  - Severity: minor
  - Forward impact: minor — jt10-4 activates the mode; the hook is ready.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (3179 joust + 408 orch pass, lint+build clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edge cases assessed by Reviewer (titleColorRow negative/degenerate input) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error paths in pure data + layout; assessed by Reviewer |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality assessed by Reviewer via MUTATION BATTERY (5/5 caught) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — ROM citations re-verified against source by Reviewer |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — types assessed by Reviewer (one LOW: `unknown` in contract helper) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no security surface (client-only, no input/eval/DOM injection) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — one LOW noted (TITLE_PALETTE not yet consumed by render) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — lang-review checklist walked by Reviewer (see Rule Compliance) |

**All received:** Yes (1 enabled returned clean; 8 disabled via `workflow.reviewer_subagents`, each assessed by the Reviewer directly)
**Total findings:** 0 confirmed blocking; 3 LOW observations (non-blocking); 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

This is a ROM-transcription story, so the review centred on two things a passing suite cannot by itself establish: whether the shipped data is FAITHFUL to the ROM, and whether the tests would CATCH an unfaithful transcription. Both hold.

**Independent ROM re-verification (not just contract-vs-module).** I re-derived and spot-checked the shipped `title.ts` directly against the raw vendored source, bypassing Dev's parser:
- Strings: `TITLE_COPYRIGHT`/`TITLE_EXTRA_MOUNT`/`TITLE_POINTS_SUFFIX` are byte-identical to `MESSEQU.SRC:129/158/157` (spaces intact: "(C) 1982", trailing space on MSW17, leading comma on MSW18).
- Palette: transcribed as TS `0o` octal literals mirroring the ROM's `@` octal 1:1 (`@300`→`0o300`===192, `@377`→`0o377`===255, `@350`→`0xe8`===232) — radix-faithful by construction, immune to the @300≠300 trap.
- Logo: sampled the parser's tricky paths against raw ATT.SRC — O's opening stroke (:425-426), the 446/447 mid-number line-wrap (`52,121` reassembled), U's legitimate `x=0` coordinate `(0,58)` (:494), S's first stroke (:497), T's terminating stroke (:529). All match. Structure: 5 letters, offsets [5,68,110,170,222], colours exactly CL1..CL4, both fill modes, 68 strokes / 264 points.

**Mutation battery (the real net — 8 specialists are disabled here).** Mutated five shipped values and confirmed each reddens exactly one guard: copyright `1982→1983`, `xOffset 170→171`, `cadence 87→88`, palette `0o300→0o277`, and `CYCLE_ROWS length-1→length-2`. 5/5 caught; restored (md5 verified). The value gates are non-vacuous.

**Data flow traced:** `titleColorRow(shell frame counter)` → cycling row 0..4 → `colours[1+row]` → `strokeLogo`/`paintText` on the backbuffer. Pure core selects the row (no clock); the shell owns the frame counter (purity preserved — `title.ts` passes the single `purity.test.ts` core scanner).

**Pattern observed:** `layoutTitleScreen` (shell/titleScreen.ts) faithfully mirrors `gameOverScreen.ts`/`selectScreen.ts` — returns layout DATA, reuses core strings, threads colour. Correct application of the established seam.

### Rule Compliance (typescript lang-review checklist)

- **#1 type-safety escapes** — no `as any`/`as unknown as T`/`@ts-ignore` in shipped src. `title-contract.ts` (test helper) uses `unknown` fields + `as LaidOutText` casts to avoid a shell import; test-only, non-blocking (LOW, below).
- **#4 null/undefined** — no `||`-vs-`??` hazard; `titleColorRow` is pure arithmetic; `colours[1+row]` index ∈ [1,5], in-bounds.
- **#5 module** — every relative import carries `.js`; `export type`/`import type` used for type-only (TitleScreenLayout, Rgba, JoustLogo). Compliant.
- **#14 derived edges** — N/A: `titleColorRow` is a pure function of `tick`, not a state-machine transition; no edge computed inside a branch.
- **#15 source-text token assertions** — the wiring greps (`'title'`, `titleColorRow`, `FONT57` in source) are token-level, weaker than declaration-anchored; MITIGATED — they were non-vacuous in RED (all failed pre-implementation) and the `not.toContain` negatives have teeth (caught a real re-hardcode in Dev's first draft). LOW.
- **#18/#26 fixture-value-is-expectation** — the contract constants equal the shipped constants, but this is a data-equality pin, not a hidden transformation; I closed the residual (both could be mis-transcribed identically) by INDEPENDENTLY re-verifying the shipped values against the ROM (above).
- **#21 degenerate numeric input** — `titleColorRow(NaN)` returns NaN, but `tick` is an integer frame counter (never NaN/negative in the caller); negative-safe modulo included. LOW/non-issue.
- **#3 enums, #6 React, #7 async, #10/#11 security/error, #12 perf** — N/A (no enums, no JSX, no async, no I/O, no user input; client-only static data).

### Observations (≥5)

1. **[VERIFIED] ROM fidelity of all shipped data** — strings=MESSEQU.SRC:129/158/157, palette=MARCOL octal 1:1, logo=LIST sampled at 5 tricky sites. Evidence: independent re-derivation above.
2. **[VERIFIED] Test teeth** — mutation battery 5/5 (plugins/joust/tests/title.test.ts). A wrong string/offset/cadence/radix-byte/cycle-count all redden.
3. **[VERIFIED] Purity** — `src/core/title.ts` is pure DATA + one pure fn; swept clean by `tests/purity.test.ts` (no clock/browser surface, even in comments). No second core scanner added.
4. **[LOW][SIMPLE] `TITLE_PALETTE` transcribed + tested but not yet consumed by the render** — main.ts cycles `colours[1+row]` (placeholder), not the MARCOL bytes. Faithful data awaiting its MARCOL→RGB decode; documented as Dev-1. Filed below.
5. **[LOW][TYPE] `title-contract.ts` uses `unknown` for the LaidOutText fields** (deliberate, to keep a shell import out of the test helper) with `as LaidOutText` at call sites — test-only, no shipped-code impact.
6. **[LOW] Logo y-orientation / screen position are unverified placeholders** — no reference capture; deferred to a human smoke test with `'title'` unreachable until jt10-4. Documented as Dev-1/Dev-2. Filed below.

### Devil's Advocate

Argue this is broken. First attack: the transcription is a lie that confirms itself — the tests compare `title.ts` to `title-contract.ts`, and BOTH were typed by the same author from the same source, so a shared mis-read (an off-by-one octal, a dropped coordinate, a transposed letter) passes green forever (#18). This is the sharpest risk in any transcription story and I treated it as the main event: I did not trust the contract-vs-module equality; I re-opened the raw ROM and matched the SHIPPED bytes against it at the radix-trap palette cells and the parser's most error-prone logo paths (the line-wrap, the `x=0` coordinate that a naive parser drops — and Dev's first parser DID drop it, caught by the offsets test). Second attack: the tests pin anchors, not every one of 264 points, so a corrupted mid-letter coordinate ships silently. True — but the data was machine-decoded from ATT.SRC by a parser matching the GO interpreter, not hand-typed, so a per-coordinate typo is not the failure mode; the failure mode is a parser bug, which would corrupt STRUCTURE (letter count, offsets, colour set, stroke/point totals) — all pinned, and all green, and the first parser bug manifested exactly there (4 letters, bogus 0x0 colour). Third attack: the render is untested and could draw garbage — the logo could be upside-down, off-screen, or the colour cycle frozen. Partly conceded: there is no live visual check because `'title'` is unreachable until jt10-4, and colour/position/orientation are explicit placeholders. But this is scoped and documented (jt10-5/jt10-6 set the precedent of shipping the data + a placeholder render tuned later by a human smoke test), it cannot regress a reachable screen, and the geometry feeding the render is ROM-faithful. Fourth attack: a confused maintainer wires `TITLE_PALETTE` expecting it to be live and finds the render ignores it — real, so I filed it as a Delivery Finding rather than leaving it implicit. None of these rise to Critical/High: no data corruption, no security surface (client-only, no input), no error path to swallow, no reachable-screen regression.

**Error handling:** no failure paths introduced — pure data + deterministic arithmetic + canvas draw calls. `titleColorRow` is total over the integer frame counter.

**Handoff:** To SM for finish-story.
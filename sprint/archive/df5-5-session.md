---
story_id: "df5-5"
jira_key: "df5-5"
epic: "df5"
workflow: "tdd"
---
# Story df5-5: Smart-bomb + hyperspace (powers via df4-2 effect-policy)

## Story Details
- **ID:** df5-5
- **Jira Key:** df5-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df5-5-smart-bomb-hyperspace
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T23:23:22Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T22:22:05Z | 2026-08-18T22:24:27Z | 2m 22s |
| red | 2026-08-18T22:24:27Z | 2026-08-18T22:39:36Z | 15m 9s |
| green | 2026-08-18T22:39:36Z | 2026-08-18T22:48:51Z | 9m 15s |
| review | 2026-08-18T22:48:51Z | 2026-08-18T23:04:48Z | 15m 57s |
| green | 2026-08-18T23:04:48Z | 2026-08-18T23:13:44Z | 8m 56s |
| review | 2026-08-18T23:13:44Z | 2026-08-18T23:23:22Z | 9m 38s |
| finish | 2026-08-18T23:23:22Z | - | - |

## SM Setup Assessment (Baldur the Bright)

The phase pointer read `setup` on arrival. Story premise verified **current**, not stale —
this is a clean setup with no either/or AC, no parked banner, no sibling contention on this
surface.

**Preconditions confirmed against the tree:**
- Dependencies **df4-1 (collision)** and **df4-2 (effects/policy)** are DONE and archived
  (`sprint/archive/epic-df4.yaml`, `sprint/archive/sprint-2635-completed.yaml`).
- The df4-2 accessibility policy is live in `plugins/defender/src/core/effects.ts`:
  `classify(event: EffectEvent)` → `{class, presentation}`, and the render-side guard
  `assertNoFullFrameStrobe`. `EffectEvent` is currently
  `'enemy-explode' | 'player-death' | 'terrain-blow'`. Guard/classifier tests are in
  `plugins/defender/tests/effects.test.ts` (AC2/AC3). effects.ts comments already name df5
  smart-bomb/hyperspace as this policy's consumer — the premise is corroborated by the
  dependency's own source.
- `plugins/defender/src/core/powers.ts` does **not** exist yet — this story creates it.
- Merge gate clean (no open PRs). No `df5-5` branch existed before this claim. The one live
  sibling session (a-3) is on **df5-4** (humanoid rescue) — a different file surface.

**Scope guardrails for TEA/Dev (from the ruling, not re-decided here):**
- Port ROM trigger + timing, CITED under the df1-1 citation gate (no `src/core` constant
  without a `claims/*.json` entry citing `defender/<FILE>.SRC:<line>`). Citations:
  `*SMART BOMB SBOMB DEFA7.SRC:3173,3175`; `*HYPERSPACE HYPER :3211,3213`;
  `*RANDOM HYPER DIRECTION :3228`.
- Substitute ONLY the strobe PRESENTATION: the ROM's `SBMBX0 COM PCRAM` whole-page invert
  (`:3199`) and HYPER strobe route through the df4-2 effect-policy (freeze/fade/particle),
  logged as a Design Deviation citing **ADR-0005**. df5 CITES ADR-0005, it does not
  re-decide it.
- **The df4-2 `assertNoFullFrameStrobe` guard MUST stay GREEN with both powers live.**
- Smart-bomb clears on-screen enemies via **df4-1 collision**; powers are **df3 scheduler**-
  driven player actions (reuse `scheduler.ts`).

**Claim pushed:** `feat/df5-5-smart-bomb-hyperspace` (commit carries context + `in_progress`
stamp), story stamped `in_progress`.

## TEA Assessment (Tyr One-Handed) — RED

**Suite:** `plugins/defender/tests/df5-5-powers.test.ts` (23 tests). RED verified:
**22 failing / 1 guard-on-arrival pass**, `npm run lint` (tsc --noEmit) green. No source
touched, so no pre-existing test reddened. Failures are for the right reasons — the absent
`powers.ts` (self-describing "not built yet" loader), effects.ts's `assertNever` throwing on
the two new events, and the missing powers claim.

### The contract GREEN (Dev) must build in `plugins/defender/src/core/powers.ts`
A PURE, clock-free module (purity.test.ts auto-sweeps it — inject the rng, never `Math.random`).

- **Smart-bomb** (SBOMB, `DEFA7.SRC:3175`):
  - `SMART_BOMB_CLEAR_TYPE_MAX = 0x02` (CMPA #$02 :3190), `SMART_BOMB_FLASHES = 4`
    (LDA #4 SCREEN FLASHES/2 :3197), `SMART_BOMB_PTYPE` (a free scheduler ptype — 0/1/2/3/5 taken).
  - `clearsType(otyp) → otyp < 0x02` (BHS SBMB2 :3191 — the df4-1 clear gate).
  - `smartBomb({armed,count})` reducer: bail if `armed` (SBFLG set, :3175-3176) or `count===0`
    (PSBC zero, :3178-3179); else fire → `{fired:true, armed:true, count:count-1}` (INC SBFLG
    :3180 / DEC PSBC :3181).
  - `spawnSmartBomb(sched)` → one scheduler process that suicides (JMP SUCIDE :3209).
- **Hyperspace** (HYPER, `DEFA7.SRC:3213`):
  - `HYPER_NOGO_MASK = 0xFD` (:3214), `HYPER_STATUS = 0x77` (:3216), `HYPER_NAP = 15` (:3219),
    `HYPER_X_RIGHT = 0x2000` (:3231), `HYPER_X_LEFT = 0x7000` (:3235), `HYPER_DIR_MAG = 0x0300`
    (:3232,3234), `HYPER_PTYPE` (distinct from SMART_BOMB_PTYPE).
  - `canHyperspace(status) → (status & 0xFD) === 0` (:3213-3215).
  - `hyperspace(rand)` draws **two** bytes: byte0 low bit → direction (bit1 ⇒ X=$2000/right,
    bit0 ⇒ X=$7000/left, LSRB/BCC :3229-3235); byte1 → `y = (byte1 >> 1) + YMIN` (:3238-3240);
    `vx = 0` (CLRD/STA PLAXV :3242+). Returns `{x16, facing, y, vx}`.
  - `spawnHyperspace(sched, rand)` → one scheduler process that suicides.
- **Presentation (AC2):** extend effects.ts `EffectEvent` with `'smart-bomb' | 'hyperspace'`
  and add both to `classify()` → `{class:'full-frame-strobe', presentation: freeze|fade|particle}`
  (never `'raster'`). This is the ONE intended edit to a df4-2 file — effects.ts:99 already names
  df5 as this policy's consumer, and the `assertNever` guard forces you to handle them. The df4-2
  suite stays GREEN (its "classes are DISTINCT" test compares only the three original events).
- **AC4 citation (AC4b):** add `docs/rom-study/claims/18-powers.json` enrolling every constant
  above, each `verbatim` byte-matching the vendored line; `brief-dossier.test.ts` byte-verifies it
  automatically (globs the whole claims dir — no enrolment step). Use a fresh id prefix (e.g. `PWR-`).

### Design decisions I made (Dev may push back in review, but these are the RED's shape)
- The teleport draws direction **then** Y (SEED then HSEED order, :3225/:3238). Injected `rand`
  is the house seam (`() => number`, a byte) — same as stars.ts/ties.ts; the shell seeds it.
- AC2 is pinned at the pure policy layer (`classify` result) plus a guard-teeth test proving the
  ROM COM-PCRAM inversion is what `assertNoFullFrameStrobe` catches — powers.ts is pure and renders
  nothing, so the "no strobe" proof lives on the policy + guard, not a framebuffer write.
- The ADR-0005 **Design Deviation** (substituting the SBMBX0 COM PCRAM strobe :3199 and the
  hyperspace screen-clear) must be logged as a 6-field entry citing
  `docs/adr/0005-photosensitivity-accessibility-exception.md` — that is Dev's session artifact
  (not a code test; the review/gate covers it), same as the df4-2 precedent.

### Rule Coverage (lang-review / project rules)
- **Purity (no clock/entropy/shell reach):** enforced by `purity.test.ts`, which auto-sweeps every
  new `src/core/*.ts` — powers.ts is covered on landing (AC3 "not Math.random").
- **Citation gate (no un-cited src/core value):** AC4 test requires a claim in DEFA7.SRC:3173-3242;
  `citations.test.ts` + `brief-dossier.test.ts` byte-verify it.
- **Exhaustive union handling (lang-review #3/#34):** the AC2 tests exercise `classify` on the two
  new events — the `assertNever` guard makes an unhandled case a compile error.
- **Meaningful assertions:** every test asserts a concrete value/throw; the one green test asserts
  BOTH a throw (planted inversion) and a non-throw (freeze) — not vacuous.

## Dev Assessment (Loki Silvertongue) — GREEN

Implemented Tyr's contract as written. **Full defender suite 713/713 GREEN** (was 22 RED on
df5-5); `npm run lint` (tsc --noEmit) clean. Pushed to `feat/df5-5-smart-bomb-hyperspace`
(`99cc4a8a`).

**Built:**
- `plugins/defender/src/core/powers.ts` (new, PURE) — every export from the TEA contract, at
  the ROM values: `smartBomb` reducer + `clearsType` + `spawnSmartBomb`; `canHyperspace` +
  `hyperspace(rand)` + `spawnHyperspace`; all constants cited inline to DEFA7.SRC.
- `plugins/defender/src/core/effects.ts` — the ONE intended df4-2 edit: `EffectEvent` gains
  `'smart-bomb' | 'hyperspace'`; `classify` maps them to `full-frame-strobe` → `fade` (smart
  bomb) / `freeze` (hyperspace). The `assertNever` guard made this a compile-forced, total
  change; the df4-2 `effects.test.ts` stayed GREEN untouched.
- `plugins/defender/docs/rom-study/claims/18-powers.json` (new) — 19 `PWR-*` claims, each
  `verbatim` byte-verified against the vendored source by `brief-dossier.test.ts`.

**Decisions / notes for the Reviewer:**
- Presentations chosen: smart-bomb → `fade`, hyperspace → `freeze` (both valid ADR-0005 safe
  variants; the tests accept any of freeze/fade/particle). Distinct, and each fits the effect
  (a screen-clearing flash fades; a teleport holds the frame).
- **`spawnSmartBomb`/`spawnHyperspace` scope:** these create the df3 scheduler process (the
  AC4 "no per-power rAF" shape, `JMP SUCIDE`), following score.ts's `spawnPopup` precedent.
  The APPLICATION of the power to live sim state — clearing the object list via `clearsType` +
  the df4-1 collision seam, writing the teleport onto the ship — is sim-level wiring (the
  df5-8/df5-10 sim-wiring pattern), not this pure module's reach. `spawnSmartBomb`'s
  continuation is therefore a bare one-shot marker; `spawnHyperspace`'s reads the seeded rng
  on dispatch (`void hyperspace(rand)`), the ROM's read-at-run-time shape.
- PTYPEs: `SMART_BOMB_PTYPE = 6`, `HYPER_PTYPE = 7` — opaque tags, distinct from each other
  and from the taken laser/enemy/score/wave ptypes (0/1/2/3/5).
- ADR-0005 substitution logged as a 6-field Design Deviation (below, `### Dev`).

## Reviewer Assessment

**Verdict:** REJECTED — 3 blocking findings (an unported ROM death-roll AC3 miss, a confabulated velocity citation, an incomplete velocity port), all verified against `reference/original-source/defender/DEFA7.SRC`.

**Handoff:** Back to TEA for failing tests on the new behavior (the hyperspace death roll + Y-velocity zeroing are testable new behavior — TDD), then Dev.

**Data flow traced:** the injected `rand: () => number` → `hyperspace(rand)` → `{x16, facing, y, vx}` (deterministic, seeded, purity-safe) — but the trace revealed the ROM continues past the module's self-drawn window (:3242) to a re-entry death roll (:3275-3277) that never enters the data flow at all (B1).

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Hyperspace re-entry death roll (`LSEED > 192 → PLEND`, ~25%) unmodeled/uncited — AC3 "re-entry risk" not met | `powers.ts` / `18-powers.json` / `df5-5-powers.test.ts` (ROM :3275-3277) | Port a pure death predicate, cite :3275-3277 + PLEND, test it, fix "re-entry risk" prose |
| [HIGH] | Confabulated velocity citation `CLRD / STA PLAXV` @ `:3242+` — :3242 is `STD NPLAXC`, no bare `STA PLAXV` exists | `powers.ts:40,144,149`; test:40,72,234 | Cite `:3243-3245` with real mnemonics `CLRD / STA PLAXV+2 / STD PLAXV` |
| [HIGH] | Incomplete velocity port — ROM zeros Y velocity too (`STD PLAYV` :3246); `Teleport` has only `vx` | `powers.ts` | Add `vy: 0` (cite :3246) or explicitly scope out |
| [MED] | False PTYPE "distinct" comment — 6=POD, 7=SWARMER; ptype not globally unique | `powers.ts:55-56,75`; test:340 | Pick free values (8/9) and/or reword truthfully; retitle the overclaiming test |
| [MED] | Truncated STATUS citation `:3216` — `STA STATUS` is at `:3217` | `powers.ts:33`; test:34 | Cite `:3216-3217` |
| [MED] | Vacuous SUICIDE assertion `<= before(1)` — passes whether it suicides or is stuck alive | `df5-5-powers.test.ts:345` | `expect(sched.processes.length).toBe(0)` |
| [LOW] | classify() tests assert membership, not the exact `fade`/`freeze` | `df5-5-powers.test.ts:290,297` | `.toBe('fade')` / `.toBe('freeze')` |
| [LOW] | `HYPER_DIR_MAG` exported + cited but never read by `hyperspace()` | `powers.ts` | Wire it or mark citation-only |

Nothing passes my gate on trust. The pure decision logic is **correct** and the mechanical
state is green (713 defender + 503 orchestrator + 266 audit, lint clean; 30/30 TS rules +
6/6 defender rules pass). But the comment-analyzer — enabled on this project, and the one
check that matters most for a ROM port — found a real **AC3 fidelity gap** and a
**confabulated citation**, both verified against `reference/original-source/defender/DEFA7.SRC`.
The story reopens.

Working-tree audit: initially DIRTY on `sprint/epic-df5.yaml` — a legitimate `in_review`
status stamp (NOT a source mutation; source verified clean); committed it, audit now clean.

### Rule Compliance
Exhaustive, per the project rules (CLAUDE.md; no `.claude/rules`/SOUL.md exist) + the TS lang-review checklist. Cross-checked by reviewer-rule-checker (30/30 TS, 6/6 defender) and by me:
- **Purity (src/core boundary):** `powers.ts` imports only `type {Scheduler,Process}` (`./scheduler.js`), `YMIN` + `type {Facing}` (`./world.js`) — all core siblings; no clock/entropy/browser/`../shell/`; `rand` injected. **COMPLIANT.**
- **Citation gate (every src/core constant cited, byte-verified):** all 10 exported constants map to a `18-powers.json` claim except the two opaque scheduler ptypes (legitimately uncited). All 19 verbatims byte-match. **COMPLIANT** for what is present — but **INCOMPLETE**: the ROM continues to a cited-worthy death roll (:3275-3277) that is neither modeled nor claimed (B1), and the velocity citation is wrong (B2). So the gate is green only because the omitted behavior was never enrolled.
- **Colour by index only:** no hex colour literal in `powers.ts`/`effects.ts`. **COMPLIANT.**
- **Exhaustive unions:** `classify()` keeps `default: assertNever(event)` after +2 cases; `powers.ts` has no switch. **COMPLIANT.**
- **Immutability:** `SmartBombState`/`SmartBombResult`/`Teleport` all `readonly`; `smartBomb`/`hyperspace` return fresh objects. **COMPLIANT.**
- **Scheduler not rAF:** both spawns use `sched.makeProcess`; no rAF/setTimeout. **COMPLIANT** (though the continuations are hollow — deferred sim wiring, recorded).
- **ROM-always-wins (except ADR-0005):** the strobe substitution is the sanctioned exception, logged. But B1 is a ROM-always-wins **violation of omission** — a coded ROM mechanic dropped without a deviation. **NOT COMPLIANT** until B1 is ported or explicitly deviation-logged.

### Devil's Advocate
Argue this is broken. A player triggers hyperspace to escape a swarm. In the real machine, one in four such escapes materialises them **dead** (`LSEED > 192 → PLEND`) — the mechanic that makes hyperspace a genuine gamble rather than a free teleport. This port removes that gamble entirely: `hyperspace()` always returns a live ship. A speedrunner or a fidelity-checking player would immediately notice Defender's hyperspace "feels wrong — it never kills me," and they would be right; the ROM's own `YAHMAHN` death branch is simply gone. Worse, the code's prose actively conceals the gap: "the re-entry risk" appears five times describing only "you land blind and stationary," so a future maintainer greps for the death roll, sees confident "re-entry risk" language, and assumes it is handled. Next: a maintainer trusts the `CLRD / STA PLAXV` citation, opens `:3242` to extend the velocity handling, and finds `STD NPLAXC` — an unrelated instruction. The citation that was supposed to be ground truth is a fabrication; every downstream edit built on it inherits the error. The `Teleport` type says the ship re-enters "still," but only in X — a confused reader wiring this to the sim leaves the Y velocity carrying whatever it held pre-jump, producing a ship that drifts vertically out of hyperspace, contradicting the ROM's `STD PLAYV`. A stressed integrator calling `spawnSmartBomb` expects enemies to clear; the process fires and does **nothing**, silently — no error, no clear. And a debug-HUD author who filters `sched.processes` by `ptype` to count "smart bombs" will silently also count pods (both 6), misled by a comment that swears the tags are distinct. None of these are hypothetical — each traces to a specific line verified against source. The pure arithmetic is sound; the fidelity envelope around it leaks.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (713 defender / 503 orch / 266 audit green, lint clean, zero smells) | N/A |
| 2 | reviewer-edge-hunter | N/A — disabled | disabled | N/A | disabled via settings |
| 3 | reviewer-silent-failure-hunter | N/A — disabled | disabled | N/A | disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 (weak SUICIDE assert, hollow spawns, PTYPE overclaim, loose classify asserts, unused HYPER_DIR_MAG, gate-not-wired) | Confirmed S3/N1/N2 + deferred-wiring finding; PTYPE folded into S1 |
| 5 | reviewer-comment-analyzer | Yes | findings | 5 (confabulated velocity cite, unported death roll, incomplete velocity port, truncated STATUS cite, false PTYPE comment) | All 5 confirmed against source → B1/B2/B3/S1/S2 |
| 6 | reviewer-type-design | N/A — disabled | disabled | N/A | disabled via settings (type rules covered by rule-checker 30/30 + my read) |
| 7 | reviewer-security | N/A — disabled | disabled | N/A | disabled; domain assessed first-hand — pure game core, no external input/auth/secrets surface |
| 8 | reviewer-simplifier | N/A — disabled | disabled | N/A | disabled; assessed first-hand — HYPER_DIR_MAG (N2) is the one dead-ish export |
| 9 | reviewer-rule-checker | Yes | clean | 30/30 TS + 6/6 defender rules PASS; 1 awareness note (PTYPE collision, inert) | Note folded into S1 |

**All received:** Yes (4 enabled returned; 5 disabled via settings)

### BLOCKING
- **B1 — the hyperspace re-entry DEATH ROLL is unported (AC3 miss).** `DEFA7.SRC:3275-3277`
  `LDA LSEED / CMPA #192 / LBHI PLEND` is a ~25% (LSEED > 192 → 63/256) chance of INSTANT
  player death on re-entry (`PLEND` = `*PLAYER END`, :1326-1328). AC3 requires "the re-entry
  risk modelled and cited"; the ROM's *actual coded* re-entry risk is this roll, but the
  implementation models only "land blind & stationary." The phrase "the re-entry risk"
  recurs (powers.ts:41,149; test:7,40,234) describing only the blind landing — inviting the
  false belief the roll is covered. **Fix:** port a pure predicate (e.g.
  `hyperspaceKilled(rand) → rand() > 192`, or fold a `killed` flag into the teleport result),
  cite :3275-3277 + PLEND in `18-powers.json`, test it, and correct the prose. *Verified against source.*
- **B2 — confabulated velocity citation.** powers.ts header (:40-41) + `hyperspace` JSDoc
  (:144,149) + test (:40,72,234) cite `CLRD / STA PLAXV` at `:3242+`. But `:3242` is
  `STD NPLAXC`, and there is **no bare `STA PLAXV`** in the ROM. The real sequence is
  `:3243 CLRD / :3244 STA PLAXV+2 / :3245 STD PLAXV`. A wrong citation manufactures false
  corroboration. **Fix:** cite `:3243-3245` with the real mnemonics. *Verified against source.*
- **B3 — incomplete velocity port.** The ROM zeros BOTH X (`STD PLAXV` :3245) AND Y
  (`STD PLAYV` :3246) velocity; `Teleport` exposes only `vx`, silently dropping `vy`.
  **Fix:** add `vy: 0` (cite :3246) or explicitly scope the Y-velocity out with a note. *Verified.*

### SHOULD-FIX (bundle into the rework — the file is already open)
- **S1 — false PTYPE "distinct" comment.** powers.ts:55-56,75 claims the ptypes are "distinct
  from the laser/enemy/score ptypes," but `SMART_BOMB_PTYPE=6` collides with `POD_PTYPE=6`
  (probes.ts:31) and `HYPER_PTYPE=7` with `SWARMER_PTYPE=7` (swarmers.ts:41). (Ptype is opaque
  and NOT globally unique — `UFO_PTYPE=BOMBER_PTYPE=5`, `WAVE_DIRECTOR=POPUP=0` already collide;
  no production code reads `.ptype`, so it's inert — but the *comment* is false.) **Fix:** pick
  currently-free values (8/9) and/or reword to the truth; retitle the test at :340 which
  overclaims "DISTINCT scheduler PTYPEs" while only checking 6≠7.
- **S2 — truncated STATUS citation.** powers.ts:33 (+ test:34) cites `:3216` for `LDA #$77 / STA
  STATUS`; `STA STATUS` is at `:3217`. Cite `:3216-3217` (matches this file's own ranged-cite
  convention for 2-line snippets).
- **S3 — vacuous SUICIDE assertion.** test:345 `expect(...).toBeLessThanOrEqual(before)` (=1)
  passes whether the process suicides (→0, the claimed behavior) or is stuck alive forever (→1).
  The code DOES suicide (empirically 1→0). **Fix:** `expect(sched.processes.length).toBe(0)`.

### NICE-TO-HAVE (non-blocking)
- **N1** — classify() tests (test:290,297) assert presentation ∈ {freeze,fade,particle} rather
  than the exact `fade`/`freeze` effects.ts commits to; tighten to `.toBe('fade')` / `.toBe('freeze')`.
- **N2** — `HYPER_DIR_MAG` is exported + cited but never read by `hyperspace()` (the `facing`
  enum + ship.PLADIR_MAG cover the direction). Either wire it or document it as citation-only.

### On the hollow spawns (test-analyzer finding) — accepted as scoped, not blocking
`spawnSmartBomb`/`spawnHyperspace` create the AC4 scheduler process but their continuations do
no sim work (the enemy clear + teleport application need the sim's object list / ship state).
This is the deliberate df5-8/df5-10 sim-wiring boundary — the pure decisions are complete and
tested. **Non-blocking, but must be recorded as a Delivery Finding** so the deferred wiring is
explicit (see below). Tightening S3 forces the continuation to at least run-and-terminate.

### What is solid (verified, not rubber-stamped)
- `smartBomb`/`clearsType`/`canHyperspace` and the hyperspace direction/Y/bounds logic are
  faithful ports (independently re-derived against source; the 256-value AC3 sweep is real).
- `OTYP < $02` clear gate is a faithful port (OTYP is the ROM's "hyperable/touchable" marker:
  `CLR OTYP = OK TO HYPER`, `INC OTYP = DONT HYPER ME`).
- All 19 `18-powers.json` verbatims byte-match; `classify` stays exhaustive (`assertNever`);
  purity/immutability/index-only-colour all hold; the df4-2 guard stays GREEN.

## Dev Rework — round 1 (Loki Silvertongue)

All six of Heimdall's findings resolved; pushed `dac3460b`. **Full defender suite 718/718
GREEN** (was 713 — +5 from the new death-roll/vy tests), `npm run lint` clean.

- **B1 (death roll) — PORTED, not deviation-logged.** Added `hyperspaceKilled(rand) =
  rand() > HYPER_DEATH_THRESHOLD` (192), the ROM's `LSEED > 192 → PLEND` re-entry death
  (DEFA7.SRC:3275-3277; PLEND = `*PLAYER END` :1326). Cited (PWR-25/26/27) and tested: the
  threshold, the strict-`>` boundary (192 survives, 193 dies — `LBHI` is unsigned strictly-
  higher), the 63/256 (~25%) fatal count across the full LSEED domain, and rng-determinism.
  It is a **separate** predicate from `hyperspace()` because the ROM reads LSEED at a later
  dispatch (after the appear animation), not at teleport time. AC3's "re-entry risk modelled
  and cited" is now genuinely met.
- **B2 (confabulated citation) — FIXED.** `:3242` is `STD NPLAXC`; the real velocity zeroing
  is `:3243 CLRD / :3244 STA PLAXV+2 / :3245 STD PLAXV`. Corrected in the header, the
  `hyperspace` JSDoc, the test header, and the velocity test; cited PWR-21/22/23.
- **B3 (incomplete velocity port) — FIXED.** The ROM also zeros Y velocity (`STD PLAYV`
  :3246). `Teleport` gains `vy: 0`; cited PWR-24; the velocity test now asserts both `vx`
  and `vy`.
- **S1 (false PTYPE comment) — FIXED.** `SMART_BOMB_PTYPE` 6→8, `HYPER_PTYPE` 7→9 (free of
  the current fleet); the comment now states the truth (ptype is opaque and not globally
  unique — ufo/bomber=5, wave/popup=0 already collide). Test retitled to its real scope
  ("DIFFERENT ptypes from each other").
- **S2 (truncated STATUS cite) — FIXED.** `:3216` → `:3216-3217` (`STA STATUS` at :3217);
  cited PWR-20.
- **S3 (vacuous SUICIDE assertion) — FIXED.** Now `expect(sched.processes.length).toBe(0)`
  after the tick — proves the one-shot process actually terminates (verified: a non-sleeping
  continuation removes the record; empirically 1→0).
- **N1** classify tests pin exact `fade`/`freeze`. **N2** `HYPER_DIR_MAG` documented as
  citation-of-record (the `facing` field + ship.PLADIR_MAG carry the direction; `hyperspace`
  never reads it).

The Reviewer's FLAGGED "undocumented deviation" (B1) is resolved by **porting** the mechanic,
so no ADR deviation is needed — the ADR-0005 strobe substitution remains the only deviation.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review — round 1)
- **Gap** (blocking): the hyperspace re-entry DEATH ROLL (DEFA7.SRC:3275-3277, `LSEED > 192 → PLEND`, ~25% instant death) is unported/untested/uncited — AC3's "re-entry risk modelled and cited" is not met. Affects `plugins/defender/src/core/powers.ts`, `docs/rom-study/claims/18-powers.json`, `plugins/defender/tests/df5-5-powers.test.ts`. *Found by Reviewer (comment-analyzer) during code review.*
- **Conflict** (blocking): a confabulated velocity citation — `CLRD / STA PLAXV` at `:3242+` names a non-existent mnemonic at the wrong line (`:3242` is `STD NPLAXC`); real is `:3243 CLRD / :3244 STA PLAXV+2 / :3245 STD PLAXV`. Affects `plugins/defender/src/core/powers.ts:40,144,149` + test:40,72,234. *Found by Reviewer during code review.*
- **Gap** (blocking): incomplete velocity port — the ROM zeros Y velocity too (`STD PLAYV` :3246); `Teleport` models only `vx`. Affects `plugins/defender/src/core/powers.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `spawnSmartBomb`/`spawnHyperspace` create the AC4 scheduler process but perform no sim work — the smart-bomb enemy clear (via `clearsType` + df4-1) and the hyperspace teleport application to ship state are DEFERRED to the sim-wiring story (df5-8/df5-10 pattern). The pure decisions are complete; this seam is intentional but must be explicit so a later reader doesn't mistake the thin continuation for a bug. Affects a future df5 sim-wiring story. *Recorded by Reviewer during code review.*

### Reviewer (re-review, cycle 1)
- **Improvement** (non-blocking): the "one-shot process SUICIDEs after dispatch" invariant is asserted for `spawnHyperspace` but not for `spawnSmartBomb` (identical no-sleep continuation shape). Low risk — the shared scheduler contract is mutation-tested via the hyperspace path — but a symmetric assertion would close the gap. Affects `plugins/defender/tests/df5-5-powers.test.ts` (add a `spawnSmartBomb` SUICIDE-after-tick case). *Found by Reviewer (test-analyzer) during re-review; accepted non-blocking, not routed to rework.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **ADR-0005 strobe substitution: the smart-bomb + hyperspace full-screen strobes render as freeze/fade, not the ROM's whole-page invert / screen-clear**
  - Spec source: context-story-df5-5.md, AC-2 (and docs/adr/0005-photosensitivity-accessibility-exception.md)
  - Spec text: "the substitution of the ROM SBMBX0 COM PCRAM strobe (defender/DEFA7.SRC:3199) is logged as a 6-field Design Deviation citing docs/adr/0005-photosensitivity-accessibility-exception.md"
  - Implementation: the ROM's smart-bomb `SBMBX0 COM PCRAM` whole-page colour-RAM inversion (DEFA7.SRC:3199) and the hyperspace `SCLR1` screen-clear (:3218) are NOT ported as strobes. `classify('smart-bomb')` → `{full-frame-strobe, fade}` and `classify('hyperspace')` → `{full-frame-strobe, freeze}` in effects.ts route both through the df4-2 policy; the ROM TRIGGER + TIMING (SBFLG/PSBC gate :3175-3181, the `#4` flash count :3197, the HYPER `$FD` gate + `$77` status + `NAP 15` :3214-3219) are ported and cited in claims/18-powers.json. `assertNoFullFrameStrobe` stays GREEN with both powers live.
  - Rationale: the full-screen strobes are a seizure trigger for the owner (photosensitive epilepsy); ADR-0005 is the ONE standing exception to ROM-always-wins, and df5 CITES it rather than re-deciding — only the PRESENTATION is substituted, not the trigger/timing.
  - Severity: major
  - Forward impact: none — df5-5 is a leaf consumer of the df4-2 policy; the further "no strobe anywhere" generalization of the guard is already scoped to df7 (documented in the `assertNoFullFrameStrobe` SCOPE comment).

### Reviewer (audit)
- **ADR-0005 strobe substitution (Dev's entry above):** ACCEPTED. Spec-mandated by AC2 + the epic ADR-0005 ruling; correctly logged with all six fields; cites the ADR and the substituted lines (:3199 / :3218), both verified against source. This is the sanctioned exception to ROM-always-wins, done right.
- **UNDOCUMENTED deviation — FLAGGED (High):** the hyperspace re-entry death roll (`DEFA7.SRC:3275-3277`, `LSEED > 192 → PLEND`) is a coded ROM mechanic the port silently drops, with no deviation entry. Under ROM-always-wins an omission of coded behavior must be either ported or logged as a deviation; it is neither, and the "re-entry risk" prose obscures the gap. This is finding B1, routed to rework — the fix is to PORT it (not deviation-log it), since AC3 explicitly requires the re-entry risk modelled and cited.
- **RE-REVIEW (cycle 1): the FLAG above is CLEARED.** Round-1 rework `dac3460b` PORTED the death roll (`hyperspaceKilled`, cited PWR-25/26/27, tested) — there is no longer an undocumented omission. The ADR-0005 substitution remains the ONE Design Deviation, and it stays ACCEPTED.

## Reviewer Assessment

**Verdict:** APPROVED (re-review; supersedes the round-1 REJECTED verdict)

**Re-verification method:** re-ran all four enabled subagents on the reworked diff (cycle 1) AND did my own targeted byte-verification of each round-1 finding against `reference/original-source/defender/DEFA7.SRC`. Every finding is confirmed RESOLVED; no new issue survived.

**Data flow traced:** the injected `rand` now feeds BOTH `hyperspace` (teleport) and the distinct `hyperspaceKilled` (the LSEED death roll, a separate re-entry draw) — the coded re-entry risk finally enters the data flow, closing round 1's central gap. Purity holds (no clock/entropy; `rand` injected).

Specialist corroboration this cycle: **[DOC]** (comment-analyzer) clean — all 27 claims + every
citation byte-verified; **[TEST]** (test-analyzer) clean — mutation battery killed the boundary/
suicide/presentation mutants; **[RULE]** (rule-checker) clean — 36 rules / 0 violations, PTYPE
8/9 collision-free. Round-1 findings, all CONFIRMED RESOLVED (subagent + my own byte-checks agree):
- **B1** death roll — `hyperspaceKilled(rand) = rand() > 192` (powers.ts); PWR-25/26/27 byte-verify (:3275-3277); tests pin the strict-`>` boundary (192 survives / 193 dies), the exact 63/256 count, and rng-determinism. test-analyzer's mutation battery killed `>`→`>=`/`<`/const. AC3 met.
- **B2** citation — `:3242` correctly labelled `STD NPLAXC`; velocity cited `:3243-3245`; no bare `STA PLAXV` remains (rule-checker #24 confirmed no survivor).
- **B3** Y-velocity — `Teleport.vy`, `hyperspace` returns `vy:0`, PWR-24 (:3246) byte-verifies; test asserts both.
- **S1** PTYPE — 8/9, confirmed free of the whole fleet (0-7 taken); comment now truthful (ptype opaque, not globally unique).
- **S2** — `:3216-3217`; PWR-20 (:3217 STA STATUS) byte-verifies.
- **S3** — SUICIDE test `.toBe(0)`; mutation (inject `sleep`) now caught.
- **N1** classify pins exact `fade`/`freeze` (swap-mutant caught). **N2** `HYPER_DIR_MAG` marked citation-only (independently confirmed `hyperspace` never reads it; ship.PLADIR_MAG carries the value).

**Current-cycle green:** 718/718 defender + 503/503 orchestrator, `tsc` clean, all 27 PWR claims byte-verify (brief-dossier), purity sweeps powers.ts, the df4-2 `assertNoFullFrameStrobe` guard stays GREEN.

**Non-blocking observation [TEST] (accepted, not routed):** `spawnSmartBomb` has no direct SUICIDE-after-dispatch assertion of its own (only `spawnHyperspace` does); the two share the identical no-sleep continuation shape and the mutation was caught via the hyperspace path, so this is a low-risk symmetry gap, not a defect. Recorded as a Delivery Finding for a future touch. The deferred sim-wiring seam (round-1 Improvement) also stands, correctly scoped.

**Handoff:** To SM for finish-story.

### Devil's Advocate (re-review)
Try again to break it. The death roll is now present — but is the threshold right? A skeptic would suspect an off-by-one: the ROM's `LBHI` is unsigned STRICTLY-higher, so 192 must SURVIVE and 193 must die; a naive port using `>=` would kill one extra value (192) and inflate the fatal set to 64/256. The test pins exactly this boundary (192→false, 193→true) and the exact count 63, and the mutation battery confirmed `>=` is caught — so the off-by-one is closed, not merely asserted. Next suspicion: does `hyperspaceKilled` secretly re-use the teleport's draws, making death correlated with position rather than an independent LSEED roll? No — it is a separate function taking its own `rand`, matching the ROM reading LSEED at a later dispatch than the SEED/HSEED teleport draws; a caller wires three independent draws. Could the velocity fix have introduced a NaN or a wrong field? `vy` is a hardcoded `0` literal, readonly, cited to the real `STD PLAYV` — no arithmetic to misfire. Could the PTYPE change have collided elsewhere? Grepped the whole fleet — 8/9 are unused; and even a collision would be inert (ptype is opaque, ufo/bomber already share 5). The one honest residual is that `spawnSmartBomb`'s process does nothing on dispatch and clears no enemies — but that is the explicitly-scoped sim-wiring boundary, tested to the extent the pure layer allows (it spawns exactly one process), and recorded as a Delivery Finding, not smuggled through. The fidelity envelope that leaked in round 1 is now sealed: every citation re-opens, the death risk is real, both velocities stop. I cannot find a surviving defect.

## Subagent Results

**Cycle: 1**

Re-verification method for this cycle: **re-ran all four enabled subagents** on the reworked diff (not targeted-only), cross-checked with my own byte-level verification.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (718 defender / 503 orch green, lint clean, zero smells, all audit gates green) | N/A |
| 2 | reviewer-edge-hunter | N/A — disabled | disabled | N/A | disabled via settings |
| 3 | reviewer-silent-failure-hunter | N/A — disabled | disabled | N/A | disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 low (spawnSmartBomb lacks its own SUICIDE-after-dispatch assertion; the shared pattern is covered via spawnHyperspace) | Accepted non-blocking — recorded as a Delivery Finding, not routed to rework (low confidence, shared contract already mutation-tested) |
| 5 | reviewer-comment-analyzer | Yes | clean | none — all 27 PWR claims + every powers.ts citation byte-verified against source; all 5 round-1 citation/comment defects confirmed fixed | N/A |
| 6 | reviewer-type-design | N/A — disabled | disabled | N/A | disabled via settings (type rules covered by rule-checker 38 checks + my read) |
| 7 | reviewer-security | N/A — disabled | disabled | N/A | disabled; domain assessed first-hand — pure game core, no external input/auth/secrets |
| 8 | reviewer-simplifier | N/A — disabled | disabled | N/A | disabled; assessed first-hand — HYPER_DIR_MAG now documented citation-only, no dead code remains |
| 9 | reviewer-rule-checker | Yes | clean | none (0 violations across 36 rules / 71 instances; PTYPE 8/9 collision-free; HYPER_DEATH_THRESHOLD cited byte-exact) | N/A |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
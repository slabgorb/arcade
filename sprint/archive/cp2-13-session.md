---
story_id: "cp2-13"
jira_key: "cp2-13"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-13: Per-round colour cycling — transcribe the ROM's per-wave palette and apply it on wave change

## Story Details
- **ID:** cp2-13
- **Jira Key:** cp2-13
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** centipede

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T21:43:39Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T21:06:50Z | 2026-07-19T21:06:50Z | 0s |
| red | 2026-07-19T21:06:50Z | 2026-07-19T21:29:33Z | 22m 43s |
| green | 2026-07-19T21:29:33Z | 2026-07-19T21:35:32Z | 5m 59s |
| review | 2026-07-19T21:35:32Z | 2026-07-19T21:43:39Z | 8m 7s |
| finish | 2026-07-19T21:43:39Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): Colours are baked into the sprite ATLAS once at
  startup (`buildAtlas()` in main.ts), not applied per-frame in render.ts — the
  mushrooms/gun/segments blit from a pre-coloured texture; render.ts only fills the
  background (PLAYFIELD_PENS[0], invariant black) and blits. So per-wave colour
  cycling is achieved by an atlas REBAKE keyed on the wave, driven from main.ts —
  **render.ts needs no change.** The whole feature is three shell edits: palette.ts
  (the table + wave lookups), atlas.ts (`buildAtlas(wave)`), main.ts (rebake on
  scheme change + the debug seed). Affects `src/shell/palette.ts`, `src/shell/atlas.ts`,
  `src/main.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): The background pen 0 (COLORR+0) is 0x0F black on
  EVERY wave — INITSC sets it separately (CENTI4.MAC:1202-1203, CL-24) and CLRCH
  never writes COLORR+0. Only pens 1/2/3 (playfield) and 9/A/B (sprite) cycle. So a
  correct implementation keeps `playfieldPensForWave(w)[0]` black for all w; a Dev
  who folds the background into the 99$ scheme would regress the black clear.
  Affects `src/shell/palette.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): `SimState.wave` is a plain public field the shell can
  read/override; this story needs no core change and no new SimState field. The debug
  seed overrides `wave` on the created state in the shell (`{ ...createSim(seed), wave }`)
  — confirm the Reviewer is content the core stays debug-free rather than widening
  `createSim`. Affects `src/main.ts` (shell), `src/core/sim.ts` (untouched). *Found by TEA.*

### Dev (implementation)
- No upstream findings. The Dev contract's module shapes, signatures, and AC-2
  capture steps matched the implementation cleanly; no gap/conflict/question
  surfaced during GREEN.

### Reviewer (code review)
- **Improvement** (non-blocking): the atlas is fully rebaked (new canvas +
  full stamp re-decode) on every wave transition. Cost is once-per-wave, not
  per-frame, so it is immaterial here — but if a future story adds a rapid
  attract/demo wave-cycle or many-wave fast-forward, a 14-entry precomputed
  atlas cache (scheme 0..13) would drop the rebake to a pointer swap. Affects
  `src/shell/atlas.ts`, `src/main.ts`. *Found by Reviewer during code review.*
- **Question** (non-blocking): there is no in-sim "new game" reset — `SimState.wave`
  is monotonic (createSim=1, +1 on wave-clear, never reset), so the INITSC
  "fresh game → scheme 0" semantics are honoured only via page reload. Correct
  for this pre-restart clone, but whenever a game-over→restart path lands (cp3/cp4)
  it MUST reset `wave` to 1 or the colour cursor will start stale; the frame
  loop's scheme-change detection will then rebake correctly on its own. Affects
  `src/core/sim.ts` (future restart path). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-2 debug wave-seed (ORCHESTRATOR-SCOPED, per the story ruling):** AC-2 says the
  colours change "in live play" and wants a wave-1-vs-wave-2 screenshot pair, but the
  live shell has no dev-key / level-skip, so wave 2 is otherwise only reachable by
  clearing wave 1. Spec (implicit) = reach wave 2 by real play; tests/contract = a
  SHELL-ONLY `?wave=N` query param in `src/main.ts` (URLSearchParams → parseInt →
  clamp >= 1, finite → seed the initial wave), mirroring the star-wars dev-key
  precedent. Reason: makes the screenshot pair capturable without a slow scripted
  play-through. The CORE stays debug-free — the shell overrides the public
  `SimState.wave` field on the created state; `createSim`/the pure sim gain no debug
  parameter. Pinned by a `main.ts?raw` source scan (repo idiom), not a runtime test.
- **2-player bit6 swap deferred (CL-23):** the ROM's per-player colour swap (bit6,
  CENTI4.MAC:715-717 + the CENIR4.MAC:312-315 branch) is transcribed as a claim but
  NOT implemented — this clone is 1-player only (cp2-12). Spec/ROM = per-player swap;
  tests = `colorIndexForWave(wave)`/`schemeForWave` take only the wave (constant
  player 1). Reason: no 2-player mode exists to swap into. Logged as quarry.
- **"pens change between wave-1 and wave-2" pinned at the palette layer, not the
  atlas-log ctx:** the story suggested the atlas-log recording-ctx idiom, but the
  wave colours are baked into the atlas IMAGE (a canvas, opaque to the node fake
  ctx and absent in node). So the render-visible cycle is pinned as a pure-function
  inequality (`spritePensForWave(1) !== spritePensForWave(2)`, wrap at 14) plus
  `?raw` wiring pins that atlas/main consume the wave pens — the human screenshot
  pair (AC-2) is the pixel-level proof. Reason: node has no canvas to read atlas
  pixels back from.

### Reviewer (audit)
- **AC-2 debug wave-seed (TEA) — ACCEPTED.** Orchestrator-scoped per the story
  ruling; the mechanism is `?wave=N` in `src/main.ts` ONLY, parsed via
  `URLSearchParams`, clamped `[1, 999]`, finite-guarded, and applied by
  overriding the public `SimState.wave` on the created state — `createSim`/the
  pure core gain no debug parameter (confirmed: no `src/core/` in the diff;
  purity 17/17 green). It is a benign integer-only query read (no injection
  surface), and AC-2 explicitly requires the wave1/wave2 screenshot pair, which
  is otherwise unreachable in a dev-key-less shell. Mirrors the star-wars
  dev-key precedent. Shipping it is within the ruling.
- **2-player bit6 swap deferred (CL-23) — ACCEPTED.** The per-player swap
  (CENTI4.MAC:716-717 ORA I,40; CENIR4.MAC:312-315 branch) is transcribed as a
  claim and not implemented; this clone is 1-player (cp2-12), so
  `schemeNumberForWave` correctly takes no player argument. Consistent scope,
  logged as quarry.
- **"pens change" pinned at the palette layer, not the atlas-log ctx — ACCEPTED.**
  Sound testing-strategy deviation: node has no canvas to read atlas pixels back
  from, so the render-visible cycle is pinned as a pure-function inequality plus
  `?raw` wiring, with the committed screenshot pair as the pixel-level proof.
- **Dev deviations — NONE.** Confirmed by diff: the implementation matches the
  Dev contract's module shapes, signatures, and wiring exactly.

## Sm Assessment

**Setup complete, ready for RED.** cp2-13 (3pt feature, tdd, USER-REPORTED
2026-07-19: "colours should change per round, as the arcade does" — pulled
forward from cp4 by explicit user instruction, since the wave-1 loop
already shipped in cp2-5 so rounds already advance).

ROM anchors (verified 2026-07-19, verbatim from the story description):
LCOLOR index (CENDE4.MAC:208, one byte per player) advanced in the IRQ at
CENIR4.MAC:310-325 — "+3 per wave" stepping through the 42-byte (decimal,
`CMP I,42.`) triple-table 99$ (CENTI4.MAC:898-901), wrapping to 0 → exactly
14 distinct palettes cycling by round. The advance flag (bit7, `ORA I,80`)
is set at new-wave CENTPC (CENTI4.MAC:461-463 ";TIME TO CHANGE COLORS");
2-player swap uses bit6 (:715-717); game start resets to scheme 0 (INITSC
:1201-1209 → JSR CLRCH with X=0). CLRCH (:879-895) loads 99$[X],[X+1],[X+2]
into the COLORR pens (body/legs/eyes + mushroom/gun/alphanumerics — static
mapping already claimed CL-1..CL-11; CL-11 explicitly deferred THIS
cycling, which this story now claims). 0x06/0x07 resolved at the table: 99$
contains exactly one 0x06 (CENTI4.MAC:900, scheme X=30, the [X+2]
eyes/mushroom-outline/alphanumerics pen) and NO 0x07 anywhere — the ROM
stores 0x06; the decode to RGB is adapter policy (MAME centiped_v.cpp:211
corroboration per CL-1/CL-10). Any 0x07 in our CLRCH transcription is
uncited and must be corrected to 0x06 with citation. Deterministic: colour
= pure function of wave number + player; no rng.

**Current colour-code survey (2026-07-19, this session, pre-implementation)
— see context Technical Approach for the full writeup:**
- `src/shell/palette.ts` is the sole colour module. `decodeClrchColor`
  (CL-1) is the hardware DAC decode; `PLAYFIELD_PENS`/`SPRITE_PENS` are two
  hardcoded 4-element arrays covering **only scheme 0** (99$[0..2] =
  `[0x0D, 0x00, 0x0E]`, CL-9). **There is no 99$ table in code at all** —
  no 14-scheme array, no wave-indexed lookup — this story adds it from
  scratch.
- **0x07 audit: NONE FOUND.** Grepped `src/shell/palette.ts`, all of
  `docs/rom-study/claims/*.json`, and the `src/` tree for `0x07`/`0X07` —
  zero hits tied to colour (the only `07` hits are unrelated: RESTOR's
  `FRAME & 0x07` cadence, a pointer-sweep bound `CMP I,07`). Existing code
  has exactly four colour nibbles total (`0x0d`, `0x00`, `0x0e`, `0x0f`),
  none of them `0x07`. So there is nothing pre-existing to *correct* —
  the mandate lands on getting the NEW 42-byte transcription right the
  first time, specifically entering `0x06` (not `0x07`) at scheme X=30.
  CL-11 already names this exact deferral: "Scheme index advances per wave
  (CENIR4.MAC:325 JSR CLRCH — out of scope until cp4)" — this story is
  that promised follow-up.
- `SimState.wave` (`src/core/sim.ts`) starts at 1, advances via
  `wave: state.wave + 1` on wave-clear (cp2-5's loop / cp2-10's
  factory-inclusive clear) — a plain, already-pure field, exactly the
  input a `schemeForWave(wave)` lookup needs. No core changes expected —
  **confirmed**: the palette module is 100% shell-side, consumed only by
  `src/shell/render.ts`. Hook point is a pure function replacing the two
  static pen-array constants (or indexing a precomputed 14-scheme table),
  called each frame with `state.wave`; must reproduce the ROM's flag-gated
  "+3 wrap-at-42" stepping (CENIR4.MAC:310-325) rather than a naive
  `(wave-1)*3 % 42` — verify against the bit7 CENTPC trigger before coding.
  2-player bit6 swap is quarry-only (this clone is 1-player, per cp2-12).
- **AC-2 screenshot-pair reachability (flagged, not resolved by me):** the
  live shell (`src/main.ts`) has NO debug/dev key, no level-skip, no seed
  override — `createSim()` has no wave-jump hook. The only way to reach
  wave 2 in **live play** (AC-2's literal ask, distinct from AC-1's
  explicitly-permitted "debug-seeded wave state" for pinned unit tests) is
  to actually clear wave 1 (kill all 12 segments) through real input.
  TEA/Dev must choose: (a) script a real Playwright play-through, (b) add
  a minimal explicitly-scoped debug hook if judged in-surface, or (c)
  decide AC-2 tolerates the same debug-seed leniency as AC-1. This is a
  scope call for TEA, not a setup decision.
- **Port-ownership trap (repeat of cp2-12):** verify any dev-port
  screenshot is bound to THIS checkout via
  `PID=$(lsof -ti tcp:<port> | head -1); lsof -a -p "$PID" -d cwd -Fn |
  grep '^n'`, or serve on an explicit spare port — sibling checkouts
  (`a-2`/`a-3`) pin the same ports.

- **Branch:** `feat/cp2-13-per-round-colours` off `origin/develop` tip
  `99f2b0e` (cp2-12 merged, PR centipede#18); local `centipede` checkout
  was already fast-forwarded and clean before branching.
- **Race check:** `git log origin/develop --oneline -10` has no `cp2-13` —
  clear to proceed.
- **Jira:** skipped — none on this project (`jira_key` is just the story id
  per CLAUDE.md; no Jira integration configured for the arcade
  orchestrator).
- **Mode:** peloton subagent mode — tea/reviewer → opus, dev → sonnet;
  merges are user-authorized between stories for this session but the
  merge itself is executed by the USER, not this agent — the auto-mode
  classifier blocks an AI from merging an AI-authored + AI-reviewed PR
  (self-approval guardrail). Stop at finish and get explicit user
  authorization before any merge.
- **Priority/provenance:** USER-REPORTED 2026-07-19, pulled forward from
  cp4 by explicit user instruction (not epic-sequence order) — noted so
  Reviewer doesn't flag the out-of-epic-order pickup as a process
  deviation.

**Handoff:** To TEA (O'Brien) for RED test design.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (39 new tests failing for the right reason; ready for Dev)

**ROM quarry (all verified byte-for-byte against
`reference/atari-source/centipede/revision.v4/` this session):**
- **99$ table = 42 bytes, 14 schemes** (CENTI4.MAC:898-901). Transcribed
  byte-for-byte. **Exactly ONE 0x06** — at table index 32, the [X+2] pen of the
  scheme beginning at X=30 (= wave 11's eyes/mushroom-outside/alphanumerics pen).
  **NO 0x07 anywhere.** Confirmed by machine count.
- **The advance is flag-gated, not free-running** (CENIR4.MAC:310-325): bit7
  (BMI, :311) → AND 0x3F strip flags (:314/:317) → +3 (ADC I,03, :319) → wrap at
  **DECIMAL 42** (`CMP I,42.`, :320 — trailing period = decimal under `.RADIX 16`;
  bare `42` would be 0x42=66) → LDA I,0 reset (:322). bit7 raised at CENTPC per
  cleared wave (ORA I,80, :462-463), gated by DEAD-1==0. INITSC resets index 0
  (:1206) + renders scheme 0. Net closed form: **index = ((wave-1)*3) mod 42**
  (42 is a multiple of the +3 stride from 0, so the reset-to-0 sequence is exactly
  mod-42). Wave 1→scheme0, wave15→scheme0 (wrap). Background 0x0F is set outside
  CLRCH (:1202-1203) → **scheme-independent black on every wave.**

**New claims (docs/rom-study/claims/08-render-color.json):** CL-17 (LCOLOR/flag
layout), CL-18 (+3 step), CL-19 (wrap-42 decimal), CL-20 (bit7 gate), CL-22
(CENTPC bit7 trigger), CL-23 (2-player bit6 — DEFERRED), CL-24 (INITSC reset +
invariant black bg), CL-25/26/27 (99$ rows 2/3/4; CL-26 pins the lone 0x06).
CL-11's stale "out of scope until cp4" note updated to point at these.
`node tools/audit/check-citations.mjs` → **235 claims, all verified.**

**Test Files:**
- `tests/palette-cycle.test.ts` (NEW, 34 tests) — the behavioural teeth: full
  42-byte table byte-exactness (carried IN the test; lone 0x06@32, no 0x07),
  `colorIndexForWave` (+3/wrap-42/14, waves 1-4 + wrap 15), `schemeNumberForWave`,
  per-wave pens (CLRCH distribution generalized), invariant black bg, back-compat
  scheme-0, pens-change-between-waves, wrap, the 0x06-not-0x07 render-surface pin.
- `tests/atlas.test.ts` (+2 cp2-13) — `buildAtlas(wave)` parameterized + sources
  the wave pens (`?raw`). Existing pen-source assertion widened to survive the
  refactor (still green now).
- `tests/main-loop.test.ts` (+4 cp2-13) — atlas baked from the wave, scheme-tracked
  rebake, `?wave=` parse, clamp (`?raw`).

**RED proof:** 477 tests total = 437 baseline (all still green) + 40 new (39 RED +
1 fixture self-check green). `npx tsc --noEmit` CLEAN. citations all-verified (235).
Commit `823542b` on `feat/cp2-13-per-round-colours`, tree clean, NO src/ changes.

---

### DEV CONTRACT (GREEN — Julia)

All changes are **shell-only**; the pure core (`src/core/`) is untouched.

**1. `src/shell/palette.ts`** — add (keep every existing export):
```ts
// The 42-byte 99$ table (CENTI4.MAC:898-901, CL-9/25/26/27) — raw nibbles, HEX
// (.RADIX 16). 14 three-nibble schemes; the lone 0x06 is at index 32; no 0x07.
export const SCHEME_TABLE: readonly number[] = [
  0x0d,0x00,0x0e, 0x02,0x04,0x01, 0x0e,0x01,0x0c, 0x04,0x01,0x0b, // :898 schemes 0-3
  0x01,0x0c,0x0a, 0x09,0x0b,0x04, 0x0c,0x0d,0x0a, 0x09,0x0c,0x0e, // :899 schemes 4-7
  0x0a,0x0e,0x01, 0x0b,0x01,0x04, 0x01,0x00,0x06, 0x0d,0x0e,0x0a, // :900 schemes 8-11
  0x0e,0x0c,0x0b, 0x00,0x0d,0x02,                                 // :901 schemes 12-13
]
export const SCHEME_COUNT = SCHEME_TABLE.length / 3 // 14

// index = ((wave-1)*3) mod 42 (CENIR4.MAC:310-325: +3 gated by bit7, wrap CMP I,42.
// DECIMAL, reset LDA I,0; INITSC reset ⇒ wave 1 = scheme 0). Clamp to a positive
// integer wave so a debug-seeded/degenerate wave never indexes off-table.
export function colorIndexForWave(wave: number): number {
  const w = Number.isFinite(wave) ? Math.max(1, Math.floor(wave)) : 1
  return ((w - 1) * 3) % 42
}
export function schemeNumberForWave(wave: number): number { return colorIndexForWave(wave) / 3 } // 0..13

// CLRCH distribution generalized to any scheme (CL-2..CL-8): a=99$[X], b=99$[X+1],
// c=99$[X+2]. Background pen 0 = 0x0F black, set outside CLRCH (CL-10/CL-24), so it
// is scheme-INDEPENDENT — keep it 0x0F for every wave.
export function playfieldPensForWave(wave: number): readonly Rgb[] {
  const i = colorIndexForWave(wave); const a = SCHEME_TABLE[i], b = SCHEME_TABLE[i+1], c = SCHEME_TABLE[i+2]
  return [decodeClrchColor(0x0f), decodeClrchColor(a), decodeClrchColor(c), decodeClrchColor(b)]
}
export function spritePensForWave(wave: number): readonly Rgb[] {
  const i = colorIndexForWave(wave); const a = SCHEME_TABLE[i], b = SCHEME_TABLE[i+1], c = SCHEME_TABLE[i+2]
  return [decodeClrchColor(0x0f), decodeClrchColor(b), decodeClrchColor(c), decodeClrchColor(a)]
}
// Scheme-0 constants kept for existing consumers = wave 1 (unchanged values):
export const PLAYFIELD_PENS = playfieldPensForWave(1)
export const SPRITE_PENS = spritePensForWave(1)
```
Radix-cited comments required (the test only checks values, the citation gate +
Reviewer check the comments). Fill CL-11's deferral in the module header.

**2. `src/shell/atlas.ts`** — `export function buildAtlas(wave = 1): Atlas` (default
1 keeps every current call working). Inside: `const playfield = playfieldPensForWave(wave)`,
`const sprite = spritePensForWave(wave)`; `penFor(stamp, colourIndex)` picks from
those wave arrays instead of the module constants.

**3. `src/shell/render.ts`** — **NO CHANGE.** It fills bg with `PLAYFIELD_PENS[0]`
(invariant black) and blits from the injected atlas; the wave colour flows through
the atlas, not render.

**4. `src/main.ts`** — (a) live cycle + (b) debug seed:
```ts
import { schemeNumberForWave } from './shell/palette'
const WAVE_SEED_MAX = 999 // sane finite upper bound (colour wraps at 14 regardless)
const rawWave = Number.parseInt(new URLSearchParams(window.location.search).get('wave') ?? '', 10)
const debugWave = Number.isFinite(rawWave) ? Math.min(Math.max(rawWave, 1), WAVE_SEED_MAX) : 1
let sim: SimState = { ...createSim(Date.now()), wave: debugWave } // shell override; core stays debug-free
let currentScheme = schemeNumberForWave(sim.wave)
let atlas = buildAtlas(sim.wave)                 // initial bake at the seeded wave
// …in frame(), AFTER the step loop:
if (schemeNumberForWave(sim.wave) !== currentScheme) {
  currentScheme = schemeNumberForWave(sim.wave)
  atlas = buildAtlas(sim.wave)                   // rebake only when the palette changes
}
```
(`atlas` becomes a `let`; keep the pointer-lock/timebase/highscore wiring as-is.)

**5. AC-2 screenshot pair (Dev captures + commits):**
- Serve THIS checkout on a SPARE port (5278 may belong to a sibling a-2/a-3):
  `cd centipede && npx vite --port 5288 --strictPort`.
- Prove ownership before trusting a shot:
  `PID=$(lsof -ti tcp:5288 | head -1); lsof -a -p "$PID" -d cwd -Fn | grep '^n'`
  → must print `.../a-1/centipede`.
- Playwright: open `http://localhost:5288/?wave=1`, screenshot; open `?wave=2`,
  screenshot. The two must show visibly different field/enemy colours (scheme 0 vs
  scheme 1). Commit the pair under `docs/rom-study/screenshots/`
  (e.g. `cp2-13-wave1.png`, `cp2-13-wave2.png`).

**Handoff:** To Dev (Julia) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/shell/palette.ts` - Added `SCHEME_TABLE` (42-byte 99$ table, CL-9/25/26/27),
  `SCHEME_COUNT`, `colorIndexForWave`, `schemeNumberForWave`,
  `playfieldPensForWave`/`spritePensForWave` (CLRCH distribution generalized to
  any scheme, CL-3..8 cited). `PLAYFIELD_PENS`/`SPRITE_PENS` now derive from
  `*PensForWave(1)` — same values, back-compat preserved.
- `src/shell/atlas.ts` - `buildAtlas(wave = 1)` sources
  `playfieldPensForWave`/`spritePensForWave` instead of the static scheme-0
  constants; `penFor` takes the wave-selected pen arrays as parameters.
- `src/main.ts` - shell-only `?wave=N` debug seed (URLSearchParams -> parseInt
  -> clamp `[1, 999]`) overrides the initial `SimState.wave` (core/`createSim`
  untouched); atlas now baked from `sim.wave` at boot and rebaked in `frame()`
  only when `schemeNumberForWave(sim.wave)` crosses a boundary.
- `src/shell/render.ts` - unchanged, per contract (per-wave colour flows
  entirely through the atlas rebake).
- `docs/rom-study/screenshots/cp2-13-wave1.png`,
  `docs/rom-study/screenshots/cp2-13-wave2.png` - AC-2 evidence, captured on a
  spare port (5288) with ownership verified via `lsof` before trusting the shots.

**Tests:** 477/477 passing (GREEN) — 39 RED turned green, 437 baseline +
1 fixture self-check stayed green. `tsc --noEmit` clean.
`node tools/audit/check-citations.mjs` → 235/235 verified.
**Branch:** `feat/cp2-13-per-round-colours` (commit `b576b31`, not pushed — per
instructions, no push/PR/merge in this phase)

**Handoff:** To next phase

## Reviewer Assessment

**Verdict:** APPROVED

**Verdict rationale:** All three ACs met. The 42-byte 99$ table is byte-for-byte
correct against ROM ground truth; the CLRCH pen distribution is provably faithful
for ALL 14 schemes (not an artifact of scheme 0); the wave→scheme mapping is the
correct closed form of the ROM's flag-gated stepping and preserves the "no colour
change on death within a wave" invariant; the debug seed is properly contained in
the shell; and the committed screenshot pair shows the palette visibly cycling.
No Critical/High/Medium/Low code defects found. Gates all green (mine + preflight).

### Headline ruling — CLRCH distribution generalization (highest-risk step)

**FAITHFUL FOR ALL SCHEMES.** Derived directly from CLRCH (CENTI4.MAC:883-895),
the routine loads a=99$[X], b=99$[X+1], c=99$[X+2] and distributes them by fixed
register moves that are scheme-INDEPENDENT:
- `STA COLORR+01/+0B` ← a → playfield pen 1 (inside-mushroom/gun) + sprite body
- `STY COLORR+03/+09` ← b → playfield pen 3 (poison-inside) + sprite legs
- `STX COLORR+02/+0A` ← c → playfield pen 2 (outside-mushroom/alnum) + sprite eyes

So the ROM's mapping is playfield `[bg, a, c, b]` and sprite `[bg, b, c, a]` for
EVERY scheme — exactly what `playfieldPensForWave`/`spritePensForWave` produce.
The distribution comes from the CLRCH instruction sequence, not from scheme 0's
particular byte values, so wave 2+ colours match the arcade. Cross-checked: it
reproduces the existing cp1-6 scheme-0 pens identically (back-compat preserved).

### Table-fidelity confirmation

`SCHEME_TABLE` (src/shell/palette.ts) == 99$ (CENTI4.MAC:898-901) byte-for-byte,
all 42 bytes, verified by hand against the ROM under `.RADIX 16`. **Exactly one
0x06 at table index 32** (scheme X=30's [X+2] pen = scheme 10 / wave 11 eyes),
**zero 0x07 anywhere.** The RED-fixture table (tests/palette-cycle.test.ts
`NINETY_NINE`), the src `SCHEME_TABLE`, the claim verbatims (CL-9/25/26/27), and
the ROM all agree — a shared typo is ruled out because the citation gate verifies
the claim `.BYTE` lines against the actual ROM file (235/235 verified).

### Mandatory review evidence

- **Data flow traced:** `?wave=2` → `URLSearchParams` → `parseInt`=2 → clamp[1,999]
  → `sim.wave=2` → `schemeNumberForWave(2)=1` ≠ `currentScheme(0)` → `buildAtlas(2)`
  → `spritePensForWave(2)=[bg, b=0x04, c=0x01, a=0x02]` decoded → atlas baked →
  `render` blits. Safe: integer-only, clamped, off-table index impossible.
- **Wiring:** the wave colour flows UI-visible entirely through the atlas rebake;
  render.ts unchanged (fills bg with invariant-black `PLAYFIELD_PENS[0]`, blits).
  The `?wave=` seed is reachable from the browser URL; the live cycle rebakes in
  `frame()` after the step loop when the scheme boundary is crossed.
- **Error handling / degenerate inputs:** `colorIndexForWave` clamps non-finite/
  ≤0/fractional waves to wave 1 and mods to a valid on-table multiple-of-3 index;
  `?wave=` empty/missing/NaN/negative/huge all resolve to a safe clamped wave.
- **Security:** no injection surface — the only external input is `?wave=`, coerced
  to a clamped integer and used solely as an array index seed. No secrets, no auth
  surface, no eval/dynamic import (purity scanner green).
- **Wave-advance equivalence:** `((wave-1)*3) mod 42` equals the ROM's INITSC-reset-
  then-+3-per-cleared-wave-wrap-at-42 stepping (42 is a multiple of the +3 stride
  from 0). Colour is a pure function of `wave`; `sim.wave` increments once per
  wave-clear (sim.ts:276) and is held on death (sim.ts:259), so colours do NOT
  change on death within a wave — matching CENTPC's DEAD-1==0 gate (CL-22).
- **Claim quality (CL-17..CL-27):** every `verbatim` matches the ROM line exactly
  (CENDE4/CENIR4/CENTI4 spot-checked, incl. the ROM's own "OVERFOW" typo preserved);
  prose is accurate against source (CT-91 check — the gate verifies quotes, so prose
  was read independently). CL-11's stale "out of scope until cp4" note correctly
  repointed to CL-17..CL-27 (a note edit, not a phantom `remediated_by`).
- **Test quality:** anti-vacuous — the fixture self-checks its own lone-0x06/no-0x07
  shape (guards a self-vacuous pass), the deep-equal reddens on any drifted nibble,
  the 0x06-vs-0x07 pin proves the two decodes are distinct before asserting, the
  wrap (wave 15 == wave 1) and back-compat (wave 1 == old constants) pins are real,
  degenerate inputs are exercised. `req()` gives self-describing RED failures.
- **Screenshots:** wave1.png = scheme 0 (red caps / green bodies, red HUD) vs
  wave2.png = scheme 1 (magenta/cyan mushrooms, cyan HUD, yellow gun-icon lives) —
  dramatically different palettes, both on this branch's cp2-12 HUD layout.

### Findings by severity

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| — | None. No Critical/High/Medium/Low defects found. | — | — |

(Two non-blocking upstream notes recorded under Delivery Findings → Reviewer: a
future many-wave atlas cache, and the future restart path must reset `wave` to 1.)

**Handoff:** To SM for finish-story.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | `npx vitest run` 477/477 (34 files); `tsc --noEmit` exit 0; `check-citations.mjs` 235/235 verified; `npm run build` PASS (19 modules, 25ms); `git status --porcelain` clean; `tests/purity.test.ts` 17/17 with **no `src/core/` in the diff**; no console.log/debug/warn, TODO, FIXME, or `.skip(` in the src diff. Flagged the `?wave=` shell debug seed for ruling review. | N/A — all mechanical gates pass at exactly the expected counts; corroborates the Reviewer's own independent gate runs. The `?wave=` seed flag was audited and ACCEPTED (Design Deviations → Reviewer audit); does not change the APPROVED verdict. |

**All received: Yes** (1/1 enabled subagents returned; the remaining specialists are
peloton-disabled for a shell-only 3-pt transcription — the load-bearing adversarial
work is ROM re-verification of the table + CLRCH distribution + claim verbatims, done
inline this session by re-opening CENTI4.MAC/CENIR4.MAC/CENDE4.MAC).

**Reviewer's own independent re-run:** `tsc --noEmit` clean; `check-citations.mjs`
235/235 verified; targeted `palette-cycle`+`atlas`+`main-loop` = 59/59 pass. Table
+ CLRCH distribution + claim verbatims hand-verified against the ROM this session.
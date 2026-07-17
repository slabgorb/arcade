---
story_id: "rb4-16"
jira_key: "rb4-16"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-16: PLONSN, OR THE PLANE ESCAPES THE SCREEN — the servo must weave the DISPLAY position, clamped on-screen the ROM's way

## Story Details
- **ID:** rb4-16
- **Jira Key:** rb4-16
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** red-baron
- **Type:** refactor
- **Points:** 8

## Workflow Tracking
**Workflow:** tdd
**Phase:** green
**Phase Started:** 2026-07-16T14:21:45Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-16T14:01:06Z | 2026-07-16T14:06:55Z | 5m 49s |
| red | 2026-07-16T14:06:55Z | 2026-07-16T14:21:45Z | 14m 50s |
| green | 2026-07-16T14:21:45Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Conflict** (blocking, RESOLVED IN-PHASE by TEA — recorded so it cannot recur): the SM
  Assessment's "corrected" citation for RBARON.MAC :2749-2752 was FALSE. SM called it "an X-axis
  routine, not Y at all". It IS the servo's **Y** entry: `:2747 LDX I,2` sets X=2 and `ZX` is
  zero-page X-INDEXED, so `:2749 LDA ZX,PLSTAT+8` reads `PLSTAT+0A` = Y DISPLAY; `;PLSTAT+10.`
  is decimal 10 = 0x0A; `:2755` reads `;OFFSET FOR Y DELTA`. Corroborated by rb4-6 archive
  :586-588 and `enemy.ts:114-115`, both of which were already correct. sm-setup's original
  "Y clamp" had the AXIS right; only "clamp" was wrong (it is a read + HORIZN normalization).
  Corrected in `context-story-rb4-16.md` and the SM Assessment. **Upstream lesson:** do not
  correct a 6502 citation from a `sed` window — find the `LDX` that selects the index before
  reading any `ZX,` operand, and treat disagreement with long-lived source comments as a signal
  to slow down. The HORIZN-normalizes-not-displaces ruling (rb4-6) is UNAFFECTED and stands.

- **Question** (blocking for AC-1's completeness — TEA, red phase): **PLONSN's GATE is unported and
  its ROM semantics do not close.** `:2877-2881` reads `BIT GMEND0 / BMI 5$` (";KEEP RETURNING ON
  SCREEN") then `LDA N.PLNZ / CMP I,5 / BCS 50$` (";ELSE ONLY FIRST FOUR"). We model NEITHER
  `N.PLNZ` (":129 ;NUMBER OF PLANES COUNT") nor `GMEND0` — `grep` over `red-baron/src` returns
  nothing for either. Worse, the ONLY writes in the file are `STA N.PLNZ` at :2058 — which seeds it
  to **DECIMAL 10** (`LDA I,10.`, the trailing dot forces decimal against `.RADIX 16`) on the
  ATTRACT/high-score path (:2050-2059, `HSCRES`/`HSTMER`/`JMP NWBNNR ;CHECK FOR ATTRACT BANNER`) —
  and `INC N.PLNZ` at :2398. Read literally, `N.PLNZ >= 5` always holds and PLONSN would NEVER run
  outside the GMEND0 path, which cannot be the shipped behaviour: a game-start reset must exist in
  a path we have not traced (likely a RAM clear at coin-up). **This matters because the gate decides
  whether the bound exists at all**: gate it wrong in the "skip" direction and the plane outruns the
  stick from plane 5 on (a soft-lock); omit the gate entirely and late planes are clamped where the
  arcade lets them escape. The RED suite therefore exercises the CLAMP with a single plane and takes
  NO position on the gate — deliberately. **Dev: do not invent one to make a test pass.**

  **USER RULING (2026-07-16): PORT THE CLAMP UNGATED, AND LOG THE GATE AS A SCOPED SUCCESSOR.**
  Dev does NOT go spelunking for the N.PLNZ reset in this story. Port PLONSN's clamp
  unconditionally — it is the bound that makes the display-space servo survivable, and that is
  rb4-16's deliverable. The `N.PLNZ >= 5` / `GMEND0` gate becomes a successor story: it needs both
  counters modelled AND the game-start reset traced, neither of which is in this story's ACs.
  **Record the divergence honestly in a code comment at the port site** — cite :2877-2881, state
  that we clamp where the arcade may let planes 5+ escape, and name the successor. This is a KNOWN,
  RECORDED divergence, not an oversight: exactly the distinction this epic exists to enforce
  (cf. the C12/PERCENT deliberate descope in the epic context). Do not let it become an invented
  constant later.

- **Conflict** (BLOCKING — Dev, green phase; USER RULING 2026-07-17: hand back to SM/TEA, re-scope):
  **the story's coordinate premise is wrong, and no citable PLONSN window closes AC-R3.** The servo
  does NOT read the pre-divide offset our `displayPos` returns. `PLNDEL` reads `PLSTAT+8..+B`, which
  the ROM names `;X SCREEN POSITION` / `;Y SCREEN POSITION` (RBARON.MAC:3157/:3162) and which carries
  POSITH's **post-divide** `ADC I,HORIZN` lift (RBGRND.MAC:303) — which is precisely why the Y entry
  subtracts HORIZN back off (:2750) and the X entry does not. So `P_OLIM`/`P_ILIM` are SCREEN units.
  PLONSN's `PLSTAT − UNIV4X` (:2909-2913) is a SEPARATE, pre-divide world offset it computes fresh,
  and that is WHY it scales by depth (:2886): it converts a screen window into a world clamp. A servo
  already in display-world space would need no depth scale — the depth scale is the tell. There are
  THREE spaces here, not two. Affects `red-baron/src/core/enemy.ts` (`displayPos` + `windowServo`),
  `red-baron/tests/core/plonsn.test.ts` (AC-2's premise assertions compare |displayPos| against
  P_OLIM/P_ILIM, mixing pre-divide world with screen), and `sprint/context/context-story-rb4-16.md`
  (AC-2 as written). *Found by Dev during implementation.*

- **Gap** (BLOCKING — Dev, green phase): **the PLONSN window scale is not derivable from the quarry,
  and the two derivations that ARE citable both fail AC-R3.** Settled from the microcode: the Math Box
  multiply is `((X−E)·A − (Y−F)·B) >> 16` (`MBUCOD.V05:494-516` — a `.REPT 16.` shift-add into a
  32-bit product, then "FORM HIGH WD OF X'"). NOT settled, and not settleable here: the SINE table is
  `SINE = 3800` (RBARON.MAC:396) — a bare ROM address whose data is in **no `.MAC` file**, so the trig
  fixed-point (and with it PLONSN's absolute window) cannot be read from the source text by anyone.
  MEASURED with the real `spawn`/`flight.step`/`guns.collides` (throwaway rig, deleted; avg
  frames-in-reach, AC-R3's bar is `>10`), sweeping the limit coefficient `C = limit/depth`:

  | C | L0 | L1 | L2 | L3 | **L4** |
  |---|----|----|----|----|--------|
  | 0.02 | 597.3 | 187.4 | 88.7 | 68.8 | **47.3** |
  | 0.05 | 597.3 | 199.1 | 41.9 | 43.2 | **16.6** |
  | 0.10 | 597.3 | 206.6 | 23.5 | 26.6 | **6.0** |
  | 0.63 (via our own `scene.ts`) | 597.3 | 206.6 | 16.1 | 19.4 | **0.0** |
  | 1.58 (literal PLONSN transcription) | 597.3 | 206.6 | 16.1 | 19.4 | **0.0** |
  | ∞ (no PLONSN — the archive's case) | 597.3 | 206.6 | 16.1 | 19.4 | **0.0** |

  The `∞` row reproduces rb4-6's archived 0.0 exactly, so the rig is honest. **AC-R3 recovers only for
  C ≲ 0.05, and both citable derivations land in the dead zone**: the literal block
  (`(0x1A0×depth)>>16` then `RESULT*^100`, :2893-2896) → C≈1.58; deriving through our own projection
  (`0x1A0` against `scene.ts`'s `ROM_SCREEN_HALF`) → C≈0.63. Green needs C≈0.025, which nothing cites.
  TEA's "if AC-R3 will not recover, the window derivation is wrong — not the bar" has a third answer:
  **neither**. The window is not the gap. Affects `red-baron/src/core/scene.ts` (`ROM_SCREEN_HALF`
  = 512 is an explicit rb4-5 inference), `red-baron/src/core/guns.ts` (`WINDOW_X/Y` = 32 is playtest —
  and the ROM's gun is not a fixed world tube at all: COLSTP :5789-5821 tests the shell's SCREEN
  position against the plane's PROJECTED PICTURE bbox, `DB.TRP` min/max, which grows as it closes).
  *Found by Dev during implementation.*

- **Gap** (non-blocking — Dev, green phase): **the OUTER zone carries an un-ported depth gate.**
  `:2776-2781`: on `|pos| >= olim` the ROM reads `PLSTAT+19` and `CMP I,4`; only below that does it
  EOR the direction flag. So "RETURN TO CENTER" is depth-gated — close in, the plane does NOT come
  back, it flies past off-screen. Our `windowServo` returns to centre unconditionally at every depth.
  Note `PLSTAT+19` is "POSITION Z" (:295), a DIFFERENT field from `+4/+5` "Z PICTURE SIZE" (:272-273),
  and comparing its LSB to 4 only parses if POSITION Z is small-scaled — which is **rb4-17's** subject
  (PICTURE SIZE vs POSITION Z). rb4-16 and rb4-17 share this seam; sequencing them apart may be wrong.
  Affects `red-baron/src/core/enemy.ts` (`windowServo`'s outer arm). *Found by Dev during implementation.*

- **Improvement** (non-blocking): `tests/audit/citations.test.ts` + `tools/audit` re-open every
  cited line byte-for-byte (epic context), yet BOTH bad citations above lived in
  `sprint/context/*` — outside the checker's reach. The audit rig only guards citations in
  `red-baron/`; sprint context and session assessments are unchecked prose. Extending the checker
  to sprint context files would have caught both errors mechanically. Candidate follow-up story.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **No deviations from spec — because no implementation was written.** The green phase stopped at the
  derivation TEA delegated ("the Math Box window scale … derive it and cite it"), which is where the
  story's premise failed. No source file was touched; the six RED tests still fail unchanged. The
  reasons are recorded as two BLOCKING Delivery Findings above, and the decision to stop rather than
  ship was a USER RULING (2026-07-17). Nothing here was simplified, substituted or deferred silently.

## Tea Assessment

**RED STATE VERIFIED: 6 failed / 1076 passed / 60 files (59 green).** Only `plonsn.test.ts` fails.
`tsc --noEmit` exit 0. `tests/audit/citations.test.ts` 13/13 green (the epic requires it). Commit
`bdd03f1` on `refactor/rb4-16-plonsn-display-space-servo`. No source file was touched.

Ran vitest directly rather than via `testing-runner`: the runner is on record fabricating test
names and misattributing failures, and a RED phase turns entirely on WHICH tests fail and WHY.
Every count above is from real output.

### The story, confirmed at the source

`enemy.ts:430-433` already confesses the bug in its own words — the ±olim clamp we ship "stands in
for PLONSN, which we do not model". The servo reads WORLD; the ROM reads DISPLAY (:2749 Y / :2867 X).
rb4-6 did not merely suspect this — it BUILT the eye-aware servo and MEASURED it (archive :589-593):
GMLEVL 4 fell to **0.0** avg frames-in-reach from the shipped 10.8, because `P_IIDL[4]/DELTA_SCALE`
= 192/4 = **48** units/frame beats the pilot's `POT_RANGE` = **40** (flight.ts:107, PAN_SCALE=1).
The plane outruns the stick by 20% and never returns. PLONSN is the bound that makes display-space
survivable — it is not optional polish, it is the load-bearing half.

### What I pinned, and what I refused to pin

| AC | Test | State |
|----|------|-------|
| AC-2 | zone flips with the eye (deltaX SIGN is a total discriminator) | RED |
| AC-2 | mirror case — a hardcoded sign fails the other | RED |
| AC-2 | `stepWave` OBSERVES the eye (names no constant) | RED |
| AC-1 | dragged WORLD written back THROUGH the pilot (:2929-2930) | RED |
| AC-1 | window anchored to the PILOT — same depth, two eyes, same edge | RED |
| AC-1 | window SCALES WITH DEPTH (:2882-2892) | RED |
| AC-1 | NEGATIVE: a plane inside the window is left alone (:2920) | GREEN (mutation-proven) |
| AC-R3 | eye threaded through `stepWave`; `>10` bar | GREEN by design (see below) |

**Left to Dev on purpose:** the Math Box window scale (`0x1A0` × depth via MRSAB0, `RESULT*^100`
:2893-2896, then PFROTN rotation through MRSLT0). Derive it and cite it. My tests pin only what the
ROM's own comment guarantees without the Math Box — proportional to depth, anchored to the pilot,
assigned to the edge. If a derivation contradicts a test, bring the citation; do not re-tune the test.

**AC-R3 is GREEN and that is correct.** It is a REGRESSION guard, not a new-feature test: it must
survive Dev's change. I threaded the eye (`stepWave(wave, lvl, toEye(flight))`) so it covers the
display-space servo in the act — rb4-6 passed no eye, which is exactly how an eye-free servo sat
under a green guard. Today's two-arg `stepWave` ignores the third arg, so it still measures the
shipped machine. **Quote 10.8, not 11.6** — 11.6 is the pre-gun hypot number (archive :235/:590);
through the REAL gun it is 10.8 (:1467), clearing the `>10` bar by 0.8 frames. `WINDOW_X/Y=32` is
inferred/playtest, so any window change moves that margin. If AC-R3 fails, it is failing HONESTLY:
fix the servo, never re-tune the bar.

**I mutation-tested the one green PLONSN guard** rather than trust it. Forced `x: 512` in `step()`
(an over-eager clamp-to-edge) → the `:2920` guard went RED; restored from a `cp` backup (never
`git checkout`), verified `git diff` empty and 0 mutation markers, CONTROL run returned 6/1. It has
teeth.

**Two of my own AC-1 tests were scenery in first draft and I rewrote them.** They asserted "the
world position changed" under a zero-X eye — and PASSED on unported code, because the ±olim stand-in
drags x from 50000 to 512 by itself and a zero eye makes world and display identical. A test a
stand-in already satisfies proves nothing. The real discriminator is the ANCHOR: ±olim pins to the
world origin; PLONSN pins to the pilot (:2909-2910, :2929-2930).

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

- **§1 `as unknown as T` double-cast** — used, deliberately, with the justifying comment the rule
  requires. It is the established rb4-6 idiom (display-space.test.ts:144-149): the contract shapes
  do not overlap the shipped ones, so a direct cast is a tsc error and the RED signal would arrive
  at COMPILE time instead of at the assertion. Dev: when the signatures land, these casts should
  narrow — flag if they cannot.
- **§1 non-null `!`** — none. Contract exports go through `need()`, which throws a named error.
- **§2 `readonly`** — honoured on every `Enemy` field and on `readonly Enemy[]`.
- **§4 `||` vs `??`** — actively load-bearing here: `P_IIDL[0] = 0` is a REAL target (a GMLEVL-0
  dead stop) and `enemy.ts:96-101` warns a `||` default would silently promote it to level 1's 48.
  My fixtures use explicit values and `?? 0`. Dev: threading an eye through `step` must not
  introduce `eye || DEFAULT` — a legitimate eye of `[0,0,0]` is falsy-adjacent per axis.
- **§3 enums** — n/a (union types only).

### Handoff to The Word Burgers (Dev)

Make the six red. Order that will hurt least: thread the eye through `step`/`stepWave` first
(AC-2 goes green, and AC-R3 will likely COLLAPSE toward 0.0 the moment the servo reads display
without a bound — that is the archive's measured result, not a bug in your work), then port PLONSN
and watch AC-R3 climb back over 10. If AC-R3 will not recover, the window derivation is wrong —
not the bar.

## Dev Assessment

**Implementation Complete:** NO — STOPPED AND HANDED BACK by user ruling (2026-07-17). The story's
coordinate premise does not survive the source, and no citable PLONSN window clears AC-R3.

**Files Changed:** none. No source file was touched. Working tree clean, branch
`refactor/rb4-16-plonsn-display-space-servo` unchanged at `bdd03f1` (TEA's RED commit).

**Tests:** 6 failed / 1 passed in `tests/core/plonsn.test.ts` — the RED state TEA handed over,
byte-for-byte unchanged. Re-run and confirmed, not assumed.

### Why I did not write the code

TEA delegated exactly one thing: "THE EXACT WINDOW SCALE … Derive it and cite it. If your derivation
contradicts a test, bring the citation — do not re-tune the test." I did the derivation. It contradicts
the tests, and I am bringing the citations. Both are BLOCKING Delivery Findings above; in short:

1. **Three spaces, not two.** The servo reads `PLSTAT+8..+B`, which the ROM names `;X SCREEN POSITION`
   (:3157/:3162) and which carries POSITH's post-divide HORIZN lift (:2750 subtracts it back off). So
   `P_OLIM`/`P_ILIM` are SCREEN units. Our `displayPos` (world − eye) is the PRE-divide quantity —
   the one PLONSN computes fresh at :2909-2913. That is WHY PLONSN scales by depth (:2886): it is the
   bridge between the two. A servo already in display-world space would need no depth scale at all.
   AC-2's premise assertions compare `|displayPos|` against `P_OLIM`/`P_ILIM`, which mixes them.

2. **The scale bottoms out on things nobody has pinned.** The Math Box multiply IS settled — `>>16`,
   from the microcode (`MBUCOD.V05:494-516`), not inferred. But `SINE = 3800` (:396) is a bare ROM
   address whose table is in no `.MAC` file, so the trig fixed-point is unreadable from the quarry.
   And I measured the whole family rather than argue it: AC-R3 recovers only for a limit coefficient
   `C ≲ 0.05`, while the literal transcription gives C≈1.58 and our own projection gives C≈0.63 — both
   score **0.0**. Green needs C≈0.025, which nothing cites. Picking it would be rb4-6 round 1's
   fabricated `sqrt(ACCEL·ilim)` wearing a better citation, in the epic that exists to kill exactly that.

The rig that produced those numbers drove the real `spawn`/`flight.step`/`guns.collides` and
reproduced rb4-6's archived 0.0 on the no-PLONSN row, which is what makes the other rows worth
quoting. It was scratch and is deleted; `git status` is clean.

**What I believe the real defect is:** our gun is a fixed ±32 world tube (`WINDOW_X/Y`, playtest),
while the ROM's gun is the plane's PROJECTED PICTURE bounding box (COLSTP :5789-5821, `DB.TRP`
min/max) and grows as the plane closes. PLONSN cannot pull a plane into a tube the ROM never had.
The screen seam (`scene.ts`'s `ROM_SCREEN_HALF` = 512, an explicit rb4-5 inference) is the thing that
wants pinning first — and it is shared with rb4-17, whose PICTURE SIZE vs POSITION Z distinction is
the same `PLSTAT+19` field the un-ported outer-zone depth gate (:2776-2781) turns on. Sequencing
rb4-16 ahead of rb4-17 may have the dependency backwards.

**Handoff:** To The Organic Mechanic (SM) — re-scope. Not to verify/review; nothing was built.

## Sm Assessment

**Story selected over rb4-17 by user ruling (2026-07-16).** The Stranger asked for rb4-17;
rb4-17's own description says "SEQUENCE AFTER rb4-16", and rb4-16 was still in backlog. Both are
p1/8pt and work the SAME display pipeline: rb4-16 servos where the plane's CENTER sits, rb4-17
sizes the PICTURE drawn around it. Ruling: rb4-16 first, so rb4-17's re-baseline lands on a
settled center instead of fighting it in `main.ts` and the shared screen-scale/depth-scale suites.
`depends_on` is null in YAML — the sequence is prose-only and NOT tooling-enforced. rb4-17 stays
in backlog and should be the next story cut.

**This is a POINTER STORY — its YAML body is intentionally empty.** `sprint/epic-rb4.yaml:266`
carries a title only: no `description`, no `acceptance_criteria`. That is deliberate (commit
b96be30: "Scope detail in sprint/archive/rb4-6-session.md"). Consequence for every downstream
agent: **`sprint/context/context-story-rb4-16.md` IS this story's acceptance criteria of record.**
There is no YAML AC list to fall back on. Read the context file, and read the rb4-6 archive's
`## Impact Summary` (:361+) for the source scope.

**Setup was verified on disk, not trusted.** Session file present; the workflow line read exactly
`tdd` (not the `tdd (phased)` spelling that breaks resolve-gate); the phase line read `setup` at
setup time — i.e. sm-setup did NOT pre-advance it to red, so no duplicate red history row needed
deduping. (The `red` value above was written by `complete-phase` at handoff, as intended. Note:
complete-phase blind-substitutes the phase token and WILL rewrite it inside prose — this sentence
is deliberately worded to survive that.)
Status `in_progress` set via CLI (no hand-edited YAML); branch `refactor/rb4-16-plonsn-display-space-servo`
cut from `develop` @ 6d5fa37 (rb4-6 PR #31 merge), tree clean, `develop` == `origin/develop`.
`sprint/context/context-epic-rb4.md` diffed against a pre-setup backup — **INTACT**, no clobber.

**SM CORRECTED THREE FABRICATED CITATIONS in the generated context — TEA read this.** The setup
subagent invented ROM line numbers. Verified against the quarry `~/Projects/red-baron-source-text/RBARON.MAC`:
- `PLONSN :2877-2937` — **VERIFIED** (`PLONSN: BIT GMEND0` @ :2877). From the commit; trustworthy.
- `:2867 ";X SCREEN POSITION"` — **WAS WRONG.** :2867 reads `;X DISPLAY`. The real
  `;X SCREEN POSITION` is **:3157** (`LDY PLSTAT+8`). Corrected in context.
- `:2749-2752 "Y clamp"` — **SM'S "CORRECTION" HERE WAS ITSELF WRONG. RETRACTED BY TEA — see the
  TEA Assessment.** SM claimed this was "not Y at all, an X-axis routine". FALSE. `:2747 LDX I,2`
  sets X=2 and `ZX` is zero-page X-INDEXED, so `:2749 LDA ZX,PLSTAT+8` reads `PLSTAT+0A` = **Y
  DISPLAY**; the ROM's `;PLSTAT+10.` is decimal 10 = 0x0A and `:2755` says `;OFFSET FOR Y DELTA`.
  rb4-6's Dev had already recorded this correctly (archive :586-588), as does `enemy.ts:114-115`.
  sm-setup's original label had the AXIS RIGHT; only the word "clamp" was wrong (it is a read +
  HORIZN normalization, not a clamp). The HORIZN-normalizes-not-displaces ruling stands.
- Archive-side citations (578-601, 371-374, 389-392) all **verified correct**.
- Added the PLSTAT convention (:266-297): `+0/+2` = WORLD, `+8/+0A` = DISPLAY — the servo reads `+8/+0A`.

**AC-R3 margin nuance the subagent flattened:** the shipped servo measures 11.6 frames-in-reach
pre-gun (archive :235/:590) but **10.8 THROUGH THE REAL GUN** (archive :1467) against a `>10` bar
— a 0.8-frame margin, not 1.6 (archive :285). Quote 10.8. `WINDOW_X/Y=32` is inferred/playtest,
not byte-pinned, so any window change moves that margin. If AC-R3 fails it is failing honestly:
fix the servo, never re-tune the bar.

**Standing hazard:** haiku subagents in this repo fabricate citations that match a TOKEN rather
than the CLAIM. Every ROM line quoted downstream must be opened before a constant is pinned.

**Handoff to Imperator Furiosa (TEA):** red phase. The deliverable is AC-R3 driving the eye
through `step`/`stepWave` — an eye-aware servo without that coverage re-creates the GMLEVL-4
soft-lock (measured 0.0 frames in reach). That is the whole story; everything else is satellite.
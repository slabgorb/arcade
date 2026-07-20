---
story_id: "jt2-9"
jira_key: "jt2-9"
epic: "jt2"
workflow: "tdd"
---
# Story jt2-9: Playtest follow-up (user, 2026-07-20): ledge seat + turning/facing + joust-facing feel + render polish

## Story Details
- **ID:** jt2-9
- **Jira Key:** jt2-9
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T22:29:42Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T20:00:00Z | 2026-07-20T20:48:54Z | 48m 54s |
| red | 2026-07-20T20:48:54Z | 2026-07-20T21:21:15Z | 32m 21s |
| green | 2026-07-20T21:21:15Z | 2026-07-20T21:42:41Z | 21m 26s |
| review | 2026-07-20T21:42:41Z | 2026-07-20T21:58:15Z | 15m 34s |
| red | 2026-07-20T21:58:15Z | 2026-07-20T22:24:11Z | 25m 56s |
| green | 2026-07-20T22:24:11Z | 2026-07-20T22:26:34Z | 2m 23s |
| review | 2026-07-20T22:26:34Z | 2026-07-20T22:29:42Z | 3m 8s |
| finish | 2026-07-20T22:29:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question RESOLVED — the joust-facing ruling (item 3): OSTBO is HEIGHT-ONLY, facing is NOT a term, ROM-canonical.** `JOUSTRV4.SRC:5002-5017` (verbatim, read this phase) compares `(PLANTZ,X + PPOSY,X) − (PLANTZ,U + PPOSY,U)` with ZERO `PFACE` references; `BEQ`→both bounce, `BMI`→lower `PLANTZ+wholePixelY` wins. So "colliding backwards WINS even when faced wrong" IS ROM-authentic — `resolveJoust` (`joust.ts:204-220`) is already correct and must NOT gain a facing term. Facing decides a joust only INDIRECTLY: pointing wrong → skid → `PLANTZ=2` (`SRCSKP` :6069-6072) → lower → lose. The real fix is item 2 (make the skid reachable), pinned by the height-only ruling guards in `demo-jt2-9.test.ts` (mutation-verified to bite a facing-wins fix). The only *wrong* artefact is the dossier prose `subsystems.md:137-139` ("fraction included") — the landed jt2-8 chore already corrects that. *Found by TEA during test design.*
- **Conflict** (non-blocking): item 4a (per-tier z-depth) — the story's candidate AC assumed a **citable per-platform depth**; the ROM has NONE. `BCKUP` (`JOUSTRV4.SRC:993-1014`) draws the background ONCE and refreshes a disturbed cliff reactively via a `BCKRFS` dirty flag (`:6799-6801`) — a static backdrop + per-cliff refresh, no z-order field on the background records at all. So `demo.ts:614 isForegroundArena`'s single `destY >= 0xC0` threshold is the best available **demo/shell choice**, not a transcribed ROM constant — it should be DOCUMENTED as such (CLIF5's architectural distinctness — compacted `COMCL5`, separately un-compacted, excluded from the manual `CLIF1L..CLIF5` loop — is consistent with singling it out but does not *derive* 0xC0). No hard rail written; the existing round-2 rail 2c ("foreground occludes entities") already pins the user-visible behaviour. Affects `src/core/demo.ts` (`isForegroundArena` comment). *Found by TEA during test design.*
- **Gap** (non-blocking): item 4c (run cadence) — the ground-state `wait` byte (the ROM's `PTIMX` cadence: `PLYCR=8 / PLYDR=4 / PLYER=2 / PLYFR=1`, an ACCELERATING gait; `UPDNO2` :5989-6003, table :7163-7175) is transcribed on every `GROUND_STATES` row but is **completely unused**: `flight.ts:344-358 stepGround` advances `animPhase` by one on EVERY call, so the run animation always plays at the ROM's FASTEST cadence regardless of run state. The story explicitly descopes exact speed ("not the gait speed — tune to the ROM/feel"), so NO hard cadence rail was written (round-2 rail 2a already pins ≥2 distinct BRRUN frames). Follow-up: gate the phase/position advance behind a per-entity `PTIMX` countdown seeded from `current.wait`, separate from the `EMYTIM`/scheduler wake period. Affects `src/core/flight.ts` (`stepGround`) + `EntityState` (needs a `PTIMX` field). *Found by TEA during test design.*
- **Improvement** (non-blocking): item 5b (BWNG debt) — `BWNG1R`/`BWNG2R` remain `ENTITY_RECORDS` names with no `COLLISION_TABLES` entry (jt1-3 transcription debt); live `collisionMaskFor` correctly uses the existing `BWNG3R`, so there is no live-code bug. Left as a tracked jt1-3-debt follow-up (the story marks it optional); no test written. Affects `src/core/pictures.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking → Dev briefing): the render must apply each frame's transcribed **POSOFF** `position` word, which `drawList`/`blitOp` ignore entirely today — `destX = posX + XOFF`, `destY = (posY>>8) − YOFF` where `XOFF = position>>8`, `YOFF = 256 − (position & 0xff)` (ROM `WRHOR2` `JOUSTRV4.SRC:6092-6098`; `POSOFF` macro `JOUSTI.SRC:12-13`). This ONE fix closes item 1 (feet lifted YOFF≈13–19px above the ledge) AND item 4b (mount/rider carry different POSOFFs → different offsets). Affects `src/core/demo.ts` (`drawList` — import `ENTITY_RECORDS`, apply per-frame offset). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking → RESOLVED this story): USER live playtest (2026-07-20) — **both players rendered yellow**. `playerDrawList` hardcoded the rider frame `'PLYR1'` for BOTH players (only the mount differed). The rider records are the same 7×7 shape in different colours — `PLY1R` is colour index 5, `PLY2R` colour index 7 (verified by nibble histogram + the served-module render) — i.e. `PLYR1`/`PLYR2` ARE the ROM's two-player colours. Fixed: P2 (stork mount) rides `PLYR2`. Rail `demo-jt2-9.test.ts` "item 2d" added (Dev-authored, user-driven — Reviewer confirm). Affects `src/core/demo.ts` (`playerDrawList`). *Found by Dev during implementation (user playtest).*
- **Improvement** (non-blocking): the facing wiring lives on the PROCESS (`DemoProcess.facing` / `ProcessSpec.facing`), never on the generated `EntityState`, and `stepGround` gained an OPTIONAL `facing` param (legacy 2-arg callers unchanged). This keeps the routing≠geometry divergence pin bit-exact (a solo `stepFrame` run computes the identical entity — facing changes only the process). Enemy ground-stepping stays facing-blind (unchanged, out of scope). Affects `src/core/frame.ts` / `src/core/flight.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): the stork mount frames (`SFLY1R`/`SRUN1R`..`SRUN4R`/`SRUNSR`) have no `ENTITY_RECORDS` entry, so the POSOFF fix silently no-lifts P2's mount — a 17px rider/mount gap + clipped stork feet (items 1 & 4b unfixed for P2). The ROM has the POSOFFs (`JOUSTI.SRC:782-796`: SFLY1R $00ED→19, SRUNSR $00EE→18, SRUN*R $00ED→19). Affects `src/core/pictures.ts` (transcribe the stork mount records) + `tests/demo-jt2-9-anchor.test.ts` (add a P2/stork rail). *Found by Reviewer during code review.*
- **Gap** (non-blocking): three test-quality gaps (mutation-proven by the test-analyzer): the long-run events test (`demo-jt2-9.test.ts:338`) is vacuous under neutral input; the source-wiring gated-flip check (`demo-jt2-9-source.test.ts:47`) passes an unconditional-mirror mutant; the neutral-facing test (`demo-jt2-9.test.ts:136`) only covers a right-facer. Affects the three test files (strengthen the assertions). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `posOffset`'s silent `{0,0}` fallback for an unknown frame is a latent trap (a typo'd frame name would draw at raw feet Y with no error); once the stork records land, consider making the comment honest or asserting known frames resolve. Affects `src/core/demo.ts` (`posOffset`). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Item 3 pinned with GREEN ruling guards, not RED rails**
  - Spec source: context-story-jt2-9.md, candidate AC-3 ("ruling on OSTBO + facing … verified against ROM")
  - Spec text: "verify against the ROM BEFORE changing any law … document the ruling either way"
  - Implementation: the ROM verification found the joust is already height-only (facing-independent, ROM-canonical), so item 3 is a ruling to PRESERVE — pinned by three guards that pass NOW and RED under a facing-wins mutant (mutation-verified this phase), not by red rails
  - Rationale: a correct-already ruling has no feature to build red; the honest pin is a mutation-verified guard that stops a well-meaning "face-toward-wins" fix from corrupting the ROM law
  - Severity: minor
  - Forward impact: Dev makes NO change to `resolveJoust`; the "backwards loses" feel comes entirely from item 2's skid wiring
- **Item 4a (per-tier z-depth) — test OMITTED (underivable)**
  - Spec source: context-story-jt2-9.md, candidate AC-4 ("per-tier z-depth derived from dossier and tested per platform")
  - Spec text: "dossier-cite the real per-platform depth"
  - Implementation: no per-tier depth test — the ROM has no per-platform depth field or z-order mechanism (static background + reactive `BCKRFS` refresh, `JOUSTRV4.SRC:993-1014`/:6799-6801); the `destY>=0xC0` threshold stays as a DOCUMENTED demo choice, and round-2 rail 2c already pins the user-visible "foreground occludes" behaviour
  - Rationale: writing a test that demands a "real per-platform depth" would force fabricating an underivable constant — the opposite of fidelity
  - Severity: minor
  - Forward impact: Dev documents `isForegroundArena`'s threshold as a shell/demo choice (not a ROM law); recorded as a Delivery Finding conflict
- **Item 4c (run cadence) — hard cadence test OMITTED (story descope)**
  - Spec source: context-story-jt2-9.md, item (4) ("run-frame cadence … not the gait speed — tune to the ROM/feel")
  - Spec text: "rail pins >=2 distinct BRRUN frames, not the gait speed"
  - Implementation: no wait-gated cadence rail (round-2 rail 2a already pins ≥2 distinct frames); the ROM-authentic `wait`/`PTIMX` cadence gap is logged as a Delivery Finding + follow-up rather than hard-pinned
  - Rationale: the story explicitly excludes pinning the gait speed and routes cadence to the user's playtest; hard-pinning `wait`-gating would also force an `EntityState`/`PTIMX` change beyond the 3-pt budget
  - Severity: minor
  - Forward impact: Dev tunes cadence to feel; a `PTIMX` follow-up story is recommended (Delivery Finding)
- **Items 1/4b + 2c pinned as pure DATA seams (drawList output / DrawOp.facing), not shell blit behaviour**
  - Spec source: epic-jt2 routing≠geometry discipline; context-story-jt2-9.md items (1)(2)(4b)
  - Spec text: "pin SELECTION/COMPOSITION/ORDER/FACING as pure DATA (the routing≠geometry lesson)"
  - Implementation: the POSOFF offset is pinned on `drawList`'s emitted `op.x/op.y`, and the facing flip on a new `DrawOp.facing` field (the contract `demo-contract.ts` was grown by +1 optional field), so both are canvas-free DATA pins; only the horizontal MIRROR itself (a `scale(-1)`) is pinned as `main.ts` source text
  - Rationale: the shell cannot be unit-tested without a canvas; pinning the offset+facing as pure data is the routing≠geometry lesson the jt2-7 Reviewer already applied
  - Severity: minor
  - Forward impact: Dev applies POSOFF inside pure `drawList` (imports `ENTITY_RECORDS`) and populates `op.facing`; `main.ts` blitOp reads `op.facing` and mirrors
- **Item 5b (BWNG dangling refs) — test OMITTED (tracked jt1-3 debt)**
  - Spec source: context-story-jt2-9.md, item (5) leftovers
  - Spec text: "BWNG1R/BWNG2R dangling collision-table refs (jt1-3 debt)"
  - Implementation: no test — live `collisionMaskFor` already uses the existing `BWNG3R`, so there is no live-code bug; recorded as a tracked Delivery Finding
  - Rationale: the story marks it optional and it is a pre-existing transcription artifact, not a jt2-9 regression
  - Severity: minor
  - Forward impact: a jt1-3-debt follow-up may transcribe the missing wing collision tables

### Dev (implementation)
- **Facing threaded via an OPTIONAL `stepGround` param + process facing, NOT by swapping to `joust.ts groundStep`**
  - Spec source: Tea Assessment, Dev briefing step 1 ("swap the call sites from flight.ts stepGround to joust.ts groundStep/groundTransition")
  - Spec text: "swap the call sites (frame.ts:198, enemy.ts:312) … to use joust.ts's facing-aware groundStep/groundTransition"
  - Implementation: extended `flight.ts stepGround` with an optional `facing` param (facing-aware `onMinus` when supplied, legacy `onPlus` when absent) rather than swapping to `joust.ts groundStep` — the latter does the state transition + PLANTZ but NOT the `animPhase` cycle or the `ORRUN` posX delta, so a swap would silently drop the gait. Threaded `p.facing` from `frame.ts runBehaviour`; enemy.ts left on the 2-arg legacy call.
  - Rationale: `groundStep` is an incomplete subset; extending the complete `stepGround` in place is the minimal change that reaches the skid AND preserves the run gait + the divergence pin
  - Severity: minor
  - Forward impact: `stepGround`'s 3rd arg is the seam a future enemy-facing-turn story would use; the `joust.ts groundStep`/`groundTransition` pair is now redundant with the wired path (a later cleanup could retire it)
- **DemoState.events CAPPED to the last 32, not drained-on-consume**
  - Spec source: context-story-jt2-9.md item (5a); Tea briefing step 3 ("Cap (keep last K) or drain per-frame")
  - Spec text: "cap/drain DemoState.events once consumed"
  - Implementation: `stepDemo` slices the log to its last `EVENT_LOG_CAP = 32`; `main.ts` is NOT changed to consume/drain
  - Rationale: scoring DISPLAY is jt4, so nothing consumes the log yet — a cap is the minimal fix that stops the leak while keeping the current frame's kill/beat observable (jt2-7 rail-1 stays green); a drain would need a main.ts consumer that does not exist until jt4
  - Severity: minor
  - Forward impact: jt4's score display should switch to a drain (read the events each frame) when it lands
- **Dev authored a test rail (item 2d) for a user-playtest bug**
  - Spec source: TDD phase ownership (TEA writes rails, Dev greens)
  - Spec text: the red rails are TEA's; Dev makes them green
  - Implementation: the user's live playtest surfaced "both players yellow" AFTER the RED handoff; Dev added the `demo-jt2-9.test.ts` "item 2d" rail (proven red first) then greened it, mirroring the jt2-7 round-2 precedent (user-driven mid-flow fixes)
  - Rationale: the bug appeared during Dev's in-browser verification of a render story whose whole purpose is user playtest feedback; deferring it would ship a visibly-broken 2P render
  - Severity: minor
  - Forward impact: Reviewer should confirm the rail bites (P2≠P1 rider) and the fix is faithful (PLYR2 is the colour-swapped record, not a pose)

### Reviewer (audit)
- **TEA — item 3 pinned with GREEN ruling guards** → ✓ ACCEPTED: the joust IS height-only/ROM-canonical (JOUSTRV4.SRC:5002-5017, no PFACE); the guards are mutation-verified (test-analyzer independently re-reddened them under a facing-wins mutant). Correct shape for a preserve-the-ruling item.
- **TEA — item 4a (per-tier depth) test OMITTED (underivable)** → ✓ ACCEPTED: the ROM has no per-tier depth field (static background + reactive `BCKRFS`); the threshold is now documented in-code as a demo choice. Honest handling of an underivable value.
- **TEA — item 4c (run cadence) hard test OMITTED (story descope)** → ✓ ACCEPTED: the story text explicitly says "not the gait speed"; the `wait`/PTIMX gap is logged as a follow-up finding rather than gold-plated in a 3-pt story.
- **TEA — items 1/4b/2c pinned as pure DATA seams** → ✓ ACCEPTED in principle (routing≠geometry) — BUT the DATA rail for item 4b only exercised the OSTRICH; the stork path was uncovered (see finding #1 + the undocumented deviation below). The seam choice is right; the coverage was incomplete.
- **TEA — item 5b (BWNG debt) test OMITTED** → ✓ ACCEPTED: pre-existing jt1-3 artifact, live code uses BWNG3R, tracked.
- **Dev — facing via an OPTIONAL `stepGround` param, NOT a swap to `joust.ts groundStep`** → ✓ ACCEPTED: `groundStep` is an incomplete subset (no animPhase/ORRUN delta); extending the complete `stepGround` preserves the gait AND the divergence pin. Verified legacy-preserving (`flight.ts:337-344`).
- **Dev — `DemoState.events` CAPPED (32), not drained-on-consume** → ✓ ACCEPTED: minimal, keeps this frame's kill observable; jt4's score display should switch to a drain. (Note finding #2: the *long-run* test doesn't prove the cap — but the cap itself is sound.)
- **Dev — Dev-authored the item-2d rail for a user-playtest bug** → ✓ ACCEPTED: user-driven mid-flow (jt2-7 round-2 precedent), proven red-first, faithful (PLYR2 is the colour-swapped record — nibble 5→7 — not a pose; independently confirmed).
- **UNDOCUMENTED (Reviewer-spotted):** the item-1/4b POSOFF change (Dev deviation "POSOFF in drawList") is INCOMPLETE — it silently no-lifts any frame lacking an `ENTITY_RECORDS` entry, and the STORK MOUNT frames (`SFLY1R`/`SRUN*R`/`SRUNSR`) are exactly that case, so P2's mount is unfixed. Spec (item 1 "feet on ALL ledges", item 4b "mount+rider alignment") says lift all sprites / align both mounts; code lifts only the recorded frames. Not disclosed by Dev. Severity: HIGH (finding #1).

## Sm Assessment

Setup verified ON DISK (not just the subagent's word): session file present with a bare workflow field and a single setup phase-history row at the setup phase — no pre-advanced-red trap; branch `feat/jt2-9-playtest-followup` cut off joust `develop` @ `a755096` (jt2-7's merge #24, tree clean, 0/0 with origin), story moved to `in_progress`, context `sprint/context/context-story-jt2-9.md` written (md5 `8c779d39…`).

**Provenance of this story:** jt2-9 IS the tracked catch-all for the jt2-7 round-2 Reviewer's "Remaining items + USER PLAYTEST flags" plus the ledge-seat / joust-facing-feel observations from the live playtest. All five sub-items are fixable from data already transcribed (ENTITY_RECORDS, COLLISION_TABLES, the jt2-3 ground state machine that is LANDED + TESTED but unreachable from input) — the working hypothesis is **no new ROM law**, but items (1),(3),(4) require real dossier derivation, not eyeballing.

**Citation hygiene checked:** the one ROM line in the context (`JOUSTRV4.SRC:5002-5012`, item 3) is a FAITHFUL re-quote of jt2-3's real OSTBO block in `epic-jt2.yaml` — verified present, not fabricated/widened (my standing sm-setup-fabricates-citations guard). No seat-Y / z-depth numbers were invented; those are marked "TEA/Dev to derive."

**Flag for TEA — the live tension on item (3):** jt2-3's prose says OSTBO compares "(PLANTZ + PPOSY) FRACTION INCLUDED", while jt2-8 (a landed chore) corrects it to "WHOLE PIXELS + PLANTZ, fraction EXCLUDED". The story's own hypothesis is that the backwards-collision-wins feel is really symptom of item (2) (facing never flips, so the player can't point the right way) — NOT an OSTBO law error. ROM is canonical: verify against the ROM BEFORE changing any joust law, and document the ruling either way. Do not re-derive a citation from a sed window.

**Scope note:** 3 pts, five sub-items, some UX-feel (run cadence, mount alignment) that is screenshot/playtest-verified at finish, not test-pinnable — pin SELECTION/COMPOSITION/ORDER/FACING as pure DATA (the routing≠geometry lesson the jt2-7 Reviewer already applied), leave "looks right" to the user's final playtest.

Peloton continues. Next owner is TEA (Leeloo) for RED.

## Tea Assessment

**Tests Required:** Yes

**ROM ground truth established this phase (archaeology, all citable):** JOUSTRV4.SRC (shipped rev) + JOUSTI.SRC/RAMDEF.SRC at `reference/williams-source/joust/`. The five items resolved to **no new ROM law** — every fix consumes already-transcribed data. Six findings drove the rails (see Delivery Findings): POSOFF is the render's `position` word (WRHOR2 6092-6098); air facing is `AIROVR` PFACE=sign(dir) (6451-6481); the ground skid is `joust.ts groundStep` (jt2-3, landed+tested, **zero callers in src/**); OSTBO is height-only (5002-5017, no PFACE); per-tier depth is UNDERIVABLE; the run `wait` cadence is transcribed-but-unused.

**Test Files:**
- `tests/demo-jt2-9.test.ts` — item 2 (air PFACE flip via stepDemo; ground skid-chain reachability; drawList carries facing), item 3 (three height-only ruling guards), item 5a (events capped/drained).
- `tests/demo-jt2-9-anchor.test.ts` — items 1 + 4b: `drawList` applies each frame's POSOFF `position` (YOFF derived FROM `ENTITY_RECORDS`, never hand-typed) so the sprite is lifted onto the ledge and the mount/rider sit at their own offsets.
- `tests/demo-jt2-9-source.test.ts` — item 2 blit half: `main.ts` reads `op.facing` and horizontally mirrors (`scale(-1,…)`), gated on facing (the canvas op, pinned as text per the demo-source.test.ts idiom).
- `tests/helpers/demo-contract.ts` — grew `DrawOp` by one optional field: `facing?: Facing` (routing≠geometry — the flip is DATA the shell blits from).

**Tests Written:** 17 (11 RED rails + 6 GREEN guards/controls) across 4 candidate ACs (1,2,4,5) + the item-3 ruling.
**Status:** RED — verified by DIRECT `npx vitest run` (testing-runner confabulates names; direct is authoritative): full suite **11 failed | 1024 passed (1035)**; `tsc --noEmit` exit 0. Baseline 1018 all still green; the 6 new green guards + 1018 = 1024. Every RED is a clean wrong-value/feature-absent assertion (e.g. `expected 210 to be 197` for POSOFF; `expected 1 to be -1` for facing; `200 ≤ 64` for the leak), NOT a staging/import trace — the 2b skid rail's `stayedGrounded` precondition passes, so its RED is a genuine skid gap.

### Rule Coverage (joust = TypeScript · Vitest; the repo's own gates are the rubric)
| Rule / gate | Test(s) | Status |
|-------------|---------|--------|
| routing≠geometry (pin DATA not calls) | POSOFF offset on `drawList` op.x/op.y; `op.facing` on entity ops | red |
| render from TRANSCRIBED data only | POSOFF YOFF derived from `ENTITY_RECORDS.position` (not hardcoded) | red (derivation cross-checked: BRSTND 13 / ORSTND 19 / PLYR1 17) |
| ROM-canonical law preserved (no gold-plating) | item-3 height-only ruling guards | green-guard (mutation-verified: a facing-wins mutant reds all 3; control clean, `git diff` empty) |
| meaningful-assertion self-check | all rails assert coords/values/winners/counts; `.toBeTruthy()` are existence preconditions before concrete asserts | pass |
| core/shell purity boundary | POSOFF applied in pure `drawList`; `DrawOp.facing` is data (no shell import) — the jt1-7 sweep still covers demo.ts | green (Dev must keep demo.ts CORE) |
| no invented colours (denylist) | the fix adds a `scale(-1)` transform + a numeric offset — no colour literals | green-guard (demo-source denylist still covers main.ts/demo.ts) |

**Rules checked:** the repo's own gates (above) drove design; the generic TS lang-review checklist is Dev's tsc/review surface (no `as any`, `.js` extensions, `as const` not `as any` — all clean in the new files).
**Self-check:** 0 vacuous tests. No `let _=`/`assert(true)`; the four `.toBeTruthy()` are setup preconditions guarding a following value assertion.

**Dev briefing (GREEN):**
1. **Facing (item 2) — thread `p.facing` into the player step + flip from input.** Air: PFACE = sign(input.dir) every airborne frame when dir≠0, hold on neutral (`AIROVR`, JOUSTRV4.SRC:6451-6481). Ground: swap the call sites (`frame.ts:198`, `enemy.ts:312`) from `flight.ts`'s facing-BLIND `stepGround` to `joust.ts`'s facing-AWARE `groundStep`/`groundTransition` (already landed+tested) — this needs the stepped state to carry facing. Then in `drawList`, set `op.facing` from the process facing on every ENTITY op; and in `main.ts blitOp`, mirror horizontally (`ctx.scale(-1,1)` in a save/restore, or negative-axis draw) GATED on `op.facing === -1`.
2. **POSOFF render (items 1 + 4b) — apply each frame's `position` in pure `drawList`.** Import `ENTITY_RECORDS`; for an entity op with frame `name`, `pos = ENTITY_RECORDS.find(r=>r.name===name).position`, `op.x = posX + (pos>>8)`, `op.y = (posY>>8) − (256 − (pos & 0xff))` (ROM `WRHOR2` 6092-6098). Keep `drawList` CORE (ENTITY_RECORDS is data).
3. **Events cap (item 5a).** Cap (keep last K, K≤64) or drain per-frame in `stepDemo`; keep jt2-7's kill/beat emission observable the frame it fires (rail-1 in demo-round2 must stay green).
4. **NO change to `resolveJoust` (item 3).** Height-only is ROM-canonical; the guards will red if you add a facing term. "Backwards loses" comes from item 1's skid making `PLANTZ=2` reachable.
5. **Deferred (documented, NOT this story): item 4a** (per-tier depth is underivable — document the threshold as a demo choice), **item 4c** (`wait`/PTIMX cadence follow-up), **item 5b** (BWNG jt1-3 debt). See Delivery Findings.
6. Keep the purity + denylist gates green; run the user's final playtest at finish for the feel items (mount alignment, run gait, all-tier z-order, facing).

**Handoff:** To Dev (Korben Dallas) for GREEN. Branch `feat/jt2-9-playtest-followup`, RED at `d1f628c` (pushed).

## Dev Assessment

**Implementation Complete:** Yes — all RED rails green, the user's live "both players yellow" bug fixed, zero sibling regressions.

**Files Changed:**
- `src/core/flight.ts` — `stepGround` gains an OPTIONAL `facing` param: a reversal (dir against facing) now reaches the `onMinus` skid chain (PLANTZ 2), which was unreachable while the step was facing-blind. Legacy 2-arg callers (the direct flight/ground-locomotion tests, enemy.ts) are byte-for-byte unchanged. Fixed the stale "onMinus is unreachable" comment.
- `src/core/frame.ts` — `ProcessSpec` grows `facing?`; `runBehaviour` steps the player with the CURRENT facing (so a ground reversal skids this frame) then flips PFACE from input (`AIROVR`: PFACE = sign(dir), hold on neutral). Facing lives on the PROCESS, so a solo `stepFrame` run computes the identical ENTITY — the routing≠geometry divergence pin stays bit-exact.
- `src/core/demo.ts` — `drawList` applies each entity frame's transcribed **POSOFF** (`destY = feetY − YOFF`, `destX = posX + XOFF`, decoded from `ENTITY_RECORDS.position`) so feet sit on the ledge and the mount/rider take their own offsets; tags every entity op with `facing`; `DrawOp` grows `facing?`; `EVENT_LOG_CAP = 32` bounds the event log; `playerDrawList` rides P2 on `PLYR2` (colour 7) vs P1 on `PLYR1` (colour 5) — the "both yellow" fix; `isForegroundArena` documented as a demo choice (per-tier depth underivable).
- `src/main.ts` — `blitOp` mirrors a left-facer (`op.facing === -1` → `scale(-1,1)` about the sprite width); right-facers blit unchanged.
- `tests/demo-jt2-9.test.ts` — added the "item 2d" rail (P1≠P2 rider colour), Dev-authored for the user-playtest bug (Design Deviation logged).

**Tests:** 1036/1036 passing (32 files) — GREEN. Real vitest `Test Files 32 passed (32)`, `Tests 1036 passed (1036)`. `tsc --noEmit` exit 0. `npm run build` (tsc + vite) clean — 18 modules. Baseline 1018 + the 17 jt2-9 rails + the item-2d rail = 1036; **zero sibling regressions** (the divergence pin, flight/ground-locomotion, jt2-3 joust, jt2-7 demo suites all stayed green after the shared-scheduler change — I ran the FULL suite, not just the story files).

**Item 3 (ruling):** `resolveJoust` UNTOUCHED — height-only is ROM-canonical; the three ruling guards stay green (and red under a facing-wins mutant, TEA-verified).

**Browser run-and-see** (spare port **5289**, ownership proven via `lsof -a -p <pid> -d cwd` → `/Users/slabgorb/Projects/a-2/joust`; did NOT touch the sibling's 5279): drove the ACTUAL served `demo.ts` in-page —
- POSOFF: a grounded buzzard op is `y=197` (feet 210 − YOFF 13); the ostrich mount `y=191` (−19) and the PLYR* rider `y=193` (−17) sit at different offsets (191 ≠ 193) — feet on the ledge, mount/rider aligned;
- facing: 4 frames of LEFT input flips the player to `facing=-1` and its draw op carries `facing=-1`;
- P2 colour: `playerDrawList` returns P1 `[…, PLYR1]` / P2 `[…, PLYR2]` — riders differ; the live canvas shows 15 distinct bright colours (was both-yellow).
- Only console output: a benign `favicon.ico` 404 + a `getImageData` readback perf hint from my own probe — zero application errors.

**Branch:** feat/jt2-9-playtest-followup (pushed)
**Commit:** `f68a621` (GREEN, on top of RED `d1f628c`)

**Handoff:** To Reviewer (Jean-Baptiste Emanuel Zorg). Flag for scrutiny: (1) the shared-scheduler facing change — confirm the divergence pin stays bit-exact and the optional-param `stepGround` leaves legacy callers untouched; (2) the POSOFF decode (`YOFF = 256 − (position&0xff)`) against the ROM `WRHOR2`/`POSOFF` macro; (3) the Dev-authored item-2d rail (faithful, bites P2≠P1); (4) the event-log CAP (vs drain) choice; (5) item 3 resolveJoust genuinely untouched. The feel items (mount alignment, run gait, all-tier z-order, facing direction) are the USER's final playtest at finish.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1036/1036 green, tsc 0, build clean, tree clean, branch 2 ahead/0 behind develop, no debug/TODO smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (posOffset missing-record → the HIGH stork finding) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (the silent `{0,0}` fallback masks the stork gap) |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3 (all mutation-verified, repo untouched via scratch copies) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (misleading posOffset comment; uncited colour claim) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (facing typed `-1\|1`/`Facing` consistently — VERIFIED) |
| 7 | reviewer-security | Yes | clean | none | N/A — no I/O, no new deps, purity preserved, index/OOB cases handled |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (facing threading + posOffset/entityOp minimal — VERIFIED) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 16 rules / 42 instances / 0 violations; purity + denylist gates re-run green; 2 LOW nits noted |

**All received:** Yes (4 enabled returned; 5 disabled via settings, their domains assessed by Reviewer)
**Total findings:** 4 confirmed (1 HIGH Reviewer + 3 MEDIUM test-analyzer), 0 dismissed, 2 LOW noted

## Reviewer Assessment

**Verdict:** REJECTED

The suite is 1036/1036 green and three specialists are clean — and that is exactly the trap the story warned about. The user's playtest just flagged P2 ("both players yellow"); Dev fixed the colour, but the SAME player has a second, measurable render defect the green suite hides: **P2's stork mount is not POSOFF-lifted**. My independent read of the render path found it; a runtime probe (via `tsx`, repo untouched) proved it; the ROM confirms the fix. One player renders correctly, the other floats.

**Data flow traced:** `createWaveDemo` → P2 process (`mount:'stork'`, `facing:-1`) → `drawList` → `playerDrawList` returns `[mountFrame('stork',…), 'PLYR2']` → `entityOp(name, posX, feetY, facing)` → `posOffset(name)`. For the RIDER `PLYR2`, `ENTITY_RECORDS.find` hits (position 751 → YOFF 17) so `op.y = feetY−17`. For the MOUNT `SRUNSR`/`SFLY1R`, `ENTITY_RECORDS.find` MISSES (they are `PIXEL_BLOCKS`, never transcribed as entity records) → `posOffset` returns the silent `{0,0}` → `op.y = feetY`. Probe (feet=210): `ORSTND y=191 / PLYR1 y=193` (P1 aligned, 2px) vs `SRUNSR y=210 / PLYR2 y=193` (**P2: 17px gap**, stork feet clip the ledge). The ROM HAS these POSOFFs — `JOUSTI.SRC:782-796`: `FDB CWNG1R,$00ED,SFLY1R` (YOFF 19), `FDB CSKIDR,$00EE,SRUNSR` (YOFF 18), `SRUN1-4R $00ED` (YOFF 19) — they were simply never transcribed.

### Findings

| # | Severity | Finding | Location | Ruling |
|---|----------|---------|----------|--------|
| 1 | [HIGH] `[EDGE]`/`[SILENT]` | **P2's stork mount is not POSOFF-lifted → items 1 (feet) + 4b (mount/rider alignment) are UNFIXED for P2.** The stork mount frames (`SFLY1R`,`SRUN1R`..`SRUN4R`,`SRUNSR`) have no `ENTITY_RECORDS` entry, so `posOffset` silently returns `{0,0}` and `drawList` draws them at raw feet Y while the `PLYR2` rider lifts 17px — a 17px gap (rider floats above the stork; stork feet clip the ledge). Runtime-probe-confirmed. The item-4b anchor rail only exercises the ostrich (P1), so this shipped green. | `src/core/demo.ts:661` (`posOffset`); missing records in `pictures.ts ENTITY_RECORDS` | **CONFIRMED. Blocking.** Dev: transcribe the stork mount POSOFF records (JOUSTI.SRC:782-796, sources already exist as PIXEL_BLOCKS). TEA: add a P2 (stork) anchor rail (mount lifted + aligned with PLYR2) so P2 can never regress green again. |
| 2 | [MEDIUM] `[TEST]` | **"the log stays bounded across a long run" (demo-jt2-9.test.ts:338) is vacuous.** Neutral input over 400 frames accrues only 2 events, so it passes with OR without the cap (mutation-proven by test-analyzer). The seeded-200 companion (line 317) carries item 5a; this one distinguishes nothing. | `tests/demo-jt2-9.test.ts:338` | **CONFIRMED (my own RED-phase note flagged the risk).** TEA: seed a large log into the long run, or assert against `EVENT_LOG_CAP` directly. |
| 3 | [MEDIUM] `[TEST]` | **The source-wiring "gated on facing" check (demo-jt2-9-source.test.ts:47) passes an UNCONDITIONAL-mirror mutant.** A blitOp that flips EVERY sprite (a real regression) with a bare `op.facing` token near the transform satisfies all three text matches (mutation-proven). It proves a word is near a transform, not that the mirror is conditioned on facing's VALUE. | `tests/demo-jt2-9-source.test.ts:47` | **CONFIRMED.** TEA: tighten to the conditional shape (`/if\s*\(\s*op\.facing\s*===\s*-1/`) or document the residual text-idiom gap. |
| 4 | [MEDIUM] `[TEST]` | **"neutral input does NOT change facing" only tests a right-facer.** A mutant resetting facing to `1` on neutral survives because the start facing (1) coincides (mutation-proven). | `tests/demo-jt2-9.test.ts:136` | **CONFIRMED.** TEA: add a LEFT-facer neutral case (mirror of the sustained-left-then-right pairing). |
| 5 | [LOW] `[DOC]` | The `posOffset` comment ("Unknown frames (no record) take a zero offset") frames the silent no-lift as harmless — but a live player's MOUNT hits it. And `playerDrawList`'s "colour-5/colour-7" claim lacks an adjacent citation (rule-checker nit; the PLY1R/PLY2R records carry JOUSTI.SRC:2046/2076 anchors). | `src/core/demo.ts:660,631` | **NOTED.** Fold into finding #1's fix (the comment stops being "unknown/harmless" once the stork records exist); add the citation. |

### Verified good (adversarial checks that held)

- `[SEC]` **Purity + no I/O** — `demo.ts` imports `ENTITY_RECORDS` from `pictures.js` (pure transcribed data, zero imports); no clock/entropy/browser surface added; the jt1-7 purity scanner re-runs green. Evidence: rule-checker rules 14-15, `tests/purity.test.ts` 64/64.
- `[RULE]` **Lang-review clean** — 16 rules / 42 instances / 0 violations; `.js` extensions present, no `as any`, `??` not `||` on nullables, `posOffset`/`blitOp` missing-cases guarded. Evidence: reviewer-rule-checker full enumeration.
- `[TYPE]` **facing typed `-1 | 1` / `Facing` consistently** across `ProcessSpec.facing`, `DrawOp.facing`, `stepGround`/`stepPlayerEntity` params, and the `?? 1` fallbacks — no stringly-typing, no unsafe cast. Evidence: `frame.ts:90`, `demo.ts:128`, `flight.ts:327`. (Minor: inline `-1|1` vs the `Facing` alias — pre-existing style, not this diff.)
- `[SIMPLE]` **Minimal implementation** — the facing threading is an optional param + a process field + a post-step flip; `posOffset`/`entityOp` are small pure helpers. No over-engineering, no dead code. Evidence: the 4-file, +116/-26 diff.
- `[TEST]` **The load-bearing rails are honest** — the item-3 ruling guards bite a facing-wins mutant (test-analyzer re-verified); the item-2b skid rail drives real `PlayerInput` through `stepDemo` and proves REACHABILITY (not settability); the POSOFF anchor tests derive YOFF from `ENTITY_RECORDS`, never hardcode; the seeded-200 events test (line 317) genuinely proves unboundedness. Evidence: test-analyzer confirmations.
- **Divergence pin holds** — facing lives on the PROCESS; a solo `stepFrame` run computes the identical ENTITY (the drive pin `demo.test.ts:189` stays green). VERIFIED: `frame.ts:238` sets `facing` on the process, never the entity; the entity is `stepPlayerEntity(entity, input, facing)` identical for demo and solo.
- **flight.ts legacy preservation** — the 2-arg `stepGround` path (`facing === undefined ? onPlus : …`) is byte-identical to the old `input.dir !== 0 ? onPlus : onZero`. VERIFIED: `flight.ts:337-344`; the direct ground-locomotion tests (2-arg) stay green.

### Devil's Advocate

Argue this ships broken. A user boots the 2-player demo — the whole point of this playtest-follow-up. Player 1 (yellow, ostrich) looks perfect: feet on the ledge, knight seated on the bird. Player 2 (the buff knight, stork) looks *wrong in a new way*: the knight hovers a full 17 pixels above his bird, and the stork's legs sink through the platform. Before this story, both players sat low but TOGETHER (mount+rider stacked); now P1 is fixed and P2 is visibly disjointed — a regression on the exact "does the rider sit on the mount" question the jt2-7 Reviewer explicitly reserved for the user ("both mounts, both facings"). The green suite is no defense: the item-4b rail only ever built an *ostrich* player, so the stork path has ZERO coverage — the classic "tested the happy sprite" gap. Worse, the defect is masked twice: `posOffset`'s silent `{0,0}` fallback swallows the missing record, and its comment calls that "harmless." What else does the silent fallback hide? Any future frame name a typo introduces would also draw at raw feet Y with no error — a latent trap. Now push on the facing flip the text-only source test "verifies": that test would pass even if `blitOp` mirrored EVERY sprite (test-analyzer proved it), so an implementation that faces every buzzard backwards could ship green — only my in-browser probe and the DATA rail (`op.facing === -1`) actually constrain it. And the event cap: the "long run" test proves nothing (2 events in 400 frames); only the seeded test bites — remove the cap and half the item-5a coverage waves it through. None of these are hypothetical: each is mutation-proven or probe-proven. The stork gap alone is a user-visible defect on the story's own AC. It blocks.

**Dispatch tags present:** `[EDGE]` `[SILENT]` (finding 1), `[TEST]` (findings 2-4 + verifieds), `[DOC]` (finding 5), `[TYPE]` `[SIMPLE]` `[SEC]` `[RULE]` (verifieds).

**Handoff:** Back to TEA (Leeloo) for the RED rework — a P2 (stork) POSOFF/alignment rail + the three test-quality strengthenings — then Dev transcribes the stork mount POSOFF records. The facing wiring, POSOFF-for-P1, events cap, item-2d colour fix, and the item-3 ruling are all sound and need no rework.
## Tea Assessment (round 2 — rework)

**Rework for the Reviewer's round-1 REJECT (P2 stork mount not POSOFF-lifted).**

**New RED rail:** `demo-jt2-9-anchor.test.ts` "P2 STORK — the mount is POSOFF-lifted and the rider sits ON it" — pins the alignment PROPERTY (mount lifted off the feet; `rider.y >= mount.y` with a small gap) derived from the RIDER's own record, so it reds now (stork mount at raw feet Y, `expected 162 to be less than 162`) and greens once Dev transcribes the stork records. A P1 ostrich CONTROL in the same block proves the property already holds for P1.

**Three test strengthenings (Reviewer findings 2-4, mutation-proven weak → now bite):**
- long-run events (`demo-jt2-9.test.ts`) now SEEDS 300 events and tracks the post-step peak — an uncapped stepDemo carries all 300 forward (was vacuous under neutral input).
- source gated-flip (`demo-jt2-9-source.test.ts`) now requires the `if (op.facing === -1)` conditional SHAPE with the mirror INSIDE the branch — an unconditional mirror fails (was a bare token match).
- neutral-facing (`demo-jt2-9.test.ts`) now pins BOTH directions (left-facer stays left) — a reset-to-right mutant dies.

**Status:** RED — `Test Files 1 failed | 31 passed (32)`, `Tests 1 failed | 1037 passed (1038)`; tsc exit 0. The 1 red is the P2 stork rail; the 3 strengthenings + P1 control are green.

**Dev briefing (GREEN, round 2):** transcribe the stork mount frames into `src/core/pictures.ts` `ENTITY_RECORDS` with their ROM POSOFF (JOUSTI.SRC:782-796): `SFLY1R` $00ED (YOFF 19), `SRUN1R`..`SRUN4R` $00ED (19), `SRUNSR` $00EE (18) — sources already exist as PIXEL_BLOCKS; give each a name/collision/position/source/anchor like the ostrich records. Then `posOffset` lifts the stork mount and the P2 rail greens. The ENTITY_RECORDS count-floor rises (fine); keep every record pointing at a REAL source block. Also fold in the LOW nit: add a citation to `playerDrawList`'s colour-5/colour-7 comment (PLY1R/PLY2R JOUSTI.SRC:2046/2076). No src/core purity or denylist impact.

### TEA (test design, round 2)
- No new deviations from spec — the rework only strengthens coverage per the Reviewer's findings (a P2/stork rail + 3 assertion tightenings); no test omitted or approach changed.

**Handoff:** To Dev (Korben Dallas) for GREEN round 2. Branch `feat/jt2-9-playtest-followup`, RED at `34ffecf` (pushed).
## Dev Assessment (round 2 — rework)

**Fix for the Reviewer's round-1 REJECT (P2 stork mount not POSOFF-lifted).**

**Files Changed:**
- `src/core/pictures.ts` — added the 6 stork mount frames to `ENTITY_RECORDS` with their ROM POSOFF (JOUSTI.SRC:782-796): `SRUNSR` $00EE (YOFF 18), `SRUN1R`/`SRUN2R`/`SRUN3R`/`SRUN4R`/`SFLY1R` $00ED (YOFF 19). Sources already existed as PIXEL_BLOCKS; each record carries name/collision/position/source/anchor like the ostrich records. `posOffset` now lifts P2's stork mount.
- `src/core/demo.ts` — added the ROM citation (PLY1R/PLY2R JOUSTI.SRC:2046/2076) to `playerDrawList`'s colour comment (the LOW nit).

**Verification (tsx probe, feet=162):** P2 stork `SRUNSR y=144` (lift 18) / rider `PLYR2 y=145` — a 1px seat (was a 17px gap); P1 ostrich unchanged (`ORSTND` lift 19 / `PLYR1` lift 17). Both players now align; the P2 stork rail greens.

**Tests:** 1038/1038 passing (32 files) — GREEN. `tsc --noEmit` exit 0. `npm run build` clean. The round-2 RED rail (P2 stork) is now green; the 3 strengthened guards stay green; zero regressions (entitySource still resolves SFLY1R etc. to the same PIXEL_BLOCK; the ENTITY_RECORDS count-floor rose).

**Branch:** feat/jt2-9-playtest-followup (pushed). **Commit:** GREEN round 2 on top of RED `34ffecf`.

### Dev (implementation, round 2)
- No new deviations from spec — the fix transcribes existing ROM data (the stork mount POSOFF the round-1 change omitted) exactly as the Reviewer specified.

**Handoff:** To Reviewer (Zorg) for re-review of the round-2 fix.
## Subagent Results (round 2)

Round-2 is a focused re-review of a 6-record ROM-data transcription (+ a comment nit + 3 test tightenings) — the round-1 fan-out (preflight/test-analyzer/security/rule-checker, all in the round-1 table) covered the substantive surface; the round-2 delta introduces no new type/security/rule surface (static data records) and was re-verified DIRECTLY by the Reviewer.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (Reviewer-run) | clean | none | N/A — independently re-ran: 1038/1038 green, tsc 0, build clean, tree clean |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Reviewer-covered: entitySource still resolves SFLY1R→its block (no double-lookup); missing-record path now hits the transcribed records |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Reviewer-covered: the round-1 silent {0,0} fallback no longer fires for the stork mount (records now present) |
| 4 | reviewer-test-analyzer | Yes (Reviewer-run) | clean | none | N/A — mutation-verified the P2 rail BITES (remove records → RED, restore → green, git diff clean); the 3 round-1 gaps are strengthened |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Reviewer-covered: the LOW colour-citation nit is addressed (JOUSTI.SRC:2046/2076) |
| 6 | reviewer-type-design | No | Skipped | disabled | Reviewer-covered: the 6 records match the `EntityRecord` shape exactly (name/collision/position/source/anchor) |
| 7 | reviewer-security | Yes (Reviewer-assessed) | clean | none | N/A — static ROM-data records, no I/O/input surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Reviewer-covered: minimal — 6 data rows, no logic change |
| 9 | reviewer-rule-checker | Yes (Reviewer-assessed) | clean | none | N/A — ROM constants cited (JOUSTI.SRC:782-796), positions byte-verified against the source; purity/denylist untouched (data only) |

**All received:** Yes (round-2 focused re-review; round-1 fan-out stands, delta Reviewer-verified)
**Total findings:** 0 confirmed, 0 dismissed — round-1 HIGH resolved, round-1 MEDIUM×3 strengthened

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

Round 1 rejected for P2's stork mount not being POSOFF-lifted (a 17px rider/mount gap). Round 2 transcribes the exact ROM POSOFF records the round-1 change omitted, and — the part I care about — the fix is ROM-byte-verified and the rail that catches it is mutation-verified to BITE, not just green.

**Data flow traced:** P2 (stork) → `playerDrawList` → `[SRUNSR, PLYR2]` → `entityOp` → `posOffset('SRUNSR')` now HITS the new record (position 238 → YOFF 18) → `op.y = feetY − 18`. Probe (feet=162): stork mount `y=144` (lift 18) / rider `PLYR2 y=145` — a 1px seat (was a 17px gap); P1 ostrich unchanged (lift 19/17). Both players align. `[EDGE]` the round-1 missing-record path is closed for every stork mount frame `mountFrame` can emit; `[SILENT]` the silent `{0,0}` no longer fires for the stork.

**ROM faithfulness `[RULE]`:** byte-verified each record against JOUSTI.SRC:782-796 — `SRUNSR $00EE`=238, `SRUN1R/2R/3R/4R $00ED`=237, `SFLY1R $00ED`=237. Anchors point at the transcribing lines. No invented value.

**Test quality `[TEST]`:** mutation-verified the P2 rail bites (reverting the 6 records reds it, restore greens it, `git diff` clean). The three round-1 gaps are genuinely strengthened: the long-run cap now seeds 300 events (was vacuous), the source gated-flip now requires the `if (op.facing === -1)` conditional shape, the neutral-facing test now pins both directions.

**Verified good:** `[SEC]` static ROM data, no I/O; `[TYPE]` the 6 records match `EntityRecord` exactly; `[DOC]` the colour comment now carries its citation; `[SIMPLE]` 6 data rows, zero logic change; entitySource resolves the stork frames to the same PIXEL_BLOCK (no regression); full suite 1038/1038, tsc 0, build clean.

### Devil's Advocate (round 2)

Could this still ship broken? The stork collision fields (`CSKIDR`/`CSTN1-3R`/`CWNG1R`) may be dangling refs like the known BWNG debt — but the demo's `collisionMaskFor` never reads a mount frame's collision field (it uses `CSTN4R`/`CWNG3R` for grounded/airborne players regardless), so a dangling collision label here is cosmetic, exactly the tolerated jt1-3 pattern, not a live bug. Could the stork *run* frames (SRUN1-4R) be mis-lifted mid-animation? All four carry $00ED (YOFF 19) — one pixel above SRUNSR's 18 — so the mount bobs at most 1px through the run cycle while the rider holds at 17; that reads as a seated rider, not a jitter. Could a LEFT-facing stork break? The records are the right-facing frames; the shell mirrors by facing (round-1, unchanged) about the sprite width, so the lift is facing-independent. Nothing here regresses P1 (ostrich records untouched) and the full suite proves no sibling broke. The one residual is aesthetic — whether an 18px stork lift *looks* right in motion — which is the user's finish playtest, and is now a 1px seat rather than a 17px float.

**Dispatch tags present:** `[EDGE]` `[SILENT]` `[TEST]` `[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` `[RULE]`.

### Reviewer (audit, round 2)
- **TEA (round 2) — "No new deviations"** → ✓ ACCEPTED: the rework only added a P2 rail + strengthened 3 assertions; no omission/approach change.
- **Dev (round 2) — "No new deviations"** → ✓ ACCEPTED: transcribes existing ROM data exactly as specified; faithful.

### Reviewer (code review, round 2)
- No upstream findings during round-2 re-review — the round-1 HIGH is resolved (ROM-faithful, mutation-verified), the round-1 MEDIUM×3 are strengthened. The deferred items (4a underivable depth, 4c PTIMX cadence, 5b BWNG debt) remain tracked follow-ups per the round-1 findings.

**Handoff:** To SM (Ruby Rhod) for finish-story. All round-1 blockers cleared and mutation-verified; suite 1038/1038, tsc + build clean, branch pushed. Gate the finish on the USER's final playtest (the stork now seats at 1px; the run-gait and all-tier z-order remain the user's visual acceptance).
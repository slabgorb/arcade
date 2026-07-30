---
story_id: "jt8-6"
jira_key: "jt8-6"
epic: "jt8"
workflow: "tdd"
---
# Story jt8-6: Egg-ladder counter outlives a life — DEGGS shares the DECISION BLOCK with DSCORE (JOUSTRV4.SRC:106/:111/:113), so it must survive a mount death; our eggHits rides the player PROCESS and resets to rung 1 on every respawn. REPRODUCED: a veteran with 3 prior hits scores 1000, then the identical staging after a respawn scores 250.

## Story Details
- **ID:** jt8-6
- **Jira Key:** jt8-6
- **Workflow:** tdd
- **Points:** 3
- **Priority:** p2
- **Repos:** joust
- **Type:** bug
- **Branch:** `fix/jt8-6-egg-ladder-outlives-life` (joust, cut from `develop`)
- **Context:** `sprint/context/context-story-jt8-6.md`
- **Stack Parent:** none (independent of jt8-1 → jt8-3 enemy chain)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-30T11:22:09Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-30T00:44:21Z | 2026-07-30T00:48:53Z | 4m 32s |
| red | 2026-07-30T00:48:53Z | 2026-07-30T01:16:20Z | 27m 27s |
| green | 2026-07-30T01:16:20Z | 2026-07-30T10:38:38Z | 9h 22m |
| review | 2026-07-30T10:38:38Z | 2026-07-30T10:56:10Z | 17m 32s |
| green | 2026-07-30T10:56:10Z | 2026-07-30T10:58:28Z | 2m 18s |
| review | 2026-07-30T10:58:28Z | 2026-07-30T11:09:56Z | 11m 28s |
| green | 2026-07-30T11:09:56Z | 2026-07-30T11:11:23Z | 1m 27s |
| review | 2026-07-30T11:11:23Z | 2026-07-30T11:22:09Z | 10m 46s |
| finish | 2026-07-30T11:22:09Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Question / non-blocking (SM, setup):** the ROM's DEGGS *initialiser* is still unchased. jt8-4's
  Reviewer filed this story for the respawn lifetime only, and the context deliberately fences the
  wave/game reset boundary out of scope (AC-5). Where the ROM clears the decision-block counter — per
  wave, per game, or never — remains unknown, and the "a new wave demo replaces the record, so the
  wave boundary is covered" line in AC-5 is an inference about OUR structure, not a cited ROM fact.
  Expect a follow-up story to chase the decision-block initialiser and pin the true reset scope.
- **Question / non-blocking — ANSWERS the finding above (TEA, red):** the initialiser did not need
  chasing. `DEGGS` is a pointer, and grepping the CELLS it names (`EGGS1`/`EGGS2`) rather than the
  routine that bumps them yields the complete lifetime in one command: game start (:907/:912), every
  wave start (`WNRM` :1979-1980), player death (:4669/:4675) — six `CLR`s, ten lines total, pinned as
  a SET by `demo-jt8-6-source.test.ts`. No follow-up story is needed for reset scope. AC-5's
  inference ("a new wave demo replaces the record, so the wave boundary is covered") was also wrong
  in the other direction: nothing replaces the player process at a wave advance, which is the defect.
- **Gap / non-blocking (TEA, red): jt8-4 shipped a refuted lifetime claim, and it spread.**
  "EGGSCR never resets it, so the count persists for that player" (claims/egg-catch.json JT84-006) is
  a fact about EGGSCR presented as a fact about the counter. It is mirrored in `src/core/demo.ts`'s
  `eggHits` doc-block and in `tests/demo-jt8-4-source.test.ts`'s header, and a Reviewer reasoning from
  it filed this story. Dev retires all three as part of GREEN (tests pin it). The generalisable form —
  a lifetime claim sourced from the routine that WRITES a field is unestablished; resolve the pointer
  and grep the cell — is recorded in the TEA sidecar, and the user-memory entry that recommended the
  opposite heuristic has been corrected.
- **Improvement / non-blocking (TEA, red):** this story's own verbatim check was weaker than
  `tests/audit/citations.test.ts` (trimmed vs raw comparison), which would have let a claim pass at
  story scope and fail in CI. Tightened to exact. Worth watching for wherever a story-scoped suite
  re-implements an existing global gate — match its strictness or lean on it instead.

### Dev (implementation)

- **Improvement** (non-blocking): the refuted "persists" prose had spread to FOUR sites, not the
  three TEA's finding named — `tests/demo-jt8-4.test.ts:28` ("it persists across eggs") was the
  fourth. Affects nothing functional; all four are corrected, and a repo-wide grep for persistence
  phrasings near the ladder now returns only quotations-being-refuted plus one unrelated true claim
  about `PEGG` permadeath (`claims/egg.json`). *Found by Dev during implementation.*
- **Question** (non-blocking): the ROM's air bonus reads the **EGG's** `PFEET` (`LDY ,S` restores
  the egg workspace at :3063, then `LDA PFEET,Y`), and our `airCatchBonus(ep.egg.pfeet)` matches —
  checked while reading EGGSCR, and it is correct. Recording it only so a future reader does not
  re-derive it: `,S` is the egg because `EGGSCR PSHS X,U` pushes X (the egg) last. Affects nothing.
  *Found by Dev during implementation.*
- No blocking findings.

### Reviewer (review)

- **Gap** (blocking): `JT86-001` asserts that every decision record binds "that creature's own death
  routine, which is where per-entity state gets cleared". Both halves are false — `DEATH3` is the
  `DDEAD` binding in FOUR enemy records (:5559, :5563, :5567, :5571) and neither it (:2952-2990) nor
  `DEATH4` (:2941-2948) clears any persistent per-entity cell; `DEATH3`'s only `CLR` initialises the
  newly-spawned egg process (:2985). Affects
  `docs/rom-study/claims/egg-lifetime.json` (narrow the claim to what :112 supports — replacement text
  is in the Reviewer Assessment). This is the same over-generalisation mechanism that misfiled this
  story, reproduced inside the round that fixed it, which is why it blocks rather than deferring.
  *Found by Reviewer during review.*
- **Improvement** (non-blocking): the `comment_analyzer` specialist is disabled in
  `workflow.reviewer_subagents`, and documentation/claim prose is the one domain where this diff
  actually shipped a defect — the code was clean on every enabled check. For a repo whose ROM dossier
  is load-bearing primary evidence that future stories cite, enabling `comment_analyzer` (or adding a
  claim-prose check to the citation gate that flags universal quantifiers like "every"/"always" in a
  claim body) would have caught this mechanically. Affects `.pennyfarthing` settings /
  `tests/audit/citations.test.ts`. *Found by Reviewer during review.*

### Reviewer (review round 2)

- **Gap** (blocking): the rewritten `JT86-001` cites `DEATH3 (:2952-2990)` — the routine actually spans
  :2952-**3007** (`1$ PULS X,U,PC`; :2990 `DE3HRD` is a mid-routine branch label) — and asserts "its
  single CLR (:2985)" when there are **five** (:2985, :2995-2998). The truncated range is what conceals
  the false count. Also "decrements the GLOBAL NSMART/NENEMY counts": `NENEMY` is a literal `DEC`
  (:2965) but `NSMART` is reduced by a variable amount, `LDA NSMART / SUBA PCHASE,U / STA NSMART`
  (:2962-2964). Affects `docs/rom-study/claims/egg-lifetime.json` (replacement text in the round-2
  assessment; it drops the extents and the inventory rather than correcting them). Independently
  confirmed by `reviewer-rule-checker`. *Found by Reviewer during review round 2.*
- **Gap** (non-blocking, NEW STORY): **`EGGSCR` has two call sites and our port models only one.**
  `grep -n 'JSR[[:space:]]*EGGSCR'` → :3006 and :3021. jt8-4 modelled :3021 (the player/egg collision).
  :3006 sits inside `DEATH3`: when a killed enemy's transferred egg count decrements to zero
  (`STA PEGG,Y / DEC PEGG,Y / BNE 1$`, :3000-3002) the ROM does `TFR Y,X / LDU ,S  GET VICTORS
  WORKSPACE / BEQ 1$ / JSR EGGSCR  SCORE EGG` (:3003-3006) — an enemy's LAST egg is scored to the victor
  immediately on the kill, bumping the egg ladder, with no catch. Our port implements the decrement
  (`spawnEgg`, egg.ts:141) and treats `eggsLeft === 0` as permadeath returning null (egg.ts:273-275),
  but never scores it, so the award and its ladder bump are silently dropped. Also makes `JT84-003`
  ("the collision IS the scoring trigger; there is no separate pickup step") incomplete. Affects
  `src/core/demo.ts` / `src/core/egg.ts` / `claims/egg-catch.json`. **Out of scope for jt8-6** — that
  story is the counter's LIFETIME, this is an increment SITE. Should be filed as its own story.
  *Found by Reviewer during review round 2.*

## Sm Assessment

Setup complete; the story is genuinely unclaimed and the phase pointer read `setup` on arrival.

**Contention probes run BEFORE any spawn (both clean):**
- `git -C joust fetch --prune && git branch -r | grep jt8-6` → no branch. The only live remote
  feat branches are jt4-* and jt2-9; `origin/feat/jt8-4-egg-collection` was deleted on merge.
- `ls /Users/slabgorb/Projects/a-*/.session/*-session.md` → one live sibling session, a-2 on
  **sw8-8 (star-wars)**. Different repo, zero file overlap with joust's `demo.ts`/`game.ts`, so no
  neighbourhood contention either.
- `status: backlog` confirmed on `origin/main` as well as locally; `gh pr list -R slabgorb/joust`
  empty (merge gate clean); joust tree clean and level with `origin/develop`.

**Claim pushed immediately, both channels:** orchestrator stamp + context at `613c2a7` on `main`,
and the branch `fix/jt8-6-egg-ladder-outlives-life` pushed **empty** to joust so the branch probe
lights up for the whole RED phase rather than only after TEA's first commit. Story stamped
`in_progress` by hand — `sm-setup` left it at `backlog`, as it always does.

**The one thing TEA must know: this story shipped with NO acceptance criteria.**
`pf sprint story field jt8-6 acceptance_criteria` → `null`. The Reviewer's R-1 finding text in the
epic YAML *is* the spec, and the six ACs in `sprint/context/context-story-jt8-6.md` are **derived by
`sm-setup`, not authored by the filer** — treat them as a good-faith reading to be checked against
the ROM, not as ratified scope. Two specific cautions:

1. **AC-5's wave-boundary sentence is an inference about our own structure, not a cited ROM fact.**
   "A new wave demo replaces the record, so the practical wave boundary is covered" was reasoned
   from our `DemoSim` shape. The ROM's decision-block *initialiser* — where `DEGGS` is actually
   cleared, per wave or per game or never — was never chased in the jt8-4 review and is explicitly
   out of scope here. Do not spec reset behaviour; it is filed as a Delivery Finding for follow-up.
2. **Re-verify the line anchors before citing them.** `sm-setup` reports it re-checked all eight
   (demo.ts:167/204-206/333/904/905, game.ts:439, JOUSTRV4.SRC:101-113) against the current tree
   rather than copying them from the R-1 text, and the joust tree is level with `origin/develop` —
   but the anchors originate in a review written against a since-merged branch, so they are the
   likeliest thing to have drifted.

**Reuse-first, as the story itself directs:** the fix is a re-homing, not a new mechanism.
`egg.ts` already owns the whole ladder (`bumpEggHits`, `eggValue`, `airCatchBonus`) and jt8-1's
`targets` field on `DemoSim` is the named precedent for a per-player record that outlives a process
rebuild. The read/write semantics at the `collisionPass` call site should not change — only where
the count lives. Guard against the dead-feature signature this epic has already produced once
(jt2-4's `EGGVAL`): a correctly-unit-tested counter is worthless if every producer resets it, so
pin the **respawn survival** end-to-end, not just the pure helper.

Baseline for TEA: 1828 tests passing across 73 files.

Handing to Han Solo for RED.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **The story's central premise is not implemented, because the ROM refutes it (TEA, red).**
  The story (and derived AC-2) require the counter to SURVIVE a mount death, and AC-1 names the
  mechanism: "re-home the count onto a per-player record on DemoSim (the jt8-1 targets precedent)."
  Neither is implemented. `DEATH1 CLR EGGS1` (JOUSTRV4.SRC:4669) is the first instruction of the
  routine commented "DEATH OF PLAYER 1", `DEATH1` is the `DDEAD` field of P1DEC (`FDB DEATH1,EGGS1,…`
  :5551), and both kill sites dispatch it on the LOSER's decision (`LDY PDECSN,U` / `JSR [DDEAD,Y]`,
  :5071-5074 joust loss, :6563-6564 lava). The reported symptom — a veteran scoring 250 after a
  respawn — is FAITHFUL. Re-homing onto `DemoSim` would make the credit outlive the man and turn a
  correct behaviour into a cited fidelity regression, so the suite pins the ROM and keeps the
  per-process home. The epic's binding user ruling (4) is "egg collection faithful to PLYEGG/EGGSCR",
  which is why this needed no scope ruling to resolve.
- **AC-5's out-of-scope fence is dropped, because the excluded boundary IS the defect (TEA, red).**
  AC-5 excluded the wave/game reset boundary ("the decision-block initialiser was not chased"). One
  grep of the counter's CELLS answers it: `WNRM CLR EGGS1` / `CLR EGGS2` (:1979-1980) clears at every
  wave start, and `stepDemo`'s advance carries the player processes forward (demo.ts:1090-1105), so
  our counter walks into the next wave. That is the only real divergence, so it is the story's RED.
  Nothing is left deferred: the exhaustiveness test pins the complete reset scope (game start, wave
  start, death) rather than leaving it "still open".
- **Wave-boundary framing (TEA, red).** The ROM's clear is at wave SETUP (`WNRM`); ours must sit on
  the wave ADVANCE, which is the same instant in this port's one-sim seam (there is no separate
  wave-setup pass). The suite therefore pins the advance and separately pins that an ordinary frame
  does NOT clear, so the equivalence cannot be widened into "clear it every frame".

### Dev (implementation)

- **The counter is NOT re-homed onto `DemoSim`; it stays on the player process**
  - Spec source: `context-story-jt8-6.md`, AC-1 and AC-2 (the sm-setup-derived ACs)
  - Spec text: "The counter is moved from the player process (`DemoProcess.eggHits?`) to a new
    per-player record on `DemoSim` (following the jt8-1 `targets` precedent)" / "A player with
    eggHits=3 dies and respawns; the counter persists at 3"
  - Implementation: `eggHits` stays on `DemoProcess`. The only change is four lines in `stepDemo`'s
    wave advance that clear it, plus the dossier corrections. Nothing was re-homed and no new sim
    field was added.
  - Rationale: `DEATH1 CLR EGGS1` (JOUSTRV4.SRC:4669) is the first instruction of the player-1
    death routine, dispatched on the LOSER's decision at both kill sites (:5074, :6564), so the ROM
    clears the ladder on every death. A record that outlives the process would make the credit
    survive the man — the exact behaviour the ROM forbids — so AC-1's mechanism and AC-2's outcome
    are both refuted by the lines they cite. The epic's binding user ruling (4) is "egg collection
    faithful to PLYEGG/EGGSCR", and the user ratified repurposing the story on this basis before
    GREEN began. TEA's Group 2 guards the correct behaviour; M3 in the mutation table shows the
    story-as-filed design reddens it.
  - Severity: major — it inverts the story's stated deliverable
  - Forward impact: none on siblings; `DemoSim` gains no field, `collisionPass` is untouched, and
    `respawnPlayerProcess` is unchanged, so jt4-5's respawn and jt8-4's catch keep their contracts.
    The story TITLE in `sprint/epic-jt8.yaml` still asserts the refuted premise — the user chose to
    leave it rather than retitle, so anyone reading the board needs this session for the real scope.

### Reviewer (audit)

- **TEA's "story premise not implemented, the ROM refutes it"** → ✓ **ACCEPTED by Reviewer.** I
  re-derived every load-bearing claim from `JOUSTRV4.SRC` independently rather than reading it back
  from the diff, and each one holds: I counted the `ORG $0` block by hand and `DEGGS` is word 9
  (offset 18), the tenth 1-based, so P1DEC's second row (`FDB DEATH1,EGGS1,…` :5551) does bind
  DDEAD→DEATH1 and DEGGS→EGGS1; `grep -n 'EGGS1\|EGGS2'` over the whole file returns exactly ten
  lines, six of them `CLR`s; `[DDEAD,Y]` dispatches at exactly :5074 and :6564, each preceded by the
  dead man's `PDECSN,U`. The refutation is correct and the reasoning is sound.
- **TEA's "AC-5's fence dropped, the excluded boundary IS the defect"** → ✓ **ACCEPTED by Reviewer.**
  Corroborated independently: `stepDemo` has the only wave-advance path (`nextWaveBcd`, demo.ts:1109;
  `game.ts` merely mirrors `sim.wave` at :324 and :445), and it carries `processes` forward.
- **TEA's wave-boundary framing (`WNRM` = wave setup ≡ our advance)** → ✓ **ACCEPTED by Reviewer,**
  with a stronger reason than the entry gives: the equivalence is not merely convenient, it is
  *forced*. `clearable` (demo.ts:1105-1107) is computed from the POST-collision process list, so the
  clear provably cannot precede the same frame's catch. See the `[VERIFIED]` note on the in-frame
  edge in my assessment — I probed it and the wave-ending catch is paid at its correct rung, then
  cleared.
- **Dev's "counter NOT re-homed onto `DemoSim`"** → ✓ **ACCEPTED by Reviewer.** All six fields are
  present and the rationale is ROM-backed. I additionally traced the claim "a death removes the
  process, so the credit dies with the man" through the code rather than trusting it: the loser goes
  into `removed` and is dropped by the `survivors` filter (demo.ts:927-931), `respawnPlayerProcess`
  builds a fresh object that never sets `eggHits` (:351-358), and `PlayerLedger` (game.ts:54-72)
  carries no `eggHits` — so there is no surviving path that could smuggle the count across a death.
  The severity label "major" is right, and the user ratified the repurposing before GREEN.
- **No UNDOCUMENTED deviations found.** I checked the delivered code against all six derived ACs:
  AC-3 and AC-4 hold as written (`collisionPass` is genuinely untouched — the entire `src/` change is
  three lines), AC-6's purity and determinism hold, AC-5's excluded boundary is the delivered fix, and
  AC-1/AC-2's non-implementation is the logged deviation above. Nothing diverged silently.

## Tea Assessment

**RED verified — 18 failing / 1854 passing of 1872 across 75 files; `tsc --noEmit` clean.**
Independently re-run by `testing-runner` (grand total cross-checked, not just the failure list):
every failure is inside the two new files, so nothing pre-existing was reddened. Baseline on arrival
was 1828/1828; this story adds 44 tests.

### The story is inverted, and the suite pins the machine instead

I verified the story's own citations before writing anything, and they refute it. Full evidence in
the Design Deviations above and in the suites' headers; the short version:

| Boundary | ROM | Ours | Status |
|---|---|---|---|
| Game start | `CLR EGGS1/2` :907/:912 | fresh demo → no credit | correct |
| **Every wave start** | **`WNRM CLR EGGS1/2` :1979-1980** | **process carried across the advance** | **the defect — RED** |
| Player death | `DEATH1/DEATH2 CLR` :4669/:4675 | process rebuilt → credit dies | correct (the story called this the bug) |

Probed on this tree, not inferred: a knight holding 2 hits clears wave 1 and his first catch of
wave 2 pays **750** where the ROM pays 250. The counter's whole lifetime is ten source lines — six
`CLR`s — because `DEGGS` is a POINTER (`LDY DEGGS,Y` then `LDB ,Y`; the debug guard at :3039 reads
"SHOULD NEVER BE ZERO" because it holds an address) into the fixed cells EGGS1/EGGS2 that P1DEC and
P2DEC bind it to. jt8-4 derived "persists" from EGGSCR alone — a true fact about EGGSCR, a false one
about the counter — and that inference is what produced this story.

### What Dev implements

**The whole fix is the wave clear.** Nothing needs re-homing; `eggHits` staying on the player process
is what makes the death boundary correct for free. The throwaway probe was three lines inside
`stepDemo`'s `if (clearable)` block, and it took the whole suite green (1872/1872, lint clean) —
so the contract is satisfiable and pins one coherent machine.

Then the provenance half, which is the other 11 reds:
1. **Commit `JT86-*` claims** for the seven cited ranges (:112, :907, :1979, :4669, :4675, :5074,
   :5551). **The `verbatim` field must be the RAW line including its leading TAB** for unlabelled
   statements (`JSR`, `FDB`, the bare `CLR EGGS1` at :907); labelled ones (`DEATH1`, `DEATH2`,
   `WNRM`) start in column 1 and must not have it. `tests/audit/citations.test.ts` compares raw — I
   lost a cycle to this and tightened my own check to match, so both now agree.
2. **Retire the "persists for that player" clause in JT84-006** (its true content — the write-back is
   what makes the ladder climb *within a life* — survives a rewrite) and add the reset boundaries.
3. **Extend `demo.ts`'s `eggHits` doc-block** to name :4669 and :1979. That doc-block is where the
   next reader forms their model of the lifetime; leaving it saying only "persists" is what misfiled
   this story once already.

### Mutation table — the guards are not vacuous

Method: commit the RED, `cp` src aside, implement, mutate once per guard, restore from the copy.
`src/` is byte-identical afterward (md5 `577075f6…` / `aa20fb20…` both match) and the control run put
all 18 reds back.

| # | Mutation of the throwaway fix | Tests reddened |
|---|---|---|
| M1 | clear on EVERY frame, not only at the advance | 6 — incl. **3 of jt8-4's** (the ladder climb, per-player independence, its determinism pin) |
| M2 | clear only P1's ladder (drop the :1980 `CLR EGGS2`) | 2 — both two-knight tests |
| M3 | **the story as filed** — a per-player record on `DemoSim` restored before the collision pass | 2 — the death guard |
| M4 | reset to rung 1 instead of rung 0 | 7 |

**M3 is the one that matters, and it initially passed.** The first placement restored the credit
AFTER the collision pass, so the probe's catch landed on the restore frame and slipped through. The
story's own wording ("readable by the sim at event-emit time") puts the restore BEFORE the pass;
moved there it reddened the guard. I then added the timing-independent form — after a re-creation, no
later frame may hand the credit back, checked across twelve frames — plus a second-catch assertion
(250 then 500, never 1000 then 1000). Both bite now. Without that hardening the guard would have been
decorative against exactly the design the story asks for.

M1 reddening three of jt8-4's tests is the useful blast-radius signal: over-clearing is caught by
existing coverage as well as mine, so Dev has a net on both sides of the fix.

### Rule Coverage

`.pennyfarthing/gates/lang-review/typescript.md`. joust has no repo-local `CLAUDE.md`, `.claude/rules/`
or `SOUL.md`, so that checklist plus the orchestrator's `src/core` purity rule is the whole rubric.
TEA writes no source here, so the applicable checks are the ones governing my own test code:

| Check | Applied |
|---|---|
| #1 type-safety escapes | Dropped a `p.entity!` non-null assertion (the contract makes `entity` optional — an enemy process has `enemy` instead); `seatedAt` now reports a mis-staged fixture by id and kind. One remaining widening cast, `p as DemoProcess & { mat?: unknown }`, is documented at its single use: it strips jt2-6's materialisation window, which this story does not own, so `mat` stays OUT of the contract rather than being carried inert. |
| #4 null/undefined | `creditOf` uses `?? 0` (not `||`) and mirrors production's `self.eggHits ?? 0` exactly, so "absent" and "zero" are the same rung in test and src. AC-3 pins that equivalence. |
| #5 module/ESM | Every relative import carries `.js` (Rule #5). No `import type` on runtime values. |
| #8 test quality | Self-checked all 44 assertions for vacuity. Two fixed: the game-start test compared two arrays derived from the same list (now it names the offending player's id), and the JT86 verbatim loop would have passed with zero claims (now guarded by `expect(mine.length).toBeGreaterThan(0)`). The three `toEqual([])` assertions are each non-vacuous by construction — two are red today, and the third is paired with a full-set assertion above it. No `as any`, no `let _ =`, no `assert(true)`. |
| purity (`src/core`) | Dev's fix lands in `stepDemo` (pure, no clock, no entropy) and the existing jt1-7 purity scanner already sweeps `demo.ts`; AC-4's determinism test covers the seeded replay across the boundary. Nothing new needed. |

Checks #3 (enums), #6 (React/JSX) and #9 (build config) have no surface in this diff. #7 (async):
the suites `await` the module loaders only, matching the established `loadDemo` pattern.

### Delivery findings raised

Four, all non-blocking, in Delivery Findings above: the misfiled premise (with the reasoning error
that caused it, since the same error is reachable from any ROM field whose lifetime is read off its
write routine) and the SM-flagged initialiser question, which this story ANSWERS rather than defers.

Handing to Yoda for GREEN.
## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 1872/1872 passing (GREEN) across 75 files — `tsc --noEmit` clean, `vite build` clean.
Independently verified by `testing-runner` with grand totals cross-checked and 0 skipped, which also
confirms the vendored-source `describe.skipIf` block actually RAN (`demo-jt8-6.test.ts` 13 tests,
`demo-jt8-6-source.test.ts` 31 — both present, neither filtered).
**Branch:** `fix/jt8-6-egg-ladder-outlives-life` (pushed, `726d533`). No PR — SM owns that at finish.

**Files Changed:**
- `src/core/demo.ts` — the fix: four lines in `stepDemo`'s wave advance clearing `eggHits` on
  surviving players, with the `WNRM` citation. Plus the `eggHits` doc-block, which now states the
  counter's full lifetime instead of only "persists — EGGSCR never resets it".
- `docs/rom-study/claims/egg-lifetime.json` — NEW. `JT86-001..007`: the three reset boundaries, the
  loser-keyed `DDEAD` dispatch, and the `P1DEC` binding that makes `DEGGS` a pointer.
- `docs/rom-study/claims/egg-catch.json` — `JT84-006` no longer claims the count "persists for that
  player"; its true content (the write-back is what makes the ladder climb *within a life*) is kept
  and the reset boundaries are named.
- `tests/demo-jt8-4.test.ts`, `tests/demo-jt8-4-source.test.ts` — the same overclaim retired from
  jt8-4's two headers and from a `LAWS` entry label. No assertion touched in either file.

**The whole fix, for the reviewer:**
```ts
processes = processes.map((p) =>
  p.kind === 'player' && p.eggHits !== undefined ? { ...p, eggHits: 0 } : p,
)
```
inside `if (clearable)`. The death boundary needed no code: a death removes the process and
`respawnPlayerProcess` builds a fresh one, so the credit dies with the man — which is precisely why
the count must NOT be re-homed anywhere that outlives the process. See the Dev deviation above.

**Self-review (judgment checks):**
- *Wired, not a dead feature.* The clear sits on the live wave-advance path, not behind a new flag or
  a field a producer hard-codes (the jt2-4 `EGGVAL` trap this epic already hit once). Reachability is
  attested three ways: six sibling suites exercise the wave advance independently of jt8-6's staging;
  the `!== undefined` guard means it fires only for a knight who actually caught something, which is
  ordinary play; and M1's over-clearing mutation reddens three of jt8-4's tests, so the path is
  covered from both directions.
- *Project patterns.* Pure, immutable `map`, ROM citation with line numbers and claim ids in the
  house style, no new export, no new sim field. `src/core` purity sweep green (35 tests).
- *ACs met* — against the corrected set: AC-3 (per-player init) and AC-4 (event path unchanged, and
  `collisionPass` is genuinely untouched) hold as written; AC-5's excluded boundary is the delivered
  fix; AC-6 determinism/purity green. AC-1/AC-2 deliberately not implemented, deviation logged.
- *Error handling.* Nothing to handle — a pure list transform over an in-memory process array with no
  I/O, no parsing and no partial states.

**Two things worth the reviewer's attention:**
1. The `eggHits: 0` vs `delete` choice. Absent and `0` are the same rung everywhere
   (`self.eggHits ?? 0`), and the `!== undefined` guard keeps object identity for players who never
   caught an egg, so untouched processes are not needlessly reallocated each advance.
2. Dev and TEA were the same session, so the usual independent check is weak here. The
   `reviewer-rule-checker` is the real net — the ROM reasoning in the claims is the part most worth
   re-deriving from the source rather than reading back from my prose.

**Handoff:** To review (Obi-Wan Kenobi).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (26 rules, 71 instances, 0 violations) | N/A — but see the Challenged note below |

**All received:** Yes (2 enabled specialists returned, 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 confirmed (mine), 0 dismissed, 0 deferred

Only `preflight` and `rule_checker` are enabled in this project, so seven domains had no specialist.
I covered the ones that matter for this diff myself: there is no error handling to swallow (no `catch`
blocks added anywhere), no boundary arithmetic (the change is a list filter, not an index), no
security surface (pure sim code, no I/O, no user input, no tenant concept in a single-player-pair
arcade sim), and nothing to simplify below three lines. The doc/comment domain is where I found the
one real defect — the domain whose specialist is disabled.

## Reviewer Assessment

**Verdict:** REJECTED — 1 finding to fix. The implementation is correct and needs no change.

### Findings

**[HIGH] `JT86-001` states two things about the ROM that are false, in the ground-truth dossier —
`docs/rom-study/claims/egg-lifetime.json`**

The claim reads: *"Every creature's decision record binds it to that creature's own death routine,
which is where per-entity state gets cleared — so the block's ROUTINE fields, not its value
neighbours, are what settle a field's lifetime."* Both halves are wrong, and I verified each against
the source:

1. **"that creature's *own* death routine"** — `DEATH3` is the `DDEAD` binding in **four** separate
   decision records (P3DEC :5559, P4DEC :5563, P5DEC :5567, P6DEC :5571 all read
   `FDB DEATH3,0,STENMY,…`). It is a per-TYPE routine shared across the enemy roster, not a
   per-creature one. Only the two players have a routine of their own.
2. **"which is where per-entity state gets cleared"** — false for every death routine except the two
   players'. `DEATH4` (the pterodactyl, :2941-2948) sets `PJOYT`/`PJOY` for the dying animation and
   plays a sound; it clears nothing. `DEATH3` (:2952-2990) decrements `NSMART` and `NENEMY`, which are
   **global** counts, and spawns the egg; its only `CLR` is `CLR PFEET,Y` (:2985) where `Y` is the
   **newly created egg process** from `VCUPROC` (:2974) — it initialises a new entity's field rather
   than clearing the dying one's persistent state. Corroborating detail I checked: those four enemy
   records carry `DEGGS = 0`, so enemies have no egg counter at all, which is exactly why the debug
   guard at :3039 exists.
3. The trailing clause is **methodology, not a claim about :112**, and it is over-general — it
   describes how *this one* question happened to resolve, not a law of the source.

*Failure scenario:* the claims corpus is what this repo's stories cite as primary evidence, and a
future ROM story reads JT86-001, concludes that enemy deaths clear per-entity state, and specs a
reset that the ROM never performs. That is not hypothetical — **it is the exact mechanism of the bug
this story exists to fix.** jt8-4's `JT84-006` generalised from one routine to the whole program, a
Reviewer built on it, and a correct behaviour was filed as a 3-point bug. Shipping a fresh
over-generalisation into the same file, in the round convened to remove the old one, reproduces the
defect under review one layer down.

*Why HIGH rather than MEDIUM,* since it changes no runtime behaviour and I would normally treat a
prose finding as a follow-up: the demonstrated cost here is a wasted story, the corpus's whole
function is to be citable truth, the fix is one sentence, and the story is still open. The cheap round
is now.

*Required fix* — narrow it to what :112 actually supports, e.g.:

> `DDEAD` is the DECISION BLOCK's death-wish hook, keyed to the LOSER:
> `DDEAD RMB 2  DEATH WISH ROUTINE (REG.X VICTOR, REG.U LOSER)`. Each decision record binds it to a
> death routine for that creature type — the players get `DEATH1`/`DEATH2`, which is where the
> per-player egg counter is cleared (JT86-002/003); the enemy records share `DEATH3` and the
> pterodactyl uses `DEATH4`, neither of which clears a persistent per-entity cell.
> (JOUSTRV4.SRC:112).

Nothing else needs to change. Do not touch `src/`.

### Observations

- **[VERIFIED] The fix is three lines and cannot reach anything else** — `git diff develop...HEAD -- src/`
  with comments stripped yields exactly the `processes.map(...)` at demo.ts:1130-1132. `collisionPass`,
  `bumpEggHits`, `eggValue`, `airCatchBonus` and every `events.push` site are untouched, so AC-4's
  "event emission path unchanged" is literally true rather than approximately true. Complies with the
  `src/core` purity rule: pure, deterministic, no clock/DOM/storage/entropy.
- **[VERIFIED] The in-frame edge nobody tested is structurally safe, not luckily safe** — I probed the
  most likely real-play sequence (catch the wave's LAST egg, which clears the wave that same frame) in
  a throwaway suite: the catch pays **750** with the pre-clear credit and the counter ends the frame at
  **0**. That is the ROM's order (EGGSCR scores during collision, `WNRM` clears at wave setup). It
  cannot regress, because `clearable` (demo.ts:1105-1107) is computed from the POST-collision process
  list — a clear that preceded the catch is not expressible without restructuring the function. Evidence
  for the ordering: `collisionPass(materialised)` at :1060, the clear at :1131.
- **[VERIFIED] The `p.eggHits !== undefined` guard is correct, not a missed player** — absent and `0`
  are the same rung everywhere, because the only read is `self.eggHits ?? 0` (demo.ts:922, `??` not
  `||`, so a real `0` is preserved). I probed it: a player who never caught an egg comes through an
  advance with the field still absent (`'eggHits' in p` === false), so untouched processes keep object
  identity instead of being reallocated every wave.
- **[VERIFIED] Single wave-advance path** — `nextWaveBcd` is called once in `src/` (demo.ts:1109);
  `game.ts` only mirrors `sim.wave` (:324, :445). So there is no second advance that could skip the
  clear, which is what would make this fix half-applied.
- **[VERIFIED] TEA's mutation evidence is real, not asserted** — I re-ran M1 myself (moved the clear
  out of `if (clearable)` so it runs every frame) rather than trusting the table: 7 red, including
  exactly **3 of jt8-4's** tests, confirming the over-clearing direction is caught by pre-existing
  coverage as well as the new suite. Restored from a copy and verified `src/core/demo.ts` byte-identical
  (md5 `39d728a140c3acf361c0d56b7bd648eb`), tree clean, control run 1872/1872.
- **[LOW] TEA's mutation table says M1 reddens 6 tests; it now reddens 7** — the extra one is jt8-6's
  own "REPRODUCED case" test, which was added by the later hardening commit (`363f966`) after M1 was
  measured. Harmless drift in a historical record, not a defect. Worth a one-line note if the table is
  ever cited as current.
- **[LOW] No test documents the wave-ending-catch edge** — the behaviour is correct and structurally
  protected (see above), so this is documentation value only, not risk. A follow-up could add the case
  I probed; I am not requiring it for a 3-point story.
- **[RULE] rule-checker: clean — 26 rules, 71 instances, 0 violations, and it did the work I asked
  for.** It independently re-derived all eight ROM claims from the vendored source (counting the
  DECISION BLOCK by hand, exhaustively grepping `EGGS1`/`EGGS2` and `[DDEAD,Y]`), byte-compared all 7
  `verbatim` fields including leading tabs, confirmed `tests/audit/citations.test.ts` auto-discovers the
  new claims file, and ran its own mutation test of the fix. It also confirmed no `==`/`!=` anywhere in
  the diff, `.js` on all 9 relative imports, and encodings specified on both `readFileSync` calls.
  **Challenged:** its rule #26 concludes *"no code/comment claims something the ROM does not say."* I
  disagree and am overriding that specific conclusion — see the HIGH finding, with line-level evidence
  at :5559/:5563/:5567/:5571 (the shared `DEATH3` binding) and :2941-2990 (the routine bodies, whose
  only `CLR` targets the new egg process). Its verification of the *cited-line transcription* is sound;
  what it did not audit is the *editorial gloss appended to* a correctly-transcribed line, which is a
  distinct failure mode and the one that produced this story.
- **[VERIFIED] Prose corrections are complete** — the retired overclaim is gone from all four sites
  (`egg-catch.json` JT84-006, demo.ts's doc-block, and both jt8-4 test headers). A repo-wide grep for
  persistence phrasings near the ladder now returns only quotations-being-refuted plus one unrelated
  and true claim about `PEGG` permadeath. Dev found a fourth site TEA's finding had missed and recorded
  it, which is the right behaviour.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) and the `javascript.md` it extends,
plus the orchestrator's project rules. joust has no repo-local CLAUDE.md, `.claude/rules/` or SOUL.md.

| Check | Instances | Verdict |
|---|---|---|
| TS#1 type-safety escapes | 6 | Compliant. No `as any`, no `as unknown as`, no `@ts-ignore`, and no `!` introduced — the one non-null assertion TEA had written was removed at `363f966`/`5c091b6`. The `p as DemoProcess & { mat?: unknown }` cast (demo-jt8-6.test.ts:189) is a narrow intersection used solely to destructure away jt2-6's materialise window, documented at its single use. |
| TS#2 generic/interface pitfalls | 2 | Compliant. `Partial<EggState>` in the two test factories is the override pattern, spread into a fully-populated object; no `Record<string,any>`, no bare `object`/`Function`. |
| TS#3 enums | 0 | N/A — no enum declared or modified. |
| TS#4 null/undefined | 5 | Compliant, and load-bearing here: the fix's `!== undefined` and the reader's `?? 0` are exactly the `??`-not-`||` rule, which is what makes "absent === rung 1" safe. |
| TS#5 module/ESM | 9 | Compliant. All 9 relative imports carry `.js` (Rule #5); type-only imports marked `type`; no ambient `declare`. |
| TS#6 React/JSX | 0 | N/A — no `.tsx`. |
| TS#7 async | 34 | Compliant. Every loader/`import()`/`catchOneEgg` call site is awaited; the one loop with `await` inside is a plain `for`, not `forEach`. |
| TS#8 test quality | 13 | Compliant. No `.only`/`.skip`/`toBeTruthy`/`not.toThrow`; `describe.skipIf(!vendoredAvailable)` is the repo's reasoned CI-degradation idiom and it RAN here (0 skipped). The two vacuity risks TEA self-caught are fixed: the game-start test names the offending player id, and the JT86 verbatim loop is guarded by `expect(mine.length).toBeGreaterThan(0)` so it cannot pass with zero claims. |
| TS#9 build/config | 0 | N/A — no tsconfig or build config touched; `npm run build` clean. |
| JS#1 silent failures | 1 | Compliant. No `catch` added anywhere. `loadClaims()`'s unguarded `JSON.parse` over committed fixtures fails LOUD and matches 10 sibling suites. |
| JS#4 equality/coercion | 0 | Compliant — zero loose `==`/`!=` in the diff. |
| JS#6 Node | 3 | Compliant — encoding given on both `readFileSync` calls; no `require`, no `child_process`. |
| JS#7 regex | 4 | Compliant — no `g`-flag `.test()` reuse, no ReDoS shape, all over trusted committed text. |
| PROJECT — `src/core` purity | 1 | Compliant. The three added lines are a pure `.map`. Purity sweep green (35 tests). |
| PROJECT — radix-cited claims | 7 | Compliant on radix: no bare numeric ROM value is transcribed by JT86-001..007 (they cite labels, addresses and line text), and `JOUSTRV4.SRC` has no `.RADIX` directive. **But see the HIGH finding** — radix compliance is not claim ACCURACY, and JT86-001's gloss fails the latter. |

### Devil's Advocate

Let me argue this change is broken. The strongest attack is that the whole story is built on one
session's reading of a 1982 assembler listing, with the same agent playing TEA, Dev and Reviewer — so
the ROM interpretation was never truly independently checked, and a confident narrative has replaced
evidence. If `DEGGS` were *not* word 9, the P1DEC binding collapses, `EGGS1` is not the egg counter,
`DEATH1 CLR EGGS1` clears something else entirely, and the story has inverted a correct bug report on
the basis of a miscount — shipping a wave reset the ROM never performs while leaving the real respawn
bug in place. I take this seriously enough that I counted the block by hand rather than trusting either
the diff or the rule-checker, and the rule-checker counted it separately: DEGGS is word 9, offset 18,
and P1DEC's second `FDB` row starts at word 8, putting `DEATH1` and `EGGS1` at words 8 and 9. The
binding is real. A second attack: maybe the clear is too aggressive — it fires for every player process
at every advance, so what about a player who is mid-materialisation, or a player at zero lives whose
process lingers? Both are harmless: the ROM's `WNRM` clears EGGS1 and EGGS2 unconditionally, with no
regard for what state either knight is in, so clearing every player process is the faithful behaviour
rather than an over-reach. A third: could the `!== undefined` guard skip a player who genuinely needs
clearing? No — the only consumer reads `?? 0`, so absent and `0` are indistinguishable downstream, and
I probed that a credit-less player passes through with the field still absent. A fourth, and the one
that nearly landed: within a single frame, could the clear steal the rung from the catch that ended the
wave? That would silently rob the player on the most common wave-ending action in the game. I probed
it — 750 is paid, then the counter goes to 0 — and the ordering is guaranteed by a data dependency
rather than by statement order, because `clearable` cannot be computed until the collision pass has
removed the last egg. A fifth: a stressed or absent filesystem. The vendored ROM tree is gitignored, so
on CI `vendoredAvailable` is false and 20 byte-read tests skip; the claim-coverage and prose-correction
tests still run, which is the right split, and I confirmed the block genuinely executed locally (0
skipped) rather than silently vanishing — the `describe.skipIf`-body trap this repo has hit before.
Where the devil's advocate DID land is documentation, not code: the one domain whose specialist is
disabled, and the one place this diff actually asserts something false. Hence the finding.

### Delivery Findings Capture

Recorded under `### Reviewer (audit)` in Design Deviations and in Delivery Findings.

**Handoff:** Back to Yoda (Dev) for one claim-text correction. No source change required.
## Dev Assessment — Rework Round 1

**Implementation Complete:** Yes
**Tests:** 1872/1872 across 75 files; `tsc --noEmit` and `vite build` clean.
**Branch:** `fix/jt8-6-egg-ladder-outlives-life` (pushed, `a91f359`).

**Finding addressed:** the Reviewer's single HIGH — `JT86-001` in
`docs/rom-study/claims/egg-lifetime.json` asserted that every decision record binds "that creature's
own death routine, which is where per-entity state gets cleared".

**I re-verified the evidence before accepting the finding** rather than implementing it on authority,
and it holds — with one detail the finding did not mention that makes the original text worse, not
better: `DEATH1` and `DEATH2` are each bound by **two** records (the play pair P1DEC/P2DEC at :5551 and
:5555, and the attract-mode pair G1DEC/G2DEC at :5543 and :5547), so no death routine in the table is
bound by exactly one record. "That creature's own" was wrong for all nine records, not just the five
non-player ones. I checked the `DDEAD` word of every record before rewriting:

| Records | DDEAD | DEGGS |
|---|---|---|
| G1DEC :5543, P1DEC :5551 | `DEATH1` | `EGGS1` |
| G2DEC :5547, P2DEC :5555 | `DEATH2` | `EGGS2` |
| P3DEC :5559, P4DEC :5563, P5DEC :5567, P6DEC :5571 | `DEATH3` (shared) | `0` |
| P7DEC :5575 (`DSMART` = `PTERO`) | `DEATH4` | `0` |

**Files changed:** `docs/rom-study/claims/egg-lifetime.json` only. No source change — the Reviewer
approved the implementation as correct and explicitly said not to touch `src/`.

**What the rewrite does:** states the bindings explicitly instead of generalising, records that only
`DEATH1`/`DEATH2` clear anything persistent (with what `DEATH3` and `DEATH4` actually do, and that
`DEATH3`'s single `CLR` at :2985 initialises the newly-spawned egg rather than clearing the dead
entity), and adds a corroborating fact I verified: all five non-player records carry `DEGGS = 0`, so an
enemy has no egg counter at all — which is precisely what the `:3039` debug guard catches. That last
detail strengthens the pointer reading the whole story rests on, so it is worth having in the corpus.

The trailing methodology clause is **dropped rather than reworded.** A claim should assert what its
cited line says; the lesson about resolving a pointer before believing a lifetime belongs in the TEA
sidecar and the user-memory entry, where it is already recorded. Putting method into the claims file is
how a citable corpus acquires statements nobody verified.

**Delivery findings:** no new ones. `tests/audit/citations.test.ts` (the fleet byte-verification gate,
87 tests with the jt8-6 provenance suite) passes, so the rewritten claim still matches its raw source
line including the leading tab.

**Handoff:** Back to Obi-Wan for review round 2.
## Subagent Results — Review Round 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (after re-query) | findings | 2 confirmed + 1 added | confirmed 3, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled specialists returned, 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 3 confirmed, 0 dismissed, 0 deferred

**Process note, recorded because it nearly cost coverage:** the round-2 rule-checker's first return
contained only its closing lines (files-referenced list + `git status`) — no verdicts at all. An
incomplete return is not a clean return, and I could not have claimed its domain from it. I re-queried
the same agent for the per-assertion results rather than assuming, and its full audit is what row 9
reflects. Worth remembering: a subagent whose result *looks* short may have done the work and lost the
report — ask before either trusting or re-dispatching.

## Reviewer Assessment — Review Round 2

**Verdict:** REJECTED — the same claim, two new factual errors. The implementation remains correct and
untouched; round 2 changed only `JT86-001`'s prose (`git diff 726d533..HEAD` = 1 file, 1 line).

### Findings

**[HIGH][RULE] `JT86-001` cites DEATH3's extent wrongly, and the wrong extent hides a false count —
`docs/rom-study/claims/egg-lifetime.json`**

1. **The extent is wrong.** The claim cites `DEATH3 (:2952-2990)`. The routine starts at :2952 and its
   terminating instruction is `1$ PULS X,U,PC` at **:3007**; :2990 (`DE3HRD`) is a mid-routine
   branch-target label, not an end. The citation truncates the routine by 17 lines.
2. **"its single CLR (:2985)" is false.** DEATH3 contains **five** `CLR`s — :2985, :2995, :2996, :2997,
   :2998.
3. **The two errors are linked, which is what makes this worth a round.** The truncated range stops
   immediately before :2995-2998, so a reader who checks only the cited span sees "single CLR" as
   apparently true. A wrong extent does not merely mislead; it *manufactures* corroboration for the
   wrong count. I found this independently, and the rule-checker reached the same conclusion including
   the concealment mechanism.

The claim's *conclusion* still holds — all five `CLR`s index `,Y`, the egg process freshly created by
`VCUPROC` (:2974), so DEATH3 clears nothing belonging to the dead entity. Only the stated support is
wrong. **Additional corroboration this diff also contradicts:** `egg.ts`'s own `spawnEgg` docstring
already cites `:2991-2996` for the velocity transfer and bump-register clears, so the committed dossier
elsewhere reads past :2990 — the new claim is inconsistent with its own neighbours.

**[MEDIUM][RULE] Same sentence: "decrements the GLOBAL NSMART/NENEMY counts" glosses two different
mechanisms.** `NENEMY` is a literal `DEC` (:2965). `NSMART` is not decremented at all — it is reduced by
a *variable* amount, the killed enemy's own `PCHASE`: `LDA NSMART / SUBA PCHASE,U / STA NSMART`
(:2962-2964). Both are confirmed global (`RMB 1` singletons in `RAMDEF.SRC`/`SHRAMDEF.SRC`), so the
"GLOBAL" half is right. Fold into the same edit.

### Required fix — apply this, then verify it

The root cause of both rounds is the same: **the claim is over-specified.** A claim about `DDEAD`'s
declaration at :112 does not need DEATH3's line extent or a `CLR` inventory, and every such detail is
a fresh chance to be wrong. So the correction is to state the load-bearing facts in a form that needs
no inventory. I enumerated every write in both routines to find that form:

- **DEATH3 writes NOTHING to the dead entity.** Its only writes are `STA NSMART` (:2964),
  `DEC NENEMY` (:2965), and everything from :2976-3001 indexed `,Y` — the new egg. Zero `,U` stores.
- **DEATH4's only writes to the dead entity are its dying-animation program:** `STA PJOYT,U` (:2943)
  and `STD PJOY,U` (:2945). It contains no `CLR` at all.

Suggested text (drop the extents and the count):

> `DDEAD` is the DECISION BLOCK's death-wish hook, keyed to the LOSER:
> `DDEAD RMB 2  DEATH WISH ROUTINE (REG.X VICTOR, REG.U LOSER)`. All nine decision records bind it —
> G1DEC/P1DEC to DEATH1, G2DEC/P2DEC to DEATH2, the four enemy records P3DEC-P6DEC to DEATH3, and
> P7DEC (the pterodactyl) to DEATH4 — so a death routine belongs to a creature TYPE and is shared,
> never to one creature. Only the players' routines clear a persistent per-player cell: DEATH1/DEATH2
> clear the egg counter (JT86-002/003). DEATH3 makes no write to the dead entity at all — it adjusts
> the global enemy counts (`STA NSMART` after `SUBA PCHASE,U`, and `DEC NENEMY`) and writes only to the
> egg process it creates — and DEATH4's only writes to the dead entity are its dying-animation program
> (`PJOYT`/`PJOY`). Consistently, all five non-player records carry DEGGS = 0: an enemy has no egg
> counter at all, which is what the debug guard at :3039 ('SHOULD NEVER BE ZERO') catches.
> (JOUSTRV4.SRC:112).

**Before committing it, verify every assertion in it against the source** — I drafted it, and I also
drafted the text that failed this round. Where a detail cannot be verified cheaply, delete it rather
than soften it. Do not touch `src/`; the implementation is approved.

### Observations

- **[VERIFIED] The implementation is untouched and still correct** — `git diff 726d533..HEAD` is one
  line in a JSON claim string; `JT86-001`'s `source` block (file/line/verbatim, including the tab-free
  column-0 label) is byte-identical to round 1. Suite 1872/1872 across 75 files, lint and build clean,
  tree clean, HEAD pushed (`a91f359`).
- **[VERIFIED] The round-1 defect is genuinely gone and did not come back in another form** — the
  rejected methodology clause is absent, and the rule-checker specifically looked for methodology creep
  and found none. Of the remaining universal quantifiers ("Every decision record", "DEATH4 only runs",
  "Neither… nor", "all five non-player records", "no egg counter at all"), every one except "single
  CLR" is fully supported.
- **[MEDIUM] `EGGSCR` has TWO call sites, and our port models only one — a real unimplemented mechanic,
  filed as a follow-up rather than fixed here.** `grep -n 'JSR[[:space:]]*EGGSCR'` returns :3006 and
  :3021. jt8-4 modelled :3021 (the player/egg collision). :3006 is **inside DEATH3**: when the dying
  enemy's egg count is transferred and decremented to zero (`STA PEGG,Y / DEC PEGG,Y  YOU CAN ONLY
  SQUEEZE SO MUCH BLOOD FROM AN EGG / BNE 1$`), the ROM does `TFR Y,X / LDU ,S  GET VICTORS WORKSPACE /
  BEQ 1$ / JSR EGGSCR  SCORE EGG` — so an enemy's LAST egg is scored to the victor immediately on the
  kill, bumping the egg ladder, with no catch required. Our port implements the decrement
  (`spawnEgg`'s `eggsLeft: victim.eggsLeft - 1`, egg.ts:141) and treats `eggsLeft === 0` as permadeath
  where `hatchEgg` returns null (egg.ts:273-275) — but nothing scores it. Two consequences: a missing
  score/ladder bump in play, and `JT84-003`'s "the collision IS the scoring trigger; there is no
  separate pickup step" is incomplete. This is adjacent to jt8-6 (it bumps the very counter under
  review) but it is an increment-site question, not a lifetime one, so it is **out of scope** — filed
  as a Delivery Finding for a new story rather than grown into this one.
- **[LOW] Round 2 is prose-only, and I am aware of the proportionality cost.** Two reject rounds on a
  3-point story's documentation is a lot. I am rejecting anyway because wrong *line citations* in a
  dossier whose sole function is verifiable citation are the one defect class this repo cannot carry,
  and because the repo's citation gate structurally cannot catch them: `tests/audit/citations.test.ts`
  verifies the `source.line`/`verbatim` pair, never line references embedded in claim *prose*. That
  blind spot is exactly where both rounds' errors landed. The fix above is mechanical and specified
  verbatim; if it lands as written and verifies, round 3 approves.

### Rule Compliance

Unchanged from round 1 — no code, test, config or type surface was touched (the diff is one JSON string
value). The full round-1 table stands: TS#1-#9 and JS#1-#11 compliant, `src/core` purity compliant,
`.js` extensions compliant. The **radix-cited-claims** project rule is the one in play, and it is the
one this round fails: radix compliance is satisfied (no bare numeric ROM value is transcribed), but
claim ACCURACY is not — see the HIGH finding.

### Devil's Advocate

The strongest argument against my own verdict is that I am now blocking a correct, twice-verified
three-line fix over adjectives in a documentation string, on the second round, in a session where I
also wrote the text I am rejecting — which looks less like quality control and more like a reviewer
unable to stop reviewing. If the conclusion of the claim is true, and the code is right, what is
actually harmed by shipping a slightly loose supporting sentence? Concretely: a future story reads
"DEATH3 (:2952-2990)", opens that span to check something else about enemy death, and never sees the
`JSR EGGSCR` at :3006 — the exact unmodelled mechanic I found this round, which lives *in the truncated
tail*. That is not a hypothetical harm, it is the harm, and I found it only because I refused to trust
the cited extent. The same tail contains four of the five CLRs. So the wrong range does not merely
misdescribe: it hides a real mechanic and manufactures false support for a false count. A second
argument: perhaps the whole claim should be deleted rather than corrected, since JT86-002..007 already
carry the story's load and JT86-001 is context. That is defensible, and I would accept deletion as an
alternative fix — but the DDEAD-is-loser-keyed fact does real work in the refutation this story rests
on, so it earns its place if stated carefully. A third: am I certain about :3007? `1$ PULS X,U,PC` is a
return, and :3009 begins `PLYEGG` after a `*` separator — but `1$` is a local label, so could the
routine be entered elsewhere and continue past? No: `PULS X,U,PC` pops the return address into PC, which
terminates unconditionally regardless of entry point. And DEATH4 at :2948 ends the same way, which the
claim cites correctly — so the citation style is right and only DEATH3's number is wrong. Finally, the
disabled `comment_analyzer` remains the structural gap: for two rounds running, every enabled check has
been green and every defect has been in prose.

### Delivery Findings Capture

Recorded under `### Reviewer (review round 2)` in Delivery Findings.

**Handoff:** Back to Yoda for one claim-text correction. No source change.
## Dev Assessment — Rework Round 2

**Implementation Complete:** Yes
**Tests:** 1872/1872 across 75 files; `tsc --noEmit` and `vite build` clean.
**Branch:** `fix/jt8-6-egg-ladder-outlives-life` (pushed, `1cdb4a9`). Files changed: only
`docs/rom-study/claims/egg-lifetime.json`. No source change — the implementation stays approved.

**Findings addressed:** the round-2 HIGH (wrong DEATH3 extent + false "single CLR") and the MEDIUM
(NSMART described as a decrement). Both accepted — I verified the evidence rather than taking it: the
routine's terminator is `1$ PULS X,U,PC` at :3007 and :2990 is the `DE3HRD` branch label, so the old
range truncated 17 lines; there are five `CLR`s; and NSMART is `LDA NSMART / SUBA PCHASE,U / STA NSMART`
(:2962-2964) against NENEMY's literal `DEC` (:2965).

**I took the Reviewer's diagnosis of the root cause rather than just its patch.** Both rounds failed
the same way: a claim about `DDEAD`'s declaration at :112 was carrying DEATH3's line extent and a `CLR`
census, and each of those details was an independent chance to be wrong while adding nothing to what
:112 says. So the rewrite drops them instead of correcting them, and states the load-bearing facts in a
form that needs no inventory. I established that form by enumerating every store in both routines:

| Routine | Every write it makes |
|---|---|
| `DEATH3` (:2952-3007) | `STA NSMART` (:2964), `DEC NENEMY` (:2965) — both global — and everything else indexed `,Y`, the egg process it just created. **Zero `,U` stores: it never writes the dead entity.** |
| `DEATH4` (:2941-2948) | `STA PJOYT,U` (:2943) and `STD PJOY,U` (:2945) — the dying-animation program. No `CLR` at all. |

That is strictly stronger than the claim it replaces ("clears no persistent per-entity cell") and it
cannot rot when a line number shifts.

**I did not apply the suggested text verbatim — it contained an error of its own.** The Reviewer's draft
said the routines are "shared, never to one creature". That is false: `DEATH4` is bound by exactly ONE
record (P7DEC). I counted every binding before writing anything — DEATH1 ×2, DEATH2 ×2, DEATH3 ×4,
DEATH4 ×1 — and the committed text states those counts instead of asserting a universal. Worth recording
because the Reviewer explicitly warned that it had drafted the failing text too and asked for the
suggestion to be verified rather than trusted; doing that caught a third would-be error before it landed.

**Verification of the new text:** every assertion re-derived from `JOUSTRV4.SRC` — the :112 comment, all
nine bindings with their line numbers, the two attract/play pairs, the four-way DEATH3 share, P7DEC as
the pterodactyl, both routines' complete write sets, `DEGGS = 0` on all five non-player records, and the
:3039 guard text. Mechanically confirmed the fragile assertions are gone: the claim no longer mentions
:2952/:2990/:3007, no longer says "single", and no longer calls NSMART's subtraction a decrement.
`tests/audit/citations.test.ts` (the byte-verification gate) passes, so the `verbatim` field still
matches its raw source line.

**Delivery findings:** none new. The `EGGSCR`-second-call-site gap the Reviewer found stays filed as a
follow-up story, untouched — it is an increment-site question and out of this story's scope.

**Handoff:** Back to Obi-Wan for review round 3.
## Subagent Results — Review Round 3

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 1 non-blocking editorial note | confirmed 0, dismissed 0, deferred 1 |

**All received:** Yes (2 enabled specialists returned, 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed, 0 dismissed, 1 deferred (editorial, recorded as [LOW] below)

## Reviewer Assessment — Review Round 3

**Verdict:** APPROVED

The claim's fourth draft is the first with no factual error in it. All 15 assertions were verified
against the vendored source by `reviewer-rule-checker` independently of my own audit, and both of us
enumerated the write sets rather than accepting the prose. The implementation has been correct and
untouched since round 1: `git diff a91f359..HEAD` is one line inside a JSON string, and `JT86-001`'s
`source` block is byte-identical.

### What changed my verdict from round 2

Not persistence — the text is structurally different. Rounds 1-3 all died on the same mechanism: the
sentence asserted more than its cited line supports (a universal about death routines; then a line
extent and a `CLR` census). The accepted draft **removes the categories of assertion that kept being
wrong** rather than correcting their values: no line extents, no instruction inventory. In their place
it states each routine's COMPLETE write set, which is both stronger and stable — it cannot rot when a
line number shifts, and it is checkable by one grep.

The decisive claim, `"DEATH3 makes no write to the dead entity at all"`, I verified by enumerating every
memory-mutating instruction in the routine's true extent (:2952-3007): sixteen writes, of which two are
the globals `NSMART`/`NENEMY` and fourteen index `,Y`, the egg process created at :2974. **Zero index
`,U`.** I then checked it transitively, which the claim does not require but a reader might assume:
DEATH3's callees do not touch the dead entity either — when it calls `EGGSCR` at :3006, `U` holds the
VICTOR, so the counter written at :3053 is the victor's `EGGS1`/`EGGS2` and the workspace writes at
:3036/:3054 land on the egg. Nothing anywhere in the death path writes the dead enemy.

### Observations

- **[VERIFIED] Every absolute in the text is supported.** The three failed drafts all died on a
  quantifier, so I ruled on each survivor individually: "All nine decision records bind it" (checked all
  nine, none zero); "the four enemy records share DEATH3" (:5559/:5563/:5567/:5571 exactly); "Only the
  players' routines clear a persistent per-player cell" (DEATH1/DEATH2 do; DEATH3/DEATH4 do not);
  "no write to the dead entity at all" (0 of 16 writes index `,U`); "writes only to the egg process it
  creates" (14 of 16, all `,Y` from `VCUPROC`); "all five non-player records carry DEGGS = 0". The
  rule-checker ruled the same set independently and refuted none.
- **[VERIFIED] Dev caught an error in MY suggested text and did not apply it blind.** My round-2 draft
  said the routines are "shared, never to one creature" — false, since DEATH4 is bound by exactly one
  record (P7DEC). Dev counted the bindings before writing (DEATH1 ×2, DEATH2 ×2, DEATH3 ×4, DEATH4 ×1)
  and the committed text states those counts instead of a universal. That is the correct response to a
  reviewer's suggestion, and it is the reason this round is clean rather than a fourth failure.
- **[VERIFIED] The binding-pair description is accurate, not just plausible.** "the attract-mode and play
  records for each player" — `GOVER` selects `#G1DEC`/`#G2DEC` over `#P1DEC`/`#P2DEC` at process
  creation (:1025-1029, :1041-1045). The ROM's own word is "GAME SIMULATION"; "attract-mode" is a fair
  gloss and the mechanism is real.
- **[VERIFIED] Mechanical state unchanged and clean** — 1872/1872 across 75 files, `tsc --noEmit` clean,
  `vite build` clean, `tests/audit/citations.test.ts` 56/56 with the `verbatim` still matching the raw
  line byte-for-byte, tree clean, HEAD == origin (`1cdb4a9`), no debug smells. Three rounds of prose
  edits have not moved a single test.
- **[LOW][RULE] Deferred editorial note from the rule-checker, not worth a fourth round.** "Only the
  players' routines clear a persistent per-player cell: DEATH1/DEATH2 clear the egg counter" sits beside
  much stronger exhaustive language about DEATH3/DEATH4, and DEATH1/DEATH2 in fact do more than that one
  clear (`INC PLYD1`/`PLYD2`, then a fall-through to `SPDIE`). The sentence is technically correct — it
  claims what they clear, not everything they do — and `JT86-002`/`003` carry the detail. Recorded rather
  than blocked: the story is 3 points and this is a shading of emphasis, not a false statement.
- **[MEDIUM] The `EGGSCR` second-call-site gap stands as a filed follow-up, unaddressed here by design.**
  `:3006` inside DEATH3 scores an enemy's LAST egg to the victor on the kill, bumping the ladder with no
  catch; our port drops the award. It is recorded under `### Reviewer (review round 2)` in Delivery
  Findings with the full instruction trace, and SM should carry it into a new story at finish. I am
  deliberately NOT growing jt8-6 to cover it — that story is the counter's lifetime, this is an
  increment site.
- **[VERIFIED] Round-1 findings are all still discharged.** The retired "persists" overclaim has not
  reappeared in any of the four sites, and no methodology or editorial clause crept back into the claim
  (the rule-checker checked for exactly that and found none).

### Rule Compliance

Unchanged from round 1 — rounds 2 and 3 touched no code, test, type or config surface. TS#1-#9 and
JS#1-#11 compliant, `src/core` purity compliant, `.js` extensions compliant. The **radix-cited-claims**
rule is the one that failed twice and now passes on both axes: radix (no bare numeric ROM value is
transcribed) and accuracy (all 15 assertions verified).

### Devil's Advocate

The case against approving is that I have now rejected this sentence twice and am approving the version
that is merely the first one nobody has found a hole in yet — which is not the same as the first one
without a hole. Three drafts each looked right to their author, and the only reason two were caught is
that a second reader enumerated instructions instead of reading prose. What if the fourth draft's error
simply requires a third kind of check nobody has run? That is a real risk and I cannot fully retire it.
What I can say is that this draft's error surface is deliberately smaller: it makes no claim about line
extents or instruction counts, which is where both previous failures lived, and its strongest assertion
is of a form that is exhaustively checkable — "no write to the dead entity" is settled by listing every
write, which two of us did separately and which any future reader can redo in one grep. Compare that to
"its single CLR (:2985)", which required trusting a range. The remaining exposure is interpretive: a
reader could take "Only the players' routines clear a persistent per-player cell" as a complete account
of DEATH1/DEATH2, which it is not — that is the deferred LOW, and it is bounded because JT86-002/003
carry those routines in full. A second angle: should the claim exist at all? JT86-002..007 carry the
story's evidential load, and JT86-001 is context. Deleting it would have been a defensible fix in round
2 and would have ended this two rounds earlier. But the DDEAD-is-loser-keyed fact is load-bearing for
the refutation the whole story rests on — it is what proves the clear belongs to the dying man rather
than his killer — so it earns a claim if stated carefully, and it now is. Finally, the honest structural
lesson: for three rounds every enabled check was green and every defect was in prose, in a repo whose
dossier is cited as primary evidence and whose `comment_analyzer` is switched off. The citation gate
verifies the `source.line`/`verbatim` pair and cannot see line references embedded in claim bodies. That
blind spot, not this sentence, is the thing most worth fixing next; it is filed.

### Delivery Findings Capture

No new findings in round 3. The round-2 `EGGSCR` follow-up and the `comment_analyzer` gap remain filed
for SM to carry forward.

**Handoff:** To Thrawn (SM) for the finish phase.
# Story Context: jt9-1

**PJOY,U is an ENTRY ADDRESS: a glide wake skips LINET's promotion check and its lava-troll looker**

Epic: jt9 · Points: 5 · Priority: p3 · Workflow: tdd

---

## Problem

jt5-8 taught the port that `PJOY,U` holds a **state**. The ROM treats it as an **entry address**,
and that difference is this story.

The scheduler dispatches a process with `JSR [PJOY,U]` — an *indirect* call through the word in
the workspace. SM re-opened the vendored source at setup: that instruction occurs at
`JOUSTRV4.SRC:5830`, `:5951` and `:6456`, and **nowhere else** (`grep -n "\[PJOY"` returns exactly
those three). So whatever word sits in `PJOY,U` is the address execution *resumes at*, and every
instruction above it is skipped — not conditionally, structurally.

```asm
; JOUSTRV4.SRC:3722-3757 — LINET, re-opened at setup, instruction for instruction
LINET   LDA   NSMART        GET NUMBER OF SMART ENEMIES     ┐ (1) THE PROMOTION CHECK
        CMPA  WSMART        BELOW MINIMUM INTELLIGENCE?     │  reachable ONLY from here
        BLO   LNTSMT         BR=YES, GET SMARTER            ┘
        DEC   PLAVT,U                                       ┐ (2) THE LAVA-TROLL LOOKER
        BGT   1$                                            │
        LDA   LNTLAV        LINE TRACKING LAVA TROLL LOOKER │  a SECOND entry into
        STA   PLAVT,U                                       │  the flapping wake
        LDX   PPREV         LAVA TROLL AFTER ME?            │
        LDA   PID,X                                         │
        CMPA  #LAVID                                        │
        BEQ   LNTUP                                         ┘
1$      LDA   #AOFFL1       ASSUME NEAR TRACKING LINE 1     ┐ the lane decision —
        ...                                                 │  jt5-8 modelled THIS
LNTUP   LDD   #LNTOFP       GET OFF GROUND OR JUST FLAP     │  and only this
        STD   PJOY,U                                        ┘
        ...
LNTOFP  LDD   #LINET        ← :3759. A glide wake ENTERS HERE.
```

`LNTUP` parks `LNTOFP` (`:3746-3747`). The next wake therefore begins at **`:3759`**, and
**everything from `:3722` to `:3758` is skipped** — both blocks above. jt5-8 built the
alternation and the lane-decision bypass faithfully. It did not build the bypass of the two
things that sit *above* the lane decision, and the port still runs that whole prologue on every
wake.

### (1) The promotion check

`LNTSMT` is reachable only from `LINET`'s own first three instructions. A wake entering at
`LNTOFP` never executes them, so **the machine cannot promote a dumb bird on its glide wake.**

The port promotes unconditionally:

```ts
// plugins/joust/src/core/frame.ts:342-349
if (p.kind === 'enemy' && p.enemy) {
  let enemy = p.enemy
  let next = budget
  if (enemy.pchase === 0 && shouldPromote(next)) {   // ← :345, no pjoy in sight
    const promoted = promote(enemy, next)
```

### (2) The lava-troll looker

`:3725-3732` is a **second, independent entry** into the flapping wake. `PLAVT,U` counts down;
on the wake it expires it reloads from `LNTLAV`, reads the process **immediately behind this one
in the list** (`LDX PPREV / LDA PID,X`), and if that process is a lava troll, branches straight to
`LNTUP` — the bird flaps **regardless of its lane decision**. `linet()` implements only
`:3733-3757` and models none of it. It lives in the same skipped prologue, which is why the two
belong in one story.

TEA pinned this as an ORACLE test on jt5-8 (`plugins/joust/tests/dumb-wingbeat-source.test.ts`),
so the law is already stated in the suite and must not be re-derived from scratch. This story
turns it from documenting-only into backing a live behaviour.

---

## THE FIXTURE — corrected at setup, and the single most expensive thing to get wrong

The story as filed said the repro was "seed 0x2468, frame 2688, process 514 — 1 of 11 promotions
across 0xbeef/0x2468/0xface at 3000 frames". SM **reconfirmed it exactly** — but only on one
harness of four, and the filing did not say which. Measured, 3000 frames × three seeds each:

| harness | promotions | glide-carrying | glide-frames (control) |
|---|---|---|---|
| `createGame` + **both players IDLE** | **11** | **1** — 0x2468 **f=2688 proc 514** → `boundr`, `pjoy-entering={kind:'glide'}` | 317 / 366 / 220 |
| `createGame` + the `scripted` inputs | 14 | **0** | 441 / 254 / 466 |
| `createWaveDemo` + `scripted` | 6 | 0 | 320 / 132 / 202 |
| `createWaveDemo` + idle | 10 | 0 | 320 / 292 / 220 |

**The trap.** `scripted` / `inputsAt` (`flap = frame % 13 === 0`, `dir = DIRS[frame % 5]`) is the
shared jt5-1/jt5-3 script, the vocabulary of every audio test in this plugin, and the coordinate
system all four re-baselined files live in. It is the obvious harness to reach for — and on it
**the finding looks stale**: 14 promotions, none glide-carrying, and proc 514 promotes at frame
**1792** carrying nothing. Use **idle inputs** for the end-to-end pin, and say in the test why.

**The control matters more than usual.** The effect is 1 promotion in 11, so an end-to-end
assertion of "the count is ZERO after the fix" is a hair away from vacuous. The sweep must carry
a positive control proving it can *see* a glide at all — glide is carried on 132–466 enemy-frames
in every harness above, so the observation is cheap and there is no excuse for a blind zero.

Measured by SM with a temporary vitest file under `plugins/joust/tests/`, run, deleted, and
`git status --short` verified empty afterwards — the method jt5-8's AC5 documents.

---

## What is already faithful — do not rebuild it

- **The `PjoyState` glide variant, the alternation, and the lane-decision bypass.** jt5-8 shipped
  them. `dumbWingbeat` (`enemy.ts:1228-1242`) is the mechanism; `withWingCadence` and
  `withCliffDwell` already fence `linet` out of the workspaces it must not have.
- **`promote()`'s guard** that an already-smart enemy is never re-promoted
  (`enemy.ts:432-437`, `JOUSTRV4.SRC:3766`).
- **The ORACLE suite** in `dumb-wingbeat-source.test.ts` — it already states the LNTOFP law and
  the lava-troll looker against the vendored source.

## Determinism — the expensive half

Both changes move which frame a bird flaps or promotes on, so the jt2 seeded-replay pins move
again: the same 20-assertion, 4-file blast radius jt5-8 re-baselined (`audio-events`,
`audio-thud`, `audio-flap`, `audio-transporter-split`).

**`sprint/archive/jt5-8-session.md` §"AC5 — the re-baseline, and its bound" is required reading
before the first edit.** It carries the full moved-pin table and the method: every frame re-found
by sweeping the seed for *the test's own stated precondition*, never by nudging a number toward
the new output. Two of its pins had an **empty solution set** and one of those "would have passed
while lying" — 0x2468's post-contact anchor sat at frame 620 after its contact moved to 746, so a
test named "AFTER it" stayed green while sitting strictly *before* the contact. Expect that shape
again.

**Do not land with jt9-8** (filed as jt5-9), which moves the same fingerprints for a different
reason. Verified `backlog` at setup.

Expected to stay **bit-identical**: `rng` on all three fingerprints, and every PLAYER row at every
anchor. A move there is a regression, not a re-baseline.

---

## The five unrouted jt5-8 findings this story closes

Three were in the filing; SM found two more unrouted and the user ruled both IN (2026-08-02).
All were re-verified at their cited lines at setup — every one is still live.

| # | Sev | Where | What |
|---|---|---|---|
| R-3 | LOW | `dumb-wingbeat-source.test.ts:126`, `:155` | Two ORACLE negative claims with no non-vacuity floor. `:126` asserts only *inside* a `for` over `insnsIn(...)`; `:155` compares a filtered list to `[]`. An empty parse passes both. Add `expect(insns.length).toBeGreaterThan(0)` ahead of each. |
| R-6 | LOW | `tests/helpers/enemy-contract.ts:250-253` | The jt1-3 contract type still declares a **three**-variant `pjoy` (`'wing'` \| `'interval'` \| `'dwell'`) and never gained `'glide'`. A future exhaustive `switch` written against it compiles clean while missing the case. |
| R-7 | LOW | `audio-flap.test.ts:707-708` | `entity: e!` where `e` is genuinely `EntityState \| undefined` (`buzzardOf(d)?.enemy?.entity`). The stated precondition at `:703` compares two `?.`-chained values and does not establish it; a missing buzzard throws inside `linet()` rather than failing cleanly. Use `expect(e).toBeDefined()`. |
| **R-2** | **MEDIUM** | `plugins/joust/src/core/enemy.ts:439` | The Reviewer wrote *"file with R-1"* and it was filed **nowhere**. Mutation-verified on jt5-8's landed code: deleting `pjoy: undefined` from `promote()` left all 2463 joust tests green. **Dispose of it, do not fence it** — see below. |
| **R-4** | **LOW** | `audio-thud.test.ts:900-901` | Live prose, never corrected. It says the person-thud seed scan found `0x2221 (f=1241), 0x2332, 0x310f and 0x3442 (all f=973)` and that these "are the only hits". R-4 measured **36 of 400** seeds in `[0x2200,0x2390)` produce a `player-thud`, **20 of them at frame 973** — ~9%, not four. |

### Why R-2 is a disposal and not a fence

SM measured it across all four harnesses: **every** promotion entered carrying `none` or
`glide` — never `'interval'`, never `'wing'`. A dumb `linet` bird's `pjoy` is only ever absent or
a glide (`withCliffDwell` early-returns on `brain === 'linet'` at `enemy.ts:1269`; `linet` carries
no seek and no wing cadence). So once promotion is gated on the glide, **`pjoy: undefined` inside
`promote()` is unreachable by construction.** Delete it, or keep it with a comment that says
plainly that it cannot be reached and why. Writing a test to fence a branch that cannot be taken
is what R-2 already found wrong once.

### Why R-4 belongs here specifically

This story is the one that re-opens that pin. Its own re-baseliner is the reader being misled —
they will read "the only hits" and conclude such seeds are scarce while looking for a replacement.
Checked and rejected as owner: **jt9-2**'s mechanism is line-ref → symbol-ref conversion, which
would never touch a false census claim.

**R-5 needs no work.** Its only wrong text ("154/154 on all three seeds") is in the archived
jt5-8 Dev Assessment — dead history. The live pin at `dumb-wingbeat.test.ts:491-493` already
carries the correct `0xface: { down: 69, playerDown: 154, playerUp: 153 }`.

---

## Acceptance Criteria

1. A dumb (linet) enemy cannot promote on a GLIDE wake: with a pending LNTOFP obligation, the
   promotion gate at `frame.ts:345` is skipped and promotion happens on the next non-glide wake
   instead — because LNTSMT is reachable only from LINET's own `LDA NSMART / CMPA WSMART /
   BLO LNTSMT` (`JOUSTRV4.SRC:3722-3724`), which a wake entering at `:3759` never executes.
2. The regression is pinned end-to-end, not only at the unit: a seeded replay is swept for a
   promotion occurring while `pjoy` is a glide, and the count is ZERO. **The fixture is the
   IDLE-input replay** — `createGame(0x2468)` stepped 3000 frames with both players idle, where
   frame 2688 / process 514 is the single glide-carrying promotion out of 11. The plugin's usual
   `scripted`/`inputsAt` harness does NOT reproduce it (14 promotions, zero glide-carrying), so
   the test must state which harness it uses and why. The sweep carries a POSITIVE CONTROL
   proving it can see the thing it reports absent.
3. LINET's lava-troll looker (`:3725-3732`) is modelled: the `PLAVT` countdown reloads from
   `LNTLAV`, and on a wake where it expires, a dumb bird whose `PPREV` process carries `LAVID`
   enters the flapping wake regardless of its lane decision. The existing ORACLE tests must go
   from documenting-only to backing a live behaviour.
4. The jt2 seeded-replay pins are re-baselined deliberately and the bound is stated: every moved
   pin re-found by sweeping for its own precondition, never by nudging a number toward the new
   output, with any pin that had to change seed or anchor called out and justified. `rng` and
   every PLAYER row are expected to stay bit-identical at every anchor.
5. jt5-8's three LOW test leftovers are closed (R-3, R-6, R-7 — see the table above).
6. R-2 is DISPOSED OF, not fenced: `pjoy: undefined` in `promote()` is deleted, or kept with a
   comment that says plainly it cannot be reached and why. No test fences a branch that cannot
   be taken.
7. R-4's false rarity narrative is corrected in place at `audio-thud.test.ts:900-901`.

---

## Files

| Path | Role |
|---|---|
| `plugins/joust/src/core/frame.ts:345` | the unconditional promotion gate |
| `plugins/joust/src/core/enemy.ts` | `linet()`, `dumbWingbeat` (`:1228-1242`), `promote()` (`:428-441`) |
| `plugins/joust/tests/dumb-wingbeat-source.test.ts` | the ORACLE suite; R-3's two floorless claims at `:126`, `:155` |
| `plugins/joust/tests/dumb-wingbeat.test.ts` | jt5-8's behavioural pins, incl. the cue counts at `:491-493` |
| `plugins/joust/tests/helpers/enemy-contract.ts:250-253` | R-6's three-variant `pjoy` |
| `plugins/joust/tests/audio-flap.test.ts:707-708` | R-7's `e!` |
| `plugins/joust/tests/audio-thud.test.ts:900-901` | R-4's false rarity narrative |
| `plugins/joust/tests/audio-events.test.ts`, `audio-transporter-split.test.ts` | re-baseline blast radius |
| `reference/williams-source/joust/JOUSTRV4.SRC` | the vendored ROM source, present in this checkout |
| `sprint/archive/jt5-8-session.md` | the re-baseline method and moved-pin table — required reading |

## Commands

```bash
npx vitest run --project joust        # this app's suite
npm run lint                          # tsc --noEmit, repo-wide
npm run test:orchestrator             # the cabinet's wiring invariants
```

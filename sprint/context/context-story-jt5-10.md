# Story jt5-10: Does the pterodactyl reach FLAPLP/FLIPLP? P7DEC binds the enemy wing cues to a bird with no flap model

## Summary

An open question jt5-3 surfaced and could not answer inside its scope: **does the ROM's pterodactyl
flap?** `P7DEC` — the pterodactyl's decision block — binds `SNELWU`/`SNELWD`, the same wing-up and
wing-down cues as the buzzards, yet this port's `stepPteroFlight` has no flap model at all. A
decision block only needs `DSNWU`/`DSNWD` bound if something loads through them, and there are
exactly two loaders, both inside the `FLAPLP`/`FLIPLP` loops. Either the ptero's movement routine
reaches those loops — and the port owes a cue — or the binding is boilerplate copied across the
enemy blocks and the ptero is silent by design.

**This is a READ-THE-ROM story before it is a code story.** Settle it from the source, then either
emit the existing enemy wing kinds for the ptero or record explicitly that the ptero is silent by
design — with the losing branch named as refuted, so nobody re-opens the question with less evidence
than we have now.

Why it matters now: jt5-2 bakes the samples. If the ptero shares `SNELWU`/`SNELWD` it needs **no new
sample at all**. If this is never settled, a reviewer asks the question again at bake time with less
evidence to hand.

## Background

> ✅ **The epic description was MEASURED at setup and needs no correction.** All eight of its
> citations were re-opened against the tree at `e5457ab` and every one holds — see the table in
> `.session/jt5-10-session.md` → *SM Setup Assessment*. This banner exists because "no corrections"
> is itself a measurement result and the next reader should not repeat the sweep. The description
> below is reproduced as current, verified fact.

### What the ROM says, verified

**The decision blocks and the binding.** Each species has a decision block whose third `FDB` row is
its sound table. The enemy blocks run `P3DEC` (`:5558`) through `P7DEC` (`:5574`), sound rows at
`:5560`, `:5564`, `:5568`, `:5572`, `:5576`:

```
JOUSTRV4.SRC:5574-5577   (P7DEC — the pterodactyl)
5574: P7DEC	FDB	LINET,PTERO,0000,$0000,SCOPL2,0,TREPL3,EMYDIE
5575: 	FDB	DEATH4,0,STENMY,SCRHUN,0,EMYTIM
5576: 	FDB	SNELWU,SNELWD,SNEMSK,SNEMS2,0,0,SNEFAL,0,SNECRE
5577: 	FCB	WHI*$11,$10,MSGAMO
```

Compare a buzzard's row — `P3DEC`'s at `:5560` — which is identical except for positions 5 and 6:

```
JOUSTRV4.SRC:5560   (P3DEC — a buzzard)
5560: 	FDB	SNELWU,SNELWD,SNEMSK,SNEMS2,SNERU1,SNERU2,SNEFAL,0,SNECRE
```

So the ptero **does** carry `SNELWU`/`SNELWD` in the wing-up/wing-down slots, and **zeroes the two
RUN entries** (`SNERU1`/`SNERU2`) that every buzzard carries — consistent with a bird that never
touches the ground. That is the evidence the ptero MIGHT flap.

**The only two consumers of that binding.** `DSNWU` and `DSNWD` are declared once each and read
exactly twice in the whole file:

```
118:  DSNWU	RMB	2	SOUND OF WINGS GOING UP
119:  DSNWD	RMB	2	SOUND OF WINGS GOING DOWN
6183: 	LDX	DSNWU,X		GET WING UP SOUND
6217: 	LDX	DSNWD,X		GET WING UP SOUND
```

`:6183` sits in `GOFLIP` and `:6217` in `FLAST2` — the `FLIPLP`/`FLAPLP` loops. **These two sites
are the entire question.** If `PTERO` (`:1142`) cannot reach either, the binding at `:5576` is dead
boilerplate.

**The evidence it might NOT flap.** `stepPteroFlight` (`plugins/joust/src/core/ptero.ts:140-152`)
has no flap model whatsoever — its own comment reads "a still ptero (velY 0, **no flap**) HOLDS
altitude where the mount's `stepFlight` falls." And the ptero's ROM movement routine, `PTERO` at
`JOUSTRV4.SRC:1142` (`PTERO DEC PPVELX,U  TIME TO ZOOM IN ON THE PLAYER?`), may drive it on a path
that never enters those loops.

### The second half: the SNETHD ptero-vs-ptero arm

Added to this story on 2026-08-01 by jt5-4's TEA and Reviewer — routed here rather than filed
separately because it is the same question about the same bird.

`SNETHD`'s own branch covers **PTERO-VS-PTERO**, not just enemy-vs-enemy:

```
JOUSTRV4.SRC:4961
4961: 	BNE	OSTHT2		 BR=NO KILL (ENEMY VS. ENEMY, PTERO VS. PTERO)
```

And the ROM routes the pair explicitly. `OSTHT2` sounds the cue first, then tests `PID` for `PTEID`
on **both** parties and dispatches on the result:

```
JOUSTRV4.SRC:5019-5038
5019: OSTHT2	LDX	#SNETHD		ENEMIES COLIDE
5020: 	JSR	VSND
5021: 	LDX	COLOBJ
5022: 	LDA	PID,U
5023: 	CMPA	#$80+PTEID	PTERODACTYL?
5024: 	BEQ	OSTH12		 BR=YES
5025: 	LDA	PID,X
5026: 	CMPA	#$80+PTEID
5027: 	BEQ	OSTH13		 BR=YES
5028: OSTH11	JSR	OSTBMP		NO-ONE DIES, BUT BUMP EACH OTHER ANYWAYS
5029: 	JMP	HITEM2
5031: OSTH12	LDA	PID,X		2 PTERODACTYL'S?
5032: 	CMPA	#$80+PTEID
5033: 	BEQ	OSTH11		BR=YES, SAME OLD COLISION
5034: OSTPX	JSR	PTEBRD		COLIDE PTERODACTYL & BIRD
5035: 	JMP	HITEM2
5037: OSTH13	EXG	X,U
5038: 	JSR	PTEBRD		COLIDE PTERODACTYL & BIRD
```

Read plainly: a ptero-vs-**bird** pair goes to `PTEBRD` (`:5034`, and `:5037-5038` after swapping so
`U` is the ptero); a ptero-vs-**ptero** pair falls back to `OSTH11` — the ordinary bump — with
`SNETHD` **already sounded** at `:5019-5020`. In the ROM the pterodactyl is a full collision
participant.

**This port cannot reach that arm.** `collisionPass`'s pair loop filters the eligible set:

```
plugins/joust/src/core/demo.ts:859-861
859:   const eligible = processes.filter(
860:     (p) => (p.kind === 'player' || p.kind === 'enemy') && p.collisionEnabled !== false,
861:   )
```

A ptero is resolved only through `resolvePteroAttack` against a **player**, so two pteros never
meet. Yet jt3-5's baiters cap at three live pteros (`plugins/joust/src/core/baiter.ts:6`, "capped at
3 live"), so two DO coexist in ordinary play: **the cue is reachable in principle and unreachable in
fact.** The `enemy-thud` kind already exists and its comment already names this case
(`plugins/joust/src/core/events.ts:76` — "an enemy-vs-enemy (or ptero-vs-ptero) tie — SNETHD").

## User Ruling (settled at setup, BEFORE red)

> **Settle both reads in jt5-10 and deliver whatever the wing-cue read supports. FILE the
> ptero-vs-ptero collision reachability as its own story — do not build it here.**

The story's own text offers an either/or ("if the ptero is a full collision participant, both this
and the wing cues follow; if it is not, record that"). The ROM half is already settled by the read
above — the ptero *is* a full participant — so the live question was scope, and scope is the user's
call. It was put to them with the census attached (ROM routing verified, `enemy-thud` kind already
present, three pteros really coexist) and the ruling was: making pteros eligible in `collisionPass`
is a **gameplay** change, not a cue change, and folding it into a 2-pointer misprices it.

**Binding consequence for TEA and Dev: do NOT modify the eligible-set filter at
`demo.ts:859-861` in this story.** The `SNETHD` obligation here is to *record and file*, not to
build.

## Acceptance Criteria (DERIVED — the epic YAML holds none)

There is no `acceptance_criteria` key on jt5-10 in `sprint/epic-jt5.yaml`. The five below are
SM-authored proposals for TEA to challenge and refine, reproduced **verbatim and unedited** from
`.session/jt5-10-session.md` — the two files carry byte-identical AC text.

1. **The P7DEC question is SETTLED from the source, in writing, with citations.** The port records —
   as a comment in `plugins/joust/src/core/ptero.ts` (the ptero's own module) and reachable from the
   audio seam's commentary in `plugins/joust/src/core/events.ts` — whether the ROM's pterodactyl
   reaches `FLAPLP`/`FLIPLP`, i.e. whether `PTERO` (`JOUSTRV4.SRC:1142`) can reach either of the two
   and only two sites that load through `DSNWU`/`DSNWD` (`JOUSTRV4.SRC:6183` and `:6217`). The
   record states the answer, the routine chain that proves it, and a `LABEL (:line)` citation for
   each hop. "Read the block, it binds the cues" is NOT a proof — the binding at `:5576` is the
   *question*, not the answer.

2. **The answer drives the code, and both outcomes are acceptable deliverables.** If the ptero DOES
   reach those loops, the port emits the already-existing `enemy-wing-up` / `enemy-wing-down` kinds
   (`plugins/joust/src/core/events.ts:73-74`) for the ptero at the ROM's edges. If it does NOT, no
   cue is emitted and the silence is recorded as deliberate, ROM-backed behaviour rather than an
   omission. Whichever branch the read produces, the OTHER branch is explicitly named in the record
   as refuted, so a later reader cannot re-open the question with less evidence than we have now.

3. **A test guards the settled answer against silent reversal.** Not a vacuous restatement: it must
   be capable of reddening. For the emit branch, that is an assertion that a ptero's flight produces
   the wing cues at the ROM-specified edges. For the silent branch, it is an assertion that a
   ptero's full flight through `stepPteroFlight` (`plugins/joust/src/core/ptero.ts:140`) emits NO
   wing cue — a test which would redden the moment someone wires a flap model to the ptero without
   revisiting the ROM. TEA decides the shape once the read lands; SM does not pre-empt it.

4. **The `SNETHD` ptero-vs-ptero arm is settled by the same read and its code consequence is FILED,
   not built.** Per the user's scope ruling, this story records the finding — that `OSTHT2` plays
   `SNETHD` at `:5019-5020` and then routes a ptero/ptero pair through `OSTH12` (`:5031-5033`) back
   to `OSTH11`'s ordinary bump, i.e. the ptero IS a full collision participant in the ROM — and
   states plainly that this port cannot reach that arm because `collisionPass` filters to
   `player|enemy` (`plugins/joust/src/core/demo.ts:859-861`). A follow-up story owns the collision
   change. **The follow-up must EXIST and its description must carry the finding**, not merely its
   title; per the jt5-5 finish lesson, "owned by X" is not a disposition until X's text says so.

5. **No fidelity regression and no scope leak.** `npx vitest run --project joust --project shared`
   stays green, and `collisionPass`'s eligible-set filter is NOT modified in this story.

## Two SIGNALS — claims for TEA to verify, not findings

Both are SM observations from the setup read. Marked as claims deliberately: a pre-setup measurement
arrives labelled MEASURED and outranks the story, and SM measured the description's *citations*, not
the ROM's *answer*.

- **`P7DEC` zeroes the two RUN entries** (`:5576`, positions 5-6). Textually true. It does **not**
  settle the flap question either way — a bird that never lands needs no run cue whether or not it
  flaps.
- **`P7DEC` field 6 of its first row is `0`** (`:5574`), where `P1DEC`/`P2DEC` carry `PLYR1`/`PLYR2`
  and `P3DEC`-`P6DEC` carry `PLYR3`/`PLYR4`/`PLYR5`. **SM did not determine what that field is.** If
  it is the animation/picture table, a `0` there could be decisive for AC-1. If it is something
  else, it is noise. Identify the field before leaning on it, and do not cite this observation
  without doing so.

## Known Hazards

- **`rom-table-continuation-bit` applies to this story's own quarry.** A joust ROM sound table ends
  at the first pair whose code lacks `+$80`, and continuations sit on the NEXT LINE. A one-row
  citation has already shipped a 15x-wrong reading (SNPCR1; jt5-6 owns the structural fix). If this
  story quotes any `SN*` table row, read past it.
- **The citation gate re-opens the QUOTED LINE only** and cannot see a wrong reading carried in the
  claim body. Cite the MECHANISM a conclusion rests on, not just the value.
- **Comment-only edits shift pinned line numbers.** `ptero.ts` and `events.ts` are both cited
  elsewhere; re-anchor after any edit and re-run the citation gate.
- **Prose is the unguarded surface, and this story's primary deliverable IS prose.** jt8-6 burned
  three review rounds on claim text while its code was correct from round 1. State each routine's
  complete behaviour rather than line extents or instruction censuses — those are the assertion
  categories that keep being wrong.
- **The core/shell boundary.** `plugins/joust/src/core/` is scanned as source text by the purity
  test, comments included. Do not write `window.`/`document.` even inside a comment.

## Related Stories

- **jt5-3** — surfaced this question during its RED phase and could not answer it in scope.
- **jt5-4** — its TEA and Reviewer routed the `SNETHD` ptero-vs-ptero half here.
- **jt5-2** — bakes the samples. If the ptero shares `SNELWU`/`SNELWD`, no new sample is needed;
  this story's answer is jt5-2's input.
- **jt5-6** — owns the structural fix for multi-line ROM sound-table citations.
- **(to be filed)** — the ptero-vs-ptero collision reachability, per the user's ruling. AC-4 makes
  filing it a deliverable of this story.

## Repos

`arcade` (this repo). Trunk-based: work lands on `main`.

## Technical Approach & Scope

Measured pointers only — the approach is TEA's and Dev's to settle.

**Where the answer lives:**
- `reference/williams-source/joust/JOUSTRV4.SRC` — the whole quarry. `PTERO` at `:1142`; the two
  `DSNWU`/`DSNWD` loaders at `:6183`, `:6217`; `P7DEC` at `:5574-5577`; the collision routing at
  `:4961` and `:5019-5040`.
- The chain to trace for AC-1 is from `PTERO` (`:1142`) to `:6183`/`:6217` — or to a proof that no
  such chain exists. `GOFLIP`/`FLAST2`/`FLAPLP`/`FLIPLP` are the labels to anchor on.

**Where the code lives:**
- `plugins/joust/src/core/ptero.ts` — `stepPteroFlight` (`:140-152`), `lanceOffset` (`:161`),
  `resolvePteroAttack` (`:175`). The ptero's whole simulation.
- `plugins/joust/src/core/events.ts` — the cue kinds. `enemy-wing-down`/`enemy-wing-up` at `:73-74`,
  `enemy-thud` at `:76`. The seam's ROM commentary starts at `:22`.
- `plugins/joust/src/core/frame.ts:365-369` — where a ptero/baiter is stepped each wake.
- `plugins/joust/src/core/demo.ts:859-861` — the eligible-set filter. **Out of scope by ruling.**
- `plugins/joust/src/core/baiter.ts:6` — the three-ptero cap.

**In scope:** settling both ROM questions with cited proof; the code consequence of the wing-cue
answer (emit or documented silence); a non-vacuous guard test; filing the collision follow-up with
the finding written into its description.

**Out of scope:** modifying `collisionPass`'s eligible set; building ptero-vs-ptero collision;
baking or uploading any sample (jt5-2 owns that).

**Tests:** `npx vitest run --project joust --project shared`. Joust's tests live in
`plugins/joust/tests/`.

## Definitions

| Symbol | Meaning |
|---|---|
| `P7DEC` | The pterodactyl's decision block, `JOUSTRV4.SRC:5574-5577`. Row 3 is its sound table. |
| `DSNWU` / `DSNWD` | RAM words holding the current species' wing-up / wing-down sound pointers (`:118-119`). |
| `SNELWU` / `SNELWD` | The enemy wing-up / wing-down sound tables, bound by every enemy block including `P7DEC`. |
| `SNERU1` / `SNERU2` | The enemy RUN sound tables — carried by buzzards, **zeroed** in `P7DEC`. |
| `FLAPLP` / `FLIPLP` | The flap loops. `GOFLIP` (`:6183`) and `FLAST2` (`:6217`) inside them are the only readers of `DSNWU`/`DSNWD`. |
| `PTERO` | The pterodactyl's movement routine, `:1142`. |
| `SNETHD` | The enemy thud cue, sounded by `OSTHT2` at `:5019-5020` before the pair is dispatched. |
| `PTEID` | The pterodactyl's process id, compared as `#$80+PTEID`. |
| `PTEBRD` | The ptero-vs-bird collision routine (`:5034`, `:5038`). |
| `OSTH11` | The ordinary bump — where a ptero-vs-**ptero** pair lands (`:5028`, reached from `:5033`). |

---

_Authored by SM at setup, not generated. Do not regenerate or overwrite this file with
`pf context create` — it would replace the measured background and the user ruling with the raw
epic description._

# Story Context: cp6-2

**Bake the samples, upload them, and prove a live 200 — the sound actually arrives**

- **Epic:** cp6 — Centipede sound: the samples cp5 never filed a story to bake
- **Points:** 5 · **Priority:** p2 · **Workflow:** tdd · **Repos:** arcade
- **Prerequisite:** cp6-1 — `done`, completed 2026-08-02, deliverable on `main` at `0860f74`

---

## Problem

centipede's audio code is **complete** and centipede is **silent**. `main.ts` builds the engine
(`plugins/centipede/src/main.ts:102`), unlocks it behind the browser gesture gate (`:114-122` — the
epic says `:114-120`, which cuts the canvas-click half of the unlock in two) and calls
`playEventSounds` once per stepped frame (`:203`); `shell/audio.ts` holds a fourteen-entry
`SOUNDS` manifest and `shell/audio-dispatch.ts` wires every event kind to a cue. Everything is
wired. Nothing is baked.

**Re-measured live at setup, 2026-08-03** — all fourteen `.wav` files under
`https://arcade-assets.slabgorb.com/centipede/sfx/` return **404**, while `tempest/sfx/player_fire.wav`
and `joust/sfx/enemy_death.wav` both return **200** on the same host in the same pass. The host is
healthy; the prefix is empty. This is AC-1's baseline.

Nothing reports the failure, and that is the disease this story cures: `src/shared/audio.ts:176-178`
is a bare `.catch(() => { failLoad(file) })` that swallows a 404, a blocked autoplay and undecodable
data **identically**. The game runs on quietly at 60 fps and a green vitest is indistinguishable
from a bucket with nothing in it.

---

## ⚠ CORRECTIONS TO THE STORY DESCRIPTION — measured at setup, 2026-08-03

The description was written before cp6-1 ran and is stale in four places. Each was measured, not
reasoned. **The acceptance criteria below are reproduced byte-verbatim from `sprint/epic-cp6.yaml`
and have not been edited** — these corrections sit above them deliberately, so the context and the
epic YAML cannot disagree about what the story asked for.

### ⚠ 1. Half of AC-6 is ALREADY SATISFIED — a naive test for it is vacuous on arrival

The description says `README.md:25` "currently points readers at 'the open epic
`sprint/epic-cp5.yaml`' that has been archived and done since 2026-08-01."

**It does not.** `grep -c "epic-cp5" plugins/centipede/README.md` → **0**. Line 28 already reads
"baking and hosting the samples is owned by `sprint/epic-cp6.yaml`, which exists to repair exactly
that gap", and the paragraph already describes cp5 as *closed*. `git log -S` names the fix:
**`c6d75c4 chore(sprint): file epic cp6`** — the commit that filed this epic also corrected the
README. The description is stale against its own epic-filing commit.

**What this means for RED.** AC-6's second clause is already true. A test asserting it passes the
moment it is written and proves nothing — the guard-backfill trap. If you guard it, **mutation-prove
it**: re-introduce the cp5 pointer, watch the test redden, restore. AC-6's *first* clause is
genuinely open — `README.md:11` still reads "playable and **silent**".

**But the stale cp5 pointer is not gone — it MOVED.** `src/shell/audio.ts:16-19` still carries
*"NO SAMPLES SHIP WITH THIS STORY … Every filename below names a `.wav` that a LATER **cp5** story
bakes and uploads by hand"* — in the very file this story must edit to split the manifest, and
cp6-2 falsifies its other half too (after this story, the samples ship). **SM ruling: fix it here,
in scope.** It is inside the story's blast radius and AC-6's intent covers it.

### ⚠ 2. cp6-1 filed a BLOCKING finding that never reached this story's text

cp6-1's finish commit says: *"POKEY voice 0 is contended too … filed **BLOCKING FOR cp6-2**, which
wires those channels."* Its Reviewer's round-3 assessment carries the same disposition, and the
archived session at `sprint/archive/cp6-1-session.md` names cp6-2 **43 times**.

**None of it is in cp6-2's description.** That finish commit's `epic-cp6.yaml` diff is two lines
(`status: in_review → done`, plus a `completed:` stamp). A term count over cp6-2's description
returns **0** for every one of: `voice 0`, `preempt`, `arbitration`, `contend`, `fixture`,
`sound.fixture`, `sound.md`, `invention`, `stand-in`. The finding lives only in an archived session
and a commit message. **This context is the repair.** Here it is, so nobody re-derives it:

> `BEQ 52$ ;IF NO PLAYER EXPLOSION` (`CENTI4.MAC:2437`) is the voice-0 twin of
> `BEQ 48$ ;IF NO BONUS SOUND` (`CENTI4.MAC:2374`), and `:2416 BNE 50$ ;ALWAYS` blocks
> fall-through — so on the machine **playerDeath preempts all four kill cues outright**. Our
> `CHANNELS` map splits them (`'impact'` vs `'alert'`), so the clone rings both where the cabinet
> rings one.

Because the description names no artifact at all, name them here — **these are your inputs**:

| artifact | what it is |
|---|---|
| `plugins/centipede/docs/rom-study/sound.fixture.json` | **the input contract.** Machine-readable, 14 cues × 21 fields. Consume this. |
| `plugins/centipede/docs/rom-study/sound.md` | the explanation. **§5 is addressed to cp6-2 by name** — read it first. |
| `plugins/centipede/docs/rom-study/claims/16-sound.json` | 108 claims the citation gate re-opens against the vendored ROM |
| `plugins/centipede/tests/audit/sound-dossier.test.ts` | pins the manifest and `CHANNELS` as cp5-1 left them |

### ⚠ 3. The input contract has a hole: FOUR of fourteen cues carry NO length

Parsed from `sound.fixture.json`, not read:

| cue | `origin` | `freqTable` | `lengthSeconds` |
|---|---|---|---|
| `mushroom` | `invention` | null | **null** |
| `headBottom` | `invention` | null | **null** |
| `waveClear` | `invention` | null | **null** |
| **`fleaLoop`** | **`rom`** | null | **null** |

Three inventions — plus one that is **ROM-sourced and still has no length**. `fleaLoop` is a
computed sweep (`computedCite: CENTI4.MAC:2409-2414`), not a tabulated tone, so there is no
countdown window to derive from. The other ten carry real numbers.

Two consequences:

1. **A baker mapping `lengthSeconds → sample count` over all fourteen produces `NaN` four times.**
   joust's baker throws on exactly this — `if (!(frames > 0)) { throw ... }` at
   `bake-samples.mjs:321-323`. All four would trip it. They need **declared stand-in lengths**.
2. **AC-2's "declared stand-in" bucket has FOUR members, not three.** `fleaLoop` has no table, so
   by AC-2's letter it belongs there — but its `origin: 'rom'` will tempt you into the transcribed
   bucket. `sound.md` §5 item 4 is explicit: *"fleaLoop is a sweep, not a tone. A single fixed
   sample is a stand-in for it and must say so."* Getting this wrong is precisely the failure AC-2
   exists to prevent.

### ⚠ 4. The model baker is HALF right — copying tempest wholesale fails AC-3

The description says to model on `plugins/tempest/tools/pokey-bake/bake-sfx.mjs`. Measured:

- `grep -n "tempest/tools" justfile` → **nothing.** Tempest's POKEY baker is wired into **no
  recipe**. The justfile bakes star-wars's `pokey-bake` and joust's `sample-bake`.
- Tempest's baker imports its own standalone `./sfx-data.mjs`. It has **no** link to any shell
  manifest and makes **no** identity assertion — the exact architecture AC-3 mandates.

**Use both models, and know which half each one owns:**

| model | owns |
|---|---|
| `plugins/tempest/tools/pokey-bake/bake-sfx.mjs` | POKEY **waveform transcription** — AUDF/AUDC bytes → samples |
| `plugins/joust/tools/sample-bake/bake-samples.mjs` | **manifest identity + the throw** (`:313-323`) and the deploy wiring |
| `plugins/joust/src/shell/audio-manifest.ts` | the **dependency-free manifest split** AC-3 requires |
| `plugins/joust/tools/sample-bake/deploy-assets.test.mjs` | the **guard template** for AC-4 *and* AC-6 |

---

## Acceptance Criteria

*Reproduced byte-verbatim from `sprint/epic-cp6.yaml`. Not edited. Verified by a `python3` `in` test
against `yaml.safe_load`, not by grep.*

1. All fourteen URLs under the centipede sfx prefix return a live 200, with the status codes pasted into the story — a green vitest is explicitly not sufficient evidence and the story says why.
2. The samples are baked from the ROM's own FREQ and CONT tables; any cue with no table behind it is baked as a declared stand-in and labelled as one, never presented as transcribed.
3. The baker imports a dependency-free manifest module and asserts identity with the shell's SOUNDS record, so a later cue with no bake spec throws rather than falling back to a default sound.
4. just deploy-assets names centipede alongside star-wars and joust, and a guard reddens if that line is removed — the recipe is not trusted on inspection alone.
5. The game has been played with sound on and the result reported in prose, because a decodable wav of the wrong tone passes every automated check in this repo.
6. README.md no longer describes centipede as silent and no longer points at the archived cp5 as the owner of this work.

---

## 🔨 USER RULING (2026-08-03) — the upload is authorized in-story

`just deploy-assets` is a manual publish to a public production bucket that CI never touches, and
AC-1 cannot be met without it. **The user authorized the pipeline to run it directly**, once the
bake is green — then curl the fourteen URLs and play the game with sound.

Measured before the question was asked, and true: `scripts/deploy-r2.mjs` has **no** skip-unchanged
or ETag logic, so the run also re-bakes and re-uploads **star-wars's music + sfx and joust's sfx**.
Those overwrites are byte-identical (both bakers are deterministic; joust seeds a `mulberry32` PRNG
per cue name), but the run does touch two other games' live objects. Narrowing the recipe is **not**
available — AC-4 requires centipede be named *alongside* star-wars and joust.

The ordering matters: AC-5's play-test **cannot precede the upload**, because `DEFAULT_BASE_URL`
(`src/shell/audio.ts:32`) points at the R2 host, not at anything local.

---

## 🔨 SETTLED BY CENSUS — bake all fourteen, do not ask again

`sound.md` §5 item 3 hands this story an either/or: the inventions "must be baked as **declared
stand-ins or not at all**". Left open, TEA cannot write RED — one branch bakes fourteen files, the
other eleven, and AC-1 demands fourteen 200s.

**The house already answered it.** joust bakes **every** manifest cue —
`for (const name of Object.keys(SOUNDS))` at `bake-samples.mjs:313`, one `writeFileSync` per entry
at `:326`, eighteen cues — and joust's cues are *synthesised*: it had no ROM sample data at all and
still baked all eighteen, all serving 200 today. An unbaked cue is a 404, and a 404 degrades
silently into exactly the condition this epic exists to cure.

AC-1 and AC-2 together therefore close §5's either/or: **fourteen files, four of them labelled
stand-ins.**

---

## Technical Approach

Measured pointers only — the design is TEA's and Dev's.

**The import trap, which is real and costs an hour if met cold.** The justfile runs bakers under
plain `node`, where the `@shared` alias does not resolve. `plugins/centipede/src/shell/audio.ts`
imports `@shared/audio` at **`:25-28`** (verified exact), so the baker **cannot** import it. Split a
dependency-free `plugins/centipede/src/shell/audio-manifest.ts` that both the shell and the baker
import, exactly as `plugins/joust/src/shell/audio-manifest.ts` does — joust's file carries the
reasoning in its own header (`:1-11`): *"Nothing here may gain an import — that would break the
deploy-time bake while every vitest stayed green."*

**The ROM data.** Six FREQ tables at `CENTI4.MAC:2455-2465` — FREQ0/1/2/3/4/6, **no FREQ5** — in
`reference/atari-source/centipede/revision.v4/CENTI4.MAC`. Frequency bytes are `AUDF`; control bytes
are `AUDC` (distortion in the high nibble, volume in the low).

> **`FREQ4` is a TWO-LINE table and cp6-1 got it right — do not "tidy" it.** `:2463` is
> `FREQ4: .BYTE 28,28,30,28,28,30,3C,51` and `:2464` is an **unlabelled** continuation
> `.BYTE 50,50,60,50,50,60,74,0A2,0`. Seventeen bytes across two lines; the fixture records
> `tableCite: 'CENTI4.MAC:2463-2464'`, `tableLengthBytes: 17`. Collapsing it to the labelled line
> silently halves the bonus-life tone. `FREQ6` (`:2465`) does **not** continue — `:2466` is blank,
> `:2467` is `.SBTTL`.

**Radix.** `.RADIX 16` is inherited, so bare literals are hex and only a trailing period means
decimal. cp6-1's dossier already resolved every constant; consume its numbers.

**The recipe.** `justfile:274-289` is the `deploy-assets` target (verified exact: `:274` the target
line through `:289` the last verify echo). `assets_bucket := "arcade"` at `:271` — plain `arcade`,
**not** `arcade-assets`, which is only the hostname. Extend the `mkdir -p` at `:279` with a
centipede staging dir and add a bake line beside star-wars's and joust's.

**The guard.** `plugins/joust/tools/sample-bake/deploy-assets.test.mjs` is a direct template and
covers more than AC-4 — it already has a `describe` block for the README (*"the status line no
longer reads 'and **silent**'"*, *"no sentence defers the recording to a later story — this was
that story"*), which is AC-6's shape too.

---

## Scope

**In scope:** `plugins/centipede/tools/pokey-bake/` (new); the `audio-manifest.ts` split and the
`audio.ts:16-19` stale-cp5 banner; the `deploy-assets` recipe + its guard; `README.md`; running the
upload; the curl sweep; the play-test.

**Out of scope, and filed rather than fixed** — from `sound.md` §4:
- **`RESTOR`'s eighth sound-raising site.** `CENTI4.MAC:1826` seeds the explosion cue once per
  restored mushroom (`:1881-1882`) and our manifest has **no cue for it** — a ROM sound with nowhere
  to go. Wiring it is a core/shell change, not a baker's job.
- **The 15-second TIMED-play alarm** (`CENTI4.MAC:2360-2371`) is *declined*, not missed — cp1 ruled
  TIMED play is not modelled. Note it contains a **fourth** `FRAME` mask (`:2368`), so a reader
  grepping for frame gates finds four where §3.1 lists three.
- **Do not edit `SOUNDS` or `CHANNELS`.** cp6-1 ruled and did not edit; `sound-dossier.test.ts`
  pins them.

---

## ⚠ The dev port is TAKEN — by a sibling checkout, right now

`127.0.0.1:5270` is held by a live cabinet server: `node` **pid 7744**, cwd
**`/Users/slabgorb/Projects/a-1`**. It is serving the real cabinet, not a fallback — `/centipede/`
and a nonsense control `/banana-not-a-game/` return **different** md5s, which is the only check that
proves it (the lobby's SPA fallback answers 200 to everything).

AC-5 is a listen-with-sound check, so this is load-bearing: `just serve` here fails on `strictPort`,
and opening `5270/centipede/` yields a **true observation about a-1's tree**. **Do not kill a-1's
server.** Serve this tree beside it:

```bash
npx vite --port 5290 --strictPort
```

**The documented probe misleads — use this one.** `lsof -ti tcp:5270 | head -1` returned **pid 1702,
Google Chrome's network service** — a *client* holding a connection, cwd `/`. Ask for the listener:

```bash
LPID=$(lsof -nP -iTCP:5270 -sTCP:LISTEN -t | head -1)
lsof -a -p "$LPID" -d cwd -Fn | grep '^n'
```

---

<!-- Hand-authored by SM at setup (2026-08-03). Do NOT regenerate or overwrite this file:
     it carries four measured corrections to the story description, a user ruling and a
     census that a `pf context create` regeneration would replace with the raw epic text. -->

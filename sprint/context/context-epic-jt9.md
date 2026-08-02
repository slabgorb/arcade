# Epic jt9 Context

## Title
Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Overview
Sixth joust epic, and the first that is purely a RE-ORDERING: it holds every joust story left
unfinished on 2026-08-02, pulled out of jt5 (audio/fidelity), jt8 (playability) and uf1 (unwired
features) and resequenced into one dependency-ordered plan. **28 stories, 82 points.** Nothing was
re-scoped, re-pointed or re-written in the move itself — see the correction below for the one
story that has since been rewritten deliberately.

Deliberately left behind: **ad1-4** (joust attract simulation, `GOVER_ATTRACT`) stays in ad1 on the
user's ruling — it belongs with the other six games' attract demos and the lobby carousel that
consumes them. uf1 keeps its red-baron, star-wars and lobby stories; jt5 and jt8 are now fully done
and archivable.

## Metadata
- **Epic ID:** jt9
- **Repo:** arcade
- **Priority:** p2

---

## Background

### ⚠ The ids changed and cross-references did not

`pf sprint story move` renumbers to the target epic's next id, so a description in this epic that
names a `jt5-NN` / `jt8-NN` / `uf1-NN` id may mean **either** a DONE story (id unchanged, reference
still literal) **or** a story that moved into this epic (id now `jt9-NN`). The map, in this epic's
order:

| now | was | now | was | now | was | now | was |
|---|---|---|---|---|---|---|---|
| jt9-1 | jt5-27 | jt9-8 | jt5-9 | jt9-15 | jt5-17 | jt9-22 | jt8-10 |
| jt9-2 | jt8-12 | jt9-9 | jt5-12 | jt9-16 | jt5-14 | jt9-23 | jt5-19 |
| jt9-3 | jt5-11 | jt9-10 | jt8-8 | jt9-17 | jt5-13 | jt9-24 | jt8-5 |
| jt9-4 | jt5-21 | jt9-11 | uf1-11 | jt9-18 | jt5-18 | jt9-25 | jt8-14 |
| jt9-5 | jt5-22 | jt9-12 | uf1-10 | jt9-19 | jt8-16 | jt9-26 | jt5-24 |
| jt9-6 | jt5-15 | jt9-13 | jt8-15 | jt9-20 | jt8-9 | jt9-27 | jt5-25 |
| jt9-7 | jt5-20 | jt9-14 | jt8-13 | jt9-21 | jt8-11 | jt9-28 | jt5-26 |

Every OTHER joust id named in a description (`jt1-x`–`jt4-x`, `jt5-1..8`, `jt5-10`, `jt5-16`,
`jt5-23`, `jt8-1..4`, `jt8-6`, `jt8-7`, `uf1-2`, `uf1-8`, `uf1-9`) is DONE and unmoved, so those
references are still literal.

### ⚠ One correction to the "nothing was re-written" claim (measured 2026-08-02, jt9-1 setup)

The epic description states that **every description, acceptance criterion and ROM citation is the
text its filing story shipped with**. That was true when the epic was cut and is **no longer true
of jt9-1**, which was deliberately rewritten at setup after its claims were measured:

- Its ROM citations were all re-opened against the vendored source and are exact — no change there.
- Its **repro was under-specified**. Re-run across four harnesses, the filed evidence (seed 0x2468,
  frame 2688, process 514, 1 of 11 promotions) reproduces **only** on the idle-input replay and on
  none of the other three; the plugin's habitual `scripted`/`inputsAt` harness gives 14 promotions
  and zero hits. The harness is now named in the description and in AC2.
- **Two unrouted jt5-8 Reviewer findings were folded in** on the user's ruling: R-2 (a MEDIUM whose
  disposition line read "file with R-1" and which was filed nowhere) and R-4 (live false prose in
  the very pin jt9-1 re-baselines). Acceptance criteria went 5 → 7; points unchanged at 5.

**Read that as a precedent, not an exception:** the blanket "nothing was re-written" claim means the
text you are reading is a *filing*, not a *measurement*. Measure a story's falsifiable claims at
setup before building against them.

### The standing rule this epic is ordered around

Roughly half these stories move the jt2 seeded-replay fingerprints, and two say in their own text
that a fingerprint-moving change must not share a commit with another (jt9-8 about jt5-8, jt9-1
about jt9-8). **One story per commit satisfies that; batching two does not**, and the re-baseline
stops being reviewable.

The method is written up in `sprint/archive/jt5-8-session.md` and `sprint/archive/uf1-9-session.md`:
re-find every moved pin by sweeping for its **own precondition**, never by nudging a number toward
the new output, and state which digests moved and why. Read the nearer of those two before starting
any fingerprint-moving story. Both record pins whose precondition had an **empty solution set** on
the old seed, and one that "would have passed while lying" — an anchor left sitting strictly before
the contact it was named for.

### The five blocks, and why the order is this order

- **Block A — jt9-1…jt9-7 (18 pts): ride the fresh re-baseline, then harden the apparatus.**
  jt9-1 is first because it is jt5-8's direct successor, filed out of jt5-8's own review, and that
  session — with its 20-assertion moved-pin table — was archived hours before this epic was cut.
  jt9-2 follows because it is a mechanical 27-file sweep onto `tests/helpers/claims.ts`: done here
  it is one diff and every later story writes against the hardened loader. jt9-3…jt9-7 pin the
  apparatus the rest of the epic leans on. None of the six moves a fingerprint, so they are a clean
  buffer behind jt9-1.
- **Block B — jt9-8…jt9-12 (17 pts): the gameplay a player can feel**, hardest-hitting first.
  Rapid tapping should out-climb holding and does not; an uncollected kill-egg never matures; an
  enemy's last egg is scored to the victor on the kill and the port drops it; the lava troll can
  never grab anyone because the whole grip escalation has zero production callers — and jt9-12's
  LAVGRA half is theatre until it does, the one hard ordering constraint inside the block.
- **Block C — jt9-13…jt9-17 (16 pts): collision geometry — settle the premise, then fix the passes.**
  jt9-13 is a cheap sign-extension fix, latent today and a loaded chamber for jt9-25. jt9-14 must
  rule on whether `narrowPhase`'s screen-X blindness matches the machine at all — a premise
  inherited unexamined since jt2-3 that jt9-15 and jt9-17 both build on. jt9-17 is last and largest.
- **Block D — jt9-18…jt9-23 (19 pts): the enemy brains.** jt9-18 is the level-flight twin of jt9-1's
  dumb-brain glide — same forced-glide shape, cheapest while that shape is fresh. jt9-19's note
  about SHLEP equivalence is now stale and needs re-deriving rather than inheriting. **jt9-23 is
  deliberately last and deliberately at risk:** uf1-9 measured its up-seek path entered on ZERO
  frames across three seeds and 6000 frames. If the climb-preparation state is unreachable, cancel
  it rather than build two states nothing reaches.
- **Block E — jt9-24…jt9-28 (12 pts): the decode, the animation, and dossier precision.** jt9-24 may
  confirm the shipped approximation rather than replace it — a fine outcome. jt9-25 needs jt9-13.
  jt9-26…28 are citation and README corrections that change no behaviour.

### Ground truth

`plugins/joust/docs/rom-study/` and `reference/williams-source/joust/JOUSTRV4.SRC` (red-label RV4),
with `JOUSTI.SRC` for the sprite and table records. **Present in this checkout** — verified at
jt9-1 setup. Radix discipline is Motorola — bare decimal, dollar hex — and every transcribed
constant carries a radix-cited claim.

### Commands

```bash
npx vitest run --project joust        # this app's suite
npm run lint                          # tsc --noEmit, repo-wide
npm run test:orchestrator             # the cabinet's wiring invariants
```

# ADR-0001: Shared-code strategy for the vector-arcade subrepos

**Status:** Accepted
**Date:** 2026-07-04
**Author:** Architect (Emmanuel Goldstein)
**Story:** N/A — arises from the 2026-07-04 cross-repo extraction survey

## Context

The arcade now hosts **five** independent vector games (tempest, lobby, star-wars,
asteroids, battlezone). CLAUDE.md's standing rule was *"no shared code yet — extract
a shared library only once a second game proves the duplication is real."* A survey on
2026-07-04 established that threshold is now **empirically met**, with in-code proof:

- `core/math3d.ts` is **byte-identical** between star-wars and battlezone. Battlezone's
  header literally reads: *"PORTED — DO NOT DIVERGE WITHOUT A STORY … Any Battlezone-specific
  divergence here is EVIDENCE for that extraction story."*
- `core/rng.ts` is logic-identical across star-wars / asteroids / battlezone (asteroids'
  header: *"Ported 1:1 from star-wars"*); tempest shares the same mulberry32 algorithm.

The "port, don't share" ruling was correct **as a bootstrapping tactic** — it let each game
freeze deterministic, replay-sensitive code independently. But copying has begun to cost:

- **Silent divergence:** asteroids fixed a `last === 0` bug in its game loop and never
  backported it to star-wars. Two `MAX_HIGH_SCORES` sources of truth now exist.
- **Unenforced cross-game contract:** the lobby reads each game's `{gameId}-high-scores`
  localStorage entry by *convention only* — no shared type, no test. Battlezone already has
  a live lobby tile but no `highscore.ts`/`storage.ts`, so its tile will read `NO SCORE`
  forever until someone hand-copies a conforming fourth variant.

### Problem Statement

**Where does shared code live, and how do the game repos consume it** — without breaking
the property that each game is an independent git repo that builds, tests, and deploys on
its own, and without silently un-freezing determinism-sensitive code in a game that was
meant to stay pinned?

The blocker is not the code (math3d needs *zero* changes to extract). It is that **no
shared-code plumbing exists at all** — no package, no build linkage, no consumption
mechanism. This ADR decides that plumbing once, so every subsequent extraction is a
mechanical re-point rather than a fresh infrastructure argument.

### Decision Drivers

- **Independence preserved** — each game keeps its own remote, history, CI, and independent
  `vite build` / deploy. Cloning a game standalone must still build.
- **Per-consumer version pinning** — a frozen game must be able to pin an exact revision of
  shared code, so a shared change cannot silently alter a game's determinism/replay behavior.
- **Minimal new infrastructure** — no backend, small/solo dev; avoid standing up a private
  registry or auth if a lighter mechanism suffices.
- **Vite-native** — must work with each game's independent build, `just serve` on pinned
  ports, and the Cloudflare path-routed deploy.
- **Turn convention into contract** — the lobby↔games high-score shape should become a
  compile-time dependency the lobby *imports*, not a comment.
- **Cheap inner loop** — editing shared code during active co-development must not require
  a publish-per-keystroke ceremony.

## Considered Options

### Option 1: Status quo — keep copying ("port, don't share")

Continue hand-porting files between repos with provenance headers.

**Pros:**
- Zero new infrastructure; total repo independence; each game trivially frozen/replayable.
- Correct for code that is genuinely game-specific (render pipelines, sim bodies, input maps).

**Cons:**
- Proven to drift (loop bugfix not backported; two `MAX_HIGH_SCORES`).
- Cannot make the lobby↔games contract compile-time; battlezone's `NO SCORE` gap persists.
- Cost scales with every new game × every shared concern.

### Option 2: npm workspace / monorepo

Fold the games into one workspace root with a `packages/shared`.

**Pros:**
- First-class local resolution; single install; instant cross-package edits.

**Cons:**
- **Directly contradicts the topology** — games are independent repos with separate remotes
  and histories, gitignored from the orchestrator. A workspace demands single-root
  membership; adopting it means merging histories or fighting hoist/nohoist forever.
- A standalone game clone would no longer build without the workspace root.

### Option 3: Dedicated shared repo as a **git submodule**

New repo `arcade-shared`, added as a submodule inside each game (e.g. `tempest/vendor/shared`).

**Pros:**
- Preserves game independence; shared code is pinned per game via the submodule SHA.
- Edit shared code in place within a game checkout.

**Cons:**
- Submodule ergonomics: detached HEAD, `--recurse-submodules` footguns, and **N pointer
  bumps** to roll a shared change across N games.
- No package boundary → consumers import by relative path, easy to reach past the public API.

### Option 4: Dedicated shared repo as a **version-pinned npm dependency** *(recommended)*

New repo `arcade-shared` publishing a scoped package `@arcade/shared` with **subpath
exports** (`@arcade/shared/math3d`, `/rng`, `/highscore`, …). Each game and the lobby declare
it in `package.json` and pin it to a **git tag/ref** (`github:slabgorb/arcade-shared#v0.2.0`) —
no registry required. Ships compiled ESM + `.d.ts` (a `prepare` build step) so Vite consumes
it as an ordinary dependency.

**Pros:**
- Games stay fully independent repos; a standalone clone `npm install`s the dep and builds.
- **Per-consumer pinning is explicit and one-line** — a frozen game pins `#v0.1.0`; a new
  game can ride `#main`. Determinism-sensitive code (rng, math3d) is pinned by tag.
- A real package boundary (public subpath exports) — the lobby imports the *same*
  high-score types/guards the games write, making the contract compile-time.
- No registry/auth infra now; upgrades cleanly to a published registry later without
  changing the consumption *shape*.
- One shared version rolls to all consumers by bumping one ref each (or a shared just-recipe).

**Cons:**
- Git-URL installs are slightly slower and need a `prepare`/build step in the shared repo.
- Inner-loop edits need `npm link` (or a temporary `#branch` ref) during active co-dev.

## Decision Outcome

**Chosen option:** **Option 4 — dedicated `arcade-shared` repo, consumed as a version-pinned
git-URL npm dependency with subpath exports.**

It is the only option that satisfies the hard constraint (independent, standalone-buildable
game repos) *and* the soft ones (per-consumer pinning, compile-time lobby contract, no new
backend/registry). Option 2 breaks the topology outright; Option 3 solves independence but
pays for it in submodule ceremony and loses the package boundary that makes the high-score
contract enforceable; Option 1 is retained only as the correct default for genuinely
game-specific code.

**Scope guard — this ADR authorizes a home, not a land-grab.** Only code that is
*byte/algorithm-identical across ≥2 games* is eligible. Game-specific rendering, sim bodies,
and input maps stay in their repos. The survey's "defer/skip" verdicts (glow primitive,
input plumbing, the tick contract beyond a shared *type*) remain out of scope until they meet
the same bar.

### Component Structure

```
arcade-shared/                      # new independent repo, github:slabgorb/arcade-shared
├── package.json                    # name "@arcade/shared", subpath "exports" map, prepare=build
├── src/
│   ├── math3d/     index.ts        # ← star-wars + battlezone (byte-identical today)
│   ├── rng/        index.ts        # ← all sims (mulberry32); pick one Rng contract
│   └── highscore/  index.ts        # types + qualifies/insert + {gameId}-key builder + row guard
└── dist/                           # built ESM + .d.ts, produced by `prepare`

<each game>/package.json            # "@arcade/shared": "github:slabgorb/arcade-shared#vX.Y.Z"
lobby/package.json                  # imports @arcade/shared/highscore → contract now compile-time
```

| Component | Responsibility | Data / API Owned |
|-----------|----------------|------------------|
| `@arcade/shared/math3d` | Ported Atari "Math Box": vec3/matrix/projection | Pure math; no state |
| `@arcade/shared/rng` | Seeded mulberry32 PRNG | `Rng` type + seed/next/int |
| `@arcade/shared/highscore` | Table logic + the lobby↔games storage contract | `HighScoreEntry`, key-builder, row validator |

### Interfaces

| From | To | Type | Contract |
|------|----|------|----------|
| star-wars, battlezone | `@arcade/shared/math3d` | pinned dep | Identical math; extraction must be a no-op diff |
| all sims | `@arcade/shared/rng` | pinned dep | One `Rng` contract (see Implementation Notes) |
| games (write) + lobby (read) | `@arcade/shared/highscore` | pinned dep | Shared key `${gameId}-high-scores` + `HighScoreEntry` shape |

## Consequences

### Positive

- Every future extraction is a mechanical re-point, not a new infra debate.
- Determinism is *safer* than copying: a frozen game pins a tag; shared changes cannot leak in.
- The lobby's `NO SCORE` drift risk becomes a compile error the day battlezone adopts the dep.
- A hypothetical third 3D game gets the Math Box for free.

### Negative

- Introduces a sixth repo to maintain and a `prepare` build step.
- The dev inner loop gains one indirection (`npm link` / branch ref) during co-development.

### Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shared bump silently breaks a game | Determinism/replay regressions | Pin by **tag**, never `#main`, in shipped games; CI runs each game's vitest against its pinned ref |
| Over-extraction creep | Coupling of game-specific code | Eligibility bar: byte/algorithm-identical across ≥2 games, enforced at review |
| `rng` contract split (tempest immutable vs others mutable) | Blocks a clean single `rng` export | Decide the contract as part of the extraction story, not this ADR (see notes) |
| Vite fails to consume the dep | Broken builds | Ship built ESM + `.d.ts` via `prepare`; verify with a spike before wide adoption |

## Implementation Notes

- **First payload = `math3d` + `rng`.** They are byte/algorithm-identical and already
  comment-flagged; extracting them *proves the pipe end-to-end* at near-zero code risk before
  any harder migration. Validate with a spike: one game (battlezone) consuming
  `@arcade/shared/math3d#v0.1.0`, its ported `math3d.test.ts` green against the dep.
- **`rng` contract decision belongs to the extraction story, not here.** star-wars/asteroids/
  battlezone mutate `rng.seed` in place; tempest is immutable (`rngNext -> {value, rng}`). The
  story must pick one and migrate tempest's call sites (or ship both and deprecate one).
- **`highscore` needs a generic on the domain field** (`level` vs `wave`) plus a
  `makeHighScoreStorage(gameId, validator)` factory so the lobby imports the exact key-builder
  and row-guard the games use.
- **Consumption shape is registry-upgradeable.** Start with git-URL refs; if publish churn
  becomes painful, publish `@arcade/shared` to GitHub Packages later — consumers change a
  version string, not their import statements.

## Related Decisions

- **Future ADR-0002 (font strategy):** the survey found *two incompatible* text approaches —
  a non-commercial-licensed "Vector Battle" TTF (lobby/star-wars/asteroids) vs tempest's ROM
  stroke-vector font. That is a *decision*, not a duplication, and gates backlog stories
  **bz2-2** (battlezone adopt shared font) and **A2-2** (asteroids letter spacing).
- Downstream extraction epic (proposed working id `SH`): math3d → rng → highscore/storage →
  loop primitive, each a story once this ADR is accepted.

---

*Adapted from the Pennyfarthing architecture-decision template.*

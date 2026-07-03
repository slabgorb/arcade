# Story bz1-8 Context

## Title
Missiles + super tanks — guided missile (2000), super tank (3000), score-threshold intro

## Metadata
- **Story ID:** bz1-8
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
bz1-8 extends bz1-7's single-hostile lifecycle with two new hostile types
drawn from the same roster: the **missile** (2000 pts) — a fast, homing
hostile with its own approach behavior (flight profile, hop/weave pattern,
whether obstacles block its path — extracted from the bz1-2 findings/quarry,
not invented here) — and the **super tank** (3000 pts) — a faster, more
aggressive tank variant with its own model and AI constants (also from
bz1-2). Missiles must not enter the roster until the score crosses the
DIP-default threshold bz1-2 pins from the 5K–30K range (no coin-op DIP menu —
epic descope); below it, only the slow tank bz1-7 already implements can
spawn. Once eligible, roster selection — which hostile kind spawns next, at
the current score — follows the ROM's score-dependent mix and is drawn
deterministically from the seeded RNG already carried in `GameState`. Both
new kinds are data + behavior variants layered on bz1-7's existing lifecycle,
line-of-sight, explosion, and scoring machinery — no new spawn/hit/death
architecture, per the epic's "nothing here is a new invention" rule.

## Technical Approach
- Extend the hostile roster bz1-7 established (spawn, approach, aim/fire,
  hit, explosion, scoring) with two new entity kinds — missile and super
  tank — reusing bz1-7's lifecycle state machine, LOS/shot-blocking,
  explosion, and scoring hooks unchanged; only per-type data and behavior
  parameters vary.
- Pull the missile's flight profile (speed, homing/hop-weave pattern,
  obstacle interaction) and the super tank's AI constants (speed,
  aggression/fire-rate deltas vs. the base slow tank) from the bz1-2 findings
  doc / typed `core/` data — do not invent values here. If a needed constant
  isn't yet present in bz1-2's output, add it to the existing `src/core/`
  data modules, citing the same quarry provenance bz1-2 established, rather
  than hardcoding an undocumented number.
- Wire each new kind's wireframe model (the `missile`/`super tank` tables
  bz1-2 ported into `models.ts`) into whatever render/model-selection path
  bz1-7 introduced, so each hostile kind draws its own distinct model.
- Gate missile eligibility on bz1-2's pinned DIP-default threshold constant:
  below it, roster selection only ever produces the slow tank; at/above it,
  missile becomes eligible for selection alongside it.
- Implement roster selection as a pure function of `(score, rng)` → hostile
  kind, following the ROM's score-dependent mix documented by bz1-2. If the
  findings doc doesn't resolve the exact mix weighting, take the most
  literal reading available and flag the residual ambiguity rather than
  guessing a distribution. Selection consumes the seeded RNG already carried
  in `GameState` — no new randomness source.
- Preserve the "always exactly one hostile" invariant across all three
  kinds: a replacement spawns via the same roster-selection function
  whenever the current hostile dies, regardless of which kind it was.
- Wire missile kill → 2000 pts and super tank kill → 3000 pts through
  bz1-7's existing scoring hook, using the scoring constants bz1-2 already
  committed to `src/core/` — no new scoring path.
- Cover with Vitest, fixed seed + fixed dt throughout: below-threshold runs
  spawn slow-tank-only; at/above-threshold runs include missiles per the
  documented mix; kill scoring is correct for each new kind; the
  one-hostile invariant holds across type transitions; roster selection is
  reproducible run-to-run given the same seed and score history.

## Scope
- In scope: missile and super tank as new hostile kinds layered on bz1-7's
  lifecycle; score-threshold gating for missile eligibility; deterministic
  roster-selection function; per-type model wiring; scoring for the two new
  kill types; tests proving threshold gating, roster-mix determinism, and
  the one-hostile invariant across all three kinds.
- Out of scope: the saucer (bz1-9); difficulty/aggression ratchet tuning
  (bz1-10); any change to bz1-7's core lifecycle/LOS/explosion/scoring
  architecture beyond the data/behavior variation two new kinds require;
  audio (bz1-11); HUD/framing fidelity (bz1-12).

## Acceptance Criteria
- With score below the bz1-2-pinned DIP-default threshold, a deterministic
  fixed-seed run never spawns a missile — only the slow tank appears.
- With score at or above that threshold, missiles enter the roster-selection
  rotation per the ROM's documented mix, verified by a deterministic
  fixed-seed run.
- Missile kill awards exactly 2000 pts; super tank kill awards exactly
  3000 pts, both via bz1-7's existing scoring hook.
- The "always exactly one hostile on the field" invariant holds across all
  three hostile kinds (slow tank, missile, super tank) through repeated
  spawn/death cycles in a deterministic test run.
- Each hostile kind renders its own distinct wireframe model (from bz1-2's
  `models.ts` tables), not a shared/generic placeholder.
- Roster selection is a pure deterministic function of score + seeded RNG —
  the same seed and score history reproduce the same sequence of hostile
  kinds across runs.
- `npm run build` and `npm test` are clean in `battlezone/`.

---
_Generated by `pf context create story bz1-8` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._

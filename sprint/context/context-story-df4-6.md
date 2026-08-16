# Story df4-6 Context

## Title
VISUAL playtest — enemies alive, colliding, dying safely: screenshot http://127.0.0.1:5270/defender/ showing enemies materialize (df4-2 appear), a laser killing one via the ACCESSIBILITY-SAFE explosion (ADR-0005, no full-screen strobe), and a lander abducting a humanoid (df4-3) — compared against a nonsense control path (must DIFFER, not just return 200 — the canonical-serve lesson; the mechanical DIFFER check already runs in tests/canonical-serve.test.mjs). Confirm enemy colour/orientation and that NO death flashes the full screen BEFORE df5 adds smart-bomb/hyperspace. Carry the df5 accessibility ruling (smart-bomb SBOMB / hyperspace HYPER also freeze/fade) forward as a note.

## Metadata
- **Story ID:** df4-6
- **Type:** story
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — the menagerie (phase 4b): one cited reducer per enemy, the shared collision seam, and the first effects that kill — with the photosensitivity accessibility exception decided here

## Problem
df4-1 through df4-5 are all core reducers with unit + citation tests — but a green vitest proves the *simulation* is right, not that the *rendered game* looks right. This story is the human-eyes checkpoint: enemies must actually materialize, collide, and die on screen, in the right colours/orientation, with the ADR-0005 accessibility-safe explosion visibly replacing the ROM strobe. It runs last, once the menagerie exists, and is the gate before df5 adds smart-bomb/hyperspace (which will each reach for the same explosion).

**A green build is not proof for an asset/render story** (the star-wars silent-degrade lesson): the acceptance here is a screenshot + a control comparison, not a test pass.

## Technical Approach
Serve the cabinet the canonical way and screenshot the live game:

- `just serve` from the repo root → `http://127.0.0.1:5270/defender/` (pinned port 5270; confirm *your* checkout owns the port before trusting a screenshot — the multi-checkout `[::1]:5270` trap).
- **Refresh the browser** after edits — HMR does not reach the games (mg1-14); the child servers share the parent websocket.
- Drive the game to the three states and screenshot each:
  1. **Enemies materialize** — the df4-2 `APST` appear animation over the df2-4 INERT pictures.
  2. **A laser kills one** via the **accessibility-safe** explosion (ADR-0005) — confirm by eye that **no death flashes the full screen** (freeze/fade/particle, not a whole-frame inversion).
  3. **A lander abducts a humanoid** (df4-3) — the grab → carry-to-top loop.
- **Control comparison:** compare a real game path against a nonsense control path — they must **DIFFER**, not merely both return `200` (the SPA fallback answers 200 to everything; the canonical-serve lesson). The mechanical DIFFER check already runs in `tests/canonical-serve.test.mjs`.
- Confirm enemy **colour/orientation** against the ROM/reference (colour is by df2 palette index).
- **Carry-forward note:** record that df5's smart-bomb (`SBOMB` `defender/DEFA7.SRC:3199`) and hyperspace (`HYPER` `:3211`) must also render as freeze/fade under ADR-0005 — a note for df5, not work for this story.

Held-input note: a start/action key-hold needs a real key-hold (Playwright `press()` is too brief — the arcade held-input trap).

## Scope
- **In scope:** a visual playtest at `http://127.0.0.1:5270/defender/`; screenshots of materialize / accessibility-safe kill / abduction; eyeball confirmation of colour, orientation, and NO full-screen strobe; the DIFFER-vs-control confirmation; the df5 accessibility carry-forward note.
- **Out of scope:** any new core behaviour or reducer (df4-1…df4-5 own those); smart-bomb / hyperspace effects (df5); scoring, waves, scanner (df5). This story adds no gameplay — it verifies what exists.

## Acceptance Criteria
> _Derived from the design spec (§6, story 6) and the story title; candidate ACs for TEA to finalize during the RED phase._
- **AC1 (materialize on screen):** a screenshot at `http://127.0.0.1:5270/defender/` shows enemies materializing via the df4-2 appear animation over the df2-4 pictures.
- **AC2 (accessibility-safe kill):** a screenshot shows a laser killing an enemy via the ADR-0005 accessibility-safe explosion; a human confirms **no death flashes the full screen** (no whole-frame inversion/white-fill).
- **AC3 (the abduction loop):** a screenshot shows a lander abducting a humanoid (df4-3 grab → carry).
- **AC4 (DIFFER vs control):** the defender path is confirmed to render the game and to DIFFER from a nonsense control path (not merely both `200`); `tests/canonical-serve.test.mjs` stays green.
- **AC5 (colour/orientation):** enemy colour and orientation are confirmed correct (colour by df2 palette index) against the reference.
- **AC6 (df5 carry-forward):** the session/notes record that df5's smart-bomb and hyperspace must also render freeze/fade under ADR-0005.

## Dependencies
- **df4-1 … df4-5** — the collision seam, effects/policy, and all enemy families must exist and be wired to render.
- **df2 / df3** — framebuffer/render seam and the canonical `just serve` cabinet.
- `tests/canonical-serve.test.mjs` — the mechanical DIFFER guard.

## Design Notes
- **A green build is not proof for a render story** — the acceptance is a screenshot + control comparison (the silent-degrade lesson).
- **Serve pin (5270) is per-checkout** — confirm whose server answers before trusting a screenshot; **refresh** (no HMR for games).
- **Must DIFFER, not just 200** — the SPA fallback answers 200 to every path.
- Full rationale: `docs/superpowers/specs/2026-08-16-defender-df4-menagerie-design.md` §6 (story 6).

---
_Generated by `pf context create story df4-6` from the sprint YAML._

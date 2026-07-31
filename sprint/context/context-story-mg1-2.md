# Story mg1-2 Context

## Title
A genuinely multi-app dev server — just serve currently serves the lobby at every path

## Metadata
- **Story ID:** mg1-2
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** .
- **Epic:** Monorepo migration tail — the follow-ups the 2026-07-30 plugin collapse deferred, descoped or created

## Problem
Raised by the Task 19 implementer, 2026-07-31, and filed rather than left in a report. The monorepo plan assumed Task 19 would deliver one dev server for the whole cabinet. It does not, and the implementer measured why rather than reporting a pass: the root vite.config.ts default-exports defineAppConfig({ id: 'lobby' }), so the single dev server IS the lobby, and every other path falls through to the lobby's SPA fallback. Probed: `/`, all seven `/<id>/` paths, AND the nonsense control `/banana/` all return 200 with NINE IDENTICAL body hashes and <title>Slabcade</title>. The control is the point — an all-200 check of the seven game paths would have reported 'the cabinet serves' while proving nothing, which is this migration's recurring failure shape. The task's own brief carried exactly that vacuous check; the implementer replaced it with an assertion that CAN fail (a game path must be byte-identical to the /banana/ control, so the day a real multi-app server lands, that test reddens and tells its successor to finish the job) and wrote the truth into the recipe comment, lobby/README.md and README.md. So nothing today is false — but the capability the plan named was never built, and no task owns it. Deciding how is the work: a vite plugin resolving /<id>/ to plugins/<id>/index.html, a multi-page rollupOptions.input, or accepting one-app-at-a-time and renaming the recipe so it stops implying otherwise.

## BINDING OWNER RULING (2026-07-31)

**AC1 is an either/or**: Build the multi-app dev server OR rename the recipe and descope. The user ruled:

**BUILD IT.** The dev server must genuinely serve each game at `/<id>/` from that plugin's own sources. The descope option is REJECTED and must not be re-proposed by TEA, Dev or Reviewer.

**Target shape approved:**
- `GET /tempest/` → `plugins/tempest/index.html` (title: Tempest)
- `GET /joust/` → `plugins/joust/index.html` (title: Joust)
- `GET /` → `lobby/index.html` (title: Slabcade)
- `GET /banana/` → lobby SPA fallback (control path)

**Mechanism is deliberately NOT ruled on** — the pipeline decides: Vite middleware/plugin, multi-page `rollupOptions.input`, or better. **Open question:** `rollupOptions.input` is build-time and Vite's MPA mode natively serves entries at `/plugins/<id>/index.html`, not `/<id>/` — so URL rewriting likely needed.

## Dead Story ID in Scope (Must Update)

`uf1-19` does NOT exist. Epic-uf1 ends at uf1-18. The 2026-07-31 epic split renumbered this work to mg1-2. Three doc locations still reference the dead id:

1. **CLAUDE.md line 134:** "making the dev server serve them too is filed as **uf1-19**"
2. **CLAUDE.md line 136:** "which reddens the day uf1-19 lands and this paragraph has to change"
3. **docs/superpowers/plans/2026-07-30-arcade-plugin-host.md line 2900:** "Building the real multi-app dev server is FILED as `uf1-19`"

All three are in this story's blast radius and must be updated to reference **mg1-2** instead.

## Files to Read (Do Not Guess)

Story names these files; read them, do not paraphrase:

- **vite.config.ts** — default-exports `defineAppConfig({ id: 'lobby' })`, the root cause. Pins `server.host: '127.0.0.1'`, `port: 5270`, `strictPort` (td1-1/jt1-3; do not disturb).
- **tests/canonical-serve.test.mjs** — Task 19 tripwire. Read header (lines 1–43). Assertion in AC3 is `the dev server serves the LOBBY at every path` (lines 221–284), byte-identical to `/banana/` control. AC3 requires UPDATE, never deletion — "the invariant moves instead of evaporating".
- **lobby/README.md** and **README.md** — Task 19 wrote current truth into both.
- **plugins/<id>/index.html** for the seven games.
- **scripts/build-app.mjs** / **scripts/gen-registry.mjs** — how app ids are enumerated.

## Technical Approach

Unruled by design — the ruling above fixes the **outcome**, not the mechanism. TEA and Dev
decide how, against the config rather than against the story's guesses. What is known:

- The root cause is one line: `vite.config.ts` default-exports `defineAppConfig({ id: 'lobby' })`,
  whose `root` is `lobby/`. Every non-lobby path is that config's SPA fallback, not a route.
- The three candidates the story names are **not** equally viable. `rollupOptions.input` is a
  build-time key; Vite's MPA dev mode serves entries at their on-disk path
  (`/plugins/<id>/index.html`), so it does not by itself produce `/<id>/`. Expect a middleware
  or plugin doing URL rewriting, possibly alongside an input map for the build. Verify this
  claim against Vite's actual behaviour — it is an inference, not a measurement.
- `server.host: '127.0.0.1'`, `port: 5270` and `strictPort` are **load-bearing pins** (td1-1,
  discovered as jt1-3). Whatever lands must not disturb them. CLAUDE.md explains why: without
  the host pin a second dev server binds `[::1]:5270` and coexists silently, serving the
  cabinet from the wrong working tree.
- App ids are already enumerated in more than one place (`scripts/build-app.mjs` and the
  deploy workflow read `plugins/` directly; the `justfile` and `vitest.config.ts` carry
  hand-maintained lists). Prefer reading the directory over adding a fourth list to drift.

## Scope

**In scope**
- Making `/<id>/` serve `plugins/<id>/index.html` from that plugin's own sources in dev.
- Updating the Task 19 tripwire in `tests/canonical-serve.test.mjs` (AC3 — update, never delete).
- The doc paragraphs this invalidates: the CLAUDE.md "⚠ What it actually serves today" blockquote,
  `README.md`, `lobby/README.md`, and the three dead `uf1-19` pointers listed above.

**Out of scope**
- Production/R2 hosting, `base`, and the built output's `/<id>/` paths — those are already real
  and are what this story makes dev match. Do not "fix" the build.
- The `strictPort`/host pins, and anything in `docs/ops/hosting.md` about buckets or domains.
- The remaining mg1 stories (mg1-3 CI lobby leg, mg1-5 deploy atomicity) — adjacent, not this.

## Acceptance Criteria

> ⚠ **AC1 below is quoted verbatim from `epic-mg1.yaml` and its second branch is DEAD.**
> The owner ruled on 2026-07-31 (see *BINDING OWNER RULING* above): only the **first** branch —
> genuinely serving each game at `/<id>/` — satisfies this story. The "or … renamed and reworded"
> half is rejected scope. The original text is left intact rather than edited so the ruling is
> visible as a decision, not disguised as the story having always said so.

- Either the dev server genuinely serves each game at /<id>/ from its own plugin sources, or the recipe and its docs are renamed and reworded so nothing claims a cabinet-wide dev server exists.
- The verification uses a nonsense control path and asserts a game path DIFFERS from it. An all-200 sweep of known paths is explicitly insufficient — it passes today against a server that serves the lobby at every URL.
- The existing byte-identical-to-control assertion added by Task 19 is updated rather than deleted, so the invariant moves instead of evaporating.

---
_Generated by `pf context create story mg1-2` from the sprint YAML._

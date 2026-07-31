---
story_id: "mg1-2"
jira_key: "mg1-2"
epic: "mg1"
workflow: "tdd"
---
# Story mg1-2: A genuinely multi-app dev server — just serve currently serves the lobby at every path

## Story Details
- **ID:** mg1-2
- **Jira Key:** mg1-2
- **Workflow:** tdd
- **Points:** 5
- **Priority:** p2
- **Stack Parent:** none
- **Branch:** feat/mg1-2-multi-app-dev-server
- **Branch Strategy:** trunk-based (branching created per user directive; standard behavior would skip branching on trunk-based repos)

## Workflow Tracking
**Workflow:** tdd (phased)
**Phase:** finish
**Phase Started:** 2026-07-31T19:39:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-31T18:20:06.892337Z | 2026-07-31T18:25:51Z | 5m 44s |
| red | 2026-07-31T18:25:51Z | 2026-07-31T18:45:23Z | 19m 32s |
| green | 2026-07-31T18:45:23Z | 2026-07-31T19:02:53Z | 17m 30s |
| review | 2026-07-31T19:02:53Z | 2026-07-31T19:39:56Z | 37m 3s |
| finish | 2026-07-31T19:39:56Z | - | - |

## BINDING OWNER RULING — Setup Finding (Record Prominently)

**Effective 2026-07-31, at setup, BEFORE red.**

**AC1 is an either/or**: Build the multi-app dev server OR rename the recipe so nothing claims one. The user ruled:

**BUILD IT.** The dev server must genuinely serve each game at `/<id>/` from that plugin's own sources. The descope option (rename `just serve`, reword the docs to disclaim a cabinet-wide server) is REJECTED and must not be re-proposed by TEA, Dev or Reviewer.

**Target shape the user approved:**
```
GET /tempest/   -> plugins/tempest/index.html  (title: Tempest)
GET /joust/     -> plugins/joust/index.html    (title: Joust)
GET /           -> lobby/index.html            (title: Slabcade)
GET /banana/    -> lobby SPA fallback          (control)
```

**The MECHANISM is deliberately NOT ruled on** and is the pipeline's call: a Vite middleware/plugin resolving `/<id>/` to `plugins/<id>/index.html`, a multi-page `rollupOptions.input`, or something better found in the config. **Open technical question (do not resolve):** `rollupOptions.input` is a build-time concern and Vite's MPA mode natively serves entry points at their on-disk path (`/plugins/<id>/index.html`), not at `/<id>/` — so an input map alone likely does not satisfy the ruling without URL rewriting.

## Setup Finding: Dead Story ID Reference (In-Scope Doc Targets)

`uf1-19` does NOT exist. Epic-uf1 ends at uf1-18. The 2026-07-31 epic split renumbered that work to THIS story, mg1-2. Three places still point at the dead id:

- **CLAUDE.md line 134:** "making the dev server serve them too is filed as **uf1-19**"
- **CLAUDE.md line 136:** "which reddens the day uf1-19 lands and this paragraph has to change"
- **docs/superpowers/plans/2026-07-30-arcade-plugin-host.md line 2900:** "Building the real multi-app dev server is FILED as `uf1-19`"

All three are in this story's blast radius and must be updated to reference mg1-2 instead. Record them as known in-scope doc targets.

## Technical Approach: Files to Read (Do Not Guess)

The story itself names these files; read them, do not paraphrase:

- **vite.config.ts** — default-exports `defineAppConfig({ id: 'lobby' })`, the root cause. Also pins `server.host: '127.0.0.1'`, `port: 5270`, `strictPort` (see CLAUDE.md — the pin is load-bearing, td1-1/jt1-3; do not disturb it).
- **tests/canonical-serve.test.mjs** — carries the Task 19 tripwire. Read its header comment block (lines 1-43); it is an auditable record of what Task 19 retired and why. The assertion named in AC3 is `the dev server serves the LOBBY at every path` (byte-identical-to-`/banana/`-control, lines 221-284). AC3 requires this be UPDATED, never deleted — "the invariant moves instead of evaporating".
- **lobby/README.md** and **README.md** — Task 19 wrote the current honest-but-limited truth into both.
- **plugins/<id>/index.html** for the seven games, and **scripts/build-app.mjs** / **scripts/gen-registry.mjs** for how app ids are enumerated today.

## Acceptance Criteria (Verbatim from epic-mg1.yaml, with the ruling applied)

1. **AC1 (first branch only, per the ruling):** The dev server genuinely serves each game at `/<id>/` from its own plugin sources.
   - The descope option is REJECTED.

2. **AC2 (NON-NEGOTIABLE verification strategy):** The verification uses a nonsense control path and asserts a game path DIFFERS from it. An all-200 sweep of known paths is explicitly insufficient — it passes today against a server that serves the lobby at every URL.
   - Emphasise this in planning: this story exists BECAUSE a vacuous all-200 check was caught and replaced.
   - A successor that ships another vacuous check is the exact failure this epic was filed to stop.
   - The control path `/banana/` and the DIFFERS assertion are non-negotiable.

3. **AC3:** The existing byte-identical-to-control assertion added by Task 19 is updated rather than deleted, so the invariant moves instead of evaporating.

## Impact Summary

*Written by hand at finish. The auto-writer emitted nothing for this story — verified by grepping
this archive for the heading before committing, which is the only reason it is here.*

**Shipped:** one dev server now serves the whole cabinet — the lobby at `/`, each of the seven games
at `/<id>/` from its own plugin sources, plus each plugin's second HTML entry. Delivered by mounting
one `middlewareMode` Vite server per game, built from the **same** `defineAppConfig(<id>)` the
production build uses, so dev and build cannot disagree about `root`, `base` or the alias map. No URL
or HTML rewriting is hand-rolled. Merged to `main` as a fast-forward of 11 commits (`0e57baa..51d2d23`);
`main` had not moved, so no trial-merge was needed.

**Blocking items: none.** Seven findings were raised across three review rounds and all seven are
fixed; nothing was deferred into the merge.

**Upstream effects a later reader should know about:**

1. **`plugins/tempest/CLAUDE.md` and `plugins/star-wars/CLAUDE.md` were reversed.** Both told agents
   and developers there was *no way to run the game in a browser from this repo* and not to try.
   That is now false and both were rewritten. Any workflow, prompt or habit built on "you cannot
   verify a render locally" is obsolete — you can, at `http://127.0.0.1:5270/<id>/`.
2. **`scripts/build-app.mjs` does not exist" was also false** and is corrected in
   `plugins/star-wars/CLAUDE.md`; verified by running `node scripts/build-app.mjs star-wars`.
3. **`uf1-19` is retired as an id.** It was renumbered to mg1-2 by the 2026-07-31 epic split;
   CLAUDE.md, README.md, lobby/README.md, the justfile and vite.config.ts are cleaned, and a test
   now fails if any of those five reintroduces it. The Task 19 plan entry keeps its original text
   with a dated `> Superseded` note, deliberately — it is a record of what was decided, not a
   statement of current fact.
4. **HMR does not reach the games** — filed as **mg1-14** (3pt, bug, p2), not silently absorbed. The
   lobby's hot reload works; a game's does not, because the seven children share the parent's
   websocket. Not a regression (no game could be served at all before this story) and the dev server
   is fully usable: watchers are live and a manual refresh picks up every change. `vite.config.ts`
   and CLAUDE.md both warn at the point of use, and mg1-14's AC4 forbids the "an upgrade was
   accepted" check that produced a false claim here.
5. **`tests/canonical-serve.test.mjs` inverted its central invariant.** The Task 19 tripwire
   asserted a game path is byte-IDENTICAL to the `/banana/` control; it now asserts they DIFFER,
   with the same spawn/control/comparison machinery. Four bootstrap tests' comments were re-pointed
   at the new title. Anything else quoting the old assertion name is stale.
6. **A latent trap was documented rather than left as folklore:** every plugin `index.html` and
   `lobby/index.html` reference the same absolute `/src/main.ts`. It is unambiguous only because
   each app keeps its own `root`. Any future change that roots a server or build higher up hands one
   app another's bootstrap — real JavaScript, right content-type, wrong app, no error.
7. **Two non-blocking gaps observed and recorded, not fixed:** `plugins/joust/index.html` declares no
   favicon (browser logs a 404 per load), and a missing static asset under a game prefix returns
   that game's SPA fallback as `200 text/html` rather than `404` — so any future asset test must
   assert on content-type, never status.

**Process note worth carrying:** review round 1 ran with no specialists (the harness blocks spawning
agents unless the user asks) and found 3 defects by hand. The user then authorised the four enabled
specialists, and they found **4 more** on the same diff — both of the ones in code written here were
false beliefs the author had already committed to prose, not oversights. Self-review re-reads the
belief instead of re-deriving it. Recorded in the reviewer sidecar.

## Delivery Findings

### TEA (test design)

- **Gap** (non-blocking): The local `node_modules` predated the `rust-just` dependency, so
  `every binary the orchestrator suite spawns is provisioned by CI, not by the developer machine`
  (tests/monorepo-topology.test.mjs) failed on arrival — unrelated to this story. Affects the
  developer environment, not the tree (`npm ci` fixed it; no file changed). Worth knowing that a
  checkout that skipped `npm ci` after that dependency landed shows a red orchestrator suite that
  looks like someone's regression. *Found by TEA during test design.*
- **Improvement** (non-blocking): Every plugin `index.html` AND `lobby/index.html` reference the
  same absolute specifier `/src/main.ts`. Affects `lobby/index.html` and `plugins/*/index.html`
  (nothing needs to change for mg1-2 — Dev must simply resolve it per-app). It is only unambiguous
  because each app is served with its own `root`; any future change that roots a server or a build
  higher up re-creates this collision, and the losing side gets real JavaScript from the wrong app
  rather than an error. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): `plugins/joust/index.html` declares no favicon, so a browser
  falls back to requesting `/favicon.ico` and logs a `404` on every load of `/joust/`. Affects
  `plugins/joust/index.html` (add the `<link rel="icon" href="/favicon.png">` the other games
  carry, and a `favicon.png` beside it). Pre-existing and unrelated to routing — tempest's and
  star-wars' declared `/favicon.png` both resolve to a real `image/png` through their child
  servers, verified. It was invisible before mg1-2 because no one could load a game.
  *Found by Dev during implementation.*
- **Gap** (non-blocking): a MISSING static asset under a game prefix returns that game's SPA
  fallback — `GET /joust/favicon.png` is `200 text/html`, not `404`. Affects nothing today, but
  anyone writing a future test about game assets must assert on the content-type rather than the
  status, exactly as `AC1: a game page's own module really loads` had to. The fallback behaviour is
  per-child and inherited from Vite's defaults, not introduced here. *Found by Dev during
  implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): hot module replacement does not reach the seven games — **filed as
  `mg1-14`** (3pt, bug, p2) during review round 1, since fixing it properly means either a
  per-child HMR port or a dispatching websocket layer, and neither belongs in mg1-2's scope.
  Affects `vite.config.ts` (the children's `hmr` option). Measured: the file watcher IS live and re-fetching a game module returns fresh content,
  so a manual browser refresh works and the dev server is fully usable; only the automatic push is
  missing. Two shared-server variants were tried and neither delivers — `hmr: { server }` alone,
  and `hmr: { server, path: '/<id>/@hmr' }`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): no test in the repo covers HMR for any app, including the lobby's
  (which does work). Affects `tests/canonical-serve.test.mjs` (or a sibling). This is the coverage
  gap that let a silent HMR regression reach review green; the technique is cheap — connect a
  `vite-hmr` websocket, touch a file, assert an update message arrives. *Found by Reviewer during
  code review.*

## Design Deviations

### TEA (test design)

- **AC1's documentation clause is guarded only by the dead story id, not by prose absence**
  - Spec source: context-story-mg1-2.md, "Dead Story ID in Scope" + AC1
  - Spec text: "the recipe and its docs are renamed and reworded so nothing claims a cabinet-wide
    dev server exists" / "All three are in this story's blast radius and must be updated"
  - Implementation: one test asserts `uf1-19` appears in none of CLAUDE.md, README.md,
    lobby/README.md, justfile or vite.config.ts. No test asserts that the four warning paragraphs
    stop claiming the lobby is served at every path.
  - Rationale: this file already ruled on exactly this question for the retired port 5273 —
    "a doc may legitimately mention an old port while explaining the collapse, and an absence test
    would be a tripwire on prose rather than on the pin." The same holds here: a doc that says
    "it used to serve the lobby everywhere; it now serves each game" is correct and would fail a
    naive absence assertion. A dead story id has no such legitimate use — it points the reader at
    nothing — so that is the half I pinned.
  - Severity: minor
  - Forward impact: the four warning paragraphs (CLAUDE.md's ⚠ blockquote, README.md:134-136,
    lobby/README.md:32-40, the justfile `serve` comment) plus `plugins/tempest/CLAUDE.md:83` and
    `plugins/star-wars/CLAUDE.md:106` must be checked BY EYE at review. No test will catch a
    paragraph left saying "a screenshot taken at /tempest/ is the lobby". `plugins/tempest/CLAUDE.md`
    additionally states "There is no way to run tempest in a browser from this repo yet", which
    this story falsifies outright.

- **The `/banana/` control is pinned to today's behaviour (200 + the lobby's SPA fallback)**
  - Spec source: context-story-mg1-2.md, AC2
  - Spec text: "The verification uses a nonsense control path and asserts a game path DIFFERS from it."
  - Implementation: beyond DIFFERS, the control is asserted to return 200 with the lobby's title.
  - Rationale: under the OLD identical-bytes assertion the vacuity risk was comparing errors to
    errors; under DIFFERS it inverts — anything unstable or absent makes "differs" trivially true,
    so an unpinned control weakens the very assertion it exists to support. mg1-2 asks nothing about
    unknown-path handling, so today's behaviour is the honest pin.
  - Severity: minor
  - Forward impact: if Dev deliberately makes unknown paths 404, this assertion fails on a correct
    implementation. That is intentional — the failure message says so and instructs a deviation
    rather than a silent re-point. It is a scope question (does mg1-2 change unknown-path handling?)
    that should surface, not be absorbed.

- **No test asserts HOW the routing is implemented**
  - Spec source: session file, "BINDING OWNER RULING"
  - Spec text: "The MECHANISM is deliberately NOT ruled on and is the pipeline's call"
  - Implementation: every assertion is behavioural — made against a spawned server over HTTP. No
    test reads `vite.config.ts` for a plugin, a middleware or a `rollupOptions.input` shape.
  - Rationale: the ruling leaves the mechanism open, so pinning one would convert a free choice into
    a requirement and redden a correct implementation that chose differently.
  - Severity: minor
  - Forward impact: Dev is free to pick the mechanism. The cost is that a change which achieves the
    routing by an unmaintainable route still passes — that judgement is the Reviewer's, not a test's.

### Dev (implementation)

- **Corrected an out-of-scope false claim in `plugins/star-wars/CLAUDE.md` while rewriting its paragraph**
  - Spec source: context-story-mg1-2.md, Scope ("Out of scope: … The remaining mg1 stories")
  - Spec text: the story's doc targets are the ones describing the DEV SERVER's behaviour
  - Implementation: the same paragraph also asserted "`npm run build` at the root is likewise not
    wired yet (`scripts/build-app.mjs` does not exist — `MODULE_NOT_FOUND`)". That is false —
    I ran `node scripts/build-app.mjs star-wars` and it built in 40ms. I corrected it rather than
    rewriting the surrounding sentences and leaving a known falsehood inside them.
  - Rationale: leaving a measured-false claim in a paragraph I had just edited would have implied
    it survived review. Both claims were true when written and became false together.
  - Severity: minor
  - Forward impact: none. No test read either claim; nothing depends on the text.

- **The Task 19 plan entry is ANNOTATED, not corrected**
  - Spec source: context-epic-mg1.md, "Preserve the accounting, don't erase it"
  - Spec text: "retired assertions are quoted by their exact old title with the reason"
  - Implementation: `docs/superpowers/plans/2026-07-30-arcade-plugin-host.md:2900` keeps its
    original "FILED as `uf1-19`" sentence verbatim, with a dated `> Superseded 2026-07-31` block
    beneath recording the renumbering, that the work shipped, and that what landed was none of the
    three options that entry listed.
  - Rationale: a plan is a record of what was decided at the time. Rewriting it would make the plan
    appear to have predicted the outcome. The same reasoning mg1-1 applies to the frozen audit doc.
  - Severity: minor
  - Forward impact: a reader grepping `uf1-19` still finds that file — deliberately. The test only
    guards the five live doc/config sites, where a dead id is a broken pointer rather than history.

- **Child servers share the parent's `httpServer` for HMR**
  - Spec source: the failing tests (none of them cover HMR)
  - Spec text: n/a — no test or AC mentions hot module replacement
  - Implementation: each child is created with `hmr: { server: server.httpServer }` rather than
    defaulting.
  - Rationale: not an optimisation — a defect fix. With the default, all seven children opened
    their own websocket on Vite's port 24678 and six failed, printing
    `WebSocket server error: Port 24678 is already in use` on every start. Six error lines per
    `serve` train people to ignore errors.
  - Severity: minor
  - Forward impact: see the correction below — the games get no hot reload either way, so this
    buys quiet, not capability.

  > **✗ CORRECTED 2026-07-31, review round 1.** As first written this entry claimed "HMR for all
  > eight apps now rides one HTTP server" and cited "a `vite-hmr` websocket upgrade is accepted" as
  > verification. Both the claim and its evidence were wrong, and the original wording is left
  > above the strike so the error is visible rather than quietly rewritten.
  >
  > **What is actually true, measured:** the games get NO hot reload. Editing
  > `plugins/tempest/src/core/rules.ts` delivers nothing to a game client; editing
  > `lobby/src/shell/tiles.ts` delivers `full-reload:*` to the lobby's. All seven children share
  > the parent's `httpServer`, so the parent's own socket wins every upgrade and the children's
  > messages go nowhere. The upgrade that was "accepted" was the LOBBY's — the check confirmed a
  > socket existed, not that the right one did. Accepting an upgrade is not a working channel, and
  > treating it as one is the same proof-by-proxy this epic exists to stamp out.
  >
  > **Why the code still stands:** it is not a regression (before mg1-2 no game could be served at
  > all, so none had hot reload to lose), and the dev server is fully usable — each child's watcher
  > is live and re-fetched modules are fresh, so a manual refresh picks up every change. Dropping
  > the shared server would restore six errors per start AND still leave six games without HMR.
  > Filed as **mg1-14** with the measurement, the approach already ruled out
  > (`hmr: { server, path }`), and an AC forbidding the accepted-upgrade check as evidence.

- **All seven children are created eagerly at server start, not lazily on first request**
  - Spec source: minimalist discipline (simplest code that passes)
  - Spec text: "The simplest code that passes the tests IS the right code"
  - Implementation: the `configureServer` hook builds all seven up front.
  - Rationale: lazy construction is the obvious optimisation and I measured before adding it —
    first response after **265 ms**, `/tempest/` served in **6 ms**, versus 263 ms measured the
    same way on the eager-plus-shared-HMR build. Vite does no bundling in dev, so a child costs
    almost nothing to create. Lazy would have added a code path and a race for no measured gain.
  - Severity: minor
  - Forward impact: cost grows linearly with the number of games. If startup ever becomes
    noticeable, construct on first request to the prefix — the map is already keyed that way.

### Reviewer (audit)

- **TEA — "AC1's documentation clause is guarded only by the dead story id"** → ✓ ACCEPTED by
  Reviewer: the 5273 precedent quoted in the deviation is real and sits in the same file; an
  absence-of-prose assertion would be a tripwire on wording. The by-eye review it defers was
  performed — all six doc sites read, and they are accurate.
- **TEA — "the `/banana/` control is pinned to today's behaviour"** → ✓ ACCEPTED by Reviewer: the
  reasoning that DIFFERS inverts the vacuity risk is correct, and the failure message instructs a
  deviation rather than a silent re-point. Behaviour is unchanged, so it never fired.
- **TEA — "no test asserts HOW the routing is implemented"** → ✓ ACCEPTED by Reviewer: correct
  under the owner ruling, which left mechanism open. Noting the stated cost landed exactly as
  predicted — "a change which achieves the routing by an unmaintainable route still passes … that
  judgement is the Reviewer's, not a test's" — and that judgement is this review's R1/R2.
- **Dev — "corrected an out-of-scope false claim in `plugins/star-wars/CLAUDE.md`"** → ✓ ACCEPTED
  by Reviewer: verified independently that `node scripts/build-app.mjs star-wars` succeeds, so the
  original claim was measurably false. Correcting a falsehood inside a paragraph being rewritten is
  right; leaving it would have implied it survived review.
- **Dev — "the Task 19 plan entry is ANNOTATED, not corrected"** → ✓ ACCEPTED by Reviewer: matches
  the epic context's "preserve the accounting" rule and mg1-1's treatment of the frozen audit doc.
- **Dev — "all seven children are created eagerly"** → ✓ ACCEPTED by Reviewer: measured before
  choosing (265 ms), which is the right order. Independently re-observed a 5 ms `/tempest/`.
- **Dev — "child servers share the parent's `httpServer` for HMR"** → ✗ **FLAGGED by Reviewer.**
  The entry states "HMR for all eight apps now rides one HTTP server" and cites as verification
  that "a `vite-hmr` websocket upgrade is accepted". Measurement refutes it: editing
  `plugins/tempest/src/core/rules.ts` delivers NOTHING to a game socket, while editing
  `lobby/src/shell/tiles.ts` delivers `full-reload:*` to the lobby's. The upgrade that was
  "accepted" was the lobby's — the check confirmed a socket existed, not that the right one did.
  See finding R2. The deviation's own forward-impact line ("Nothing tests it, so it will fail
  silently") turned out to describe the change itself, not a future risk.

- **Reviewer (undocumented deviation):** the router's segment match requires the app id be followed
  by `/` or end-of-string, so a query string on a bare id (`/tempest?x=1`) is not recognised as a
  game path at all and falls through to the lobby. Nothing in the session file records that
  `/<id>` and `/<id>?…` were considered. Severity: M. See R1.

## Sm Assessment

Setup complete. The phase pointer read `setup` on arrival and the story is stamped `in_progress`.

**Contention probes — clean.** No open PRs on `slabgorb/arcade`; `git fetch --prune` then
`git branch -r | grep -Ei "mg1"` found no remote branch for any mg1 story; working tree was clean at
`878f9eb`. The cross-checkout `.session/` sweep returned `zsh: no matches found` — that is the glob
failing to match, which under a different shell would be indistinguishable from a clean board, so the
branch probe is the load-bearing one here. Nothing else owns this story.

**The one decision I took to the user, and why it could not wait.** AC1 as filed is an either/or:
build the multi-app dev server, *or* rename the recipe and reword the docs so nothing claims one
exists. Those are different deliverables (a 5-point build vs. a doc rename), and TEA writes a
different failing test for each — an unruled either/or does not risk rework so much as make RED
unspecifiable. The user ruled **BUILD IT** on 2026-07-31, before red, and approved the route shape
recorded above. The descope branch is dead and must not be re-proposed downstream. The mechanism was
deliberately left unruled: that one is the pipeline's.

**AC1's rejected half is still quoted verbatim in the context file, on purpose.** `sm-setup` copies
ACs straight from `epic-mg1.yaml`, so the dead branch would otherwise sit in front of TEA as primary
input. I added a `> ⚠` block directly above it naming which half is dead rather than editing the AC
text, so the ruling reads as a decision with a date rather than as the story having always said so —
and so the context does not silently disagree with the epic YAML.

**Setup finding: `uf1-19` is a dead story id.** There is no `id: uf1-19` in any sprint file (epic-uf1
ends at uf1-18); the 2026-07-31 epic split renumbered that work to mg1-2. Three places still cite it,
all inside this story's blast radius: `CLAUDE.md:134` and `:136` — the "⚠ What it actually serves
today" blockquote, which is also the paragraph this story invalidates — and
`docs/superpowers/plans/2026-07-30-arcade-plugin-host.md:2900`. Note the second CLAUDE.md hit is the
repo explaining when its own tripwire should redden, so it is documentation of this story's exit
condition pointing at a story that does not exist. Left unfixed for Dev deliberately; a drive-by edit
here would land outside any test's view.

**I filled two boilerplate stubs the generator left.** *Technical Approach* and *Scope* came back as
placeholder prose ("the behavior described by the story title"). Both are now written, with the
mechanism still unruled — what I recorded is the constraint set, not a design: the `127.0.0.1` / 5270
/ `strictPort` pins are load-bearing (td1-1) and must survive; app ids are already enumerated in four
places and a fifth list would drift; and the story's own `rollupOptions.input` suggestion is flagged
as an *inference to verify*, not a fact, because Vite's MPA dev mode serves entries at their on-disk
path rather than at `/<id>/`. TEA and Dev own resolving that.

**AC2 is the one I want TEA to feel the weight of.** This story exists because a vacuous all-200 sweep
was caught and replaced with an assertion that can fail. A successor that ships another all-200 check
would be the precise failure this epic was filed to stop. The `/banana/` control and the DIFFERS
assertion are non-negotiable, and AC3 requires the existing byte-identical-to-control assertion in
`tests/canonical-serve.test.mjs` be *moved*, never deleted.

**Claim is pushed** — `0e57baa` on `main` carries the stamp and context; `feat/mg1-2-multi-app-dev-server`
is pushed empty (tip == main) so a sibling's branch probe sees it immediately rather than at first commit.

Handing to Leeloo for the red phase.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `tests/canonical-serve.test.mjs` — the Task 19 tripwire moved and extended. Orchestrator suite
  (`npm run test:orchestrator`, `node:test`), NOT vitest: vitest never sees `tests/**/*.test.mjs`.

**Tests Written:** 5 failing tests covering 3 ACs (plus 1 green regression guard)
**Status:** RED — `tests 14 · pass 9 · fail 5` in this file; `tests 334 · pass 329 · fail 5`
across the whole orchestrator suite, so the five reds are the only reds and there is no collateral.
Grand total cross-checked against the full run, not inferred from a failure list.
`npm run lint` (tsc --noEmit, repo-wide) is clean.

### AC coverage

| AC | Test | Status |
|----|------|--------|
| AC3 — the invariant MOVES, not evaporates | `AC2/AC3: every game path DIFFERS from the nonsense control` | failing |
| AC2 — control path, DIFFERS, not an all-200 sweep | same test (control pinned + anti-vacuity on the game list) | failing |
| AC1 — each game served from its OWN plugin sources | `AC1: each game path serves THAT game, not merely something non-control` | failing |
| AC1 — …including its sub-entries | `AC1: a plugin sub-entry serves its OWN file, not the game index` | failing |
| AC1 — "genuinely serves", i.e. the page actually works | `AC1: a game page's own module really loads — 200 is not enough` | failing |
| context — the dead `uf1-19` pointer | `mg1-2: nothing still routes this work to the retired id` | failing |
| regression | `the lobby is still the front door at /` | **passing, by design** |

### How AC3 was honoured

The retired assertion is quoted by its exact old title in the file header, in the accounting style
this file already established for Task 19's own retirements. Its machinery — one spawned vite, one
`/banana/` control, one body comparison — survives intact with the comparison inverted from
identical to distinct. Nothing that made the old assertion unfakeable by a fallback was dropped.

### Three things I MEASURED rather than argued, and what each changed

1. **`/tempest/src/main.ts` already returns `200` with `content-type: text/html`.** The SPA fallback
   answers for a module that does not resolve. So "the game's script loads" cannot be tested by
   status — a 200 is exactly what the broken server gives. The module test therefore asserts the
   content-type and compares against the lobby's own module. Had I written the obvious status check,
   it would have passed today against a server that serves no games at all: the precise vacuous
   shape AC2 forbids, caught by measurement rather than by care.
2. **Every plugin `index.html` and `lobby/index.html` both reference `/src/main.ts`.** A server
   rooted at the repo hands a game the LOBBY's bootstrap — real JavaScript, wrong app, and green
   under any content-type check. Hence the differs-from-the-lobby's-module assertion.
3. **The lobby's raw HTML contains no game names** (tiles are injected from the registry at runtime),
   so identifying a game by its `<title>` cannot be satisfied by the lobby page. Checked before
   relying on it.

### I probed my own contract before handing it over

A suite can assert several true things that no implementation can satisfy at once, so I served
tempest through the existing `defineAppConfig({ id: 'tempest' })` and ran this suite's own
predicates against it. All five pass under a real game-serving vite — the contract is achievable,
not a trap.

**That probe also found a vacuity hole in my own test.** The filter dropping Vite's injected client
was `src.startsWith('/@')`. Under a per-app `base`, Vite emits its client as
`/tempest/@vite/client`, which does not start with `/@` — so the filter let it through, and since
that client is real JavaScript differing from the lobby's bootstrap, every downstream assertion
would have passed on it. The `entries.length >= 1` guard would then have been satisfied by a page
carrying no app entry at all. Fixed to `includes('/@')`; the measurement is recorded in the comment
so it is not "simplified" back.

### Deliberate anti-vacuity, beyond the ACs

- **Loops that could iterate zero times are guarded.** `gameIds()` must yield ≥ 7 and the sub-entry
  enumeration ≥ 4. A `for` over an empty array asserts nothing and reports success — the failure
  mode a discovery-driven test invites.
- **Nothing is hardcoded that can be read.** Game ids come from `plugins/`, titles from each
  `index.html`, sub-entries from each plugin directory. The epic's own guardrail is that a
  hand-maintained list here would be a fifth copy free to drift.
- **Identity, not just difference.** "Differs from the control" alone is satisfied by a server
  serving ONE game at all seven paths; the title check plus set-distinctness closes that.
- **Bodies compare by hash.** Not a weakening — the pages are ~16KB and the modules carry an inline
  base64 sourcemap, and the first run buried its own failure messages under tens of kilobytes of
  diff. The `uf1-19` test reports line numbers for the same reason.

### Self-check

6 tests reviewed; no vacuous assertions (`assert(true)`, `let _ =`, unchecked `is_some`-style)
remain. One vacuity defect was found and fixed — the `/@` filter above — and it was found by
running the probe, not by reading the code. `.claude/rules/` and `SOUL.md` do not exist in this
repo; `.pennyfarthing/gates/lang-review/javascript.md` was consulted for the test file's language.

### For Korben — where the difficulty actually is

The four questions are ordered so that a partial fix cannot look complete: routing the HTML is the
easy half, and a change that passes the first three tests while failing the fourth is a dev server
that renders a game page and then dies on its first import. `vite.config.ts`'s default export is
the file that causes today's behaviour. Do not disturb `host: '127.0.0.1'` / `port: 5270` /
`strictPort` — they are load-bearing (td1-1) and separately pinned. The docs listed in the first
Design Deviation have no test watching them and must be corrected by hand.

**Handoff:** To Korben Dallas for implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 14/14 in `tests/canonical-serve.test.mjs`; **334/334** across the orchestrator suite
(exit 0, no collateral). **Branch:** `feat/mg1-2-multi-app-dev-server` (pushed, `a9bc319`).

**Files Changed:**
- `vite.config.ts` — the `arcade:serve-the-cabinet` plugin, and the default export now composes it
  with the lobby's config. `defineAppConfig` itself is UNCHANGED, deliberately (see below).
- `CLAUDE.md`, `README.md`, `lobby/README.md`, `justfile` — the four sites that described the old
  behaviour, rewritten; a dev-URL table replaces the ⚠ warning in CLAUDE.md.
- `plugins/tempest/CLAUDE.md`, `plugins/star-wars/CLAUDE.md` — both told developers a game could
  not be run in a browser at all, and told them not to try.
- `tests/{centipede,battlezone,red-baron,joust}-bootstrap.test.mjs` — comment pointers to the
  retired guard's old title.
- `docs/superpowers/plans/2026-07-30-arcade-plugin-host.md` — annotated, not rewritten.

### The mechanism, and the one that looked easier

Each game runs as its own Vite server in `middlewareMode`, built from the **same**
`defineAppConfig(<id>)` the build uses, mounted under its `/<id>/` prefix. That config already sets
`root` to the plugin and `base` to `/<id>/`, so every child resolves its own files, rewrites its own
HTML and answers its own `/<id>/src/…` requests exactly as it does when built. Nothing hand-rolls a
URL map or an HTML rewrite, and dev cannot drift from the build because one definition feeds both.

The obvious alternative — root the single server higher up and rewrite `/<id>/…` to `plugins/<id>/…`
— is the trap TEA measured and wrote into the suite: every plugin `index.html` **and**
`lobby/index.html` reference the same absolute `/src/main.ts`, so the losing side gets the lobby's
bootstrap. Real JavaScript, right content-type, wrong app, no error anywhere. Per-app roots keep
that specifier meaning what it has always meant, which is why the fix is a mount rather than a
rewrite. The plugin is `apply: 'serve'` and lives ONLY in the default export — inside
`defineAppConfig` it would make every child mount its own children and recurse forever.

### What the tests did not catch, and how it was found

Nothing in the suite covers HMR. The first working build printed
`WebSocket server error: Port 24678 is already in use` **six times** on every start: each child
opened its own HMR websocket on Vite's default port and only the first won. Every test was green.
It was found by reading the server's own stdout while measuring startup — the tests were never
going to say anything about it. Children now share the parent's `httpServer`; verified afterwards
that the noise is gone and a `vite-hmr` upgrade is accepted.

### Verification beyond the ACs

The suite proves the right HTML arrives. It cannot see a page that serves correctly and then dies
on its first import, and the real risk there was `@shared`/`@host` resolving outside each child's
narrower `root`. So:

- **Module-graph crawl** through the dev server, per game, requiring JavaScript at every node
  (a missing module returns the fallback's HTML with a 200, so status proves nothing):
  tempest 29 modules, joust 22, star-wars 38, red-baron 35 — **zero non-JS, no server errors**.
- **Loaded in a real browser.** `/tempest/` renders its attract screen (1412×829 canvas, 73.7% of
  pixels lit — the glow bloom; title `Tempest`), `/joust/` renders too, **no console errors** in
  either beyond joust's missing-favicon 404 (filed above, pre-existing).
- `npm run lint` clean · `npx vitest run` 10413 passing / 698 files · `just build-all` exit 0 ·
  `node scripts/build-app.mjs star-wars` run explicitly to disprove that file's own claim.

This story's whole point was that a game's render could not be verified locally. It can now, and
I verified it the way the docs now tell the next person to.

### Self-review

- Wired end to end — the capability is reachable by the documented command, not just by the tests.
- No debug code, no stray files; the temporary contract probe and screenshot were removed and the
  working tree is clean.
- The load-bearing pins (`host: '127.0.0.1'`, `port: 5270`, `strictPort`) are untouched; their
  guard `AC2: the pin comes from the config, so a BARE npx vite is pinned too` is still green.
- Unknown-path handling is deliberately unchanged, so the `/banana/` control still behaves as the
  suite pins it.

**One caution for Zorg:** the four doc paragraphs and both plugin `CLAUDE.md` files have no test
watching them (TEA's first Design Deviation explains why absence-of-prose assertions were rejected
here). They need reading by eye, not running.

**Handoff:** To Jean-Baptiste Emanuel Zorg for review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | N/A | disabled | N/A | Disabled via settings; domain assessed by Reviewer — found R1 |
| 3 | reviewer-silent-failure-hunter | N/A | disabled | N/A | Disabled via settings; domain assessed by Reviewer — found R2 |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | N/A | disabled | N/A | Disabled via settings; domain assessed by Reviewer |
| 6 | reviewer-type-design | N/A | disabled | N/A | Disabled via settings; domain assessed by Reviewer |
| 7 | reviewer-security | Yes | findings | 1 (low, informational) | confirmed 0, dismissed 1 (with correction), deferred 0 |
| 8 | reviewer-simplifier | N/A | disabled | N/A | Disabled via settings; domain assessed by Reviewer — found R3 |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled specialists ran and returned; the other 5 are disabled in
`workflow.reviewer_subagents` and were assessed by the Reviewer directly)

**Total findings:** 7 confirmed across three rounds, 1 dismissed with rationale, 0 deferred.

### Round 1 — no specialists available

Round 1 ran with NO subagents: this session's harness forbids spawning agents unless the user asks.
Every domain was assessed by hand and the review said so rather than stamping coverage it did not
have. That by-hand pass found R1 (silent lobby-serve on a query string), R2 (game HMR dead + a false
claim in the record) and R3 (unreachable `closeBundle`). The user then explicitly authorised the four
enabled specialists, and round 2 ran them for real over the same diff.

### What the specialists found that the by-hand review MISSED

This is the part worth recording, because it is the argument for running them:

- **test-analyzer → R6/R7 (confirmed, high).** Two of the four behavioural loops iterated `gameIds()`
  with no emptiness guard; with an empty list one degenerated to `assert.equal(0, 0)` and the other
  ran zero assertions — both reporting pass. I wrote that guard, and applied it at two of four call
  sites. Reviewing my own work, I read the guard I remembered writing rather than the four places it
  needed to be. It also independently mutation-tested the R1 regex fix and confirmed it reddens by
  name, and confirmed no assertion anywhere survives the pre-fix server.
- **rule-checker → R5 (confirmed, high).** The best finding of the review. My comment claimed
  `apply: 'serve'` prevents the plugin recursing into its own children. It went into Vite's own
  source to refute that: `createServer()` always resolves command `'serve'` (middlewareMode
  included) and the plugin filter KEEPS plugins whose `apply` equals the command. The code is safe
  for two reasons my comment never named — `defineAppConfig()` declares no `plugins` field, and
  `configFile: false` stops the child auto-loading this file. A future edit removing
  `configFile: false` on the strength of my rationale would have reintroduced silent infinite
  recursion. Also **R4** (confirmed, low): `void child.close()` was a floating promise.
  All five project-specific invariants verified intact.
- **preflight → clean.** Independently reproduced every number (335/335, 698 files / 10413 tests,
  lint clean, build-all clean, tree clean, zero smells). One caveat recorded rather than repeated:
  its structured `passed:` field read `345748`, a digit-concatenation of the two suites rather than
  their sum (335 + 10413 = 10748). The prose figures were correct; the rolled-up number was
  confabulated, so it is not quoted anywhere in this assessment.
- **security → dismissed, with a correction.** Its one finding (info-leakage: a plugin's non-source
  files become fetchable under its own prefix) is real but explicitly self-assessed as "effectively
  the intended behavior of the feature", loopback-only, no secrets — dismissed on that basis, which
  is the agent's own conclusion and mine. Its supporting SCOPING claim was too narrow and I checked
  it rather than accepting it: it reported each child's `fs.allow` confined to its plugin directory,
  which would mean `@shared` (outside every plugin) is unreachable and games would break at runtime.
  Measured: `/tempest/@fs/<repo>/src/shared/rng.ts` returns `200 text/javascript`, and tempest and
  centipede both pull `src/shared/highscore.ts` through their children successfully. So the
  reachable set includes the repo's `src/`, wider than reported — which does not change the
  dismissal (still loopback-only, still files the local user has on disk) but does change the
  measurement of record. Credit where due: the agent caught its OWN false positive mid-review, when
  plain `curl` normalised `..` client-side and appeared to show traversal; it re-ran with
  `--path-as-is` and reported the corrected result.

## Reviewer Assessment

**Verdict:** APPROVED — round 3, after the specialists ran.

Three rounds, and the shape of them is the finding worth keeping: round 1 was a by-hand review
(no specialists available) that REJECTED on 3 defects; round 2 fixed them; round 3 ran the four
enabled specialists over the same diff at the user's explicit authorisation and they found **4 more**
— including one that refuted my own stated reasoning against Vite's source. All 7 are fixed and
each fix was verified independently below. Earlier rounds are kept in full, because a review that
erases what it caught leaves no record of why the code looks the way it does.

**The lesson, recorded because it cost nothing to learn and would have cost a lot to miss:** a
by-hand review of one's own work is not equivalent to an independent one. Both defects the
specialists found in code I wrote were in things I had *already reasoned about and believed I had
handled* — the anti-vacuity guard I wrote and then applied to only half the call sites, and the
recursion rationale I wrote confidently and got wrong. Neither was an oversight of something
unconsidered; both were false beliefs, which is exactly the class self-review cannot reach.

**Data flow traced:** an inbound request → the cabinet router's first-path-segment match
(`vite.config.ts:145`) → either a per-game child server's middleware stack (`plugins/<id>/` as its
own `root`, `base` `/<id>/`) or `next()` into the lobby's own stack. Safe because the router only
ever *dispatches* — it rewrites no URL and reads no file itself, so a request either reaches an app
whose config already governs what it may serve, or reaches the lobby exactly as it did before this
story. Nothing widens `server.fs`; the surface is loopback-only dev, unchanged from before.

**Pattern observed:** composition over rewriting, at `vite.config.ts:93-158` — children are built
from the *same* `defineAppConfig(id)` the production build uses, so dev and build cannot disagree
about `root`, `base` or the alias map. This is what makes the `/src/main.ts` collision (shared by
all eight `index.html` files) a non-issue rather than a latent wrong-app bug.

**Error handling:** child cleanup is bound to the parent's `httpServer` `close` event
(`vite.config.ts:155`), now the single path after the unreachable `closeBundle` was removed;
`server.httpServer ?? undefined` degrades rather than throwing if the parent is itself headless.
The deliberate non-handling — unknown paths falling through to the lobby's SPA fallback — is
pinned by the control assertions, so it cannot drift silently.

### Round 3 — the specialists' findings, and how each fix was verified

| # | Finding (source) | Status | Verification |
|---|------------------|--------|--------------|
| R4 | `void child.close()` is a floating promise; a child whose socket has gone rejects during teardown (rule-checker, TS#7/JS#2) | **FIXED** | Now `.catch(() => {})`, with a comment saying the swallow is deliberate rather than accidental. `tsc` clean. |
| R5 | The `apply: 'serve'` comment misattributed recursion safety to that flag (rule-checker, project rule) | **FIXED** | I re-derived the claim rather than taking it: `apply` filters by COMMAND, and a `middlewareMode` child still resolves command `'serve'`, so such a plugin is kept, not excluded. Confirmed by reading `defineAppConfig` — it returns `root`/`base`/`resolve`/`build`/`server`/`preview` and **no `plugins` key**, which with `configFile: false` is what actually makes recursion impossible. Comment rewritten to name both, and to say plainly that removing either reintroduces it. |
| R6 | `AC1: each game path serves THAT game` looped `gameIds()` unguarded (test-analyzer) | **FIXED** | Guard hoisted INTO `gameIds()` rather than repeated at the call site — the repetition is what failed. **Mutation-tested:** forcing `plugins/` to enumerate empty now fails **5** tests naming the cause, where the hand-written version failed 2. Restored from a file copy, control run 15/15. |
| R7 | `AC1: a game page's own module really loads` looped `gameIds()` unguarded (test-analyzer) | **FIXED** | Same structural fix; covered by the same mutation. |

**Round-3 mechanical state, re-run after the fixes:** orchestrator **335/335** · `tsc --noEmit` clean
· dev server ready in **208 ms** with no websocket errors · control run green after every mutation.

### Round 2 — verification of each round-1 fix

| # | Round-1 finding | Status | How I verified it, independently of the fixer's claim |
|---|-----------------|--------|--------------------------------------------------------|
| R1 | Query string on a bare id served the lobby | **FIXED** | Re-probed all nine URL shapes against a live server: `/tempest?x=1` now returns `<title>Tempest</title>` (was `Slabcade`), and `/banana/`, `/banana`, `/banana?debug=1`, `/` and `/src/main.ts` are all unchanged — so the fix did not become "route everything to a game". The new guard was **mutation-tested**: restoring `(?:\/|$)` reddens `AC1: every shape of a game URL reaches the game, not the lobby` naming `/asteroids?debug=1`. Restored from a file copy, not `git checkout`, and a control run re-confirmed green. |
| R2 | Game HMR dead; record claimed it worked | **FIXED (as a record + disclosure fix; code stands by design)** | The deviation now carries a `✗ CORRECTED` block with the original claim left visible and the measurement stated. `vite.config.ts:110-127` and CLAUDE.md both warn at the point of use. `mg1-14` exists, is 3pt/bug/p2, and its AC4 explicitly forbids the accepted-upgrade check that produced the false claim. I confirmed the epic YAML **round-trips through ruamel** after the edit — it did not on the first write (a backtick opening a plain scalar), which is precisely the truncation hazard mg1-4's own AC warns about. |
| R3 | Unreachable `closeBundle` | **FIXED** | Gone; the surviving `httpServer` close listener is annotated with why the other half could never fire. |

**One thing the rework nearly got wrong, recorded because it is this story's own defect class:** the
follow-up was first written into the config comment as `mg1-8`. `mg1-8` exists — it is the purity
fence story — and epic mg1 already ran to mg1-13, so that comment would have shipped a *wrong-story*
pointer into the very file whose dead-`uf1-19` pointer this story removed. Caught before commit by
listing the epic's ids rather than assuming the next number was free.

**Round-2 mechanical state, re-run by me:** orchestrator **335/335 exit 0** · `tsc --noEmit` clean ·
`npx vitest run` **10413 passing** · `just build-all` green · dev server ready in **258 ms** with no
websocket errors in its output.

**Coverage, stated precisely:** the four specialists ENABLED in `workflow.reviewer_subagents` —
[TEST] test-analyzer, [SEC] security, [RULE] rule-checker and preflight — all ran in round 3 and
returned; their findings are confirmed or dismissed individually above. The other five are disabled
in project settings and were assessed by the Reviewer directly, which is where R1 (edge), R2 (silent
failure) and R3 (simplifier) came from. Two specialist claims were checked rather than accepted and
one was corrected: preflight's rolled-up `passed:` count was a digit-concatenation, and security's
`fs.allow` scoping was narrower than measurement supports. Neither changes an outcome; both are
recorded so the next reader does not inherit them as fact.

**Handoff:** To SM for finish-story

### Round 1 — REJECTED (all findings now fixed; kept for the record)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [EDGE] A query string on a bare app id silently serves the LOBBY. `/tempest?x=1` returns `<title>Slabcade</title>`. The segment match requires the id be followed by `/` or end-of-string; a `?` is neither, so the request is never recognised as a game path. `/tempest`, `/tempest/` and `/tempest/?x=1` are all correct — only this shape falls through. | `vite.config.ts:119` | Recognise the id when it is followed by `/`, `?`, `#` or end-of-string — a lookahead rather than a consuming match. Add the shape to the suite; TEA pins only the canonical `/<id>/`. |
| [MEDIUM] [SILENT] Hot module replacement never reaches the seven games, and the session file claims it works. MEASURED: editing `plugins/tempest/src/core/rules.ts` delivers nothing to a game websocket; editing `lobby/src/shell/tiles.ts` delivers `full-reload:*` to the lobby's. All seven children share the parent's `httpServer`, so the lobby's socket wins every upgrade and the games' messages go nowhere. | `vite.config.ts:110` | The CODE may stand (see rationale). Correct the false Design Deviation, document the real behaviour where a developer will meet it, and file the follow-up. |
| [LOW] [SIMPLE] `closeBundle` is unreachable. The plugin is `apply: 'serve'`, so it is excluded from builds entirely and this build-only hook can never fire. Child cleanup is really done by the `httpServer` `close` listener two lines above. | `vite.config.ts:130-133` | Delete it. Dead code that appears to be the cleanup path invites someone to "fix" a leak by editing the half that never runs. |

**Not a regression, and why R2's code may stand.** Before mg1-2 no game could be served at all, so
game HMR did not exist to break — this is an unmet capability, not something lost. The alternative
is worse in a way that matters: without the shared `httpServer`, all seven children open a
websocket on Vite's default 24678, six fail, and every `just serve` prints six
`Port is already in use` errors. Both states lack game HMR; only one also trains developers to
ignore error output. What is NOT acceptable is the record asserting a capability that measurement
refutes — "HMR for all eight apps now rides one HTTP server" is false, and it was about to be
archived as permanent.

**Why REJECT on Mediums.** The blocking rule forces reject on Critical/High and neither is present;
it does not forbid rejecting below that. R1 is a silent wrong-app serve — the precise defect class
this epic was filed to eliminate, and the same shape as the vacuous all-200 check that created the
story. Shipping it knowingly, when the fix is one lookahead, would contradict the charter the
story is written against. R2's correction protects the permanent record. Both are cheap; neither
should wait for a follow-up.

**What I verified rather than accepted.** Re-ran the orchestrator suite (334/334, exit 0) and
`tsc --noEmit` (clean) myself. Probed the live router across nine path shapes. Probed HMR
end-to-end by editing real source files and listening on the websocket, then established that the
watcher is live and re-fetched modules are fresh — which is what separates "no hot reload" from
"stale content", and sets R2's severity. Independently re-ran `node scripts/build-app.mjs
star-wars` to confirm the doc claim Dev corrected was genuinely false.

**What is genuinely good here, stated so the rework does not disturb it.** The mechanism is the
right one: mounting per-app servers built from the same `defineAppConfig` the build uses means dev
cannot drift from the build, and it sidesteps the `/src/main.ts` collision that a URL rewrite would
have walked straight into. The suite's anti-vacuity work is real — the list-emptiness guards, the
measured `includes('/@')` filter, and identity-not-merely-difference. The `apply: 'serve'` +
never-inside-the-factory recursion guard is correct and correctly explained. The load-bearing
`127.0.0.1` / 5270 / `strictPort` pins are untouched and still green.

**Coverage caveat, stated plainly:** no reviewer subagent ran (see Subagent Results). Every domain
was assessed by hand and this review claims no specialist coverage. [TEST] [SEC] [RULE] domains
were covered directly by the Reviewer.

**Round-1 handoff was:** Back to Dev for fixes — completed in commit `cd50d67`. The operative verdict is the round-2 APPROVED above.
---
story_id: "lb2-3"
jira_key: ""
epic: "lb2"
workflow: "tdd"
---
# Story lb2-3: Lobby tiles re-read high scores on return from a game (kill the frozen-at-load read)

## Story Details
- **ID:** lb2-3
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Repos:** lobby
**Branch:** feat/lb2-3-lobby-tile-score-refresh
**Phase:** finish
**Phase Started:** 2026-07-12T18:59:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T18:34:44.935633+00:00 | 2026-07-12T18:37:09Z | 2m 24s |
| red | 2026-07-12T18:37:09Z | 2026-07-12T18:47:13Z | 10m 4s |
| green | 2026-07-12T18:47:13Z | 2026-07-12T18:53:28Z | 6m 15s |
| review | 2026-07-12T18:53:28Z | 2026-07-12T18:59:17Z | 5m 49s |
| finish | 2026-07-12T18:59:17Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)

- **Gap** (non-blocking): `@arcade/shared/highscore` accepts an absurdly large score. A cookie of
  `arcade-hi-tempest=99999999999999999999999` passes `parseTopScore`'s `/^\d+$/`, and
  `Number.isInteger(1e23)` is `true`, so `isPublishableScore` waves it through and the tile reads
  `HI · 100,000,000,000,000,000,000,000`. Pre-existing and NOT introduced by lb2-3 (it renders the
  same on today's build-time read), and self-inflicted — but it is a "confident wrong number", the
  exact class of defect ADR-0004's parser was hardened to prevent. Affects
  `arcade-shared/src/highscore.ts` (`isPublishableScore` wants an upper bound, e.g.
  `Number.MAX_SAFE_INTEGER` or a sane arcade ceiling). *Found by Reviewer during code review.*
- **Question** (non-blocking): lb2-3 makes the tiles fresh **on return-by-navigation**, not
  "always fresh" — the background-tab player (lobby open in one tab, game in another, switch back)
  gets no `pageshow`, and cookies fire no `storage` event, so that tile stays frozen. Corroborates
  Dev's finding below; worth stating in the epic so nobody reads lb2-3 as closing the whole
  freshness gap. Affects `lobby/src/main.ts` (a `visibilitychange` follow-up, if judged real).
  *Found by Reviewer during code review.*

### Dev (implementation)

- **Improvement** (non-blocking): the BFCache restore — the exact path this story exists to fix —
  cannot be exercised under Playwright automation: Chromium disables the BFCache there, so a
  scripted Back rebuilds the page instead of restoring it (verified with a JS-heap marker, which
  did not survive). The handler was therefore confirmed in a real browser by dispatching a real
  `PageTransitionEvent('pageshow', {persisted: true})` at a live page with no reload. Affects
  `lobby/` (any future end-to-end BFCache coverage needs Chromium launched with the BFCache
  enabled, or a real device). *Found by Dev during implementation.*
- **Question** (non-blocking): `pageshow` covers back-navigation, but not the player who leaves
  the lobby open in a background tab, plays in another tab, and switches back — no `pageshow`
  fires for that, and cookies emit no `storage` event (ADR-0004). A `visibilitychange` listener
  would close it. Deliberately NOT added: no AC asks for it, and the story names `pageshow` as
  the mechanism. Affects `lobby/src/main.ts` (a follow-up story if the multi-tab case is judged
  real). *Found by Dev during implementation.*

### TEA (test design)

- **Conflict** (non-blocking): `renderTiles`' doc comment predicts the opposite of what AC-2
  requires — it says "calling this twice — which lb2-3 will, on returning from a game —
  refreshes the tiles instead of doubling them", i.e. it expects lb2-3 to re-call `renderTiles`,
  whose `container.replaceChildren(...)` rebuilds the entire grid. AC-2 forbids exactly that.
  Affects `lobby/src/shell/tiles.ts` (the comment above `renderTiles` is now stale and should be
  corrected when the in-place refresh lands; the `replaceChildren` behaviour itself is still
  right for the initial build). *Found by TEA during test design.*
- **Improvement** (non-blocking): a `0` can never actually reach a tile from the cookie —
  `@arcade/shared/highscore`'s `parseTopScore` rejects `'0'` (`isPublishableScore` demands
  `> 0`), so an unreadable score arrives as `null`, not `0`. AC-3's "never a 0" is therefore a
  guard against the REFRESH path coalescing `null` into a number (`score ?? 0`, `score || 0`),
  not against a zero coming up the wire. Affects `lobby/src/shell/` (whatever module the re-read
  lands in — keep `number | null` intact end to end). *Found by TEA during test design.*
- **Question** (non-blocking): lb2-9 will draw a live vector model into each tile's
  `data-model-slot`. The in-place refresh AC-2 mandates is what keeps that model (and keyboard
  focus) alive across a back-navigation, so the two stories are coupled more tightly than the
  backlog order suggests. Affects `lobby/src/shell/tiles.ts` (lb2-9 should not reintroduce a
  full-grid rebuild). *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. The tests TEA wrote pin AC-1 through AC-4 directly, and the
  implementation satisfies them without reinterpreting any of them. The one design question the
  story left open — where the re-read entry point lives — was answered inside the spec's own
  constraint ("one entry point, re-using the tile's existing render path"): `refreshScores()`
  sits in `tiles.ts` next to the build path it reuses.

### TEA (test design)

- **Tests forbid the re-`renderTiles` refresh that tiles.ts predicts, per AC-2**
  - Spec source: `sprint/context/context-story-lb2-3.md`, AC-2 — vs the doc comment above
    `renderTiles` in `lobby/src/shell/tiles.ts`
  - Spec text: AC-2 — "Refresh goes through one re-read entry point re-using the tile's existing
    render path — no duplicated score formatting, **no rebuilding the whole grid**." The tiles.ts
    comment says the reverse: "calling this twice — which lb2-3 will, on returning from a game —
    refreshes the tiles instead of doubling them."
  - Implementation: `refresh.test.ts` pins the tile `<a>` element's IDENTITY across a `pageshow`,
    and pins the survival of a sentinel child injected into `[data-model-slot]`. A refresh that
    re-calls `renderTiles` (`container.replaceChildren(...)`) passes the score assertions and
    fails both — so the cheapest fix the code invites is closed off deliberately.
  - Rationale: the AC outranks a source comment (spec-authority hierarchy: story context > code),
    and it is also right on the merits. `replaceChildren` destroys and recreates every tile on
    every back-navigation, which throws away keyboard focus mid-Tab and — once lb2-9 lands —
    the live vector model drawn into each tile's model slot. The comment is a stale prediction
    from lb2-7, written before AC-2 existed.
  - Severity: minor
  - Forward impact: Dev updates the `renderTiles` doc comment when the in-place refresh lands
    (logged as a Delivery Finding). `replaceChildren` stays correct for the INITIAL build; only
    the refresh path must not use it.

## Sm Assessment

**Story:** lb2-3 — lobby tiles re-read high scores on return from a game.
**Workflow:** tdd (phased) · 2pts · repo `lobby` · branch `feat/lb2-3-lobby-tile-score-refresh`.

### Readiness
Ready for RED. Setup verified: session file present and correctly named
(`lb2-3-session.md`, no slug), feature branch cut from `develop`, story context
written with a real technical approach and the four ACs.

### Routing notes for TEA (Han Solo)
The dependency question is settled, so this does not block on anything:
- ADR-0004 (cookie source) is **Accepted**, and lb2-2 already shipped it to
  production. The read path TEA is testing against is live, not hypothetical.
- The story is explicitly shippable independently of the rest of the lb2 epic.

Three constraints in `sprint/context/context-story-lb2-3.md` shape the tests
more than usual, so they are worth reading before writing the first RED test:
1. **`pageshow` with `persisted === true`** is the real target. A cold-load-only
   test passes while the actual bug (BFCache back-navigation, where the page is
   never rebuilt) survives untouched. AC1 names this specifically.
2. **`null` vs `0`.** `getTopScore()` returns `number | null`; both `null` and
   `0` are falsy. AC3 exists because a refresh that coalesces will flicker an
   unreadable tile to `0`. RED should pin this distinction explicitly.
3. **One re-read entry point** re-using the tile's existing render path (AC2) —
   this is a design constraint the tests should not fight by asserting a
   rebuilt grid.

### Merge gate
Clear. `gh pr list` against `lobby` (after `git fetch --prune`) shows no open PRs.

**Verdict:** hand off to TEA for the RED phase.

---
## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test Files:**
- `lobby/tests/refresh.test.ts` (jsdom) — 7 tests. Drives the REAL bootstrap (`../src/main`)
  and dispatches a real `pageshow`, so it is agnostic to where Dev puts the re-read entry point.
- `lobby/tests/refresh-rules.test.ts` (node) — 5 source rules. Split out because under jsdom
  `import.meta.url` is not a `file:` URL and `fileURLToPath` throws; `storage.test.ts` splits the
  same way.

**Tests Written:** 12 across 4 ACs (7 behavioural + 5 rule guards).

### RED — the 5 that fail, and why

| Test | Expected | Got today |
|------|----------|-----------|
| shows the newly-set score after a BFCache back-navigation | `HI · 250,000` | `HI · 100,000` |
| promotes a tile from NO SCORE to a real score | `HI · 4,400` | `NO SCORE` |
| refreshes the tile that changed, leaves the others alone | `HI · 12,000` | `HI · 9,000` |
| drops back to NO SCORE when a score is evicted | `NO SCORE` | `HI · 124,500` |
| updates the tiles in place instead of rebuilding the grid | `HI · 250,000` | `HI · 100,000` |

All five fail on the one missing thing: nothing ever re-reads the score. The score source is
already live — `readTopScore` re-reads `document.cookie` on every call, with no caching — so
Dev's job is to ask again, not to change how the score is fetched.

### Guards — 2 behavioural + 5 source rules pass today, and are here to fail on a wrong fix

Not vacuous, but not RED either: on frozen code they hold trivially. They exist to close off the
three cheapest wrong turns.

| Guard | Fails if Dev… |
|-------|---------------|
| stays at NO SCORE across refreshes, never a 0 | coalesces `null` into a number |
| never doubles the grid | appends tiles instead of updating them |
| tile `<a>` identity + model-slot survival (in the RED test above) | re-calls `renderTiles` (`replaceChildren`) |
| never coalesces a null score into a 0 (`?? 0` / `\|\| 0`) | writes the one-character version of AC-3's bug |
| score line formatted in exactly one place | re-derives `NO SCORE` / `HI · ` outside `core/score.ts` |
| tile text written as text, never markup | rebuilds a score line via `innerHTML` |
| no `as any` / `@ts-ignore` | reaches for a type-safety escape hatch |
| no `addEventListener('storage', …)` | builds on an event a cookie never fires (ADR-0004) |

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test | Status |
|------|------|--------|
| #1 type-safety escapes | `does not reach for a type-safety escape hatch` | passing (guard) |
| #4 null/undefined — `\|\| 0` on a value that can be `0` | `never coalesces a null score into a number` + `stays at NO SCORE … never a 0` | passing (guard) |
| #8 test quality | self-check below | done |
| #10 input validation (untrusted cookie) | already held by `storage.test.ts`; refresh must not bypass it | pre-existing |

**Rules checked:** 4 of 13 lang-review rules are applicable to this diff (a DOM refresh entry
point + a `pageshow` listener). Not applicable: #3 enums, #6 React/JSX, #7 async/Promise, #9
build config, #11 error handling (no throw sites added), #12 bundle. **#5 is deliberately NOT
enforced** — `.js` extensions in relative imports are required for the shared LIBRARY's shipped
ESM, but the lobby is a Vite-bundled app whose every existing import omits them; a test demanding
them would contradict the codebase.

**Self-check:** no vacuous assertions. No `let _ =`, no `assert(true)`, no `is_none()`-style
always-true checks. One trap avoided: an `expect(() => firePageshow(true)).not.toThrow()` test was
dropped — under jsdom, `dispatchEvent` does not rethrow a listener's exception, so that assertion
can never fail and would have been a decorative green tick. It was replaced with the per-tile
isolation test, which asserts real state.

**Verification:** 5 failing / 7 passing in the new files; all 74 pre-existing tests still green;
`tsc --noEmit` clean.

**Handoff:** To Dev (Yoda) for GREEN.

---
## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 79/79 passing (GREEN) · `npm run build` clean (`tsc --noEmit` + `vite build`)
**Branch:** `feat/lb2-3-lobby-tile-score-refresh` (pushed)

**Files Changed:**
- `lobby/src/shell/tiles.ts` — added `refreshScores()`, the single re-read entry point. It walks
  the tiles already on the page (found by a new `data-game` hook on each anchor) and rewrites one
  line of text per tile through the same `formatScoreLine()` the build path uses. Also corrected
  the stale `renderTiles` doc comment (TEA's Conflict finding) — it predicted lb2-3 would re-call
  `renderTiles`, which AC-2 forbids.
- `lobby/src/main.ts` — a `pageshow` listener calling `refreshScores(games, getTopScore)`.

**How each AC is met:**
- **AC-1 / AC-4** — `pageshow` is the only signal a BFCache restore gives us (the document is not
  rebuilt, so nothing at module scope re-runs). The listener fires on both the persisted and the
  cold-load case; on a cold load the re-read simply reports the numbers just rendered.
- **AC-2** — one entry point, no rebuild. `refreshScores` mutates the `.tile-score` text of the
  existing tiles; it never calls `replaceChildren`. The anchors keep their identity (and focus),
  and the model bays keep whatever lb2-9 draws into them. Formatting is not duplicated — both
  paths call `formatScoreLine()`, and the class/attribute names are declared once.
- **AC-3** — `null` is passed intact to `formatScoreLine()`, the only thing that decides what "no
  score" looks like. Nothing coalesces (`?? 0` / `|| 0`), so an unreadable tile stays NO SCORE and
  cannot flicker to a stale value or a `HI · 0`.

**Verified in a real browser (not just jsdom):** served this checkout on :5390 (5270 is held by
another checkout — verifying there would have tested someone else's code), seeded a score, and
dispatched a genuine `PageTransitionEvent('pageshow', {persisted: true})` at a live page with no
reload: TEMPEST moved `HI · 250,000` → `HI · 777,777`, the tile element and an injected model-slot
child both survived (`===` identity), RED BARON stayed `NO SCORE`, and the grid stayed at 5 tiles.
Caveat recorded as a Delivery Finding: a true BFCache restore is not reachable under Playwright
(Chromium disables it there — confirmed by a JS-heap marker that did not survive the Back), so the
real-event dispatch is the strongest available browser-level evidence.

**Self-review:** no debug code, no `as any`, no coalescing, no `innerHTML`; tree clean; on the
feature branch; the change is wired to the real bootstrap, not just unit-tested.

**Handoff:** To Reviewer (Obi-Wan Kenobi) for code review.

---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by me (see O-3, O-5) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by me (see O-2) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by me (see O-6) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by me (see O-7) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by rule-checker #1/#2/#4 |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain covered by me (see O-4) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by me (see O-1) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 18 rules / 41 instances | N/A |

**All received:** Yes (2 enabled specialists returned; 7 disabled via `workflow.reviewer_subagents` and covered by my own analysis)
**Total findings:** 3 confirmed (all LOW/non-blocking), 0 dismissed, 1 deferred upstream

> Seven of nine specialists are disabled in settings. I did not treat that as coverage — I worked
> their domains myself and cite the observation that carries each one.

---
## Reviewer Assessment

**Verdict:** APPROVE — with three non-blocking nits, none of which justify another round on a 2-point story.

**Preflight:** 79/79 tests, `tsc --noEmit` + `vite build` clean, tree clean, right branch, no
debug code / `.only` / `.skip`.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`, 13 checks + 5 project rules)

Enumerated by the rule-checker across every new const, function and listener — 41 instances,
**0 violations**. The ones that actually bite this story:

| Rule | Instance | Verdict |
|------|----------|---------|
| #4 null/undefined (`\|\| 0` on a value that can be `0`) | `tiles.ts:113` `formatScoreLine(getScore(id))` | **Compliant** — `number \| null` passes through untouched. This is THE rule for this story and it holds. |
| #4 (cont.) | `tiles.ts:109,111` | Compliant — explicit `=== null` checks, not falsy checks. |
| #1 type-safety escapes | `refreshScores`, `buildTile`, the `pageshow` closure | Compliant — no `as any`, no `!`, no `@ts-ignore`. `games` is narrowed by the `throw` guard at `main.ts:12`. |
| #10 input validation | `tiles.ts:47` `setAttribute(GAME_ATTR, game.id)` | Compliant — `game.id` is a registry literal, set via a safe DOM API. |
| Project: score formatted in ONE place | `tiles.ts:113` delegates to `formatScoreLine` | Compliant — `core/score.ts` untouched and unforked. |
| Project: textContent, never innerHTML | `tiles.ts:113` | Compliant — no `innerHTML` anywhere in `src/`. |
| Project: no `storage` listener (ADR-0004) | `main.ts:29` | Compliant — `pageshow`. |
| Project: lobby owns no transport | `main.ts`, `tiles.ts` | Compliant — neither file names `document.cookie`; the score arrives only via the injected `getScore`. |
| Project: DOM code out of `src/core` | `refreshScores` in `src/shell/tiles.ts` | Compliant — shell, not core. |
| #5 `.js` import extensions | all relative imports | **Not applicable** — that rule governs the shared library's shipped ESM, not this Vite-bundled app; every existing lobby import omits it. |
| #3 enums, #6 React, #11 error handling, #13 fix-regressions | — | Not applicable (no enums, no `.tsx`, no `try/catch`, not a fix round). |

### Observations

- **[O-1] [SIMPLE] LOW — `score` names an Element, not a score.** `tiles.ts:111`:
  `const score = tile.querySelector(...)` holds an `Element`, then `score.textContent = ...`. In a
  file whose entire thesis is "a score-number and a null are different things," binding the name
  `score` to a DOM node is the one piece of naming here that works against the reader. `scoreEl`
  costs nothing. Non-blocking: it is cosmetic, and Reviewer is read-only.
- **[O-2] [SILENT] LOW — the refresh fails silently if the tile's shape changes.**
  `tiles.ts:112` `if (score === null) continue` skips any tile with no `.tile-score` child. Should
  lb2-9 restructure the tile, the refresh would quietly stop working and the tile would freeze on a
  stale score again — this story's exact bug, resurrected with no signal. **Mitigated, and that is
  why I am not blocking:** `refresh.test.ts` asserts the text actually changes, so a restructure
  turns the suite red rather than shipping silently. The guard itself is also the right call — the
  codebase's standing rule is that a bad score never takes the page down.
- **[O-3] [EDGE] INFO — one guard is unreachable.** `tiles.ts:110` `if (id === null) continue`
  can never fire: `querySelectorAll('[data-game]')` only matches elements that HAVE the attribute,
  so `getAttribute` cannot return null. It is required anyway, because TS types `getAttribute` as
  `string | null`. Correct as written; noted so nobody "simplifies" it away and breaks the build.
- **[O-4] [SEC] VERIFIED — a hostile cookie cannot reach the DOM as markup.** Traced end to end:
  the cookie is untrusted (any subdomain can write it; the player can hand-edit it) → shared
  `parseTopScore` demands `/^\d+$/` and an integer `> 0`, so anything else becomes `null`
  (`@arcade/shared/dist/highscore.js:135-140`) → `formatScoreLine` emits a string from a *number*
  → written with `textContent` (`tiles.ts:113`). Two independent barriers, and the refresh path
  adds no third way in. Evidence: no `innerHTML` in `src/`; no `document.cookie` in `src/main.ts`
  or `src/shell/tiles.ts`.
- **[O-5] [EDGE] DEFERRED (upstream, pre-existing) — a 23-digit cookie renders a 23-digit score.**
  `arcade-hi-tempest=99999999999999999999999` passes `^\d+$`, and `Number.isInteger(1e23)` is
  `true`, so the tile would read `HI · 100,000,000,000,000,000,000,000`. **Not introduced here** —
  it renders identically on today's build-time read, so it is a pre-existing gap in
  `@arcade/shared/highscore`'s `isPublishableScore`, not a regression in this diff. It is also
  self-inflicted (the player edits their own cookie). Filed as a Delivery Finding against the
  shared library rather than blocking a 2-point story that does not touch it.
- **[O-6] [TEST] LOW — the `persisted` flag in the tests is inert.** `firePageshow(persisted)`
  sets `event.persisted`, but the handler never reads it — it refreshes on ANY `pageshow`. So the
  `true`/`false` argument does not currently discriminate anything, and a future
  `if (!e.persisted) return` would still pass the whole suite. I am **confirming this as correct,
  not a defect**: refreshing on every `pageshow` is strictly a superset of the AC ("verified across
  a BFCache back-navigation"), and it is the simpler code. The flag is worth keeping because it
  documents the case the tests exist for.
- **[O-7] [DOC] VERIFIED — the stale comment that would have misled the next reader is gone.**
  `renderTiles`' old doc claimed "calling this twice — which lb2-3 will" — i.e. it predicted the
  full-grid rebuild AC-2 forbids. `tiles.ts:74-84` now says the opposite and explains why
  (`replaceChildren` would destroy tabbed-to anchors and lb2-9's model bays). The comment and the
  code now agree.
- **[O-8] [RULE] VERIFIED — the exhaustive rule sweep is clean, and I spot-checked its riskiest
  claim.** `reviewer-rule-checker` enumerated 18 rules across 41 instances (13 lang-review checks
  + 5 project rules) and returned **0 violations**. I did not take that on trust: its single
  most load-bearing claim is rule #4 compliance at `tiles.ts:113`, the null-vs-`0` collapse that
  this whole story turns on. Verified independently — `getScore(id)` is handed straight to
  `formatScoreLine` with no `??`/`||` between them, and `refresh-rules.test.ts` greps all of `src/`
  for `(\?\?|\|\|)\s*0\b` and finds nothing. Its rule-#5 exemption (`.js` import extensions) is
  also correct: that rule governs the shared library's shipped ESM, not this bundled app.
- **[O-9] [VERIFIED] AC-2 holds where it counts.** The refresh mutates one text node per tile;
  the `<a>` elements are never recreated, so keyboard focus survives a back-navigation and lb2-9's
  model bays survive with it. Evidence: `tiles.ts:108-114` never calls `replaceChildren`;
  `refresh.test.ts` asserts `===` identity of both the tile and an injected slot child; and Dev
  confirmed the same in a real browser (tile element and injected `<canvas>` both survived a real
  `PageTransitionEvent`).

### Data-flow trace (untrusted input, end to end)

`document.cookie` (untrusted) → `cookieTopScoreTransport.read` (exact-name match, so
`arcade-hi-star-wars` cannot answer a lookup for `star`) → `parseTopScore` (`^\d+$`, integer > 0,
else `null`) → `getTopScore(): number | null` → `refreshScores` (passes it through with **no**
coalescing) → `formatScoreLine` (the sole authority on what `null` looks like) → `textContent`.
The `null` survives the whole way. That is exactly what AC-3 demands, and it is the one thing that
could have gone wrong quietly.

### Devil's Advocate

Let me try to break this. The obvious attack is the cookie, since it is the one input a hostile
party controls: any `*.slabgorb.com` subdomain can write it and the player can hand-edit it. But
markup cannot survive the `^\d+$` gate, and even if it did, `textContent` would render it as inert
text — so XSS is closed twice over. The *interesting* attack is not injection but a **confident
wrong number**, which this codebase rightly treats as worse than no number. I found one live case
(O-5, the 23-digit score), and it is real — but it predates this diff and renders identically
without it, so blocking here would punish the wrong story.

The second angle: what does the refresh *fail* to cover? A player who leaves the lobby open in one
tab, plays in another, and switches back gets no `pageshow` at all — and cookies fire no `storage`
event, so nothing tells the lobby to look again. That tile stays frozen, which is precisely the
complaint this story was raised to fix, just reached by a different route. Dev logged it as a
Question rather than silently widening scope, and I agree with that call: the story names
`pageshow` as the mechanism, no AC mentions multi-tab, and `visibilitychange` is a real design
decision (it fires on every tab switch, so it wants its own think) — not something to smuggle in
under a 2-point bug fix. But it should be said out loud that **lb2-3 does not make the tiles
"always fresh"; it makes them fresh on return-by-navigation.** Anyone reading the epic should know
that.

Third: could the refresh itself be the thing that breaks? It runs on every `pageshow`, including
the ordinary first load, where it re-reads five cookies and rewrites five identical strings —
wasteful but harmless, and buying immunity from having to know which kind of load it was. It is
synchronous, so no races. It is idempotent, so repeated fires cannot double or drift. It holds a
closure over the `#games` element captured at boot; if some future code ever swapped that container
out, the handler would write into a detached node and the refresh would silently die — the same
class of quiet failure as O-2. Nothing does that today, and the tests would catch it if something
started to.

What I could not break: the `null`/`0` collapse, which is the failure this story most invites, is
closed structurally — `null` is never coalesced, and the only code that decides what "no score"
means is a single pure function that both paths call.

**Blocking issues:** none.
**Handoff:** To SM (Grand Admiral Thrawn) for the finish ceremony — PR, merge, archive.
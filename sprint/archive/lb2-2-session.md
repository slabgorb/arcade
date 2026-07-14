---
story_id: "lb2-2"
jira_key: ""
epic: "lb2"
workflow: "tdd"
---
# Story lb2-2: Implement the ADR's cross-origin high-score path so lobby tiles show each game's real best score

## Story Details
- **ID:** lb2-2
- **Jira Key:** (local YAML, no Jira)
- **Workflow:** tdd
- **Stack Parent:** none (stack root)
- **Repos:** arcade-shared (gitflow), lobby (gitflow)
- **Type:** bug
- **Points:** 5
- **Priority:** p2

## Branch Strategy
Both subrepos are gitflow: default branch `develop`, PRs target `develop`, and
`main` is production (never commit to it directly).
- **arcade-shared:** `feat/lb2-2-cross-origin-high-scores` off `develop` — CREATED
- **lobby:** `feat/lb2-2-cross-origin-high-scores` off `develop` — CREATED

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-12T17:54:09Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T16:45:08Z | 2026-07-12T16:48:50Z | 3m 42s |
| red | 2026-07-12T16:48:50Z | 2026-07-12T17:06:22Z | 17m 32s |
| green | 2026-07-12T17:06:22Z | 2026-07-12T17:16:04Z | 9m 42s |
| review | 2026-07-12T17:16:04Z | 2026-07-12T17:31:18Z | 15m 14s |
| green | 2026-07-12T17:31:18Z | 2026-07-12T17:39:09Z | 7m 51s |
| review | 2026-07-12T17:39:09Z | 2026-07-12T17:54:09Z | 15m |
| finish | 2026-07-12T17:54:09Z | - | - |

## Sm Assessment

**Story:** lb2-2 — implement ADR-0004's cross-origin high-score path (5pts, tdd, p2).
**Repos:** `arcade-shared` + `lobby`, both gitflow, both branched to
`feat/lb2-2-cross-origin-high-scores` off `develop`.

**Routing:** phased TDD → next owner is TEA (red phase).

**What TEA needs to know before writing a single test:**
- The design is settled in `docs/adr/0004-cross-origin-high-scores.md` (orchestrator
  root). It is not open for re-litigation; tests encode it, they don't second-guess it.
- The load-bearing AC is the fixture kill: `lobby/tests/storage.test.ts` currently stubs
  ONE shared `localStorage` seeded with the games' keys. That fixture *encodes the bug* —
  it is structurally incapable of failing on it. A red test that reuses it is a fake red.
  The new harness must model TWO SEPARATE STORES (game store, lobby store) plus a cookie
  jar, so cross-origin isolation is real in the test and the cookie is the only bridge.
- Fail-soft is an AC, not a nicety: cookie absent / malformed / evicted /
  `document.cookie` unavailable must each degrade to NO SCORE, never throw.
- Both dev (six localhost ports, no `Domain`) and prod (six subdomains,
  `Domain=slabgorb.com`) must be covered — a fix that works in one and breaks the other
  fails the AC.

**Risk I want visible early:** the lobby's `@arcade/shared` pin jumps v0.4.0 → v0.13.x,
crossing the entire SH2 render epic. The cookie work is small; that pin jump is where
this story will actually bleed. Surface any unrelated SH2-era breakage as a Delivery
Finding rather than absorbing it silently into this story.

**Setup corrections made:** sm-setup mis-read `lobby` as trunk-based (a `repos.yaml`
gap, now fixed) and skipped its branch; branch cut by hand. See Delivery Findings.

## TEA Assessment

**Tests Required:** Yes
**Tests Written:** 80 across 5 files, covering all 7 ACs
**Status:** RED — 55 failing (49 `arcade-shared`, 6 `lobby`). Baseline was fully green
(324 + 63), and **no pre-existing test broke**, so every red is this story's.

**Test Files**
- `arcade-shared/tests/score-cookie.test.ts` (new, 39) — the cookie transport: ADR-0004's exact
  shape in prod vs dev, per-game isolation, and the untrusted-value parse.
- `arcade-shared/tests/highscore-publish.test.ts` (new, 16) — the choke point: save() publishes,
  load() republishes, localStorage stays authoritative, fail-soft, injectable transport.
- `arcade-shared/tests/score-cookie-source-rules.test.ts` (new, 5) — lang-review rules over
  whichever module Dev puts the cookie code in.
- `arcade-shared/tests/purity.test.ts` (edited, +5) — `highscore` reclassified PURE → BROWSER,
  plus a transitive import-closure guard.
- `lobby/tests/storage.test.ts` (rewritten, 15) — two separate stores + a cookie jar.
- Plus `tests/helpers/cookie-jar.ts` in both repos and `tests/helpers/storage-stub.ts` (not tests).

**The two tests that carry the story.** The lobby's `getTopScore` is driven with the game's store
and the lobby's store as *separate objects*, so the origin split is real in the fixture rather than
assumed away: (1) a score published from the game's own origin must reach the tile — today it
returns `null`; (2) a **stale table on the lobby's own origin must lose to the cookie** — today it
returns `1234` instead of `124500`. That second one is the "frozen wrong number" in production,
and the old fixture was structurally incapable of failing on it.

**The fixture that had to die.** The previous suite stubbed ONE `localStorage` seeded with the
games' keys — it modelled a shared store, which is the very thing that is false in production. It
encoded the bug as a fixture and certified a broken feature 63 tests green. ADR-0004 flagged it by
name; it is gone.

**Parse traps pinned to NO SCORE.** The cookie value is untrusted (any of our subdomains can write
it; the user can edit it). Every JS parse trap that yields a *confident wrong number* is asserted to
read as `null`: `Number('') === 0`, `Number('  ') === 0`, `parseInt('9000abc') === 9000`,
`Number('0x1F') === 31`, `Number('1e999') === Infinity`, plus negatives, zero, fractions, a pasted
JSON table, and thousands separators. A tile showing a wrong number is worse than one showing none.

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|---|---|---|
| #1 type-safety escapes | `source — no as any / as unknown as / @ts-ignore` | passing (guard) |
| #2 no loose `Function` type | `source — transport publish/read have real signatures` | passing (guard) |
| #4 `\|\|` vs `??` on falsy-but-valid | `read — hostile values…` (`''`→0, `'0'`, `parseInt` trap) | **failing** |
| #5 ESM `.js` on relative imports | `source — every relative import ends in .js` | passing (guard) |
| #8 test quality (no vacuous asserts) | self-check below; positive control in the purity walker | passing |
| #10 untrusted input validated at the boundary | the 14 `read —` trap cases + `refuses to publish a non-score` | **failing** |
| #11 `catch (e: unknown)` not `any` | `source — never writes catch (e: any)` | passing (guard) |

**Rules checked:** 7 of 13 applicable (the rest are React/async/build concerns with no surface here).

**Self-check — vacuous assertions.** None written; but I am flagging honestly that **21 of the 80
tests currently pass, and some pass for the wrong reason.** Negative assertions ("no cookie was
written", "returns null") are trivially satisfied while the feature does not exist, and the
source-rule guards pass against today's clean `highscore.ts`. They are regression guards, not RED
drivers — they get their teeth the moment Dev implements, and each is paired with a positive test
that fails now. The purity walker carries an explicit positive control (`esc-overlay` → `font.js`)
so it cannot pass by silently traversing nothing. No `let _ =`, no `assert(true)`, no `as any` in
any assertion.

**What Dev must not do:** make the purity guard green by putting `document.cookie` in a side module
and re-listing `highscore` as pure. The transitive closure check now forbids exactly that, and it is
the reason the check exists.

**Handoff:** To Yoda (Dev) for GREEN. Read the two blocking Delivery Findings first — the
`arcade-shared` release must ship a tag before the lobby's six reds can go green at all.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 456/456 passing (GREEN) — `arcade-shared` 389/389, `lobby` 67/67. Both build clean.
**Branches:** `feat/lb2-2-cross-origin-high-scores` in both repos (pushed).

**Files Changed**
- `arcade-shared/src/highscore.ts` — the `TopScoreTransport` seam, the default
  `cookieTopScoreTransport`, `readTopScore`, and the publish wired into `save()` + `load()`.
- `arcade-shared/package.json` — 0.12.1 → **0.13.0**.
- `lobby/src/shell/storage.ts` — `getTopScore` now delegates to `readTopScore`; the
  localStorage read is gone entirely.
- `lobby/tests/main.test.ts` — re-seated onto the cookie (see Design Deviations).
- `lobby/package.json` — pin v0.4.0 → v0.13.0 (currently a SHA; **must become the tag**).

**The design, in one line:** the publish rides inside the factory every game already calls once, so
the four games are fixed without touching a line of their code.

- **Cookie shape** — `arcade-hi-<gameId>=<top>`, `Domain=slabgorb.com`, `Path=/`, `SameSite=Lax`,
  `Max-Age` 400d, `Secure` only over https. On localhost the `Domain` is omitted: cookies ignore the
  port, so a host-only cookie already spans all six dev servers, and `Domain=localhost` is rejected
  outright by some browsers — which would have broken the dev cabinet while prod looked fine.
- **One cookie per game** — no game can clobber a sibling via read-modify-write.
- **Untrusted value** — the cookie is writable by any of our subdomains and editable by the player,
  so the parse demands plain digits (`/^\d+$/`). That kills every trap at once:
  `Number('')===0`, `parseInt('9000abc')===9000`, `Number('0x1F')===31`, `1e999`→`Infinity`. Names
  are matched exactly, so `arcade-hi-star-wars` cannot answer a lookup for `star`.
- **Self-healing** — `load()` republishes from the authoritative table, so an ITP-evicted, cleared,
  or stale cookie is corrected on the player's next visit. The cookie is derived; it can never lose
  a score. localStorage stays the source of truth, unmigrated.
- **Fail-soft** — a throwing transport, a hostile `document`, or a full disk each degrade to NO
  SCORE. The table is written *before* the publish, so a cookie failure can never cost a score.
- **Swappable** — `makeHighScoreStorage(gameId, guard, transport?)`. The single-origin collapse
  ADR-0004 rejected on cost stays one adapter away, and a test proves an injected transport is
  actually used.

**AC-2 verified, not assumed.** I installed v0.13.0 into tempest and battlezone (deliberately
different call shapes — a domain guard vs `isHighScoreRow`) and ran them with their source
**completely untouched**: tempest 773/773, battlezone 789/789, both build. Then I reverted both
pins; no game repo is left dirty. The publish is at the right choke point.

**What is NOT done, and it matters:** the four games still pin v0.11/v0.12, so nothing publishes in
production yet and the tiles will still read NO SCORE. See the two blocking Delivery Findings —
the release ordering (merge → tag → repin) is real work that this story's Repos list does not cover.

**Handoff:** To Obi-Wan (Reviewer).

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

The HIGH is genuinely closed, and I verified it against a **real cookie jar**, not just the mock.

### Subagent Results (round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 471 green (404+67), both builds pass, trees clean/pushed, no leftover probe files; independently confirmed the lobby's installed copy resolves to the fix commit `ce43bb7`, not a stale cache |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — covered by me (jsdom probe + game save()-path audit below) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled — covered by me (the storage-unreachable branch) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled — covered by me + rule-checker #8 |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled — F3 header verified fixed by hand |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled — covered by rule-checker #2/#13 |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled — covered by me (gameId guard vs. the real registry) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled — no complexity concerns on my read |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both LOW) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled specialists returned; 7 disabled and covered directly)
**Total findings:** 2 confirmed (both LOW, test-only), 0 dismissed, 0 deferred

### Round-1 findings — all six closed

| # | Round-1 finding | Status |
|---|---|---|
| F1 [HIGH] | zombie cookie | **FIXED & independently verified** (see below) |
| F2 [MEDIUM] | gameId attribute injection | FIXED — slug guard on both `publish` and `read`; hostile ids write nothing and read `null` |
| F3 [MEDIUM] | lying module header | FIXED — now states two IO surfaces + the browser (not pure) classification |
| F4 [MEDIUM] | no test for the failing direction | FIXED — +15 tests, and Dev **proved they are not vacuous** by re-running them against the pre-fix source (10 red) |
| F5 [LOW] | naive eTLD+1 | FIXED — assumption documented, with why it fails *safe* |
| F6 [LOW] | `as unknown as Storage` ×2 | FIXED — single `as Storage`; rule-checker re-verified each compiles clean in isolation |

### F1 — verified against a REAL cookie jar, not the mock

The fix hinges on a subtlety a mock could easily have papered over: **a browser only deletes a cookie
when the expiring write carries the same `Domain` and `Path` as the original.** So I drove the shipped
transport through **jsdom's real cookie jar (tough-cookie)** on `https://tempest.slabgorb.com`:

- `publish('tempest', 124500)` → `document.cookie` = `arcade-hi-tempest=124500`, readable.
- `publish('tempest', null)` → `document.cookie` = `""`. **Genuinely removed.**
- **Control:** an expiring write that *omits* `Domain` — the naive clear — leaves the cookie **alive at
  999**. Proof that the requirement is real and that building the clear from the same builder (Domain
  included) is load-bearing, not incidental. Dev got the non-obvious part right.

### My own adversarial checks this round

- **[VERIFIED] The new clear cannot destroy a live score.** `save([])` is now destructive where it used
  to be a no-op, so I audited every `save()` call site in all four games: each seeds its table from
  `load()` and saves that same table back (`tempest/src/main.ts:56,115`; `star-wars:65,235`;
  `asteroids:65,121`; `battlezone:110,159`). An empty table therefore only reaches `save()` when the
  board is genuinely empty — and in that case localStorage is emptied too, so clearing the cookie is
  *consistent*, not destructive. No path wipes a cookie while real scores exist.
- **[VERIFIED] The gameId guard does not silently break a tile.** `isValidGameId` is now on the read
  path, so an id failing the regex would make a tile read NO SCORE forever. I tested all five real
  registry ids (`lobby/src/core/registry.ts:27-55`) against `/^[a-z0-9][a-z0-9-]*$/` — `tempest`,
  `star-wars`, `asteroids`, `battlezone`, `red-baron` all pass. The guard is tight but not too tight.
- **[VERIFIED] "Storage unreachable" is correctly distinguished from "empty board"** —
  `src/highscore.ts:404-410` returns early *without* publishing when `getStorage()` is null. Clearing
  there would destroy a good score on no evidence. This is the subtlest branch in the fix and it is
  right, and tested.
- **[VERIFIED] A bogus score cannot be mistaken for absence** — `:278` gates on `score !== null`
  *before* `isPublishableScore`, so `0`/`NaN`/`-1` are declined without touching the cookie. Only an
  explicit `null` clears.

### New findings (round 2) — both LOW, neither blocking

**[LOW] [RULE] F7 — the mock drifted from the interface the fix widened.**
`spyTransport` (`arcade-shared/tests/highscore-publish.test.ts:57,60`) still declares
`publish(gameId, score: number)` and `published: Array<{gameId, score: number}>`, while the real
`TopScoreTransport.publish` now takes `number | null`. TypeScript's method-parameter bivariance
accepts this **silently** — no compile error. Rule #8 ("mock types not matching real implementation
signatures") and rule #13 (fix-introduced drift) both match, so it is confirmed, not dismissed.
Behaviour is unaffected today: no test drives a `null` through an *injected* transport, and the
clear path is fully covered through the cookie transport. Worth a two-line sweep — and ideally one
assertion that `publishTop` routes `null` through an injected transport too, which would make the
mock's contract self-enforcing.

**[LOW] [RULE] F8 — missing `readonly`.** `gamePlayed(..., scores: number[])`
(`lobby/tests/storage.test.ts:58`) is never mutated; every array-carrying function in the production
diff uses `readonly`. Test-only, cosmetic.

**[LOW, out of scope] F9** — `arcade-shared/tests/highscore.test.ts:108` still has an
`as unknown as Storage`. It is the *origin* of the pattern F6 flagged, but the file is not in this
diff (SH-4 era), so it is pre-existing debt rather than an lb2-2 violation. Noted for a future sweep.

### Devil's Advocate (round 2)

Let me try to break the fix.

The obvious attack is the clear itself. A cookie delete is not a delete — it is a write that happens
to expire, and browsers only honour it when `Domain` and `Path` match the original. If Dev had built
the expiring write by hand instead of reusing the builder, the clear would have silently no-opped on
every production subdomain while passing every test against our own mock — a fix that *appears* to
work and leaves the exact zombie it claims to kill. That is the single most likely way this fix could
have been wrong, which is why I refused to accept the mock's word for it and drove the real
tough-cookie jar; the control case (Domain-less clear leaves the cookie at 999) shows the trap is
real, and the code steps around it.

The second attack is that the fix is now *too* eager. Clearing is destructive, and `load()` clears on
corrupt JSON and on an all-rows-malformed table. Could a transient parse blip wipe a good score? It
could wipe the *cookie* — but never the table, and the cookie is rebuilt from the table on the very
next successful load. Meanwhile the game itself is already showing an empty board in that state, so a
tile reading NO SCORE is the *honest* answer, not a regression. The one genuinely dangerous version of
this — clearing when we could not read storage at all — is explicitly excluded, and that exclusion is
the difference between a correct fix and a data-destroying one.

Third: could `save([])` nuke a live score? Only if a game could hand `save()` an empty table while its
real table was non-empty. It cannot: every game saves the same table it loaded. And if a game ever did
save `[]`, it would already be writing `[]` into localStorage — destroying the authoritative scores
independently of any cookie. The cookie mirrors that; it does not cause it.

Fourth: the new `isValidGameId` gate sits on the *read* path, so a bad id means a permanently blank
tile. All five registry ids pass. But note it fails **closed and silently** — no warning. A future game
called `Pac-Man` or `pac_man` would get NO SCORE forever with nothing in the console to say why. That
is a genuinely plausible future trip-hazard, and the cheapest guard is a `console.warn` on rejection.
Not worth blocking a LOW on, but it belongs in the record.

What remains unfixed is not in the code at all: **nothing publishes in production until the four games
are repinned and released.** The diff is correct; the story is not yet delivered.

**Data flow traced:** `save(table)`/`load()` → `topScoreOf` → `publishTop` → `transport.publish(id, number|null)`
→ `buildTopScoreCookie` (set *or* expire, same Domain/Path) → `document.cookie` on `slabgorb.com` →
lobby `getTopScore` → `readTopScore` → slug-gated exact-name lookup → digit-whitelist parse → tile.
Safe against hostile values, hostile ids, **and now absence**.

**Handoff:** To Thrawn (SM) for finish. **Do not close this story on merge alone** — see the two
blocking Delivery Findings: the lobby is on a branch SHA, and the four games still pin v0.11/v0.12, so
the user-visible bug remains live until `arcade-shared` cuts v0.13.0 and the games are repinned.

## Dev Assessment — Rework (round 2, after REJECT)

**Implementation Complete:** Yes
**Tests:** 471/471 green (`arcade-shared` 404/404, `lobby` 67/67). Both build. Trees clean, pushed.
**Branches:** `arcade-shared` ce43bb7, `lobby` ca13483.

All six review findings addressed. **F1 was right, and it was worse than a missed edge case — it was
a design hole**, so I fixed the type, not just the symptom.

**F1 [HIGH] — the zombie cookie.** `TopScoreTransport.publish(gameId, score: number)` could not
*express* absence, so an empty board published nothing rather than clearing, and a stale cookie
outlived the table it derived from. `publish` now takes `number | null`: `null` means "this game has
no score" and **clears**, expiring the cookie on the **same Domain and Path** it was set with (a
browser ignores a clear that does not match — a clear that missed on Domain would look like it worked
and leave the lie in place). `load()` republishes on every path where the table was actually
consulted, so the cookie mirrors the board in **both** directions: it heals a stale cookie upward and
a zombie one downward.

Two distinctions I was careful to keep:
- **Storage unreachable ≠ empty board.** When there is no localStorage (private mode, node) we leave
  the cookie **alone**. Clearing on a failed read would destroy a good published score on the strength
  of no evidence at all. Explicitly tested.
- **A bogus score ≠ "no score".** `0` / `NaN` / `-1` are caller errors and are declined without
  touching the cookie. Only an explicit `null` clears.

**F4 [MEDIUM] — the missing test direction.** +15 tests, covering exactly the mirror case the suite
never had (table evicted / corrupt / all-rows-malformed / `save([])` → cookie cleared; sibling
untouched; storage-unreachable → cookie preserved). **I verified they are not vacuous**: stashed the
source fix and re-ran them against the pre-fix code — **10 went red**, then green again with the fix
restored.

**F2 [MEDIUM] — gameId injection.** `gameId` is interpolated into a cookie string where `;` and `=`
are the delimiters. Now validated as a slug (`/^[a-z0-9][a-z0-9-]*$/`); a hostile id writes nothing
and reads `null`. Tested against `;`-injection, `=`, whitespace, empty, and uppercase — plus a test
that all five real cabinet ids still pass, so the guard isn't so tight it rejects the actual games.

**F3 [MEDIUM] — the lying header.** Rewritten: two IO surfaces (the authoritative localStorage table
and the derived cookie), and the subpath is explicitly **browser, not pure**.

**F5 [LOW]** — documented `registrableDomain`'s single-label-public-suffix assumption and why it
fails *safe* (no cookie → NO SCORE, never a wrong number).
**F6 [LOW]** — both `as unknown as Storage` double-casts replaced with a single `as Storage`
(lang-review #1).

**AC-2 re-verified against the fixed shared:** the transport signature changed, so I re-ran the games
with their source untouched — tempest **773/773**, battlezone **789/789**, both build. Pins reverted;
no game repo left dirty.

**Still outstanding (unchanged, blocking at finish):** the lobby is pinned to a branch SHA and the
four games still pin v0.11/v0.12 — see the blocking Delivery Findings. Nothing publishes in
production until arcade-shared releases a tag and the games are repinned.

**Note for the record:** the `arcade-shared` fix commit (ce43bb7) has a cosmetically damaged message —
two backticked phrases were eaten by shell interpretation. The **code and tree are correct and
verified**; only the prose lost `number | null` and `as unknown as Storage`. Correcting it needs a
force-push to the feature branch, which I did not do without authorization.

**Handoff:** Back to Obi-Wan (Reviewer) for re-review.

## Reviewer Assessment (round 1)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | The cookie is never cleared when the table is empty — a stale score outlives the board it was derived from, so a tile advertises a high score the game itself denies, for up to 400 days. Breaks ADR-0004's "fully derivable from the table" (:38) and "never to a wrong number" (:158), and AC-7's self-heal promise. | `arcade-shared/src/highscore.ts:318-328` (`publishTop` returns on null) + `:227-263` (transport has no delete path) | Give `TopScoreTransport` a way to express *absence* (`publish(gameId, null)` or `clear(gameId)`, writing `Max-Age=0`) and call it when `topScoreOf` returns `null`. Derive the cookie in **both** directions. |
| [MEDIUM] | `gameId` is interpolated into the raw cookie string unvalidated — a `;` injects cookie attributes and corrupts the name/value. Not reachable today (gameId is a developer constant) but this is a shared library's public API. | `arcade-shared/src/highscore.ts:152` + `:208-223` | Validate `gameId` (e.g. `/^[a-z0-9-]+$/`) and no-op on anything else. |
| [MEDIUM] | Module header still claims "Pure shared logic … the persistence seam is the one IO surface (localStorage)". There are now two IO surfaces and the subpath is deliberately browser-classified. Actively misleading, directly above the code that contradicts it. | `arcade-shared/src/highscore.ts:1, 21-24` | Rewrite the header to state the cookie seam and the browser classification. |
| [MEDIUM] | No test covers "table empty + cookie alive → cookie must be cleared". The suite only tests the mirror case, which is why the HIGH shipped. | `arcade-shared/tests/highscore-publish.test.ts` | Add the failing-direction test alongside the F1 fix. |
| [LOW] | `registrableDomain` is a naive last-two-labels eTLD+1 (`co.uk` would be rejected by browsers). Fails safe, correct for `slabgorb.com`. | `arcade-shared/src/highscore.ts:199-206` | Comment the single-registrable-domain assumption. |
| [LOW] `[RULE]` | Two `as unknown as Storage` double-casts; a single `as Storage` compiles clean (reviewer-rule-checker verified empirically by recompiling both repos). Rule #1 names `as unknown as T` as a double-cast bypass. Confirmed, not dismissible — it matches a stated project rule. | `arcade-shared/tests/helpers/storage-stub.ts:24`, `lobby/tests/helpers/cookie-jar.ts:65` | Use a single `as Storage`, as `lobby/tests/main.test.ts:25` already does. |

**Subagent findings incorporated:** `[RULE]` ×2 (reviewer-rule-checker — both confirmed, zero
dismissed; see the LOW row above). reviewer-preflight returned clean (389+67 green, both builds pass,
no debug code, trees clean). The remaining seven specialists are disabled via
`workflow.reviewer_subagents`, so their domains were covered directly by me — the `[HIGH]` and the
`[MEDIUM]` test-coverage finding fall in the disabled edge-hunter / silent-failure / test-analyzer
domains and were found by hand-probing the built code.

**Data flow traced:** game `save(table)` → `topScoreOf` (max of finite rows) → `transport.publish` →
`buildTopScoreCookie` → `document.cookie` on `Domain=slabgorb.com` → lobby `getTopScore` →
`readTopScore` → exact-name cookie lookup → `parseTopScore` (`/^\d+$/` whitelist) → tile.
Safe against hostile *values* at every step; **unsafe against the absence of a value** (F1).

**Pattern observed:** the publish is correctly installed at the one choke point every game already
calls (`makeHighScoreStorage`, `src/highscore.ts:295`), which is what makes the zero-game-code AC
real — verified by running tempest (773/773) and battlezone (789/789) untouched against v0.13.0.

**Error handling:** excellent on throwing paths — bare `catch {}` throughout, and `save()` persists
to localStorage *before* publishing, so a cookie failure can never cost a score. The gap is not an
error path at all: it is a *success* path that declines to act (F1).

**What is good here:** the untrusted-value parsing is genuinely first-rate, the exact-name matching
closes the prefix-collision hole, and the ADR-0003 purity-fence conflict was resolved the honest way
when the easy evasion was available. This is a strong diff with one hole in the middle of it.

**Handoff:** Back to Yoda (Dev) for fixes. F1 and F4 are the required pair — the fix and the test that
proves it. F2/F3 are cheap and should ride along.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 389+67 green, both builds pass, trees clean, no debug code |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — domain covered by Reviewer directly (see F1, F5) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — covered by Reviewer directly (see Rule #11 row) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — covered by Reviewer directly (see F4) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — covered by Reviewer directly (see F3) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — covered by rule-checker #1/#2 |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings — covered by Reviewer directly (see F2) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — no complexity concerns found on my own read |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled specialists returned; 7 disabled via `workflow.reviewer_subagents` and covered directly)
**Total findings:** 6 confirmed, 0 dismissed, 0 deferred

### Rule Compliance (TS lang-review, 13 checks + 3 project rules)

| Rule | Instances | Verdict |
|---|---|---|
| #1 type-safety escapes | 16 | **2 VIOLATIONS** — `as unknown as Storage` double-cast, `arcade-shared/tests/helpers/storage-stub.ts:24` and `lobby/tests/helpers/cookie-jar.ts:65`. Rule #1 names `as unknown as T` explicitly ("double-cast bypass, almost always wrong"); rule-checker verified a single `as Storage` compiles clean in both repos. Not dismissible — it matches a stated rule. |
| #2 generics/interfaces | 9 | Compliant — `TopScoreTransport.publish/read` carry real signatures, no `Function`, `readonly E[]` preserved. |
| #3 enums | 0 | N/A — no enums. |
| #4 `??` vs `\|\|` | 11 | Compliant — `parseTopScore` (`src/highscore.ts:167`) rejects `''` via regex *before* `Number()`, closing `Number('')===0`. `topScoreOf` uses `top === null`, not `!top`, so a real score is never mistreated. |
| #5 ESM `.js` extensions | 6 | Compliant — `src/highscore.ts` adds zero relative imports, so the trap that bit SH2-12 has no surface here. |
| #6 React/JSX | 0 | N/A. |
| #7 async | 1 | Compliant — no new async production code. |
| #8 test quality | 10 | Compliant on casts/mocks/dist-imports — **but see F4**, a real coverage gap the rule can't see. |
| #9 build config | 2 | Compliant — `strict: true` intact in both repos, tsconfigs untouched. |
| #10 untrusted input | 3 | Compliant for the cookie VALUE (whitelist regex) — **but see F2**, the cookie NAME is interpolated unvalidated. |
| #11 error handling | 6 | Compliant — bare `catch {}` (no binding) throughout, stronger than `catch (e: unknown)`. |
| #12 perf/bundle | 3 | Compliant — subpath import, no barrel. |
| #13 fix regressions | 0 | N/A — initial feature diff. |
| P1 arcade-shared ESM rule | 1 | Compliant. |
| P2 fail-soft house rule | 12 | Compliant on every failure path — **except F1, where it degrades to a WRONG NUMBER rather than NO SCORE.** |
| P3 ADR-0003 purity fence | 1 | Compliant, and resolved honestly (reclassified, not evaded) + hardened transitively. |

### Findings

**[HIGH] [EDGE] F1 — The cookie outlives the table it is derived from: a zombie score.**
`publishTop` (`arcade-shared/src/highscore.ts:318-328`) returns early when the top score is `null`,
and `cookieTopScoreTransport` has **no delete path at all**. So the cookie is only ever *written*,
never *cleared*. The self-heal is one-directional.

I proved it against the real code (temporary probe, since removed):
- `load()` with a cookie of `50000` and an **empty table** → the game correctly shows an empty
  board, and the cookie is **still `50000`**.
- `save([])` with a cookie of `50000` → cookie is **still `50000`**.

So: a player's tempest table is lost (quota eviction, ITP, devtools "clear localStorage"), the
cookie survives, and the lobby tile shows **50000 for up to 400 days for a game whose own board is
empty**. The lobby asserts a high score the game itself denies. That is precisely the defect class
this story exists to kill, reintroduced through the back door.

It contradicts the ADR in its own words:
- ADR-0004:38 — "The cookie is a **cache, never a source of truth**: it is **fully derivable from
  the table**." It is not: when the table says "no scores", the cookie is never corrected.
- ADR-0004:158 — "Degrades to `NO SCORE`, **never to a wrong number**." Here it degrades to a wrong
  number.
- Story AC-7 — "a tile **self-heals to the real score** after one visit to that game." It does not
  self-heal to NO SCORE.

**Fix:** give the transport a clear path (e.g. `publish(gameId, null)` or `clear(gameId)`, writing
`Max-Age=0`) and have `publishTop` call it when `topScoreOf` returns `null` — i.e. make the publish
genuinely derive the cookie from the table in *both* directions.

**[MEDIUM] [SEC] F2 — `gameId` is interpolated into the cookie string unvalidated (attribute injection).**
`topScoreCookieName` (`src/highscore.ts:152`) builds `` `arcade-hi-${gameId}` `` and
`buildTopScoreCookie` (`:208`) joins it into a raw `Set-Cookie`-shaped string. A `gameId` containing
`;` or `=` injects cookie attributes. Proven: `makeHighScoreStorage('x; Domain=evil.example', …)`
emitted
`arcade-hi-x; Domain=evil.example=9000; Path=/; SameSite=Lax; Max-Age=34560000; Domain=slabgorb.com; Secure`
and the jar stored `arcade-hi-x` with an **empty value**.

Not exploitable today — `gameId` is a hardcoded constant in each game's `main.ts` and in the lobby's
registry, never user input, and a browser rejects a `Domain` it does not own. But this is the
**public API of a shared library**: nothing in the signature stops a future consumer passing a
dynamic id. Rule #10 names "template literal types that accept arbitrary string interpolation".
**Fix:** validate `gameId` against `/^[a-z0-9-]+$/` (or encode it) and no-op otherwise.

**[MEDIUM] [DOC] F3 — The module header now lies.**
`src/highscore.ts:1` still calls the module "the high-score TABLE logic + **localStorage seam**",
and `:21-24` still says "**Pure shared logic** … The persistence seam is **the one IO surface
(localStorage)**". After this change there are **two** IO surfaces (localStorage *and*
`document.cookie`), and the subpath has been deliberately reclassified as **browser, not pure**. The
header is now actively misleading about the module's single most important new property — and it sits
directly above the code that contradicts it.

**[MEDIUM] [TEST] F4 — The suite cannot fail on F1.**
`highscore-publish.test.ts` covers "cookie evicted + table alive → republished" but there is **no
test for the mirror case**: "table empty/evicted + cookie alive → cookie must be cleared". A grep for
`clear`/`Max-Age=0` in that file returns nothing. That asymmetry is exactly why F1 shipped. TEA's own
file header (line 16) states the invariant — "delete the table and the scores are genuinely gone" —
but never tests the direction that fails. The fix for F1 must land with a test in that direction.

**[LOW] [EDGE] F5 — `registrableDomain` is a naive last-two-labels eTLD+1.**
`src/highscore.ts:199-206` returns `labels.slice(-2).join('.')`. For a multi-part public suffix
(`arcade.slabgorb.co.uk`) that yields `co.uk`, which every browser rejects as a `Domain` — the cookie
would simply not be set. Correct for `slabgorb.com` today and it fails *safe* (no cookie → NO SCORE,
not a wrong number), so this is a latent assumption, not a live bug. Worth a comment stating the
single-registrable-domain assumption rather than a public-suffix-list dependency.

**[LOW] [RULE] F6 — Two `as unknown as Storage` double-casts** (`arcade-shared/tests/helpers/storage-stub.ts:24`,
`lobby/tests/helpers/cookie-jar.ts:65`). Confirmed by rule-checker, which verified a single
`as Storage` compiles cleanly in both repos. Rule #1 forbids the double-cast bypass; the pre-existing
`lobby/tests/main.test.ts:25` already does it correctly with one cast.

### Verified Good

- **[VERIFIED] Untrusted cookie-value parsing is genuinely hardened** — `src/highscore.ts:167-171`
  applies a `/^\d+$/` whitelist *before* `Number()`, so `''`(→0), `'9000abc'`(→parseInt 9000),
  `'0x1F'`(→31) and `'1e999'`(→Infinity) all read as `null`. Complies with rules #4 and #10; 14 trap
  cases assert it.
- **[VERIFIED] Cookie names are matched exactly, not by substring** — `:253-258` compares
  `pair.slice(0, eq).trim() !== wanted`, so `arcade-hi-star-wars` cannot answer a lookup for `star`
  and a lookalike cannot impersonate a real cookie. Satisfies the per-game isolation AC.
- **[VERIFIED] Fail-soft holds on every *throwing* path** — bare `catch {}` (no binding, stronger
  than rule #11's `catch (e: unknown)`) at `:175-181`, `:183-189`, `:233-237`, `:245-249`; and
  `save()` writes localStorage **before** publishing (`:358-370`), so a cookie failure can never cost
  a score. (Note the one non-throwing hole: F1.)
- **[VERIFIED] The purity-fence conflict was resolved honestly, not evaded** — `highscore` was moved
  out of `PURE_SUBPATHS` into `BROWSER_SUBPATHS` and the guard hardened with a transitive
  `importClosure` walker (with a positive control). Complies with ADR-0003's own "classified by its
  dirtiest export" rule. Independently confirmed by rule-checker (#16).
- **[VERIFIED] The zero-game-code AC is real, not asserted** — the third `transport` parameter
  defaults, leaving the games' two-argument call site untouched; Dev ran tempest (773/773) and
  battlezone (789/789) against v0.13.0 with their source unmodified. AC-2 satisfied.
- **[VERIFIED] Dev/prod cookie scoping is correct in both directions** — `buildTopScoreCookie:208-223`
  omits `Domain` on localhost (cookies ignore port, so host-only already spans the six dev servers)
  and adds `Secure` only on `https:`. A fix that worked in one and broke the other would fail the AC;
  this one does not.

### Devil's Advocate

Let me argue this code is broken, because in one important way it is.

The story exists because a tile showed a number the game did not have. The fix replaces the transport
but keeps the failure mode, only rarer and better hidden. The cookie is written on every save and
every load and is **never** deleted. The ADR's central safety claim — that the cookie is "fully
derivable from the table" — is the reason we are allowed to treat it as a disposable cache. But
derivation is a total function: if the table is empty, the derived value is *no score*, and the
implementation simply declines to write that. `publishTop` sees `null` and returns. So the cookie is
derivable from a non-empty table and **frozen** from an empty one. That is not a cache; that is a
write-only log with a 400-day TTL. A malicious user needs no exploit — they only need a browser that
evicts localStorage before it evicts cookies, which is ordinary quota behaviour, and the lobby will
cheerfully advertise a score the game denies. Worse, the player *can't fix it by playing*: visiting
the game calls `load()`, which finds an empty table and publishes nothing, leaving the lie in place.
The one action a user would intuitively take to repair the tile is precisely the action that does
nothing.

What would a confused user misunderstand? A tile reading `HI · 50,000` next to a game whose own
high-score table is blank. They would reasonably conclude the lobby is broken — which is the exact
bug report that opened this epic.

What would a stressed environment produce? Safari purges script-writable storage; the ADR's own
follow-up #1 concedes ITP can delete a game's localStorage table outright. It is not established
that ITP removes the parent-domain cookie in the same sweep, and if it does not, this bug fires on
the ADR's own documented risk path.

And the type system invites it: `TopScoreTransport.publish(gameId, score: number)` cannot *express*
"no score". The interface has no vocabulary for absence, so absence became silence, and silence
became a stale number. The types made the bug shaped like a design.

Everything else here is strong — the parse hardening is genuinely excellent, and the purity-fence
resolution was the honest call where the easy call was available. But the one invariant the ADR
leans its whole safety argument on is the one the code does not keep.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Gap (non-blocking, fixed in-phase) — SM:** `.pennyfarthing/repos.yaml` was missing
  `default_branch: develop` / `branch_strategy: gitflow` on the `lobby` entry (every
  other subrepo has them). sm-setup read the absence as "lobby is trunk-based" and
  skipped its feature branch, which would have put Dev's commits straight onto the
  protected `develop`. Added the two keys and cut `feat/lb2-2-cross-origin-high-scores`
  in lobby by hand. Worth auditing the remaining entries for the same omission.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review — round 2)

- **Improvement** (non-blocking): the `isValidGameId` guard fails **closed and silently**. A future game
  whose id is not a lowercase slug (`Pac-Man`, `pac_man`) would get `NO SCORE` on its tile forever with
  nothing in the console explaining why, because the guard sits on the read path. All five current ids
  pass, so this is a trip-hazard for the next game added, not a live bug. A one-line `console.warn` on
  rejection would turn a silent-forever failure into an obvious one. Affects
  `arcade-shared/src/highscore.ts` (`isValidGameId` call sites). *Found by Reviewer during code review.*

- **Improvement** (non-blocking): the test mock `spyTransport` drifted from the interface the fix
  widened (`publish(gameId, score: number)` vs. the real `number | null`) — TypeScript's method
  bivariance accepts it with no compile error, so nothing caught it. Worth an assertion that
  `publishTop` routes a `null` through an *injected* transport, which would make the mock's contract
  self-enforcing rather than decorative. Affects
  `arcade-shared/tests/highscore-publish.test.ts:57,60`. *Found by Reviewer during code review.*

- **Improvement** (non-blocking, pre-existing): `arcade-shared/tests/highscore.test.ts:108` still
  carries the `as unknown as Storage` double-cast that this story's F6 fixed in two other files — it is
  where the pattern was copied from. Out of scope for lb2-2's diff (SH-4 era file, untouched here), but
  it will keep seeding the same lang-review #1 violation into every helper copied from it.
  Affects `arcade-shared/tests/highscore.test.ts`. *Found by Reviewer during code review.*

### Reviewer (code review)

- **Conflict** (blocking): ADR-0004's own safety invariant is not implementable through the interface
  the story defined. The ADR leans its entire "the cookie is disposable" argument on the cookie being
  "fully derivable from the table" (:38) — but `TopScoreTransport.publish(gameId, score: number)`
  has no way to express *"this game has no score"*, so an empty table publishes nothing instead of
  clearing, and a stale cookie survives its table (finding F1). The missing vocabulary in the type is
  the direct cause of the bug. Affects `arcade-shared/src/highscore.ts` (widen the transport to carry
  absence). Worth the Architect noting that the ADR states the invariant but never says what happens
  when the derived value is *nothing*. *Found by Reviewer during code review.*

- **Improvement** (non-blocking): the ADR's risk table should record that the cookie and the game's
  localStorage table can be purged on **different schedules** (quota eviction is per-origin;
  ITP's sweep is not documented to be atomic across both). The ADR treats "cookie dies, table lives"
  as the only asymmetry and mitigates it with republish-on-load; the reverse asymmetry — "table dies,
  cookie lives" — is unmitigated and is exactly F1. Affects
  `docs/adr/0004-cross-origin-high-scores.md` (§Risks). *Found by Reviewer during code review.*

- **Improvement** (non-blocking): `.pennyfarthing/settings` has 7 of the 9 reviewer subagents disabled
  (`edge_hunter`, `silent_failure_hunter`, `test_analyzer`, `comment_analyzer`, `type_design`,
  `security`, `simplifier`). The HIGH finding on this story came from the edge/silent-failure domain
  and had to be found by hand. Not a defect in this story, but the pipeline is running with most of
  its adversarial coverage switched off, and a thinner reviewer would have rubber-stamped this diff.
  Affects the project's reviewer settings. *Found by Reviewer during code review.*

### Dev (implementation)

- **Gap** (blocking): the lobby is pinned to a BRANCH SHA, not a tag. `lobby/package.json` now reads
  `github:slabgorb/arcade-shared#06dd2e5…` because v0.13.0 does not exist yet — the code is only on
  the feature branch. Order at finish is forced: merge the `arcade-shared` PR to `develop` →
  `just release arcade-shared` (cuts the v0.13.0 tag; library = tag only, no R2 deploy) → repin the
  lobby to `#v0.13.0` → then merge the lobby PR. Shipping the lobby on a SHA would put production on
  a commit that is not on `develop`. Affects `lobby/package.json` (the pin). *Found by Dev during
  implementation.*

- **Gap** (blocking for AC-1, out of this story's Repos): the four games still pin OLD shared
  versions — tempest/star-wars/asteroids `#v0.12.0`, battlezone `#v0.11.0` — so **none of them
  publishes the cookie yet, and every lobby tile will still read NO SCORE in production** until they
  are repinned to ≥ v0.13.0 and released. This story's Repos list is only `arcade-shared, lobby`, so
  the bumps have no home here. The zero-code half of AC-2 is *proven*: tempest (773/773) and
  battlezone (789/789) both pass and build against v0.13.0 with their source completely untouched
  (verified, then reverted — I left no game repo dirty). What remains is purely a release chore.
  Affects `tempest/`, `star-wars/`, `asteroids/`, `battlezone/` (`package.json` pin bump + release).
  **SM: this needs either a follow-up story or an explicit in-finish step, or lb2-2 will be marked
  done while the user-visible bug is still live.** *Found by Dev during implementation.*

- **Improvement** (non-blocking): TEA's fixture kill missed a second copy. `lobby/tests/main.test.ts`
  carried the same bug-encoding fixture (seeding the lobby's own localStorage with a game's table)
  and asserted the behaviour ADR-0004 abolishes. Re-seated onto the cookie, intent preserved — see
  Design Deviations. Worth noting that "the fixture" was plural; a grep for `-high-scores` across a
  repo's tests is the cheap way to catch that next time. Affects `lobby/tests/main.test.ts` (done).
  *Found by Dev during implementation.*

- **Question** (non-blocking, now retired): TEA and SM both flagged the lobby's `v0.4.0 → v0.13.x`
  pin jump — crossing the entire SH2 render epic — as the story's real risk. It surfaced **zero**
  breakage: the lobby is 67/67 green and builds clean on v0.13.0. The risk was real but did not
  materialise; no SH2-era fallout to absorb. Affects `lobby/`. *Found by Dev during implementation.*

### TEA (test design)

- **Conflict** (blocking): ADR-0004 collides with ADR-0003's purity fence and never mentions it.
  ADR-0004 puts `document.cookie` inside `save()`; SH2-2's guard lists `highscore` in `PURE_SUBPATHS`
  and fails any pure subpath that references `document`. Both cannot hold. Because the zero-game-code
  AC forces the default transport inside the factory the games already call, `highscore`'s import
  closure can never be DOM-free — so the fence must yield, not the AC.
  Affects `arcade-shared/tests/purity.test.ts` (highscore reclassified PURE → BROWSER) and
  `docs/adr/0004-cross-origin-high-scores.md` (§Blast Radius should record the consequence).
  **Wants the Architect to ratify**: ADR-0004's blast-radius table claims `arcade-shared`'s cost is
  "publish inside save(); a read; a republish helper; tests" — it omits that the subpath loses its
  DOM-free guarantee. Nothing blocks Dev (the tests encode the resolution), but the ADR is now
  incomplete. *Found by TEA during test design.*

- **Gap** (blocking for Dev's sequencing, not for design): the lobby cannot go green until a
  `@arcade/shared` TAG ships. `lobby` pins `github:slabgorb/arcade-shared#v0.4.0`; the new
  `readTopScore` export will not exist there, so `getTopScore` cannot import it and all six lobby
  reds stay red no matter how correct the lobby code is. Order is forced: implement + build in
  `arcade-shared` → release a tag (≥ v0.13.0) → repin `lobby` → then the lobby's tests can pass.
  Note that a plain `npm install` will NOT re-resolve a changed git ref — force it with
  `npm install @arcade/shared@github:slabgorb/arcade-shared#<ref>`.
  Affects `lobby/package.json` (the pin) and `arcade-shared/package.json` (the version bump, which
  `purity.test.ts` now asserts is past 0.12.1). *Found by TEA during test design.*

- **Question** (non-blocking): the lobby's pin jump is `v0.4.0 → v0.13.x`, crossing the entire SH2
  render epic. The cookie change is small; this upgrade is the story's real risk, and it is
  incidental to the fix (ADR-0004 says so explicitly). If the bump surfaces unrelated SH2-era
  breakage in the lobby, that is NOT lb2-2's defect — log it rather than absorbing it silently, or
  this story's diff becomes unreviewable. Affects `lobby/` broadly. *Found by TEA during test design.*

- **Improvement** (non-blocking): after `getTopScore` switches to the cookie, the lobby's existing
  imports of `highScoreKey` / `isHighScoreRow` from `@arcade/shared/highscore` likely become dead.
  Affects `lobby/src/shell/storage.ts` (drop the unused imports; the file's whole SH-4 header comment
  about reading `localStorage` also goes stale and should be rewritten, not left to mislead).
  *Found by TEA during test design.*

- **Gap** (non-blocking, pre-existing): `red-baron` persists no high scores at all, so its tile will
  read `NO SCORE` forever regardless of this fix. Already recorded as ADR-0004 follow-up #3; the
  lobby suite now pins that expectation explicitly so it cannot be mistaken for an lb2-2 regression.
  Affects `red-baron/` (needs its own story). *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit — round 2)

6. **Dev — Widened `TopScoreTransport.publish` to `number | null`** → ✓ **ACCEPTED**, and this is the
   right instinct. It supersedes TEA's deviation 3, which typed `score: number`. Dev could have
   patched `publishTop` alone and made the symptom go away; instead they fixed the *type*, because an
   interface that cannot express "no score" would have re-opened the same hole for the next transport
   anyone wrote. Derivation is a total function and the type now says so. The interface documents the
   `null`-means-clear contract on itself, which is where a future implementer will actually look.
   The one loose end is that the test mock did not follow the widening — recorded as F7 (LOW).

### Reviewer (audit)

All five logged deviations audited. Verdicts:

1. **TEA — Reclassified `highscore` PURE → BROWSER** → ✓ **ACCEPTED**. The reasoning is sound and
   the conclusion is forced: the zero-game-code AC requires the default transport inside the factory
   the games already call, so the import closure can never be DOM-free. It follows the guard's own
   stated rule ("classified by its dirtiest export", SH2-10/`view`). Independently confirmed by
   reviewer-rule-checker (#16) as the correct, non-evasive resolution. The Architect should still
   ratify the ADR-0003/ADR-0004 collision — the ADR omits this consequence — but the code call is right.
2. **TEA — Added a transitive import-closure check** → ✓ **ACCEPTED**. Technically beyond the ACs,
   but it is what makes deviation 1 honest: without it, `document.cookie` could be hidden in a side
   module and imported into a subpath still labelled "pure", leaving the fence a lie. It carries a
   positive control (`esc-overlay` → `font.js`) so it cannot pass vacuously. Correct scope call.
3. **TEA — Pinned the transport's public API** → ✓ **ACCEPTED**. The ADR mandates a narrow swappable
   interface but names nothing; RED cannot be written against an unnamed contract. The shape
   (default cookie adapter + injectable seam + one lobby-facing read) is what AC-3 actually needs.
   *Caveat now visible:* the interface it chose — `publish(gameId, score: number)` — cannot express
   "no score", and that missing vocabulary is the direct cause of finding **F1**. Accepted, but the
   fix for F1 must widen this interface.
4. **Dev — Re-seated `lobby/tests/main.test.ts`** → ✓ **ACCEPTED**. Dev normally must not move
   goalposts, but this goalpost contradicted the AC: the test seeded the LOBBY's own localStorage
   with a game's table and asserted the tile rendered it — the exact behaviour ADR-0004 abolishes,
   unsatisfiable without reinstating the bug. Only the seeding moved; the assertions and intent are
   unchanged. Correctly logged rather than done quietly.
5. **Dev — Game pins left out of scope** → ✓ **ACCEPTED** as a decision, and **escalated**. Pinning a
   game to an unmerged branch SHA would be worse than the gap. But it means **lb2-2 does not fix the
   user-visible bug on merge** — see the blocking Delivery Findings. SM must not close this story as
   done without the release + repin work.

**No undocumented deviations found.** Every divergence from the ADR/ACs that I could identify in the
diff was already logged by TEA or Dev. F1–F6 are implementation defects, not unlogged deviations.

### Dev (rework, round 2)

- **Widened `TopScoreTransport.publish` to accept `number | null`**
  - Spec source: `.session/lb2-2-session.md` → Reviewer Assessment F1; `docs/adr/0004-cross-origin-high-scores.md`:38, :158
  - Spec text: the cookie "is **fully derivable from the table**"; "Degrades to `NO SCORE`, **never to a wrong number**."
  - Implementation: `publish(gameId, score: number | null)`, where `null` clears the cookie (`Max-Age=0` on the same Domain/Path). `publishTop` now always calls the transport instead of returning early on an empty board. This supersedes TEA's pinned API (deviation 3 above), which typed `score: number`.
  - Rationale: derivation is a total function — the derived value of an empty table is *no score* — and the original interface had no vocabulary to say that, which is precisely how the stale-cookie bug arose. The fix had to be in the type, or the same hole would reopen the next time someone added a transport.
  - Severity: minor (it widens an interface that has not yet shipped in any release; no consumer exists outside this branch)
  - Forward impact: any future `TopScoreTransport` implementation MUST handle a `null` score as "clear", not as a no-op. Documented on the interface itself.

### Dev (implementation)

- **Re-seated `lobby/tests/main.test.ts`, a test TEA did not touch**
  - Spec source: `lobby/tests/main.test.ts:55-64` (pre-existing, from the original lobby epic); `sprint/context/context-story-lb2-2.md` AC-4
  - Spec text: the test seeded the LOBBY's own `localStorage` with `'tempest-high-scores'` and asserted the tile rendered `HI · 149,830`. AC-4 says the fixture that "stubs ONE shared localStorage seeded with the games' keys… must die."
  - Implementation: kept the test and its assertions verbatim; changed only how the score is seeded — the game now publishes `arcade-hi-tempest=149830` to the cookie jar (jsdom, host-only on localhost) instead of a table being planted in the lobby's store. Added cookie cleanup between tests.
  - Rationale: TEA killed the bug-encoding fixture in `storage.test.ts` but this second copy survived in `main.test.ts`, asserting the exact behaviour ADR-0004 abolishes — the lobby reading a game's table from its own origin. It cannot be made green without reinstating the bug. Its real intent (the bootstrap renders a genuine score where one exists and NO SCORE elsewhere) is transport-agnostic, so only the seeding moved. Dev normally does not move goalposts; this goalpost contradicted the AC.
  - Severity: minor
  - Forward impact: none. The test still covers exactly what it covered before — end-to-end wiring of the real bootstrap, registry, and score reader.

- **The 5-point story cannot deliver AC-1 alone: the four games' pins are outside its Repos list**
  - Spec source: `sprint/context/context-story-lb2-2.md`, AC-1 and AC-2; session `**Repos:** arcade-shared, lobby`
  - Spec text: AC-1 — "each tile shows that game's own real best score — verified per game". AC-2 — the games "are fixed by a VERSION BUMP ONLY".
  - Implementation: implemented and verified the publish/read, but did NOT commit the version bumps in `tempest` / `star-wars` / `asteroids` / `battlezone` — those repos are not in this story's scope, and the tag they must point at does not exist until `arcade-shared` merges and releases.
  - Rationale: pinning a game to my unmerged branch SHA would put a non-existent-on-`develop` commit into production. The bumps are a release-ordering step, not a code change. I proved the zero-code claim instead: tempest (773/773) and battlezone (789/789) both pass and build against v0.13.0 with their source untouched, then I reverted their pins.
  - Severity: major
  - Forward impact: **AC-1 is not observable in production until the four games are repinned to ≥ v0.13.0 and released.** Recorded as a blocking Delivery Finding for SM.

### TEA (test design)

- **Reclassified `highscore` from a PURE to a BROWSER subpath in the purity guard**
  - Spec source: `arcade-shared/tests/purity.test.ts` (SH2-2, ADR-0003 Amendment 1); ADR-0004 "Blast Radius"
  - Spec text: ADR-0003's guard asserts "no pure subpath references a DOM global", with `highscore` listed in `PURE_SUBPATHS`. ADR-0004 requires the publish to live "inside `save()`" of `makeHighScoreStorage` and never mentions the fence.
  - Implementation: moved `'highscore'` out of `PURE_SUBPATHS` and into `BROWSER_SUBPATHS`, alongside `view`/`glow`/`audio`.
  - Rationale: forced, not chosen. The AC requires the four shipped games to be fixed by a version bump with **zero code changes**, so the default cookie transport must be wired inside the two-argument factory the games already call. No arrangement exists in which `highscore`'s import closure stays DOM-free *and* the games need no code. The guard's own stated rule — "a subpath is classified by its dirtiest export" (SH2-10, `view`) — then makes reclassification the honest outcome. Per the spec-authority hierarchy, story ACs outrank architecture docs.
  - Severity: major
  - Forward impact: `highscore`'s table logic is no longer policed as DOM-free. Mitigated by the transitive guard below. **Raised to the Architect as a blocking Delivery Finding for ratification** — ADR-0003/ADR-0004 collide here and neither anticipated it.

- **Added a TRANSITIVE import-closure check to the purity guard (beyond lb2-2's ACs)**
  - Spec source: `arcade-shared/tests/purity.test.ts` — the guard's stated purpose
  - Spec text: "any *pure* subpath that leaks a DOM global fails the guard"; "The only honest guarantee that the *delivered artifact* is DOM-free is to read the built dist/*.js as text and grep."
  - Implementation: the guard now follows each pure subpath's relative imports through `dist/` and greps the whole closure, not just the entry file. Includes a positive control (esc-overlay → font.js) so it cannot pass vacuously.
  - Rationale: the single-file grep is a loophole — put `document.cookie` in `src/cookie.ts`, import it from a "pure" subpath, and `dist/<pure>.js` contains no `document` token while dragging the DOM in behind it. That loophole is precisely the tempting way to dodge the reclassification above and keep a green guard while the fence quietly becomes a lie. It was harmless until now only because no pure subpath had any relative imports; lb2-2 is the first story with a motive to add one.
  - Severity: minor
  - Forward impact: closes the evasion permanently. Green today for the remaining pure core (verified: 24/25 purity tests pass; the one red is the version bump).

- **TEA pinned the transport's public API, which no spec named**
  - Spec source: `sprint/context/context-story-lb2-2.md`, AC-3; `docs/adr/0004-cross-origin-high-scores.md` §Decision
  - Spec text: "The publish/read pair lives **inside `@arcade/shared/highscore`**, behind a narrow interface, so the transport is swappable."
  - Implementation: the tests fix the contract as `cookieTopScoreTransport` (the default adapter, `{ publish(gameId, score), read(gameId) }`), `readTopScore(gameId)` (the lobby-facing read), and an optional third `transport` parameter on `makeHighScoreStorage(gameId, validator, transport?)` defaulting to the cookie adapter.
  - Rationale: the ADR mandates a narrow, swappable interface but names nothing, and RED tests cannot be written against an unnamed contract. The optional third parameter is what keeps the games' existing two-argument call site untouched, which is the zero-game-code AC.
  - Severity: minor
  - Forward impact: Dev implements to these names. If Dev prefers different ones, the tests move with them — but the *shape* (default cookie adapter + injectable seam + a single lobby-facing read) is load-bearing for AC-3 and must survive any rename.
---
workflow: architecture
story: lb2-1
epic: lb2
mode: create
stepsCompleted: [1]
output_adr: docs/adr/0004-cross-origin-high-scores.md
---

# Architecture Session: lb2-1 — cross-origin high scores for the lobby

## Decision Question

How does the lobby read each game's best score when the lobby and every game are
**separate origins** in production, and the cabinet has a standing **no-backend**
constraint?

## Inputs Gathered

| Input | Path | Status |
|-------|------|--------|
| PRD / feature brief | — | **Not found.** No `sprint/planning/` existed before this session. The story + epic YAML (`sprint/epic-lb2.yaml`) and `sprint/context/context-story-lb2-1.md` are the brief. |
| Prior ADR — shared code | `docs/adr/0001-shared-code-strategy.md` | Read. Directly load-bearing (see below). |
| Prior ADR — font strategy | `docs/adr/0002-font-strategy.md` | Scanned. Not relevant to this decision. |
| Prior ADR — render surface | `docs/adr/0003-render-surface-extraction.md` | Scanned. Not relevant to this decision. |
| Hosting runbook | `docs/ops/hosting.md` | Read. Defines the origin split and the R2 bucket-per-game layout that constrains every option. |
| Shared contract | `arcade-shared/src/highscore.ts` | Read. The SH-4 module both sides use. |
| Lobby read path | `lobby/src/shell/storage.ts`, `lobby/src/main.ts` | Read. The defect site. |

## The Defect, Precisely

`lobby/src/shell/storage.ts:getTopScore()` calls `localStorage.getItem(highScoreKey(gameId))`.
`makeHighScoreStorage()` in `arcade-shared/src/highscore.ts` writes to the identical key.
**Same key, different origins.** Per `docs/ops/hosting.md`, the lobby is served from
`arcade.slabgorb.com` and each game from `<game>.slabgorb.com` — six separate R2 buckets,
six custom domains, six origins. `localStorage` is partitioned by origin, so the lobby is
reading a store no game has ever written to. Every tile falls through to `NO SCORE`, or to a
stale value left on the lobby's own origin from same-origin dev — the "frozen wrong number."

## Prior-Art Finding: ADR-0001 Half-Saw This

ADR-0001 named the exact symptom — *"the lobby reads each game's `{gameId}-high-scores`
localStorage entry by convention only — no shared type, no test"* — and prescribed the fix:
make the key and row shape a **compile-time contract** the lobby imports. SH-4 shipped that,
correctly. But ADR-0001 diagnosed the problem as **shape drift** when it is actually **origin
scoping**. A shared key that both sides agree on perfectly still reads nothing across an
origin boundary. Its promise — *"the lobby's `NO SCORE` drift risk becomes a compile error"* —
was therefore never redeemable by that mechanism.

**This ADR supersedes that reasoning, not the module.** `@arcade/shared/highscore` is sound
and stays; what must change is the *transport* beneath it.

## Constraints

| Constraint | Source | Hard? |
|------------|--------|-------|
| No backend | CLAUDE.md; `docs/ops/hosting.md` ("No servers, no tunnel, no backend") | Hard — breakable only by explicit, recorded exception |
| Games stay independent repos, standalone-buildable | ADR-0001 decision drivers | Hard |
| Static R2 hosting, one public bucket per app | `docs/ops/hosting.md` | Soft — changeable, but it is the whole deploy pipeline |
| `just serve` dev cabinet must keep working (six localhost ports) | CLAUDE.md | Hard — a fix that works in prod but breaks dev is not a fix |
| Reuse-first: extend `@arcade/shared/highscore`, don't fork it | ADR-0001 scope guard | Hard |

## Premise Correction (spike result, before any option is scored)

The story description — **which I wrote** — asserted that option (c), collapsing to a single
origin, was cheap because *"the vite configs already carry path prefixes (`/tempest/`)."*
**That is false.** Every app is `base: '/'` (verified across all six `vite.config.ts`). The
`/tempest/` claim survives only as a **stale comment** in `tempest/vite.config.ts:4`, left
over from the retired Cloudflare-tunnel era that `docs/ops/hosting.md` records as dead. CLAUDE.md's
dev-URL table (`localhost:5273/tempest/`) is stale for the same reason.

Option (c) is therefore **materially more expensive** than the story claimed: it requires
re-basing six apps, restructuring six R2 buckets into one prefixed bucket (or fronting them
with a router), and rewriting every game's deploy workflow. It is not disqualified — it is the
only option that makes the problem *cease to exist* rather than routing around it — but it must
be scored honestly.

## Stakeholders

- **Decision maker:** the Jedi (Keith) — sole maintainer, and the one who reported the bug.
- **Reviewers:** Obi-Wan (Reviewer) at the ADR review phase.
- **Timeline:** no external deadline. This is a correctness bug on a live site with no users at risk.
- **Budget/resources:** solo dev; Cloudflare free-tier account already provisioned.

## Blast-Radius Inventory (who actually touches high scores today)

| Repo | Role | Uses `@arcade/shared/highscore`? |
|------|------|----------------------------------|
| `lobby` | reader | Yes — `src/shell/storage.ts` |
| `tempest` | writer | Yes |
| `star-wars` | writer | Yes |
| `asteroids` | writer | Yes |
| `battlezone` | writer | Yes |
| `red-baron` | **neither** | **No — writes no high scores at all** |

**Finding (Gap, non-blocking):** red-baron never persists a score. Its lobby tile will read
`NO SCORE` forever regardless of what this ADR decides — the cross-origin fix cannot fix it.
That is a separate story, and it belongs in epic lb2.

## Ready to Continue

Inputs gathered, defect confirmed at the source, one story premise falsified, one gap found.
Next: Step 2 — Context Analysis.

---

# Step 2 — Context Analysis

## Technical Constraints

- **Integration:** the only mandatory touchpoint is `@arcade/shared/highscore`. Both sides of
  the defect already route through it: games write via `makeHighScoreStorage(gameId, guard).save()`,
  the lobby reads via `highScoreKey` + `isHighScoreRow`.
- **Security:** none of consequence. No auth, no PII, no session material. Scores are vanity
  data on a public toy. A forged score is graffiti, not a breach. This *widens* the option set —
  mechanisms that would be unacceptable for credentials are fine here.
- **Performance:** the lobby reads once per tile on load. Six reads. Nothing is hot.
- **Dev/prod parity (hard):** `just serve` runs the cabinet on six *localhost ports*. Port is
  part of an **origin** but not part of a **site**, and cookies ignore port entirely. Any chosen
  mechanism must work in BOTH the port-split dev cabinet and the subdomain-split production one.

## Current Landscape

- **The writer seam is a single choke point.** Each game calls `makeHighScoreStorage(...)` exactly
  once, in `main.ts` (`tempest:18`, `star-wars:29`, `asteroids:29`, `battlezone:101`). The factory
  owns the only `save()` in the cabinet. **Anything installed inside that `save()` reaches all four
  games with zero game-side code.** This is the most valuable structural fact in the survey.
- **Version drift.** The lobby is pinned to `@arcade/shared#v0.4.0`; games are on `v0.11.0`/`v0.12.0`;
  the library is at `0.12.1`. The lobby must cross the whole SH2 render-extraction epic to adopt any
  new API. That upgrade is the single largest cost in this work, and it is *incidental* to the fix.
- **The lobby's test suite encodes the bug as a fixture.** `lobby/tests/storage.test.ts` stubs ONE
  in-memory `localStorage`, seeds it with the games' keys, and exercises "every path it must survive."
  It models a world where lobby and games share a store. Green, thorough-looking, and **structurally
  incapable of failing on the real defect.** Any fix must bring a test that models TWO stores, or the
  suite will keep certifying a broken feature.

## Empirical Findings (the spike — this is what the ACs demanded)

### Finding 1 — the iframe/postMessage bridge is DEAD, and dies silently

Storage partitioning keys on **site** (scheme + eTLD+1), not origin. All six apps are subdomains of
`slabgorb.com`, hence **same-site**. So the natural hypothesis is that a hidden iframe of
`tempest.slabgorb.com` inside the lobby reads the game's real `localStorage`.

- **Chrome (115+, Jul 2023): CONFIRMED.** Same-site ancestor chain ⇒ cross-site ancestor bit never
  set ⇒ identical storage bucket.
- **Firefox (103+): CONFIRMED.** dFPI double-keys on `(origin, top-level site)`; the site component
  collapses to `slabgorb.com` either way ⇒ identical bucket.
- **Safari/WebKit: REFUTED.** WebKit partitions `localStorage` **per-origin, not per-site** —
  contradicting WebKit's own published definition of a site. Open bugs
  [225297](https://bugs.webkit.org/show_bug.cgi?id=225297) (2021) and
  [247565](https://bugs.webkit.org/show_bug.cgi?id=247565) (2022), both still NEW as of Dec 2025.
  WebKit's ITP lead confirms the root cause and calls a per-site fix *"unfeasible without breaking
  existing websites."* Apple is not fixing this.

The failure mode is the disqualifier. On Safari the bridge does not error — the iframe dutifully
reads its own **separate, empty** partition and postMessages back a confident zero. It would pass
every Node-stubbed test we could write and lie to ~15–20% of visitors. **Rejected.**

### Finding 2 — the cookie's one real risk (CDN cache) does not exist

The strongest argument against a `Domain=slabgorb.com` cookie was that it rides on every request to
every subdomain, including static asset fetches from R2, and that this would blow Cloudflare's cache.
**It does not:**

- Cloudflare's **default cache key excludes the `Cookie` request header** (it is listed alongside
  `User-Agent`/`Authorization` as non-varying by default).
- Cache-busting is triggered by **`Set-Cookie` in the origin's RESPONSE** — which a static R2 bucket
  never emits for JS/CSS/PNG.

"Cookies kill your cache" is a truth about *session-emitting application servers*, not about a static
bucket being handed a cookie it never asked for and never echoes. The risk is **≈ zero**.

### Finding 3 — cookies are scoped correctly even in the browser that gets storage wrong

WebKit bug 225297 explicitly records that **cookies DO follow eTLD+1 scoping correctly** in Safari;
it is only `localStorage`/`sessionStorage`/IndexedDB that it mis-partitions. Cookie scoping is
host-suffix-based and was never the target of ITP or storage partitioning. The cookie therefore walks
straight through the exact bug that kills the iframe bridge. `SameSite` is a non-issue (these are
same-site). Size is a non-issue (4096 B/cookie; a top score is ~30 B).

### Finding 4 — single-origin collapse is more expensive than advertised

R2 custom domains are strictly **one hostname : one bucket**. Native path-prefix routing to different
buckets requires Origin Rules' DNS/resolve override, which is **Enterprise-only**. So collapsing means
either (a) one shared bucket with per-game key prefixes and every repo's CI uploading into it, or
(b) a Cloudflare Worker doing path→bucket routing. Plus re-basing six Vite apps off `base: '/'` and
reworking the zone's `index.html` rewrite rule for nested paths. It also dissolves the
one-game/one-bucket/one-CI isolation the whole release runbook is built on.

### Finding 5 — the KV/Worker exception buys exactly one thing

A Worker + KV is the *only* option that yields a **true cross-device global leaderboard** — scores
set on a phone showing up on a laptop. Cookies and single-origin are both same-browser-only, exactly
like today's `localStorage`. If a global leaderboard is not a product goal, breaking the no-backend
constraint buys nothing that a cookie doesn't give for near-zero cost — and it adds an unauthenticated,
trivially-spoofable write endpoint.

## Key Concerns

1. **Silent wrongness beats loud breakage** — the iframe bridge's Safari failure is invisible to
   tests and to us, visible only to users. Weight this above elegance.
2. **The fix must not cost more than the bug** — the lobby's `v0.4.0 → v0.13.x` jump is already the
   dominant cost. An option that also rewrites the deploy topology is disproportionate to "a tile
   shows the wrong number."
3. **Cache vs. source of truth** — whatever the transport, the games' own `localStorage` tables must
   remain authoritative. The lobby-visible value should be a *derived, republishable cache*, so losing
   it degrades a tile to `NO SCORE` and never loses a player's scores.
4. **Cross-device is a feature, not a bug fix** — do not let it smuggle a backend into a bug story.
   If wanted, it is its own decision.

<!-- GATE -->

**Gate answer (Jedi, 2026-07-12):** cross-device is **NOT** wanted; same-browser is fine. This
**definitively rejects the Worker+KV option** — cross-device was the only thing that exception could
buy. The no-backend constraint holds, unbroken.

---

# Step 3 — Pattern Selection

## Technology Version Check

**Nothing to verify — no new technology enters the system.** The mechanism is `document.cookie`,
which predates every game in this cabinet. No framework, no dependency, no library, no service, no
build-step change, no Cloudflare dashboard change. This is itself an argument: the winning option is
the one that adds *zero* new surface area to version, patch, or monitor.

## Pattern 1 (primary) — Private Table + Published Summary

A read-model projection (CQRS at toy scale), and the core of the design.

| | Write model | Read model |
|---|---|---|
| **Owner** | the game | the lobby |
| **Where** | the game's own origin `localStorage`, key `{gameId}-high-scores` | a shared channel readable across subdomains |
| **Shape** | the authoritative 10-row table (`name`, `score`, `level`/`wave`, `date`) | one tiny denormalized summary: the game's top score |
| **Lifecycle** | written on every qualifying score | *derived* — republished from the table |

The decisive property: **the published summary is 100% derivable from the table.** It is a cache, never
a source of truth. Therefore:

- Losing it can never lose a player's scores — it degrades a tile to `NO SCORE`, nothing more.
- It can be **republished on every game load**, straight from the table, healing itself.
- It is safe to put in a medium with weaker durability guarantees than `localStorage` (which matters —
  see the Safari cookie-lifetime risk below).

This also fixes the *frozen* half of the bug for free: the lobby reads a channel that is genuinely
re-read, rather than a store nobody writes.

**Why not simply mirror the whole table into the shared channel?** Because the lobby renders exactly
one number per tile (`HI SCORE {n}` — `lobby/src/main.ts:34`). Publishing 10 rows × 6 games to satisfy
a UI that displays 6 integers is unjustified, and a 4 KB cookie cap makes it needlessly tight. Publish
the projection the consumer actually consumes.

## Pattern 2 (primary) — Transport Behind a Port (ports & adapters)

The *channel* is an adapter behind a narrow interface inside `@arcade/shared/highscore`. Games and the
lobby speak to the port; only the adapter knows it is a cookie.

This matters because **this ADR rejects single-origin collapse on COST, not on merit.** Collapse is the
only option that makes the bug class cease to exist rather than routing around it. If that cost ever
changes — a plan upgrade, a decision to consolidate buckets for unrelated reasons — the adapter becomes
plain same-origin `localStorage` and *nothing else in the cabinet changes*. Likewise, if cross-device
is ever wanted, the adapter becomes a `fetch`. The port keeps a rejected option cheap to revisit, which
is the honest way to reject an option you respect.

## Pattern 3 (supporting) — Fail-Soft, House Style

Already the established discipline in `arcade-shared/src/highscore.ts` and `lobby/src/shell/storage.ts`:
every failure mode (absent, corrupt, unavailable, throwing, quota-exceeded) degrades to `null`/`[]` and
**never throws, never blocks the page.** The new channel inherits this line without exception, and adds
its own modes to it: cookie absent, cookie malformed, cookie evicted, `document.cookie` unavailable.
A tile that cannot read a score shows `NO SCORE`. It does not show `0`, does not flicker, does not throw.

## Rejected Patterns

| Pattern | Why rejected |
|---|---|
| **Hidden-iframe + postMessage bridge** | Silently returns empty data on Safari (WebKit partitions `localStorage` per-origin; bugs 225297/247565, open, WONTFIX in effect). Fails invisibly to users while passing every test we could write. Disqualified on failure mode. |
| **Single shared origin (path prefixes)** | Correct, and the only permanent cure — but requires re-basing 6 Vite apps, restructuring 6 R2 buckets (native path→bucket routing is Enterprise-only), rewriting 6 deploy workflows, and dissolving the one-game/one-bucket/one-CI isolation the release runbook is built on. Disproportionate to "a tile shows the wrong number." **Kept cheap to revisit via Pattern 2.** |
| **Worker + KV score service** | Buys exactly one thing — a cross-device leaderboard — which the Jedi has explicitly declined. Breaks the no-backend constraint for zero gain, and adds an unauthenticated, spoofable write endpoint. |
| **`document.domain` relaxation** | Immutable in Chrome 115+ (origin-keyed agent clusters). Dead. |
| **Shared Storage API** | Chrome-only, read-gated inside a worklet (cannot return a raw value to render), and being removed in Chrome 150. Dead. |
| **BroadcastChannel** | Origin-scoped, not site-scoped — cannot cross the subdomain boundary. Also a live-signal bus, not persistence. |

<!-- GATE -->


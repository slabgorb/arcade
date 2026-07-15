# ADR-0004: Cross-origin high scores — the lobby reads a cookie, not localStorage

**Status:** Accepted
**Date:** 2026-07-12
**Author:** Architect
**Story:** lb2-1
**Amended:** 2026-07-15 (lb2-8) — the published summary now carries a **top-five list of
name+score rows**, not a single number, so the lobby can draw a HIGH SCORES ladder. Same cookie,
same scoping, same self-healing derivation; only the value *format* widens. See
[Amendment — lb2-8](#amendment--lb2-8-the-summary-carries-a-top-five-ladder-not-a-single-number).

## Context

The lobby's tiles show the wrong high score, or none, and never update. The cause is not a
typo — it is origin scoping.

`lobby/src/shell/storage.ts` reads `localStorage.getItem(highScoreKey(gameId))`. Each game
writes that exact key via `makeHighScoreStorage()` in `@arcade/shared/highscore`. **Same key,
different origins:** the lobby is served from `arcade.slabgorb.com`, each game from
`<game>.slabgorb.com` (six R2 buckets, six custom domains — `docs/ops/hosting.md`).
`localStorage` is partitioned by origin, so the lobby reads a store no game has ever written.
Tiles fall through to `NO SCORE`, or to a stale value left on the lobby's own origin during
same-origin dev — the "frozen wrong number."

**ADR-0001 half-saw this.** It named the symptom ("the lobby reads each game's
`{gameId}-high-scores` entry by convention only") and prescribed a compile-time shared
contract. SH-4 shipped that contract correctly. But the disease was never *shape drift*; it is
*origin scoping*, and a perfectly-agreed key still reads nothing across an origin boundary.
ADR-0001's promise that the lobby's `NO SCORE` risk "becomes a compile error" was never
redeemable by that mechanism. **This ADR supersedes that reasoning, not the module** —
`@arcade/shared/highscore` is sound and stays; the transport beneath it changes.

Constraint: **no backend** (CLAUDE.md; `docs/ops/hosting.md`: "No servers, no tunnel, no backend").

## Decision

**Games publish their top score to a cookie on the shared parent domain; the lobby reads it.**

The game's own `localStorage` table remains the **authoritative source of truth**, untouched and
unmigrated. On top of it, `save()` additionally publishes a small **derived summary** — the top
score — to a cookie scoped to the registrable domain (`Domain=slabgorb.com`), which every
subdomain can read. The cookie is a **cache, never a source of truth**: it is fully derivable
from the table and is republished on every game load, so it heals itself and can never lose a
player's scores.

The publish/read pair lives **inside `@arcade/shared/highscore`**, behind a narrow interface, so
the transport is swappable (see Consequences).

### Why a cookie works where localStorage doesn't

Cookie scoping is **host-suffix-based** — a cookie set with `Domain=slabgorb.com` is readable via
`document.cookie` on every subdomain. It was never the target of ITP, Total Cookie Protection, or
storage partitioning, all of which restrict *third-party/cross-site* state. Our subdomains are
**same-site** (one registrable domain), so `SameSite` is a non-issue and no partitioning applies.
Size is a non-issue: the cap is 4096 B per cookie; a top score is ~30 B.

### Shape

```
arcade-hi-<gameId> = <top score>      # e.g. arcade-hi-tempest=124500
Domain=slabgorb.com  Path=/  SameSite=Lax  Max-Age=<400d>  [Secure when https]
```

One cookie **per game**, not one combined cookie: each game writes only its own key, so no game
can clobber a sibling's value via read-modify-write. In dev (`just serve`, six *localhost ports*),
the `Domain` attribute is omitted — cookies ignore port, so a host-only `localhost` cookie is
already shared across all six ports. The same mechanism therefore works in dev and prod.

## Considered Options

### Rejected: hidden-iframe + postMessage bridge

The lobby embeds each game's origin in a hidden iframe, which reads its own `localStorage` and
postMessages the score back.

Storage partitioning keys on **site** (scheme + eTLD+1), not origin — and all six apps are
subdomains of `slabgorb.com`, hence same-site. So this *should* work, and in **Chrome (115+)** and
**Firefox (103+)** it does: the iframe reads the identical, unpartitioned bucket the game wrote.

**Safari refutes it.** WebKit partitions `localStorage` **per-origin, not per-site** —
contradicting WebKit's own published definition of a site. Open bugs
[225297](https://bugs.webkit.org/show_bug.cgi?id=225297) (2021) and
[247565](https://bugs.webkit.org/show_bug.cgi?id=247565) (2022) are both still open; WebKit's ITP
lead confirms the cause and calls a per-site fix *"unfeasible without breaking existing websites."*

**Rejected on failure mode, not elegance.** On Safari the bridge does not error — the iframe reads
its own separate, *empty* partition and postMessages back a confident zero. It would pass every
Node-stubbed test we could write and silently lie to ~15–20% of visitors. The same bug report
records that **cookies are scoped correctly by eTLD+1 even in Safari** — the cookie walks straight
through the bug that kills the bridge.

### Rejected: collapse the cabinet onto one origin

Serve everything under `arcade.slabgorb.com/<game>/` so all storage is same-origin and the bug
class ceases to exist.

This is the only **permanent cure**, and it is rejected on **cost, not merit**:

- R2 custom domains are strictly **one hostname : one bucket**. Native path→bucket routing needs
  Origin Rules' DNS/resolve override, which is **Enterprise-only**. So it means either one shared
  bucket with every repo's CI uploading into key prefixes, or a Cloudflare Worker router.
- All six Vite apps must be re-based off `base: '/'`, and the zone's `index.html` rewrite rule
  reworked for nested paths.
- It dissolves the one-game/one-bucket/one-CI isolation the entire release runbook rests on.

Disproportionate to "a tile shows the wrong number." **Kept cheap to revisit:** because the
transport sits behind an interface, collapsing later swaps one adapter for plain `localStorage`
and changes nothing else.

> **Correction to the story's premise.** lb2-1 claimed this option was cheap because "the vite
> configs already carry `/tempest/` path prefixes." **They do not** — all six apps are `base: '/'`.
> That claim survived only as a stale comment in `tempest/vite.config.ts:4` from the retired
> Cloudflare-tunnel era, and CLAUDE.md's dev-URL table is stale for the same reason.

### Rejected: Cloudflare Worker + KV score service

The only option that yields a **cross-device** leaderboard (a score set on a phone appearing on a
laptop) — and the only one immune to Safari's ITP purge, since state lives server-side.

The Jedi explicitly declined cross-device (2026-07-12): same-browser is fine, which is what
`localStorage` already gives. The exception to the no-backend constraint would therefore buy
**nothing**, while adding a deployable surface and an unauthenticated, trivially-spoofable write
endpoint. **Rejected.** If a global leaderboard is ever wanted, it is its own decision, not a bug fix.

### Rejected: `document.domain`, Shared Storage, BroadcastChannel

`document.domain` is immutable in Chrome 115+ (origin-keyed agent clusters) — dead. Shared Storage
is Chrome-only, read-gated inside a worklet (cannot return a raw value to render), and slated for
removal in Chrome 150 — dead. `BroadcastChannel` is origin-scoped, not site-scoped, so it cannot
cross the boundary, and is a live-signal bus rather than persistence.

## Blast Radius

The writer side is a **single choke point**: every game calls `makeHighScoreStorage(gameId, guard)`
exactly once in `main.ts`, and that factory owns the only `save()` in the cabinet. Installing the
publish step *inside* `save()` reaches all four games with **zero game-side code**.

| Repo | Change | Cost |
|------|--------|------|
| `arcade-shared` | Publish inside `save()`; add a read for the lobby; republish-on-load helper; tests | The real work. Then release a tag. |
| `lobby` | `getTopScore()` reads the cookie instead of `localStorage`; re-read on return (lb2-3) | Small — **but** the pin jumps `v0.4.0 → v0.13.x`, crossing the entire SH2 render epic. **This upgrade is the single largest cost, and it is incidental to the fix.** |
| `tempest`, `star-wars`, `asteroids`, `battlezone` | **Version bump only. No code.** | Trivial |
| `red-baron` | None — it writes no high scores at all (see Follow-ups) | — |
| `docs/ops/hosting.md`, R2 buckets, DNS, CI | **Unchanged.** | Zero |

**No-backend constraint: KEPT.** No new service, dependency, framework, or Cloudflare config.

## Migration

**None required.** Existing per-game `localStorage` tables stay exactly where they are and remain
authoritative — nothing is moved, rewritten, or abandoned. The cookie is derived, so on the
player's next visit to a game, `save()`/republish-on-load emits it from the table already on disk.

Until that first visit, a tile reads `NO SCORE` — the honest answer, since the lobby genuinely has
nothing to show yet. **Self-healing after one visit per game.** No migration code, no data loss,
no flag day.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Safari ITP purges script-writable storage after 7 days without *user interaction*** | The cookie is deleted; the tile reverts to `NO SCORE` | Interaction resets the clock — and the arcade's core loop **is a click** (you click a tile to launch a game). Note a script write does **not** count, so "lobby touches the cookie on load" is *not* a valid mitigation on its own. Degrades to `NO SCORE`, never to a wrong number. |
| **Is ITP's interaction clock per-hostname or per-registrable-domain?** | If per-hostname, each game needs its own click every 7 days | **UNRESOLVED — no primary source.** WebKit's written policy implies per-registrable-domain (which would make this a non-issue), but its localStorage partitioning already contradicts its own policy. **Requires an empirical Safari test** — see Follow-ups. |
| ITP 2.3 caps cookies to **24 hours** when a page is reached via tracker-style link decoration (`?fbclid=`…) | Cookie dies fast | Do not pass query-string decorations on lobby→game navigation. Cheap to honour; the tiles link to bare origins today. |
| Non-`HttpOnly` cookie is script-writable by any of our own subdomains | A forged score | Accepted. No auth, no PII, no session material — a forged score is graffiti on a toy, not a breach. |
| The lobby's tests can't catch the bug class | A green suite certifying a broken feature | `lobby/tests/storage.test.ts` stubs **one** in-memory `localStorage` and seeds it with the games' keys — it models a world where lobby and games share a store, i.e. it encodes the bug as a fixture. **lb2-2 must test against two separate stores / a cookie jar**, or it will keep certifying nothing. |

## Consequences

### Positive

- Four games get fixed by a **version bump with zero code changes**.
- No new infrastructure, dependency, service, or Cloudflare change. The no-backend rule holds.
- Works identically in the dev cabinet (six localhost ports) and production (six subdomains).
- Scores can never be lost by this mechanism — the cookie is derived and self-healing.
- The single-origin option, rejected on cost, stays **one adapter swap away** if that cost changes.

### Negative

- Same-browser only — no cross-device. (Unchanged from today; explicitly accepted.)
- The cookie rides on every request to every subdomain. Verified harmless: Cloudflare's default
  cache key **excludes** the `Cookie` request header, and cache-busting is triggered by `Set-Cookie`
  in a *response*, which a static R2 bucket never emits. "Cookies kill your cache" is a fact about
  session-emitting app servers, not static buckets.
- One more thing to keep in sync — mitigated by it living in shared code, not copied per game.

## Follow-ups (new stories for epic lb2)

1. **Safari eats the games' own high scores.** ITP's 7-day purge of script-writable storage covers
   `localStorage` too — universally since Safari 13.1, **not just for sites classified as trackers**.
   A player who doesn't return to `tempest.slabgorb.com` (with a real click) within 7 days can have
   their Tempest table **deleted outright**. This is a **pre-existing production bug, independent of
   this ADR and of the lobby**, and no local-storage option (cookie or single-origin) escapes it.
   Needs its own story.
2. **Empirically test ITP's interaction bookkeeping** (per-hostname vs per-eTLD+1) in real Safari.
   This decides how severe (1) actually is.
3. **red-baron persists no high scores at all.** Its tile will read `NO SCORE` forever regardless of
   this ADR.

## Amendment — lb2-8: the summary carries a top-five ladder, not a single number

**Story:** lb2-8 · **Date:** 2026-07-15

### Context

The lobby's new HIGH SCORES board draws a **five-row ladder** — each row a player's **initials
and score**. The summary shipped by this ADR carries a single bare integer
(`arcade-hi-tempest=124500`): enough for a tile, but it physically **cannot carry a name**, and a
board built on it could only fabricate initials. Fabricating them would be the cabinet lying about
who holds a record — the exact failure the honest `NO SCORE` state exists to prevent.

### Decision

**Widen the one published summary cookie from a number to a top-N list of name+score rows.** The
authoritative `localStorage` table is untouched; `save()` still publishes a *derived*, disposable,
self-healing summary — it just derives **rows** now instead of one number, sorted highest-first and
capped at `PUBLISHED_SUMMARY_DEPTH = 5`.

```
arcade-hi-<gameId> = <NAME:SCORE,NAME:SCORE,…>   # e.g. arcade-hi-tempest=JPX:149830,AAA:98000
Domain=slabgorb.com  Path=/  SameSite=Lax  Max-Age=<400d>  [Secure when https]
```

**Same cookie name, same attributes, same scoping, same one-per-game isolation** — only the value
*format* changes. Every cross-origin property this ADR established (host-suffix scoping, Safari
survival, `SameSite`, dev/prod parity, republish-on-load, clear-on-empty) is unaffected: they are
properties of the cookie's *name and attributes*, not its value.

### Size against the 4096 B cap — not remotely the binding constraint

A row is `NAME:SCORE` — a 3-char arcade name plus up to a 7-digit score is ~11 B; five of them
with four commas is **≈ 59 B**. Even pathological names stay **< 200 B**. Against the **4096 B**
per-cookie cap that is under **5%** — the ladder is ~2× the old single number and still negligible.
The per-request overhead the original ADR analysed (static R2 buckets do not cache-bust on the
`Cookie` header) is unchanged. **Size was never the reason to hesitate; correctness was.**

### Why widening beats the alternatives

- **A second, parallel "rows" cookie** (keep `arcade-hi-<id>` as the number, add
  `arcade-hi-<id>-rows`). *Rejected.* It duplicates derived state this codebase deliberately treats
  as disposable, doubles the per-request cookie weight, and creates two artifacts that can **drift
  out of sync** (a number cookie and a rows cookie that disagree). The single top score is trivially
  `rows[0].score`, so a second cookie carries **no information the rows cookie doesn't** — it is pure
  redundancy. AC-1 says "rather than a single number," not "in addition to."
- **A backend/KV service** to carry the richer payload. *Still rejected*, for the same reasons the
  original ADR rejected it: the no-backend constraint holds, no cross-device requirement exists, and
  it would add a spoofable write endpoint. Widening a cookie needs **zero new infrastructure**.
- **Leave it a number; fabricate names on the board.** *Rejected* — it violates the house fail-soft
  rule (AC-4). An invented initials row is the cabinet lying; the board's honest empty state
  (`NO SCORES YET`) is the correct answer when there are no real names to show.

### Back-compat — the tile never regresses mid-rollout

`readTopScore(gameId): number | null` — the tile's original contract — is preserved. It derives the
top score from **row 0** of the widened summary **and still parses a legacy bare-number cookie**, so
tiles keep working during the window before each game is redeployed on the widened library. A legacy
bare-number cookie yields **no rows** for the board (it carries no names), so the board honestly
shows `NO SCORES YET` for that game until it republishes — never an invented ladder.

### Security — names are the new untrusted input

`gameId` was already slug-guarded; **names are new untrusted input** and land in a value where
`; = , :` are structural. Names are therefore **sanitized** (those delimiters stripped) on publish
and re-validated on read, so a hostile name cannot inject a cookie attribute, a second cookie, or an
extra row. Poisoned rows (an `Infinity`/`1e999` score, a non-string name) are dropped at the
derivation boundary. A forged score remains graffiti on a toy, per the original risk table.

### Swappability preserved

The publish/read pair still lives inside `@arcade/shared/highscore` behind the `TopScoreTransport`
interface — which now carries `TopScoreRow[]` instead of `number | null`. The single-origin collapse
this ADR rejected on cost stays **one adapter swap away**.

### Blast radius

| Repo | Change | Cost |
|------|--------|------|
| `arcade-shared` | Widen the summary to rows (`readTopScores`, `PUBLISHED_SUMMARY_DEPTH`, rows transport); keep `readTopScore` for the tile + legacy. Release a tag. | The real work. |
| `lobby` | `getTopScores()` + the rotating board; repin to the new tag. | Moderate. |
| `tempest`, `star-wars`, `asteroids`, `battlezone` | **Version bump only. No code** — the choke point at `save()` still publishes with no game-side change. | Trivial |
| `red-baron` | None — persists no scores; its board slot reads `NO SCORES YET`. | — |

## Related Decisions

- **ADR-0001** — establishes `@arcade/shared` and the git-tag pinning this fix rides on. Its
  *diagnosis* of the lobby contract (shape drift) is superseded here; its *decision* stands.

---

*Adapted from the Pennyfarthing architecture-decision template.*

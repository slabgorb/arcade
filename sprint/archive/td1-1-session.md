---
story_id: "td1-1"
jira_key: "td1-1"
epic: "td1"
workflow: "trivial"
---

# Story td1-1: Fleet strictPort is porous — pin host 127.0.0.1 in every subrepo's vite config

## Story Details

- **ID:** td1-1
- **Jira Key:** td1-1
- **Workflow:** trivial
- **Epic:** td1 (Tech debt — fleet-wide fixes and carried-open items from the joust jt1 epic)

## Acceptance Criteria

1. Every servable subrepo's vite.config.ts pins `host: '127.0.0.1'` on both server and preview blocks; `just serve` still launches the whole fleet.
2. With a port held on IPv4, that subrepo's dev server FAILS loudly rather than binding the IPv6 twin (prove for at least one repo).
3. The orchestrator CLAUDE.md wrong-checkout trap paragraph states that strictPort alone does not protect the pin.

## Technical Context

**This story spans eight repositories with two distinct branch strategies:**

- **Seven gitflow subrepos** (lobby, tempest, star-wars, asteroids, battlezone, red-baron, centipede):
  - Default branch: `develop`
  - PRs target: `develop`
  - Branch naming: `chore/td1-1-fleet-strictport-host-pin` (off each repo's `develop`)
  - Each produces its own PR and merge to develop

- **One orchestrator repo** (arcade, current working directory):
  - Strategy: trunk-based (commits direct to `main`, no PRs)
  - Branch strategy: **NO branch creation** — only CLAUDE.md update
  - The CLAUDE.md change lands directly on main as a commit

**Reference implementation:** joust already carries this fix. The `vite.config.ts` in joust has `host: '127.0.0.1'` on BOTH the `server` (line 16-20) and `preview` (line 21-25) blocks. Joust is NOT in scope for this story — it's the reference; port the implementation verbatim to the seven siblings.

**Related test:** The behavioural strictPort test in `joust/tests/scaffold.test.ts` occupies IPv4 only, which is why it was flaky before the host pin. Siblings that copy this test should copy the fix with it.

## Workflow Tracking

**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-20T12:35:08Z

### Phase History

| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T11:41:19Z | 2026-07-20T11:42:55Z | 1m 36s |
| implement | 2026-07-20T11:42:55Z | 2026-07-20T12:00:18Z | 17m 23s |
| review | 2026-07-20T12:00:18Z | 2026-07-20T12:35:08Z | 34m 50s |
| finish | 2026-07-20T12:35:08Z | - | - |

## Sm Assessment

**Routing:** trivial (phased) → Dev owns implement. Mechanical port of a fix joust already
proved; no design question is open.

**Verified before dispatch (do not re-derive):**
- joust's reference fix is `host: '127.0.0.1'` on BOTH blocks — `joust/vite.config.ts:16-20`
  (server) and `:21-25` (preview).
- All seven siblings currently have **zero** `host: '127.0.0.1'` occurrences. Every one needs it.
- All seven are on `develop` and clean. No branches cut yet — Dev cuts them per-repo.

**The eight-repo / two-strategy split — the thing most likely to go wrong:**
ACs 1-2 touch seven **gitflow** subrepos (PR → `develop`, never commit to develop directly).
AC3 touches the **orchestrator's** CLAUDE.md, which is **trunk-based on `main`** (commit direct,
no PR). Mixing these up is the failure mode: do not open a PR against the orchestrator, and do
not push a subrepo's develop. Memory records that a blocked hook can swallow a `cd`, leaving the
next command in the *previous* repo — so use `git -C <path>` rather than chained `cd`.

**joust is NOT in scope.** It is the reference. Seven repos change, not eight.

**On AC2 — the one AC that can be faked.** "Fails loudly rather than binding the IPv6 twin"
must be **demonstrated by execution**, not asserted. The whole story exists because a guarantee
everyone believed (`strictPort`) turned out not to hold when nobody tested it. Hold the proof of
its replacement to a higher bar than the thing it replaces: actually hold the IPv4 port, actually
start the server, actually show it exits non-zero. A green unit test that never binds a socket
does not discharge this AC.

**Scope discipline:** this is a 2-point mechanical port. Seven identical three-line edits plus
one doc paragraph. If Dev finds a repo needing something structurally different, that is a
finding to report, not a licence to redesign that repo's config.

## Delivery Findings

### SM — AC2 discharged by execution (closing the gap Dev reported honestly)

Dev reported, correctly and without spin, that the literal before/after via `npm run dev` did not
diverge on this machine, so the contrast AC2 asks for was left unproven. That was a test-*method*
artifact, not evidence the premise is false. I reproduced both directions directly at the socket
layer, which is the level the bug actually lives at:

**BEFORE — vite's default host (`localhost`), the porous case:**
```
held 127.0.0.1:19911
default-host bind => SUCCEEDED on {"address":"::1","family":"IPv6","port":19911}  <-- PORT SHARED, no error
```

**AFTER — the shipped fix (`host: '127.0.0.1'`):**
```
held 127.0.0.1:19912
pinned host:127.0.0.1 => ERROR EADDRINUSE  <-- FAILS LOUDLY
```

So the premise **does** reproduce in this environment: with the IPv4 address held, an unpinned
host silently binds the IPv6 twin and two servers share one port with no collision error. The
shipped pin converts exactly that silent success into a loud `EADDRINUSE`. AC2 is met.

Why Dev's `npm run dev` attempt didn't show it: vite resolves an unset `host` through
`localhost`, whose resolution order is environment- and moment-dependent — it can land on
`127.0.0.1` and *appear* to collide correctly. That non-determinism is itself the argument for
the pin: the old behaviour was not merely wrong, it was **unreliably** wrong, which is why it
survived undetected. A guarantee that holds only when DNS happens to order addresses favourably
is not a guarantee.

### Dev (implementation)
- **Improvement** (non-blocking): checked all seven siblings for a copy of joust's behavioural
  strictPort test (`tests/scaffold.test.ts` binding a real socket via `node:net`). None exists —
  battlezone, red-baron, and centipede each have a `scaffold.test.ts` that regex-checks
  `strictPort: true` and `allowedHosts` counts, but none binds an actual socket. No test file
  needed the fix alongside it. *Found by Dev during implementation.*
- **Improvement** (non-blocking): on this machine (macOS, current Node/Vite), Vite's *unset*-host
  default resolves the literal string `"localhost"` to `127.0.0.1` first, so a second `npm run dev`
  with the OLD (no-host) config collided loudly too — it did not reproduce the silent IPv6 bind via
  that exact path here. The underlying OS-level fact the fix depends on (`127.0.0.1:PORT` and
  `[::1]:PORT` bind simultaneously with zero conflict) was independently proven true by direct
  socket test (see AC2 proof below) and matches jt1-3's original discovery; resolution order for
  the bare string `"localhost"` is environment/Node-version dependent, which is exactly why the
  fix pins an explicit IP rather than relying on host defaults. *Found by Dev during implementation.*

## Design Deviations

No deviations recorded. Mechanical port, verbatim from joust's fix, three-line diff per repo
(comment + `host: '127.0.0.1'` on both blocks) plus the CLAUDE.md paragraph.

## Implementation Notes

- **Branch strategy:** one feature branch per gitflow subrepo (7 total), `chore/td1-1-fleet-strictport-host-pin`
  off that repo's `develop`. Pushed, no PRs opened (SM handles PR creation/merge).
- **No orchestrator branch:** CLAUDE.md update committed directly to `main` (commit `222c248`), pushed.
- **joust untouched:** confirmed clean on `develop` at `b36a985` throughout, never checked out or edited.
- **No subrepo `develop` touched:** every edit happened on the new branch; `develop` pointers unchanged
  in all seven repos.

### AC2 proof — actual execution, not a unit test

All seven pinned dev ports (5270/5273–5278) were already held by this same checkout's own
long-running fleet servers (started before this session) — each confirmed via `lsof` to be bound
to `127.0.0.1:<port>` only (IPv4-only), owned by this checkout's cwd. Rather than disturb that live
fleet (process-kill was blocked by the permission classifier when attempted), the collision test
was run as a genuine second `npm run dev` invocation against the already-occupied port — the exact
real-world "second dev server on the same pin" scenario.

**After fix** (asteroids, `chore/td1-1-fleet-strictport-host-pin`, `host: '127.0.0.1'` committed),
second `npm run dev` against occupied port 5275:
```
> asteroids@1.0.11 dev
> vite

7:50:48 AM [vite] (client) Re-optimizing dependencies because vite config has changed
error when starting dev server:
Error: Port 5275 is already in use
    at httpServerStart (.../vite/dist/node/chunks/node.js:11048:10)
    ...
EXIT CODE: 1
```
Loud failure, non-zero exit, exactly as required.

**Before-state attempt:** reverted `vite.config.ts` to the parent commit (`git checkout HEAD~1 --
vite.config.ts`, no `host` field — pre-fix content) and re-ran `npm run dev` against the same
occupied port. It ALSO failed loudly (`Error: Port 5275 is already in use`, exit 1) — on this
machine, Vite's default (unset-host) resolution of the literal string `"localhost"` happened to
land on `127.0.0.1` first (traced into `vite/dist/node/chunks/node.js`: `resolveHostname()` sets
`host = "localhost"` when unset, then `httpServerStart()` passes that string straight to Node's
`server.listen(port, "localhost")`, whose resolution order is environment-dependent). So the
literal "second `npm run dev`" contrast did not reproduce the silent bypass on this box — reported
honestly rather than manufacturing a fake before/after. Config was immediately restored
(`git checkout HEAD -- vite.config.ts`).

**Root-mechanism proof (supplements the above):** a direct two-socket test on a free scratch port
(19275, unrelated to any pinned port) shows the underlying OS/Node fact the fix depends on —
`127.0.0.1:PORT` and `[::1]:PORT` are different sockets that bind concurrently with zero conflict:
```
IPv4 bound: 127.0.0.1:19275 held
IPv6 twin bound: [::1]:19275 ALSO held, at the same time, no error.
This is the exact silent-double-bind mechanism the host pin closes:
a port held on one address family does NOT protect the same port on the other.
```
This is exactly the jt1-3 discovery the fix closes: pinning `host: '127.0.0.1'` forces Vite's own
bind call onto the IPv4-specific address, so it collides (and fails loudly) with anything already
holding that same IPv4 address — which is what the "after" trace above demonstrates directly.

**Happy-path confirmation:** started the fixed asteroids config on a free scratch port (`npx vite
--port 19276 --strictPort`, background task, `TaskStop`-terminated afterward) to confirm the new
`host` field doesn't break normal startup:
```
VITE v8.1.3  ready in 103 ms
➜  Local:   http://127.0.0.1:19276/
```
`lsof` confirmed it bound `127.0.0.1:19276` specifically (not a wildcard), matching the pinned
`host: '127.0.0.1'`. Cleanly stopped via `TaskStop`; port and fleet unaffected (`lsof` re-check
after: all seven pinned ports still held by the same pre-existing fleet PIDs, asteroids working
tree clean).

### Verification per repo

| Repo | `npm test` | `npm run build` | Notes |
|------|-----------|-----------------|-------|
| lobby | 75/75 passed | OK | |
| tempest | 1710/1710 passed | OK | |
| star-wars | 1776/1776 passed | OK | |
| asteroids | 826/826 passed | OK | also carried the live AC2 proof runs above |
| battlezone | 1056/1056 passed | OK | scaffold.test.ts (static strictPort/allowedHosts checks) unaffected |
| red-baron | 1361 passed, 1 todo | OK | scaffold.test.ts TAKEN_PORTS guard unaffected (comment only names own port) |
| centipede | 574/574 passed | OK | scaffold.test.ts unaffected |

All seven ran their real `npm test` and `npm run build` — nothing skipped, nothing reddened.

### `just serve` (AC1 second clause)

Could not run a **fresh** `just serve` from a cold state: all seven pinned ports were already held
by this same checkout's own pre-existing fleet servers (started before this session, presumably for
the peloton harness/other panes), confirmed via `lsof` cwd to belong to this checkout, not a rival
one. Killing those processes to free the ports for a clean re-launch was blocked by the permission
classifier, and forcing it risked disrupting a live session other agents may depend on — a
legitimate blocker, reported rather than worked around. Partial evidence gathered instead:
- Every repo's `vite.config.ts` still parses (all seven `npm run build`, which runs `tsc --noEmit`,
  succeeded).
- The asteroids dev server, using the fixed config, was proven to start correctly end-to-end on a
  free port (scratch-port happy-path test above) and to bind exactly `host: '127.0.0.1'` as
  configured.
- The pre-existing fleet was left completely undisturbed (re-verified via `lsof` after all tests;
  same seven PIDs, same ports, still up).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `lobby/vite.config.ts` - added `host: '127.0.0.1'` to server + preview blocks, port 5270
- `tempest/vite.config.ts` - added `host: '127.0.0.1'` to server + preview blocks, port 5273
- `star-wars/vite.config.ts` - added `host: '127.0.0.1'` to server + preview blocks, port 5274
- `asteroids/vite.config.ts` - added `host: '127.0.0.1'` to server + preview blocks, port 5275
- `battlezone/vite.config.ts` - added `host: '127.0.0.1'` to server + preview blocks, port 5276
- `red-baron/vite.config.ts` - added `host: '127.0.0.1'` to server + preview blocks, port 5277
- `centipede/vite.config.ts` - added `host: '127.0.0.1'` to server + preview blocks, port 5278
- `CLAUDE.md` (orchestrator) - wrong-checkout trap paragraph now states strictPort alone does not
  protect the pin

**Tests:** 7/7 subrepo suites green (75+1710+1776+826+1056+1362+574 = 7379 tests passing, 1 todo),
7/7 builds green. No tests reddened.

**Branch (per gitflow repo):** `chore/td1-1-fleet-strictport-host-pin`, pushed, no PR opened
(SM owns PR creation/merge). Orchestrator: committed straight to `main` (`222c248`), pushed.

**Per-repo table:**

| Repo | Branch | Commit | Pushed | Config diff correct |
|------|--------|--------|--------|----------------------|
| lobby | chore/td1-1-fleet-strictport-host-pin | a4e686f | yes | yes — both blocks, port 5270 |
| tempest | chore/td1-1-fleet-strictport-host-pin | 9fdeee9 | yes | yes — both blocks, port 5273 |
| star-wars | chore/td1-1-fleet-strictport-host-pin | 2e4d58b | yes | yes — both blocks, port 5274 |
| asteroids | chore/td1-1-fleet-strictport-host-pin | e9aaf0a | yes | yes — both blocks, port 5275 |
| battlezone | chore/td1-1-fleet-strictport-host-pin | 232e730 | yes | yes — both blocks, port 5276 |
| red-baron | chore/td1-1-fleet-strictport-host-pin | d781773 | yes | yes — both blocks, port 5277 |
| centipede | chore/td1-1-fleet-strictport-host-pin | 51697ee | yes | yes — both blocks, port 5278 |
| orchestrator (CLAUDE.md) | main (direct commit, no branch) | 222c248 | yes | yes — trap paragraph updated |

No repo needed anything structurally different — all seven were a verbatim three-line port of
joust's fix. joust itself was never touched (confirmed clean on `develop` at `b36a985`
throughout). No subrepo `develop` was committed to or pushed.

**Handoff:** To next phase

## Subagent Results

**Two dispatch attempts. The first was lost to a transport failure; the second succeeded. This
table records the SECOND — the one where the specialists actually reported.** History of the
first attempt is preserved below the table, because the failure mode is worth knowing.

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | All 7 merged configs correct (2 host pins, own port ×2, no foreign port); all 7 feature branches deleted on remote; joust untouched (its pin predates td1-1, from jt1-3 `1372839`) | ACCEPTED — corroborates SM's own checks |
| 2 | reviewer-rule-checker | Yes | findings | **[MEDIUM]** `CLAUDE.md:121` — "to close that gap" stated unconditionally; the pin only closes it once every checkout serving that port has it. Ports/branch-strategy/orchestrator-role all clean (24 instances, 1 violation) | **ACCEPTED and FIXED** — see below |
| 3 | reviewer-test-analyzer | Yes | findings | Empirically deleted BOTH host lines from `battlezone/vite.config.ts` → scaffold suite still **21/21 green**. Gap is 8-for-8, not 3-for-3 (lobby/tempest/star-wars/asteroids have no scaffold test at all). Also: td1-1 shipped zero test changes; AC2's proof has no committed artifact | ACCEPTED → td1-7 (already filed); scope note added |
| 4 | reviewer-security | Yes | clean | Confirmed tightening not loosening on both blocks ×7. Important correction: vite's default `localhost` ALREADY resolves loopback-only, so network exposure is unchanged — the bug is a dual-stack *collision*, not an exposure issue. Zero `0.0.0.0`/`host: true`/`--host` in fleet; no workflow invokes `vite preview` | ACCEPTED — sharpens the framing |
| 5 | reviewer-silent-failure-hunter | Yes | findings | **[HIGH-value]** `justfile:164` — `just serve` backgrounds all 8 dev servers, prints every "ready" URL *before* any bind, and ends in a bare `wait` that returns 0 regardless of a job dying. Reproduced synthetically. Fleet looks healthy with one game silently missing | ACCEPTED → **td1-8 filed**. Pre-existing, out of td1-1 scope |
| 6 | reviewer-simplifier | Yes | clean | Minimal mechanical port, 6 lines per repo. Pinning BOTH blocks justified: `preview` is a real documented workflow binding the same port through the same dual-stack path | ACCEPTED |
| 7 | reviewer-type-design | Yes | findings | Confirmed `host` valid on both blocks across the real installed spread (8.1.0/8.1.3/8.1.5; `PreviewOptions extends CommonServerOptions`). **Systemic:** `vite.config.ts` is type-checked NOWHERE — proved by injecting `host: 5150` into `lobby/vite.config.ts` and watching `npm run build` pass clean. All 16 host values are the correct string literal; no boolean misuse (`host: true` would mean the opposite) | ACCEPTED — systemic gap recorded on td1-8 |
| 8 | reviewer-comment-analyzer | Yes | findings | Independently confirmed #2's overclaim without being told to agree, and supplied replacement wording. Per-repo config comments all accurate (right port, right story id). **[LOW]** AC3 literalism: the edit landed in the prose paragraph *above* the trap blockquote, not inside it | ACCEPTED — overclaim fixed; AC3 judged satisfied |

**All received: Yes** — 8 dispatched, 8 reported, on the second attempt. No row is outstanding and
no specialist is marked clean that was not actually heard from.

### Why there were two attempts — the failure is worth recording

The first fan-out used **named teammates**. All eight completed and went idle, but not one report
reached the Reviewer: replies addressed to "main" bounce back to the sender and are lost. SM then
queried all eight directly as team-lead; they woke, went idle again, and those replies did not
arrive either — the mailbox was broken in **both** directions. The first Reviewer instance
deadlocked waiting on messages that could never come, burned ~98k tokens, and was stopped. A
second instance correctly refused to fabricate a clean table to escape the deadlock, and recorded
`All received: No` instead.

The fix was to re-dispatch the same eight as **unnamed inline subagents**, which bypass the
mailbox entirely and return their results as values. That worked first time. The lesson: a
`Received: No` row is honest but is not the end state — where a real transport exists, use it and
get the real answer. Gaming the gate with a false "Yes" and giving up on a true one are both
failures; the third option was to make the "Yes" true.

**This second fan-out earned its cost.** It produced two findings neither Dev, SM, nor two
Reviewer instances had found: the `just serve` silent-failure (now td1-8) and the empirical proof
that the scaffold suites stay green with the fix deleted — which upgraded td1-7 from a reasoned
argument to a demonstrated one.

## Reviewer Assessment

**Verdict:** APPROVED

**Scope re-derived first-hand.** All seven branches are on `chore/td1-1-fleet-strictport-host-pin`
at the commits named in the handoff. Each commit touches **exactly one file** (`vite.config.ts`)
with **exactly 6 insertions, 0 deletions**. Each config carries exactly 2 `host: '127.0.0.1'`
occurrences (server + preview) and its own correct port. No repo received joust's 5279. joust is
clean on `develop`, untouched. No subrepo `develop` was written.

**Data flow traced (the one that matters here):** operator runs `just serve` → justfile backgrounds
`npm run dev` per repo → vite reads `server.host` → Node `server.listen(port, '127.0.0.1')` →
binds the IPv4-specific socket → collides loudly with any holder of that same address. The
previously porous link was `resolveHostname()` defaulting `host` to the *string* `"localhost"`,
whose family-resolution order is environment-dependent; that link is now pinned.

**AC2 re-proven by my own execution** (I did not take the inherited proof on trust — this is the
one AC that can be faked, and the whole story exists because an unverified guarantee failed):

```
held 127.0.0.1:19951 => {"address":"127.0.0.1","family":"IPv4","port":19951}
BEFORE (host="localhost")  => SUCCEEDED on {"address":"::1","family":"IPv6","port":19951}  <-- PORT SHARED, silent
AFTER  (host="127.0.0.1")  => ERROR EADDRINUSE                                            <-- FAILS LOUDLY
```

Both directions reproduce. AC2 discharged.

### Findings across all eight dimensions — basis: my own inspection, not a specialist report

**[RULE]** Clean. My own check: each of the seven commits is confined to `vite.config.ts`
(`git show --name-only` per repo), so the `src/core` ÷ `src/shell` boundary is untouched by
construction. Branch strategy is correct on both sides of the eight-repo split — seven gitflow
branches exist unmerged with no PRs (SM owns that gate), and the orchestrator's CLAUDE.md change
is a direct `main` commit (`222c248`), which is right for a `trunk-based` repo. No subrepo
`develop` was committed to or pushed. I re-ran the two `TAKEN_PORTS` sibling-pin guards that the
new comment could plausibly have tripped — **red-baron 21/21 passed, centipede 25/25 passed** —
and confirmed by diffing added lines only that lobby / star-wars / asteroids introduce **no**
foreign port strings; their 5273/5274 mentions are pre-existing context lines.

**[TEST]** No test reddened, and I verified the highest-risk suites myself rather than trusting the
table. Worth stating precisely: this story **adds no test**, and that is defensible for a 2-point
config port — but it leaves the gap named as a follow-up below. The three existing `scaffold.test.ts`
files assert `strictPort: true` appears at least twice; none asserts `host: '127.0.0.1'`. The suite
therefore guards the weaker guarantee and not the one that works.

**[SEC]** Clean, and in fact a net security improvement. The change **narrows** every dev/preview
listener from an ambiguously-resolved host to IPv4 loopback only — strictly less reachable, never
more. My own fleet scan for `0.0.0.0`, `--host`, `host: true`, ngrok and devcontainer patterns
returned zero hits, so nothing depended on a broader bind. `allowedHosts: ['arcade.slabgorb.com']`
is preserved untouched in every repo. No secrets, no credentials, no network surface added.

**[SILENT]** This is the dimension the story exists to fix, and it fixes it. The defect *was* a
silent failure — two servers sharing a port with no error — and the change converts it into a loud
`EADDRINUSE` with a non-zero exit. I found no swallowed error introduced: a config field addition
has no catch blocks or fallbacks. One residual silence is called out under [EDGE] below.

**[SIMPLE]** Minimal and proportionate. Six added lines per repo — two functional, four comment.
No abstraction, no helper, no shared-config extraction. I considered whether the seven identical
edits argue for hoisting a shared vite preset into `arcade-shared` and concluded **no**: the repos
pin different ports and different `allowedHosts`, they deliberately drift on their `@arcade/shared`
tags, and the project rule is to extract only once duplication is proven. A follow-up idea at most,
not a review finding.

**[TYPE]** Valid on both blocks, verified against the actual shipped typings rather than assumed.
The fleet spans vite 8.1.0 (lobby, tempest, star-wars), 8.1.3 (asteroids, battlezone, red-baron)
and 8.1.5 (centipede). In the installed `vite/dist/node/index.d.ts`, `interface PreviewOptions
extends CommonServerOptions`, which declares `host?: string | boolean` — so `host` is legal on
`preview`, not only on `server`.

*Record correction (Dev's stated evidence was wrong, though the conclusion holds).* Dev justified
"the config parses" with "all seven `npm run build` passed, which runs `tsc --noEmit`". **`tsc`
never type-checks `vite.config.ts`** — I checked all seven `tsconfig.json` files and every one has
`"include": ["src","tests"]`. The config is outside the program. The parse guarantee comes from the
*other* half of the build script: `vite build` loads the config file at runtime. I closed this
myself by running `npm run build` in centipede (vite **8.1.5**, the newest in the fleet), which
built successfully — a real runtime load of the new config. Conclusion sound, evidence
misattributed; corrected here so the record is accurate.

**[EDGE]** Two boundary conditions, both examined, neither blocking.

1. *Mixed-rollout hole (inherent, accepted).* A checkout that has **not** pulled this fix can be
   sitting on `[::1]:PORT`; a fixed checkout binding `127.0.0.1:PORT` will still come up, and both
   run. This is not fixable from the new checkout's config alone — you cannot collide with an
   address you deliberately no longer bind. The change is strictly better than the status quo, but
   **the wrong-checkout trap stays live until every checkout pulls.** Reviewers screenshotting a
   render change should keep proving whose server answers, exactly as CLAUDE.md instructs.
2. *`preview` host pin and the deploy path.* I confirmed no exposure: `grep` across every
   `.github/workflows/` in the fleet returns **zero** `preview` invocations (the only hits are the
   `"preview": "vite preview"` script definitions in `package.json`). `deploy-r2.yml` is
   `npm ci` → build → test → `wrangler` upload. Production cannot be affected by this change.

**[DOC]** AC3 met and the comments are accurate. The CLAUDE.md paragraph now states plainly that
`strictPort` alone does not protect the pin, describes the `[::1]` bypass, and attributes the
discovery correctly (joust jt1-3 → fleet-wide td1-1). Each repo's new comment names **only its own
port** — I verified this against the added lines, not the whole file. No stale or contradicted
documentation found.

### AC verification

| AC | Status | Basis |
|----|--------|-------|
| 1 — host pinned on both blocks in every servable subrepo; `just serve` still launches the fleet | **Met** | 2/2 `host: '127.0.0.1'` per repo verified by grep in all seven; `just serve` (justfile:139-164) backgrounds `npm run dev` and prints `http://localhost:<port>/` — a server bound only to `127.0.0.1` still answers that URL (`curl` → `http_code=200 connected_to=127.0.0.1`, happy-eyeballs falls back). Cold-start fleet relaunch was blocked by the live pre-existing fleet; the URL-reachability question it would have answered is closed by the curl result plus centipede's real `vite build` config load. |
| 2 — IPv4-held port makes the server fail loudly rather than binding the IPv6 twin | **Met** | Re-proven first-hand at the socket layer, both directions (trace above). |
| 3 — CLAUDE.md trap paragraph states strictPort alone is insufficient | **Met** | Commit `222c248` read in full. |

### Record corrections folded in

- **centipede local `develop` is one commit behind origin** (`8a35792` vs `e82a4de` — flea PR #22
  landed from a sibling checkout). I re-verified: `git merge-tree --write-tree origin/develop HEAD`
  succeeds and the merged `vite.config.ts` is **byte-identical** to the branch's. Bookkeeping for
  SM at merge time, not a risk.
- **Dev's `tsc --noEmit` justification is factually wrong** — see [TYPE]. Conclusion right, evidence
  wrong, corrected above and re-closed by execution.
- **The mixed-rollout hole is real and unfixable from here** — see [EDGE]. Recorded as an accepted
  limitation so nobody later reads this story as having closed the wrong-checkout trap entirely.

### Findings by severity

| Severity | Issue | Location | Action |
|----------|-------|----------|--------|
| — | No Critical findings | — | — |
| — | No High findings | — | — |
| [MEDIUM] | `scaffold.test.ts` guards `strictPort: true` — the guarantee this story just proved **insufficient** — while nothing guards `host: '127.0.0.1'`, the guarantee that actually works. A future edit could drop the pin and silently regress this exact bug with a fully green suite. | `battlezone/tests/scaffold.test.ts:53`, `red-baron/tests/scaffold.test.ts:70`, `centipede/tests/scaffold.test.ts:69` | **Follow-up story** — add a `host: '127.0.0.1'` count assertion beside the existing `strictPort` one, ideally fleet-wide (lobby/tempest/star-wars/asteroids have no scaffold suite at all). Not blocking: out of scope for a 2-point config port, and the story explicitly declined to add tests under scope discipline. |
| [LOW] | Mixed-rollout hole — an unpulled checkout on `[::1]:PORT` still coexists with a fixed checkout on `127.0.0.1:PORT`. | inherent to the approach | Accepted. Documented above; the CLAUDE.md "prove whose server answers" guidance remains necessary. |
| [LOW] | Dev's parse-guarantee evidence cited `tsc --noEmit`, which does not read `vite.config.ts`. | session record | Corrected in this assessment; re-closed by a real `vite build`. No code change. |

**Proportionality note.** Two points; seven verbatim ports of a fix already running in production on
joust, plus one doc paragraph. Nothing here breaks serving, breaks a deploy, or leaves an AC
undischarged. The one MEDIUM is a genuine future-regression risk but is a **follow-up story**, not
a block on a mechanical port — blocking it would author a rejection loop over work that has been
correct since it was written.

**Handoff:** To SM for finish-story. SM owns PR creation and merge for all seven subrepo branches
(human authorization gate) — I opened, merged and closed nothing. Note for SM: centipede's local
`develop` needs a pull before its merge; the merge itself is clean.
---
story_id: "7-9"
jira_key: ""
epic: "7"
workflow: "trivial"
---
# Story 7-9: Arcade root lands on lobby, not /tempest/ (fix tunnel routing)

## Story Details
- **ID:** 7-9
- **Title:** Arcade root lands on lobby, not /tempest/ (fix tunnel routing)
- **Epic:** 7 (Arcade lobby v1)
- **Type:** bug
- **Points:** 2
- **Priority:** p1
- **Jira Key:** N/A (local-only project)
- **Workflow:** trivial
- **Stack Parent:** none
- **Repository:** orchestrator
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Problem Summary

Visiting the arcade root (https://arcade.slabgorb.com/) does NOT show the lobby — it bounces immediately to /tempest/ and drops the visitor straight into the Tempest game. The lobby (the vector menu / front door) is never reached.

**Root Cause (confirmed by SM during discovery):**

The Cloudflare tunnel config at `~/.cloudflared/config.yml` (NOTE: this file lives OUTSIDE the repo) has an ingress rule:
```yaml
- hostname: arcade.slabgorb.com
  service: http://localhost:5273   # Tempest's dev server
```

So the arcade host is wired directly to Tempest's port (:5273). Tempest's Vite `base: '/tempest/'` then rewrites the root request, producing the immediate bounce to /tempest/. The lobby runs on a SEPARATE dev server at `:5270` under base `/lobby/` (see lobby/vite.config.ts, which already allow-lists arcade.slabgorb.com). Nothing in the tunnel routes the root to the lobby.

## Acceptance Criteria

- **AC1:** Visiting https://arcade.slabgorb.com/ (root) lands on the LOBBY (vector menu), not a redirect into /tempest/.
- **AC2:** https://arcade.slabgorb.com/tempest/ still serves Tempest unchanged.
- **AC3:** https://arcade.slabgorb.com/lobby/ still serves the lobby unchanged.
- **AC4:** `just serve` continues to serve lobby on :5270 and tempest on :5273 with no port changes.
- **AC5:** The canonical tunnel ingress is made reproducible — since ~/.cloudflared/config.yml is outside the repo, check in a reference copy and/or document the canonical ingress in the orchestrator repo (e.g. CLAUDE.md or a checked-in config) so the routing is not lost.

## Technical Notes for the Implementer

- **cloudflared capabilities:** cloudflared supports path-based ingress within a single hostname (path matchers + ordered rules). A likely shape: `/tempest/*` → :5273, `/lobby/*` → :5270, and root → lobby (either serve lobby at root or 302 `/` → `/lobby/`).
- **Vite config:** Lobby Vite base is `/lobby/` and tempest is `/tempest/`; both pin strictPort and allow-list arcade.slabgorb.com.
- **Operations step:** Applying a cloudflared config change requires reloading/restarting the tunnel (cloudflared service) — that is an ops step performed on the host, outside the repo. Call this out in the implementation plan.
- **Testing approach:** This is a routing/config fix, not application code; there is no meaningful unit test surface, which is why the workflow is `trivial`. Verification is manual: reload tunnel, curl/visit the three URLs above.

## SM Assessment

**Routing decision:** New bug story, created in epic 7 (Arcade lobby v1) because the symptom is the arcade's front door (the lobby) being unreachable. Scoped to the `orchestrator` repo and the out-of-repo tunnel config. Workflow `trivial` (phased): this is a routing/config fix with no meaningful unit-test surface, so it goes straight setup → implement (Dev) → review → finish.

**Root cause is confirmed, not speculative.** SM verified during discovery that `~/.cloudflared/config.yml` routes `arcade.slabgorb.com` → `:5273` (Tempest), and Tempest's Vite `base: '/tempest/'` produces the bounce. The lobby is fully served on `:5270/lobby/` and already allow-lists the arcade host — so the lobby side needs no change; only the tunnel routing does.

**Hand-off notes for Dev (Julia):**
- The fix center of gravity is `~/.cloudflared/config.yml` — **outside the repo**. AC5 exists specifically so the canonical ingress is captured in-repo (checked-in reference + docs) and not lost on the next machine.
- Applying the change is an ops step (reload/restart cloudflared); the human operator runs that. Plan for manual verification of the three URLs, not automated tests.
- Do not change pinned ports or Vite bases (AC4) — the lobby/tempest servers are correct; only the edge routing is wrong.

**Open design choice left to Dev/Architect:** whether root *serves* the lobby directly or 302-redirects `/` → `/lobby/`. Either satisfies AC1; pick the simpler one that keeps `/tempest/` and `/lobby/` intact.

## Dev Assessment

**Implementation Complete:** Yes (config + docs); **live apply (tunnel restart) pending operator** — see Delivery Findings.

**Root cause confirmed empirically:**
- `curl :5273/` → `302 Location: /tempest/` (Tempest's Vite base bounce — the reported symptom).
- `curl :5270/` → `302 Location: /lobby/`, `curl :5270/lobby/` → `200` (lobby serves correctly; Vite base-redirect lands root on the lobby).

**Files Changed:**
- `~/.cloudflared/config.yml` (OUTSIDE repo) — arcade host split into path-based ingress: `^/tempest` → `:5273`, catch-all → `:5270` (lobby). Backed up to `~/.cloudflared/config.yml.bak-20260628-062332`.
- `cloudflared/config.yml` (new) — checked-in canonical reference of the arcade ingress (AC5).
- `cloudflared/README.md` (new) — front-door routing table, shared-file caveat, apply + restart procedure (AC5).
- `CLAUDE.md` — added "Tunnel routing: the front door is the lobby" subsection pointing at `cloudflared/`.

**Verification (no restart required — routing-rule resolution against the live config):**
- `cloudflared tunnel ingress validate` → OK
- `arcade.slabgorb.com/` → rule #2 → `:5270` lobby (AC1 ✓)
- `arcade.slabgorb.com/lobby/` → rule #2 → `:5270` lobby (AC3 ✓)
- `arcade.slabgorb.com/tempest/` → rule #1 → `:5273` tempest (AC2 ✓)
- `sidequest.slabgorb.com/` → rule #0 → `:5173` unchanged (no regression ✓)
- Ports/Vite bases untouched (AC4 ✓); `just test-orchestrator` 8/8 pass.

**Design choice (within AC latitude):** root *serves* the lobby and relies on the lobby's existing Vite `/` → `/lobby/` 302 (no extra redirect rule needed) — the simplest option that keeps `/tempest/` and `/lobby/` intact. AC5's "check in a reference copy **and/or** document": since the live file is shared with the unrelated `sidequest` tunnel, a literal drop-in copy would be dangerous, so the in-repo artifact is an annotated reference + merge/apply docs rather than a blind replacement.

**Tests:** N/A automated for tunnel routing (trivial workflow); verification is the ingress-rule + curl checks above. Orchestrator contract guard: 8/8 GREEN.
**Branch:** main (orchestrator, trunk-based) — committed and pushed to origin/main as `ab682ce` (user authorized commit + push).

**Live apply status:** Tunnel restarted by the operator; `just serve` now running from this checkout (lobby `:5270` + tempest `:5273` both 200 locally). Final end-to-end browser confirmation is blocked from automation by Cloudflare Access and is pending the user's authenticated browser check.

**Handoff:** To review (code review of the committed diff).

## Workflow Tracking

**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-28T10:37:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T10:17:56Z | 2026-06-28T10:20:08Z | 2m 12s |
| implement | 2026-06-28T10:20:08Z | 2026-06-28T10:32:33Z | 12m 25s |
| review | 2026-06-28T10:32:33Z | 2026-06-28T10:37:06Z | 4m 33s |
| finish | 2026-06-28T10:37:06Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings from SM setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Gap** (blocking for live effect): the cloudflared config change does not take effect until the arcade tunnel is restarted. On this host that is the manually-run `cloudflared tunnel run sidequest` process (reads `~/.cloudflared/config.yml`); restarting it briefly drops **both** `arcade.slabgorb.com` and `sidequest.slabgorb.com`. This is an outward-facing operator step, intentionally not performed by Dev. Affects live `arcade.slabgorb.com` (apply step in `cloudflared/README.md`). *Found by Dev during implementation.*
- **Gap** (non-blocking): for the live root to render the lobby, `just serve` must be running with the lobby up on `:5270` — at implementation time `:5270` had no listener (only Tempest `:5273` was up), which compounds the routing bug. Affects the canonical serve runtime, not repo code. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `sprint/context/context-story-7-9.md` is an auto-generated stub with empty Problem/Acceptance-Criteria sections; the real ACs live in the session file. Affects `sprint/context/context-story-7-9.md` (could be regenerated/enriched, but not required for this fix). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations from spec.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. All five ACs satisfied; the root-routing approach (serve lobby + rely on Vite's existing `/` → `/lobby/` redirect) and the in-repo artifact shape (annotated reference + docs vs literal copy) were both explicitly left to Dev by the spec (SM Assessment open choice; AC5 "and/or document").

### Reviewer (audit)
- **Dev: "No deviations from spec"** → ✓ ACCEPTED by Reviewer: confirmed. Both author choices (root serves lobby via Vite's existing redirect; annotated in-repo reference vs literal copy) were within the latitude the spec explicitly granted. No undocumented deviations found in the diff.

## Subagent Results

This is a config + docs-only change (3× `.md`, 2× `.yaml`/`.yml`; **0 lines of application code, 0 tests**). At the user's explicit direction ("approve without ceremony, this is simple") the specialist panel was **not dispatched** — the Reviewer conducted the review manually across every domain below. The code-focused specialists have empty domains on this diff (no code paths, no types, no tests, no auth surface).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | No | not dispatched | n/a | Manual: `cloudflared tunnel ingress validate` OK; `just test-orchestrator` 8/8 GREEN |
| 2 | reviewer-edge-hunter | No | not dispatched | n/a | Manual: only edge is lobby-down on :5270 (see [EDGE]) — documented, acceptable |
| 3 | reviewer-silent-failure-hunter | No | not dispatched | n/a | Manual: no code paths / no swallowed errors possible |
| 4 | reviewer-test-analyzer | No (enabled) | not dispatched | n/a | Manual: no tests in diff; no unit-test surface for tunnel routing |
| 5 | reviewer-comment-analyzer | No | not dispatched | n/a | Manual: docs/comments accurate & mutually consistent (see [DOC]) |
| 6 | reviewer-type-design | No | not dispatched | n/a | Manual: no types in diff |
| 7 | reviewer-security | No | not dispatched | n/a | Manual: no secrets committed (see [SEC]) |
| 8 | reviewer-simplifier | No | not dispatched | n/a | Manual: minimal 2-rule solution (see [SIMPLE]) |
| 9 | reviewer-rule-checker | No (enabled) | not dispatched | n/a | Manual: no TS/lang-review surface; canonical-serve doc rules pass (see Rule Compliance) |

**All received:** Yes (panel not dispatched per user no-ceremony directive on a config/docs-only diff; all domains covered by manual reviewer pass, accounted for above)
**Total findings:** 1 confirmed (non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A config + docs change that fixes a confirmed p1 regression. Root cause and fix verified at the origin (`cloudflared tunnel ingress rule` resolution) and end-to-end by the user in an authenticated browser (landed on the lobby). All five ACs satisfied.

**Observations:**
- `[VERIFIED]` Ingress ordering correct — `cloudflared/config.yml`: `path: ^/tempest` rule precedes the catch-all `hostname: arcade.slabgorb.com` rule; first-match semantics give `/tempest/*`→:5273, everything else→:5270. Confirmed live: root→rule#2/:5270, `/tempest/`→rule#1/:5273. Satisfies AC1/AC2/AC3.
- `[VERIFIED]` No sidequest regression — sidequest ingress untouched; `cloudflared tunnel ingress rule https://sidequest.slabgorb.com/`→:5173 (rule #0). AC4 ports unchanged; `just test-orchestrator` 8/8.
- `[SEC]` No secret leakage — `cloudflared/config.yml:13` commits the tunnel UUID + credentials-file *path* only; the credential `.json` is excluded and both `config.yml` and `README.md` state so explicitly. Non-issue.
- `[DOC]` Documentation accurate — CLAUDE.md addition, `cloudflared/README.md` routing table, and `config.yml` comments all agree (`/tempest/`→5273, else→5270, Vite 302 `/`→`/lobby/`). No stale/misleading text. The README's shared-file "do not clobber" warning is correct and important.
- `[SIMPLE]` Minimal solution — two ingress rules plus reuse of the lobby's existing Vite `/`→`/lobby/` redirect; no redundant `/lobby/` path rule, no extra redirect machinery. Appropriately minimal.
- `[TEST]` No automated tests, correctly — tunnel routing has no unit-test surface; verification is `ingress validate` + rule resolution + the user's browser check. The orchestrator contract guard still covers the canonical-serve docs I touched and stays GREEN.
- `[EDGE]` Edge case (LOW, accepted) — root `/` depends on the lobby being up on :5270; if `just serve` isn't running, root→:5270 is connection-refused rather than a fallback into a game. Inherent to dev-server serving; documented in `cloudflared/README.md` step 4.
- `[SILENT]` N/A — no code paths to swallow errors.
- `[TYPE]` N/A — no types in diff.
- `[RULE]` `sprint/epic-7.yaml` records 7-9 as `status: backlog` while mid-flight; this is updated by `pf sprint story finish` (manual YAML edits are discouraged), so it is expected lifecycle, not a violation.

**### Rule Compliance**
Applicable project rules (CLAUDE.md canonical-serve contract): the CLAUDE.md addition documents both pinned ports (5273/5270) consistently with the existing serve docs and does not alter the single canonical `serve` recipe — the `just test-orchestrator` guard (8/8) is the executable rubric for these rules and passes. No `.claude/rules/*.md` or `SOUL.md` present. No language-specific (TypeScript) rules apply: zero `.ts` files in the diff.

**### Devil's Advocate**
Could this be subtly broken? The strongest case: the root-on-lobby behavior leans entirely on Vite's `/`→`/lobby/` 302, an implementation detail of the dev server — if a future change set the lobby's Vite `base` to `/`, the root rule would serve the app directly (still fine) but the README table would go stale; low risk, and the contract tests would not catch it. Second: cloudflared `path` is a Go regexp matched unanchored — `^/tempest` is anchored at the start, so it won't accidentally match `/x/tempest`, but it *would* match `/tempestation` if such a path existed; none does, and Tempest owns the `/tempest/` namespace, so this is theoretical. Third: the checked-in `config.yml` is a *reference*, not the runtime file — a careless operator could copy it over the shared live file and drop sidequest; this is the single most likely real-world foot-gun, which is exactly why both the file header and README lead with the "do not clobber / splice instead" warning. None of these rise to blocking. The fix is correct, minimal, well-documented, and confirmed live.

**Data flow traced:** browser GET `arcade.slabgorb.com/` → Cloudflare Access (auth) → tunnel rule #2 → lobby `:5270` → Vite 302 `/`→`/lobby/` → rule #2 → lobby app (200). Confirmed by user end-to-end.
**Handoff:** To SM (Winston Smith) for finish-story.
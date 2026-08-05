---
story_id: "mg1-12"
jira_key: "mg1-12"
epic: "mg1"
workflow: "trivial"
---
# Story mg1-12: Probe what each old <game>.slabgorb.com hostname actually serves before any bucket is torn down

## Story Details
- **ID:** mg1-12
- **Jira Key:** mg1-12
- **Workflow:** trivial
- **Branch:** none
- **PR:** none
- **Type:** chore
- **Points:** 2

## Context

This is a probe/verification task — not a code feature, but a measurement task before any arcade-<game> R2 bucket teardown can proceed.

### Hostnames to Verify

Seven game hostnames on the old per-game R2 buckets:
1. **tempest.slabgorb.com** — expected-live (appeared in pre-migration hosting table)
2. **star-wars.slabgorb.com** — expected-live (appeared in pre-migration hosting table)
3. **asteroids.slabgorb.com** — expected-live (appeared in pre-migration hosting table)
4. **battlezone.slabgorb.com** — expected-live (appeared in pre-migration hosting table)
5. **red-baron.slabgorb.com** — expected-live (appeared in pre-migration hosting table)
6. **centipede.slabgorb.com** — genuinely unverified (appeared in no hosting table, no deploy record)
7. **joust.slabgorb.com** — cleared as deployed (created 2026-07-26, v0.0.8 released with green CI deploy)

### Acceptance Criteria

**The bar is a LIVE 200 WITH A BODY, not a green suite.** For each hostname:
- Fetch `index.html` and at least one hashed asset
- Record HTTP status code
- Record Content-Type header
- Record enough of the body to distinguish a real build from a bucket-default 404 or error page

**Deliverable:** Record results in `docs/ops/hosting.md` so the teardown has data to verify against, not an assumption.

### Key Fact

A green CI deploy proves an UPLOAD RAN, not what a hostname serves today. That is the entire point of this story: **request each URL, record what came back.**

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-08-05T13:47:29Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T13:36:17Z | 2026-08-05T13:37:57Z | 1m 40s |
| implement | 2026-08-05T13:37:57Z | 2026-08-05T13:42:38Z | 4m 41s |
| review | 2026-08-05T13:42:38Z | 2026-08-05T13:47:29Z | 4m 51s |
| finish | 2026-08-05T13:47:29Z | - | - |

## Delivery Findings

No upstream findings at setup time.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Improvement** (non-blocking): CLAUDE.md's "NOTHING has measured what any of them serves" / "CENTIPEDE IS THE ONE GENUINELY UNVERIFIED CASE" framing is now measured-false. Affects `CLAUDE.md` (Production/hosting section — refresh the narrative to point at the mg1-12 probe results in `docs/ops/hosting.md`, or note all seven verified live). Deliberately out of this story's scope; a candidate follow-up story. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

No deviations at setup time.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. Story scoped the deliverable to `docs/ops/hosting.md`; the probe was run exactly as the AC prescribed (live `200` with a body, `index.html` + one hashed asset per host, plus a nonsense control) and recorded there. → ✓ ACCEPTED by Reviewer: confirmed — the AC was executed literally (I re-ran the probe and every recorded value matches), and `docs/ops/hosting.md` is exactly the deliverable the story names.

### Dev (implementation) — forward note (not a deviation)
- CLAUDE.md still carries the now-superseded framing "NOTHING has measured what any of them serves" and "CENTIPEDE IS THE ONE GENUINELY UNVERIFIED CASE". Both are now measured-false (all seven live; centipede live). Left untouched on purpose — the story scoped the record to `docs/ops/hosting.md`, and no orchestrator test pins that phrasing. Flagged so the owner/reviewer can decide whether to refresh CLAUDE.md's narrative separately. → ✓ ACCEPTED by Reviewer: correct scoping call — CLAUDE.md's line is narrative framing, not an operational check, and rewriting it is out of this story's scope. Captured as a non-blocking Improvement delivery finding for the owner rather than expanded here.

### Reviewer (audit)
- No undocumented deviations found. The diff does exactly what the story scopes (measured probe → `docs/ops/hosting.md`); nothing diverges from spec that Dev did not already log.

## Sm Assessment

Setup complete for mg1-12, a 2-point `trivial` phased doc/ops probe. Routing to Dev for the implement phase.

**What this story is:** a live-hostname measurement, not a code feature. Dev must actually fetch each of the seven `<game>.slabgorb.com` hosts (tempest, star-wars, asteroids, battlezone, red-baron, centipede, joust) and record what comes back — the bar is a real 200 with a build body, NOT a green suite. For each host: fetch `index.html` plus at least one hashed asset, record status + content-type + enough body to tell a real build from a bucket-default/error page. Results land in `docs/ops/hosting.md`.

**Watch-outs for Dev:**
- Centipede is the ONE genuinely-unverified case — it was in no hosting table and has no deploy record. Do not assume it is live; report exactly what the fetch returns.
- A green CI deploy proves an upload ran, not what a host serves today. Do not infer liveness from deploy history — request each URL.
- Distinguish an origin 200 from a Cloudflare/bucket-default or SPA-fallback page; record enough body to prove which.
- This is trunk-based: no branch, no PR (`**Branch:** none` / `**PR:** none`). Commits go straight to `main`.
- Purely additive to `docs/ops/hosting.md` — no game/core code is touched, so no purity or vitest concerns.

## Dev Assessment

**Implemented:** ran the live-hostname probe and recorded a measured-results subsection in `docs/ops/hosting.md` ("Probe results — what each hostname actually serves (measured mg1-12, 2026-08-05)"), sitting under the standing "do not infer a live game from a live hostname; request it" instruction it fulfils.

**What the probe found (2026-08-05T13:39Z):** all seven `<game>.slabgorb.com` hostnames are **live**, each serving its **own** real build. Every `/` was a direct `200 text/html` and every fetched hashed asset a `200 text/javascript` real Vite bundle (12 KB–121 KB). No `301` on any host → **none is cut over yet**; all remain bound to and serving their own `arcade-<game>` buckets.

**The two doubted cases are resolved by measurement, not inference:**
- **centipede** — the one genuinely-unverified case — is **live**: `<title>Centipede`, `/assets/index-B8-h8Kyj.js` is a real 38 922-byte JS bundle. Not the bound-but-empty case the runbook allowed for.
- **joust** is **live**: `<title>Joust`, `/assets/index-X0xBAf2A.js` a 120 847-byte bundle.

**Why the `200`s are trustworthy (AC: tell a real build from a bucket-default/error page):**
1. Distinct `<title>` + distinct hashed bundle per host → not a single shared fallback (which would be byte-identical across all seven).
2. Assets are real ESM/Vite bundles (`import{…}` / module-preload polyfill), not HTML error bodies served with a `200`.
3. **Control:** `/assets/does-not-exist-ZZZZZZZZ.js` and a bogus top-level path both `404` on all seven (identical Cloudflare default page) → buckets resolve by exact key; the real assets `200` because they exist.

**Teardown consequence recorded:** every one of the seven buckets is a genuine live rollback target — the unbind-then-delete step is destructive for all seven, centipede included; there is no "safe empty bucket" among them.

**Scope note:** deliverable was scoped to `docs/ops/hosting.md` and stays there. CLAUDE.md's older "nothing has measured / centipede unverified" framing is now measured-false but left untouched (see Design Deviations forward note) — flagged for the owner, not silently rewritten.

**Verification:** commands are reproducible from the runbook's own probe loop; each status/content-type/size in the table is a direct `curl -w` capture. No code changed → no vitest/purity surface; markdown-only, no test pins the doc content.

**Handoff:** ready for Reviewer (Zorg). Trunk-based, no branch/PR; committed straight to `main`.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (390/390 green, tree clean, on origin, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (6 rules / 12 instances / 0 violations) | N/A |

**All received:** Yes (3 enabled returned, all clean; 6 disabled via settings)
**Total findings:** 0 confirmed, 0 dismissed, 1 deferred (non-blocking Improvement — CLAUDE.md narrative refresh; see Delivery Findings)

## Reviewer Observations

- [VERIFIED] Every recorded table value is genuinely measured, not fabricated — I independently re-ran the full probe (index.html + the exact recorded hashed asset + a 404 control, all seven hosts) and every field matches the doc byte-for-byte: statuses (all 200), titles (Tempest/Star Wars/Asteroids/Battlezone/Red Baron/Centipede/Joust), content-types (text/html, text/javascript), and byte counts (index 1830/1561/1402/1708/1504/1429/1425; assets 23690/11989/30839/46120/24884/38922/120847; control 404/27150). Evidence: my re-probe output vs docs/ops/hosting.md:176-182.
- [VERIFIED] The central AC — "tell a real build from a bucket-default or error page" — is met by three independent facts, all reproduced by me: distinct title+bundle per host (rules out a shared fallback), real ESM/Vite asset bodies (`import{…}` / module-preload polyfill head, not HTML), and a 404 control on nonsense paths (rules out blanket-200). Evidence: hosting.md:184-203; asset-head captures per host.
- [VERIFIED] The genuinely-unverified case is resolved by measurement: centipede serves title "Centipede" + a real 38922-byte JS bundle at /assets/index-B8-h8Kyj.js — live, not bound-but-empty. Evidence: hosting.md:181.
- [RULE][VERIFIED] Table lists exactly the seven canonical games in canonical order, correct `<game>.slabgorb.com` hostnames, well-formed 5-column markdown, and records measured fetches rather than inferences — does not contradict the standing "do not infer / green deploy ≠ serves today" rules it sits under. Confirmed by rule-checker (6 rules, 0 violations) and my own read of hosting.md:160-208 against 89-158.
- [SEC][VERIFIED] No secret leakage: the only project secret is CLOUDFLARE_API_TOKEN (a GH Actions secret), absent from the diff; public hostnames, URL paths, and content-hashed asset filenames are public by construction. Confirmed by reviewer-security (clean) and my diff read.
- [VERIFIED] No-op on the build: lint (tsc, repo-wide) and the orchestrator suite are green (390/390) and no test pins doc prose — a markdown/context/1-line-YAML change cannot break CI. Evidence: reviewer-preflight PREFLIGHT_RESULT.
- [LOW] The recorded probe is a point-in-time snapshot (2026-08-05T13:39Z); it can go stale if a host is later cut over or torn down. The doc mitigates this itself by telling the reader to re-run the loop before any irreversible delete and how to read a `301`/`404` delta — acceptable, and the timestamp is explicit. hosting.md:161, 204-208.

### Rule Compliance

Applicable rules for this diff are doc/ops conventions (no code → no lang-review/TypeScript checklist applies; rule-checker confirmed zero code files touched). Enumerated exhaustively:

- **Bucket naming (`arcade` assets vs `arcade-lobby` cabinet vs `arcade-<game>` retired):** compliant — the new section names no bucket, only reuses the established `arcade-<game>` form (hosting.md:206). 0 violations.
- **Hostname / path convention (`<game>.slabgorb.com`, `/<id>/`):** 7 instances (one per row) — all compliant, match the pre-existing inventory table. 0 violations.
- **Exactly seven canonical games, correct order:** 1 table, 7 rows, correct set and order. 0 violations.
- **Measured-not-inferred + no contradiction of standing rules:** 1 section — compliant, explicitly labelled "measured", restates rather than contradicts the "do not infer" and "green deploy ≠ serves" rules. 0 violations.
- **Markdown table well-formedness:** 1 table — 5-col header, 5-cell separator, 7×5 data rows. 0 violations.

### Devil's Advocate

Let me argue this change is broken. First attack: the table is a lie — an agent could have hand-typed plausible byte counts and 200s without ever fetching anything, and a doc reviewer would rubber-stamp it because prose is unfalsifiable. This is the single most dangerous failure mode for a "measurement" story, and it is exactly what this repo's own history warns about (confabulated results that read as measured). I did not trust the prose: I re-ran the probe from scratch and compared every value; they match to the byte, including the oddly specific ones (120847 for joust, 11989 for star-wars) that would be hard to fabricate consistently. So this attack fails — but only because it was tested, not assumed.

Second attack: the 200s prove nothing because the whole point of the warning at hosting.md:143 is that a fallback answers 200 to everything. If these buckets had an SPA-style catch-all, every path would 200 and the "liveness" would be an illusion. I checked the control: nonsense asset and nonsense top-level paths both return a real 404 (identical 27150/28088-byte Cloudflare default) on all seven, so the buckets resolve by exact key — the 200s are meaningful. Attack fails.

Third attack: cross-serving — maybe every host is actually serving one game's build (a misconfigured single origin), so "centipede is live" really means "centipede's hostname serves tempest." I checked: each host returns a distinct `<title>` and a distinct hashed bundle name; centipede's title is Centipede and its bundle is not any other host's. Attack fails.

Fourth attack: the change misleads the teardown operator. Could a confused reader conclude a bucket is safe to delete? No — the conclusion paragraph explicitly states all seven are live rollback targets with "no empty bucket, safe to drop" case, and instructs re-running the probe before the irreversible step. If anything it is more conservative than the pre-existing prose, which had speculated centipede might be bound-but-empty. Fifth attack: staleness. The snapshot could be read months later as current truth. Mitigated by an explicit timestamp and a "re-run before deleting" instruction. Net: the honest residual risk is time-decay of a snapshot, which is inherent to any probe record and is disclosed. No new finding rises to blocking.

### Reviewer (audit)

Design deviation audit — see the `## Design Deviations` stamps below.

**Handoff notes:** verdict APPROVED. This is a doc/ops probe; the adversarial value here was data-integrity verification (done, independently) rather than code analysis. Delivery finding captured for the CLAUDE.md narrative refresh Dev flagged.

## Reviewer Assessment

**Verdict:** APPROVED

**What was reviewed:** an additive measured-results subsection in docs/ops/hosting.md (plus a sprint context file and a 1-line sprint YAML status flip) recording what each of the seven old `<game>.slabgorb.com` hostnames actually serves. No code changed.

**Data flow traced:** the story's "input" is seven live HTTP fetches; the "destination" is the doc table. I traced it by re-running the fetches myself — index.html + the exact recorded hashed asset + a 404 control on all seven hosts — and confirmed the doc is a faithful transcription: every status, title, content-type, and byte count matches to the byte (hosting.md:176-182). Safe because it is verified measurement, not asserted prose.

**Subagent coverage:** 3 enabled specialists all returned clean — preflight (390/390 tests green, tree clean, on origin, 0 smells); [SEC] security found no secret leakage; [RULE] rule-checker found 6 rules / 12 instances / 0 violations (exactly the seven canonical games, well-formed table, measured-not-inferred). 6 specialists disabled via settings. See Subagent Results table; All received: Yes.
- [SEC] no secrets in the diff — CLOUDFLARE_API_TOKEN absent; public hostnames/paths/hashed-asset names only.
- [RULE] docs/ops conventions all satisfied — canonical seven games, correct hostnames, well-formed table, records measured fetches not inferences.

**Pattern observed:** the section correctly refuses the "200 = live" fallacy the runbook warns about, proving real builds three independent ways (distinct title+bundle per host, real Vite JS bodies, 404 control) — hosting.md:184-203.

**Error handling / staleness:** a probe record is point-in-time; the LOW-severity time-decay risk is disclosed with an explicit timestamp (hosting.md:161) and a "re-run before any irreversible delete" instruction (hosting.md:204-208). No Critical/High/Medium findings.

**Blocking findings:** none. One non-blocking Improvement (CLAUDE.md narrative refresh) captured in Delivery Findings for a follow-up story.

**Handoff:** To SM (Ruby Rhod) for finish-story.
---
story_id: "ad1-2"
jira_key: "ad1-2"
epic: "ad1"
workflow: "trivial"
---
# Story ad1-2: battlezone self-play attract demo — drive and duel unattended behind the attract text, then opt in

## Story Details
- **ID:** ad1-2
- **Jira Key:** ad1-2
- **Workflow:** trivial
- **Branch:** none (trunk-based; work lands on main)
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-08-01T21:34:08Z
**Repos:** arcade

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T21:09:24Z | 2026-08-01T21:15:35Z | 6m 11s |
| implement | 2026-08-01T21:15:35Z | 2026-08-01T21:26:31Z | 10m 56s |
| review | 2026-08-01T21:26:31Z | 2026-08-01T21:34:08Z | 7m 37s |
| finish | 2026-08-01T21:34:08Z | - | - |

## Delivery Findings

The story's substantive work already shipped in the bz1-10 era. Measured census:
- plugins/battlezone/src/core/sim.ts:10 — Attract is a SELF-PLAYING demo with full battle step (stepGame calls stepBattle with demoInput autopilot: patrol arc + pot-shots) including stepEnemies AND stepSaucer
- plugins/battlezone/src/main.ts:307-309 — The demo battlefield keeps playing behind the text (attract)
- All 11 battlezone test files mention attract (bz1-10-era coverage)

No upstream findings.

### Dev (implementation)
- **Improvement** (non-blocking): nothing in the repo asserts that a `showcase: true` game actually RENDERS when framed — AC3's "the battlefield moves" was verified by hand, in a browser, and that evidence does not survive into CI. Affects `src/host/registry.test.ts` / `lobby/tests/main.test.ts` (a game could regress to a black or frozen frame and the whole suite would stay green; `just check-showcase` does not close this either — it probes production HTTP status, not liveness of the render). Whether this is worth a story is a judgement call about testing a canvas in CI; raised for routing rather than filed. *Found by Dev during implementation.*
- **Question** (non-blocking): battlezone's `demoInput` autopilot was never compared against the 1980 ROM's actual attract choreography — SM flagged this at setup as an open claim and I did not close it, since this story's ACs are about the opt-in, not fidelity. Affects `plugins/battlezone/src/core/sim.ts` (`demoInput`, the patrol-arc-plus-pot-shots driver, is a plausible invention rather than a cited port). No divergence is claimed and none was measured; the demo now runs in the lobby where it is far more visible, which raises the value of answering it. *Found by Dev during implementation.*

## Design Deviations

No design deviations at setup.

### Dev (implementation)
- **Edited `src/host/registry.test.ts`, a file no AC names**
  - Spec source: context-story-ad1-2.md / session ACs 1-3
  - Spec text: the ACs name exactly two files — `plugins/battlezone/plugin.ts` ("no other manifest field changes") and the regenerated `src/host/registry.ts`
  - Implementation: also updated the guard `keeps the showcase carousel at tempest and centipede` → `…at tempest, battlezone and centipede`, adding battlezone to its expected array and three comment lines giving the reason
  - Rationale: that test pins carousel membership deliberately ("If a game joins or leaves the carousel, it is because someone said so") and was the suite's ONLY failure after the flip — 1 failed of 732 files. It is a guard doing its job, not a regression, so the correct response is to update it with the reason rather than to work around it. Leaving it red would fail the dev-exit gate; changing only the value would leave the next reader without the "someone said so".
  - Severity: minor
  - Forward impact: minor — ad1-1/ad1-3/ad1-4/ad1-5 each flip one more game's `showcase`, and each will redden this same guard. That is intended. The sibling test `lists six games and holds red-baron back deliberately` is the model for ad1-5, which flips `listed` as well.

## Acceptance Criteria

1. plugins/battlezone/plugin.ts sets showcase: true (listed stays true; no other manifest field changes)
2. src/host/registry.ts is regenerated via npm run gen:registry in the same commit, and battlezone's registry entry carries showcase: true
3. Verified in the served lobby that battlezone appears in the showcase carousel and its attract demo visibly drives and duels behind the attract text (the battlefield moves - not a static text page)

## Technical Approach

The story's scope is the flip of one manifest field and registry regeneration:

1. Set showcase: true at plugins/battlezone/plugin.ts:12 (currently false; listed is already true)
2. Regenerate src/host/registry.ts via npm run gen:registry in the same commit
3. Verify in the served lobby that battlezone appears in the showcase carousel and the attract demo visibly drives and duels behind the attract text (the battlefield moves, not a static text page)

All substantive work (the self-play logic) shipped in the bz1-10 era and is verified in the test suite.

## SM Setup Assessment

### The story was repurposed, and why

Filed as 5 points on `tdd` with the title "battlezone self-play attract demo — drive and
duel unattended behind the attract text, then opt in". The measurement below found the
first three clauses of that title already shipped. The user ruled at setup: **repurpose,
5pt → 1pt, `tdd` → `trivial`**, scope reduced to the opt-in. `description` and
`acceptance_criteria` in `sprint/epic-ad1.yaml` were rewritten with the measured facts
before `sm-setup` ran, so the ACs the phase agents read are the current ones.

**The title still asserts the refuted premise** — the user chose repurpose-without-retitle
(same call as jt8-6). A later reader seeing "self-play attract demo" in the story title
should read this section, not the title.

### The measurement: the epic description's battlezone sentence is REFUTED

`sprint/epic-ad1.yaml`'s epic-level description says "star-wars and battlezone show
rotating text pages". For battlezone that is false on the current tree, and it is the
claim the 5-point estimate rested on. Measured:

| Claim in the title/epic | Current tree |
|---|---|
| battlezone shows rotating text pages | `plugins/battlezone/src/core/sim.ts:10` — "Attract is a SELF-PLAYING demo (story AC)" |
| needs a self-play demo built | `stepGame`'s attract branch calls `stepBattle(…, demoInput(state.modeAge), dt, true)` — the same battle step real play uses, with an autopilot driver |
| needs to drive and duel | that step runs `stepEnemies` **and** `stepSaucer`; `demoInput` is a patrol arc plus pot-shots, immortal in demo mode |
| needs to play behind the attract text | `plugins/battlezone/src/main.ts:307-309` — "the demo battlefield keeps playing behind the text (attract)" |

All 11 battlezone test files reference attract (bz1-10-era coverage). The epic description
was most likely pattern-matched from star-wars, which genuinely does show text pages —
`ad1-1` is unaffected by this correction and its premise still stands as filed.

The epic YAML's own description still carries the false sentence; this session is the
record of which came first. Not edited, because it is the epic's text about seven games
and only the battlezone clause is wrong.

### Remaining scope, and the exact expected diff

1. `plugins/battlezone/plugin.ts:12` — `showcase: false` → `true`. `listed` is already
   `true`, so nothing else in the manifest moves.
2. `npm run gen:registry` in the **same commit** — `src/host/registry.ts:54` is the
   generated mirror and currently reads `showcase: false`.
3. AC3's served-lobby verification (see the hazard below).

`lobby/src/core/showcase.ts` `createShowcase` keeps entries with `showcase: true`, and
`lobby/src/main.ts:37` hands it `LISTED_GAMES` — so `listed: true` plus `showcase: true`
is the whole entry condition. There is no third registration.

### ⚠ Hazard for AC3, measured just now: port 5270 is served by a SIBLING checkout

```
lsof -ti tcp:5270      → pid 61585
lsof -a -p 61585 -d cwd → n/Users/slabgorb/Projects/a-2
```

`just serve` here will fail on `strictPort`, and a screenshot of
`http://127.0.0.1:5270/` shows **a-2's tree**, which does not carry this flip. A carousel
without battlezone on that port would be a true observation about the wrong working copy.
a-2 is live (it landed `uf1-13` at `020e637` minutes ago). Serve this tree elsewhere:

```bash
npx vite --port 5290 --strictPort
```

Do not kill a-2's server.

### Not the AC3 check: `just check-showcase`

`uf1-13` shipped this recipe and `docs/ops/hosting.md:296-330` documents it. It probes the
**production** per-game subdomains for HTTP 200 and measures nothing about the carousel's
contents or whether a demo moves. It is the right tool after a release and the wrong tool
for AC3.

### Handed over as a claim to verify, not as a finding

SM did **not** compare `demoInput`'s choreography against the 1980 ROM's actual attract
behaviour. No divergence is claimed and none was measured. This epic asks that a self-play
demo exist, not that it be choreography-accurate, so a mismatch found here would be a new
finding to file rather than a blocker on this story. Flagged because the story's title
invites the question and someone will otherwise re-open it.

### Board state

`status: in_progress`, `started: 2026-08-01`. Claim commit `d5e0754` pushed to `origin/main`
(epic stamp + context file); claim branch `feat/ad1-2-battlezone-showcase-opt-in` pushed
empty, `git rev-list --count origin/main..origin/feat/…` = 0. Sibling probes at setup: no
`ad1` branches on origin; the only live session across `a-*` was a-2's `uf1-13`, which has
since finished. All three ACs verified byte-identical against `sprint/epic-ad1.yaml` in
both this file and the context file by a `python3` `in` test, not by grep.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/battlezone/plugin.ts` — `showcase: false` → `true` (AC1). `listed` untouched; no other manifest field moved.
- `src/host/registry.ts` — regenerated by `npm run gen:registry`, same commit (AC2). One line: battlezone's `showcase`.
- `src/host/registry.test.ts` — the carousel-membership guard, updated with its reason (logged as a deviation).

**Tests:** 11067/11067 vitest passing across 732 files, 1 todo; 359/359 orchestrator; `npm run lint` (`tsc --noEmit`) clean.

**Landed on:** `main` at `e407025`, pushed. Trunk-based — no branch, no PR. (This label is deliberately not the Branch token: the finish parser scrapes that token by pattern anywhere in the file, so the only occurrence is the field in Story Details, per the jt8-3 gotcha.)

### The one failure, and why it was the point

The flip reddened exactly one test of 11068 — `src/host/registry.test.ts`'s
`keeps the showcase carousel at tempest and centipede`, whose own comment says
"showcase is required and never defaulted precisely so this set cannot change by omission.
If a game joins or leaves the carousel, it is because someone said so." It is a guard that
exists to catch this edit, so it reddening is the mechanism working. Updated to name
battlezone and to record *why* it joined; a value-only edit would have left the next reader
with an unexplained membership change. `lobby/tests/registry.test.ts` was checked and needed
nothing — it asserts only that every game carries a boolean `showcase`, not who is in the set.

### AC3 evidence (the part that does not survive into CI)

Served **this** tree on `:5290` — `:5270` is a-2's checkout, exactly as SM's setup hazard
warned, and it was left running. Confirmed the server's identity before trusting anything:
`lsof -a -p <pid> -d cwd` → `/Users/slabgorb/Projects/a-1`.

- **In the carousel:** the pane's iframe reached `src="/battlezone/"` on the second slide
  (`SLIDE_MS` = 20 s), labelled `NOW SHOWING · BATTLEZONE`.
- **The battlefield moves:** ten canvas samples at 250 ms intervals, counting lit pixels in
  two horizontal bands. Upper band: **10 distinct values of 10** (spread 1183). Lower band:
  9 of 10 (spread 3877, 1471→5348). Continuous change in both — not a static text page.
- **Behind the attract text, and duelling:** the captured frame shows `BATTLEZONE` /
  `PRESS START` drawn over a live scene — enemy tank at left, obstacle pyramids, horizon,
  and a radar blip tracking the hostile. Screenshot kept out of the tree (scratchpad only);
  `.playwright-mcp/` is gitignored and the working tree is clean.

Two rebases during the push (siblings claimed sw8-21 and mg1-5); both were sprint-tracking
commits touching no source, and the orchestrator suite plus the registry test were re-run on
the merged tree rather than assuming green-before-rebase carried.

**Handoff:** To review — The Argument Professional.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all mechanical checks pass; its idempotency result is load-bearing for AC2 |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | N/A | Disabled via settings — domain assessed inline |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | N/A | Disabled via settings — domain assessed inline |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | N/A | Disabled via settings — replaced by the 4-mutation battery below |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | N/A | Disabled via settings — the diff's new comment claims were sourced by hand |
| 6 | reviewer-type-design | Yes | Skipped | disabled | N/A | Disabled via settings — no type surface in the diff |
| 7 | reviewer-security | Yes | Skipped | disabled | N/A | Disabled via settings — domain assessed inline (iframe sandboxing) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | N/A | Disabled via settings — 3-file diff, nothing to simplify |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | N/A | Disabled via settings — rules enumerated inline below |

**All received:** Yes (1 enabled specialist returned; 8 disabled via `workflow.reviewer_subagents` and pre-filled)
**Total findings:** 0 confirmed blocking, 1 self-raised lead REFUTED by my own measurement, 3 routed to finish

`pf settings get workflow.reviewer_subagents` reports `preflight: true` and the other eight `false`.
Per the jt5-5 precedent, with the specialists off a **mutation battery is the review** — that is the
substantive work below, not a substitute for it.

## Reviewer Assessment

**Verdict:** APPROVED

### Mutation battery — the guards can actually fail

Four mutations against committed source, each anchored on a substring whose occurrence count was
asserted at 1 before applying (a mutation that fails to apply looks exactly like one that was
caught, and would score the suite as safer than it is). Source restored afterwards; tree verified.

| Mutation | Result | What it proves |
|---|---|---|
| M1 — edit `plugin.ts` to `showcase: false`, skip the regen | **CAUGHT** | `tests/registry.test.mjs` flags the committed registry stale. AC2's "same commit" is machine-enforced, not a convention. |
| M2 — edit the generated `registry.ts`, leave the manifest | **CAUGHT** | The same guard fires from the other direction — a hand-edited registry cannot survive. |
| M3 — drop `'battlezone'` from the updated expectation | **CAUGHT** | The guard Dev edited is non-vacuous. |
| M4 — battlezone leaves the carousel *consistently* (both files agree on `false`) | **CAUGHT** | The one that matters. A consistent opt-out sails past the drift guard — only the membership guard in `src/host/registry.test.ts` sees it. That is precisely why updating that test was correct and deleting or loosening it would have been a real regression. |

### Observations

- `[VERIFIED]` **AC1** — `plugins/battlezone/plugin.ts:12` is the only manifest line touched; `listed: true` is unchanged at line 11. The AC's "no other manifest field changes" holds on the diff literally (1 insertion, 1 deletion in that file).
- `[VERIFIED]` **AC2** — `src/host/registry.ts:54` carries `showcase: true`, and preflight independently re-ran `npm run gen:registry` on the committed tree and found `git status` unchanged. The committed file *is* what the generator produces; it was not hand-edited.
- `[VERIFIED]` **AC3** — Dev's evidence is a real measurement, not an impression: iframe `src="/battlezone/"`, and ten canvas samples at 250 ms giving 10 distinct lit-pixel counts in the upper band. A static text page cannot produce that series.
- `[VERIFIED]` **Dev's comment provenance is sourced, not asserted.** The new comment claims battlezone "has self-played since the bz1-10 era". `sprint/archive/bz1-10-session.md:314` lists `sim.ts` as new in that story with a "deterministic demo autopilot (pure function of the demo clock)", and its line 42 names a framing test for a "self-playing deterministic demo". The claim is true and checkable — this project's recurring defect class (a plausible sentence in a comment shipping green) does not apply here.
- `[VERIFIED]` **No audio hazard from putting a game with a firing autopilot in the lobby.** `lobby/src/shell/showcase.ts:98` sets `allow="autoplay 'none'"` on the frame, with a comment recording that `allow=''` was measured as insufficient because a same-origin frame matches autoplay's default `self` allowlist. Independently, battlezone's own gate only opens on `pointerdown`/`keydown` **inside the framed document** (`plugins/battlezone/src/main.ts:104-108`), and the frame is `aria-hidden` + `tabindex="-1"`. Two independent reasons the carousel stays silent.
- `[VERIFIED]` **No concurrent simulations.** `lobby/src/shell/showcase.ts:8` — "Exactly one iframe, ever. Each slide REPLACES the frame element." Adding a third carousel member does not add a third running game.
- `[VERIFIED]` **The carousel will not frame a dead path in production.** `https://arcade.slabgorb.com/battlezone/` answers `200` (as do `/tempest/` and `/centipede/`), and `battlezone-v1.0.7` was tagged 2026-08-01, well after the 2026-07-30 collapse — so battlezone has deployed to the single origin under its own key prefix since the migration.
- `[VERIFIED]` **No hardcoded two-game assumption in the lobby.** `lobby/tests/main.test.ts:156` derives its expectation from `LISTED_GAMES.filter(g => g.showcase)` rather than a literal, so it adapts to the third member instead of silently encoding the old set.
- `[LOW]` **The change is inert in production until the lobby is released.** `lobby/src/main.ts:6` imports `LISTED_GAMES` from `@host/registry` as a static build-time import, so the live carousel changes only when a `lobby-vX.Y.Z` tag ships. The lobby is at `v0.0.26` (released 14:03 today); both this work and the sibling's completed `uf1-13` (17:08) landed after it. **Not a defect and not this story's to fix** — `CLAUDE.md` is explicit that apps ship one at a time by release, and the ACs scope AC3 to the *served* lobby. Recorded so nobody reads a correct, merged, unreleased change as a broken one.

### A lead I raised and then refuted — recorded so it is not re-derived

I suspected battlezone would import a per-frame GPU cost into the lobby: `plugins/battlezone/src/shell/render.ts` sets `ctx.shadowBlur = 8` at five sites, while `plugins/tempest/src/shell/render.ts` has zero non-zero assignments — and tempest is the game whose live-`shadowBlur` cost was measured and removed by tp1-40.

**The comparison was invalid and the finding collapses.** `src/shared/glow.ts:4-5` describes itself as a set-`shadowBlur`-draw-reset envelope — the shared primitive uses `shadowBlur` internally — and `plugins/tempest/src/shell/render.ts` calls `withGlow`/`glowPolyline` 20 times. Tempest's zero count means it *delegates* the blur, not that it avoids it. battlezone reaches the same primitive through `plugins/battlezone/src/shell/glow.ts` (an SH2-8 re-export of `@shared/glow`). Both games pay for `shadowBlur`; neither is the outlier. I did not measure either game's actual frame cost and am asserting no performance defect.

### Rule Compliance

- **Generated files are regenerated, never hand-edited** (`CLAUDE.md` — `src/host/registry.ts` is the GENERATED registry, `npm run gen:registry`): **compliant**, and proven rather than assumed — preflight's idempotency re-run plus mutations M1/M2.
- **The core/shell boundary** (`CLAUDE.md`: the single most important rule in every game): **not engaged** — the diff touches a manifest, a generated registry and a test. No file under any `src/core/` or `src/shell/` changed, so no purity scanner is in scope.
- **Registration completeness for carousel membership**: the epic warns that post-migration a tile can no longer be opted in from the lobby side. Enumerated the full condition — `lobby/src/core/showcase.ts` `createShowcase` keeps `showcase: true`, `lobby/src/main.ts:37` passes `LISTED_GAMES`, so `listed && showcase` is the whole gate. Both hold. There is no third registration and none was missed.
- **`justfile` `games` list / `vitest.config.ts` `GAMES`** (`CLAUDE.md`'s three registrations): **not applicable** — those are for *adding* a game; battlezone was already present in both.
- **Trunk-based, commit straight to `main`** (`CLAUDE.md` Git Workflow): compliant — `e407025` on `main`, no branch, no PR.

### Devil's Advocate

Assume this is broken. The most dangerous property of this change is that it is two `false`→`true` flips, which feels too small to hurt — and small diffs are where reviewers stop looking. So: what does it actually do? It takes a 3D battle simulation that was previously reachable only by a visitor who deliberately navigated to it, and runs it, unattended, inside the front page of the arcade, for twenty seconds out of every sixty, forever. That is a category change in exposure, not a config tweak, and the ACs do not ask anyone to think about it.

What could go wrong there? Noise is the first thing a visitor would notice and the worst thing to ship — a lobby that starts firing a tank cannon at whoever opens it. The autopilot genuinely does fire (`demoInput`'s `fire: Math.sin(t * 1.7) > 0.93`) and `main.ts:166` calls `playEventSounds` unconditionally, gated on mode for *continuous* sound only. So the cue path is live in attract by construction. It is saved by the frame's `allow="autoplay 'none'"` and by the gesture gate living inside the framed document — two independent barriers, one of which the lobby authors had to measure to get right. If either regressed, the suite would stay green and the arcade would start shouting. Nothing in this repo asserts the lobby is quiet.

Next: resource churn. The frame is replaced every twenty seconds, so battlezone cold-boots roughly 180 times an hour on an idle lobby, each boot constructing an `AudioContext` at module scope. They are torn down with the document and the contexts never start, and tempest and centipede have done exactly this since uf1-6 — but nobody has left the lobby open for a day to find out.

And the confused-user reading: the pane shows a live game with `PRESS START` on it, inside a page where pressing start does nothing, because the frame is `tabindex="-1"` and inert by design. That is mildly dishonest UI, inherited from the carousel rather than introduced here, and the "Play BATTLEZONE" link laid over it is the intended answer.

None of this rises to blocking. The two barriers are real and independently sufficient, the churn is precedented by two games, and the ACs are met. But the honest summary is that the story's risk lives entirely outside its diff, and the tests that would catch a regression in that risk do not exist — which is exactly what Dev's first delivery finding says.

### Dev's delivery findings — assessed

1. **"Nothing asserts a `showcase: true` game actually renders"** — **CONFIRMED and worth routing.** My devil's advocate arrived at the same hole from the audio side: the properties keeping the lobby safe and honest (it renders, it stays quiet) are guarded by nothing, and AC3's evidence dies with this session. Not blocking — it is pre-existing and epic-wide, not introduced here. Routed to SM at finish.
2. **"`demoInput` was never compared against the 1980 ROM's attract choreography"** — **CONFIRMED as an open question, correctly not closed here.** SM raised it at setup as a claim rather than a finding, Dev declined to assert a divergence, and I measured none either. Its value genuinely rose with this change (the demo is now on the front page). Routed to SM.
3. **The deviation** (editing `src/host/registry.test.ts`, a file no AC names) — **correct call, and M4 is the proof.** Its forward-impact note is accurate: ad1-1/ad1-3/ad1-4/ad1-5 will each redden this same guard, which is the guard working.

### Verdict rationale

Three ACs, each independently verified rather than taken from the assessment. Four mutations, four caught, including the one that distinguishes a real guard from a decorative one. No Critical or High. The single lead I generated was refuted by my own measurement before it reached this verdict, and is recorded as refuted so the next reader does not spend the same hour.

**Verdict:** APPROVED
## Impact Summary

**ad1-2 — battlezone joins the lobby showcase carousel. Shipped `e407025` on `main`, approved round 1.**

The story arrived as a 5-point `tdd` build and shipped as a 1-point `trivial` flip, because its
premise was measured at setup and found stale: battlezone's attract mode has self-played since
bz1-10 — `stepGame`'s attract branch runs the same `stepBattle` real play uses, driven by the
`demoInput` autopilot, through `stepEnemies` and `stepSaucer`, with `main.ts` already drawing the
attract text over the live battlefield. Three of the four clauses in the story's own title were
already true. The user ruled repurpose-without-retitle, so **the board still advertises a build that
was not needed** — a later reader should trust this session over the title.

**What shipped** — three files, two of them one line each:
- `plugins/battlezone/plugin.ts:12` — `showcase: false` → `true`. `listed` untouched.
- `src/host/registry.ts:54` — the generated mirror, regenerated in the same commit.
- `src/host/registry.test.ts` — the carousel-membership guard, updated to name battlezone *and why*.

**Verification, in descending order of how much it was worth:**
- **Four mutations, four caught.** The decisive one (M4): a *consistent* opt-out — manifest and
  generated registry both back to `false` — sails past the stale-registry drift guard and is caught
  only by the membership guard in `src/host/registry.test.ts`. That is the proof that editing that
  test was correct and that loosening it would have been a real regression.
- **AC2 proven, not asserted:** `npm run gen:registry` re-run on the committed tree produced no diff,
  so the committed registry is what the generator emits rather than something hand-edited.
- **AC3 measured:** ten canvas samples at 250 ms gave ten distinct lit-pixel counts in the upper band
  (nine of ten below) while `BATTLEZONE` / `PRESS START` was up — a static text page cannot do that.
- 11067 vitest across 732 files, 359 orchestrator, `tsc --noEmit` clean, re-run after two rebases.

**Two risks checked and cleared, both outside the diff.** Framing a game whose autopilot *fires* could
have made the arcade's front page play gunfire: it does not, for two independent reasons — the lobby
sets `allow="autoplay 'none'"` on the frame (having measured that `allow=''` is insufficient), and
battlezone's own audio gate opens only on a gesture inside the framed document, which is `aria-hidden`
and `tabindex="-1"`. And only one game runs at a time: `lobby/src/shell/showcase.ts:8` — "Exactly one
iframe, ever."

**One lead raised and refuted before it reached the verdict**, recorded so it is not re-derived: that
battlezone imports live `shadowBlur` cost into the lobby where tempest does not. `src/shared/glow.ts`
is itself a set-blur-draw-reset envelope and tempest calls it 20 times, so tempest's zero raw-assignment
count means delegation, not avoidance. Both games pay it. No performance defect is claimed; neither
game's frame cost was measured.

**Findings routed — both filed, neither deferred to a note:**
- **`uf1-20`** (3pt, epic uf1, p2) — every showcase guard asserts membership or wiring; none asserts
  the framed game is *alive*. AC3's evidence was manual and dies with this session, and the surface
  grows with every remaining ad1 story. Explicitly NOT owned by uf1-19, which pins jsdom test-apparatus
  guards and cannot observe a canvas; the description says so, so nobody re-routes it there.
- **`ad1-7`** (3pt, epic ad1, p3) — `demoInput`'s trigonometric choreography cites no ROM routine in a
  game where epic bz3 pinned everything else to primary source. **No divergence is claimed by anyone**;
  what changed is that ad1-2 put this demo on the front page, where for many visitors it will be the
  only battlezone they watch. A cited "we chose differently, here is why" is an acceptable outcome.

**Not a defect, but true:** this change is inert in production until the lobby is released. The
registry is a build-time import in `lobby/src/main.ts:6`, the lobby is at `v0.0.26` (released 14:03
today), and both this work and the sibling's finished `uf1-13` landed after it. `CLAUDE.md` is explicit
that apps ship by release, one at a time, so this is the house pattern rather than a missed step.

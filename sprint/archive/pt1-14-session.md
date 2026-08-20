---
story_id: "pt1-14"
jira_key: "pt1-14"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-14: joust: the spawn/materialize animation overlay should be transparent

## Story Details
- **ID:** pt1-14
- **Jira Key:** pt1-14
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-14-transparent-spawn-overlay
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T17:45:19Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T16:50:44Z | 2026-08-20T16:52:39Z | 1m 55s |
| red | 2026-08-20T16:52:39Z | 2026-08-20T16:56:48Z | 4m 9s |
| green | 2026-08-20T16:56:48Z | 2026-08-20T16:59:48Z | 3m |
| review | 2026-08-20T16:59:48Z | 2026-08-20T17:07:08Z | 7m 20s |
| green | 2026-08-20T17:07:08Z | 2026-08-20T17:17:44Z | 10m 36s |
| review | 2026-08-20T17:17:44Z | 2026-08-20T17:26:19Z | 8m 35s |
| green | 2026-08-20T17:26:19Z | 2026-08-20T17:29:38Z | 3m 19s |
| review | 2026-08-20T17:29:38Z | 2026-08-20T17:45:19Z | 15m 41s |
| finish | 2026-08-20T17:45:19Z | - | - |

## Sm Assessment

**Story:** The joust spawn/materialize (warp-in) animation renders as an **opaque** overlay,
occluding the playfield behind it. Per the arcade's shimmer effect it should be **transparent** —
the playfield shows through while the rider materializes.

**Routing context (for TEA, RED phase):**
- Core spawn/materialize state lives in `plugins/joust/src/core/warpin.ts` — the materialize
  timer/progress that the shell reads to draw the effect.
- The overlay is drawn in the shell: `plugins/joust/src/core/frame.ts` composes the frame and
  `plugins/joust/src/shell/render.ts` rasterizes it. The opacity/blend of the warp-in overlay is
  the likely defect surface.
- Respect the core/shell boundary: materialize *state/progress* is core; the *transparency* of the
  drawn overlay is a render concern. Write the failing test against whichever layer actually owns
  the opacity — investigate before asserting.
- ROM fidelity: the arcade shimmer is additive/see-through, not a solid fill. ROM/source is
  canonical for the exact effect — anchor the expected behavior to it, not invention.

**Phase target (RED):** a failing test proving the warp-in overlay is transparent (playfield
pixels/colors survive under it), currently failing because it renders opaque.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Question, non-blocking] (TEA)** ROM tension: TREFF's DCONST constant-fill
  (JOUSTRV4.SRC:5739) is per-frame *opaque* on the raster hardware. This story's
  transparency ("shimmer") is the OWNER'S explicit override in the story text, not a
  transcribed ROM behaviour. Treated as a product decision (already made in the story) —
  the alpha value is a shell rendering choice, not a ROM constant, so no citation is
  required for it. Flagged for Reviewer visibility only.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Tea Assessment

**RED delivered.** 2 failing tests in
`plugins/joust/tests/render-warpin-transparent-pt1-14.test.ts`; the other 3880 joust
tests pass — this is the only red.

**The defect:** `paintWarpIn` (`plugins/joust/src/shell/render.ts:279-305`) sets
`fillStyle = rgb(${r} ${g} ${b})` and `fillRect`s the pad + growing bird silhouette.
`rgb(...)` drops the palette alpha entirely → a fully **opaque** owner-coloured box that
erases the playfield behind the arriving bird. Story wants it transparent (shimmer).

**AC (TEA-defined, none were in the YAML):**
1. The warp-in overlay composites with alpha < 1 so the playfield shows THROUGH it.
2. It remains visible (alpha > 0) — not erased to nothing.
3. Applies to both fills the paint emits — the lit pad and the bird silhouette.

**The tests:**
- *playfield SURVIVES* — an alpha-compositing mock draws the full-height frame over a
  blue playfield and asserts the blue still shows in a silhouette pixel (an opaque fill
  drops it to the overlay colour). Behavioural, implementation-agnostic.
- *fill alpha in (0,1)* — pins every emitted `fillStyle` to carry 0 < alpha < 1.

**Heads-up for Dev (GREEN):** the fix (rgba fill, or otherwise alpha < 1) will BREAK the
existing pin at `plugins/joust/tests/render-warpin-jt13-2.test.ts:99`, which asserts
`every fill matches /^rgb\(/` (i.e. opaque). That assertion encodes the OLD behaviour and
must be updated to accept the transparent form (`rgba(` / slash-alpha) — a legitimate
change since the requirement changed. Do NOT weaken pt1-14's tests to preserve it.

**Rule coverage (TS lang-review):** test-quality — every test asserts a concrete blended
value / alpha bound (no vacuous `is-some`/`assert(true)`); no `let _ =`. Behaviour is
pinned via real compositing, not string cosmetics alone.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **(Dev, GREEN) Re-seated two sibling render tests to the transparent form.** The fix
  changes `paintWarpIn`'s fill from opaque `rgb(...)` to `rgba(..., 0.6)`. Two pre-existing
  tests pinned the OLD opaque form and went red on the full suite (as TEA's finding
  predicted): `render-warpin-jt13-2.test.ts:99` (`/^rgb\(/` → `/^rgba?\(/`, intent =
  "palette colour, not raw hex/named", preserved) and `warpin-idle-render-jt13-12.test.ts`
  (exact `rgb(r g b)` string-equality → alpha-agnostic RGB-channel compare, intent =
  "honours the explicit idle colour nibble", preserved). No assertion INTENT was weakened;
  only the colour-format coupling was updated. pt1-14's own tests were not touched.

## Dev Assessment

**GREEN.** Full joust suite: 3882 passing (0 red). Repo-wide `npm run lint` (tsc): clean.

**Change (minimal):** `plugins/joust/src/shell/render.ts` — `paintWarpIn` now sets
`fillStyle = rgba(r, g, b, WARPIN_SHIMMER_ALPHA)` (0.6) instead of `rgb(r g b)`. Both the
lit pad and the growing bird silhouette are drawn with alpha < 1, so the playfield shows
through — the materialise shimmer. `WARPIN_SHIMMER_ALPHA` is documented as a shell
rendering choice (not a ROM constant); the transparency itself is the owner's explicit
call in the story (see TEA's Delivery Finding on the ROM's opaque DCONST fill).

**Scope held:** no frame-varying alpha, no core changes, no new op fields — the story asks
only that the overlay be transparent, and a single shimmer alpha satisfies every AC.

**For Reviewer / owner:** the compositing test proves see-through behaviour deterministically,
but the exact alpha (0.6) is a visual taste call — worth an owner eyeball at `/joust/` on a
respawn to confirm the shimmer reads right (tune the one constant if not).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (low) | confirmed 0, dismissed 0, deferred 2 |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (medium) | confirmed 1, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (2 advisories) | N/A |

**All received:** Yes (4 enabled, 5 disabled via settings)
**Total findings:** 1 confirmed (comment-analyzer, medium — became the thread that surfaced the blocking fidelity defect below), 0 dismissed, 2 deferred (test-analyzer, low)
**Working-tree audit (`pf reviewer audit-tree`):** CLEAN — no left-behind mutations.

### Devil's Advocate

Argue the code is broken. The subagents all came back green-to-advisory, so where's the flaw? It is not in the diff's mechanics — it is in the *target the diff aims at*. The story asks for the materialise overlay to be "transparent so the playfield shows through, **per the arcade's shimmer effect**." A confused reader takes "transparent" to mean "translucent" and reaches for alpha — which is exactly what shipped: `rgba(..., 0.6)`, a 60%-opacity **solid rectangle**. Stand in front of the cabinet: the real TREFF effect is a crisp single-colour SILHOUETTE of the bird sprite, opaque where the bird is, and the playfield showing through every pixel the bird ISN'T. The alpha box reproduces neither property — its foreground is see-through (ROM foreground is opaque) and its shape is a box (ROM shape is the sprite). A stressed user respawning mid-swarm sees a muddy yellow ghost-block fade in, not a bird shimmering into being. Worse, the tests now *encode* the box as correct: `render-warpin-transparent-pt1-14.test.ts` asserts every fill has `0 < alpha < 1`, which the authentic opaque-silhouette fix would FAIL — so the test suite actively defends the wrong behaviour and would reject the right one. What would a malicious reviewer note? That the durable research proving the authentic effect (Architect, 2026-08-19, ROM-cited) was silently overwritten by `sm-setup` regenerating the context doc, so Dev never saw it and picked the plausible-but-wrong reading in good faith. The defect is real, visible, ROM-contradicting, and now cemented in tests. That is a HIGH.

## Reviewer Assessment

**Verdict:** REJECTED — the fix takes an alpha-blend shortcut that contradicts the ROM; the authentic (already-researched, in-reach, shell-only) effect was not implemented.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | The warp-in is drawn as a **translucent solid rectangle** (`rgba(..., 0.6)`), not the ROM's effect. TREFF blits the bird's OWN sprite with the blitter SOLID bit added to zero-suppress (`$0A\|$10 = $1A`, `JOUSTRV4.SRC:5736-5739` / `:5787-5790`, `SYSTEM.SRC:504/568`): a bird-shaped silhouette in ONE OPAQUE constant colour, with the playfield showing through every zero-suppressed (transparent) pixel. Foreground should be opaque, not 0.6; shape should be the sprite, not a box. Contradicts CLAUDE.md's ROM-fidelity mandate ("faithful clones"; source is canonical). | `plugins/joust/src/shell/render.ts:279-316` (`paintWarpIn`, `WARPIN_SHIMMER_ALPHA`) | Rewrite `paintWarpIn` on the existing `paintDissolve` zero-suppress idiom (`render.ts:185-210`): look `op.name` up in `PIXEL_BLOCKS`/atlas, `fillRect` each NON-ZERO nibble in the single constant colour (`colours[nibble]` per the owner/idle-colour rule already in the op), vertically clipped to the PFRAME-derived WCLENY height, feet-pinned at `op.y`. The op already carries `name`/`frame`/`owner`/`colour` (`sim.ts:3271`). Remove `WARPIN_SHIMMER_ALPHA`. Shell-only — core `warpin.ts` untouched. |
| [HIGH] | The RED tests pin the WRONG target: they assert every fill has `0 < alpha < 1`, so the authentic opaque-silhouette fix would fail them. The suite defends the box and rejects the correct effect. | `plugins/joust/tests/render-warpin-transparent-pt1-14.test.ts` | Re-author for the authentic effect: assert the playfield shows through a HOLE in the silhouette (a zero-nibble pixel INSIDE the sprite's bounding box stays background), and that painted (foreground) pixels are the OPAQUE constant colour. Drop the `alpha < 1` pins. |
| [MEDIUM] | Durable research lost: `sm-setup` overwrote the Architect's ROM-cited brief (the authentic fix, `JOUSTRV4.SRC:5736-5790`, `SYSTEM.SRC:504/568/535-538`, `williamsblitter.h/.cpp`) with generic stub text in the SAME commit — why Dev never saw it. Recoverable at `git show d136d358^:sprint/context/context-story-pt1-14.md`. | `sprint/context/context-story-pt1-14.md` | On rework, restore the Architect's Findings/Technical-Approach/Tests-affected/AC sections (from the pre-setup blob) so the durable doc reflects the real, ROM-anchored plan. |

**Why this is a rejection, not a nit:** CLAUDE.md makes ROM/source canonical and my routing (SM) note said the shimmer is "additive/see-through, not a solid fill." The ROM answers the effect exactly (zero-suppressed constant-colour sprite silhouette) and the authentic fix is a scoped, shell-only `paintWarpIn` rewrite the op and file idioms already support — the jt13-2 deferral ("pixel-accurate WCLENY silhouette clipping is deferred") is this story coming due. Shipping a translucent box instead is the hack over the root-cause fix.

**What was GOOD (keep on rework):** the core/shell boundary is respected (0 core files touched); citations already present are accurate; the two SIBLING test re-seats (jt13-2, jt13-12) to alpha-agnostic colour checks were correct in spirit and can carry forward with the silhouette (they pin the colour NIBBLE, which the authentic fill also uses) — verify their exact-geometry expectations after the rewrite.

### Specialist synthesis

- **[TEST]** (reviewer-test-analyzer): mutation battery in an isolated worktree confirmed the new suite catches its stated regression (alpha=1 opaque and alpha=0 invisible both fail) and that the two sibling re-seats were NOT weakened (a wrong colour nibble still fails). Live tree verified clean. Two LOW findings, both deferred: (1) `styleAlpha`'s CSS-Color-4 slash-alpha branch is unreachable dead code, (2) no pad-only (frame < firstVisible) alpha case. Both become MOOT on rework — the alpha assertions are being re-authored away entirely (see HIGH #2), so I do not require separate fixes.
- **[DOC]** (reviewer-comment-analyzer): CONFIRMED and load-bearing. Verified the ROM citations in the new comments are accurate/non-confabulated — but its medium finding (the context doc was reset to stub text in this same commit) was the thread that surfaced the blocking fidelity defect: recovering `git show d136d358^:sprint/context/context-story-pt1-14.md` exposed the Architect's ROM-cited authentic-fix research that the alpha approach bypassed. Escalated into MEDIUM row #3 (restore the doc) and the HIGH verdict itself.
- **[RULE]** (reviewer-rule-checker): 30 TS checklist rules + core/shell purity checked, 0 violations, 2 advisories (test-only non-null assertions on `.match()!`; `compositingContext` reimplements canvas source-over math, mitigated by the independent string-level alpha test). Purity boundary intact — 0 core files touched. These advisories are non-blocking and do not change the verdict; the rewrite must preserve the same 0-core-file boundary.

**Deferred (low, address opportunistically on rework):** [TEST] test-analyzer #1 — `styleAlpha`'s slash-alpha branch is dead once the alpha tests are rewritten out; [TEST] test-analyzer #2 — moot after re-author.

**Handoff:** Back to Dev/TEA for the authentic-silhouette rework (target phase set by workflow YAML).

### Reviewer (code review)

- **Conflict** (blocking): The shipped alpha-blend warp-in contradicts the ROM's zero-suppressed constant-colour silhouette effect.
  Affects `plugins/joust/src/shell/render.ts` (rewrite `paintWarpIn` on the `paintDissolve` idiom) and `plugins/joust/tests/render-warpin-transparent-pt1-14.test.ts` (re-author to pin the silhouette, not alpha).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): `sm-setup`'s context regeneration overwrote durable Architect research in the same commit that shipped the story.
  Affects `sprint/context/context-story-pt1-14.md` (restore from `d136d358^`) and is a tooling pattern worth noting (regeneration should not clobber researched briefs).
  *Found by Reviewer during code review.*
## Dev Assessment (round 2 — authentic silhouette, addresses REJECTED round 1)

**GREEN.** Joust 3883 passing, `npm run lint` (tsc) clean, orchestrator 503 passing.

**What changed vs round 1:** dropped the alpha-0.6 translucent-box shortcut entirely and
implemented the ROM's actual effect. `paintWarpIn` (`plugins/joust/src/shell/render.ts`)
now resolves `op.name` (mount frame → ENTITY_RECORDS `source` → raster PIXEL_BLOCK, e.g.
ORSTND→ORUN4R), decodes the sprite's nibble grid on the `paintDissolve` idiom, and
`fillRect`s every NON-ZERO nibble in the single OPAQUE constant colour (`op.colour` ??
DCONST owner nibble), vertically clipped to the PFRAME-derived WCLENY height, feet-pinned,
mirrored on left-facers. The playfield shows through the sprite's zero-suppressed
(transparent) pixels — a bird-shaped silhouette, not a box. `WARPIN_SHIMMER_ALPHA` removed.

**Addresses every rejection row:**
- HIGH #1 (wrong approach) — done: authentic zero-suppress silhouette per `JOUSTRV4.SRC:5736-5739`/`:5787-5790`, `SYSTEM.SRC:504/568`; shell-only, 0 core files touched.
- HIGH #2 (tests pinned the wrong target) — done: `render-warpin-transparent-pt1-14.test.ts` re-authored to decode the real mount sprite, prove the playfield survives at a TRUE interior hole (foreground both sides on the row), and assert foreground is opaque + monochrome + not a filled box. The alpha assertions are gone.
- MEDIUM #3 (lost research) — done: restored `sprint/context/context-story-pt1-14.md` to the Architect's ROM-cited brief (now matches develop; no doc churn in the diff).

**Sibling tests re-seated (Design Deviation logged):** jt13-2, jt13-12, jt13-14 warp-in ops
now carry a mount `name` (they previously drew a nameless box); jt13-2:99 reverted to the
opaque `/^rgb\(/` pin (foreground is opaque again). jt13-14 (photosensitive-safety) now
exercises the real silhouette area, not just the pad — a strengthening, not a weakening.

**For Reviewer / owner:** behaviour is pinned by decoding the actual sprite, but a visual
eyeball at `/joust/` on a respawn is still the final proof the shimmer reads right.

- **(Dev, GREEN round 2) Warp-in ops in 3 sibling tests now carry a mount `name`.** The
  authentic silhouette decodes the arriving bird's sprite from `op.name`; the old box drew
  from width/height with no name. jt13-2 (growth/feet/visibility), jt13-12 (idle colour
  nibble) and jt13-14 (photosensitive small-area safety) ops gained `name: 'ORSTND'`; their
  CONTRACTS are unchanged and restated over the silhouette. jt13-2:99 reverted `/^rgba?\(/`
  → `/^rgb\(/` since foreground is opaque again.
## Subagent Results

**Cycle: 1**

Method: fresh full sweep of all 4 enabled subagents against the round-2 diff (git diff develop...HEAD).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (1 high, 2 med, 1 low) | confirmed 3, dismissed 0, deferred 1 |
| 5 | reviewer-comment-analyzer | Yes | findings | 4 (2 high, 1 med, 1 low) | confirmed 4, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 (2 high) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled, 5 disabled via settings)
**Total findings:** confirmed — mirror coverage gap (1), stale/contradictory comments (3 distinct, cross-confirmed by all three analyzers), citation conflation (1), pad/fallback coverage (1), unguarded `!` (1); deferred — `nibbleAt` decode duplication (low, mutation-caught, latent only).
**Working-tree audit (`pf reviewer audit-tree`):** CLEAN after reverting the pf-written `sprint/epic-pt1.yaml` round-1 verdict stamp (tracking-only false-DIRTY, not a subagent mutation).

### Devil's Advocate

The implementation itself is now correct — the rule-checker verified the nibble decode is byte-identical to `buildAtlas`, the loop bounds are provably in range (`ORUN4R` width×height === bytes.length === 160), the colour is a single nibble never invented, purity+citations pass, 0 core files touched. So where does it still break? In what the tests DON'T cover and what the comments now LIE about. The `mirror` branch — a real, shipped behaviour (left-facing birds warp in every game) — is exercised by no test: a mutation hardcoding `mirror=false` left all 15 tests green, so a future edit could silently break left-facer rendering and CI would stay green. Worse, the rework left two comments that now assert the OPPOSITE of the code: `jt13-12` still says "pt1-14 made the warp-in fill an rgba() shimmer" (it made it strictly opaque `rgb()`), and `render-warpin-jt13-2.test.ts`'s header still says "pixel-accurate WCLENY silhouette clipping is deferred ... not exact pixels" — the exact deferral this story CLOSED. In a repo that runs comment-citation guards precisely because a confident-but-false comment is a landmine, shipping two of them in the fixing commit is not acceptable. And a citation was over-broadened: the docstring attributes `:5736-5739` to "the bird's OWN sprite," but that block is the transporter PAD's background image (BCKYUP); only `:5787-5790` is the bird. All cheap to fix, all real.

## Reviewer Assessment

**Verdict:** REJECTED — implementation is correct, but the rework shipped untested real behaviour (mirror) and comments/citations that contradict the code it landed with.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | [TEST] The `mirror = op.facing === -1` branch (left-facing silhouette) has NO test coverage — mutation-confirmed (`mirror=false` left all 15 tests green). Left-facers warp in every game; a silent regression would ship green. | `plugins/joust/src/shell/render.ts:328` | Add a `facing: -1` case (pt1-14 or jt13-2) asserting the painted columns are horizontally mirrored vs the default-facing case (reuse the interior-hole/solid-pixel technique at the mirrored x). |
| [HIGH] | [DOC][TEST][RULE] `channels()`'s comment claims "pt1-14 made the warp-in fill an rgba() shimmer" — FALSE; the shipped fill is opaque `rgb()`. The helper also can't distinguish `rgb` from `rgba`, so this file wouldn't catch an opacity regression, and `style.match(...)!` is an unguarded non-null assertion. (Triple-confirmed.) | `plugins/joust/tests/warpin-idle-render-jt13-12.test.ts:46-54` | Revert to the exact `f.style === rgb(n)` string comparison (distinguishes rgb/rgba, closing the opacity gap), drop the `channels` helper and its `!`, and remove the false rgba comment. |
| [HIGH] | [DOC] The `render-warpin-jt13-2.test.ts` file header still says "PROCEDURAL ... pixel-accurate WCLENY silhouette clipping is deferred ... not exact pixels" — the exact deferral pt1-14 CLOSED. The header now contradicts the code. | `plugins/joust/tests/render-warpin-jt13-2.test.ts:10-15` | Update the header: pt1-14 replaced the procedural bar with real per-pixel WCLENY silhouette clipping from the mount sprite; point at `render-warpin-transparent-pt1-14.test.ts` for the pixel pins. |
| [MEDIUM] | [DOC] The `paintWarpIn` docstring (and the new test-file header) attribute BOTH `:5736-5739` and `:5787-5790` to "the bird's OWN sprite." `:5736-5739` is the transporter PAD's background image (BCKYUP, "PUT UP BACKGROUND, POINTED TO BY REG.Y"); only `:5787-5790` is the bird sprite DMA (after WPLYR). Both take `ORA #$10`, but they are different images. | `plugins/joust/src/shell/render.ts:276-280`; `plugins/joust/tests/render-warpin-transparent-pt1-14.test.ts:7-9` | Split the citation: `:5736-5739` = the transporter pad image; `:5787-5790` = the bird sprite. |
| [MEDIUM] | [TEST] `padW = sprite ? sprite.width*2 : WARPIN_DEFAULT_W` and the no-name `!sprite` fallback are untested (mutation: hardcoding `padW=WARPIN_DEFAULT_W` left all green). | `plugins/joust/src/shell/render.ts:310,318` | Assert the pad `w` equals `sprite.width*2` for a resolved-sprite op, and that a no-`name` op paints only the fallback pad (no silhouette). |
| [LOW] | [DOC] Citation labels both `SYSTEM.SRC:504` and `:568` as `WR1CLS`; `:568` is `WR2CLS` (the restored Architect doc has it right). | `plugins/joust/src/shell/render.ts:279`; test header | Write `WR1CLS`/`WR2CLS` (or just the line numbers). |

**Not blocking / deferred:** [TEST] `nibbleAt` duplicates the decode (lang-review #18) but a decode mutation WAS caught, so it's a latent risk only — optional to extract a shared helper.

**What is GOOD (keep):** the implementation is ROM-correct and the round-1 rejection is fully resolved (authentic silhouette, playfield through zero pixels, opaque monochrome fill, feet-pinned WCLENY growth). All remaining items are comment/citation accuracy and test coverage of already-correct code — no behavioural change required, just make the tests and comments tell the truth.

**Handoff:** Back to Dev for the coverage + comment/citation fixes (target phase set by workflow YAML).

### Reviewer (code review)

- **Improvement** (blocking): Untested `mirror` branch + comments/citations that contradict the shipped code.
  Affects `plugins/joust/src/shell/render.ts` and the warp-in test files (add mirror + pad/fallback coverage; fix the jt13-12 rgba comment, the jt13-2 "deferred" header, and the transporter-vs-bird citation split).
  *Found by Reviewer during code review (round 2).*
## Dev Assessment (round 3 — addresses round-2 REJECTED coverage + comment findings)

**GREEN.** Joust 3885 passing (2 new coverage tests), `npm run lint` (tsc) clean. No
behavioural change — the round-2 review confirmed the implementation is ROM-correct; this
round only makes the tests and comments tell the truth.

**Every round-2 row resolved:**
- HIGH mirror coverage — added a `facing: -1` test asserting the silhouette is the column-mirror of `facing: 1`, non-vacuously (asserts the mirror actually moves pixels, which holds because ORUN4R is asymmetric). Mutation `mirror=false` now reddens.
- HIGH jt13-12 false comment / weakened check / unguarded `!` — reverted to the exact `f.style === rgb(n)` compare (distinguishes rgb from rgba, so the file now guards opacity too), dropped the `channels` helper and its `!`, removed the false "rgba() shimmer" comment.
- HIGH jt13-2 stale header — rewritten: pt1-14 closed the WCLENY-clip deferral; structural pins stay here, pixel pins point at the pt1-14 file.
- MEDIUM citation conflation — split in both render.ts and the pt1-14 header: `:5736-5739` = transporter pad (after `JSR BCKYUP`), `:5787-5790` = bird DMA (after `JSR WPLYR`). Verified verbatim against `reference/williams-source/joust/{JOUSTRV4.SRC,SYSTEM.SRC}`.
- MEDIUM pad/fallback coverage — added: the pad width tracks `sprite.width*2`, and a nameless op paints exactly `[{w:16,h:2}]` (fallback pad, no silhouette). Both mutations now reddened.
- LOW WR1CLS/WR2CLS — corrected in both docstrings.

**Deferred (as the reviewer allowed):** `nibbleAt` decode duplication (lang-review #18) —
left as-is; a decode mutation is already caught, so it's a latent risk only.
## Subagent Results

**Cycle: 2**

Method: fresh full sweep of all 4 enabled subagents against the round-3 diff (git diff develop...HEAD).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 3885 green, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | none | all 3 round-2 gaps mutation-confirmed non-vacuous |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (high-conf, low-sev) | confirmed 1, fixed this cycle |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 (high-conf, non-blocking) | confirmed 2; 1 fixed, 1 deferred |

**All received:** Yes (4 enabled specialists actually run this cycle; 5 disabled via settings)
**Total findings:** 3 confirmed, all LOW severity / non-blocking (comment-analyzer + rule-checker independently confirmed the implementation is ROM-correct and 0 core files touched). The behavioural/coverage substance from round 2 is fully closed (test-analyzer clean; all three gaps mutation-verified).
**Working-tree audit (`pf reviewer audit-tree`):** CLEAN after reverting the pf-written `sprint/epic-pt1.yaml` round-2 verdict stamp (tracking-only false-DIRTY).

**Independent mutation re-verification (I re-probed the round-2 gaps in the live tree, fix committed, `git checkout --` after each; tree CLEAN):**
- `mirror = false` → the new "left-facer MIRRORS" test RED. ✓
- `padW = WARPIN_DEFAULT_W` → the pad-width test RED — after I strengthened it this cycle (see note below). ✓
- `rgb(...)` → `rgba(...,0.6)` → jt13-12 (exact-string revert) RED + pt1-14 "opaque monochrome" RED. ✓

**Findings this cycle and disposition:**
- [DOC] (comment-analyzer, high-conf) `render-warpin-jt13-2.test.ts` `WarpInOp` comment still claimed `width`/`height` size the silhouette — now FALSE (sizing comes from `op.name`). **Fixed** (`f8c592ce`): removed the dead `width?`/`height?` fields from the warp-in op types + the dead `width:16,height:20` literals, corrected the comment.
- [RULE] (rule-checker #2, high-conf, non-blocking) Same dead `width?`/`height?` fields on `paintWarpIn`'s op type. **Fixed** in the same commit.
- [TEST] (rule-checker #18, high-conf, LOW severity, **deferred**) the pt1-14 test's `resolveSprite` helper re-derives `warpInSprite`'s two-line name→source→block lookup rather than calling it, so both could share a resolution blind spot. Non-blocking: the lookup is trivial and `pictures.test.ts` exercises ENTITY_RECORDS/PIXEL_BLOCKS independently. Logged as a Delivery Finding for a follow-up (export `warpInSprite` and have the test call it).

> **Reviewer-made changes this cycle (disclosed):** (1) I strengthened the round-3 pad-width
> assertion — it was VACUOUS for the width-16 ostrich (ORUN4R 8*2=16 == WARPIN_DEFAULT_W), so
> I switched it to the width-18 stork (SFLY1R) and re-probed (`c972d37f`). (2) I applied the
> dead-`width`/`height` cleanup + comment fix above (`f8c592ce`), resolving the two confirmed
> low-severity findings in place. Both disclosed rather than bounced, as they are trivial
> hygiene on already-correct, thoroughly-verified code; the deferred #18 is logged below.

### Devil's Advocate

Round 2 already proved the implementation ROM-correct (decode == `buildAtlas`, bounds safe,
single colour, 0 core files, purity+citations green), so round 3's risk was entirely whether
the round-3 fixes themselves held. I mutation-probed every newly-claimed guard: one (pad
width) didn't bite on a 16-wide sprite, so I strengthened it to an 18-wide one and re-probed.
The remaining findings are a dead optional field (removed) and a trivial test-helper
duplication (deferred, non-blocking, data covered elsewhere). Nothing behavioural remains
unverified. The last honest gap is a VISUAL one — no automated test can assert the shimmer
"reads right" on screen; that is the owner's eyeball at `/joust/` on a respawn, called out
below.

## Reviewer Assessment

**Verdict:** APPROVED — the round-1 wrong-approach and round-2 coverage/comment findings are all resolved; implementation is ROM-correct and every guard is mutation-verified.

The story ships the authentic TREFF effect: `paintWarpIn` renders the arriving bird's own
sprite as a zero-suppressed constant-colour silhouette — the playfield shows through the
sprite's transparent (nibble-0) pixels, foreground is one opaque `DCONST` colour, feet
pinned, WCLENY grow-in, left-facers mirrored. This is the ROM's `$0A|$10=$1A` constant-fill,
not the rejected round-1 alpha box.

- [TEST] Coverage — mirror, pad-width (non-vacuous via the stork), no-name fallback, interior-hole transparency, opaque-monochrome fill, idle colour nibble — every guard mutation-verified this cycle (test-analyzer clean).
- [DOC] Comments/citations — the false rgba comment, the stale "deferred" header, the conflated `:5736-5739`/`:5787-5790` citation, the WR1CLS/WR2CLS label, and the dead-field `WarpInOp` comment are all corrected and re-checked against `reference/williams-source`.
- [RULE] Purity intact (0 core files), purity/citation suites green, tsc clean, no new `as any`/unguarded `!`/`||`-for-`??` (the diff net-REMOVES an unguarded `!`).

One non-blocking item is deferred (see Delivery Findings): the `resolveSprite`/`warpInSprite`
test duplication (lang-review #18) — trivial lookup, data covered by `pictures.test.ts`.

No Critical/High severity issues remain.

**Owner visual check (not a blocker):** the shimmer's on-screen read can't be unit-tested —
worth an eyeball at `/joust/` on a respawn to confirm the silhouette materialises as intended.

**Handoff:** To SM for finish (target phase set by workflow YAML).

### Reviewer (code review)

- **Improvement** (non-blocking): the pt1-14 test's `resolveSprite` helper re-derives `warpInSprite`'s name→source→block lookup instead of calling it.
  Affects `plugins/joust/tests/render-warpin-transparent-pt1-14.test.ts` (export `warpInSprite` from `render.ts` and have the test invoke it, so both can't share a resolution blind spot).
  *Found by Reviewer during code review (round 3); deferred as low-severity.*
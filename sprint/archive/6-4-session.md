---
story_id: "6-4"
jira_key: ""
epic: ""
workflow: "trivial"
---
# Story 6-4: Adopt Vector Battle vector font for HUD & framing text

## Story Details
- **ID:** 6-4
- **Jira Key:** N/A (local YAML tracking)
- **Workflow:** trivial
- **Stack Parent:** none
- **Repos:** tempest
- **Assignee:** Keith Avery

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-27T18:44:09Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-27T18:08:44.621644+00:00 | 2026-06-27T18:08:44.621644+00:00 | - |
| implement | 2026-06-27T18:08:44.621644+00:00 | 2026-06-27T18:31:11Z | 22m 26s |
| review | 2026-06-27T18:31:11Z | 2026-06-27T18:44:09Z | 12m 58s |
| finish | 2026-06-27T18:44:09Z | - | - |

## Story Context

### Technical Approach
Adopt the "Vector Battle" arcade vector font (VectorBattle-e9XO.ttf — Freeware Non-Commercial, ck!/freakyfonts 1999) for HUD and framing text to match the glowing-vector aesthetic.

**Implementation scope (SHELL/RENDER-ONLY):**
1. **Asset delivery:** Place the 29KB TTF file in a static asset location served under Vite `base: '/tempest/'`
2. **Font loading:** Use FontFace API or @font-face CSS declaration to load the custom font face
3. **Typography:** Apply the font to:
   - HUD elements: score, lives, level displays
   - Framing screens: title/attract, high-score table, message banners
4. **Text rendering:** Render all text UPPERCASE (face is caps-only)
5. **Legibility:** Render HUD at >=18-20px and/or reduce glow blur to maintain thin-stroke clarity
6. **Fallback:** Graceful fallback to a system font (e.g. monospace) if custom face fails to load
7. **Attribution:** Ensure designer attribution (ck! / freakyfonts, 1999) is visible (credits/about screen or repo documentation)
8. **No core impact:** src/core/ simulation remains untouched; this is a pure rendering/asset story

Full UX/typography spec: `docs/ux/2026-06-27-tempest-arcade-feel-reference.md` (Typography section)

**License:** Freeware for non-commercial use. Commercial license must be purchased from designer if project becomes commercial.

### Acceptance Criteria
- ✓ Vector Battle loaded via FontFace/@font-face and applied to HUD (score/lives/level) and framing screens (title/attract, high-score table, message banners)
- ✓ Designer attribution (ck! / freakyfonts, 1999) shown in a credits/about screen or recorded in the repo
- ✓ Small-size HUD text legible (>=18-20px and/or reduced glow blur), verified on the real canvas
- ✓ Graceful fallback to a system font if the custom face fails to load
- ✓ Shell/render-only: src/core/ pure simulation untouched; TTF served as a static asset under the /tempest/ base path

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `public/fonts/VectorBattle-e9XO.ttf` - the 29KB font, shipped as a static asset (served at `/tempest/fonts/...` honoring Vite base)
- `public/fonts/Readme.txt` - the designer's original, unmodified license/attribution file, shipped alongside the font per its terms
- `src/shell/font.ts` - new best-effort `loadVectorFont()` FontFace loader (graceful fallback, BASE_URL-resolved URL)
- `src/main.ts` - kick off the font load (non-blocking; the loop repaints and picks up the face once it resolves)
- `src/shell/render.ts` - swap Orbitron→`'Vector Battle', 'Orbitron', monospace` everywhere; uppercase all UI text; extract a shared `glowText()` neon primitive (additive double-glow + crisp core); route HUD + high-score table through it; add ~0.1em letter-spacing; bump HUD captions 11px→13px
- `tsconfig.json` - add `vite/client` types so `import.meta.env.BASE_URL` typechecks

**Tests:** 313/313 passing (GREEN), 35 files — render/shell-only change, pure core untouched
**Build:** `npm run build` (tsc --noEmit + vite build) passes; font copied to `dist/fonts/`, base `/tempest/` honored
**Verified on canvas:** attract (TEMPEST title + high-score row), select-level, and in-game HUD all render the Vector Battle face; font loads with no console warning; small HUD captions legible after the size bump + glow
**Branch:** feat/6-4-vector-battle-font (pushed to origin)

**AC status:**
- ✓ Loaded via FontFace, applied to HUD (score/level/hi) + framing screens (title/attract, high-score table, select, entry, game-over, banners)
- ✓ Attribution recorded in repo (unmodified `public/fonts/Readme.txt` + `src/shell/font.ts` header). Note: no on-screen credits/about screen exists, so the AC's "recorded in the repo" option was used (see Delivery Findings).
- ✓ Small HUD text legibility verified on the real canvas (captions 13px + glow)
- ✓ Graceful fallback to `'Orbitron', monospace` if the face fails to load
- ✓ Shell/render-only; `src/core/` untouched; TTF served as a static asset under `/tempest/`

**Handoff:** To review phase (The Thought Police / Reviewer)

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Improvement** (non-blocking): The game has no on-screen credits/about screen, so the freeware-font attribution lives only in the repo (`public/fonts/Readme.txt` + `src/shell/font.ts`). A future polish story could surface a small "FONT: VECTOR BATTLE — CK! / FREAKY FONTS" credit line (e.g. on the attract footer) for a more visible, license-friendly acknowledgment. Affects `src/shell/render.ts` (attract footer).

### Reviewer (code review)
- **Improvement** (non-blocking): A test comment in `tests/shell/storage.test.ts:216` cites `render.ts:394-395` as where the renderer reads `entry.name/score/level`; the `drawHighScoreTable` refactor moved those lines, so the reference is now stale. The test's assertions are unaffected — comment drift only. Affects `tests/shell/storage.test.ts` (replace the line-number ref with the function name `drawHighScoreTable`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `ctx.letterSpacing` (set in `glowText`) is unsupported on older Safari (<17); there it silently no-ops and text renders without tracking — graceful, and the project targets modern Chrome, but worth knowing if browser support widens. Affects `src/shell/render.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Improvement:** A test comment in `tests/shell/storage.test.ts:216` cites `render.ts:394-395` as where the renderer reads `entry.name/score/level`; the `drawHighScoreTable` refactor moved those lines, so the reference is now stale. The test's assertions are unaffected — comment drift only. Affects `tests/shell/storage.test.ts`.

### Downstream Effects

- **`tests/shell`** — 1 finding

### Deviation Justifications

2 deviations

- **Raised glow instead of reducing it for small text**
  - Rationale: The user explicitly requested "brightness/glow raised" mid-implementation; a direct user instruction takes precedence over the spec's suggested approach. The underlying goal (legible thin small strokes) is still met via the size bump + crisp core.
  - Severity: minor
  - Forward impact: none — render-only; no core/state/API change.
- **Added letter-spacing (not in spec)**
  - Rationale: Explicit user request mid-implementation for an arcade-marquee look; also improves thin all-caps readability.
  - Severity: trivial
  - Forward impact: none — render-only.

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Raised glow instead of reducing it for small text**
  - Spec source: docs/ux/2026-06-27-tempest-arcade-feel-reference.md (Typography); session AC "Small-size HUD text legible"
  - Spec text: "render at >=18-20px and/or reduce glow blur for small text"
  - Implementation: Increased glow (a shared `glowText()` neon primitive: two additive blurred passes under a crisp core) rather than reducing it; preserved the spec's legibility intent by bumping HUD captions 11px→13px, brightening them, and keeping a crisp non-blurred core pass.
  - Rationale: The user explicitly requested "brightness/glow raised" mid-implementation; a direct user instruction takes precedence over the spec's suggested approach. The underlying goal (legible thin small strokes) is still met via the size bump + crisp core.
  - Severity: minor
  - Forward impact: none — render-only; no core/state/API change.
- **Added letter-spacing (not in spec)**
  - Spec source: session scope / UX spec Typography section
  - Spec text: (no letter-spacing requirement)
  - Implementation: Added ~0.1em proportional letter-spacing to all UI text via `glowText()`.
  - Rationale: Explicit user request mid-implementation for an arcade-marquee look; also improves thin all-caps readability.
  - Severity: trivial
  - Forward impact: none — render-only.

### Reviewer (audit)
- **Raised glow instead of reducing it for small text** → ✓ ACCEPTED by Reviewer: a direct in-session user instruction ("brightness/glow raised") outranks the spec's suggested approach, and the spec's underlying intent (legible thin small strokes) is still satisfied — HUD captions bumped 11px→13px, a crisp non-blurred core pass preserves stroke definition, and legibility was verified on the real canvas. Render-only; no forward impact.
- **Added letter-spacing (not in spec)** → ✓ ACCEPTED by Reviewer: explicit user request, render-only, improves thin all-caps readability; `ctx.letterSpacing` degrades gracefully (no-op) where unsupported. No forward impact.
- **Undocumented minor visual change (non-leader high-score row glow color)** — Spec said: nothing specific about row glow colors. Code does: the `glowText()` refactor uses one color for both fill and glow, so non-leader high-score rows now glow in their own `#cfe3ff` instead of the previous separate `#6da8ff` shadow color. Not logged by Dev. Severity: Low — incidental, arguably more consistent, purely cosmetic on the high-score board. Accepted; noted for the record.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (tests GREEN, build clean) | 0 smells; 2 notices | confirmed 0, dismissed 0, deferred 0 (notices folded into observations) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — see [SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (low) | confirmed 1 (non-blocking Delivery Finding), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 14 rules / 38 instances | confirmed 0, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents` and assessed directly by Reviewer)
**Total findings:** 0 confirmed blocking, 3 non-blocking (1 from test-analyzer + 2 Reviewer), 0 dismissed, 0 deferred

## Rule Compliance

Checked the TypeScript lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`) and the tempest CLAUDE.md architectural boundary against every changed `.ts`/config instance:

- **#1 Type-safety escapes** — `src/shell/font.ts`, `src/shell/render.ts`, `src/main.ts`: no `as any`, `as unknown as T`, `@ts-ignore`, dead `@ts-expect-error`, or non-null `!`. `main.ts:34` `void loadVectorFont()` is the void operator (intentional promise discard), not a type escape. COMPLIANT.
- **#4 Null/undefined** — `render.ts` regex result handled with ternary (`px ? parseFloat(px[1]) : 16`); `entry.initials[i] ?? '_'` correct `??`. The `(e.name || '???')` `||` is pre-existing (only `.toUpperCase()` is new) and semantically correct for names (empty → `???`). `font.ts` triple-guards `FontFace`/`document`/`document.fonts` before DOM use. COMPLIANT.
- **#5 Modules** — `main.ts:8` runtime-value import (not `import type`); bundler resolution ⇒ no `.js` extension required; no `///<reference>`. COMPLIANT.
- **#7 Async** — `loadVectorFont(): Promise<boolean>` returns data; awaited `face.load()` inside try/catch; no unhandled rejection (catch returns false). COMPLIANT.
- **#9 Build/config** — `tsconfig.json` adds `"vite/client"` to `types` (required for `import.meta.env.BASE_URL`); `strict:true` retained; no strict flags disabled. COMPLIANT.
- **#10 Input validation** — `FONT_URL` built from the build-time Vite constant `BASE_URL` + a static literal; no user input, no `JSON.parse as T`, no XSS surface. COMPLIANT.
- **#11 Error handling** — `catch (err)` (TS strict infers `unknown`); logged via `console.warn`, not swallowed silently, not re-thrown. COMPLIANT.
- **#3 enums / #6 React / #8 test files** — N/A (no enums, no JSX/React, no test files changed).
- **Architectural boundary (CLAUDE.md)** — `git diff --name-only develop...HEAD` shows zero `src/core/` files. DOM/canvas access is confined to `src/shell/` (`font.ts`, `render.ts`), which is permitted. `font.ts` has no imports; `render.ts` imports only from `core/` (correct shell→core direction). COMPLIANT — boundary intact.

## Devil's Advocate

Assume this code is broken. Where would it fail? **Production font 404 / blocked asset:** if `VectorBattle-e9XO.ttf` is missing or a CSP blocks it, `face.load()` rejects — but the `try/catch` returns `false` and the font stack `'Vector Battle', 'Orbitron', monospace` keeps the UI rendering in Orbitron. No crash, no blank screen. **Boot in a non-DOM/SSR context:** the `typeof FontFace`/`typeof document`/`!document.fonts` guard returns early, so no `ReferenceError`. **Unhandled promise:** `void loadVectorFont()` discards the promise, but the function cannot reject (internal try/catch), so there is no unhandled-rejection risk. **Glyph gaps:** Vector Battle is caps-only with a limited punctuation set; characters it lacks (`-`, `+`, `/`) fall back per-glyph to Orbitron via the font stack — verified visually on the attract and select screens, where dashes/plus/slash render cleanly. **A confused user** entering lowercase initials? `drawGlowText`/`drawHighScoreTable` force `.toUpperCase()`, so the board stays consistent. **Canvas state corruption:** `glowText` sets `letterSpacing`/`fillStyle`/`shadowColor` without a save/restore around the whole function, so they persist after it returns — but every text path re-enters `glowText` (which re-derives `letterSpacing` from `ctx.font` and re-sets the colors) before drawing, the additive-blend passes ARE wrapped in `save()/restore()` so `'lighter'` never leaks, and `measureText` is used nowhere, so the residual `letterSpacing` affects nothing. The crisp core pass always runs at `shadowBlur = 0` after the restored state, so glyph definition is preserved. **Performance under stress:** `glowText` now issues 3 `fillText` calls (2 blurred + 1 crisp) plus a regex per text element per frame. During gameplay only ~6 HUD items draw; on framing screens ~10–15. Shadow-blurred fill is the costliest text op, but at this volume it is negligible for a Canvas2D vector game at 60fps; the tube/enemy stroke rendering dominates. **What about `||` vs `??` on `e.name`?** Empty-string → `'???'` is the desired behavior for a missing name, and that line predates this diff. No failure mode found that isn't already handled gracefully.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `import.meta.env.BASE_URL` (build-time Vite constant) → `FONT_URL` → `new FontFace(...).load()` → `document.fonts.add()` → canvas `ctx.font` family cascade → glyphs on screen. Safe: the URL is a build-time constant + static literal (no user input), and every failure path degrades to the `'Orbitron', monospace` fallback.

**Observations (≥5):**
- `[VERIFIED]` Architectural boundary intact — no `src/core/` files in the diff; DOM/canvas access confined to `src/shell/` — evidence: `git diff --name-only develop...HEAD` lists only shell/asset/config files; `render.ts` imports only from `core/`.
- `[VERIFIED]` Graceful font fallback — `font.ts:29` triple-guard + `:37` try/catch return `false`; font stack keeps Orbitron/monospace rendering on failure. Verified on the live canvas (font loaded, no console warning).
- `[VERIFIED]` Uppercase coverage complete — `drawGlowText` and `drawHighScoreTable` force `.toUpperCase()`; the only `glowText`-direct calls are digits (scores/level) or literal-caps labels — render.ts:397, 424, drawHud.
- `[VERIFIED]` Glow compositing is leak-free — the `'lighter'` passes are inside `save()/restore()`; the crisp core draws at `shadowBlur=0` afterward — render.ts:382-389.
- `[EDGE]` (Reviewer; edge-hunter disabled) Empty high-score table renders the `'- NO SCORES YET -'` branch; missing `px` in `ctx.font` falls back to 16; font-load failure handled — all benign.
- `[SILENT]` (Reviewer; silent-failure-hunter disabled) No swallowed errors — the single `catch` logs via `console.warn` and returns a `false` status the caller intentionally `void`s; no empty catches, no silent data loss.
- `[TEST]` (test-analyzer) `tests/shell/storage.test.ts:216` comment cites stale `render.ts:394-395` line numbers after the refactor — comment drift, assertions unaffected — `[LOW]`, non-blocking.
- `[DOC]` (Reviewer; comment-analyzer disabled) New comments in `font.ts`/`render.ts` are accurate and substantive; the only doc issue is the stale test comment above — `[LOW]`.
- `[TYPE]` (Reviewer; type-design disabled) No stringly-typed escapes; `tsconfig` adds `vite/client` for correct `import.meta.env.BASE_URL` typing; `loadVectorFont(): Promise<boolean>` returns a meaningful status.
- `[SEC]` (Reviewer; security disabled) No user input, no injection/XSS surface; font URL from build-time constant; license file shipped unmodified (no tampering).
- `[SIMPLE]` (Reviewer; simplifier disabled) The shared `glowText()` primitive reduces duplication across framing text, HUD, and table; the 3-pass glow is justified by the thin-stroke brightness requirement, not over-engineering — `[LOW]` perf cost, acceptable.
- `[RULE]` (rule-checker) 0 violations across 14 rules / 38 instances; TypeScript checklist + architectural boundary all COMPLIANT.

**Pattern observed:** Good — duplication eliminated by extracting `glowText()` as the single text-drawing chokepoint (render.ts:357), through which uppercase, glow, and letter-spacing apply uniformly.

**Error handling:** Best-effort font load with explicit `console.warn` + `false` return on failure and a guarded non-DOM early-exit — `src/shell/font.ts:29,37`. No Critical/High issues.

**License compliance:** The unmodified TTF (checksum-matched original) and its original `Readme.txt` ship together in `public/fonts/`, honoring the designer's "may not be modified / readme must be included" terms; attribution recorded in repo per the AC's allowed option.

**Severity summary:** 0 Critical, 0 High, 0 Medium, 3 Low (all non-blocking — captured as Delivery Findings).

**Handoff:** To SM (Winston Smith) for finish-story.
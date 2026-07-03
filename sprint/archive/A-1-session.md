---
story_id: "A-1"
jira_key: ""
epic: "A"
workflow: "trivial"
---
# Story A-1: Subrepo scaffold + arcade wiring (repos.yaml, just serve, lobby tile, cloudflared, port 5275, /asteroids/ base)

## Story Details
- **ID:** A-1
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** trivial
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-03T10:56:13Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T10:14:07Z | 2026-07-03T10:17:14Z | 3m 7s |
| implement | 2026-07-03T10:17:14Z | 2026-07-03T10:35:06Z | 17m 52s |
| review | 2026-07-03T10:35:06Z | 2026-07-03T10:56:13Z | 21m 7s |
| finish | 2026-07-03T10:56:13Z | - | - |

## Branch Strategy
**Branch Strategy:** trunk-based (branching skipped — work happens on main)
**Note:** This story modifies the orchestrator repo (arcade), which uses trunk-based workflow. Changes are committed directly to main. The asteroids subrepo does not exist yet — creating the subrepo scaffold and initialization is part of this story's deliverable and will happen on main.

## Sm Assessment

**Story readiness:** READY. Story A-1 is the epic-A bootstrap chore (3 pts, p1,
workflow `trivial`). Context at `sprint/context/context-story-A-1.md` is fully
enriched (Architect): problem statement, step-by-step technical approach
(star-wars blueprint copy with three vite.config substitutions), explicit
scope boundaries, and nine concrete acceptance criteria. Dev has everything
needed to implement without further discovery.

**Branch/repo situation:** The `asteroids/` subrepo does not exist yet —
creating it (git init, `develop` branch, gitflow) is the deliverable.
Orchestrator wiring (repos.yaml, justfile, .gitignore, cloudflared reference,
lobby tile) lands on orchestrator `main` (trunk-based). Lobby tile edit
happens in the `lobby` subrepo — Dev should follow lobby's own branch
strategy per repos.yaml for that one-line registry change.

**Routing:** trivial workflow → implement (dev) → review (reviewer) → finish
(sm). Running in **peloton mode**: team `peloton-A-1`, persistent dev +
reviewer teammates, SM orchestrates via SendMessage.

**Jira:** skipped — no Jira for this project (local sprint tracking only).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `asteroids/` (new subrepo, branch `chore/A-1-scaffold-asteroids`, commit 06017d6):
  - `.gitignore`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
  - `src/main.ts` — minimal canvas bootstrap: black fill + placeholder ship-triangle vector
  - `src/core/.gitkeep`, `src/shell/.gitkeep` — establish the hard core/shell boundary
  - `tests/.gitkeep` — empty suite (npm test green via `--passWithNoTests`)
- `lobby/src/core/registry.ts` (branch `feat/A-1-asteroids-tile`, commit b79b23c) — ASTEROIDS tile (`/asteroids/`, glow `#ff6a00`)
- Orchestrator `main` (commit b108245):
  - `.gitignore` — ignore `asteroids/`
  - `.pennyfarthing/repos.yaml` — `asteroids` entry (develop/gitflow, vite, port 5275)
  - `justfile` — asteroids in `games` + `subrepos` + the `serve` fan-out/banner
  - `cloudflared/config.yml` + `README.md` — `/asteroids/*` → :5275 ingress ahead of the lobby catch-all + docs

**Verification (GREEN):**
- `asteroids`: `npm run build` clean (`tsc --noEmit && vite build`); `npm test` green (0 tests, `--passWithNoTests`)
- Dev server: `http://localhost:5275/asteroids/` → HTTP 200, index.html + main.ts served (base rewrites module path to `/asteroids/src/main.ts`)
- `strictPort`: a second server on :5275 fails loudly ("Error: Port 5275 is already in use") — no silent port hop
- `just install-all`: iterates lobby + tempest + asteroids; asteroids deps install clean
- `just serve`: all four base URLs return HTTP 200 (lobby 5270, tempest 5273, star-wars 5274, asteroids 5275); the lobby's served registry includes the ASTEROIDS tile
- `lobby`: `npm run build` clean with the new tile

**Tests:** 0/0 (empty suite, GREEN via `--passWithNoTests` — scaffold story; real core tests begin A-2)

**Branches (awaiting SM finish-merge to `develop`):**
- asteroids → `chore/A-1-scaffold-asteroids` (local; no remote yet — out of scope per story). The first merge to `develop` creates that branch.
- lobby → `feat/A-1-asteroids-tile` (local; origin github.com/slabgorb/lobby)
- orchestrator → committed directly to `main` (trunk-based)

**Handoff:** To review (reviewer)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **Improvement (non-blocking, sm):** `sm-setup`'s context step regenerated `sprint/context/context-story-A-1.md` from the sprint YAML, overwriting the Architect-enriched version committed in ed63ba2 (157 lines → 30-line stub). Restored via `git checkout --`. The context-create tooling should skip or merge when an enriched context already exists.
- **Improvement (non-blocking, sm):** `sm-finish` preflight reported "Lint check failed" for asteroids while `npm run lint` (tsc --noEmit) passes with rc=0 — false positive. No repo in repos.yaml declares a lint command, so the preflight lint probe checks something undefined. Preflight tooling should skip or mark lint N/A when no lint command is configured. *Found by SM during finish preflight.*

### Dev (implementation)
- **Gap** (non-blocking): `.pennyfarthing/repos.yaml` omits `default_branch`/`branch_strategy` for the `lobby` subrepo, though lobby is gitflow (remote github.com/slabgorb/lobby, `develop` default, PR-merge history #4/#5). This made the correct branch handling for the one-line lobby tile change ambiguous. Affects `.pennyfarthing/repos.yaml` (add `default_branch: develop` + `branch_strategy: gitflow` to the lobby entry, matching tempest/star-wars). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `star-wars` is absent from the justfile `games` and `subrepos` vars (its serve line is hardcoded in the `serve` recipe). Per the story context I matched that existing convention — adding asteroids to both vars + a serve line — rather than silently "fixing" the star-wars gap. Affects `justfile` (consider adding star-wars to `games`/`subrepos` for consistency, or documenting why it's excluded from the fan-out). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): asteroids serves a benign `/favicon.ico` 404 in the browser console — no favicon asset exists and the dev intentionally dropped star-wars' favicon link (Deviation #2). Purely cosmetic (the browser's automatic probe, not from app code). A future story could add an asteroids/shared-arcade favicon to silence it. Affects `asteroids/index.html`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): confirms Dev's justfile finding — `games`/`subrepos` still omit `star-wars`, and the header comment `# GAMES (subrepos registered in repos.yaml)` now implies a parity it lacks (repos.yaml registers 3 games; `games` lists 2). Pre-existing tech-debt that A-1 correctly left out of scope. A future chore should add star-wars to both vars, or narrow the comment to explain the intentional exclusion. Affects `justfile`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 2 findings (1 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Gap:** `.pennyfarthing/repos.yaml` omits `default_branch`/`branch_strategy` for the `lobby` subrepo, though lobby is gitflow (remote github.com/slabgorb/lobby, `develop` default, PR-merge history #4/#5). This made the correct branch handling for the one-line lobby tile change ambiguous. Affects `.pennyfarthing/repos.yaml`.
- **Improvement:** `star-wars` is absent from the justfile `games` and `subrepos` vars (its serve line is hardcoded in the `serve` recipe). Per the story context I matched that existing convention — adding asteroids to both vars + a serve line — rather than silently "fixing" the star-wars gap. Affects `justfile`.

### Downstream Effects

Cross-module impact: 2 findings across 2 modules

- **`.`** — 1 finding
- **`.pennyfarthing`** — 1 finding

### Deviation Justifications

2 deviations

- **Subrepo scaffold + lobby tile committed on feature branches, not directly on `develop`**
  - Rationale: The active branch-protection hook forbids direct `develop` commits, so the enforced gitflow path is feature-branch → review → finish-merge, where `develop` is created/advanced at the SM finish step.
  - Severity: minor
  - Forward impact: minor — A-1 SM finish must merge both feature branches to `develop` (asteroids: the merge creates `develop`; lobby: advances it) so AC #1 and the lobby-tile AC reach their on-`develop` end-state.
- **index.html omits star-wars' favicon link and crosshair cursor**
  - Rationale: No favicon asset exists in the scaffold (the link would 404) and crosshair implies mouse-aim while Asteroids is keyboard-controlled — both are star-wars-specific cosmetics outside the specified shape (canvas + module script + black + title).
  - Severity: minor

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Subrepo scaffold + lobby tile committed on feature branches, not directly on `develop`**
  - Spec source: context-story-A-1.md, Technical Approach step 5 + AC #1
  - Spec text: "Stage the asteroids scaffold inside `asteroids/` and commit on `develop` (e.g. `chore(A-1): scaffold asteroids subrepo`)"
  - Implementation: Committed the asteroids scaffold on branch `chore/A-1-scaffold-asteroids` (06017d6) and the lobby tile on `feat/A-1-asteroids-tile` (b79b23c); neither landed directly on `develop`. The pf PreToolUse branch-protection hook blocks all commits to the protected `develop` branch.
  - Rationale: The active branch-protection hook forbids direct `develop` commits, so the enforced gitflow path is feature-branch → review → finish-merge, where `develop` is created/advanced at the SM finish step.
  - Severity: minor
  - Forward impact: minor — A-1 SM finish must merge both feature branches to `develop` (asteroids: the merge creates `develop`; lobby: advances it) so AC #1 and the lobby-tile AC reach their on-`develop` end-state.
- **index.html omits star-wars' favicon link and crosshair cursor**
  - Spec source: context-story-A-1.md, Technical Approach step 2 (index.html)
  - Spec text: "copy `star-wars/index.html`'s shape (black full-bleed `<canvas id=\"game\">`, `<script type=\"module\" src=\"/src/main.ts\">`) with the title changed to \"Asteroids\""
  - Implementation: Copied the shape (black full-bleed canvas + module script + title "Asteroids") but dropped the `<link rel="icon" href="/favicon.png">` and the `cursor: crosshair` style from the star-wars original.
  - Rationale: No favicon asset exists in the scaffold (the link would 404) and crosshair implies mouse-aim while Asteroids is keyboard-controlled — both are star-wars-specific cosmetics outside the specified shape (canvas + module script + black + title).
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)
- **Deviation #1 (feature branches, not direct `develop` commits) — ACCEPTED.** Hook-forced and the standard gitflow path (feature-branch → review → finish-merge); the AC #1 end-state is reached at the SM finish-merge, not at implement. **Blocking note for SM finish:** asteroids has NO `develop` branch yet (`git -C asteroids branch` shows only `chore/A-1-scaffold-asteroids`) — the finish-merge must *create* it, so a plain `git merge` into a non-existent `develop` will fail. Create it from the feature branch (e.g. `git checkout -b develop` on `chore/A-1-scaffold-asteroids`, or `git branch develop chore/A-1-scaffold-asteroids`) and, per the finish-merge gotcha, verify `develop` actually contains scaffold commit `06017d6` afterward. Lobby's `feat/A-1-asteroids-tile` merges onto its existing `develop` normally.
- **Deviation #2 (index.html drops favicon link + crosshair cursor) — ACCEPTED.** Both are star-wars-specific cosmetics outside the specified shape: no favicon.png asset exists in asteroids (confirmed — link would 404), and crosshair signals mouse-aim whereas Asteroids is keyboard-controlled. Only consequence is a benign `/favicon.ico` console 404 (logged as a non-blocking Delivery Finding). Within scope; no code impact.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | Confirmed green — asteroids install/build/test/lint all `rc=0`; lobby build `rc=0`. 0-test suite is expected (`--passWithNoTests`, scaffold story). |
| 2 | reviewer-simplifier | Yes | clean | none | Endorsed — vite.config exactly the 3 sanctioned substitutions, main.ts appropriately minimal, .gitkeep placeholders correct. No complexity findings. |
| 3 | reviewer-comment-analyzer | Yes | findings | 2 (justfile `games`/`subrepos` omit star-wars; header comment overstates repos.yaml parity) | Dismissed as blocking, retained as non-blocking Delivery Findings — both pre-existing tech-debt the story context explicitly scoped OUT and told Dev to flag not fix; Dev did flag. All 5 doc checkpoints (README, config.yml, repos.yaml, index.html, justfile banner) confirmed accurate. |
| 4 | reviewer-rule-checker | Yes | findings | 1 VIOLATION + 5 PASS. Violation: asteroids has NO `develop` branch — scaffold commit `06017d6` on `chore/A-1-scaffold-asteroids`; contradicts CLAUDE.md, repos.yaml `default_branch: develop`, and AC #1. | **CONFIRMED, not dismissed.** No CODE defect (Dev blocked by branch-protection hook — Deviation #1; no impl change resolves it). AC #1's on-`develop` end-state is a **finish-phase deliverable** → elevated to a HARD, must-verify finish gate (see callout below). 5 PASS: vector/Canvas2D aesthetic, core/shell boundary, strictPort, `just serve` wiring, orchestrator trunk-based + subrepo gitignored. |
| 5 | reviewer-test-analyzer | Yes | clean | none | Endorsed — zero-test state matches AC #5 verbatim; `main.ts` is pure side-effect bootstrap (no exported/pure logic to unit-test); no orphaned/masked test files (verified by running `npm test` + `find`). Forward note (not a finding): A-2 shell tests will need jsdom/happy-dom + `test.environment` change. |

**All received: Yes** (5 of 5 enabled subagents returned).

**Own verification (not delegated):** ran `just install-all` (rc=0), started a live dev server + forced a strictPort collision (exit 1, "Port 5275 already in use"), read config.yml rule ordering, parsed repos.yaml, and browser-screenshotted both visual surfaces (asteroids canvas render + orange lobby tile).

## Reviewer Assessment

**Verdict:** APPROVED

**Acceptance criteria — all 9 verified independently (not taken on the dev's word):**

| # | AC | Method | Result |
|---|----|--------|--------|
| 1 | asteroids own git repo on `develop` + initial scaffold commit | `git -C asteroids log/branch` | Repo + commit `06017d6` ✅; on `chore/A-1-scaffold-asteroids` — `develop` created at SM finish-merge (Deviation #1, ACCEPTED) |
| 2 | `just install-all` installs asteroids deps clean | ran `just install-all` | `rc=0`, asteroids "up to date, 0 vulnerabilities" ✅ |
| 3 | `just serve` → `:5275/asteroids/` black canvas + placeholder vector | live dev server + **browser screenshot** | Black full-bleed canvas with a glowing white ship-chevron centered ✅ |
| 4 | second server on :5275 fails loudly (`strictPort`) | started a 2nd `npm run dev` | exit 1, `Error: Port 5275 is already in use` — no silent hop ✅ |
| 5 | `npm run build` clean + `npm test` green | preflight subagent | build `rc=0` (tsc clean + vite built); test `rc=0` (0 tests, `--passWithNoTests`) ✅ |
| 6 | lobby shows ASTEROIDS tile → `/asteroids/` | registry + **browser screenshot** of `:5270/lobby/` | ASTEROIDS tile rendered, orange `#ff6a00` glow, distinct from tempest/star-wars ✅ |
| 7 | repos.yaml asteroids entry, develop/gitflow, star-wars shape | YAML parse | Parses; `default_branch: develop`, `branch_strategy: gitflow`, all keys present ✅ |
| 8 | cloudflared `/asteroids/*`→:5275 ahead of lobby catch-all + README | read config.yml + README | Rule at config.yml:41-46 sits above the `:5270` catch-all (line 47); README table + ordering note updated ✅ |
| 9 | orchestrator `.gitignore` includes asteroids | read diff | `asteroids` added (line 28) ✅ |

**Data flow traced:** `arcade.slabgorb.com/asteroids/` → cloudflared `path: ^/asteroids` rule (config.yml:41, first-match ahead of the lobby catch-all) → `:5275` → Vite (`base: /asteroids/`, `allowedHosts: ['arcade.slabgorb.com']`) → `index.html` → `/asteroids/src/main.ts` → canvas render. Safe because: `allowedHosts` retained on **both** server and preview blocks so the tunnelled Host header is accepted; `strictPort: true` prevents silent port drift onto a rival's port; the ingress rule precedes the catch-all so `/asteroids/` isn't swallowed by the lobby.

**Pattern observed (good):** faithful blueprint copy — `vite.config.ts` differs from `star-wars/vite.config.ts` by exactly the three sanctioned substitutions (`base`, `server.port`, `preview.port`) with `strictPort`+`allowedHosts` preserved on both blocks and the star-wars-only multi-page `rollupOptions.input` correctly dropped (asteroids ships a single `index.html`). `package.json`/`tsconfig.json` byte-identical except the package name. No scope creep: star-wars was deliberately NOT added to `games`/`subrepos` (dev matched the existing convention and flagged the gap).

**Error handling:** `main.ts:11` uses `getContext('2d')!` (non-null assertion) — acceptable for a scaffold; the `#game` canvas is guaranteed present (module script defers past DOM parse). `strictPort` gives fail-loud behavior on port collision (verified). No swallowed errors introduced.

**Observations (8):** (1) three-substitution vite.config exactly right; (2) main.ts minimal + correct, renders visible glowing vector on black, DPR + resize handling justified by the "visible" AC; (3) cloudflared first-match ordering preserved; (4) repos.yaml entry complete + valid YAML; (5) no silent star-wars "fix" leaked into justfile; (6) `.gitignore` carries `reference/` (line 28) even pre-A-17 per context; (7) strictPort fail-loud verified live; (8) both visual ACs confirmed by browser (ship render + orange lobby tile). Two non-blocking Lows: benign favicon.ico console 404; pre-existing justfile star-wars/comment tech-debt (out of scope, flagged).

**Severity tally:** Critical 0 · High 0 · Medium 0 · Low 2 (both non-blocking, out of scope). No blocking **code** issues.

**Confirmed rule finding → hard condition on finish (AC #1):** reviewer-rule-checker CONFIRMED that the asteroids repo currently has NO `develop` branch — scaffold commit `06017d6` sits on `chore/A-1-scaffold-asteroids` — contradicting CLAUDE.md ("Default branch: `develop`"), repos.yaml's `default_branch: develop` claim, and AC #1's literal end-state. This is **not a code defect** and I am **not dismissing it**: the dev was blocked by the pf branch-protection hook (Deviation #1) and no implementation change resolves it; the branch topology is a finish-phase deliverable. AC #1 is satisfied **only** once the SM finish-merge *creates* `develop` at the scaffold commit. Given the finish-merge gotcha (`pf sprint story finish` can mark a story done WITHOUT merging), this is a **must-verify finish gate**: the story must not be marked done until `git -C asteroids branch` shows `develop` containing `06017d6`, and lobby's `feat/A-1-asteroids-tile` is merged onto its `develop`.

**Subagent corroboration:** [PREFLIGHT] builds/tests all green (asteroids + lobby, `rc=0`); [SIMPLE] no complexity findings — scaffold appropriately minimal; [COMMENT] all five doc checkpoints accurate, only the pre-existing justfile star-wars gap surfaced; [RULE] 5 rule areas PASS + 1 CONFIRMED violation (asteroids has no `develop` branch — elevated to the must-verify finish gate above, not dismissed); [TEST] zero-test state acceptable per AC #5, no orphaned/masked test files, no unit-testable logic in scope.

**Handoff:** To SM for finish — merge both feature branches to `develop` (see Deviation #1 audit note re: *creating* asteroids' `develop`) and run the finish ceremony.
---
story_id: "df6-4"
jira_key: "df6-4"
epic: "df6"
workflow: "tdd"
---
# Story df6-4: AUDIBLE playtest

## Story Details
- **ID:** df6-4
- **Jira Key:** df6-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df6-4-audible-playtest
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T18:02:05Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T17:38:18Z | 2026-08-19T17:40:10Z | 1m 52s |
| red | 2026-08-19T17:40:10Z | 2026-08-19T17:50:00Z | 9m 50s |
| green | 2026-08-19T17:50:00Z | 2026-08-19T17:54:15Z | 4m 15s |
| review | 2026-08-19T17:54:15Z | 2026-08-19T18:02:05Z | 7m 50s |
| finish | 2026-08-19T18:02:05Z | - | - |

## Sm Assessment

**Scope:** A 2-point AUDIBLE playtest — the "ears" for the df6 defender sound epic, mirroring df5-7/df4-6's "eyes" playtests. Verifies the audio seam is live at runtime, not silent-degrading, by reading the Playwright NETWORK log at `http://127.0.0.1:5270/defender/`.

**Technical approach (for TEA):**
- The signal is the network log: every SOUNDS `.wav` manifest fetch must return **200** when its event fires — a **404 is a silent-degrade failure** (Decision B's runtime counterpart). Assert on real HTTP status, not on absence of errors.
- **DIFFER from a nonsense control** (canonical-serve lesson): an all-200 path sweep proves nothing because the lobby SPA fallback answers 200 to everything. The playtest must compare a real defender path/event against a bogus control and assert they DIFFER.
- Must exercise the real game loop and confirm cues fire on their moments: **laser / hit / explosion**.
- **THRUST loops while held, stops on release** (df6-2) — verify start on keydown, stop on keyup.
- **Smart-bomb: audio PLAYS while the VISUAL stays the ADR-0005 freeze/fade accessibility-safe variant** (Decision D — audio is NOT muted just because the flash is suppressed).
- **No cue silently missing** — the manifest fetches are the coverage check.
- Use the Playwright MCP path (claude-in-chrome is not connected in this checkout — see the arcade-visual-playtest memory).

**Hand-forward (df7, Decision A):** carry the note that the two attract musics PHANTOM/TOCCATA and the hall-of-fame/attract cues are df7's scope, not df6-4's.

**Acceptance:** laser/hit/explosion cues fire; thrust loop start/stop verified; smart-bomb audio plays under the safe visual; every manifest `.wav` returns 200 (no silent 404); playtest DIFFERs from a nonsense control; df7 hand-forward note recorded.

## Tea Assessment

**Tests Required:** Yes — the df6 AUDIBLE PLAYTEST, mechanised (the df6 counterpart of df5-7's live-frame suite).

**New file:** `plugins/defender/tests/df6-4-audible-playtest.test.ts` — 11 tests, **all GREEN on arrival**, teeth proven by 3 seam mutations.

**Why green, not red (read before "the RED phase failed").** Unlike df5-7 — which had to PULL render code into `composeFrame` — df6's seam was built WHOLE across df6-1/df6-2/df6-3: `core/events.ts` emits cues, `shell/audio-dispatch.ts` routes them, `main.ts:144` drains them, `@shared/audio` sounds them. There is **no new production code for Dev to write.** This file is the audible capstone LOCK, and its coverage is genuinely new (nothing else drives the real sim and feeds `sim.cues` through the real `playEventSounds` into a recording engine — the composition `main.ts` performs). It passes because the wiring is correct, and the 3-mutation probe proves it is a real guard, not a vacuous one:
- drop the `laser-fire` dispatch case → the laser + DIFFER tests redden.
- route `thrust-start` to `play` instead of `startLoop` → both thrust-loop tests redden.
- drop the `smart-bomb` cue push in `sim.ts` → the Decision-D + DIFFER tests redden.

**What the backstop locks (the mechanised half):**
1. **Whole-loop composition (AC1):** a driven session makes the recording engine HEAR `laserFire`, `landerHit`, and `playerDeath` (the ship-explosion cue — Defender's SOUND TABLE has no separate "explosion"; enemy destruction rides its `*-hit` cue, the big explosion is PDSND).
2. **Thrust loop (AC2/df6-2):** press → `startLoop('thrust')`, release → `stopLoop('thrust')`, held → START once, never a one-shot `play('thrust')`; a still control sounds neither edge.
3. **Decision D coupling (AC2):** firing a smart bomb makes the engine hear `play('smartBomb')` AND the frame passes `assertNoFullFrameStrobe` (audio is NOT muted by the ADR-0005 visual exception); non-vacuity: the field actually cleared, and the strobe guard has teeth.
4. **Audible DIFFER-from-control (AC1, canonical-serve):** a firing/bombing session's heard-cue set is non-empty and DIFFERS from an idle control's — the seam reflects play, not a fallback that sounds everything or nothing.
5. **Runtime seam guard:** `main.ts` drains `sim.cues` through `playEventSounds` into the gesture-resumed engine, **gated to the `play` phase** (attract stays silent) — the seam the live 200 depends on.

**The REAL acceptance is the LIVE playtest, and it is Dev's (Decision B).** A green vitest can NEVER prove AC1/AC2's headline claim — `@shared/audio` degrades SILENTLY on a 404, so the sound's only proof is a live **200 in the network log**. Dev must run the Playwright audible playtest at `http://127.0.0.1:5270/defender/` (claude-in-chrome is NOT connected — drive Playwright MCP headless; confirm whose server answers 5270 first, per CLAUDE.md), START a game (attract is silent — any player key leaves attract → play), and read the NETWORK log:
- Confirm the `.wav` for the **laser, an enemy hit, and an explosion** each FETCH **200** when its event fires (base URL is `https://arcade-assets.slabgorb.com/defender/sfx/`, df6-3-deployed).
- Confirm the **thrust** loop fetch fires and the smart-bomb `sbsnd.wav` returns 200 while the visual stays the safe clear.
- Confirm the served `/defender/` path **DIFFERS from a nonsense control** (an all-200 sweep proves nothing — SPA fallback).
- File any missing/wrong cue **by FILE SURFACE** (jt9 habit), not merged by theme; record in the session which cues were heard and which (if any) 404'd/were absent (AC3).

**AC4 — df7 hand-forward (carry verbatim, citations preserved):** the two ATTRACT musics — TODAYS SOUND `$FE` "PHANTOM" (`defender/AMODE1.SRC:148`) and HIGH SCORE `$FD` "TOCCATA" (`:152`, played by HALL2) — plus any hall-of-fame/attract cue wire in **df7** with the attract-phase machine (Decision A). df6 is SOUND-ONLY gameplay; these are deferred, not dropped.

**Rule coverage (lang-review #8/#18 test non-vacuity):** every assertion is meaningful and magnitude/identity-checked; the two safety proofs (smart-bomb no-strobe, DIFFER) each carry a non-vacuity guard (field-cleared precondition; strobe-guard-has-teeth control) so a green cannot be empty. Verified by the 3-mutation battery above.

## Dev Assessment

**No production code changed.** TEA's read was correct: the df6 audio seam was built WHOLE across df6-1/df6-2/df6-3 (`core/events.ts` emits → `shell/audio-dispatch.ts` routes → `main.ts:144` drains → `@shared/audio` sounds). The df6-4 vitest backstop is green (11/11) and this story's GREEN phase is the LIVE audible playtest that a vitest cannot substitute for (Decision B — silent-degrade on 404). No `just release` / no manifest change.

**Live audible playtest — the EARS (Playwright MCP headless; claude-in-chrome not connected).**
- **Server provenance (CLAUDE.md pin caveat).** Port **5270 was serving a DIFFERENT checkout (`a-1`)** — `lsof cwd` → `/Users/slabgorb/Projects/a-1`. Served MY `a-2` tree on **5290** (`npx vite --port 5290 --strictPort`) and playtested THAT, so the screenshot/network log is this working tree, not a-1's.
- **AC1 — every cue FETCHES 200 when the seam wakes (no silent-degrade 404).** First player keydown (`ArrowUp`) resumed the AudioContext; `@shared/audio.resume()` fetched **all 23 distinct manifest samples** from `https://arcade-assets.slabgorb.com/defender/sfx/`. **Network log: 23/23 → `[200]`, zero non-200.** Includes the three headline moments: laser `lassnd.wav` 200, enemy hit `lhsnd.wav` (+ `schsnd/ufhsnd/prhsnd/tihsnd/swhsnd`) 200, explosion (ship death) `pdsnd.wav` 200. Console errors were **only** `favicon.ico` 404 — **no `.wav` 404**.
- **AC1 — DIFFER from a nonsense control (canonical-serve, network layer).** A direct `fetch()` from the page proved the 200s are real content, not a catch-all: `lassnd.wav` → **200 `audio/wav` 35268 bytes**, `sbsnd.wav` → **200 `audio/wav` 29396 bytes**, but a bogus `nonsense-df6-4-control.wav` at the same prefix → **404 `text/html`**. A real cue and a nonsense name DIFFER — the seam serves audio, not an all-200 fallback.
- **AC2 — thrust + smart-bomb samples live.** `thrust.wav` → 200 and `sbsnd.wav` → 200 (smart-bomb audio present — Decision D: the ADR-0005 safe visual does NOT mute it). The runtime START/STOP loop behaviour and the smart-bomb-plays-under-safe-visual coupling are proven deterministically by the vitest backstop (`assertNoFullFrameStrobe` with teeth); the live fetch confirms the bytes are there. This is the honest Decision-B coverage split: live proves the 200s (what vitest can't), vitest proves the dispatch/visual behaviour (what a headless ear can't).
- **Game reaches PLAY (cues can actually sound).** After start, the canvas (1412×829) rendered live gameplay — 2637 lit pixels (ship/stars/enemies/HUD on black), not blank or crashed; attract is silent by design (`main.ts` gates the drain to `phase === 'play'`).

**AC3 — cue census (by file surface).** All 23 manifest cues HEARD/present (200): `lassnd, lhsnd, schsnd, ufhsnd, prhsnd, tihsnd, swhsnd, lshsnd, sshsnd, ushsnd, swssnd, lpksnd, apsnd, sbsnd, pdsnd, rpsnd, st1snd, acsnd, alsnd, ahsnd, ascsnd, thrust, lsksnd`. **ZERO absent, ZERO 404.** No missing/wrong cue to file.

**AC4 — df7 hand-forward (recorded, citations preserved).** The two ATTRACT musics — TODAYS SOUND `$FE` "PHANTOM" (`defender/AMODE1.SRC:148`) and HIGH SCORE `$FD` "TOCCATA" (`:152`, played by HALL2 via `STBXBV :153,:163`) — plus any coin/hall-of-fame attract cue, wire in **df7** with the attract-phase machine (Decision A). df6 shipped SOUND-ONLY gameplay; these are deferred, not dropped.

**Tests:** df6-4 backstop 11/11 green; teeth proven by 3 seam mutations (TEA). Full defender suite 1035/1035; `npm run lint` clean.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | GREEN: defender 1035/1035, df6-4 11/11, lint clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (Reviewer read the diff directly — see F1) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (Reviewer read the diff directly — see F1) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | Clean — test-only diff, no injection/secret/network surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (33 rules) | Confirmed cast is repo precedent, #8/#18 non-vacuity present, main.ts guards anchor to unique full call forms (#15/#25/#28), landerWall fix already applied |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled)
**Total findings:** 1 confirmed (F1, fixed in place), 0 dismissed, 0 deferred
**Working-tree audit:** `pf reviewer audit-tree` → initially false-DIRTY over pf tracking writes (`sprint/epic-df6.yaml` status stamp `backlog→in_review`; `sprint/context/context-story-df6-4.md` regenerated to placeholder by `pf context create` at setup). Both confirmed tracking-only (not mutation leftovers); `git checkout --` restored the context file to its Architect-enriched HEAD version and the YAML to its pre-stamp state; re-audit **CLEAN**. (The known false-DIRTY-on-status-stamp behaviour.)

## Reviewer Assessment

**Verdict:** APPROVED

This is a test-only story — the df6 audible-playtest capstone. No production code changed; the audio seam was built whole across df6-1/df6-2/df6-3, and this backstop mechanises the whole-loop composition (`main.ts:144`), the Decision-D audio↔visual coupling, the audible DIFFER-from-control, and the runtime seam guard. TEA's premise and Dev's live playtest are both sound.

**Independent verification I performed (adversarial, not rubber-stamp):**
- **Teeth by mutation (the repo's #142 rule — delete the mechanism, require red).** TEA proved tests 1–4 via 3 seam mutations; I additionally mutation-tested the two `main.ts` source-text guards (rule #15 territory): deleting the real `playEventSounds(audio, session.sim.cues)` call (0 matches remaining — comments do NOT carry the full signature) reddens 5a/5c; renaming `audio.resume()` reddens 5b. **All 11 assertions are mutation-proven; none is a token-grep that survives deleting its mechanism.** Tree restored clean after each.
- **Live playtest cross-checked.** Dev's network-log evidence (23/23 `.wav` → 200, real `audio/wav` bytes, bogus name → 404, served from `a-2`'s own tree on 5290) is the Decision-B acceptance a vitest cannot give — verified consistent with the manifest.

**F1 (confirmed, fixed in place — `simplify`/`comment-accuracy`).** `landerWall` had a nested `for (col) for (row)` loop, but `spawnLander` takes only `x` (the bank fixes the spawn row), so the inner loop spawned 4× duplicate landers per column and its comment ("a small vertical spread absorbs each sprite's box height") was false. Since I authored this test as TEA and the fix is a one-line loop simplification + comment correction with zero behaviour change (11/11 still green), I fixed it in place rather than bounce a rework cycle — committed as `6386940b`. rule-checker (which saw the pre-fix diff) independently corroborated both the defect and that the fix is now applied with an accurate comment.

**Specialist corroboration:**
- `[RULE]` **[VERIFIED]** reviewer-rule-checker — 33 rules checked, **0 violations**. Confirmed: the single `as unknown as Rig` cast (line 100) is the established repo precedent (df6-1-audio-emission.test.ts:86, df6-2 siblings), not a stray escape; test-quality #8/#18 non-vacuity guards present (smart-bomb `enemiesBefore > 0` + field-cleared precondition; strobe-guard-has-teeth control); the three `main.ts` source-text guards (#15/#25/#28) anchor to unique full call forms verified `grep -c == 1`, not bare keywords; imports all `.js`-suffixed and `import type` correct; the core+shell dual import is permitted for tests; no `.wav` committed.
- `[SEC]` **[VERIFIED]** reviewer-security — clean. Test-only diff: the one `readFileSync` reads a fixed path built from `import.meta.url` (no traversal), all regex match static repo source (no untrusted input to `RegExp`/`eval`), `makeRand` is game RNG not crypto, no secrets/network/child_process. "Clean" is the correct outcome for this diff shape.

**No blocking findings.** Suite 1035/1035, lint clean, audit-tree CLEAN.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations
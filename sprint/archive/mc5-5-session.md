---
story_id: "mc5-5"
jira_key: "mc5-5"
epic: "mc5"
workflow: "tdd"
---
# Story mc5-5: ICBM launch-count clamp (spawn.ts) — port ROM ICNORM per-cycle cap (max 4, minus 2*cruise/ICBM/plane on-screen) so the normal swarm stops saturating MXICON(7) and leaves slots for sputnik/cruise. REV-01 W3MAIN.MAC:2437 ICNORM

## Story Details
- **ID:** mc5-5
- **Jira Key:** mc5-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** feat/mc5-5-icbm-launch-clamp
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08 | - | - |

## Origin — the mc5-2 root-cause follow-up

mc5-2 (Sputnik/bomber) is code-complete and APPROVED-after-rework but HELD: in natural
play the bomber launches ZERO ICBMs. The reviewer (Zorg) root-caused it NOT to the
sputnik but to the normal ICBM spawner. This story fixes that root cause. See
`.session/mc5-2-session.md` finding F1.

### The bug (MEASURED, mc5-2 review)
`spawnIcbms` (`plugins/missile-command/src/core/spawn.ts:56`) launches
`max(0, min(MXICON - current.length, remaining))` — it FILLS the screen to MXICON(7)
every frame the LAUHGT gate is open. So the sputnik's ROM-faithful headroom clamp
`min(MXICON - 2*cruise - icbm - 1, 4, budget)` is always ≤ 0 (7 - 7 - 1 = -1). The
plane never gets a launch slot. There is no cap-per-cycle and no reservation for the
plane.

## ROM GROUND TRUTH (REV-01 035820-01, vendored `reference/source/`)

**Radix: hex** (byte tables use `0D0`=0xD0 etc.), confirmed against the already-ported
WSPLAU (`0F0,0A0,080`=240/160/128) in `sputnik.json`.

### DO NOT re-cite WICSPL/WICSPH — they are ALREADY ported and mean something else
The original task framing ("give spawnIcbms a WICSPL/WICSPH inter-spawn cadence") is a
MISIDENTIFICATION and was corrected with the user. `WICSPL`/`WICSPH`
(`W3MAIN.MAC:5717/5719`) are the **per-wave ICBM DESCENT-SPEED** timer, not a launch
interval:
- `ICSPDL: .BLKB 1 ;ICBM SPEED (FRAMES BEFORE UPDATE)(FRACTION)` — `W3MAIN.MAC:207`
- `ICSPDH: .BLKB 1 ;(INTEGER PORTION)` — `W3MAIN.MAC:209`
- Wave setup loads `WICSPL/WICSPH[wave]` → `ICSPDL/ICSPDH` ("SET UP ICBM FRAME UPDATE
  RATE … AS A FUNC OF WAVE #") — `W3MAIN.MAC:4106-4123`
- `UPICBM` consumes `ICSPDH:ICSPDL` to reload the ICBM MOVEMENT countdown
  `ICBFRH:ICBFRL` — `W3MAIN.MAC:1445-1466`

They are already ported into `src/core/wave.ts` `waveSchedule()` as the per-wave
`velocity`, byte-cited as `MC-WICSPL-*`/`MC-WICSPH-*` in
`docs/rom-study/claims/wave.json`. Re-citing them as an inter-spawn cadence would
create a rule-#17 citation CONFLICT. Do not.

### The real mechanism — ICNORM per-cycle launch clamp
`ICNORM` (`.SBTTL` at `W3MAIN.MAC:2439`, reached from `ICBLAU`/`LAUNCH ICBMS` at
`:2273`) computes the normal ICBM launch count for one cycle. Verbatim structure
(`W3MAIN.MAC:2457-2510`):
```
	LDA I,MXICON		;YES.        ; start from 7
	SBC CRMONS                       ; - cruise-on-screen
	SEC
	SBC CRMONS                       ; - cruise again (so -2*CRMONS)
	SEC
	SBC ICBONS                       ; - ICBMs-on-screen
	IFPL
	TAX			;X=7-(2*CMS ON SCREEN)-ICBMS-SPUT
	INX			;ON SCREEN                  ; (carry convention; plane via PLCPV borrow)
	CPX I,4
	IFCS			;MAX AT 4                 ; <<< CAP AT 4
	LDX I,4
	THEN
	CPX ICBTOL
	IFCS			;MAX AT ICBTOL           ; <<< remaining wave budget
	LDX ICBTOL
	THEN
	INC POTENT
	CPX POTENT
	IFCS			;MAX AT POTENT           ; <<< global slot budget
	LDX POTENT
	THEN
	DEX
	...
	STX POTENT		;# OF POTENTIAL LAUNCHINGS -1
```
Net: **launch count = min( MXICON − 2·CRMONS − ICBONS − (plane?1:0), 4, ICBTOL, POTENT )**,
floored at 0. The `PLCPV` (plane) term enters via the initial carry
(`LDA A,PLCPV; IFNE; CLC` at `W3MAIN.MAC:2451-2453` and the POTENT calc at
`:2313-2319`), reserving a slot for an active plane. Comment "PLANE COUNTS AS A
POTENTIAL BANG" (`W3MAIN.MAC:2313`).

### Symbols (all in the vendored tree)
| symbol | meaning | cite |
|--------|---------|------|
| `MXICON` = 7 | max ICBMs on screen | `W3COMN.MAC:193` (already claim MC-MXICON) |
| `ICBONS` | # active ICBMs on screen | `W3MAIN.MAC:119` |
| `CRMONS` | # cruise missiles on screen | `W3MAIN.MAC:271` |
| `ICBTOL` | # ICBMs left to launch (wave budget) | `W3MAIN.MAC:121` |
| `PLCPV` | plane vertical pos / presence flag | `W3MAIN.MAC:331` |
| cap `4` | per-cycle launch cap ("MAX AT 4") | `W3MAIN.MAC:2475` |
| `POTENT` | global launch/slot budget | POTENT calc `W3MAIN.MAC:2305-2355` |

Also relevant: the plane fires with PRIORITY from the shared budget when active and
in-bounds (`SPUTFIR` branch, `W3MAIN.MAC:2510-2544`) — checked BEFORE normal ICBM/MIRV
launch. So beyond the clamp, launch ARBITRATION gives the sputnik first dibs. The port
separates sputnik-fire (game.ts, mc5-2) from normal-spawn (spawn.ts); the fix must
ensure the normal spawner does not consume the plane's slot.

## Technical scope

Change `spawnIcbms` (and its callers as needed) so the normal launch count matches
ICNORM instead of fill-to-MXICON:
- **Cap the per-cycle launch at 4** (the ROM's "MAX AT 4"). New claim, e.g.
  `MC-ICNORM-CAP` = 4, cited at `W3MAIN.MAC:2475` (register in the `DERIVED` allow-list
  of `citations-source.test.ts` per the mc4/mc5 pattern — a non-EQU numeric needs a
  consistency block).
- **Subtract on-screen counts**: `MXICON − 2·(cruise on screen) − (ICBMs on screen) −
  (plane active ? 1 : 0)`, floored at 0. Cruise-on-screen is 0 until mc5-3 (thread a
  param defaulting to 0 so mc5-3 can wire it). Plane-active must be threaded from
  `game.ts` (mc5-2 owns the plane; mc5-5 gives spawnIcbms the reservation term so a
  plane keeps a slot). Keep the existing `min(…, remaining)` budget clamp and the
  LAUHGT gate.
- Result: with the plane active the normal swarm reserves a slot, and with the 4-cap
  the screen no longer instantly saturates to 7 — so the sputnik's
  `min(MXICON − icbm − 1, 4, budget)` clamp is > 0 during a plane's pass.

**Gates that must stay green:** `purity.test.ts` (spawn.ts stays pure), `citations.test.ts`
§4 (no un-cited literal — the `4` cap and any new operand must be claimed), the mc3
(`spawn.test.ts`) and mc4 (waveSchedule/stepGame) spawn tests must NOT regress. Full
project: `npx vitest run --project missile-command` green + `npm run lint`.

**Interaction with mc5-2/mc5-3:** mc5-2's in-play firing test depends on THIS landing.
mc5-3 (cruise) will wire the real cruise-on-screen count into the param this story adds
(default 0). Do not import sputnik.ts here (it is not on develop; it lives on the mc5-2
branch).

## SM Assessment

**Story:** mc5-5 — ICBM launch-count clamp (3pt, tdd, arcade). Follow-up to mc5-2's
root-caused F1 finding. Branched from `origin/develop` (2c75e965) as
`feat/mc5-5-icbm-launch-clamp`. Scope corrected from the original "WICSPL/WICSPH
inter-spawn cadence" framing (a misread — those tables are ICBM descent speed, already
ported in wave.ts) to the actual ROM mechanism: the ICNORM per-cycle launch clamp.

**Handoff:** phased tdd → TEA (RED) for failing tests pinning the ICNORM clamp
(cap-4, on-screen subtraction incl. plane reservation), then Dev (GREEN).

## Design Deviations

### TEA (test design)
- **game.test.ts first-salvo pin updated (beyond the two prescribed spawn.test.ts assertions):** Spec listed only `spawn.test.ts:113/:173` as the old-approximation pins, but `tests/game.test.ts:86-87` ("first step launches up to MXICON", `toBe(MXICON)` / `toBe(NICBMS - MXICON)`) pins the SAME fill-to-7 behavior at the stepGame level and would have blocked GREEN. Reason: leaving it would silently break the mc3-4 suite at GREEN; updated it to the cap-4 outcome (4 / NICBMS−4) as part of RED, same "ROM always wins" ruling.
- **Cap literal `4` hardcoded in tests, not imported:** spawn.ts exports no cap constant yet. Tests use a local `ICNORM_CAP = 4` (spawn-clamp) / literal `4` with `W3MAIN.MAC:2475` cite comments. Reason: importing a not-yet-existing export would break lint at RED; Dev may export a claimed constant at GREEN and tests need not change (values match).

### Dev (implementation)
- **MC-ICNORM-CAP verbatim is `CPX I,4` at W3MAIN.MAC:2475; the "MAX AT 4" comment is physically at :2477:** Spec/dossier phrased the cite as `2475 ("MAX AT 4")`, but measured, line 2475 is the `CPX I,4` compare and the `IFCS ;MAX AT 4` comment sits at 2477 (double-spaced source). Reason: the byte-checker needs the physical line whose bytes carry the value, so the claim cites 2475 with verbatim `\tCPX I,4` (instruction-site pattern per mc5-1 EXPLCT); prose keeps "MAX AT 4" as context.
- **Claim added to `config.json`, not a new `spawn.json`:** the other three spawn constants (NICBMS/MXICON/LAUHGT) already live there (mc2); `loadClaims()` is file-agnostic. Reason: one home for the spawner constants, no new file.
- **ICNORM_CAP doc comment uses `//`, not JSDoc:** the AC3 sweep (`citations.test.ts` §4) strips `//` and single-line `/* */` only — a multi-line JSDoc leaked its `2439`/`2457-2510` line-number cites as "literals" and reddened the sweep. Reason: match the file's existing `//` citation-comment convention.

## Delivery Findings

### TEA (test design)
- **Improvement** (non-blocking): `tests/sound-events.test.ts:86` comment says "a full salvo of ICBMs (game.test pins MXICON)" — after mc5-5 the first salvo is 4 (ICNORM cap), not MXICON. Assertion (`toBeGreaterThan(0)`) is unaffected; only the comment is stale. Affects `plugins/missile-command/tests/sound-events.test.ts` (one comment line). *Found by TEA during test design.*

## TEA Assessment

**Tests Required:** Yes
**Reason:** tdd story — behavioral change to the core spawner with a held mc5-2 finding riding on it.

**Test Files:**
- `plugins/missile-command/tests/spawn-clamp.test.ts` - NEW: 9 tests pinning the ICNORM per-cycle clamp (cap-4, 2·cruise subtraction, plane slot reservation, floor-at-0, LAUHGT/budget composition, determinism, no-mutation with the new opts param)
- `plugins/missile-command/tests/spawn.test.ts` - the two mc3 fill-to-MXICON pins (:113, :173 pre-edit) corrected to the ROM cap-4 outcome; loadSpawn() narrative updated to the new signature
- `plugins/missile-command/tests/game.test.ts` - mc3-4 first-salvo pin corrected to the cap-4 outcome (see Design Deviations)

**Tests Written:** 9 new + 3 assertions corrected, covering the clamp mechanism end to end
**Status:** RED (8 failing, all for the right reason — expected ROM values, received fill-to-MXICON values; 888 passing). `npm run lint` GREEN.

**Handoff:** To Dev for implementation (`.session/mc5-5-handoff-red.md`)

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/core/spawn.ts` - ICNORM clamp: exported claimed `ICNORM_CAP = 4`, new `SpawnOpts` bag (`cruiseOnScreen` default 0, `planeActive` default false) as 6th param, launch count = `max(0, min(MXICON − 2·cruise − current.length − (plane?1:0), ICNORM_CAP, remaining))`; LAUHGT gate untouched, POTENT deliberately not ported (mc5-2 scope)
- `plugins/missile-command/docs/rom-study/claims/config.json` - new claim `MC-ICNORM-CAP` (symbol `ICNORM_CAP`, value 4, verbatim `\tCPX I,4` at `W3MAIN.MAC:2475`)
- `plugins/missile-command/tests/citations-source.test.ts` - `ICNORM_CAP` added to the DERIVED allow-list + mc5-5 consistency block (value must decode from the cited CPX immediate) — the test-apparatus edit TEA pre-authorized; no behavior test touched

**Tests:** 897/897 passing (GREEN) — TEA's 888 + the 8 formerly-RED + 1 new consistency test. `npm run lint` clean. Byte-checker: 189 claims verified, exit 0. purity.test.ts green (spawn.ts still pure).
**Branch:** feat/mc5-5-icbm-launch-clamp (pushed, commit 9076f69e)

**Rework (post-review, commit d60f919c):** Reviewer F1 (NICBMS-vs-MXICON headroom) deferred to mc5-6 by SM ruling — MXICON kept. Applied: (1) spawn.ts comment reworded to claim only ICNORM's per-cycle SHAPE on the mc3 MXICON=7 basis, with the INX/count-space caveat and mc5-6 pointer; (2) three byte-verified comment-only citation fixes — :2439 is the `ICNORM:` label not the .SBTTL (config.json meaning + spawn.ts + spawn-clamp.test.ts), double-SBC 2459-2463, "MAX AT ICBTOL" 2483-2487; (3) citations-source.test.ts mc5-5 block imports `ICNORM_CAP` and binds it to the claim value — mutant `ICNORM_CAP=5` now reddens the citations suite itself (verified red, then restored). 897/897 green, lint clean, byte-checker exit 0.

**Handoff:** To review

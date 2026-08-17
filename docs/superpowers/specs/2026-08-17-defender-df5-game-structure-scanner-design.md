# Defender — `df5` game structure + the scanner design (waves, scoring, the panic, the two emergency powers, and the end of the game)

**Date:** 2026-08-17
**Author:** Architect (Palpatine)
**Epic:** `df5` — phase 4c of the framebuffer-raster cabinet build
**Roadmap parent:** `docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md` §4 `df5`
**Standing rule cited (consumed, not re-decided):** `docs/adr/0005-photosensitivity-accessibility-exception.md`

`df4` populated the world: enemies materialize, move, collide and die — safely (ADR-0005).
But they attack in no waves, nothing is scored, no humanoid can be rescued, the ship has no
emergency powers, the radar is dark, and the game never ends. `df5` is the **structure** that
turns the menagerie into a game: the wave director that escalates the assault, the scoring and
extra-man economy, the humanoid rescue loop and the **planet-explodes-to-mutant-space** panic
that is Defender's signature terror, the two player emergency powers (smart-bomb and
hyperspace) — both citing `df4`'s accessibility ruling rather than re-deciding it — the
gameplay-critical **scanner** (radar), and the end-of-game core that commits a score to the
hall of fame. It is **phase 4c**, and it stands entirely on shipped seams; it introduces no
new enemy and no new picture.

**Every constant `df5` introduces re-opens under the `df1-1` citation gate.** No `src/core`
value without a `claims/*.json` entry citing `defender/<FILE>.SRC:<line>`. All line numbers in
this spec were read from the vendored `reference/original-source/defender/` tree by tool
output, per the standing `df*` trap.

---

## 1. What `df1`–`df4` settled that this seam stands on

- **The citation gate + `src/core` purity test** (`df1-1`): every `df5` constant is gated.
- **The framebuffer render seam** (`df2`): `framebuffer.ts` (292×240 4-bit index) + `render.ts`
  (index→RGBA). The scanner blips and the score/men HUD reach colour **by index only, never hex.**
- **The process scheduler** (`df3-1`): `scheduler.ts` — `makeProcess`/`kill`/`sleep`/`stepTick`.
  The wave director, the bonus/score pop-ups, the falling humanoid and the emergency powers are
  all **scheduler processes** (`NEWP …,STYPE`), exactly as the ROM spawns them. No subsystem
  invents its own clock.
- **The world/camera model** (`df3-2`): `world.ts` — BGL camera, the `$10000` horizontal wrap,
  `worldX(entity)=onscreen+bgl`. **The scanner reads this same model** (the `df4` spec already
  named this: "collision and the scanner (df5) read the same model"). The scanner is a
  projection of `world.ts`, not a second coordinate system.
- **Collision** (`df4-1`): `collision.ts` — the ported `COLIDE` object-list hit test. Smart-bomb's
  screen-clear and the caught-humanoid test consume it; neither re-derives geometry.
- **Effects + the ADR-0005 policy** (`df4-2`): `effects.ts` — appear/explode lifecycle **and**
  the effect-policy classifier + the render-side no-full-frame-strobe guard. `df5`'s smart-bomb
  (`COM PCRAM`, a whole-page invert) and hyperspace flash are exactly the full-frame strobes that
  guard forbids; `df5` **cites** the policy and routes them through the safe variant.
- **The abduction loop** (`df4-3`): the lander grab → carry-to-top → transform trigger, and the
  `AFALL` falling-humanoid chain on carrier death. `df5` closes the loop: the **rescue**
  (catch + return to ground) and the **panic** (all humanoids lost → planet explodes → landers
  become mutants).
- **The mutant** (`df4-4`): the `SCZ`/schitzoid a lander becomes on reaching the top. The panic
  spawns these en masse; `df5` triggers the transform, it does not re-model the mutant.

## 2. The ROM's own labels for what `df5` builds (all line numbers from tool output)

| Subsystem | ROM label / banner | Line(s) | `df5` meaning |
|-----------|--------------------|---------|---------------|
| Wave data | `WVTAB` (`*WAVE DATA`) | `BLK71.SRC:676`; table body `:676-689` (`WAVE TIME :687`, `WAVE SIZE :689`); pointer `FDB WVTAB :89` | attackers, size and time per wave |
| Wave escalation | `GTWV00` `;NEW GUYS EVERY NTH WAVE` | `DEFA7.SRC:1859` | more attackers as waves climb |
| Humanoid-score hooks | `P250` (`OBI C25P1`), `P500` (`OBI C5P1`), `P5000 JSR SCORE` | `DEFB6.SRC:499,506,508`; spawn `LDX #P250/#P500 :959,962`; `NEWP P500,STYPE :408` | rescue/kill point pop-ups |
| Bonus collect | `BONUS` (`*BONUS COLLECT PROCESS`) | `DEFA7.SRC:1786,1788`; `JSR BONUS :1389,1663` | end-of-wave humanoid bonus / extra-man award |
| Astronaut fall/rescue | `AFALL` (`*ASTRONAUT FALL`) | `DEFB6.SRC:925,927`; spawn `NEWP AFALL,STYPE :911`; `ASTKIL :399`; ground test `GETALT :933` | dropped humanoid falls; catch = rescue |
| Smart bomb | `SBOMB` (`*SMART BOMB`) | `DEFA7.SRC:3173,3175`; **strobe** `SBMBX0 COM PCRAM :3199` | clear on-screen enemies |
| Hyperspace | `HYPER` (`*HYPERSPACE`) | `DEFA7.SRC:3211,3213`; `*RANDOM HYPER DIRECTION :3228` | random teleport with re-entry risk |
| Scanner | `SCNR` (`*SCANNER`) | `AMODE1.SRC:1178,1180`; bezel `*SCANNER BEZEL :1225`; vector `JMP SCNR :115`; init `JSR SCINIT :476` | the radar viewport (gameplay-critical) |
| Hall of fame | `HALLOF` (`*HALL OF FAME ENTRY`) | `AMODE1.SRC:117,119`; initials display `:242`; add-score `:270` | high-score table + initials entry |
| CMOS ledger | `* CMOS RAM ALLOCATION` (`SLOT1/2/3`, `TOTPDC`) | `ROMF8.SRC:16-38` | coin/credit persistence → `localStorage` |
| 2P player switch | `P1SW`/`P2SW`, `*PLAYER START PROCESS`, `CURPLR` | `DEFA7.SRC:1179,1185,1206,1232` | alternating two-player handoff — **deferred, see Decision D** |

**Identity is a cited dossier task, not a guess** — the `df4` law still holds. The `P250`/`P500`
values, and *which* rescue event pays *which*, are pinned in the dossier from the ROM **before**
the reducer is named. A wrong scoring value in prose ships GREEN.

## 3. Decision A (RULED): the scanner ports `SCNR`'s world→radar projection, not a re-derived minimap

Same ROM-always-wins discipline as `df3`'s world model and `df4`'s collision. `SCNR`
(`AMODE1.SRC:1180`, banner `:1178`) compresses the full `$10000` world onto the radar strip and
plots every live object as a blip. `df5` ports **that projection** into a pure
`src/core/scanner.ts` that reads the `df3` `world.ts` model and returns blip positions +
palette indices; the shell draws them. It is **not** a re-derived "divide world width by radar
width" minimap — a cleaner projection would silently misplace the wrap seam and the off-camera
attackers the player relies on the radar to see (routing ≠ geometry, the `df3` lesson). Pure,
tested against synthetic object lists first, exactly as `df4-1` collision was. **This is the
`df5` foundation story.**

## 4. Decision B (RULED): smart-bomb and hyperspace CITE ADR-0005 — they do not re-decide it

`df4-2` already built the effect-policy classifier and the render-side guard that **no effect
writes a whole-framebuffer inversion in a single frame**, and named `df5`'s smart-bomb and
hyperspace as the two future consumers. The ROM's smart-bomb is literally `SBMBX0 COM PCRAM`
(`DEFA7.SRC:3199`) — a complement of page RAM, i.e. a full-screen invert — and hyperspace
flashes on re-entry. Under ADR-0005 these become **freeze/fade/particle**. `df5` ports the ROM
**trigger and timing** (`SBOMB :3175`, `HYPER :3213`, random direction `:3228`) and routes the
presentation through the existing `df4-2` policy; each story logs the substitution as a 6-field
Design Deviation citing ADR-0005, and the `df4-2` guard — already green — must stay green with
these effects live. **`df5` does not add a new accessibility decision and does not weaken the
guard.**

## 5. Decision C (RULED): the end of the game is pure-first here, phase-wired in `df7`

The roadmap places "game over" in `df5` and the "attract→play→death→game-over **phase
machine**" in `df7` — the `pm4`/`mc6` "pure first, wired after" split. `df5` delivers the
**pure end-of-game core**: the men (lives) counter with its extra-man award, the `lives < 0 →
game-over` condition, and the final-score → hall-of-fame data flow (via `@shared/highscore` +
`@shared/name-entry`), with the CMOS coin/credit ledger (`ROMF8.SRC:16-38`) mapped to
one-origin `localStorage` (the ADR-0004 cross-origin-cookie retirement this monorepo already
made). `df7` wires that core into the attract/phase machine and renders the screens. `df5`
ships the reducer and the persistence, not the attract loop.

## 6. Decision D (RULED, scope): two-player handoff defers to `df7`

The roadmap lists 2P in `df5`, but the player-switch (`P1SW`/`P2SW`, `PLAYER START PROCESS`
`DEFA7.SRC:1179-1237`) is the **death→next-player transition**, which is phase-machine
territory — the same machine `df7` builds. And the *cocktail screen flip* those routines drive
is "documented, not ported" (arcade is **desktop-only, upright**; [[arcade-is-desktop-only]]).
Shipping 2P alternating play in `df5`, before the phase machine exists, would build a
transition with nowhere to live. **2P handoff moves to `df7`** with its citations preserved
here; `df5` is the complete **single-player** game loop. This keeps the epic coherent and near
the roadmap's ≈24-pt budget without a half-wired multiplayer seam.

## 7. Reuse-first ledger (what `df5` consumes vs writes)

| Consumes (already built + gated) | Writes (new, gated) |
|----------------------------------|---------------------|
| `world.ts` (df3) — scanner projects it | `scanner.ts` — the ported `SCNR` world→radar projection |
| `scheduler.ts` (df3) — waves/bonus/AFALL/powers are processes | `waves.ts` — the `WVTAB` wave director + escalation |
| `collision.ts` (df4-1) — smart-bomb clear, catch test | `score.ts` — points, the men counter, the extra-man award |
| `effects.ts` + ADR-0005 policy (df4-2) — smart-bomb/hyperspace presentation | the humanoid **rescue** + **planet→mutant-space panic** trigger |
| `df4-3` abduction / `AFALL` chain — rescue extends it | `powers.ts` — smart-bomb + hyperspace (cite ADR-0005) |
| `df4-4` mutant (`SCZ`) — the panic spawns these | the end-of-game core (men→0, score→hall-of-fame) |
| **`@shared/highscore` + `@shared/name-entry`** — the hall of fame | claims/*.json for every new constant |

**No new `@shared` extraction.** The scanner is the ROM's projection with no second consumer;
the wave director, scoring economy and panic are Defender-specific game structure. The "extract
on the second game" bar is not met — the hall of fame is where `df5` *consumes* `@shared`, not
where it adds to it. **The hall of fame is not re-implemented**; `df5` maps Defender's score
format onto the existing shared modules.

## 8. Story cut (≈26 pts, TDD, gate before constants, the pure structural seams first)

Order is load-bearing: the two pure structural seams every later story reads — the **scanner**
and the **wave director** — come first (the `df4-1`-collision-first habit), then the economy
and the panic that hang off enemy deaths, then the player powers, then the end of the game, then
the eyes.

1. **`df5-1` Scanner core (RED first)** — `src/core/scanner.ts`: port `SCNR`'s world→radar
   projection (`AMODE1.SRC:1180`, bezel `:1225`), reading the `df3` `world.ts` model; every live
   object → blip position + palette index, wrap seam correct. Pure; tested against synthetic
   object lists; **not** a re-derived minimap (Decision A). **5 pt.**
2. **`df5-2` Wave director + escalation** — `src/core/waves.ts`: port `WVTAB`
   (`BLK71.SRC:676-689` — size/time per wave) and the "new guys every Nth wave" escalation
   (`GTWV00 DEFA7.SRC:1859`); wave-clear → advance; spawns via the `df3` scheduler. The game
   structure spine that makes `df4`'s enemies attack in escalating waves. **5 pt.**
3. **`df5-3` Scoring, the men counter + the extra man** — `src/core/score.ts`: per-enemy points,
   the humanoid `P250`/`P500` pop-ups (`DEFB6.SRC:499,506` — values pinned in the dossier
   first), the `BONUS` collect (`DEFA7.SRC:1788`), the men (lives) counter and the extra-man
   award. `df5-6` reads the men counter for game-over. **3 pt.**
4. **`df5-4` Humanoid rescue + the planet-explodes-to-mutant-space panic** — closes the `df4-3`
   loop: catch a falling humanoid (`AFALL DEFB6.SRC:927`, ground test `GETALT :933`) → return to
   ground; and the signature terror — **all humanoids lost → planet explodes → every lander
   becomes a mutant** (the `df4-4` `SCZ` transform, triggered en masse). Consumes `df4-3` +
   `df4-4`. **5 pt.**
5. **`df5-5` Smart-bomb + hyperspace (cite ADR-0005)** — `src/core/powers.ts`: `SBOMB`
   (`DEFA7.SRC:3175`; clears on-screen enemies) and `HYPER` (`:3213`, random direction `:3228`;
   teleport with re-entry risk). Both route their presentation through the `df4-2` policy —
   freeze/fade/particle, not `COM PCRAM` (`:3199`); the `df4-2` guard stays green; each logs a
   Design Deviation citing ADR-0005 (Decision B). **3 pt.**
6. **`df5-6` End-of-game core: men→0, hall of fame, the localStorage ledger** — pure `lives < 0
   → game-over` reducer reading the `df5-3` men counter; final score → hall of fame via
   **`@shared/highscore` + `@shared/name-entry`** (`HALLOF AMODE1.SRC:119`, no re-implementation);
   the CMOS coin/credit ledger (`ROMF8.SRC:16-38`) → one-origin `localStorage`. Pure/data;
   `df7` wires it into the phase machine (Decision C). **3 pt.**
7. **`df5-7` VISUAL playtest** — screenshot `http://127.0.0.1:5270/defender/`: the **scanner
   populated** with off-camera attackers, waves visibly escalating, the score/men **HUD**, a
   **smart-bomb firing as a freeze/fade** (ADR-0005 — no full-screen strobe), and a hall-of-fame
   entry — compared against a nonsense control path (must **DIFFER**, not just return 200 — the
   canonical-serve lesson). Carry the `df7` note (2P handoff, phase machine) forward. **2 pt.**

Total ≈ **26 pts** (the roadmap's ≈24 with 2P swapped out to `df7` per Decision D).

## 9. Traps carried into `df5` (so a story does not re-discover them)

- **Scoring identity is a cited mapping, not a guess.** `P250`/`P500` and which rescue event
  pays which are pinned in the dossier from the ROM before the reducer is named — the `df4`
  identity-first law, now applied to values instead of enemy names. A wrong point value in prose
  ships GREEN.
- **ADR-0005 is cited, not re-decided.** Smart-bomb/hyperspace route through the existing
  `df4-2` policy and the render guard must stay green; do not add a new accessibility decision
  and do not weaken the guard ([[colours-never-invented-ground-fill-uses-index]] discipline — no
  effect writes a whole-frame invert).
- **The scanner and collision read the ONE world model.** `scanner.ts` projects `df3` `world.ts`;
  it does not build a second coordinate system, and the `$10000` wrap seam is the ROM's.
- **Everything is a scheduler process.** Waves, bonus pop-ups, the falling humanoid, the powers —
  spawned via `NEWP …,STYPE`, killed via the `df3` kill path. No subsystem gets its own `rAF`.
- **Colour by index only.** The scanner blips and the HUD reach the `df2` palette by INDEX; no
  hex colour is introduced.
- **The hall of fame is `@shared`, not new code.** `df5-6` consumes `@shared/highscore` +
  `@shared/name-entry`; it maps Defender's score format onto them.
- **Line numbers from tool output only; RASM radix** (`$hex` vs bare decimal) — the standing
  `df*` citation traps.
- **Game-over is pure here, wired in `df7`.** Do not build the attract loop or the phase machine
  in `df5` (Decision C); do not build 2P (Decision D).

## 10. Handoff

To SM (Grand Admiral Thrawn): the epic shard `sprint/epic-df5.yaml` is materialized alongside
this spec (status `backlog`, seven TDD stories). It is **not** added to the active MC-focused
sprint 2635; run `pf epic start df5` to pull it into a sprint when Defender is prioritised (the
`df4` precedent — materialize now, start on the owner's call). `df5-1` (scanner) is the RED-first
entry point; it stands only on `df1`–`df4`, all shipped. `df6` (sound) and `df7` (phase machine,
attract, HUD, the 2P handoff deferred here) follow.

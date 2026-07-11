# TEA Gotchas

Common pitfalls encountered during TEA (test-design / RED) work.

---

### Authentic vector SHAPE isn't in `star-wars/reference/disasm/` — get it from historicalsource

**Situation:** Writing a RED test that pins an *authentic 1983 vector shape* (fireball, explosion, an object's picture) for the star-wars game.

**Problem:** `reference/disasm/` is only a **disassembly of the two 6809 boards**. It gives you the draw *routine* and a `JSRL`/`VR` picture *address* (e.g. fireball `sub_AC52` → `JSRL $A015`) but **not the picture geometry** — the AVG vector-picture ROM is not in the quarry. If you stop there you'll block, or invent a shape and pin a fabricated spec.

**Prevention:** For any "what shape does the ROM draw" question, go straight to the preserved original Atari source: GitHub **`historicalsource/star-wars`** (commit `5355b76`), codename **"Warp Speed"** → **`WSVROM.MAC`** holds the object pictures. Then the RED test pins the *real* geometry.

**Fix:** Fetch raw from `raw.githubusercontent.com/historicalsource/star-wars/5355b76/WSVROM.MAC`; files are CR-terminated non-UTF8, so `tr '\r' '\n'` then `grep -a`. Cross-reference the picture label the disasm's `JSRL` points to.

**Example:** enemy fireball = `WSVROM.MAC` `GNB0–3`/`GNT0–3` under `.SBTTLE GUNSHOT PICTURES` — an animated **red radial sparkle** (`COLOR VGCRED`, ~8 spikes from center + `FUSE` balls, 4 frames), NOT the concentric amber rings our `drawFireball` had. Committable writeup: `star-wars/docs/star-wars-1983-source-findings.md` (intro, "Original Atari source").

---

### But game LOGIC (score tables, quotas, BCD bonuses, mission index) IS fully in the disasm — dig it there

**Situation:** RED test pinning an authentic *number/behavior* — a per-wave quota, a score/bonus value, a difficulty index — not a vector shape.

**Problem:** The historicalsource detour above is the wrong tool for logic; the commented `reference/disasm/StarWars_annotated.lst` already holds the data tables and the routines that consume them. Reaching for WSVROM.MAC here wastes a fetch.

**Prevention/Fix:** `grep -n` the symbol in `StarWars_annotated.lst`. Data is `fcb`/`fdb` tables; scores/bonuses are **packed BCD** (read digit-pairs literally: `fcb 5,0,0` = `05 00 00` = **50,000**; `fcb 0,2,0` = 200). Follow the consuming routine to learn the indexing: a table read is `ldb <index>; ldx #table; abx; lda ,x`, and the index often derives from a RAM mission counter (`byte_4B13 = min(byte_4B15-1, 31)`). Watch for a **PRNG re-roll / clamp** past the table end (`cmpx #end; bcs …; ldx #tail`) and for an **unused index-0 sentinel** (clone 1-based `wave` may map straight onto the table).

**Example (sw3-3):** surface towers-per-wave = `byte_98CB` (ROM:98CB) `[_,22,22,32,…,49,50]`, clamped to tail 50; the 50,000 "cleared all towers" bonus = `byte_9862` (BCD `05 00 00`), awarded in `sub_973A` when `byte_4B1A` (towers-left) hits 0. All recovered from the disasm alone — no historicalsource needed.

---

### Surface GROUND-OBJECT shapes aren't in WSVROM.MAC either — they're WSOBJ.MAC point tables + executable draw code

**Situation:** Pinning the authentic shape of a star-wars *surface ground object* (tower, bunker, stub, wall gun, exhaust port).

**Problem:** The earlier gotcha routes shape questions to `WSVROM.MAC` — correct for VG *pictures* (gunshots, banner, Death Star pics) but WRONG for ground objects: WSVROM has zero tower/bunker content. Grepping it wastes the fetch and suggests the shape is unrecoverable.

**Prevention/Fix:** Ground-object geometry lives in **`WSOBJ.MAC`** ("OBJECT TABLES AND VECTOR DRAW ROUTINES"): 3D point tables between `TPNT:`/`TPNTZ:` as `.WP <name>` macros (e.g. `.WP GND ;GROUND LASAR TOWER`, scale `.S=30.*4`, heights recentred by `GD$MDT=0xF00`). Connectivity for ground objects is NOT a line list — `.WGD <name>` entries are **executable 6809 draw code** (`PLOT/DRAWTO/BDRAWTO` over 1-based point indices; `BJGDRW` does `JMP (U)` into them). Aliases via `.WPZ2`/`.WGD2` mean several objects share one point table with different draw routines (TWR/BNK/STB all alias GND's 16 points). Placements per wave: `WSGRND.MAC` "TOWER MAZES" (TOWER/BISHOP/BUNKER macros — note BUNKER never increments `.TWRS`, so bunkers are tower-quota-neutral). Colors: WSGRND `GDVIEW` (`VGCYLW` body, `VGCWHT` hat, `VGCRED` lone bunker).

**Example (sw3-11):** authentic surface tower = `.WP GND` profile (h,r) = (0,8)(6,6)(14,5)(52,4)(58,4) — 58 tall × 16 wide, ~3.6:1 — with the white hat = the 52→58 cannon section, and the bunker = base+near-bottom rings only ("SHORTY"). Bonus trap: the local disasm's `Object_10` (which the clone had ported as SURFACE_TOWER) is *trench furniture* — its base rectangle is identical to `Obj_Trench_Squares`' outer square.

---

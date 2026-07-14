# TEA Gotchas

Common pitfalls encountered during TEA (test-design / RED) work.

---

### A SEEDED RNG makes "it's deterministic" vacuous — to tell a CHASE from a COIN, move the PLAYER

**Situation:** Pinning any enemy decision that is supposed to depend on the player — a chase, an
aim, a steer — in a sim whose randomness comes from a seeded PRNG (tp1-25: does the fuseball
chase, or does it flip the LEFRIT coin?).

**Problem:** I wrote two tests that PASSED AGAINST THE UNFIXED CODE, for two different wrong
reasons, and either one would have shipped a green suite over a bug:

1. **"The same board gives the same answer every run."** Meant to prove the decision is not a
   coin flip. Proves nothing: the coin is *seeded*, so it is deterministic too. Identical runs
   give identical answers whether the enemy chases or flips. The assertion cannot fail.
2. **"Player 2 lanes clockwise → the enemy steps counter-clockwise."** A single direction. The
   seeded coin happened to roll that exact lane, so it passed — *on the unfixed code*, by luck.
   Its mirror image failed, which is the only reason I caught it.

**Prevention:** The property no coin can fake is that it **MIRRORS the player**. Hold the seed
fixed and move the PLAYER to the other side; a chaser's direction must flip, a coin's must not.
Assert both halves **in one test**, so neither can pass alone:

    playerCW  → must step one way        │ coin: same lane both times  → the mirror assert fails
    playerCCW → must step the other way  │ chase: flips                → passes

Then the *side* it flips to separates a faithful reversal (`JCHPLA` + `JCHROT`, away) from a
"helpfully corrected" chase (`JCHPLA` alone, toward). Vary the input the behaviour is supposed
to depend on — never the seed.

**Corollary — liveness, still.** A frozen enemy also "ignores the player" and also "responds
identically". Every one of these tests needs the guard: it must actually have moved.

---

### `TR` in Tempest's skill tables ALTERNATES — it does not ramp, and wave 17 is the EVEN slot

**Situation:** Reading any per-wave constant out of Tempest's `WTABLE` contour tables (`TWFUSC`,
`TPUCHDE`, `WPULTIM`, `WPULPOT`, …) — i.e. every tp1 fidelity story that says "from wave N…".

**Problem:** A record like `.BYTE TR,17.,32.,0,40` *reads* like a ramp from 0 to $40 across waves
17-32, and tp1-25's own story description called it one. It is not. `CONTOUR`'s type table says
so out loud — `TR=0C;ALTERNATE BETWEEN BYTES 3 & 4` (ALWELG.MAC:414) — and `DOTR` (858-865) is
`JSR RANGER / AND I,1 / IFNE / INY`: it takes byte 4 on an **ODD** offset into the range and
byte 3 on an **EVEN** one. `RANGER` (848-856) is `TEMP2 - startWave`, and `TEMP2` is the 1-based
wave (`CONTOUR` loads `CURWAV` and `INC`s it, 415-423).

So the first wave of a `TR` range draws **byte 3**, not byte 4:

    wave 17 → offset 0 → EVEN → byte 3 = 0     ← does NOT chase
    wave 18 → offset 1 → ODD  → byte 4 = $40   ← the chase starts HERE

**Prevention:** A story that says "from wave 17 X happens" is asserting the *table's* start wave,
not the wave the behaviour turns on — and for `TR` those differ by one. Derive the value from
`DOTR`'s parity before you pin a boundary; a test written to the story's wording pins the wrong
wave and goes green. Check the type byte (`T1` = flat, `TZ` = per-wave, `TA` = accumulate,
`TR` = alternate) *before* reading the parameters.

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

### A "renders inside-out / anomalous" bug on a vector model is NOT a winding/culling bug — the shell has neither

**Situation:** A story reports a model "renders inside-out / turned-through / anomalous" and asks you to fix the "winding/geometry" (e.g. sw3-10 Death Star). Your instinct (and even the SM handoff) may be "inverted normals / back-face culling."

**Problem:** These games are pure wireframes. `drawWireframe` (star-wars `src/shell/wireframe.ts`) strokes EVERY edge — no back-face cull, no hidden-line removal, no depth cue. There is no winding or normal to invert. Writing a RED test around "consistent winding / outward normals" pins a property the renderer doesn't use; it can't capture the real defect.

**Prevention/Fix:** REPRODUCE IT VISUALLY before theorising. The Chrome extension may be down — use the Playwright MCP against the running dev server (star-wars is already on `:5274`, base `/`). Two reliable moves: (1) `page.evaluate(async()=>{ const {DEATH_STAR}=await import('/src/core/models.ts'); ... })` and hand-project the vertices to a canvas at controlled angles; (2) better, drive the REAL frame: `import('/src/shell/render.ts').render(ctx, {...initialState(seed), phase:'space', phaseKills: SPACE_WAVE_QUOTA, enemies:[]}, W, H)` — that's exactly what the player sees. Screenshot to a file and Read it. Color-code the suspect sub-feature (e.g. dish edges red) to see how it reads. The real sw3-10 defect: the model is a fine UV sphere, but the superlaser dish was seated on **+X** while the space camera is IDENTITY at the origin looking −Z with the body at `[0,0,z<0]` (render.ts `deathStarPlacement`/`cameraView`), so the dish is seen EDGE-ON as a crossed bowtie spike. Fix = reseat the dish onto the camera-facing **+Z** hemisphere (pure geometry in `buildDeathStar`).

**Test design that survives:** recover the feature direction FROM GEOMETRY, don't pin indices. On a UV sphere ~all verts sit at radius R (11-7 on-shell contract); the dish's recessed floor is the lone vertex(es) at radius ≤ 0.9·R, so the unit centroid of the recessed set = the way the dish faces. Assert that axis has a dominant +Z (`axis[2] > 0.5`, `axis[2] > |axis[0]|`, `|axis[0]| < 0.5`). Also: 11-7 explicitly left "the VISUAL correctness of the superlaser dish" as an eyeball check it never did — orientation-left-to-eyeball is a recurring source of these follow-on bugs; when a builder's doc comment says "orientation is a RENDER concern to eyeball," expect a future fidelity story.

---

### Pin ANIMATION as topology-over-a-sweep, and stay seam-agnostic

**Situation:** RED test for a star-wars render *animation* (a multi-frame flicker, a cycling sparkle, a pulsing glow) where the frame-driver seam is left open by the SM handoff (shot `ttl` threaded in vs a shell-owned clock).

**Problem:** (1) Pinning the exact per-frame vertex data over-couples the test to one transcription and rejects valid faithful ports — and violates the repo's "colour-family + topology, not pixels" convention (sw3-9). (2) Driving the test off ONE seam (e.g. asserting "varying `ttl` changes the frame") forbids the other permitted seam; asserting "render is deterministic across identical calls" forbids a shell-clock seam.

**Prevention:** Assert the *observable topology CHANGES over a sweep*, seam-agnostically. Call the public `render(ctx, state, w, h)` across N samples that vary BOTH the shot state (`ttl`) AND the call count, collect a normalised per-frame signature (rounded stroke deltas relative to the projected centre), and assert `distinctSignatures ≥ 2`. That fails hard on a static frame (exactly 1) and passes under either driver. For "extra detail at tips" (fuse balls) count SHORT OFF-CENTRE marks (≤0.4× sparkle radius, both endpoints off the centre) so a split radial spike can't satisfy it.

**Fix:** Sample only the AGED shot life (`elapsed = TTL - ttl > muzzle window`) so no amber muzzle flash pollutes the red-body signature. Recommend (Delivery Finding, non-binding) the `elapsed`-driven seam — the exact quantity `render.ts` already uses for the muzzle flash — and warn OFF wall-clock drivers (non-deterministic, untestable). Leave "no `src/core` change" to the Reviewer's diff trace, not a unit test.

**Also:** when extending the recording-canvas mock to capture `fillStyle`/`arc` (needed to accept fuse balls drawn as filled dots), do NOT keep a plain `fillStyle: ''` property alongside a `get/set fillStyle` accessor — TS2300 "duplicate identifier". Use only the accessor (as the existing mock already does for `strokeStyle`). `tsc` catches it; vitest does not.

**Example (sw3-13, worked as sw3-11):** fireball flicker — 24-sample `ttl` sweep, `distinctSignatures ≥ 2` (static GNB0 = 1 → fails), plus ≥3 short off-centre fuse marks; guard asserts every frame stays a red centre sparkle, never amber.

---

### For star-wars GAME-LOGIC quarry, the ORIGINAL Atari source-text beats the disasm — real symbol names, whole routines

**Situation:** Pinning an authentic star-wars *behaviour/number* (a hit/miss test, a window, a timer, a score gate) — the "game LOGIC lives in the disasm" case, not a vector shape.

**Problem:** `reference/disasm/StarWars_annotated.lst` has the logic but under auto-generated names (`word_4845`, `DPbyte_92`, `sub_6B22`) that hide intent, and a routine's callers/callees are scattered. You can burn a lot of time reconstructing what a flag *means*.

**Prevention/Fix:** The full original "Warp Speed" source tree is at `/Users/slabgorb/Projects/star-wars-1983-source-text` (~120 `WS*.MAC` + `WSVROM.MAC` etc.) — the SAME repo family as `historicalsource/star-wars`, but the whole checkout. Game logic files: `WSMAIN.MAC` (phase/game loop), `WSBASE.MAC` (trench base motion, wedge layout), `WSGUNS.MAC` (player proton torpedo + collisions), `WSGAS.MAC` (scoring tables), `WSGRND.MAC` (ground objects). Symbols are HUMAN-named with intent comments. `grep -in "exhaust\|port\|miss\|800" WSMAIN.MAC`. Constants are octal/hex per file `.RADIX`; `#0800` etc. are hex.

**Example (sw3-15):** the exhaust-port hit/miss = `WSMAIN.MAC:1896-1917`: `LDD BS.ELC / SUBD M$TX / SUBD #0800 / IFLS ;?ABOUT TO BASH OUR NOSE IN THE END WALL?` — the `$800` window is ONE trench-wedge spacing (`WSBASE.MAC:1125` short wedge `#800`), a NARROW final segment. At the window, `LDA PT.LIV` (proton-torp-alive/on-target) decides HIT vs MISS; MISS → `PH$B0B` "TRY TRENCH AGAIN" (the clone's crash+respawn is authentic). The porthole `BS.PLC` is a FIXED location and the torpedo is GUIDED onto it (`WSGUNS.MAC MVPTGN`) — so "require aim alignment" does NOT mean randomise the port; keep it dead-centre and tighten the sphere.

---

### A story that changes a hit/collision CONTRACT breaks sibling tests staged OUTSIDE the new gate — re-seat them in RED

**Situation:** RED for a story that narrows/gates a collision or hit test (tighter radius, an approach window, an aim requirement) on a target other stories already have passing tests for.

**Problem:** Sibling suites often stage their hit at a *convenient* position that predates your gate (e.g. the port at trench-entry `-EXHAUST_PORT_DISTANCE`, or mid-trench `-1500`) and assert a HIT. Your new gate turns those green tests RED the moment Dev implements it — and Dev can't fix them (Dev makes tests pass, doesn't move goalposts). If you don't catch it in RED, Dev is stuck between your new AC and an old sibling test.

**Prevention/Fix:** BEFORE writing, `grep` every sibling test for the target and note the position each stages its hit at; anything outside your new gate must be re-seated (TEA owns test maintenance) into the gated region, preserving that test's ACTUAL intent (which is usually orthogonal to position). Verify the re-seat stays green BOTH on current code and after the fix (it should — you only moved it into a region both accept). Log each as a 6-field deviation. Your own new far-position test then supplies the "far shot is excluded" coverage the re-seat gave up.

**Example (sw3-15):** the `$800` window gate would have flipped `force-bonus.test.ts` (kill at `-2400`) and `exhaust-port-outcome.test.ts`'s real-speed detonation (`-1500`) to RED. Re-seated both to `-300` (in-window); the clean/dirty-bonus and no-tunnel intents are unchanged; the new suite's "torpedo fired at trench entry no longer wins" is the replacement far-miss coverage.

---
### WSOBJ.MAC is `.RADIX 16` — and the file contains NO `.RADIX` line to warn you

**Situation:** Transcribing any star-wars `.WP`/`.P`/`.PGND`/`.PH` vertex table from
WSOBJ.MAC to pin an authentic model (sw3-11, sw5-5, and sw5-4 next).

**Problem:** The integer literals are HEX, but `grep -n RADIX WSOBJ.MAC` returns
**nothing** — the radix is set upstream of the file, so the source itself gives you
no warning. Small values (`4`, `6`, `8`) read identically in both bases, so a decimal
misreading *looks* right and passes eyeball review; only two-digit values diverge.
sw3-11 read the `.PGND` height column as decimal and shipped a tower whose three
upper rings were all at the wrong height — and then wrote the wrong numbers into
models.ts's doc comment, this sidecar, and its own test header, where they sat as
"ground truth" for two more stories.

**Prevention:** NEVER transcribe a WSOBJ.MAC table by reading it. Verify every
two-digit literal arithmetically against the baked artifact
(`star-wars/src/tools/romModels.generated.ts`), which the sw5-1 parser produces and
which is independently correct. The macro tells you the arithmetic — e.g.
`.PGND` is `.WORD .A*.S,.B*.S,.C*.S-GD$MDT` with `.S=30.*4`=120, `GD$MDT`=0xF00:

    h=0x58 -> 88*120 - 3840 = 6720   <- the baked z. hex is right.
    h= 58. -> 58*120 - 3840 = 3120   <- appears nowhere. decimal is refuted.

Write that refutation INTO the test (`expect(z).not.toBe(58 * S - GD$MDT)`), so the
next person cannot quietly regress to decimal.

**Also (sw5-5):** ground objects SHARE one point table — `.WPZ2 TWR/BNK/STB` alias
`.WP GND`'s 15 points, and each `.WGD` routine strokes only a subset (BNK strokes 6,
STB 12, leaving the cannon-top ring for the white cap). So a faithful port carries
vertices its own edges never touch. That breaks the registry's "no orphan vertices"
invariant — carve it out by name and re-assert the intent over the DRAWN subgraph;
do NOT trim the table, or romCompare's `verticesEqual` (a DEEP equality) slams shut
and the whole edge comparison is forfeited. And `GD$MDT` is not cosmetic: its comment
is "OFFSET HITE TO MID OF PLAYERS HITE" — it IS the ROM's skim altitude.

---

### The ROM's THIRD coordinate is HEIGHT — mapping it to our `z` stands the model on its edge

**Situation:** Porting any star-wars ROM object (`.P` / `.PH` / `.PGND` in WSOBJ.MAC) into
`models.ts`, and then deciding how the SHELL should orient it.

**Problem:** The vertex triples transcribe cleanly into `models.ts` — and that is the trap.
The ROM's frame is **(x = fore/aft, y = lateral, z = UP)**; ours is **y-up**. Feed a ROM
triple straight into our world (i.e. draw it under `IDENTITY`) and you have silently mapped
the ROM's HEIGHT axis onto our DEPTH axis: the object is rotated 90° onto its edge. It still
*looks* like a plausible object, so eyeball review passes. sw5-4 shipped the exhaust port this
way — a plate that should lie FLAT in the trench floor ended up standing vertically, half of it
buried below the floor — and then wrote a test asserting the vertical reading was correct AND
warning the next dev off the `rotationX(-90°)` that fixes it.

**Prevention:** The ROM tells you which component is height, twice, if you look:
- `.MACRO .PGND .A,.B,.C ;OFFSET HITE TO MID OF PLAYERS HITE` → `.WORD .A'*.S,.B'*.S,.C'*.S-GD$MDT`.
  The **HEIGHT** offset `GD$MDT` is subtracted from the **THIRD** component. Third = height.
- `render.ts`'s `TOWER_ORIENT` already says it in English: *"The ROM's up-axis is Z (x is
  fore/aft, y lateral); ours is Y. This maps (x, y, z) -> (x, z, -y)."*

So: **every ground object needs that `rotationX(-90°)` bridge.** An object whose third
components are ALL ZERO is a HORIZONTAL plate (flat on the ground), never a billboard facing
the pilot. Check the placement code too — WSBASE.MAC `BSVPORT` says `;Z HITE ON BOTTOM OF
TRENCH` and `;Y WIDTH IN CENTER`, which settles the question outright.

**Fix:** Square-symmetric objects (the port is three concentric SQUARES, |x|=|y| at every point)
are 4-fold symmetric about the vertical, so the rotation's horizontal-axis swap is invisible —
`rotationX(-90°)` alone lands it correctly, with no scale and no lift (`.PH` rows carry no
`-GD$MDT`, unlike `.PGND`). Do NOT re-seat the model's vertices to suit a viewing angle:
`romCompare`'s deep vertex compare demands them 1:1, and `PORT_HIT_RADIUS` is bound to the
porthole in the same units. Orientation is the SHELL's job.

**And beware the compensating hack:** a correctly-laid floor plate can still look wrong if
another constant is also wrong. Ours read as a 2.8-pixel sliver — because `TRENCH_SKIM` flew the
pilot 60 units off the deck where the ROM flies him 512–3840. sw5-4 "fixed" that by standing the
port up: a third wrong constant cancelling two others. When a fidelity fix makes the game look
WORSE, suspect a neighbouring constant before you suspect the fix. **Measure it** — project the
model through the real `render()` path and print the screen footprint (2.8px vs 95.7px is not a
matter of taste).

---

### WSBASE.MAC is `.RADIX 16` too — and it hands you the whole trench

**Situation:** Any question about the star-wars TRENCH's dimensions, the pilot's flight band, or
where the exhaust port sits.

**Problem:** `trench-channel.ts` carried `TRENCH_HALF_W`/`TRENCH_WALL_H` as `PROVISIONAL … not
pinned` for four stories, on the belief that the ROM offered only "two conflicting candidates and
no documented ROM-unit↔our-unit conversion to arbitrate them". It offers neither conflict nor
ambiguity — it offers a table, in the file nobody read.

**Prevention/Fix:** `WSBASE.MAC` § `VIEW STARBASE` is the trench, drawn:
- `TBSBL` ("BASE BOTTOM LINES") is the literal cross-section — rows of `(Y lateral, Z height)`:
  `-400,0` / `400,0` (top rails) and `±400,-1000` / `±200,-1000` (floor). So **half-width `$400`
  = 1024, depth `$1000` = 4096** — top at height 0, floor below it. Corroborated by `BSVSID`
  (`LDD #-400 ;LEFT SIDE`) and `BSVSDW` (`LDD #-1000 ;BOTTOM EDGE` / `;LIMIT TO BOTTOM`).
- `WSMAIN.MAC` `S1MVBS` clamps the pilot laterally to `#1FF` / `#-1FF` (±511), and `SMVG1B` drops
  him into the trench until he is `#-0E00+100` — commented **`;JUST ABOVE BOTTOM OF TRENCH`**. So
  the eye band is 512–3840 above the floor and he ENTERS LOW. `GD$MNT == 200` (512) is the same
  minimum ground clearance the surface phase uses.
- Consequence worth knowing: ±511 lateral inside ±1024 walls means **the cabinet's pilot can never
  crash into a wall** — wall furniture is shoot-only, and only the channel-spanning catwalk can
  block him. That is why the dive band exists.

**⚠ The radix.** WSBASE has no `.RADIX` line either, but it proves itself from the inside:
`;PAINFUL MATH -- 8000 WRAPAROUND HANDLER` (only `0x8000` is the signed-16 wrap; decimal 8000 is
nothing) and `CMPD #7000`, which the disassembly independently reports as `$7000`. Read `-1000` as
decimal and you get a 1000-deep trench that is wider than it is tall — a ditch. The real thing is
a canyon, 2048 × 4096.

**Also:** `.P` args are DECIMAL and `.PH` args are HEX — the macros differ by one character, and
that is what the "H" means:
    .MACRO .P  .1,.2,.3    .WORD .1'.*.S, …   <- trailing "." forces decimal
    .MACRO .PH .1,.2,.3    .WORD .1'*.S,  …   <- no "." → ambient radix → HEX

---

### A test that STAGES the bolt on the target cannot see an aiming regression

**Situation:** Any story that moves the camera, the player's position, or a target's position in a
game where the player must AIM at things.

**Problem:** star-wars' shooting tests all went through `boltOn()` — fabricate the obstacle AND the
projectile at the same hardcoded position, then step once. The bolt is already on the target; the
aim path (`input.fire` → `aimDirection` → the muzzle) is never executed. sw5-6 raised the pilot's
eye 768 units and left the gun at the world origin, so the crosshair ray and the bolt ray came apart
by 768: **all 7 shootable trench obstacles became unhittable, and the suite stayed 1018/1018 green.**
The port was winnable only by aiming at *empty sky*. Nothing in the repo could see it.

**Prevention:** For anything the player must aim at, write at least ONE test that fires the real gun:
compute where the target appears on screen FROM THE EYE (invert the same projection the crosshair is
drawn under), set `aimX/aimY` to that, hold `fire: true` through real `stepGame` frames, and assert
the target DIES. Also assert the aim is *reachable* — |NDC| ≤ 1 — because "the player cannot even
point at it" is a different failure from "the bolt misses", and the message should say which.

**Fix / traps:**
- **A kill is a SCORE/EVENT, never `obstacles.length === 0`** — that also fires when the thing simply
  scrolls past and despawns. My first probe reported HITs that were despawns.
- **Fire ONE bolt, not a held trigger.** Holding fire for N frames lets a LATE bolt (fired when the
  target is already close, so it barely has time to drift) blunder into the hit sphere from the wrong
  muzzle — two of my own tests passed *under the very regression they existed to catch*.
- **Mutate to prove it bites**: put the bug back and confirm the suite fails. "Passes" is not evidence.
- Assert the negative too: **aiming at nothing must not win.** That is what caught the absurdity.

---

### The Red Baron quarry has TWO copies and they DISAGREE ABOUT LINE NUMBERS

**Situation:** Any red-baron story that cites the Atari source by `FILE.MAC:LINE` — which is every
rb4 fidelity story, and every RED test that pins a ROM constant.

**Problem:** Three checkouts of the same source exist on this machine and they are NOT
interchangeable:

    ~/Projects/red-baron-source-text          LF-only   md5 497db9…  6294 lines   <- CITABLE
    ~/Projects/red-baron-source               CRLF      md5 27cdfe…  6286 lines   <- NOT citable
    red-baron/reference/red-baron/  (gitignored)         md5 27cdfe…              <- the CRLF one!

The citable copy renders each form-feed page break (`\x0c`) as its own line; the CRLF sibling glues
it onto the following `.SBTTL`/`.TITLE`. So the sibling is **8 lines short**, and the shortfall
accrues in a **STAIRCASE**, not a constant offset:

    citable = sibling + 0   (sibling lines    1- 263)
                     + 1   (              265- 724)   <- CALCNT lives here: 620 vs 621
                     + 2   (              726-1654)
                     …
                     + 8   (             5963-6285)   <- the vertex table

A citation copied from the sibling is off by ONE near the top of the file and by EIGHT near the
bottom. **There is no constant offset that repairs them** — "fix the off-by-one" by shifting
everything +1 and you silently re-break every deep citation. rb4-2 exists because the findings doc
was written against the sibling; its own header even names `reference/red-baron/` as its source.

**Prevention:** Never resolve a citation against whatever copy is lying around. FINGERPRINT the
quarry first, and make the fingerprint reject the sibling — RBARON.MAC must have **6294 lines**,
`:74` = `\t.RADIX 16`, `:621` = `CALCNT\t=18`, `:6217` = `\t.RADIX 10`, `:6281` = `\t.RADIX 16`.
Then *derive* each expected line by finding where the source defines the symbol; never type the
number. `RED_BARON_SOURCE_DIR` defaults to the citable copy — keep it that way.

**Also — the decoy build is not what it looks like.** `R2BRON.MAC` is byte-identical to `RBARON.MAC`
except for **7 lines, and every one is a ROM self-test checksum byte**. So citing `R2BRON.MAC:NNNN`
gives you the RIGHT text at the RIGHT line and the citation "verifies" — which is why 41 of them
survived review. The poison is in **`R2GRND.MAC`**, the module R2BRON's load map links, which differs
from shipped `RBGRND.MAC` in exactly two lines: `FRMECNT=4→5` (62.5 Hz → 50 Hz) and `CMP I,3` →
`CMP I,40` (the watchdog, off by 21×). A blind `R2BRON`→`RBARON` rename is content-safe; a blind
`R2GRND`→`RBGRND` rename **launders a lie**. And `R2BRON.MAP:10` identifies its own object module as
`RBARON` — the decoy signs the ship build's name.

**Test design that survives:** put the checker in the TEST file, not in `tools/` — then a doc-fix
story needs zero production code and GREEN means the prose was actually corrected. Assert the
guard bites (reconstruct the sibling's form-feed gluing in memory and require the fingerprint to
reject it); a fingerprint nobody has tampered with is decoration.

**What you CANNOT build:** a universal "every citation resolves" checker over the findings doc. I
tried: 64% resolve against the citable copy vs 57% against the sibling — noise, because the oracle
("which symbol does this prose citation mean?") is unreliable. `docs/audit/findings/*.json` carries a
per-citation `verbatim` field and IS universally checkable. The doc does not. Until it does, check
citations the doc makes at a symbol's DEFINITION (derive the line, demand the doc cite it) and leave
use-site ranges alone.

---

### A label's COMMENT is not a caller — for "what plays when", grep the `JSR`, never the callee

**Situation:** Pinning which ROM tune/sound/effect belongs to which game moment (sw6-1:
which of the 1983 tunes is the Death Star *surface* music?).

**Problem:** `SNDPM.MAC:337` labels its entry point `PMBEN:: ;BENS THEME (START OF TOWER)`,
and `SNDPBX.MAC` echoes it (`PM BEN ;BEN THEME:START TOWER`). Both say "tower". Both are
**stale**. `PMBEN`'s only caller in the entire 1983 tree is `WSMAIN.MAC:2161`:

    JSR PMBEN     ;BEN'S THEME WHEN LOSE GAME WITH NO HIGH SCORE

It is the **game-over** theme. The real ground/towers cue is `PM4TH` ("BATTLE MUSIC IN
FOURTHS: GROUND TOWERS", `WSMAIN.MAC:1636`). The story AC *and* the Architect's design
spec both quoted the stale label as ground truth — the error propagated from a 1983
comment into a 2026 acceptance criterion, and would have baked the you-lost music onto
the Death Star surface.

**Prevention/Fix:** A callee's label comment records what the author *intended* when he
wrote it; the call site records what the game *does*. They drift. For any
"which asset plays at moment X" question, enumerate the CALL SITES and read THEIR
comments: `grep -rn "JSR[[:space:]]*PM[A-Z0-9]*" *.MAC` — there were exactly 11 in the
whole tree, all in `WSMAIN.MAC`, each with an intent comment at the point of use. Then
write the refutation INTO the test (`expect(towerTunes).not.toContain('BEN')`) with the
call-site citation, so nobody "corrects" it back to the label.

**Corollary — the sound-command IDs are POSITIONAL.** `SNDPBX.MAC` assigns each
`AUD`/`PM`/`SPK` entry the next `PBX$EQ` (entry 0 = RESET), so a command's `$NN` is just
its ordinal in file order. Count them to decode `$1D`/`$20`/`$22`/`$24` — don't guess.

---

### SWMUS.MAC is a self-documenting oracle — mine the comment/byte pairs, don't hand-decode

**Situation:** Transcribing the star-wars POKEY music (or any assembled `.MAC` listing
where the macro call survives as a comment).

**Problem:** The `.NOTE`/`.CKEY`/`.LOOP` macro *definitions* are not preserved in the
source tree, so the encoding looks unrecoverable.

**Prevention/Fix:** It doesn't need them. `SWMUS.MAC` is the **assembled** listing: every
`.BYTE` carries its original macro call as a comment directly above it —

    ;.NOTE F5C
    .BYTE  042, 016

— so the file *is* its own Rosetta stone. Mine the pairs mechanically and the encoding
falls out and self-verifies (1225/1227 on the first pass): pitch byte =
`octave*12 + semitone + 1`, **0 = REST** (`NOTTAB:` literally opens `.WORD 0 ;REST`);
opcode byte = `0x80 | index-into-PKDT` (SNDPM.MAC:934). Notes stay < `0x80` so the sign
bit alone separates note from function (`TSTB ;CHECK THE OPCODE`).

**⚠ The radix cuts BOTH ways here.** `SWMUS.MAC`/`SNDPM.MAC` are `.RADIX 16`, so the byte
stream is HEX — but a **trailing dot forces DECIMAL**, and the tune *indices* use it:
`.TUNE`'s expansion is `LDB #<2*'TNUM'.>` (SNDPM.MAC:325). Read `PMTH5`'s `.TUNE 1,27 …
4,30` as hex and its four voices scatter across the DESCENT tune plus a test tone — and
it would still play. So refute BOTH misreadings: decimal for the stream, hex for the
indices.

---

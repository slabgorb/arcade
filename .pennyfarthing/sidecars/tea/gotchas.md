# TEA Gotchas

Common pitfalls encountered during TEA (test-design / RED) work.

---

### After the second defeat, stop patching the scanner and parse — and GENERATE the mutants instead of listing them

**Situation:** The end of the road the next three gotchas walk. cp5-1 spent **four** rounds proving
one compile-time property (a `never` exhaustiveness guard) by reading source text, and was beaten
every round by text a regex could not tell from code:

| Round | Defeated by | The fix |
|---|---|---|
| 1 | the word `never` in a **comment** | anchor to the declaration |
| 2 | the guard **deleted** outright | write a test at all |
| 3 | a guard-shaped decoy **elsewhere in the file** | scope to the function body |
| 4 | a decoy **nested inside** that body; a `}` **inside a string**; a **brace-less** `default:` | ...a fifth regex? |

**Problem:** Each fix was correct, each was mutation-proven, and each was one level short. That is
not four mistakes — it is one mistake made four times: **a hand-rolled scanner is a partial
TypeScript parser, and the gap is always one construct deeper than you thought to test.** Round 3's
fix even introduced its own asymmetry (the comment stripper was made string-aware; the brace walker
that ran after it was not), so a stray `console.debug('legacy}')` in the arm blinded the guard to the
`audio.play()` that followed it. Nobody would review that line twice.

**Prevention:**

1. **Use the compiler's parser.** `typescript` is already a dependency of any TS repo — it is what
   `tsc` runs. `ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true)` plus a `forEachChild`
   walk is ~15 lines and retires the whole table at once, by construction rather than by patch:
   comments are not in the tree (round 1); a node's text is syntax-accurate, so a `}` or the
   characters `audio.` inside a **string literal** are non-events (round 4's H2); a `DefaultClause`
   has statements whether or not it wears braces (H3); and scope is a tree relation, not a text
   offset (round 3, round 4's H1).
2. **Assert on structure, not spelling.** "the initializer is an Identifier equal to the
   discriminant" admits `= effect` and rejects `= effect as never`, `= effect!` and `= 0 as never`
   without enumerating them. Quote style, whitespace and formatter runs stop mattering entirely.
3. **Derive the expected set from the source too.** A hand-kept `['play','startLoop','stopLoop']` in
   the test agrees with itself forever while the real union drifts — the token-not-claim failure one
   indirection out. Read the union off the discriminant's declared type; then *adding a fourth member
   with no case arm* reds, which is the actual claim and which no round of regexes could test at all.
4. **Ask a call-graph question when "which one is real?" is ambiguous.** A decoy nested inside the
   function must be rejected; a helper extracted *out* of it and called must be accepted. Position
   cannot separate those — both are "a switch in another function". Reachability can: the decoy is
   never called.
5. **GENERATE the mutants from the real source; do not list them.** A hand-written matrix measures
   the author's imagination. Round 3's returned 100% while missing the live defect, and its
   fleet-compatibility row *cited* an idiom it never actually tested. Generate one row per case
   clause the switch declares, one per engine method (each carrying the brace-in-string hazard, so it
   is in every row rather than being the one case nobody tried), and one per decoy topology
   (before / after / nested).
6. **Every must-REJECT mutant must assert it CHANGED the source.** A mutation that silently failed to
   apply scores the unmutated source and reports "rejected as required" while proving nothing. Hold
   must-ACCEPT rows to the weaker rule deliberately — "this shape is already the shape" is harmless,
   and failing it reds the suite for a refactor that changed no guarantee.
7. **Mutate the test's own MACHINERY, not just the code under test.** This is the step that pays.
   Neutering `verdict()` reddened 15 rows and emptying the engine-method list reddened 1 — but
   neutering **reachability** left the matrix fully GREEN, proving the rejections credited to the
   call-graph reasoning did not depend on it (a decoy that is merely *present* already yields two
   switches and is rejected on that count alone). The missing row was the symmetric control:
   *dispatch INTACT, unreachable decoy added* must be **accepted**. Only that pair can tell dead code
   from a real second switch.

**The shape of the lesson:** when a guard is defeated twice by the same *class* of input, the next
fix should change the KIND of instrument, not its precision. And the honest test of a guard is not
"does it catch the mutants I wrote" but "does it still hold when I break the guard itself".

*Origin: cp5-1 rounds 1-5 (Reviewer's REJECT: "stop patching the scanner").*

---

### A source anchor needs the right SCOPE, not just the right pattern — and mutation-testing against your own list of failures is a mirror, not an adversary

**Situation:** Any test that proves a compile-time property by reading source text — the previous two
gotchas' territory. cp5-1 round 3: five assertions, anchored to the declaration, evaluated over
comment-stripped source, each mutation-proven. All five read the **whole file**.

**Problem:** The Reviewer built the mutant I had not imagined and it passed **20/20 with `tsc`
clean**: gut the real `switch` so a future fourth effect is silently played as a one-shot, and park a
correct guard-shaped `switch` in dead code above it. Worse, it needs no decoy to bite — the helper
took the **first** `default: {` in the file, so any second switch added *above* the function under
test silently redirects the anchors onto the wrong arm. That is ordinary growth, not sabotage.

Three rounds, and the failure moved one level up each time — **token → declaration → location.** Each
fix was correct and each left the next level exposed.

**Prevention — scope first, then match:**

1. **Extract the function/class body the mechanism lives in before running any anchor.** Balance the
   parameter list's parens first, *then* braces, so an object type in a signature is not mistaken for
   the body's opening brace. Never a single non-greedy regex: `/\{([\s\S]*?)\n\s*\}/` stops at the
   first nested `}`, so wrapping a guard in an inner block hides everything after it.
2. **Add a scope control.** If the extractor stops finding the body (a rename, a refactor to an arrow
   const), every assertion silently reads `null`. Assert the body was found, that it contains the
   construct you are describing, and that it is a PROPER SUBSET of the file.
3. **Keep a decoy FIXTURE in the suite** — decoyed source held as data, run through the extraction
   helpers. It proves the scoping forever and, unlike a source mutation, the suite never mutates the
   tree it runs in.
4. **Pin the property, not the spelling.** Add must-stay-GREEN rows to the matrix: renaming the
   guard's identifier to the convention other modules use, or reformatting quote style, must NOT red.
   A guard that reds on a refactor trains people to weaken it.

**The meta-lesson, which is the one worth carrying:** I mutation-tested against the ways *I* thought
the guard could break, and it passed all of them. The failure mode I did not enumerate was the one
that shipped. **Ask someone else to build the mutant, or write the fixture that encodes the defect
SHAPE rather than the current file** — your own list of mutations is bounded by the same imagination
that wrote the bug.

---

### Anchoring a source assertion to the DECLARATION is not enough — the declaration can be quoted in a COMMENT. Strip comments, then count.

**Situation:** Pinning a COMPILE-TIME-only claim, where no runtime assertion can reach the mechanism
(cp5-1: a `switch`'s `default: { const unreachable: never = effect }` exhaustiveness guard — the two
shapes differ only in what `tsc` rejects, never in what the code does, so a recording fake cannot tell
them apart).

**Problem:** The project rule born from the previous round of this same story says *"anchor to the
DECLARATION that does the work, not to the word"* — because `expect(src).toMatch(/never/)` matched the
word `never` in two comments and stayed green over a deleted guard. So I wrote the declaration anchor,
`/const\s+unreachable\s*:\s*never\s*=\s*effect/`. **It has the identical defect one level up.**
Measured, not argued: rewrite the guard as `// const unreachable: never = effect` and a raw-source
declaration anchor is still **green over a deleted guard**. Files whose comments quote their own code
— which is most well-commented files, and certainly any file carrying a REWORK note — make this
likely, not hypothetical.

**Prevention:** Count occurrences in comment-**STRIPPED** source, never raw. Then the two obvious
follow-on traps:

1. **Give the stripper a positive control.** A `stripComments` that silently returned its input makes
   every "not in prose" claim vacuous and rebuilds the exact defect you are preventing. Assert
   `stripped.length < raw.length` *and* that no comment marker survives — and mutation-prove it by
   making the helper a no-op and requiring red.
2. **Assert the STRIPPED count, not the raw count.** Raw-count assertions red spuriously the day
   someone legitimately quotes the code in a comment. The failure you care about is the reverse: the
   declaration existing *only* in prose, i.e. stripped count `0`.

Then prove the combination — no-op stripper **plus** comment-only guard — is still caught. If it is
not, the block is decoration.

**Corollary — reject the cast, not just the keyword.** `const x: never = effect` is a guard;
`const x: never = effect as never` compiles whatever `effect` is and proves nothing (this was the same
story's earlier Low). A regex ending at `effect` matches both. Anchor to end-of-statement
(`…=\s*effect\s*;?\s*$` with the `m` flag) so the cast reds.

---

### The mutation-test loop needs a `cp` backup taken BEFORE the first mutation — `git checkout` cannot tell your experiment from your work

**Situation:** Mutation-proving assertions (delete the mechanism, require red, restore) while your own
new tests are written but not yet committed.

**Problem:** I mutated a helper inside my own test file to prove a control was non-vacuous, then ran
`git checkout -- <that test file>` to undo it. Both the mutation *and* ~160 lines of uncommitted new
tests were uncommitted, so `git checkout` reverted **both** — it restored HEAD, which is the file
without my work. The repo memory note for this is literally named
`git-checkout-clobbers-uncommitted-mutation` and I walked into it anyway, because in the moment the
command reads as "undo my mutation" rather than "discard everything not committed."

**Prevention:** Two rules, and the first is cheap enough to be unconditional:

1. `cp` the file to the scratchpad **immediately after writing it and before the first mutation** —
   then every restore is `cp` back, and no VCS command is ever involved.
2. **Commit the RED tests first, then mutate.** A commit makes `git checkout --` safe by construction
   and is what you were going to do at the end of the phase anyway.

**Recovery, if it happens:** rewrite from context, then **re-run the entire mutation matrix** rather
than trusting the reconstruction — it is the only thing that proves the rebuilt file is behaviourally
identical, and it is cheap. Do not skip it because the tests "look the same."

---

### A "remove the invented constant" story: the invented number is often a REAL ROM value for a DIFFERENT mechanic — pin the mechanism you're deleting, not the number

**Situation:** A BOOK_WAS_WRONG fidelity story hands you a constant to DELETE (sw7-4 / S-015:
the clone's `EXTRA_LIFE_THRESHOLDS = [400_000, 800_000]`, "an extra shield when the score crosses
400k/800k"). The code comment defended it hard ("do NOT ×10", cited a findings doc).

**Problem:** It is tempting to write the removal test as "the ROM contains no 400,000/800,000" — but
the numbers ARE in the ROM. They are the **Death-Star-SELECTION start bonus** display strings
(`TSCBN1..4` = 200k/400k/600k/800k, WSGAS.MAC:527-530; banner MS.BON "DEATH STAR BONUS EARNED";
awarded ONCE at game start, `SCRWAV`). The clone misread a one-time *selection* bonus as a recurring
*score-threshold* extra-life ladder. A test asserting "400000 absent from the ROM" is both wrong and
vacuous.

**Prevention:** Pin the MECHANISM, not the literal. The correct removal test is behavioural: crossing
those scores grants **no extra shield** (`finalizeScore(prev@399_999, next@800_000).lives ===
prev.lives`), and the score funnel never RAISES lives for any jump. Invert the old suite (sw3-6's
"awards a life at 400k" → "grants nothing at 400k"), keep the unrelated blocks (the `byte_4B2C`
flash) verbatim. And record the real mechanic (the selection bonus) as a Delivery Finding — it is a
genuine unmodelled feature, not noise, and explains where the book's error came from.

---

### A story that SUBSUMES an audit item can MISLABEL it — verify the item's ROM symbol before you scope its test

**Situation:** A cluster story folds several audit findings into one line (sw7-4 R4: "S-013 (5,000 per
surviving shield unit + **H-021 RWD banner**)").

**Problem:** The story's parenthetical equated H-021 with S-013's per-shield banner. The 1983 source
says they are **two different banners**: the per-shield reward is `MS.BRE` "BONUS FOR REMAINING
ENERGY / 5,000 X N" (TCMES.MAC:611-612, end-of-wave VEWNXT), while H-021 is `MS.RWD` "50,000 FOR
SHOOTING ALL TOWERS" (TCMES.MAC:609, shown when towers-left hits 0). Writing ONE banner test to the
story's wording would have silently dropped the other and pinned the wrong text/trigger.

**Prevention:** For every subsumed banner/sound/score item, grep the ROM for its symbol and its CALL
SITE before scoping the test (the same "a label's comment is not a caller" discipline). Two banners →
two tests; log the conflation as a deviation so the Reviewer knows the story text was corrected, not
ignored. Corollary: the story's own description is a lower spec authority than the primary source it
cites — when they disagree, the ROM wins, and you say so in writing.

---

### Pinning a lookup TABLE? Test the wave AFTER the last row. The bug lives where the table ENDS.

**Situation:** Any story that ports a ROM wave/skill table (`TWFUSC`, `WPULTIM`, `WPULPOT`, the whole
of Tempest's `WTABLE`; Red Baron and Battlezone have the same shape) into a per-level lookup.

**Problem:** I pinned tp1-25's `TWFUSC` at **every boundary inside the table** — 17, 18, 32, 33, 48,
49, 98, 99 — and shipped a function that was WRONG at 100. Every value I chose was *inside* the
table, so the walk-off was invisible to me. Above the last record nothing matched and the lookup fell
through to its end-of-table `return 0` — which is also the legitimate "no chase" answer for the EARLY
waves. One value, two meanings: the deep-wave fuseball silently reverted to the exact coin-flip the
story existed to remove. The Reviewer caught it; my suite could not, and I proved it — extending the
last record's `end` from 99 to 999 left the full suite at **997/997 green**.

**Prevention:** For any table lookup, the test set is not "the boundaries" — it is **the boundaries
PLUS the first value past the end** (and, if reachable, past the start). Then ask the harder question:
*is the out-of-range return value distinguishable from a legitimate in-range one?* If "not found" and
a real answer are the same value (`0`, `-1`, `undefined`), the degradation is SILENT and no caller can
tell. That is a design fault, not just a missing test.

**And check the ROM before assuming out-of-range is even reachable there.** It usually isn't, because
the original hardware capped it. Tempest's `CONTOUR` intercepts the wave *before* the table walk
(ALWELG.MAC:415-423): `CMP I,98. / IFCS / LDA RANDO2 / AND I,1F / ORA I,40 / … / INC TEMP2` — for
wave >= 99 it substitutes a **random** wave in **65..96**, which lies wholly inside the last record,
so the ROM can never fall off its own table. Our port had no such fold, because `s.level` increments
without a cap. **The port reaches states the ROM cannot.** Enumerate those states.

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

### When a "derive the constant" story finds NO byte, the gate is a STATE — and the answer may INVERT the story

**Situation:** A ROM-fidelity story hands you an invented constant and says "find the byte the ROM
compares against, or ratify it" (tp1-27: `PLAYER_RIM_DEPTH = 0.92`, the Tempest grab line).

**Problem:** You go looking for a threshold byte, and the routine does not compare the quantity at
all. `JKITST` — Tempest's grab — tests *not-jumping* and *both legs on the cursor's legs*, and
NOTHING else (ALWELG.MAC:1980-1993). There is no INVAY compare, so there is no byte, so a story
written as "derive it from the byte" has no literal answer and you are tempted to ratify the
invention by default. **Ratifying is the wrong move.** The depth gate exists — it just lives one
level up, in *who is allowed to run the routine*: `VKITST` appears in exactly ONE cam program,
`TOPPER`, the CHASER cam, and `CHASER` seats the invader at `CURSY` ("PLACE EXACTLY AT TOP",
1824-1826). So the grab line is not a tuned threshold — it IS the rim, `CURSY = ILINLIY = $10` →
depth `(0xF0-0x10)/224` = **exactly 1.0**. The invented 0.92 let an invader still CLIMBING, eight
units short of the rim, grab a player the cabinet would never have touched.

**Prevention:** When the compare isn't in the routine, grep the OPCODE, not the routine — find every
cam/state that can *reach* it. A gate you can't find as a number is usually a gate on state. And
check whether the codebase already spells the same ROM line correctly somewhere else: `interpreter.ts`
had `RIM_DEPTH = 1` with a doc comment literally reading *"the ROM's CURSY, the line the cursor sits
on"*. Two spellings of one ROM constant, and the grab used the wrong one — that's the real defect,
and it's invisible if you only look at the file the story names.

**The sting: the answer can INVERT the story's own premise.** tp1-27's AC asked me to cover a sliver
`[0.92, 0.9286)` where a split child is born "both LETHAL and FLIPPING". Once the grab line is 1.0 it
sits ABOVE the burst line ($20 = 0.9286), so that interval is **empty** — no child is EVER born
lethal; ATOP is tested BEFORE the carrier check (1744-1750), so a carrier that actually reaches the
rim becomes a CHASER instead of bursting. The predecessor story (tp1-24) had ratified a difficulty
change ("children are born above the grab line → the player dies on the burst frame") that was pure
artefact of the invented constant, and had shipped a test named *"is INSTANTLY lethal"* asserting it.
**Write the test that refutes the story, log the deviation, and re-seat the sibling.** An AC derived
from an unaudited constant is not evidence.

**Test design that survives:** pin every premise to a LITERAL (0.92, 0.9286, 1.0), never to the
constant under audit — `expect(depth).toBeLessThan(PLAYER_RIM_DEPTH)` re-derives from the very number
you are auditing and stays green for ANY value of it. That is exactly how 0.92 survived two stories
that both leaned on it. Then add the invariant that catches the whole class: **invert the constant and
demand a whole ROM byte back** (`0xF0 - 0.92*224 = 33.92` → not a byte → invented), and assert the
grab line EQUALS the depth a chaser is pinned at (one ROM line, one number).

**And ALWAYS probe the fix before handing off.** Applying the one-line change and running the FULL
suite revealed **15 sibling tests in 8 files** that stage an enemy at `0.95` and call it "at the rim" —
they encoded the same invented constant. Their intent ("an enemy at the rim grabs") was still right;
only the staging depth was stale. TEA owns re-seating those (Dev cannot move goalposts), and re-seat
to a coordinate FACT (`depth = 1` is the near rim by definition of the tube axis) rather than to
`PLAYER_RIM_DEPTH`, or they go vacuous. A correct re-seat passes under BOTH the old and the new
constant — check that, it is what proves you only moved them into a region both accept.

**Fixture trap that cost a red guard:** a guard test with `s.enemies = []` never fires — `checkLevelClear`
warps the board out on frame 1 and *nobody can kill anybody*. Any "X still kills the player" guard needs
a decoy enemy parked deep and far away.
### Tempest's nested IF macros combine flags from ONE compare — `IFCS` + `IFNE` is STRICTLY-GREATER

**Situation:** Decoding any ALWELG.MAC gate built from stacked `IFxx` macros (tp1-6:
MOVNYM's invader-slot gate, 1113-1117 — `CMP WINVMX / IFCS / IFNE`).

**Problem:** A 6502 `CMP` sets carry AND zero from the same subtraction, so consecutive
`IFCS / IFNE` blocks are BOTH conditions of that one compare: carry-set (A >= operand)
nested with not-equal (A != operand) = **A strictly greater**. Read the pair lazily as
">=" and MOVNYM's freeze fires at 6 live invaders instead of 7 — the cap comes out one
short of the cabinet, every wave, and WINVMX's own comment (ALCOMN.MAC:732 "MAX # OF
INVADERS-1") is the corroboration nobody reads. The same file's single-`IFCS` gates
(JFUSEUP's `CMP I,20`) really ARE plain >=, so the habit cuts both ways.

**Prevention:** At every stacked-IF gate, write out which flag each macro consumes and
from WHICH instruction (flags persist until the next flag-setting op — an `LDA` between
compares re-arms Z). Then pin the decoded boundary in a source-rules test (assert the
`IFCS` and `IFNE` lines verbatim) AND behaviorally on both sides (6 hatches / 7 freezes),
so neither a lazy port nor a lazy re-read survives.

---

### A contract-change RED must SILENCE the legacy mechanism in fixtures, or mirrors pass off the old code

**Situation:** RED for a story that REPLACES a state field/mechanism (tp1-6: the spawn
timer `{remaining, timer}` → the nymph queue `{nymphs}`), where fixtures can only ADD
the new field at runtime because the old one still exists.

**Problem:** I first wrote fixtures as `s.spawn.nymphs = [...]` — leaving `remaining: 6,
timer` live underneath. The OLD spawn timer kept firing inside my windows: the
alone-zone test's "two hatches on different lanes" PASSED against unfixed code (two
legacy timer-spawns on random lanes satisfied it), and a pulsar fixture guard counted a
phantom second enemy. A mirror half is no protection when the legacy mechanism can
counterfeit the observable the mirror asserts.

**Prevention:** Replace the WHOLE object — `s.spawn = { nymphs: [...] }` — so the legacy
path reads `undefined` and is structurally inert pre-GREEN (and the object literal
doubles as the tsc-level contract pin post-GREEN: no cast, no extra fields). Then re-run
and check WHICH tests pass pre-GREEN: every pre-GREEN pass must be an intended guard
(keep-behavior half), never a new-behavior assertion. The testing-runner's per-test
failure reasons are the audit; "fails" is not enough — fails-for-the-right-reason is.

---

### Adding REQUIRED per-well data to a shared interface? DERIVE it in the synthetic constructor and the sibling suites never notice

**Situation:** A fidelity story adds required fields to a core interface that test
fixtures build synthetically (tp1-9: `Tube` gains the per-well eye so
`perspectiveDepth(tube, depth)` can derive R = (16+H)/(240+H) — but seven sibling
suites build tubes via `makeCircleTube(16, origin, 60, 300)` and pin numerics
computed under the old global R = 0.2).

**Problem:** The obvious moves both lose. An OPTIONAL field (`eye?`) needs a hidden
fallback constant — the very module-level closure the story deletes. A required
field with an arbitrary default (say the circle well's H=24) silently re-curves
every synthetic tube (R 0.2 → 0.1515) and breaks interior-depth pins across the
10-12 perspective suite, lane-width, flip-pivot, claw-transform… a mass re-seat
for zero fidelity gain, since synthetics aren't ROM wells.

**Prevention:** Derive the new datum from what the synthetic constructor ALREADY
knows, choosing the value CONSISTENT with the object it builds: the eye that would
produce its own far/near ratio — q = far/near, H = (240q − 16)/(1 − q), so
60/300 → H = 40 → R = 0.2 exactly. Every legacy numeric survives byte-identical,
the module constant still dies, and the RED suite pins the derivation
(`circle.eye.distance === 40`, `pd(circle, 0.5) === 1/6`) so nobody "simplifies"
it to a hardcoded default later. Check the seam by NOT re-seating the sibling
suites and watching them stay green pre- and post-GREEN.

**Also (same story):** when the interface datum has a natural home in TWO unit
systems (ROM screen units vs canvas ring units), pick per-FIELD consistency with
its consumers and write the conversion into the test literals — tp1-9 exposes
`tube.screenZ` canvas-oriented (−ZADJ·RING_SCALE) because the rings on the same
interface are canvas-space, while `tube.eye.{distance,z}` stay raw ROM bytes
because they are the projection's input, not its output.

---

### An audio AC on a phase that DOESN'T EXIST forces a time-segment contract — pin a weak floor, route the duration

**Situation:** A wiring story says "phase X has its sound" while the story that BUILDS phase X is
still in the backlog (tp1-13: "the warp dive's second phase has its sound", but tp1-10 owns "the
second phase exists: the eye flies INTO the new well").

**Problem:** In the current sim the trigger point and the phase's end are the SAME FRAME (our dive's
bottom-crossing IS its completion frame), so a naive wiring starts and stops the loop on one frame —
a sound that ships, passes a dispatch test, and can never be heard. But pinning the authentic
duration oversteps into the other story's scope, and there is no single ROM byte for it anyway (the
ROM's space span is emergent: CENDWA→ENDWAV→NEWAV2 state frames plus the eye flight).

**Prevention:** Read the OWNING story's ACs first and split the contract: this story pins (a) the
trigger frame from the ROM (MOVCUD's `CMP I,ILINDDY / IFCS / JSR SOUTS3`, ALWELG.MAC:1032-1037),
(b) that the phase exists AS TIME (mode stays 'warp', level does not advance, a deliberately WEAK
`>= 2 frames` floor), and (c) the handover/stop call order. The authentic duration goes to a
Delivery Finding for Dev-with-citation (never silently invented — the 0.92 lesson), and the
forward-impact note names the owning story. Bonus edge the split exposes: past the bottom the ROM's
spike collision is GATED OFF (`CMP I,ILINDDY / IFCC ;CURSOR STILL ON LINES`, ALWELG.MAC:1083-1085) —
our stepWarp's post-advance spike check would crash a claw at negative depth, so the space phase
needs an explicit crash-proof pin or the new segment imports a phantom hazard.

**Also (tempest bonus quarry):** the skill-step bonus lifecycle is set at level select
(`STA X,BONUS`, ALWELG.MAC:236 — the value IS the select index), awarded+chimed once at ENDWAV
(`LDA X,BONUS / IFNE / JSR BONSCO … JSR SAUSON`, ALEXEC.MAC:371-376, THROUGH UPSCOR so it feeds the
extra-life ladder), and cleared on ARRIVAL at the next well (ALWELG.MAC:117) — so it survives a
mid-dive spike crash and pays on the replayed dive. BONPTM (ALWELG.MAC:275) is .RADIX 16 words read
as BCD digit-pairs ×100: .WORD 60→6,000 … 1140→114,000; the LEVEL ladder is odd waves, so a
contiguous 1..16 select has NO ROM value for even waves — pin ladder anchors as literals plus a
totality guard, and route the even-wave mapping to a ruling.

---

### `tube.eye.{distance,z}` is a PHANTOM — shipped tp1-9 baked the eye into `farRatio`, no live field

**Situation:** Any tp1 warp/camera story (tp1-10 and its follow-ups) that needs the
per-well EYE — the SM quarry pointer AND the tp1-9 gotcha two entries up both name
`tube.eye.{distance,z}`.

**Problem:** That field DOES NOT EXIST in shipped `tempest/src/core/geometry.ts`. Two
tp1-9 implementations raced (see `sprint/archive/tp1-9-session-superseded-a1.md`): the
a-1 branch exposed `tube.eye` as data; the branch that actually MERGED folded the eye
into `farRatio = (16+H)/(240+H)` and the precomputed far ring (`makeRingTube`,
geometry.ts:245-266). The `Tube` interface is exactly `{laneCount, closed, far, near,
farRatio, screenZ}` — no `eye`. A RED test written against `tube.eye.distance` pins a
field that is `undefined` at runtime, and a handoff that says "the movable eye already
exists" is quoting the superseded branch.

**Prevention:** Before pinning a warp-camera test, RE-READ the shipped `Tube` interface —
the eye you need for the dive (WD-012/WD-018) must be ADDED (a per-frame warp eye on
`s.warp` or a moving effective-`farRatio`); it is not already a parameter. Quarry
pointers and even a prior sidecar can name a field from a branch that lost the merge —
verify against the working tree, not the archive.

---

### A contract INVERSION deadlocks a sibling's resolution-DETECTOR helper, not just its assertion

**Situation:** RED for a story that INVERTS an outcome a sibling suite is built around
(tp1-10/WD-015: a warp crash used to ADVANCE the level; now it REPLAYS the same wave).

**Problem:** The obvious re-seat is "flip the `expect(level).toBe(2)` to `toBe(1)`". But
`sim.warp-death-respawn.test.ts` drove every test through a helper —
`runUntilResolved(s)` — whose LOOP CONDITION was `while (s.level === 1) step()`. Under
the OLD contract the crash advanced out of level 1, so the loop exited. Under REPLAY the
level never leaves 1, so the same helper spins to its 600-step bound on EVERY test — the
suite doesn't fail with a clean "2 !== 1", it TIMES OUT / returns a mid-transition state,
and the failure message points at the assertion, not the helper. The inversion moved the
goalposts the helper itself was chasing.

**Prevention:** When a contract change inverts an outcome, grep the sibling suite for
its RESOLUTION DETECTOR (the `while`/`for` exit condition, not just the `expect`s) and
ask "is the state this loop waits for still reachable?" Re-seat the helper to a
condition that survives BOTH contracts — here `runUntilSettled` waits for "left
'playing' and returned to it", which covers a clean warp (→ next wave) AND a crash (→
replay of the same wave) without ever keying on the level number. Then confirm the
re-seated suite fails on the ASSERTIONS (level 2→1) for the right reason, not on a hung
loop. Same trap bit the purity test, which walked `until out.level === 2` — unreachable
under replay; re-anchor it to the state transition (dying → playing), not the number.

---

### Tempest ENEMY/PLAYER shapes live in ALVROM.MAC — SCVEC args are ABSOLUTE, and the audit `claim` pre-decodes them

**Situation:** Any tempest "draw the ROM's real shape" story (tp1-17 tanker/spiker/fuseball/
charge; the whole cluster C13 — tp1-18 splat/burst/pop-ups, tp1-19 logo alphabet/star pics).
The eyeballed glyphs in `src/shell/glyphs.ts` (authored at Story 6-8, pre-audit) are the quarry.

**Problem:** Two traps sink a naive transcription. (1) The `SCVEC x,y[,b]` macro reads like a
*delta*, but `ALVROM.MAC:64-92` shows `CVEC` computes `x-OLX` for you — **SCVEC's args are the
ABSOLUTE object point** (`x*CM/CD`), and `b` omitted/0 = beam-OFF (a positioning move, not a
line). Read them as deltas and every shape scatters. `SCDOT x,y` = a beam-off move + one
zero-length lit DOT (a 1-point stroke; `strokeGlyph` renders it as a filled `arc`). (2) The file
is `.RADIX 16` for every shape (the only RADIX-10 window is lines 242-268), so `0F`=15, `0C`=12,
`20`=32 — a two-digit literal read as decimal looks plausible and passes eyeball review.

**Prevention/Fix:** You do NOT have to hand-decode. The primary-source audit already did it — the
finding's **`claim` field spells out the decoded absolute vertices** (`jq '.[]|select(.id=="V-006")'
docs/audit/findings/pair-2-alvrom-shapes-font.json`). Cross-check the `claim` against the raw
`ALVROM.MAC` lines and cite the source line in the test. Shape→finding for cluster C13:
tanker body=V-006 (GENTNK :651), spiker=V-008 (SPIRA1-4 :522), fuseball=**V-014** (FUSE0-3 :975,
NOT in the story's "V-005..V-010" range!), player charge=V-010+DA-004 (DIARA2 :384).

**Trap — the story's finding RANGE lies.** tp1-17 said "Subsumes V-005..V-010, DA-004" but its ACs
named four shapes whose findings are V-006/V-008/**V-014**/V-010/DA-004 — the range OMITS the
fuseball (V-014) and ADDS pulsar-bar V-005, tanker-cargo V-007 and enemy-shot V-009 that no AC
mentions. Scope to the ACs (spec-authority), and log the mismatch as a Delivery Finding.

**Test design that survives:** the repo Y-flips some shapes and not others (`CLAW_DELTAS` "no
y-flip" vs `LIFE1` "Y is NEGATED"), so a byte-exact per-vertex delta match rejects a faithful port
over a Y-sign choice. Pin **sign/order-invariant signatures** instead: vertex COUNT (the headline
AC number — 17/21/17), a normalised sorted-RADII set (uniquely IDs a 21-pt spiral), ring ratios
(GENTNK's 12:32), colour SETS (fuseball's 5 CSTAT groups), and "the 4 frames are NOT one curve
rotated 90°/frame" (compare frame1 to `rot(frame0, 90°)` — Y-convention cancels since both frames
share it). The byte-exact data still lands via the citation gate. And remember AC-7: editing
glyphs.ts falsifies the fixed findings' `ours` quotes (`remediated_by: <story>`) AND shifts the
line numbers of the *unfixed* citations into it (`node tools/audit/reanchor-citations.mjs --write`).

---

### A vi.mock tap on a module NOBODY imports never runs — and that silence is the BETTER red

**Situation:** RED for a WIRING story (rb4-4): the cockpit tests tap a core module with a
delegating `vi.mock(path, importOriginal)` recorder to prove the booted sim DRIVES it — but the
module is one the story itself asks Dev to create (`core/ground-collision`), or one no source
file imports yet (`core/returning-ace`).

**Problem:** Two opposite surprises. (a) You expect the missing-module mock to crash the file
(import-RED); it does NOT — a `vi.mock` factory only runs when something actually imports the
path, so a tap on an unimported module is silently inert and the file runs to its assertions.
(b) You therefore CAN'T rely on the tap's mere existence as evidence of anything: `rec.calls`
staying empty is exactly what both "unwired" and "my tap is broken" look like.

**Prevention:** Lean into (a): a wiring suite whose tap is inert fails on its ASSERTIONS
("0 calls — the mechanic is dead code"), which is a far better RED message than "Cannot find
module". Guard (b) with a staging meta-test that proves the RUN reached the state where calls
were due (tap a SECOND module that already works — rb4-4 taps `landscape.stepMountain` to prove
the ground wave actually ran before asserting the collision check was consulted on those frames).
Import-RED is fine for UNIT suites (the module's contract header explains it); wiring suites
should be assertion-RED.

**Also — the fast-tick cockpit:** the rb4-1 booted-cockpit harness ticks 16 ms (a real browser).
ROM timelines live at the 96 ms calc frame, and a mechanic like the ace pass needs ~977 calc
frames (= ~5900 browser ticks) to develop. Tick `nowMs += 96` instead — the fixed-step
accumulator (cap 250 ms) yields exactly one calc frame per tick, the loop under test is still
byte-for-byte the shipped loop, and a 1300-frame flight runs in ~100 ms. Calibrate staging
constants (kill frame, floor frame, which seed rolls a lone plane) with a THROWAWAY probe test
against the shipped code first; delete the probe before committing.

---

### When an AC hands you two constants and two channels, find the MACHINE before mapping them 1:1

**Situation:** rb4-4's AC-2: "two death channels … carry the ROM's own durations (.TIME1=16,
.TIME2=28 calc frames = 1.536 s / 2.688 s)". Both constants are real (RBARON.MAC:505-506). The
mapping is not.

**Problem:** The AC pattern-matched channel-A↔constant-1 / channel-B↔constant-2. The ROM's
actual machine (EOLSEQ :1057-1126) is ONE count-up timer with a channel-dependent SEED: shells
start EOGTMR at 0, ground at 0x0F, BOTH end at .TIME2=28 — so the durations are 28 and 13 calc
frames, and .TIME1=16 is the spiral→starfield boundary INSIDE the sequence, not a channel's
length. A test written to the AC's parenthetical would have pinned a fabricated 16-frame
shot-down death and rejected the faithful implementation.

**Prevention:** Before pinning, read the CONSUMER of each constant (grep the symbol, follow the
compare): `.TIME1` is consumed by `CPX I,.TIME1 ;TIME FOR STARFIELD ?` (:1163) — a stage
boundary; `.TIME2` by `CMP I,.TIME2 / BCC / JMP ENDLFE` (:1124-1126) — the terminator; the
channel difference is in the SEED (:1061-1066). Pin the machine (seed, boundary, terminator),
log a deviation correcting the AC, and cite all three lines. Same family as tp1-27 ("the gate is
a state, not a byte"): the AC's decode of a true constant is still a decode, and decodes must be
re-derived from the consuming code.

---

### An audit finding's `claim` can be REFUTED by its own `reasoning`, and its decode may cover ONE frame of many

**Situation:** Pinning a tempest shape/behaviour off `docs/audit/findings/*.json`, where the sidebar
("the audit `claim` pre-decodes the vertices") tempts you to transcribe the `claim` field verbatim
into the RED oracle (tp1-35: V-005 pulsar chains, V-007 tanker cargo, V-009 enemy shot).

**Problem:** The `claim` is the auditor's FIRST pass; the `reasoning` field then re-opens the ROM and
sometimes CORRECTS it — and the correction is where the truth lives. V-007's `claim` said the fuse
tanker's RED element is "a dot at (0,0C)"; its own `[CORRECTION]` says it is a real 0x0C-unit LINE
(the top arm of a 4-colour plus). Pin the claim and you pin a fabricated dot. Second trap: a finding's
decode can be PARTIAL. V-009's `claim` fully decodes only ESHOT1; ESHOT2/3/4 are distinct hand-authored
tables the finding never touched (ALVROM.MAC:726-787, like FUSE0-3, NOT rotations) — transcribe "the
finding" and you cover one of four animation frames and think you're done.

**Prevention:** Read the WHOLE finding — `claim` AND `reasoning` (look for `[CORRECTION]`/`[REFUTATION]`)
AND cross-check the raw ROM lines yourself before writing the oracle. When the decode is partial, pin
the decoded part exactly, route the rest to a cited Delivery Finding (tp1-13 pattern), and log a
partial-coverage deviation so the Reviewer diff-traces the un-pinned frames. And MEASURE the geometry,
don't eyeball the prose: ESHOT1's "diagonal ticks" are ticks whose MIDPOINTS sit on the diagonals, not
radial spokes — half of them run tangentially. `onDiagonal(midpoint)` is the invariant; "radial" is wrong.

**Also — a fidelity fix can need a NEIGHBOUR fixed too (the compensating-constant trap, again).** V-005's
correct `pulsarVariant` fix (idx≥5 → flat per PULTAB) makes the RENDERED pulsar read flat for most of its
cycle, because `render.ts` feeds the selector a full-byte sine (`*0xff`, idx 0..15) where the ROM's PULSON
lives in ~[-63,15] (idx 0..4, transient 5). Pinning the pure function is right; flag the render domain as
a blocking Delivery Finding or you green a mostly-flat pulsar. Keep render's variant numbering (0=sharp..
4=flat) so the dormant `pulsarBar(4)` and the selector both stay wired.

---

### When an AC's deliverable is a DOC in the orchestrator repo, don't file-read it from a subrepo test

**Situation:** A story AC requires a written artifact that lives OUTSIDE the code repo being
changed — e.g. lb2-8's AC-1 "amend ADR-0004 in writing," where the ADR is at the orchestrator's
`docs/adr/0004-*.md` but the code changes are in `arcade-shared/` + `lobby/` (each its own
gitignored subrepo with its own CI checkout).

**Problem:** The obvious "guard the doc" test — a node-env test that reads `../../docs/adr/0004-*.md`
and greps for the new shape — is a **CI-only lie**. Locally the subrepo is a subdir of the
orchestrator, so `../../docs/` exists and the test passes. On GitHub Actions the subrepo is checked
out ALONE: `../../docs/` does not exist, so either the test errors (file missing) or, worse, is
written defensively and passes vacuously. This is the exact "green on the CI runner while wrong in
the wild" trap `lobby/src/core/score.ts` calls out for `toLocaleString()` — the same failure shape,
one directory up.

**Prevention:** Split the AC. The BEHAVIOURAL half is almost always testable inside the code repo —
lb2-8's "the published summary carries name+score rows rather than a bare number" is fully pinned by
`highscore-summary.test.ts` (publish → `readTopScores` round-trip). The WRITTEN half (the ADR's prose,
its size-vs-cap reasoning, its rejected alternatives) is a **Reviewer-verified doc deliverable**, not
a unit test. Log it as a `minor` deviation naming the file the Reviewer must read, and file a Delivery
Finding telling Dev to author it. Never reach across the subrepo boundary from a test.

**Corollary — a format-widening story legitimately reddens EXISTING green tests.** Changing a published
wire format (here: the cross-origin cookie value from `124500` to a rows encoding) invalidates the old
assertions and any injected-stub signature (`spyTransport`'s `publish(id, number)`). In RED, LEAVE those
alone — pre-editing them steals Dev's green work and turns the suite red for the wrong reason. Flag the
churn as a non-blocking Conflict finding so Dev migrates them during GREEN, expecting it.
### The CONTOUR fold is OBSERVABLE for a MULTI-RECORD table — tp1-25's fold-to-99 does NOT generalise

**Situation:** Porting any bounded Tempest WTABLE table whose deep-wave (65-99) region is more than ONE
record — tp1-7 lifts eight at once (TNYMMX, TINVIN, TCHAMX, TSPIIN, TCHARIN, WWTAC2/3, WTANMX/WSPIMX, TELIHI).

**Problem:** The sidecar's "test the wave AFTER the last row" gotcha and tp1-25's shipped fold
(`wave = level >= 99 ? 99 : level`) both assume the CONTOUR fold band (a RANDOM wave in **65..96**,
ALWELG.MAC:415-423) lands inside a SINGLE record, so the substituted wave is unobservable and folding to a
fixed 99 gives the same byte. That was true for TWFUSC/WPULTIM/WPULPOT — and ONLY those. It is FALSE the
moment the table has multiple deep records: **TNYMMX**'s band spans two TA records (`TA,65.,80.,35.,1` and
`TA,81.,99.,43.,1`), so the ROM's wave-99+ enemy count is genuinely RANDOM in ~35..58 — and fold-to-99 gives
TNYMMX(99)=**61**, HIGHER than any value the ROM's own fold can produce. **TINVIN**'s band is a `TR`
alternation (-160/-191), also observable. Copy tp1-25's fold blindly and you over-specify a value the ROM
randomises, or overshoot the band.

**Prevention:** Pin the PLAYABLE range (waves 1..~64) to EXACT values; pin wave≥99 only to SANITY — the value
is in the table's legit range and is NEVER the TE-0 walk-off (0 enemies / 0 cap / frozen speed). Route the
exact deterministic fold strategy to a Delivery Finding: fold to a REPRESENTATIVE wave inside 65..96, not to
99. Extract the fold ONCE as `contourWave(level)` (the tp1-26 epic note) — inlining it per-table is how the
next table inherits the walk-off bug. Before writing, classify each table's LAST records: single-record band →
tp1-25's fold is fine; multi-record band → the fold is observable, loosen the deep-wave pin.

---

### TELIHI's byte 0 is the "LINE VACANT" SENTINEL — the height formula gives nonsense unless you know it

**Situation:** Transcribing Tempest's pre-seeded-spike table TELIHI (`NWTELI`, ALWELG.MAC:696, a `TZANDF`
per-`(wave-1)mod16` table) into a per-wave spike HEIGHT (tp1-7 / W-037).

**Problem:** The finding writes the height as depth = `($F0 - byte)/224` (byte $E0 → 0.071, $A0 → 0.357). Apply
that to the clean-wave byte **0** and you get (240-0)/224 = **1.07** — a spike taller than the whole tube,
where the finding says "waves 1-3 start CLEAN". Byte 0 is not a tip position at all: the ROM's `LINEY`
convention is `IFEQ ;LINE VACANT?` (ALWELG.MAC:2209) — **0 means NO spike**, and a real spiker seeds a fresh
line at `ILINDDY+1` ($F1, the far base) then DECREASES LINEY toward the rim as the spike grows. So the tip
position is $10..$F0 (height = ($F0-tip)/224), and 0 is an out-of-range sentinel. Pin `initialSpikeHeightForLevel`
as `byte === 0 ? 0 : ($F0 - byte)/224` and verify our `s.spikes[lane]` is that same depth-of-tip (it is:
0 = none, grows toward the rim).

**Prevention:** When a ROM table feeds a coordinate, find the CONSUMER's zero/vacant test before trusting a
"convert the byte" formula — a value the formula maps to nonsense is usually a sentinel. `grep` the parameter's
uses (`LINEY` here) for an `IFEQ`/`VACANT`/`= 0` guard.

---

### A pure TABLE-TRANSCRIPTION story has a HUGE sibling-re-seat surface — grep the HELPERS, not just the symbol

**Situation:** Any Tempest fidelity story that swaps a hand-tuned difficulty curve for a ROM table and it is
NOT the first to touch that quantity (tp1-7's eight tables all replaced story-3-4/6-9/6-13 invented curves).

**Problem:** The direct grep for the symbol/constant misses two whole classes of green-now-DOOMED sibling:
(1) tests that assert a PROPERTY the invented curve had but the ROM refutes — story 3-4 pinned speeds/count
rising MONOTONICALLY across the geometry wrap (`p20 > p16`) and capped at L33; the ROM's TINVIN genuinely DIPS
at wave 17 and climbs past 33, so those assertions are refuted, not just re-valued. (2) tests that reach the
quantity through a SIM-DRIVEN HELPER (`spawnedKinds`, `fireBoard`, `transition`) — a plain grep never sees them.
And the fixtures lie: `fireBoard(5, …)`'s first arg is the **SEED, not the level**, so the "bolt cap saturates
to 4" test was secretly wave 1, where TCHAMX makes the cap **2**. A full-suite run only shows tests RED *now* —
green-now-doomed ones surface at GREEN, in Dev's lap.

**Prevention:** After the obvious grep, enumerate what the fix CHANGES (count, speed, cap, cargo intro, spawn
intro, initial spikes) and grep for every ASSERTION on each — including `.every(h => h === 0)` at a wave the
fix now seeds, `toBeGreaterThan` monotonicity claims, and helper calls whose numeric arg you must decode. Then
RUN the suite once and read the pass list too: a keep-behavior test that STILL passes but for a coincidental
reason (level 5's TCHAMX cap is also 4) is a landmine. Re-seat to a COORDINATE FACT, log each as a 6-field
deviation, and remember the re-seat may change gameplay FEEL (a real wave-17 slowdown) — flag it PM-visible.

---

### A LATENT table record (consumed only by a reducer) escapes BOTH nets — pin the raw byte AND add a CI-safe port assert

**Situation:** Transcribing a multi-record ROM table where only ONE derived scalar is consumed this story —
tp1-7's WSPIMX (spiker max): the port reads only `firstNonZeroWave(WSPIMX)` = 4 (the intro wave); the
per-wave curve is tp1-8's. So records 2..7 are LATENT — no export, no consumer, no behavioral test can reach
them. Any radix/transcription error in a latent record is invisible: the Reviewer's independent re-decode
caught WSPIMX record 6, my suite could not.

**Problem — the byte itself.** `.RADIX 16` tables (ALWELG.MAC has NO `.RADIX` line — it's inherited hex; bare
`0FF`/`1F` immediates prove it) encode start/end waves in HEX, and a **trailing dot forces DECIMAL**. Every
multi-digit start in WSPIMI/WSPIMX is dotted (`17.`, `20.`, `35.`, `43.`) — EXCEPT `:633` `.BYTE T1,35,39.,1`,
whose `35` lost its dot (od -c: a comma follows, no `.`). So it assembles to `0x35 = 53`, and `[53,39]` is a
DEAD descending range → waves 35-39 fall to the gap value 0, not 1. Its sibling min WSPIMI:625 DOTS it (`35.`
= dec 35, min 1), so the assembled ROM is **self-contradictory** on 35-39 (min 1 > max 0) — a genuine 1981
typo. The decimal misread (`{start:35}` → max 1) accidentally PAPERS OVER the contradiction, which is why it
looked right. Small single-digit values (`5`, `7`) read identically in both bases and hide the pattern.

**Problem — the two nets both have holes.** (1) The source-rules ROM-pin suite pinned only WSPIMX's FIRST
record (the TZ intro), never record 6 — an unpinned latent record. (2) That whole suite is
`describe.skipIf(!sourceAvailable)` (the ROM is copyrighted/gitignored), so it runs on the author's box and
**skips silently in CI** — even a correct pin there is off where it matters most.

**Prevention:** For a latent record, enforcement is TWO layers. (a) In the ROM-pin suite, pin the raw `.BYTE`
line VERBATIM and decode the radix in-test with a one-token assembler (`tok.endsWith('.') ? dec : hex`);
assert the un-dotted start `≠` its decimal reading and contrast the dotted sibling — the WSOBJ "write the
refutation INTO the test" rule. (b) Because that suite skips in CI, add the biting assertion to a **CI-safe**
suite that reads `rules.ts` as text (not the ROM): parse the port's table literal, rebuild the reducer
(`spikerMax(wave)` mirroring `contourValue`), and assert the latent band equals the radix-decoded ROM value.
That one goes RED now, GREEN on Dev's one-line fix, and runs everywhere. Keep-behavior guards (intro wave
unchanged, other maxes byte-identical) prove the fix is surgical.

**The match-bytes-vs-honor-intent ruling.** When a "verbatim" byte is a provable TYPO, resolve it by AC
authority, not sympathy: a verbatim-transcription epic means the port must contain the byte the ROM contains
(0x35=53 → max 0), because the emergent "1 spiker" outcome — if that's what the cabinet did — must come from
the DOWNSTREAM solver's decode of the min>max clamp (tp1-8's NYMCHA), never from us silently editing the
transcription (that IS the hand-tuning the epic deletes). Surface the contradiction as a blocking Delivery
Finding to the consuming story; don't let the misread hide it. Match-bytes keeps the fidelity chain honest.

---

### A DETERMINISM story can't be tested with the booted-cockpit harness — it MOCKS the clock, so the trap is baked in

**Situation:** rb4-3 (red-baron) — the sim seeded three `createRng()` streams from `Date.now()` inside
main.ts; the story is to make same-seed replay/regression possible. The obvious RED test is "two same-seed
runs are identical."

**Problem:** the shared harness `tests/helpers/boot-cockpit.ts` does `vi.spyOn(Date, 'now').mockReturnValue(seedMs)`
— it makes the run deterministic BY FREEZING THE CLOCK. So "same seedMs twice → identical" is GREEN against the
BROKEN code (both runs read the same frozen `Date.now()`), and against the FIXED code, and against everything.
It is exactly the sidecar's "a seeded RNG makes 'it's deterministic' vacuous" trap, wearing a harness. A
determinism test built on `bootCockpit(seedMs)` proves nothing and is not even RED.

**Prevention:** do NOT reuse the harness's clock-mock as the seed. Pin the two properties no frozen-clock run
can fake, injecting the seed through a SHELL SEAM (here a `?seed=` URL param — a real, replayable, test-settable
source) while controlling `Date.now()` INDEPENDENTLY:

    determinism / clock-independence : same seed, DIFFERENT Date.now() per run  → identical  (RED today: diverges frame 1)
    seed sensitivity (anti-vacuity)  : DIFFERENT seed, same Date.now()          → different   (RED today: identical — seed ignored)

Sensitivity is the guard that "identical" means "reproduced a real RNG-driven run", not "two empty runs".
And write the seed-`0` case explicitly: `Number("0")` is falsy, so a `param || Date.now()` parse drops seed 0
back to the clock — un-fixing the bug for one seed. Assert `?seed=0` under two clocks stays identical (forces `??`).

**Also:** the fleet already has the right pattern — battlezone/src/main.ts:110 reads `Date.now()` ONCE at shell
boot and passes the seed into `initGame(seed)`; the sim never reads the clock again. But once-per-load seeding is
NOT replay — an epic that needs same-seed regression tests needs the seed EXTERNALLY injectable (URL/global), a
step beyond battlezone. AC-1's "no clock in the sim-step path" still ALLOWS that one boot read (grep ≤1 in main.ts).

---

### The shared VGMSGA font can't draw every ROM glyph — an apostrophe becomes a SPACE, silently

**Situation:** RED for any star-wars (or sibling) text-authenticity story that pins a ROM message string
containing punctuation the shared face lacks — sw7-3's board title `<PRINCESS LEIA'S REBEL FORCE>` (TCMES.MAC:605),
and the coming attract/coaching-message stories (sw7-10 H-017/H-018/H-022) which quote apostrophised prose.

**Problem:** `@arcade/shared/font` `GLYPH_CHARS` is exactly `" 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-,/_"` —
caps, digits, dash, comma, slash, underscore. NO apostrophe, no period, no `<>`. `charGlyph` does not throw on a
miss; it **degrades to BLANK (a space-width glyph)**. So `glowText(ctx, "LEIA'S …")` renders `LEIA S …` with a gap.
Pin the exact apostrophe'd string and you force Dev to emit an unrenderable char; the on-screen result is worse
(a gap), not the ROM's tick. The story TITLE for sw7-3 even dropped the apostrophe ("LEIAS") while its DESCRIPTION
kept it — the two sources disagree because one anticipated the font gap.

**Prevention:** BEFORE pinning a ROM string, `grep GLYPH_CHARS node_modules/@arcade/shared/dist/font.js` and check
every non-alnum char with a quick `node -e "import('@arcade/shared/font').then(m=>console.log(m.hasGlyph(\"'\")))"`.
If a glyph is missing: make the assertion tolerant of the unreproducible char (sw7-3 used `/^PRINCESS LEIA'?S REBEL
FORCE$/`), and raise the glyph gap as a Delivery Finding — adding a glyph is a cross-repo `@arcade/shared` version
bump, out of scope for a game-only story. Adding the glyph "quietly" is NOT in scope; the tolerant pin is.

**Also — the seam is `layoutText`, and it captures the string BEFORE the font drops the glyph.** So a seam test
asserts what was REQUESTED, not what rendered. Keep the two honest: pin the requested string tolerantly AND file the
render-fidelity gap separately.

---

### A ROM board title made by `.NEXTMESS` is NOT a second short string — don't pin a bare fragment

**Situation:** Pinning a star-wars framing title/label where the disasm shows two message symbols (sw7-3's
hi-score header: RF1 + RF2, TCMES.MAC:604-605).

**Problem:** `.NEXTMESS -320.,000.,VJMFL,RF1` (TCMES.MAC:604) LOOKS like a message named RF1 whose text is the
comment's "REBEL FORCE". It emits NO `.ASCIN` text of its own — `.NEXTMESS` only writes XY+colour for a message
SLOT and **re-positions the FOLLOWING message's text**. So RF1 is the SAME `PRINCESS LEIA'S REBEL FORCE` (RF2)
re-centred for the half-screen initials layout, not a distinct `<REBEL FORCE>` string. The finding's own sub-claim
("RF1 = <REBEL FORCE>") was wrong and the refutation corrected it. Ship a bare `REBEL FORCE` and you invent a string
the cabinet never drew.

**Prevention:** verify a title against the actual `.ASCIN`/`<…>` text at the message DEFINITION, not the
`.NEXTMESS`/comment. Write the refutation INTO the test as a live guard: `expect(texts()).not.toContain('REBEL
FORCE')` (exact-element) — green for the correct full title (a different element), red the instant someone draws
the bare fragment.

---

### A "missing" combined speech phrase may be a SEQUENCE TABLE — check SNDSPK before demanding a new bake

**Situation:** Wiring a star-wars speech moment whose ROM symbol has no matching baked sample (sw7-8:
U-017's SPKFOA "FORCE WILL BE WITH YOU ALWAYS" — the 23-line catalogue has `theForceWillBeWithYou` and
`always` but no combined phrase).

**Problem:** The instinct is "the catalogue is incomplete → this story needs a new TMS5220 bake" (a
speech-bake + R2 upload + catalogue bump). But the speech ROM has only the 23 spDat streams; SPKFOA is
not a 24th.

**Prevention/Fix:** `grep -n '<SYMBOL>' SNDSPK.MAC` — the sound board's SPK entry points can be
SEQUENCE TABLES over existing phrases: `SPKFOA:: LDD #TFOA` / `TFOA: .BYTE 15.,16.,0FF` = "speak
phrase 15, then 16" (exactly spDat015/016 = the two existing bakes). So the wiring contract is ORDERED
CUES over existing lines, no new bake. Corollary that shapes the shell: the TMS5220 is ONE serial
chip — the cabinet physically cannot overlap phrases — so any moment that cues 2+ lines (game-over's
REM→FOR→ALW, surface entry's THI→SIZ) needs the shell's speak() to QUEUE on `source.onended`, and the
core's EVENT ORDER is the spoken order. Also: SPKFOR/SPKALW at WSMAIN.MAC:387/394 are COIN-INSERT
reactions (IFRAME's COINSPK machine: first credit speaks FOR, the next ALW) — not attract/intro lines;
a clone with no credit concept has no seam for them.

---

### "Bake another tune" can be a PIPELINE story — audit the stream's OPCODES before trusting the size

**Situation:** Adding tunes to the sw6-1 music bake (sw7-8: PMSF2/PMCNT/PMEND/PMBEN/PMDES — "just five
more PHASE_TUNES config rows", reads like config).

**Problem:** The four shipped tracks (TH5/THB/SW4/REB/RR/DAR) exercise opcodes 0x80-0x87 + 0x8E/0x8F
only. The five R8 tunes use machinery the generator and player have NEVER seen: `.CALL n` (0x8D — call
TUNTAB[n] as a subroutine; SF2V1-4 are each just "CALL setup, CKEY k, CALL scale", the notes live in
SF2V5/V6 which NO .TUNE references), `.GOSUB addr` (0x90 + ADDRESS WORD — a 3-byte record that breaks
the 2-byte pair walk; CNTV1), `.RETURN` (0x91 — 1 byte, same break), plus 0x8A VC / 0x8C SYN / 0x81
CRATE-inside-a-loop (the knell's accelerando). gen-music-data THROWS on address labels by design and
pm-player THROWS on unknown opcodes — so "add a config row" is actually "extend both ends of the
pipeline".

**Prevention:** Before sizing/pinning, dump the tune's voice streams and list every byte ≥ 0x80 against
the player's implemented set. Write the ORACLE against the FLATTENED decoded stream (what the cabinet
played: subroutines inlined, loops expanded, keys applied) so Dev may flatten at generation time or
teach the player calls — either satisfies. Bonus decode facts worth pinning: the ROM driver adds OKEY
only to SOUNDFUL notes (`BEQ 9$ ;?SOUNDFUL NOTE?` BEFORE `ADDB OKEY`, SNDPM.MAC POKNL) — RESTS never
transpose, so a +12 NKEY tune still opens with note 0; and a knell = LOOP 30 × [note, CKEY -1, CRATE 1]
decodes to a 30-note descending chromatic accelerando — pin the shape, not the driver internals.

---

### The death knell belongs to the LAUNCH routine, not the kill — and that resolves a same-frame tune pile-up

**Situation:** sw7-8 wiring PMSF2 ("SOUND THE DEATH KNELL") + PMEND (finale): U-010's claim reads
"firing the proton torpedo into the exhaust port" — easy to pin both tunes on the detonation frame,
where they'd fight for the one tune channel.

**Problem:** The claim's phrasing hides WHICH routine calls PMSF2. It's `FRPTGN` — FiRe ProTon GuN,
the routine that CREATES the torpedo (PT.LIV=1) — so the knell rings at LAUNCH, seconds before the
window resolution enters PH$DX1 (whose INIT plays PMEND, WSMAIN.MAC:2179). Our sim's launch moment is
the ARMING frame (the bolt that touches the port becomes the torpedo — the sw3-15 portTorpedoArmed
latch), which is a DIFFERENT frame from detonation except in the degenerate armed-inside-the-window
case. Pinning knell@arming / finale@detonation gives each tune its own frame, matches the ROM order,
and the one-tune-channel steal handles the degenerate case exactly as the cabinet's single tune player
would.

**Prevention:** For any "sound X plays when Y" wiring, resolve the CALLER ROUTINE'S ROLE (its name and
what it mutates), not just the call-site comment — two audio cues that look simultaneous in a
quota-collapsed sim usually have distinct ROM moments that map onto distinct sim frames if you find
the right latch edge.

---

### `bannerColorArg`'s regex cannot read a `vecText` call — bare-number POSITIONS satisfy its "the size is the first number" assumption

**Situation:** Pinning the COLOUR of a text draw in tempest's render.ts (tp1-20 HUD fields; any
future story that audits a colour argument rather than a string's presence).

**Problem:** render.banners.test.ts's `bannerColorArg` finds the colour as "the token after the
first bare number following the string literal" — sound for `drawGlowText(ctx, 'TEXT', W / 2,
H * 0.2, 24, COLOR, …)` where the positions are EXPRESSIONS and only the size is a bare number,
but WRONG for `vecText(ctx, String(s.score).padStart(6, '0'), 26, 22, 22, color, …)` where the
positions are bare numbers: it captures the y-coordinate as the "colour". Worse, the text
argument itself can be an expression carrying commas inside nested parens (`padStart(6, '0')`)
or a template literal (`` `RANKING FROM 1 TO ${MAX_SELECT_LEVEL}` ``), which regex-only
extraction truncates.

**Prevention:** For colour pins, don't extend the regex — write a paren+quote-aware call slicer
and a top-level-comma arg splitter (tp1-20.hud-messages.test.ts `textDrawCalls`/`argsOf`; both
helpers share signature `(ctx, text, x, y, size, color, …)`, so text = args[1], colour =
args[5]). Select the call by a regex on the TEXT ARG (with an exclude for lookalikes — the HUD
score readout vs the gameover `FINAL SCORE ${…}` overlay both reference `s.score`), then
classify args[5]. And self-check the parser in the suite with fixture strings (nested-comma and
`${}` cases) so a RED audit can't be invalidated by a broken helper. `bannerColorArg` stays fine
for quoted-literal drawGlowText banners — the trap is only calls with bare-number positions or
non-literal text.


---

### A contract change that would redden a sibling suite may really be a SEAM SPLIT — check whether the old contract is PERMANENTLY TRUE for a second consumer

**Situation:** tp1-38 (the WD-012 rim-fly-off) "beyond tp1-33's near-ring-fixed model" — the
obvious RED plan was to re-seat tp1-33.warp-eye.test.ts (its AC4 pins the near ring byte-identical
across the dive, exactly what the new model refutes).

**Problem:** `warpDiveTube` has TWO consumers with OPPOSITE cull semantics. The DESCENT advances a
positive eye into the well — the rim crosses it at p* = (16+H)/224 and the ROM aborts behind-eye
lines (ONELN2 "LDA EYH / IFPL ... LDA PYL / CMP EYL / IFCC / RTS", ALDISP.MAC:1550-1558). The
FLY-IN parks the eye at −1536, and that same `IFPL` DISARMS the cull — nothing can be behind a
negative eye, so the fly-in mapping (render drives warpDiveTube(newTube, 1→0)) must NEVER fly the
rim off. One progress-only signature cannot serve both phases. Changing warpDiveTube in place
would have broken the fly-in AND forced functional re-seats across tp1-33's whole suite.

**Prevention:** Before re-seating a sibling suite for a "model upgrade", ask WHO ELSE consumes the
seam and whether the OLD behaviour is still the correct contract for one of them. If yes, split
the seam (tp1-38: new `warpDescentTube` for the dive; `warpDiveTube` retained as the fly-in
frame) — the sibling suite then needs only a comment re-scope (its pins become permanent
keep-behavior guards for the surviving consumer) and the re-seat surface drops to ZERO. Do the
algebra before assuming the old seam is wrong everywhere: tp1-33's far-ring path was PROVABLY
already exact (shipped near0+(far0−near0)·(1−p)/D ≡ VP+(R/D)(near0−VP), the true moving-eye far
law), so the split was purely additive.

**Bonus quarry for warp stories:** the rim's expansion in fractions of its eye-crossing p* is
UNIVERSAL — kNear(f·p*) = 1/(1−f) (4/3, 2, 4 at f = ¼, ½, ¾) — a well-independent pin that
complements per-well absolute samples. And past the bottom the ROM forces CURSY=0xFF
(ALWELG.MAC:1038-1039) so DSPCUR stops drawing the cursor — the cursor "rides CURSY" only while
on the lines.

---

### A "depth gate" spec can INVERT the ROM branch — verify the BCS/BCC + comment placement firsthand

**Situation:** rb4-16 AC-4 ported an outer-zone depth gate (RBARON.MAC:2776-2781). The context AND the
approved design doc both said "when POSITION Z < 4 the plane flies past off-screen instead of turning
back."

**Problem:** The ROM says the OPPOSITE. `LDA PLSTAT+19 / CMP I,4 / BCS 10$ ;W/I DEPTH NO RETURN TO
SCREEN`, and the fall-through (< 4) is `EOR I,0FF / STA FLAG+1 ;RETURN TO WARDS SCREEN CENTER`. So
positionZ **≥ 4 flies past**; **< 4 returns to centre** — the mirror of the spec. A carry-branch is
one letter (BCS vs BCC) and its comment sits on the branch line, not the fall-through; it is trivial to
read the polarity backwards when summarising, and the summary is what lands in the context/design doc.
Worse, the compare is on PLSTAT+**19** — the POSITION Z **LSB** (:295) — so "4" is a byte-column
threshold with NO defined meaning in our continuous world-unit `positionZ` field. Both the direction and
the threshold were unresolvable from the doc; guessing either would have shipped a wrong gate wearing the
spec's confidence.

**Prevention:** For any ported branch, read the 6502 firsthand and pin the polarity to the ROM author's
OWN comment on the taken branch — never to the story's prose paraphrase. When the spec text and the ROM
comment disagree on a fidelity story, the ROM wins and the conflict is a BLOCKING finding, not a test you
write to the doc. And when a threshold compares a single byte of a multi-byte field, its scale in your
(usually continuous) port is undefined — that alone blocks the pin until the representation is resolved
with the user. Leave the AC as `it.todo` with the citation; do not manufacture a direction.

---

### A reachability/soft-lock BASELINE in a comment goes STALE when a sibling story changes the gun — RE-MEASURE

**Situation:** rb4-16 AC-R3 is a frames-in-reach regression guard. `display-space.test.ts:343` documents
the shipped baseline as "597.3/112.5/24.1/20.2/10.8" and warns GMLEVL 4's 10.8 margin is "REAL but thin."
The re-cut design repeatedly cites 10.8 as the number to protect.

**Problem:** Those numbers were measured through the OLD ±32 world-tube gun. rb4-17 DELETED that gun and
shipped the depth-growing COLLD picture-plate gun — but nobody re-ran the harness, and the comment stayed.
Re-measuring the SAME harness through the current gun gave 600 / 208.1 / 44.5 / 32.8 / **17.1** — GMLEVL 4
is 17.1, not 10.8 (the wider gun catches close planes the tube missed). Setting the guard's bar to the
stale 10.8 would have baked in ~40% of false slack at exactly the level that matters, and "captured
honestly" would have been a lie the guard told itself.

**Prevention:** A baseline is a MEASUREMENT of a specific machine, not a constant. Before you pin a guard
to a documented number, identify every seam it flows through (here: the gun) and check whether a merged
sibling story moved one. If so, re-run the harness yourself and pin the number you observe — a two-minute
scratch harness that writes the result to a file (vitest swallows console.log) beats trusting a comment.
Cite the measurement date + the gun version in the bar's comment so the NEXT gun change re-triggers this.

---

### A RED that RENAMES a field on a cast-mirrored module (`as XModule`) breaks tsc — optional fields don't save it, use `as unknown as`

**Situation:** rb4-7 inverts the red-baron wave clock: `WaveClock` goes from `{modect, countdown}`
(a per-frame gap) to `{modect, newct}` (NEWCT counts WAVES). The RED tests load the module the repo's
house way — `m = (await import('../../src/core/waves')) as WavesModule` — with a local interface mirror
whose fields are all optional so RED "fails loud, not undefined-explodes".

**Problem:** Renaming a field the mirror declares (here `countdown` → `newct`) makes `tsc --noEmit` throw
**TS2352** on the cast: the CURRENT source still exports `stepWaveClock(clock: {…countdown})`, and that
function-typed property is **contravariant** in its parameter, so the source's `{…countdown}` param cannot
be reconciled with the mirror's `{…newct}` param in EITHER direction. Making `newct?` optional fixes the
plain `INITIAL_WAVE_CLOCK` field but NOT the `stepWaveClock` signature — the param still requires the
missing `countdown`. A red tree that won't `tsc` is a mess to hand Dev and the Reviewer flags it.

**Prevention:** cross the seam explicitly with `as unknown as XModule` — tsc literally suggests it, and it
is the honest bridge for a RED mid-interface-migration (the source genuinely has the OLD shape; the mirror
is the TARGET). The `XModule` interface STILL types every member, so `need(m.spawnWave, …)` and the
surviving sibling tests keep full type-checking — `unknown` only bypasses the source-vs-mirror
compatibility check, not the members' own types. Comment WHY at the cast. Runtime `need()` + the
assertions do the real RED verification. (Don't reach for `unknown` reflexively: a mirror that only ADDS
new optional members casts fine — it's the RENAME/RETYPE of an existing member that needs it.)

---

### When a story says a count "is indexed by X>>1", the clone usually mis-reads X directly AND mis-types the table's UNIT

**Situation:** rb4-7 (red-baron mission clock). Two ROM tables are each indexed by a HALVED counter, and the
clone got BOTH the halve and the table's meaning wrong: `GMLEVL = PLNLVL[OBJKLD>>1]` (difficulty; the clone
indexed by `OBJKLD` directly → ramped 2× too fast) and `NEWCT = MCOUNT[MODECT>>1]` (wave-run length; the
clone indexed `MCOUNT[MODECT % 8]`). The subtler bug was the UNIT: the clone read `MCOUNT` (values 4,2,3,2,…)
as a per-CALC-FRAME inter-wave delay (a 96–384 ms countdown), when the ROM uses it as a COUNT OF WAVES in a
RUN — `NEWCT` decrements once per COMPLETED wave (`DEC NEWCT`, RBARON.MAC:2258, behind three gates), never
per frame. So the clone shipped a 1:1 plane/ground alternation with a sub-second gap; the arcade runs RUNS
of 4,2,3,2,1,3,4,2 plane waves separated by single ground waves.

**Prevention:** for any "indexed by X>>1" AC, pin TWO independent facts: (1) the HALVE — the headline
invariant `f(2k) === oldTable[k]` ("it now takes twice the input to reach the same output") refutes the
direct index in one line; and (2) the UNIT — trace the consumer of the table value. Here `MCOUNT`'s value
feeds `STA NEWCT` and `NEWCT` is decremented by `DEC NEWCT` gated on wave-clear, so it is a WAVE count, not
a frame count. Pin the mechanism (one `stepWaveClock` call = one completed wave; the clock never expires on
a 1–4 frame countdown), and DON'T pin a derived seconds figure the ROM computes elsewhere (rb4-7's
"0.48–3.07 s" gap is emergent from PLSTAT+7, the per-plane "^20 FRAMES TO CROSS CENTER" flight timer,
RBARON.MAC:2361 — route it, the tp1-13 / rb4-4 lesson).

---

### Proving a DISPLAY-clock mechanic (not the calc clock): drive rAF FASTER than the sim step, and force the branch if the seeded sky starves it

**Situation:** rb4-9 AC-1 — the player's prop must animate on the 62.5 Hz DISPLAY clock, NOT the
~10.4 Hz calc clock (the Red Baron ÷N trap, `timing.ts`). A pure `propFrame` test can't tell which
clock main.ts drives it on; a prop wrongly ticked off `simFrame` runs ~6× too slow and every pure
test still passes.

**Problem/technique:** the only honest proof BOOTS the cockpit (the `cockpit-draw-path.test.ts`
stub pattern) and drives rAF at a cadence SHORTER than `SIM_TIMESTEP_S` (16 ms vs 96 ms), so most
rAF frames run ZERO calc-frames. Then a display-clock mechanic still advances on those frames while
a calc-clock one stands still. Discriminators that survive review: (1) the picture changes on ≥
(FRAMES−slack) of the rAF frames, and (2) the change count > 2× the total calc-frames (count them
by wrapping a per-calc-frame heartbeat like `tickCountUp`). Both are needed — (1) catches "never
advances", (2) catches "advances but on the wrong clock".

**Second trap — a boot harness can pass VACUOUSLY when the seeded sky starves the branch.** The
gun-overheat colour test never saw `#ff5533` because the pinned sky shoots the pilot down and the
death sequence cools `GUN.ST` before it ever locks out — so the "no red" assertion passed by
checking nothing. Its paired non-vacuity guard ("the guns actually locked out") was RED and exposed
it. Fix: FORCE the branch at the sim seam (`vi.mock` guns → `overheated: true`) so the draw path
runs deterministically; the colour it then paints is still main.ts's own code. Always pair a
negative canvas assertion ("never paints X") with a positive guard that the branch was exercised.
### A "move the hazard to the wall + side-gate it" story: the OLD collision can't REACH the new position, so the RED signal is "the crash stops firing", not "the wrong side is hit"

**Situation:** RED for a story that re-homes a hazard from the channel centre to a WALL and makes it
side-gated (sw7-19: the star-wars trench "catwalk" is really a wall-mounted FORCE FIELD — B-012/M-012;
WSPANL.MAC's `LDD M$TY+M.U1 / IFLE ;?ON LEFT SIDE?`).

**Problem:** The instinct is to write "a pilot on the RIGHT dodges a LEFT field" as the headline RED. But
the OLD collision was a `CATWALK_HIT_RADIUS`(240) SPHERE around the obstacle's point, and the pilot is
clamped to ±511 inside walls at ±1024 — so a wall-mounted field (`pos[0]=±1024`) is ≥513 away and the old
sphere NEVER fires for it. So "right pilot dodges" is GREEN on the unfixed code too (both miss), and only
"same-side pilot GRAZES" goes RED — because the mechanic can't reach the wall at all yet. Chase the sphere
and you'll write a suite whose only real RED is a model mismatch, missing the collision entirely.

**Prevention:** For a re-home-and-gate story, make the RED headline "the mechanic now REACHES its new
position and fires" (same-side pilot at the wall → `terrain-crash` fires — RED because the old sphere can't
reach it), and pair it with the side MIRROR on BOTH walls (a left field grazes a left pilot, clears a right
pilot; a right field the reverse) so a hardcoded "always left" gate can't pass. Two ROM facts shape the
fixtures: (1) the ROM side gate is a pure sign test (`IFLE`) with NO lateral-distance check, so the field
blocks the WHOLE half-channel on its side at its height slot — the dodge is opposite-wall or a different
height slot, never "hug centre" (centre = Y≤0 = the left side). (2) The graze is glow+sound+roll and NO
`lives-1` — invert the predecessor's "costs a shield" suite (here 14-7, DELETED): the shield accounting
was explicitly deferred to a later scope (WSGLOW/S-016), and glow/roll are a deferred visual (A-018), so
this story's only in-scope cue is the crash sound (`AUDCR` → `terrain-crash`).

**Representation seam (TEA's to define):** when the new gate needs data the obstacle doesn't carry (which
wall), reuse the existing field instead of inventing schema — here the mounted wall = `sign(pos[0])`, and
the collision side-gates on `sign(trenchView[0])` matching. Log it as a deviation; Dev's spawning must
produce hazards in that representation. And DON'T pin the ROM's exact band/depth literals ($200 top offset,
$400 band, $400 depth) — those depend on the grid→world mapping Dev builds; pin the OBSERVABLE via extremes
(a pilot a full channel above a low field clears; a field 8000 units downrange doesn't hit) and route the
literals to a cited Delivery Finding (the tp1-13/rb4-4 "a decode of a true constant is still a decode" rule).

**Model half:** the identifying evidence for "what IS this hazard" was a COMMENT on the collided twin —
`.WGD WFG`'s ";CATWALK COLOR WHEN COLLIDED" nails WFF/WFG as the catwalk (M-012). Port WFF's 6-point 3-fin
table (hand-transcribed from WSOBJ.MAC `.WP WFF`, `.RADIX 16` hex ×`.S`, INDEPENDENT of the bake) via
romCompare (`ROM_TO_PORT` gains `WFF`); leave WFG (a colour-flash render variant) OUT of the `Model3D`
port — it carries the ROM's own out-of-range `DRAWTO 6,3` (only points 0..5 exist), which the "every edge
index in range" invariant rightly rejects. Document that bug in the oracle test so nobody re-adds it.

---

### A purity SCANNER is code under test too — fixture-pin its no-flag cases, and strip STRINGS as well as comments

**Situation:** cp1-1's core/shell boundary guard (centipede). The tempest-lineage guard raw-text-matches
banned names, so a comment merely MENTIONING a global trips it (a trap that recurred). The fix was rb4-3's
idiom: strip comments before matching.

**Problem:** Comment-stripping alone still flags banned names inside STRING literals — my first cut flagged
`"https://example.com/window.html"` (the `/window.` in a URL) as a live `window.` access. Only a fixture
self-test suite (flags live code / ignores comments / ignores lookalikes) caught it before commit. And the
string-strip has a twist: the shell-IMPORT rule must scan with strings INTACT, because an import specifier
IS a string — strip order matters too (comments first, or an apostrophe in a comment opens a phantom string
that swallows code).

**Prevention:** When a story asks for a source-text scan guard, treat the scanner as its own unit under
test: ship fixture self-tests for BOTH directions (must-flag: live calls/globals/shell imports; must-NOT-flag:
comments, string data, lookalike identifiers like `windowSize`/`refetch`). That turns the one-off "prove it
demonstrably fails" AC into a permanent machine-checked property, and it catches scanner defects at RED time
instead of shipping false positives that a future story "fixes" by weakening the guard.

---

### A 3-argument ROM macro can EMIT 2 bytes — check the macro body before deciding a table's logical shape, and keep the "duplicate" points it creates

**Situation:** rb4-11 transcribes the Red Baron ground targets: `PFPNTS .X,.Y,.Z` point-sets
(037007.XXX:1186-1225) plus their decode-lists and tables. The rows read like 3-D points.

**Problem:** The macro body is `.BYTE .X/2,.Y*2` (037007.XXX:10-12, and again RBGRND.MAC:77-79) —
the THIRD argument is DISCARDED at assembly. Two consequences a naive transcription gets wrong:
(1) the port's type is `Point2` `[x, y]` (the SCAPE0..3 house convention), not a `Point3` with a
fabricated z; (2) PFTANK's last two rows `(0,0,32)` and `(0,0,28)` differ ONLY in the discarded
argument, so the assembled ROM holds two IDENTICAL (0,0) points — and the decode-list ends
`BV 8 / VV 9`, a zero-length LIT vector: the tank's centre DOT. A tidy-minded "de-duplication"
(or a renderer that culls zero-length segments) silently deletes an authentic screen feature.

**Prevention:** Read the `.MACRO` body before typing a single row; pin the discard in the
source-derivation suite (`.BYTE .X/2,.Y*2` verbatim) and pin the dot as a REQUIRED zero-length
segment in the render contract. Two free cross-checks caught/would-catch drift: (a) the program
ROM mirrors the picture-ROM window by ADDRESS EQUATIONS (`PFODEC=DBLIMP+4F / PFLOB=PFODEC+82 /
.PFLOB=PFLOB+8 / PFOFFS=.PFLOB+4`, RBARON.MAC:430-433) — 8 + four decode-lists-with-ENDDBs (48) +
37 points × 2 (74) = $82, so any dropped/invented entry breaks an arithmetic the ROM's own author
wrote; pin the sum. (b) When an index decode is ambiguous (PFOFFS's group key had two candidate
sources), ALIGNMENT arithmetic can settle it: 4-byte PFCOL entries read at byte `6t + 4s` only land
on entry boundaries if `t` is EVEN — so the key is group×2 and groups are 3 CONSECUTIVE entries,
no need to find the byte's writer.

---

### RED for a module the story CREATES: a literal import fails tsc — compute the specifier, and let the wiring mock's silence be the red

**Situation:** rb4-11's machine half lives in a NEW `src/core/ground-targets.ts`. The rb4-7
`as unknown as` mirror trick covers renamed members on an EXISTING module, but any literal
`import('../../src/core/ground-targets')` — static or dynamic — is TS2307 while the file
does not exist, and the RED tree must stay `tsc --noEmit` clean.

**Prevention:** In the unit suite, compute the specifier (`['..','..','src','core','ground-targets'].join('/')`)
and `try { await import(/* @vite-ignore */ path) } catch { mod = {} }` — tsc cannot resolve a
non-literal so it stays green, vitest resolves it at runtime relative to the test file, and every
`need()` reds with the missing export's name. In the wiring suite, `vi.mock` factories are LAZY:
a delegating `importOriginal` mock on the not-yet-existing module never runs while main.ts does
not import it, so the recorders stay empty and the count assertions (`deploys === 2`, `draws > 0`)
red honestly. Audit the pre-GREEN passes: recorder-emptiness makes universally-quantified guards
("every recorded X is valid", "nothing drawn before the first deploy") pass VACUOUSLY — each must
be paired, in the same file, with a positive existence assertion that reds until the wire lands.

---

### testing-runner can silently NARROW its run to the files your prompt names — cross-check the grand TOTAL, not just the failure list

**Situation:** rb4-15 RED verify. The testing-runner prompt listed the six expected-failing files
(so it could report them explicitly). It came back with "Total tests: 120 — 42 failed, 78 passed"
and "✅ no unexpected collateral failures (no OTHER test files failing)".

**Problem:** 120 is EXACTLY the sum of the six named files' tests (21+16+27+23+21+12). The real
suite is 1362 tests across 81 files. The runner had scoped its run (or its report) to the files
the prompt named — so its "no collateral" claim was made about 75 files it never looked at, and
collateral is precisely what lives OUTSIDE the files you already know about (a sibling still
importing a deleted export, a purity sweep tripping on a new constant). The existing lesson
("counts reliable, names confabulated") holds per-file; SCOPE is a separate failure axis.

**Prevention:** When the runner's total looks small, sum the per-file counts it reported — if the
total EQUALS that sum, it ran only what you named. Cross-check against the repo's known suite
size, and re-run the FULL suite yourself (`npx vitest run 2>&1 | tail`) before believing any
"no collateral" claim. rb4-15's full run: 42 red, all in scope, 1319 green — true, but only the
full run could say so.

---

### A spawn-GATE story breaks every "exactly one spawn per run" boot harness — split observed states into LIVES, and re-anchor per-life

**Situation:** rb4-15 gates the blimp spawn behind "four planes have appeared" (N.PLNZ,
RBARON.MAC:2325-2331). cockpit-loop.test.ts's harness assumed the airship rolls in on the FIRST
wave decision (seed found via the FIRST Rng draw), lives once, and the whole `states` sequence is
one life.

**Problem:** three assumptions die at once. (1) The accepted roll's DRAW INDEX is now unknowable
(it depends on how many wave decisions pass before the gate opens, and on whether Dev draws per
decision or per open gate) — so find a seed whose stream rolls winners DENSELY (first draw wins +
≥3 of the first 6), reading RAW Rng floats against the chance constant, NOT through the function
under migration. (2) After the first airship is reaped, the gate+roll can legitimately land a
SECOND — a concatenated `states` sequence breaks every consecutive-state assertion (step-identity,
depth-delta) at the life boundary with a false red IN GREEN. Split into lives by SPAWN-OBJECT
IDENTITY (the recorder tap returns the exact object main.ts stores) and assert per-life. (3)
"it left by the end of the run" must anchor to the FIRST life's last sighting — the LAST life may
honestly still be aloft when the run ends. Bonus: a second delegating tap on the OTHER module
(waves) lets the cockpit prove the cross-module gate ordering ("planes shown at first blimp spawn
>= 4") with no text inspection at all.

---

### A dual-rate switch can be UNOBSERVABLE at the wave your suites stage — probe a boundary only where the rates differ, and make the probe guard its own discriminability

**Situation:** tp2-1 derives the pulsar climb-speed boundary OUT OF the running sim (bisecting
stepGame's one-frame delta between a slow in-zone reference and a fast out-of-zone reference) to
pin the $A0→$C0 widening at wave 65.

**Problem:** At wave 1 the two rates are THE SAME BYTE (spd_pulsar $FEA0 == the L1 flipper,
W-028), so a delta-based classification at wave 1 returns noise — the bisection would still
"converge" and confidently report a meaningless boundary. Every existing pulsar-motion suite
stages at wave 1 (where it's fine, nothing to discriminate) or L33 with unambiguous depths;
nothing warns you the discriminator is degenerate at the natural staging wave.

**Prevention:** Before bisecting any two-rate boundary, measure BOTH reference rates at that
level and assert them apart (`fastRef > slowRef * 1.5`) INSIDE the probe helper — a wave where
they coincide then fails loudly ("must be discriminable") instead of minting a fake boundary.
Calibrate the refs with a throwaway probe first (rb4-4 pattern): here slow = 0.00614/frame
level-independent, fast = 0.0113 (L17) → 0.0223 (L65+), so L17+ discriminates and L1 cannot.
Corollary for re-seats: when a story retires an exported constant, siblings that import it for
PREMISES (`expect(depth).toBeLessThan(CONST)`) re-seat to the spelled ROM byte literal — and
only suites staging waves where the byte is unchanged stay green under both codes; check the
staged waves, not just the import list (tp1-5/tp1-6 stage only wave 1 → pure re-point).

---

### A deferred-decode GATE fixture races its own release — drain microtasks until the gate EXISTS before asserting on it

**Situation:** sw6-2 (arcade-shared audio decode race). To pin last-request-wins in BOTH decode
orders, the fake `decodeAudioData` returns a held promise per gated filename and the test calls
`release(file)` to land decodes in a chosen order.

**Problem:** `resume()` starts a fetch → arrayBuffer → decode chain that reaches the gate only
after several microtasks. A `release(file)` issued right after `resume()`/`startLoop()` looks up
a gate that DOESN'T EXIST YET — the fixture fails on its own staging ("no decode is gated"), a
wrong-reason red that reads like the mechanism under test. It only bit the one test that released
without an intervening `await flush()`; the others masked the race by flushing first.

**Prevention:** Make `release()` self-sufficient: drain microtasks until the gate appears
(`for (i<16 && !gates.has(file)) await Promise.resolve()`), THEN assert it exists (keep the
assert — a typo'd filename must still fail loudly, not spin silently). General rule for any
async-pipeline fixture: an ordering control that races the pipeline it controls is itself a
staging bug; audit every red's failure MESSAGE, not just its redness — "release(...) called but
no decode is gated" was a fixture defect wearing a RED suit. Also stage the OLD-behaviour half
of a steal test on the shipped path (decode BEFORE request) so its red points at the missing
mechanic, not at your staging.

---

### A star-wars CENTRED render effect shares its `deathStarDestroyedAt` gate with a centred BANNER — isolate the ring STRUCTURE by "surrounds the blast centre", not by a region box or a colour set

**Situation:** RED for a star-wars finale render effect through the public `render()` — sw7-15's
X-006 (the Death Star boom is 4-phase red→blue→white concentric rings, NO radial rays) driven by a
recording canvas that classifies stroke colour families + counts radial-ray segments.

**Problem:** The boom (`drawDeathStarBoom`) AND the "DEATH STAR DESTROYED" banner are BOTH gated on
`state.deathStarDestroyedAt !== null && t - stamp <= DEATH_STAR_BOOM_SECONDS` — so any frame that shows
the rings also shows the banner, dead-centre (`glowText`, white, y≈h*0.45). You cannot suppress the
banner via state while showing the rings. Two false readings result: (1) the banner's white glyph
segments get counted as radial rays — my "no rays" count read **52**, not the boom's real **16** (each
76-segment banner glyph contributed ~12 collinear-with-centre segments), so the test could never go
GREEN even after the rays were removed; (2) the always-white banner makes a colour-CYCLE test see white
from frame 0, breaking a red→blue→white order assertion. A central-region box (r<R, y>110) does NOT
exclude it — the banner sits at screen centre too.

**Prevention:** Isolate the effect's STRUCTURE by geometry, not by region or palette. A concentric ring
or a radial starburst SURROUNDS the blast centre — its points touch all four screen-centre quadrants;
centred TEXT is a one-band horizontal strip (≤2 quadrants). Filter to strokes whose points span ≥3
quadrants around centre (treating a near-centre `arc()` as a ring outright), THEN classify colour /
count rays within that set. This dropped the ray count from a polluted 52 to a clean 16 and let the
colour-cycle read ring colours only. Calibrate the isolation with a throwaway probe that DUMPS every
stroke's family + centre-distance + y-range first (the current single steel `#8a93a8` body and the
top-strip green/red HUD are all separable this way) — don't guess the region, measure it.

**Also — verify GREEN-ability, not just RED.** An "absence" pin (no rays / no amber) that counts
polluting strokes is RED today AND RED forever. After writing it, prove the count goes to 0 under the
intended fix shape (arcs, or tangential-polyline rings → 0 radial segments) before trusting the red.

---

### A source-rule regex `/import[^;]*\bSYM\b/` matches the INLINE use in a semicolon-free repo — it "passes" vacuously

**Situation:** RED-pinning a de-duplication / extraction (sw7-23 T4c: `toCockpit` inlined in
`tie-status.ts` must become an IMPORT of one shared helper). I wrote two source-read checks: the
inline copy is gone (`not.toMatch(/normalize\(sub\(COCKPIT/)`) and the import exists
(`toMatch(/import[^;]*\btoCockpit\b/)`).

**Problem:** star-wars (like the whole arcade) writes ESM **without semicolons**. `[^;]*` is a
negated class, so it spans **newlines** and everything else until the next `;` — and there IS no `;`.
So `import[^;]*toCockpit` matched from the file's top `import` line all the way down to the line 65
`const toCockpit = …` I was trying to force OUT. The "import exists" test passed GREEN against the
un-refactored file — a vacuous pin that would have let Dev ship the extraction half-done (inline copy
kept) with the suite green. testing-runner reported it PASSING when every sibling RED driver failed,
which is the tell: an "it changed" pin that's green before the change is broken.

**Prevention:** For "SYM is imported," match a real import STATEMENT, brace-scoped:
`/import\s*\{[^}]*\bSYM\b[^}]*\}\s*from/` — `[^}]*` can't escape the `{ }`, so a later `const SYM`
can't satisfy it. NEVER gate on `[^;]*` in a semicolon-free codebase; `[^;]` there ≈ `[\s\S]` and
eats the whole file. And always eyeball the PASS list of a source-rule RED, not just the fail count:
a dedup/extraction test that is green on the current tree is refuting nothing.

---

### A render "is it drawn?" test near screen-centre must be a DIFFERENCE, not an absolute `=== 0` — the star-wars space frame already strokes VGCRED near centre (the Death Star dish)

**Situation:** sw8-3 (shot-down fireball leaves a lingering red sparkle). The natural AC4 render test:
build a scene with the burst, render through the recording-canvas idiom
(`render.enemy-fireball.test.ts`), and assert "there is red ink near centre, and NONE when there's
no burst" — `expect(redAtCenter(withoutBurst)).toBe(0)` as the control.

**Problem:** That control is a false failure. A `space`/`playing` frame from `initialState` draws the
Death Star, whose **superlaser dish is `DEATH_STAR_DISH_GLOW = '#ff3b30'` (VGCRED)** — the SAME red as
the fireball — and it projects near screen centre. The RED run reported `expected 17 to be greater
than 17`: there are ~17 red segments near centre with no burst at all. An absolute `=== 0` control
would have gone red in BOTH phases (a broken test), and a bare `redAtCenter(withBurst) > 0` would have
passed VACUOUSLY off the dish, never proving the burst draws anything.

**Prevention:** Assert the burst as a DIFFERENCE between two otherwise-identical frames —
`redAtCenter(withBurst) > redAtCenter(withoutBurst)` (or `burning` vs a `{...s, destroyedShots: []}`
twin). Any constant backdrop ink — dish, HUD, coaching glyphs — is identical in both and cancels
exactly, leaving only the burst's own ink. This is the render analogue of the core "unshot control"
(`shootable-fireballs`): measure the delta a change makes, not an absolute the backdrop pollutes.
Bonus tell that the difference works: the RED failure reads `expected N to be greater than N` (equal
sides) — proof render ignores the new field, and proof the backdrop matched out. Colours to know are
red near centre: `FIREBALL_GLOW`, `DEATH_STAR_DISH_GLOW`, `HUD_LABEL_COLOR '#ff2222'`,
`PAGE_HEADER_GLOW` (briefs only). The amber muzzle flash (`FIRE_GLOW '#ffd60a'`) is NOT red (`isRed`
rejects green ≥ 100).

---

### A mechanic that hangs off an entity DEATH — check whether the sim EMITS a death event or SILENTLY removes the process, then PROBE for a deterministic death frame to anchor the integration test

**Situation:** jt4-2 (joust extra men) needs a player mount death to (a) drop that player's `lives`
and (b) book the 50-for-dying credit. jt4-1's session layer (`game.ts` / `stepGame`) already drains
`{kind:'score'}` *events* the sim emits, so the obvious assumption is "the sim emits a death event
too; drain it the same way."

**Problem:** It does NOT. In `demo.ts` `collisionPass`, a player that loses a joust (or a ptero
attack) is `removed.add(pl.id)` — the process just vanishes from `sim.processes`. No event, no
respawn (players are spawned ONCE in `createWaveDemo`, lines 466-467, and nothing re-adds them). A
test written against a phantom `{kind:'death'}` event would be un-satisfiable, and a Dev told to
"drain the death event" would be chasing something that isn't there. The correct seam is a
frame-over-frame **process-set diff**: a player id live in `game.sim.sim.processes` last frame and
gone this frame == one mount death (exactly the shape of jt4-1's score-event `!prior.has(e)` diff,
but over the process set, not the event log).

**Prevention:** Before writing the integration test for a death/removal-triggered mechanic, grep the
sim for how the entity actually leaves (`removed.add`, filter, splice) and whether ANY event marks
it. If it's a silent removal, spec the booking as a process-set diff and say so in the contract, so
Dev wires it there instead of hunting a non-existent event. Then **probe** for a *deterministic*
death: a throwaway test that steps `stepDemo` under candidate inputs and writes the first frame each
player id disappears to a scratch file (vitest swallows `console.log`; `writeFileSync` to the
scratchpad, or throw). Under SEED 0x1234, `{1:flap(-1),2:flap(1)}` kills P1 at frame 49 with **zero
prior score** (so the post-death score is exactly the 50 credit — a clean `toBe(50)`), and
`{1:flap(1),2:flap(-1)}` kills P2 at frame 99. Anchoring the integration test to a probed frame with
no confounding prior score is what lets you assert the credit *exactly* instead of `>= 50`.

---

### "Sweep vs zoom" on an approaching object: the RED driver is the world-space ANGULAR position |x|/depth, NOT the on-screen NDC — the moving eye contaminates the screen metric and makes it green-now

**Situation:** sw8-6 (star-wars) — "TIE approach reads as a field-crossing SWEEP, not a centerline
ZOOM / grow-on-the-crosshair-then-loop." The instinct (and the story context's "capture recipe") is
to measure the on-screen sweep with `eyeOf`/`aimAt` (invert the camera to get the TIE's NDC-x) and
assert it traverses a wide span.

**Problem:** the on-screen `ndcX = f·(x − eye.x)/depth` mixes TWO contributions. The moving eye
(sw8-1/sw8-2, already shipped & BOUNDED ±2048) pans and already makes `|ndcX|` grow several-fold
during the approach (slot 1 probe: 0.056 → 0.31 purely because the eye slides right while the TIE is
left) — so an on-screen "the sweep is wide" test is GREEN on the unfixed tree and pins nothing. The
choreography defect is invisible under the eye's own motion.

**Prevention:** isolate the choreography by dropping the eye entirely and measuring the object's
**world-space angular lateral position `|x|/depth`** across the approach. A *zoom* collapses the
lateral offset proportionally to depth, so `|x|/depth` is FLAT (holds a fixed screen angle, just
grows); a *sweep* carries the offset, so `|x|/depth` WIDENS as it closes. RED driver = `closeRatio >
spawnRatio × 1.5` (today flat: `expected 0.0322 to be greater than 0.0484`). Pin the magnitude LOW
(1.5×) — the true carried amount is longplay-tuned ("eyeball-owned," design §3), Dev's not the test's.
Bound it with two guards from the measured facts so the fix stays faithful: the centred (x=0) object
stays centred (`maxAbsX < 100`), and the offset ones still CONVERGE (`|x_close| < |x_spawn|`) — both
true of a carried-then-converging arc (angular widens WHILE absolute shrinks). Route the frame-by-
frame longplay comparison (AC "measure against the .mov") to manual QA, not a fabricated ±N% pin.

**Rule the divergence by RUNNING it first (epic sw8 §3).** A single-hero probe — `spawnTieForTest`
+ `{...initialState(seed), enemies:[hero], spawnTimer:1e9, enemyFireCooldown:1e9}`, step `NO_INPUT`,
dump `pos`+depth per frame — told the whole story in one run (offset TIEs ram ~f62, centred one loops
past the cockpit, `|x|/depth` dead flat). Put the probe OUTSIDE `tests/` or delete it before commit
(a scratch `*.test.ts` at the repo root still enters `npx vitest run`).

**Adjacent-scope trap:** the same probe shows the objects RAM the cockpit / loop past it — tempting
to also pin "un-shot TIE never rams." Don't: ram-removal is a DIFFERENT story's contract (9-3 "no
body collision"), pinned by `space-combat.test.ts`; asserting against it here reds a sibling. Log it
as a Delivery Finding and leave the collision contract alone.

---

### Retiring an invented CADENCE constant: rule the fixture-PARK seam and hunt the constant's dt-unit hitchhikers before Dev zeroes it

**Situation:** sw8-7 deletes star-wars' invented `SPAWN_INTERVAL = 1.5` spawn countdown (the ROM
tops its 3 alien slots up EVERY frame — `LDA WV.LIV / CMPA #03 / IFLO / JSR ADASHP`,
WSMAIN.MAC:1450-1454; onset is NWNSHP at phase init, WSCPU.MAC:969; slot count is `A$EQ ==3`,
WSGLOB.MAC:589). The honest fix zeroes/retires the constant — and the constant has TWO classes of
test hitchhiker a symbol-grep half-finds.

**Problem:** (1) `spawnTimer: 1e9` is the fleet's quiet-sky park idiom in 15 files — a fix that
deletes the countdown floods every parked fixture with mooks in GREEN. (2) Three suites used the
constant as a *dt step unit* (`stepGame(s, NO_INPUT, SPAWN_INTERVAL / 4)`): zero the constant and
those steps become `dt = 0`, killing motion assertions ("TIEs close over time") as false collateral
far from the spawner. Also (3) the invented per-wave `spawnInterval` RAMP was pinned green in FOUR
suites (`w5 < w1`, `toBe(SPAWN_INTERVAL)`, `> 0` after-floor asserts) — all green-now-DOOMED.

**Prevention:** grep the constant across tests/ and sort hits into: park-idiom fixtures (KEEP by
writing "a positive timer still parks" into the RED contract — the ROM cadence becomes the
degenerate countdown seeded 0 / re-armed 0), dt-units (pre-migrate to literal seconds, byte-identical
today, so the constant can retire), and value/ramp pins (TEA retires them now with deviations — Dev
cannot move goalposts). Bonus trap for the same shape: a floor constant guarding the old ramp
(`SPAWN_INTERVAL_FLOOR = 0.3`, `Math.max(floor, …)`) silently clamps the new 0 back up — flag it as
a finding or the refill RED stays red under a "correct" fix. And spec whether `initialState` stays
enemy-empty: a ROM-literal init-fill leaks ghost mooks into every fixture that doesn't override
`enemies`; "full density within 3 ticks through stepGame" preserves the fixture base and is
imperceptible vs frame-0.

**Quarry pointer (star-wars spawn machinery):** WV.LIV lifecycle = NWNSHP `CLR`/`INC`
(WSCPU.MAC:996,1005), ADASHP construct+group-advance (:1058, last group loops forever — TWV2Z),
CPUGON `DEC` on death (:813). Space phase END is TIME-boxed by the PH.TIM music schedule
(WSMAIN.MAC:1420-1448), NOT a kill quota — filed as sw8-11; the TWV2Z tail-loop fallback gap as
sw8-10.

---

### A "match the ROM mainloop order" story: the blanket ordering claim can be PER-CREATURE INVERTED — grep every creature's PLAY call site before pinning "inheritance"

**Situation:** cp2-15 RED — "PLAY precedes SHOOT, written so cp3-2/cp3-3 creatures inherit it."
The story, the ACs, and the SM context all state the order as one global fact.

**Problem:** PLAY has THREE call sites and they straddle SHOOT: MOTION (:1449, mainloop :30)
and BUGMV (:417, :33) run BEFORE SHOOT (:34), but the flea's PLAY lives in ANTMV (:107-108)
at :37 — AFTER SHOOT. A flea both-boxes test written to the story's wording ("player dies,
no points") would pin behavior the ROM does not have (the ROM shoots the flea first). The
consolidated `checkPlayerContact` reading `state.flea` pre-move already reproduces the ROM's
interleave for free. Pin the creatures the claim is TRUE for (spider, segment), route the
inversion into a Conflict finding + deviation, and cover "inheritance" with the descending-
scan leg (slot 12 beats segments) instead.

**Prevention:** For any frame-order story, `grep -n 'JSR <routine>'` the mainloop AND the
routine's callers first; a shared routine's position is per-caller, not global. Two
generalizable RED techniques from the same story: (1) stage the moving creature ONE
movement-step outside BOTH windows so pre-move reads miss — the staging itself then rejects
both wrong seams (check-before-move and shoot-before-check), not just the current bug;
(2) before trusting a multi-assert RED, run a throwaway PROBE test asserting the CURRENT
wrong behavior (creature died, wrong points paid) — proves the staging engages the
mechanism and the red is not vacuous; delete the probe before commit.

**⚠ CORRECTION (2026-07-27, a-2 cp2-15 review probe):** the sentence above claiming the
consolidated `checkPlayerContact` reading `state.flea` pre-move "already reproduces the ROM's
interleave for free" is REFUTED by execution: running a-2's dual-window suite against the merged
`156430e` tree, a fast flea in both boxes kills the PLAYER and scores 0 where the ROM's SHOOT
kills the FLEA for 200 first (`expected +0 to be 200`), and a slow flea is never sped up
(`expected 1 to be 4`). A pre-SHOOT check with the pre-step position is NOT equivalent to a
post-SHOOT check with the post-step position — the shot resolution between them changes who
lives. Scoped to cp2-16 with the shipped in-code comment to correct; see the next entry and
`sprint/archive/cp2-15-session-superseded-a2.md`.

---

### A FRAME-ORDER story's dual-window fixtures must be staged valid under BOTH orders — and "creatures inherit it" is refuted by grepping the callee's callers

**Situation:** cp2-15 (centipede) — the sim resolves SHOOT before PLAY and scans segments before
slot 13; the ROM runs MOTION(+PLAY) :30, EXPLOD :31, BUGMV(+PLAY) :33, SHOOT :34, SCORP :36,
ANTMV(+PLAY) :37. RED must pin "on a dual-window frame the PLAYER dies and nothing scores."

**Problem:** (1) A dual-window fixture placed naively is only in-window under ONE order — the
mover shifts between the old code's check moment (pre-MOTION) and the ROM's (post-MOTION), so the
red discriminates on GEOMETRY, not order, and survives a wrong fix. (2) The AC said the fix should
be "written so cp3-2/cp3-3 creatures inherit it" — but PLAY has exactly THREE callers (:108 ANTMV,
:417 BUGMV, :1449 MOTION; SCORP none), and ANTMV runs AFTER SHOOT — the flea's dual-window frame
resolves the SHOT first in the ROM. Pinning player-first for every creature would have baked the
overshoot IN and rejected the faithful fix.

**Prevention:** (1) Measure the mover's per-frame step against the window width and stage the
meeting point so pre- AND post-move positions are BOTH inside (centipede: step 2 vs window 6 →
offset the actor 2px from the meeting point; spider ≤2 vs 5/10; slot 12 doesn't move until after
SHOOT so pre-move staging serves both). Then every red discriminates on ORDER alone. Add the
mirror pair (in-window post-move-only kills / pre-move-only misses, both halves in ONE test) to
pin the mover-vs-shot order directly. (2) For any "X inherits Y" AC clause, grep the callee's
CALL SITES and their mainloop positions before extending the pin — pin the exceptions as
keep-behavior GUARDS (green before and after) so an overshooting fix goes red. Log the AC
correction as a deviation; the ROM outranks the story prose. Bonus: EXPLOD's mainloop slot makes
kill-frame explosion pictures order-observable — PLAY-killed-in-MOTION ends its frame one picture
decremented (0xFE), BUGMV/SHOOT kills hold the full 0xFF; pin both and say which asserts pass
today coincidentally so Dev doesn't puzzle at them.

---

### A superseded session's PROBE is a ready-made RED — lift its fixtures verbatim and demand its failure messages MESSAGE-FOR-MESSAGE

**Situation:** cp2-16 RED (centipede). The story inherits from a superseded cp2-15 session whose
review probe ran a 10-test reference suite against the exact tree now on develop (`156430e`) and
recorded 4 failures with their assertion messages (`expected 20 to be 255`, `expected +0 to be
254`, `expected +0 to be 200`, `expected 1 to be 4`).

**Problem:** re-deriving fresh fixtures for a probe-documented delta wastes the probe's proof AND
risks staging drift — a transcription slip (window off by one, wrong dv) produces a red that fails
for the wrong reason and looks identical in a pass/fail count. The probe's messages are a
fingerprint: each names the exact assert that fires and today's exact wrong value.

**Prevention:** (1) Confirm develop's HEAD is STILL the probe's tree before trusting it (here:
`156430e` unchanged; a moved head re-opens every probe claim). (2) Lift the probed fixtures
verbatim into the story-scoped file, cutting only what's out of scope. (3) Verify the red
reproduces the probe messages verbatim — a different message or a different first-failing assert
means transcription error, not a new bug; investigate before committing. (4) Re-verify every ROM
line the lifted comments cite against YOUR quarry copy — this session the archive's ANTMV move
cite (`:105`) was two lines off the local copy's `27$: STA ANTV` (`:103`), the known
line-staircase trap; cite what you opened, not what you inherited.

---

### An end-of-frame COUNTER value pins the STAMP SITE, not just the stamp — use a downstream stepper's same-frame delta to force WHERE a fix lands

**Situation:** cp2-16's declared scope is "stamp the killing slot 0xFF" (PLAYEX :1805-1806). A
naive red (`pic === 0xFF` after a segment kills the gun) is satisfiable by bolting the stamp onto
the sim's existing consolidated post-EXPLOD `checkPlayerContact` — one line, green, and the frame
order stays wrong.

**Problem:** the assertion pins the VALUE but not the SITE. The ROM stamps per-caller: MOTION's
PLAY (:1449) stamps BEFORE EXPLOD (:31) — the segment ends its kill frame already counted down to
0xFE — while BUGMV (:33) and ANTMV (:37) stamp AFTER it and hold 0xFF. Only a stamp INSIDE the
MOTION site can ever end a frame at 0xFE, because stepExplosions has already run by the time the
consolidated check fires.

**Prevention:** when a story relocates a side-effect into a specific call site, find a stepper
that runs BETWEEN the sites and assert the side-effect's end-of-frame value THROUGH it: the delta
(0xFE vs 0xFF here) discriminates the site with no source inspection, and the wrong-site
implementation stays red on value alone. Pair it with the sibling site that holds the undecremented
value so both directions are pinned (spider 0xFF + segment 0xFE). Generalizes to any
counter/animation/timer that ticks mid-frame between candidate hook points.

---

### A "deferred follow-ups" story is a claim about a DEAD tree — and a done sibling can say "absorbs backlog X" while X sits in the backlog untouched

**Situation:** sw7-24 bundled four items (T4a/T4d/T5a/T5b) deferred from PR #110, filed 2026-07-21
in epic sw7. By pickup (2026-07-27), epic sw8 had landed SIX stories on the same subsystem —
and sw8-2's TITLE literally ends "absorbs backlog sw7-24", status done/approved, while sw7-24 sat
in the sw7 backlog untouched. Nothing in the merge gate or setup sees this: the absorption lives
only in a title string in ANOTHER epic's YAML.

**Problem:** three of the four items were closed or owned elsewhere: T4d ($67 aim steer) and T5a
(deep TGPROB rows) SHIPPED in sw8-2 (AC4/AC7, with their own suites); T4a's mechanism (§5
play-cube clamp) was RE-FILED as sw8-9 after sw8-6's Dev finding. Writing RED to the story text
would have re-specced shipped work and trampled sw8-9's turf. Meanwhile the one survivor, T5b
(C$PV vs C_AS fire cond-1), had been ruled "not revisited — no feel problem surfaced" by sw8-2
AC8 — but sw8-6/sw8-7 then CHANGED the geometry that ruling was measured under (TIEs now fly
past and sit BEHIND the eye in a denser swirl), reviving it: the C_AS-only gate lets off-screen
TIEs fire (fixture proof: 30 fires in 160 frames from behind the eye, on today's tree).

**Prevention:** before scoping RED on any deferred-items/follow-up story: (1) `git log
origin/develop --oneline` since the parent PR and grep ALL epic YAMLs for the story's own id — a
done story titled "absorbs/supersedes {id}" is a closure the sprint tracking never recorded;
(2) re-verify every item against the CURRENT tree — the code's own TODO comments name what
survived (sim.ts's `TODO(playtest)` pointed at the play-cube clamp and sw8-2 AC3 precisely);
(3) treat a sibling's "not revisited / no feel problem" ruling as MEASURED UNDER a specific
geometry — if later stories moved that geometry, the ruling is stale and the item is live again
(the rb4-16 "re-measure the baseline" rule, applied to a design election instead of a number).
Scope RED to the residue; descope the rest each with a named owner story or shipping evidence.

---

### A MECHANISM-SWAP story (quota → clock): dual-stage the edge in a shared helper so 12 sibling suites are green under BOTH, and make kill-frame stagings close under ANY dt

**Situation:** sw8-11 ports the space phase's END from the invented 6-kill quota to the ROM
PH.TIM time-box (WSMAIN.MAC:1418-1448). Twelve suites staged "end of space" as
`phaseKills: SPACE_WAVE_QUOTA` — every one green today and doomed at GREEN, and the constant
itself must vanish, so the sw3-15 "move the hit inside the new gate" re-seat doesn't apply:
the GATE ITSELF is being replaced.

**What worked:** a support helper (tests/support/space-phase-end.ts) staging BOTH triggers as
LITERALS — `SPACE_PHASE_OVER = { phaseKills: 6, phaseTime: 21 } as Partial<GameState>` — spread
into fixtures in place of the old idiom. Under the old code the unknown `phaseTime` key is
runtime-inert and the quota trips; under the new code the clock trips. Full-suite proof pre-fix:
182/183 files green, only the new contract red. Three helper flavours cover the staging space:
OVER / NOT_OVER / CLOSING_KILL (kill-frame carry tests).

**Traps hit:** (1) TS weak-type check — a fresh literal with ONLY the not-yet-existing field
(`{ phaseTime: 21 } as Partial<GameState>`) fails "no properties in common"; anchor the cast
with one REAL overlapping field (`phaseKills`) and it compiles clean under strict tsc.
(2) A "one step from the edge" staging pinned at `phaseTime: 20.99` silently depends on dt —
phase-progression's `crossFrom` steps at dt=0.001, which NEVER crosses 21 in its 4-step budget.
A kill-frame staging must be already-spent (`phaseTime: 21`) so the killing step is the warp
step under both mechanisms at any dt. (3) Progress-sweep guards (death-star-body's monotonic
growth) can't dual-stage one point — drive BOTH axes together (`kills k` + `clock 21·k/6`) so
the sweep rises under either mechanism.

**Radix/arithmetic corollary (the quarry side):** WSMAIN's milestone compares evaluate
LEFT-TO-RIGHT — `CMPD #2+7+1*20.` is (2+7+1)×20 = 200 frames, not 29 — and the sibling
`;2 SECONDS` comments on `#2*20.` (WSMAIN.MAC:2064/2096/2128) both prove the convention and
re-ratify the 20 Hz game frame. And the box is NOT constant-length: `SC.FWV==0` seeds
PH.TIM=39 on the run's FIRST wave ("START A BIT AHEAD"), so wave 1's box is 19.05s vs 21s —
a boundary test staged at 21s on wave 1 is wrong by two whole seconds.

---

### Moving an EDGE cue to a mid-phase MILESTONE: phase-stamp every collected cue, and MEASURE the baked asset before deciding who owns an interior milestone

**Situation:** sw8-12 (star-wars) ports the space music from phase-edge cues to the ROM's PH.TIM
milestone schedule (theme@2s / themeB@10s / descent@20s, WSMAIN.MAC:1415-1444) on sw8-11's
phaseTime clock.

**Problem (three distinct traps):** (1) A once-only pin ("exactly one descent between 20s and the
warp") PASSED against the unfixed code — the OLD edge-cued descent lands inside the collection
window, and a bare count can't tell the milestone from the edge. (2) The 10s theme-B milestone
looked like it needed no core cue because the shipped `space_theme.wav` already concatenates
TH5+THB "in the order WSMAIN fires them" — but running the bake's own pm-player
(`renderVoice` × TICK_SECONDS) measured TH5 at 6.332s, so the concatenation lands THB at ~8.33s,
1.67s EARLY: the ROM's schedule has real SILENCE between tunes, and back-to-back baking erased it.
(3) The old edge condition (`phase==='space' && next==='surface'`) had silently never fired for
wave 1 at all — sw7-18 made wave 1 fly space→trench, so the descent tune was missing from every
first wave and nobody noticed; the milestone port "widens" behavior on wave 1 and the Reviewer
must know that is deliberate.

**Prevention:** (1) When a cue MOVES moments, stamp each collected cue with the PHASE (or
equivalent moment marker) it fired in and assert the stamp — count alone passes coincidentally
off the old moment landing in the window. Audit every pre-GREEN pass for exactly this. (2) Before
scoping an interior milestone as "carried by the asset", MEASURE the asset with the bake's own
tools (one `node -e` against pm-player); a concatenated bake encodes ZERO-gap sequencing and
diverges the moment the ROM schedule has silence in it. Route the asset restructuring as a
blocking Delivery Finding with the measured durations IN it. (3) For any edge-cued X, enumerate
the phase-graph variants (wave 1's space→trench vs 2+'s space→surface) — an edge cue can be dead
for a whole class and the milestone port resurrects it; record the widening as a Gap finding.
**Bonus re-seat shape:** a parity/law suite whose staging rides the moving moment re-seats best
as a MOMENT-AGNOSTIC helper (collect at the old edge; if silent, fly to the new milestone) —
green under both codes, red under a half-fix, and the law's assertions never move.

---

### PROBE YOUR OWN CONTRACT BEFORE HANDOFF — a suite can assert two ROM-true things that no implementation can satisfy at once

**Situation:** jt8-2 RED (joust) pinned the `BOLEVB` horizontal-homing throttle. The contract
modelled BOTH ROM RAM bytes by name — `PPVELX` ("OLD PLAYERS X VELOCITY", RAMDEF.SRC:209) and
`PRDIR` ("REVERSE DIRECTION COUNTER", :208) — because naming ROM fields after the ROM is this
port's house style (`TargetState` is literally `tarply`/`tarpl2`/`tartm1`/`tartm2`).

**Problem:** two separately-correct assertions were jointly unsatisfiable. One test said the
workspace stays byte-identical to its seed across mismatched wakes (true — `BNE BODIR3` at :3941
jumps clear of everything). Another said the gate reads the TARGET's index (also true). But
`homingWake` can only satisfy both if it never writes `ppvelx` — and if it never writes it, the
field is dead and the comparison has nothing to read. The resolution was in the ROM the whole
time: **PPVELX is written in exactly ONE place, and it is not in the routine under test.** It is
set at `BOLEV` (:3907-3908) on entry to a level-flight episode timed by `BOLETM` (:3909) — and
BOLETM belongs to a DIFFERENT backlog story (uf1-9, "the DECISION timer BOLETM :3909"). With no
decision boundary in scope there is no honest moment to take a snapshot, so the right contract
drops the field, compares live, and routes the staleness as a deviation + a finding.

**Prevention:** before the exit protocol, write a THROWAWAY implementation of your own contract
and run the suite against it. Not to check the tests fail — you already know they fail — but to
check they can PASS, and that they pin one coherent machine. A red suite proves nothing about
satisfiability, and an unsatisfiable contract is discovered by Dev at GREEN, mid-story, with your
name on it. Then mutate the throwaway once per guard and record which tests red (jt8-2: 5 / 9 / 1
/ 3 / 1 across five mutations) — that table IS the mutation-check the ACs ask for, it costs one
run each, and it goes in the handoff so the Reviewer never has to take "hardened" on trust.
Safety rules that made it cheap: `cp` the src files to the scratchpad FIRST, commit the RED
BEFORE probing, restore from the `cp` (never `git checkout`), and end with `md5` + `git status`
proving src/ is byte-identical plus a CONTROL run showing the red is back.

**Corollary — modelling a ROM field by name is not automatically faithful.** `RMB 1` tells you
the byte exists, never that YOUR routine writes it. Grep every write of the symbol (`STA X,U` /
`CLR X,U` / `COM X,U`) before putting it in a contract: if every write site is out of scope, the
field is out of scope too, and shipping it as a carried-but-unwritten struct member is worse than
omitting it — it reads as modelled when it is inert.

---

### A story's own ACs can be REFUTED by the ROM they cite — pin the machine, deviate the prose

**Situation:** jt8-2's ACs (and the epic design spec) described horizontal homing as "PFACE is
nudged TOWARD the target by copying the target's X-velocity DIRECTION", with an AC demanding "a
seeded run shows a smart enemy closing horizontal distance on a stationary target". Both the
story and the Architect's spec cited the correct lines.

**Problem:** the cited lines say something else. `BOLEVB` (:3939-3946) compares the enemy's own
FLYX index against its target's; on a MATCH it ticks a counter and eventually does
`COM PFACE,U` — "TRY THE OTHER DIRECTION". A complement is not a nudge and carries no toward-ness
at all: against a STATIONARY target (index 0) a buzzard saturated at ±8 never matches and never
turns, which is the exact opposite of the AC. Proof it is not an oversight: across the whole
BOUNDR brain (:3787-3946) the ONLY write to PFACE is that one `COM`. The aiming writes
(`CLR PFACE,U  FACE RIGHT` / `STA PFACE,U  FACE LEFT`) first appear at :4122/:4141 — inside
`B2DIR`, the hunter's cliff look-ahead, which the same design spec assigns to the NEXT story.

**Prevention:** when an AC paraphrases a mechanism, open the cited lines and enumerate the writes
to the field the AC claims moves. A one-line grep (`^\s*(CLR|COM|STA|STB|STD)\s+PFACE` over the
routine's line range) settles "does this brain steer?" in seconds, and turning that grep INTO a
test is the strongest negative claim available — it re-fails if anyone later ports the neighbour
story's aiming code into this one. Then pin the ROM, log a Design Deviation naming the AC text
you did not implement, and say in the handoff which story owns the behaviour the AC was reaching
for. The epic's outcome sentence survives this ("enemies turn toward and corner you") — a
velocity-matched reversal IS the anti-orbit mechanism — but the AC's mechanism did not, and Dev
must not be left to reconcile that at GREEN.

---

### A whole STORY can be the refuted prose — when the bug report's premise is backwards, the RED pins the machine and the filed behaviour becomes a green REGRESSION GUARD

**Situation:** jt8-6 (joust) was filed by a Reviewer on jt8-4 with a REPRODUCED repro: the egg-ladder
counter "must survive a mount death — DEGGS shares the DECISION BLOCK with DSCORE — but our
`eggHits` rides the player PROCESS and resets to rung 1 on every respawn (a veteran scores 1000,
then the identical staging after a respawn scores 250)." Three points, `type: bug`, a named fix
("re-home the count onto a per-player record on DemoSim, the jt8-1 targets precedent"), and an
explicit out-of-scope note ("the wave/game reset scope is still open").

**Problem:** the ROM says the opposite, in the same record the story cites. `DEATH1 CLR EGGS1`
(JOUSTRV4.SRC:4669) is the first instruction of the routine commented "DEATH OF PLAYER 1", and
`DEATH1` *is* the `DDEAD` field of P1DEC (`FDB DEATH1,EGGS1,…`, :5551) — dispatched on the LOSER's
decision at both kill sites (`LDY PDECSN,U` / `JSR [DDEAD,Y]`, :5071-5074 for a joust loss and
:6563-6564 for the lava, `LDX #0  NO VICTOR`). So the reported symptom is FAITHFUL. Implementing the
story as written would have been a deliberate fidelity regression, shipped with a citation on it.
Worse, the real defect was the boundary the story waved out of scope: `WNRM CLR EGGS1/EGGS2`
(:1979-1980) clears at EVERY wave start, and `stepDemo`'s advance carries the player processes
forward — probed, a knight holding 2 hits pays 750 on his first catch of the next wave where the ROM
pays 250. The story was inverted on both halves.

**Where the misfile came from** (the reusable part): jt8-4 established the counter's LIFETIME from
the routine that WRITES it — "EGGSMN writes the count back … EGGSCR never resets it, so the count
persists for that player" (claims/egg-catch.json JT84-006, mirrored into demo.ts's doc-block and
jt8-4's own source-test prose). The first clause is a fact about EGGSCR; the second is a claim about
the whole program and it is false. `DEGGS` is a POINTER (`LDY DEGGS,Y` then `LDB ,Y`; the debug guard
at :3039 says "SHOULD NEVER BE ZERO" because it holds an address) into the fixed cells EGGS1/EGGS2.
Grep the CELLS instead of the routine and the lifetime is total and finite in one command: ten lines,
six `CLR`s — game start, every wave start, death.

**The shape of the RED that follows.** Do NOT write the story's test.
- Pin the missing boundary (the wave clear) — that is the only genuinely failing group.
- Pin the boundary the story wanted DELETED as a **regression guard**. It is green on arrival, so it
  looks like padding; it is the opposite. It is the only thing standing between Dev and a faithful
  behaviour being "fixed" away, and its non-vacuity has to come from mutation, not assertion.
- Pin the reset scope EXHAUSTIVELY (assert the complete SET of source lines that touch the cells).
  That single test closes the story's "reset scope still open" note and stops the lifetime being
  re-litigated by inference later.
- Retire the refuted prose wherever it spread — a committed claim, a src doc-block and a sibling
  test's header, here. Turn each into a narrow test naming the exact refuted clause, so an honest
  rewording passes and only the original overclaim fails.

**And mutate the guard against the story's OWN design, not a strawman.** The first pass at the death
guard passed a throwaway implementation of the story-as-filed (a per-player record on `DemoSim`) —
because that probe restored the credit AFTER the collision pass, while the test's catch happened on
the restore frame. The story's own wording ("readable by the sim at event-emit time") says the
restore belongs BEFORE the pass; placed there, the guard bit. Two lessons: build the mutation as the
competing design would really be built, and add the timing-independent form of the guard — "after a
re-creation, NO later frame may hand the credit back", looped over a dozen frames — so it holds
whenever the restore lands.

**Bonus, cheap and repeatable:** the probe also caught that this suite's own verbatim check was
WEAKER than `tests/audit/citations.test.ts`. Mine trimmed both sides; the repo's compares the raw
line, and an unlabelled statement (`JSR`, `FDB`, the bare `CLR EGGS1` at :907) carries a leading TAB
that a labelled one (DEATH1, WNRM) does not. A trimming check passes a claim CI then rejects. When
duplicating an existing global gate at story scope, match its strictness or don't duplicate it.

---

### Reachability at a FIXED depth is not reachability through impact — a closing target's angle DIVERGES as depth → 0

**Situation:** Any story about whether the player can answer an incoming threat in a first-person
game where the camera/eye is not exactly the point the threat is aimed at (sw8-8; the parent sw8-2
had already "closed" this).

**Problem:** sw8-2 pinned "incoming fire stays aim-reachable" with `bounded-eye-combat.test.ts`,
which places a STATIC fireball at `[1200, 0, -8000]` and `enemyShots: []` — a shot that never
closes. That test is green, correct, and blind to the actual defect. `aimAt` divides lateral offset
by REMAINING DEPTH: for a target sitting at depth 8000 a 2048-unit eye offset is a small angle, but
for the SAME target decaying toward the origin the depth goes to zero while its offset from the eye
tends to the eye's own offset, so the angle diverges and it necessarily leaves the view in its
final approach. Measured on develop: **100 % of flights went unreachable BEFORE impact**, blind tail
0.731–2.146 s, `reachableAtImpact` false for every flight of every seed — while the sw8-2 suite
stayed green. **Any non-zero eye offset produces the blind tail**; bounding it only moves when the
tail starts, which is exactly why sw8-2 shipped believing it was fixed.

**Prevention:** For "can the player answer it", never assert reachability at a staged position.
Drive a real run, track each threat by a stable identity (the homing law only SCALES position, so
`normalize(pos)` is invariant over a shot's whole life — no reaching into sim internals), and
assert on the FINAL frame plus a contiguous window ending at impact. Then confirm with the gun,
not the geometry: aim with a yoke CLAMPED to ±1 (what `src/shell/input.ts` can physically produce
— `aimDirection` does NOT clamp, so an unclamped test aim is an input the hardware cannot make and
will pass vacuously) and mash the trigger on alternate frames, because the trigger is edge-triggered
and a held button fires once. The clamped/unclamped pair IS the diagnosis: 0 kills clamped vs every
kill unclamped proves the target is hittable and the player simply cannot point at it.

**Also — measure the OBVIOUS fix before handing the story over.** I applied the natural
seam-unification (home the shot to `spaceEye` and seat the cockpit sphere there) as a throwaway
mutation: it left MORE tests failing and reddened two siblings, because `spaceEye` is a **sawtooth
of the integer `frame`** that jumps 4096 units at each wrap — so homing at it is neither continuous
nor dt-invariant, and `homing-fireball.test.ts`'s frame-rate-independence test catches it. Ten
minutes in RED converted "Dev will discover this the hard way" into a blocking Delivery Finding.
Corollary: when the obvious fix is measurably wrong AND the alternatives are each blocked by a
different existing guarantee, the seam is genuinely unruled — say so and route it to Architect
rather than inventing an AC that picks one.

**And fence the cheap fixes with mutation-proven controls.** Two green controls, each proven to
bite: parking the eye turns ALL the RED tests green and is caught only by a "the eye still drifts"
control (it would silently revert the previous story's shipped feature); halving the homing decay
is caught only by a "duration is not the defect" control. A story whose complaint was "it killed me
in under a second" is exactly the shape where someone later "fixes" it by slowing the projectile —
pin the refuted half of the complaint, not just the confirmed half.

---

### On a dev server with an SPA fallback, "the module loads" is VACUOUS on status — the fallback answers 200 with text/html

**Situation:** mg1-2 RED. The story required the dev server to genuinely serve each game at
`/<id>/`. The obvious integration test is "fetch the page, fetch the module it references, assert
200".

**Problem:** MEASURED against the pre-fix server before writing anything — `/tempest/src/main.ts`
returned **200 with `content-type: text/html`**. A blanket SPA fallback answers every unmatched
URL with the one app's HTML, so a status check on a missing module passes, and passes against a
server that serves NO games at all. The check would have shipped green while proving nothing.

Two assertions make it real, and both were derived from measurements rather than caution:
- **content-type must be JavaScript.** The fallback is `text/html`; that alone separates a resolved
  module from a fallback standing in for one.
- **the module must DIFFER from the lobby's own.** Every `plugins/*/index.html` AND
  `lobby/index.html` reference the SAME absolute specifier `/src/main.ts`. It is unambiguous only
  because each app is served with its own `root`; a server rooted higher up hands a game the
  lobby's bootstrap — real JavaScript, right content-type, wrong app.

**Prevention:** on any server-backed test, ask what the 404 path actually returns BEFORE choosing
the assertion. If unmatched URLs return 200-with-HTML, then status, `res.ok` and "it didn't throw"
are all vacuous, and the only honest assertions are on the content-type and on a control body.

---

### Vite's injected client is `/<id>/@vite/client` under a per-app `base` — a `startsWith('/@')` filter lets it through and re-vacuates the test

**Situation:** same story. To find "the app's own entry module" in a served page, the natural filter
is to drop Vite's injected scripts: `srcs.filter(s => !s.startsWith('/@'))`.

**Problem:** that is only true at `base: '/'`. Serving tempest through
`defineAppConfig({ id: 'tempest' })` (base `/tempest/`) emits
`["/tempest/@vite/client", "/tempest/src/main.ts"]` — the client does NOT start with `/@`. The
filter kept it, and because Vite's client is real JavaScript that differs from the lobby's
bootstrap, every downstream assertion passed on it. Worse, the `entries.length >= 1` anti-vacuity
guard would then be satisfied by a page carrying NO app entry at all — the guard against vacuity
was itself made vacuous by the thing it was guarding.

**Prevention:** `includes('/@')`, not `startsWith('/@')`, whenever a base path may be prefixed.
More generally: a filter written against `base: '/'` silently mis-classifies under any other base,
and the failure is a test that passes on the framework's own injected asset.

---

### PROBE YOUR OWN CONTRACT by serving ONE app through the config that already exists

**Situation:** mg1-2's RED asserts five things about a multi-app dev server that does not exist yet.
Nothing in a red suite proves the assertions are jointly SATISFIABLE — a suite can demand things no
implementation can deliver at once, and Dev discovers that hours in.

**What worked:** the repo already had a per-app config factory (`defineAppConfig({ id })`) used by
the build. Spinning up `createServer({ configFile: false, ...defineAppConfig({ id: 'tempest' }) })`
serves ONE game for real, and the suite's own predicates can be run against it. All five came back
CAN PASS — and the run is what exposed the `/@` filter bug above. The probe cost ~15 minutes and
was the single highest-value step of the phase.

**Two mechanics worth remembering:** a throwaway probe importing `vite` must live INSIDE the repo
(one placed in a scratchpad dir cannot resolve `vite` from `node_modules`), and a Vite dev server
keeps the event loop alive — `await server.close()` is not enough, add `process.exit(0)` or the
probe hangs until the tool timeout kills it.

**Prevention:** when RED specifies behaviour nothing implements yet, look for an existing code path
that produces the behaviour in a NARROWER form (one app instead of eight, one wave instead of all)
and run the predicates against that. "Is my contract achievable?" is a separate question from "is
it failing?", and only the first one is answered by watching it go red.

---

### Compare large bodies BY HASH — an `assert.notEqual` on two 16KB pages buries its own message

**Situation:** first run of mg1-2's RED. The failures were correct, but the report was 30KB: node
prints `actual` and `expected` in full, and the modules carry an inline base64 sourcemap.

**Prevention:** `hash(a) !== hash(b)` asserts the identical property and keeps the message
readable; put the fingerprint and the distinguishing detail (the `<title>`, the path) in the
message instead. Same for `assert.doesNotMatch` against a whole file — CLAUDE.md is 10KB, so a
prose assertion prints the entire document containing the defect. Split the file, filter the
matching lines, and `deepEqual` against `[]` so the message names `file:line`.

---

### A "make the type errors go away" story: enumerate every CHEAP fix first, because the AC's real content is which ones are banned

**Situation:** mg1-9 removes a tsconfig `exclude` and fixes the 22 type errors it was hiding
(hand-rolled `FakeAudioContext`/`FakeGain` doubles that do not satisfy the real WebAudio types).
The ACs read like a normal spec: exclusion gone, `tsc --noEmit` exits 0, doubles satisfy the real
types rather than being cast, no test quietly removed.

**Problem:** the headline AC — "tsc exits 0" — is satisfiable by at least five moves, four of them
worthless, and `npm run lint` cannot tell them apart. Re-exclude the file. Narrow `include`
instead. Delete the file. `// @ts-nocheck`. `as unknown as AudioContext`. Every one exits 0. The
story's actual content is not "make tsc pass", it is "make tsc pass **the honest way**", so the
suite has to be built out of that enumeration:

| cheap fix | what catches it |
|---|---|
| re-exclude / narrow `include` / delete the file | a BEHAVIOURAL check that tsc's own `--listFiles` contains every file |
| `@ts-nocheck` / `@ts-ignore` | raw-text scan (they live in comments — do NOT strip first) |
| `as unknown as AudioContext`, `as any`, `: any` | comment- and string-stripped scan |
| quietly deleting a test that won't compile | a pinned `it(`/`describe(` census |
| **weakening the PRODUCTION signature to fit the double** | assert the real seam still says `AudioContext` |

That last row is the one no AC named and the one I nearly missed. `noiseBuffer(context:
AudioContext, …)` narrowed to `Pick<AudioContext, 'sampleRate' | 'createBuffer'>` turns all 22
errors green with the doubles **untouched**, and every other test still passes. It is the
exclusion's own trade — buy a green check by shrinking what is checked — moved one level down,
except now it weakens a shared library seven cabinets compile against. Write the guard, and log it
as a deviation: it is an AC reading enforced beyond the literal text, so the Reviewer should get to
rule on it rather than discover it.

**Generalisation:** for any story whose AC is "a checker exits 0", the checker's exit code is the
weakest assertion in the building. Ask what the checker is *looking at*, and pin THAT.

---

### PROVE the honest fix is reachable before you ban the dishonest ones — an uncast WebAudio double is ~135 lines, and two of its traps cost real time

**Situation:** same story. Before writing a suite that bans `as`, `any` and `@ts-nocheck`, I had to
know the alternative existed. `AudioContext` needs **38** members, `AudioBufferSourceNode` 20,
`OscillatorNode` 18, `GainNode` 12, `AudioParam` 12, `AudioBuffer` 7 — ~107 in total. A RED that is
unsatisfiable is worse than no RED (the "PROBE YOUR OWN CONTRACT" entry above), and "just cast it"
is what a cornered Dev does at hour three.

**Result: it IS reachable — 135 lines, zero casts, tsc clean AND constructs/runs.** Four things
made it tractable, and the middle two are not guessable:

1. `extends EventTarget` supplies `addEventListener`/`removeEventListener`/`dispatchEvent`
   honestly, on the context and on every node — 3 members × 6 classes for one word.
2. **`Float32Array` is generic since TS 5.7.** `new Float32Array(n)` infers
   `Float32Array<ArrayBufferLike>`, which does NOT satisfy `AudioBuffer.getChannelData(): 
   Float32Array<ArrayBuffer>` — it fails via `SharedArrayBuffer`. Declare
   `Float32Array<ArrayBuffer>` and build it as `new Float32Array(new ArrayBuffer(len * 4))`. This
   was the last error standing and reads like a compiler bug if you have not seen it.
3. Unused members must be **lazy**: `get listener(): AudioListener { return nope() }`, never
   `readonly listener: AudioListener = nope()`. A field initialiser runs in the constructor, so the
   thrower fires the moment any test builds a context — tsc is perfectly happy and every test dies
   at runtime. Members the tests DO touch (`destination`) need a real working double.
4. `connect`/`disconnect` need their overload signatures declared before the implementation;
   `'connect' in target` narrows `AudioNode | AudioParam` without a cast, which matters when the
   suite you are writing bans casts.

**Two process notes:** run the probe through `node --experimental-strip-types` as well as `tsc` —
tsc cannot see trap 3, and strip-only mode additionally rejects `constructor(readonly x: T)`
parameter properties (vitest/esbuild accepts them, so this is portability rather than a blocker).
And keep the probe file: its findings are most of the handoff, and the ~15 minutes it costs is
recovered the first time Dev does not have to rediscover trap 2.

---

### A new orchestrator test that spawns a binary trips the CI-provisioning pin — use `process.execPath` + a lockfile path, not `npx`

**Situation:** mg1-9's RED needs to run `tsc` from a `tests/*.mjs` file. I wrote the obvious
`spawnSync('npx', ['tsc', '--noEmit', '--listFiles'])`. The full orchestrator run came back with
**three** failures when I had authored two.

**Problem:** `every binary the orchestrator suite spawns is provisioned by CI, not by the developer
machine` (monorepo-topology.test.mjs) scans `tests/**/*.mjs` for spawn targets and pins the set to
`{bash, git, just, node}`. `npx` was a newcomer, so it reddened — correctly. That guard exists
because sixteen tests needing a brew-installed `just` once went red on `ubuntu-latest` and blocked
**eight** release deploys.

**Prevention:** the scanner skips `process.execPath` and any target containing `/`, so
`spawnSync(process.execPath, [join(repo, 'node_modules', 'typescript', 'lib', 'tsc.js'), …])` asks
nothing new of CI — and is the better invocation regardless, because `npm ci` guarantees that exact
file on disk while `npx` goes looking. Widening the pinned set is the wrong first move: it is a
deliberate list, and the newcomer must be provisioned before it is pinned. Worth knowing before you
write the spawn, not after — and it is a reason to run the FULL orchestrator suite, not just your
own file, before believing a RED is clean.

---

### A BOUNDED assertion is not a leak detector — mutate the accumulate bug and watch two of your three guards sail through

**Situation:** jt5-1 (joust) builds a per-frame cue channel. Three tests guard "the stream is
REBUILT each frame, never appended to": an event is GONE next frame, a long quiet run drains, and
the stream is not the game's existing capped log wearing a new name. All three read as if they
pin the same property.

**Problem:** with a throwaway implementation in place, mutating `cues = [...sim.cues]` to
`cues = [...game.events, ...sim.cues]` reddened **one of the three**. The other two were bounded,
not exact — `toBeLessThan(EVENT_KINDS.length)` over a quiet window, and
`toBeLessThan(sim.events.length)` — and an appended stream that has gathered four events in a
quiet window sits comfortably under any bound generous enough to look safe. A bound reads like a
leak detector and is not one: it only fires once the leak is already large, and the window a test
picks is usually too short for that.

**Prevention:** for any "rebuilt / drained / cleared each cycle" property, find a cycle where the
correct answer is **exactly zero** and assert `toEqual([])` there. Measure that cycle, don't
assume it — a throwaway run printing `frame N: cues=X simlog=Y` for a band of frames hands you a
frame where the stream must be empty *and* the thing it might be confused with is non-empty
(here: frame 200 emits nothing while the capped log still holds three entries, so one frame
discriminates both ways at once). Same mutation after the rewrite: 4 red, not 1.

**Corollary — the mutation battery is what ranks your guards.** Reading the three tests, they look
equally strong; only the mutation separates them. Budget the probe run: it is the difference
between shipping one working guard and believing you shipped three.

---

### A mutation that DIDN'T APPLY is indistinguishable from a guard that doesn't bite — make the mutation assert its own landing

**Situation:** same mutation battery. `mutate.sh "drift ONE cited verbatim by a byte" python3 -c
"...replace('SNEDIE\tFCB\t040,!N$16!.$7F,20\tENEMY DIES', ...)"` came back **1928 passed** — a
clean green, which reads as "the citation guard is vacuous, the whole AC5 file is scenery."

**Problem:** the `$16` and `$7F` in the ROM verbatim were eaten by the shell before python ever saw
them (with a `SyntaxWarning: invalid escape sequence` scrolling past in the noise), so `.replace()`
matched nothing and wrote the file back unchanged. The run was green because **nothing was
mutated**. Rewritten as a heredoc'd script with `assert needle in s` and `assert s2 != s`, the same
mutation reddens 1 test. Two minutes from concluding a real guard was worthless.

**Prevention:** every mutation must prove it landed before the run is believed —
`assert <needle> in s` / `assert mutated != original`, and `print()` a one-line confirmation the
harness echoes above the result. Treat a mutation reporting **zero** new failures as a claim about
your MUTATION first and the guard second, exactly as a grep returning 0 is a claim about your
pattern first (the cp5-1 `grep -Eci` lesson, arrived at from the other direction). This bites
hardest on ROM work, where the strings you mutate are full of `$`, `!`, `\t` and backslashes — the
characters a shell most wants to eat. Write mutations to a FILE and run the file; never `python3 -c`
through a quoted shell argument.

---

### The moments a story lists as "the sim already produces every one" can have ZERO production callers — grep the emitter before you pin the cue

**Situation:** jt5-1's description names the moments its event channel should carry — "the flap, a
lance joust won or lost, a rider unhorsed, an egg laid, collected or hatching, the buzzard, the
pterodactyl arriving, **the lava troll's grab**, the wave clearing, a life lost" — prefaced with
"The sim already produces every moment worth a cue."

**Problem:** three of them do not exist to be observed, and each fails differently.
- **The lava troll's grab.** `troll.beginGrip` is exported, unit-tested and has **zero production
  callers**. The codebase already said so, in a registry nobody greps: `difficulty.ts` carries a
  `no-consumer-yet` entry reading *"a LIVE troll grab — troll.beginGrip exists but has zero
  production callers (uf1-11)"*, owner `uf1-10`.
- **The thuds.** The collision pass COMPUTES the bounce and then `continue`s past it, and
  `bounceTop`/`bounceBottom`/`bounceHorizontal` likewise have zero production callers. A cue here
  would announce a collision the sim does not resolve — audible, and a lie.
- **The flap.** Real, reachable, and a **two-edge** cue in the ROM: the press plays wing-DOWN
  (GOFLAP→FLAST2) and the RELEASE plays wing-UP (GOFLIP). Our core sees only the press edge, so
  wiring it ships half a paired cue.

**Prevention:** for every moment a story asks you to emit, grep the CALLERS of the function that
would emit it, not just its definition — `grep -rn "beginGrip" src/ | grep -v "^src/core/troll.ts"`
settles it in one command. An exported, tested, well-documented function is not a live mechanic.
Then check whether the repo keeps a gap registry (joust's `difficulty.ts` `no-consumer-yet` rows,
each with a ROM line and an owner story): a story's premise is often already refuted there, with
the owner named, and quoting it turns a scoping argument into a citation. Drop the unreachable
moments from the union — a declared-but-unemittable kind passes the manifest and dispatch sweeps
(they read the same tuple) and ships a cue that can never fire — and add a test that FORBIDS the
deferred names, so a later well-meaning addition has to come with its emitter.

**Bonus, and it decided this story's whole shape:** the machine may not have the sound at all.
joust's ROM carries a complete 38-entry sound table with Williams's own comment on each row
("ENEMY DIES", "EGG HATCHING SOUND"), and there is **no wave-clear sound, no egg-laid sound and no
joust-won sound** in it. Half the story's guessed moment list had no cue and a third of the ROM's
cues had no moment in the list. Read the machine's table BEFORE accepting the story's list of
moments — the intersection is the story, and the two leftovers are Delivery Findings.

**And check what the quarry does NOT contain.** `JOUSTSND.DOC` is three lines long and its entire
content is `SEE [LIBRARY.SOUND]VSNDRM4.SRC` — the sound board's own firmware is not vendored. So an
AC offering "cite the ROM **or the sound board**" has only one of its two options available, every
citation must come from the game side, and no claim about what a sound CODE actually sounds like is
supportable. Pin the absence in a test, so a later story cannot quietly cite a listing that is not
there.

---

### Replay determinism CANNOT see a missing per-frame CLEAR — the stale event is carried identically in BOTH runs

**Situation:** cp5-1 builds centipede's core event channel. AC2: "a fixed seed and input stream
replay an identical event stream — the event channel is deterministic and a test pins that." The
obvious test is two runs of the same seed, compared frame by frame.

**Problem:** that test is blind to the single most likely defect in the whole story. If the sim
APPENDS to `state.events` instead of REBUILDING it each frame, run A and run B both carry the same
stale events forward, so the two streams still match exactly and the determinism test stays green
while every cue re-fires forever and the array grows without bound. Determinism compares two runs to
each other; it never asks what a single run should contain. The asteroids precedent seeds `events: []`
at each phase entry with the comment "never carry a stale frame's forward"
(`plugins/asteroids/src/core/sim.ts:179,194,212`) — that comment is guarding a property no
determinism test can reach.

**Prevention:** for any "the stream/log/event channel is deterministic" AC, write TWO tests, and know
which defect each one catches:
1. *replay identity* — same seed + same scripted input → identical per-frame streams. Catches
   ambient randomness and wall-clock leakage.
2. *the rebuild* — step PAST a triggering frame with input that does not re-trigger, and assert the
   event is GONE. Catches append-instead-of-rebuild. Add the unbounded-growth mirror (a long idle
   run must drain, not accumulate) because the same bug shows up as a leak.

**And pair BOTH with a non-vacuity assertion in the same test.** Two EMPTY streams compare equal, so
a channel that emits nothing passes replay-identity perfectly. Assert the run emitted something, and
that it emitted more than one distinct kind, BEFORE comparing. Add a different-seed control too: if
the streams were hard-coded, "identical" would hold for every seed and prove nothing.

---

### A doc assertion can pass on the UNCHANGED file three different ways — and markdown line-wrap is the one you will not see coming

**Situation:** cp5-1's AC5/AC6 are documentation ACs: rewrite a deferral banner in `core/bonus.ts`,
and stop the README advertising a gap the story closes. I wrote nine assertions across the two files.
Six passed immediately — and three of those six were **defective**, not deliberate green guards. All
three would have let Dev ship the story with the stale docs untouched.

**The three mechanisms, all distinct:**
1. **The token was already there.** "the banner must point at the seam" matched
   `/…|bonus-life/`, and `bonus.ts:31` already read "is the bonus-life sound" — the assertion matched
   the very deferral it was meant to replace.
2. **Markdown WRAPPED the sentence across a blockquote line.** The README status block reads, to a
   human, "there is no `src/shell/audio.ts`, no event channel and no dispatch." On disk it is
   `…and no\n> dispatch.` — a newline AND a `> ` in the middle. A regex written against the sentence
   as read never matches the file as stored, so `.not.toMatch(...)` passes trivially and the stale
   claim survives. **This is the dangerous one: the assertion looks right, reads right in review, and
   is inert.**
3. **The positive half was built from tokens the STALE text already contains.** "the README must
   mention the audio seam" matched `@shared/audio` — which appears in the current README only inside
   the sentence *"It does not consume `@shared/audio`"*. The assertion was satisfied by the text it
   was supposed to replace.

**Prevention:**
- Normalize before matching any multi-word claim in markdown:
  `md.replace(/^\s*>\s?/gm, ' ').replace(/\s+/g, ' ')`. Never regex a wrapped sentence raw.
- Build every POSITIVE doc assertion out of tokens you have **verified are absent today**
  (`grep -c` each candidate first — mine returned 0 for `audio-dispatch`, `core/events`, `SOUNDS`,
  `manifest`, `no samples`). If a token appears in the current file, it cannot discriminate.
- Write doc ACs as PAIRS — the stale claim must be GONE and the honest one PRESENT. Neither half
  alone is enough: deleting the sentences satisfies the negative, appending a section satisfies the
  positive while the contradiction sits three lines above.
- **Audit every test that passes on arrival.** Sort them into "deliberate green regression guard" and
  "defect", and mutation-test the first group (plant the violation, require red, restore from a `cp`
  backup — never `git checkout`, which eats uncommitted work). Five green guards here; all four
  testable ones went red under mutation, and the control run returned to the exact pre-mutation
  count (51 failed / 898 passed).

**Corollary:** the RED count is not the metric — 48 failing looked like a complete RED, and three of
the twelve doc assertions were inert inside it. Read the PASS list, not the fail list.
### A past-the-end RED should kill the WRONG fixes by name, not just the current defect — enumerate the tempting resolvers and place one test on each fork (sw8-10, 2026-08-01)

**Situation:** sw8-10 replaces spawnTie's invented past-plan `'1A1'` fallback with the ROM's
ADASHP rule (loop the selected set's LAST group, TWV2Z). "Test the wave after the last row"
(tp1-25 entry above) got me to index 27 — but a Dev staring at that one red has THREE cheap
green-makers: the right fix, `plan[i % plan.length]` (loop the whole plan), and
`plan[min(i, len-1)]` (freeze on the last row).

**What worked:** enumerate the candidate wrong fixes BEFORE writing tests, then check each test
against each candidate. The boundary PAIR (index 26 → '2D3', index 27 → '2A1') kills
clamp-to-last-row (26 and 27 must differ) AND modulo-whole-plan (SET A1's 27 % 27 = plan[0] =
'1A1' — the modulo fix reproduces the exact defect at the exact boundary, a lovely coincidence
worth stating in the test comment). A shape-negative on a Darth-bearing set (SETA6: tail never
spawns 'darth') kills modulo-whole-plan on a second axis — and that test is GREEN ON ARRIVAL
(today's fallback also says TIE), which is fine: its job is to stay green through GREEN, and the
comment says so. Also confirmed empirically before committing: the discriminability guard
(`choreoPc('2A1') ≠ choreoPc('1A1')`) — TCH1[0]=1 vs TCH2[0]=12 — so every "not the mook"
assertion is real, per the tp2-1 rule.

**Also re-confirmed (see "reachability BASELINE goes STALE" above):** the story's "latent today
under the 6-kill quota" was written before sw8-11/12 time-boxed the space phase (PH.TIM, 21 s)
and sw8-7 made kills refill next-step — the fallback is REACHABLE in a played game now. A
description's reachability clause is a claim with a timestamp; re-derive it at RED and file the
correction as a Delivery Finding, because the backlog priority was set on the stale claim.

---

### "It can't be tested behaviourally in this env" is a CLAIM in a comment — re-measure it, because the DOM surface is usually five members

**Situation:** cp5-2 AC2 outlawed the idiom centipede has always used on `main.ts`: *"A test proves the
wiring is LIVE, not merely present... A grep for the import is not the test."* Every existing pin
(`main-loop.test.ts`, `highscore-entry.test.ts`) reads `../src/main.ts?raw` and matches source text, and
`main-loop.test.ts:4-8` says why: *"The boot loop touches requestAnimationFrame, canvas, and pointer-lock
— none of which exist in the node vitest env."* Five stories had accepted that sentence.

**Problem:** it is false, and one grep says so:
```bash
grep -rhoE "\b(ctx|logicalCtx)\.[a-zA-Z]+" src/shell/*.ts src/main.ts | sort -u
# -> clearRect, drawImage, fillRect, fillStyle, imageSmoothingEnabled
```
Five canvas members, plus `document.querySelector`/`createElement`, `window.addEventListener`,
`window.location` and a bare `requestAnimationFrame`. A ~140-line stub boots the whole game — real core,
real atlas, real renderer, real input adapters — under `environment: 'node'`, no jsdom. red-baron had
been doing exactly this for six stories (`tests/hud-wiring.test.ts:76`), in the same repo.

**Prevention:** treat "this cannot be tested" in a test header as a measurement with a timestamp, exactly
like a stale story description. Census the DOM surface before believing it. Two things make the census
cheap and the harness honest: (1) stub ONLY the members the census found — a Proxy that answers every
question cannot tell you the shell grew a dependency; (2) mock nothing else, so an observed frame is an
ordinary frame rather than a staged one. Grep the fleet first (`grep -rln "await import('../src/main')"`)
— somebody has usually already paid for this.

**Corollary — a `?raw` scan and a boot answer different questions.** The scan cannot distinguish a call
from a mention: the token inside a string, a comment, or a disabled block satisfies it. When an AC says
"prove it is LIVE", that is the distinction it is drawing, and only booting closes it.

---

### The vacuity trap has a whole-FILE form: a hazard-injection suite can go green because the hazard is never reached

**Situation:** cp5-2's `audio-hot-path.test.ts` boots the real rAF loop, injects an unmapped event kind
into a live frame, and asserts the loop survives — the end-to-end form of "a throw inside
requestAnimationFrame freezes the game". Four assertions, each with a message naming a real failure.

**Problem:** it went **GREEN on its first run**, alone among the three new suites, and for a reason no
individual assertion could show: on the unwired tree `main.ts` never calls the dispatch, so the poisoned
frame sails through a loop that never looks at it. Nothing threw, the loop stayed scheduled, the sim kept
stepping — every assertion true, and every one of them a statement about a code path that did not run. I
had even written a non-vacuity guard (`injected`) and it passed: the injection DID happen. It proved the
poison was created, not that anything consumed it.

**Prevention:** for an injection/fault suite, the guard must observe the CONSUMER, not the injection.
A second tap on the seam under test (`playEventSounds` here) flipping a `poisonDispatched` flag is the
whole fix, and it is the assertion that reds until the wiring lands. Generalised: **the non-vacuity guard
has to sit on the far side of the thing you are testing.** "I created the hazard" and "the code met the
hazard" are different claims, and only the second makes the suite mean anything.

**Tell:** a new RED file that passes on first run. Do not explain it — instrument it. The other two files
in the same story reddened immediately; the odd one out was the one testing an integration that did not
exist yet, which is precisely when this shape bites.

---

### Prove the RED is SATISFIABLE with a throwaway implementation, then rank every guard by mutating it — six mutants cost ~10 minutes

**Situation:** cp5-2's RED spanned four ACs and four files, including an array-of-arrays comparison whose
failure mode ("a per-rAF-frame call drops every step but the last of a burst") is invisible at 60 Hz.

**What the battery bought, beyond confidence:**

| mutant | red | what it established |
|---|---|---|
| correct wiring | **0 — all 1012 green** | the RED is satisfiable at all; no assertion is impossible |
| dispatch hoisted to per-rAF | 1 | the burst construction actually discriminates — the headline claim |
| dispatch per EVENT | 1 | AC1's "not per event" is genuinely tested, not just worded |
| the throw restored | 7 | the freeze is REAL and observable end-to-end, not a theory |
| `resume()` at module scope | 2 | AC4's negatives bite once wiring exists (they pass vacuously today) |
| dispatch into a second engine | 5 | the identity check closes a hole every count assertion misses |

The first row is the one people skip and the one that matters most: an unsatisfiable RED is worse than no
RED, and you cannot know it is satisfiable by reading it. The fifth row is the one that justified
committing two assertions that pass today — it is the evidence that they are not scenery.

**Discipline that made it safe:** `cp` the source files to the scratchpad BEFORE the first mutation, restore
with `cp`, and verify with `md5` + `git status --short` showing **no `src/` file modified**. Never
`git checkout` — the repo memory note for that is `git-checkout-clobbers-uncommitted-mutation` and the
command reads as "undo my mutation" in the moment. Commit the RED first if you can; then both are true.

**Also worth noting:** a mutant that reds ONE test is a good result, not a weak one. Mutant A reddened
exactly the per-stepped-frame assertion and left AC2/AC4 green — correct, since a per-rAF dispatch still
plays cues and still respects the gate. A mutant that reds everything usually means the guards are
coupled, not that they are strong.

---

### When a PREDECESSOR story pinned the behaviour you are about to change, it probably said so — grep its tests for your own story id before designing anything

**Situation:** cp5-2's AC3 flips an unmapped event kind from throwing to degrading. cp5-1 had built the
dispatch.

**What was sitting there:** `tests/audio-dispatch.test.ts:1127-1137`, a describe block whose comment reads
*"cp5-2 (wire the seam into main.ts) records this throw as a latent hazard... cp5-2 has to decide
throw-vs-degrade, and it cannot make that decision against untested behaviour. This pins what the
behaviour is TODAY so that the change reds when cp5-2 makes it deliberately."* Two `toThrow` assertions,
written specifically to red on my story, with instructions.

**Why it matters:** those two tests are green today and would have gone red the moment Dev implemented the
ruling — and Dev cannot fix them, because Dev makes tests pass and does not move another story's
goalposts. Inverting them is TEA's job (the sw3-15 "re-seat sibling tests in RED" rule), and doing it in
place — turning each assertion over, keeping the control, recording the ruling and its evidence in the
block's own header — is better than adding a parallel degrade block, which would leave the suite asserting
both policies at once.

**Prevention:** `grep -rn "<your-story-id>" plugins/<game>/tests/ src/ docs/` before writing a line. The
predecessor's TEA often leaves the successor a note, a pinned baseline, or an explicit hand-off, and it
lands in the one place nobody greps: a comment inside a passing test. Related and identical in shape: the
SM-side rule about a guard test whose correct fate is DELETION (mg1-9), where the orchestrator suite going
red mid-story is the expected signal rather than damage.

**Corollary — check what the predecessor's guard actually REQUIRES before you scope the change.** cp5-1's
`readDispatch` demands *exactly one* `switch` reachable from `playEventSounds` and *exactly one* `never`
binding in its default arm, and forbids that arm from touching the engine. So "remove the throw" is safe
but "restructure the dispatch" is not, and the compile-time guarantee was never in the throw at all —
`EVENT_SOUND: Record<GameEventKind, SoundName>` carries it, as cp5-1 established by mutation. Read the
predecessor's `verdict()` (or equivalent) and put its constraints in the Dev handoff; they are invisible
from the diff Dev will be looking at.

---

### A one-step SHIFT is invisible to any clock that ticks INSIDE the loop body — you need one that ticks at the BOUNDARY

**Situation:** cp5-2's headline AC1 guard compared "the events each step emitted" against "the events
each dispatch was handed", array for array, filtering each side to its non-empty entries first. The
Reviewer killed it with one mutation: hoist `playEventSounds` ABOVE `sim = stepSim(...)`, so every
frame dispatches the PREVIOUS step's cues — one step stale, forever, in a game that would still sound
almost right — and **1012/1012 stayed green.**

**Why the obvious fixes all fail.** Filtering both sides for emptiness deletes exactly the entries
that would expose the offset, and what remains is two identical subsequences. So:

- *"Compare index for index instead of filtering"* — breaks a VALID refactor. The Reviewer had already
  confirmed `if (sim.events.length > 0) playEventSounds(...)` is equivalent and must stay green.
- *"Tag each side with a step counter"* — the counter increments in the MIDDLE of the callback, so a
  dispatch sited before the step reads the neighbouring value and pairs up just as convincingly.
  Pair `(n, E_n)` on one side, pair `(n, E_n)` on the other. Green.
- *"Tag the events themselves in the sim mock"* — same failure, one level down: the tag travels WITH
  the events, so both sides agree by construction. Vacuous.
- *"Build one ordered trace and require each dispatch to follow its own step"* — also green, because
  the shifted order is `S(E1) D(E1) S(E2) D(E2)…`. Each dispatch really is immediately preceded by the
  step that produced its events. The shift only shows at the ENDS.

**The fix, and the general rule:** a shift by one is undetectable by any observation taken at the same
point in the cycle, because a shifted sequence is a self-consistent sequence. What separates them is a
clock that ticks at a DIFFERENT point in the cycle than the thing under test — here, at the callback
boundary. `shell/timebase.ts`'s `pumpFrame` calls its `step` callback once per sim step, so wrapping
it and incrementing on ENTRY stamps every observation inside that callback with the same index
whatever order the callback does its work in. A dispatch that runs before its step is then stamped
with the pump index of the step AFTER the one whose events it carries, and **every** pair mismatches.

    pumpFrame: (...args: Parameters<typeof real.pumpFrame>): number => {
      const [acc, elapsed, sampleStep, step] = args
      return real.pumpFrame(acc, elapsed, sampleStep, (input) => { rec.pumps += 1; step(input) })
    }

Re-verified by mutation both ways: the hoist reds exactly one test, and the skip-empty refactor stays
green. Generalised: **to catch an off-by-one in ORDER, find a heartbeat that fires between iterations,
not within one.** red-baron's `tickCountUp` note ("runs exactly ONCE per calc-frame … the cleanest
per-calc-frame heartbeat") is the same instinct, arrived at from the other side.

---

### An "unseeded emergent assertion" is a hidden second story — pin the seed, and expect the PROSE around it to be wrong too

**Situation:** cp5-2's three boot suites asserted the `fire` cue plays, a spider loop opens AND closes,
and some step emits two events — all against `main.ts`'s `createAttract(Date.now())`. Green eight runs
running. The Reviewer called it: observed is not proven, and every other centipede suite pins a
literal seed.

**What pinning it actually cost, and bought:**

1. The seed has to reach the shell, which means a `?seed=` param main.ts does not have — so a
   test-quality finding turns into a PRODUCTION change and a fresh RED. Model it on whatever debug
   param the shell already parses (`?wave=`), so it lands inside an existing, already-ruled seam
   rather than inventing one.
2. The guard that the seed was HONOURED is not optional. Without it, `?seed=` being ignored leaves
   every emergent assertion exactly as unproven as before, and green. Compare something the seed
   determines — here the mushroom field against `createAttract(SEED)`'s.
3. **Every measured number in the surrounding prose is now wrong**, because it was measured on a
   different world. cp5-2's note explained its two-event steps with a death frame AND a wave clear;
   under the seed the compositions are `march-start+spider-stop`, `player-died+march-stop`,
   `shot-fired+spider-stop` — no wave clear at all, and two of the three not death frames either. The
   Reviewer had independently measured a THIRD set from its own unseeded run. Three runs, three
   answers, which is the whole argument in one line.

**Prevention:** when a suite asserts emergent gameplay, pin the seed FIRST and measure afterwards, and
pin the measurement as DATA (a sorted array the test compares against) rather than describing it in a
comment. A pinned array reds with the new value in the diff; a comment just goes quietly stale.

---

### `stepSim` can hand back the SAME buffer it was given — a held state reports the CURRENT world

**Situation:** the seed guard above compared the booted state's mushroom field to `createAttract(SEED)`'s
and failed in ONE of three suites — the one that ran 65 attract frames before the assertion. The other
two passed. Same seed, same harness, same helper.

**The cause:** `stepSim` ALIASES `playfield.cells`. The state it returns carries the very same
`Uint8Array` object, mutated in place. Measured on the real core with no mocks:

    createAttract(20260801)                 -> cells sum 2457
    …60 idle attract steps later, the ORIGINAL state -> cells sum 2389
    before.playfield.cells === after.playfield.cells -> true   (in attract AND in play)

So `booted` was never a snapshot; it was a live view. The two suites that passed did so by luck —
they left attract on the first step, and the reseed replaced the playfield object wholesale.

**Prevention:** in a core that returns new state objects, do not assume the ARRAYS inside them are new
too. Copy anything you intend to compare later (`new Uint8Array(state.playfield.cells)`), and say why
in the helper. And note what this does to a purity guard's guarantee: centipede's bans globals, time
and `Math.random` in `src/core/`, and has nothing to say about mutating a caller-visible buffer. "Pure
deterministic core" in a README is not a promise about aliasing.

**Tell:** an assertion that fails in one suite and passes in two, where the failing one is the one that
ran the most frames before asserting. That is a temporal difference, not a configuration one.

---

### A citation gate should RE-LOCATE the anchor, not just say "wrong" — and its scope must stop at the story's own files

**Situation:** four of eleven Reviewer findings on cp5-2 were stale line citations, all self-inflicted:
the diff grew `main.ts` from 185 lines to 218 and every `main.ts:NNN` the RED phase had written moved.
The worst landed on a real, plausible, WRONG line, which misleads a reader who checks it instead of
stopping them. Correcting them by hand buys one clean round and no protection.

**What made the gate worth writing rather than tedious:** each entry pairs the citation AS WRITTEN with
a pattern the cited line must match, and on failure it searches the file for that pattern and reports
where the anchor moved to:

    It is now at main.ts:109 — re-anchor the citation (and this table) to that.

Re-anchoring becomes a mechanical edit instead of a hunt, which is the only way a table like this
survives contact with the next story. Add a sweep requiring every `FILE:N` in the scanned files to be
registered, plus a `RETIRED` list for citations the prose quotes in order to DISOWN ("this used to say
:183, and :183 was wrong") — without that list the sweep demands an anchor for a number the file is
explicitly repudiating.

**Two things worth doing deliberately:**

- **Scope it to the story's own files.** Widening the scan to the whole suite immediately reddened
  three OLDER centipede suites carrying the same defect. Fixing those is a story; dragging them into
  this one is scope creep of exactly the kind the story had already declined once. File them as a
  Delivery Finding with the measured list and the one-line change that would catch them.
- **The gate ranks itself, for free.** The throwaway implementation written to prove the RED was
  satisfiable added three lines to `main.ts` and reddened all five anchors with their new numbers.
  A gate that reds on the very next legitimate edit is not scenery — but hand the next agent that
  fact in the handoff, or it reads as an obstacle rather than a service.

---

## When the ROM's answer is "nothing happens", the RED is the RECORD — and an absence-guard's FIXTURE is the thing most likely to be wrong (jt5-10, 2026-08-01)

**Situation:** jt5-10 asked whether Joust's pterodactyl reaches the wing-cue loops. It does not —
`PTEFLY` (`:1491-1510`) closes on an unconditional `BRA`, and the only doors into the flap machine
are two ground-state transitions a bird clamped above the floor never makes. So the port was
*already* correct, and the deliverable was a written, cited record rather than a behaviour.

**The shape that works when the answer is a negative.** Split the suite explicitly and say which
half is which in the file's own header:

- **ORACLE groups** re-derive the chain from the vendored source. They pass on arrival — the ROM
  already says what it says — and they are the evidence base, not the deliverable.
- **RED groups** demand the port RECORD the finding: the comment with its `LABEL (:line)`
  citations, and the claims-registry entries whose `verbatim` must byte-match. That record is the
  story, and it is the only thing that can legitimately start red.
- **One green-on-arrival guard**, with its non-vacuity proven by mutation rather than asserted.

State the split in the header. A reader who finds 20 of 30 tests green at RED and no explanation
reasonably concludes the RED phase was botched.

**The expensive mistake, and it was mine: an absence-only fixture that was not absence-only.**
The guard staged one ptero beside the knights and asserted no wing cue appeared. It failed — on
`enemy-wing-down`, with `enemy-materialise` sitting in the same stream. `createWaveDemo` keeps
SPAWNING the wave's buzzards as the frames run, so "the only enemy here is my subject" was true at
frame 0 and false by frame 12, and the cue belonged to a bird that arrived while I was not looking.
I nearly filed it as a port defect.

Two rules fall out, and they generalise past joust:

1. **If the cue carries no id, attribution comes from the fixture — so prove the fixture.** Park
   everything that is not the subject, and **re-apply the parking every frame**: a process that did
   not exist at frame 0 cannot be hushed at frame 0. A one-shot hush at setup silently decays.
2. **Never assert an absence without a positive control in the SAME fixture.** Swap the subject for
   something that must fire, and require it to. Without that, the day the harness stops being able
   to produce the cue at all, the guard keeps passing and means nothing.

**The genuinely surprising result: two guards for one rule were COMPLEMENTARY, not redundant.**
I wrote a behavioural guard and a source-text pin for the same law and expected the pin to be
belt-and-braces. Measured against one mutation each, with the source restored after:

| mutation to the ptero branch | behavioural guard | source pin |
|---|---|---|
| `cue: 'enemy-wing-down' as never` | **RED** | green |
| `cue: wingCue(null, 'enemy')` (returns `undefined`) | green | **RED** |

Neither catches both. The behavioural guard cannot see an edit that compiles into the right shape
but happens to emit nothing today; the source pin cannot see a cue introduced by any other spelling.
**Verify each guard against its own mutation before calling either one redundant** — and write the
table into the test file, or the next reviewer deletes one as duplication. `assert s.count(old)==1`
before applying each mutation, and `git status --porcelain <file>` after restoring: a mutation that
failed to apply looks exactly like one that was caught.

**One more, cheap:** when a story hands you "signals" flagged as claims-to-verify, verify them
early — both of jt5-10's were refuted in the first ten minutes. The decision-block field the SM
could not identify was `DPLYR`, "RIDERS IMAGE" (`:109`), and a pterodactyl has no rider; the
"zeroed RUN entries" reading collapsed because the skid, fall and transporter cues are equally
unreachable and are NOT zeroed. Both were offered as supporting evidence for the answer, and
neither survived. Killing them early stops them being quoted forward into the record.

## Joust has TWO (x,y)→mask table pairs, and story prose WILL conflate them — place fixtures where the pairs disagree (jt8-3, 2026-08-01)

**Situation:** jt8-3's description and AC-1 said "our arena.groundMaskAt is that BCKXTB/BCKYTB
analog — both cases pinned against arena.groundMaskAt." It is not: `groundMaskAt` is the LANDING
pair (`CKGND LDA LNDXTB,X / ANDA LNDYTB,Y`, :6705-6706, thin 4-scanline landing strips), while
`B2DIR`/`SHDIR` sample the BACKGROUND-collision pair (`BCKXTB±B2XLEN / BCKYTB`, :4119-4120, tall
box broad-phase) — transcribed separately as `BCK_X_TABLE` (flight.ts) and `BCK_Y_TABLE`
(arena.ts). A look-ahead built on the landing pair would almost never fire (the thin bands) and
every test staged "at a cliff" would quietly measure the wrong map.

**Prevention:** when a mechanic samples "the arena mask," ask WHICH of the two maps the cited
lines index before trusting any port-side symbol the story names. Then make the choice mechanical:
probe the transcribed tables for coordinates where one pair is solid and the other reads zero, and
assert BOTH facts as fixture premises inside the test (`bck(x+31,y) ≠ 0` AND `groundMaskAt(x+31,y)
=== 0`). The M1 mutant (swap the sampler) reddened 12 tests because every fixture sat in the
disagreement zone; on agreeing coordinates it would have survived. Deviate the AC's letter in the
session file — do not silently "interpret" it.

## An index that only moves on FLAP EDGES makes "it slows down" a two-phase observable — measure the arc before pinning a window

jt8-3's brake ("the turn thrusts against the old motion") looked immediate: the turn wake flaps,
FLYX 8→6. But the index ONLY changes on flap edges (`ADDFLP` :6437-6439), and the turn's own lift
put the fixture into a ~44-wake flapless CLIMB (gravity 8/wake against velY −348) before the
level law's flap-hover could spend the rest. A 40-wake window asserted `≤ 0` and measured 6; the
truth was first-zero at wake 65. Two rules: (1) any "decays over time" assertion on a flap-edge
quantity must budget the flapless half of the arc — trace the trajectory first, then set the
window from the measured crossing with margin, and write the measured number into the comment;
(2) the sharp per-wake pin (facing flipped AND index stepped −2 ON the turn wake, staged RISING
so the brain's own law contributes no flap) is the discriminating assert — the long window only
proves the drift reverses eventually.

## In-play attribution without an event id: a mechanism that DOESN'T touch a field is identified by that field's stillness

jt8-3's in-play guard had to count look-ahead turns in a demo where jt8-2's homing ALSO flips
facing. No turn carries a cause tag — but every homing flip rewrites `homing` (`CLR PRDIR,U` ⇒
`{prdir: 0}` from a pre-flip value in [1,$80]), and steering touches facing alone. So "facing
changed AND `homing` structurally unchanged AND same-physical-bird (airborne both frames, |Δx| ≤
8 — an id reused by a respawn teleports)" is a sound steering signature. The soundness CONTROL is
the unstaged bounders-only run asserted to count ZERO — green before and after, it fails the day
the filter starts counting some third mechanism. Wave-1 demos spawn bounders only, so the guard
STAGES hunter typing per-frame (jt5-10's re-apply rule: late materialisations must be staged
too) — retype brains at the process map, never prime counters or positions.

## Two runners, one contract: an identity assertion and a plain-node CLI can be JOINTLY unsatisfiable — probe with a temp refactor before handoff (jt5-2, 2026-08-01)

**Situation:** the bake-tool RED wanted two guards at once: `expect(bake.SOUNDS).toBe(shell.SOUNDS)`
(AC "derived, never hardcoded" made structural — a transcribed copy deep-equals today and silently
misses jt5-6's SNPCR2 tomorrow) and `spawnSync(process.execPath, [tool, dir])` exits 0 (the justfile
invokes bakes under PLAIN node, where the `@shared` alias in audio.ts's import chain does not
resolve — a vitest-only bake dies at deploy time, and the engine's silent degrade hides it).
Individually both are right; together no implementation importing audio.ts can satisfy them.

**What worked:** prove joint satisfiability BEFORE handoff with a fifteen-minute probe — cp-backup
audio.ts, extract SOUNDS+SoundName into a dependency-free `src/shell/audio-manifest.ts`, re-export
from audio.ts (identity survives because vitest sees one module instance), point the throwaway bake
at the manifest with an explicit `.ts` specifier (node 22.18 type stripping), run the FULL project.
92 files green, zero sibling breaks, tsc clean — which also turns "Dev could maybe extract it" into
a measured design note. Restore by cp + md5, never `git checkout` (uncommitted RED was present).
This is the "PROBE YOUR OWN CONTRACT" rule with a sharper trigger: any suite asserting both a
MODULE-GRAPH property (identity, instanceof, shared state) and an ALTERNATE-RUNNER property (plain
node, a worker, a browser) is a joint-satisfiability suspect, because the two properties are
satisfied in different module graphs.

**Also, from the green-guard battery:** mutate the failure class the guard NAMES. "extended, not
replaced" survived deleting the star-wars BAKE line (its `mkdir`/upload lines still carry the
`star-wars/music` token) and correctly reddened on a wholesale joust-only rewrite — the first
mutation was mis-aimed at the guard's claim, not proof of vacuity. The surviving mutant is a real,
recorded coverage limit (token guards pin staging PRESENCE, not bake correctness; the deploy's own
echo + the live-200 curls own that), but it is a limit to write down, not a test to force.

---

## A "seam" you INJECT but the code never READS is not a mock — it is a live production deploy wearing a mock's name (mg1-5, 2026-08-01)

**Situation:** mg1-5's AC3 needs a partial-failure test, so the RED injects an uploader:
`uploadDir(dist, bucket, prefix, { upload: recorder })`. `uploadDir`'s signature already ends in
`options = {}`, so this reads as obviously safe. I ran the suite.

**What actually happened:** `uploadDir` passes `options` to `onlyFor()` and nothing else. An unknown
key is silently dropped — no throw, no warning — and the function proceeded to its real body:
`execFileSync('wrangler', ['r2','object','put', …, '--remote', …])`. wrangler was installed,
`CLOUDFLARE_*` was in the environment, and **every fixture object was PUT to the live
`arcade-lobby` bucket at its real key.** The production lobby's `index.html` and tempest's were
overwritten with a 15-byte `<!doctype html>`; `arcade.slabgorb.com/` served that stub until it was
rebuilt and redeployed. Fifteen junk keys landed at the bucket root. Six other games survived only
because the fixtures did not happen to name them.

**The tell I had and ignored: 3997 ms for a test whose fixture is three files in a tmpdir.** Unit
tests on a temp directory run in single-digit milliseconds. Four seconds is a network round trip.
That number was in the first failure output and I read past it to the assertion message. **Duration
is an assertion about what your test touched** — when a pure-computation test takes seconds, stop
and find out who it called.

**The second tell, and it is the diagnostic one:** the failure was
`fixture has no HTML object at all` — the recorder's array was EMPTY. An empty recorder does not
mean "the code did nothing"; it means **the code did something else**. I initially read it as a
fixture bug. The question "if my stub was never called, what ran instead?" is the whole incident,
and it is one grep from the answer.

**Prevention — the ordering rule.** Never inject a seam and run. Prove the seam is READ first, and
prove it from the source, because the injection site cannot tell you:
```bash
grep -n "options" scripts/<file>.mjs     # does anything destructure or read the key you are passing?
```
If the function's real body spawns a binary, a network client or a deploy tool, that check is not
optional and it is not paranoia — an ignored option degrades to *the real thing*, which is the
worst possible default. The general shape: **an optional injection point that does not exist yet
fails OPEN, straight through to production.** A required parameter would have thrown; an options bag
cannot.

**Prevention — the safety fuse, and it belongs in the RED itself.** The fix committed with these
tests is a helper that refuses to call the subject until the seam is demonstrably present in the
source, with a comment saying Dev deletes it during GREEN and *why deleting a RED fuse is not how
you make it pass*. Cost: fifteen lines. It also sharpens the TDD sequence honestly — eight of the
nine tests now red at "the seam does not exist", which IS the first thing Dev must build, and they
become live assertions the moment it lands.

**Also worth stating plainly: the RED phase is not a safe sandbox.** Every other entry in this file
treats a bad RED as wasted effort. This one cost a production outage, and the code path was a
four-argument call to an exported function in the repo's own `scripts/`. Before a RED calls anything
whose name contains `deploy`, `upload`, `publish`, `release` or `push`, read that function's body to
the bottom — not its signature.

## …and the CI-provisioning scanner reads COMMENTS — quoting the real call registers a spawn you never make

Immediate sequel to the entry above, same story. The safety fuse's comment explained the hazard by
quoting the offending line verbatim: ``execFileSync('wrangler', ['r2','object','put', …])``. The
full orchestrator run then failed `every binary the orchestrator suite spawns is provisioned by CI`
with `+ 'wrangler'` — for a file that spawns nothing at all.

`suiteBinaries()` (`tests/monorepo-topology.test.mjs:1309`) matches
`/\b(spawnSync|spawn|execFileSync|execSync)\(\s*([^,)]+?)\s*[,)]/g` against each test file's **raw
text**. No comment stripping. So a *description* of a spawn is indistinguishable from a spawn, and
the more carefully you document a dangerous call the more likely you are to redden the guard.

**Fix is the comment, not the pin.** The mg1-9 entry already says widening the pinned set is the
wrong first move; here it would also be false — `wrangler` is installed only in the deploy job
(`npm install -g wrangler`), never in the job that runs this suite. Describe the call instead
("an execFile-style call putting each object with `--remote`, see scripts/deploy-r2.mjs") and say in
the comment *why* it is described rather than quoted, so the next author does not helpfully paste it
back in. Verify with the scanner's own regex before re-running:
```bash
node -e "const t=require('fs').readFileSync('tests/<f>.mjs','utf8');
console.log([...t.matchAll(/\b(spawnSync|spawn|execFileSync|execSync)\(\s*([^,)]+?)\s*[,)]/g)].map(m=>m[2]))"
```
Must print `[]`. **General rule: any guard that greps source text will read your prose about the
thing as the thing** — the same family as the sidecar's own "strip comments, then count" entry,
arrived at from the authoring side rather than the scanning side.

## A table READ SHORT is invisible to every gate that checks the row it did take (jt8-7, 2026-08-01)

**Situation:** jt8-7's real defect was not a wrong constant. `EGGI` is seven 3-word rows
(`JOUSTI.SRC:2255-2261`); `pictures.ts:1699` transcribed row 0, anchored `startLine 2255,
endLine 2255`, and stopped. Row 0 was *correct*. Every existing gate — the dangling-source
check, the ROM-label check, the byte gate — passed, because each one interrogates the rows
that ARE there.

**The tell, and it generalises:** a continuation row carries **no label** (`parseStatement`
returns `label: ''`), so any reader that keys on labels sees one row and terminates. Same
family as the SNPCR1 sound-table finding. The two are not coincidences — they are the same
bug in two files.

**What to actually test.** Re-checking the seven rows you now transcribe repeats the original
mistake the day an eighth appears. Pin the **EXTENT from both sides**: assert the line ABOVE
and the line BELOW both fail to parse as table rows. That is what converts "seven" from a
guess into a measurement, and it is three lines of test.

**A claim can already describe the rows the code never took.** The pre-existing claim
`JT8-130` reads "Egg (JOUSTI.SRC:2255) · up/right/left + 3 hatch stages" — the dossier had
recorded seven frames all along. No gate compares a claim's PROSE against the transcription's
extent, so the knowledge sat next to the defect for six stories. Corollary for claim-coverage
tests: a range starting at the labelled first row passes **vacuously** off the old claim.
Scope such a test to the CONTINUATION rows. I wrote that vacuous version first and only caught
it by asking which existing claim was satisfying it — always ask *what is making this green*
about a claim-coverage assertion that passes on arrival.

## When the seam ignores an axis, say so — `narrowPhase` compares SPRITE-LOCAL columns and never sees X

`narrowPhase(a, b, masks)` takes `MaskRef = {name, top}`. Only Y is aligned; the spans it
compares are COFF-unbiased **sprite-local** columns, so two entities 200px apart in X whose
masks overlap in local column space "collide" as far as it is concerned. `broadPhase` is what
carries X. Consequences worth knowing before designing fixtures: every mask-vs-box
discriminator is **vertical**, and a test asserting "narrowPhase is wired" must ALSO keep a
distant-in-X case, or the mutant that deletes `broadPhase` and keeps the mask sails through.

## Trace the fixture through the step ORDER before trusting a staged number

`stepFrame` runs BEFORE `collisionPass` (`demo.ts:1174-1175`), so for a moving egg the staged
`posY`/`velY` are NOT the collision-time values — gravity adds 4 to velY and moves posY first.
Measured escape hatch: `stepEgg` returns a **settled** egg completely untouched
(`demo.ts:699`), freezing both fields across the step. So `settled: true` is the stable
fixture for anything that needs exact numbers, and the player does not drift either.

Two disciplines that came with it. (1) A frozen fixture buys precision by staging a state
ordinary play does not produce (settled + fast-falling), so pin ONE case on a genuinely moving
body as well, and have it **assert its own premises** (`velY` drifted by exactly GRAV; the egg
arrived at dy=11) rather than trusting the arithmetic. (2) Do the calibration as a throwaway
test that PRINTS positions — three minutes, and it replaced four guesses with four numbers.
My first calibration run showed `eggTop=NaN` because the egg had been *caught*; staging it out
of X range was what made the drift readable. A NaN in a probe is a result, not a crash.

## Run the FULL suite against the throwaway — that is where the sibling breakage lives

The satisfiability probe's usual job is proving the RED is not impossible (it did: 31/31). Its
second job is worth as much: running `--project joust --project shared` **with the throwaway in
place** surfaced five sibling failures the RED alone could never show —

- a count-FLOOR guard (`demo-jt3-7-render.test.ts:277`) that goes vacuous when records are
  added, failing with "must FAIL the >= floor (not vacuously pass)". Adding rows to a
  transcription is exactly the event that puts slack in a floor;
- four frame-exact SEEDED pins in `audio-events.test.ts`, because tightening a collision
  changes *when* things happen in ordinary play and shifts the whole timeline.

Both are legitimate consequences, both need Dev action, and neither is discoverable from the
new tests. Handing them over measured — with the exact failure text — is the difference
between a Dev hitting them mid-GREEN and a Dev expecting them. It also pre-empts the Reviewer
reading a re-baselined seeded pin as a loosened guard.

## Rank the guards by mutating the throwaway, and check the mutants are UNCOUPLED

Seven mutants, seven caught. The useful signal was not the 7/7 — it was that **each boundary
mutant reddened exactly one test** (fall edge: 1, rise edge: 1, per-row data: 1) while the two
structural mutants reddened 7 and 11. Precise, uncoupled guards. A battery where every mutant
reds everything is telling you the guards are coupled, not that they are strong.

## Write the quantifier as a WHOLE-FILE census and it will redden on you — that redness is the finding (uf1-9, 2026-08-02)

**Situation:** uf1-9's ACs rested on a correction the SM had measured: "four of the five named rows
carry `TIME UNTIL NEXT DECISION`, SHCLTM does not". I wrote the obvious oracle — assert the four
named rows carry it, assert SHCLTM does not — and then, on the principle that a quantifier is a
claim about every member, added a third test that greps the WHOLE source for the phrase and
compares the result set against the four.

**It failed.** There are **six** bearers. `B2UP3` (:4199) and `SHUP3` (:4415) — the "LEVEL FLIGHT,
READY TO GO UP" states — carry a hardcoded `#20+1` that the 1982 authors never migrated to DYTBL.
Pulling that thread gave the real shape of the mechanic: `PJOYT` is armed at **fourteen** sites in
the enemy brains and only **nine** are DYTBL rows. Wiring "the eleven rows" covers nine of fourteen
arming sites, and a port that models "the decision timer" as one wave-scaled quantity would scale
five sites the machine keeps constant — a divergence that only opens at wave 3, where nothing looks.

**The generalisation.** Both my first two tests were correct and both were spot-checks against a
list I had been handed. The census test is the only one that could discover anything, because it
is the only one whose subject is the SOURCE rather than the list. So: when a story hands you a set
("these five rows", "these three call sites"), write one assertion that re-derives the set from the
file and compares. Cost: four lines. It is the same instinct as pinning a table's extent from both
sides (jt8-7), moved from "how long is this table" to "who else is in this family".

**Corollary that mattered more than the census itself: the rows are NARROWER than their names.**
`BOUPWD`/`HUUPWD` read like "the bounder/hunter wing-down time". They are the **UP-seek** hold only
(`BOUP1`/`B2UP1` are the climb states). The DOWN-seek arms its own hardcoded `LDA #2` (:3823, :4008)
and — the part no one would guess — has **no wing-up reload at all**: `BODN2`'s expiry returns to
`BODN1` with `CLRB` and arms nothing, so the wings-up duration is decided by the `BODNVY` brake
every wake, which the port ALREADY does correctly. Both paths are 2 at wave 1, so wiring the row to
both looks right until wave 3 and is wrong forever after. Before wiring a row named for a mechanic,
find every state that arms the same register and ask which one the row is actually in.

## A "seam" the CONTRACT cannot see is untestable even though the module exports it

`stepEnemyDetailed` and `EnemyState.prevFlapHeld` have existed in `src/core/enemy.ts` since jt5-3.
Neither was ever added to `tests/helpers/enemy-contract.ts`. Since the held wing LEVEL is the entire
observable of a wing-cadence latch, the thing uf1-9 exists to build was invisible to any test
written against the contract — `tsc` refused both accesses and the natural reading of that error is
"the module does not have this yet", which for a RED phase is a *completely plausible* and
completely wrong conclusion.

**Check the contract before concluding the module lacks a member** — `grep -n <name> src/core/<mod>.ts`
against `grep -n <name> tests/helpers/<mod>-contract.ts`. A double-entry contract drifts silently in
exactly one direction: implementation gains members, the contract does not, because nothing fails
when a contract is merely incomplete. Declaring the two missing members was a three-line edit and is
properly TEA's, since the contract is test-owned.

## The end-to-end probe that compared `'[]'` to `'[]'` — liveness guards are not optional garnish

My first full-cabinet test called `createWaveDemo(seed, wave)` and read `state.enemies`. The function
takes ONE argument (the wave is a field on `DemoState`, set as `{...base, wave}`) and enemies live in
`sim.processes`. So it compared two empty strings and failed with
`expected '[]' not to be '[]'` — which, had the sign of the assertion been the other way, would have
PASSED and proven nothing. The neighbouring uf1-2 test had a liveness guard for exactly this reason
and I did not copy it. Copy it: assert the fixture produced the thing you are about to compare,
before comparing it.

## Re-apply the staging EVERY frame — and when the staged path is unreachable, that is itself the finding

The jt5-10 rule ("a one-shot hush at setup decays") bit again, from the fixture side. I parked both
knights at the top of the arena to route the buzzards onto the UP-seek path, stepped 240 frames, and
measured **zero** up-seek frames. The knights had simply fallen: gravity, and the targeting grace is
~90 frames, so by the time enemies could lock on the staging was long gone. Re-parking every frame
gave 149 up-seek frames.

**But the natural run measures zero too, and that is worth reporting rather than fixing.** Four of
this story's rows (the wing cadences) plus HUUPVY live ONLY on the up-seek path, and production play
on this seed never enters it — buzzards climb toward a quarry ABOVE them and knights do not stay
above them. So those five rows will be wired onto a path the running game does not currently reach,
which is the "wiring one dead module to another" hazard uf1-10's own description calls *theatre*.
Not a blocker (the path is legitimately reachable and jt8-1 made the targeting live), but the
re-baseline pressure Dev should expect comes from the DECISION timers and the down-seek frozen hold —
both on paths that DO fire — and not from the wing rows. Measuring which of your subject's paths
production actually reaches is a ten-minute probe and it changes what the story's risk section says.
---

## A suite about STALE CITATIONS must not pin line numbers — assert by RESOLUTION or you rebuild the defect one layer up (sw8-18, 2026-08-02)

sw8-18's deliverable is correcting twelve rotted `file:line` citations. The obvious RED is
`expect(comment).toMatch(/WSMAIN\.MAC:2522-2530/)` — and it is **the same defect**: the next
legitimate edit to the ROM or the spec makes the TEST the stale citation, and it fails for a
change that was correct.

The shape that works: open the cited span and assert its CONTENT.

    const spans = citedSpans(gameRules(), 'WSMAIN.MAC').filter((s) => s.includes('STD ST.UX'))
    expect(spans.some((s) => s.includes('SMVSP1:'))).toBe(true)   // opens on the label
    expect(spans.every((s) => !s.includes('S1MVHP:'))).toBe(true) // stops before the next routine

That survives a legitimate renumber and fails the moment a comment stops pointing at its
subject — which is the property the story actually wants. Line numbers then appear in the
suite only inside `RETIRED:` markers, as the record of what a comment used to say.

## An auto-association rule between a QUOTE and a CITATION is the whole design — measure three candidates before writing a line of test

A verbatim checker has to decide which quote belongs to a citation. Measured on star-wars:

| rule | candidates | mismatches |
|---|---|---|
| nearest quoted string within 240 chars | 267 | 184 |
| nearest backticked fragment within 200 chars | 265 | 116 |
| IMMEDIATELY adjacent (≤4 punctuation chars) | 129 | **17** |

The loose rules capture the AUTHOR'S OWN PROSE, not a quote from the cited file, so a guard
built on them can never go green. **A guard that cannot go green is not a deliverable** — this
is the cheapest possible check and it decides whether the AC is satisfiable at all.

Underneath it sits a bug worth knowing: a naive ``/`([^`]+)`/`` pairs the CLOSING backtick of
one identifier with the OPENING of the next, so ``​`ST.UX` is the STARFIELD's register`` reads
as a quote. Scan delimiter PAIRS from the start of the text instead. That one fix removed most
of the residual noise.

## Two ACs can be JOINTLY unsatisfiable when one says "scan tests/" and the other says "put deliberately-broken fixtures in tests/"

AC5 told the guard to scan `tests/`. AC6 required mutation fixtures — which ARE broken
citations — and they live in `tests/`. Unscoped, the guard reported its own suite 14 times and
could never be green. The conflict is invisible in prose and obvious the first time you run it.

Resolution: a file-level opt-out pragma, and **two** tests for it — that it silences the
declaring file, AND that it does not leak to any other file. An opt-out with no leak test is a
global mute waiting to happen. Same family as the existing "probe your own contract before
handoff" entry, but the collision here is between two ACs of the SAME story rather than
between a suite and an implementation.

## When a tree-wide gate is out of reach, ship a RATCHET, not a narrowed scope

The specced scan reported **146** errors across seven years of comments. Two bad options:
demand the sweep (a much bigger story) or quietly narrow the scan (the guard stops watching
the tree). The third: hard-gate the story's own files, and pin the tree-wide TOTAL at the
measured baseline with `toBeLessThanOrEqual`. It may fall, never rise. The guard is
load-bearing plugin-wide on day one, no sweep is demanded, and new rot cannot enter.

Two things make it honest rather than a fudge: the number is a MEASURED baseline recorded in
the test comment with its class breakdown, and the residue is filed as a Delivery Finding with
those counts. Also check the classes before believing the total — a large share of the 57
"dangling" were RESOLVER gaps (`math3d.ts`/`loop.ts`/`rng.ts` are `@shared/*` at `src/shared`,
`vite.config.ts` is at the monorepo root), and the plugin's own CLAUDE.md said so outright.

## The throwaway pays twice: satisfiability, AND its bugs are the design requirements

Standard practice here is to prove a RED is satisfiable with a throwaway. On this story the
throwaway's own failures were the more valuable output — each was a real requirement the tests
now pin:

- **Markdown emphasis sits INSIDE quoted prose.** The spec reads `the **Death Star is entirely
  out of frame**`; the author quoted it without the asterisks. A raw substring test never
  matches. Strip `*`/`_` before comparing.
- **Re-location must report the matching LINE, not the first window containing it.** Scanning
  `i` before `w` matched an 18-line window whose start was 17 rows above the real anchor and
  reported that start — sending the next reader to the wrong row, i.e. committing the exact
  defect the guard exists to prevent. Put WIDTH in the outer loop.
- **Assembler directives start with `.`** — a token filter anchored on `[A-Z]` silently drops
  `.REPT`, leaving the quote with too few tokens to check, so item 8 sailed through.

Then run the FULL suite against it (197/199 files, no sibling breakage) and DELETE it.

## The pass list caught an inert assertion that `[^.]*` made unfalsifiable

Six of 36 passed on arrival: four deliberate oracles, two green regression guards (both
mutation-proven with `cp` backups, never `git checkout`). The seventh was a defect:

    expect(t).not.toMatch(/Every writer sits under[^.]*MOVE STARS IN SOME DIRECTION/)

The real sentence has ``​`WSMAIN.MAC`​`` between the halves. `[^.]*` cannot cross those dots, so
it passed against the exact text it targets and would have let the false claim ship untouched.
**A negated regex with a bounded gap class is a trap whenever the gap can contain a filename** —
filenames are the one thing guaranteed to appear near a citation. Use `[\s\S]{0,N}`.

## A guard's best RED-phase output is the defects it finds that nobody filed

Run the guard over the tree before handoff. This one surfaced four off-by-N citations in files
no AC named — `starfield.ts` citing `WSMAIN.MAC:2529-2531` for a quote at :2525-2528 (the same
routine and same defect as a filed item, found in one file and missed in its neighbour),
`WSLAZR.MAC:417`→:418, `WSBASE.MAC:1330`→:1340, `WSMAIN.MAC:2654`→:2656. That is the proof the
guard bites on arrival rather than being scenery, and it is far stronger evidence than any
synthetic fixture. List them in the test comment with the corrected number so Dev corrects
rather than hunts.

---

## The throwaway falsified my own RED design — build it BEFORE trusting the AC's mechanism, not just to prove satisfiability (sw8-23, 2026-08-02)

**Situation:** sw8-23 hardens sw8-18's comment-citation guard. AC3 says "anchor the opt-out
pragma — leading comment only, or first N lines, or an exact-line match". I wrote the RED
against "leading comment", built the throwaway to prove satisfiability, and the test that
mattered most **still failed**.

**Why:** the fixture that must NOT silence the file is
`// The guard honours a citation-guard: ignore-file pragma.` — and that *is* a leading
comment. Every option the AC offered except "exact-line match" fails on its own example. The
rule that works is narrower than any of them: **the pragma must OPEN the comment body once
the leader is stripped**, which is how both files that legitimately opt out already write it.

**The generalisation, and it extends the standing "prove the RED is satisfiable" rule:** the
throwaway's job is usually to answer *can this be built?*. Here it answered *is the specified
mechanism the right one?* — and the answer was no, discovered in ten minutes instead of in
Dev's second review round. **When an AC offers a menu of mechanisms ("X, or Y, or Z"), that
menu is a guess. Build the cheapest one and run the AC's own fixture against it.** A menu in
an AC is a tell that nobody has run it.

**Two more requirements the same throwaway produced, both invisible to reading:**

- **A regex fix can re-anchor one character right and look fixed.** The glob `**/*.test.mjs`
  extracts as the filename `.test.mjs`. Adding a leading character class to `FILE_RE` made it
  extract `test.mjs` — still a citation, still dangling, and the error message changes just
  enough to look like progress. A lookbehind `(?<![.*\w])` is what actually works. **Check
  what a rejected match becomes, not just that it changed.**
- **A disowning marker has an ADJACENCY requirement nobody documents.** `RETIRED:` is matched
  as `` RETIRED:\s*`? `` immediately before the filename, so it silently fails to disown an
  ELIDED citation (`RETIRED:`…design.md:47-48``). The marker was present, the citation still
  reddened, and nothing said why.

## Audit the pass list by ASKING WHAT WOULD MAKE EACH GREEN — three of eleven were green for the wrong reason

The standing rule is "check the pass list for vacuity". This run gives the mechanical form of
the question: for each green, name the condition that makes it green **today**, and check that
it is the same condition that makes it green **after** the story.

- Two AC5 mutation tests asserted only a floor on the mutated count (`>= 1` errors after
  stripping the marker). That passes on a file that was **never clean** — which was exactly
  the state at RED. The fix is to assert the **delta**: clean before, red after. A one-sided
  mutation assertion is not a mutation test.
- The ratchet called `checkTree` with its DEFAULT roots, under the name "the widened scan
  does not rise". The default did not yet include the new directory, so it measured the
  *un-widened* tree and reported `35 <= 35`. It would have stayed green through a story that
  widened nothing at all. Naming the roots explicitly made it red at RED.

**The tell for the second one is worth generalising: a test whose subject is a CONFIG CHANGE
must not read the config it is asking you to change.** It has to name the new value itself,
or it measures the old world and calls it proof. Same family as the existing "a mutation that
DIDN'T APPLY is indistinguishable from a guard that doesn't bite" entry, one level up — here
the *assertion* silently applied to the wrong scope rather than the mutation failing to land.

**And say so in place when a green is knowingly weak.** One test here ("the guard scans clean
over its own implementation") is green at RED *because the file opts itself out* — the very
defect the story fixes. Rather than delete it, it carries a comment saying it is green for
the wrong reason and that its non-vacuity comes entirely from the mutation test beside it.
A reader who greps the pass list must not be able to mistake it for evidence.

## Classify a handed-over "I could not settle this" BEFORE treating it as work

SM handed over two errors it could not classify — bare `.test.mjs` "cited file does not
exist" — with the check named, explicitly refusing to guess. Ten minutes of grep settled it:
the sources are a **glob** (`` `**/*.test.mjs` discovery ``) and a comment-wrapped sentence
remnant. Nothing was ever cited, so nothing could be "re-anchored", and the four analogous
entries already in the baseline were the same artifact.

Had I treated them as citations, the honest options would have been to invent an anchor or to
mark six non-citations `RETIRED:` — both of which write a false record into the tree the story
exists to make truthful. **A handed-over uncertainty is cheaper to resolve than to route
around; resolve it first and let the answer set the scope.** The result here added a
three-line fix to the story and removed six errors, four of them pre-existing.

---

## A "dead in the ROM" verdict can rest on a LABEL-keyed read — check whether the row is reached POSITIONALLY (jt9-1, 2026-08-02)

**Situation:** AC3 said a countdown "reloads from LNTLAV", so I had to identify that symbol.
`difficulty.ts` records the matching DYTBL row as `{ kind: 'dead-in-rom' }` with a confident,
checkable reason: *"its label appears exactly ONCE in the whole of JOUSTRV4.SRC, on its own DYWORD
line at :7306 — Williams shipped a row nothing reads, so there is no behaviour to port and no story
can wire it."* Two shipped tests guard it, one of them re-stating the reasoning in a comment.

**The label claim is TRUE. The row claim is FALSE.** The DYTBL's trailing label is a comment, not an
operand; the initialiser never reads a name. It walks the table and the RAM block in lockstep —
`LDX #DYTBL / LDY #DYNADJ … LEAX DYWLEN,X / LEAY 3,Y / CMPX #DYEND` — so row *n* fills RAM slot *n*.
Slot 3 is declared `LNTLAV` in RAMDEF and commented `LAVLAV` in the table. Same row, two spellings,
and the real name is read at four sites.

**How I proved it rather than argued it:** parsed both blocks and compared all 28. Every RAM slot is
exactly 3 bytes (which is what `LEAY 3,Y` requires — an independent check that my slot-splitting was
right), and 27 of 28 names match. **The alignment evidence is what makes the one mismatch mean
"typo", instead of "my parse is off by one."** One mismatch out of 28 with perfect sizes is a
spelling; three scattered mismatches would have been a broken reader.

**Generalise — the tell is a symbol reached by POSITION.** Jump tables, `RMB` blocks, DYWORD tables,
struct offsets, `FCB` rows indexed by an enum: none of them mention the name at the point of use. A
`grep <LABEL>` census over those is measuring the wrong thing, and it fails in the direction that
looks like a finding ("nothing reads this — it's dead"). Before believing any "unused / dead /
no-consumer" verdict about table data, ask **how the consumer addresses it**. If the answer is an
offset, the label census proves nothing at all.

**Corollary:** the port's claim was not sloppy — it named its evidence, and that is why it was
falsifiable in ten minutes. Prefer that shape even when it turns out wrong.

## The most useful mutant is the one that turns the story's CENTRAL assertion green

The battery's second mutant blinded the promotion sweep to glides (`pjoy: 'none'` unconditionally).
Result: `AC2 — on the IDLE-input replay, zero promotions carry a glide` **PASSED**, and the only
failure was the positive control sitting beside it.

That is the whole argument for the control, demonstrated instead of asserted. An AC phrased as
"sweep for X and the count is ZERO" is satisfied just as well by a probe that cannot see X — so
**breaking the instrument is indistinguishable from fixing the bug**, and it is the cheaper of the
two. Whenever an AC's success condition is an EMPTY result, the mutant to run is not "delete the
mechanism" but "blind the observer", and the guard is a control asserting the observer still
registers the phenomenon somewhere it is known to occur (here: 132-466 glide-carrying enemy-frames
per harness, in every harness including the ones with zero glide-carrying promotions).

## Reachability is worth measuring BEFORE designing the pin — and "zero" can be structural

The story asked for a behaviour keyed on "a lava troll immediately behind this bird". Rather than
design the fixture first, I swept: **zero troll-present frames** across 3 seeds x 6000 frames x two
input harnesses. Not rare — structurally absent, because the spawn gate needs `bridgeBurned &&
wave >= 4` and seeded play reaches wave 1-3.

Two things followed that would have been expensive to discover later:

1. **The end-to-end pin had to be a forced wave advance**, disclosed in a CONTROL that states the
   measurement, rather than a seeded sweep that would have been permanently vacuous.
2. **A second defect surfaced that no AC named.** The ROM's test only ever fires because the troll
   is CREATED immediately before its victim; our port appends it at the list end. Modelling the
   behaviour without that would have shipped a correct pure function whose production input is
   `false` forever — this repo's named failure mode, and the Reviewer would rightly have called it.

**The rule: when an AC is conditioned on some entity being adjacent/present/attached, measure how
often that condition holds in production BEFORE writing the fixture.** A zero tells you whether you
are writing a unit pin or an integration pin, and it frequently exposes the wiring defect that makes
it zero.

## Re-measuring a prose correction can DISAGREE with the finding and still confirm it

R-4 said a test comment's "these four seeds are the only hits" was false: 36 of 400 seeds in the
band produce the event, 20 at frame 973. Standing rule says re-measure rather than transcribe, so I
did — and got **62 of 400, none at frame 973.**

Not a contradiction: I counted each seed's FIRST event within 1100 frames; the original counted
events at any frame. Different populations, both refuting "the only hits". **I nearly published my
number as a correction to theirs**, which would have replaced one confident count with another by a
method nobody could reconstruct from the comment.

What went in instead: both censuses, both methods named, the disagreement stated, and the conclusion
that survives either — *such seeds are common, so scan and take the earliest rather than assuming
scarcity*. **When two honest measurements of a "how rare is this" claim disagree because they count
different things, that disagreement is the evidence that a bare count does not belong in the comment
at all.** Fixing the number would have re-created the defect one layer up.

---

## Your own RED file can break a tree-wide RATCHET — and the failures look exactly like the fix's (sw8-19, 2026-08-02)

**Situation:** the sw8-19 RED added one heavily-cited test file. Running the candidate fix through
the full suite gave **5 failures**; 2 were my intended comment-AC reds and **3 were in
`tests/audit/comment-citations.test.ts` and `sw8-23-guard-hardening.test.ts`** — the tree-wide
stale-citation ratchet, ceiling 29, now reporting 30.

**The trap is attribution.** Those 3 appeared in the same run as the source mutation, so the
natural reading is "the fix breaks the citation guard" — which would have contradicted SM's
measured "zero fixture rework" sizing and sent Dev hunting a coupling that does not exist. The
check that settles it costs one run: **run the guards with your test file present and NO source
mutation.** They failed identically. The 3 were mine.

**The cause is worth knowing because it fires while WRITING, not while drifting.** I cited a ROM
span bare — `:3898-3918` — in a comment that also mentioned `gameRules.ts`. The guard's
association rule binds a bare span to the nearest preceding filename, so it resolved the ROM span
against a 272-line TypeScript file and correctly reported it out of range. That is `sw8-25`'s
filed association defect and the `bare-colon-citations-evade-gates` memory, reproduced in a
brand-new file by ordinary authoring. **Spell the filename** (`WSMAIN.MAC:3898-3918`) whenever a
span sits anywhere near a different filename — the header of an ASCII ROM listing anchored by one
`FILE.MAC:NNNN` is fine, free-running prose is not.

**Generalise:** before handing off, ask which tree-wide COUNTERS your new file feeds. Citation
ratchets, coverage floors, file-count invariants and lint budgets are all "the suite was green
and now is not" in a file you never edited. Run them against your file alone.

## Re-verify ROM citations against the VENDORED tree, not the greppable clone

All of sw8-19's measurements were taken from `~/Projects/star-wars-1983-source-text`, but the
citation guard resolves against `reference/atari-source/star-wars-1983/` **inside the repo**. The
`centipede-quarry-canonical-path` memory records these being off by one for another game, so the
two are not interchangeable by default. Checked here with `cmp`: byte-identical, 3996 lines both,
and every cited line reads as claimed. **Cost of the check: one `cmp`. Cost of skipping it: every
line number in the file is wrong and the guard is the only thing that would have said so** — and
it only checks spans it can resolve.

## A RED whose green half is the DESIGN — count the tests that must NOT move

sw8-19's suite is 14 tests: 8 red, **6 green on arrival**. The 6 are not filler. The whole story is
"stop setting a bit in some cases", and the single most likely wrong fix is to stop setting it at
all — under which **every negative assertion passes**. The mutation battery proved the point:
killing C_PS outright reddened 7 of my 14 and 21 across the game, and all of that signal came from
the green-on-arrival controls plus the in-play run's own preconditions.

So when the story is a NARROWING, budget as much design effort for the assertions that must stay
green as for the ones that must go red, and put the positive controls FIRST inside each test so a
collapsed derivation fails on the control rather than passing the negative. Related to the
`jt9-1` rule about shipping a positive control alongside a "count is zero" criterion — this is the
same rule applied to a whole suite rather than one assertion.

## Rank the wrong fixes, not just the right one — and check they are caught by DIFFERENT tests

Six wrong fixes were each written and run: an aspect-blind fixed cone, a near-clamp-only fix that
closes the filing's own worked example and nothing else, a half-pyramid, a narrowed band, a killed
bit, and a clamp applied to `beamHit` instead of to the status bit. Every one was caught, and by a
different test — which is the property worth checking, because a battery where every mutant reds
the same test has one guard wearing six hats.

The near-clamp-only mutant is the one worth building deliberately: **a filing's worked example is
usually its most degenerate case**, so the minimal fix that satisfies the story text is a real
risk. Here it left 7 of 14 red because the seats were chosen per ROM EXIT rather than per
coordinate. Naming each seat after the branch it exercises is what made that fall out for free.

## The gun and the sights can share a defect — pin the half you are NOT fixing

sw8-19 gates the sights bit on visibility. The clone's player laser resolves through the same
`beamHit` and has the same divergence (the ROM's hit block sits under the identical `C$PV` exits),
but fixing it changes what the player can shoot and is a different story. The RED therefore
asserts the CURRENT gun behaviour explicitly — off-glass targets still resolve — so the mutant
that "fixes" both at once is caught rather than welcomed. **When a finding has a sibling you are
deliberately not fixing, pin the sibling's present behaviour and file it; otherwise the tempting
over-fix ships silently and the follow-up story is filed against code that already changed.**

---

## vitest `-t` is a REGEX — a mutation harness that filters by test name scores untested mutants as SURVIVED (cp6-2 RED, 2026-08-03)

**Situation:** a 12-mutation battery over the cp6-2 RED tests. One mutation — breaking `flatten()`
so it no longer un-wraps blockquotes — came back **SURVIVED**, which read as "the apparatus test
for `flatten()` has no teeth".

**It had never been run.** The harness selected the test with
`npx vitest run -t "flatten() un-wraps a blockquote-wrapped silence claim"`. `-t` is matched as a
**regular expression**, so the literal `()` is an empty capture group and the name never matches.
Vitest reported `1120 skipped`, exited **0**, and a `returncode == 0` check read that as green
before AND after the mutation.

**Why this is worse than a crash:** a mutant that was never run is indistinguishable in the report
from one that was caught, and it lands on the *safe*-looking side. Here it inverted — it reported a
good test as bad — but the same bug silently reports a bad test as good whenever the mutation is
expected to survive.

**The fix is to make "nothing ran" a distinct outcome from "nothing failed":**
```python
m = re.search(r"^\s*Tests\s+(.+)$", out, re.M)
passed = ... ; failed = ...
if passed + failed == 0:
    return None          # filter matched nothing — NOT a green run
```
and refuse to score a mutation whose test was not passing beforehand. Also: prefer paren-free,
regex-safe substrings when naming the filter, and remember that `.` `(` `)` `*` `+` `?` `[` `|` in a
test name are all live regex syntax.

**Generalises past vitest:** any harness that infers "green" from an exit code is really inferring
"nothing failed", and "nothing ran" satisfies that. Assert the positive — N tests ran — not the
absence of failure. Same family as the SM sidecar's `grep -Eci` alternation trap: a zero from a
filter you just composed is a claim about your filter first and the code second.

## "The token appears SOMEWHERE in the file" is defeated by a second occurrence — assert the PAIR

The first cut of a guard on `just deploy-assets` asserted that each game's key prefix appeared in
the recipe body: `expect(body).toMatch(/joust\/sfx/)`. A mutation deleting `"$staging/joust/sfx"`
from the `mkdir` line **survived** — because `joust/sfx` also appears in the bake line two rows
down. Same for `star-wars/music`.

The real invariant is a pair: a prefix must be **staged** *and* **baked into**. Staging without
baking uploads an empty directory; baking without staging writes nowhere. Either half alone
produces a live 404 at the exact URL the game requests, and on this project `@shared/audio`
swallows that identically to success — so the suite stays green over a silent game, which is the
precise defect the story existed to fix. The guard was reproducing the bug it was written to catch.

**Rule:** before asserting a token's presence, `grep -c` it. If the count is >1, presence proves
nothing about the occurrence you care about — scope the match to the line or structure that
matters (`body.match(/^\s*mkdir -p .*$/m)` here), and assert each half separately with a message
naming which half failed.

## A previous story's guards can assert the OPPOSITE of your ACs — invert them in RED, never leave them for GREEN

centipede's `tests/audio-seam-scope.test.ts` carried four guards from cp5-1/cp5-2 requiring the
README to say the game is **silent**, that no samples ship, and that fourteen 404s are expected —
all correct then, all false the moment cp6-2 bakes and uploads. One of them
(`audio.ts must not match /uploaded|hosted and verified/`) actively **forbade** the AC's fix.

Left in place they stay green through the whole build and red only when the README is finally told
the truth — at which point **the cheapest way back to green is to restore the false sentence**,
failing the AC while the suite reports success. That is the mg1-9 "guard whose correct fate is
deletion" shape seen from the test-authoring side.

**Do it in RED.** Inverting them there makes the inversion part of the specification: the tests are
red for the same reason as everything else, and Dev cannot mistake them for collateral damage. Keep
an inline comment naming the inverting story and the reason, so the history stays legible — and keep
the guards whose premise survives (`commits no .wav anywhere in the plugin` is still right, because
the baker stages to a temp dir).

## To mutation-prove a green-on-arrival assertion bundled with a legitimately-RED one, SIMULATE the fix first

The strengthened recipe guard covers four prefixes, three shipped and one this story adds. It is
therefore red today — so the standard battery step ("assert green, mutate, assert red") cannot run,
and the harness correctly refused with `NOT GREEN FIRST`.

The answer is not to split the test to suit the harness. It is to apply a **minimal simulation of
the story's own fix** (here: two lines added to the justfile), assert the guard is now GREEN — that
assertion is the precondition and must itself be checked — run the mutations on top, then restore
and verify byte-identity. Five mutations, five caught, and it proved the shipped games' halves bite
in a state that does not exist yet.

Restore by explicit write from an in-memory copy, never `git checkout --`: the RED phase's own
uncommitted work is sitting in the same tree.

## A PINNING story's RED is taken against the MUTANT — and say so out loud (jt9-3, 2026-08-03)

jt9-3 pinned three behaviours a previous Reviewer's mutation battery found unguarded. The code
was already correct, so **no guard can fail against the tree as shipped** and the ordinary
"watch it go red" ritual has nothing to bite on. The protocol that replaces it:

1. write the test, 2. apply the forbidden change to PRODUCTION code, 3. run the whole project,
4. revert, 5. confirm green, 6. **record the mutation verbatim in the comment above the test.**

A test nobody has watched fail is not a guard, and in a pinning story that is the ONLY way to
watch it. Handing off "11 tests, all green" without the battery is indistinguishable from
handing off 11 tests that assert nothing. Write the diff into the file, not just the session —
the next person to touch that line is reading the file.

**And re-measure the baseline BEFORE writing anything.** The story said "0 of 1979"; the suite
was 2499 by the time it was worked. All three still reddened nothing, so nothing was dropped —
but the run costs 90 seconds and the alternative is writing a duplicate of a guard some
intervening story already added. Do it first, not as a formality afterwards.

## Ask WHY a behaviour was unguarded — the answer is often that it is STRUCTURALLY unobservable

The most useful finding of jt9-3 was not a test, it was the reason one mutation reddened
nothing. `stepDemo` calls

    stepFrame({ ...demo.sim, targets: tickedTargets, cues: [] }, …)

— it **overwrites `cues` on the way in**. So "stepFrame must never read `state.cues`" cannot be
observed from `stepGame` by any input, any seed, any length of play. It is not thinly covered;
it is unreachable. Every guard for it must call the raw seam directly.

Two things follow, and both generalise:

- **An end-to-end guard would have been permanently vacuous** — green forever, for a reason
  nobody would find again. Had I reached for the game-level fixture the file was full of
  (the tempting move: it is the house style), I would have shipped exactly the
  `audio-seam-suites-cannot-see-emitters` defect this story exists to prevent.
- **A neighbouring test had almost the right name.** `the stream is REBUILT per frame — a wing
  cue does not survive into the next` sits twenty lines above and goes through `stepGame`, so
  it pins the DEMO's rebuild, not the scheduler's. A name match is not a coverage match; open
  the test and find which layer it actually calls before concluding a behaviour is covered —
  or, as here, before concluding your new guard duplicates it.

So: before designing the fixture, ask *why* the battery found this unguarded. "Nobody thought
of it" and "the only caller destroys the evidence" want completely different tests.

## A boolean that flips INSIDE a step diverges in TWO directions — pin both

The mutation was one read moved across one call (`wasAirborne` from above `stepPlayerEntity` to
below it). It is easy to think of that as one defect. It is two:

- **LANDING** (true → false): the mutant takes the grounded branch and **swallows** a cue the
  machine plays.
- **WALK-OFF** (false → true): the mutant takes the airborne branch and **invents** one the
  machine does not.

Either alone kills the mutant, so one test looks sufficient. It is not: **a fix that
special-cases one direction survives a guard that only tests the other**, and a narrowing fix
is exactly what a reviewer or a later story will reach for. Both went red, in different suites'
idioms, which also proved the two are genuinely separate paths rather than one assertion in two
costumes.

Corollary on cheapness: the divergence was 2 frames in 3000 of scripted play (cue count
1610 → 1609). **That is why no replay fingerprint noticed** — and why a staged frame beats a
long sweep as the primary guard. The sweep can only find it by accident; the staging cannot
miss it.

## Report the tests that must stay GREEN under each mutant, not just the reds

M2 reddened 3 of the 4 tests in its group. The fourth (`two steps of one state do not share a
cue array`) was **predicted** to survive, because it guards a different defect shape — a
module-scoped accumulator, not a carried-in field. Same for M1's aloft control and M3's
"each moment fires ALONE" control.

Written down in advance, that reads as a designed battery. Written down nowhere, a reviewer
sees "3 of 4 red" and reasonably asks whether the fourth is dead weight. **The predicted-green
list is the part of the report that shows you know what each test is for**, and it is also
where a real mistake surfaces: a control you expected to stay green that goes red means the
mutation is broader than you claimed, and a pin you expected to go red that stays green means
you wrote a test for a behaviour you did not actually reach.

## What a NEW TEST FILE costs: check the counters that count FILES, not just content

Setup proposed a new `wing-cues.test.ts`. Adding any file under `plugins/joust/tests/` reddens
`the suite FILE count matches what vitest actually discovers` (audio-seam-scope.test.ts), which
derives the count and compares it to a number stated on the README's command line. A new file is
therefore never free: it is a test file plus a README edit, in a story whose AC says "no
production changes".

This is the sw8-19 ratchet lesson on a new axis — there the counter was fed by my file's
CONTENT (a citation), here by its EXISTENCE. Both are "the suite was green and now is not, in a
file I never edited". **Before choosing new-file vs. add-to-existing, grep the suite for
`readdirSync` / file-count derivations.**

The decision that fell out was better anyway: put each guard in the suite that already owns its
seam and already has its staging kit. The third guard needed a two-bodies-at-one-lance-height
fixture that existed in another file; copying it would have re-created the duplication the
immediately-preceding story spent itself removing. **Discoverability is grep, not filenames** —
put the story id in every describe and every test name and say so in the handoff.

## Check the FILING commit before calling a story's line citation wrong

Setup corrected the story's `demo.ts:1109` to `:1272-1275` and was right about today. But
`git show <jt5-3's own GREEN commit>:…/demo.ts | sed -n '1109p'` printed the cited statement
exactly. The story was correct when written; the very next story that day moved it to :1174,
and it is :1275 now — **three positions in three days, by two unrelated stories.**

"The story was sloppy" and "the citation rotted" look identical at HEAD and route completely
differently: one is a correction, the other is evidence for the standing story about converting
line refs to symbol refs. One `git show` separates them. Cite the SYMBOL in whatever you write
next, and when a ref does turn out stale, note the drift RATE — hours, here — because that is
the number that justifies the conversion story.

## Seeding a state field is not "synthetic" when production writes that field every frame

The landing fixture needed a knight whose previous-frame button level was DOWN. Playing that in
costs a press frame, whose flap impulse moves the measured landing and forces the whole sweep to
be redone. But `prevFlapHeld` turned out to be a first-class `ProcessSpec` field that the
scheduler writes on **every** player wake (`prevFlapHeld: input.flapHeld`), so seeding it `true`
is precisely the state the sim itself leaves behind after any held frame — reachable by
construction, not a fixture cheat, and worth one sentence of comment saying so.

**Check whether the value you want to "play in" is a field the production code already produces
before paying for a multi-frame input script that perturbs the thing you measured.** The
disclosure discipline (audio-thud.test.ts's `airborne: true` with `plantZ: 2`) is for genuinely
unreachable combinations; spending it on a reachable one buys nothing and hides the real ones.

## Two throws that both interpolate the same variable cannot be told apart by a regex on it

jt9-4's whole design came out of one observation SM handed over: `bakeSamples` has two gates,
`no synth spec for manifest cue '${name}'` and `no FRAME_DURATIONS entry for '${name}'`, and
centipede's precedent guard asserted `.rejects.toThrow(/aCueNobodyBaked/)` — the CUE NAME. That
regex is satisfied by either gate. A guard that says "it threw and mentioned the right cue" is
one step above `rejects.toThrow()`, not many.

It is not a theoretical gap. `SPECS[name]` is a bracket read on an object literal, so a cue
named `toString` inherits `Object.prototype.toString`, is TRUTHY, **sails past the missing-spec
gate**, and then trips the DURATION gate — right cue name, wrong diagnosis, regex green. The
class of bug and the class of test failure coincide exactly.

**When two error paths share an interpolated value, assert `toBe` on the whole message**, and
build a probe for each path whose interpolated value DIFFERS from the other's. jt9-4's two
duration probes name `playerWingUp` and `enemyThud` for exactly this reason, and mutants M11/M12
(hardcode one probe's name into the message) prove it: each is invisible to its own probe and
caught only by the other.

## Design the mutants BEFORE finalising the tests — planning M12 found a hole in my own suite

Both duration guards originally probed the same cue. Writing the mutant list — "M12: replace
`'${name}'` with the literal `'playerWingUp'`" — made it obvious that both would still pass,
because both expected that name. The fix (two different cues) went in before a single mutant ran.

The battery is not only a verification pass. **Enumerating the mutants is a design review of the
tests**, and it is cheapest before the tests are committed. `mutate-with-a-WRONG-value-not-the-old-one`
is usually read as advice about the mutant; it is equally advice about the PROBE.

## A permissive mutant is still worth running — the rule is about its SURVIVAL, not its use

`mutation-direction-must-be-restrictive` says a permissive mutant's survival proves nothing.
It does not say don't run one. Of jt9-4's 19 mutants, 5 were permissive (a deleted clause, a
deleted block, `Object.hasOwn` removed, `if (spec === null)`, `if (frames === undefined)`) and
**all 5 reddened** — which is a positive result each time and covered three guards nothing else
reached. M7 was the only mutant that any test saw at all for the `|| outDir.length === 0` clause.

Report direction per mutant and let the reader apply the rule. Dropping permissive mutants
because of a half-remembered rule loses real coverage.

## Run the battery and then look at your WORKING TREE, not just the test output

M7 (delete `|| outDir.length === 0`) reddened the guard, exactly as designed. It also wrote all
EIGHTEEN `.wav` files into the **repo root** — `join('', 'enemy_death.wav')` is a relative path
and vitest's cwd is the repo root, not the plugin. `git status` caught them; nothing else would
have, because `audio-seam-scope.test.ts` walks `plugins/joust` and they were not there.

Two lessons. **`git status --porcelain` after the battery, always** — a mutant that disables a
path guard writes real files to real places. And the comment I had already written on that guard
said the stray files would land in "the plugin tree"; the measurement said repo root. **A guard's
comment is prose and prose is the unguarded surface** — the mutant that proves the guard also
fact-checks the sentence explaining it, if you look.

## When TEA is told to ship the refactor too, ship it in the HANDOFF instead

SM's dispatch listed "the refactor plus the guards" as the TEA deliverable. Doing that would have
left every test green on arrival — no RED, nothing for Dev, and a pinning story whose entire
point is a guard someone watched fail.

What worked: write the tests, commit them RED, then apply the candidate refactor **uncommitted**,
run the full battery against it, revert, and paste the exact diff into the session file under
"What remains for Dev" with the mutant-backed traps beside it (don't add a return value, the
default must be `?? SOUNDS` not `?? {}`, the write path must use the injected record). Dev gets
zero design work and a real RED; the measurement still happened. **The refactor being verified
and the refactor being committed are separable, and TDD wants them separated.**

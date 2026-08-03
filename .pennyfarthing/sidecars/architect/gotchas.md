# Architect Gotchas

Common pitfalls encountered during Architect (design) work.

---

### A "silent degrade" contract hides missing ASSETS as convincingly as it hides bugs — check the bucket, not just the code

**Situation:** A shell/IO feature (audio, images, fonts) is fully wired, its tests are green, its story is closed — and the feature does nothing in production.

**Problem:** `@arcade/shared/audio` (and the engines it replaced) degrade silently at *every* failure path: no WebAudio, blocked autoplay, failed fetch, undecodable sample all leave the game quiet and never throw. That is correct design — one missing sound must never crash a frame — but it means **a 404 is indistinguishable from working code**. Star Wars' music was wired by sw3-5 and had *never played in production*: the four `.wav` loops 404'd on R2 because asset production was scoped out of the story. TEA, Dev, and the Reviewer each logged it as a non-blocking Delivery Finding; no follow-up story was ever filed, so the finding died in the archive and the feature was quietly absent for good.

**Prevention:** When a story's payload is an *asset* the code merely points at, the acceptance test is a **live 200, not a green vitest**. Curl the bucket. And when a Delivery Finding says "X must follow in a later story," file that story before finishing — a finding is not a backlog item.

**Fix:** `curl -o /dev/null -w "%{http_code}" -r 0-0 <asset-url>` across the manifest. Note there is **no automated upload path for the `arcade-assets` bucket** — CI deploys each app's `dist/` only (`scripts/deploy-r2.mjs`); sfx/ and speech/ appear to have been placed by hand.

**Example:** star-wars music, 404 on all four tracks since sw3-5 shipped. Filed as sw6-1; design at `docs/superpowers/specs/2026-07-13-star-wars-music-bake-design.md`.

---

### The star-wars MUSIC is in the original source too — `SWMUS.MAC` + `SNDPM.MAC`, fully commented

**Situation:** Designing anything that needs the cabinet's music (themes, the Imperial March, attract/hi-score cues).

**Problem:** The disassembly (`reference/disasm/sound/Music_Functions.asm`, 1,173 lines of 6809 + opaque note words like `fdb $805A, $8701, $3316`) makes this look like a reverse-engineering project, and emulating the sound board looks like the escape hatch. It isn't: **there is no sound ROM binary on this machine**, and the disasm listing carries mnemonics *without opcode bytes*, so a ROM image cannot be rebuilt from it either. A design that says "emulate the sound board" is not executable.

**Prevention:** Go to `~/Projects/star-wars-1983-source-text` (same quarry as the vector pictures, per the gotcha below). **`SWMUS.MAC`** = "STAR WARS TUNES": `TUNTAB` plus every voice's note stream, with each assembled `.BYTE` carrying its original macro call as a comment right above it (`;.CKEY 0` → `.BYTE 85, 0`), and notes written in human notation (`.NOTE G5A,FS5A,E5B,D6H`) — a free oracle. **`SNDPM.MAC`** = "(RUSTY'S POKEY MUSIC) DRIVER, 6809 VERSION": opcode dispatch, note→frequency table, frequency/amplitude envelopes (HRN horn, TRB trombone, BAS bassoon, GLK glockenspiel, WW woodwinds).

**Fix:** Follow the `tools/speech-bake` pattern — it never emulated the 6809 either; it lifted the LPC data from the source and re-implemented only the TMS5220 decoder in JS. Lift the tune data, port the player, feed the already-vendored POKEY core.

**Example:** `SNDPM.MAC`'s entry points name their own game moments, so the phase→tune mapping needs no guessing: `PMTH5` ";MAIN THEME (START OF GAME)" · `PMBEN` ";BENS THEME (START OF TOWER)" · `PMRRP` ";REBEL THEME WITH REPEATS(TRENCH WITH REPEATS)" · `PMDAR` ";LORD VADER'S THEME". Both files are `.RADIX 16` — the usual hex trap.

---

### Authentic vector-picture geometry lives in historicalsource, not `star-wars/reference/disasm/`

**Situation:** Designing an authentic-fidelity render/behavior for the star-wars game that depends on an original vector *shape* (fireball, explosion, gunshot, an object picture).

**Problem:** `reference/disasm/` is a disassembly of the two 6809 boards only. It yields the draw *routine* and a `JSRL`/`VR` picture *address*, but the AVG vector-picture ROM (the actual line geometry) is **not** vendored there. A design that says "port the shape from the disasm" is not fully executable — the shape isn't in it.

**Prevention:** Point the design + ACs at the real source: GitHub **`historicalsource/star-wars`** (commit `5355b76`, codename **"Warp Speed"**). **`WSVROM.MAC`** = object pictures; `WSOBJ.MAC` objects; `WSGUNS.MAC` firing; `WSXPLD.MAC` explosions; `AVGROM.MAC` is the AVG *state* PROM (hardware, not pictures); `SWMP.MAC` Math Box; `VGAN.MAC` alphanumerics.

**Fix:** Fetch raw (`raw.githubusercontent.com/.../5355b76/<FILE>`); CR-terminated non-UTF8 → `tr '\r' '\n'`, `grep -a`. Cite the specific picture label (e.g. `GNB0`) in the ADR/spec so Dev has an exact target.

**Example:** enemy fireball = `WSVROM.MAC` `GNB0–3`/`GNT0–3`: animated **red radial sparkle** (`COLOR VGCRED`, spikes-from-center + `FUSE` balls), not a ring. See `star-wars/docs/star-wars-1983-source-findings.md` ("Original Atari source").

---

### When the REVIEW is the backlog's generator, merge by FILE SURFACE — not by theme, and not at all if the surfaces are disjoint

**Situation:** An epic where finishing a story reliably files one to three more, and the backlog is flat or growing despite steady completions. The instinct is to merge stories that sound alike.

**Problem:** In a mutation-battery pipeline the new stories are not produced by the CODE, they are produced by the REVIEW. Each completed story buys one Reviewer battery over one file surface, and a battery over a weakly-asserted surface reliably yields one or two surviving mutants, each filed as its own story — which then buys its own battery. Merging two stories that share a THEME but not a FILE still buys two batteries and saves nothing; merging two that share a FILE buys one. Measured on epic jt9 (joust, 2026-08-03): 7 stories done burning 21 points, 9 stories filed totalling 21 points — exactly break-even. The concentration is the tell: the ONE production story (jt9-1, 8pt) spawned 5 points, while the five small audio/test-seam stories (jt9-2/4/5/6/7, 10 points total) spawned 16 — **160%**. The only story that spawned NOTHING was jt9-3, whose deliverable already WAS a mutation battery, so its reviewer's battery had nothing left to find.

**Prevention:** At grooming, group the backlog by the FILES each story edits, not by subsystem or by the ROM routine it cites. Two stories touching the same guard, the same test file or the same decoder are one story with two commits. Two stories citing adjacent ROM lines but editing different files are two stories, and merging them buys nothing but a bigger diff. Then check for the inverse: a story whose ONLY justification is another story (a latent prerequisite with no observable effect of its own) should be folded into its dependant as its first commit, not shipped alone — shipping it alone buys a full TDD cycle and a battery for a change nothing exercises.

**Fix:** The three highest-yield shapes, all seen in jt9 — (1) two stories that each say "extend the OTHER one's guard to my files" (jt9-36 and jt9-37 both wanted the same read-set line in `audio-channel-role.test.ts` widened, over disjoint file lists); (2) sequential fingerprint-movers over one subsystem, which re-baseline the SAME seeded pins twice and whose second re-baseline is harder to audit than a joint one; (3) a latent prerequisite plus its only consumer (`jt9-13`'s sign-extension has exactly one call site and is unobservable until `jt9-25` draws the frames).

**Counter-example — respect an explicit DO-NOT-MERGE:** `jt9-14` names `jt9-15` in its own text: "They are adjacent enough to be merged by a groomer who reads only the titles; they should not be." Different loop, different routine, different failure. A filing story that anticipated the merge and refused it outranks a groomer's pattern-match; read the descriptions, not the titles.

---

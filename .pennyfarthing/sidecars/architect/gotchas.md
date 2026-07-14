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

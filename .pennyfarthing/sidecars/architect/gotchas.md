# Architect Gotchas

Common pitfalls encountered during Architect (design) work.

---

### Authentic vector-picture geometry lives in historicalsource, not `star-wars/reference/disasm/`

**Situation:** Designing an authentic-fidelity render/behavior for the star-wars game that depends on an original vector *shape* (fireball, explosion, gunshot, an object picture).

**Problem:** `reference/disasm/` is a disassembly of the two 6809 boards only. It yields the draw *routine* and a `JSRL`/`VR` picture *address*, but the AVG vector-picture ROM (the actual line geometry) is **not** vendored there. A design that says "port the shape from the disasm" is not fully executable — the shape isn't in it.

**Prevention:** Point the design + ACs at the real source: GitHub **`historicalsource/star-wars`** (commit `5355b76`, codename **"Warp Speed"**). **`WSVROM.MAC`** = object pictures; `WSOBJ.MAC` objects; `WSGUNS.MAC` firing; `WSXPLD.MAC` explosions; `AVGROM.MAC` is the AVG *state* PROM (hardware, not pictures); `SWMP.MAC` Math Box; `VGAN.MAC` alphanumerics.

**Fix:** Fetch raw (`raw.githubusercontent.com/.../5355b76/<FILE>`); CR-terminated non-UTF8 → `tr '\r' '\n'`, `grep -a`. Cite the specific picture label (e.g. `GNB0`) in the ADR/spec so Dev has an exact target.

**Example:** enemy fireball = `WSVROM.MAC` `GNB0–3`/`GNT0–3`: animated **red radial sparkle** (`COLOR VGCRED`, spikes-from-center + `FUSE` balls), not a ring. See `star-wars/docs/star-wars-1983-source-findings.md` ("Original Atari source").

---

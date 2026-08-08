# Native-basis migration (sw10-1 AC #2)

**Status:** in progress (Dev, sw10-1). Chosen by the user 2026-08-08 over splitting or baking,
with the fleet-scale cost accepted (all of `sim.ts`, view/projection, model data, render, and
~half the star-wars test suite re-authored; all three phases visually re-verified).

## Why

The per-model `*_ORIENT` axis-swap hacks (`SURFACE_ORIENT`, `PORT_ORIENT`, `TOWER_ORIENT`,
`TIE_ORIENT`) exist because the world runs in an OpenGL basis (forward = −Z, right = +X, up = +Y)
while the ROM authored every model, distance and spawn in its own basis (forward = +X, right = +Y,
up = +Z). Each model is rotated ad-hoc into our frame. AC #2 retires those hacks by adopting the
ROM-native basis as the world basis, so ROM data drops in unrotated and one world→eye remap at the
camera does the only conversion.

## The convention

**World basis = ROM-native:** `pos = [depth, right, up]`.
- **X = depth**, forward/away from the cockpit; the cockpit is the origin, and enemies approach as
  X decreases (TIE spawn depth X = `$7C00`, per the ROM). X > 0 is downrange (in front).
- **Y = right** (screen +x).
- **Z = up** (screen +y).

**Projection (divide by depth X), matching the cabinet:**
- `screenX ∝ Y / X`, `screenY ∝ Z / X`.
- Symmetric ~90° FOV, aspect-independent: on-glass iff `|Y| < X` and `|Z| < X` (the ROM ratio law).

**Camera / view:** one `worldToEye` remap carries native world → eye space (the eye convention the
shared `perspective`/`transform` expect, looking down −Z). This is the single remap that replaces
every `*_ORIENT`.

## The mechanical flip (current → native)

Every position/velocity literal and axis reference converts by the permutation:

```
native = [ -current.z ,  current.x ,  current.y ]
         (depth=-z)     (right=x)     (up=y)
```

Examples:
- A TIE at "depth 4000, centred": `[0, 0, -4000]` → `[4000, 0, 0]`.
- Off-glass-high seat `[0, 3960, -4000]` → `[4000, 0, 3960]` (up = 3960).
- Off-glass-right seat `[3960, 0, -4000]` → `[4000, 3960, 0]` (right = 3960).

The C_PV/C_PS/aim laws then read `depth = pos[0]`, `right = pos[1]`, `up = pos[2]`, with
`|right| < depth` and `|up| < depth`.

## Staging (each stage verified green before the next)

1. **Core math + convention (this doc).**
2. **Space phase pilot:** `sim.ts` TIE/space positions + `gameRules`/`tie-status` laws + `viewMatrix`
   → native; flip the space/fire-gate/sights/aim tests; retire `TIE_ORIENT`. Verify green + eyeball.
3. **Surface phase:** towers/turrets/grid + `SURFACE_ORIENT`/`TOWER_ORIENT`/`GROUND_MODEL_SCALE`.
4. **Trench phase:** channel/walls/port + `PORT_ORIENT`.
5. **Model data (`models.ts`)** re-authored to native where a per-model bake is still needed.
6. **Sweep** the remaining test files (parallel), full-suite green, citation/comment gates, then
   visual verification of all three phases via `just serve` → `/star-wars/`.

AC #5 still holds: placement constants stay fudged (TODO markers), not re-derived here.

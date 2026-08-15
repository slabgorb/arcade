# df2-6 — VISUAL playtest for orientation traps + still-frame proof

The df2 capstone: confirm the integrated **static still** renders with correct
orientation and colour **before** any physics (playbook §4). df2-1..df2-5 transcribed
and gated each piece in isolation (palette, MESS0 charset, DEFB6 objects, BLK71
terrain); this story composes them into one frame (`plugins/defender/src/core/scene.ts`
`composeStaticFrame`, mounted by `main.ts`) and looks at it.

Screenshots were taken from **this checkout's own dev server** — port 5270 was held by a
sibling checkout, so per the CLAUDE.md serve pin this tree was served on a free port
(`npx vite --port 5311 --strictPort`) rather than killing theirs.

## The orientation trap this story caught (and settled)

The charset (`charset.ts`) and object (`objects.ts`) source comments deferred one
question to df2-6: is the Williams image cell **row-major or column-major?** The visual
playtest answered it.

| | |
|---|---|
| `before-charset-garbled.png` | The first composition read cells **row-major**. The title is unreadable noise — the trap. |
| `after-still-frame.png` | Cells read **column-major** (`bytes[col*height + row]`). "DEFENDER" is legible, the player ship (PLAPIC) reads as a ship, and the green planet surface (BLK71 terrain) runs upright along the bottom. |

The fix is source-proven, not guessed: `LETTRD`'s 24 bytes (`defender/MESS0.SRC:558`)
only spell a 'D' read column-first; UFOP1/PLAPIC only read as a saucer/ship column-first.
Locked by `tests/still-frame.test.ts` ("'D' has a solid left vertical stroke and a top
bar — the column-major signature, impossible row-major"). The packing-agnostic
df2-3/df2-4 blit suites stayed green across the fix, as their comments anticipated.

## Orientation & colour confirmed (playbook §4)

- **Upright:** text at the top, planet surface at the bottom (rows ~186–232, a wide
  left-to-right band), object between them — no axis swap, flip, or rotation.
- **Colours by index, never invented:** title WHITE (palette 9), planet GREEN (palette
  3), object carries its own DEFB6 indices; every framebuffer cell is a 4-bit palette
  entry 0..15 decoded by the shell (`render.ts indexToRgba`).

## DIFFER, not just 200 (the canonical-serve lesson)

`control-lobby-fallback.png` is `/nonsense-defender-control/` on the same server — it
serves the **lobby** (page title "Slabcade"), whereas `/defender/` serves the game
(page title "Defender") with the render above. They DIFFER; a bare all-200 sweep would
have proved nothing. The mechanical DIFFER check already runs in
`tests/canonical-serve.test.mjs`; this is its visual confirmation.

## Accessibility forward-note (carried, binds df4/df7)

df2 renders only static frames — nothing strobes here. df4/df7 inherit the constraint:
the original's smart-bomb/death full-screen flashes must become **freeze/fade/particle**
(owner photosensitive) — recorded in `sprint/context/context-epic-df2.md` and df1.

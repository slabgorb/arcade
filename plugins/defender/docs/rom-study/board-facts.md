# Board facts — the secondary source (MAME), pinned and prose-only

The 1981 source states the *software's* world; it never states the board's
clocks, video timing, address decode or PROM population. For those facts the
secondary source is MAME's williams driver pair — `williams.cpp` and
`williams_m.cpp` under src/mame/williams/ — and this file records them under
the discipline the epic fixed: **MAME is GPL — cited in prose, never copied.**
Identifiers and constants are named; no MAME source line is ever quoted, and no
MAME pointer ever wears citation backticks, because backticks mark the
gate-covered, byte-verified citations into the vendored 1981 tree. Where the
1981 source states anything adjacent, the fact's row carries that backticked
in-tree anchor, claim-covered under the df1-1 gate.

**The pin.** Every MAME file:line pointer below was read at one commit —
pinned as a secondary source in docs/reference-sources.md:
mamedev/mame @ aaac1f637a8cbf23724b61ea578d70a32f2cf4fe. A pointer without a
pin is not checkable; re-verify any of these lines against that object, not
against whatever HEAD a clone happens to be parked on.

## The facts

| Fact | Board truth (MAME, prose, at the pin) | In-tree anchor |
|------|----------------------------------------|----------------|
| Clocks | The 6809E main CPU runs at 1.0 MHz: a 12 MHz master crystal divided /3/4 — MASTER_CLOCK at williams.cpp:1531, the CPU config at williams.cpp:1537. | — (the source never states the board clocks) |
| Exact refresh | 60.09615 Hz = an 8 MHz pixel clock (12 MHz × 2/3) over 512 × 260 totals — the set_raw video chain at williams.cpp:1556. The author's nominal 60 Hz stays a separate number (brief.md §3). | — |
| Visible area | 292×240 pixels — Defender's own set_visarea window at williams.cpp:1601. | — |
| Banked ROM | Writes to $D000-$DFFF hit bank_select_w (williams.cpp:505): the written value selects what the $C000-$CFFF window shows — exactly the register the source names MAPC (`defender/PHR6.SRC:11`), with $D000-$FFFF resident ROM above it. | `defender/PHR6.SRC:11` |
| Video IRQ (OQ-1) | The VA11 scanline-count line drives the interrupt into PIA CB1 — williams_m.cpp:27-28 — the B-side model the handler's own CRB $04/$05 writes fit; the `*CB2 IRQ` pin comment (`defender/PHR6.SRC:135`) is an author slip. | `defender/PHR6.SRC:135` |
| COUNT240 IRQ (OQ-2) | The COUNT240 signal (high from scanline 240, the AND of the upper count bits) arrives on PIA CA1 — williams_m.cpp:36-37 — and the RESET setup (`defender/ROMF8.SRC:64`) leaves that interrupt disabled; see open-questions.md OQ-2. | `defender/ROMF8.SRC:64` |
| WDOG decode (OQ-4) | MAME folds $C3FC through the $C010 register's $03E0 mirror into the video-control write (williams.cpp:500) and places the watchdog reset at $C3FF only (williams.cpp:499) — so the WDOG stroke the source aims at $C3FC with the $38/$39 flip pair (`defender/PHR6.SRC:14`) is the screen-flip write. | `defender/PHR6.SRC:14` |
| Decoder PROMs | Original Defender PCBs carried a single video-decoder PROM; cocktail-capable boards carried two (decoder2/decoder3, the note at williams.cpp:29-31) to allow the screen inversion the RED software drives via WDATA $38/$39 (`defender/PHR6.SRC:15`). | `defender/PHR6.SRC:15` |

## What these facts settle

The three open questions the dossier routed here are settled in
open-questions.md's own sections (OQ-1, OQ-2, OQ-4), each cross-referencing
this file: the video interrupt is CB1 (the CB2 comment is the slip), the
COUNT240/CA1 interrupt is never enabled — the game polls the beam counter —
and the $C3FC "watchdog" stroke is the screen-flip video-control write, with
the true watchdog reset at $C3FF. Every fact's claim in
claims/08-board-facts.json anchors an in-tree line and carries its MAME
pointer as `corroboration` — schema-validated, **never byte-opened** (the
GPL wall again): the byte gate opens only the vendored 1981 tree.

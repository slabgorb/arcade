# Open questions — Defender ground truth (OQ-1..OQ-5)

The five gaps the `rom-source-study` preflight (`brief.md`) left OPEN, carried
here from the design spec. Each states its evidence, cited into the vendored
tree, and its disposition — a Resolved record (OQ-1/2/4, settled by df1-4's
board-facts.md), or why it stays a note. Nothing
here is settled on faith; MAME-side facts are named in prose and never
backtick-cited (secondary source, GPL — cited, never copied).

## OQ-1 — CB1 vs CB2: which PIA line carries the video IRQ

The source comments the interrupt pin as CB2 — `*CB2 IRQ` sits above the PIA
equate at `defender/PHR6.SRC:135` — but MAME wires the VA11 video count line to
CB1 (williams_m.cpp:27-28 at the pinned SHA), and the handler's
control-register values fit the CB1 model. One of the two namings is a slip,
most likely the source comment's.
**Resolved (df1-4):** CB1. The handler's own interrupt-control writes are to
CRB — the $04 mask on entry (`defender/DEFA7.SRC:1934-1935`), then the $05
re-arm on exit (`defender/DEFA7.SRC:1997-1998`) — so the video interrupt is a
B-side line, exactly as MAME wires VA11 to CB1; the CB2 comment is recorded in
board-facts.md as an author slip. The port implements the CB1 model.

## OQ-2 — COUNT240/CA1 enablement in game mode

COUNT240 is MAME's name for the 240th-scanline interrupt — the word appears
nowhere in the vendored source (measured; the in-tree trace is the `*CA1 IRQ`
pin comment at `defender/PHR6.SRC:131`). Open: is the CA1 interrupt enabled
during play, or does the handler distinguish phases purely by polling the
`VERTCT` beam counter? The answer is decoded from the RESET PIA setup at
`defender/ROMF8.SRC:64`.
**Resolved (df1-4):** the COUNT240/CA1 interrupt is never enabled. The RESET
setup's final control write — ORA #$10 then STA 1,X
(`defender/ROMF8.SRC:80-81`) — leaves CRA = $14: bit 0 clear, so the CA1
interrupt stays disabled (the $10 arms CA2 for the SLAM switch), and no later
code writes that register. The handler distinguishes beam phases purely by
polling `VERTCT`. Recorded in board-facts.md.

## OQ-3 — defend.3 upper-half packing

Three modules co-load into the $F800-$FFFF upper half: the `DEFB6` tail,
`ROMF8`'s `ORG $FB00` marked TEMPORARY (`defender/ROMF8.SRC:63`), and
`SAMEXAP7` at the $FC60 appearance-vector origin (`APVCT EQU $FC60`,
`defender/PHR6.SRC:100`). The build notes themselves warn — "BEWARE OF ORDER OF
LOADING" (`defender/INFO.SRC:8`) — and the exact byte boundaries inside the
defend.3 ROM image are **unproven without assembling** the tree. **Disposition:**
stays open as a provenance caveat; no df1 story assembles the source, and no
port decision hangs on the packing.

## OQ-4 — the WDOG decode model

The source strokes the watchdog at `WDOG EQU $C3FC`
(`defender/PHR6.SRC:14`) with the $38/$39 screen-flip data pair, while MAME
decodes $C3FC through the $C010 mirror into its video-control write and places
the watchdog reset at $C3FF only. The two models must be reconciled before any
watchdog/screen-flip seam is built.
**Resolved (df1-4):** the $C010 register's $03E0 mirror folds $C3FC onto the
video-control write, so the source's WDOG stroke with the $38/$39 flip pair
(`defender/PHR6.SRC:14-15`) is the screen-flip write wearing the watchdog's
name; the true watchdog reset sits at $C3FF only. Recorded in board-facts.md;
the port's watchdog/flip seam follows this decode.

## OQ-5 — the $D000 2716-split ledger wording

The release ledger calls GREEN the re-cut "FOR 2 2716'S INSTEAD OF 1 2532 AT
D000" (`defender/INFO.SRC:17-18`), yet the RED parent ROM set also ships 2K
chips at $D000. Presumably RED inherited the GREEN split; the ledger never says
so. **Disposition:** a provenance note only — chip packaging has no bearing on
the port, so this is recorded and closed as a note, not routed to any story.

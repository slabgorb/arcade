# Agent prompt templates — ROM source study

Fill the `[BRACKETS]`. Written against failures observed in the centipede baseline run
(2026-07-18): one drifted citation in 21, radix inheritance mis-stated, the author's
design doc dismissed unread, nominal/exact frame rate conflated. Do not trim.

---

## Preflight / study agent (run alone, blocking — its brief is the dossier's spine)

> You are establishing ground truth for a brand-new faithful browser clone of [GAME].
> NO implementation exists — your output is the reference dossier the first line of code
> will be built from, so a wrong claim here propagates into everything.
>
> PRIMARY SOURCE (read-only): `[SRC]` (LF greppable copy — never read `[SRC-CRLF]`).
> SECONDARY SOURCE (read-only): the MAME driver at `~/Projects/mame/src/mame/atari/[DRIVER]`.
> The assembler source wins on game logic; MAME wins on board-level facts the source
> never states (clocks, exact refresh, screen geometry, IRQ generation). A disagreement
> between them is an OPEN QUESTION you record — never a silent pick. Copy code from
> neither into the repo (copyright / GPL).
>
> Answer FIVE questions, in order, each with byte-exact file:line citations:
>
> **0. WHICH REVISION?** List every complete release in the tree. Pick the
> implementation target (usually the final release), say why, and list per-revision
> artifact gaps — a late revision that re-cut only program EPROMs still ships an
> earlier revision's picture/sync ROMs. Cite the release ledger, not the dir listing.
>
> **1. WHAT SHIPPED?** Linker map + the author's `;LINK COMMAND` comment + `.INCLUDE`
> transitively + conditional assembly. Then match EVERY remaining source file to a ROM
> part number in the release DOC — raster data ROMs (pictures, sync/color PROMs) are in
> no link string yet shipped as chips. Produce: file → chip mapping, plus a list of
> files that genuinely never shipped, with the reason each.
>
> **2. WHAT RADIX?** Per file — name which file SETS `.RADIX` and which modules INHERIT
> it via `.INCLUDE`. A module with no `.RADIX` of its own is NOT decimal. Note the
> trailing-period decimal convention and any module that saves/restores the radix.
>
> **3. WHAT TIMEBASE?** IRQ rate ≠ frame rate. Derive: IRQs per frame and which is
> VBLANK-flagged; what gates the mainloop; nominal AND exact rate as separate numbers.
> Corroborate three ways: author comments, timer arithmetic, MAME machine config —
> and record MAME's own hedges verbatim.
>
> **4. WHAT DID THE AUTHOR TELL YOU?** Read the `.DOC` files FIRST, not last. Identify
> which is the author's program/design documentation and which is the ROM part ledger.
> Summarize what the design doc gives an implementer that the assembly alone does not.
>
> THE CITATION RULE (same as rom-fidelity-audit): a checker will re-open every line you
> cite byte-for-byte; a claim that fails is DELETED. Re-open every citation yourself
> before finishing, and copy the LINE NUMBER from numbered tool output (`grep -n`,
> `awk`/`sed` printing line numbers) at that moment — never from memory or from
> arithmetic on a range you read earlier. Both test runs on centipede got every
> verbatim text right and still drifted line numbers by one.
>
> Return the brief as raw markdown. Under [LENGTH]; be decisive — "probably" only where
> you genuinely could not establish the fact, and then file it as an open question.

---

## Subsystem mapper (fan out AFTER the brief exists, one per subsystem)

> You are mapping the [SUBSYSTEM] subsystem of [GAME] for the implementation dossier.
> GROUND TRUTH (do not re-derive): [PASTE brief.md].
> Scope: [ROUTINES/REGIONS]. For each routine: what it does (values, not adjectives),
> its inputs/outputs (zero-page state it reads/writes), when the mainloop or IRQ calls
> it, and the `.SBTTL` + line citation. Note every constant an implementer will need,
> decoded per the radix rules in the brief. Flag — do not resolve — anything the design
> doc contradicts. Write claims JSON to `[OUTPUT_PATH]` (schema in SKILL.md); the
> citation checker will verify every line byte-for-byte.

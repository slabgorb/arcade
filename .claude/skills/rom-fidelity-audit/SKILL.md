---
name: rom-fidelity-audit
description: Use when comparing a game clone against the original arcade machine's assembler source or ROM — auditing an implementation for fidelity, verifying game constants against primary source, checking whether a port matches the original, or when a clone "feels wrong" (too fast, too easy, wrong colours) and you want to know why.
---

# ROM Fidelity Audit

Compare a clone against the original arcade source and produce findings a human can rule on without re-reading the assembly.

**Core principle: an unverified finding is worse than no finding.** It costs a week to act on and looks exactly like a real one. Every claim must be falsifiable in one grep.

<run>
Preflight (BLOCKING — answer all three before auditing anything):

```bash
SRC=~/Projects/<game>-source-text     # the LF copy — never the CRLF sibling

# 1. WHAT SHIPPED? The linker map is the authority, not the directory listing.
grep -iE "^BIN:|=OBJ:" $SRC/*.MAP           # the link string
grep -n "\.INCLUDE" $SRC/*.MAC              # .INCLUDEd files ship too — add transitively
grep -n "\.IF NE\|\.IF EQ" $SRC/*.MAC       # conditional assembly: FOO=0 means it NEVER assembled

# 2. WHAT RADIX? PER FILE — it varies. If 16, bare numbers are HEX; decimals carry a
#    trailing period (20.). Asteroids mixes .RADIX 16 and .RADIX 10 across its files.
grep -n "\.RADIX" $SRC/*             # check EVERY file, not just one

# 3. WHAT FRAME RATE? Never assume 60. Derive it:
grep -n "IRQ\|INTERRUPT\|NMI" $SRC/<irq-handler>.MAC   # IRQ rate (byte wrap == 1 sec => 256Hz)
grep -n "FRTIMR\|FRAME" $SRC/<exec>.MAC                # IRQs per game frame (mainloop spin)
# rate = IRQ / IRQs-per-frame. Then grep the author's own comments to corroborate.
```

Then run the phases. Build the citation checker (TDD) before dispatching any auditor:

```bash
cd <game> && npm test -- citations     # must be green after every phase
```
</run>

<output>
Preflight yields three written facts that every downstream agent is handed: the
shipped-module allowlist, the radix, and the frame rate.

The audit yields:

- `docs/audit/findings/pair-*.json` — machine-checked findings. Each carries a
  citation on BOTH sides (source file+line, our file+line) plus the verbatim text
  of each line, a class, a claim, a recommendation, a size, and (after refutation)
  a verdict.
- `docs/<date>-<game>-primary-source-audit.md` — the human-facing document:
  the traps, the timebase, a Rosetta glossary, findings by subsystem, what the
  secondary sources got wrong, limitations, and a **ruling sheet** of merged
  clusters for the human to rule on.
- A sprint epic, filed only from the clusters the human rules "fix".

The checker prints one error per bad finding and exits non-zero; a finding that
fails is DELETED, not repaired.
</output>

## The Iron Law

**Establish the timebase, the radix, and the shipped-file set BEFORE dispatching a single auditor.**

Skip preflight and every auditor bakes the same wrong assumption into every finding. You pay for a mass rebase — or worse, you don't notice.

## Why a wrong timebase is the worst failure

The arcade counts **frames in integers**; your clone counts **seconds in floats**. Converting needs the frame rate. Get it wrong and:

- A speed constant that is genuinely wrong will **compute as a match**.
- It gets filed `CONFIRMED`.
- **Refutation only attacks divergences. A `CONFIRMED` is never challenged.**
- It ships in the audit as *proof you match the arcade*.

**A bad unit does not invent divergences. It manufactures agreement — and agreement is never audited.**

This has now happened on two games with two different agents. On Asteroids, an agent *derived the true rate* (62.5 Hz), wrote "not worth chasing per-constant," and then on the next line declared a `x/60` constant an exact match.

**Never assume 60 fps.** Tempest is 28.44. Asteroids is 62.5.

## Phases

| Phase | What | Notes |
|---|---|---|
| 0 | **Preflight** | Blocking. See `<run>`. |
| 1 | **Citation checker** (TDD) | Build before auditing. |
| 2 | **Paired auditors** | One per source↔ours subsystem. Fan out. |
| 3 | **Coverage review** | One agent over ALL findings. Not optional. |
| 4 | **Refutation** | Adversarial, batched ~6/agent. |
| 5 | **Synthesise + cluster** | Document + ruling sheet. |
| 6 | **Human rules** | You recommend. They decide. |

## Phase 1 — The citation checker

Every finding cites **both** sides plus the **verbatim text** of each line. The checker re-opens each cited line, compares byte-for-byte, and rejects citations to modules that never shipped.

**A finding that fails is DELETED, not repaired.** A miscited finding is one the auditor never verified; repairing it launders a guess into evidence.

The source is copyrighted — never copy it into the repo. Point the checker at an external dir and degrade gracefully when absent, so the schema and *ours*-side checks still run in CI.

Reference implementation: `tempest/tools/audit/` + `tempest/tests/audit/citations.test.ts`.

## Finding classes

| Class | Meaning |
|---|---|
| `DIVERGENCE` | We differ and are probably wrong |
| `CONFIRMED` | We match — **record these**; they are what makes the audit trustworthy |
| `BOOK_WAS_WRONG` | Primary source contradicts a constant taken from a secondary source |
| `STRUCTURAL` | Differs only because we're float/`dt` and the arcade is integer/IRQ |
| `NO_COUNTERPART` | Exists in the arcade, absent from us (`ours: null`) |

An auditor filing zero `CONFIRMED`s went hunting, not auditing. Distrust it.

## Phase 3 — Coverage review (the method's blind spot)

**Refuters attack findings one at a time, and only divergences. By construction they cannot see:**

- **False `CONFIRMED`s** — never attacked, printed as proof you match.
- **Cross-pair contradictions** — two auditors, same lines, opposite claims. One is wrong.
- **Scope holes** — a subsystem nobody audited.
- **Fragmentation** — nine findings that are one change.

One agent reads *all* findings together and reports these. On Tempest it caught two false `CONFIRMED`s and an entire unaudited subsystem. **Do not skip it.**

## Phase 4 — Refutation

Each refuter's job is to **kill** its findings. Require it to:

1. Re-open both cited lines.
2. **Decode the macros.** An operand you didn't decode is one you don't understand — both real kills on Tempest were undecoded operands.
3. Check our cited line is the *governing* code, not overridden downstream.
4. **Hunt the unit/radix/BCD error.** Scores are often BCD with an implicit low digit (stored `15` = 150 points).
5. Check the claim isn't self-refuting — read the claim, not the title.

**Default to REFUTED under uncertainty.** Cheaper to re-examine a wrongly-killed finding than to act on a wrongly-confirmed one.

Expect a **low kill rate and a high correction rate** — the citation gate already removed fabrications, so what's left fails by *misreading*. Tempest: 2 killed, 36 of 116 materially corrected. **If nothing is corrected either, your refuters rubber-stamped.**

## Phase 5 — Cluster before you file

Raw findings over-count wildly. Tempest: 114 fix-findings ≈ 230 points raw, **~108 merged across 15 clusters**. Nine separate findings were one change.

Each cluster gets a name, the ids it subsumes, an honest size, and **dependencies**. Some fixes are prerequisites — you cannot cap concurrent enemies without the queue that holds the surplus. **The timebase rebase lands first**, or every later numeric fix re-bakes the wrong base.

## Red flags — STOP

- "The frame rate is probably 60." → Derive it. It usually isn't.
- "Not worth chasing per-constant." → You just found a global error and dismissed it.
- "The radix is 16." → In *which* file? It varies. Asteroids mixes 16 and 10. And a trailing
  period makes a decimal literal inside a hex file — `LDA I,10.` is 10, not 16.
- "This constant matches!" → On what timebase? Show the arithmetic.
- Citing a file because it's in the directory. → Check the link map.
- "The auditor said so." → Did it decode the macro?
- Filing an epic straight from the findings list. → Cluster first.
- Zero `CONFIRMED`s, or zero corrections from refuters. → Your agents are performing, not working.

## Rationalizations

| Excuse | Reality |
|---|---|
| "I'll establish the timebase as I go" | Every auditor bakes in the wrong one. Mass rebase, or silent false matches. |
| "The citation is close enough" | Delete it. A miscited finding was never verified. |
| "It's obviously the authentic data" | Check it assembled. Dead code looks authentic. |
| "60 fps is standard" | Two games, two rates, neither 60. |
| "The refuters will catch it" | Not if it's filed `CONFIRMED`. They never look. |
| "One finding per fix keeps it granular" | 230 points of granularity nobody can schedule. |

## Common mistakes

- **Auditing the CRLF copy.** Sources exist twice (`foo-source/`, `foo-source-text/`). Use the LF one; forbid the other. Line numbers agree, bytes don't.
- **Letting agents run git.** Concurrent auditors collide on the index. They write files; the controller commits.
- **Trusting a report that a file was written.** One refuter reported detailed results for a file it never created. Verify the artifact.
- **Believing your own secondary docs.** On Tempest the book was wrong 9 times — *and so was an internal ROM-extract doc that the code cited as authority.*

## Worked example

Tempest, 2026-07-12. 236 findings, 116 attacked, 114 held. Found the sim ran **2.11× too fast** (28.44 fps, not 60), the enemies are a **bytecode VM** we had hand-written as five state machines, and two shipped sounds **wired to the wrong cues**.

- Audit: `tempest/docs/2026-07-12-tempest-primary-source-audit.md`
- Plan: `tempest/docs/superpowers/plans/2026-07-12-primary-source-audit.md`
- Agent prompts: `prompts.md` beside this file.

## Sources on disk

`~/Projects/{tempest,asteroids,battlezone,red-baron,star-wars-1983}-source-text` (LF — cite these) and `-source` (CRLF — never cite).

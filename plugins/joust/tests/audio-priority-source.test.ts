// tests/audio-priority-source.test.ts
//
// Story jt5-5 (epic jt5) — RED phase (Mr. Praline / TEA). AC4 and AC6 are claims
// about PROSE, and prose is the surface this epic keeps shipping wrong: jt8-6
// spent three review rounds on it, and all three defects were a sentence
// asserting more than its cited line supports. `tests/audit/citations.test.ts`
// cannot help — it re-opens the `source.line`/`verbatim` PAIR and is blind to a
// line reference embedded in a comment BODY, which is exactly where both of
// these live. So they get a source-text guard or they get nothing.
//
// ─── AC4: the SND routine is :761-773, and two files say otherwise ───────────
// `SND` runs from its label to the shared `NOSND RTS`:
//
//   761: SND	LDA	,X+		GET SOUND PIRORITY      <- entry
//   ...
//   769: SN1NS	STA	SPRI		NEW PIRORITY            <- accept path
//   772: 	STX	SNDPTR		SAVE SOUND TABLE ADDRESS
//   773: NOSND	RTS                                      <- the only exit
//
// Two truncations are in flight and they fail differently, which is why both are
// named here rather than folded into one "must say 761-773" assertion:
//
//   • `:761-768` (the epic description) stops at the REFUSAL branch. It omits the
//     entire accept path, so a reader who checks the cited span sees a routine
//     that can only ever say no. That is not a missing detail, it is the other
//     half of the algorithm.
//   • `:761-772` (`src/shell/audio.ts:164`, copied into
//     `tests/audio-rom-citations.test.ts:88`) drops only `NOSND RTS` — the label
//     the refusal branch at :768 actually jumps TO. A span that excludes its own
//     branch target cannot be the routine.
//
// This is not a contested reading. joust's own dossier already had it right at
// `docs/rom-study/subsystems.md:97` and `docs/rom-study/claims/subsystems.json:229`
// ("SND, SYSTEM.SRC:761-773"), written before this story existed. The audio
// files are the outliers, and the fix is to make the tree agree with itself.
//
// ─── AC6: absence has to be argued, not merely achieved ─────────────────────
// `SYSTEM.SRC:762`'s `BMI 1$` — "SOUND PIRORITYS OF 128 TO 255 ARE ALWAYS SENT" —
// is deliberately not ported. Unbuilt code leaves no trace, so the next person to
// diff our arbitration against the ROM finds a branch we do not have and no way
// to tell a decision from an oversight. The comment is the whole deliverable.
// ─── RED audit — 5 of these 8 fail today ────────────────────────────────────
// The three that pass are all guards against a REGRESSION rather than drivers of
// a fix, and each names a specific way the tree could get worse:
//   • `no file truncates the routine to :761-768` — nothing in the tree says that
//     today; the epic DESCRIPTION does, and this is what stops it being copied in.
//   • `agrees with the extent joust's own dossier already recorded` — green
//     because `subsystems.md`/`subsystems.json` were right before this story. It
//     exists so a later "correction" of the audio comment reds the tree rather
//     than quietly reintroducing the disagreement.
//   • `does not misattribute the machine` — joust is Williams; nothing calls it
//     Atari yet, and in a repo of six Atari cabinets that is one careless
//     sentence away from being false.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')

/** Every file that carries a prose reference to the SND routine's extent. */
const EXTENT_BEARING = [
  ['src', 'shell', 'audio.ts'],
  ['tests', 'audio-rom-citations.test.ts'],
]

describe('jt5-5 AC4 — the SND routine is cited at its true extent, :761-773', () => {
  it('no file still truncates the routine to :761-772 (the span that omits NOSND RTS)', () => {
    const offenders = EXTENT_BEARING.filter((p) => /SYSTEM\.SRC:761-772/.test(read(...p))).map((p) =>
      p.join('/'),
    )
    expect(
      offenders,
      ':768 BLO branches to NOSND at :773, so a span ending at :772 excludes its own ' +
        `branch target. Still truncated: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('no file truncates the routine to :761-768 (the refusal half, with no accept path)', () => {
    const offenders = EXTENT_BEARING.filter((p) => /SYSTEM\.SRC:761-768/.test(read(...p))).map((p) =>
      p.join('/'),
    )
    expect(
      offenders,
      ':769-772 is SN1NS, where an ACCEPTED sound stores its priority and table pointer. ' +
        `A span ending at :768 describes a routine that can only refuse. Offenders: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  it('the shipped manifest comment cites the routine as :761-773', () => {
    expect(
      read('src', 'shell', 'audio.ts'),
      'CUE_SOURCES.priority is documented as SND`s arbitration key — it must name the whole routine',
    ).toMatch(/SYSTEM\.SRC:761-773/)
  })

  it('agrees with the extent joust`s own dossier already recorded', () => {
    // Corroboration, not duplication: these two were written independently of
    // this story and independently of each other, and both say 761-773. If a
    // future edit "corrects" the audio comment back, this catches the drift by
    // showing the tree disagreeing with itself rather than with a bare number.
    expect(read('docs', 'rom-study', 'subsystems.md')).toMatch(/SND`?,? ?`?SYSTEM\.SRC:761-773/)
    expect(read('docs', 'rom-study', 'claims', 'subsystems.json')).toMatch(/SYSTEM\.SRC:761-773/)
  })
})

describe('jt5-5 AC5 — JT53-004`s consequence stops resting on a table-definition row', () => {
  interface Claim {
    id: string
    claim: string
    source: { file: string; line: number; verbatim: string }
  }
  const claims = (): Claim[] => {
    const parsed: unknown = JSON.parse(read('docs', 'rom-study', 'claims', 'audio.json'))
    const rows = Array.isArray(parsed)
      ? parsed
      : ((parsed as { claims?: unknown[] }).claims ?? [])
    return rows as Claim[]
  }

  it('whatever asserts "never steals" is cited to the ROUTINE, not to :8108', () => {
    // Deliberately shape-agnostic: AC5 requires the consequence to stop resting
    // on a row that cannot support it, and both honest fixes are allowed — move
    // the clause onto a mechanism cite, or split JT53-004 so :8108 keeps only the
    // priority-006 fact it genuinely does support. What is NOT allowed is the
    // clause continuing to sit on the FCB row.
    const stealing = claims().filter((c) => /never steals|cannot steal|does not steal/i.test(c.claim))
    expect(
      stealing.length,
      'the JT53-004 consequence must survive this story somewhere — deleting the claim ' +
        'outright would lose a true statement about the machine',
    ).toBeGreaterThan(0)
    for (const c of stealing) {
      expect(
        c.source.file,
        `${c.id}: a refusal is implemented by SND, so the claim must cite SYSTEM.SRC`,
      ).toBe('SYSTEM.SRC')
      expect(
        c.source.line,
        `${c.id}: JOUSTRV4.SRC:8108 is the table DEFINITION — it says what SNELWD's ` +
          'priority is, and nothing whatever about what happens when two sounds collide',
      ).not.toBe(8108)
    }
  })

  it('the surviving claim scopes its consequence to something that is now TRUE of us', () => {
    // Before this story the clause was false in mechanism for our port: nothing
    // arbitrated, so "never steals" described only the machine. After it, the
    // clause holds here too — and `jt5-5 joust` proves it by executing it. What
    // this guards is the third option nobody should take: leaving the sentence
    // as-is and re-pointing the citation to make the gate go green.
    const stealing = claims().filter((c) => /never steals|cannot steal|does not steal/i.test(c.claim))
    for (const c of stealing) {
      expect(
        c.claim,
        `${c.id}: cite the comparison that does the refusing, so the quoted line and the ` +
          'sentence are about the same thing',
      ).toMatch(/SYSTEM\.SRC/)
    }
  })
})

describe('jt5-5 AC6 — the unported >=128 branch is documented as a decision', () => {
  it('a comment names the 128-255 always-sent branch and says why it is absent', () => {
    const src = read('src', 'shell', 'audio.ts')
    expect(
      src,
      'the branch must be named, or a reader cannot find what the comment is about',
    ).toMatch(/128/)
    expect(
      src,
      'and the reason must be the measurable one: joust`s highest cue priority is 100 ' +
        '(extraMan/SNREPL), so the branch is unreachable for this cue set',
    ).toMatch(/\b100\b/)
  })

  it('does not misattribute the machine — joust is a Williams title, not an Atari one', () => {
    const src = read('src', 'shell', 'audio.ts')
    expect(
      src,
      'this arcade is six Atari cabinets and one Williams; the sound ROM being described is Williams`s',
    ).not.toMatch(/Atari/i)
  })
})

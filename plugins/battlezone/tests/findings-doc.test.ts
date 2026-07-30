// tests/findings-doc.test.ts
//
// Story bz1-2 — RED phase (The Jesus / TEA).
//
// ATTESTATION guard (not a content audit). The committed whole-game findings doc
// `docs/battlezone-1980-source-findings.md` is the citation authority for every
// later bz1 story. Its per-fact CITATIONS are audited by the Reviewer against the
// quarry — that is prose review, not something a unit test can judge. What a test
// CAN cheaply guarantee, and what keeps a sneaky dev from silently skipping the
// doc, is: it exists, it is substantive (not a stub), and it names its provenance.
//
// This reads the committed doc from battlezone's OWN tree — it never reaches into
// the gitignored, checkout-local `reference/` quarry, so it passes in a fresh
// clone with no quarry present.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// tests/findings-doc.test.ts → repo root is one level up from tests/.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOC = join(root, 'docs', 'battlezone-1980-source-findings.md')

describe('findings doc — battlezone-1980-source-findings.md (attestation)', () => {
  it('exists under battlezone/docs/', () => {
    expect(existsSync(DOC), 'docs/battlezone-1980-source-findings.md must exist').toBe(true)
  })

  it('is substantive — a whole-game distillation, not a stub', () => {
    const text = existsSync(DOC) ? readFileSync(DOC, 'utf8') : ''
    // A doc covering roster+scoring, the 21-obstacle table, per-model vertex
    // specs, difficulty, radar, and sound inventory is many KB. 2000 chars is a
    // deliberately low floor that still fails an empty/placeholder stub.
    expect(text.length).toBeGreaterThan(2000)
  })

  it('cites its provenance — the 6502disassembly.com Battlezone quarry', () => {
    const text = existsSync(DOC) ? readFileSync(DOC, 'utf8') : ''
    expect(text).toContain('6502disassembly.com')
  })
})

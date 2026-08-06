// tests/claims-helper-source.test.ts
//
// Story jt9-31 — RED phase (Tyr One-Handed / TEA). The joust claims loader's
// shape-check has ZERO coverage: measured by the jt9-2 Reviewer with mutation M8
// (inject `return value as Claim` as the first line of asClaim and the whole
// joust suite stays green). jt8-2's [LOW][SEC]/[RULE] repair narrows every parsed
// JSON value so a malformed claims file NAMES ITSELF instead of surfacing as a
// confusing `undefined` deep inside claimCovers — and nothing has ever watched it
// fire. jt9-2 moved it from a 2-file guard to the single chokepoint 29 files lean
// on, so a wrong or "simplified-away" check now silently blinds every claims
// assertion in the suite.
//
// ─── THE ACCEPTANCE BAR IS A MUTATION, NOT A GREEN RUN ───────────────────────
// Each throw in asClaim is pinned by its OWN test so that removing that one check
// reddens this suite. The map (claims.ts as of jt9-31):
//   :41 object/null/array guard  → 'a non-object / null / an array each throw'
//   :45 `id` string check        → 'a PRESENT non-string id throws'
//   :46 `claim` string check     → 'a PRESENT non-string claim throws'
//   :49 `source` file/line check → 'a source with a non-string file / non-numeric line throws'
//
// ─── THE TRAP (SM-flagged) ───────────────────────────────────────────────────
// The id/claim checks are `if (c.id !== undefined && typeof c.id !== 'string')`.
// They fire ONLY for a value that is PRESENT and non-string. A MISSING id/claim
// is legal data (the doc-comment says so) and MUST stay green — that is the
// control that stops an over-strict "fix" from re-narrowing legal claims. Feed a
// PRESENT non-string, or the mutation test is vacuous.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { asClaim, loadClaims } from './helpers/claims'

// ── node:fs is mocked so loadClaims reads a synthetic claims dir. This keeps the
//    loader's error-surfacing and its `existsSync` guard testable WITHOUT writing
//    a malformed file into the real docs/rom-study/claims/ that 29 sibling test
//    files read in parallel. Only these three are replaced; path/url are real.
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}))
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const FILE = 'FIXTURE.json'

describe('jt9-31 — asClaim shape-check (each throw pinned for mutation)', () => {
  it('a non-object throws and the message NAMES THE FILE (self-locating repair)', () => {
    for (const bad of ['a string', 42, true]) {
      expect(() => asClaim(bad, FILE), `asClaim must reject ${JSON.stringify(bad)}`).toThrow(
        /claims\/FIXTURE\.json/,
      )
    }
  })

  it('null throws and names the file', () => {
    expect(() => asClaim(null, FILE)).toThrow(/claims\/FIXTURE\.json: expected an object/)
  })

  it('an array throws and names the file', () => {
    expect(() => asClaim([{ id: 'x' }], FILE)).toThrow(/claims\/FIXTURE\.json: expected an object/)
  })

  it('a PRESENT non-string id throws — naming the file and the `id` field', () => {
    // TRAP: PRESENT, not missing. `{ id: 123 }`, never `{}`.
    expect(() => asClaim({ id: 123 }, FILE)).toThrow(/claims\/FIXTURE\.json: `id` must be a string/)
  })

  it('a PRESENT non-string claim throws — naming the file and the `claim` field', () => {
    expect(() => asClaim({ claim: 123 }, FILE)).toThrow(
      /claims\/FIXTURE\.json: `claim` must be a string/,
    )
  })

  it('a source with a non-string `file` throws', () => {
    expect(() => asClaim({ source: { file: 7, line: 10 } }, FILE)).toThrow(
      /claims\/FIXTURE\.json: `source` must carry a string `file` and a numeric `line`/,
    )
  })

  it('a source with a non-numeric `line` throws', () => {
    expect(() => asClaim({ source: { file: 'rom.mac', line: 'ten' } }, FILE)).toThrow(
      /claims\/FIXTURE\.json: `source` must carry/,
    )
  })
})

describe('jt9-31 — asClaim controls: legal data must NOT throw (stops an over-strict fix)', () => {
  it('a claim with NO source is legal data and passes through unchanged', () => {
    const value = { id: 'JT9-31', claim: 'a claim with no source' }
    expect(() => asClaim(value, FILE)).not.toThrow()
    expect(asClaim(value, FILE)).toEqual(value)
  })

  it('a MISSING id and a MISSING claim are legal (the checks are guarded by !== undefined)', () => {
    // If a "fix" drops the `!== undefined` guard, these reddens — the control that
    // keeps an empty/partial claim legal.
    expect(() => asClaim({}, FILE)).not.toThrow()
    expect(() => asClaim({ source: { file: 'rom.mac', line: 3 } }, FILE)).not.toThrow()
  })

  it('a fully-valid claim (id, claim, full source) passes through unchanged', () => {
    const value = {
      id: 'JT9-31',
      claim: 'the bird flaps',
      source: { file: 'JOUST.MAC', line: 4669, verbatim: 'FLAP' },
    }
    expect(asClaim(value, FILE)).toEqual(value)
  })
})

describe('jt9-31 — loadClaims surfaces the throw and covers the existsSync guard', () => {
  const existsMock = vi.mocked(existsSync)
  const readdirMock = vi.mocked(readdirSync)
  const readFileMock = vi.mocked(readFileSync)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns [] when the claims dir is absent — WITHOUT touching readdir (the untested guard)', () => {
    existsMock.mockReturnValue(false)
    // If the `!existsSync` guard is removed, loadClaims calls readdir on a missing
    // dir, which throws — so this both covers the guard and pins its removal.
    readdirMock.mockImplementation(() => {
      throw Object.assign(new Error('ENOENT: no such directory'), { code: 'ENOENT' })
    })
    expect(loadClaims()).toEqual([])
    expect(readdirMock).not.toHaveBeenCalled()
  })

  it('SURFACES a malformed claim rather than swallowing it into undefined', () => {
    existsMock.mockReturnValue(true)
    readdirMock.mockReturnValue(['bad.json'] as never)
    readFileMock.mockReturnValue('[{"id": 123}]' as never)
    // The whole point of the repair: a real failure names its file instead of
    // arriving as `undefined` deep inside claimCovers.
    expect(() => loadClaims()).toThrow(/claims\/bad\.json: `id` must be a string/)
  })

  it('runs asClaim over every parsed entry and returns the shaped claims (positive control)', () => {
    existsMock.mockReturnValue(true)
    readdirMock.mockReturnValue(['good.json', 'single.json'] as never)
    readFileMock.mockImplementation((p: unknown) =>
      String(p).endsWith('single.json')
        ? '{"id":"S","source":{"file":"a.mac","line":1}}' // a bare object, not an array
        : '[{"id":"A"},{"id":"B","claim":"b"}]',
    )
    const claims = loadClaims()
    expect(claims).toHaveLength(3)
    expect(claims.map((c) => c.id)).toEqual(['A', 'B', 'S'])
  })
})

// tests/helpers/claims.ts
//
// Story mc2-1 (GREEN, Yoda) — the claims-registry loader, ported from
// plugins/joust/tests/helpers/claims.ts (the hardened `asClaim` variant). One
// loader for the missile-command suite; import it, do not copy it (copying
// re-creates the drift jt9-2 removed on joust).
//
// mc SHAPE (Design Deviation D-1, mc2-1 session): a missile-command claim is the
// sibling `{id, source:{file,line,verbatim}}` shape EXTENDED with the decoded
// `symbol`, `value` and `meaning` the mc2-1 AC asks for. The nested `source`
// triple is what tools/audit/check-citations.mjs byte-verifies against the
// vendored REV-01 source; the `value` is the radix decode, re-derived from source
// independently in tests/citations-source.test.ts (the checker never parses it).

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')

export interface Claim {
  id: string
  /** The assembler symbol this claim pins (e.g. `NCITY`, `EXDONE`, `CITY1H`). */
  symbol: string
  /** The radix-decoded value (decimal number, or an expression string). */
  value: number | string
  /** One-line human meaning. */
  meaning: string
  source: { file: string; line: number; verbatim: string }
}

/**
 * Narrow one parsed JSON value to a `Claim`. The shape is CHECKED, not trusted —
 * a malformed claims file names itself instead of surfacing as a confusing
 * `undefined` deep inside `claimCovers`.
 */
export function asClaim(value: unknown, file: string): Claim {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`claims/${file}: expected an object per claim, got ${JSON.stringify(value)}`)
  }
  const c = value as Record<string, unknown>
  if (typeof c.id !== 'string') throw new Error(`claims/${file}: \`id\` must be a string`)
  if (typeof c.symbol !== 'string') throw new Error(`claims/${file}: ${c.id}: \`symbol\` must be a string`)
  if (typeof c.value !== 'number' && typeof c.value !== 'string') {
    throw new Error(`claims/${file}: ${c.id}: \`value\` must be a number or string`)
  }
  if (typeof c.meaning !== 'string') throw new Error(`claims/${file}: ${c.id}: \`meaning\` must be a string`)
  const s = c.source as Record<string, unknown>
  if (typeof s?.file !== 'string' || typeof s?.line !== 'number' || typeof s?.verbatim !== 'string') {
    throw new Error(`claims/${file}: ${c.id}: \`source\` must carry string \`file\`, numeric \`line\`, string \`verbatim\``)
  }
  return c as unknown as Claim
}

/** Every committed claim across docs/rom-study/claims/*.json, shape-checked. */
export function loadClaims(): Claim[] {
  if (!existsSync(claimsDir)) return []
  return readdirSync(claimsDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      const parsed: unknown = JSON.parse(readFileSync(join(claimsDir, f), 'utf8'))
      return (Array.isArray(parsed) ? parsed : [parsed]).map((c) => asClaim(c, f))
    })
}

const basename = (p: string): string => p.split('/').pop() ?? p

/** Does some committed claim pin a line INSIDE this cited range? */
export function claimCovers(claims: readonly Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) => basename(c.source.file) === file && c.source.line >= start && c.source.line <= end,
  )
}

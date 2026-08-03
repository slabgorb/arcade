// tests/helpers/claims.ts
//
// Story jt8-3 — the SHARED claims-registry loader, extracted from
// tests/homing-source.test.ts per the jt8-2 review's own instruction ("2× now,
// 3× at jt8-3 — extract to tests/helpers/ then, not before"). jt8-3 is "then".
//
// This is the HARDENED variant (the jt8-2 round-2 [LOW][SEC]/[RULE] repair):
// every parsed JSON value is narrowed by `asClaim` before use, so a malformed
// claims file names itself instead of surfacing as a confusing `undefined` deep
// inside `claimCovers`.
//
// jt9-2 ran the sweep this comment used to defer: the 27 suites carrying a
// pre-hardening local copy now import from here, so there is exactly ONE claims
// loader in the joust suite and 29 test files depend on it. Copy it and you have
// re-created the drift jt9-2 removed — import it.
//
// One deliberate exception: `transporter-source.test.ts` keeps a
// `claimCoversWithPrefix`, which narrows by claim-id prefix (jt2-6 needs an
// existing JT8/JT23 citation NOT to cover its range) and then delegates the
// range match here. It extends this rule; it does not duplicate it.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')

export interface Claim {
  id?: string
  claim?: string
  source?: { file: string; line: number; verbatim?: string }
}

/**
 * Narrow one parsed JSON value to a `Claim`. The shape is checked, not trusted —
 * and everything this gate reads is optional, so a claim missing `source` is
 * legal data, not an error.
 */
export function asClaim(value: unknown, file: string): Claim {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`claims/${file}: expected an object per claim, got ${JSON.stringify(value)}`)
  }
  const c = value as Record<string, unknown>
  if (c.id !== undefined && typeof c.id !== 'string') throw new Error(`claims/${file}: \`id\` must be a string`)
  if (c.claim !== undefined && typeof c.claim !== 'string') throw new Error(`claims/${file}: \`claim\` must be a string`)
  if (c.source !== undefined) {
    const s = c.source as Record<string, unknown>
    if (typeof s?.file !== 'string' || typeof s?.line !== 'number') {
      throw new Error(`claims/${file}: \`source\` must carry a string \`file\` and a numeric \`line\``)
    }
  }
  return c as Claim
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
    (c) => c.source && basename(c.source.file) === file && c.source.line >= start && c.source.line <= end,
  )
}

// src/core/mirv.ts
//
// Story mc5-1 (GREEN, Loki) — the MIRV split as PURE core data. A ballistic ICBM
// whose head height enters the MIRV band forks into up to 3 child ballistic ICBMs
// from its current position, each re-targeted at a live structure. The seeded-RNG
// idiom of spawn.ts: no clock, no ambient entropy, no shell import. The src/core
// purity sweep (tests/purity.test.ts) scans this file.
//
// ─── SOURCE OF TRUTH (REV-01 W3MAIN.MAC / W3COMN.MAC, .RADIX 16 — bare bytes HEX,
//     a trailing '.' DECIMAL). Numbers live in // comments, never /** */, so the
//     core citation scanner does not read them out of prose. ─────────────────────
//   MIRV band re-arm in ICPOSI (W3MAIN.MAC:1561-1575): CPY MIRVLO / CPY MIRVHI —
//     an ICBM is a MIRV candidate while its height is within [MIRVLO, MIRVHI].
//     MIRVLO = 128 (hex 80, W3COMN.MAC:159), MIRVHI = 160 (hex A0, W3COMN.MAC:161),
//     both INCLUSIVE. Claims MC-MIRV-LO / MC-MIRV-HI.
//   MIRVER caps POTENT at 2 → "NO MORE THAN 3 SHOTS FROM A MIRV" (W3MAIN.MAC:2717),
//     so a split emits at most 3 children. Claim MC-MIRV-MAX.
//   The split is suppressed while EXPLCT >= 12 explosions are live (W3MAIN.MAC:1531,
//     CPY I,12. / IFCS clears MIRVIX). Claim MC-MIRV-EXPSUP. (This module exposes the
//     threshold; game.ts applies it against the live-explosion count.)
//   First MIRV wave MIRVWV = 1 (W3COMN.MAC:205) — every wave, an identity gate, so no
//     wave branch here.
//
// Icbm has no `kind` field yet — cruise missiles (mc5-3) will add one, and mirvEligible
// must exclude cruise then. Until cruise exists there is nothing to exclude here.
import { launchIcbm, type Icbm, type Vec } from './icbm.js'
import { type Rng, nextInt } from '@shared/rng'

export const MIRV_LO = 128
export const MIRV_HI = 160
export const MIRV_MAX_CHILDREN = 3
export const MIRV_EXPLOSION_SUPPRESS = 12

/** A live (non-arrived) ballistic ICBM whose head is inside the MIRV band
 *  [MIRV_LO, MIRV_HI], edges inclusive — the candidate MIRVER splits. (No numeric
 *  literals in this JSDoc: the AC3 scanner's per-line stripper misses multi-line
 *  block comments, so a digit here would leak into the un-cited-literal set.) */
export function mirvEligible(icbm: Icbm): boolean {
  if (icbm.arrived) return false
  return icbm.pos.v >= MIRV_LO && icbm.pos.v <= MIRV_HI
}

/**
 * Fork `parent` into up to MIRV_MAX_CHILDREN child ballistic ICBMs, each launched
 * from the parent's current position toward an RNG-picked live target. Empty when no
 * target survives — a MIRV never fabricates a target. Pure: the only entropy is the
 * seeded `rng` (advanced in place, the sanctioned exception).
 */
export function mirvSplit(parent: Icbm, liveTargets: readonly Vec[], rng: Rng): readonly Icbm[] {
  if (liveTargets.length === 0) return []
  const children: Icbm[] = []
  for (let k = 0; k < MIRV_MAX_CHILDREN; k++) {
    const target = liveTargets[nextInt(rng, liveTargets.length)]
    children.push(launchIcbm(parent.pos, target, parent.velocity))
  }
  return children
}

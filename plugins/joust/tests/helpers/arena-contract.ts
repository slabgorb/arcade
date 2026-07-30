// tests/helpers/arena-contract.ts
//
// Story jt1-4 — the CONTRACT for src/core/arena.ts, TEA-authored, plus the
// loader. Same split as jt1-2's `.d.mts` and jt1-3's pictures contract: TEA
// states the shape and the tests that pin the behaviour; Dev writes the module.
//
// ─── WHY THIS STORY'S SEAM IS DIFFERENT FROM jt1-3's ─────────────────────────
// jt1-3 transcribed DATA, so its gate was double entry: TEA read the source
// independently and the two derivations had to agree. jt1-4 is LOGIC. There is
// no second reading of a branch structure that proves anything — reimplementing
// CKGND in the test would just be a second guess with the same blind spots.
//
// So the seam moves. The constants keep a transcription gate (they are still
// data, and they still re-derive from the vendored source). The BEHAVIOUR is
// pinned by an enumerated input→outcome table derived from the ROM's branch
// structure by hand this session, plus the properties the ACs actually name:
// landing snaps and never penetrates, wrap is the ROM's two-branch correction
// and NOT a modulus, the ceiling negates velocity exactly and clamps position,
// death is a threshold on whole pixels.
//
// ─── POSITION UNITS ──────────────────────────────────────────────────────────
// Positions are 16-bit pixel+fraction: 256 units = 1 pixel (the design spec's
// `ADDGRX` model). The ROM compares only the HIGH byte against CEILNG/FLOOR
// (`CMPA #CEILNG`), so every threshold in this contract is a WHOLE-PIXEL test
// on `pos >> 8`. A module that compared the full 16-bit value would be wrong by
// up to a pixel at every boundary.

/** Where a constant came from — same shape jt1-3 uses. */
export interface SourceAnchor {
  file: string
  startLine: number
  endLine: number
}

/**
 * One landing surface.
 *
 * `bit` is the LNDXTB/LNDYTB mask bit; `bandTop`..`bandTop+bandHeight-1` are the
 * scanlines LNDYTB marks for it; `snapY` is the whole-pixel Y the entity is
 * placed at on landing. Every snapY is `bandTop - 1` — the entity rests one
 * pixel ABOVE the surface it stands on.
 *
 * Band heights are NOT uniform: the five thin ledges span 4 scanlines each, but
 * CLIF5 is the bottom ISLAND and its `$A0` band runs Y 211..227 — SEVENTEEN
 * scanlines. (This comment said "every band is exactly 4 scanlines" until
 * jt1-7; that was wrong, and it is the first thing a later story reads.)
 */
export interface Platform {
  /** LND mask bit ($01,$02,$04,$08,$10,$20). */
  bit: number
  /** Whole-pixel Y the entity snaps to. */
  snapY: number
  /** First scanline of the LNDYTB band. */
  bandTop: number
  /** Scanlines in the band. */
  bandHeight: number
  /** Cliff records this surface belongs to, by jt1-3 label. */
  cliffs: string[]
  /** The `LDB #$xxxx-1` line that states snapY. */
  anchor: SourceAnchor
}

/** What CKGND's dispatch decides for a given mask value. */
export type GroundOutcome =
  | { kind: 'airborne' }
  | { kind: 'platform'; platform: Platform }
  /** LNDB7 — the lava troll's grip, gated on TTROLL. Behaviour lands in jt3. */
  | { kind: 'troll' }

/**
 * One entry of the BCKCOL cliff-side collision path (JOUSTRV4.SRC:6799-6915).
 *
 * This is a SEPARATE mechanism from landing, and open-questions §4 asked how
 * far it could be traced. Answer: all the way. BCKXTB/BCKYTB is a box
 * broad-phase; on a hit BCKCOL dispatches on the mask, dereferences that
 * cliff record's collision-span pointer (`LDY [CLIF1L]` — the very tables
 * jt1-3 transcribed) and walks it from an (originX, originY) origin.
 *
 * THE TRAP: the bit assignment is NOT the landing table's. BCKCOL has eight
 * bits, one per cliff with left and right SEPARATE; LNDXTB has six, with the
 * pairs merged. Bit 4 means CLIF3L here and CLIF4 there. Reusing one mapping
 * for the other produces collisions against the wrong geometry.
 */
export interface BackgroundSurface {
  /** BCKXTB/BCKYTB mask bit (0..7 → $01..$80). */
  bit: number
  /** The cliff this bit means in the BACKGROUND path. */
  cliff: string
  /** `LDD #n` — the X origin the span walk starts from. */
  originX: number
  /** `LDX #n` — the cliff's top scanline. */
  originY: number
  /** jt1-3 collision-table label reached via `LDY [cliff]`. */
  collisionTable: string
  anchor: SourceAnchor
}

export interface ArenaModule {
  // ─── Constants (JOUSTRV4.SRC:36-41) ───────────────────────────────────────
  CEILING: number // $0020 — highest position
  FLOOR: number // $00DF — lowest position
  /** FLOOR+7: at or below this whole-pixel Y the entity dies in the lava. */
  DEATH_Y: number
  ELEFT: number // -10
  ERIGHT: number // 292
  /** ERIGHT-ELEFT+1 = 303. The correction step, not a modulus — see wrapX. */
  WRAP_SPAN: number

  /** The six landing surfaces, ordered by bit. */
  PLATFORMS: Platform[]

  /** The eight BCKCOL cliff-side collision surfaces — a DIFFERENT bit map. */
  BACKGROUND_SURFACES: BackgroundSurface[]

  /** LNDYTB — one mask byte per scanline, 240 entries (JOUSTRV4.SRC:7719+). */
  LND_Y_TABLE: number[]
  /** BCKYTB — the separate background-collision Y map (JOUSTRV4.SRC:7549+). */
  BCK_Y_TABLE: number[]

  // ─── Lava + bridge (JOUSTRV4.SRC:954-962, 1929-1933) ──────────────────────
  LAVA_START: number // $EA
  LAVA_MIN: number // $E0 — stops rising here
  LAVA_STEP: number // 5 per wave
  BRIDGE_WAVE: number // 3 — TBRIDGE
  TROLL_DELAY: number // 1 — TTROLL, waves after the bridge goes

  /**
   * The ROM's X wrap (WRAPX, JOUSTRV4.SRC:7291-7297).
   *
   * NOT a modulus: ONE conditional subtract if x > ERIGHT, then ONE conditional
   * add if x < ELEFT. For the velocities the game produces (|vx| <= MAXVX = 8)
   * the two agree, but they diverge on large deltas and the ROM's answer can
   * legally sit outside the range. Transcribe the branches, not the intent.
   */
  wrapX(x: number): number

  /**
   * The ceiling half of ADDGRX (JOUSTRV4.SRC:6497-6506).
   *
   * When the whole-pixel Y is at or above CEILING: velocity is NEGATED EXACTLY
   * (the `COMA/NEGB/SBCA #-1` 16-bit two's-complement idiom) but only if it is
   * currently upward — an entity already descending is not flung down harder —
   * and position is CLAMPED to `CEILING << 8`, not mirrored by the overshoot.
   */
  applyCeiling(posY: number, velY: number): { posY: number; velY: number; bumped: boolean }

  /** True when the whole-pixel Y has reached FLOOR+7 (ADGCEI/ADGFLR). */
  isLavaDeath(posY: number): boolean

  /** CKGND's dispatch: mask value → what the entity is standing on. */
  groundOutcome(mask: number): GroundOutcome

  /**
   * Land an entity. Returns the snapped whole-pixel Y and zeroed vertical
   * motion. Landing is a SNAP, not a resolve: the result is exactly the
   * platform's snapY regardless of how far into the band the entity travelled.
   */
  land(platform: Platform): { posY: number; velY: number }

  /** Lava surface Y for a 1-based wave number (SAFRAM). */
  lavaLevelForWave(wave: number): number

  /** Does this wave destroy the bridge? (TBRIDGE hook — animation is jt3's.) */
  bridgeDestroyedOnWave(wave: number): boolean
}

export async function loadArena(): Promise<ArenaModule> {
  const specifier = ['..', '..', 'src', 'core', 'arena.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<ArenaModule>
    if (!Array.isArray(mod.PLATFORMS)) throw new Error('module has no `PLATFORMS` export')
    if (typeof mod.wrapX !== 'function') throw new Error('module has no `wrapX` export')
    return mod as ArenaModule
  } catch (e) {
    throw new Error(
      'arena module not built yet — GREEN (Julia) creates joust/src/core/arena.ts ' +
        `satisfying tests/helpers/arena-contract.ts. (${(e as Error).message})`,
    )
  }
}

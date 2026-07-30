// src/host/contract.ts — the plugin contract.
//
// A game declares itself with one exported `meta` object. That manifest will be the
// ONLY thing the lobby reads: Task 14 will generate src/host/registry.ts from every
// plugins/*/plugin.ts, and Task 15 will repoint the lobby at it, retiring
// lobby/src/core/registry.ts — which is STILL the live list as of this commit, and
// still carries six hardcoded launch URLs and six hardcoded version strings that
// nothing checks.
//
// The tense above is load-bearing, so plainly: **as of this commit, nothing calls
// `validateMeta`.** It is the typed statement of the contract, and its own tests are
// its only exercise. Its two build-time consumers do not exist yet and, once written,
// cannot call it — scripts/gen-registry.mjs (Task 14) and scripts/build-app.mjs
// (Task 16) will be plain Node scripts that run before any TypeScript build, so they
// will read the manifests as TEXT and re-state these rules in JavaScript. Three checks
// will then have to be kept in step: this validator, those scripts' regexes, and
// TypeScript's own type and excess-property checking of each manifest's
// `const meta: GameMeta = {…}`. If they drift, this file is the one that is right;
// the scripts are echoes of it.

/** A game on the cabinet, as the lobby sees it. */
export interface GameMeta {
  /** Url-safe slug. MUST equal the directory name under plugins/. */
  readonly id: string
  /** Display label on the tile. */
  readonly title: string
  /** Year the cabinet shipped. */
  readonly year: number
  /** Tile glow colour, hex. */
  readonly color: string
  /** Keybinding hints, one line each. */
  readonly controls: readonly string[]
  /**
   * Position on the cabinet floor, ascending. Explicit because the order it replaces
   * was CURATED (tempest, star-wars, asteroids, battlezone, centipede, joust — the
   * order the games were built), and generating from directory names would silently
   * re-sort the lobby alphabetically. Tile order is a design decision, so it is
   * stated rather than inferred.
   *
   * Uniqueness across the fleet is NOT checkable here — one manifest cannot see its
   * siblings. scripts/gen-registry.mjs (Task 14) will own the duplicate-order check.
   */
  readonly order: number
  /** Whether the lobby lists it. `false` is a deliberate statement, not an omission. */
  readonly listed: boolean
  /**
   * Does this game's attract mode earn a slot in the lobby showcase carousel?
   *
   * Required, not optional — carried over verbatim from the field's own rationale in
   * the registry this will replace: "An optional flag with a falsy default means a newly
   * added game silently opts out and nobody notices — the same class of invisible
   * absence this whole feature exists to correct."
   */
  readonly showcase: boolean
  /** The game's released version, imported from its own package.json. */
  readonly version: string
}

/** Build-only configuration. Deliberately NOT part of GameMeta: build settings
 *  have no business travelling into the tile renderer. */
export interface BuildSpec {
  /** Extra HTML entries beyond index.html, e.g. tempest's 'models.html'. */
  readonly entries?: readonly string[]
}

const URL_SAFE_ID = /^[a-z][a-z0-9-]*$/

// 3, 4, 6 or 8 digits — the only lengths CSS actually accepts (#rgb, #rgba, #rrggbb,
// #rrggbbaa). A plain {3,8} range, which is what this started as, admits #12345 and
// #1234567: no browser renders either, so a one-digit typo like '#00eaf' would reach a
// tile as a dead colour. Every colour the cabinet ships is 6-digit, so nothing changes.
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/** Blank-but-present is the same defect as missing: it reads as a value and renders as
 *  nothing. Applied to every field where the empty string would be silently displayed. */
const isBlank = (s: string): boolean => s.trim().length === 0

/**
 * Every key a manifest may carry. Anything else is rejected rather than passed
 * through — see the `unknown key` throw below for why.
 */
const KNOWN_KEYS: readonly string[] = [
  'id',
  'title',
  'year',
  'color',
  'controls',
  'order',
  'listed',
  'showcase',
  'version',
]

/**
 * Validate one manifest against its directory. Throws with a specific message on
 * the first violation — the build stops rather than emitting a broken tile.
 *
 * Nothing here defaults, coerces or drops. A missing field is a rejection, not a
 * `false`/`0`/`''`; a truthy string is not a boolean; an unrecognised key is an
 * error rather than silent passenger data.
 */
export function validateMeta(meta: unknown, dirName: string): GameMeta {
  const where = `plugins/${dirName}/plugin.ts`

  // Arrays are `typeof 'object'` too. Letting one through would report it as a bad
  // `id` — a misleading diagnosis for something that is not a manifest at all.
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
    throw new Error(`${where}: meta is not an object`)
  }
  const m = meta as Record<string, unknown>

  if (typeof m.id !== 'string' || !URL_SAFE_ID.test(m.id)) {
    throw new Error(
      `${where}: id must be url-safe (lowercase letters, digits, hyphens; starts with a letter); got ${JSON.stringify(m.id)}`,
    )
  }
  if (m.id !== dirName) {
    throw new Error(`${where}: id '${m.id}' does not match directory '${dirName}'`)
  }
  if (typeof m.title !== 'string' || isBlank(m.title)) {
    throw new Error(`${where}: title must be a non-empty string`)
  }
  if (typeof m.year !== 'number' || !Number.isInteger(m.year)) {
    throw new Error(`${where}: year must be an integer; got ${JSON.stringify(m.year)}`)
  }
  if (typeof m.color !== 'string' || !HEX_COLOR.test(m.color)) {
    throw new Error(`${where}: color must be a hex colour like '#00eaff'; got ${JSON.stringify(m.color)}`)
  }
  if (
    !Array.isArray(m.controls) ||
    m.controls.length === 0 ||
    !m.controls.every((c) => typeof c === 'string' && !isBlank(c))
  ) {
    throw new Error(`${where}: controls must be a non-empty array of non-empty strings`)
  }
  if (typeof m.order !== 'number' || !Number.isInteger(m.order)) {
    throw new Error(`${where}: order must be an integer; got ${JSON.stringify(m.order)}`)
  }
  if (typeof m.listed !== 'boolean') {
    throw new Error(`${where}: listed must be a boolean; got ${JSON.stringify(m.listed)}`)
  }
  // Required, never defaulted — a falsy default is how a new game silently opts out
  // of the carousel and nobody notices. A truthy STRING is not a boolean either:
  // 'false' would list a game its manifest tried to hide.
  if (typeof m.showcase !== 'boolean') {
    throw new Error(`${where}: showcase must be a boolean; got ${JSON.stringify(m.showcase)}`)
  }
  if (typeof m.version !== 'string' || isBlank(m.version)) {
    throw new Error(`${where}: version must be a non-empty string (import it from ./package.json)`)
  }

  // Checked last so a manifest with a real field error gets that message first.
  //
  // Note for anyone writing a test that depends on WHICH branch threw: the hint below
  // lists every valid key, so this message contains the literal text 'color', 'title',
  // 'order' and so on. A test asserting a bare field name cannot tell this branch from
  // that field's own check — assert on the field error's distinctive wording instead.
  //
  // Rejecting rather than ignoring is deliberate: these manifests are transcribed
  // from a registry with a DIFFERENT shape, so an unknown key is far likelier to be
  // stale data or a typo than an intended extension — and passing it through would
  // carry it into the generated registry with nothing checking it, which is the
  // exact failure this contract replaces.
  for (const key of Object.keys(m)) {
    if (KNOWN_KEYS.includes(key)) continue
    const hint =
      key === 'launchUrl'
        ? " — launch URLs are derived, not declared: every game is served at '/<id>/' on one origin"
        : ` — expected one of: ${KNOWN_KEYS.join(', ')}`
    throw new Error(`${where}: unknown key '${key}'${hint}`)
  }

  return m as unknown as GameMeta
}

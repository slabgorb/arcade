// @arcade/shared/highscore — the high-score TABLE logic + its TWO persistence seams:
// the localStorage table (authoritative) and the cross-origin score cookie (now a
// READ-ONLY legacy bridge — see "the cross-origin transport" below).
//
// NOTE: this is a BROWSER subpath, not a pure one (ADR-0003's fence, tests/purity.test.ts).
// It was pure until lb2-2: `load()` reads `document.cookie` and both `load()`/`save()`
// touch `localStorage`, so the subpath touches the DOM and is classified by its dirtiest
// export. The table logic below
// (qualifiesForHighScore / insertHighScore / highScoreKey / isHighScoreRow) is still pure
// and side-effect-free — but the module as a whole is not, and saying otherwise would make
// the purity fence a lie.
//
// SH-4 (ADR-0001) extraction. tempest, star-wars, and asteroids each shipped a
// logic-identical high-score table (src/core/highscore.ts) + persistence seam
// (src/shell/storage.ts), and the lobby reads their `{gameId}-high-scores`
// entries by convention only. This module lifts all of it into one place and
// turns that convention into a compile-time contract:
//
//   - The entry type is GENERIC over the domain field: tempest records `level`;
//     star-wars and asteroids record `wave`, so HighScoreEntry<'level'> and
//     HighScoreEntry<'wave'> share every other field. The stored JSON keeps each
//     game's real field name — no localStorage migration.
//   - The row guard requires a FINITE score (and a finite domain field, or an
//     explicit `null` — a migrated row). The three games split on this:
//     tempest/star-wars used loose `typeof === 'number'` (which admits a
//     poisoned `1e999` -> Infinity); asteroids hardened to `Number.isFinite`,
//     and the lobby's tile read demands a finite score. One shared guard can
//     hold only one standard, so it holds the finite one.
//   - `highScoreKey` + `isHighScoreRow` are what the LOBBY imports — the same key
//     and shape the games write — so the tile no longer re-derives them by hand.
//
// No rendering, no game state. There are TWO IO surfaces:
//
//   localStorage  the game's own high-score TABLE. Origin-scoped, authoritative, and the
//                 source of truth. Read AND written.
//   document.cookie  the pre-migration summary ladder, scoped to the registrable domain.
//                 READ ONLY as of Task 21 — nothing in the cabinet writes it any more.
//                 It is the one-time bridge that carries a returning player's scores from
//                 the old per-game origins onto the single cabinet origin.
//
// Both seams degrade gracefully on every failure mode (missing / corrupt / unavailable /
// quota-exceeded / no DOM / a hostile document) — a game keeps playing, scores just don't
// persist, and a summary that cannot be trusted seeds nothing rather than a wrong number.

/** Board depth — the classic 10-deep arcade ladder. The single source of truth
 *  (AC-4): no game redeclares it. */
export const MAX_HIGH_SCORES = 10

/** Fields every high-score entry carries, regardless of game. `date` is an
 *  optional ISO-8601 timestamp. */
export interface HighScoreEntryBase {
  name: string // player initials (3 chars, arcade convention)
  score: number // points
  date?: string // optional ISO-8601 timestamp of the entry
}

/** A game's own domain field — the level or wave the score was set on.
 *
 *  `null` means MIGRATED: the row came across the origin boundary in the ADR-0004
 *  summary cookie, which carries name and score only. Fabricating a level would be
 *  the cabinet inventing a fact about a player's game — the same lie the lb2-8
 *  amendment refused when it declined to invent initials. Boards render a blank.
 *  Rows written after migration always carry a real number, so null is strictly
 *  transitional and clears itself as new scores displace old ones. */
export type HighScoreEntry<DomainKey extends string> = HighScoreEntryBase & {
  [K in DomainKey]: number | null
}

/** A table is a list of entries, ordered descending by score (lowest last). */
export type HighScoreTable<DomainKey extends string> = HighScoreEntry<DomainKey>[]

// --- pure table logic --------------------------------------------------------

// Precondition: `table` is assumed sorted DESCENDING by score (lowest entry
// last) — the order insertHighScore maintains. True when `score` is worth
// recording: a non-positive score never qualifies; while the board has open
// slots any positive score makes it; once full the score must STRICTLY beat the
// lowest entry to displace it (a tie does not). Reads only `.score`, so it is
// domain-agnostic.
export function qualifiesForHighScore(table: readonly HighScoreEntryBase[], score: number): boolean {
  if (score <= 0) return false
  if (table.length < MAX_HIGH_SCORES) return true
  const lowest = table[table.length - 1].score
  return score > lowest
}

// Returns a NEW table with `entry` inserted in descending-score order, truncated
// to MAX_HIGH_SCORES. Ties place the new entry AFTER existing equal-score entries
// (existing holders keep the higher rank). The input table is not mutated.
// Generic over the entry type, so the domain field rides through the sort.
export function insertHighScore<E extends HighScoreEntryBase>(
  table: readonly E[],
  entry: E,
): E[] {
  const out = table.slice()
  let i = out.length
  for (let k = 0; k < out.length; k++) {
    if (out[k].score < entry.score) {
      i = k
      break
    }
  }
  out.splice(i, 0, entry)
  return out.slice(0, MAX_HIGH_SCORES)
}

// --- the key + row guards (the lobby contract) -------------------------------

/** The per-game localStorage key, e.g. `tempest-high-scores`. Every game writes
 *  its table under this key and the lobby reads it — the one shared literal. */
export function highScoreKey(gameId: string): string {
  return `${gameId}-high-scores`
}

// The domain-AGNOSTIC base guard: a row is usable only if it carries a string
// `name` and a FINITE numeric `score`. This is what the lobby imports — it reads
// only `.score`, so it validates that and tolerates any extra/missing fields.
// `Number.isFinite` (false for non-numbers AND ±Infinity/NaN) is the line the
// lobby already held; a poisoned `1e999` -> Infinity row does not pass.
export function isHighScoreRow(value: unknown): value is HighScoreEntryBase {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.name === 'string' && Number.isFinite(row.score)
}

// Builds the domain-AWARE guard a game uses: the base contract PLUS a finite
// numeric value under the game's own domain field (`level` | `wave`), or an
// explicit `null` (a migrated row). Generic over the field name, so this one
// factory replaces the per-game `Number.isFinite(row[field])` line that used
// to be copied into each storage.ts.
export function makeHighScoreRowGuard<DomainKey extends string>(
  domainKey: DomainKey,
): (value: unknown) => value is HighScoreEntry<DomainKey> {
  return (value: unknown): value is HighScoreEntry<DomainKey> => {
    // Capture the raw record view while `value` is still `unknown` — the base
    // guard below narrows it to a type without an index signature, so we read
    // the game's own domain field (`level` | `wave`) from this view by name.
    const row = value as Record<string, unknown>
    if (!isHighScoreRow(value)) return false
    const domain = row[domainKey]
    // A finite number, or an EXPLICIT null (a migrated row). `undefined` and a
    // missing key are still rejected: those mean the row is malformed, not
    // migrated, and silently admitting them would let junk into the table.
    return Number.isFinite(domain) || domain === null
  }
}

// --- the cross-origin transport (ADR-0004) — LEGACY, READ-ONLY ---------------
//
// lb2-2. The games and the lobby USED TO BE different origins (tempest.slabgorb.com vs
// arcade.slabgorb.com — six R2 buckets, six domains), and localStorage is partitioned by
// origin. So the lobby was reading a store no game had ever written, and every tile
// showed NO SCORE or a frozen stale number.
//
// The fix was a cookie scoped to the registrable domain (`Domain=slabgorb.com`), which
// every subdomain can read. Cookie scoping is host-suffix-based, so it walks straight
// through the storage partitioning that kills every other same-browser option (notably
// Safari, which partitions localStorage per-ORIGIN in defiance of its own published spec).
//
// ── WHAT CHANGED (Task 21) ──────────────────────────────────────────────────
// The single-origin collapse ADR-0004 rejected on COST has since HAPPENED: the cabinet is
// one origin, serving every game from arcade.slabgorb.com. That makes the cookie pointless
// as a transport — the lobby can just read the table — and it makes the players' existing
// tables, written on the old per-game origins, unreachable. The cookie is the only thing
// that crosses that boundary, so it has exactly one job left:
//
//   READ ONLY. Nothing publishes to this cookie any more. `makeHighScoreStorage` no
//   longer writes it on save and no longer republishes it on load; the read exists solely
//   so a returning player's pre-migration scores can be seeded ONCE into same-origin
//   storage (see `makeHighScoreStorage` below). Load never clears it either — it is the
//   migration SOURCE now, not a derived cache, and a clear would destroy the only copy.
//   Safe to delete this whole section once the migration window has passed.
//
// `cookieTopScoreTransport.publish` survives as the write half of the ADR-0004 interface,
// but no production code path calls it: its only remaining caller is the cookie suite,
// which uses it to author the legacy cookies the READ side has to parse. It goes when the
// rest of this section does.

/** One published high-score row: the arcade initials and the score, and nothing else. The
 *  game's own domain field (`level` | `wave`) is deliberately NOT carried across — the board
 *  draws a name and a number, and a summary that leaked a game-private field would let the
 *  lobby accidentally depend on it. */
export interface TopScoreRow {
  name: string
  score: number
}

/** How many rows the published summary carries — the design's TOP FIVE ladder. The single
 *  source of truth for the cap; the factory derives at most this many, highest first, and the
 *  read caps at it too so a bloated hostile cookie cannot grow the board's ladder. */
export const PUBLISHED_SUMMARY_DEPTH = 5

/**
 * How a game's published high-score SUMMARY gets across the origin boundary to the lobby.
 *
 * lb2-8 widened this from a single number to the board's ladder: `publish` carries the top-N
 * name+score ROWS (already derived, sorted highest-first and capped at PUBLISHED_SUMMARY_DEPTH),
 * and `read` hands them back. The tile's single top score is still available — it is row 0's
 * score (see `readTopScore`), which also still parses a legacy bare-number cookie.
 *
 * `publish(gameId, [])` means "this game has NO score" and must CLEAR the published value — it
 * is not the same as declining to publish. That distinction is load-bearing: the summary is
 * derived from the table, and derivation is a total function. If the table is empty, the derived
 * summary is *no rows*, and a transport with no way to say so leaves a stale ladder behind that
 * outlives the board it came from.
 */
export interface TopScoreTransport {
  publish(gameId: string, rows: readonly TopScoreRow[]): void
  read(gameId: string): TopScoreRow[]
}

/** The published cookie: `arcade-hi-tempest=JPX:149830,AAA:98000`. One per game, so no game
 *  can clobber a sibling's ladder via a read-modify-write on a shared cookie. */
function topScoreCookieName(gameId: string): string {
  return `arcade-hi-${gameId}`
}

// `gameId` is interpolated straight into a cookie string, where `;` and `=` are the
// delimiters — so an id carrying either would inject cookie ATTRIBUTES rather than name a
// cookie. Every real id is a plain slug ('tempest', 'star-wars'), and today they are all
// hardcoded constants; but this is a shared library's public API and nothing in the
// signature stops a caller passing something dynamic. Reject anything that is not a slug
// instead of trusting the caller.
function isValidGameId(gameId: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(gameId)
}

// Browsers cap cookie persistence at 400 days and silently clamp anything longer.
const TOP_SCORE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60

// A score worth publishing: a whole, positive, finite number of points. The board never
// records anything else (`qualifiesForHighScore` rejects <= 0), so publishing a 0 would
// render a real-looking score of zero on a tile that should honestly read NO SCORE.
function isPublishableScore(score: number): boolean {
  return Number.isInteger(score) && score > 0
}

// The cookie value is UNTRUSTED: any of our own subdomains can write it, the player can
// edit it by hand, and ITP can shred it. JS number parsing is a minefield of ways to turn
// junk into a CONFIDENT WRONG NUMBER — `Number('')` is 0, `parseInt('9000abc')` is 9000,
// `Number('0x1F')` is 31, `Number('1e999')` is Infinity. Demanding plain digits up front
// closes all of them at once; a wrong score on a tile is worse than no score at all.
function parseTopScore(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const score = Number(value)
  return isPublishableScore(score) ? score : null
}

// --- rows summary encoding (lb2-8) -------------------------------------------
//
// The widened summary is a list of `name:score` pairs joined by commas:
// `JPX:149830,AAA:98000`. NAMES are the new untrusted input the widening introduces
// (gameId is already slug-guarded); a name lands in the cookie value where ; = , : are
// structural, so it is sanitized on the way in and re-validated on the way back.

// Strip the cookie/encoding delimiters (`; = , :`) AND any control/newline characters (the C0
// range plus DEL) from a name, so a hostile `X;Y=Z,Q:R` — or one carrying a newline — cannot
// forge a cookie attribute, a second cookie, or an extra ladder row. Arcade initials never
// contain any of these, so a real name is untouched.
function sanitizeName(name: string): string {
  return name.replace(/[;=,:\u0000-\u001f\u007f]/g, '')
}

// Encode rows as `name:score,name:score`, sanitizing each name and dropping any row that
// cannot be safely represented (a non-string name, a non-publishable score, or a name that is
// nothing but delimiters and sanitizes to empty). Returns null when nothing publishable
// remains — which builds the CLEAR form of the cookie, so an empty ladder never leaves a
// zombie behind.
function encodeRows(rows: readonly TopScoreRow[]): string | null {
  const parts: string[] = []
  for (const row of rows) {
    if (typeof row.name !== 'string' || !isPublishableScore(row.score)) continue
    const name = sanitizeName(row.name)
    if (name === '') continue
    parts.push(`${name}:${row.score}`)
  }
  return parts.length > 0 ? parts.join(',') : null
}

// Decode the cookie value back into rows, dropping anything that is not a clean `name:score`
// pair. The value is UNTRUSTED (any subdomain can write it, a player can edit it, ITP can
// shred it), so a junk pair becomes NO row, never a confident wrong one — and a LEGACY
// bare-number value (`124500`, published before this story) carries no `:`, so it yields no
// rows and the board shows its empty state until the game republishes.
//
// SORT highest-first on the way back, then cap at PUBLISHED_SUMMARY_DEPTH — mirroring the
// write side (`topRowsOf`). The cookie WE write is already sorted, but an untrusted value may
// be out of order, and both `readTopScores`' "highest first" contract and `readTopScore`'s
// "row 0 is the max" assumption must hold against a hostile/hand-edited cookie, not just our
// own. Sorting before the slice also means the top-N are the true top-N by score, not the
// first N encountered. The cookie is browser-capped at 4096 B, so the row count is bounded.
function decodeRows(value: string): TopScoreRow[] {
  const rows: TopScoreRow[] = []
  for (const pair of value.split(',')) {
    const colon = pair.indexOf(':')
    if (colon === -1) continue
    const name = pair.slice(0, colon)
    if (name === '') continue
    const score = parseTopScore(pair.slice(colon + 1))
    if (score === null) continue
    rows.push({ name, score })
  }
  rows.sort((a, b) => b.score - a.score)
  return rows.slice(0, PUBLISHED_SUMMARY_DEPTH)
}

// The DOM may be absent (node, SSR) or hostile (sandboxed iframes and private mode can
// throw on the mere act of touching document.cookie). Every path degrades to NO SCORE.
function getDocument(): Document | null {
  try {
    return typeof document === 'undefined' ? null : document
  } catch {
    return null
  }
}

function getLocation(): Location | null {
  try {
    return typeof location === 'undefined' ? null : location
  } catch {
    return null
  }
}

// The cookie must be scoped to the REGISTRABLE DOMAIN or a sibling subdomain cannot read
// it and the whole fix is inert. `tempest.slabgorb.com` -> `slabgorb.com`.
//
// ASSUMPTION: the cabinet lives on a single-label public suffix (`slabgorb.com`), so the
// registrable domain is the last two labels. This is deliberately NOT a public-suffix-list
// implementation — on a multi-part suffix (`arcade.example.co.uk`) it would yield `co.uk`,
// which every browser rejects, and the cookie simply would not be set. That fails SAFE (no
// cookie -> NO SCORE, never a wrong number), so the assumption costs a feature, not
// correctness. Revisit only if the arcade ever moves to such a domain.
//
// Returns null when the Domain attribute must be OMITTED:
//   - localhost (`just serve`, six ports): cookies ignore the port, so a host-only cookie
//     is ALREADY shared across all six dev servers. `Domain=localhost` is redundant at
//     best and rejected outright by some browsers, which would break the dev cabinet.
//   - a bare hostname or a raw IP: there is no parent domain to scope to.
function registrableDomain(hostname: string): string | null {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return null
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) return null // IPv4 / IPv6

  const labels = hostname.split('.')
  if (labels.length < 2) return null
  return labels.slice(-2).join('.')
}

// `value: null` builds the DELETION form of the same cookie. A browser only removes a
// cookie when the expiring write carries the SAME Domain and Path as the original, so the
// two forms must be built from one place — a clear that quietly misses on Domain would
// leave the stale ladder sitting there while appearing to work.
function buildTopScoreCookie(name: string, value: string | null, page: Location | null): string {
  const parts =
    value === null
      ? [`${name}=`, 'Path=/', 'SameSite=Lax', 'Max-Age=0']
      : [`${name}=${value}`, 'Path=/', 'SameSite=Lax', `Max-Age=${TOP_SCORE_MAX_AGE_SECONDS}`]

  const domain = page ? registrableDomain(page.hostname) : null
  if (domain) parts.push(`Domain=${domain}`)

  // Secure only over https — a Secure cookie is dropped on the plain-http dev cabinet.
  if (page?.protocol === 'https:') parts.push('Secure')

  return parts.join('; ')
}

// Read the raw summary cookie VALUE for a game, or null (no cookie / no DOM / hostile doc).
// Both `readTopScores` (rows) and `readTopScore` (the top number, incl. the legacy fallback)
// go through here, so the jar parsing and exact-name matching live in exactly one place.
function readSummaryCookie(gameId: string): string | null {
  if (!isValidGameId(gameId)) return null

  const doc = getDocument()
  if (!doc) return null

  let jar: string
  try {
    jar = doc.cookie
  } catch {
    return null
  }
  if (typeof jar !== 'string' || jar === '') return null

  // Match the cookie NAME exactly. A substring test would let `arcade-hi-star-wars`
  // answer a lookup for `star`, and a lookalike cookie impersonate a real one.
  const wanted = topScoreCookieName(gameId)
  for (const pair of jar.split(';')) {
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    if (pair.slice(0, eq).trim() !== wanted) continue
    return pair.slice(eq + 1).trim()
  }
  return null
}

/** The default transport: one cookie per game on the shared parent domain, carrying the
 *  top-N ladder as `name:score` pairs. */
export const cookieTopScoreTransport: TopScoreTransport = {
  publish(gameId: string, rows: readonly TopScoreRow[]): void {
    if (!isValidGameId(gameId)) return

    const doc = getDocument()
    if (!doc) return

    try {
      // `encodeRows` returns null for an empty/all-unpublishable ladder, which builds the
      // CLEAR form — so an empty board can never leave a stale ladder behind.
      doc.cookie = buildTopScoreCookie(topScoreCookieName(gameId), encodeRows(rows), getLocation())
    } catch {
      // A failed publish costs a cached ladder, not a score. Never take the page down.
    }
  },

  read(gameId: string): TopScoreRow[] {
    const raw = readSummaryCookie(gameId)
    return raw === null ? [] : decodeRows(raw)
  },
}

/** The legacy published ladder for a game — up to PUBLISHED_SUMMARY_DEPTH name+score rows,
 *  highest first, or [] when there is nothing trustworthy to show (never a fabricated row).
 *  Written by the OLD per-game origins (lb2-8, widening ADR-0004); since Task 21 this is
 *  read-only, and its one consumer is the one-time seed in `makeHighScoreStorage`. */
export function readTopScores(gameId: string): TopScoreRow[] {
  return cookieTopScoreTransport.read(gameId)
}

/** The single best score a game published BEFORE the origin collapse, or null when there is
 *  none. Derives from row 0 of the widened summary, and still parses a LEGACY bare-number
 *  cookie (the pre-lb2-8 shape) so a tile does not blank for a player whose cookie predates
 *  the widening. Since Task 21 this is the lobby tile's FALLBACK, behind same-origin
 *  storage — see `readLocalTopScore`. */
export function readTopScore(gameId: string): number | null {
  const raw = readSummaryCookie(gameId)
  if (raw === null) return null
  const rows = decodeRows(raw)
  if (rows.length > 0) return rows[0].score
  return parseTopScore(raw)
}

// --- the persistence factory -------------------------------------------------

/** The load/save pair a game binds to its own key + row validator. */
export interface HighScoreStorage<E extends HighScoreEntryBase> {
  load(): E[]
  save(table: readonly E[]): void
}

// Access localStorage defensively: in private-browsing / sandboxed contexts even
// *reading* the global can throw, and outside a browser it is simply absent.
function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

// Bind a load/save pair to `${gameId}-high-scores`, filtering loaded rows through
// `validator` (drop bad rows; [] if none). Every storage failure mode
// (missing / corrupt / not-a-table / unavailable / throwing / quota-exceeded)
// degrades gracefully — load returns [], save is a no-op — so persistence never
// crashes the game. load FILTERS the parsed rows (it does not rebuild them), so
// a survivor keeps its exact shape including an absent optional `date`.
//
// `domainKey` is the game's own domain field name — 'level' for tempest, 'wave' for
// star-wars / asteroids / centipede, and '' for battlezone, which persists the base
// shape and has no domain field at all. It exists for the one-time cookie seed below,
// which has to BUILD rows rather than merely validate them. It is passed explicitly
// rather than recovered from `validator`, because a guard is an opaque predicate and
// reverse-engineering its field name would be guesswork.
export function makeHighScoreStorage<E extends HighScoreEntryBase>(
  gameId: string,
  validator: (value: unknown) => value is E,
  domainKey: string,
): HighScoreStorage<E> {
  const key = highScoreKey(gameId)

  function parseTable(raw: string): E[] {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        console.warn(`[highscore] ${key} data is not a table array; ignoring`)
        return []
      }
      return parsed.filter(validator)
    } catch {
      console.warn(`[highscore] ${key} data is corrupt JSON; ignoring`)
      return []
    }
  }

  // ONE-TIME cross-origin migration. Player tables were written on
  // <game>.slabgorb.com; the cabinet now serves from arcade.slabgorb.com/<id>/ and
  // localStorage does not cross that boundary. The ADR-0004 summary cookie is
  // scoped to the registrable domain, so it DOES cross — it is the bridge.
  //
  // Top five survive (PUBLISHED_SUMMARY_DEPTH); rows six through ten are lost. The
  // domain field cannot cross at all, so seeded rows carry null (see the guard) —
  // fabricating a level or a wave would be the cabinet inventing a fact about a
  // player's game. Runs only when same-origin storage holds NO table at all, so it
  // can never overwrite real local scores, and never runs again once anything has
  // been saved — including an empty table, which is a board the player cleared.
  //
  // Returns the rows it seeded, so the load that triggers the migration shows them
  // immediately. That means what load() RETURNS and what it PERSISTS are produced
  // separately, and a divergence would be invisible on this pass and fatal on the
  // next (storage is no longer empty, so the seed never runs again and the scores
  // are gone). tests/highscore.dom.test.ts closes that gap by re-reading through a
  // second storage instance — the reload half of every "seeds ..." case.
  function seedFromLegacyCookie(storage: Storage): E[] {
    const rows = readTopScores(gameId)
    if (rows.length === 0) return []

    // A game with no domain field (battlezone) gets the base shape and nothing else:
    // writing a literal empty-string key would be inventing a field name.
    const candidates: unknown[] = rows.map((row) =>
      domainKey === ''
        ? { name: row.name, score: row.score }
        : { name: row.name, score: row.score, [domainKey]: null },
    )
    // Validate what we built with the game's OWN guard, so a row that could not
    // survive a reload is never written in the first place.
    const seeded = candidates.filter(validator)
    if (seeded.length === 0) return []

    try {
      storage.setItem(key, JSON.stringify(seeded))
    } catch {
      // Quota / private mode. The player still sees their migrated board this
      // session, and the cookie is untouched, so the next load tries again.
      console.warn(`[highscore] could not persist ${key}'s migrated scores (storage full)`)
    }
    return seeded
  }

  function load(): E[] {
    const storage = getStorage()
    // Storage is unreachable (node, private mode), so we cannot know what the table says —
    // and must not seed, because "I could not read it" is not "it is empty".
    if (!storage) return []

    let raw: string | null
    try {
      raw = storage.getItem(key)
    } catch {
      return []
    }

    // NO table at all means one of two things: a genuinely new player, or a returning
    // one whose board is stranded on the old origin. Only the second has a cookie.
    if (raw === null) return seedFromLegacyCookie(storage)

    // Whatever we return here IS the board the player sees — corrupt JSON means an
    // empty board, and NOT a re-seed: the key exists, so this browser has already
    // migrated and the cookie must not resurrect a ladder the player has moved past.
    return parseTable(raw)
  }

  function save(table: readonly E[]): void {
    const storage = getStorage()
    if (!storage) return
    try {
      storage.setItem(key, JSON.stringify(table))
    } catch {
      console.warn(`[highscore] could not persist ${key} (storage full or unavailable)`)
    }
  }

  return { load, save }
}

// The game's stored table as raw JSON, or null when this browser has NO table for it at
// all — no storage, no key, or a read that threw. That distinction is the whole point:
// "there is no table" and "the table is empty" are different answers, and only the first
// one licenses falling back to the pre-collapse cookie.
function readLocalTableRaw(gameId: string): string | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    return storage.getItem(highScoreKey(gameId))
  } catch {
    return null
  }
}

// The best score in a stored table, or null when it holds none. Rows are filtered through
// the domain-agnostic `isHighScoreRow`, so a tile holds the same finite-score line as every
// game's own guard and a poisoned `1e999` -> Infinity row can never render. Takes the MAX
// rather than row 0: the table is written sorted, but corrupt or hand-edited data must
// still yield the true best, never a lower number presented as the top score.
function maxScoreIn(raw: string): number | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null

  const scores = parsed.filter(isHighScoreRow).map((row) => row.score)
  return scores.length === 0 ? null : Math.max(...scores)
}

/** The best score this browser knows for a game, or null when there is none to show.
 *
 *  This is the lobby tile's read, and the adapter swap ADR-0004 said the single-origin
 *  collapse would cost. Same-origin storage is authoritative: the cabinet serves every game
 *  from one origin now, so the game's own table is right there and a derived cookie can only
 *  ever be staler than it.
 *
 *  The pre-collapse summary cookie is consulted ONLY when this browser has no table for the
 *  game at all — the returning player whose scores are still stranded on the old per-game
 *  origin and who has not opened that game since. A table that exists and is EMPTY (a board
 *  the player cleared) or unusable (corrupt, all rows malformed) is a real answer of NO
 *  SCORE, and falling back there would resurrect a ladder the player has already moved past
 *  — the same zombie-score defect ADR-0004 fixed, arriving from the other direction.
 *
 *  Every failure mode degrades to null — NO SCORE, never a wrong number. */
export function readBestKnownScore(gameId: string): number | null {
  const raw = readLocalTableRaw(gameId)
  if (raw === null) return readTopScore(gameId)
  return maxScoreIn(raw)
}

// @arcade/shared/storage — the defensive localStorage accessor.
//
// Lifted from highscore.ts (sa1-4) once a second module (volume.ts) needed the
// same guard. In private-browsing / sandboxed contexts even *reading* the global
// can throw, and outside a browser it is simply absent. Every consumer treats a
// null return as "no persistence" and degrades — never throws.

/** The origin's localStorage, or null when it is absent or reading it throws. */
export function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

// tests/helpers/cookie-jar.ts
//
// lb2-2 / ADR-0004 — a faithful `document.cookie` stub for the lobby's tests.
//
// (Deliberately a sibling of src/shared/tests/helpers/cookie-jar.ts rather than an
// import: it lives under shared's own tests, not the public @shared/* surface, so
// it is not reachable from here.)
//
// The jar reproduces the two behaviours the lobby depends on:
//   • a write creates/overwrites ONE cookie — it does not replace the jar;
//   • a read hands back `name=value` pairs ONLY, never the attributes.

export interface CookieJar {
  values(): Record<string, string>
  readonly document: { cookie: string }
}

export function makeCookieJar(initial: Record<string, string> = {}): CookieJar {
  const store = new Map<string, string>(Object.entries(initial))

  const document = {
    get cookie(): string {
      return [...store.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
    },
    set cookie(raw: string) {
      const [pair = ''] = raw.split(';')
      const eq = pair.indexOf('=')
      if (eq === -1) return
      const name = pair.slice(0, eq).trim()
      const value = pair.slice(eq + 1).trim()
      if (!name) return
      const maxAge = /(?:^|;)\s*max-age\s*=\s*([^;]*)/i.exec(raw)
      if (maxAge && Number(maxAge[1]) <= 0) store.delete(name)
      else store.set(name, value)
    },
  }

  return { values: () => Object.fromEntries(store), document }
}

/** A `document` whose cookie access throws — private mode / sandboxed iframe. */
export function makeHostileDocument(): { cookie: string } {
  return {
    get cookie(): string {
      throw new Error('SecurityError: cookie access denied')
    },
    set cookie(_raw: string) {
      throw new Error('SecurityError: cookie access denied')
    },
  }
}

/** An in-memory `Storage`. One instance == ONE origin's localStorage. */
export function makeFakeStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

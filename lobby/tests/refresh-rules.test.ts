import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// lb2-3 — the source rules behind the re-read.
//
// Companion to `refresh.test.ts`, which drives the DOM. Some of this story's promises cannot
// be caught by dispatching a `pageshow` and reading a tile; they are properties of the code
// itself ("the score line is formatted in ONE place"), and the only way to check them is to
// read what was written. tests/storage.test.ts already holds its transport rule this way.
//
// Deliberately NOT a jsdom file: under jsdom, `import.meta.url` is not a `file:` URL and
// `fileURLToPath` throws. These tests need the filesystem, not a DOM.
//
// These pass on today's code. They are here to fail on tomorrow's — each one is a specific
// wrong turn that this story's fix invites.

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url))

/** Every source file — including whatever new one the re-read entry point lands in. */
function sourceFiles(): string[] {
  return readdirSync(SRC_DIR, { recursive: true, encoding: 'utf8' }).filter((file) =>
    file.endsWith('.ts'),
  )
}

/** A file's CODE, with comments stripped — prose *about* `NO SCORE` is not a `NO SCORE`. */
function code(file: string): string {
  return readFileSync(join(SRC_DIR, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

describe('lb2-3 source rules', () => {
  it('never coalesces a null score into a number', () => {
    // `getTopScore` returns `number | null`. `null` ("we cannot read it") and `0` ("a real game,
    // badly played") are DIFFERENT CLAIMS — core/score.ts renders one as NO SCORE and the other
    // as `HI · 0`, and says so in as many words. But both are falsy, so a `score || 0` or a
    // `score ?? 0` anywhere on the path to the tile collapses them and prints a confident,
    // wrong zero on a cabinet that has no score to show. That is AC-3's exact failure, and it
    // is a one-character mistake to make while adding a refresh.
    for (const file of sourceFiles()) {
      expect(code(file), `${file} coalesces a score into 0`).not.toMatch(/(\?\?|\|\|)\s*0\b/)
    }
  })

  it('formats the score line in exactly one place', () => {
    // AC-2, "no duplicated score formatting". `NO SCORE` and the `HI · ` prefix belong to
    // core/score.ts and nowhere else. A refresh that re-derives either has forked the score
    // line in two, and the copies will drift — the deliberate en-US locale pin in score.ts
    // (`149,830`, never `149.830`) is exactly the sort of detail the second copy forgets.
    const offenders = sourceFiles().filter(
      (file) => file !== join('core', 'score.ts') && /NO SCORE|HI\s*·/.test(code(file)),
    )
    expect(offenders, 'the score line is being formatted outside core/score.ts').toEqual([])
  })

  it('writes tile text as text, never as markup', () => {
    // tiles.ts holds the line: "registry strings are data, and data never becomes markup."
    // Rebuilding a score line through innerHTML would hand that invariant back for free.
    for (const file of sourceFiles()) {
      expect(code(file), `${file} assigns innerHTML`).not.toMatch(/\.innerHTML\s*=/)
    }
  })

  it('does not reach for a type-safety escape hatch', () => {
    for (const file of sourceFiles()) {
      expect(code(file), `${file}: as any`).not.toMatch(/\bas\s+any\b/)
      expect(code(file), `${file}: @ts-ignore`).not.toMatch(/@ts-ignore/)
    }
  })

  it("does not build the refresh on a 'storage' event, which a cookie never fires", () => {
    // The pre-ADR instinct is `addEventListener('storage', …)`. Post-ADR-0004 the score lives
    // in a COOKIE, and cookies emit no storage event — so that listener would never fire once,
    // while looking exactly like a working feature. The story calls this out by name.
    for (const file of sourceFiles()) {
      expect(code(file), `${file} listens for a 'storage' event`).not.toMatch(
        /addEventListener\s*\(\s*['"`]storage['"`]/,
      )
    }
  })
})

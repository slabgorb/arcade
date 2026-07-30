import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { LINKED_MODULES } from './linked-modules.mjs'

const CLASSES = ['DIVERGENCE', 'CONFIRMED', 'BOOK_WAS_WRONG', 'STRUCTURAL', 'NO_COUNTERPART']
const RECOMMENDATIONS = ['fix', 'accept', 'wont_fix']
const SIZES = ['s', 'm', 'l']
const NODE_MODULES = /(^|\/)node_modules(\/|$)/

/**
 * Is this a whole citation — something a reader could actually go and re-open?
 *
 * A file to open, a line to find, and a quote to compare against. A citation missing any
 * one of the three is not evidence, which is the only thing this gate is for.
 */
function isCitation(o) {
  return (
    typeof o === 'object' && o !== null && !Array.isArray(o) &&
    typeof o.file === 'string' && o.file.length > 0 &&
    Number.isInteger(o.line) && o.line > 0 &&
    typeof o.verbatim === 'string'
  )
}

const lineCache = new Map()
function lineAt(path, n) {
  if (!lineCache.has(path)) {
    if (!existsSync(path)) return undefined
    lineCache.set(path, readFileSync(path, 'utf8').split('\n'))
  }
  return lineCache.get(path)[n - 1]
}

/**
 * @param findings  array of finding objects
 * @param opts.repoRoot   absolute path to the battlezone repo
 * @param opts.sourceDir  absolute path to the LF Atari source, or null to skip
 *                        source-side byte checks (e.g. in CI, where it is absent)
 * @returns array of error strings; empty means every finding is valid
 */
export function checkFindings(findings, { repoRoot, sourceDir }) {
  const errors = []
  const seen = new Set()

  for (const f of findings) {
    const id = f.id ?? '(missing id)'

    if (!f.id) errors.push('a finding has no id')
    else if (seen.has(f.id)) errors.push(`duplicate id: ${f.id}`)
    else seen.add(f.id)

    if (!CLASSES.includes(f.class)) {
      errors.push(`${id}: class must be one of ${CLASSES.join('|')}, got ${JSON.stringify(f.class)}`)
      continue
    }
    if (!f.title) errors.push(`${id}: missing title`)
    if (!f.claim) errors.push(`${id}: missing claim`)

    if (f.class !== 'CONFIRMED' && !RECOMMENDATIONS.includes(f.recommendation)) {
      errors.push(`${id}: recommendation must be one of ${RECOMMENDATIONS.join('|')}`)
    }
    if (f.recommendation === 'fix' && !SIZES.includes(f.size)) {
      errors.push(`${id}: recommendation=fix requires size (${SIZES.join('|')})`)
    }

    // --- source side
    if (!f.source?.file) {
      errors.push(`${id}: missing source citation`)
    } else {
      const mod = f.source.file.replace(/\.MAC$/i, '').toUpperCase()
      if (!LINKED_MODULES.includes(mod)) {
        errors.push(
          `${id}: cites ${f.source.file}, which never shipped ` +
            `(not on the BZONE.MAP link string, nor .INCLUDEd by it). Re-cite against the linked module.`,
        )
      } else if (sourceDir) {
        const actual = lineAt(join(sourceDir, f.source.file), f.source.line)
        if (actual === undefined) {
          errors.push(`${id}: source ${f.source.file}:${f.source.line} does not exist`)
        } else if (actual.trimEnd() !== String(f.source.verbatim).trimEnd()) {
          errors.push(
            `${id}: source ${f.source.file}:${f.source.line} does not match verbatim\n` +
              `  cited:  ${JSON.stringify(f.source.verbatim)}\n` +
              `  actual: ${JSON.stringify(actual)}`,
          )
        }
      }
    }

    // --- ours side
    //
    // A `node_modules` citation is rejected FIRST, ahead of every other rule — including
    // `remediated_by`. `ours` means OUR source: a tracked file in this repo. A
    // dependency's build output (@arcade/shared/dist) is neither. Its line numbers move on
    // every re-pin or rebuild, so it is not a trustworthy anchor even as HISTORY, and not
    // even when it happens to match byte-for-byte today. Re-anchor to a tracked line.
    //
    // `remediated_by`: once a fix story lands, the `ours` verbatim describes code that
    // DELIBERATELY no longer exists. Re-pointing it at the corrected line would make the
    // finding assert that the fix is the defect, and deleting it would destroy the audit
    // record — so a remediated finding keeps its citation as HISTORY and is no longer
    // re-opened against the working tree. Its line number is frozen and will drift; that is
    // intended. The durable route back to the change is the field itself — it names the
    // story. The ROM `source` side above is still checked, always: that is where the
    // audit's authority lives, and the 1981 source does not change.
    if (f.ours?.file && NODE_MODULES.test(f.ours.file)) {
      errors.push(
        `${id}: ours ${f.ours.file} is inside node_modules — a dependency's build ` +
          `output is not our source, and its line numbers move on every re-pin. ` +
          `Re-anchor to a tracked file in this repo.`,
      )
    } else if (f.remediated_by) {
      // A remediated finding keeps whatever citation it was AUDITED with — and a
      // NO_COUNTERPART was audited with none (our code had no counterpart line to quote,
      // because the rule was missing outright). Fixing that means ADDING code, so there is
      // no historical quote to preserve — `ours` was null when audited and null is still
      // the truthful answer. A fix story MAY instead attach an `ours` pointing at the code
      // that now implements the rule. Both shapes are accepted; ONLY two. The exemption is
      // for a MISSING citation, not an unchecked one: an `ours` that is present but
      // shapeless must not sail past a gate whose whole job is to refuse citations that
      // cannot be re-opened.
      if (f.class === 'NO_COUNTERPART') {
        if (f.ours !== null && f.ours !== undefined && !isCitation(f.ours)) {
          errors.push(
            `${id}: a remediated NO_COUNTERPART's \`ours\` must be null, or a whole ` +
              `citation ({file, line, verbatim}) naming the code that now implements the ` +
              `rule — not ${JSON.stringify(f.ours)}`,
          )
        }
      } else if (!f.ours?.file) {
        errors.push(`${id}: remediated_by requires \`ours\` to keep its historical citation`)
      }
    } else if (f.class === 'NO_COUNTERPART') {
      if (f.ours !== null) errors.push(`${id}: NO_COUNTERPART requires \`ours\` to be null`)
    } else if (!f.ours?.file) {
      errors.push(`${id}: class ${f.class} requires \`ours\` (only NO_COUNTERPART may omit it)`)
    } else {
      const actual = lineAt(join(repoRoot, f.ours.file), f.ours.line)
      if (actual === undefined) {
        errors.push(`${id}: ours ${f.ours.file}:${f.ours.line} does not exist`)
      } else if (actual.trimEnd() !== String(f.ours.verbatim).trimEnd()) {
        errors.push(
          `${id}: ours ${f.ours.file}:${f.ours.line} does not match verbatim\n` +
            `  cited:  ${JSON.stringify(f.ours.verbatim)}\n` +
            `  actual: ${JSON.stringify(actual)}`,
        )
      }
    }
  }

  return errors
}

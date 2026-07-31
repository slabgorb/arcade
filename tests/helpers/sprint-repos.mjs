// mg1-4 — deciding which `repos:` values in the sprint YAML name a repo that
// `.pennyfarthing/repos.yaml` actually registers.
//
// The guard that consumes this lives in `tests/sprint-repo-routing.test.mjs` and runs
// under `npm run test:orchestrator`, so a sprint file naming a retired repo reddens
// the same suite the deploy workflow runs. Nothing in pf resolves the field — it is
// rendered as prose into the agent context — so this is the only thing that can fail.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `sprint/archive/` is deliberately NOT scanned, and this is the record of that choice.
 *
 * It holds ~490 pre-collapse `repos:` values across completed stories, and every one of
 * them was true when it was written. The archive is a record of the world before the
 * 2026-07-30 collapse — its session files say things like "cut from `develop`", which
 * was accurate then and is not now. Rewriting them would not fix any routing, because
 * no agent is ever routed from a completed story; it would only make the history claim
 * a topology that did not exist at the time. The same reasoning CLAUDE.md applies to
 * the nine archived GitHub repos, which are to be archived and never deleted, applies
 * here. Correcting the live backlog is the fix; editing the record is not.
 */
export const ARCHIVE_POLICY =
  'sprint/archive/ is left exactly as written. It records the pre-collapse world — completed ' +
  'stories whose repos values were accurate when they were filed — and no agent is ever routed ' +
  'from an archived story, so rewriting them would correct nothing and falsify the record. Only ' +
  'the live backlog (sprint/epic-*.yaml) is swept and guarded.';

/** Whether `guardedSprintFiles` includes `sprint/archive/`. Declared, not inferred from prose. */
export const ARCHIVE_SCANNED = false;

/**
 * The identifiers a sprint file may legitimately carry, derived from the registry text.
 *
 * Both the entry NAME and its declared `path:` are accepted: they identify the same
 * registered repo, and the live backlog already uses each. The path falls back to the
 * name when absent, mirroring `pf/git/repos.py::_parse_repo_entry`
 * (`path=data.get("path", name)`), so this agrees with the toolchain rather than merely
 * resembling it.
 *
 * A Set, never a plain object: a `repos:` value is arbitrary text out of a YAML file,
 * and `{}['constructor']` is truthy for free, which would wave a repo named
 * `constructor` straight through.
 */
export function registeredRepoIdentifiers(registryYamlText) {
  if (typeof registryYamlText !== 'string' || registryYamlText.trim() === '') {
    throw new Error('registeredRepoIdentifiers: expected the text of .pennyfarthing/repos.yaml');
  }

  const lines = registryYamlText.split('\n');
  // Anchored at start-of-line, NOT on a preceding '\n'. `repos:` is a legitimate first
  // line, and an indexOf('\nrepos:') miss would silently yield an empty set — which
  // reads as "nothing is registered" and reddens every sprint value at once.
  const start = lines.findIndex((l) => /^repos:\s*$/.test(l));
  if (start === -1) {
    throw new Error('registeredRepoIdentifiers: no top-level `repos:` key — pf reads the registry by that name');
  }

  const identifiers = new Set();
  let current = null;
  let explicitPath = false;

  const closeEntry = () => {
    // No `path:` in the block: pf defaults it to the entry name, which is already added.
    if (current !== null && !explicitPath) identifiers.add(current);
    current = null;
    explicitPath = false;
  };

  for (const line of lines.slice(start + 1)) {
    if (/^\s*(#.*)?$/.test(line)) continue; // blank or comment
    if (/^\S/.test(line)) break; // dedent to column 0 ends the repos block

    const entry = /^ {2}([A-Za-z0-9._\-/]+):\s*$/.exec(line);
    if (entry) {
      closeEntry();
      current = entry[1];
      identifiers.add(current);
      continue;
    }

    const path = /^ {4}path:\s*(.+?)\s*$/.exec(line);
    if (path && current !== null) {
      identifiers.add(path[1].replace(/^['"]|['"]$/g, ''));
      explicitPath = true;
    }
  }
  closeEntry();

  if (identifiers.size === 0) {
    throw new Error('registeredRepoIdentifiers: the `repos:` block registered no entries');
  }
  return identifiers;
}

/**
 * Every `repos:` token in `files` that `identifiers` does not recognise.
 *
 * `files` is `[{path, text}]`; the result is `[{file, line, token}]` with 1-indexed
 * lines, so a failure names what to fix and where. Values are comma-separated lists in
 * practice (`red-baron,joust,star-wars,lobby,.`), so each token is split and trimmed
 * independently — a whole-string check would pass that line, and an untrimmed split
 * would reject the legitimate `.` inside it. A file carrying no `repos:` line yields
 * nothing: AC-1 permits dropping the field, and the guard must not turn that "or"
 * into an "and".
 */
export function repoRoutingViolations(files, identifiers) {
  const violations = [];
  for (const { path: file, text } of files) {
    text.split('\n').forEach((line, index) => {
      const match = /^\s*repos:\s*(.*)$/.exec(line);
      if (!match) return;
      const value = match[1].trim().replace(/^['"]|['"]$/g, '');
      for (const token of value.split(',').map((t) => t.trim())) {
        if (token !== '' && !identifiers.has(token)) {
          violations.push({ file, line: index + 1, token });
        }
      }
    });
  }
  return violations;
}

/**
 * The live backlog — epic shards only. `current-sprint.yaml`, `sprint/planning/` and
 * `sprint/demos/` were checked and carry no `repos:` line at all. `sprint/archive/` is
 * excluded per ARCHIVE_POLICY above.
 *
 * Text is decoded to a string. A Buffer would match none of the anchored regexes here,
 * so the guard would report zero violations across every file and read as a clean pass.
 */
export function guardedSprintFiles(root) {
  const dir = join(root, 'sprint');
  return readdirSync(dir)
    .filter((f) => /^epic-.*\.yaml$/.test(f))
    .sort()
    .map((f) => ({ path: `sprint/${f}`, text: readFileSync(join(dir, f), 'utf8') }));
}

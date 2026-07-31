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

  for (const line of lines.slice(start + 1)) {
    if (/^\s*(#.*)?$/.test(line)) continue; // blank or comment
    if (/^\S/.test(line)) break; // dedent to column 0 ends the repos block

    // The entry NAME is always registered — pf defaults `path` to it when the key is
    // absent (`_parse_repo_entry`), so the name is valid either way. An earlier draft
    // carried an `explicitPath` flag to add the name only when no `path:` followed;
    // it was inert, because the name is added here unconditionally and a Set ignores
    // the repeat. Deleted rather than left looking load-bearing.
    const entry = /^ {2}([A-Za-z0-9._\-/]+):\s*$/.exec(line);
    if (entry) {
      current = entry[1];
      identifiers.add(current);
      continue;
    }

    const path = /^ {4}path:\s*(.+?)\s*$/.exec(line);
    if (path && current !== null) identifiers.add(path[1].replace(/^['"]|['"]$/g, ''));
  }

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
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      const match = /^\s*repos:\s*(.*)$/.exec(line);
      if (!match) return;
      const value = match[1].trim().replace(/^['"]|['"]$/g, '');

      // An empty scalar means the value is either a block sequence beneath the key
      // or nothing at all. Splitting '' on commas yields one empty token, which the
      // loop below skips — so the ORIGINAL code reported nothing here, and a whole
      // YAML form went unguarded. That form is not exotic: `pf/core/resolver.py:42`
      // reads `epic.get("repos", [])`, a LIST default, so the sequence is the shape
      // pf's own model expects and the natural fix for td1-15. Reading it here keeps
      // the guard alive on the day that bug is fixed.
      if (value === '') {
        const items = [];
        for (let ahead = index + 1; ahead < lines.length; ahead++) {
          const item = /^\s*-\s*(.+?)\s*$/.exec(lines[ahead]);
          if (!item) break;
          items.push({ line: ahead + 1, token: item[1].replace(/^['"]|['"]$/g, '') });
        }
        // No scalar AND no items: report the key itself rather than returning
        // nothing. Silence is exactly what let the sequence form through, so the
        // unreadable case must fail loud too — otherwise "return nothing when the
        // value is empty" satisfies the sequence test while preserving the hole.
        if (items.length === 0) {
          violations.push({ file, line: index + 1, token: '' });
          return;
        }
        for (const item of items) {
          if (!identifiers.has(item.token)) violations.push({ file, line: item.line, token: item.token });
        }
        return;
      }

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
 * The scalar a YAML line carries, or `null` if it carries none.
 *
 * Both shapes matter, and only one of them used to be scanned: a mapping entry
 * (`title: …`) and a sequence item (`- …`). The list item is not a nicety — it is the
 * shape that actually lost SH-1's acceptance criterion to a `#`.
 */
function scalarValue(line) {
  const item = /^\s*-\s*(.*)$/.exec(line);
  if (item) return item[1].trim();
  const entry = /^\s*[A-Za-z_][A-Za-z0-9_-]*:\s*(.*)$/.exec(line);
  if (entry) return entry[1].trim();
  return null;
}

/**
 * Values that will not survive the next `pf sprint story …` YAML round-trip.
 *
 * Two shapes, both observed in this repo rather than imagined:
 *
 * `unquoted-hash` — a bare `#` preceded by whitespace opens a YAML comment, so an
 * unquoted value containing one loses everything after it on the next write. This is
 * the SH-1 incident: `sprint/archive/epic-SH.yaml` still carries the repair, a
 * single-quoted acceptance criterion mentioning a `#branch ref`. Note WHERE it lives —
 * a list item, not a `key: value` line. The scan this replaces covered only the latter
 * and so could never have caught the incident it was named after.
 *
 * `complex-key` — a value containing ': ' can be emitted as an explicit YAML mapping
 * key (`- ? key` / `  : value`). The text survives but the TYPE does not: the criterion
 * parses as a dict instead of a string. mg1-14 arrived carrying one.
 *
 * Quoted values are safe in both cases and are not reported.
 */
export function yamlRoundTripRisks(files) {
  const risks = [];
  for (const { path: file, text } of files) {
    text.split('\n').forEach((line, index) => {
      const value = scalarValue(line);
      if (value === null) return;

      if (/^\?\s/.test(value)) {
        risks.push({ file, line: index + 1, kind: 'complex-key', text: line.trim() });
        return;
      }
      if (value === '' || /^['"]/.test(value)) return;
      if (/\s#/.test(value)) {
        risks.push({ file, line: index + 1, kind: 'unquoted-hash', text: line.trim() });
      }
    });
  }
  return risks;
}

/**
 * The epics that still have open work, and the stories that are still open.
 *
 * This is ARCHIVE_POLICY's rule applied rather than restated: no agent is ever routed
 * from a completed story, so a completed story's artefacts are a record and not live
 * routing. Text-and-regex, like everything else here — there is still no YAML parser.
 */
function liveScope(root) {
  const dir = join(root, 'sprint');
  const liveEpics = new Set();
  const openStories = new Set();

  for (const file of readdirSync(dir).filter((f) => /^epic-.*\.yaml$/.test(f))) {
    const lines = readFileSync(join(dir, file), 'utf8').split('\n');
    const starts = [];
    lines.forEach((line, i) => {
      if (/^ {2}- id: \S/.test(line)) starts.push(i);
    });

    let anyOpen = false;
    starts.forEach((start, n) => {
      const end = n + 1 < starts.length ? starts[n + 1] : lines.length;
      const block = lines.slice(start, end);
      if (block.some((l) => /^ {4}status: done\s*$/.test(l))) return;
      anyOpen = true;
      openStories.add(block[0].replace(/^ {2}- id:\s*/, '').trim());
    });

    if (anyOpen) liveEpics.add(file.slice('epic-'.length, -'.yaml'.length));
  }

  return { liveEpics, openStories };
}

/**
 * The generated context docs an agent can still be handed.
 *
 * The sweep corrected `sprint/epic-*.yaml`, but nobody reads those. `pf` renders them
 * into `sprint/context/*.md` as prose (`- **Repo:** {repos}`, `generate.py:73`), and
 * THAT is what a story setup puts in front of the next agent. Those files do not
 * self-heal: sm-setup regenerates a story context unconditionally but an epic context
 * only "if the epic has no context document yet", and the gate guarding it checks
 * existence, never freshness — so a drifted epic context passes forever. Filed upstream
 * as td1-16; this is the local half.
 *
 * Scope is live-only, for the same reason `sprint/archive/` is skipped. Text is decoded
 * to a string: a Buffer matches none of the anchored regexes and would report zero
 * violations across every file, reading as a clean pass.
 */
export function guardedContextFiles(root) {
  const { liveEpics, openStories } = liveScope(root);
  const dir = join(root, 'sprint', 'context');

  return readdirSync(dir)
    .filter((file) => {
      const match = /^context-(epic|story)-(.+)\.md$/.exec(file);
      if (!match) return false;
      return match[1] === 'epic' ? liveEpics.has(match[2]) : openStories.has(match[2]);
    })
    .sort()
    .map((file) => ({ path: `sprint/context/${file}`, text: readFileSync(join(dir, file), 'utf8') }));
}

/**
 * Every rendered `- **Repo:**` line that names something the registry does not know.
 *
 * The same token rules as the YAML scan — comma-split, trimmed — because this line is
 * that field, rendered. Shape mirrors `repoRoutingViolations` so a failure reads the
 * same way whichever side it comes from.
 */
export function contextRepoViolations(files, identifiers) {
  const violations = [];
  for (const { path: file, text } of files) {
    text.split('\n').forEach((line, index) => {
      const match = /^- \*\*Repo:\*\*\s*(.*)$/.exec(line);
      if (!match) return;
      for (const token of match[1].trim().split(',').map((t) => t.trim())) {
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

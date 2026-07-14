// Where the preserved original Atari source lives: IN THIS REPO, at
// reference/atari-source/<dirbase>/.
//
// It used to live under ~/Projects, vendored per-machine by `just vendor-source`.
// That made every ROM-fidelity claim unfalsifiable by anyone but the one laptop
// that happened to have the trees — the audit's tests crashed with ENOENT
// everywhere else, so no CI could ever gate them. The source is the evidence; it
// belongs with the code that cites it.
//
// One tree per game, not two. `vendorBytes()` transcribes text to LF-normalized
// ASCII but passes binaries through VERBATIM, so this single tree is both the
// greppable copy AND the byte-of-record: ALEXEC.LDA, SNDAUX.LDA and the numbered
// ROM dumps here are byte-identical to the pristine historicalsource clone. The
// ROM oracle is intact. Provenance (repo + pinned SHA) is in docs/reference-sources.md.
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_ROOT = join(ROOT, 'reference', 'atari-source');

// The vendored source tree for one game, keyed by the adapter's `dirbase`
// (`tempest`, `battlezone`, `red-baron`, `asteroids`, `star-wars-1983` — note the
// grandfathered -1983- name, cited across the sprint context files).
export function sourceDir(dirbase) {
  return join(SOURCE_ROOT, dirbase);
}

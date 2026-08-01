// Uploads a built Vite dist/ to its R2 bucket with correct Content-Types.
// wrangler r2 object put does NOT auto-detect content-type; a wrong type ships
// a broken static site (html downloads, js fails to load as a module), so every
// object is put with an explicit --content-type derived from its extension.
//
// Usage: node scripts/deploy-r2.mjs <distDir> <bucket> [keyPrefix] [--lobby-only]
//   node scripts/deploy-r2.mjs dist arcade-lobby --lobby-only     # the lobby, at the root
//   node scripts/deploy-r2.mjs dist/tempest  arcade-lobby  tempest  # one game, under its prefix
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lobbyOwnedEntries } from './build-app.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

export function contentTypeFor(fileName) {
  return TYPES[extname(fileName).toLowerCase()] ?? 'application/octet-stream';
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// Slashes are stripped from BOTH ends. `tempest`, `tempest/` and `/tempest/` are
// the same prefix to a caller, but `tempest//x` and `/tempest/x` are genuinely
// different R2 keys from `tempest/x` — they would 404 behind the custom domain
// while the upload reported success. A bare '/' normalises away entirely, to the
// root, rather than filing the whole app under an empty-named directory.
//
// One function, used by both the keys and the summary line, so a deploy cannot
// report a prefix it did not actually use.
export function normalizePrefix(keyPrefix = '') {
  return String(keyPrefix).replace(/^\/+|\/+$/g, '');
}

// Pure: walks distDir and computes the upload set. No wrangler, no side effects.
//
// `keyPrefix` puts a game's objects under its own key prefix in the shared bucket —
// one origin, one bucket, per-game deploy isolation: `node scripts/deploy-r2.mjs
// dist/tempest arcade-lobby tempest` touches only `tempest/…` keys and cannot
// disturb a sibling game or the lobby. The lobby passes no prefix and owns the
// root keys, which is what makes `/` the front door and `/<id>/` each game.
//
// `only` restricts the walk to a set of TOP-LEVEL entry names of distDir. It
// exists for exactly one caller — the lobby, whose distDir IS dist/, the parent
// of every game's dist/<id>/. See the `--lobby-only` note below.
//
// THE RETURNED ORDER IS PART OF THE CONTRACT: every .html entry point comes last.
// Do not "simplify" this away, and do not replace it with a plain sort.
//
// An upload is not atomic. It is a sequence of independent PUTs, and any one of
// them can be the last one that happens — on 2026-07-31 the cabinet's first deploy
// died on its FOURTH object when Cloudflare answered 523. An .html file is the
// COMMIT POINT: it is the object that switches the live site from the old build to
// the new one, because every other asset is content-hashed and therefore purely
// additive. Upload a page before the assets it references and a partial, failed
// deploy leaves that page LIVE and pointing at files that do not exist — a broken
// front door produced by a command that exited non-zero without saying which side
// of the commit point it stopped on.
//
// This used to work by accident: `index.html` sorted after `assets/` and `fonts/`
// because `i` follows `a` and `f`. That is not a guarantee. `walk()` returns raw
// `readdirSync` order and Node promises no ordering at all, so the protection was
// the filesystem's habit plus one letter — and it evaporates the moment a lobby
// grows a `manifest.json`, a `robots.txt` or a `sw.js`, or the deploy runs on a
// filesystem that hands directories back unsorted.
//
// Note this is a PARTITION, not a sort: relative order within each group is
// preserved, so the rule cannot depend on a filename's letters in either
// direction. And it is every .html file, not `index.html` — tempest and red-baron
// each ship a second entry point, star-wars a third.
const isEntryPoint = (key) => extname(key).toLowerCase() === '.html';

export function collectUploads(distDir, keyPrefix = '', { only } = {}) {
  if (!existsSync(distDir)) {
    throw new Error(`no files found under ${distDir} — did the build run?`);
  }
  let files = walk(distDir);
  if (only !== undefined) {
    const allowed = new Set(only);
    files = files.filter((file) => allowed.has(relative(distDir, file).split(/[\\/]/)[0]));
  }
  if (files.length === 0) throw new Error(`no files found under ${distDir} — did the build run?`);
  const trimmed = normalizePrefix(keyPrefix);
  const prefix = trimmed ? `${trimmed}/` : '';
  const uploads = files.map((file) => {
    const rel = relative(distDir, file).split('\\').join('/'); // POSIX keys on any OS
    const key = `${prefix}${rel}`;
    return { key, file, contentType: contentTypeFor(key) };
  });
  return [
    ...uploads.filter((u) => !isEntryPoint(u.key)),
    ...uploads.filter((u) => isEntryPoint(u.key)),
  ];
}

// `--lobby-only`: upload the lobby's OWN output, not the whole dist/ tree.
//
// PLAN DEFECT #21. The lobby's dist dir is dist/ itself, the parent of every
// game's dist/<id>/. That was harmless only while the lobby's build began by
// emptying dist/ — and it must not, because emptying it deleted all seven games
// (scripts/build-app.mjs, cleanLobbyOutput). With both facts true at once, an
// unrestricted `deploy-r2.mjs dist arcade-lobby` walks the games too: MEASURED at
// 34 objects, 29 of them games. The keys collide harmlessly with the prefixed
// legs, so nothing lands in the wrong place, but `just deploy-one lobby`
// republishes every game from whatever build happens to be on disk — including a
// game built at an older commit, or one already dropped from the fleet.
//
// The allowed set is NOT restated here: it is lobbyOwnedEntries() from
// build-app.mjs, the same function whose answer cleanLobbyOutput deletes.
export function onlyFor(distDir, { lobbyOnly = false } = {}) {
  return lobbyOnly ? lobbyOwnedEntries(distDir) : undefined;
}

// argv → the four things this script needs, so the justfile recipes' real
// argument lists can be exercised by a test without shelling out to wrangler.
export function parseArgs(argv) {
  const flags = argv.filter((a) => a.startsWith('--'));
  const positional = argv.filter((a) => !a.startsWith('--'));
  const unknown = flags.filter((f) => f !== '--lobby-only');
  if (unknown.length) throw new Error(`unknown flag ${unknown[0]}`);
  const [distDir, bucket, keyPrefix = ''] = positional;
  return { distDir, bucket, keyPrefix, lobbyOnly: flags.includes('--lobby-only') };
}

// The one function in this file that touches the network. Kept separate from
// uploadDir's loop so a test can substitute it — see `upload` below.
export function putObject({ bucket, key, file, contentType }) {
  execFileSync(
    'wrangler',
    ['r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--remote', '--content-type', contentType],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
}

// `options.upload` IS REQUIRED AND HAS NO DEFAULT. THIS IS DELIBERATE — DO NOT ADD ONE.
//
// It decides whether this function touches the live bucket, and a default would make
// the dangerous choice the silent one. That is not a hypothetical: on 2026-08-01 a test
// passed a stub to a version of this function that ignored it, every fixture object was
// PUT to the real `arcade-lobby` bucket, and arcade.slabgorb.com served a 15-byte stub
// until it was rebuilt. Restoring `= putObject` here re-arms exactly that: any caller who
// forgets the option gets a production deploy instead of an error.
//
// So it fails CLOSED. Callers that mean to deploy say so — see the CLI entry at the
// bottom, which is the one place in this repo that passes `upload: putObject`, and the
// one place that should be making that choice out loud.
export function uploadDir(distDir, bucket, keyPrefix = '', options = {}) {
  const { upload } = options;
  if (typeof upload !== 'function') {
    throw new Error(
      'uploadDir requires an `upload` function in its options — it has no default, on purpose. ' +
        'Pass `{ upload: putObject }` to really deploy, or a stub to record what would be uploaded.',
    );
  }
  const uploads = collectUploads(distDir, keyPrefix, { only: onlyFor(distDir, options) });
  for (const { key, file, contentType } of uploads) {
    console.log(`  ${bucket}/${key}  (${contentType})`);
    upload({ bucket, key, file, contentType });
  }
  const shown = normalizePrefix(keyPrefix);
  console.log(`Uploaded ${uploads.length} objects to ${bucket}${shown ? `/${shown}` : ''}.`);
}

// CLI entry (only when run directly, not when imported by the test).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { distDir, bucket, keyPrefix, lobbyOnly } = parseArgs(process.argv.slice(2));
  if (!distDir || !bucket) {
    console.error('Usage: node scripts/deploy-r2.mjs <distDir> <bucket> [keyPrefix] [--lobby-only]');
    process.exit(1);
  }
  // `upload: putObject` is the explicit, and only, opt-in to touching the live bucket.
  uploadDir(distDir, bucket, keyPrefix, { lobbyOnly, upload: putObject });
}

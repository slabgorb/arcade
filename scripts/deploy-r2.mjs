// Uploads a built Vite dist/ to its R2 bucket with correct Content-Types.
// wrangler r2 object put does NOT auto-detect content-type; a wrong type ships
// a broken static site (html downloads, js fails to load as a module), so every
// object is put with an explicit --content-type derived from its extension.
//
// Usage: node scripts/deploy-r2.mjs <distDir> <bucket>
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

// Pure: walks distDir and computes the upload set. No wrangler, no side effects.
export function collectUploads(distDir) {
  if (!existsSync(distDir)) {
    throw new Error(`no files found under ${distDir} — did the build run?`);
  }
  const files = walk(distDir);
  if (files.length === 0) throw new Error(`no files found under ${distDir} — did the build run?`);
  return files.map((file) => {
    const key = relative(distDir, file).split('\\').join('/'); // POSIX keys on any OS
    return { key, file, contentType: contentTypeFor(key) };
  });
}

export function uploadDir(distDir, bucket) {
  const uploads = collectUploads(distDir);
  for (const { key, file, contentType } of uploads) {
    console.log(`  ${bucket}/${key}  (${contentType})`);
    execFileSync(
      'wrangler',
      ['r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--remote', '--content-type', contentType],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
  }
  console.log(`Uploaded ${uploads.length} objects to ${bucket}.`);
}

// CLI entry (only when run directly, not when imported by the test).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [distDir, bucket] = process.argv.slice(2);
  if (!distDir || !bucket) {
    console.error('Usage: node scripts/deploy-r2.mjs <distDir> <bucket>');
    process.exit(1);
  }
  uploadDir(distDir, bucket);
}

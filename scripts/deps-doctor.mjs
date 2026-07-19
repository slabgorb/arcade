#!/usr/bin/env node
// deps-doctor — reconcile each subrepo's INSTALLED @arcade/shared against its PINNED
// version, and (re)install anything missing. Run as a preflight by `just serve` and as
// the body of `just install-all`.
//
// WHY THIS EXISTS
// @arcade/shared is a version-pinned git-URL dependency (github:slabgorb/arcade-shared#vX.Y.Z).
// Plain `npm install` does NOT re-resolve a bumped `#ref` — npm keeps the commit already
// cached in node_modules — so a pin bump can leave node_modules serving STALE bytes under a
// newer pin. That is exactly how the lobby shipped @arcade/shared v0.4.0 under a v0.16.0 pin
// and 500'd on the missing `/glow` subpath export, blanking the whole game grid.
//
// `npm ci` fixes it: it wipes node_modules and reinstalls EXACTLY per package-lock.json, whose
// `resolved` field carries the pinned commit. This doctor runs `npm ci` ONLY where the install
// has drifted from the pin (or is missing), so it is a no-op cost when everything is fresh.
//
// USAGE:  node scripts/deps-doctor.mjs <subrepo> [<subrepo> ...]
// Exits 0 if everything is (now) in sync, non-zero if a reconcile failed — so `just serve`
// aborts loudly rather than launching against stale bytes.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const subrepos = process.argv.slice(2);
if (subrepos.length === 0) {
  console.error("deps-doctor: no subrepos given (usage: deps-doctor.mjs <subrepo> ...)");
  process.exit(2);
}

const SHARED = "@arcade/shared";
// A version-tag pin like `github:owner/repo#v0.16.0` or `#0.16.0`. Non-version pins
// (a branch or commit — e.g. an in-flight arcade-shared feature branch) capture nothing,
// so we only reconcile those when node_modules is missing entirely, never on "drift".
const PIN_VERSION = /#v?(\d+\.\d+\.\d+)\b/;

let reconciled = 0;
const failed = [];

for (const g of subrepos) {
  const dir = join(root, g);
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    console.log(`  ${g.padEnd(11)} no package.json — skipped`);
    continue;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const spec = pkg.dependencies?.[SHARED] ?? pkg.devDependencies?.[SHARED];
  const nodeModules = join(dir, "node_modules");
  const installedPkg = join(nodeModules, "@arcade", "shared", "package.json");

  let reason = null;
  if (!existsSync(nodeModules)) {
    reason = "node_modules missing";
  } else if (spec) {
    const pin = spec.match(PIN_VERSION)?.[1] ?? null;
    const installed = existsSync(installedPkg)
      ? JSON.parse(readFileSync(installedPkg, "utf8")).version
      : null;
    if (pin && installed !== pin) {
      reason = `${SHARED} ${installed ?? "absent"} != pin ${pin}`;
    }
  }

  if (!reason) {
    console.log(`  ${g.padEnd(11)} OK`);
    continue;
  }

  // `npm ci` needs a lockfile; a repo without one (should not happen here) falls back
  // to `npm install`, which at least resolves a fresh git-dep correctly on first install.
  const cmd = existsSync(join(dir, "package-lock.json")) ? "ci" : "install";
  console.log(`  ${g.padEnd(11)} ${reason} → npm ${cmd}`);
  try {
    execFileSync("npm", [cmd], { cwd: dir, stdio: "inherit" });
    reconciled++;
  } catch {
    failed.push(g);
    console.error(`  ${g.padEnd(11)} npm ${cmd} FAILED`);
  }
}

const summary = `deps-doctor: ${reconciled} reconciled, ${failed.length} failed`;
console.log(failed.length ? `${summary} (${failed.join(", ")})` : summary);
process.exit(failed.length ? 1 : 0);

// The citation gates in tempest and red-baron read blobs from the commit their
// audit was taken against. Squashing history on import would delete those commits
// and the gates would fail forever. These tags keep them reachable; this test is
// the tripwire that notices if one is ever dropped or gc'd.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const AUDIT_REFS = [
  { tag: 'audit/tempest', sha: '4232ed4', probe: 'src/core/sim.ts' },
  { tag: 'audit/red-baron', sha: '6038a07b9044f1add37fd12c217cd39ec1629439', probe: 'src/core/flight.ts' },
];

for (const { tag, sha, probe } of AUDIT_REFS) {
  test(`${tag} resolves to a reachable commit`, () => {
    const resolved = execFileSync('git', ['rev-parse', `${tag}^{commit}`], { encoding: 'utf8' }).trim();
    assert.ok(resolved.startsWith(sha.slice(0, 7)), `${tag} points at ${resolved}, expected ${sha}`);
  });

  test(`${tag} can still serve blobs at the audited paths`, () => {
    // The gates call `git show <sha>:<path>` with paths relative to the OLD repo
    // root (src/…), not the monorepo path (plugins/<game>/src/…). The historical
    // commit's tree carries the old layout, which is exactly why this works.
    const text = execFileSync('git', ['show', `${sha}:${probe}`], { encoding: 'utf8' });
    assert.ok(text.length > 0, `${sha}:${probe} came back empty`);
  });
}

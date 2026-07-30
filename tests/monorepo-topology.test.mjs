// The cabinet-wide wiring invariants that lobby's `tests/scaffold.test.ts` used to
// assert per-repo, before Task 5 deleted it along with `lobby/vite.config.ts` (the
// file scaffold.test.ts existed to guard). The collapse to a single root
// `vite.config.ts` factory makes the invariant singular — and the codebase's own
// rule (centipede `scaffold.test.ts`: "cross-repo wiring invariants live in the
// ORCHESTRATOR suite") says this is where it belongs.
//
// Scope: ONLY the two lobby invariants Task 5's fix round owns. Task 12b extends
// this same file with the seven games' equivalent share (base `/<id>/`, per-game
// build.outDir, and the identical host-pin check run once per game) once Tasks
// 6-12 have imported them — do not add that share here.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('the lobby is served under base /', async () => {
  // The intent of the deleted `lobby/tests/scaffold.test.ts` "serves under base /"
  // assertion, which died with lobby/vite.config.ts in Task 5 Step 1.
  const { defineAppConfig } = await import('../vite.config.ts');
  const lobby = defineAppConfig({ id: 'lobby' });
  assert.equal(lobby.base, '/', 'the lobby must serve at the cabinet root, not under a subpath');
});

test('the dev-server host pin survives — strictPort alone does not protect it', async () => {
  // Replaces the per-repo scaffold assertion on strictPort + host:'127.0.0.1'
  // (originated jt1-3, ported fleet-wide as td1-1). Still load-bearing with one
  // dev server: a-1/a-2/a-3 race the same port, and an unpinned host lets a
  // second checkout's Vite bind [::1]:5270 alongside this one's 127.0.0.1:5270
  // with NO collision error at all — serving the whole cabinet from the wrong
  // working tree. strictPort only stops a second server on the SAME host from
  // wandering to a different port; it does nothing about the [::1] escape hatch.
  const { defineAppConfig } = await import('../vite.config.ts');
  const lobby = defineAppConfig({ id: 'lobby' });
  for (const block of ['server', 'preview']) {
    assert.equal(lobby[block].host, '127.0.0.1', `${block}.host must be pinned to IPv4 loopback`);
    assert.equal(lobby[block].strictPort, true, `${block}.strictPort must be true`);
    assert.equal(lobby[block].port, 5270, `${block}.port must stay pinned to 5270`);
  }
});

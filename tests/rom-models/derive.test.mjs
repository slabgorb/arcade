import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectToEdges, edgeKey, diffEdges } from '../../scripts/rom-models/derive.mjs';

const B = (p) => ({ point: p, draw: false }); // pen up
const V = (p) => ({ point: p, draw: true });  // pen down

test('connectToEdges: a pen-up op moves without drawing', () => {
  // .BD 1,2,3 rebased -> move 0, draw 1, draw 2
  assert.deepEqual(connectToEdges([B(0), V(1), V(2)]), [[0, 1], [1, 2]]);
});

test('connectToEdges: a leading draw op emits no edge (nothing to draw from)', () => {
  assert.deepEqual(connectToEdges([V(5), V(6)]), [[5, 6]]);
});

test('connectToEdges: a pen-up mid-list breaks the stroke', () => {
  assert.deepEqual(connectToEdges([B(0), V(1), B(4), V(5)]), [[0, 1], [4, 5]]);
});

test('connectToEdges: closes a ring when the list returns to its start', () => {
  assert.deepEqual(
    connectToEdges([B(0), V(1), V(2), V(0)]),
    [[0, 1], [1, 2], [2, 0]],
  );
});

test('edgeKey: undirected — orientation does not matter', () => {
  assert.equal(edgeKey([3, 1]), edgeKey([1, 3]));
});

test('diffEdges: reports each side exclusively, ignoring orientation', () => {
  const d = diffEdges([[0, 1], [1, 2]], [[1, 0], [2, 3]]);
  assert.deepEqual(d.onlyInRom, ['1-2']);
  assert.deepEqual(d.onlyInPort, ['2-3']);
});

test('diffEdges: identical sets diff to nothing', () => {
  const d = diffEdges([[0, 1]], [[1, 0]]);
  assert.deepEqual(d.onlyInRom, []);
  assert.deepEqual(d.onlyInPort, []);
});

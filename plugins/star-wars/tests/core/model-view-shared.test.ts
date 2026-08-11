// tests/core/model-view-shared.test.ts — SH4-1
//
// star-wars core/modelView held two of the extracted helpers (cellRects,
// fitDistance) plus a Model3D-signature modelBounds. Post-extraction it must
// RE-EXPORT the shared functions — including the shared modelBounds, whose
// signature is now `readonly Vec3[]` (red-baron's), NOT `Model3D`. Identity (===)
// proves the local copies are gone; the Model3D→vertices ripple in the tools and
// shell call sites is covered by their own suites (see SCOPE CORRECTION).
import { describe, it, expect } from 'vitest'
import * as shared from '@shared/model-view'
import * as modelView from '../../src/core/modelView'

describe('star-wars core/modelView re-exports @shared/model-view (SH4-1)', () => {
  it('cellRects is the shared function, not a local copy', () => {
    expect(modelView.cellRects).toBe(shared.cellRects)
  })
  it('fitDistance is the shared function, not a local copy', () => {
    expect(modelView.fitDistance).toBe(shared.fitDistance)
  })
  it('modelBounds is the shared function (now the readonly Vec3[] signature)', () => {
    expect(modelView.modelBounds).toBe(shared.modelBounds)
  })
})

// tests/tools/model-view-shared.test.ts — SH4-1
//
// red-baron's contact-sheet helpers (tools/sheetLayout.ts) were the "THIRD copy"
// that justified extracting cellRects/fitDistance/modelBounds into
// @shared/model-view. This wiring guard asserts sheetLayout RE-EXPORTS the shared
// functions rather than keeping its own byte-identical copies: identity (===), not
// mere equal behaviour, is what proves the duplication is actually gone. A
// re-introduced local copy would pass a behaviour test but fail these.
import { describe, it, expect } from 'vitest'
import * as shared from '@shared/model-view'
import * as sheetLayout from '../../src/tools/sheetLayout'

describe('red-baron sheetLayout re-exports @shared/model-view (SH4-1)', () => {
  it('cellRects is the shared function, not a local copy', () => {
    expect(sheetLayout.cellRects).toBe(shared.cellRects)
  })
  it('fitDistance is the shared function, not a local copy', () => {
    expect(sheetLayout.fitDistance).toBe(shared.fitDistance)
  })
  it('modelBounds is the shared function, not a local copy', () => {
    expect(sheetLayout.modelBounds).toBe(shared.modelBounds)
  })
})

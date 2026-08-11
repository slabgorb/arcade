// tests/core/model-view-shared.test.ts — SH4-1
//
// tempest core/modelView held only cellRects (the third helper set never grew
// fitDistance/modelBounds here) alongside its game-specific `flatTube`.
// Post-extraction it must RE-EXPORT the shared cellRects — identity (===), not a
// byte-identical local copy — while keeping flatTube local (flatTube is tempest's
// own board geometry and is NOT part of the shared lift).
import { describe, it, expect } from 'vitest'
import * as shared from '@shared/model-view'
import * as modelView from '../../src/core/modelView'

describe('tempest core/modelView re-exports @shared/model-view (SH4-1)', () => {
  it('cellRects is the shared function, not a local copy', () => {
    expect(modelView.cellRects).toBe(shared.cellRects)
  })

  it('keeps flatTube local (not part of the shared extraction)', () => {
    expect(typeof modelView.flatTube).toBe('function')
  })
})

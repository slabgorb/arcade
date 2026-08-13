import { version } from './package.json'
import type { GameMeta } from '@host/contract'

// Story ml1-5 laid the boot-stable scaffold (showcase: false — a black canvas
// may not claim a carousel slot). Story ml7-3 earns the flip: /millipede/ now
// boots into a live self-playing attract demo (src/core/attract.ts — a seeded
// field, the ROM's attract DDTs, the marching train) under the ROM HUD, so
// showcase goes true (tests/showcase-liveness.test.mjs derives the manual
// liveness roster from this flag). Order is 10 because pac-man owns 9. Colour
// and controls are placeholders — the authentic trackball/joystick input is the
// dossier's open question OQ-4 (resolved in a later ml* story).
export const meta: GameMeta = {
  id: 'millipede',
  title: 'MILLIPEDE',
  year: 1982,
  color: '#7ac142',
  controls: ['Mouse / Trackball'],
  order: 10,
  listed: true,
  showcase: true,
  version,
}

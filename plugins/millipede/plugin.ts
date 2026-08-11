import { version } from './package.json'
import type { GameMeta } from '@host/contract'

// Story ml1-5 — the boot-stable Millipede scaffold. Meta is deliberate, not a
// blind copy of joust: showcase is false because a black-canvas scaffold cannot
// boot into a live self-playing demo (only a showcased game may opt in — see
// tests/showcase-liveness.test.mjs). Order is 10 because pac-man owns 9. Colour
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
  showcase: false,
  version,
}

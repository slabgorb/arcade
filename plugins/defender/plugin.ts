import { version } from './package.json'
import type { GameMeta } from '@host/contract'

// Story df1-1 — the boot-stable Defender scaffold (absorbed from df1-5; see
// .session/df1-1-session.md). Meta is deliberate, not a blind copy of joust:
// showcase is false because a black-canvas scaffold cannot boot into a live
// self-playing demo (only a showcased game may opt in — see
// tests/showcase-liveness.test.mjs; df7 grows the attract demo and earns the
// flip). Order is 11 because millipede owns 10. Year is 1980 — MAME's
// attribution for the defender parent set (© 1980 Williams); the vendored
// INFO.SRC's "DR J. 1/21/81" is an assembly-note date, not a release year.
// Colour and controls are placeholders until the dossier and df3's ship land.
export const meta: GameMeta = {
  id: 'defender',
  title: 'DEFENDER',
  year: 1980,
  color: '#00d0a8',
  controls: ['Keyboard'],
  order: 11,
  listed: true,
  showcase: false,
  version,
}

import { version } from './package.json'
import type { GameMeta } from '@host/contract'

// Story df1-1 laid the boot-stable Defender scaffold (absorbed from df1-5; see
// .session/df1-1-session.md) with showcase:false — a black-canvas scaffold
// cannot boot into a live self-playing demo (only a showcased game may opt in —
// see tests/showcase-liveness.test.mjs). df7 grew that demo (df7-3 attract) and
// the whole played lifecycle (df7-1..df7-5), so df7-7 EARNS the flip: showcase
// is now true and Defender joins the lobby-showcase attract rotation (Decision E,
// the existing seam). Order is 11 because millipede owns 10. Year is 1980 —
// MAME's attribution for the defender parent set (© 1980 Williams); the vendored
// INFO.SRC's "DR J. 1/21/81" is an assembly-note date, not a release year.
export const meta: GameMeta = {
  id: 'defender',
  title: 'DEFENDER',
  year: 1980,
  color: '#00d0a8',
  controls: ['Keyboard'],
  order: 11,
  listed: true,
  showcase: true,
  version,
}

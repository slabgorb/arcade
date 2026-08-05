import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'missile-command',
  title: 'MISSILE COMMAND',
  year: 1980,
  color: '#d8d020',
  controls: ['AIM — Mouse / Trackball', 'FIRE — Z X C  (left / centre / right base)'],
  // order 8: tempest..red-baron already own 1..7 (red-baron is 7). The mc1-1
  // design doc said 7 — corrected here per the TEA design deviation.
  order: 8,
  listed: true,
  showcase: false,
  version,
}

import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'battlezone',
  title: 'BATTLEZONE',
  year: 1980,
  color: '#00ff41',
  controls: ['DRIVE — Arrows / E D I K', 'FIRE — Space / F'],
  order: 4,
  listed: true,
  showcase: false,
  version,
}

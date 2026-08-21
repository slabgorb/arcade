// @arcade/shared/volume-ui — the one shared DOM volume control (sa1-4).
//
// One HTML slider reused by the lobby (always visible) and every game (shown only
// while paused, so a DOM slider never fights sa1-3's pointer lock — pointer lock is
// released while paused). Chrome, not canvas: the games draw to canvas, but a volume
// knob is furniture, so it lives in the DOM above the playfield rather than being
// re-drawn and re-hit-tested in twelve renderers.
import { getMasterVolume, setMasterVolume, subscribeVolume } from './volume.js'

export interface VolumeControlHandle {
  readonly element: HTMLElement
  setVisible(visible: boolean): void
  destroy(): void
}

export function mountVolumeControl(opts: {
  root: ParentNode
  initiallyVisible?: boolean
}): VolumeControlHandle {
  const container = document.createElement('div')
  container.className = 'arcade-volume'
  container.hidden = opts.initiallyVisible !== true

  const label = document.createElement('label')
  label.className = 'arcade-volume__label'
  label.textContent = 'VOL'

  const input = document.createElement('input')
  input.type = 'range'
  input.min = '0'
  input.max = '1'
  input.step = '0.01'
  input.className = 'arcade-volume__slider'
  input.setAttribute('aria-label', 'Master volume')
  input.value = String(getMasterVolume())

  // The slider drives the store; a `reflecting` guard stops the store's own
  // change notification (below) from writing the slider's value back into the store
  // and doubling the event.
  let reflecting = false
  input.addEventListener('input', () => {
    if (reflecting) return
    setMasterVolume(input.valueAsNumber)
  })

  const off = subscribeVolume((v) => {
    reflecting = true
    input.value = String(v)
    reflecting = false
  })

  label.appendChild(input)
  container.appendChild(label)
  opts.root.appendChild(container)

  return {
    element: container,
    setVisible: (visible: boolean) => void (container.hidden = !visible),
    destroy: () => {
      off()
      container.remove()
    },
  }
}

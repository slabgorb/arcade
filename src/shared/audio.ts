// src/audio.ts
//
// SH2-16 (epic SH2) — @arcade/shared/audio, the shared shell-side WebAudio SFX
// engine. A BROWSER subpath (it touches `AudioContext`, a browser global), so it is
// fenced from the pure core by the purity guard like glow/view/esc-overlay — never
// added to PURE_SUBPATHS.
//
// This is the VERB four cabinets hand-write today (tempest is the reference impl):
// lazy-context-on-gesture, silent-degrade at every failure path, a master GainNode,
// buffer loading/decoding, and POKEY-style channel voice-stealing. The NUMBERS —
// the per-cabinet SOUNDS manifest, CHANNELS map, baseUrl, masterGain — pass in as
// config and stay in each game (design: share the VERB, not the NUMBERS).
//
// One carve-out from silent-degrade (sw6-2): a LOOP requested before its buffer
// decodes is remembered and started when the decode lands — the first user gesture
// both unlocks the context AND fires the run-start music cue, so the opening theme
// otherwise loses the race against its own ~MB decode on every cold load, forever.
// One-shots still drop when early (a late laser is worse than none), and a loop
// parked on a file that FAILED to load warns instead of pending in silence — a
// missing asset must stay distinguishable from a slow one.
//
// Generic over the game's sound-name union `N`, so `play(name)` stays typed at the
// consumer. arcade-shared's own tests are untyped (esbuild strips types), so the
// generic is validated at the consumer — tempest's `tsc` build (SH2-16 AC-5).
//
// Buffers are keyed by FILENAME (not logical name): a manifest mapping several names
// to one `.wav` fetches/decodes that file ONCE and both names resolve to it
// (design §4.1 — the asteroids N:1 case, absorbed as a superset rather than a mode).

export interface AudioEngine<N extends string> {
  // Create/resume the AudioContext and start loading samples. Safe to call
  // repeatedly (e.g. on every user gesture); only the first call does work. A no-op
  // until called, and forever if WebAudio is absent.
  resume(): void
  // Play a loaded sample once. Steals its channel. No-op if the sound is not loaded,
  // the context is not ready, or audio is unavailable.
  play(name: N): void
  // Start a sustained (looping) sample on its channel. Steals the channel like
  // play(), so only one loop rings per channel. If the sample has not decoded YET,
  // the request is remembered (one per channel — last request wins) and honoured
  // when its decode lands (sw6-2); if its load already FAILED, it warns instead.
  // Still a silent no-op before resume() or without WebAudio.
  startLoop(name: N): void
  // Stop the sustained sample sounding on `name`'s channel — including a loop
  // requested but not yet decoded (the pending start is cancelled). A safe no-op
  // when nothing is looping there.
  stopLoop(name: N): void
  // True once at least one sample has decoded — NOT a gate for any specific sound:
  // the smallest file's decode flips it long before the big music buffers land.
  // Mainly for tests / readiness UI.
  ready(): boolean
  // Advance the priority window by ONE frame (jt5-5). Only meaningful for a
  // manifest that declares `priorities`; inert otherwise, so the six cabinets
  // that never call it are unaffected either way. Callers drive it from their own
  // fixed-step loop, once per simulated frame.
  tick(): void
}

export interface AudioManifest<N extends string> {
  // Where the `.wav` samples are hosted (each sound's filename is appended).
  baseUrl: string
  // Master volume, 0..1. Headroom so overlapping SFX don't clip. Default 0.4.
  masterGain?: number
  // Logical name -> filename (per-cabinet NUMBERS). Multiple names may map to one
  // file — that file is fetched/decoded once (buffers are keyed by filename).
  sounds: Record<N, string>
  // Logical name -> logical channel (per-cabinet NUMBERS). A new sound on an
  // occupied channel steals (stops) whatever was sounding there.
  channels: Record<N, string>
  // ─── Priority arbitration (jt5-5) — OPTIONAL, and off unless declared ──────
  // Six of this arcade's seven cabinets are multi-voice machines whose sounds
  // simply mix, and they pass neither map: with `priorities` absent, every path
  // below is skipped and the engine behaves exactly as it did before this
  // existed. The seventh, joust, is a Williams machine with ONE sound voice
  // arbitrated by a priority byte, which is what these two describe.
  //
  // Names appearing in `priorities` form a SINGLE arbitrated voice — one, not one
  // per channel, because the machine has one. A new arbitrated sound is REFUSED
  // while a strictly higher-priority one is still inside its window; equal or
  // higher interrupts. Names absent from the map are outside arbitration
  // entirely and keep plain per-channel stealing.
  priorities?: Partial<Record<N, number>>
  // How many `tick()`s an arbitrated sound holds the voice for. A name with a
  // priority but no duration here holds it for zero frames — it sounds, and
  // refuses nothing. Missing is not an error: silent degrade is this engine's
  // rule at every other failure path too.
  frameDurations?: Partial<Record<N, number>>
}

// Resolve the AudioContext constructor, covering the legacy `webkitAudioContext`
// prefix (older Safari/iOS) and non-browser environments. Read off `globalThis`
// with an explicit shape — `AudioContext` is a global ambient, not a member of the
// `Window` interface, so a bare `window.AudioContext` access won't typecheck.
function getAudioContextCtor(): typeof AudioContext | undefined {
  const g = globalThis as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  return g.AudioContext ?? g.webkitAudioContext
}

const DEFAULT_MASTER_GAIN = 0.4

export function createAudioEngine<N extends string>(manifest: AudioManifest<N>): AudioEngine<N> {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let loadStarted = false
  // Keyed by FILENAME so several logical names sharing one `.wav` decode once.
  const buffers = new Map<string, AudioBuffer>()
  // The source currently sounding on each logical channel, so the next trigger on
  // that channel can steal (stop) it. Cleared by `onended` when a source finishes on
  // its own, so a later trigger never tries to stop a node that already ended.
  const live = new Map<string, AudioBufferSourceNode>()
  // A loop requested before its file decoded, keyed by CHANNEL like `live` — one
  // pending name per channel, last request wins, honoured when the decode lands
  // (sw6-2). One-shots never enter this map.
  const pending = new Map<string, N>()
  // Files whose fetch/decode failed. A loop request against one of these must warn
  // and drop, never park forever — slow and missing are different failures.
  const failed = new Set<string>()
  // The single arbitrated voice (jt5-5). `voiceFrames` is the machine's `STMR`:
  // a countdown of FRAMES, decremented by tick(), and the priority comparison
  // only happens while it is non-zero. `voiceChannel` is which channel that voice
  // is sounding on, needed because an arbitrated sound may steal one sounding on
  // a DIFFERENT channel — a separate channel must not buy a second voice.
  let voicePriority = 0
  let voiceFrames = 0
  let voiceChannel: string | null = null

  // Release the arbitrated voice: nothing is sounding, so the next sound of any
  // priority is accepted with no comparison at all.
  function releaseVoice(): void {
    voicePriority = 0
    voiceFrames = 0
    voiceChannel = null
  }

  // Start every pending loop that was waiting on `file` — the decode just landed,
  // so the remembered request plays exactly as if it had arrived now.
  function startPendingFor(file: string): void {
    for (const [channel, name] of pending) {
      if (manifest.sounds[name] === file) {
        pending.delete(channel)
        startSource(name, true)
      }
    }
  }

  // A file's load failed: remember that, and surface any pending loop parked on it.
  function failLoad(file: string): void {
    failed.add(file)
    for (const [channel, name] of pending) {
      if (manifest.sounds[name] === file) {
        pending.delete(channel)
        console.warn(`@arcade/shared/audio: "${name}" (${file}) failed to load — its loop will not play`)
      }
    }
  }

  // Fetch + decode every DISTINCT sample file once. A failure on any one file
  // (network, CORS, undecodable) is swallowed — that sound simply never plays —
  // except that a pending LOOP parked on the failed file warns (see failLoad).
  function load(): void {
    if (loadStarted || !ctx) return
    loadStarted = true
    const context = ctx
    const files = new Set<string>(Object.values<string>(manifest.sounds))
    for (const file of files) {
      fetch(manifest.baseUrl + file)
        .then((res) => res.arrayBuffer())
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => {
          buffers.set(file, buffer)
          startPendingFor(file)
        })
        .catch(() => {
          failLoad(file)
        })
    }
  }

  function resume(): void {
    if (!ctx) {
      const Ctor = getAudioContextCtor()
      if (!Ctor) return // no WebAudio — engine stays inert
      try {
        ctx = new Ctor()
        master = ctx.createGain()
        master.gain.value = manifest.masterGain ?? DEFAULT_MASTER_GAIN
        master.connect(ctx.destination)
      } catch {
        // A blocked-autoplay context (or any ctor failure) leaves the game silent.
        ctx = null
        master = null
        return
      }
    }
    // The context can start 'suspended' until a gesture unlocks it.
    if (ctx.state === 'suspended') void ctx.resume()
    load()
  }

  // Steal a channel: stop whatever is sounding on it so a new trigger cuts in. Its
  // own guard, separate from starting any replacement — a prior source that already
  // ended would throw on stop(), and that must NOT abort the cut-in.
  function stopChannel(channel: string): void {
    const prev = live.get(channel)
    if (!prev) return
    live.delete(channel)
    try {
      prev.stop()
      prev.disconnect()
    } catch {
      /* prior source may have already ended — ignore */
    }
  }

  // Start a buffer source on `name`'s channel, optionally looping. Shared by the
  // one-shot play() and the sustained startLoop() — the only difference is
  // `source.loop`. Steals the channel first so retriggers cut in instead of
  // stacking; silently no-ops when unavailable or unloaded.
  function startSource(name: N, loop: boolean): void {
    if (!ctx || !master) return
    const file = manifest.sounds[name]
    const channel = manifest.channels[name]
    // The machine's `SND` routine, in order (jt5-5). `?? undefined` rather than a
    // falsy test: 0 is the LOWEST priority, not the absence of one.
    const priority = manifest.priorities?.[name]
    // Refuse BEFORE anything is built. A refused sound must leave no trace —
    // no node, no pending loop request, and above all no change to the sounding
    // voice's window, since re-arming it on every refusal would extend it forever.
    if (priority !== undefined && voiceFrames > 0 && priority < voicePriority) return
    const buffer = buffers.get(file)
    if (!buffer) {
      // A one-shot that arrives early is dropped for good — a laser half a second
      // late is worse than a silent one (sw6-2 scopes the fix to loops).
      if (!loop) return
      if (failed.has(file)) {
        console.warn(`@arcade/shared/audio: "${name}" (${file}) failed to load — its loop will not play`)
        return
      }
      // Still decoding: remember the request. The decode honours it late; a newer
      // request on this channel (or stopLoop) replaces/cancels it first.
      pending.set(channel, name)
      return
    }
    // A direct start supersedes any older request still pending on this channel.
    pending.delete(channel)
    const destination = master
    stopChannel(channel)
    // An accepted arbitrated sound takes the ONE voice, so whatever was sounding
    // on it stops even though it is on another channel.
    if (priority !== undefined && voiceChannel !== null && voiceChannel !== channel) {
      stopChannel(voiceChannel)
    }
    try {
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = loop
      source.connect(destination)
      // Forget a source once it finishes so it isn't left as the channel's "live"
      // voice; otherwise the next trigger would stop an already-ended node. (A
      // looping source never fires onended on its own — stopLoop ends it.)
      source.onended = () => {
        if (live.get(channel) === source) live.delete(channel)
      }
      source.start()
      live.set(channel, source)
      // Claim the voice only now, having actually started. The machine's sounds
      // are always available; ours can still be decoding or have 404'd, and a
      // sound that never sounded must not hold a window against real audio — that
      // would be audible silence caused by an inaudible cue.
      if (priority !== undefined) {
        voicePriority = priority
        voiceFrames = manifest.frameDurations?.[name] ?? 0
        voiceChannel = channel
      }
    } catch {
      /* never let a single sound failure crash the frame */
    }
  }

  function play(name: N): void {
    startSource(name, false)
  }

  function startLoop(name: N): void {
    startSource(name, true)
  }

  function stopLoop(name: N): void {
    const channel = manifest.channels[name]
    // A loop cancelled before it decodes must never start — clear the pending
    // request as well as the live voice, or the fix would fade music up seconds
    // after the phase that wanted it has ended.
    pending.delete(channel)
    stopChannel(channel)
    // Silencing the arbitrated voice frees it immediately: the window describes
    // how long a sound RINGS, so it cannot outlive one that has been stopped.
    if (voiceChannel === channel) releaseVoice()
  }

  function ready(): boolean {
    return buffers.size > 0
  }

  // One frame of the caller's clock. Floors at zero rather than running negative,
  // so a loop that keeps ticking an idle voice cannot drift the counter into a
  // state where the next sound is wrongly refused.
  function tick(): void {
    if (voiceFrames > 0) {
      voiceFrames -= 1
      if (voiceFrames === 0) releaseVoice()
    }
  }

  return { resume, play, startLoop, stopLoop, ready, tick }
}

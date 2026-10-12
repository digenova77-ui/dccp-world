// Iris voice I/O. Nothing is captured before explicit opt-in. Recognition restarts itself,
// speech is chunked by sentence with a watchdog per chunk, so nothing can hang.
// Audio is never stored or sent anywhere by this code; the browser's own speech service may
// process recognition audio (disclosed to the visitor before opt-in).
//
// Design notes (from field failures):
// - No separate getUserMedia stream is held open. A live mic stream puts phones into call mode,
//   which ducks or mutes speech synthesis and makes other audio sound like a buzz. Recognition
//   opens the mic itself only while it is listening; the orb waveform is synthesized from state.
// - The first speak() must happen synchronously inside a user gesture (Safari, some Chrome builds).
//   main.ts calls speak() for the greeting directly in the entry click handler.
// - Chrome drops an utterance spoken immediately after cancel(), and can get stuck paused.
//   We only cancel when something is queued, call resume(), and keep a reference to the live
//   utterance so it is not garbage-collected before onend fires.
// - If speech is blocked (never starts), we remember the text and replay it on the next gesture.

type Rec = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number
  start(): void; stop(): void; abort(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  onspeechstart?: (() => void) | null
  onspeechend?: (() => void) | null
}

export type VoiceState = 'off' | 'listening' | 'hearing' | 'thinking' | 'speaking' | 'unavailable'

export function recognitionSupported(): boolean {
  const w = window as unknown as Record<string, unknown>
  return typeof w.SpeechRecognition === 'function' || typeof w.webkitSpeechRecognition === 'function'
}
export function synthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function'
}

export function splitSentences(text: string, max = 180): string[] {
  const parts = text.match(/[^.!?]+[.!?]*/g) ?? [text]
  const out: string[] = []
  for (let p of parts.map(s => s.trim()).filter(Boolean)) {
    while (p.length > max) {
      const cut = p.lastIndexOf(',', max) > 40 ? p.lastIndexOf(',', max) + 1 : p.lastIndexOf(' ', max)
      out.push(p.slice(0, cut).trim())
      p = p.slice(cut).trim()
    }
    if (p) out.push(p)
  }
  return out
}

const PREFERRED = ['Microsoft Aria Online (Natural) - English (United States)', 'Microsoft Aria Online (Natural)', 'Microsoft Jenny Online (Natural) - English (United States)', 'Microsoft Jenny Online (Natural)', 'Google UK English Female', 'Samantha', 'Ava', 'Allison', 'Karen', 'Moira', 'Serena', 'Google US English', 'Microsoft Zira - English (United States)', 'Microsoft Zira']

export function isEcho(heard: string, spoken: string): boolean {
  const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  const a = fold(heard)
  const b = fold(spoken)
  if (a.length < 8 || !b) return false
  if (b.includes(a)) return true
  const aw = a.split(' ').filter(w => w.length > 2)
  const bw = new Set(b.split(' ').filter(w => w.length > 2))
  if (aw.length < 3) return false
  const hit = aw.filter(w => bw.has(w)).length
  return hit / aw.length >= 0.6
}

export function pickVoice(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const vs = all.filter(v => v.lang?.toLowerCase().replace('_', '-').startsWith('en'))
  for (const n of PREFERRED) {
    const v = vs.find(x => x.name === n) ?? vs.find(x => x.name.startsWith(n))
    if (v) return v
  }
  return vs.find(v => /natural|female|aria|jenny|samantha|ava/i.test(v.name)) ?? vs.find(v => v.localService) ?? vs[0] ?? null
}

export class IrisVoice {
  state: VoiceState = 'off'
  micLevel = 0
  speechLevel = 0
  /** True when the browser refused to start speech; replayed on the next user gesture. */
  blocked = false
  readonly spectrum = new Uint8Array(64)
  onUtterance: ((text: string) => void) | null = null
  onState: ((s: VoiceState) => void) | null = null
  onSpoken: ((text: string) => void) | null = null
  private rec: Rec | null = null
  private wantListen = false
  private queue: string[] = []
  private speakingToken = 0
  private restartTimer: number | undefined
  private boundaryPulse = 0
  private hearPulse = 0
  private voice: SpeechSynthesisVoice | null = null
  private recFailures = 0
  private current: SpeechSynthesisUtterance | null = null
  private lastText = ''
  private everStarted = false

  constructor() {
    if (synthesisSupported()) {
      const pick = () => { this.voice = pickVoice(speechSynthesis.getVoices()) }
      pick()
      speechSynthesis.addEventListener?.('voiceschanged', pick)
    }
  }

  private set(s: VoiceState): void {
    if (this.state === s) return
    this.state = s
    this.onState?.(s)
  }

  /** Opt-in: start speech recognition (the browser opens the mic only while listening). */
  async enableMic(): Promise<boolean> {
    if (!recognitionSupported()) {
      this.set('unavailable')
      return false
    }
    const w = window as unknown as Record<string, new () => Rec>
    const R = w.SpeechRecognition ?? w.webkitSpeechRecognition
    const rec = new R()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onstart = () => { this.recFailures = 0; if (this.state !== 'speaking') this.set('listening') }
    rec.onspeechstart = () => { this.hearPulse = 1 }
    rec.onresult = e => {
      let final = ''
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      this.hearPulse = 1
      if (interim && !isEcho(interim, this.lastText) && this.state === 'speaking') this.yieldToListener()
      if (interim && this.state === 'listening') this.set('hearing')
      const said = final.trim()
      if (!said || isEcho(said, this.lastText)) return
      if (this.state === 'speaking') this.yieldToListener()
      this.set('thinking')
      try { this.onUtterance?.(said) } catch (err) { console.warn('iris utterance handler failed', err) }
    }
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        this.wantListen = false
        this.set('unavailable')
      } else this.recFailures += 1
    }
    rec.onend = () => { if (this.state === 'hearing' || this.state === 'listening') this.set(this.wantListen ? 'listening' : 'off'); this.scheduleRestart() }
    this.rec = rec
    this.wantListen = true
    this.scheduleRestart(50)
    return true
  }

  disableMic(): void {
    this.wantListen = false
    clearTimeout(this.restartTimer)
    try { this.rec?.abort() } catch { /* already stopped */ }
    if (this.state !== 'speaking') this.set('off')
  }

  /** The live utterance (held so the engine cannot garbage-collect it before onend). */
  get activeUtterance(): SpeechSynthesisUtterance | null {
    return this.current
  }

  get micOn(): boolean {
    return this.wantListen
  }

  private scheduleRestart(delay = 250): void {
    clearTimeout(this.restartTimer)
    if (!this.wantListen || !this.rec) return
    const backoff = Math.min(8000, delay * 2 ** Math.min(this.recFailures, 5))
    this.restartTimer = setTimeout(() => {
      if (!this.wantListen || !this.rec || document.hidden) {
        if (document.hidden && this.wantListen) this.scheduleRestart(1000)
        return
      }
      try { this.rec.start() } catch { this.scheduleRestart(600) }
    }, backoff) as unknown as number
  }

  /** Speak text as Iris. A new call cuts off whatever she is saying. Resolves when finished or abandoned. Never rejects. */
  speak(text: string): Promise<void> {
    const token = ++this.speakingToken
    this.queue = splitSentences(text)
    this.lastText = text
    this.onSpoken?.(text)
    if (!synthesisSupported() || this.queue.length === 0) return Promise.resolve()
    const interrupting = !!(this.current || speechSynthesis.speaking || speechSynthesis.pending)
    try {
      if (interrupting) speechSynthesis.cancel()
      speechSynthesis.resume()
    } catch { /* ignore */ }
    clearTimeout(this.restartTimer)
    try { this.rec?.abort() } catch { /* ignore */ }
    if (!this.voice) this.voice = pickVoice(speechSynthesis.getVoices())
    this.set('speaking')
    // The mic comes back while she is still talking, so the next prompt can cut in.
    this.scheduleRestart(400)
    const run = () => new Promise<void>(resolve => {
      const next = () => {
        if (token !== this.speakingToken) return resolve()
        const chunk = this.queue.shift()
        if (!chunk) {
          this.current = null
          this.set(this.wantListen ? 'listening' : 'off')
          this.scheduleRestart(200)
          return resolve()
        }
        const u = new SpeechSynthesisUtterance(chunk)
        this.current = u
        if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang }
        else u.lang = 'en-US'
        u.rate = 1.0
        u.pitch = 1.05
        u.volume = 1
        let done = false
        let started = false
        const finish = () => { if (done) return; done = true; clearTimeout(dog); clearTimeout(startDog); next() }
        const dog = setTimeout(() => { try { speechSynthesis.cancel() } catch { /* ignore */ } finish() }, 4000 + chunk.length * 110)
        const startDog = setTimeout(() => {
          if (started || token !== this.speakingToken) return
          try { speechSynthesis.cancel() } catch { /* ignore */ }
          if (!this.everStarted) this.blocked = true
          this.speakingToken++
          this.queue = []
          this.current = null
          this.set(this.wantListen ? 'listening' : 'off')
          this.scheduleRestart(400)
          resolve()
        }, 3500)
        u.onstart = () => { started = true; this.everStarted = true; this.blocked = false; clearTimeout(startDog) }
        u.onend = finish
        u.onerror = ev => {
          const err = (ev as SpeechSynthesisErrorEvent).error
          if (err === 'interrupted' || err === 'canceled') return finish()
          if (err === 'not-allowed') { this.blocked = true; this.speakingToken++; this.queue = []; clearTimeout(dog); clearTimeout(startDog); this.set(this.wantListen ? 'listening' : 'off'); return resolve() }
          finish()
        }
        u.onboundary = () => { this.boundaryPulse = 1 }
        try { speechSynthesis.speak(u) } catch { finish() }
      }
      next()
    })
    // Chrome drops an utterance spoken in the same turn as cancel().
    if (!interrupting) return run()
    return new Promise(resolve => {
      setTimeout(() => {
        if (token !== this.speakingToken) return resolve()
        run().then(resolve)
      }, 70)
    })
  }

  /** She was talking. The listener has the floor now. */
  private yieldToListener(): void {
    this.speakingToken++
    this.queue = []
    this.current = null
    try { speechSynthesis.cancel() } catch { /* ignore */ }
    this.set('hearing')
  }

  /** Call synchronously from a user gesture: replays speech the browser refused earlier. */
  retryIfBlocked(): boolean {
    if (!this.blocked || !this.lastText) return false
    this.blocked = false
    void this.speak(this.lastText)
    return true
  }

  stopSpeaking(): void {
    this.speakingToken++
    this.queue = []
    this.current = null
    try { speechSynthesis.cancel() } catch { /* ignore */ }
    this.set(this.wantListen ? 'listening' : 'off')
    this.scheduleRestart(200)
  }

  /** Call every frame: synthesizes the orb's waveform from Iris's state (no mic stream needed). */
  update(dt: number, t: number): void {
    this.boundaryPulse = Math.max(0, this.boundaryPulse - dt * 3.5)
    this.hearPulse = Math.max(0, this.hearPulse - dt * 1.6)
    const speaking = this.state === 'speaking'
    const hearing = this.state === 'hearing' || this.hearPulse > 0.05
    const target = speaking ? 0.45 + 0.25 * Math.sin(t * 17) * Math.sin(t * 5.3) + 0.35 * this.boundaryPulse : 0
    this.speechLevel += (target - this.speechLevel) * Math.min(1, dt * 10)
    const mic = hearing ? 0.25 + 0.3 * this.hearPulse * (0.6 + 0.4 * Math.sin(t * 23)) : this.state === 'listening' ? 0.06 + 0.04 * Math.sin(t * 2.1) : 0
    this.micLevel += (mic - this.micLevel) * Math.min(1, dt * 8)
    const amp = Math.max(this.speechLevel, this.micLevel)
    for (let i = 0; i < this.spectrum.length; i++) {
      const band = Math.exp(-((i - 10) ** 2) / 120) * 0.9 + Math.exp(-((i - 28) ** 2) / 60) * 0.4
      const wobble = 0.6 + 0.4 * Math.sin(t * (6 + i * 0.37) + i * 1.7)
      this.spectrum[i] = Math.max(0, Math.min(255, Math.round(255 * amp * band * wobble)))
    }
  }
}

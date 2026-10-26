// A quiet, airy generative pad. Off by default; only plays after the visitor turns on Ambient music.
// No energy below ~200 Hz (small speakers render low drones as a buzz), sine partials only,
// slow chord changes, and it ducks to near-silence while Iris speaks.
const CHORDS = [
  [293.66, 440.0, 554.37, 659.25], // D  A  C#  E
  [261.63, 392.0, 493.88, 659.25], // C  G  B   E
  [246.94, 369.99, 493.88, 587.33], // B  F# B  D
  [277.18, 415.3, 554.37, 739.99], // C# G# C# F#
]
const LEVEL = 0.07

export class Ambient {
  private master: GainNode | null = null
  private voices: { osc: OscillatorNode; gain: GainNode }[] = []
  private on = false
  private ducked = false
  private chord = 0
  private timer: number | undefined

  constructor(private ctx: AudioContext) {}

  private build(): void {
    const ctx = this.ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 200
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2400
    hp.connect(lp).connect(this.master).connect(ctx.destination)
    CHORDS[0].forEach((f, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f
      osc.detune.value = (i - 1.5) * 3
      const gain = ctx.createGain()
      gain.gain.value = 0.22 / (i + 1)
      osc.connect(gain).connect(hp)
      osc.start()
      this.voices.push({ osc, gain })
    })
  }

  private step(): void {
    if (!this.on) return
    this.chord = (this.chord + 1) % CHORDS.length
    const t = this.ctx.currentTime
    CHORDS[this.chord].forEach((f, i) => this.voices[i]?.osc.frequency.setTargetAtTime(f, t, 2.5))
    this.timer = setTimeout(() => this.step(), 14000) as unknown as number
  }

  private apply(): void {
    if (!this.master) return
    const t = this.ctx.currentTime
    const target = this.on ? (this.ducked ? LEVEL * 0.15 : LEVEL) : 0
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(target, t, this.on && !this.ducked ? 1.5 : 0.25)
  }

  set(on: boolean): void {
    this.on = on
    if (on && !this.master) this.build()
    clearTimeout(this.timer)
    if (on) this.timer = setTimeout(() => this.step(), 14000) as unknown as number
    this.apply()
  }

  /** Lower the pad while Iris is speaking. */
  duck(d: boolean): void {
    if (this.ducked === d) return
    this.ducked = d
    this.apply()
  }
}

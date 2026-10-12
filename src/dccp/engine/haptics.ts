// Haptics: phone vibration and gamepad rumble only. (An audio 'thump' fallback was removed:
// small speakers render sub-bass pulses as a buzz.)
export type HapticKind = 'tap' | 'select' | 'arrive' | 'seal' | 'warn' | 'wake'

const PATTERNS: Record<HapticKind, { vibrate: number | number[]; strong: number; weak: number; ms: number; hz: number; gain: number }> = {
  tap: { vibrate: 12, strong: 0.15, weak: 0.3, ms: 40, hz: 70, gain: 0.25 },
  select: { vibrate: [18, 30, 18], strong: 0.35, weak: 0.5, ms: 90, hz: 60, gain: 0.35 },
  arrive: { vibrate: [10, 40, 25], strong: 0.5, weak: 0.4, ms: 160, hz: 48, gain: 0.4 },
  seal: { vibrate: [30, 50, 30, 50, 60], strong: 0.8, weak: 0.6, ms: 260, hz: 42, gain: 0.5 },
  warn: { vibrate: [60, 40, 60], strong: 0.6, weak: 0.9, ms: 200, hz: 90, gain: 0.35 },
  wake: { vibrate: [20, 60, 40, 60, 80], strong: 0.6, weak: 0.4, ms: 420, hz: 36, gain: 0.55 },
}

export class Haptics {
  enabled = true
  pulse(kind: HapticKind): void {
    if (!this.enabled) return
    const p = PATTERNS[kind]
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(p.vibrate)
    } catch { /* unsupported */ }
    try {
      for (const pad of navigator.getGamepads?.() ?? []) {
        const act = (pad as Gamepad & { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } })?.vibrationActuator
        if (act?.playEffect) {
          void act.playEffect('dual-rumble', { duration: p.ms, strongMagnitude: p.strong, weakMagnitude: p.weak }).catch(() => {})
        }
      }
    } catch { /* unsupported */ }
  }
}

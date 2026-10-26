import '../styles/card.css'
import type { Tier, TierInfo } from '../world/geo'

/** Provenance is always visible. Tone decides the badge colour. */
export type Tone = 'live' | 'verified' | 'empirical' | 'pilot' | 'design' | 'mock' | 'stale' | 'offline'
export interface CardItem { label: string; value: string; wide?: boolean; /** action id passed to onAction, turning the row into a button */ action?: string }
export interface CardBar { label: string; value: number; display: string }
export interface CardLayer {
  key: 'macro' | 'logic' | 'physics'
  /** One or two plain sentences. The Macro lead must read without numbers. */
  lead: string
  items?: CardItem[]
  bars?: { title: string; rows: CardBar[] }
  /** Gold "honest boundary" box: what this is not. */
  boundary?: string
  source?: string
}
export interface CardAction { id: string; label: string; primary?: boolean }
export interface CardModel {
  id: string
  level: number
  path: string[]
  title: string
  subtitle?: string
  badge: { label: string; tone: Tone }
  layers: CardLayer[]
  actions?: CardAction[]
  /** Center numbers, labels and fields in this card (David's build law). */
  center?: boolean
}

const LAYER_NAME: Record<CardLayer['key'], string> = { macro: 'Macro', logic: 'Logic', physics: 'Physics' }
const LAYER_HINT: Record<CardLayer['key'], string> = { macro: 'What it is', logic: 'How it works', physics: 'The evidence' }
const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export class Card {
  readonly el: HTMLElement
  onAction: ((cardId: string, actionId: string) => void) | null = null
  onClose: (() => void) | null = null
  onUp: (() => void) | null = null
  private model: CardModel | null = null
  private layer = 0
  private open = false
  private touch: { x: number; y: number; t: number } | null = null
  private reduced = false

  constructor(host: HTMLElement) {
    this.el = document.createElement('section')
    this.el.className = 'card'
    this.el.hidden = true
    this.el.setAttribute('role', 'region')
    this.el.setAttribute('aria-live', 'polite')
    host.appendChild(this.el)
    this.el.addEventListener('click', e => this.onClick(e))
    this.el.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { this.setLayer(this.layer + 1); e.stopPropagation() }
      if (e.key === 'ArrowLeft') { this.setLayer(this.layer - 1); e.stopPropagation() }
    })
    this.el.addEventListener('touchstart', e => { const t = e.touches[0]; this.touch = { x: t.clientX, y: t.clientY, t: performance.now() } }, { passive: true })
    this.el.addEventListener('touchend', e => {
      if (!this.touch) return
      const t = e.changedTouches[0]
      const dx = t.clientX - this.touch.x, dy = t.clientY - this.touch.y
      this.touch = null
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) this.setLayer(this.layer + (dx < 0 ? 1 : -1))
      else if (dy < -50 && !this.open) this.setOpen(true)
      else if (dy > 60 && this.open && this.el.querySelector('.c-body')!.scrollTop <= 0) this.setOpen(false)
    }, { passive: true })
    // Gentle 3D tilt toward the pointer: the card is a physical slab, text floats above it.
    window.addEventListener('pointermove', e => {
      if (this.el.hidden || this.reduced) return
      const rx = ((e.clientY / innerHeight) - 0.5) * -5
      const ry = ((e.clientX / innerWidth) - 0.5) * 7
      this.el.style.setProperty('--rx', `${rx.toFixed(2)}deg`)
      this.el.style.setProperty('--ry', `${ry.toFixed(2)}deg`)
    }, { passive: true })
  }

  setReducedMotion(on: boolean): void {
    this.reduced = on
    this.el.classList.toggle('still', on)
    if (on) { this.el.style.setProperty('--rx', '0deg'); this.el.style.setProperty('--ry', '0deg') }
  }

  get current(): CardModel | null { return this.model }
  get isOpen(): boolean { return !this.el.hidden }

  show(m: CardModel, keepLayer = false): void {
    const same = this.model?.id === m.id
    this.model = m
    if (!(same && keepLayer)) { this.layer = 0; this.open = false }
    this.layer = Math.min(this.layer, m.layers.length - 1)
    this.render()
    if (this.el.hidden) {
      this.el.hidden = false
      this.el.classList.remove('enter')
      void this.el.offsetWidth
      this.el.classList.add('enter')
    }
  }

  /** Refresh live content without resetting the visitor's layer or open state. */
  refresh(m: CardModel): void {
    if (this.model?.id !== m.id || this.el.hidden) return
    this.model = m
    const scroll = this.el.querySelector('.c-body')?.scrollTop ?? 0
    this.render()
    const b = this.el.querySelector('.c-body')
    if (b) b.scrollTop = scroll
  }

  hide(): void {
    this.el.hidden = true
    this.model = null
  }

  setOpen(on: boolean): void {
    this.open = on
    this.el.dataset.state = on ? 'open' : 'peek'
    this.el.querySelector('.c-pull')?.setAttribute('aria-expanded', String(on))
  }

  setLayer(i: number): void {
    if (!this.model) return
    const n = this.model.layers.length
    const next = Math.max(0, Math.min(n - 1, i))
    if (next === this.layer && this.open) return
    this.layer = next
    if (!this.open) this.open = true
    this.render()
    this.el.querySelector<HTMLButtonElement>(`.c-tabs button[data-i="${next}"]`)?.focus({ preventScroll: true })
  }

  private onClick(e: Event): void {
    const t = (e.target as HTMLElement).closest('button, .c-lead') as HTMLElement | null
    if (!t || !this.model) return
    if (t.classList.contains('c-x')) { this.hide(); this.onClose?.(); return }
    if (t.classList.contains('c-up')) { this.onUp?.(); return }
    if (t.classList.contains('c-pull') || t.classList.contains('c-lead')) { this.setOpen(!this.open); return }
    if (t.dataset.i !== undefined) { this.setLayer(Number(t.dataset.i)); return }
    if (t.dataset.action) this.onAction?.(this.model.id, t.dataset.action)
  }

  private render(): void {
    const m = this.model
    if (!m) return
    const L = m.layers[this.layer]
    const lvl = String(m.level).padStart(2, '0')
    const items = L.items?.length ? `<div class="c-cells${m.center ? ' centered' : ''}">${L.items.map(it => it.action
      ? `<button class="c-cell go${it.wide ? ' wide' : ''}" data-action="${esc(it.action)}" aria-label="${esc(it.label)}: ${esc(it.value)}. Go there."><span>${esc(it.label)}</span><strong>${esc(it.value)}</strong></button>`
      : `<div class="c-cell${it.wide ? ' wide' : ''}"><span>${esc(it.label)}</span><strong>${esc(it.value)}</strong></div>`).join('')}</div>` : ''
    const max = Math.max(1e-9, ...(L.bars?.rows.map(r => r.value) ?? [1]))
    const bars = L.bars?.rows.length ? `<figure class="c-bars"><figcaption>${esc(L.bars.title)}</figcaption>${L.bars.rows.map(r => `<div class="c-bar"><span>${esc(r.label)}</span><i style="--w:${Math.max(2, (r.value / max) * 100).toFixed(1)}%"></i><b>${esc(r.display)}</b></div>`).join('')}</figure>` : ''
    this.el.dataset.state = this.open ? 'open' : 'peek'
    this.el.setAttribute('aria-label', `${m.title} card, ${LAYER_NAME[L.key]} layer`)
    this.el.innerHTML = `
      <div class="c-slab">
        <header class="c-head">
          <button class="c-up" aria-label="Up one level" title="Up one level">←</button>
          <div class="c-ttl">
            <div class="c-kick"><b>LEVEL ${lvl}</b>${m.path.map(p => `<span>${esc(p)}</span>`).join('<em>→</em>')}</div>
            <h2>${esc(m.title)}</h2>
            ${m.subtitle ? `<div class="c-sub">${esc(m.subtitle)}</div>` : ''}
          </div>
          <div class="c-badge tone-${m.badge.tone}"><i></i>${esc(m.badge.label)}</div>
          <button class="c-x" aria-label="Close card" title="Close">×</button>
        </header>
        <p class="c-lead">${esc(m.layers[this.open ? this.layer : 0].lead)}</p>
        <button class="c-pull" aria-expanded="${this.open}">${this.open ? 'Fold away' : 'Pull up for more'}</button>
        <nav class="c-tabs" role="tablist" aria-label="Layers">${m.layers.map((l, i) => `<button role="tab" data-i="${i}" aria-selected="${i === this.layer}" class="${i === this.layer ? 'on' : ''}"><b>${String(i + 1).padStart(2, '0')}</b> ${LAYER_NAME[l.key]}<small>${LAYER_HINT[l.key]}</small></button>`).join('')}</nav>
        <div class="c-body" role="tabpanel">
          ${items}${bars}
          ${L.boundary ? `<div class="c-bound"><b>Honest boundary</b>${esc(L.boundary)}</div>` : ''}
        </div>
        <footer class="c-foot"><span>${esc(L.source ?? '')}</span>${m.layers.length > 1 ? '<span class="c-hint">Swipe layers</span>' : ''}</footer>
        ${m.actions?.length ? `<div class="c-actions">${m.actions.map(a => `<button data-action="${a.id}" class="${a.primary ? 'primary' : ''}">${esc(a.label)}</button>`).join('')}</div>` : ''}
      </div>`
  }
}

/** Scale ladder. Drawn outward: cosmic at the top, the human at the bottom. Tap to move over the spot you are on. */
export class Ladder {
  readonly el: HTMLElement
  onTier: ((t: Tier) => void) | null = null
  private current: Tier | null = null

  constructor(host: HTMLElement, tiers: TierInfo[]) {
    this.el = document.createElement('nav')
    this.el.className = 'ladder'
    this.el.setAttribute('aria-label', 'Scale, from you outward')
    this.el.hidden = true
    const outward = [...tiers].sort((a, b) => b.altitude - a.altitude)
    this.el.innerHTML = `<div class="l-rail"></div>${outward.map(t => `<button data-t="${t.key}" aria-label="${t.name}: ${t.what}"><i></i><span><b>${t.name}</b><small>${t.what}</small></span></button>`).join('')}`
    host.appendChild(this.el)
    this.el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('button')
      if (b?.dataset.t) this.onTier?.(b.dataset.t as Tier)
    })
  }

  show(): void { this.el.hidden = false }
  hide(): void { this.el.hidden = true }

  set(t: Tier): void {
    if (t === this.current) return
    this.current = t
    this.el.querySelectorAll<HTMLButtonElement>('button').forEach(b => {
      const on = b.dataset.t === t
      b.classList.toggle('on', on)
      if (on) b.setAttribute('aria-current', 'step')
      else b.removeAttribute('aria-current')
    })
  }
}

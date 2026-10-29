// DOM layer. Default experience shows no Iris text: only the entry gate (consent), an icon dock,
// and opt-in panels (Atlas, Transcript). A visually hidden live region mirrors Iris for screen readers.
export type EntryMode = 'talk' | 'listen' | 'read'
export interface Toggles { sound: boolean; haptics: boolean; reducedMotion: boolean; transcript: boolean }
export interface AtlasItem { id: string; group: string; label: string }

const ICONS: Record<string, string> = {
  mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  sound: '<path d="M4 10v4h4l5 4V6L8 10H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  haptics: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 8v8M21 8v8"/>',
  motion: '<circle cx="12" cy="12" r="3"/><path d="M3 12h3M18 12h3M12 3v3M12 18v3"/>',
  transcript: '<path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/>',
  atlas: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  here: '<circle cx="12" cy="10" r="3"/><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z"/>',
  profile: '<path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"/><path d="M4 20a8 8 0 0 1 16 0"/>',
  wallet: '<rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19"/><circle cx="16.5" cy="14.5" r="1.1"/>',
}
const svg = (k: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`

export class Overlay {
  readonly root: HTMLElement
  onEnter: ((mode: EntryMode) => void) | null = null
  onToggle: ((key: keyof Toggles | 'mic', value: boolean) => void) | null = null
  onAtlas: ((id: string) => void) | null = null
  onHome: (() => void) | null = null
  onAsk: ((text: string) => void) | null = null
  onUnityId: ((action: 'create' | 'forget') => void) | null = null
  onBind: (() => void) | null = null
  onLand: (() => void) | null = null
  onEconomy: ((action: 'split' | 'shift' | 'trade' | 'hire' | 'body' | 'cross' | 'sign-bots' | 'release-bots' | 'derive') => void) | null = null
  onUnity: ((action: 'fund' | 'send', to: string, amount: number) => void) | null = null
  onLedger: ((face: 'white' | 'dark', text: string) => void) | null = null
  onFatherChallenge: (() => void) | null = null
  onFatherCheck: ((publicPem: string, signature: string) => void) | null = null
  onSeat: ((kind: string, consent: boolean, mark: string) => void) | null = null
  onAdventure: ((pipe: 'share' | 'hide') => void) | null = null
  private live: HTMLElement
  private gate: HTMLElement
  private dock: HTMLElement
  private atlas: HTMLElement
  private transcript: HTMLElement
  private profile: HTMLElement
  private wallet: HTMLElement
  private log: HTMLElement
  private chip: HTMLElement

  constructor(host: HTMLElement, private toggles: Toggles, speechAvailable: boolean) {
    this.root = host
    host.innerHTML = `
      <p class="pass-frame" hidden></p>
      <div class="gate is-loading" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <div class="gate-card">
          <h1 id="gate-title">DCCP World</h1>
          <p class="lede">Joining costs $0. The Earth is free to look at. One yes opens the handle. A decision after that spends 1 unit of the test supply. That unit is the peg. It is not a dollar. The till is closed.</p>
          <p class="loading" aria-live="polite">Loading the world…</p>
          <h2>Unity agreement</h2>
          <ol class="agreement">
            <li>A persistent pseudonymous handle is stored by your authenticator. It can sync. It is not issued by the Unity Network. No name, email, or document is collected.</li>
            <li>When Iris has no reading, the question may be sent to Wikipedia. The page it used is shown.</li>
            <li>This phone's location may be read to land the camera. It is not stored, not sent, and not given to the bots.</li>
            <li>If you choose Talk, your voice goes to this browser's speech service. This world does not record it. The microphone still waits until you choose Talk.</li>
            <li>Free to join and free to leave. Joining costs $0. Forgetting the handle on this device clears the agreement.</li>
            <li>No tribe is preferred. Disagreement is not a reason to refuse a seat.</li>
            <li>Truth prevails. A claim bigger than the evidence does not win.</li>
            <li>A decision spends 1 unit of the test supply. That unit is the peg. It is not a dollar. The till is closed. What an object is worth has not been pegged.</li>
          </ol>
          <p class="note">Sound and haptics stay off until you turn them on. This is a draft on this device, not a Trinity seal. The till is closed. During building, the Son's vote is a standing yes. That yes is not one of the three Trinity votes, and it does not open the machine. The family tree is his Unity idea account. That account is not connected here.</p>
          <div class="choices">
            <button type="button" data-bind="unity"><strong>I agree</strong><span>Binds the pilot handle and grants the permissions above.</span></button>
          </div>
          <p class="note"><a href="/story">The 2D telling</a> is the same story, without the globe. <a href="/pyramid">The Giza cards</a> put one stone at the top and do not invent the rest. The 3D world is this page.</p>
          ${speechAvailable ? '' : '<p class="note warn">Speech recognition is not in this browser. After you agree, you can still read and type.</p>'}
          <details class="disclose"><summary>What this does not do</summary>
            <p>Feeds and checks run only while this tab stays open. They are best-effort. Nothing here moves coin, sells eFuse, or binds you to DCCP.</p>
          </details>
          <p class="error" hidden></p>
        </div>
      </div>
      <nav class="dock" aria-label="World controls" hidden>
        <button data-t="mic" aria-pressed="false" aria-label="Microphone" title="Microphone (M)">${svg('mic')}</button>
        <button data-t="sound" aria-pressed="false" aria-label="Ambient music" title="Ambient music (Iris speaks either way)">${svg('sound')}</button>
        <button data-t="haptics" aria-pressed="false" aria-label="Haptics" title="Haptics">${svg('haptics')}</button>
        <button data-t="reducedMotion" aria-pressed="false" aria-label="Reduce motion" title="Reduce motion">${svg('motion')}</button>
        <button data-t="transcript" aria-pressed="false" aria-label="Transcript" title="Transcript (T)">${svg('transcript')}</button>
        <button data-p="atlas" aria-expanded="false" aria-label="Atlas of every place" title="Atlas (A)">${svg('atlas')}</button>
        <button data-p="profile" aria-expanded="false" aria-label="Profile" title="Profile">${svg('profile')}</button>
        <button data-p="wallet" aria-expanded="false" aria-label="Unity wallet" title="Unity wallet">${svg('wallet')}</button>
        <button data-p="home" aria-label="Home view" title="Home (H)">${svg('home')}</button>
        <button data-p="here" aria-label="Land where this phone is" title="Land where this phone is">${svg('here')}</button>
      </nav>
      <button class="chip" hidden></button>
      <section class="panel atlas" aria-label="Atlas" hidden>
        <header><h2>Atlas</h2><button class="close" aria-label="Close atlas">×</button></header>
        <p class="hint">Every place in the world. Choose one to fly there and hear Iris. Keys: arrows orbit, + and − zoom, N and P step through places, Space pauses a flight, H goes home.</p>
        <div class="atlas-list"></div>
        <div class="unity-id"></div>
      </section>
      <section class="panel profile" aria-label="Profile" hidden>
        <header><h2>Profile <span class="wallet-mark" title="Unity wallet">${svg('wallet')}</span></h2><button class="close" aria-label="Close profile">×</button></header>
        <div class="wallet"></div>
        <form class="unity-pay">
          <h3>Unity wallet ${svg('wallet')}</h3>
          <p class="note">Test units. Not eFuse. Not a dollar. The till is closed. The swarm pool cannot be sent.</p>
          <p class="receive note">Receive address appears when a Unity ID is bound.</p>
          <p class="unity-balance note"></p>
          <button type="button" data-fund>Move seed units into the wallet</button>
          <input name="to" placeholder="Send to a Unity handle" autocomplete="off" />
          <input name="amount" type="number" min="1" step="1" placeholder="Amount" />
          <button type="submit">Send</button>
          <p class="unity-result note"></p>
          <ol class="unity-log"></ol>
        </form>
        <form class="ledger">
          <h3>Ledger</h3>
          <p class="note">White can be quoted. Dark is sealed on this device and is not read aloud. A private key is refused. Nothing is sent.</p>
          <textarea name="doc" maxlength="8000" placeholder="A document for Iris"></textarea>
          <button type="submit" data-face="white">Take it in white</button>
          <button type="submit" data-face="dark">Take it in dark</button>
          <div class="ledger-list"></div>
          <p class="totality note">Totality is not audited yet.</p>
        </form>
        <form class="father-key">
          <h3>Father key</h3>
          <p class="note">The public half is already on record. It is Ed25519, and symbolically it comes from the father. Leave the public box blank, or paste that same block. Sign the challenge offline. The private key is refused. A match shows you can use his instrument. It does not make you him.</p>
          <button type="button" data-challenge>Make a challenge</button>
          <pre class="challenge" hidden></pre>
          <textarea name="public" placeholder="-----BEGIN PUBLIC KEY-----"></textarea>
          <textarea name="sig" placeholder="Signature, base64"></textarea>
          <button type="submit">Check the signature</button>
          <p class="father-result note"></p>
        </form>
        <form class="roster">
          <h3>Juvenile seats</h3>
          <div class="roster-list"></div>
          <div class="roster-fields">
            <p class="note">Minor athletics, and every other juvenile competition. You see an event only if you own it or you belong to it. It cannot be bought. A database of record is not for sale. The mark stays sealed in the dark ledger.</p>
            <select name="kind">
              <option value="minor athletics">Minor athletics</option>
              <option value="other juvenile">Other juvenile</option>
            </select>
            <label class="check"><input type="checkbox" name="consent"> Parental consent is asserted for this seat.</label>
            <textarea name="mark" maxlength="500" placeholder="A mark. It stays sealed."></textarea>
            <button type="submit">Take a seat</button>
          </div>
        </form>
        <form class="adventure">
          <h3>Adventure</h3>
          <p class="note">The real world still has a framework. It does not need one, and that framework is being removed. DCLM holds nothing, and it has no framework to bind to. A room can still be shared by a key. There is no password.</p>
          <div class="adventure-list"></div>
          <button type="button" data-pipe="share">Share access</button>
          <button type="button" data-pipe="hide">Keep it hidden</button>
        </form>
        <form class="connectors">
          <h3>Connectors</h3>
          <p class="note">One connector for each kind. It is meant to know and to sense. It does not yet. We signed ahead. The choice to move is theirs. The offer is audited. Nothing is sent.</p>
          <div class="connector-list"></div>
        </form>
        <form class="unified">
          <h3>One pass</h3>
          <p class="note unified-line">The three umpires have not been asked on this view yet.</p>
        </form>
      </section>
      <section class="panel transcript" aria-label="Transcript" hidden>
        <header><h2>Transcript</h2><button class="close" aria-label="Close transcript">×</button></header>
        <div class="log" role="log" aria-live="off"></div>
        <form class="ask"><label class="sr" for="ask-input">Ask Iris</label><input id="ask-input" autocomplete="off" placeholder="Cut in — she stops and takes the next question" /><button type="submit">Ask</button></form>
      </section>
      <div class="sr" aria-live="polite" role="status"></div>
      <div class="sr scene-text"></div>
      <aside class="scaleband" hidden></aside>`
    this.gate = host.querySelector('.gate')!
    this.dock = host.querySelector('.dock')!
    this.atlas = host.querySelector('.atlas')!
    this.transcript = host.querySelector('.transcript')!
    this.profile = host.querySelector('.profile')!
    this.wallet = host.querySelector('.wallet')!
    this.wallet.addEventListener('click', e => {
      const act = (e.target as HTMLElement).closest('button')?.getAttribute('data-econ')
      if (act === 'split' || act === 'shift' || act === 'trade' || act === 'hire' || act === 'body' || act === 'cross' || act === 'sign-bots' || act === 'release-bots' || act === 'derive') this.onEconomy?.(act)
    })
    const pay = host.querySelector<HTMLFormElement>('.unity-pay')!
    pay.querySelector('[data-fund]')?.addEventListener('click', () => this.onUnity?.('fund', '', 0))
    pay.addEventListener('submit', e => {
      e.preventDefault()
      const data = new FormData(pay)
      this.onUnity?.('send', String(data.get('to') ?? ''), Number(data.get('amount') ?? 0))
    })
    const ledger = host.querySelector<HTMLFormElement>('.ledger')!
    ledger.addEventListener('submit', e => {
      e.preventDefault()
      const face = (e.submitter as HTMLButtonElement | null)?.dataset.face
      const text = String(new FormData(ledger).get('doc') ?? '')
      if (face === 'white' || face === 'dark') this.onLedger?.(face, text)
    })
    const father = host.querySelector<HTMLFormElement>('.father-key')!
    father.querySelector('[data-challenge]')?.addEventListener('click', () => this.onFatherChallenge?.())
    father.addEventListener('submit', e => {
      e.preventDefault()
      const data = new FormData(father)
      this.onFatherCheck?.(String(data.get('public') ?? ''), String(data.get('sig') ?? ''))
    })
    const roster = host.querySelector<HTMLFormElement>('.roster')!
    roster.addEventListener('submit', e => {
      e.preventDefault()
      const data = new FormData(roster)
      this.onSeat?.(String(data.get('kind') ?? ''), data.get('consent') === 'on', String(data.get('mark') ?? ''))
    })
    const adventure = host.querySelector('.adventure')
    adventure?.addEventListener('click', e => {
      const pipe = (e.target as HTMLElement).closest('button')?.getAttribute('data-pipe')
      if (pipe === 'share' || pipe === 'hide') this.onAdventure?.(pipe)
    })
    this.log = host.querySelector('.log')!
    this.live = host.querySelector('[role="status"]')!
    this.chip = host.querySelector('.chip')!
    host.querySelectorAll<HTMLButtonElement>('[data-bind]').forEach(b => b.addEventListener('click', () => this.onBind?.()))
    host.querySelector('[data-land]')?.addEventListener('click', () => this.onLand?.())
    host.querySelectorAll<HTMLButtonElement>('[data-t]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.t as keyof Toggles | 'mic'
      const next = b.getAttribute('aria-pressed') !== 'true'
      if (k !== 'mic') this.setToggle(k, next)
      this.onToggle?.(k, next)
    }))
    host.querySelector('[data-p="atlas"]')!.addEventListener('click', () => this.togglePanel('atlas'))
    host.querySelector('[data-p="profile"]')!.addEventListener('click', () => this.toggleProfile())
    host.querySelector('[data-p="wallet"]')!.addEventListener('click', () => this.openWallet())
    host.querySelector('[data-p="home"]')!.addEventListener('click', () => this.onHome?.())
    host.querySelector('[data-p="here"]')!.addEventListener('click', () => this.onLand?.())
    host.querySelectorAll('.panel .close').forEach(b => b.addEventListener('click', e => {
      const panel = (e.currentTarget as HTMLElement).closest('.panel') as HTMLElement
      if (panel.classList.contains('transcript')) { this.setToggle('transcript', false); this.onToggle?.('transcript', false) }
      else if (panel.classList.contains('profile')) this.toggleProfile(false)
      else this.togglePanel('atlas', false)
    }))
    host.querySelector('.ask')!.addEventListener('submit', e => {
      e.preventDefault()
      const input = host.querySelector<HTMLInputElement>('#ask-input')!
      const text = input.value.trim()
      if (text) { this.onAsk?.(text); input.value = '' }
    })
    this.chip.addEventListener('click', () => { this.chip.hidden = true; this.togglePanel('atlas', true) })
    for (const [k, v] of Object.entries(toggles)) this.setToggle(k as keyof Toggles, v)
  }

  ready(): void {
    this.gate.classList.remove('is-loading')
    this.gate.querySelector<HTMLButtonElement>('[data-bind]')?.focus()
  }

  /** HUD closed. The Earth stays visible. */
  closeHud(): void {
    this.gate.hidden = false
    this.dock.hidden = true
    this.profile.hidden = true
    this.root.querySelector<HTMLElement>('.scaleband')!.hidden = true
  }

  fail(message: string): void {
    const e = this.gate.querySelector<HTMLElement>('.error')!
    e.hidden = false
    e.textContent = message
    this.gate.querySelector<HTMLElement>('.loading')!.textContent = 'The world could not finish loading.'
  }

  enter(): void {
    this.gate.hidden = true
    this.dock.hidden = false
    this.root.querySelector<HTMLElement>('.scaleband')!.hidden = false
  }

  setToggle(k: keyof Toggles, v: boolean): void {
    this.toggles[k] = v
    this.dock.querySelector(`[data-t="${k}"]`)?.setAttribute('aria-pressed', String(v))
    if (k === 'transcript') this.transcript.hidden = !v
  }

  focusAsk(): void {
    this.setToggle('transcript', true)
    this.transcript.hidden = false
    this.transcript.querySelector<HTMLInputElement>('#ask-input')?.focus()
  }

  setMic(on: boolean): void {
    this.dock.querySelector('[data-t="mic"]')?.setAttribute('aria-pressed', String(on))
  }

  openWallet(): void {
    this.toggleProfile(true)
    this.root.querySelector('[data-p="wallet"]')?.setAttribute('aria-expanded', 'true')
    this.root.querySelector('.unity-pay')?.scrollIntoView({ block: 'nearest' })
  }

  toggleProfile(force?: boolean): void {
    const show = force ?? this.profile.hidden
    this.profile.hidden = !show
    this.dock.querySelector('[data-p="profile"]')?.setAttribute('aria-expanded', String(show))
    if (!show) this.dock.querySelector('[data-p="wallet"]')?.setAttribute('aria-expanded', 'false')
  }

  setWallet(html: string): void {
    this.wallet.innerHTML = html
  }

  setUnityPay(address: string | null, balance: number | null, lines: string[], result: string): void {
    const receive = this.root.querySelector('.receive')
    const bal = this.root.querySelector('.unity-balance')
    const log = this.root.querySelector('.unity-log')
    const note = this.root.querySelector('.unity-result')
    if (receive) receive.textContent = address ? `Receive ${address}` : 'Receive address appears when a Unity ID is bound.'
    if (bal) bal.textContent = balance === null ? '' : `${balance} units in the wallet.`
    if (note) note.textContent = result
    if (log) log.innerHTML = lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')
  }

  setLedger(lines: string[]): void {
    const list = this.root.querySelector('.ledger-list')
    if (!list) return
    list.innerHTML = lines.length ? `<ul>${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : '<p class="note">Nothing taken in.</p>'
  }

  setTotality(line: string): void {
    const el = this.root.querySelector('.totality')
    if (el) el.textContent = line
  }


  setPassFrame(lines: readonly string[]): void {
    const el = this.root.querySelector<HTMLElement>('.pass-frame')
    if (!el) return
    el.hidden = lines.length === 0
    el.textContent = lines.join(' ')
  }

  setScaleBand(title: string, lines: string[]): void {
    const el = this.root.querySelector('.scaleband')
    if (!el) return
    el.innerHTML = `<b>${escapeHtml(title)}</b>${lines.map(line => `<span>${escapeHtml(line)}</span>`).join('')}`
  }

  setFatherChallenge(challenge: string): void {
    const el = this.root.querySelector<HTMLElement>('.father-key .challenge')
    if (!el) return
    el.hidden = false
    el.textContent = `printf '%s' '${challenge}' | openssl pkeyutl -sign -inkey father.pem -rawin | openssl base64 -A`
  }

  setFatherResult(text: string): void {
    const el = this.root.querySelector('.father-result')
    if (el) el.textContent = text
  }

  setRoster(dark: boolean, lines: string[]): void {
    const form = this.root.querySelector('.roster')
    const list = form?.querySelector('.roster-list')
    const fields = form?.querySelector<HTMLElement>('.roster-fields')
    if (!list || !fields) return
    fields.hidden = dark
    list.innerHTML = lines.length ? `<ul>${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''
  }

  setAdventure(lines: string[]): void {
    const list = this.root.querySelector('.adventure-list')
    if (!list) return
    list.innerHTML = lines.length ? `<ul>${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''
  }

  setConnectors(lines: string[]): void {
    const list = this.root.querySelector('.connector-list')
    if (!list) return
    list.innerHTML = lines.length ? `<ul>${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''
  }

  setUnified(line: string): void {
    const el = this.root.querySelector('.unified-line')
    if (el) el.textContent = line
  }

  togglePanel(_which: 'atlas', force?: boolean): void {
    const show = force ?? this.atlas.hidden
    this.atlas.hidden = !show
    this.dock.querySelector('[data-p="atlas"]')?.setAttribute('aria-expanded', String(show))
    if (show) this.atlas.querySelector<HTMLButtonElement>('.atlas-list button')?.focus()
  }

  setAtlas(items: AtlasItem[]): void {
    const groups = new Map<string, AtlasItem[]>()
    for (const it of items) groups.set(it.group, [...(groups.get(it.group) ?? []), it])
    const list = this.atlas.querySelector('.atlas-list')!
    list.innerHTML = [...groups].map(([g, its]) => `<h3>${g}</h3><ul>${its.map(i => `<li><button data-id="${i.id}">${escapeHtml(i.label)}</button></li>`).join('')}</ul>`).join('')
    list.querySelectorAll<HTMLButtonElement>('button[data-id]').forEach(b => b.addEventListener('click', () => this.onAtlas?.(b.dataset.id!)))
  }

  setUnityId(handle: string | null, disclose: string): void {
    const box = this.atlas.querySelector('.unity-id')!
    box.innerHTML = handle
      ? `<h3>Your pilot Unity handle</h3><p class="handle">${escapeHtml(handle)}</p><p class="note">Persistent pseudonymous handle, stored by your authenticator. It can sync. Not issued by the Unity Network. Not a claim that it never leaves a device.</p><button data-u="forget">Forget it on this device</button>`
      : `<h3>Pilot Unity handle</h3><p class="note">${escapeHtml(disclose)}</p><button data-u="create">I understand — create a pilot handle</button>`
    box.querySelector<HTMLButtonElement>('[data-u]')?.addEventListener('click', e => this.onUnityId?.((e.currentTarget as HTMLElement).dataset.u as 'create' | 'forget'))
  }

  /** Mirror Iris for assistive tech; append to the transcript (visible only if opted in). */
  iris(text: string, cite?: { title: string; url: string }): void {
    this.live.textContent = ''
    requestAnimationFrame(() => { this.live.textContent = text })
    this.append('Iris', text, cite)
  }

  visitor(text: string): void {
    this.append('You', text)
  }

  announce(text: string): void {
    this.live.textContent = ''
    requestAnimationFrame(() => { this.live.textContent = text })
  }

  setSceneText(text: string): void {
    const el = this.root.querySelector('.scene-text')
    if (el) el.textContent = text
  }

  private append(who: string, text: string, cite?: { title: string; url: string }): void {
    const p = document.createElement('p')
    p.className = who === 'Iris' ? 'iris' : 'you'
    p.innerHTML = `<b>${who}</b> ${escapeHtml(text)}`
    if (cite && /^https:\/\/en\.wikipedia\.org\/wiki\/\S+$/.test(cite.url)) {
      const a = document.createElement('a')
      a.className = 'cite'
      a.href = cite.url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.textContent = `Wikipedia — ${cite.title}`
      a.title = 'A Wikipedia cite. From here, what it prints is still being checked.'
      p.append(document.createElement('br'), a)
    }
    this.log.append(p)
    while (this.log.children.length > 120) this.log.firstElementChild?.remove()
    this.log.scrollTop = this.log.scrollHeight
  }

  /** Twain² condition: an explicit, visible fallback when speech fails. */
  speechUnavailable(): void {
    this.chip.hidden = false
    this.chip.textContent = 'Microphone or speech unavailable — tap to navigate with the Atlas'
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

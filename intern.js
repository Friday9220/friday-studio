// FRIDAY studio · intern kundeside
// Data ligger i Supabase. Adgang kræver den hemmelige nøgle i linket: intern.html#k=NØGLE
// Er config.js ikke udfyldt, kører siden som demo med data i denne browser.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const STATUSES = [
    ['ny', 'Ny henvendelse'], ['planlagt', 'Møde planlagt'], ['holdt', 'Møde holdt'],
    ['tilbud', 'Tilbud sendt'], ['vundet', 'Vundet'], ['tabt', 'Tabt']
  ];
  const STATUS = Object.fromEntries(STATUSES);
  const KINDS = [['samtale', 'Samtale'], ['ide', 'Idé'], ['oenske', 'Ønske'], ['naeste', 'Næste skridt'], ['note', 'Note']];
  const KIND = Object.fromEntries(KINDS);
  const TOPICS = ['Hjemmeside', 'Ordresystem', 'Skræddersyet system', 'Grafisk design', 'Andet'];
  const TEAM = ['Jomaa', 'Ahmad'];

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };

  // ---------- DATA ----------
  const cfg = window.FRIDAY_CONFIG || {};
  const demo = !cfg.supabaseUrl || !cfg.supabaseAnonKey;
  const hashKey = new URLSearchParams(location.hash.slice(1)).get('k');
  if (hashKey) store.set('friday-key', hashKey);
  const key = hashKey || store.get('friday-key', '');

  function supabaseApi() {
    const base = cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/';
    const headers = { apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json' };
    // Nye Supabase-nøgler (sb_publishable_…) er ikke JWT og må ikke sendes som Bearer.
    if (!cfg.supabaseAnonKey.startsWith('sb_')) headers.Authorization = 'Bearer ' + cfg.supabaseAnonKey;
    // Alt går gennem funktionerne i supabase/adgang.sql, som tjekker den hemmelige nøgle.
    async function rpc(fn, args = {}) {
      const res = await fetch(base + fn, { method: 'POST', headers, body: JSON.stringify({ k: key, ...args }) });
      const text = await res.text();
      if (!res.ok) throw new Error(text || res.statusText);
      return text ? JSON.parse(text) : null;
    }
    return {
      check: () => rpc('crm_check'),
      customers: () => rpc('crm_customers'),
      notes: id => rpc('crm_notes', { cid: id }),
      noteCounts: () => rpc('crm_note_counts'),
      create: c => rpc('crm_create', { c }),
      update: (id, p) => rpc('crm_update', { cid: id, p }),
      remove: id => rpc('crm_delete', { cid: id }),
      addNote: n => rpc('crm_add_note', { n }),
      removeNote: id => rpc('crm_delete_note', { nid: id })
    };
  }

  function demoApi() {
    const C = 'friday-demo-customers', N = 'friday-demo-notes';
    if (!store.get('friday-demo-seeded', false)) seedDemo();
    const now = () => new Date().toISOString();
    const all = () => store.get(C, []), notes = () => store.get(N, []);
    return {
      check: async () => true,
      customers: async () => all().sort((a, b) => b.created_at.localeCompare(a.created_at)),
      notes: async id => notes().filter(n => n.customer_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      noteCounts: async () => notes().map(n => ({ customer_id: n.customer_id })),
      create: async c => { const r = { topics: [], ...c, id: crypto.randomUUID(), created_at: now(), updated_at: now() }; store.set(C, [...all(), r]); return r; },
      update: async (id, p) => { let r; store.set(C, all().map(c => c.id === id ? (r = { ...c, ...p, updated_at: now() }) : c)); return r; },
      remove: async id => { store.set(C, all().filter(c => c.id !== id)); store.set(N, notes().filter(n => n.customer_id !== id)); },
      addNote: async n => { const r = { ...n, id: crypto.randomUUID(), created_at: now() }; store.set(N, [...notes(), r]); return r; },
      removeNote: async id => store.set(N, notes().filter(n => n.id !== id))
    };
  }

  function seedDemo() {
    const d = (days, h = 10) => { const t = new Date(); t.setDate(t.getDate() + days); t.setHours(h, 0, 0, 0); return t.toISOString(); };
    const ids = [1, 2, 3, 4, 5].map(() => crypto.randomUUID());
    const existing = store.get('friday-demo-customers', []);
    store.set('friday-demo-customers', existing.concat([
      { id: ids[0], created_at: d(-1, 9), updated_at: d(-1, 9), source: 'website', status: 'ny', name: 'Sofie Lund', company: 'Café Lune', email: 'sofie@cafelune.dk', phone: '22 33 44 55', topics: ['Hjemmeside', 'Grafisk design'], preferred_date: d(3).slice(0, 10), preferred_time: 'Formiddag (9–12)', message: 'Vi åbner en ny café i foråret og mangler både logo, menukort og en hjemmeside.' },
      { id: ids[1], created_at: d(-4), updated_at: d(-2), source: 'website', status: 'planlagt', name: 'Ali Hassan', company: 'Pizzeria Napoli', email: 'ali@napoli.dk', phone: '40 50 60 70', topics: ['Ordresystem'], owner: 'Ahmad', meeting_at: d(1, 14), meeting_place: 'Hos kunden, Nørrebrogade 12', message: 'Vi betaler for meget til Just Eat og vil gerne have vores eget bestillingssystem.' },
      { id: ids[2], created_at: d(-9), updated_at: d(-3), source: 'manual', status: 'holdt', name: 'Mette Holm', company: 'Holms Blomster', phone: '31 41 51 61', topics: ['Hjemmeside'], owner: 'Jomaa', meeting_at: d(-3, 11), meeting_place: 'I butikken', budget: '10.000–15.000 kr.', deadline: d(30).slice(0, 10) },
      { id: ids[3], created_at: d(-14), updated_at: d(-6), source: 'manual', status: 'tilbud', name: 'Karim Saleh', company: 'Grill House', phone: '27 28 29 30', topics: ['Ordresystem', 'Hjemmeside'], owner: 'Ahmad', meeting_at: d(-8, 15), budget: 'Ca. 25.000 kr.' },
      { id: ids[4], created_at: d(-30), updated_at: d(-12), source: 'website', status: 'vundet', name: 'Louise Berg', company: 'Bageriet Berg', email: 'louise@bergbageri.dk', phone: '26 27 28 29', topics: ['Grafisk design'], owner: 'Jomaa' }
    ]));
    store.set('friday-demo-notes', [
      { id: crypto.randomUUID(), customer_id: ids[1], created_at: d(-2, 12), author: 'Ahmad', kind: 'samtale', body: 'Ringede og aftalte møde. Han har 3 ansatte og laver ca. 60 ordrer om ugen.' },
      { id: crypto.randomUUID(), customer_id: ids[2], created_at: d(-3, 11), author: 'Jomaa', kind: 'samtale', body: 'Godt møde i butikken. Hun vil gerne kunne vise buketter og tage imod bestillinger til afhentning.' },
      { id: crypto.randomUUID(), customer_id: ids[2], created_at: d(-3, 11), author: 'Jomaa', kind: 'oenske', body: 'Lyse farver, gerne grøn. Skal virke godt på mobil.' },
      { id: crypto.randomUUID(), customer_id: ids[2], created_at: d(-3, 12), author: 'Jomaa', kind: 'naeste', body: 'Sende tilbud senest fredag.' },
      { id: crypto.randomUUID(), customer_id: ids[3], created_at: d(-6, 10), author: 'Ahmad', kind: 'note', body: 'Tilbud sendt på mail.' }
    ]);
    store.set('friday-demo-seeded', true);
  }

  const api = demo ? demoApi() : supabaseApi();

  // ---------- STATE ----------
  let customers = [], noteCount = {}, me = store.get('friday-me', ''), ownerFilter = store.get('friday-owner', '');
  let showClosed = store.get('friday-closed', false), query = '', openId = null, kind = 'samtale';
  const seen = new Set(store.get('friday-seen', []));

  // ---------- HJÆLPERE ----------
  const fmtDay = new Intl.DateTimeFormat('da-DK', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtTime = new Intl.DateTimeFormat('da-DK', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  function when(iso) {
    const t = new Date(iso), today = new Date(), tom = new Date(); tom.setDate(tom.getDate() + 1);
    const day = sameDay(t, today) ? 'I dag' : sameDay(t, tom) ? 'I morgen' : fmtDay.format(t);
    return `${day} kl. ${fmtTime.format(t)}`;
  }
  function ago(iso) {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'lige nu';
    if (m < 60) return `${m} min. siden`;
    if (m < 60 * 24) return `${Math.round(m / 60)} t. siden`;
    return fmtDay.format(new Date(iso)) + ' ' + fmtTime.format(new Date(iso));
  }
  const toLocalInput = iso => { if (!iso) return ''; const t = new Date(iso); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 16); };
  const fromLocalInput = v => v ? new Date(v).toISOString() : null;
  const title = c => c.company || c.name;
  const initials = n => n ? n[0] : '';

  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function fail(err) { console.error(err); toast('Noget gik galt. Prøv igen.'); }

  // ---------- HVEM ER DU ----------
  function setMe(name) {
    me = name; store.set('friday-me', name);
    $$('.me button').forEach(b => b.classList.toggle('on', b.dataset.me === me));
    renderBoard();
  }
  $$('.me button').forEach(b => b.addEventListener('click', () => setMe(b.dataset.me)));

  // ---------- TAVLE ----------
  function visible() {
    const q = query.toLowerCase();
    return customers.filter(c => {
      if (ownerFilter === 'me' && c.owner !== me) return false;
      if (ownerFilter === 'none' && c.owner) return false;
      if (!q) return true;
      return [c.name, c.company, c.phone, c.email, c.address].some(v => v && v.toLowerCase().includes(q));
    });
  }

  function cardHtml(c) {
    const isNew = c.status === 'ny' && !seen.has(c.id);
    const mt = c.meeting_at && ['ny', 'planlagt'].includes(c.status)
      ? `<span class="mt${new Date(c.meeting_at) < new Date() ? ' past' : ''}">Møde ${esc(when(c.meeting_at))}</span>` : '';
    const extra = [c.budget && `Budget: ${esc(c.budget)}`, c.deadline && `Deadline: ${esc(fmtDay.format(new Date(c.deadline)))}`, noteCount[c.id] && `${noteCount[c.id]} ${noteCount[c.id] === 1 ? 'note' : 'noter'}`].filter(Boolean).join(' · ');
    return `<button class="card" type="button" data-id="${c.id}">
      <span class="t"><span><span class="co">${esc(title(c))}</span>${isNew ? '<span class="new-dot">Ny</span>' : ''}${c.company ? `<br><span class="nm">${esc(c.name)}</span>` : ''}</span>
      <span class="av ${c.owner ? esc(c.owner) : 'none'}" title="${c.owner ? 'Ansvarlig: ' + esc(c.owner) : 'Ingen ansvarlig'}">${c.owner ? esc(initials(c.owner)) : '?'}</span></span>
      ${c.topics?.length ? `<span class="tags">${c.topics.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span>` : ''}
      ${mt}${extra ? `<span class="bt">${extra}</span>` : ''}
    </button>`;
  }

  function renderBoard() {
    const list = visible();
    const cols = STATUSES.filter(([s]) => showClosed || !['vundet', 'tabt'].includes(s));
    $('#board').innerHTML = cols.map(([s, label]) => {
      let items = list.filter(c => c.status === s);
      if (s === 'planlagt') items.sort((a, b) => (a.meeting_at || '9').localeCompare(b.meeting_at || '9'));
      return `<section class="col"><header><h3>${label}</h3><span class="n">${items.length}</span></header>
        <div class="cards">${items.map(cardHtml).join('') || '<p class="empty">Ingen kunder her</p>'}</div></section>`;
    }).join('');
    $$('#ownerTabs button').forEach(b => b.classList.toggle('on', b.dataset.owner === ownerFilter));

    const now = new Date(); now.setHours(0, 0, 0, 0);
    const up = list.filter(c => c.meeting_at && new Date(c.meeting_at) >= now && !['vundet', 'tabt'].includes(c.status))
      .sort((a, b) => a.meeting_at.localeCompare(b.meeting_at)).slice(0, 12);
    $('#upcoming').hidden = !up.length;
    $('#upList').innerHTML = up.map(c => `<button class="up${sameDay(new Date(c.meeting_at), new Date()) ? ' today' : ''}" type="button" data-id="${c.id}">
      <span class="when">${esc(when(c.meeting_at))}</span><span class="who">${esc(title(c))}</span>
      <span class="meta">${esc([c.owner, c.meeting_place].filter(Boolean).join(' · ') || 'Ingen ansvarlig endnu')}</span></button>`).join('');
  }

  document.addEventListener('click', e => {
    const card = e.target.closest('.card, .up');
    if (card) openCustomer(card.dataset.id);
  });
  $$('#ownerTabs button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.owner === 'me' && !me) { toast('Vælg først, om du er Jomaa eller Ahmad'); return; }
    ownerFilter = b.dataset.owner; store.set('friday-owner', ownerFilter); renderBoard();
  }));
  $('#showClosed').checked = showClosed;
  $('#showClosed').addEventListener('change', e => { showClosed = e.target.checked; store.set('friday-closed', showClosed); renderBoard(); });
  $('#search').addEventListener('input', e => { query = e.target.value.trim(); renderBoard(); });

  async function load() {
    const [cs, ns] = await Promise.all([api.customers(), api.noteCounts()]);
    customers = cs;
    noteCount = {}; ns.forEach(n => { noteCount[n.customer_id] = (noteCount[n.customer_id] || 0) + 1; });
    renderBoard();
    if (openId && !$('#drawer').contains(document.activeElement)) {
      const c = customers.find(x => x.id === openId);
      if (c) renderHead(c);
    }
  }

  // ---------- KUNDE ----------
  const drawer = $('#drawer');
  function openPanel(el) { el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closePanel(el) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  $$('[data-close]').forEach(b => b.addEventListener('click', () => { closePanel(b.closest('.drawer, .modal')); if (b.closest('.drawer')) closeCustomer(); }));
  [drawer, $('#modal')].forEach(el => el.addEventListener('mousedown', e => { if (e.target === el) { closePanel(el); if (el === drawer) closeCustomer(); } }));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#modal').classList.contains('open')) closePanel($('#modal'));
    else if (drawer.classList.contains('open')) { closePanel(drawer); closeCustomer(); }
  });
  function closeCustomer() {
    openId = null;
    if (location.hash.includes('kunde=')) history.replaceState(null, '', location.pathname + location.search + (hashKey ? '#k=' + hashKey : ''));
  }

  function renderHead(c) {
    $('#dTitle').textContent = title(c);
    $('#dSub').textContent = [c.company ? c.name : '', c.source === 'website' ? 'Booket via hjemmesiden' : 'Oprettet af jer', 'oprettet ' + fmtDate.format(new Date(c.created_at))].filter(Boolean).join(' · ');
    const idx = STATUSES.findIndex(([s]) => s === c.status);
    $('#dSteps').innerHTML = STATUSES.map(([s, l], i) =>
      `<button type="button" data-status="${s}" class="${s === c.status ? 'on ' + s : (i < idx && c.status !== 'tabt' && s !== 'tabt') ? 'done' : ''}">${l}</button>`).join('');
  }

  function openCustomer(id) {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    openId = id;
    if (!seen.has(id)) { seen.add(id); store.set('friday-seen', [...seen]); renderBoard(); }
    history.replaceState(null, '', '#' + (hashKey ? 'k=' + hashKey + '&' : '') + 'kunde=' + id);
    renderHead(c);
    const opt = (list, v) => list.map(([val, l]) => `<option value="${esc(val)}"${val === (v || '') ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const booking = c.source === 'website' && (c.preferred_date || c.preferred_time || c.message);
    $('#dBody').innerHTML = `
      <section class="blk">
        <h3>Møde</h3>
        <div class="grid2">
          <label class="f"><span>Tidspunkt</span><input data-field="meeting_at" type="datetime-local" value="${toLocalInput(c.meeting_at)}"></label>
          <label class="f"><span>Ansvarlig</span><select data-field="owner">${opt([['', 'Ingen'], ...TEAM.map(t => [t, t])], c.owner)}</select></label>
          <label class="f wide"><span>Sted</span><input data-field="meeting_place" value="${esc(c.meeting_place)}" placeholder="Hos kunden, online, på telefon …"></label>
        </div>
      </section>
      ${booking ? `<section class="blk"><h3>Fra bookingen</h3><dl class="info">
        ${c.preferred_date ? `<dt>Ønsket dato</dt><dd>${esc(fmtDate.format(new Date(c.preferred_date)))}</dd>` : ''}
        ${c.preferred_time ? `<dt>Tidspunkt</dt><dd>${esc(c.preferred_time)}</dd>` : ''}
        ${c.message ? `<dt>Besked</dt><dd>${esc(c.message)}</dd>` : ''}
      </dl></section>` : ''}
      <section class="blk">
        <h3>Mødelog</h3>
        <div class="compose">
          <textarea id="noteText" placeholder="Hvad snakker I om? Hvilke idéer og ønsker har kunden?"></textarea>
          <div class="row">
            <div class="kinds" id="kinds">${KINDS.map(([k, l]) => `<button type="button" data-kind="${k}" class="${k === kind ? 'on' : ''}">${l}</button>`).join('')}</div>
            <button class="btn primary" type="button" id="addNote">Gem i log</button>
          </div>
        </div>
        <div class="log" id="log"><p class="none">Henter log …</p></div>
      </section>
      <section class="blk">
        <h3>Projekt</h3>
        <div class="f"><span>Hvad handler det om?</span><div class="chips" id="dTopics">${TOPICS.map(t => `<button type="button" class="chip${c.topics?.includes(t) ? ' on' : ''}">${t}</button>`).join('')}</div></div>
        <div class="grid2" style="margin-top:12px">
          <label class="f"><span>Budget</span><input data-field="budget" value="${esc(c.budget)}" placeholder="Fx 10.000–15.000 kr."></label>
          <label class="f"><span>Deadline</span><input data-field="deadline" type="date" value="${esc(c.deadline)}"></label>
        </div>
      </section>
      <section class="blk">
        <h3>Kontakt</h3>
        <div class="grid2">
          <label class="f"><span>Navn</span><input data-field="name" value="${esc(c.name)}"></label>
          <label class="f"><span>Virksomhed</span><input data-field="company" value="${esc(c.company)}"></label>
          <label class="f"><span>Telefon</span><input data-field="phone" type="tel" value="${esc(c.phone)}"></label>
          <label class="f"><span>E-mail</span><input data-field="email" type="email" value="${esc(c.email)}"></label>
          <label class="f wide"><span>Adresse</span><input data-field="address" value="${esc(c.address)}"></label>
        </div>
        <div class="links">
          ${c.phone ? `<a class="btn" href="tel:${esc(c.phone.replace(/\s/g, ''))}">Ring op</a>` : ''}
          ${c.email ? `<a class="btn" href="mailto:${esc(c.email)}">Skriv mail</a>` : ''}
          ${c.address ? `<a class="btn" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent(c.address)}">Vis på kort</a>` : ''}
        </div>
      </section>
      <section class="blk">
        <button class="btn danger" type="button" id="delCustomer">Slet kunde</button>
      </section>`;
    openPanel(drawer);
    loadNotes(id);
  }

  let savedT;
  async function patch(p) {
    const id = openId;
    try {
      const r = await api.update(id, p);
      customers = customers.map(c => c.id === id ? { ...c, ...(r || p) } : c);
      renderBoard();
      const c = customers.find(x => x.id === id);
      if (c && id === openId) renderHead(c);
      $('#saved').classList.add('show'); clearTimeout(savedT); savedT = setTimeout(() => $('#saved').classList.remove('show'), 1600);
    } catch (err) { fail(err); }
  }

  drawer.addEventListener('change', e => {
    const f = e.target.dataset.field;
    if (!f) return;
    let v = e.target.value.trim();
    if (f === 'name' && !v) { toast('Kunden skal have et navn'); return; }
    if (f === 'meeting_at') {
      v = fromLocalInput(v);
      const c = customers.find(x => x.id === openId);
      // Et nyt mødetidspunkt flytter kunden til "Møde planlagt".
      if (v && c?.status === 'ny') {
        const owner = c.owner || me || null;
        $('[data-field=owner]', drawer).value = owner || '';
        return patch({ meeting_at: v, status: 'planlagt', owner });
      }
    }
    patch({ [f]: v || null });
  });
  drawer.addEventListener('click', async e => {
    const step = e.target.closest('[data-status]');
    if (step) return patch({ status: step.dataset.status });
    const chip = e.target.closest('#dTopics .chip');
    if (chip) { chip.classList.toggle('on'); return patch({ topics: $$('#dTopics .chip.on').map(x => x.textContent) }); }
    const k = e.target.closest('[data-kind]');
    if (k) { kind = k.dataset.kind; $$('#kinds button').forEach(b => b.classList.toggle('on', b === k)); return; }
    if (e.target.id === 'addNote') return addNote();
    const del = e.target.closest('[data-del-note]');
    if (del && confirm('Slet denne note?')) {
      try { await api.removeNote(del.dataset.delNote); noteCount[openId]--; loadNotes(openId); renderBoard(); } catch (err) { fail(err); }
      return;
    }
    if (e.target.id === 'delCustomer') {
      const c = customers.find(x => x.id === openId);
      if (!confirm(`Slet ${title(c)} og hele loggen? Det kan ikke fortrydes.`)) return;
      try { await api.remove(c.id); customers = customers.filter(x => x.id !== c.id); closePanel(drawer); closeCustomer(); renderBoard(); toast('Kunden er slettet'); }
      catch (err) { fail(err); }
    }
  });
  drawer.addEventListener('keydown', e => { if (e.target.id === 'noteText' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); });

  async function addNote() {
    const ta = $('#noteText'), body = ta.value.trim();
    if (!body) { ta.focus(); return; }
    if (!me) { toast('Vælg øverst, om du er Jomaa eller Ahmad'); return; }
    const btn = $('#addNote'); btn.disabled = true;
    try {
      await api.addNote({ customer_id: openId, author: me, kind, body });
      ta.value = ''; noteCount[openId] = (noteCount[openId] || 0) + 1;
      await loadNotes(openId); renderBoard();
    } catch (err) { fail(err); }
    btn.disabled = false;
  }

  async function loadNotes(id) {
    try {
      const ns = await api.notes(id);
      if (id !== openId) return;
      $('#log').innerHTML = ns.length ? ns.map(n => `<article class="ent k-${n.kind}">
        <div class="h"><span class="k">${KIND[n.kind] || 'Note'}</span><span>${esc(n.author || '')}</span><span>${esc(ago(n.created_at))}</span>
        <button class="del" type="button" data-del-note="${n.id}">Slet</button></div>
        <p class="b">${esc(n.body)}</p></article>`).join('') : '<p class="none">Ingen noter endnu. Skriv det første, I snakker om.</p>';
    } catch (err) { fail(err); }
  }

  // ---------- NY KUNDE ----------
  const form = $('#newForm');
  form.status.innerHTML = STATUSES.map(([s, l]) => `<option value="${s}">${l}</option>`).join('');
  $('[data-topics]', form).innerHTML = TOPICS.map(t => `<button type="button" class="chip">${t}</button>`).join('');
  $('[data-topics]', form).addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) c.classList.toggle('on'); });
  form.meeting_at.addEventListener('change', () => { if (form.meeting_at.value && form.status.value === 'ny') form.status.value = 'planlagt'; });
  $('#newBtn').addEventListener('click', () => {
    form.reset(); $$('.chip', form).forEach(c => c.classList.remove('on')); $('#newErr').textContent = '';
    form.owner.value = me || ''; form.status.value = 'ny';
    openPanel($('#modal')); setTimeout(() => form.name.focus(), 50);
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const v = n => form[n].value.trim() || null;
    if (!v('name')) { $('#newErr').textContent = 'Skriv kundens navn.'; form.name.focus(); return; }
    const btn = $('[type=submit]', form); btn.disabled = true;
    try {
      const c = await api.create({
        source: 'manual', status: form.status.value, name: v('name'), company: v('company'), phone: v('phone'),
        email: v('email'), address: v('address'), owner: v('owner'), meeting_at: fromLocalInput(form.meeting_at.value),
        meeting_place: v('meeting_place'), budget: v('budget'), deadline: v('deadline'),
        topics: $$('.chip.on', form).map(x => x.textContent)
      });
      if (v('note')) { await api.addNote({ customer_id: c.id, author: me || null, kind: 'samtale', body: v('note') }); noteCount[c.id] = 1; }
      seen.add(c.id); store.set('friday-seen', [...seen]);
      customers.unshift(c); renderBoard(); closePanel($('#modal'));
      toast(`${title(c)} er oprettet`);
    } catch (err) { $('#newErr').textContent = 'Kunden blev ikke gemt. Prøv igen.'; console.error(err); }
    btn.disabled = false;
  });

  $('#demoReset').addEventListener('click', () => {
    if (!confirm('Slet alle demo-kunder og start forfra?')) return;
    ['friday-demo-customers', 'friday-demo-notes', 'friday-demo-seeded', 'friday-seen'].forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
    location.reload();
  });

  // ---------- START ----------
  async function start() {
    $('#demoBar').hidden = !demo;
    if (!demo) {
      let ok = false;
      let why = key ? 'Nøglen i linket passer ikke.' : 'Linket mangler nøglen.';
      if (key) { try { ok = await api.check(); } catch (err) { console.error(err); why = 'Fejl fra databasen: ' + err.message; } }
      if (!ok) {
        $('#app').hidden = true; $('.top').hidden = true; $('#locked').hidden = false;
        $('#lockWhy').textContent = why;
        return;
      }
    }
    if (me) setMe(me);
    try { await load(); } catch (err) { fail(err); return; }
    const deep = new URLSearchParams(location.hash.slice(1)).get('kunde');
    if (deep) openCustomer(deep);
    if (!me) toast('Vælg øverst, om du er Jomaa eller Ahmad');
    // Hent nyt hvert halve minut og når fanen bliver aktiv igen, så I ser hinandens ændringer.
    setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) load().catch(() => {}); });
  }
  // Sættes nøglen ind i adresselinjen bagefter, genindlæser browseren ikke selv siden.
  window.addEventListener('hashchange', () => {
    const k = new URLSearchParams(location.hash.slice(1)).get('k');
    if (k && k !== key) location.reload();
  });
  start();
})();

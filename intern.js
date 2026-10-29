// FRIDAY studio · intern kundeside
// Data ligger i Supabase. Adgang kræver den hemmelige nøgle i linket: intern.html#k=NØGLE
// Er config.js ikke udfyldt, kører siden som demo med data i denne browser.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Salg går fra ny henvendelse til tilbud. Når sagen er vundet, starter udførelsen.
  const SALES = [['ny', 'Ny henvendelse'], ['planlagt', 'Møde planlagt'], ['holdt', 'Møde holdt'], ['tilbud', 'Tilbud sendt']];
  const PROJECT = [['vundet', 'Opstart'], ['udvikling', 'Udvikling'], ['gennemgang', 'Første gennemgang'], ['rettelser', 'Rettelser'], ['godkendelse', 'Godkendelse'], ['leveret', 'Online og leveret']];
  const STATUS = Object.fromEntries([...SALES, ['tabt', 'Tabt'], ...PROJECT]);
  const isProject = s => PROJECT.some(([p]) => p === s);
  const KINDS = [['moede', 'Møde'], ['telefon', 'Telefon'], ['mail', 'Mail'], ['besoeg', 'Besøg'], ['sms', 'SMS'], ['note', 'Note']];
  const KIND = { ...Object.fromEntries(KINDS), status: 'Fase', samtale: 'Samtale', ide: 'Idé', oenske: 'Ønske', naeste: 'Næste skridt' };
  const TOPICS = ['Hjemmeside', 'Ordresystem', 'Skræddersyet system', 'Grafisk design', 'Andet'];
  const TEAM = ['Jomaa', 'Ahmad'];
  const DAY = 864e5;

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
    // Alt går gennem funktionerne i supabase/adgang.sql og dashboard.sql, som tjekker den hemmelige nøgle.
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
      stats: () => rpc('crm_note_stats'),
      recent: () => rpc('crm_recent', { lim: 15 }),
      create: c => rpc('crm_create', { c }),
      update: (id, p) => rpc('crm_update', { cid: id, p }),
      remove: id => rpc('crm_delete', { cid: id }),
      addNote: n => rpc('crm_add_note', { n }),
      removeNote: id => rpc('crm_delete_note', { nid: id })
    };
  }

  function demoApi() {
    const C = 'friday-demo-customers', N = 'friday-demo-notes';
    if (store.get('friday-demo-seeded', 0) !== 2) seedDemo();
    const now = () => new Date().toISOString();
    const all = () => store.get(C, []), notes = () => store.get(N, []);
    const byContact = (a, b) => (b.contact_at || b.created_at).localeCompare(a.contact_at || a.created_at);
    return {
      check: async () => true,
      customers: async () => all().sort((a, b) => b.created_at.localeCompare(a.created_at)),
      notes: async id => notes().filter(n => n.customer_id === id).sort(byContact),
      stats: async () => {
        const m = {};
        notes().filter(n => n.kind !== 'status').forEach(n => {
          const s = m[n.customer_id] ||= { customer_id: n.customer_id, notes: 0, last_contact: null };
          s.notes++; if (!s.last_contact || n.contact_at > s.last_contact) s.last_contact = n.contact_at;
        });
        return Object.values(m);
      },
      recent: async () => {
        const cs = Object.fromEntries(all().map(c => [c.id, c.company || c.name]));
        return notes().filter(n => cs[n.customer_id]).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15).map(n => ({ ...n, customer: cs[n.customer_id] }));
      },
      create: async c => { const r = { topics: [], ...c, id: crypto.randomUUID(), created_at: now(), updated_at: now() }; store.set(C, [...all(), r]); return r; },
      update: async (id, p) => { let r; store.set(C, all().map(c => c.id === id ? (r = { ...c, ...p, updated_at: now() }) : c)); return r; },
      remove: async id => { store.set(C, all().filter(c => c.id !== id)); store.set(N, notes().filter(n => n.customer_id !== id)); },
      addNote: async n => { const r = { contact_at: now(), ...n, id: crypto.randomUUID(), created_at: now() }; store.set(N, [...notes(), r]); return r; },
      removeNote: async id => store.set(N, notes().filter(n => n.id !== id))
    };
  }

  function seedDemo() {
    const d = (days, h = 10) => { const t = new Date(); t.setDate(t.getDate() + days); t.setHours(h, 0, 0, 0); return t.toISOString(); };
    const day = days => d(days).slice(0, 10);
    const id = () => crypto.randomUUID();
    const ids = Array.from({ length: 8 }, id);
    // Bookinger fra hjemmesiden i demo-tilstand bevares.
    const bookings = store.get('friday-demo-customers', []).filter(c => c.source === 'website' && !c.owner && c.status === 'ny' && !c.demo);
    store.set('friday-demo-customers', bookings.concat([
      { id: ids[0], demo: 1, created_at: d(-1, 9), updated_at: d(-1, 9), source: 'website', status: 'ny', name: 'Sofie Lund', company: 'Café Lune', email: 'sofie@cafelune.dk', phone: '22 33 44 55', topics: ['Hjemmeside', 'Grafisk design'], preferred_date: day(3), preferred_time: 'Formiddag (9–12)', message: 'Vi åbner en ny café i foråret og mangler både logo, menukort og en hjemmeside.' },
      { id: ids[1], demo: 1, created_at: d(-4), updated_at: d(-2), source: 'website', status: 'planlagt', name: 'Ali Hassan', company: 'Pizzeria Napoli', email: 'ali@napoli.dk', phone: '40 50 60 70', topics: ['Ordresystem'], owner: 'Ahmad', meeting_at: d(1, 14), meeting_place: 'Hos kunden, Nørrebrogade 12', message: 'Vi betaler for meget til Just Eat og vil gerne have vores eget bestillingssystem.' },
      { id: ids[2], demo: 1, created_at: d(-9), updated_at: d(-3), source: 'manual', status: 'holdt', name: 'Mette Holm', company: 'Holms Blomster', phone: '31 41 51 61', topics: ['Hjemmeside'], owner: 'Jomaa', meeting_at: d(-3, 11), meeting_place: 'I butikken', budget: '10.000–15.000 kr.', deadline: day(30), next_followup: day(0) },
      { id: ids[3], demo: 1, created_at: d(-20), updated_at: d(-10), source: 'manual', status: 'tilbud', name: 'Karim Saleh', company: 'Grill House', phone: '27 28 29 30', topics: ['Ordresystem', 'Hjemmeside'], owner: 'Ahmad', meeting_at: d(-14, 15), budget: 'Ca. 25.000 kr.' },
      { id: ids[4], demo: 1, created_at: d(-30), updated_at: d(-2), source: 'website', status: 'udvikling', name: 'Louise Berg', company: 'Bageriet Berg', email: 'louise@bergbageri.dk', phone: '26 27 28 29', topics: ['Grafisk design', 'Hjemmeside'], owner: 'Jomaa', won_at: d(-12), price: '18.500 kr.', deadline: day(9) },
      { id: ids[5], demo: 1, created_at: d(-45), updated_at: d(-1), source: 'manual', status: 'rettelser', name: 'Omar Aziz', company: 'Sushi Corner', phone: '50 51 52 53', topics: ['Ordresystem'], owner: 'Ahmad', won_at: d(-25), price: '22.000 kr.', deadline: day(4), product_url: 'https://sushicorner-demo.dk' },
      { id: ids[6], demo: 1, created_at: d(-60), updated_at: d(-5), source: 'website', status: 'leveret', name: 'Nina Sørensen', company: 'Nina’s Kaffebar', phone: '60 61 62 63', topics: ['Hjemmeside'], owner: 'Jomaa', won_at: d(-40), price: '12.000 kr.', product_url: 'https://ninaskaffebar.dk' }
    ]));
    const n = (cid, days, author, kind, body, extra = {}) => ({ id: id(), customer_id: cid, created_at: d(days, 12), contact_at: d(days, 12), author, kind, body, ...extra });
    store.set('friday-demo-notes', [
      n(ids[1], -2, 'Ahmad', 'telefon', 'Ringede og aftalte møde. Han har 3 ansatte og laver ca. 60 ordrer om ugen.'),
      n(ids[2], -3, 'Jomaa', 'moede', 'Godt møde i butikken. Hun vil gerne kunne vise buketter og tage imod bestillinger til afhentning.', { ideas: 'Galleri med ugens buketter.', wishes: 'Lyse farver, gerne grøn. Skal virke godt på mobil.', next_step: 'Sende tilbud senest fredag.' }),
      n(ids[3], -10, 'Ahmad', 'mail', 'Tilbud sendt på mail.'),
      n(ids[4], -12, 'Jomaa', 'status', 'Flyttet til Opstart'),
      n(ids[4], -2, 'Jomaa', 'besoeg', 'Viste første udkast til logo. Hun kan bedst lide version B.', { next_step: 'Færdiggøre logo og gå i gang med hjemmesiden.' }),
      n(ids[5], -1, 'Ahmad', 'moede', 'Første gennemgang af systemet med Omar.', { wishes: 'Større billeder i menuen. Mulighed for at markere retter som udsolgt.', next_step: 'Rette og vise igen på torsdag.' }),
      n(ids[5], -1, 'Ahmad', 'status', 'Flyttet til Rettelser')
    ]);
    store.set('friday-demo-seeded', 2);
  }

  const api = demo ? demoApi() : supabaseApi();

  // ---------- STATE ----------
  let customers = [], stats = {}, recent = [];
  let me = store.get('friday-me', ''), ownerFilter = store.get('friday-owner', ''), view = store.get('friday-view', 'overblik');
  let showLost = store.get('friday-lost', false), showDone = store.get('friday-done', false), query = '', openId = null, kind = 'moede';
  const seen = new Set(store.get('friday-seen', []));

  // ---------- HJÆLPERE ----------
  const fmtDay = new Intl.DateTimeFormat('da-DK', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtShort = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short' });
  const fmtTime = new Intl.DateTimeFormat('da-DK', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const startOfDay = (t = new Date()) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x; };
  const dateOnly = s => new Date(s + 'T00:00:00');
  function dayName(t) {
    const tom = new Date(); tom.setDate(tom.getDate() + 1);
    const yes = new Date(); yes.setDate(yes.getDate() - 1);
    return sameDay(t, new Date()) ? 'I dag' : sameDay(t, tom) ? 'I morgen' : sameDay(t, yes) ? 'I går' : fmtDay.format(t);
  }
  const when = iso => `${dayName(new Date(iso))} kl. ${fmtTime.format(new Date(iso))}`;
  function daysAgo(iso) {
    const n = Math.round((startOfDay() - startOfDay(new Date(iso))) / DAY);
    return n <= 0 ? 'i dag' : n === 1 ? 'i går' : `for ${n} dage siden`;
  }
  const toLocalInput = iso => { if (!iso) return ''; const t = new Date(iso); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 16); };
  const fromLocalInput = v => v ? new Date(v).toISOString() : null;
  const title = c => c.company || c.name;
  const progress = s => { const i = PROJECT.findIndex(([p]) => p === s); return i < 0 ? 0 : i / (PROJECT.length - 1); };

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
    render();
  }
  $$('.me button').forEach(b => b.addEventListener('click', () => setMe(b.dataset.me)));

  // ---------- FILTRE ----------
  function visible() {
    const q = query.toLowerCase();
    return customers.filter(c => {
      if (ownerFilter === 'me' && c.owner !== me) return false;
      if (ownerFilter === 'none' && c.owner) return false;
      if (!q) return true;
      return [c.name, c.company, c.phone, c.email, c.address].some(v => v && v.toLowerCase().includes(q));
    });
  }

  function setView(v) {
    view = v; store.set('friday-view', v);
    render();
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', e => {
    const v = e.target.closest('[data-view]');
    if (v) { e.preventDefault(); setView(v.dataset.view); return; }
    const card = e.target.closest('[data-id]');
    if (card && !card.closest('#drawer')) openCustomer(card.dataset.id);
  });
  $$('#ownerTabs button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.owner === 'me' && !me) { toast('Vælg først, om du er Jomaa eller Ahmad'); return; }
    ownerFilter = b.dataset.owner; store.set('friday-owner', ownerFilter); render();
  }));
  $('#showLost').checked = showLost;
  $('#showLost').addEventListener('change', e => { showLost = e.target.checked; store.set('friday-lost', showLost); render(); });
  $('#showDone').checked = showDone;
  $('#showDone').addEventListener('change', e => { showDone = e.target.checked; store.set('friday-done', showDone); render(); });
  $('#search').addEventListener('input', e => {
    query = e.target.value.trim();
    if (query && view === 'overblik') view = 'salg';
    render();
  });

  // ---------- VISNING ----------
  function render() {
    $$('.views button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
    $$('#ownerTabs button').forEach(b => b.classList.toggle('on', b.dataset.owner === ownerFilter));
    $('#viewTitle').textContent = { overblik: 'Overblik', salg: 'Salg', projekter: 'Projekter' }[view];
    $('#lostToggle').hidden = view !== 'salg';
    $('#doneToggle').hidden = view !== 'projekter';
    $('#dash').hidden = view !== 'overblik';
    $('#board').hidden = view === 'overblik';
    if (view === 'overblik') renderDash(); else renderBoard();
  }

  const lastContact = c => stats[c.id]?.last_contact || null;
  const avatar = c => `<span class="av ${c.owner ? esc(c.owner) : 'none'}" title="${c.owner ? 'Ansvarlig: ' + esc(c.owner) : 'Ingen ansvarlig'}">${c.owner ? esc(c.owner[0]) : '?'}</span>`;

  function cardHtml(c) {
    const isNew = c.status === 'ny' && !seen.has(c.id);
    const lines = [];
    if (c.meeting_at && ['ny', 'planlagt'].includes(c.status)) lines.push(`<span class="mt${new Date(c.meeting_at) < new Date() ? ' late' : ''}">Møde ${esc(when(c.meeting_at))}</span>`);
    if (isProject(c.status) && c.status !== 'leveret') {
      lines.push(`<span class="bar"><i style="width:${Math.max(6, progress(c.status) * 100)}%"></i></span>`);
      if (c.deadline) lines.push(`<span class="mt${dateOnly(c.deadline) < startOfDay() ? ' late' : ''}">Deadline ${esc(fmtShort.format(dateOnly(c.deadline)))}</span>`);
    }
    if (c.next_followup && !isProject(c.status)) lines.push(`<span class="mt${dateOnly(c.next_followup) <= startOfDay() ? ' late' : ''}">Følg op ${esc(dayName(dateOnly(c.next_followup)).toLowerCase())}</span>`);
    const meta = [c.budget && !isProject(c.status) && `Budget: ${esc(c.budget)}`, c.price && isProject(c.status) && `Pris: ${esc(c.price)}`,
      lastContact(c) ? `Kontakt ${daysAgo(lastContact(c))}` : (c.status === 'ny' ? 'Ikke kontaktet endnu' : '')].filter(Boolean).join(' · ');
    return `<button class="card" type="button" data-id="${c.id}">
      <span class="t"><span><span class="co">${esc(title(c))}</span>${isNew ? '<span class="new-dot">Ny</span>' : ''}${c.company ? `<br><span class="nm">${esc(c.name)}</span>` : ''}</span>${avatar(c)}</span>
      ${c.topics?.length ? `<span class="tags">${c.topics.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span>` : ''}
      ${lines.join('')}${meta ? `<span class="bt">${meta}</span>` : ''}
    </button>`;
  }

  function renderBoard() {
    const list = visible();
    let cols = view === 'salg' ? [...SALES] : [...PROJECT];
    if (view === 'salg' && showLost) cols.push(['tabt', 'Tabt']);
    if (view === 'projekter' && !showDone) cols = cols.filter(([s]) => s !== 'leveret');
    $('#board').innerHTML = cols.map(([s, label]) => {
      const items = list.filter(c => c.status === s);
      if (s === 'planlagt') items.sort((a, b) => (a.meeting_at || '9').localeCompare(b.meeting_at || '9'));
      if (isProject(s)) items.sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9'));
      return `<section class="col${s === 'tabt' ? ' lost' : ''}"><header><h3>${label}</h3><span class="n">${items.length}</span></header>
        <div class="cards">${items.map(cardHtml).join('') || '<p class="empty">Ingen kunder her</p>'}</div></section>`;
    }).join('');
  }

  function renderDash() {
    const list = visible(), now = new Date(), today = startOfDay(), week = new Date(+now + 7 * DAY);
    const active = list.filter(c => c.status !== 'tabt' && c.status !== 'leveret');
    const meetings = active.filter(c => c.meeting_at && new Date(c.meeting_at) >= today && ['ny', 'planlagt'].includes(c.status))
      .sort((a, b) => a.meeting_at.localeCompare(b.meeting_at));
    const projects = list.filter(c => isProject(c.status) && c.status !== 'leveret').sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9'));

    // Skal følges op: aftalt opfølgning, nye uden kontakt, og varme kunder uden kontakt i en uge.
    const follow = [];
    active.forEach(c => {
      const last = lastContact(c);
      if (c.next_followup && dateOnly(c.next_followup) <= today) {
        const d = dateOnly(c.next_followup);
        follow.push([c, sameDay(d, today) ? 'Følg op i dag' : `Skulle følges op ${fmtShort.format(d)}`, +d]);
      } else if (c.status === 'ny' && !last && !c.meeting_at) {
        follow.push([c, 'Ny henvendelse, ikke kontaktet endnu', +new Date(c.created_at)]);
      } else if (['holdt', 'tilbud'].includes(c.status) && !c.next_followup) {
        const ref = last || c.updated_at;
        if (now - new Date(ref) > 7 * DAY) follow.push([c, `Ingen kontakt ${daysAgo(ref)}`, +new Date(ref)]);
      }
    });
    follow.sort((a, b) => a[2] - b[2]);

    const kpis = [
      ['Nye henvendelser', list.filter(c => c.status === 'ny').length, 'salg'],
      ['Møder de næste 7 dage', meetings.filter(c => new Date(c.meeting_at) <= week).length, 'salg'],
      ['Tilbud sendt', list.filter(c => c.status === 'tilbud').length, 'salg'],
      ['Projekter i gang', projects.length, 'projekter'],
      ['Leveret', list.filter(c => c.status === 'leveret').length, 'projekter']
    ];
    const empty = t => `<p class="none">${t}</p>`;
    const stepIdx = s => PROJECT.findIndex(([x]) => x === s);
    $('#dash').innerHTML = `
      <div class="kpis">${kpis.map(([l, n, v]) => `<button type="button" class="kpi" data-view="${v}"><b>${n}</b><span>${l}</span></button>`).join('')}</div>
      <div class="dash">
        <section class="panel">
          <h2>Kommende møder</h2>
          ${meetings.length ? `<div class="rows">${meetings.slice(0, 8).map(c => `<button type="button" class="row" data-id="${c.id}">
            <span class="when${sameDay(new Date(c.meeting_at), now) ? ' today' : ''}">${esc(when(c.meeting_at))}</span>
            <span class="who"><b>${esc(title(c))}</b><small>${esc([c.owner, c.meeting_place].filter(Boolean).join(' · ') || 'Ingen ansvarlig endnu')}</small></span></button>`).join('')}</div>` : empty('Ingen planlagte møder.')}
        </section>
        <section class="panel">
          <h2>Skal følges op ${follow.length ? `<span class="n">${follow.length}</span>` : ''}</h2>
          ${follow.length ? `<div class="rows">${follow.slice(0, 8).map(([c, why]) => `<button type="button" class="row" data-id="${c.id}">
            <span class="who"><b>${esc(title(c))}</b><small>${esc(why)} · ${esc(STATUS[c.status])}</small></span>${avatar(c)}</button>`).join('')}</div>` : empty('Alt er fulgt op.')}
        </section>
        <section class="panel wide">
          <h2>Projekter i gang</h2>
          ${projects.length ? `<div class="rows">${projects.map(c => `<button type="button" class="row proj" data-id="${c.id}">
              <span class="who"><b>${esc(title(c))}</b><small>${esc(STATUS[c.status])}${c.owner ? ' · ' + esc(c.owner) : ''}</small></span>
              <span class="pipe">${PROJECT.map(([p, l], i) => `<i class="${i < stepIdx(c.status) ? 'done' : p === c.status ? 'on' : ''}" title="${l}"></i>`).join('')}</span>
              <span class="dl${c.deadline && dateOnly(c.deadline) < today ? ' late' : ''}">${c.deadline ? 'Deadline ' + esc(fmtShort.format(dateOnly(c.deadline))) : 'Ingen deadline'}</span></button>`).join('')}</div>`
            : empty('Ingen projekter i gang endnu. Når en sag er vundet, dukker den op her.')}
        </section>
        <section class="panel wide">
          <h2>Seneste aktivitet</h2>
          ${recent.length ? `<div class="feed">${recent.filter(n => list.some(c => c.id === n.customer_id)).slice(0, 10).map(n => `<button type="button" class="act k-${n.kind}" data-id="${n.customer_id}">
            <span class="h"><b>${esc(n.customer)}</b><span class="k">${esc(KIND[n.kind] || 'Note')}</span><span>${esc(n.author || '')}</span><span>${esc(when(n.contact_at || n.created_at))}</span></span>
            <span class="b">${esc(n.body || n.next_step || n.wishes || n.ideas || '')}</span></button>`).join('')}</div>` : empty('Ingen aktivitet endnu.')}
        </section>
      </div>`;
  }

  async function load() {
    const [cs, st, rc] = await Promise.all([api.customers(), api.stats(), api.recent()]);
    customers = cs;
    stats = Object.fromEntries((st || []).map(s => [s.customer_id, s]));
    recent = rc || [];
    render();
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
    const track = (label, steps, cls) => {
      const idx = steps.findIndex(([s]) => s === c.status);
      const passed = cls === 'sales' && isProject(c.status);
      return `<div class="track ${cls}"><span class="lbl">${label}</span><div class="steps">${steps.map(([s, l], i) =>
        `<button type="button" data-status="${s}" class="${s === c.status ? 'on ' + s : (passed && s !== 'tabt') || (idx >= 0 && i < idx && c.status !== 'tabt') ? 'done' : ''}">${l}</button>`).join('')}</div></div>`;
    };
    $('#dSteps').innerHTML = track('Salg', [...SALES, ['tabt', 'Tabt']], 'sales') + track('Udførelse', PROJECT, 'project');
  }

  function openCustomer(id) {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    openId = id;
    if (!seen.has(id)) { seen.add(id); store.set('friday-seen', [...seen]); render(); }
    history.replaceState(null, '', '#' + (hashKey ? 'k=' + hashKey + '&' : '') + 'kunde=' + id);
    renderHead(c);
    const opt = (list, v) => list.map(([val, l]) => `<option value="${esc(val)}"${val === (v || '') ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const booking = c.source === 'website' && (c.preferred_date || c.preferred_time || c.message);
    const proj = isProject(c.status);
    $('#dBody').innerHTML = `
      <section class="blk">
        <h3>Ny kontakt</h3>
        <div class="compose">
          <div class="crow">
            <div class="kinds" id="kinds">${KINDS.map(([k, l]) => `<button type="button" data-kind="${k}" class="${k === kind ? 'on' : ''}">${l}</button>`).join('')}</div>
            <input type="datetime-local" id="cAt" value="${toLocalInput(new Date().toISOString())}" aria-label="Tidspunkt for kontakten">
          </div>
          <textarea id="cBody" rows="3" placeholder="Hvad snakkede I om?"></textarea>
          <div class="extra">
            <label><span>Kundens idéer</span><textarea id="cIdeas" rows="2"></textarea></label>
            <label><span>Kundens ønsker</span><textarea id="cWishes" rows="2"></textarea></label>
            <label><span>Næste skridt</span><textarea id="cNext" rows="2"></textarea></label>
          </div>
          <div class="crow">
            <label class="fu">Følg op <input type="date" id="cFollow" value="${esc(c.next_followup)}"></label>
            <button class="btn primary" type="button" id="addNote">Gem kontakt</button>
          </div>
        </div>
        <div class="log" id="log"><p class="none">Henter log …</p></div>
      </section>
      <section class="blk">
        <h3>Møde og ansvar</h3>
        <div class="grid2">
          <label class="f"><span>Mødetidspunkt</span><input data-field="meeting_at" type="datetime-local" value="${toLocalInput(c.meeting_at)}"></label>
          <label class="f"><span>Ansvarlig</span><select data-field="owner">${opt([['', 'Ingen'], ...TEAM.map(t => [t, t])], c.owner)}</select></label>
          <label class="f"><span>Sted</span><input data-field="meeting_place" value="${esc(c.meeting_place)}" placeholder="Hos kunden, online, på telefon …"></label>
          <label class="f"><span>Næste opfølgning</span><input data-field="next_followup" type="date" value="${esc(c.next_followup)}"></label>
        </div>
      </section>
      <section class="blk">
        <h3>${proj ? 'Projekt' : 'Hvad de ønsker'}</h3>
        <div class="f"><span>Hvad handler det om?</span><div class="chips" id="dTopics">${TOPICS.map(t => `<button type="button" class="chip${c.topics?.includes(t) ? ' on' : ''}">${t}</button>`).join('')}</div></div>
        <div class="grid2" style="margin-top:12px">
          <label class="f"><span>Budget</span><input data-field="budget" value="${esc(c.budget)}" placeholder="Fx 10.000–15.000 kr."></label>
          <label class="f"><span>Deadline</span><input data-field="deadline" type="date" value="${esc(c.deadline)}"></label>
          <label class="f"><span>Aftalt pris</span><input data-field="price" value="${esc(c.price)}" placeholder="Fx 18.500 kr."></label>
          <label class="f"><span>Link til produktet</span><input data-field="product_url" type="url" value="${esc(c.product_url)}" placeholder="https://"></label>
        </div>
        ${/^https?:\/\//.test(c.product_url || '') ? `<div class="links"><a class="btn" target="_blank" rel="noopener" href="${esc(c.product_url)}">Åbn produktet</a></div>` : ''}
      </section>
      ${booking ? `<section class="blk"><h3>Fra bookingen</h3><dl class="info">
        ${c.preferred_date ? `<dt>Ønsket dato</dt><dd>${esc(fmtDate.format(dateOnly(c.preferred_date)))}</dd>` : ''}
        ${c.preferred_time ? `<dt>Tidspunkt</dt><dd>${esc(c.preferred_time)}</dd>` : ''}
        ${c.message ? `<dt>Besked</dt><dd>${esc(c.message)}</dd>` : ''}
      </dl></section>` : ''}
      <section class="blk">
        <h3>Kontaktoplysninger</h3>
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
    $('.d-body', drawer).scrollTop = 0;
    loadNotes(id);
  }

  let savedT;
  async function patch(p) {
    const id = openId, before = customers.find(x => x.id === id);
    if (p.status && isProject(p.status) && !before.won_at) p.won_at = new Date().toISOString();
    try {
      const r = await api.update(id, p);
      customers = customers.map(c => c.id === id ? { ...c, ...(r || p) } : c);
      // Faseskift skrives i loggen, så I kan se forløbet bagefter.
      if (p.status && p.status !== before.status) {
        await api.addNote({ customer_id: id, author: me || null, kind: 'status', body: `Flyttet til ${STATUS[p.status]}` });
        recent = await api.recent();
        if (id === openId) loadNotes(id);
      }
      render();
      const c = customers.find(x => x.id === id);
      if (c && id === openId) {
        renderHead(c);
        if (p.status && isProject(p.status) !== isProject(before.status)) $('.blk:nth-child(3) h3', drawer).textContent = isProject(p.status) ? 'Projekt' : 'Hvad de ønsker';
      }
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
      // Et nyt mødetidspunkt flytter en ny henvendelse til "Møde planlagt".
      if (v && c?.status === 'ny') {
        const owner = c.owner || me || null;
        $('[data-field=owner]', drawer).value = owner || '';
        return patch({ meeting_at: v, status: 'planlagt', owner });
      }
    }
    if (f === 'next_followup') $('#cFollow').value = v;
    patch({ [f]: v || null });
  });
  drawer.addEventListener('click', async e => {
    const step = e.target.closest('[data-status]');
    if (step) {
      const c = customers.find(x => x.id === openId);
      if (step.dataset.status === c.status) return;
      if (isProject(step.dataset.status) && !isProject(c.status)) toast(`${title(c)} er vundet og ligger nu under Projekter`);
      return patch({ status: step.dataset.status });
    }
    const chip = e.target.closest('#dTopics .chip');
    if (chip) { chip.classList.toggle('on'); return patch({ topics: $$('#dTopics .chip.on').map(x => x.textContent) }); }
    const k = e.target.closest('[data-kind]');
    if (k) { kind = k.dataset.kind; $$('#kinds button').forEach(b => b.classList.toggle('on', b === k)); return; }
    if (e.target.id === 'addNote') return addNote();
    const del = e.target.closest('[data-del-note]');
    if (del && confirm('Slet denne kontakt fra loggen?')) {
      try { await api.removeNote(del.dataset.delNote); await load(); loadNotes(openId); } catch (err) { fail(err); }
      return;
    }
    if (e.target.id === 'delCustomer') {
      const c = customers.find(x => x.id === openId);
      if (!confirm(`Slet ${title(c)} og hele loggen? Det kan ikke fortrydes.`)) return;
      try { await api.remove(c.id); customers = customers.filter(x => x.id !== c.id); closePanel(drawer); closeCustomer(); await load(); toast('Kunden er slettet'); }
      catch (err) { fail(err); }
    }
  });
  drawer.addEventListener('keydown', e => { if (e.target.closest('.compose') && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); });

  async function addNote() {
    const val = s => $(s).value.trim() || null;
    const note = { body: val('#cBody'), ideas: val('#cIdeas'), wishes: val('#cWishes'), next_step: val('#cNext') };
    if (!note.body && !note.ideas && !note.wishes && !note.next_step) { $('#cBody').focus(); return; }
    if (!me) { toast('Vælg øverst, om du er Jomaa eller Ahmad'); return; }
    const id = openId, c = customers.find(x => x.id === id), follow = $('#cFollow').value || null;
    const btn = $('#addNote'); btn.disabled = true;
    try {
      await api.addNote({ customer_id: id, author: me, kind, contact_at: fromLocalInput($('#cAt').value) || new Date().toISOString(), ...note });
      ['#cBody', '#cIdeas', '#cWishes', '#cNext'].forEach(s => { $(s).value = ''; });
      $('#cAt').value = toLocalInput(new Date().toISOString());
      const p = {};
      if (follow !== (c.next_followup || null)) p.next_followup = follow;
      // Et gemt møde på en kunde med planlagt møde betyder, at mødet er holdt.
      if (kind === 'moede' && c.status === 'planlagt') p.status = 'holdt';
      if (Object.keys(p).length) await patch(p);
      $('[data-field=next_followup]', drawer).value = follow || '';
      await load(); loadNotes(id);
      toast('Kontakten er gemt');
    } catch (err) { fail(err); }
    btn.disabled = false;
  }

  async function loadNotes(id) {
    try {
      const ns = await api.notes(id);
      if (id !== openId) return;
      const sub = (l, v) => v ? `<div><dt>${l}</dt><dd>${esc(v)}</dd></div>` : '';
      $('#log').innerHTML = ns.length ? ns.map(n => n.kind === 'status'
        ? `<article class="ent sys"><div class="h"><span>${esc(n.body)}</span><span>${esc(when(n.contact_at || n.created_at))}</span><span>${esc(n.author || '')}</span></div></article>`
        : `<article class="ent k-${n.kind}">
        <div class="h"><span class="k">${KIND[n.kind] || 'Note'}</span><span>${esc(when(n.contact_at || n.created_at))}</span><span>${esc(n.author || '')}</span>
        <button class="del" type="button" data-del-note="${n.id}">Slet</button></div>
        ${n.body ? `<p class="b">${esc(n.body)}</p>` : ''}
        ${n.ideas || n.wishes || n.next_step ? `<dl class="sub">${sub('Idéer', n.ideas)}${sub('Ønsker', n.wishes)}${sub('Næste skridt', n.next_step)}</dl>` : ''}
        </article>`).join('') : '<p class="none">Ingen kontakt endnu. Gem den første ovenfor.</p>';
    } catch (err) { fail(err); }
  }

  // ---------- NY KUNDE ----------
  const form = $('#newForm');
  form.status.innerHTML = `<optgroup label="Salg">${SALES.map(([s, l]) => `<option value="${s}">${l}</option>`).join('')}</optgroup>
    <optgroup label="Udførelse">${PROJECT.map(([s, l]) => `<option value="${s}">${l}</option>`).join('')}</optgroup>`;
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
      const status = form.status.value;
      const c = await api.create({
        source: 'manual', status, name: v('name'), company: v('company'), phone: v('phone'),
        email: v('email'), address: v('address'), owner: v('owner'), meeting_at: fromLocalInput(form.meeting_at.value),
        meeting_place: v('meeting_place'), budget: v('budget'), deadline: v('deadline'),
        won_at: isProject(status) ? new Date().toISOString() : null,
        topics: $$('.chip.on', form).map(x => x.textContent)
      });
      if (v('note')) await api.addNote({ customer_id: c.id, author: me || null, kind: 'besoeg', body: v('note') });
      seen.add(c.id); store.set('friday-seen', [...seen]);
      closePanel($('#modal'));
      await load();
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
    $$('.me button').forEach(b => b.classList.toggle('on', b.dataset.me === me));
    try { await load(); }
    catch (err) {
      console.error(err);
      // Er dashboard.sql ikke kørt endnu, findes de nye funktioner ikke i databasen.
      if (/crm_note_stats|crm_recent/.test(err.message)) toast('Kør supabase/dashboard.sql i Supabase for at få det nye overblik');
      else fail(err);
      return;
    }
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

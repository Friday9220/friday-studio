(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // page load intro
  requestAnimationFrame(() => setTimeout(() => document.body.classList.add('loaded'), 80));
  const yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // nav
  const nav = $('#nav');
  const hero = $('.hero');
  const onScroll = () => {
    nav.classList.toggle('scrolled', scrollY > 20);
    nav.classList.toggle('over-hero', !!hero && scrollY < hero.offsetHeight - 80);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#menuBtn').addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', open);
  });
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  // active nav link: the current page, or the section in view on the front page
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = $$('.nav-links a, #mobileMenu a');
  links.forEach(l => { if (l.getAttribute('href') === page) l.classList.add('active'); });
  const anchorLinks = links.filter(l => l.getAttribute('href').startsWith('#'));
  if (anchorLinks.length) {
    const secObs = new IntersectionObserver(es => es.forEach(e => {
      anchorLinks.forEach(l => { if (l.getAttribute('href') === '#' + e.target.id) l.classList.toggle('active', e.isIntersecting); });
    }), { rootMargin: '-45% 0px -50% 0px' });
    anchorLinks.forEach(l => { const s = $(l.getAttribute('href')); if (s) secObs.observe(s); });
  }

  // split headings into masked words
  $$('.split').forEach(h => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'wd';
          const i = document.createElement('span'); i.textContent = part;
          w.append(i); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(h);
    $$('.wd > span', h).forEach((s, i) => s.style.transitionDelay = (i * 0.06) + 's');
  });
  $$('.stagger').forEach(g => [...g.children].forEach((c, i) => c.style.transitionDelay = (i * 0.1) + 's'));

  // reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal, .split, .stagger').forEach(el => io.observe(el));

  // FAQ (one open at a time within each list)
  $$('.faq').forEach(f => $('.faq-q', f).addEventListener('click', () => {
    const o = !f.classList.contains('open');
    $$('.faq', f.parentElement).forEach(x => { x.classList.remove('open'); $('.faq-q', x).setAttribute('aria-expanded', false); });
    f.classList.toggle('open', o); $('.faq-q', f).setAttribute('aria-expanded', o);
  }));

  // toast
  let tt;
  const toast = msg => {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400);
  };

  // marquee: repeat the list until it covers the screen, then double it for a seamless loop
  const mq = $('#marquee');
  if (mq) {
    const base = mq.innerHTML;
    const buildMarquee = () => {
      mq.innerHTML = base;
      while (mq.scrollWidth < innerWidth + 200) mq.insertAdjacentHTML('beforeend', base);
      mq.insertAdjacentHTML('beforeend', mq.innerHTML);
      mq.style.animationDuration = (mq.scrollWidth / 2 / 60) + 's';
    };
    buildMarquee();
    let mqW = innerWidth;
    addEventListener('resize', () => { if (Math.abs(innerWidth - mqW) > 50) { mqW = innerWidth; buildMarquee(); } });
  }

  // ---------- HERO VIDEO ----------
  // Free clips from Mixkit (Mixkit Stock Video Free License)
  const media = $('#heroMedia');
  if (media) {
    const CLIPS = [4385, 3574, 219, 41222];
    const DUR = 7000;
    const layers = CLIPS.map(id => {
      const d = document.createElement('div');
      d.className = 'clip';
      d.style.backgroundImage = `url(https://assets.mixkit.co/videos/${id}/${id}-thumb-720-0.jpg)`;
      media.append(d);
      return d;
    });
    const addVideo = i => {
      const l = layers[i];
      if (l.querySelector('video') || reduce) return;
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.loop = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.src = `https://assets.mixkit.co/videos/${CLIPS[i]}/${CLIPS[i]}-720.mp4`;
      v.addEventListener('error', () => v.remove());
      l.append(v);
    };
    let cur = -1, timer;
    const show = i => {
      clearTimeout(timer);
      cur = i;
      addVideo(i); addVideo((i + 1) % CLIPS.length);
      layers.forEach((l, j) => {
        l.classList.toggle('on', j === i);
        const v = l.querySelector('video');
        if (v) { if (j === i) { v.currentTime = 0; v.play().catch(() => {}); } else setTimeout(() => v.pause(), 1500); }
      });
      if (!reduce) timer = setTimeout(() => show((cur + 1) % CLIPS.length), DUR);
    };
    show(0);
  }

  // ---------- ORDER DEMO ----------
  if ($('#menuItems')) {
    const MENU = {
      'Pizza': [
        { n: 'Margherita', d: 'Tomat, mozzarella, basilikum', p: 85, e: '🍕' },
        { n: 'Pepperoni', d: 'Tomat, mozzarella, pepperoni', p: 95, e: '🍕' },
        { n: 'Quattro Formaggi', d: 'Fire slags ost', p: 105, e: '🧀' },
        { n: 'Vegetariana', d: 'Grillede grøntsager, pesto', p: 99, e: '🥬' }
      ],
      'Tilbehør': [
        { n: 'Pommes frites', d: 'Med aioli', p: 35, e: '🍟' },
        { n: 'Hvidløgsbrød', d: 'Ovnbagt med smør', p: 39, e: '🥖' },
        { n: 'Salat', d: 'Rucola, parmesan, tomat', p: 49, e: '🥗' }
      ],
      'Drikke': [
        { n: 'Sodavand 0,5 L', d: 'Cola, appelsin, lemon', p: 25, e: '🥤' },
        { n: 'Danskvand', d: 'Med citron', p: 22, e: '💧' },
        { n: 'Iskaffe', d: 'Med havremælk', p: 39, e: '🧋' }
      ]
    };
    const cart = new Map();
    let cat = 'Pizza', mode = 'Afhentning', orderNo = 1041;
    const kr = v => v.toLocaleString('da-DK') + ' kr.';

    const renderCats = () => {
      $('#cats').innerHTML = Object.keys(MENU).map(c => `<button class="${c === cat ? 'on' : ''}">${c}</button>`).join('');
      $$('#cats button').forEach(b => b.addEventListener('click', () => { cat = b.textContent; renderCats(); renderMenu(); }));
    };
    const renderMenu = () => {
      $('#menuItems').innerHTML = MENU[cat].map((it, i) => `
        <button class="mi" data-i="${i}" aria-label="Tilføj ${it.n}">
          <span class="em">${it.e}</span>
          <div><b>${it.n}</b><small>${it.d}</small></div>
          <span class="pr">${it.p} kr.</span><span class="add">+</span>
        </button>`).join('');
      $$('#menuItems .mi').forEach(b => b.addEventListener('click', () => {
        const it = MENU[cat][+b.dataset.i];
        const c = cart.get(it.n) || { ...it, q: 0 }; c.q++; cart.set(it.n, c);
        renderCart();
      }));
    };
    const renderCart = () => {
      const lines = $('#cartLines');
      if (!cart.size) { lines.innerHTML = '<span class="cart-empty">Kurven er tom. Tryk + for at tilføje.</span>'; }
      else {
        lines.innerHTML = [...cart.values()].map(c => `
          <div class="cart-line"><span class="q"><button data-n="${c.n}" data-d="-1" aria-label="Fjern en">−</button>${c.q}<button data-n="${c.n}" data-d="1" aria-label="Tilføj en">+</button> ${c.n}</span><span>${kr(c.p * c.q)}</span></div>`).join('');
        $$('button', lines).forEach(b => b.addEventListener('click', () => {
          const c = cart.get(b.dataset.n); c.q += +b.dataset.d;
          if (c.q <= 0) cart.delete(b.dataset.n);
          renderCart();
        }));
      }
      const tot = [...cart.values()].reduce((s, c) => s + c.p * c.q, 0) + (mode === 'Levering' && cart.size ? 39 : 0);
      $('#cartTotal').textContent = kr(tot) + (mode === 'Levering' && cart.size ? ' (inkl. levering)' : '');
    };
    $$('#pick button').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.v; $$('#pick button').forEach(x => x.classList.toggle('on', x === b)); renderCart();
    }));

    const STATUS = [['new', 'Ny', 'Start i ovnen'], ['oven', 'I ovnen', 'Markér som klar'], ['ready', 'Klar', 'Udleveret']];
    const updateCount = () => {
      const n = $$('#tickets .ticket').length;
      $('#kCount').textContent = n + ' aktive';
      if (!n) $('#tickets').innerHTML = '<div class="k-empty">Ingen ordrer endnu.<br>Send en ordre fra menuen.</div>';
    };
    $('#orderBtn').addEventListener('click', () => {
      if (!cart.size) { toast('Læg noget i kurven først 🍕'); return; }
      const box = $('#tickets'); const empty = $('.k-empty', box); if (empty) empty.remove();
      const no = ++orderNo, time = new Date(Date.now() + 20 * 60000).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
      const t = document.createElement('div'); t.className = 'ticket'; let s = 0;
      const items = [...cart.values()].map(c => ({ ...c })), m = mode;
      const total = items.reduce((a, c) => a + c.p * c.q, 0) + (m === 'Levering' ? 39 : 0);
      const draw = () => {
        const [cls, lbl, act] = STATUS[s];
        t.innerHTML = `<div class="ticket-top"><b>#${no}</b><span class="st ${cls}">${lbl}</span></div>
          <ul>${items.map(c => `<li>${c.q}× ${c.n}</li>`).join('')}</ul>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;color:rgba(255,255,255,.5);margin-bottom:10px"><span>${m} · kl. ${time}</span><span>${kr(total)}</span></div>
          <button class="adv">${act}</button>`;
        $('.adv', t).addEventListener('click', () => {
          if (s < 2) { s++; draw(); }
          else { t.style.transition = 'opacity .4s, transform .4s'; t.style.opacity = 0; t.style.transform = 'translateX(20px)'; setTimeout(() => { t.remove(); updateCount(); }, 400); }
        });
      };
      draw(); box.prepend(t);
      while (box.children.length > 4) box.lastElementChild.remove();
      cart.clear(); renderCart(); updateCount();
      toast(`Ordre #${no} sendt til køkkenet ✓`);
    });
    renderCats(); renderMenu(); renderCart();
  }

  // ---------- BOOKING FORM ----------
  const form = $('#bookForm');
  if (form) {
    const topics = $$('#topics .chip');
    topics.forEach(c => c.addEventListener('click', () => c.classList.toggle('on')));
    $$('[data-topic]').forEach(a => a.addEventListener('click', () => {
      topics.forEach(c => c.classList.toggle('on', c.textContent === a.dataset.topic));
    }));
    const d = $('#fDate'); const tm = new Date(); tm.setDate(tm.getDate() + 1);
    d.min = tm.toISOString().slice(0, 10);

    form.addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target, msg = $('#formMsg');
      const name = f.navn.value.trim(), email = f.email.value.trim(), phone = f.telefon.value.trim();
      if (!name || !email || !phone) { msg.textContent = 'Udfyld venligst navn, e-mail og telefon.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Tjek venligst din e-mailadresse.'; return; }
      msg.textContent = '';
      const booking = {
        navn: name, virksomhed: f.virksomhed.value.trim(), email, telefon: phone,
        emner: topics.filter(c => c.classList.contains('on')).map(c => c.textContent),
        dato: f.dato.value, tid: f.tid.value, besked: f.besked.value.trim(),
        oprettet: new Date().toISOString()
      };
      // TODO: send booking til det interne system, når det er bygget.
      window.dispatchEvent(new CustomEvent('friday:booking', { detail: booking }));
      $('#successText').textContent = `Tak, ${name.split(' ')[0]}. Vi vender tilbage på ${email} inden for 24 timer på hverdage og bekræfter dit møde.`;
      $('#contactGrid').classList.add('sent');
    });
  }
})();

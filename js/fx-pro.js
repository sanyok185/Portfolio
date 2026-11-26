// FX PRO: великі ефекти поверх базових анімацій (fx.js)
(() => {
  const html = document.documentElement;
  if (!html.classList.contains('fx')) return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isEn = html.lang === 'en';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const vh = () => window.innerHeight;

  /* ---------- Плавний інерційний скрол (Lenis), тільки для миші ---------- */
  let lenis = null;
  if (fine && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1, anchors: true });
    window.__lenis = lenis;
    const raf = (t) => {
      lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
    // Поки йде прелоадер — скрол стоїть
    if (html.classList.contains('fx-pl')) {
      lenis.stop();
      const mo = new MutationObserver(() => {
        if (!html.classList.contains('fx-pl')) {
          lenis.start();
          mo.disconnect();
        }
      });
      mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ---------- Зерно плівки ---------- */

  /* ---------- Шторка при зміні мови ---------- */
  const wipe = document.createElement('div');
  wipe.className = 'fx-wipe';
  wipe.setAttribute('aria-hidden', 'true');
  wipe.innerHTML = '<span class="fx-wipe-logo">PANCHUK<b>.dev</b></span>';
  document.body.append(wipe);
  if (html.classList.contains('fx-pt')) {
    wipe.classList.add('is-cover');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        html.classList.remove('fx-pt');
        wipe.classList.add('is-leave');
        setTimeout(() => wipe.classList.remove('is-cover', 'is-leave'), 1100);
      })
    );
  }
  document.querySelectorAll('a.tool[href$="index.html"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      wipe.classList.remove('is-leave');
      wipe.classList.add('is-enter');
      try {
        sessionStorage.setItem('pt', '1');
      } catch (err) {}
      setTimeout(() => (window.location.href = a.href), 650);
    });
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) wipe.classList.remove('is-enter', 'is-cover', 'is-leave');
  });

  /* ---------- Текст, що «дешифрується» ---------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/ЖЩЮЯҐЇЄ';
  const scramble = (el, dur = 650) => {
    if (el.dataset.fxBusy) return;
    const final = el.dataset.fxText || (el.dataset.fxText = el.textContent);
    el.dataset.fxBusy = '1';
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const n = Math.floor(p * final.length);
      let out = final.slice(0, n);
      for (let i = n; i < final.length; i++) {
        out += /\s/.test(final[i]) ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step);
      else {
        el.textContent = final;
        delete el.dataset.fxBusy;
      }
    };
    requestAnimationFrame(step);
  };
  const tagIO = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        setTimeout(() => scramble(e.target, 900), 150);
        tagIO.unobserve(e.target);
      }),
    { threshold: 1 }
  );
  document.querySelectorAll('.tag').forEach((t) => tagIO.observe(t));

  /* ---------- Дві схрещені стрічки замість одного біжучого рядка ---------- */
  const marquee = document.querySelector('.marquee');
  let ribbon2Anim = null;
  if (marquee) {
    const wrap = document.createElement('div');
    wrap.className = 'fx-ribbons';
    marquee.before(wrap);
    const clone = marquee.cloneNode(true);
    clone.classList.add('fx-ribbon-2');
    wrap.append(clone, marquee);
    marquee.classList.add('fx-ribbon-1');
    ribbon2Anim = clone.querySelector('.marquee-track')?.getAnimations?.()[0] || null;
  }

  /* ---------- Магнітні літери заголовка hero ---------- */
  const heroChars = [...document.querySelectorAll('.hero .h1 > .fx-w .fx-ch')];
  let heroMouse = null;
  const hero = document.querySelector('.hero');
  let heroReady = false;
  setTimeout(() => (heroReady = true), 2600);
  if (fine && hero && heroChars.length) {
    hero.addEventListener('pointermove', (e) => (heroMouse = { x: e.clientX, y: e.clientY }));
    hero.addEventListener('pointerleave', () => (heroMouse = null));
  }
  const heroLetters = () => {
    if (!heroReady || !heroChars.length) return;
    heroChars.forEach((c) => {
      let lift = 0;
      let sc = 1;
      if (heroMouse) {
        const r = c.getBoundingClientRect();
        const dx = r.left + r.width / 2 - heroMouse.x;
        const dy = r.top + r.height / 2 - heroMouse.y;
        const d = Math.hypot(dx, dy);
        const f = Math.max(0, 1 - d / 220);
        lift = -f * f * 22;
        sc = 1 + f * f * 0.12;
      }
      const cur = c._fx || { l: 0, s: 1 };
      cur.l = lerp(cur.l, lift, 0.18);
      cur.s = lerp(cur.s, sc, 0.18);
      c._fx = cur;
      c.style.translate = `0 ${cur.l.toFixed(2)}px`;
      c.style.scale = cur.s.toFixed(3);
      c.style.color = cur.l < -4 ? 'var(--accent)' : '';
    });
  };

  /* ---------- Роботи: горизонтальна галерея, що крутиться скролом ---------- */
  const works = document.getElementById('works');
  const wins = works?.querySelector('.wins');
  const cards = wins ? [...wins.querySelectorAll('.win')] : [];
  const hsQuery = window.matchMedia('(min-width: 992px) and (min-height: 640px)');
  let hs = { on: false, dist: 0, top: 0, x: 0, skew: 0, last: 0 };
  let meta = null;
  if (works && wins && cards.length > 2) {
    meta = document.createElement('div');
    meta.className = 'hs-meta';
    meta.setAttribute('aria-hidden', 'true');
    const total = String(cards.length).padStart(2, '0');
    meta.innerHTML = `<span class="hs-num">01</span><span class="hs-bar"><i></i></span><span class="hs-total">${total}</span><span class="hs-hint">${isEn ? 'Scroll' : 'Гортайте'} →</span>`;
    wins.after(meta);
    cards.forEach((c, i) => {
      const n = document.createElement('span');
      n.className = 'hs-idx';
      n.setAttribute('aria-hidden', 'true');
      n.textContent = String(i + 1).padStart(2, '0');
      c.append(n);
    });
  }
  const measureHs = () => {
    if (!works || !wins) return;
    const want = hsQuery.matches && cards.length > 2;
    works.classList.toggle('fx-hs', want);
    hs.on = want;
    if (!want) {
      works.style.height = '';
      wins.style.transform = '';
      cards.forEach((c) => {
        c.style.scale = '';
        c.querySelector('.win-view img')?.style.removeProperty('translate');
      });
      return;
    }
    const inner = works.querySelector('.wrap');
    const pad = parseFloat(getComputedStyle(inner).paddingLeft) || 24;
    const left = inner.getBoundingClientRect().left + pad;
    const trackW = wins.scrollWidth;
    hs.dist = Math.max(0, trackW - (window.innerWidth - left * 2));
    works.style.height = `${hs.dist + vh()}px`;
    hs.top = works.getBoundingClientRect().top + window.scrollY;
  };
  if (works && wins) {
    measureHs();
    hsQuery.addEventListener?.('change', measureHs);
    window.addEventListener('resize', measureHs);
    window.addEventListener('load', measureHs);
    document.fonts?.ready.then(measureHs);
    new ResizeObserver(() => {
      // Позиція секції змінюється, коли щось вище міняє висоту
      if (hs.on) hs.top = works.getBoundingClientRect().top + window.scrollY;
    }).observe(document.body);
  }
  const hsFrame = () => {
    if (!hs.on) return;
    const p = hs.dist ? clamp((window.scrollY - hs.top) / hs.dist, 0, 1) : 0;
    const target = -p * hs.dist;
    const prev = hs.x;
    hs.x = lerp(hs.x, target, lenis ? 1 : 0.2);
    const v = hs.x - prev;
    hs.skew = 0;
    wins.style.transform = `translate3d(${hs.x.toFixed(1)}px,0,0) skewX(${hs.skew.toFixed(2)}deg)`;
    const center = window.innerWidth / 2;
    const active = Math.round(p * (cards.length - 1));
    cards.forEach((c) => {
      const r = c.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      const d = (mid - center) / window.innerWidth;
      c.style.scale = (1 - Math.min(Math.abs(d), 0.8) * 0.12).toFixed(3);
      const img = c.querySelector('.win-view img');
      if (img) img.style.translate = `${(d * -6).toFixed(2)}% 0`;
    });
    if (meta) {
      meta.querySelector('.hs-num').textContent = String(active + 1).padStart(2, '0');
      meta.querySelector('.hs-bar i').style.transform = `scaleX(${Math.max(p, 0.02)})`;
      meta.classList.toggle('is-done', p > 0.02);
    }
  };

  /* ---------- «Про мене»: слова загоряються під час скролу ---------- */
  const about = document.querySelector('.ab2-body');
  const aboutWords = [];
  if (about) {
    about.querySelectorAll('p').forEach((p) => {
      p.setAttribute('aria-label', p.textContent.replace(/\s+/g, ' ').trim());
      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) return frag.append(' ');
              const w = document.createElement('span');
              w.className = 'fx-sw';
              w.setAttribute('aria-hidden', 'true');
              w.textContent = part;
              aboutWords.push(w);
              frag.append(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1) walk(n);
        });
      };
      walk(p);
    });
    about.classList.add('fx-scrub');
  }
  let aboutLit = -1;
  const aboutFrame = () => {
    if (!about || !aboutWords.length) return;
    const r = about.getBoundingClientRect();
    const p = clamp((vh() * 0.82 - r.top) / (r.height + vh() * 0.3), 0, 1);
    const lit = Math.round(p * aboutWords.length);
    if (lit === aboutLit) return;
    aboutLit = lit;
    aboutWords.forEach((w, i) => w.classList.toggle('on', i < lit));
  };

  /* ---------- Блок контактів розкривається на скролі ---------- */
  const finalBox = document.querySelector('.final-box');
  const finalFrame = () => {
    if (!finalBox) return;
    const r = finalBox.getBoundingClientRect();
    const p = clamp((vh() - r.top) / (vh() * 0.75), 0, 1);
    const e = 1 - Math.pow(1 - p, 3);
    finalBox.style.setProperty('--ci', `${((1 - e) * 10).toFixed(2)}%`);
    finalBox.style.setProperty('--cy', `${((1 - e) * 6).toFixed(2)}%`);
    finalBox.style.setProperty('--cr', `${(32 + (1 - e) * 120).toFixed(1)}px`);
  };

  /* ---------- Ціни: числа набігають ---------- */
  const fmt = (n, spaced) => (spaced && n >= 1000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n));
  const countIO = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        countIO.unobserve(e.target);
        const el = e.target;
        const text = el.textContent;
        const m = text.match(/\d[\d\s ]*\d|\d/);
        if (!m) return;
        const raw = m[0];
        const n = parseInt(raw.replace(/\D/g, ''), 10);
        const spaced = /\s/.test(raw);
        const before = text.slice(0, m.index);
        const after = text.slice(m.index + raw.length);
        const start = performance.now();
        const dur = 1400;
        const step = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const v = Math.round(n * (1 - Math.pow(2, -10 * p)));
          el.textContent = before + fmt(p >= 1 ? n : v, spaced) + after;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    { threshold: 0.6 }
  );
  document.querySelectorAll('.price-sum, .extra-sum, .ab-num').forEach((el) => countIO.observe(el));

  /* ---------- Таймлайн: лінія тягнеться за скролом ---------- */
  const timeline = document.querySelector('.timeline');
  const tlFrame = () => {
    if (!timeline) return;
    const r = timeline.getBoundingClientRect();
    const p = clamp((vh() * 0.85 - r.top) / (r.height + vh() * 0.25), 0, 1);
    timeline.style.setProperty('--tl', p.toFixed(3));
  };

  /* ---------- Другий рядок стрічки: швидкість від скролу ---------- */
  let lastY = window.scrollY;
  let vel = 0;
  const ribbonFrame = () => {
    const y = window.scrollY;
    vel = lerp(vel, y - lastY, 0.12);
    lastY = y;
    if (ribbon2Anim) {
      const rate = 1 + Math.min(Math.abs(vel) * 0.35, 8);
      ribbon2Anim.playbackRate = vel < -0.5 ? -rate : rate;
    }
  };

  /* ---------- Логотип: літери хвилею при наведенні ---------- */
  document.querySelectorAll('.logo-word').forEach((w) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach((c) => {
            const s = document.createElement('span');
            s.className = 'fx-ll';
            s.style.setProperty('--i', i++);
            s.textContent = c;
            frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(w);
  });

  /* ---------- Картки робіт: адреса «дешифрується» при наведенні ---------- */
  document.querySelectorAll('.win').forEach((card) => {
    const url = card.querySelector('.win-url');
    if (!url) return;
    const txt = [...url.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (!txt) return;
    const span = document.createElement('span');
    span.className = 'win-url-t';
    span.textContent = txt.textContent.trim();
    txt.replaceWith(span);
  });

  /* ---------- Розділи сторінки: для активного пункту меню і скролбара ---------- */
  const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
  const sections = [{ el: document.body, label: isEn ? 'Top' : 'Початок', top: 0, link: null }];
  navLinks.forEach((a) => {
    const el = document.querySelector(a.getAttribute('href'));
    if (el) sections.push({ el, label: a.dataset.fxText || a.textContent.trim(), top: 0, link: a });
  });
  const contact = document.getElementById('contact');
  if (contact) sections.push({ el: contact, label: isEn ? 'Contact' : 'Контакти', top: 0, link: null });
  let docH = 1;
  const measureSections = () => {
    docH = document.documentElement.scrollHeight;
    sections.forEach((sec, i) => {
      sec.top = i === 0 ? 0 : sec.el.getBoundingClientRect().top + window.scrollY;
    });
    layoutRail();
  };
  let current = -1;
  const spyFrame = () => {
    const y = window.scrollY + vh() * 0.4;
    let idx = 0;
    sections.forEach((sec, i) => {
      if (sec.top <= y) idx = i;
    });
    if (idx === current) return;
    current = idx;
    if (railLabel) {
      railLabel.textContent = sections[idx].label;
    }
  };

  /* ---------- Власний скролбар: градієнтна рейка з точками розділів ---------- */
  let rail = null;
  let railThumb = null;
  let railLabel = null;
  let railTrack = null;
  const marks = [];
  const scrollToY = (y, immediate) => {
    if (lenis) lenis.scrollTo(y, { immediate: !!immediate, duration: 1.2 });
    else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
  };
  function layoutRail() {
    if (!rail) return;
    const h = railTrack.clientHeight;
    sections.forEach((sec, i) => {
      if (!marks[i]) return;
      marks[i].style.top = `${(sec.top / Math.max(docH, 1)) * h}px`;
    });
  }
  if (html.classList.contains('fx-sb') && fine) {
    rail = document.createElement('div');
    rail.className = 'sb';
    rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<div class="sb-track"><div class="sb-thumb"><span class="sb-label"></span></div></div>';
    railTrack = rail.querySelector('.sb-track');
    railThumb = rail.querySelector('.sb-thumb');
    railLabel = rail.querySelector('.sb-label');
    sections.forEach((sec) => {
      const m = document.createElement('button');
      m.type = 'button';
      m.tabIndex = -1;
      m.className = 'sb-mark';
      m.innerHTML = `<span>${sec.label}</span>`;
      m.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sec.el === document.body) scrollToY(0);
        else if (lenis) lenis.scrollTo(sec.el, { duration: 1.4 });
        else sec.el.scrollIntoView({ behavior: 'smooth' });
      });
      railTrack.append(m);
      marks.push(m);
    });
    (document.getElementById('pf') || document.body).append(rail);

    let drag = null;
    const geom = () => {
      const h = railTrack.clientHeight;
      const th = Math.max(48, (vh() / docH) * h);
      return { h, th, max: Math.max(docH - vh(), 1) };
    };
    railThumb.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const r = railThumb.getBoundingClientRect();
      drag = { off: e.clientY - r.top };
      railThumb.setPointerCapture(e.pointerId);
      rail.classList.add('drag');
    });
    railThumb.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const g = geom();
      const tr = railTrack.getBoundingClientRect();
      const pos = clamp(e.clientY - tr.top - drag.off, 0, g.h - g.th);
      scrollToY((pos / (g.h - g.th)) * g.max, true);
    });
    const end = () => {
      drag = null;
      rail.classList.remove('drag');
    };
    railThumb.addEventListener('pointerup', end);
    railThumb.addEventListener('pointercancel', end);
    railTrack.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.sb-mark, .sb-thumb')) return;
      const g = geom();
      const tr = railTrack.getBoundingClientRect();
      const pos = clamp(e.clientY - tr.top - g.th / 2, 0, g.h - g.th);
      scrollToY((pos / (g.h - g.th)) * g.max);
    });
  }
  let railIdle = 0;
  let railLastY = -1;
  const railFrame = () => {
    if (!rail) return;
    const g = (() => {
      const h = railTrack.clientHeight;
      return { h, th: Math.max(48, (vh() / docH) * h), max: Math.max(docH - vh(), 1) };
    })();
    const y = window.scrollY;
    railThumb.style.height = `${g.th}px`;
    railThumb.style.transform = `translateY(${((y / g.max) * (g.h - g.th)).toFixed(1)}px)`;
    // Підпис розділу видно, поки йде скрол
    if (y !== railLastY) {
      railLastY = y;
      railIdle = performance.now();
      rail.classList.add('moving');
    } else if (performance.now() - railIdle > 900) {
      rail.classList.remove('moving');
    }
    marks.forEach((m, i) => m.classList.toggle('on', i <= current));
  };
  measureSections();
  window.addEventListener('resize', measureSections);
  window.addEventListener('load', measureSections);
  document.fonts?.ready.then(measureSections);
  new ResizeObserver(measureSections).observe(document.body);

  const loop = () => {
    hsFrame();
    aboutFrame();
    finalFrame();
    tlFrame();
    ribbonFrame();
    spyFrame();
    railFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();

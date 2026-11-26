// FX: анімації з вау-ефектом. Якщо користувач просить менше руху, нічого не вмикаємо.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const html = document.documentElement;
  html.classList.add('fx');
  const isEn = html.lang === 'en';
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Прелоадер ---------- */
  const pl = document.querySelector('.pl');
  if (pl && html.classList.contains('fx-pl')) {
    const num = pl.querySelector('[data-pl-num]');
    const line = pl.querySelector('[data-pl-line]');
    const start = performance.now();
    const MIN = 1600; // мінімальна тривалість, щоб анімація встигла
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => (loaded = true));
    let shown = 0;
    const tick = (now) => {
      const t = Math.min((now - start) / MIN, 1);
      // Поки сторінка вантажиться, лічильник повзе до 90, потім добігає до 100
      const target = loaded ? 100 * t : Math.min(90, 100 * t);
      shown += (target - shown) * 0.12;
      if (loaded && t >= 1 && shown > 99.4) shown = 100;
      num.textContent = String(Math.round(shown));
      line.style.transform = `scaleX(${shown / 100})`;
      if (shown < 100) return requestAnimationFrame(tick);
      setTimeout(() => {
        pl.classList.add('pl-out');
        // Інтро hero стартує, поки завіса ще їде
        setTimeout(() => html.classList.remove('fx-pl'), 1000);
        setTimeout(() => pl.remove(), 1700);
      }, 200);
      try {
        sessionStorage.setItem('pl', '1');
      } catch (e) {}
    };
    requestAnimationFrame(tick);
  } else {
    pl?.remove();
  }

  /* ---------- Розбиття тексту ---------- */
  // Літери заголовка hero (слова не розриваються між рядками)
  const h1 = document.querySelector('.hero .h1');
  if (h1) {
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    const split = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(' ');
            const w = document.createElement('span');
            w.className = 'fx-w';
            w.setAttribute('aria-hidden', 'true');
            [...part].forEach((c) => {
              const s = document.createElement('span');
              s.className = 'fx-ch';
              s.style.setProperty('--i', i++);
              s.textContent = c;
              w.append(s);
            });
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) split(n);
      });
    };
    split(h1);
    h1.classList.add('fx-ready');
    // Після інтро акцентні слова отримують градієнт, що переливається
    const acc = h1.querySelector('.acc');
    if (acc) {
      setTimeout(() => {
        acc.textContent = acc.textContent;
        acc.setAttribute('aria-hidden', 'true');
        acc.classList.add('fx-grad');
      }, i * 28 + 1300);
    }
  }

  // Слова заголовків секцій виїжджають з-під маски
  document.querySelectorAll('.h2, .final-h').forEach((el) => {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    const split = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(' ');
            const m = document.createElement('span');
            m.className = 'fx-wm';
            m.setAttribute('aria-hidden', 'true');
            const w = document.createElement('span');
            w.className = 'fx-wi';
            w.style.setProperty('--i', i++);
            w.textContent = part;
            m.append(w);
            frag.append(m);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) split(n);
      });
    };
    split(el);
    el.classList.add('fx-split');
  });

  // Велике слово у футері — по літерах
  const word = document.querySelector('.word');
  if (word) {
    let i = 0;
    const out = document.createDocumentFragment();
    word.childNodes.forEach((n) => {
      const cls = n.nodeType === 1 ? n.className : '';
      [...n.textContent].forEach((c) => {
        const s = document.createElement('span');
        s.className = 'fx-l' + (cls ? ' ' + cls : '');
        s.style.setProperty('--i', i++);
        s.textContent = c;
        out.append(s);
      });
    });
    word.replaceChildren(out);
    const jump = (s) => {
      s.classList.remove('fx-jump');
      void s.offsetWidth;
      s.classList.add('fx-jump');
    };
    word.querySelectorAll('.fx-l').forEach((s) => {
      s.addEventListener('mouseenter', () => jump(s));
      s.addEventListener('animationend', () => s.classList.remove('fx-jump'));
    });
    word.addEventListener('click', () => {
      word.querySelectorAll('.fx-l').forEach((s, k) => setTimeout(() => jump(s), k * 50));
    });
  }

  /* ---------- Поява при скролі ---------- */
  const groups = ['.pains > .pain', '.wins > .win', '.prices > .price', '.extras > .extra', '.timeline > .tl', '.faq-list > .faq-item', '.head', '.ab2 > *', '.faq-side', '.final-box', '.sub'];
  groups.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el, k) => {
      el.classList.add('rv');
      el.style.setProperty('--d', el.parentElement && sel.includes('>') ? k % 6 : 0);
    });
  });
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add('fx-in');
        io.unobserve(el);
        // Після появи прибираємо затримки, щоб hover-ефекти реагували миттєво
        if (el.classList.contains('rv')) {
          const d = parseFloat(el.style.getPropertyValue('--d')) || 0;
          setTimeout(() => el.classList.remove('rv'), 1200 + d * 90);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );
  document.querySelectorAll('.rv, .fx-split, .timeline, .word').forEach((el) => io.observe(el));

  /* ---------- Прогрес скролу + швидкість для біжучого рядка ---------- */
  const bar = document.createElement('div');
  bar.className = 'fx-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);

  const track = document.querySelector('.marquee-track');
  const marquee = document.querySelector('.marquee');
  const marqueeAnim = track?.getAnimations?.()[0];
  const marqueeItems = track ? [...track.querySelectorAll('.marquee-item')] : [];
  let lastY = window.scrollY;
  let vel = 0;
  let skew = 0;
  const onFrame = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    vel = lerp(vel, y - lastY, 0.12);
    lastY = y;
    if (marqueeAnim) {
      const rate = 1 + Math.min(Math.abs(vel) * 0.35, 8);
      marqueeAnim.playbackRate = vel < -0.5 ? -rate : rate;
    }
    if (marquee) {
      skew = lerp(skew, Math.max(-10, Math.min(10, vel * 0.4)), 0.15);
      marquee.style.transform = `skewY(${skew * -0.25}deg)`;
      marqueeItems.forEach((m) => (m.style.transform = `skewX(${-skew}deg)`));
    }
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);

  /* ---------- Hero: інтерактивне поле точок + аврора ---------- */
  const hero = document.querySelector('.hero');
  if (hero) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-dots';
    canvas.setAttribute('aria-hidden', 'true');
    const aurora = document.createElement('div');
    aurora.className = 'fx-aurora';
    aurora.setAttribute('aria-hidden', 'true');
    hero.prepend(aurora);
    hero.querySelector('.hero-grid')?.after(canvas);
    const ctx = canvas.getContext('2d');
    const GAP = 30;
    let dots = [];
    let W = 0;
    let H = 0;
    let dpr = 1;
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    const aur = { x: 0, y: 0 };
    let visible = true;
    let colors = { base: '#8a8ba8', acc: '#146ef5' };

    const readColors = () => {
      const cs = getComputedStyle(document.getElementById('pf') || document.body);
      colors = { base: cs.getPropertyValue('--muted').trim() || '#8a8ba8', acc: '#146ef5' };
    };
    const resize = () => {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = GAP / 2; y < H; y += GAP) {
        for (let x = GAP / 2; x < W; x += GAP) dots.push({ ox: x, oy: y, x, y, vx: 0, vy: 0 });
      }
      aur.x = W / 2;
      aur.y = H * 0.45;
      readColors();
    };
    resize();
    window.addEventListener('resize', resize);
    new MutationObserver(readColors).observe(document.getElementById('pf') || document.body, { attributes: true, attributeFilter: ['class'] });

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouse.tx = e.clientX - r.left;
      mouse.ty = e.clientY - r.top;
      if (!mouse.active) {
        mouse.x = mouse.tx;
        mouse.y = mouse.ty;
      }
      mouse.active = true;
    });
    hero.addEventListener('pointerleave', () => (mouse.active = false));
    // Клік — хвиля, що розходиться
    const waves = [];
    hero.addEventListener('pointerdown', (e) => {
      const r = hero.getBoundingClientRect();
      waves.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: 0 });
    });
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero);

    let t = 0;
    const R = 150;
    const draw = () => {
      requestAnimationFrame(draw);
      if (!visible) return;
      t += 0.016;
      mouse.x = lerp(mouse.x, mouse.tx, 0.18);
      mouse.y = lerp(mouse.y, mouse.ty, 0.18);
      // Без курсора аврора плаває сама
      const ax = mouse.active ? mouse.x : W / 2 + Math.cos(t * 0.4) * W * 0.25;
      const ay = mouse.active ? mouse.y : H * 0.45 + Math.sin(t * 0.55) * H * 0.18;
      aur.x = lerp(aur.x, ax, 0.05);
      aur.y = lerp(aur.y, ay, 0.05);
      aurora.style.transform = `translate(${aur.x}px, ${aur.y}px)`;

      ctx.clearRect(0, 0, W, H);
      for (let k = waves.length - 1; k >= 0; k--) {
        waves[k].t += 9;
        if (waves[k].t > Math.max(W, H) * 1.2) waves.splice(k, 1);
      }
      for (const d of dots) {
        let fx = 0;
        let fy = 0;
        let glow = 0;
        if (mouse.active) {
          const dx = d.x - mouse.x;
          const dy = d.y - mouse.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < R) {
            const f = (1 - dist / R) ** 2;
            fx += (dx / dist) * f * 14;
            fy += (dy / dist) * f * 14;
            glow = Math.max(glow, 1 - dist / R);
          }
        }
        for (const w of waves) {
          const dx = d.ox - w.x;
          const dy = d.oy - w.y;
          const dist = Math.hypot(dx, dy) || 1;
          const band = 1 - Math.abs(dist - w.t) / 60;
          if (band > 0) {
            const fade = 1 - w.t / (Math.max(W, H) * 1.2);
            fx += (dx / dist) * band * 10 * fade;
            fy += (dy / dist) * band * 10 * fade;
            glow = Math.max(glow, band * fade);
          }
        }
        // Пружина назад до місця
        d.vx = (d.vx + fx + (d.ox - d.x) * 0.08) * 0.78;
        d.vy = (d.vy + fy + (d.oy - d.y) * 0.08) * 0.78;
        d.x += d.vx;
        d.y += d.vy;
        const idle = 0.5 + 0.5 * Math.sin(t * 1.4 + d.ox * 0.012 + d.oy * 0.018);
        ctx.globalAlpha = 0.14 + idle * 0.12 + glow * 0.8;
        ctx.fillStyle = glow > 0.05 ? colors.acc : colors.base;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.1 + glow * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    requestAnimationFrame(draw);

    // Легкий паралакс тексту hero
    const copy = hero.querySelector('.hero-copy');
    window.addEventListener(
      'scroll',
      () => {
        const y = window.scrollY;
        if (copy && y < H) {
          copy.style.transform = `translateY(${y * 0.25}px)`;
          copy.style.opacity = String(1 - (y / H) * 0.9);
        }
      },
      { passive: true }
    );
  }

  /* ---------- Світло за курсором на картках ---------- */
  document.querySelectorAll('.pain, .price, .extra, .final-box').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  if (!fine) return; // далі — лише для миші

  /* ---------- 3D-нахил карток робіт ---------- */
  document.querySelectorAll('.win').forEach((card) => {
    const glare = document.createElement('div');
    glare.className = 'fx-glare';
    card.append(glare);
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.classList.add('fx-tilting');
      card.style.transform = `translateY(-6px) rotateX(${(0.5 - py) * 12}deg) rotateY(${(px - 0.5) * 14}deg)`;
      glare.style.setProperty('--gx', `${px * 100}%`);
      glare.style.setProperty('--gy', `${py * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('fx-tilting');
      card.style.transform = '';
    });
  });

  /* ---------- Магнітні кнопки ---------- */
  document.querySelectorAll('.btn, .tool, .fab').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      b.style.transition = 'transform .15s ease-out, background-color .25s, border-color .25s';
      b.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
    });
    b.addEventListener('pointerleave', () => {
      b.style.transition = 'transform .6s cubic-bezier(.34, 1.56, .64, 1), background-color .25s, border-color .25s';
      b.style.transform = '';
    });
  });

  /* ---------- Курсор: рідка крапля з хвостом ---------- */
  // Хвіст із кількох кіл + SVG-фільтр «goo» = крапля, що тягнеться як ртуть
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0';
  svg.innerHTML =
    '<filter id="fx-goo"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>' +
    '<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"/></filter>';
  document.body.append(svg);

  const layer = document.createElement('div');
  layer.className = 'cx';
  layer.setAttribute('aria-hidden', 'true');
  const blob = document.createElement('div');
  blob.className = 'cx-blob';
  const TAIL = 7;
  const parts = Array.from({ length: TAIL }, (_, k) => {
    const d = document.createElement('span');
    const size = 22 - k * 2.2;
    d.style.width = d.style.height = `${size}px`;
    d.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
    blob.append(d);
    return { el: d, x: -100, y: -100 };
  });
  // Рамка, що «прилипає» до кнопок і посилань
  const box = document.createElement('div');
  box.className = 'cx-box';
  // Бейдж з текстом по колу для карток робіт
  const badge = document.createElement('div');
  badge.className = 'cx-badge';
  const txt = (isEn ? 'OPEN PROJECT • VIEW SITE • ' : 'ВІДКРИТИ ПРОЄКТ • ДИВИТИСЬ САЙТ • ');
  badge.innerHTML =
    `<svg viewBox="0 0 120 120"><defs><path id="cx-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs>` +
    `<text><textPath href="#cx-circle" textLength="288">${txt}</textPath></text></svg>` +
    `<span class="cx-arrow">↗</span>`;
  // Текстовий курсор для полів
  const beam = document.createElement('div');
  beam.className = 'cx-beam';
  layer.append(blob, box, badge, beam);
  document.body.append(layer);
  html.classList.add('fx-cursor');

  const p = { x: -100, y: -100 };
  const bp = { x: -100, y: -100, s: 0 };
  const bx = { x: 0, y: 0, w: 0, h: 0, r: 0 };
  let seen = false;
  let target = null; // елемент, до якого прилипла рамка
  let mode = '';

  const setMode = (m) => {
    if (m === mode) return;
    mode = m;
    layer.dataset.mode = m;
  };
  const resolve = (t) => {
    if (!t) return setMode('');
    const win = t.closest('.win');
    if (win) {
      target = null;
      return setMode('view');
    }
    if (t.closest('input, textarea, select')) {
      target = null;
      return setMode('text');
    }
    const link = t.closest('a, button, summary, label, .word');
    if (link) {
      if (link !== target) {
        target = link;
        const r = link.getBoundingClientRect();
        // Нова ціль — рамка стартує з позиції курсора
        if (mode !== 'link') Object.assign(bx, { x: p.x, y: p.y, w: 0, h: 0 });
        bx.r = parseFloat(getComputedStyle(link).borderRadius) || 10;
        if (r.height < 40) bx.r = Math.min(bx.r, 10);
      }
      return setMode('link');
    }
    target = null;
    setMode('');
  };

  window.addEventListener('pointermove', (e) => {
    p.x = e.clientX;
    p.y = e.clientY;
    if (!seen) {
      parts.forEach((q) => ((q.x = p.x), (q.y = p.y)));
      bp.x = p.x;
      bp.y = p.y;
      seen = true;
    }
    layer.classList.add('on');
    resolve(e.target instanceof Element ? e.target : null);
  });
  window.addEventListener('scroll', () => seen && resolve(document.elementFromPoint(p.x, p.y)), { passive: true });
  document.addEventListener('pointerleave', () => layer.classList.remove('on'));

  // Клік — бризки з краплі
  window.addEventListener('pointerdown', (e) => {
    layer.classList.add('down');
    for (let k = 0; k < 10; k++) {
      const s = document.createElement('i');
      s.className = 'cx-spark';
      const a = (Math.PI * 2 * k) / 10 + Math.random() * 0.4;
      const d = 30 + Math.random() * 40;
      s.style.left = `${e.clientX}px`;
      s.style.top = `${e.clientY}px`;
      layer.append(s);
      s.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 },
        ],
        { duration: 550 + Math.random() * 250, easing: 'cubic-bezier(.16, 1, .3, 1)' }
      ).onfinish = () => s.remove();
    }
  });
  window.addEventListener('pointerup', () => layer.classList.remove('down'));

  const loop = () => {
    // Хвіст: кожне коло наздоганяє попереднє
    let lx = p.x;
    let ly = p.y;
    parts.forEach((q, k) => {
      const f = k === 0 ? 0.55 : 0.5 - k * 0.025;
      q.x = lerp(q.x, lx, f);
      q.y = lerp(q.y, ly, f);
      q.el.style.transform = `translate(${q.x}px, ${q.y}px)`;
      lx = q.x;
      ly = q.y;
    });
    // Бейдж і курсор-лінія
    bp.x = lerp(bp.x, p.x, 0.2);
    bp.y = lerp(bp.y, p.y, 0.2);
    badge.style.transform = `translate(${bp.x}px, ${bp.y}px)`;
    beam.style.transform = `translate(${p.x}px, ${p.y}px)`;
    // Рамка обтягує елемент і трохи тягнеться за курсором
    if (mode === 'link' && target) {
      const r = target.getBoundingClientRect();
      const pad = 6;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const ox = (p.x - cx) * 0.12;
      const oy = (p.y - cy) * 0.18;
      bx.x = lerp(bx.x, r.left - pad + ox, 0.25);
      bx.y = lerp(bx.y, r.top - pad + oy, 0.25);
      bx.w = lerp(bx.w, r.width + pad * 2, 0.25);
      bx.h = lerp(bx.h, r.height + pad * 2, 0.25);
      box.style.transform = `translate(${bx.x}px, ${bx.y}px)`;
      box.style.width = `${bx.w}px`;
      box.style.height = `${bx.h}px`;
      box.style.borderRadius = `${bx.r + pad}px`;
      box.style.setProperty('--lx', `${p.x - bx.x}px`);
      box.style.setProperty('--ly', `${p.y - bx.y}px`);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();

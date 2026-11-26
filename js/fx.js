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
    const line = pl.querySelector('[data-pl-line]');
    const start = performance.now();
    const MIN = 2000; // зірочка встигає намалюватися
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => (loaded = true));
    let shown = 0;
    const tick = (now) => {
      const t = Math.min((now - start) / MIN, 1);
      // Поки сторінка вантажиться, смужка повзе до 90 %, потім добігає до кінця
      const target = loaded ? 100 * t : Math.min(90, 100 * t);
      shown += (target - shown) * 0.1;
      if (loaded && t >= 1 && shown > 99.4) shown = 100;
      line.style.transform = `scaleX(${shown / 100})`;
      if (shown < 100) return requestAnimationFrame(tick);
      setTimeout(() => {
        pl.classList.add('pl-out');
        // Інтро hero стартує, поки відкривається «вікно»
        setTimeout(() => html.classList.remove('fx-pl'), 650);
        setTimeout(() => pl.remove(), 1500);
      }, 250);
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
      const grad = () =>
        setTimeout(() => {
        acc.textContent = acc.textContent;
        acc.setAttribute('aria-hidden', 'true');
        acc.classList.add('fx-grad');
      }, i * 28 + 1300);
      // Градієнт вмикаємо після інтро, а інтро чекає, поки зникне прелоадер
      if (html.classList.contains('fx-pl')) {
        const mo = new MutationObserver(() => {
          if (html.classList.contains('fx-pl')) return;
          mo.disconnect();
          grad();
        });
        mo.observe(html, { attributes: true, attributeFilter: ['class'] });
      } else grad();
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
  const groups = ['.pains > .pain', '.wins > .win', '.prices > .price', '.extras > .extra', '.timeline > .tl', '.faq-list > .faq-item', '.head', '.ab2 > *', '.faq-side', '.sub'];
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

  const track = document.querySelector('.marquee-track');
  const marquee = document.querySelector('.marquee');
  const marqueeAnim = track?.getAnimations?.()[0];
  const marqueeItems = track ? [...track.querySelectorAll('.marquee-item')] : [];
  let lastY = window.scrollY;
  let vel = 0;
  let skew = 0;
  const onFrame = () => {
    const y = window.scrollY;
    vel = lerp(vel, y - lastY, 0.12);
    lastY = y;
    if (marqueeAnim) {
      const rate = 1 + Math.min(Math.abs(vel) * 0.35, 8);
      marqueeAnim.playbackRate = vel < -0.5 ? -rate : rate;
    }
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);

  /* ---------- Hero: 3D-хмара частинок, що перетікає між фігурами + аврора ---------- */
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
    const small = !fine || window.innerWidth < 760;
    const N = small ? 1000 : 2000;
    let W = 0;
    let H = 0;
    let dpr = 1;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    const aur = { x: 0, y: 0 };
    let visible = true;
    const pf = document.getElementById('pf') || document.body;
    let dark = pf.classList.contains('dark');
    new MutationObserver(() => (dark = pf.classList.contains('dark'))).observe(pf, { attributes: true, attributeFilter: ['class'] });

    // Фігури: кожна — N точок у просторі [-1.3; 1.3]
    const rnd = (k) => {
      const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const gauss = (k) => Math.sqrt(-2 * Math.log(rnd(k) + 1e-6)) * Math.cos(2 * Math.PI * rnd(k + 0.5));
    const shapes = [];
    const make = (fn) => {
      const a = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const [x, y, z] = fn(i);
        a[i * 3] = x;
        a[i * 3 + 1] = y;
        a[i * 3 + 2] = z;
      }
      shapes.push(a);
    };
    const golden = Math.PI * (3 - Math.sqrt(5));
    // Сфера
    make((i) => {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      return [Math.cos(golden * i) * r, y, Math.sin(golden * i) * r];
    });
    // Тор (бублик)
    make((i) => {
      const rings = 64;
      const per = Math.ceil(N / rings);
      const u = ((i % per) / per) * Math.PI * 2;
      const v = (Math.floor(i / per) / rings) * Math.PI * 2;
      const R = 0.78;
      const r = 0.32;
      return [(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)];
    });
    // Галактика з трьома рукавами
    make((i) => {
      const t = rnd(i * 3.1);
      const rad = Math.pow(t, 0.6) * 1.3;
      const arm = i % 3;
      const ang = (arm * Math.PI * 2) / 3 + rad * 3.4 + gauss(i * 1.7) * 0.22;
      return [Math.cos(ang) * rad, gauss(i * 2.3) * 0.07 * (1.3 - rad), Math.sin(ang) * rad];
    });
    // Подвійна спіраль ДНК
    make((i) => {
      const s = i / N;
      const y = (s * 2 - 1) * 1.25;
      const a = s * Math.PI * 7;
      const kind = i % 4;
      if (kind < 2) {
        const b = a + kind * Math.PI;
        return [Math.cos(b) * 0.45, y, Math.sin(b) * 0.45];
      }
      const k = rnd(i) * 2 - 1;
      const step = Math.round(s * 40) / 40;
      const a2 = step * Math.PI * 7;
      return [Math.cos(a2) * 0.45 * k, (step * 2 - 1) * 1.25, Math.sin(a2) * 0.45 * k];
    });
    // Хвиля-поверхня
    make((i) => {
      const side = Math.ceil(Math.sqrt(N));
      const gx = ((i % side) / (side - 1)) * 2.6 - 1.3;
      const gz = (Math.floor(i / side) / (side - 1)) * 2.6 - 1.3;
      return [gx, Math.sin(gx * 2.6) * Math.cos(gz * 2.6) * 0.22, gz];
    });

    const pos = new Float32Array(shapes[0]);
    const from = new Float32Array(N * 3);
    const off = new Float32Array(N * 3); // зсув від вибуху
    const vel = new Float32Array(N * 3);
    const sx = new Float32Array(N); // зсув на екрані від курсора
    const sy = new Float32Array(N);
    const svx = new Float32Array(N);
    const svy = new Float32Array(N);
    const delay = new Float32Array(N);
    for (let i = 0; i < N; i++) delay[i] = rnd(i * 9.7) * 0.45;
    // Кольори: синій, фіолетовий, рожевий, бірюзовий
    const palette = ['#3b82f6', '#8b5cf6', '#ec4899', '#22d3ee'];
    const group = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const r = rnd(i * 5.3);
      group[i] = r < 0.42 ? 0 : r < 0.75 ? 1 : r < 0.93 ? 2 : 3;
    }
    let shape = 0;
    let morphStart = -10;
    const MORPH = 2.2;
    const HOLD = 4.2;
    const toShape = (n, now) => {
      from.set(pos);
      shape = n % shapes.length;
      morphStart = now;
    };
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

    const resize = () => {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      aur.x = W / 2;
      aur.y = H * 0.45;
      mouse.x = mouse.tx = W / 2;
      mouse.y = mouse.ty = H / 2;
    };
    resize();
    window.addEventListener('resize', resize);

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouse.tx = e.clientX - r.left;
      mouse.ty = e.clientY - r.top;
      mouse.active = true;
    });
    hero.addEventListener('pointerleave', () => (mouse.active = false));
    // Клік — вибух частинок і наступна фігура
    hero.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button')) return;
      for (let i = 0; i < N; i++) {
        const x = pos[i * 3];
        const y = pos[i * 3 + 1];
        const z = pos[i * 3 + 2];
        const l = Math.hypot(x, y, z) || 1;
        const f = 0.09 + rnd(i * 4.1) * 0.11;
        vel[i * 3] += (x / l) * f;
        vel[i * 3 + 1] += (y / l) * f;
        vel[i * 3 + 2] += (z / l) * f;
      }
      toShape(shape + 1, performance.now() / 1000);
    });
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero);

    let ry = 0;
    let rx = 0.45;
    const t0 = performance.now() / 1000;
    morphStart = t0 - MORPH;
    const draw = () => {
      requestAnimationFrame(draw);
      if (!visible || html.classList.contains('menu-open')) return;
      const now = performance.now() / 1000;
      const t = now - t0;
      if (now - morphStart > MORPH + HOLD) toShape(shape + 1, now);

      mouse.x = lerp(mouse.x, mouse.tx, 0.08);
      mouse.y = lerp(mouse.y, mouse.ty, 0.08);
      const ax = mouse.active ? mouse.tx : W / 2 + Math.cos(t * 0.4) * W * 0.25;
      const ay = mouse.active ? mouse.ty : H * 0.45 + Math.sin(t * 0.55) * H * 0.18;
      aur.x = lerp(aur.x, ax, 0.05);
      aur.y = lerp(aur.y, ay, 0.05);
      aurora.style.transform = `translate(${aur.x}px, ${aur.y}px)`;

      // Обертання: саме по собі + нахил за мишею
      ry += 0.0035;
      const ryM = ry + (mouse.x / W - 0.5) * 1.2;
      rx = lerp(rx, 0.45 + (mouse.y / H - 0.5) * 0.8, 0.06);
      const cY = Math.cos(ryM);
      const sY = Math.sin(ryM);
      const cX = Math.cos(rx);
      const sX = Math.sin(rx);

      const sp = Math.min(window.scrollY / H, 1);
      const cx = W / 2;
      const cy = H * 0.47;
      const R = Math.min(W * 0.36, H * 0.42) * (1 + sp * 1.4);
      const fade = 1 - sp;
      const target = shapes[shape];
      const mt = now - morphStart;
      const mR = small ? 90 : 130;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      for (let g = 0; g < palette.length; g++) {
        ctx.fillStyle = palette[g];
        for (let i = 0; i < N; i++) {
          if (group[i] !== g) continue;
          const i3 = i * 3;
          // Перетікання з затримкою для кожної частинки
          const p = Math.min(Math.max((mt - delay[i]) / MORPH, 0), 1);
          const e = ease(p);
          for (let k = 0; k < 3; k++) {
            pos[i3 + k] = from[i3 + k] + (target[i3 + k] - from[i3 + k]) * e;
            vel[i3 + k] *= 0.9;
            off[i3 + k] = (off[i3 + k] + vel[i3 + k]) * 0.95;
          }
          const w = Math.sin(t * 1.3 + i * 0.37) * 0.012;
          const x = pos[i3] + off[i3] + w;
          const y = pos[i3 + 1] + off[i3 + 1] + Math.cos(t * 1.1 + i * 0.21) * 0.012;
          const z = pos[i3 + 2] + off[i3 + 2];
          const x1 = x * cY - z * sY;
          const z1 = x * sY + z * cY;
          const y1 = y * cX - z1 * sX;
          const z2 = y * sX + z1 * cX;
          const persp = 2.8 / (2.8 + z2);
          let px = cx + x1 * R * persp;
          let py = cy + y1 * R * persp;
          // Частинки розступаються перед курсором
          if (mouse.active) {
            const dx = px + sx[i] - mouse.tx;
            const dy = py + sy[i] - mouse.ty;
            const d = Math.hypot(dx, dy) || 1;
            if (d < mR) {
              const f = (1 - d / mR) ** 2 * 6;
              svx[i] += (dx / d) * f;
              svy[i] += (dy / d) * f;
            }
          }
          svx[i] = (svx[i] - sx[i] * 0.06) * 0.82;
          svy[i] = (svy[i] - sy[i] * 0.06) * 0.82;
          sx[i] += svx[i];
          sy[i] += svy[i];
          px += sx[i];
          py += sy[i];
          const depth = (persp - 0.68) / 0.66; // 0 — далеко, 1 — близько
          ctx.globalAlpha = Math.max(0, (0.18 + depth * 0.7) * fade * (dark ? 0.9 : 0.75));
          const size = (small ? 1.1 : 1.25) * persp * persp;
          ctx.fillRect(px - size, py - size, size * 2, size * 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
    requestAnimationFrame(draw);

    // Паралакс тексту hero
    const copy = hero.querySelector('.hero-copy');
    window.addEventListener(
      'scroll',
      () => {
        const y = window.scrollY;
        if (copy && y < H) {
          copy.style.transform = `translateY(${y * 0.3}px) scale(${1 - (y / H) * 0.08})`;
          copy.style.opacity = String(1 - (y / H) * 1.1);
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

  /* ---------- Магнітні кнопки + заливка «чорнилом» від точки входу ---------- */
  const T_IN = 'transform .15s ease-out, background-color .25s, border-color .25s, color .35s';
  const T_OUT = 'transform .6s cubic-bezier(.34, 1.56, .64, 1), background-color .25s, border-color .25s, color .35s';
  document.querySelectorAll('.btn, .tool, .fab').forEach((b) => {
    const ink = (e) => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const d = 2 * Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));
      b.style.setProperty('--bx', `${x}px`);
      b.style.setProperty('--by', `${y}px`);
      b.style.setProperty('--bd', `${d}px`);
    };
    b.addEventListener('pointerenter', ink);
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      b.style.transition = T_IN;
      b.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
    });
    b.addEventListener('pointerleave', (e) => {
      ink(e);
      b.style.transition = T_OUT;
      b.style.transform = '';
    });
  });

  /* ---------- Курсор ---------- */
  // Рідка крапля: голова тягнеться за рухом, хвіст злипається через SVG-фільтр «goo»
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
  // Яскрава серцевина поверх краплі — точне місце кліку
  const core = document.createElement('div');
  core.className = 'cx-core';
  // Рамка, що прилипає до посилань: переливчаста обвідка + значок типу посилання
  const box = document.createElement('div');
  box.className = 'cx-box';
  box.innerHTML = '<i></i><b></b>';
  const boxIcon = box.querySelector('b');
  // Бейдж з назвою проєкту по колу
  const badge = document.createElement('div');
  badge.className = 'cx-badge';
  badge.innerHTML =
    '<svg viewBox="0 0 120 120"><defs><path id="cx-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs>' +
    '<text><textPath href="#cx-circle"></textPath></text></svg>' +
    '<span class="cx-arrow">↗</span>';
  const badgeText = badge.querySelector('textPath');
  const beam = document.createElement('div');
  beam.className = 'cx-beam';
  layer.append(blob, core, box, badge, beam);
  document.body.append(layer);
  html.classList.add('fx-cursor');

  const p = { x: -100, y: -100 };
  const bp = { x: -100, y: -100 };
  const bx = { x: 0, y: 0, w: 0, h: 0, r: 0 };
  const head = { vx: 0, vy: 0 };
  let seen = false;
  let target = null;
  let lastWin = null;
  let mode = '';

  const setMode = (m) => {
    if (m === mode) return;
    mode = m;
    layer.dataset.mode = m;
  };
  const iconFor = (a) => {
    const href = a.getAttribute?.('href') || '';
    if (href.startsWith('mailto:')) return '@';
    if (href === '#top') return '↑';
    if (href.startsWith('#')) return '↓';
    if (a.target === '_blank') return '↗';
    if (a.matches('[data-theme-toggle]')) return '◐';
    if (a.matches('summary')) return '+';
    if (/index\.html$/.test(href)) return isEn ? 'UA' : 'EN';
    return '';
  };
  const resolve = (t) => {
    if (!t) return setMode('');
    const win = t.closest('.win');
    if (win) {
      target = null;
      if (win !== lastWin) {
        lastWin = win;
        const name = (win.querySelector('.win-name')?.textContent || '').trim().toUpperCase();
        let str = `${name} • ${isEn ? 'OPEN SITE' : 'ВІДКРИТИ'} • `;
        if (str.length < 20) str += str;
        badgeText.textContent = str;
        // Підганяємо розмір, щоб текст рівно обійшов усе коло
        const tEl = badgeText.parentNode;
        tEl.style.fontSize = '10px';
        const len = tEl.getComputedTextLength?.() || 0;
        if (len) tEl.style.fontSize = `${Math.min(13, Math.max(6.5, (10 * 284) / len))}px`;
      }
      return setMode('view');
    }
    if (t.closest('input, textarea, select')) {
      target = null;
      return setMode('text');
    }
    const link = t.closest('a, button, summary, label.check, .sb');
    if (link && !link.classList.contains('sb') && !link.closest('.nav, .up, summary, .lang')) {
      if (link !== target) {
        target = link;
        const r = link.getBoundingClientRect();
        if (mode !== 'link') Object.assign(bx, { x: p.x, y: p.y, w: 0, h: 0 });
        bx.r = parseFloat(getComputedStyle(link).borderRadius) || 10;
        if (r.height < 40) bx.r = Math.min(bx.r, 10);
        const ic = iconFor(link);
        boxIcon.textContent = ic;
        box.classList.toggle('has-icon', !!ic);
      }
      return setMode('link');
    }
    target = null;
    if (link && link.closest('.nav, .up, summary, .lang')) return setMode('mini');
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

  // Клік: хвиля-кільце + бризки
  window.addEventListener('pointerdown', (e) => {
    layer.classList.add('down');
    const ring = document.createElement('i');
    ring.className = 'cx-ripple';
    ring.style.left = `${e.clientX}px`;
    ring.style.top = `${e.clientY}px`;
    layer.append(ring);
    ring.addEventListener('animationend', () => ring.remove());
  });
  window.addEventListener('pointerup', () => layer.classList.remove('down'));

  const loop = () => {
    // Хвіст: кожне коло наздоганяє попереднє
    let lx = p.x;
    let ly = p.y;
    parts.forEach((q, k) => {
      const f = k === 0 ? 0.55 : 0.5 - k * 0.025;
      const px = q.x;
      const py = q.y;
      q.x = lerp(q.x, lx, f);
      q.y = lerp(q.y, ly, f);
      if (k === 0) {
        // Голова розтягується вздовж руху
        head.vx = lerp(head.vx, q.x - px, 0.35);
        head.vy = lerp(head.vy, q.y - py, 0.35);
        const sp = Math.min(Math.hypot(head.vx, head.vy) / 18, 0.7);
        const ang = Math.atan2(head.vy, head.vx);
        q.el.style.transform = `translate(${q.x}px, ${q.y}px) rotate(${ang}rad) scale(${1 + sp}, ${1 - sp * 0.45})`;
      } else {
        q.el.style.transform = `translate(${q.x}px, ${q.y}px)`;
      }
      lx = q.x;
      ly = q.y;
    });
    core.style.transform = `translate(${p.x}px, ${p.y}px)`;
    bp.x = lerp(bp.x, p.x, 0.2);
    bp.y = lerp(bp.y, p.y, 0.2);
    badge.style.transform = `translate(${bp.x}px, ${bp.y}px)`;
    beam.style.transform = `translate(${p.x}px, ${p.y}px)`;
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

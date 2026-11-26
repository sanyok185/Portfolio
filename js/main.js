// Перемикач теми (світла за замовчуванням, вибір зберігається)
const root = document.getElementById('pf');
const docEl = document.documentElement;
const toggleTheme = (e) => {
  if (!root) return;
  const next = root.classList.contains('dark') ? 'light' : 'dark';
  const apply = () => {
    root.classList.remove('light', 'dark');
    root.classList.add(next);
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !reduce) {
    // Нова тема розходиться колом від кнопки
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  } else {
    apply();
  }
  try {
    localStorage.setItem('theme', next);
  } catch (err) {
    /* приватний режим — просто не зберігаємо */
  }
};
// Кнопок теми дві: у шапці та в мобільному меню
document.querySelectorAll('[data-theme-toggle]').forEach((btn) => btn.addEventListener('click', toggleTheme));

// Мобільне меню (бургер)
const burger = document.querySelector('[data-menu-toggle]');
const mnav = document.getElementById('mnav');
if (burger && mnav) {
  const html = document.documentElement;
  const page = [document.querySelector('main'), document.querySelector('.foot'), document.querySelector('.fab')].filter(Boolean);
  const labelOpen = burger.getAttribute('aria-label');
  const labelClose = burger.dataset.labelClose || labelOpen;
  const links = [...mnav.querySelectorAll('.mnav-link[href^="#"]')];
  const isOpen = () => html.classList.contains('menu-open');

  const markActive = () => {
    // Підсвічуємо розділ, на якому зараз користувач
    const y = window.scrollY + window.innerHeight * 0.4;
    let active = null;
    links.forEach((a) => {
      const el = document.querySelector(a.getAttribute('href'));
      if (el && el.getBoundingClientRect().top + window.scrollY <= y) active = a;
    });
    links.forEach((a) => a.classList.toggle('is-active', a === active));
  };

  const setOpen = (open, { focusFirst = false, returnFocus = false } = {}) => {
    if (open === isOpen()) return;
    if (open) {
      // Меню розкривається колом від бургера
      const r = burger.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      mnav.style.setProperty('--mx', `${x}px`);
      mnav.style.setProperty('--my', `${y}px`);
      mnav.style.setProperty('--mr', `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20}px`);
      mnav.scrollTop = 0;
      markActive();
    }
    html.classList.toggle('menu-open', open);
    mnav.inert = !open;
    page.forEach((el) => (el.inert = open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? labelClose : labelOpen);
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
    if (open && focusFirst) setTimeout(() => links[0]?.focus({ preventScroll: true }), 300);
    if (!open && returnFocus) burger.focus({ preventScroll: true });
  };

  // detail === 0 — кнопку натиснули з клавіатури, тоді переводимо фокус у меню
  burger.addEventListener('click', (e) => setOpen(!isOpen(), { focusFirst: e.detail === 0 }));
  // Клік по пункту закриває меню, а сторінка їде до розділу
  mnav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false, { returnFocus: true });
  });
  window.matchMedia('(min-width: 992px)').addEventListener('change', (e) => e.matches && setOpen(false));
}

// «Показати більше» в роботах
const works = document.querySelector('[data-works]');
const worksBtn = document.querySelector('[data-works-toggle]');
worksBtn?.addEventListener('click', () => {
  if (!works) return;
  const open = works.classList.toggle('all');
  worksBtn.textContent = open ? worksBtn.dataset.less : worksBtn.dataset.more;
});

// Форма заявки: вкажіть адресу, куди надсилати (наприклад https://formspree.io/f/xxxxxxx)
const FORM_ENDPOINT = '';
const mainForm = document.querySelector('[data-lead-form]');

// Попап із тією самою формою, що й унизу сторінки
const leadModal = document.querySelector('.lead-modal');
const leadSlot = leadModal?.querySelector('[data-lead-slot]');
if (mainForm && leadSlot) {
  const clone = mainForm.cloneNode(true);
  clone.querySelector('input[name="name"]')?.setAttribute('autofocus', '');
  leadSlot.replaceWith(clone);
}

// Свої випадаючі списки замість системних (значення лишається в прихованому <select>)
const CHEVRON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';
const CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
let csUid = 0;
const enhanceSelect = (select) => {
  const field = select.closest('.field');
  const caption = field?.querySelector('span');
  const id = `cs-${++csUid}`;
  if (caption) caption.id = `${id}-label`;
  const wrap = document.createElement('div');
  wrap.className = 'cs';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'input cs-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', `${id}-list`);
  btn.innerHTML = `<span class="cs-val" id="${id}-val"></span>${CHEVRON}`;
  btn.setAttribute('aria-labelledby', `${id}-label ${id}-val`);
  const list = document.createElement('ul');
  list.className = 'cs-list';
  list.id = `${id}-list`;
  list.setAttribute('role', 'listbox');
  list.tabIndex = -1;
  if (caption) list.setAttribute('aria-labelledby', `${id}-label`);
  const opts = [...select.options].map((o, i) => {
    const li = document.createElement('li');
    li.className = 'cs-opt';
    li.id = `${id}-o${i}`;
    li.setAttribute('role', 'option');
    li.innerHTML = `<span>${o.text}</span>${CHECK}`;
    list.append(li);
    return li;
  });
  select.classList.add('cs-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  select.after(wrap);
  wrap.append(select, btn, list);

  let active = select.selectedIndex;
  const setActive = (i) => {
    active = Math.max(0, Math.min(opts.length - 1, i));
    opts.forEach((li, k) => li.classList.toggle('active', k === active));
    list.setAttribute('aria-activedescendant', opts[active].id);
    opts[active].scrollIntoView({ block: 'nearest' });
  };
  const sync = () => {
    btn.querySelector('.cs-val').textContent = select.options[select.selectedIndex]?.text || '';
    opts.forEach((li, k) => li.setAttribute('aria-selected', String(k === select.selectedIndex)));
  };
  const isOpen = () => wrap.classList.contains('open');
  const open = () => {
    if (isOpen()) return;
    document.querySelectorAll('.cs.open').forEach((w) => w._close?.());
    // Якщо знизу мало місця — відкриваємо вгору
    // Межі — вікно браузера або попап, у якому стоїть список
    const r = btn.getBoundingClientRect();
    const box = btn.closest('.lead-box')?.getBoundingClientRect();
    const below = (box ? Math.min(box.bottom, window.innerHeight) : window.innerHeight) - r.bottom - 12;
    const above = r.top - (box ? Math.max(box.top, 0) : 0) - 12;
    const need = Math.min(340, opts.length * 44 + 14);
    const up = below < need && above > below;
    wrap.classList.toggle('up', up);
    wrap.style.setProperty('--cs-max', `${Math.max(140, Math.min(340, up ? above : below))}px`);
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    setActive(select.selectedIndex);
    list.focus({ preventScroll: true });
  };
  const close = (focusBtn = true) => {
    if (!isOpen()) return;
    wrap.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    if (focusBtn) btn.focus({ preventScroll: true });
  };
  wrap._close = () => close(false);
  const choose = (i) => {
    select.selectedIndex = i;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
    close();
  };
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    isOpen() ? close() : open();
  });
  btn.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      open();
    }
  });
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') setActive(active + 1);
    else if (e.key === 'ArrowUp') setActive(active - 1);
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(opts.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape') {
      e.stopPropagation(); // не закриваємо попап разом зі списком
      close();
    } else if (e.key === 'Tab') close(false);
    else return;
    e.preventDefault();
  });
  opts.forEach((li, i) => {
    li.addEventListener('mousemove', () => active !== i && setActive(i));
    // preventDefault: щоб клік не «пройшов» через <label> і не відкрив список знову
    li.addEventListener('click', (e) => {
      e.preventDefault();
      choose(i);
    });
  });
  select._cs = { sync };
  select.addEventListener('change', sync);
  sync();
};
document.querySelectorAll('[data-lead-form] select').forEach(enhanceSelect);
document.addEventListener('pointerdown', (e) => {
  document.querySelectorAll('.cs.open').forEach((w) => !w.contains(e.target) && w._close());
});

// Відкриття попапа
if (leadModal) {
  const leadForm = leadModal.querySelector('[data-lead-form]');
  const lock = (on) => {
    document.documentElement.classList.toggle('lead-open', on);
    if (window.__lenis) on ? window.__lenis.stop() : window.__lenis.start();
  };
  const openLead = (type) => {
    if (type && leadForm) {
      const sel = leadForm.querySelector('select[name="type"]');
      const opt = sel && [...sel.options].findIndex((o) => o.text === type);
      if (opt >= 0) {
        sel.selectedIndex = opt;
        sel._cs?.sync();
      }
    }
    if (document.documentElement.classList.contains('menu-open')) document.querySelector('[data-menu-toggle]')?.click();
    leadModal.classList.remove('closing');
    leadModal.showModal();
    lock(true);
  };
  const closeLead = () => {
    if (!leadModal.open || leadModal.classList.contains('closing')) return;
    leadModal.classList.add('closing');
    setTimeout(() => {
      leadModal.classList.remove('closing');
      leadModal.close();
    }, 260);
  };
  leadModal.addEventListener('close', () => lock(false));
  // Escape — з анімацією закриття
  leadModal.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeLead();
  });
  leadModal.addEventListener('click', (e) => {
    if (e.target === leadModal || e.target.closest('[data-lead-close]')) closeLead();
  });
  document.querySelectorAll('[data-lead-open]').forEach((a) =>
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      openLead(a.dataset.leadType);
    })
  );
}

// Надсилання — для обох форм (унизу сторінки і в попапі)
document.querySelectorAll('[data-lead-form]').forEach((form) =>
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    const show = (text) => {
      if (!status) return;
      status.textContent = text;
      status.hidden = false;
    };
    if (!FORM_ENDPOINT) {
      show(form.dataset.error);
      return;
    }
    const label = submit?.textContent ?? '';
    if (submit) {
      submit.disabled = true;
      submit.textContent = form.dataset.sending;
    }
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      form.querySelectorAll('select').forEach((sel) => sel._cs?.sync());
      show(form.dataset.success);
    } catch (err) {
      show(form.dataset.error);
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = label;
      }
    }
  })
);

// Шапка: скляна капсула після початку скролу, ховається при скролі вниз
const hdr = document.querySelector('.hdr');
const upBtn = document.querySelector('.up');
const nav = document.querySelector('.nav');
const navLinks = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
let navActive = null;
let navHover = null;
let pill = null;
const movePill = (a, instant) => {
  if (!pill) return;
  if (!a) {
    pill.style.opacity = '0';
    return;
  }
  pill.classList.toggle('no-anim', !!instant);
  pill.style.width = `${a.offsetWidth}px`;
  pill.style.height = `${a.offsetHeight}px`;
  pill.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
  pill.style.opacity = '1';
};
if (nav) {
  pill = document.createElement('span');
  pill.className = 'nav-pill';
  pill.setAttribute('aria-hidden', 'true');
  nav.prepend(pill);
  navLinks.forEach((a) =>
    a.addEventListener('mouseenter', () => {
      // З нуля плашка з'являється на місці, далі — переїжджає
      movePill(a, pill.style.opacity !== '1');
      navHover = a;
    })
  );
  nav.addEventListener('mouseleave', () => {
    navHover = null;
    movePill(navActive);
  });
}
const spy = () => {
  if (!navLinks.length) return;
  const line = window.innerHeight * 0.4;
  let current = null;
  navLinks.forEach((a) => {
    const el = document.querySelector(a.getAttribute('href'));
    if (el && el.getBoundingClientRect().top <= line) current = a;
  });
  if (current !== navActive) {
    navLinks.forEach((a) => a.classList.toggle('is-active', a === current));
    navActive = current;
    if (!navHover) movePill(current);
  }
};
let lastY = window.scrollY;
let ticking = false;
const onScroll = () => {
  ticking = false;
  const y = window.scrollY;
  if (hdr) {
    hdr.classList.toggle('is-scrolled', y > 24);
    const dy = y - lastY;
    if (Math.abs(dy) > 6) {
      const hide = dy > 0 && y > 360 && !docEl.classList.contains('menu-open') && !hdr.contains(document.activeElement);
      hdr.classList.toggle('is-hidden', hide);
      lastY = y;
    }
  }
  spy();
  // Кільце кнопки «Нагору» заповнюється разом зі скролом
  if (upBtn) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    upBtn.style.setProperty('--up', String(100 - (max > 0 ? Math.min(y / max, 1) : 0) * 100));
  }
};
window.addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  },
  { passive: true }
);
window.addEventListener('resize', () => movePill(navHover || navActive, true));
// Курсор біля верхнього краю або фокус з клавіатури — шапка повертається
window.addEventListener('pointermove', (e) => e.clientY < 90 && hdr?.classList.remove('is-hidden'), { passive: true });
hdr?.addEventListener('focusin', () => hdr.classList.remove('is-hidden'));
onScroll();

// Перемикач мов: плашка перебігає на іншу мову перед переходом
document.querySelectorAll('.lang').forEach((a) => a.addEventListener('click', () => a.classList.add('switching')));
window.addEventListener('pageshow', () => document.querySelectorAll('.lang.switching').forEach((a) => a.classList.remove('switching')));

// FAQ: відкрите лише одне питання (запасний варіант для браузерів без <details name>)
const faqItems = [...document.querySelectorAll('.faq-item')];
faqItems.forEach((d) =>
  d.addEventListener('toggle', () => {
    if (d.open) faqItems.forEach((o) => o !== d && o.open && (o.open = false));
  })
);

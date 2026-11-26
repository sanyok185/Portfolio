// Перемикач теми (світла за замовчуванням, вибір зберігається)
const root = document.getElementById('pf');
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
const form = document.querySelector('[data-lead-form]');
form?.addEventListener('submit', async (e) => {
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
    show(form.dataset.success);
  } catch (err) {
    show(form.dataset.error);
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = label;
    }
  }
});

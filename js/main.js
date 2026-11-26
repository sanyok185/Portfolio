// Перемикач теми (світла за замовчуванням, вибір зберігається)
const root = document.getElementById('pf');
document.querySelector('[data-theme-toggle]')?.addEventListener('click', (e) => {
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
});

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

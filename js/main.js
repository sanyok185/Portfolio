// Перемикач теми (світла за замовчуванням, вибір зберігається)
const root = document.getElementById('pf');
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
  if (!root) return;
  const next = root.classList.contains('dark') ? 'light' : 'dark';
  root.classList.remove('light', 'dark');
  root.classList.add(next);
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

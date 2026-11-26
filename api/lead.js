// Серверна функція Vercel: приймає заявку з форми і надсилає її в Telegram.
// Потрібні змінні середовища у Vercel (Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN — токен бота від @BotFather
//   TELEGRAM_CHAT_ID   — ваш chat id (куди бот надсилатиме заявки)

// Сайти, з яких дозволено надсилати форму (копія сайту на GitHub Pages ходить сюди з іншого домену)
const ALLOWED_ORIGINS = ['https://sanyok185.github.io'];

const LIMITS = { name: 100, contact: 200, type: 100, budget: 100, details: 3000, page: 300 };

const clean = (value, max) =>
  String(value ?? '')
    .replace(/\s+\n/g, '\n')
    .trim()
    .slice(0, max);

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const setCors = (req, res) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
};

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(500).json({ ok: false, error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  // Пастка для ботів: справжні люди це поле не бачать і не заповнюють
  if (body.website) return res.status(200).json({ ok: true });

  const data = Object.fromEntries(Object.entries(LIMITS).map(([k, max]) => [k, clean(body[k], max)]));
  if (!data.name || !data.contact) return res.status(400).json({ ok: false, error: 'required' });
  if (!body.consent) return res.status(400).json({ ok: false, error: 'consent' });

  const lines = [
    '<b>🔔 Нова заявка з сайту</b>',
    '',
    `<b>Ім’я:</b> ${escapeHtml(data.name)}`,
    `<b>Контакт:</b> ${escapeHtml(data.contact)}`,
    data.type && `<b>Тип сайту:</b> ${escapeHtml(data.type)}`,
    data.budget && `<b>Бюджет:</b> ${escapeHtml(data.budget)}`,
    data.details && `\n<b>Про бізнес:</b>\n${escapeHtml(data.details)}`,
    data.page && `\n<i>Сторінка: ${escapeHtml(data.page)}</i>`,
  ].filter(Boolean);

  try {
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!tg.ok) return res.status(502).json({ ok: false, error: 'telegram' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'telegram' });
  }
};

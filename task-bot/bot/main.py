"""Telegram-бот для завдань і нагадувань.

Запуск:  python -m bot.main
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from html import escape
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware, Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BotCommand,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    MessageOriginChannel,
    MessageOriginChat,
    MessageOriginHiddenUser,
    MessageOriginUser,
    TelegramObject,
)

from .config import Config, load_config
from .db import Database, Task
from .parser import Parser

log = logging.getLogger("task-bot")
router = Router()

# Заповнюються в main()
cfg: Config
db: Database
parser: Parser

WEEKDAYS_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "нд"]


# ---------- допоміжне ----------

def now_local() -> datetime:
    return datetime.now(cfg.timezone)


def fmt_when(dt: datetime | None) -> str:
    if dt is None:
        return "без нагадування"
    local = dt.astimezone(cfg.timezone)
    today = now_local().date()
    if local.date() == today:
        day = "сьогодні"
    elif local.date() == today + timedelta(days=1):
        day = "завтра"
    else:
        day = f"{WEEKDAYS_SHORT[local.weekday()]}, {local:%d.%m}"
    return f"{day} о {local:%H:%M}"


def task_line(task: Task) -> str:
    line = f"<b>{escape(task.text)}</b>"
    if task.source:
        line += f"\n<i>від {escape(task.source)}</i>"
    return line


def forward_source(message: Message) -> str | None:
    origin = message.forward_origin
    if origin is None:
        return None
    if isinstance(origin, MessageOriginUser):
        return origin.sender_user.full_name
    if isinstance(origin, MessageOriginHiddenUser):
        return origin.sender_user_name
    if isinstance(origin, MessageOriginChat):
        return origin.sender_chat.title
    if isinstance(origin, MessageOriginChannel):
        return origin.chat.title
    return "невідомо"


def preset_time(code: str) -> datetime | None:
    now = now_local()
    if code == "h1":
        return now + timedelta(hours=1)
    if code == "eve":
        eve = now.replace(hour=19, minute=0, second=0, microsecond=0)
        return eve if eve > now else eve + timedelta(days=1)
    if code == "tmr":
        return (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    if code == "none":
        return None
    raise ValueError(code)


def ask_time_kb(task_id: int) -> InlineKeyboardMarkup:
    row1 = [InlineKeyboardButton(text="Через 1 год", callback_data=f"t:{task_id}:h1")]
    if now_local().hour < 18 or (now_local().hour == 18 and now_local().minute < 30):
        row1.append(InlineKeyboardButton(text="Сьогодні о 19:00", callback_data=f"t:{task_id}:eve"))
    row2 = [
        InlineKeyboardButton(text="Завтра о 9:00", callback_data=f"t:{task_id}:tmr"),
        InlineKeyboardButton(text="Без нагадування", callback_data=f"t:{task_id}:none"),
    ]
    row3 = [InlineKeyboardButton(text="🗑 Видалити", callback_data=f"x:{task_id}")]
    return InlineKeyboardMarkup(inline_keyboard=[row1, row2, row3])


def saved_kb(task_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Виконано", callback_data=f"d:{task_id}"),
        InlineKeyboardButton(text="🕒 Змінити час", callback_data=f"c:{task_id}"),
        InlineKeyboardButton(text="🗑", callback_data=f"x:{task_id}"),
    ]])


def reminder_kb(task_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Виконано", callback_data=f"d:{task_id}")],
        [
            InlineKeyboardButton(text="+15 хв", callback_data=f"s:{task_id}:15"),
            InlineKeyboardButton(text="+1 год", callback_data=f"s:{task_id}:60"),
            InlineKeyboardButton(text="Завтра 9:00", callback_data=f"t:{task_id}:tmr"),
        ],
    ])


async def ask_time(message: Message, task: Task) -> None:
    await db.set_awaiting(message.chat.id, task.id)
    await message.answer(
        f"📝 Записав: {task_line(task)}\n\nКоли нагадати? Обери кнопку або напиши, наприклад: "
        "<i>«завтра о 18»</i>, <i>«у пʼятницю зранку»</i>, <i>«через 2 години»</i>.",
        reply_markup=ask_time_kb(task.id),
    )


async def confirm_saved(message: Message, task: Task) -> None:
    await message.answer(
        f"✅ Записав: {task_line(task)}\n⏰ Нагадаю {fmt_when(task.remind_at)}",
        reply_markup=saved_kb(task.id),
    )


# ---------- доступ ----------

class AccessMiddleware(BaseMiddleware):
    """Пускає лише користувачів з ALLOWED_USER_IDS (якщо список задано)."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user = data.get("event_from_user")
        if cfg.allowed_user_ids and (user is None or user.id not in cfg.allowed_user_ids):
            if isinstance(event, Message):
                await event.answer(f"Це особистий бот. Твій ID: <code>{user.id if user else '?'}</code>")
            return None
        return await handler(event, data)


# ---------- команди ----------

HELP = (
    "Я записую твої справи й нагадую про них.\n\n"
    "• Напиши, що треба зробити: <i>«завтра о 9 забрати посилку»</i>.\n"
    "• Перешли мені повідомлення, наприклад від дружини: я виділю з нього завдання "
    "і спитаю, коли нагадати, якщо час не вказано.\n"
    "• В одному повідомленні може бути кілька справ.\n\n"
    "/list — активні завдання\n"
    "/done — виконані\n"
    "/help — ця довідка"
)


@router.message(CommandStart())
@router.message(Command("help"))
async def cmd_start(message: Message) -> None:
    await message.answer(HELP)


@router.message(Command("list"))
async def cmd_list(message: Message) -> None:
    tasks = await db.list_pending(message.chat.id)
    if not tasks:
        await message.answer("Активних завдань немає 🎉")
        return
    lines, buttons = [], []
    for i, t in enumerate(tasks, 1):
        src = f" <i>(від {escape(t.source)})</i>" if t.source else ""
        lines.append(f"{i}. {escape(t.text)}{src}\n    ⏰ {fmt_when(t.remind_at)}")
        buttons.append(InlineKeyboardButton(text=f"✅ {i}", callback_data=f"d:{t.id}"))
    rows = [buttons[i:i + 5] for i in range(0, len(buttons), 5)]
    await message.answer(
        "<b>Активні завдання:</b>\n\n" + "\n".join(lines) + "\n\nНатисни номер, щоб відмітити виконаним.",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows),
    )


@router.message(Command("done"))
async def cmd_done(message: Message) -> None:
    tasks = await db.list_done(message.chat.id)
    if not tasks:
        await message.answer("Виконаних завдань ще немає.")
        return
    lines = [f"✔️ <s>{escape(t.text)}</s>" for t in tasks]
    await message.answer("<b>Нещодавно виконані:</b>\n\n" + "\n".join(lines))


# ---------- повідомлення ----------

async def create_tasks(message: Message, text: str, source: str | None) -> bool:
    """Створює завдання з тексту. Повертає False, якщо завдань не знайдено."""
    parsed = await parser.parse_tasks(text, source)
    if parsed is None:
        # Claude недоступний: зберігаємо як є, щоб нічого не загубилось.
        parsed = [(text.strip()[:500], None)]
        await message.answer("⚠️ Не вдалося зв'язатися з AI, зберіг повідомлення як є.")
    if not parsed:
        return False
    for task_text, remind_at in parsed:
        if remind_at is not None and remind_at <= now_local():
            remind_at = None
        task = await db.add_task(message.chat.id, task_text, remind_at, source)
        if remind_at is None:
            await ask_time(message, task)
        else:
            await confirm_saved(message, task)
    return True


@router.message(F.voice | F.audio | F.video_note)
async def on_voice(message: Message) -> None:
    await message.answer("Голосові поки не вмію розпізнавати. Напиши текстом 🙏")


@router.message(F.text | F.caption)
async def on_text(message: Message) -> None:
    text = message.text or message.caption or ""
    source = forward_source(message)
    await message.bot.send_chat_action(message.chat.id, "typing")

    # Переслане повідомлення — завжди нове завдання.
    if source is not None:
        if not await create_tasks(message, text, source):
            await message.answer("У пересланому повідомленні не бачу завдання 🤔")
        return

    # Якщо чекаємо час для завдання — спершу пробуємо прочитати відповідь як час.
    awaiting_id = await db.get_awaiting(message.chat.id)
    if awaiting_id is not None:
        task = await db.get_task(awaiting_id, message.chat.id)
        if task and task.status == "pending":
            when = await parser.parse_time(text, task.text)
            if when is not None and when > now_local():
                await db.set_remind_at(task.id, message.chat.id, when)
                await db.clear_awaiting(message.chat.id)
                task.remind_at = when
                await message.answer(
                    f"⏰ Нагадаю {fmt_when(when)}: {task_line(task)}", reply_markup=saved_kb(task.id)
                )
                return
        else:
            await db.clear_awaiting(message.chat.id)

    if not await create_tasks(message, text, None):
        if awaiting_id is not None:
            await message.answer("Не зрозумів час 🤔 Спробуй, наприклад: <i>«завтра о 18:00»</i>.")
        else:
            await message.answer("Не бачу тут завдання 🤔 Напиши, що треба зробити, або /help.")


# ---------- кнопки ----------

async def _task_from_cb(cb: CallbackQuery) -> Task | None:
    task_id = int(cb.data.split(":")[1])
    task = await db.get_task(task_id, cb.from_user.id)
    if task is None or task.status == "deleted":
        await cb.answer("Завдання не знайдено", show_alert=True)
        return None
    return task


@router.callback_query(F.data.startswith("d:"))
async def cb_done(cb: CallbackQuery) -> None:
    task = await _task_from_cb(cb)
    if not task:
        return
    await db.set_status(task.id, cb.from_user.id, "done")
    if await db.get_awaiting(cb.from_user.id) == task.id:
        await db.clear_awaiting(cb.from_user.id)
    await cb.answer("Виконано ✅")
    if cb.message and not (cb.message.text or "").startswith("Активні"):
        await cb.message.edit_text(f"✅ <s>{escape(task.text)}</s>")
    if cb.message and (cb.message.text or "").startswith("Активні"):
        # Перемальовуємо список
        await cb.message.delete()
        await cmd_list(cb.message)


@router.callback_query(F.data.startswith("x:"))
async def cb_delete(cb: CallbackQuery) -> None:
    task = await _task_from_cb(cb)
    if not task:
        return
    await db.set_status(task.id, cb.from_user.id, "deleted")
    if await db.get_awaiting(cb.from_user.id) == task.id:
        await db.clear_awaiting(cb.from_user.id)
    await cb.answer("Видалено")
    if cb.message:
        await cb.message.edit_text(f"🗑 <s>{escape(task.text)}</s>")


@router.callback_query(F.data.startswith("c:"))
async def cb_change(cb: CallbackQuery) -> None:
    task = await _task_from_cb(cb)
    if not task:
        return
    await db.set_awaiting(cb.from_user.id, task.id)
    await cb.answer()
    if cb.message:
        await cb.message.edit_text(
            f"{task_line(task)}\n\nКоли нагадати? Обери кнопку або напиши час.",
            reply_markup=ask_time_kb(task.id),
        )


@router.callback_query(F.data.startswith("t:"))
async def cb_set_time(cb: CallbackQuery) -> None:
    task = await _task_from_cb(cb)
    if not task:
        return
    when = preset_time(cb.data.split(":")[2])
    await db.set_remind_at(task.id, cb.from_user.id, when)
    if await db.get_awaiting(cb.from_user.id) == task.id:
        await db.clear_awaiting(cb.from_user.id)
    await cb.answer("Збережено")
    if cb.message:
        prefix = "⏰ Нагадаю " + fmt_when(when) if when else "📌 Збережено без нагадування"
        await cb.message.edit_text(f"{prefix}: {task_line(task)}", reply_markup=saved_kb(task.id))


@router.callback_query(F.data.startswith("s:"))
async def cb_snooze(cb: CallbackQuery) -> None:
    task = await _task_from_cb(cb)
    if not task:
        return
    minutes = int(cb.data.split(":")[2])
    when = now_local() + timedelta(minutes=minutes)
    await db.set_remind_at(task.id, cb.from_user.id, when)
    await cb.answer(f"Нагадаю о {when:%H:%M}")
    if cb.message:
        await cb.message.edit_text(f"⏰ Відкладено до {fmt_when(when)}: {task_line(task)}",
                                   reply_markup=saved_kb(task.id))


# ---------- нагадування ----------

async def reminder_loop(bot: Bot) -> None:
    while True:
        try:
            for task in await db.due_tasks():
                try:
                    await bot.send_message(task.user_id, f"⏰ Нагадування: {task_line(task)}",
                                           reply_markup=reminder_kb(task.id))
                except Exception:
                    log.exception("Не вдалося надіслати нагадування %s", task.id)
                await db.mark_reminded(task.id)
        except Exception:
            log.exception("Помилка в циклі нагадувань")
        await asyncio.sleep(20)


async def main() -> None:
    global cfg, db, parser
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    cfg = load_config()
    db = Database(cfg.db_path)
    await db.connect()
    parser = Parser(cfg.anthropic_api_key, cfg.claude_model, cfg.timezone)

    bot = Bot(cfg.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.message.outer_middleware(AccessMiddleware())
    dp.callback_query.outer_middleware(AccessMiddleware())
    dp.include_router(router)

    await bot.set_my_commands([
        BotCommand(command="list", description="Активні завдання"),
        BotCommand(command="done", description="Виконані завдання"),
        BotCommand(command="help", description="Як користуватися"),
    ])

    reminders = asyncio.create_task(reminder_loop(bot))
    log.info("Бот запущено. Модель: %s, часовий пояс: %s", cfg.claude_model, cfg.timezone)
    try:
        await dp.start_polling(bot)
    finally:
        reminders.cancel()
        await db.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())

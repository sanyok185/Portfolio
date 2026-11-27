"""Розбір вільного тексту на завдання й час за допомогою Claude."""

from __future__ import annotations

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import anthropic
from pydantic import BaseModel, Field

log = logging.getLogger(__name__)

WEEKDAYS_UA = ["понеділок", "вівторок", "середа", "четвер", "пʼятниця", "субота", "неділя"]

TIME_RULES = """Правила для часу:
- Час повертай як локальний час користувача у форматі YYYY-MM-DDTHH:MM, без часового поясу.
- Якщо вказано день, але не вказано годину ("завтра", "у пʼятницю"), став 09:00.
- "зранку" = 09:00, "вдень"/"в обід" = 13:00, "ввечері" = 19:00, "вночі" = 22:00.
- Якщо вказано годину без дня, бери найближчий такий момент у майбутньому.
- "через N хвилин/годин" рахуй від поточного часу.
- Час не може бути в минулому.
- Якщо про час нічого не сказано, повертай null. Не вигадуй час."""

TASKS_SYSTEM = f"""Ти розбираєш повідомлення для особистого Telegram-бота нагадувань.
З повідомлення виділи всі завдання, які користувач має зробити, і час нагадування для кожного.

Правила для тексту завдання:
- Пиши коротко, як пункт у списку справ, мовою оригіналу: "Забрати посилку", "Купити хліб і молоко".
- Не додавай у текст завдання сам час чи дату — вони йдуть в окреме поле.
- Якщо повідомлення переслане від іншої людини, це її прохання до користувача.
  Сформулюй його як завдання для користувача ("купи молока" -> "Купити молоко").
- Кілька різних справ в одному повідомленні — кілька завдань.
- Якщо в повідомленні немає жодної справи (привітання, питання до бота, просто розмова), поверни порожній список.

{TIME_RULES}"""

TIME_SYSTEM = f"""Користувач відповідає, коли йому нагадати про завдання.
Визнач з відповіді час нагадування.

{TIME_RULES}
- Якщо з відповіді неможливо зрозуміти час, поверни null."""


class ParsedTask(BaseModel):
    text: str = Field(description="Коротке формулювання завдання")
    remind_at: str | None = Field(description="Локальний час YYYY-MM-DDTHH:MM або null")


class TasksResult(BaseModel):
    tasks: list[ParsedTask]


class TimeResult(BaseModel):
    remind_at: str | None = Field(description="Локальний час YYYY-MM-DDTHH:MM або null")


# Моделі, для яких API вміє повторити запит на іншій моделі, якщо перша відмовила.
_FALLBACK_PREFIXES = ("claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5")


class Parser:
    def __init__(self, api_key: str, model: str, tz: ZoneInfo):
        self.client = anthropic.AsyncAnthropic(api_key=api_key, timeout=60.0)
        self.model = model
        self.tz = tz

    def _now_line(self) -> str:
        now = datetime.now(self.tz)
        return f"Зараз: {now:%Y-%m-%d %H:%M}, {WEEKDAYS_UA[now.weekday()]}."

    async def _ask(self, system: str, user_text: str, schema: type[BaseModel]) -> BaseModel | None:
        kwargs = {}
        if self.model.startswith(_FALLBACK_PREFIXES):
            kwargs = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}
        try:
            response = await self.client.beta.messages.parse(
                model=self.model,
                max_tokens=4000,
                system=system,
                output_config={"effort": "low"},
                output_format=schema,
                messages=[{"role": "user", "content": user_text}],
                **kwargs,
            )
        except anthropic.APIError:
            log.exception("Помилка запиту до Claude")
            return None
        if response.stop_reason in ("refusal", "max_tokens"):
            log.warning("Claude не повернув відповідь: %s", response.stop_reason)
            return None
        return response.parsed_output

    def _to_datetime(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            dt = datetime.fromisoformat(value)
        except ValueError:
            log.warning("Не вдалося розібрати час від моделі: %r", value)
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=self.tz)
        return dt

    async def parse_tasks(self, text: str, forwarded_from: str | None) -> list[tuple[str, datetime | None]] | None:
        """Повертає список (текст, час) або None, якщо Claude недоступний."""
        header = self._now_line()
        if forwarded_from:
            header += f"\nЦе повідомлення переслане від: {forwarded_from}."
        result = await self._ask(TASKS_SYSTEM, f"{header}\n\nПовідомлення:\n{text}", TasksResult)
        if result is None:
            return None
        return [(t.text.strip(), self._to_datetime(t.remind_at)) for t in result.tasks if t.text.strip()]

    async def parse_time(self, text: str, task_text: str) -> datetime | None:
        user = f"{self._now_line()}\nЗавдання: {task_text}\n\nВідповідь користувача:\n{text}"
        result = await self._ask(TIME_SYSTEM, user, TimeResult)
        return self._to_datetime(result.remind_at) if result else None

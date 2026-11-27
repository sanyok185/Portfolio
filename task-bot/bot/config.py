"""Налаштування бота. Усе читається зі змінних оточення або з файлу .env."""

import os
from dataclasses import dataclass
from pathlib import Path
from zoneinfo import ZoneInfo


def _load_dotenv(path: Path) -> None:
    """Мінімальний завантажувач .env, щоб не тягнути зайвих залежностей."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(Path(__file__).resolve().parent.parent / ".env")


@dataclass(frozen=True)
class Config:
    bot_token: str
    anthropic_api_key: str
    claude_model: str
    timezone: ZoneInfo
    allowed_user_ids: frozenset[int]
    db_path: Path


def load_config() -> Config:
    token = os.environ.get("BOT_TOKEN", "").strip()
    if not token:
        raise SystemExit("Не задано BOT_TOKEN. Скопіюйте .env.example у .env і впишіть токен від @BotFather.")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("Не задано ANTHROPIC_API_KEY. Впишіть ключ з console.anthropic.com у файл .env.")

    allowed = frozenset(
        int(x) for x in os.environ.get("ALLOWED_USER_IDS", "").replace(" ", "").split(",") if x
    )

    return Config(
        bot_token=token,
        anthropic_api_key=api_key,
        claude_model=os.environ.get("CLAUDE_MODEL", "claude-opus-5-5").strip(),
        timezone=ZoneInfo(os.environ.get("TIMEZONE", "Europe/Kyiv").strip()),
        allowed_user_ids=allowed,
        db_path=Path(os.environ.get("DB_PATH", Path(__file__).resolve().parent.parent / "data" / "tasks.db")),
    )

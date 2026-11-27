"""Зберігання завдань у SQLite. Час нагадування зберігається в UTC."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    text        TEXT    NOT NULL,
    source      TEXT,                       -- від кого переслано (ім'я), або NULL
    remind_at   TEXT,                       -- ISO-час в UTC, або NULL (без нагадування)
    status      TEXT    NOT NULL DEFAULT 'pending',  -- pending | done | deleted
    reminded    INTEGER NOT NULL DEFAULT 0, -- 1, якщо нагадування вже надіслано
    created_at  TEXT    NOT NULL,
    done_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(status, reminded, remind_at);

-- Завдання, для якого бот зараз чекає від користувача час нагадування.
CREATE TABLE IF NOT EXISTS awaiting_time (
    user_id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL
);
"""


@dataclass
class Task:
    id: int
    user_id: int
    text: str
    source: str | None
    remind_at: datetime | None
    status: str
    reminded: bool

    @classmethod
    def from_row(cls, row: aiosqlite.Row) -> "Task":
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            text=row["text"],
            source=row["source"],
            remind_at=datetime.fromisoformat(row["remind_at"]) if row["remind_at"] else None,
            status=row["status"],
            reminded=bool(row["reminded"]),
        )


def _utc_iso(dt: datetime | None) -> str | None:
    return dt.astimezone(timezone.utc).isoformat() if dt else None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Database:
    def __init__(self, path: Path):
        self.path = path
        self._conn: aiosqlite.Connection | None = None

    async def connect(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = await aiosqlite.connect(self.path)
        self._conn.row_factory = aiosqlite.Row
        await self._conn.executescript(SCHEMA)
        await self._conn.commit()

    async def close(self) -> None:
        if self._conn:
            await self._conn.close()

    @property
    def conn(self) -> aiosqlite.Connection:
        assert self._conn is not None, "Database.connect() не викликано"
        return self._conn

    # --- завдання ---

    async def add_task(self, user_id: int, text: str, remind_at: datetime | None, source: str | None) -> Task:
        cur = await self.conn.execute(
            "INSERT INTO tasks (user_id, text, source, remind_at, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, text, source, _utc_iso(remind_at), _now()),
        )
        await self.conn.commit()
        task = await self.get_task(cur.lastrowid, user_id)
        assert task is not None
        return task

    async def get_task(self, task_id: int, user_id: int) -> Task | None:
        cur = await self.conn.execute("SELECT * FROM tasks WHERE id = ? AND user_id = ?", (task_id, user_id))
        row = await cur.fetchone()
        return Task.from_row(row) if row else None

    async def set_remind_at(self, task_id: int, user_id: int, remind_at: datetime | None) -> None:
        await self.conn.execute(
            "UPDATE tasks SET remind_at = ?, reminded = 0 WHERE id = ? AND user_id = ?",
            (_utc_iso(remind_at), task_id, user_id),
        )
        await self.conn.commit()

    async def set_status(self, task_id: int, user_id: int, status: str) -> None:
        done_at = _now() if status == "done" else None
        await self.conn.execute(
            "UPDATE tasks SET status = ?, done_at = ? WHERE id = ? AND user_id = ?",
            (status, done_at, task_id, user_id),
        )
        await self.conn.commit()

    async def list_pending(self, user_id: int) -> list[Task]:
        cur = await self.conn.execute(
            """SELECT * FROM tasks WHERE user_id = ? AND status = 'pending'
               ORDER BY remind_at IS NULL, remind_at, id""",
            (user_id,),
        )
        return [Task.from_row(r) for r in await cur.fetchall()]

    async def list_done(self, user_id: int, limit: int = 15) -> list[Task]:
        cur = await self.conn.execute(
            "SELECT * FROM tasks WHERE user_id = ? AND status = 'done' ORDER BY done_at DESC LIMIT ?",
            (user_id, limit),
        )
        return [Task.from_row(r) for r in await cur.fetchall()]

    async def due_tasks(self) -> list[Task]:
        cur = await self.conn.execute(
            """SELECT * FROM tasks
               WHERE status = 'pending' AND reminded = 0 AND remind_at IS NOT NULL AND remind_at <= ?""",
            (_now(),),
        )
        return [Task.from_row(r) for r in await cur.fetchall()]

    async def mark_reminded(self, task_id: int) -> None:
        await self.conn.execute("UPDATE tasks SET reminded = 1 WHERE id = ?", (task_id,))
        await self.conn.commit()

    # --- очікування часу ---

    async def set_awaiting(self, user_id: int, task_id: int) -> None:
        await self.conn.execute(
            "INSERT INTO awaiting_time (user_id, task_id) VALUES (?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET task_id = excluded.task_id",
            (user_id, task_id),
        )
        await self.conn.commit()

    async def get_awaiting(self, user_id: int) -> int | None:
        cur = await self.conn.execute("SELECT task_id FROM awaiting_time WHERE user_id = ?", (user_id,))
        row = await cur.fetchone()
        return row["task_id"] if row else None

    async def clear_awaiting(self, user_id: int) -> None:
        await self.conn.execute("DELETE FROM awaiting_time WHERE user_id = ?", (user_id,))
        await self.conn.commit()

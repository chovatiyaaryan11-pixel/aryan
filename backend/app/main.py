from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import create_engine, String, Text, DateTime, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR.parent / "aryan_ai.db"
STATIC_DIR = BASE_DIR / "static"
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


class Memory(Base):
    __tablename__ = "memories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category: Mapped[str] = mapped_column(String(100), default="general")
    content: Mapped[str] = mapped_column(Text)
    importance: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    priority: Mapped[str] = mapped_column(String(50), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(engine)
app = FastAPI(title="Aryan Personal AI Assistant", version="0.2.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class MemoryInput(BaseModel):
    category: str = "general"
    content: str
    importance: int = 5


class TaskInput(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"


class ChatInput(BaseModel):
    message: str


@app.get("/")
def root():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/memories")
def create_memory(data: MemoryInput):
    with SessionLocal() as db:
        memory = Memory(**data.model_dump())
        db.add(memory)
        db.commit()
        db.refresh(memory)
        return {"id": memory.id, "message": "Memory saved"}


@app.get("/memories")
def list_memories():
    with SessionLocal() as db:
        memories = db.query(Memory).order_by(Memory.importance.desc()).all()
        return [{"id": m.id, "category": m.category, "content": m.content, "importance": m.importance} for m in memories]


@app.post("/tasks")
def create_task(data: TaskInput):
    with SessionLocal() as db:
        task = Task(**data.model_dump())
        db.add(task)
        db.commit()
        db.refresh(task)
        return {"id": task.id, "message": "Task created"}


@app.get("/tasks")
def list_tasks():
    with SessionLocal() as db:
        tasks = db.query(Task).order_by(Task.created_at.desc()).all()
        return [{"id": t.id, "title": t.title, "description": t.description, "status": t.status, "priority": t.priority} for t in tasks]


@app.post("/agent/chat")
def chat(data: ChatInput):
    with SessionLocal() as db:
        memories = db.query(Memory).order_by(Memory.importance.desc()).limit(5).all()
        tasks = db.query(Task).filter(Task.status == "pending").all()

    context = [f"{m.category}: {m.content}" for m in memories]
    pending = [t.title for t in tasks]
    return {
        "response": "The ChatGPT-style interface is running. The personal AI brain is not connected yet, so I cannot generate intelligent answers until an AI provider API key is configured.",
        "message": data.message,
        "relevant_memory": context,
        "pending_tasks": pending,
        "next_step": "Connect an AI provider in the next development phase."
    }


@app.post("/tasks/{task_id}/complete")
def complete_task(task_id: int):
    with SessionLocal() as db:
        task = db.get(Task, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        task.status = "completed"
        db.commit()
        return {"message": "Task completed"}

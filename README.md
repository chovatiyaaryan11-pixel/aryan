# Aryan Personal AI Assistant

A secure, extensible personal AI assistant for daily planning, tasks, memory, business support, and future integrations.

## Phase 1
- FastAPI backend
- SQLite for local development
- Personal profile and memory
- Task management
- AI-ready agent layer

## Run locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy ..\.env.example .env
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`.

## Security
Never commit `.env`, API keys, passwords, or access tokens.

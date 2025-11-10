# MVP Messaging App

A full-stack messaging MVP built as an interview assignment for Legora (Stockholm). The project demonstrates a production-style setup with a typed Express/Prisma backend, a Next.js 16 frontend, and real-time messaging over Socket.IO on top of PostgreSQL.

The goal of this README is to give new contributors—and anyone recreating the project from scratch—a complete guide to the architecture, setup steps, and API surface.

## Overview

- **Use case:** 1:1 conversations with registration, login, conversation creation, message history, and live updates.
- **Backend:** Node.js 18+, Express 5, Prisma ORM, Socket.IO, JWT auth.
- **Frontend:** Next.js 16 App Router, React 19, Bootstrap UI, Socket.IO client.
- **Database:** PostgreSQL 15 (via Docker). All entities are UUID-based.
- **Real-time:** Socket rooms per `conversationId`; new messages broadcast through `message:new` events.

## Repository Structure

```
MVP_messaging_app/
├── backend/                # Express API, Prisma client, Socket.IO server
├── frontend/               # Next.js application (login + messaging UI)
└── docker-compose.yml      # Local PostgreSQL service
```

## Feature Highlights

- Account registration & login (JWT access token + httpOnly refresh cookie stub).
- Authenticated REST APIs for users, conversations, and messages.
- Real-time message delivery and room subscription with Socket.IO.
- Bootstrap-based responsive UI for login, conversation listing, and in-thread messaging.
- Centralized API utility (`frontend/lib/api.ts`) that attaches bearer tokens from local storage or cookies.
- Prisma schema modeling users, conversation participants, and messages with helpful indices.

## Prerequisites

- Node.js 18 or newer (`node --version`)
- npm 9+ (ships with Node 18)
- Docker Desktop (WSL2 backend enabled on Windows)
- Git Bash (or another POSIX-compatible shell)

Optional but recommended:

- Postman / Insomnia for manual API testing
- Prisma CLI globally (`npm install -g prisma`) if you prefer, otherwise use `npx`

## Quick Start (TL;DR)

```bash
git clone git@github.com:Jeremiah1582/Legora-messaging-app.git 
docker compose up -d        # boots PostgreSQL

# Backend
cd backend
npm install
cp .env.example .env        # create if it doesn't exist; see ENV section below
npx prisma generate
npx prisma db push
npm run dev                 # http://localhost:5000

# Frontend (in a new terminal)
cd ../frontend
npm install
cp .env.local.example .env.local   # create if it doesn't exist; see ENV section
npm run dev                 # http://localhost:3000
```

Visit `http://localhost:3000/login`, register a test user, then start messaging.

## Detailed Setup Guide

### 1. Clone & Install Dependencies

```bash
git clone git@github.com:Jeremiah1582/Legora-messaging-app.git 

```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Create `backend/.env` with:

```
DATABASE_URL="postgresql://mvp_user:mvp_password@localhost:5432/mvp_db?schema=public"
JWT_SECRET="<generate-a-long-random-string>"
JWT_EXPIRES_IN="15m"                 # optional, defaults to 7d
PORT=5000                            # optional
FRONTEND_URL="http://localhost:3000" # optional
```

Create `frontend/.env.local` with:

```
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

> Tip: Keep secrets out of version control. Provide `.env.example` files if you plan to share templates.

### 3. Start PostgreSQL

The repo includes `docker-compose.yml` at the project root:

```bash
docker compose up -d
```

This provisions a Postgres 15 instance with database `mvp_db` and credentials that match the `DATABASE_URL` above. Data persists in the named volume `pg_data`.

### 4. Prepare Prisma

Run these once after configuring the database:

```bash
cd backend
npx prisma generate
npx prisma db push
```

`db push` syncs the Prisma schema to your local Postgres. Use `npx prisma studio` if you want to inspect live data in the browser.

### 5. Run the Backend

```bash
cd backend
npm run dev
```

The server listens on `http://localhost:5000` (configurable via `PORT`). It exposes REST APIs under `/api` and a Socket.IO server for real-time events.

### 6. Run the Frontend

```bash
cd frontend
npm run dev
```

Next.js boots on `http://localhost:3000`. The login page stores the JWT access token in `localStorage` and reuses it for authenticated requests via `frontend/lib/api.ts`.

### 7. Exercise the App

1. Register a user via the UI (`/login`, toggle to “Create your account”).
2. Log in; the UI redirects to `/conversations`.
3. Start a new conversation by selecting another registered user.
4. Send messages; open a second browser window to see live updates via Socket.IO.

## API Reference

Unless otherwise noted, all endpoints live under `http://localhost:5000/api` and return JSON. Error payloads follow `{ "error": string, ...optionalDetails }`.

### Conventions

- **Auth:** `/auth` routes are public. All others require `Authorization: Bearer <accessToken>`.
- **Refresh Tokens:** Login sets an `httpOnly` `refreshToken` cookie (7-day expiry). A refresh endpoint is not yet implemented; future work can add token rotation.
- **UUIDs everywhere:** Users, conversations, and messages are identified by UUID strings.
- **Timestamps:** ISO 8601 strings (`2024-03-20T12:34:56.789Z`).

### Health Check

`GET /health` → `{ "status": "backend is running ok" }`

### Authentication (`/api/auth`)

- `POST /api/auth/register`
  - Body: `{ "email": "...", "name": "...", "password": "..." }`
  - 201 → `{ "message": "YaYYY User created successfully", "email": "...", "name": "..." }`
  - Errors: `400` (validation), `401` (email already exists)

- `POST /api/auth/login`
  - Body: `{ "email": "...", "password": "..." }`
  - 200 → `{ "message": "Login successful", "user": { ... }, "accessToken": "..." }`
  - Sets `refreshToken` cookie (`httpOnly`, 7 days)
  - Errors: `400` (Zod validation), `401` (bad credentials)

### Users (`/api/user`)

- `GET /api/user/all_users`
  - Returns all registered users.
  - Requires `Authorization: Bearer <accessToken>`
  - 200 → array of `{ id, email, name, passwordHash, createdAt, updatedAt }`

### Conversations (`/api/conversations`)

- `GET /api/conversations`
  - Lists conversations where the current user participates.
  - Each conversation includes participants and latest messages (newest first).

- `POST /api/conversations`
  - Body: `{ "participantIds": ["current-user-uuid", "other-user-uuid"] }` (exactly 2 IDs)
  - Creates or returns an existing 1:1 conversation.
  - Errors: `400` (missing current user or invalid array), `403` (if user tries to create a convo they’re not part of)

### Messages (`/api/messages`)

- `GET /api/messages?conversationId=<uuid>`
  - Returns up to 50 most recent messages (oldest → newest) for the conversation.

- `POST /api/messages`
  - Body: `{ "conversationId": "...", "content": "..." }`
  - Sends a message as the authenticated user.
  - Broadcasts `message:new` via Socket.IO room `conversationId`.
  - Errors: `400` (validation), `403` (user not in conversation)

### Socket.IO Events

- `room:join` — Client subscribes to a conversation room to receive live messages.
- `message:new` — Broadcast emitted when a message is created.

## Developer Workflow & Tooling

- **TypeScript everywhere:** Both backend and frontend compile-time type checking is enabled. Run `npm run build` in each package to ensure type safety.
- **Linting:** The frontend ships with `npm run lint` (ESLint). Backend linting can be added later (e.g., ESLint + TypeScript rules).
- **Hot reload:** `npm run dev` commands run via `tsx` (backend) and Next.js dev server (frontend) with automatic reloads.
- **Database introspection:** Use `npx prisma studio` for a UI, or `psql` to inspect tables.

## Contributing

1. Fork and branch from `main` (e.g., `feature/add-typing-indicators`).
2. Keep backend and frontend changes isolated to their directories whenever possible.
3. Update or extend documentation (including this README) when you touch configuration, APIs, or workflows.
4. Run through the Quick Start commands to ensure setup still works for new developers.
5. Open a pull request describing:
   - What changed and why
   - Any migrations or extra setup steps
   - How reviewers can verify

### Suggested Enhancements

- Access token refresh endpoint + silent re-auth on the frontend
- Conversation search & pagination
- Delivery indicators and read receipts
- Better form validation and user feedback
- Comprehensive automated tests (unit + integration)

## Troubleshooting

- **`ECONNREFUSED` to Postgres:** Confirm `docker compose ps` shows `mvp-postgres` healthy. Check that `DATABASE_URL` points to `localhost:5432`.
- **CORS errors:** Ensure `FRONTEND_URL` in backend `.env` matches your frontend origin exactly.
- **Socket.IO not connecting:** Verify the frontend is using the same base URL as the backend (`NEXT_PUBLIC_API_URL`). Inspect browser dev tools for websocket connection attempts.
- **Access token missing in login response:** Backend currently returns `accessToken` in the JSON body; ensure the frontend is reading `data.accessToken` and storing it (already handled in `login/page.tsx`).

## Credits

Created as part of a Legora Stockholm interview challenge. Feel free to adapt the project for learning or further experimentation—just share improvements back so others benefit.


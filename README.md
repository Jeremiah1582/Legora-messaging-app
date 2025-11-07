# MVP Messaging App Backend API

This document outlines the available backend endpoints and how to structure requests so they align with the Express + Prisma implementation in `backend/`.

Unless otherwise noted, the backend runs on `http://localhost:5000` and exposes routes under the `/api` prefix. Responses are JSON. Errors follow the shape `{ "error": string, ...optional details }`.

## Conventions

- **Authentication:** Endpoints in `auth` are public. All others require an `Authorization: Bearer <accessToken>` header, where `accessToken` is returned by the login endpoint.
- **Cookies:** The login endpoint sets a `refreshToken` HTTP-only cookie. There is no refresh endpoint yet, but keep the cookie for future flows.
- **IDs:** User and conversation identifiers are UUID strings provided by the database.
- **Timestamps:** Prisma returns ISO 8601 strings (e.g. `"2024-03-20T12:34:56.789Z"`).

## Health Check

### `GET /health`

Verifies that the server is running.

**Response**

```json
{
  "status": "backend is running ok"
}
```

No authentication required.

## Authentication (`/api/auth`)

### `POST /api/auth/register`

Create a new user.

**Request body**

```json
{
  "email": "jane@example.com",
  "name": "Jane Doe",
  "password": "secret123"
}
```

**Responses**

- `201 Created`: `{ "message": "YaYYY User created successfully", "email": "...", "name": "..." }`
- `401 Unauthorized`: `{ "error": "User already exists please login " }`
- `400 Bad Request`: `{ "error": "Invalid input", "details": "..." }`
- `500 Internal Server Error`

### `POST /api/auth/login`

Authenticate a user and obtain tokens.

**Request body**

```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```

**Successful response (`200 OK`)**

```json
{
  "message": "Login successful",
  "user": {
    "id": "user-uuid",
    "email": "jane@example.com",
    "name": "Jane Doe"
  }
}
```

- Sets an `httpOnly` `refreshToken` cookie (7-day expiry).
- Returns an access token in the `Authorization` header? _Note_: the current implementation generates an access token but only sends it in application logic; clients should capture it from a future enhancement or modify the backend to include it in the response. For now, modify `generateToken` call to return token to the caller if needed.

**Error responses**

- `401 Unauthorized`: when the user is missing or the password check fails.
- `400 Bad Request`: when Zod validation fails.
- `500 Internal Server Error`

## Users (`/api/user`)

### `GET /api/user/all_users`

Return all users in the system. Requires authentication.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Response (`200 OK`)**

```json
[
  {
    "id": "user-uuid",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "passwordHash": "...",
    "createdAt": "2024-03-20T12:34:56.789Z",
    "updatedAt": "2024-03-20T12:34:56.789Z"
  },
  {
    "...": "..."
  }
]
```

## Conversations (`/api/conversations`)

All conversation endpoints require authentication.

### `GET /api/conversations`

List conversations for the authenticated user.

**Headers**

```
Authorization: Bearer <accessToken>
```

**Response (`200 OK`)**

```json
[
  {
    "id": "conversation-uuid",
    "createdAt": "2024-03-20T12:34:56.789Z",
    "updatedAt": "2024-03-20T12:34:56.789Z",
    "participants": [
      {
        "id": "participant-id",
        "userId": "user-uuid",
        "conversationId": "conversation-uuid",
        "user": {
          "id": "user-uuid",
          "name": "Jane Doe",
          "email": "jane@example.com"
        }
      }
    ],
    "messages": [
      {
        "id": "message-uuid",
        "senderId": "user-uuid",
        "conversationId": "conversation-uuid",
        "content": "Hello!",
        "createdAt": "2024-03-20T12:34:56.789Z",
        "updatedAt": "2024-03-20T12:34:56.789Z"
      }
      // ... newest message first
    ]
  }
]
```

### `POST /api/conversations`

Create (or fetch) a 1:1 conversation between two users. Participants must include the authenticated user.

**Headers**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request body**

```json
{
  "participantIds": [
    "current-user-uuid",
    "other-user-uuid"
  ]
}
```

- Exactly two UUIDs are allowed.
- The current user's ID must be present; otherwise the backend returns `400`.
- If a conversation already exists between the users, the response is `200 OK` with `{ "message": "Here is your existing conversation", "conversation": { ... } }`.
- Otherwise, returns `200 OK` with the newly created conversation object (same structure as the `GET` response).

## Messages (`/api/messages`)

All message routes require authentication.

### `GET /api/messages?conversationId=<conversation-uuid>`

Retrieve the 50 most recent messages for the conversation (returned oldest-to-newest).

**Headers**

```
Authorization: Bearer <accessToken>
```

**Query parameters**

- `conversationId`: required conversation UUID.

**Response (`200 OK`)**

```json
[
  {
    "id": "message-uuid",
    "conversationId": "conversation-uuid",
    "senderId": "user-uuid",
    "content": "Hello!",
    "createdAt": "2024-03-20T12:34:56.789Z",
    "updatedAt": "2024-03-20T12:34:56.789Z",
    "sender": {
      "id": "user-uuid",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
]
```

### `POST /api/messages`

Create a message in a conversation.

**Headers**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request body**

```json
{
  "conversationId": "conversation-uuid",
  "content": "Hello from the frontend!"
}
```

- `content` must be a non-empty string.
- The authenticated user must be a participant in the conversation (`403` otherwise).
- On success, returns the created message with sender info (`200 OK`) and emits a `message:new` Socket.IO event to the room with the ID `conversationId`.

## Socket.IO Events

- `room:join` — Clients should emit this with the `conversationId` to receive real-time message updates.
- `message:new` — Emitted by the server when a new message is created.

## Environment Variables

Ensure the following variables exist in `.env` for local development:

- `PORT` (defaults to `5000`)
- `FRONTEND_URL` (defaults to `http://localhost:3000`)
- `JWT_SECRET` (required)
- `JWT_EXPIRES_IN` (optional, defaults to `7d`)

## Quick Start

```bash
cd backend
npm install
npm run dev
```

Use a tool like Postman, Insomnia, or `curl` to interact with the endpoints described above, ensuring you include the Bearer token header for authenticated routes.


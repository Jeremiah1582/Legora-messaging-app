# MVP Messaging App (Windows/Git Bash)

Build the simplest messaging app that meets the coding challenge: register/login, create/read conversations and messages, and real-time delivery.

---

## Scope (MVP Requirements Only)

- Minimal auth: register + login
- Create conversation (1-1) and list user's conversations
- Send message and stream new messages in real-time
- List latest messages in a conversation (pagination optional)
- No edit/delete, no typing indicators, no read receipts

> 📋 BEST PRACTICE: Ship MVP first, iterate with feedback.

---

## Prerequisites (Windows/Git Bash)

- Node.js 18+ (`node --version`)
- Docker Desktop (WSL2 enabled)
- Git Bash terminal

Verify Docker:
```bash
docker --version
docker ps
```

---

## Project Structure

**WHAT:** Separate backend (Express.js) and frontend (Next.js) directories with clear service boundaries.

**WHY:** Coding challenge requires "APIs must be implemented" with clear separation. This structure is more realistic for production apps and easier to explain in interviews.

**HOW:**
```
messaging-app/
├── backend/              ← Express.js + TypeScript (REST APIs)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── conversations.ts
│   │   │   └── messages.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   └── auth.ts
│   │   └── server.ts      ← Express + Socket.IO server
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── .env
├── frontend/             ← Next.js + TypeScript (React UI)
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/page.tsx
│   │   │   └── conversations/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   └── components/
│   ├── package.json
│   └── .env.local
└── docker-compose.yml    ← PostgreSQL database
```

---

## Step 1: Project Setup

**WHAT:** Initialize both backend and frontend projects separately.

**WHY:** Separate directories allow independent deployment, clearer architecture, and easier scaling.

**HOW:**

**1a. Create project structure:**
```bash
mkdir messaging-app && cd messaging-app
mkdir backend frontend
```

**1b. Setup Backend (Express + TypeScript):**
```bash
cd backend
npm init -y

# Install Express and dependencies
npm install express cors dotenv
npm install bcryptjs jsonwebtoken zod socket.io
npm install -D typescript @types/express @types/cors @types/node @types/bcryptjs @types/jsonwebtoken tsx nodemon
npm install -D @types/socket.io

# Install Prisma (database ORM)
npm install prisma @prisma/client
npx prisma init
```

Create `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

Update `backend/package.json` scripts:
```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:generate": "prisma generate",
    "db:push": "prisma db push"
  }
}
```



**1c. Setup Frontend (Next.js + TypeScript):**
```bash
cd ../frontend
npm init -y

# Install Next.js and React
npm install next@latest react@latest react-dom@latest
npm install socket.io-client
npm install -D typescript @types/react @types/node @types/react-dom

# Generate TypeScript config
npx tsc --init --jsx preserve --moduleResolution bundler --target ES2020
```

Update `frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

Update `frontend/package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

---

## Step 2: Database Setup

**WHAT:** Run PostgreSQL in Docker and configure Prisma ORM in backend.

**WHY:** Database stores users, conversations, and messages. Docker ensures consistent environment. Prisma provides type-safe database access.

**HOW:**
<!-- **Q:** Should this `docker-compose.yml` be in the backend root?

**A:**  
If your `docker-compose.yml` is intended to orchestrate only the backend services (such as the Node/Express API, a database, etc.), then **yes, it should go in the backend root directory** (i.e., `MVP_messaging_app/backend/docker-compose.yml`).  
This keeps your backend service definitions organized and separate from frontend infrastructure.

If you want to orchestrate both backend and frontend together (for example, run both the Express/Prisma backend and Next.js frontend with Docker, plus maybe a shared database), **put the `docker-compose.yml` in the project root** (`MVP_messaging_app/docker-compose.yml`). This is best for full-project development or deployment.

**Summary:**  
- Only backend services? → Place in `backend/`
- Both backend & frontend? → Place in project root

Choose the location based on the scope of services you want Docker Compose to manage. -->


1. Create `docker-compose.yml` in project root:
<!-- 
> **Q: Do I need to replace the PostgreSQL user, password, and database name in `docker-compose.yml` before running `docker-compose up -d`?**

# **A:**  
# No, you can use the example credentials provided in `docker-compose.yml` as-is for local development and testing:

# ```yaml
# environment:
#   POSTGRES_USER: mvp_user
#   POSTGRES_PASSWORD: mvp_password
#   POSTGRES_DB: mvp_db
# ```

# - These values are also referenced in your backend `.env` (`DATABASE_URL`).  
# - If you want stronger security, or for production, update them consistently *in both places* (the `docker-compose.yml` and the `.env` for your backend).

# For local development, just copy-paste as shown—**no need to change anything immediately.**
 -->

```yaml

version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: mvp-postgres
    environment:
      POSTGRES_USER: mvp_user
      POSTGRES_PASSWORD: mvp_password
      POSTGRES_DB: mvp_db
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped
volumes:
  pg_data:
```

2. Start database:


```bash
# Start the services in the background


  # - `up`: Tells Docker Compose to create and start the services defined in `docker-compose.yml`.
  # - `-d`: Runs containers in detached (background) mode, so your terminal is free for other commands.

docker-compose up -d   # "up" creates and starts containers; "-d" stands for "detached" (run in background)
docker ps              # Verify container is running
```

**Windows port conflict?**
```bash
netstat -ano | findstr :5432
# taskkill /PID <PID> /F
```
3. Configure backend `.env`:
```bash
cd backend
```

Create `backend/.env`:
```
DATABASE_URL="postgresql://mvp_user:mvp_password@localhost:5432/mvp_db?schema=public"
JWT_SECRET="change-me-to-secure-random-string"
PORT=5000
```

> 📋 **WHY:** Backend runs on port 5000, frontend on 3000 (Next.js default).

---

## Step 3: Database Schema

**WHAT:** Define database tables (models) using Prisma schema in backend.

**WHY:** Prisma converts schema into TypeScript types and generates database migration code.

**HOW:**

Create `backend/prisma/schema.prisma`:
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql" url = env("DATABASE_URL") }

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  conversations ConversationParticipant[]
  messages     Message[] @relation("MessageSender")
  @@map("users")
}

model Conversation {
  id          String    @id @default(uuid())
  createdAt   DateTime  @default(now()) @map("created_at")
  participants ConversationParticipant[]
  messages    Message[]
  @@map("conversations")
}

model ConversationParticipant {
  id             String       @id @default(uuid())
  conversationId String       @map("conversation_id")
  userId         String       @map("user_id")
  joinedAt       DateTime     @default(now()) @map("joined_at")
  conversation   Conversation  @relation(fields: [conversationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])
  @@unique([conversationId, userId])
  @@index([userId])
  @@map("conversation_participants")
}

model Message {
  id             String        @id @default(uuid())
  conversationId String        @map("conversation_id")
  senderId       String        @map("sender_id")
  content        String
  createdAt      DateTime      @default(now()) @map("created_at")
  conversation   Conversation  @relation(fields: [conversationId], references: [id])
  sender         User          @relation("MessageSender", fields: [senderId], references: [id])
  @@index([conversationId, createdAt])
  @@map("messages")
}
```

Apply schema:
```bash
cd backend
npm run db:generate  # Generate Prisma Client
npm run db:push       # Push schema to database
```


> 📋 **BEST PRACTICE:** Junction table (`ConversationParticipant`) allows efficient queries like "find all conversations for user X".
<!-- A **junction table** (also called a "join table" or "link table") is a database table used to establish a many-to-many relationship between two other tables. It contains foreign keys referencing the primary keys of the tables it connects. In the schema above, `ConversationParticipant` is a junction table that links users and conversations, allowing each user to participate in multiple conversations and each conversation to have multiple users. This pattern enables efficient queries like "find all conversations a user is part of" or "find all users in a conversation." -->
---



## Step 4: Backend Setup (Express Server)
`shortcut: $npx express-generator --no-view   this would scaffold a express app without the template engines/views`

**WHAT:** Create Express server with CORS, basic middleware, and Socket.IO integration.

**WHY:** Express handles HTTP requests. CORS allows frontend (port 3000) to call backend (port 5000). Socket.IO enables real-time messaging.

**HOW:**

Create `backend/src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma
```

> 📋 **WHY:** Singleton pattern prevents multiple database connections in development.

Create `backend/src/lib/auth.ts`:
```typescript
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)  // 10 salt rounds
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export async function verifyToken(token: string): { Promise<string>} {
return jwt.verify(token, JWT_SECRET)
}
```

Create `backend/src/server.ts`:
```typescript
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const httpServer = createServer(app)

// CORS configuration - allow frontend origin
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})


// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))



app.use(express.json()) //makes the parsed data available as `req.body` in your route handlers.

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('room:join', (conversationId: string) => {
    socket.join(conversationId)
    console.log(`Socket ${socket.id} joined room ${conversationId}`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Export io for use in routes
export { io }

// Import routes (we'll create these next)
// import authRoutes from './routes/auth'
// import conversationRoutes from './routes/conversations'
// import messageRoutes from './routes/messages'

// app.use('/api/auth', authRoutes)
// app.use('/api/conversations', conversationRoutes)
// app.use('/api/messages', messageRoutes)

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})
```

Update `backend/.env`:
```
DATABASE_URL="postgresql://mvp_user:mvp_password@localhost:5432/mvp_db?schema=public"
JWT_SECRET="change-me-to-secure-random-string"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

Test server:
```bash
cd backend
npm run dev
# Should see: "Backend server running on http://localhost:5000"
```

---

## Step 5: Authentication Routes

**WHAT:** Build register/login endpoints with password hashing and JWT tokens.

**WHY:** Users need secure authentication. Passwords are hashed (not stored plaintext). JWT tokens enable stateless auth (no server-side sessions).

**HOW:**

Create `backend/src/routes/auth.ts`:
```typescript
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { hashPassword, verifyPassword, generateToken } from '../lib/auth'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6)
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = registerSchema.parse(req.body)

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: { email, name, passwordHash }
    })

    // Return JWT token
    const token = generateToken(user.id)
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    res.status(400).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    // Find user
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Return JWT token
    const token = generateToken(user.id)
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    res.status(400).json({ error: 'Login failed' })
  }
})

export default router
```

Update `backend/src/server.ts` to include auth routes:
```typescript
// ... existing code ...

// Import routes
import authRoutes from './routes/auth'

app.use('/api/auth', authRoutes)

// ... rest of code ...
```

> 🧠 **TROUBLESHOOTING:** If login fails, verify: validation → user lookup → password compare → token generation.

---

## Step 6: Conversations & Messages Routes

**WHAT:** Create backend endpoints for conversations and messages with JWT authentication.

**WHY:** API endpoints allow frontend to create/read data. JWT authentication ensures only authenticated users can access data.

**HOW:**

**6a. Create authentication middleware:**

Create `backend/src/middleware/auth.ts`:
```typescript
import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/auth'

export interface AuthRequest extends Request {
  userId?: string
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const { userId } = verifyToken(token)
    req.userId = userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

**6b. Create conversations routes:**

Create `backend/src/routes/conversations.ts`:
```typescript
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/conversations - List user's conversations
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId } }
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json(conversations)
})

// POST /api/conversations - Create 1-1 conversation
router.post('/', async (req: AuthRequest, res) => {
  const userId = req.userId!

  const { participantIds } = z.object({
    participantIds: z.array(z.string()).length(2)  // 1-1 conversation
  }).parse(req.body)

  // Verify current user is in participants
  if (!participantIds.includes(userId)) {
    return res.status(400).json({ error: 'Must include yourself' })
  }

  // Check if conversation already exists
  const existing = await prisma.conversation.findFirst({
    where: {
      participants: {
        every: { userId: { in: participantIds } }
      }
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }
    }
  })

  if (existing) {
    return res.json(existing)
  }

  // Create conversation with participants
  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: participantIds.map(id => ({ userId: id }))
      }
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }
    }
  })

  res.json(conversation)
})

export default router
```

**6c. Create messages routes:**

Create `backend/src/routes/messages.ts`:
```typescript
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { io } from '../server'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /api/messages?conversationId=... - List messages
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const conversationId = req.query.conversationId as string

  if (!conversationId) {
    return res.status(400).json({ error: 'Missing conversationId' })
  }

  // Verify user is participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId }
  })
  if (!participant) {
    return res.status(403).json({ error: 'Not a participant' })
  }

  // Get messages
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  res.json(messages.reverse())  // Reverse to show oldest first
})

// POST /api/messages - Create message
router.post('/', async (req: AuthRequest, res) => {
  const userId = req.userId!

  const { conversationId, content } = z.object({
    conversationId: z.string(),
    content: z.string().min(1)
  }).parse(req.body)

  // Verify user is participant
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId }
  })
  if (!participant) {
    return res.status(403).json({ error: 'Not a participant' })
  }

  // Create message
  const message = await prisma.message.create({
    data: { conversationId, senderId: userId, content },
    include: {
      sender: { select: { id: true, name: true, email: true } }
    }
  })

  // Emit real-time update via Socket.IO
  io.to(conversationId).emit('message:new', message)

  res.json(message)
})

export default router
```


Update `backend/src/server.ts`:
```typescript
// ... existing imports ...
import authRoutes from './routes/auth'
import conversationRoutes from './routes/conversations'
import messageRoutes from './routes/messages'

// ... existing code ...

app.use('/api/auth', authRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/messages', messageRoutes)

// ... rest of code ...
```

---
--------------------HERE--------
## Step 7: Frontend Setup

**WHAT:** Configure Next.js frontend to call backend API and setup Socket.IO client.

**WHY:** Frontend needs to communicate with backend API. Socket.IO client enables real-time updates.

**HOW:**

**7a. Configure API base URL:**

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**7b. Create API utility:**

Create `frontend/src/lib/api.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })
}
```

**7c. Create Socket.IO client utility:**

Create `frontend/src/lib/socket.ts`:
```typescript
import { io, Socket } from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket'],
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
```

---

## Step 8: Frontend Pages

**WHAT:** Build React pages that consume the backend APIs.

**WHY:** Users need a UI to interact with the app. Frontend calls backend APIs via HTTP.

**HOW:**

**8a. Login Page**

Create `frontend/src/app/login/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiCall } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
    const body = isRegister ? { email, password, name } : { email, password }

    try {
      const res = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed')
        return
      }

      const { token } = await res.json()
      localStorage.setItem('token', token)
      router.push('/conversations')
    } catch (err) {
      setError('Network error')
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{isRegister ? 'Register' : 'Login'}</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        {isRegister && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister)
            setError('')
          }}
        >
          Switch to {isRegister ? 'Login' : 'Register'}
        </button>
      </form>
    </div>
  )
}
```

**8b. Conversations List**

Create `frontend/src/app/conversations/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiCall } from '@/lib/api'

interface Conversation {
  id: string
  participants: Array<{
    user: { id: string; name: string; email: string }
  }>
  messages: Array<{
    content: string
    sender: { name: string }
  }>
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    apiCall('/api/conversations')
      .then((res) => res.json())
      .then((data) => setConversations(data))
      .catch(() => router.push('/login'))
  }, [router])

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Conversations</h1>
      {conversations.length === 0 ? (
        <p>No conversations yet</p>
      ) : (
        conversations.map((conv) => {
          const otherParticipants = conv.participants
            .map((p) => p.user.name)
            .join(', ')
          const lastMessage = conv.messages[0]?.content || 'No messages'

          return (
            <div
              key={conv.id}
              onClick={() => router.push(`/conversations/${conv.id}`)}
              style={{
                padding: '1rem',
                border: '1px solid #ccc',
                marginBottom: '0.5rem',
                cursor: 'pointer',
              }}
            >
              <strong>{otherParticipants}</strong>
              <p>{lastMessage}</p>
            </div>
          )
        })
      )}
    </div>
  )
}
```

**8c. Conversation View**

Create `frontend/src/app/conversations/[id]/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiCall } from '@/lib/api'
import { getSocket } from '@/lib/socket'

interface Message {
  id: string
  content: string
  sender: { id: string; name: string }
  createdAt: string
}

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    // Fetch messages
    apiCall(`/api/messages?conversationId=${conversationId}`)
      .then((res) => res.json())
      .then((data) => setMessages(data))

    // Setup Socket.IO
    const socket = getSocket()
    
    // Join conversation room
    socket.emit('room:join', conversationId)

    // Listen for new messages
    socket.on('message:new', (message: Message) => {
      setMessages((prev) => [...prev, message])
    })

    return () => {
      socket.off('message:new')
      socket.emit('room:leave', conversationId)
    }
  }, [conversationId, router])

  const handleSend = async () => {
    if (!content.trim()) return

    try {
      const res = await apiCall('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId, content }),
      })

      if (res.ok) {
        setContent('')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h1>Conversation</h1>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: '0.5rem' }}>
            <strong>{msg.sender.name}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={{ flex: 1 }}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}
```

---

## Step 9: Run & Test

**WHAT:** Start both servers and verify all features work.

**WHY:** Testing ensures your implementation meets requirements.

**HOW:**

**Terminal 1 - Start database:**
```bash
docker-compose up -d
```

**Terminal 2 - Start backend:**
```bash
cd backend
npm run db:generate && npm run db:push  # First time only
npm run dev
# Should see: "Backend server running on http://localhost:5000"
```

**Terminal 3 - Start frontend:**
```bash
cd frontend
npm run dev
# Should see: "Ready on http://localhost:3000"
```

**Test Flow:**
1. Open `http://localhost:3000/login`
2. Register 2 users
3. Use backend API or add UI button to create conversation between users
4. Open two browsers, login as each user
5. Navigate to conversation and send messages
6. Verify real-time delivery (message appears in both browsers)

---

## MVP Complete ✅

You've built:
- ✅ Separate backend (Express + TypeScript) and frontend (Next.js + TypeScript)
- ✅ User authentication (register/login with JWT)
- ✅ Backend REST APIs (conversations, messages)
- ✅ Frontend UI (login, conversations list, message view)
- ✅ Real-time messaging (Socket.IO)

**Next steps:** Error handling, loading states, create conversation UI, pagination, file uploads.

# Angel AI — Full Stack MVP Spec

## Overview
Build a full-stack MVP for Angel AI: a personal AI companion that lives beside you through earbuds/phone, listens with permission, understands context, and provides live intelligence, memory, and action-taking capability.

## Tech Stack
- **Backend**: Node.js / TypeScript with Express
- **Frontend**: React + Vite PWA (mobile-first, installable)
- **Database**: PostgreSQL (Railway managed)
- **ORM**: Prisma
- **Auth**: JWT-based (email/password for MVP, expandable)
- **AI Providers**: Multi-provider abstraction layer
  - Transcription: Deepgram (primary), OpenAI Whisper (fallback)
  - Reasoning/Extraction: OpenAI GPT-4o (primary), Anthropic Claude (fallback)
- **Real-time**: WebSocket (Socket.io) for live transcription + whisper cards
- **Deployment**: Railway (monorepo with two services)

## Architecture

### Monorepo Structure
```
angel-ai/
├── packages/
│   ├── server/           # Express API + WebSocket server
│   │   ├── src/
│   │   │   ├── index.ts           # Entry point
│   │   │   ├── config/            # Env config, AI provider configs
│   │   │   ├── routes/            # API routes
│   │   │   │   ├── auth.ts        # Register, login, refresh
│   │   │   │   ├── sessions.ts    # CRUD for conversation sessions
│   │   │   │   ├── memory.ts      # Memory graph queries
│   │   │   │   ├── actions.ts     # Voice-to-action endpoints
│   │   │   │   └── digest.ts      # Daily recap endpoint
│   │   │   ├── services/          # Business logic
│   │   │   │   ├── transcription.ts  # Multi-provider transcription
│   │   │   │   ├── extraction.ts     # Structured data extraction from transcripts
│   │   │   │   ├── memory.ts         # Memory graph operations
│   │   │   │   ├── whisper.ts        # Live suggestion engine
│   │   │   │   ├── actions.ts        # Action execution (email, tasks, docs)
│   │   │   │   └── ai-provider.ts    # Abstraction layer for AI providers
│   │   │   ├── ws/                # WebSocket handlers
│   │   │   │   ├── session-stream.ts # Live audio streaming + transcription
│   │   │   │   └── whisper-cards.ts  # Real-time suggestion push
│   │   │   ├── middleware/        # Auth, rate limiting, error handling
│   │   │   └── prisma/            # Prisma schema + migrations
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/              # React PWA frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── pages/
│       │   │   ├── Login.tsx
│       │   │   ├── Dashboard.tsx      # Home: recent sessions, quick actions
│       │   │   ├── Session.tsx        # Active recording session
│       │   │   ├── SessionDebrief.tsx # Post-session summary + actions
│       │   │   ├── Memory.tsx         # Memory graph browser
│       │   │   ├── Digest.tsx         # Daily recap view
│       │   │   └── Settings.tsx       # Preferences, AI config, privacy
│       │   ├── components/
│       │   │   ├── AudioRecorder.tsx   # Mic capture + streaming
│       │   │   ├── TranscriptView.tsx  # Live scrolling transcript
│       │   │   ├── WhisperCard.tsx     # Floating suggestion card
│       │   │   ├── ActionPanel.tsx     # Post-session action generator
│       │   │   ├── PersonCard.tsx      # Person profile in memory
│       │   │   ├── SessionCard.tsx     # Session summary card
│       │   │   └── RecordButton.tsx    # Main record toggle
│       │   ├── hooks/
│       │   │   ├── useAudio.ts        # Audio capture + WebSocket streaming
│       │   │   ├── useSession.ts      # Session state management
│       │   │   └── useAuth.ts         # Auth context
│       │   ├── services/
│       │   │   └── api.ts             # API client
│       │   └── styles/
│       │       └── global.css         # Tailwind + custom styles
│       ├── public/
│       │   ├── manifest.json          # PWA manifest
│       │   └── sw.js                  # Service worker
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       └── tailwind.config.ts
├── package.json              # Root workspace config
├── railway.json              # Railway deployment config (if needed)
└── README.md
```

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  preferences   Json?     @default("{}")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  memories      Memory[]
  actions       Action[]
  digests       Digest[]
}

model Session {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  title         String?
  mode          String    @default("conversation") // conversation, walk_and_think
  status        String    @default("active")       // active, processing, completed
  startedAt     DateTime  @default(now())
  endedAt       DateTime?
  transcript    Json?     // Full transcript array [{speaker, text, timestamp}]
  summary       Json?     // Structured summary after processing
  participants  Json?     // [{name, role, notes}]
  keyFacts      Json?     // Extracted facts
  promises      Json?     // Commitments made
  actionItems   Json?     // Extracted action items
  risks         Json?     // Identified risks/opportunities
  whisperCards  WhisperCard[]
  actions       Action[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId, startedAt])
}

model Memory {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  type          String    // person, company, project, idea, commitment, preference
  name          String    // Primary identifier
  content       Json      // Flexible structured content
  tags          String[]
  sourceSessionId String?
  lastMentioned DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId, type])
  @@index([userId, name])
}

model WhisperCard {
  id            String    @id @default(cuid())
  sessionId     String
  session       Session   @relation(fields: [sessionId], references: [id])
  type          String    // question, reminder, context, follow_up
  content       String
  confidence    Float
  shown         Boolean   @default(false)
  helpful       Boolean?  // User feedback
  createdAt     DateTime  @default(now())
}

model Action {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  sessionId     String?
  session       Session?  @relation(fields: [sessionId], references: [id])
  type          String    // email_draft, memo, task, reminder, prd, summary
  status        String    @default("draft") // draft, approved, executed, cancelled
  input         String    // Original voice/text input
  output        Json      // Generated content
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId, status])
}

model Digest {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  date          DateTime  @db.Date
  content       Json      // Structured daily recap
  opened        Boolean   @default(false)
  createdAt     DateTime  @default(now())

  @@unique([userId, date])
}
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account (email, password, name)
- `POST /api/auth/login` — Login, returns JWT
- `POST /api/auth/refresh` — Refresh token
- `GET /api/auth/me` — Current user profile

### Sessions
- `POST /api/sessions` — Start new session (mode: conversation | walk_and_think)
- `GET /api/sessions` — List sessions (paginated, filterable)
- `GET /api/sessions/:id` — Get session details + debrief
- `PATCH /api/sessions/:id` — Update session (title, end session)
- `POST /api/sessions/:id/end` — End session, triggers processing pipeline
- `DELETE /api/sessions/:id` — Delete session and all related data

### Memory
- `GET /api/memory` — Search/browse memory graph (query, type filters)
- `GET /api/memory/:id` — Get specific memory entry
- `POST /api/memory` — Manually add memory
- `PATCH /api/memory/:id` — Update memory
- `DELETE /api/memory/:id` — Delete memory
- `GET /api/memory/people` — List all known people
- `GET /api/memory/context/:name` — Get full context on a person/company/project

### Actions
- `POST /api/actions/generate` — Generate action from voice/text input (type: email, memo, task, prd, summary)
- `GET /api/actions` — List generated actions
- `PATCH /api/actions/:id` — Update action (approve, edit, cancel)
- `POST /api/actions/:id/execute` — Execute an approved action

### Digest
- `GET /api/digest/today` — Get or generate today's digest
- `GET /api/digest/:date` — Get digest for specific date

### WebSocket Events
- Client → Server:
  - `session:start` — Begin streaming audio
  - `audio:chunk` — Send audio chunk (base64 encoded)
  - `session:end` — Stop streaming
- Server → Client:
  - `transcript:update` — New transcript segment
  - `whisper:card` — Live suggestion/nudge
  - `session:status` — Processing status updates
  - `debrief:ready` — Post-session summary available

## Key Implementation Details

### Audio Pipeline
1. Frontend captures audio via MediaRecorder API (webm/opus format)
2. Streams chunks over WebSocket every 250ms
3. Server forwards to Deepgram streaming API for real-time transcription
4. Transcript segments are accumulated and stored
5. On session end, full transcript is processed for extraction

### AI Provider Abstraction
```typescript
interface AIProvider {
  transcribe(audio: Buffer, options?: TranscribeOptions): Promise<TranscriptSegment[]>;
  extract(transcript: string, schema: ExtractionSchema): Promise<any>;
  generate(prompt: string, context?: string): Promise<string>;
  suggest(transcript: string, memory: Memory[]): Promise<WhisperCard[]>;
}
```
Each provider (OpenAI, Anthropic, Deepgram) implements this interface. A router selects the provider based on config + fallback logic.

### Post-Session Processing Pipeline
When a session ends:
1. Finalize transcript
2. Extract: participants, key facts, promises, action items, risks
3. Generate structured summary
4. Update memory graph (new people, companies, projects, commitments)
5. Return debrief to client

### Whisper Card Engine
During active sessions, periodically (every 60s of new transcript):
1. Take latest transcript window + relevant memory
2. Ask AI for 0-2 high-confidence suggestions
3. Filter by confidence threshold (>0.8)
4. Push via WebSocket as whisper cards
5. Track shown/helpful for feedback

### Daily Digest Generation
On request (or scheduled):
1. Gather all sessions from the day
2. Compile: key interactions, outstanding commitments, opportunities, follow-ups
3. Cross-reference with memory for unresolved threads
4. Structure as digest

## Frontend Design

### Mobile-First PWA
- Dark theme, calm aesthetic (think: premium, not cluttered)
- Bottom navigation: Home | Record | Memory | Digest
- Primary color: Soft blue/indigo (#6366f1)
- Background: Near-black (#0a0a0f)
- Cards: Slightly elevated dark surfaces (#1a1a2e)
- Text: White primary, gray-400 secondary
- Minimal chrome, maximum content

### Key Screens

**Dashboard (Home)**
- Greeting + today's stats (sessions, actions, memories)
- Recent sessions list
- Quick action buttons (Start Session, Voice Note, View Digest)
- Outstanding action items

**Active Session**
- Large record button (pulsing when active)
- Live scrolling transcript
- Whisper cards slide in from bottom
- Timer + session mode indicator
- Consent reminder banner at top

**Session Debrief**
- Summary with expandable sections
- People mentioned (with memory links)
- Action items (with generate buttons)
- Key facts and commitments
- "Turn into..." action buttons (email, memo, tasks)

**Memory Browser**
- Search bar at top
- Filter tabs: All | People | Companies | Projects | Ideas
- Card grid with each memory entry
- Tap to expand full context + history

**Daily Digest**
- Date header
- Sections: Key Moments, Follow-ups, Opportunities, Ideas
- Each item links back to source session

## Environment Variables
```
# Server
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# AI Providers
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
DEEPGRAM_API_KEY=...

# Defaults
DEFAULT_TRANSCRIPTION_PROVIDER=deepgram
DEFAULT_REASONING_PROVIDER=openai
WHISPER_CONFIDENCE_THRESHOLD=0.8
```

## Railway Deployment
- Two services in one project:
  1. `angel-ai-server` — packages/server (PORT=3001)
  2. `angel-ai-web` — packages/web (static build served via Vite preview or nginx)
- One PostgreSQL database addon
- Environment variables set per service
- Custom domain support for web frontend

## MVP Scope (What to Build Now)
Focus on the v1 "Founder Angel" features:
1. ✅ Auth (register/login)
2. ✅ Session capture (start/stop recording)
3. ✅ Live transcription via WebSocket
4. ✅ Post-session debrief (summary, action items, participants, key facts)
5. ✅ Memory graph (auto-extract from sessions + manual add)
6. ✅ Voice-to-action (generate emails, memos, tasks from session content)
7. ✅ Daily digest
8. ✅ Whisper cards (limited live suggestions during sessions)
9. ✅ PWA installable on mobile

## Non-Goals for MVP
- No always-on background recording
- No face recognition
- No third-party integrations (Gmail, Slack, etc.) — those are v2
- No team features
- No hardware wearable integration
- No autonomous external actions without user review

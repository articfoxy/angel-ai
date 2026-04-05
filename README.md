# Angel AI

Personal AI companion — live intelligence, memory, and action for real life.

## Architecture
- **Backend**: Node.js/TypeScript + Express + Socket.io + Prisma + PostgreSQL
- **Frontend**: React + Vite PWA (mobile-first)
- **AI**: Multi-provider (Deepgram, OpenAI, Anthropic)
- **Deploy**: Railway

## Development
```bash
npm install
npm run dev
```

## Deployment
Deploy to Railway with two services: `packages/server` and `packages/web`.

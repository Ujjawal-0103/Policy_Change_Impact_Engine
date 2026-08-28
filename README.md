# Policy Change Impact Engine

> An AI-powered full-stack platform that converts policy documents into structured requirements, actions, responsibilities, deadlines, and evidence — and then detects changes between policy versions to map those changes to existing organizational workflows.

---

## Core Product Loop

```
UPLOAD POLICY
→ EXTRACT REQUIREMENTS
→ CREATE ACTIONS
→ TRACK OWNERS / DEADLINES / EVIDENCE
→ UPLOAD NEW VERSION
→ DETECT CHANGES
→ MAP IMPACT
→ UPDATE WORK
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript, REST API |
| Database | PostgreSQL, Prisma ORM |
| File Storage | Cloudinary |
| AI | Gemini API |
| Authentication | JWT + NestJS Guards |
| Deployment — Frontend | Vercel |
| Deployment — Backend | Render / Railway |

---

## Repository Structure

```
Policy_Change_Impact_Engine/
├── frontend/                  # Next.js application
│   ├── app/                   # App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Dashboard
│   │   ├── documents/
│   │   ├── policies/
│   │   ├── actions/
│   │   ├── changes/
│   │   └── impact/
│   ├── components/
│   │   └── layout/            # AppShell, Sidebar, Header
│   ├── lib/
│   │   └── api.ts             # Fetch-based API client
│   ├── types/
│   │   └── index.ts           # Shared TypeScript types
│   └── .env.local.example
│
├── backend/                   # NestJS application
│   ├── src/
│   │   ├── auth/
│   │   ├── documents/
│   │   ├── policies/
│   │   ├── requirements/
│   │   ├── actions/
│   │   ├── ai/
│   │   ├── impact/
│   │   ├── evidence/
│   │   ├── health/
│   │   ├── prisma/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

## How to Run — Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your API URL
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

---

## How to Run — Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials, JWT secret, etc.
npm install
npm run start:dev
```

Backend runs at: http://localhost:3001

Health check: http://localhost:3001/health

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Backend port (default: 3001) |
| `NODE_ENV` | Environment (`development` / `production`) |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | JWT token expiry (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `FRONTEND_URL` | CORS allowed origin (e.g. `http://localhost:3000`) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

---

## Database Setup

```bash
cd backend
# Make sure DATABASE_URL is set in .env
npx prisma migrate dev --name init
npx prisma generate
```

---

## API Endpoints (Foundation)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |

Planned endpoints (not yet implemented):

| Method | Path | Description |
|---|---|---|
| POST | `/documents/upload` | Upload a policy document |
| GET | `/documents` | List all documents |
| GET | `/documents/:id` | Get document by ID |
| POST | `/documents/:id/analyze` | Trigger AI extraction |
| GET | `/policies` | List all policies |
| GET | `/policies/:id/versions` | List policy versions |
| POST | `/policies/:id/versions` | Create a new version |
| POST | `/policies/compare` | Compare two versions |
| GET | `/policies/:id/changes` | Get detected changes |
| GET | `/actions` | List all actions |
| GET | `/actions/:id` | Get action by ID |
| PATCH | `/actions/:id/status` | Update action status |
| PATCH | `/actions/:id/assign` | Assign action to user |
| POST | `/actions/:id/evidence` | Upload evidence for action |
| GET | `/impacts/:changeId` | Get impact for a change |
| GET | `/dashboard/summary` | Dashboard summary |

---

## Current Implementation Status

| Area | Status |
|---|---|
| Repository structure | ✅ Done |
| Frontend scaffold (Next.js) | ✅ Done |
| Frontend layout (Sidebar, Header, AppShell) | ✅ Done |
| Frontend placeholder pages (6 routes) | ✅ Done |
| Frontend API client (`lib/api.ts`) | ✅ Done |
| Frontend shared types (`types/index.ts`) | ✅ Done |
| Backend scaffold (NestJS) | ✅ Done |
| Backend module stubs (8 modules) | ✅ Done |
| Backend `GET /health` endpoint | ✅ Done |
| Backend CORS configuration | ✅ Done |
| Backend `@nestjs/config` integration | ✅ Done |
| Prisma schema (13 core entities) | ✅ Done |
| Database connection | ⚠️ Requires PostgreSQL credentials |
| Prisma migration | ⚠️ Pending database connection |
| Authentication (JWT) | 🔲 Not yet implemented |
| Document upload (Cloudinary) | 🔲 Not yet implemented |
| AI extraction (Gemini) | 🔲 Not yet implemented |
| Policy comparison engine | 🔲 Not yet implemented |
| Impact mapping engine | 🔲 Not yet implemented |
| React Flow visualization | 🔲 Not yet implemented |

---

## Recommended Next Steps

1. **Configure PostgreSQL** — Set up a local or hosted PostgreSQL database and run the initial Prisma migration
2. **Implement Authentication** — JWT-based login/register in `backend/src/auth/`
3. **Implement Document Upload** — Cloudinary integration in `backend/src/documents/`
4. **Implement AI Extraction** — Gemini API integration in `backend/src/ai/` to extract requirements from documents
5. **Build Frontend Document Upload UI** — File picker and upload flow in `/documents`

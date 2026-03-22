# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npx prisma migrate dev   # Run DB migrations
npx prisma studio        # Open Prisma DB browser
npx prisma db seed       # Seed database
```

There are no automated tests configured.

## Architecture Overview

This is a **role-based landscaping business PWA** built with Next.js 14 App Router, PostgreSQL (Prisma ORM), Supabase (file storage), and JWT authentication.

### Tech Stack
- **Framework**: Next.js 14 App Router, React 18, TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **File Storage**: Supabase (buckets: `project-photos`, `receipts`)
- **Auth**: Custom JWT magic-link flow (HTTP-only cookies, 24h expiry)
- **Payments**: Stripe (webhooks at `/api/webhooks/stripe`)
- **Notifications**: Twilio (SMS), Resend (email)
- **UI**: Tailwind CSS + Radix UI primitives (`src/components/ui/`)
- **PWA**: `@ducanh2912/next-pwa` + Workbox; service worker disabled in dev

### Routing Structure
- `src/app/(app)/` — All authenticated routes wrapped in `AppLayout` (Sidebar + BottomNav)
- `src/app/api/` — API routes; use `withAuth()` wrapper from `src/lib/middleware.ts`
- `src/app/portal/[token]/` — Public customer portal (JWT-protected, no session cookie)
- `src/app/login/` — Magic link auth entry

### Key Library Files
| File | Purpose |
|------|---------|
| `src/lib/prisma.ts` | Singleton PrismaClient (hot-reload safe) |
| `src/lib/supabase.ts` | Supabase admin client + bucket constants |
| `src/lib/auth.ts` | JWT sign/verify for session, magic-link, and portal tokens |
| `src/lib/middleware.ts` | `requireSession()`, `requireRole()`, `withAuth()` API wrapper |
| `src/lib/api.ts` | Standard response helpers: `ok()`, `err()`, `serverError()` |
| `src/lib/nav.ts` | Navigation items filtered by role; mobile shows top 5 |
| `src/lib/offline-db.ts` | IndexedDB queue for offline actions (clock-in/out, uploads) |
| `src/lib/sms.ts` | Twilio SMS sending |
| `src/lib/email.ts` | Resend email (magic links, invoices, portal links) |

### Authentication & Roles
Six roles defined in Prisma schema: `PLATFORM_ADMIN`, `OWNER`, `ACCOUNTANT`, `PROJECT_MANAGER`, `FIELD_WORKER`, `SUBCONTRACTOR`. Role is stored in the JWT session token.

API routes enforce roles via `withAuth(handler, ['OWNER', 'MANAGER'])`. UI enforces roles in nav items and component rendering. Field workers only see their crew's projects.

### API Route Pattern
All API routes use `withAuth()` and return a consistent shape:
```typescript
{ data: T | null, error: string | null, meta: Record<string, unknown> | null }
```

### Offline-First PWA
`src/lib/offline-db.ts` maintains an IndexedDB queue of pending actions (clock-in/out, photo/receipt uploads). `OfflineBanner.tsx` shows sync status and triggers `drainQueue()` when the device comes back online. The PWA service worker is only active in production builds.

### File Uploads
FormData → `arrayBuffer()` → Supabase storage upload via admin client. Max 15 MB, allowed types: jpg, png, webp, heic, heif, pdf. Public URLs returned from Supabase CDN.

### SWC/JSX Compilation Constraints
Avoid HTML entities (e.g., `&amp;`, `&nbsp;`) in JSX — use Unicode or string equivalents instead. Very large component files can trigger webpack/SWC errors; split into smaller components when a file grows large.

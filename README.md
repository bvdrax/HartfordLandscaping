# Hartford Landscaping — Project Management PWA

A mobile-first, offline-capable progressive web app for managing a landscaping business. Handles projects, crew scheduling, time tracking, quoting, invoicing, expense receipts, and customer communication in one place.

## Features

- **Projects** — Create and track jobs by status, assign crews and project managers, attach photos
- **Quoting & Invoicing** — Build quotes with line items and SKU lookups, convert to invoices, collect payments via Stripe
- **Time Tracking** — Field workers clock in/out on their phones; supports offline queuing and syncs when reconnected
- **Receipts** — Photograph and catalog job expenses; smart tax/delivery amortization across line items
- **Crew & Workers** — Manage employees and subcontractors with role-based access and scheduling
- **Suppliers** — Maintain a supplier catalog with bulk pricing tiers per SKU
- **Reports** — Hours, invoices, and profitability analytics
- **Customer Portal** — Share a read-only project view with customers via a secure JWT link
- **Offline-First PWA** — Install to home screen; time logs and uploads queue locally and sync automatically

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| File Storage | Supabase (photos & receipts) |
| Authentication | Magic-link email + JWT (HTTP-only cookies) |
| Payments | Stripe |
| Notifications | Twilio (SMS), Resend (email) |
| UI | Tailwind CSS + Radix UI |
| PWA | next-pwa + Workbox |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Supabase project with `project-photos` and `receipts` storage buckets
- Stripe, Twilio, and Resend accounts

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

RESEND_API_KEY=
EMAIL_FROM=

NEXT_PUBLIC_APP_URL=
```

### Setup

```bash
npm install
npx prisma migrate dev
npx prisma db seed    # optional: seed demo data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in via magic link — check your email (or the terminal in dev if email is not configured).

## User Roles

| Role | Access |
|------|--------|
| `PLATFORM_ADMIN` | Full system access |
| `OWNER` | Full business access |
| `ACCOUNTANT` | Quotes, invoices, receipts, reports |
| `PROJECT_MANAGER` | Projects, crew, scheduling, time logs |
| `FIELD_WORKER` | Own crew's projects, clock in/out |
| `SUBCONTRACTOR` | Assigned projects only |

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
npx prisma studio  # Database browser
```

## Deployment

Build and deploy as a standard Next.js application. The PWA service worker is only registered in production. Ensure the Stripe webhook endpoint (`/api/webhooks/stripe`) is reachable from the internet and the `STRIPE_WEBHOOK_SECRET` is set.

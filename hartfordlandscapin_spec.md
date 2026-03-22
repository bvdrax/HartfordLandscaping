**HARTFORD LANDSCAPING**

Business Management PWA

*Full Product Specification & Claude Code Build Guide*

Owner: Benedict Varel \| Version 1.0

  -----------------------------------------------------------------------
  **Document Type**      Technical Product Specification
  ---------------------- ------------------------------------------------
  **Target Platform**    Progressive Web App (PWA) --- Mobile + Desktop

  **Tech Stack**         Next.js 14, PostgreSQL, Prisma ORM, Tailwind
                         CSS, Stripe, Twilio, Resend

  **Auth Strategy**      Magic links (customer-facing) + session tokens
                         (internal users)

  **Storage**            Supabase Storage (photos, receipts, price list
                         images)

  **Hosting**            Vercel (frontend + API routes) + Supabase
                         (database + storage)

  **Repo Strategy**      New standalone GitHub repo --- not nested in
                         existing projects

  **Version**            1.0 --- Initial build

  **Prepared For**       Claude Code --- blank directory build
  -----------------------------------------------------------------------

# 1. Project Overview

Hartford is a full-featured landscaping business management PWA built
for owner Benedict Varela. It covers the complete job lifecycle from
lead capture through final invoice and payment, including supplier price
management, quoting, crew scheduling, time tracking, photo
documentation, receipt capture, and profitability analysis.

The app is designed as a single-crew operation today with the data model
and role system built to scale to multi-crew as the business grows.
There are no employees at launch --- only co-owners --- but the
architecture must support W-2 workers and subcontractors as the business
scales.

## 1.1 Core Principles

-   Mobile-first field UX, desktop-optimized office UX --- same app,
    same URL

-   No passwords for customers --- magic links only

-   Workers get SMS notifications --- no app install required for basic
    comms

-   All financial math happens server-side --- never trust the client
    for margin or pricing

-   Every state change is timestamped and attributed to a user

-   Offline-capable for field workers: time clock, photo upload, receipt
    capture queue with background sync

-   Multi-crew ready from day one --- even if only one crew is active at
    launch

## 1.2 Business Context

-   Residential, commercial, HOA, and builder-relationship projects all
    in scope

-   Projects can have multiple contacts per job (homeowner, spouse, PM,
    builder, etc.)

-   Customers get a magic-link portal to check project progress and
    approve quotes

-   Supplier price lists are managed manually --- no supplier APIs exist

-   Margin is protected by locking SKU prices at quote creation time

# 2. Tech Stack & Repo Setup

## 2.1 Stack Decisions

  ------------------------------------------------------------------------
  **Layer**        **Technology**           **Rationale**
  ---------------- ------------------------ ------------------------------
  Frontend         Next.js 14 (App Router)  PWA support, server
                                            components, API routes in one
                                            repo

  Styling          Tailwind CSS + shadcn/ui Fast mobile-responsive UI with
                                            accessible components

  Database         PostgreSQL via Supabase  Relational data, RLS, free
                                            tier, hosted

  ORM              Prisma                   Type-safe queries, schema
                                            migrations, easy seeding

  Auth             Custom magic link + JWT  No passwords for customers;
                   session                  session tokens for workers

  File Storage     Supabase Storage         S3-compatible, tied to same
                                            project as DB

  Payments         Stripe                   Card processing, invoices,
                                            payment links

  SMS              Twilio                   Worker notifications, customer
                                            SMS launch

  Email            Resend + React Email     Magic links, customer quote
                                            approval, invoices

  AI/LLM           Anthropic Claude API     Price list image OCR to
                                            structured JSON

  Deployment       Vercel                   Native Next.js hosting,
                                            preview URLs per PR

  PWA              next-pwa                 Service worker, offline cache,
                                            installable
  ------------------------------------------------------------------------

## 2.2 GitHub Repo Setup (from scratch)

**Run these commands from your terminal**

1\. Create repo on GitHub --- do NOT initialize with README.

2\. From blank directory:

> npx create-next-app@latest Hartford-app \--typescript \--tailwind
> \--eslint \--app \--src-dir cd Hartford-app git init git remote add
> origin https://github.com/\<YOUR_HANDLE\>/Hartford-app.git git add .
> && git commit -m \'chore: scaffold Next.js app\' git push -u origin
> main

3\. Install core dependencies:

> npm install \@prisma/client prisma \@supabase/supabase-js npm install
> stripe \@stripe/stripe-js twilio resend npm install \@anthropic-ai/sdk
> npm install next-pwa npm install \@radix-ui/react-\*
> class-variance-authority clsx lucide-react npx shadcn-ui@latest init
> npx prisma init

## 2.3 Environment Variables

  -----------------------------------------------------------------------------
  **Variable**                         **Source**        **Purpose**
  ------------------------------------ ----------------- ----------------------
  DATABASE_URL                         Supabase project  Prisma database
                                       settings          connection

  DIRECT_URL                           Supabase project  Prisma migrations
                                       settings          (bypasses pooler)

  SUPABASE_URL                         Supabase project  Storage + auth client
                                       settings          

  SUPABASE_SERVICE_ROLE_KEY            Supabase project  Server-side storage
                                       settings          operations

  STRIPE_SECRET_KEY                    Stripe dashboard  Server-side Stripe
                                                         calls

  STRIPE_WEBHOOK_SECRET                Stripe dashboard  Webhook signature
                                                         verification

  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   Stripe dashboard  Client-side Stripe.js

  TWILIO_ACCOUNT_SID                   Twilio console    SMS sender

  TWILIO_AUTH_TOKEN                    Twilio console    SMS auth

  TWILIO_FROM_NUMBER                   Twilio console    SMS from number

  RESEND_API_KEY                       Resend dashboard  Email sending

  ANTHROPIC_API_KEY                    Anthropic console Price list OCR

  MAGIC_LINK_SECRET                    Generate locally  JWT signing for magic
                                                         links

  SESSION_SECRET                       Generate locally  JWT signing for worker
                                                         sessions

  NEXT_PUBLIC_APP_URL                  Vercel env        Base URL for links
  -----------------------------------------------------------------------------

# 3. Data Model (Prisma Schema)

The following describes every entity, its key fields, and its
relationships. This maps directly to your Prisma schema.prisma file.
Generate and run migrations before building any API routes.

## 3.1 Users & Roles

### User

-   id, email, phone, firstName, lastName, role (enum), isActive,
    createdAt, updatedAt

-   role enum: PLATFORM_ADMIN, OWNER, ACCOUNTANT, PROJECT_MANAGER,
    FIELD_WORKER, SUBCONTRACTOR

-   passwordHash --- nullable, used only in dev/test mode; null in
    production

-   Relations: workerProfile (one-to-one), timeLogs (one-to-many),
    receipts (one-to-many)

### WorkerProfile

-   id, userId (FK unique), hourlyRate (Decimal), payType (HOURLY \|
    SALARY \| SUBCONTRACT)

-   crewId (FK, nullable) --- supports future multi-crew assignment

-   isActive, emergencyContact, notes

### Crew

-   id, name, leadWorkerId (FK nullable), isActive

-   Relations: members (WorkerProfile\[\]), projectAssignments
    (CrewProjectAssignment\[\])

> *NOTE: Even with one crew at launch, every project gets assigned to a
> crew record so the model is clean when you add crew 2.*

## 3.2 Customers & Projects

### Customer

-   id, firstName, lastName, email, phone, persona (enum), isPrimary,
    notes

-   persona enum: HOMEOWNER, SPOUSE, PROPERTY_MANAGER, BUILDER, HOA_REP,
    CONTRACTOR, OTHER

-   projectId (FK) --- customers belong to a project, one-to-many

-   magicLinkToken (nullable), magicLinkExpiry --- for customer portal
    access

### Project

-   id, name, status (enum), projectType (enum)

-   status enum: LEAD, QUOTED, APPROVED, SCHEDULED, IN_PROGRESS,
    PUNCH_LIST, COMPLETE, INVOICED, PAID, ARCHIVED

-   projectType enum: RESIDENTIAL, COMMERCIAL, HOA, BUILDER

-   siteAddress (JSON: street, city, state, zip, lat, lng)

-   startDate, estimatedEndDate, actualEndDate

-   crewId (FK, nullable), projectManagerId (FK, nullable)

-   globalMarginOverride (Decimal, nullable) --- overrides global margin
    for this project

-   notes, internalNotes

-   Relations: customers\[\], photos\[\], quotes\[\], invoices\[\],
    timeLogs\[\], tasks\[\], receipts\[\], changeOrders\[\]

### ProjectPhoto

-   id, projectId (FK), uploadedByUserId (FK), storageUrl, thumbnailUrl

-   category enum: BEFORE, PROPOSED_MOCKUP, IN_PROGRESS, AFTER, RECEIPT

-   caption, areaTag (eg \'Front bed\', \'Side fence\'), takenAt,
    uploadedAt

### Task

-   id, projectId (FK), assignedToUserId (FK nullable), title,
    description

-   status enum: OPEN, IN_PROGRESS, BLOCKED, DONE

-   dueDate, completedAt, isPunchListItem

## 3.3 Quotes & Line Items

### Quote

-   id, projectId (FK), versionNumber (Int), status (enum)

-   status enum: DRAFT, SENT, APPROVED, REJECTED, SUPERSEDED, EXPIRED

-   sentAt, approvedAt, expiresAt, approvedByCustomerId (FK nullable)

-   laborTotal, materialsTotal, taxTotal, total --- all Decimal,
    computed server-side

-   globalMarginPct (Decimal) --- snapshot of margin at time of creation

-   notes, termsAndConditions

### QuoteLineItem

-   id, quoteId (FK), skuId (FK, nullable) --- nullable for free-form
    labor lines

-   description, quantity (Decimal), unitPrice (Decimal) --- price
    LOCKED at quote time

-   laborPricePerUnit (Decimal), laborHoursPerUnit (Decimal)

-   marginPctOverride (Decimal, nullable) --- SKU-level override for
    this line

-   lineTotal (Decimal) --- computed: ((unitPrice \* margin) + labor) \*
    qty

-   sortOrder (Int)

### ChangeOrder

-   id, projectId (FK), quoteId (FK, nullable), versionNumber

-   status enum: DRAFT, SENT, APPROVED, REJECTED

-   description, lineItems (QuoteLineItem\[\]), total, approvedAt,
    approvedByCustomerId

## 3.4 Suppliers & SKUs

### Supplier

-   id, name, accountNumber, repName, repPhone, repEmail, notes,
    isActive

### PriceList

-   id, supplierId (FK), name, effectiveDate, isActive

-   uploadedByUserId (FK), sourceImageUrl (nullable --- original photo
    if OCR was used)

### Sku

-   id, priceListId (FK), supplierId (FK), supplierItemNumber, name,
    description

-   unitOfMeasure (eg \'each\', \'sq ft\', \'lb\', \'bag\', \'pallet\')

-   basePrice (Decimal) --- latest known price from supplier

-   globalMarginPct (Decimal) --- default margin for this SKU, overrides
    global if set

-   isActive, notes

-   Relations: bulkPricingTiers\[\], quoteLineItems\[\]

### SkuBulkPricingTier

-   id, skuId (FK), minQuantity (Decimal), pricePerUnit (Decimal)

-   Applied when quantity on a quote line meets or exceeds minQuantity

> *NOTE: Price list updates create a new PriceList record. Old quotes
> reference the priceListId at snapshot time via the locked unitPrice on
> QuoteLineItem --- they are never affected by updates.*

## 3.5 Invoicing & Payments

### Invoice

-   id, projectId (FK), quoteId (FK nullable), invoiceNumber
    (auto-generated)

-   status enum: DRAFT, SENT, PARTIAL, PAID, VOID

-   type enum: DEPOSIT, MILESTONE, FINAL, RECURRING

-   amountDue, amountPaid, taxRate, taxAmount, total

-   dueDate, sentAt, paidAt

-   stripePaymentIntentId, stripeInvoiceId --- for Stripe-processed
    payments

### Payment

-   id, invoiceId (FK), amount, paymentMethod (enum), paidAt,
    referenceNumber, notes

-   paymentMethod enum: CASH, CHECK, CARD_STRIPE, ACH, ZELLE, VENMO,
    OTHER

## 3.6 Time & Labor

### TimeLog

-   id, projectId (FK), userId (FK), crewId (FK nullable)

-   clockInAt, clockOutAt, breakMinutes, totalMinutes (computed)

-   clockInLocation (JSON: lat/lng), clockOutLocation (JSON: lat/lng)

-   notes, approvedByUserId (FK nullable), approvedAt

## 3.7 Receipts & Costs

### Receipt

-   id, projectId (FK), uploadedByUserId (FK)

-   vendor, receiptDate, totalAmount, taxAmount, deliveryFee

-   storageUrl (image), status enum: PENDING, REVIEWED, APPROVED,
    REJECTED

-   notes, reviewedByUserId (FK nullable)

-   Relations: lineItems (ReceiptLineItem\[\])

### ReceiptLineItem

-   id, receiptId (FK), skuId (FK nullable), description

-   quantity (Decimal), unitCost (Decimal), extendedCost (Decimal)

-   amortizedTax (Decimal), amortizedDelivery (Decimal), totalCost
    (Decimal)

> *NOTE: Tax and delivery fees on the receipt header are amortized
> across line items proportional to extended cost. This can be
> auto-calculated or manually adjusted per line.*

## 3.8 Notifications & Audit

### Notification

-   id, userId (FK nullable), projectId (FK nullable), type (enum),
    channel (SMS \| EMAIL \| IN_APP)

-   message, sentAt, status (PENDING \| SENT \| FAILED), metadata (JSON)

### AuditLog

-   id, entityType, entityId, action, changedByUserId, changedAt, before
    (JSON), after (JSON)

-   Every status change, price edit, margin override, and approval
    triggers an audit row

# 4. Roles & Permissions

All permission checks happen server-side in API route middleware. The
client never makes decisions about what a user can see --- it only
renders what the server returns.

  ------------------------------------------------------------------------------------------------------
  **Permission**    **Platform   **Owner**   **Accountant**   **Project   **Field    **Subcontractor**
                    Admin**                                   Manager**   Worker**   
  ----------------- ------------ ----------- ---------------- ----------- ---------- -------------------
  Manage users &    Yes          Yes         No               No          No         No
  roles                                                                              

  View all projects Yes          Yes         Yes              Assigned    Assigned   Assigned only
                                                              only        only       

  Create / edit     Yes          Yes         No               Yes         No         No
  projects                                                                           

  Create / send     Yes          Yes         No               Yes         No         No
  quotes                                                                             

  Approve change    Yes          Yes         No               No          No         No
  orders                                                                             

  Create / send     Yes          Yes         Yes              No          No         No
  invoices                                                                           

  Record payments   Yes          Yes         Yes              No          No         No

  Manage price      Yes          Yes         No               No          No         No
  lists / SKUs                                                                       

  Upload receipts   Yes          Yes         Yes              Yes         Yes        No

  Approve receipts  Yes          Yes         Yes              No          No         No

  Clock in / out    Yes          Yes         No               Yes         Yes        Yes

  View own time     Yes          Yes         No               Yes         Yes        Yes
  logs                                                                               

  View all time     Yes          Yes         Yes              Yes         No         No
  logs                                                                               

  Upload project    Yes          Yes         No               Yes         Yes        No
  photos                                                                             

  View financial    Yes          Yes         Yes              Summary     No         No
  summary                                                     only                   

  Manage global     Yes          Yes         No               No          No         No
  margin                                                                             

  Send customer     Yes          Yes         No               Yes         No         No
  notifications                                                                      

  Export to CSV /   Yes          Yes         Yes              No          No         No
  accounting                                                                         
  ------------------------------------------------------------------------------------------------------

> *NOTE: In dev/test mode only, a dev bypass flag enables password
> login. This flag must not exist in the production build. Use an
> environment variable: DEV_PASSWORD_AUTH=true.*

# 5. Authentication

## 5.1 Internal Users (Workers, Owners, etc.)

-   On first login, user enters email. Server sends a magic link to
    their email via Resend.

-   Link contains a signed JWT (HS256, MAGIC_LINK_SECRET, 15-minute
    expiry).

-   On click, server verifies JWT, creates a session token (24-hour
    expiry, HttpOnly cookie).

-   Session middleware on all protected routes validates the cookie.

-   Dev mode only: if DEV_PASSWORD_AUTH=true, expose a password field.
    Never ship this.

## 5.2 Customer Portal

-   Customer clicks \'Send portal link\' from the project page ---
    triggers Resend email.

-   Link contains a signed JWT with customerId and projectId (72-hour
    expiry).

-   Customer portal is read-only: view quote, approve quote, view
    photos, view invoice, pay via Stripe link.

-   Each link is single-project scoped --- a customer cannot see other
    projects.

-   Re-sending a link invalidates the previous token (store token hash
    in DB).

## 5.3 Customer SMS Notification (Not automated sending)

The app does NOT send SMS directly to customers. Instead, a notification
bell icon appears on project pages. Clicking it opens the native SMS app
on the user\'s phone pre-populated with the customer\'s number and a
templated message. This keeps the owner in control of every customer
communication.

-   Implementation: \<a href=\'sms:+1XXXXXXXXXX?body=MESSAGE\'\>SMS
    link\</a\> rendered as a button

-   Message templates are pre-populated but editable before sending

-   Templates include: Quote ready for review, Invoice sent, Work
    starting tomorrow, Work complete

# 6. Feature Modules

## 6.1 Dashboard

-   Summary cards: Active projects, Open quotes, Unpaid invoices, Crew
    hours this week

-   Project pipeline Kanban --- columns match project status enum, drag
    to advance status

-   Quick filters: By crew, by project type, by date range, by status

-   Table view toggle with sortable columns: Project name, customer,
    status, start date, quote total, margin, balance due

-   Profitability mini-chart per project: Quoted margin vs actual margin
    (after receipts + hours)

-   Upcoming scheduled work calendar widget (week view)

## 6.2 Projects

### Project List

-   Searchable, filterable table with status badges

-   Quick-create button opens slide-over form

### Project Detail Page

-   Tab layout: Overview, Contacts, Photos, Quotes, Invoices, Time,
    Receipts, Tasks, Notes

-   Status stepper at top --- click to advance with confirmation

-   Customer portal link button --- sends magic link email, shows last
    sent timestamp

-   SMS notification bell --- opens pre-populated SMS, shows template
    picker

-   Crew assignment picker --- assign crew and project manager

### Contacts Tab

-   List of all contacts on the project with persona badge

-   Add contact form: first name, last name, email, phone, persona,
    isPrimary

-   Mark primary contact --- used as default for quote approval and
    invoice email

-   Edit / remove contacts inline

### Photos Tab

-   Categorized gallery: Before, Proposed/Mockup, In Progress, After

-   Mobile: camera capture or file picker per category

-   Desktop: drag-and-drop multi-upload per category

-   Each photo: caption, area tag, timestamp, uploader name

-   Full-screen lightbox viewer

-   Download all as ZIP (owner/PM only)

## 6.3 Quotes

### Quote Builder

-   Select project, pulls in site address and primary contact
    automatically

-   Line item entry: search SKU catalog, or add free-form line

-   Per line: SKU, description, quantity, unit price (pulled from SKU,
    editable), labor price per unit, labor hours per unit, margin
    override

-   Bulk pricing auto-applies: if qty \>= tier threshold, price updates
    automatically with indicator

-   Global margin applied to all lines unless overridden

-   Project-level margin override field at top of quote

-   Line item margin override --- per-line field, shows effective margin
    vs global

-   Running totals sidebar: Materials subtotal, Labor subtotal, Margin
    amount, Tax, Grand total

-   All calculations run server-side on save --- client shows optimistic
    update

-   Save as draft, preview PDF, send to customer

### Quote PDF

-   Generated server-side via a PDF library (e.g., \@react-pdf/renderer)

-   Includes: company logo, project address, customer name, line items,
    totals, terms, expiration date

-   Does NOT show margin percentages or cost --- only customer-facing
    prices

-   Quote approval via customer portal: \'Approve this quote\' button in
    portal creates approval record

### Quote Versioning

-   Every edit to a sent quote creates a new version; old version is
    marked SUPERSEDED

-   Version history visible on quote detail page

-   Change orders attach to an existing approved quote as addendum

## 6.4 Price Lists & SKU Management

### Supplier Management

-   Create supplier: name, account number, rep contact info

-   Per supplier: list of price lists (by effective date)

### Price List Entry

-   Manual entry: table UI to enter supplier item number, name,
    description, unit of measure, base price

-   Bulk pricing tiers per SKU: click \'Add tier\', enter min quantity
    and price per unit

-   OCR import: upload photo of price list, Claude API parses image and
    returns structured JSON

-   OCR result is shown in a review table before committing --- user
    corrects any errors then saves

> *NOTE: OCR prompt should request JSON with fields: supplierItemNumber,
> name, description, unitOfMeasure, basePrice, bulkTiers \[{minQty,
> pricePerUnit}\]*

### Global Margin Management

-   Settings page: global default margin percentage (applies to all SKUs
    without an override)

-   Per-SKU margin override in the SKU detail --- overrides global for
    that SKU everywhere

-   Project-level margin override on project detail --- overrides global
    for all lines in that project

-   Quote line-item margin override --- overrides everything above for
    that specific line

-   Margin resolution order: Line item override \> Project override \>
    SKU override \> Global default

-   All overrides are visible and editable by Owner only

## 6.5 Invoicing

-   Create invoice from a quote or manually

-   Invoice types: Deposit (% or flat), Milestone, Final, Recurring (for
    maintenance contracts)

-   Multiple invoices per project --- each tracked independently

-   Send via email (Resend): PDF attachment + Stripe payment link

-   Mark paid manually: record payment method (cash, check, Zelle,
    Venmo, other) + reference number

-   Stripe card payments: generate Stripe Payment Link or Payment Intent

-   Tax rate field per invoice --- defaults to a configurable global tax
    rate setting

-   Invoice PDF: same styling as quote PDF, shows amount due, due date,
    payment options

-   Partial payments supported: Invoice shows balance remaining

## 6.6 Time Tracking

### Worker Clock-In (Mobile-First)

-   Worker opens app, sees \'Clock In\' button if not currently clocked
    in

-   Select project from a list of assigned/active projects

-   Optional: select crew if multi-crew is active

-   Clock-in captures timestamp + GPS coordinates

-   Active clock-in banner persists across app until clocked out

-   Clock-out: confirms project, captures timestamp + GPS, optional note

### Time Log Management

-   PM/Owner can edit any time log: adjust in/out time, add break
    minutes, add note

-   Owner can approve time logs for payroll purposes

-   Subcontractors can clock in but their time is informational --- they
    invoice separately

-   Time log export: CSV by project or by worker for a date range

### Estimated vs Actual Hours

-   Each project has an estimated hours field (manual entry by PM/Owner)

-   Estimated hours can also be derived: sum of (qty \*
    laborHoursPerUnit) across all quote line items

-   Dashboard shows estimated vs actual bar for each active project

## 6.7 Receipt Capture

-   Any authorized user opens \'Add Receipt\' from a project

-   Capture via camera (mobile) or file upload (desktop)

-   Manual entry OR OCR via Claude API (same pattern as price list OCR)

-   OCR extracts: vendor, date, line items with description, qty, unit
    cost

-   Review table: user confirms/edits OCR output before saving

-   Header fields: vendor, date, total, tax amount, delivery fee

-   Tax and delivery fee amortization: auto-split proportional to
    extended cost, or manually adjusted

-   Link receipt line items to SKUs from the project quote (optional but
    enables actual cost vs quoted cost analysis)

-   Accountant/Owner approval workflow: receipts start as PENDING,
    reviewed and APPROVED or REJECTED

## 6.8 Crew & Scheduling

-   Crew record: name, crew lead, list of members (WorkerProfiles)

-   Project assignment: assign a crew + start/end dates

-   Calendar view: week/month, shows crew assignments per project

-   Worker schedule view: what projects is this worker assigned to this
    week

-   SMS notification on schedule assignment: Twilio sends worker their
    schedule

-   Conflict detection: warn if a worker is double-booked on the same
    day

## 6.9 Worker Profiles

-   Create worker: name, email, phone, role, pay type, hourly rate

-   Assign to crew

-   View time log history, total hours per project, total earnings (rate
    \* hours)

-   Subcontractor flag: no hourly rate, has invoice amount field instead

-   SMS opt-in confirmation sent on profile creation

## 6.10 Profitability & Reporting

-   Per-project P&L: Quoted revenue, actual materials cost (receipts),
    actual labor cost (hours \* rate), gross profit, gross margin

-   Variance report: quoted margin vs actual margin

-   Supplier spend report: total spend per supplier for a date range

-   Worker hours report: hours and earnings per worker for a date range

-   CSV export for all reports (Accountant role and above)

-   QuickBooks-compatible CSV format for accounts receivable (invoices)
    and expenses (receipts)

## 6.11 Customer Portal

-   Accessed via magic link in email --- no login required

-   Shows: project name, site address, current status, progress photos,
    active quote, invoices

-   Quote approval: \'Approve this quote\' button --- records approval
    with timestamp and customer ID

-   Invoice payment: Stripe payment link or instructions for other
    payment methods

-   Read-only --- customer cannot edit anything

-   Portal link expires after 72 hours; re-send link invalidates
    previous token

# 7. Offline & PWA Capabilities

Field workers often have poor or no signal. The following features must
work offline and sync when connectivity is restored.

  -----------------------------------------------------------------------
  **Feature**      **Offline Behavior**      **Sync Strategy**
  ---------------- ------------------------- ----------------------------
  Clock in / out   Stored in IndexedDB with  Background sync on reconnect
                   timestamp                 via Service Worker

  Photo upload     Photo stored in IndexedDB Upload queue drains when
                   blob queue                online, shows pending count

  Receipt capture  Form data + image stored  Sync on reconnect, status
                   locally                   shows \'Pending upload\'

  View assigned    Cached from last fetch    Cache-first, revalidate when
  projects                                   online

  Quote viewing    Cached PDF                Cache-first

  Clock-in         GPS captured at time of   Included in payload when
  location         action                    synced
  -----------------------------------------------------------------------

-   Use next-pwa with Workbox for service worker and cache strategies

-   Use idb-keyval or Dexie.js for IndexedDB offline storage

-   Show a toast banner when the app detects offline status

-   Show a sync status indicator: \'X items pending upload\'

-   Install prompt: show \'Add to Home Screen\' banner on mobile on
    first visit

# 8. UI/UX Guidelines

## 8.1 Navigation Structure

### Mobile (bottom tab bar)

-   Tab 1: Dashboard

-   Tab 2: Projects

-   Tab 3: Clock In/Out (large center button)

-   Tab 4: My Schedule

-   Tab 5: Menu (profile, settings, notifications)

### Desktop (left sidebar)

-   Dashboard, Projects, Quotes, Invoices, Price Lists, Workers,
    Reports, Settings

-   Collapsible sidebar with icon-only mode

-   Quick action toolbar at top: New Project, New Quote, Clock In

## 8.2 Design Tokens

-   Primary: Forest green (#2D6A4F) with white text

-   Secondary: Earth brown (#8B5E3C)

-   Accent: Sky blue (#4A90D9) for interactive elements

-   Error: Red (#DC2626), Warning: Amber (#D97706), Success: Green
    (#16A34A)

-   Font: Inter (system-ui fallback)

-   Border radius: 8px cards, 6px inputs, 4px badges

-   Dark mode: support from day one using Tailwind dark: classes

## 8.3 Mobile Conventions

-   All tap targets minimum 44x44px

-   Swipe-to-reveal actions on list items (edit, delete)

-   Bottom sheets instead of modals for forms on mobile

-   Sticky action buttons at bottom of screen for primary actions

-   Camera access: use HTML5 file input with capture=\'environment\'
    attribute

## 8.4 Desktop Conventions

-   Data tables with sorting, filtering, pagination

-   Split-pane layout for detail pages (list left, detail right on wide
    screens)

-   Keyboard shortcuts for power users: N for new, / for search, Esc to
    close

-   Drag-and-drop for photo uploads and Kanban status changes

# 9. API Route Structure

All routes live under /api/. Use Next.js App Router Route Handlers. All
mutating routes require authentication middleware. All responses return
JSON with a consistent shape: { data, error, meta }.

  ---------------------------------------------------------------------------------------
  **Route**                        **Methods**   **Auth        **Notes**
                                                 Required**    
  -------------------------------- ------------- ------------- --------------------------
  /api/auth/magic-link             POST          None          Send magic link email

  /api/auth/verify                 GET           None          Verify JWT, set session
                                                               cookie

  /api/auth/logout                 POST          Session       Clear session cookie

  /api/projects                    GET, POST     Session       List / create projects

  /api/projects/\[id\]             GET, PATCH,   Session       Project detail / update /
                                   DELETE                      archive

  /api/projects/\[id\]/customers   GET, POST,    Session       Project contacts
                                   PATCH, DELETE               

  /api/projects/\[id\]/photos      GET, POST,    Session       Photo upload to Supabase
                                   DELETE                      Storage

  /api/projects/\[id\]/tasks       GET, POST,    Session       Project tasks
                                   PATCH, DELETE               

  /api/projects/\[id\]/timeLogs    GET, POST,    Session       Time entries for project
                                   PATCH                       

  /api/projects/\[id\]/receipts    GET, POST     Session       Receipts for project

  /api/projects/\[id\]/quotes      GET, POST     Session       Quotes for project

  /api/quotes/\[id\]               GET, PATCH,   Session       Quote detail
                                   DELETE                      

  /api/quotes/\[id\]/send          POST          Session (PM+) Send quote to customer via
                                                               Resend

  /api/quotes/\[id\]/pdf           GET           Session       Generate and return quote
                                                               PDF

  /api/quotes/\[id\]/approve       POST          Magic link    Customer approves quote
                                                 token         

  /api/change-orders               POST          Session (PM+) Create change order

  /api/invoices                    GET, POST     Session       Invoices
                                                 (Owner,       
                                                 Accountant)   

  /api/invoices/\[id\]/send        POST          Session       Send invoice email
                                                 (Owner,       
                                                 Accountant)   

  /api/invoices/\[id\]/pay         POST          Magic link    Stripe payment intent for
                                                 token         customer

  /api/payments                    POST          Session       Record manual payment
                                                 (Owner,       
                                                 Accountant)   

  /api/suppliers                   GET, POST,    Session       Supplier CRUD
                                   PATCH         (Owner)       

  /api/price-lists                 GET, POST     Session       Price list CRUD
                                                 (Owner)       

  /api/price-lists/\[id\]/skus     GET, POST,    Session       SKU CRUD
                                   PATCH, DELETE (Owner)       

  /api/price-lists/ocr             POST          Session       Claude API price list OCR
                                                 (Owner)       

  /api/receipts/\[id\]             GET, PATCH    Session       Receipt detail and
                                                               approval

  /api/receipts/ocr                POST          Session       Claude API receipt OCR

  /api/workers                     GET, POST,    Session       Worker profile CRUD
                                   PATCH         (Owner)       

  /api/time-logs                   GET, POST,    Session       Clock in/out and log
                                   PATCH                       management

  /api/crew                        GET, POST,    Session       Crew management
                                   PATCH         (Owner, PM)   

  /api/reports/profitability       GET           Session       Per-project P&L
                                                 (Owner,       
                                                 Accountant)   

  /api/reports/export              GET           Session       CSV export
                                                 (Owner,       
                                                 Accountant)   

  /api/settings/margin             GET, PATCH    Session       Global margin setting
                                                 (Owner)       

  /api/portal/\[token\]            GET           Magic link    Customer portal data
                                                 token         

  /api/notifications/sms           POST          Session       Queue Twilio SMS (worker
                                                               notifications)

  /api/webhooks/stripe             POST          Stripe        Payment webhook handler
                                                 signature     
  ---------------------------------------------------------------------------------------

# 10. Claude Code Build Instructions

This section is the step-by-step prompt sequence to give Claude Code.
Each step is a discrete task. Complete and verify each step before
starting the next. Do not batch multiple steps.

## Step 1: Repo & Project Scaffold

> Initialize a Next.js 14 App Router project with TypeScript and
> Tailwind CSS. Set up the folder structure: src/app/ --- App Router
> pages and layouts src/components/ --- shared UI components src/lib/
> --- utilities, db client, auth helpers src/hooks/ --- custom React
> hooks src/types/ --- TypeScript type definitions prisma/ --- schema
> and migrations public/ --- static assets Create .env.local from the
> env variable list in the spec. Initialize Prisma with PostgreSQL
> provider. Install all dependencies listed in Section 2.1. Configure
> next-pwa in next.config.js. Set up shadcn/ui with the components:
> button, input, select, dialog, sheet, tabs, badge, card, table, toast,
> dropdown-menu, calendar.

## Step 2: Prisma Schema

Provide Claude Code with the full entity list from Section 3 and
instruct it to:

-   Write the complete schema.prisma with all models, enums, and
    relations

-   Run npx prisma migrate dev \--name init

-   Run npx prisma db seed with seed data: 2 owner users (Benedict), 1
    crew, 1 test supplier with 3 SKUs, 1 test project with 2 customers

## Step 3: Auth System

-   Implement magic link flow: POST /api/auth/magic-link, GET
    /api/auth/verify

-   JWT utilities in src/lib/auth.ts: signToken, verifyToken, getSession

-   Auth middleware in src/lib/middleware.ts: requireSession,
    requireRole

-   Dev mode password bypass gated behind DEV_PASSWORD_AUTH env var

-   Login page at /login --- email input, sends magic link, shows
    confirmation

## Step 4: Layout & Navigation

-   Root layout with session check --- redirect to /login if no session

-   AppLayout component: mobile bottom tab bar + desktop sidebar

-   Navigation links and active state per role (hide menu items user
    cannot access)

-   Theme tokens in globals.css and tailwind.config.ts

-   Dark mode toggle in settings

## Step 5: Project Module

-   Projects list page with Kanban and table views

-   Project detail page with tab layout (Overview, Contacts, Photos,
    Quotes, Invoices, Time, Receipts, Tasks, Notes)

-   Project create/edit form

-   Customer contact CRUD within project

-   Project status stepper component

-   All API routes for /api/projects and sub-resources

## Step 6: Photo Management

-   Supabase Storage bucket setup: project-photos (private, accessed via
    signed URLs)

-   Photo upload component: camera capture on mobile, drag-drop on
    desktop

-   Category tabs: Before, Proposed, In Progress, After

-   Lightbox viewer component

-   Generate signed URLs server-side for display

## Step 7: Supplier & SKU Module

-   Supplier CRUD pages

-   Price list management: create, list, deactivate

-   SKU table with inline editing

-   Bulk pricing tier editor per SKU

-   Global margin settings page

-   OCR import flow: upload image, call Claude API, show review table,
    confirm and save

## Step 8: Quote Builder

-   Quote builder page with line item editor

-   SKU search with typeahead (search by name, item number, description)

-   Bulk pricing auto-apply logic

-   Margin resolution logic (line \> project \> SKU \> global)

-   Server-side totals calculation API

-   Quote versioning on update

-   Quote PDF generation endpoint

-   Send quote email via Resend

## Step 9: Customer Portal

-   Magic link generation and email send

-   Portal route at /portal/\[token\] --- verify token, load project
    data

-   Portal UI: project status, photos, quote approval button, invoice
    list

-   Quote approval API endpoint

-   SMS launch button (sms: link) on project page for internal users

## Step 10: Invoicing & Payments

-   Invoice create/edit form (type, amount, tax, due date)

-   Invoice PDF generation

-   Send invoice email with Stripe payment link

-   Stripe webhook handler: update invoice status on
    payment_intent.succeeded

-   Manual payment recording form

-   Partial payment tracking

## Step 11: Time Tracking

-   Clock in/out UI (mobile-optimized large button)

-   GPS capture on clock in and out

-   Active clock-in banner component

-   Time log list and edit form (PM/Owner)

-   Estimated hours on project from quote line items

-   Estimated vs actual hours display

## Step 12: Receipt Capture

-   Receipt upload form with camera/file input

-   OCR flow via Claude API

-   Line item review and edit table

-   Tax/delivery amortization calculation

-   Approval workflow (Pending \> Approved/Rejected)

## Step 13: Worker & Crew Management

-   Worker profile CRUD

-   Crew create and member assignment

-   Project crew assignment with date range

-   Worker schedule view

-   SMS notification on schedule assignment via Twilio

## Step 14: Dashboard & Reporting

-   Dashboard with summary cards, Kanban, calendar widget

-   Per-project P&L calculation

-   Profitability report page

-   Worker hours report

-   Supplier spend report

-   CSV export for all reports

## Step 15: Offline & PWA

-   Service worker config via next-pwa

-   IndexedDB offline queue for clock-in, photos, receipts

-   Background sync registration

-   Offline status banner

-   Install prompt component

-   Test offline behavior in Chrome DevTools network throttle

## Step 16: Audit & Polish

-   AuditLog writes on all status changes, price edits, approvals

-   Error boundaries on all pages

-   Loading skeletons for all data-fetching components

-   Form validation with Zod on all API routes

-   Rate limiting on auth and OCR endpoints

-   Lighthouse PWA audit --- target 90+ on all scores

-   End-to-end test of full project lifecycle: create \> quote \>
    approve \> invoice \> pay

# 11. Deployment

## 11.1 Vercel Setup

-   Connect GitHub repo to Vercel --- auto-deploys on push to main

-   Preview deployments on every PR

-   Add all environment variables to Vercel project settings (not in
    repo)

-   Set NEXT_PUBLIC_APP_URL to your production domain

## 11.2 Supabase Setup

-   Create project at supabase.com

-   Copy DATABASE_URL (pooled) and DIRECT_URL (direct) from project
    settings

-   Create storage bucket: project-photos (private)

-   Create storage bucket: receipts (private)

-   Run prisma migrate deploy in CI/CD or manually on first deploy

## 11.3 Stripe Setup

-   Create products and prices in Stripe dashboard for any recurring
    items

-   Configure webhook endpoint in Stripe to point to
    /api/webhooks/stripe

-   Add webhook events: payment_intent.succeeded, invoice.paid,
    invoice.payment_failed

## 11.4 Twilio Setup

-   Purchase a phone number in Twilio console

-   Verify worker phone numbers during onboarding (Twilio free tier
    requires verified numbers)

-   Upgrade to paid plan before adding real workers to enable sending to
    any number

# 12. Future Roadmap (Not in V1)

-   Recurring maintenance contracts with scheduled invoicing

-   Equipment / vehicle tracking per project for cost allocation

-   Mileage logging per worker per project

-   QuickBooks Online direct API integration (replace CSV export)

-   Multi-location support (second service area or franchising)

-   Customer review / rating request after project completion

-   Lead CRM stage (before project creation, for tracking inquiries)

-   Estimate templates (save and reuse common job configurations)

-   Map view of all active project sites

-   Subcontractor invoice upload and matching to projects

**End of Specification**

This document is the authoritative source for the V1 build. Any scope
decisions not covered here should default to the simpler implementation
and be noted in a DECISIONS.md file in the repo for future reference.

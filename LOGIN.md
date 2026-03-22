# Hartford Landscaping — Dev Test Credentials

> Run `npx prisma db seed` to populate all data below.
> All staff accounts use password: **`devpassword`**

---

## Staff Logins

| Name | Email | Password | Role |
|------|-------|----------|------|
| Benedict Varela | benedict@hartfordlandscaping.com | devpassword | OWNER |
| Alex Varela | alex@hartfordlandscaping.com | devpassword | OWNER |
| Sandra Kim | sandra@hartfordlandscaping.com | devpassword | ACCOUNTANT |
| Marcus Rivera | marcus@hartfordlandscaping.com | devpassword | PROJECT_MANAGER |
| Dev Admin | admin@hartfordlandscaping.com | devpassword | PLATFORM_ADMIN |
| Darius Thompson | darius@hartfordlandscaping.com | devpassword | FIELD_WORKER |
| Elena Ruiz | elena@hartfordlandscaping.com | devpassword | FIELD_WORKER |
| Jamal Brooks | jamal@hartfordlandscaping.com | devpassword | FIELD_WORKER |
| Priya Nair | priya@hartfordlandscaping.com | devpassword | SUBCONTRACTOR |
| Connor Walsh | connor@hartfordlandscaping.com | devpassword | FIELD_WORKER |

**Login URL:** `http://localhost:3000/login`

---

## Customer Portal Links (Magic Link — No Password)

Customers access via tokenized portal link. No login required.
Portal URL pattern: `http://localhost:3000/portal/{token}`

### Project 1 — LEAD: Riverside Commons HOA

| Customer | Persona | Portal Link |
|----------|---------|-------------|
| Barbara Nguyen | HOA_REP (Primary) | http://localhost:3000/portal/ml-hoa-barbara-2025 |
| Scott Mercer | PROPERTY_MANAGER | http://localhost:3000/portal/ml-hoa-scott-2025 |

> **Status:** LEAD — No quote yet. Portal shows project info only.

---

### Project 2 — QUOTED: Martinez Residence Pool Surround

| Customer | Persona | Portal Link |
|----------|---------|-------------|
| Robert Martinez | HOMEOWNER (Primary) | http://localhost:3000/portal/ml-martinez-robert-2025 |
| Sarah Martinez | SPOUSE | http://localhost:3000/portal/ml-martinez-sarah-2025 |

> **Status:** QUOTED — Quote v1 sent 3/10/2026, expires 4/10/2026.
> **Total:** $7,938.83 — Awaiting approval. Robert can click "Approve This Quote" in portal.
> Quote includes: Flagstone pool surround, pea gravel beds, Knockout roses, Hydrangeas, steel edging.

---

### Project 3 — IN_PROGRESS: Maple Ridge Builder

| Customer | Persona | Portal Link |
|----------|---------|-------------|
| Tom Gallagher | BUILDER (Primary) | http://localhost:3000/portal/ml-mapleridge-tom-2025 |

> **Status:** IN_PROGRESS — Quote v1 approved 2/25/2026 ($12,352.69).
> Change Order #1 also approved ($512.00 — additional sod side yard).
> Crew Alpha on-site since 3/10/2026.

---

### Project 4 — INVOICED: Chen Residence Front Yard

| Customer | Persona | Portal Link |
|----------|---------|-------------|
| Wei Chen | HOMEOWNER (Primary) | http://localhost:3000/portal/ml-chen-wei-2025 |
| Mei Chen | SPOUSE | http://localhost:3000/portal/ml-chen-mei-2025 |

> **Status:** INVOICED — Work complete 3/1/2026.
> INV-2026-0041 (Deposit $2,005.06) — **PAID** by check 2/19/2026
> INV-2026-0042 (Final $2,005.05) — **SENT**, due 3/20/2026 — **OUTSTANDING**

---

### Project 5 — PAID: Westfield Office Park

| Customer | Persona | Portal Link |
|----------|---------|-------------|
| Diane Okafor | PROPERTY_MANAGER (Primary) | http://localhost:3000/portal/ml-westfield-diane-2025 |

> **Status:** PAID — Work complete 2/11/2026.
> INV-2026-0038 (Final $6,022.88) — **PAID** by ACH 3/8/2026

---

## Projects Summary

| # | Name | Status | Total Value | Notes |
|---|------|--------|-------------|-------|
| proj-001 | Riverside Commons HOA — Common Areas Refresh | LEAD | TBD | No quote yet |
| proj-002 | Martinez Residence — Pool Surround & Patio | QUOTED | $7,938.83 | Quote sent, awaiting approval |
| proj-003 | Maple Ridge Development — Lot 14 New Construction | IN_PROGRESS | $12,864.69 | Quote + CO approved, crew on-site |
| proj-004 | Chen Residence — Front Yard Native Planting | INVOICED | $4,010.11 | Deposit paid, final outstanding |
| proj-005 | Westfield Office Park — Spring Refresh & Irrigation | PAID | $6,022.88 | Fully paid 3/8/2026 |

---

## Suppliers (5)

| Name | Account # | Rep | Email |
|------|-----------|-----|-------|
| GreenWorld Supply Co. | GWS-10042 | Maria Santos | maria@greenworldsupply.com |
| Hartford Stone & Masonry | HSM-2241 | Tom Kowalski | tom@hartfordstone.com |
| Northeast Plant Nursery | NPN-0088 | Grace Huang | grace@nenursery.com |
| ProGrade Landscape Supply | PGL-5510 | Derek Walsh | derek@prograde.com |
| SunBelt Irrigation & Lighting | SBI-9934 | Linda Park | linda@sunbeltirrigation.com |

**Total SKUs:** 105 (25 + 20 + 25 + 18 + 17)

---

## Workers

| Name | Role | Pay Type | Rate |
|------|------|----------|------|
| Benedict Varela | OWNER | Salary | $75/hr equiv |
| Alex Varela | OWNER | Salary | $75/hr equiv |
| Marcus Rivera | PROJECT_MANAGER | Hourly | $32/hr |
| Darius Thompson | FIELD_WORKER | Hourly | $22/hr |
| Elena Ruiz | FIELD_WORKER | Hourly | $20/hr |
| Jamal Brooks | FIELD_WORKER | Hourly | $21/hr |
| Priya Nair | SUBCONTRACTOR | Subcontract | $55/hr |
| Connor Walsh | FIELD_WORKER | Hourly | $19/hr |

**Crew Alpha:** Benedict (lead), Alex, Darius, Elena
**Crew Beta:** Marcus (lead), Jamal, Priya, Connor

---

## Notes

- Password hash uses SHA-256 of `devpassword` — matches the auth middleware expected format
- Magic link tokens do not expire until 2026-12-31 — safe for extended testing
- All dollar amounts are pre-calculated to match seeded quote/invoice line items
- To re-seed a clean database: `npx prisma migrate reset` then `npx prisma db seed`
- To seed only (schema already applied): `npx prisma db seed`

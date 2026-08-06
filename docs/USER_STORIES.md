# DyluxePro — User Stories & Acceptance Criteria

Stories are grouped by persona. Priority: **P0** (revenue/security), **P1** (core CRM), **P2** (nice-to-have).

---

## Contractor (primary user)

### US-01 — Sign up and subscribe (P0)

**As a** new contractor  
**I want to** create an account, verify email, and subscribe  
**So that** I can use the CRM on a paid plan

**Acceptance**

- Unauthenticated users hitting `/dashboard` redirect to `/login`
- Unverified users redirect to `/verify-email`
- Users without active subscription redirect to `/subscription` (except `/api`, `/settings`, `/profile`)
- Stripe checkout only accepts allowlisted `price_*` IDs

**Automated coverage:** `route-access.test.ts` (public vs protected routes)

---

### US-02 — Manage sales pipeline (P1)

**As a** contractor  
**I want to** drag leads across pipeline stages  
**So that** I track deal progress

**Acceptance**

- Stages: New Leads → Estimate Sent → Approved → Job Scheduled → Completed
- Moving to Estimate Sent / Approved / Job Scheduled / Completed fires matching automation (`lead_*` events)
- Moving back to **New Leads** does **not** fire `lead_created` (that event is for new client/lead creation only)

**Automated coverage:** `leadAutomationEventForStatus` tests  
**Fixed:** removed erroneous `New Leads` → `lead_created` mapping

---

### US-03 — Add client and create estimate (P1)

**As a** contractor  
**I want to** add a client and send an estimate  
**So that** the client can approve it

**Acceptance**

- POST `/api/clients` validates body (name required, email format)
- POST `/api/estimates` with `send: true` updates linked lead to "Estimate Sent" **scoped to owner**
- Email includes HMAC `token` on approve / request-changes links
- `client_created` automation runs on new client

**Automated coverage:** `api-schemas.test.ts`, estimate token tests

---

### US-04 — Client approves estimate from email (P0)

**As a** client  
**I want to** approve an estimate from my inbox  
**So that** the contractor is notified and the pipeline updates

**Acceptance**

- `/estimate-action` is public (no login)
- POST `/api/email/action` requires valid token + matching `clientEmail`
- Rate limited (`email-action`)
- Estimate → Approved; linked lead → Approved; `estimate_approved` automations run

**Automated coverage:** `estimate-action-token.test.ts`

---

### US-05 — Record invoice payment (P1)

**As a** contractor  
**I want to** log a payment against an invoice  
**So that** status shows Paid / Partially Paid

**Acceptance**

- Payment cannot exceed **remaining** balance (400 if overpaid)
- Status transitions: Sent → Partially Paid → Paid

**Automated coverage:** `invoiceStatusAfterPayment` tests  
**Fixed:** overpayment guard on POST `/api/payments`

---

### US-06 — AI estimate from photos (P2)

**As a** contractor in the field  
**I want to** upload job-site photos and get line items  
**So that** I draft estimates faster

**Acceptance**

- Monthly quota by plan (Starter 5, Pro 100, Enterprise ∞)
- Analyze endpoint rate-limited and auth-required

**Automated coverage:** existing `scoring.test.ts`, `vision.test.ts`

---

### US-07 — Automations (P1)

**As a** contractor  
**I want to** enable email automations on key events  
**So that** follow-ups send automatically

**Events implemented in code**

| Trigger | When |
|---------|------|
| `client_created` | New client |
| `estimate_sent` | Estimate emailed |
| `estimate_approved` | Client approves (email action or dashboard) |
| `invoice_sent` | Invoice emailed |
| `job_completed` | Job marked complete |
| `lead_estimate_sent` … `lead_completed` | Pipeline drag |

**Known gaps**

- ~~`invoice_overdue` template exists in UI but no cron/trigger wired~~ → Fixed (Phase 5): daily cron `/api/automations/cron/overdue` scans Sent/Partially Paid invoices past `due_date`, emits `invoice_overdue` once, sets `overdue_notified_at`
- ~~`delay_days` in templates logged only — not scheduled~~ → Fixed (Phase 5): `delay_days > 0` enqueues `automation_jobs`; `/api/automations/cron/process` runs every 15 minutes
- SMS action type `send_sms` supported via Twilio REST when org `settings.sms_notifications` is true and Twilio env vars are set

---

## Client (portal)

### US-08 — Client Hub (P2)

**As a** homeowner  
**I want to** log in to the Client Hub to review estimates, pay invoices, and request work  

**Acceptance**

- Client registers via portal invitation (`/portal/register?token=…`) and signs in at `/portal/login`
- Hub at `/portal` lists estimates, invoices, and scheduled jobs for their client record
- Open an estimate at `/portal/estimates/[id]` → Approve or Request changes (same status/lead/automation path as email HMAC links)
- Unpaid invoices show **Pay** → Stripe Checkout via `POST /api/invoices/[id]/checkout`; paid invoices link to receipt/PDF at `/portal/invoices/[id]`
- Authenticated clients can submit service requests with optional photos
- Public request form at `/request/[orgSlug]` creates a `service_requests` row for that org (rate-limited)

**Manual test**

1. Invite a client → accept invite → open Hub
2. Contractor sends estimate → client approves in Hub → estimate `Approved`, lead updated, automations fire
3. Contractor sends invoice with Connect ready → client pays from Hub → returns to `/portal?paid=1`
4. Open `/request/{org.slug}` unauthenticated → submit with a photo → appears in contractor Requests inbox

---

## System / admin

### US-09 — Stripe webhooks (P0)

**As the** platform  
**I want to** process subscription webhooks idempotently  
**So that** double events do not corrupt billing

**Manual test:** checkout → webhook → `subscriptions` row active (see `PRODUCTION_MANUAL_STEPS.md`)

---

## Test execution

```bash
npm test                    # all unit tests
npm run test:repeat         # 3 consecutive runs (flaky detection)
npx tsc --noEmit
npm run build
```

See `docs/USER_STORIES_TEST_REPORT.md` for findings from logic review passes.

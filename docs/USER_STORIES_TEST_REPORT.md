# User Story Logic Test Report

**Date:** 2026-05-21  
**Method:** Static code review + automated unit tests (3 consecutive runs)  
**Scope:** Auth middleware, pipeline automations, estimates/invoices/payments, email actions, validation schemas

---

## Test runs

| Run | Command | Result |
|-----|---------|--------|
| 1 | `npm run test:repeat` | PASS |
| 2 | `npm run test:repeat` | PASS |
| 3 | `npm run test:repeat` | PASS |

Additional: `npx tsc --noEmit` PASS, `npm run build` PASS

**Total automated tests:** **47** (23 AI + 24 core logic/security)

---

## Issues found & fixed in this pass

| ID | Severity | Story | Issue | Fix |
|----|----------|-------|-------|-----|
| F-01 | Medium | US-02 | Dragging lead to "New Leads" fired `lead_created` automation | Removed from stage map; use `leadAutomationEventForStatus()` |
| F-02 | Medium | US-03 | Estimate send updated lead without `user_id` filter | Added `.eq('user_id', user.id)` on all lead updates in estimates POST |
| F-03 | Medium | US-05 | Payments could exceed invoice total (status still "Paid") | Reject POST when `amount > remaining balance` |
| F-04 | Low | US-01 | Middleware public-route regression risk | Extracted `route-access.ts` + regression tests |

---

## Open issues (not fixed — need product decision or larger work)

| ID | Severity | Story | Issue | Recommendation |
|----|----------|-------|-------|----------------|
| O-01 | High | US-08 | Client portal is a redirect stub | Build real client auth + RLS or remove links |
| O-02 | Medium | US-07 | `invoice_overdue` automation never triggers | Add cron job scanning overdue invoices |
| O-03 | Medium | US-07 | `delay_days` ignored (immediate send) | Job queue (Inngest/QStash) or document as preview-only |
| O-04 | Medium | US-03 | `estimates/[id]` PUT accepts any JSON status (no Zod) | Add `estimateUpdateSchema` + whitelist |
| O-05 | Low | US-06 | AI quota increment is read-then-write (race) | DB function `increment_ai_usage()` |
| O-06 | Low | US-04 | `request_changes` emails client, not contractor | Confirm intended UX |
| O-07 | Low | US-01 | `/client-dashboard` not public but requires auth → redirect loop risk for clients | Align with portal plan |

---

## Story-by-story verdict

| Story | Verdict | Notes |
|-------|---------|-------|
| US-01 Subscribe | **Pass** (logic) | Middleware tests green; Stripe needs manual E2E |
| US-02 Pipeline | **Pass** after F-01 | Automation mapping tested |
| US-03 Client + estimate | **Pass** after F-02 | Schema tests; email needs Resend in staging |
| US-04 Email approve | **Pass** | Token tests; action route reviewed |
| US-05 Payments | **Pass** after F-03 | Overpayment blocked |
| US-06 AI estimate | **Pass** (lib) | Vision/scoring tests; analyze route not integration-tested |
| US-07 Automations | **Partial** | Core triggers wired; overdue + delays missing (O-02, O-03) |
| US-08 Client portal | **Fail** | Stub only (O-01) |
| US-09 Webhooks | **Not automated** | Manual checklist in PRODUCTION_MANUAL_STEPS |

---

## Suggested manual E2E (staging)

1. Register → verify email → subscribe (test mode)
2. Add client → create estimate → send (check inbox for token links)
3. Open approve link in incognito → confirm dashboard shows Approved
4. Create invoice → partial payment → full payment → statuses
5. Drag lead across all stages → confirm automation runs in `automation_runs` table
6. AI estimate: 6th request on Starter plan → 429/quota message

---

## Files added

- `docs/USER_STORIES.md`
- `docs/USER_STORIES_TEST_REPORT.md`
- `src/lib/route-access.ts`
- `src/lib/__tests__/*.test.ts` (route-access, api-schemas, estimate-action-token, postgrest-escape)

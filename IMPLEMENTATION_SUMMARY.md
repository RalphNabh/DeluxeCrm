# Implementation Summary - Missing Features

## ✅ Completed Features

### 1. Pipeline Stage Automation Triggers
- **Status**: ✅ Completed
- **Changes**:
  - Updated `/api/leads/[id]/route.ts` to trigger automations when lead status changes
  - Added automation templates for pipeline stages:
    - `lead_estimate_sent` - When lead moves to "Estimate Sent"
    - `lead_approved` - When lead moves to "Approved"
    - `lead_job_scheduled` - When lead moves to "Job Scheduled"
    - `lead_completed` - When lead moves to "Completed"
  - Automations now automatically trigger when clients are dragged between pipeline stages in the dashboard

### 2. Client Folders and Tags System
- **Status**: ✅ Completed (Backend + Partial UI)
- **Changes**:
  - Client folders/tags schema (now in `supabase/migrations/` baseline) with:
    - `tags` array column in `clients` table
    - `client_folders` table for organizing clients
    - `folder_id` foreign key in `clients` table
  - Created API routes:
    - `/api/client-folders` - GET, POST
    - `/api/client-folders/[id]` - PUT, DELETE
  - Updated `/api/clients` routes to support tags and folder_id
  - Created `FolderManager` component for managing folders
  - Updated clients page to:
    - Display folders and tags on client cards
    - Filter clients by folder
    - Show folder badges with custom colors

## 🚧 Remaining Features to Implement

### 3. Image Uploads to Estimates
- **Status**: ⏳ Pending
- **Required**:
  - Add `images` column to `estimates` table (JSON array or separate `estimate_images` table)
  - Set up Supabase Storage bucket for estimate images
  - Update estimate creation/edit forms to support image uploads
  - Display images in estimate detail pages and emails

### 4. Material Catalog with Dropdowns
- **Status**: ⏳ Pending
- **Required**:
  - Create `materials` table with name, description, unit, default_price
  - Create API routes for materials CRUD
  - Update estimate line items form to use material selector dropdown
  - Allow both selecting from catalog and custom entry

### 5. Contracts with In-App Signature
- **Status**: ⏳ Pending
- **Required**:
  - Add `contracts` table linked to estimates
  - Integrate signature library (e.g., `react-signature-canvas`)
  - Create contract template system
  - Add signature capture/display in estimate detail pages
  - Store signature images in Supabase Storage

### 6. Full Client Portal
- **Status**: ✅ Completed (Phase 3 Client Hub)
- **Changes**:
  - Client Hub auth at `/portal` (invitation register + login)
  - Dashboard for estimates, invoices, jobs; in-portal estimate approve / request-changes
  - Invoice Pay via Stripe Connect Checkout; receipt/PDF view for paid invoices
  - Public request form at `/request/[orgSlug]` (service role, rate-limited)
  - Service request photo uploads stored in `photos` JSONB (org-scoped materials storage)
  - Shared `applyEstimateClientAction` used by email HMAC links and portal actions

## 📋 Database Schema Updates Needed

Apply migrations with the Supabase CLI (see `supabase/README.md`):

```bash
npx supabase db push
```

## 🎯 Next Steps

1. **Update client edit/new forms** to support tags and folder selection
2. **Implement image uploads** for estimates
3. **Create material catalog** system
4. **Build contract/signature** functionality

## 📝 Notes

- All API routes handle missing columns gracefully (fallback if schema not updated)
- Folder manager UI is functional and ready for use
- Pipeline automations work automatically when dragging leads between stages
- Tags and folders are displayed on client cards but need to be editable in client forms
- Client Hub (Phase 3) is live at `/portal`; public requests at `/request/[orgSlug]`



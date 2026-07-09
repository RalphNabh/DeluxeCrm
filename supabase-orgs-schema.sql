-- Organization-centric multi-tenancy (Jobber-style)
-- Run in Supabase SQL editor after existing schemas.

-- =============================================================================
-- Core org tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_user_id);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'worker'
    CHECK (role IN ('owner', 'admin', 'manager', 'worker')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'disabled')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(org_id);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker'
    CHECK (role IN ('admin', 'manager', 'worker')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(email);

-- Client assignments (workers see assigned clients only)
CREATE TABLE IF NOT EXISTS public.client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, member_user_id)
);

CREATE INDEX IF NOT EXISTS idx_client_assignments_member ON public.client_assignments(member_user_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_org ON public.client_assignments(org_id);

-- =============================================================================
-- Extend user_profiles
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN IF NOT EXISTS persona TEXT DEFAULT 'contractor',
      ADD COLUMN IF NOT EXISTS active_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'user_profiles_persona_check'
    ) THEN
      ALTER TABLE public.user_profiles
        ADD CONSTRAINT user_profiles_persona_check
        CHECK (persona IN ('contractor', 'client'));
    END IF;
  END IF;
END $$;

-- =============================================================================
-- Add organization_id to business tables (skip tables not yet created)
-- =============================================================================

DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'clients', 'leads', 'estimates', 'invoices', 'payments', 'jobs',
    'tasks', 'materials', 'pipeline_stages', 'client_folders',
    'automations', 'email_templates', 'automation_runs',
    'team_members', 'ai_estimate_sessions', 'ai_estimate_usage'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE',
        t
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_organization_id ON public.%I(organization_id)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN IF NOT EXISTS organization_id UUID UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS seat_quantity INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS included_seats INTEGER DEFAULT 1;
  END IF;
END $$;

-- =============================================================================
-- RLS helper functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.user_org_role(p_org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = auth.uid() AND org_id = p_org_id AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND org_id = p_org_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_manager_or_above(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND org_id = p_org_id
      AND status = 'active'
      AND role IN ('owner', 'admin', 'manager')
  );
$$;

-- =============================================================================
-- Backfill: one org per existing contractor user
-- =============================================================================

INSERT INTO public.organizations (id, name, slug, owner_user_id)
SELECT
  gen_random_uuid(),
  COALESCE(up.company_name, up.full_name, 'My Company'),
  'org-' || substr(replace(u.id::text, '-', ''), 1, 12),
  u.id
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om WHERE om.user_id = u.id AND om.role = 'owner'
)
ON CONFLICT DO NOTHING;

-- Link owners to orgs (for users who got orgs above)
INSERT INTO public.organization_members (org_id, user_id, role, status)
SELECT o.id, o.owner_user_id, 'owner', 'active'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om
  WHERE om.org_id = o.id AND om.user_id = o.owner_user_id
);

-- Backfill organization_id on all tenant tables from user_id (skip missing tables)
DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'clients', 'leads', 'estimates', 'invoices', 'payments', 'jobs',
    'tasks', 'materials', 'pipeline_stages', 'client_folders',
    'automations', 'email_templates', 'automation_runs',
    'team_members', 'ai_estimate_sessions', 'ai_estimate_usage'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        $sql$
          UPDATE public.%1$I tbl
          SET organization_id = om.org_id
          FROM public.organization_members om
          WHERE tbl.user_id = om.user_id
            AND om.role = 'owner'
            AND om.status = 'active'
            AND tbl.organization_id IS NULL
        $sql$,
        t
      );
    END IF;
  END LOOP;
END $$;

-- Backfill subscriptions.organization_id from owner membership
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    UPDATE public.subscriptions s
    SET organization_id = om.org_id
    FROM public.organization_members om
    WHERE s.user_id = om.user_id
      AND om.role = 'owner'
      AND om.status = 'active'
      AND s.organization_id IS NULL;
  END IF;
END $$;

-- Set active_org_id on profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    UPDATE public.user_profiles up
    SET active_org_id = om.org_id
    FROM public.organization_members om
    WHERE up.user_id = om.user_id
      AND om.role = 'owner'
      AND om.status = 'active'
      AND up.active_org_id IS NULL;
  END IF;
END $$;

-- =============================================================================
-- RLS on org tables
-- =============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their orgs" ON public.organizations;
CREATE POLICY "Members can view their orgs" ON public.organizations
  FOR SELECT USING (id IN (SELECT public.user_org_ids()));

DROP POLICY IF EXISTS "Owners can update their orgs" ON public.organizations;
CREATE POLICY "Owners can update their orgs" ON public.organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE org_id = organizations.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Members can view org memberships" ON public.organization_members;
CREATE POLICY "Members can view org memberships" ON public.organization_members
  FOR SELECT USING (org_id IN (SELECT public.user_org_ids()));

DROP POLICY IF EXISTS "Admins can manage memberships" ON public.organization_members;
CREATE POLICY "Admins can manage memberships" ON public.organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = organization_members.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.organization_invitations;
CREATE POLICY "Admins can manage invitations" ON public.organization_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = organization_invitations.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.organization_invitations;
CREATE POLICY "Anyone can read invitation by token" ON public.organization_invitations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Managers can manage client assignments" ON public.client_assignments;
CREATE POLICY "Managers can manage client assignments" ON public.client_assignments
  FOR ALL USING (public.is_org_manager_or_above(org_id));

DROP POLICY IF EXISTS "Workers can view own client assignments" ON public.client_assignments;
CREATE POLICY "Workers can view own client assignments" ON public.client_assignments
  FOR SELECT USING (member_user_id = auth.uid());

-- =============================================================================
-- Dual RLS on tenant tables (user_id OR organization_id during transition)
-- Apply to clients as template — repeat pattern for other tables in app code
-- =============================================================================

-- Clients: add org-scoped policies alongside existing user policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clients'
  ) THEN
    DROP POLICY IF EXISTS "Org members can read clients" ON public.clients;
    CREATE POLICY "Org members can read clients" ON public.clients
      FOR SELECT USING (
        organization_id IN (SELECT public.user_org_ids())
        AND (
          public.is_org_manager_or_above(organization_id)
          OR EXISTS (
            SELECT 1 FROM public.client_assignments ca
            WHERE ca.client_id = clients.id AND ca.member_user_id = auth.uid()
          )
          OR public.user_org_role(organization_id) = 'owner'
          OR public.user_org_role(organization_id) IN ('admin', 'manager')
        )
      );

    DROP POLICY IF EXISTS "Org managers can insert clients" ON public.clients;
    CREATE POLICY "Org managers can insert clients" ON public.clients
      FOR INSERT WITH CHECK (public.is_org_manager_or_above(organization_id));

    DROP POLICY IF EXISTS "Org managers can update clients" ON public.clients;
    CREATE POLICY "Org managers can update clients" ON public.clients
      FOR UPDATE USING (public.is_org_manager_or_above(organization_id));

    DROP POLICY IF EXISTS "Org managers can delete clients" ON public.clients;
    CREATE POLICY "Org managers can delete clients" ON public.clients
      FOR DELETE USING (public.is_org_manager_or_above(organization_id));
  END IF;
END $$;

-- Subscriptions: org members can view org subscription
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    DROP POLICY IF EXISTS "Org members can view org subscription" ON public.subscriptions;
    CREATE POLICY "Org members can view org subscription" ON public.subscriptions
      FOR SELECT USING (
        organization_id IN (SELECT public.user_org_ids())
        OR auth.uid() = user_id
      );
  END IF;
END $$;

-- Job assignments: workers can see their own assignments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'job_assignments'
  ) THEN
    DROP POLICY IF EXISTS "Workers can view own job assignments" ON public.job_assignments;
    CREATE POLICY "Workers can view own job assignments" ON public.job_assignments
      FOR SELECT USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Org managers can manage job assignments" ON public.job_assignments;
    CREATE POLICY "Org managers can manage job assignments" ON public.job_assignments
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.jobs j
          WHERE j.id = job_assignments.job_id
            AND public.is_org_manager_or_above(j.organization_id)
        )
      );
  END IF;
END $$;

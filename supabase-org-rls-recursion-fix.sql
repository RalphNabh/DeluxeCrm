-- Fix infinite RLS recursion on organization_members.
-- The old "Admins can manage memberships" policy queried organization_members
-- from within itself, which made membership SELECTs fail and caused
-- GET /api/clients → 403 "No organization membership found".
-- Run once in Supabase SQL Editor if not already applied.

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
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
      AND role IN ('owner', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "Owners can update their orgs" ON public.organizations;
CREATE POLICY "Owners can update their orgs" ON public.organizations
  FOR UPDATE USING (public.is_org_admin(id));

DROP POLICY IF EXISTS "Members can view org memberships" ON public.organization_members;
CREATE POLICY "Members can view org memberships" ON public.organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR org_id IN (SELECT public.user_org_ids())
  );

DROP POLICY IF EXISTS "Admins can manage memberships" ON public.organization_members;
CREATE POLICY "Admins can manage memberships" ON public.organization_members
  FOR ALL USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.organization_invitations;
CREATE POLICY "Admins can manage invitations" ON public.organization_invitations
  FOR ALL USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

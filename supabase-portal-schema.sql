-- Client portal: service requests, messaging (Jobber Client Hub)
-- Run after supabase-orgs-schema.sql

CREATE TABLE IF NOT EXISTS public.client_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'disabled')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_portal_users_auth ON public.client_portal_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_client ON public.client_portal_users(client_id);

CREATE TABLE IF NOT EXISTS public.client_portal_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_invitations_token ON public.client_portal_invitations(token);

CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  portal_user_id UUID REFERENCES public.client_portal_users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  preferred_date DATE,
  photos JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'quoted', 'scheduled', 'declined', 'archived')),
  converted_estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  converted_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_org ON public.service_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('contractor', 'client')),
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);

-- RLS
ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Portal users: clients see own row; org managers see their org's portal users
CREATE POLICY "Portal users read own" ON public.client_portal_users
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Org managers view portal users" ON public.client_portal_users
  FOR SELECT USING (organization_id IN (SELECT public.user_org_ids()));

CREATE POLICY "Org managers manage portal users" ON public.client_portal_users
  FOR ALL USING (public.is_org_manager_or_above(organization_id));

-- Service requests
CREATE POLICY "Clients view own requests" ON public.service_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.auth_user_id = auth.uid()
        AND cpu.client_id = service_requests.client_id
        AND cpu.status = 'active'
    )
  );

CREATE POLICY "Clients create requests" ON public.service_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.auth_user_id = auth.uid()
        AND cpu.client_id = service_requests.client_id
        AND cpu.organization_id = service_requests.organization_id
        AND cpu.status = 'active'
    )
  );

CREATE POLICY "Org members view requests" ON public.service_requests
  FOR SELECT USING (organization_id IN (SELECT public.user_org_ids()));

CREATE POLICY "Org managers manage requests" ON public.service_requests
  FOR ALL USING (public.is_org_manager_or_above(organization_id));

-- Conversations
CREATE POLICY "Participants view conversations" ON public.conversations
  FOR SELECT USING (
    organization_id IN (SELECT public.user_org_ids())
    OR EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.auth_user_id = auth.uid()
        AND cpu.client_id = conversations.client_id
        AND cpu.status = 'active'
    )
  );

CREATE POLICY "Participants create conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    public.is_org_manager_or_above(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.auth_user_id = auth.uid()
        AND cpu.client_id = conversations.client_id
        AND cpu.status = 'active'
    )
  );

-- Messages
CREATE POLICY "Participants view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.organization_id IN (SELECT public.user_org_ids())
          OR EXISTS (
            SELECT 1 FROM public.client_portal_users cpu
            WHERE cpu.auth_user_id = auth.uid()
              AND cpu.client_id = c.client_id
              AND cpu.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Participants send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_auth_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.organization_id IN (SELECT public.user_org_ids())
          OR EXISTS (
            SELECT 1 FROM public.client_portal_users cpu
            WHERE cpu.auth_user_id = auth.uid()
              AND cpu.client_id = c.client_id
              AND cpu.status = 'active'
          )
        )
    )
  );

-- Portal invitations
CREATE POLICY "Org managers manage portal invitations" ON public.client_portal_invitations
  FOR ALL USING (public.is_org_manager_or_above(organization_id));

CREATE POLICY "Public read portal invitation by token" ON public.client_portal_invitations
  FOR SELECT USING (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

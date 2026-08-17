-- One thread per client: merge duplicates, add message types, read_at UPDATE policy.

-- Extend messages with type + metadata for system timeline entries
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'system'));

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Merge duplicate conversations: keep newest per (organization_id, client_id)
DO $$
DECLARE
  dup RECORD;
  keeper_id UUID;
BEGIN
  FOR dup IN
    SELECT organization_id, client_id
    FROM public.conversations
    GROUP BY organization_id, client_id
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keeper_id
    FROM public.conversations
    WHERE organization_id = dup.organization_id
      AND client_id = dup.client_id
    ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC
    LIMIT 1;

    -- Re-point messages from duplicate rows to the keeper
    UPDATE public.messages m
    SET conversation_id = keeper_id
    FROM public.conversations c
    WHERE m.conversation_id = c.id
      AND c.organization_id = dup.organization_id
      AND c.client_id = dup.client_id
      AND c.id <> keeper_id;

    -- Preserve service_request_id on keeper when missing
    UPDATE public.conversations keeper
    SET service_request_id = COALESCE(
      keeper.service_request_id,
      (
        SELECT c.service_request_id
        FROM public.conversations c
        WHERE c.organization_id = dup.organization_id
          AND c.client_id = dup.client_id
          AND c.service_request_id IS NOT NULL
        ORDER BY c.created_at DESC
        LIMIT 1
      )
    )
    WHERE keeper.id = keeper_id;

    DELETE FROM public.conversations c
    WHERE c.organization_id = dup.organization_id
      AND c.client_id = dup.client_id
      AND c.id <> keeper_id;
  END LOOP;
END $$;

-- Enforce one conversation per client per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_org_client_unique
  ON public.conversations (organization_id, client_id);

-- Participants may mark messages read (read_at only)
DROP POLICY IF EXISTS "Participants mark messages read" ON public.messages;
CREATE POLICY "Participants mark messages read" ON public.messages
  FOR UPDATE
  USING (
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
  )
  WITH CHECK (
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

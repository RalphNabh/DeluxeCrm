-- Filtered postgres_changes on non-PK columns require FULL replica identity.
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Ensure messages table is published (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

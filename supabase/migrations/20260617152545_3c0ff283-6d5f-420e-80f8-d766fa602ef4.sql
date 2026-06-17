ALTER TABLE public.chat_messages ALTER COLUMN analysis_id DROP NOT NULL;
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
  WHERE conrelid = 'public.chat_messages'::regclass AND contype = 'f'
    AND pg_get_constraintdef(oid) ILIKE '%analyses%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.chat_messages DROP CONSTRAINT %I', c);
  END IF;
END $$;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_analysis_id_fkey
  FOREIGN KEY (analysis_id) REFERENCES public.analyses(id) ON DELETE SET NULL;
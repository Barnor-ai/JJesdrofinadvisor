
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Storage policies: users only access their own folder (folder = user_id)
CREATE POLICY "logos read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos write own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "logos delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "stmt read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'statements' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "stmt write own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'statements' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "stmt update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'statements' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "stmt delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'statements' AND (storage.foldername(name))[1] = auth.uid()::text);

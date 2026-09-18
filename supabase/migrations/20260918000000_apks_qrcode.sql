-- Módulo: Gerador de QR Code para APK
-- Tabela que guarda os APKs enviados e o link público de download.

CREATE TABLE public.apks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  public_url text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX apks_user_idx ON public.apks(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apks TO authenticated;
GRANT SELECT ON public.apks TO anon;
GRANT ALL ON public.apks TO service_role;
ALTER TABLE public.apks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apks_owner_all" ON public.apks FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
-- Leitura pública para que a página de download resolva o APK pelo id, se preciso.
CREATE POLICY "apks_public_read" ON public.apks FOR SELECT USING (true);

-- Bucket de storage público para os arquivos .apk (limite 500 MB).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'apks',
  'apks',
  true,
  524288000,
  ARRAY['application/vnd.android.package-archive','application/octet-stream','application/zip']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de storage: leitura pública, escrita apenas autenticado.
CREATE POLICY "apks_storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'apks');
CREATE POLICY "apks_storage_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'apks');
CREATE POLICY "apks_storage_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'apks');
CREATE POLICY "apks_storage_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'apks');

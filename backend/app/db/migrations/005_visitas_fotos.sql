-- Adiciona a coluna foto_url na tabela de visitas
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Cria o bucket 'visitas' no Supabase Storage se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('visitas', 'visitas', true)
ON CONFLICT (id) DO NOTHING;

-- Configura as permissões para o bucket 'visitas' (Permitir acesso público para leitura e escrita autenticada/pública)
-- Drop nas políticas caso já existam (para evitar erros ao rodar o script mais de uma vez)
DROP POLICY IF EXISTS "Visitas Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Visitas Public Insert" ON storage.objects;

CREATE POLICY "Visitas Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'visitas');
CREATE POLICY "Visitas Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'visitas');

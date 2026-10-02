-- Adiciona novas colunas especificadas no Notion para o módulo de Visitas / Prospecção
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS pessoa_contato VARCHAR(255);
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS telefone VARCHAR(100);
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS data_retorno DATE;

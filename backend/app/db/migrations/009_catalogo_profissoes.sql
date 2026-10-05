-- Migration 009: Catálogo de Profissões e Índices
CREATE TABLE IF NOT EXISTS profissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS funcionario_profissoes (
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
    profissao_id UUID REFERENCES profissoes(id) ON DELETE CASCADE,
    PRIMARY KEY (funcionario_id, profissao_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profissoes_lower_trim_nome ON profissoes (lower(trim(nome)));

-- Seed inicial de 15 profissões padrão da construção civil
INSERT INTO profissoes (nome) VALUES
  ('Mestre de Obras'),
  ('Encarregado de Obras'),
  ('Pedreiro'),
  ('Servente / Ajudante de Obras'),
  ('Eletricista'),
  ('Encanador / Bombeiro Hidráulico'),
  ('Gesseiro / Montador de Drywall'),
  ('Pintor'),
  ('Azulejista / Revestidor'),
  ('Carpinteiro / Armador'),
  ('Telhadista / Calheiro'),
  ('Impermeabilizador'),
  ('Serralheiro'),
  ('Marceneiro'),
  ('Soldador')
ON CONFLICT DO NOTHING;

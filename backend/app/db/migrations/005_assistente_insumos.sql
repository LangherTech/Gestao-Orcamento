-- 1.1 orcamento_itens: adicionar colunas
ALTER TABLE orcamento_itens 
  ADD COLUMN IF NOT EXISTS fornecido_por VARCHAR(20) NOT NULL DEFAULT 'Edifica',
  ADD COLUMN IF NOT EXISTS unidade VARCHAR(20),
  ADD COLUMN IF NOT EXISTS preco_catalogo DECIMAL(12,2);

-- 1.2 assistente_insumos
CREATE TABLE IF NOT EXISTS assistente_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistente VARCHAR(50) NOT NULL,
  papel VARCHAR(50) NOT NULL,
  material_id UUID REFERENCES materiais(id) ON DELETE SET NULL,
  unidade_uso VARCHAR(20),
  fator_conversao DECIMAL(12,3),
  UNIQUE(assistente, papel)
);

-- Inserir registros
INSERT INTO assistente_insumos (assistente, papel, unidade_uso, fator_conversao) VALUES
  ('drywall', 'placa_st', 'un', 1),
  ('drywall', 'placa_ru', 'un', 1),
  ('drywall', 'placa_rf', 'un', 1),
  ('drywall', 'montante', 'un', 1),
  ('drywall', 'guia', 'un', 1),
  ('drywall', 'parafuso_gn25', 'un', 1000),
  ('drywall', 'parafuso_lb', 'un', 1000),
  ('drywall', 'bucha', 'un', 1000),
  ('drywall', 'fita', 'm', 90),
  ('drywall', 'massa', 'kg', 20),
  ('drywall', 'banda', 'm', 20)
ON CONFLICT (assistente, papel) DO NOTHING;

-- 1.3 Atualizar subtotal para não usar desconto_percentual
-- Primeiro, desvinculamos e recriamos a coluna subtotal se ela for gerada
ALTER TABLE orcamento_itens DROP COLUMN subtotal;
ALTER TABLE orcamento_itens ADD COLUMN subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED;

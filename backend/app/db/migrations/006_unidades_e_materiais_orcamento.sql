-- ==============================================================================
-- SISTEMA EDIFICA — GESTÃO DE ORÇAMENTOS E OBRAS
-- Migração 006_unidades_e_materiais_orcamento.sql
-- ==============================================================================

-- 1. Adicionar unidade de medida em serviços
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS unidade VARCHAR(50) DEFAULT 'Unidade';

-- 2. Atualizar as unidades dos materiais já existentes para as novas opções (caso não se apliquem)
UPDATE materiais SET unidade = 'Unidade' WHERE unidade NOT IN ('ML', 'M²', 'M³', 'Unidade');
UPDATE materiais SET unidade = 'ML' WHERE unidade = 'm' OR unidade = 'barra';

-- 3. Adicionar material_id nos itens do orçamento
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materiais(id) ON DELETE SET NULL;

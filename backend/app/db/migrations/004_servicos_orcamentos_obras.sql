-- ==============================================================================
-- SISTEMA EDIFICA — GESTÃO DE ORÇAMENTOS E OBRAS
-- Migração 004_servicos_orcamentos_obras.sql: Alterações em Serviços, Orçamentos e Obras
-- ==============================================================================

-- 1. Atualizar Tabela de Obras
ALTER TABLE obras DROP COLUMN IF EXISTS orcamento_total;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS valor_aprovado DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE obras ADD COLUMN IF NOT EXISTS valor_pendente_aprovacao DECIMAL(12,2) DEFAULT 0.00;

-- 2. Atualizar Tabela de Orçamentos
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS impostos_percentual DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS margem_bdi_percentual DECIMAL(5,2) DEFAULT 0.00;

-- 3. Atualizar Função e Gatilho para Atualizar Orçamento da Obra
CREATE OR REPLACE FUNCTION fn_atualizar_orcamento_obra()
RETURNS TRIGGER AS $$
DECLARE
  v_obra_id UUID;
BEGIN
  -- Identifica qual obra precisa ser atualizada
  IF TG_OP = 'DELETE' THEN
    v_obra_id := OLD.obra_id;
  ELSE
    v_obra_id := NEW.obra_id;
  END IF;

  IF v_obra_id IS NOT NULL THEN
    UPDATE obras
    SET 
      valor_aprovado = COALESCE((SELECT SUM(valor_total) FROM orcamentos WHERE obra_id = v_obra_id AND status = 'aprovado'), 0),
      valor_pendente_aprovacao = COALESCE((SELECT SUM(valor_total) FROM orcamentos WHERE obra_id = v_obra_id AND status IN ('rascunho', 'enviado')), 0),
      updated_at = NOW()
    WHERE id = v_obra_id;
  END IF;
  
  -- Se mudou de obra, atualiza a obra antiga também
  IF TG_OP = 'UPDATE' AND OLD.obra_id IS DISTINCT FROM NEW.obra_id AND OLD.obra_id IS NOT NULL THEN
    UPDATE obras
    SET 
      valor_aprovado = COALESCE((SELECT SUM(valor_total) FROM orcamentos WHERE obra_id = OLD.obra_id AND status = 'aprovado'), 0),
      valor_pendente_aprovacao = COALESCE((SELECT SUM(valor_total) FROM orcamentos WHERE obra_id = OLD.obra_id AND status IN ('rascunho', 'enviado')), 0),
      updated_at = NOW()
    WHERE id = OLD.obra_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_orcamento_obra ON orcamentos;
CREATE TRIGGER trg_atualizar_orcamento_obra
AFTER INSERT OR UPDATE OF status, valor_total, obra_id OR DELETE ON orcamentos
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_orcamento_obra();

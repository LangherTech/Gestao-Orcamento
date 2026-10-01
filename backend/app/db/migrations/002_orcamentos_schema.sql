-- ==============================================================================
-- SISTEMA EDIFICA — GESTÃO DE ORÇAMENTOS E OBRAS
-- Migração 002_orcamentos_schema.sql: Persistência de Orçamentos e Propostas
-- ==============================================================================

-- 1. Tabela de Orçamentos (Propostas Comerciais)
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  numero VARCHAR(50) NOT NULL UNIQUE,
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_contato VARCHAR(255),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  desconto_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  validade_dias INTEGER NOT NULL DEFAULT 30,
  status VARCHAR(50) NOT NULL DEFAULT 'rascunho', -- rascunho, enviado, aprovado, recusado
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Itens do Orçamento
CREATE TABLE IF NOT EXISTS orcamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES orcamentos(id) ON DELETE CASCADE,
  servico_id UUID REFERENCES servicos(id) ON DELETE SET NULL,
  descricao VARCHAR(255) NOT NULL,
  quantidade DECIMAL(10,3) NOT NULL DEFAULT 1.000,
  preco_unitario DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  desconto_percentual DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(12,2) GENERATED ALWAYS AS (
    (quantidade * preco_unitario) - ((quantidade * preco_unitario) * (desconto_percentual / 100))
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices para Otimização de Consultas
CREATE INDEX IF NOT EXISTS idx_orcamentos_obra_id ON orcamentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_created_by ON orcamentos(created_by);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento_id ON orcamento_itens(orcamento_id);

-- 4. Função e Gatilho para Atualizar Orçamento Total da Obra ao Aprovar
CREATE OR REPLACE FUNCTION fn_atualizar_orcamento_obra()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aprovado' AND NEW.obra_id IS NOT NULL THEN
    UPDATE obras
    SET orcamento_total = NEW.valor_total,
        updated_at = NOW()
    WHERE id = NEW.obra_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_orcamento_obra ON orcamentos;
CREATE TRIGGER trg_atualizar_orcamento_obra
AFTER INSERT OR UPDATE OF status, valor_total, obra_id ON orcamentos
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_orcamento_obra();

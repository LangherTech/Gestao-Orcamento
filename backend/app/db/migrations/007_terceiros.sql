-- 1. Alterações na tabela contratos_empreiteiro
ALTER TABLE contratos_empreiteiro
ADD COLUMN IF NOT EXISTS data_servico DATE;

-- 2. Alterações na tabela medicoes_empreiteiro (agora usada como pagamentos)
ALTER TABLE medicoes_empreiteiro
ALTER COLUMN quantidade_executada DROP NOT NULL,
ALTER COLUMN preco_unitario DROP NOT NULL;

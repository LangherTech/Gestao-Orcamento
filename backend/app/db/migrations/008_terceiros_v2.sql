-- Alterações na tabela contratos_empreiteiro
ALTER TABLE contratos_empreiteiro
ADD COLUMN IF NOT EXISTS arquivado BOOLEAN DEFAULT FALSE;

-- Alterações na tabela medicoes_empreiteiro (agora pagamentos)
ALTER TABLE medicoes_empreiteiro
ADD COLUMN IF NOT EXISTS tipo_pagamento VARCHAR(50) DEFAULT 'Semanal',
ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Drop constraints if any (we already dropped NOT NULL in 007)

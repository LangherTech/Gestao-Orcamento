CREATE TABLE IF NOT EXISTS insumo_embalagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materiais(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    quantidade_unidades DECIMAL(10,3) NOT NULL,
    unidade_compra VARCHAR(20) NOT NULL,
    preco DECIMAL(12,2) NOT NULL,
    padrao BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS embalagem_id UUID REFERENCES insumo_embalagens(id) ON DELETE SET NULL;
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS origem_assistente BOOLEAN DEFAULT false;
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS assistente_execucao_id VARCHAR(100);
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS quantidade_por_embalagem DECIMAL(10,3);

-- Create assistente_parametros
CREATE TABLE IF NOT EXISTS assistente_parametros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistente VARCHAR(100) NOT NULL,
    chave VARCHAR(100) NOT NULL,
    valor DECIMAL(10,3) NOT NULL,
    descricao VARCHAR(255),
    UNIQUE(assistente, chave)
);

-- Handle Desconto (incorporating it into preco_unitario to preserve totals)
UPDATE orcamento_itens
SET preco_unitario = preco_unitario * (1 - COALESCE(desconto_percentual, 0) / 100)
WHERE COALESCE(desconto_percentual, 0) > 0;

ALTER TABLE orcamento_itens DROP COLUMN IF EXISTS subtotal;
ALTER TABLE orcamento_itens ADD COLUMN subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED;

UPDATE orcamento_itens SET desconto_percentual = 0;

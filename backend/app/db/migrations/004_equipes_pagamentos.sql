-- 1. Equipes (Agrupamento de Funcionários liderados por um Líder)
CREATE TABLE IF NOT EXISTS equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  lider_id UUID, -- será referenciado na FK após garantir que a tabela funcionarios existe ou já existe
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Atualizar tabela funcionarios
ALTER TABLE funcionarios
ADD COLUMN IF NOT EXISTS lider BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cor VARCHAR(50),
ADD COLUMN IF NOT EXISTS equipe_padrao_id UUID REFERENCES equipes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS valor_diaria NUMERIC(10, 2);

-- FK de equipes.lider_id apontando para funcionarios
ALTER TABLE equipes
ADD CONSTRAINT fk_equipes_lider FOREIGN KEY (lider_id) REFERENCES funcionarios(id) ON DELETE SET NULL;

-- 3. Atualizar tabela calendario_alocacoes
ALTER TABLE calendario_alocacoes
ADD COLUMN IF NOT EXISTS periodo VARCHAR(20) DEFAULT 'dia_inteiro', -- dia_inteiro, manha, tarde
ADD COLUMN IF NOT EXISTS modalidade_pagamento VARCHAR(20) DEFAULT 'diaria', -- diaria, fechado
ADD COLUMN IF NOT EXISTS valor_diaria NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS valor_fechado NUMERIC(10, 2);

-- 4. Tabela de Pagamentos de Funcionários
CREATE TABLE IF NOT EXISTS pagamentos_funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  alocacao_id UUID REFERENCES calendario_alocacoes(id) ON DELETE SET NULL,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  modalidade VARCHAR(20) NOT NULL, -- diaria, fechado
  data_pagamento DATE NOT NULL,
  valor_pago NUMERIC(10, 2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

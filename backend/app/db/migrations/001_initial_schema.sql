-- ==============================================================================
-- SISTEMA EDIFICA — GESTÃO DE ORÇAMENTOS E OBRAS
-- Schema Inicial de Banco de Dados (PostgreSQL / Supabase)
-- Migração 001_initial_schema.sql
-- ==============================================================================

-- 1. Tabela de Obras
CREATE TABLE IF NOT EXISTS obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cliente VARCHAR(255),
  endereco TEXT,
  data_inicio DATE,
  data_prevista_fim DATE,
  data_real_fim DATE,
  orcamento_total DECIMAL(12,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'ativa', -- ativa, concluida, cancelada
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Materiais (Catálogo de Insumos)
CREATE TABLE IF NOT EXISTS materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  unidade VARCHAR(20) NOT NULL, -- m2, m3, barra, saco, kg, un
  preco_medio DECIMAL(12,2) DEFAULT 0.00,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Serviços
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100),
  preco_total DECIMAL(12,2) DEFAULT 0.00,
  margem_lucro DECIMAL(5,2) DEFAULT 0.00,
  mao_de_obra DECIMAL(12,2) DEFAULT 0.00,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Composição de Insumos do Serviço (Relação N:N Serviço - Material)
CREATE TABLE IF NOT EXISTS servico_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id UUID REFERENCES servicos(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materiais(id),
  quantidade DECIMAL(10,3) NOT NULL DEFAULT 1.000,
  rendimento DECIMAL(10,3) NOT NULL DEFAULT 1.000, -- Quantidade necessária por unidade de serviço
  preco_unitario DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED
);

-- 5. Catálogo de Profissões / Especializações
CREATE TABLE IF NOT EXISTS profissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Funcionários Próprios (CLT)
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Especializações do Funcionário (N:N Funcionário - Profissão)
CREATE TABLE IF NOT EXISTS funcionario_profissoes (
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  profissao_id UUID REFERENCES profissoes(id) ON DELETE CASCADE,
  PRIMARY KEY (funcionario_id, profissao_id)
);

-- 8. Calendário de Alocações em Obras
CREATE TABLE IF NOT EXISTS calendario_alocacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  funcionario_id UUID REFERENCES funcionarios(id),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  periodo VARCHAR(20) DEFAULT 'dia_inteiro', -- dia_inteiro, manha, tarde
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Diário de Obra (RDO)
CREATE TABLE IF NOT EXISTS rdo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  equipe_presente TEXT[], -- Array com identificação dos funcionários presentes
  atividades_realizadas TEXT NOT NULL,
  materiais_utilizados TEXT,
  equipamentos TEXT,
  condicoes_climaticas VARCHAR(100), -- ensolarado, chuvoso, nublado, etc.
  ocorrencias TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(obra_id, data)
);

-- 10. Fotos e Anexos do RDO
CREATE TABLE IF NOT EXISTS rdo_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rdo_id UUID REFERENCES rdo(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  descricao TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Cadastro de Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Pedidos de Compra
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id),
  numero VARCHAR(50) UNIQUE,
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista DATE,
  valor_total DECIMAL(12,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'cotacao', -- cotacao, aprovado, recebido, pago
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Itens do Pedido de Compra
CREATE TABLE IF NOT EXISTS pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  quantidade DECIMAL(10,3) NOT NULL DEFAULT 1.000,
  preco_unitario DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED
);

-- 14. Cronograma: Etapas e Sub-etapas
CREATE TABLE IF NOT EXISTS etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  etapa_pai_id UUID REFERENCES etapas(id) ON DELETE CASCADE, -- Hierarquia de até 2 níveis
  data_prevista_inicio DATE,
  data_prevista_fim DATE,
  data_real_inicio DATE,
  data_real_fim DATE,
  custo_previsto DECIMAL(12,2) DEFAULT 0.00,
  custo_real DECIMAL(12,2) DEFAULT 0.00,
  percentual_conclusao DECIMAL(5,2) DEFAULT 0.00,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Checklists de Qualidade por Etapa
CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id UUID REFERENCES etapas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  items JSONB DEFAULT '[]'::jsonb, -- Array de objetos: [{id, descricao, status}]
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Empreiteiros e Terceirizados
CREATE TABLE IF NOT EXISTS empreiteiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(14),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  area_atuacao VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Contratos com Empreiteiros
CREATE TABLE IF NOT EXISTS contratos_empreiteiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  empreiteiro_id UUID REFERENCES empreiteiros(id),
  tipo_contrato VARCHAR(50) NOT NULL, -- valor_fechado, por_medicao
  valor_total DECIMAL(12,2) DEFAULT 0.00,
  data_assinatura DATE,
  data_termino DATE,
  escopo TEXT,
  condicoes_pagamento TEXT,
  status VARCHAR(50) DEFAULT 'ativo', -- ativo, concluido, cancelado
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Medições de Serviços de Empreiteiros
CREATE TABLE IF NOT EXISTS medicoes_empreiteiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES contratos_empreiteiro(id) ON DELETE CASCADE,
  data_medicao DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade_executada DECIMAL(10,3) NOT NULL,
  preco_unitario DECIMAL(12,2) NOT NULL,
  valor_pagar DECIMAL(12,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Receitas e Faturamento
CREATE TABLE IF NOT EXISTS receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  data_receita DATE NOT NULL DEFAULT CURRENT_DATE,
  valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'pendente', -- pendente, recebido
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Caixa Pequeno de Obra
CREATE TABLE IF NOT EXISTS caixa_pequeno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  categoria VARCHAR(100) NOT NULL, -- Material, Alimentação, Frete, Outro
  status VARCHAR(50) DEFAULT 'pendente_aprovacao', -- pendente_aprovacao, aprovado
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_obras_created_by ON obras(created_by);
CREATE INDEX IF NOT EXISTS idx_servicos_obra_id ON servicos(obra_id);
CREATE INDEX IF NOT EXISTS idx_calendario_alocacoes_obra_id ON calendario_alocacoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_rdo_obra_id_data ON rdo(obra_id, data);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_obra_id ON pedidos_compra(obra_id);
CREATE INDEX IF NOT EXISTS idx_etapas_obra_id ON etapas(obra_id);
CREATE INDEX IF NOT EXISTS idx_receitas_obra_id ON receitas(obra_id);
CREATE INDEX IF NOT EXISTS idx_caixa_pequeno_obra_id ON caixa_pequeno(obra_id);
CREATE INDEX IF NOT EXISTS idx_contratos_empreiteiro_obra_id ON contratos_empreiteiro(obra_id);

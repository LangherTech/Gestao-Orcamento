# Documentação do Banco de Dados (PostgreSQL / Supabase)

Este documento descreve as tabelas, tipos de dados, chaves primárias/estrangeiras e índices do sistema **Edifica**, configurados para PostgreSQL via Supabase.

---

## Tabelas Principais

### 1. `auth.users`
Gerenciado nativamente pelo **Supabase Auth**. Utilizado como referência de auditoria (`created_by`, `approved_by`).

### 2. `obras`
Centro do sistema. Representa as obras e reformas gerenciadas.
- `id`: UUID (PK, `gen_random_uuid()`)
- `nome`: VARCHAR(255) NOT NULL
- `cliente`: VARCHAR(255)
- `endereco`: TEXT
- `data_inicio`: DATE
- `data_prevista_fim`: DATE
- `data_real_fim`: DATE
- `orcamento_total`: DECIMAL(12,2)
- `status`: VARCHAR(50) DEFAULT 'ativa' (ativa, concluida, cancelada)
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

### 3. `materiais`
Catálogo de insumos e matérias-primas utilizados na composição de serviços.
- `id`: UUID (PK)
- `nome`: VARCHAR(255) NOT NULL
- `unidade`: VARCHAR(20) (ex: m2, barra, saco, kg)
- `preco_medio`: DECIMAL(12,2)
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()

### 4. `servicos`
Serviços executados na obra, com custos de mão de obra e composição de materiais.
- `id`: UUID (PK)
- `obra_id`: UUID REFERENCES obras(id) ON DELETE CASCADE
- `nome`: VARCHAR(255) NOT NULL
- `descricao`: TEXT
- `categoria`: VARCHAR(100)
- `preco_total`: DECIMAL(12,2)
- `margem_lucro`: DECIMAL(5,2)
- `mao_de_obra`: DECIMAL(12,2)
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

### 5. `servico_materiais`
Relação N:N entre serviço e material com rendimento específico.
- `id`: UUID (PK)
- `servico_id`: UUID REFERENCES servicos(id) ON DELETE CASCADE
- `material_id`: UUID REFERENCES materiais(id)
- `quantidade`: DECIMAL(10,3)
- `rendimento`: DECIMAL(10,3) (quantidade de material por unidade de serviço)
- `preco_unitario`: DECIMAL(12,2)
- `subtotal`: DECIMAL(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED

### 6. `profissoes`
Catálogo editável de especializações da equipe de campo.
- `id`: UUID (PK)
- `nome`: VARCHAR(100) NOT NULL UNIQUE
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()

### 7. `funcionarios`
Colaboradores próprios / CLT.
- `id`: UUID (PK)
- `nome`: VARCHAR(255) NOT NULL
- `ativo`: BOOLEAN DEFAULT true
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

### 8. `funcionario_profissoes`
Relação N:N entre funcionários e profissões.
- `funcionario_id`: UUID REFERENCES funcionarios(id) ON DELETE CASCADE
- `profissao_id`: UUID REFERENCES profissoes(id) ON DELETE CASCADE
- PRIMARY KEY (`funcionario_id`, `profissao_id`)

### 9. `calendario_alocacoes`
Alocação de funcionários em obras por período.
- `id`: UUID (PK)
- `obra_id`: UUID REFERENCES obras(id) ON DELETE CASCADE
- `funcionario_id`: UUID REFERENCES funcionarios(id)
- `data_inicio`: DATE
- `data_fim`: DATE
- `periodo`: VARCHAR(20) DEFAULT 'dia_inteiro' (dia_inteiro, manha, tarde)
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()

### 10. `rdo` (Diário de Obra)
Registro diário das atividades de campo.
- `id`: UUID (PK)
- `obra_id`: UUID REFERENCES obras(id) ON DELETE CASCADE
- `data`: DATE
- `equipe_presente`: TEXT[] (lista de nomes/IDs)
- `atividades_realizadas`: TEXT
- `materiais_utilizados`: TEXT
- `equipamentos`: TEXT
- `condicoes_climaticas`: VARCHAR(100)
- `ocorrencias`: TEXT
- `observacoes`: TEXT
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()
- UNIQUE(`obra_id`, `data`)

### 11. `rdo_fotos`
Anexos fotográficos e de vídeo vinculados a um RDO.
- `id`: UUID (PK)
- `rdo_id`: UUID REFERENCES rdo(id) ON DELETE CASCADE
- `url`: VARCHAR(500)
- `descricao`: TEXT
- `uploaded_at`: TIMESTAMP DEFAULT NOW()

### 12. `fornecedores`
Fornecedores de insumos e compras.
- `id`: UUID (PK)
- `nome`: VARCHAR(255) NOT NULL
- `cnpj`: VARCHAR(14)
- `telefone`: VARCHAR(20)
- `email`: VARCHAR(255)
- `endereco`: TEXT
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()

### 13. `pedidos_compra`
Pedidos de compra vinculados à obra e fornecedor.
- `id`: UUID (PK)
- `obra_id`: UUID REFERENCES obras(id) ON DELETE CASCADE
- `fornecedor_id`: UUID REFERENCES fornecedores(id)
- `numero`: VARCHAR(50) UNIQUE
- `data_pedido`: DATE
- `data_entrega_prevista`: DATE
- `valor_total`: DECIMAL(12,2)
- `status`: VARCHAR(50) DEFAULT 'cotacao' (cotacao, aprovado, recebido, pago)
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

### 14. `pedido_itens`
Itens individuais de um pedido de compra.
- `id`: UUID (PK)
- `pedido_id`: UUID REFERENCES pedidos_compra(id) ON DELETE CASCADE
- `descricao`: VARCHAR(255)
- `quantidade`: DECIMAL(10,3)
- `preco_unitario`: DECIMAL(12,2)
- `subtotal`: DECIMAL(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED

### 15. `etapas`
Etapas e sub-etapas do cronograma físico-financeiro.
- `id`: UUID (PK)
- `obra_id`: UUID REFERENCES obras(id) ON DELETE CASCADE
- `nome`: VARCHAR(255) NOT NULL
- `etapa_pai_id`: UUID REFERENCES etapas(id) ON DELETE CASCADE (hierarquia 2 níveis)
- `data_prevista_inicio`: DATE
- `data_prevista_fim`: DATE
- `data_real_inicio`: DATE
- `data_real_fim`: DATE
- `custo_previsto`: DECIMAL(12,2)
- `custo_real`: DECIMAL(12,2)
- `percentual_conclusao`: DECIMAL(5,2)
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()
- `updated_at`: TIMESTAMP DEFAULT NOW()

### 16. `checklists`
Inspeções de qualidade vinculadas a uma etapa do cronograma.
- `id`: UUID (PK)
- `etapa_id`: UUID REFERENCES etapas(id) ON DELETE CASCADE
- `nome`: VARCHAR(255)
- `items`: JSONB ([{"id": "...", "descricao": "...", "status": "ok|pendente"}])
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()

### 17. `empreiteiros`
Terceirizados e prestadores de serviço externos.
- `id`: UUID (PK)
- `nome`: VARCHAR(255) NOT NULL
- `cpf_cnpj`: VARCHAR(14)
- `telefone`: VARCHAR(20)
- `email`: VARCHAR(255)
- `endereco`: TEXT
- `area_atuacao`: VARCHAR(100)
- `ativo`: BOOLEAN DEFAULT true
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()

### 18. `contratos_empreiteiro`
Contratos vinculados a uma obra e empreiteiro.
- `id`: UUID (PK)
- `obra_id`: UUID REFERENCES obras(id) ON DELETE CASCADE
- `empreiteiro_id`: UUID REFERENCES empreiteiros(id)
- `tipo_contrato`: VARCHAR(50) (valor_fechado, por_medicao)
- `valor_total`: DECIMAL(12,2)
- `data_assinatura`: DATE
- `data_termino`: DATE
- `escopo`: TEXT
- `condicoes_pagamento`: TEXT
- `status`: VARCHAR(50) DEFAULT 'ativo'
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()

### 19. `medicoes_empreiteiro`
Medições de serviço para contratos por medição.
- `id`: UUID (PK)
- `contrato_id`: UUID REFERENCES contratos_empreiteiro(id) ON DELETE CASCADE
- `data_medicao`: DATE
- `quantidade_executada`: DECIMAL(10,3)
- `preco_unitario`: DECIMAL(12,2)
- `valor_pagar`: DECIMAL(12,2)
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()

### 20. `receitas`
Recebimentos e faturamentos programados/realizados da obra.
- `id`: UUID (PK)
- `obra_id`: UUID REFERENCES obras(id) ON DELETE CASCADE
- `descricao`: VARCHAR(255)
- `data_receita`: DATE
- `valor`: DECIMAL(12,2)
- `status`: VARCHAR(50) DEFAULT 'pendente' (pendente, recebido)
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()

### 21. `caixa_pequeno`
Despesas imediatas de canteiro que demandam fluxo de aprovação.
- `id`: UUID (PK)
- `obra_id`: UUID REFERENCES obras(id) ON DELETE CASCADE
- `data`: DATE
- `descricao`: VARCHAR(255)
- `valor`: DECIMAL(12,2)
- `categoria`: VARCHAR(100)
- `status`: VARCHAR(50) DEFAULT 'pendente_aprovacao' (pendente_aprovacao, aprovado)
- `created_by`: UUID REFERENCES auth.users(id)
- `approved_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP DEFAULT NOW()
- `approved_at`: TIMESTAMP

### 22. `orcamentos`
Propostas comerciais e orçamentos persistidos para clientes ou obras.
- `id`: UUID (PK, `gen_random_uuid()`)
- `obra_id`: UUID REFERENCES obras(id) ON DELETE SET NULL (vínculo opcional com obra)
- `numero`: VARCHAR(50) NOT NULL UNIQUE (ex: 'ORC-2026-001')
- `cliente_nome`: VARCHAR(255) NOT NULL
- `cliente_contato`: VARCHAR(255)
- `subtotal`: DECIMAL(12,2) NOT NULL DEFAULT 0.00
- `desconto_total`: DECIMAL(12,2) NOT NULL DEFAULT 0.00
- `valor_total`: DECIMAL(12,2) NOT NULL DEFAULT 0.00
- `validade_dias`: INTEGER DEFAULT 30
- `status`: VARCHAR(50) NOT NULL DEFAULT 'rascunho' (rascunho, enviado, aprovado, recusado)
- `observacoes`: TEXT
- `created_by`: UUID REFERENCES auth.users(id)
- `created_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- `updated_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()

### 23. `orcamento_itens`
Itens e serviços que compõem o orçamento emitido.
- `id`: UUID (PK, `gen_random_uuid()`)
- `orcamento_id`: UUID REFERENCES orcamentos(id) ON DELETE CASCADE
- `servico_id`: UUID REFERENCES servicos(id) ON DELETE SET NULL
- `descricao`: VARCHAR(255) NOT NULL
- `quantidade`: DECIMAL(10,3) NOT NULL DEFAULT 1.000
- `preco_unitario`: DECIMAL(12,2) NOT NULL DEFAULT 0.00
- `desconto_percentual`: DECIMAL(5,2) DEFAULT 0.00
- `subtotal`: DECIMAL(12,2) GENERATED ALWAYS AS ((quantidade * preco_unitario) - ((quantidade * preco_unitario) * (desconto_percentual / 100))) STORED
- `created_at`: TIMESTAMP WITH TIME ZONE DEFAULT NOW()


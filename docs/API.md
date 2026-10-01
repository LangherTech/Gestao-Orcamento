# Contratos da API RESTful (FastAPI)

Base URL:
- Produção: `https://edifica-api.onrender.com/api/v1`
- Desenvolvimento: `http://localhost:8000/api/v1`

Autenticação:
- Padrão: Bearer Token via cabeçalho `Authorization: Bearer <supabase_jwt>`
- Validado contra a chave pública/secret do Supabase.

---

## 1. Módulo: Autenticação (`/auth`)
- `POST /auth/login`: Autenticação via email e senha
- `POST /auth/logout`: Revogação da sessão
- `GET /auth/me`: Retorna os dados do usuário autenticado
- `POST /auth/refresh`: Renovação do access token

## 2. Módulo: Obras (`/obras`)
- `GET /obras`: Listagem de obras (filtro opcional por status)
- `GET /obras/{id}`: Detalhamento de uma obra específica
- `POST /obras`: Criação de nova obra
- `PUT /obras/{id}`: Atualização cadastral da obra
- `DELETE /obras/{id}`: Remoção lógica/física da obra

## 3. Módulo: Serviços e Orçamento (`/servicos`)
- `GET /servicos?obra_id={obra_id}`: Listar serviços da obra
- `GET /servicos/{id}`: Detalhe do serviço com materiais
- `POST /servicos`: Cadastrar novo serviço
- `PUT /servicos/{id}`: Editar serviço
- `DELETE /servicos/{id}`: Remover serviço
- `GET /servicos/{id}/materiais`: Listar materiais vinculados com rendimentos
- `POST /servicos/{id}/materiais`: Vincular insumo ao serviço
- `GET /servicos/orcamentos`: Listar propostas/orçamentos persistidos (filtros por `obra_id`, `status`, `search`)
- `GET /servicos/orcamentos/{id}`: Detalhe do orçamento e seus itens
- `POST /servicos/orcamentos`: Salvar novo orçamento comercial com itens
- `PATCH /servicos/orcamentos/{id}/status`: Atualizar status (`rascunho`, `enviado`, `aprovado`, `recusado`). Ao aprovar, sincroniza o orçamento da obra
- `DELETE /servicos/orcamentos/{id}`: Remover proposta de orçamento
- `POST /servicos/orcamento/gerar`: Simulação efêmera de cálculo de orçamento
- `GET /tabela-valores?obra_id={obra_id}`: Consulta de preços por região/fornecedor
- `POST /tabela-valores`: Lançamento de preço na tabela


## 4. Módulo: Calendário e Equipe (`/calendario`)
- `GET /calendario/alocacoes?obra_id=&data_inicio=&data_fim=`: Consultar alocações
- `POST /calendario/alocacoes`: Alocar colaborador na obra (dia inteiro/manhã/tarde)
- `PUT /calendario/alocacoes/{id}`: Editar alocação
- `DELETE /calendario/alocacoes/{id}`: Desalocar colaborador
- `GET /calendario/compromissos?obra_id=`: Listar compromissos gerais
- `POST /calendario/compromissos`: Agendar novo compromisso

## 5. Módulo: Diário de Obra - RDO (`/rdo`)
- `GET /rdo?obra_id=&data=`: Listar ou buscar RDO por data
- `GET /rdo/{id}`: Detalhes completos do RDO do dia
- `POST /rdo`: Criar apontamento do dia
- `PUT /rdo/{id}`: Atualizar apontamento
- `GET /rdo/{id}/fotos`: Listar imagens anexas
- `POST /rdo/{id}/fotos`: Upload de foto da obra
- `GET /rdo/relatorio-semanal?obra_id=&semana=`: Consolidado semanal de ocorrências e riscos

## 6. Módulo: Compras (`/compras`)
- `GET /compras/pedidos?obra_id=`: Listar pedidos de compra
- `GET /compras/pedidos/{id}`: Detalhes do pedido e itens
- `POST /compras/pedidos`: Emitir pedido de compra
- `PUT /compras/pedidos/{id}`: Atualizar status do pedido (cotacao, aprovado, recebido, pago)
- `GET /compras/cotacoes?obra_id=`: Listar cotações ativas
- `POST /compras/cotacoes`: Lançar cotação no mapa comparativo
- `GET /compras/fornecedores`: Listagem de fornecedores cadastrados
- `POST /compras/recebimentos`: Dar entrada física na compra

## 7. Módulo: Cronograma (`/cronograma`)
- `GET /cronograma/etapas?obra_id=`: Árvore de etapas e sub-etapas
- `GET /cronograma/etapas/{id}`: Detalhe da etapa
- `POST /cronograma/etapas`: Criar etapa
- `PUT /cronograma/etapas/{id}`: Atualizar progresso e datas previstas/reais
- `GET /cronograma/checklists?etapa_id=`: Listar itens de inspeção
- `POST /cronograma/checklists`: Registrar checklist de qualidade

## 8. Módulo: Gestão de Empreiteiros (`/gestao`)
- `GET /gestao/empreiteiros`: Listar terceirizados
- `POST /gestao/empreiteiros`: Cadastrar empreiteiro
- `GET /gestao/contratos?obra_id=`: Listar contratos ativos
- `POST /gestao/contratos`: Firmar novo contrato (fechado ou medição)
- `GET /gestao/medicoes?contrato_id=`: Listar boletins de medição
- `POST /gestao/medicoes`: Lançar medição executada

## 9. Módulo: Financeiro (`/financeiro`)
- `GET /financeiro/fluxo?obra_id=`: Extrato do fluxo de caixa da obra
- `GET /financeiro/receitas?obra_id=`: Listagem de receitas
- `POST /financeiro/receitas`: Lançar recebimento
- `GET /financeiro/caixa-pequeno?obra_id=`: Despesas de pronto pagamento
- `POST /financeiro/caixa-pequeno`: Solicitar reembolso/gasto de canteiro
- `PUT /financeiro/caixa-pequeno/{id}`: Aprovar despesa de caixa pequeno
- `GET /financeiro/orcado-x-realizado?obra_id=`: Comparativo de orçado vs realizado

## 10. Módulo: Dashboards (`/dashboards`)
- `GET /dashboards/kpis?obra_id=`: 4 cards principais (consolidado ou por obra)
- `GET /dashboards/receita-vs-despesa?obra_id=`: Série temporal comparativa
- `GET /dashboards/orcado-vs-realizado?obra_id=`: Análise de aderência ao orçamento
- `GET /dashboards/lucratividade-por-obra`: Ranking de margem de lucro entre obras
- `GET /dashboards/progresso-cronograma?obra_id=`: Percentual físico executado

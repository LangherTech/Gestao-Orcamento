---
trigger: always_on
---

Diretrizes Operacionais para o Agente — Projeto Edifica

Este documento define as regras fundamentais de conduta e controle de versão para o agente de desenvolvimento no ambiente Antigravity.

1. Regra Inegociável Pré-Execução (Git Commit & Push Obrigatório)

Antes de iniciar qualquer tarefa, análise destrutiva ou modificar qualquer arquivo do repositório, o agente deve obrigatoriamente assegurar que o estado atual do projeto esteja completamente salvo e sincronizado no GitHub.

Checklist Obrigatório Pré-Edição:

Verificar a branch ativa:

O desenvolvimento e os testes ocorrem na branch Teste.

Confirme com git branch --show-current. Se não estiver na branch correta, alterne com:

git checkout Teste


Verificar alterações pendentes:

Execute git status.

Commit Completo e Push:

Havendo qualquer alteração não commitada (arquivos modificados, novos arquivos não rastreados ou remoções), execute a sequência completa:

git add .
git commit -m "checkpoint: estado do projeto antes de <descrever brevemente a tarefa atual>"
git push origin Teste


O push para a branch Teste é mandatório antes de qualquer edição de código.

2. Padrões de Desenvolvimento e Engenharia

Inspeção Prévia:

Analise a arquitetura existente, componentes compartilhados e tipos TypeScript antes de propor ou aplicar refatorações.

Evite duplicar lógicas já existentes na base de código.

Stack Tecnológica:

Frontend: React, TypeScript, Tailwind CSS.

Backend / Autenticação / Banco: Supabase (PostgreSQL, PostgREST, Auth).

Mantenha a consistência de estilo, tema visual (Dark Theme) e tipagem rigorosa.

Validação:

Assegure que as alterações não introduzam erros de compilação, problemas de importação ou quebras de tipos.

3. Finalização da Tarefa

Ao concluir a tarefa solicitada e validar a solução:

Revise as alterações com git diff ou git status.

Realize novo commit semântico explicando com clareza as modificações implementadas:

git add .
git commit -m "feat/fix: <resumo das alterações realizadas>"
git push origin Teste

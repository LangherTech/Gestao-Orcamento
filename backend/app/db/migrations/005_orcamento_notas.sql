-- ==============================================================================
-- SISTEMA EDIFICA — GESTÃO DE ORÇAMENTOS E OBRAS
-- Migração 005_orcamento_notas.sql: Adiciona campo de bloco de notas interno
-- ==============================================================================

ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS notas TEXT;

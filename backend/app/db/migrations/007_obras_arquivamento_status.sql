-- ==============================================================================
-- SISTEMA EDIFICA — GESTÃO DE ORÇAMENTOS E OBRAS
-- Migração 007_obras_arquivamento_status.sql: Arquivamento e ciclo de vida de obras
-- ==============================================================================

ALTER TABLE obras ADD COLUMN IF NOT EXISTS arquivada BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_obras_arquivada ON obras(arquivada);

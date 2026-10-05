-- Migration 010: Faltas de Funcionários no Calendário
CREATE TABLE IF NOT EXISTS calendario_faltas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
    data DATE NOT NULL,
    motivo VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (funcionario_id, data)
);

CREATE INDEX IF NOT EXISTS idx_calendario_faltas_funcionario ON calendario_faltas(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_calendario_faltas_data ON calendario_faltas(data);

ALTER TABLE calendario_faltas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for dev and auth" ON calendario_faltas;
CREATE POLICY "Allow all for dev and auth" ON calendario_faltas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

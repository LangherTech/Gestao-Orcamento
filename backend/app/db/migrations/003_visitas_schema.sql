CREATE TABLE IF NOT EXISTS visitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    endereco TEXT,
    contato VARCHAR(100),
    classificacao VARCHAR(50) DEFAULT 'Normal',
    observacao TEXT,
    data_visita DATE NOT NULL DEFAULT CURRENT_DATE,
    visitado_por UUID REFERENCES auth.users(id),
    cadastrado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

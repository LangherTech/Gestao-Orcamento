-- ==============================================================================
-- SISTEMA EDIFICA — GESTÃO DE ORÇAMENTOS E OBRAS
-- Migração 003_rls_security.sql: Habilitar RLS em todas as tabelas
-- ==============================================================================

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        
        -- Drop policy if it already exists to avoid errors
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users only" ON public.%I;', t_name);
        
        -- Create the standard policy for authenticated users
        EXECUTE format('CREATE POLICY "Authenticated users only" ON public.%I FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);', t_name);
    END LOOP;
END
$$;

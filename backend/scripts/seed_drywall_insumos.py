import sys
import os

# Ajusta path para importar o app
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.db.client import get_supabase_client

supabase = get_supabase_client()
if not supabase:
    print("Failed to connect to Supabase.")
    sys.exit(1)

# Novos insumos para inserir
novos_insumos = [
    {
        "nome": "Bucha com Parafuso",
        "unidade": "un",
        "preco_medio": 0.50,
        "categoria": "Fixação"
    },
    {
        "nome": "Fita Telada/Papel",
        "unidade": "rl",
        "preco_medio": 20.00,
        "categoria": "Acabamento"
    },
    {
        "nome": "Massa para Drywall",
        "unidade": "bd",
        "preco_medio": 45.00,
        "categoria": "Acabamento"
    },
    {
        "nome": "Banda Acústica",
        "unidade": "rl",
        "preco_medio": 35.00,
        "categoria": "Isolamento"
    }
]

# 1. Inserir materiais e recuperar seus IDs
ids = {}
for insumo in novos_insumos:
    # Verifica se já existe
    res = supabase.table("materiais").select("id").eq("nome", insumo["nome"]).execute()
    if res.data:
        ids[insumo["nome"]] = res.data[0]["id"]
        print(f"Material já existe: {insumo['nome']} ({ids[insumo['nome']]})")
    else:
        # Insere novo
        res = supabase.table("materiais").insert(insumo).execute()
        if res.data:
            ids[insumo["nome"]] = res.data[0]["id"]
            print(f"Material inserido: {insumo['nome']} ({ids[insumo['nome']]})")

# 2. Inserir ou atualizar os vínculos na tabela assistente_insumos
vinculos = [
    {
        "assistente": "drywall",
        "papel": "bucha",
        "material_id": ids["Bucha com Parafuso"],
        "fator_conversao": 1.0,
        "unidade_uso": "un"
    },
    {
        "assistente": "drywall",
        "papel": "fita",
        "material_id": ids["Fita Telada/Papel"],
        "fator_conversao": 90.0,  # 1 rolo = 90m
        "unidade_uso": "m"
    },
    {
        "assistente": "drywall",
        "papel": "massa",
        "material_id": ids["Massa para Drywall"],
        "fator_conversao": 20.0,  # 1 balde = 20kg
        "unidade_uso": "kg"
    },
    {
        "assistente": "drywall",
        "papel": "banda",
        "material_id": ids["Banda Acústica"],
        "fator_conversao": 10.0,  # 1 rolo = 10m
        "unidade_uso": "m"
    }
]

for v in vinculos:
    # Update or insert
    res = supabase.table("assistente_insumos").select("id").eq("assistente", v["assistente"]).eq("papel", v["papel"]).execute()
    
    # We need to use raw SQL if upsert fails because of uniqueness? Let's just update if exists, insert if not.
    if res.data:
        # Update
        supabase.table("assistente_insumos").update({
            "material_id": v["material_id"],
            "fator_conversao": v["fator_conversao"]
        }).eq("id", res.data[0]["id"]).execute()
        print(f"Vínculo atualizado: {v['papel']}")
    else:
        # Insert
        try:
            supabase.table("assistente_insumos").insert(v).execute()
            print(f"Vínculo inserido: {v['papel']}")
        except Exception as e:
            # Maybe the column unidade_uso doesn't exist? We'll check that.
            print(f"Erro ao inserir {v['papel']}: {e}")


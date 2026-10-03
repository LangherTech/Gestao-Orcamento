import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.db.client import get_supabase_client

supabase = get_supabase_client()

novos_insumos = [
    {
        "nome": "Bucha com Parafuso",
        "unidade": "un",
        "preco_medio": 0.10,
        "papel_id": "bucha"
    },
    {
        "nome": "Fita Telada/Papel",
        "unidade": "rl",
        "preco_medio": 20.00,
        "papel_id": "fita"
    },
    {
        "nome": "Massa para Drywall",
        "unidade": "bd",
        "preco_medio": 40.00,
        "papel_id": "massa"
    },
    {
        "nome": "Banda Acústica",
        "unidade": "rl",
        "preco_medio": 25.00,
        "papel_id": "banda"
    }
]

for insumo in novos_insumos:
    papel_id = insumo.pop("papel_id")
    # Tenta inserir o material se não existir
    res_mat = supabase.table("materiais").select("id").eq("nome", insumo["nome"]).execute()
    if res_mat.data:
        mat_id = res_mat.data[0]["id"]
    else:
        res_insert = supabase.table("materiais").insert(insumo).execute()
        mat_id = res_insert.data[0]["id"]
        
    # Atualiza a tabela de vinculo
    supabase.table("assistente_insumos").update({"material_id": mat_id}).eq("assistente", "drywall").eq("papel", papel_id).execute()
    print(f"Vinculado {insumo['nome']} ao papel {papel_id}")

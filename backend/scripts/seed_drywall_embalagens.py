import sys, os, math
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.db.client import get_supabase_client

supabase = get_supabase_client()
if not supabase:
    print("No Supabase!")
    sys.exit(1)

materiais = [
    {"nome": "Placa de Gesso ST 1.20x1.80", "unidade": "un", "preco_medio": 35.0},
    {"nome": "Placa de Gesso ST 1.20x2.40", "unidade": "un", "preco_medio": 45.0},
    {"nome": "Placa de Gesso RU 1.20x1.80", "unidade": "un", "preco_medio": 50.0},
    {"nome": "Placa de Gesso RF 1.20x1.80", "unidade": "un", "preco_medio": 55.0},
    {"nome": "Montante 70mm", "unidade": "barra", "preco_medio": 18.0},
    {"nome": "Guia 70mm", "unidade": "barra", "preco_medio": 16.0},
    {"nome": "Parafuso GN 25", "unidade": "un", "preco_medio": 0.0},
    {"nome": "Parafuso LB 13", "unidade": "un", "preco_medio": 0.0},
    {"nome": "Bucha e Parafuso 6mm", "unidade": "un", "preco_medio": 0.0},
    {"nome": "Fita Microperfurada", "unidade": "m", "preco_medio": 0.0},
    {"nome": "Massa de Junta", "unidade": "kg", "preco_medio": 0.0},
    {"nome": "Banda Acústica", "unidade": "m", "preco_medio": 0.0},
]

embalagens_map = {
    "Parafuso GN 25": [
        {"nome": "Caixa 100 un", "quantidade_unidades": 100, "unidade_compra": "caixa", "preco": 8.0, "padrao": False},
        {"nome": "Caixa 1000 un", "quantidade_unidades": 1000, "unidade_compra": "caixa", "preco": 28.0, "padrao": True}
    ],
    "Parafuso LB 13": [
        {"nome": "Caixa 1000 un", "quantidade_unidades": 1000, "unidade_compra": "caixa", "preco": 30.0, "padrao": True}
    ],
    "Bucha e Parafuso 6mm": [
        {"nome": "Pacote 100 un", "quantidade_unidades": 100, "unidade_compra": "pacote", "preco": 15.0, "padrao": True}
    ],
    "Fita Microperfurada": [
        {"nome": "Rolo 90m", "quantidade_unidades": 90, "unidade_compra": "rolo", "preco": 20.0, "padrao": True}
    ],
    "Massa de Junta": [
        {"nome": "Balde 20kg", "quantidade_unidades": 20, "unidade_compra": "balde", "preco": 45.0, "padrao": True},
        {"nome": "Saco 5kg", "quantidade_unidades": 5, "unidade_compra": "saco", "preco": 15.0, "padrao": False}
    ],
    "Banda Acústica": [
        {"nome": "Rolo 10m", "quantidade_unidades": 10, "unidade_compra": "rolo", "preco": 35.0, "padrao": True}
    ]
}

vinculos = {
    "Placa de Gesso ST 1.20x1.80": ("placa_st", "un"),
    "Placa de Gesso RU 1.20x1.80": ("placa_ru", "un"),
    "Placa de Gesso RF 1.20x1.80": ("placa_rf", "un"),
    "Montante 70mm": ("montante", "barra"),
    "Guia 70mm": ("guia", "barra"),
    "Parafuso GN 25": ("parafuso_gn25", "un"),
    "Parafuso LB 13": ("parafuso_lb", "un"),
    "Bucha e Parafuso 6mm": ("bucha", "un"),
    "Fita Microperfurada": ("fita", "m"),
    "Massa de Junta": ("massa", "kg"),
    "Banda Acústica": ("banda", "m"),
}

for m in materiais:
    res = supabase.table("materiais").select("*").eq("nome", m["nome"]).execute()
    if res.data:
        m_id = res.data[0]["id"]
    else:
        res = supabase.table("materiais").insert(m).execute()
        m_id = res.data[0]["id"]

    # Insert embalagens
    if m["nome"] in embalagens_map:
        for emb in embalagens_map[m["nome"]]:
            emb_res = supabase.table("insumo_embalagens").select("*").eq("material_id", m_id).eq("nome", emb["nome"]).execute()
            if not emb_res.data:
                emb["material_id"] = m_id
                supabase.table("insumo_embalagens").insert(emb).execute()
    else:
        # Generic embalagem (1 unidade = 1 unidade_compra)
        emb_res = supabase.table("insumo_embalagens").select("*").eq("material_id", m_id).eq("nome", "Unidade").execute()
        if not emb_res.data:
            supabase.table("insumo_embalagens").insert({
                "material_id": m_id,
                "nome": "Unidade",
                "quantidade_unidades": 1.0,
                "unidade_compra": m["unidade"],
                "preco": m["preco_medio"],
                "padrao": True
            }).execute()

    # Link in assistente_insumos
    if m["nome"] in vinculos:
        papel, unid_uso = vinculos[m["nome"]]
        link_res = supabase.table("assistente_insumos").select("*").eq("assistente", "drywall").eq("papel", papel).execute()
        if link_res.data:
            supabase.table("assistente_insumos").update({"material_id": m_id, "unidade_uso": unid_uso}).eq("id", link_res.data[0]["id"]).execute()
        else:
            supabase.table("assistente_insumos").insert({
                "assistente": "drywall",
                "papel": papel,
                "material_id": m_id,
                "unidade_uso": unid_uso,
                "fator_conversao": 1.0
            }).execute()

print("Seeding completed.")

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

sys.path.append(str(Path(__file__).parent))
from app.db.client import get_supabase_client
from app.routes.servicos import calcular_totais_orcamento

def main():
    load_dotenv()
    supabase = get_supabase_client()
    if not supabase:
        print("Erro: Não foi possível conectar ao Supabase.")
        return

    print("Buscando orçamentos...")
    try:
        res = supabase.table("orcamentos").select("id, numero, subtotal, valor_total, margem_bdi_percentual, impostos_percentual, fornecimento_materiais, orcamento_itens(*)").execute()
        orcamentos = res.data
    except Exception as e:
        print(f"Erro ao buscar orçamentos: {e}")
        return

    if not orcamentos:
        print("Nenhum orçamento encontrado.")
        return

    for orc in orcamentos:
        bdi = orc.get("margem_bdi_percentual")
        imp = orc.get("impostos_percentual")
        
        if bdi == 0 and imp == 0:
            print(f"[VERIFICAR] Orçamento {orc.get('numero')} ({orc['id']}) - BDI e Impostos estão zerados. Não será recalculado automaticamente.")
            continue
            
        bdi = bdi or 0.0
        imp = imp or 0.0
        forn = orc.get("fornecimento_materiais") or "edifica"
        itens = orc.get("orcamento_itens", [])
        
        antigo_subtotal = orc.get("subtotal") or 0.0
        antigo_total = orc.get("valor_total") or 0.0
        
        subtotal_novo, valor_total_novo = calcular_totais_orcamento(itens, bdi, imp, forn)
        
        if abs(antigo_subtotal - subtotal_novo) > 0.01 or abs(antigo_total - valor_total_novo) > 0.01:
            print(f"[RECALCULANDO] Orçamento {orc.get('numero')}:")
            print(f"  - Antes: Subtotal = {antigo_subtotal:.2f}, Total = {antigo_total:.2f}")
            print(f"  - Depois: Subtotal = {subtotal_novo:.2f}, Total = {valor_total_novo:.2f}")
            
            try:
                # Update subtotal items
                for it in itens:
                    supabase.table("orcamento_itens").update({"subtotal": it["subtotal"]}).eq("id", it["id"]).execute()
                    
                # Update head
                supabase.table("orcamentos").update({"subtotal": subtotal_novo, "valor_total": valor_total_novo}).eq("id", orc["id"]).execute()
                print("  -> Atualizado com sucesso.")
            except Exception as e:
                print(f"  -> Erro ao atualizar: {e}")
        else:
            print(f"[OK] Orçamento {orc.get('numero')} sem alterações necessárias.")

if __name__ == "__main__":
    main()

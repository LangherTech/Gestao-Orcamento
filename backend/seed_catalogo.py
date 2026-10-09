import sys

alvenaria_list = [
    ("Mobilização, proteção e limpeza inicial", "vb"),
    ("Locação / marcação da obra", "m²"),
    ("Escavação", "m³"),
    ("Fundação / baldrame", "m³"),
    ("Impermeabilização de baldrame", "m²"),
    ("Aterro e compactação", "m³"),
    ("Contrapiso", "m²"),
    ("Alvenaria de vedação – blocos/tijolos", "m²"),
    ("Vergas e contravergas", "m"),
    ("Pilares, vigas e cintas", "m³"),
    ("Laje pré-moldada / treliçada", "m²"),
    ("Chapisco", "m²"),
    ("Emboço / reboco interno", "m²"),
    ("Emboço / reboco externo", "m²"),
    ("Impermeabilização áreas molhadas", "m²"),
    ("Regularização de piso", "m²"),
    ("Assentamento de porcelanato / cerâmica", "m²"),
    ("Revestimento cerâmico de paredes", "m²"),
    ("Rodapé", "m"),
    ("Massa corrida / massa acrílica", "m²"),
    ("Selador / fundo preparador", "m²"),
    ("Pintura interna – paredes", "m²"),
    ("Pintura interna – tetos", "m²"),
    ("Pintura externa / fachada", "m²"),
    ("Portas e batentes", "un"),
    ("Janelas / esquadrias", "un"),
    ("Instalações hidráulicas – água", "pt"),
    ("Instalações sanitárias / esgoto", "pt"),
    ("Louças e metais", "un"),
    ("Instalações elétricas – tomadas", "pt"),
    ("Instalações elétricas – iluminação", "pt"),
    ("Quadro elétrico / disjuntores", "un"),
    ("Cobertura / estrutura do telhado", "m²"),
    ("Telhamento", "m²"),
    ("Calhas e rufos", "m"),
    ("Forro", "m²"),
    ("Limpeza final e entrega", "vb")
]

drywall_list = [
    ("Mobilização, proteção e limpeza inicial", "vb"),
    ("Parede drywall ST – estrutura + chapas", "m²"),
    ("Parede drywall RU – áreas úmidas", "m²"),
    ("Parede drywall RF – resistente ao fogo", "m²"),
    ("Parede drywall dupla chapa", "m²"),
    ("Lã mineral / lã PET para isolamento", "m²"),
    ("Reforço interno em OSB / madeira", "m²"),
    ("Forro drywall liso", "m²"),
    ("Sanca / cortineiro em drywall", "m"),
    ("Tabica / negativo", "m"),
    ("Fechamento de shafts", "m²"),
    ("Revestimento de parede com drywall", "m²"),
    ("Tratamento de juntas – fita + massa", "m²"),
    ("Massa corrida para acabamento", "m²"),
    ("Selador / fundo preparador", "m²"),
    ("Pintura com tinta lavável", "m²"),
    ("Porta para parede drywall", "un"),
    ("Reforço para porta", "un"),
    ("Visor / vidro fixo em parede drywall", "m²"),
    ("Recortes para elétrica / hidráulica", "pt"),
    ("Reforços para TV, armários e bancadas", "un"),
    ("Alçapão de inspeção", "un"),
    ("Desmontagem / retirada de drywall existente", "m²"),
    ("Transporte e descarte de entulho", "vb"),
    ("Limpeza final e entrega", "vb")
]

from app.db.client import get_db_connection

def seed():
    conn = get_db_connection()
    if not conn:
        print("Erro de conexao")
        return

    try:
        existing_servicos = conn.run("SELECT nome FROM servicos")
        existing_names = [row[0] for row in existing_servicos]
        
        count = 0
        for nome, unidade in alvenaria_list:
            if nome not in existing_names:
                conn.run(
                    "INSERT INTO servicos (nome, categoria, unidade, preco_total, mao_de_obra, margem_lucro) VALUES (:nome, :categoria, :unidade, :preco, :mao, :lucro)",
                    nome=nome, categoria="Alvenaria", unidade=unidade, preco=0.0, mao=0.0, lucro=0.0
                )
                count += 1
                existing_names.append(nome)

        existing_drywall = conn.run("SELECT nome FROM servicos WHERE categoria = :cat", cat="Drywall")
        existing_drywall_names = [row[0] for row in existing_drywall]
        for nome, unidade in drywall_list:
            if nome not in existing_drywall_names:
                conn.run(
                    "INSERT INTO servicos (nome, categoria, unidade, preco_total, mao_de_obra, margem_lucro) VALUES (:nome, :categoria, :unidade, :preco, :mao, :lucro)",
                    nome=nome, categoria="Drywall", unidade=unidade, preco=0.0, mao=0.0, lucro=0.0
                )
                count += 1
                existing_drywall_names.append(nome)
        
        print(f"Inseridos {count} serviços no catálogo.")
    except Exception as e:
        print("Erro:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    seed()

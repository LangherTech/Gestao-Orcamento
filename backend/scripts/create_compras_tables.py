import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.client import get_db_connection

def setup_compras_tables():
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return

    try:
        conn.run("""
        CREATE TABLE IF NOT EXISTS fornecedores (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome VARCHAR(255) NOT NULL,
            cnpj VARCHAR(18),
            telefone VARCHAR(20),
            email VARCHAR(255),
            endereco TEXT,
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMP DEFAULT NOW()
        );
        """)

        conn.run("""
        CREATE TABLE IF NOT EXISTS pedidos_compra (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
            fornecedor_id UUID REFERENCES fornecedores(id),
            numero VARCHAR(50) UNIQUE,
            data_pedido DATE,
            data_entrega_prevista DATE,
            valor_total DECIMAL(12,2) DEFAULT 0.0,
            status VARCHAR(50) DEFAULT 'cotacao',
            created_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        """)

        conn.run("""
        CREATE TABLE IF NOT EXISTS pedido_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            pedido_id UUID REFERENCES pedidos_compra(id) ON DELETE CASCADE,
            descricao VARCHAR(255) NOT NULL,
            quantidade DECIMAL(10,3) DEFAULT 1.0,
            preco_unitario DECIMAL(12,2) DEFAULT 0.0,
            subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED
        );
        """)
        print("Tables checked/created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    setup_compras_tables()

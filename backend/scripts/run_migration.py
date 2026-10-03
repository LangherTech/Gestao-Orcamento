import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("No DATABASE_URL found")
    exit(1)

conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

with open("backend/app/db/migrations/005_assistente_insumos.sql", "r") as f:
    sql = f.read()
    print("Executing 005_assistente_insumos.sql...")
    cur.execute(sql)
    print("Migration executed successfully.")

cur.close()
conn.close()

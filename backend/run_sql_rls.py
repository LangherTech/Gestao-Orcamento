import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")

conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

with open("app/db/migrations/003_rls_security.sql", "r") as f:
    sql = f.read()
    print("Executing 003_rls_security.sql...")
    cur.execute(sql)
    print("Success! RLS applied.")

cur.close()
conn.close()

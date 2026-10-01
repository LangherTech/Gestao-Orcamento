import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")

conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

# Run migration 002
with open("app/db/migrations/002_orcamentos_schema.sql", "r") as f:
    sql = f.read()
    print("Executing 002_orcamentos_schema.sql...")
    cur.execute(sql)
    print("Success!")

# Get all tables
cur.execute("""
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public';
""")
tables = [row[0] for row in cur.fetchall()]
print("Tables in public schema:", tables)

cur.close()
conn.close()

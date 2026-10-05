import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("../.env")

DATABASE_URL = os.getenv("DATABASE_URL")

migration_file = "../app/db/migrations/008_terceiros_v2.sql"

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    with open(migration_file, 'r') as f:
        sql = f.read()
        
    print(f"Executing {migration_file}...")
    cur.execute(sql)
    print("Migration applied successfully!")
    
except Exception as e:
    print(f"Error applying migration: {e}")
finally:
    if 'conn' in locals():
        conn.close()

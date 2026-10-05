import os
from dotenv import load_dotenv
import psycopg2
import sys

def main():
    load_dotenv("backend/.env")
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("No DATABASE_URL found")
        sys.exit(1)

    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    with open("backend/app/db/migrations/007_terceiros.sql", "r") as f:
        sql = f.read()
        print("Executing 007_terceiros.sql...")
        cur.execute(sql)
        print("Migration executed successfully.")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()

import sys
import os
import sqlite3
import argparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def seed_sqlite(db_path: str):
    print(f"[INFO] Seeding SQLite database at {db_path}...")
    db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    schema_sql = """
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS customers;

    CREATE TABLE customers (
        customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        region TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE products (
        product_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        stock_quantity INTEGER NOT NULL
    );

    CREATE TABLE orders (
        order_id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers(customer_id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
        order_date TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'))
    );

    INSERT INTO customers (name, email, region) VALUES
    ('Aarav Mehta', 'aarav@example.com', 'West'),
    ('Priya Sharma', 'priya@example.com', 'North'),
    ('Rohan Patel', 'rohan@example.com', 'West'),
    ('Ananya Iyer', 'ananya@example.com', 'South');

    INSERT INTO products (product_name, category, price, stock_quantity) VALUES
    ('Enterprise Analytics Suite', 'Software', 1500.00, 50),
    ('Cloud Database Connector', 'Software', 499.99, 100),
    ('AI Agent Server', 'Hardware', 3500.00, 15),
    ('Developer Workstation', 'Hardware', 2200.00, 25);

    INSERT INTO orders (customer_id, product_id, order_date, quantity, total_amount, status) VALUES
    (1, 1, '2026-01-15', 2, 3000.00, 'COMPLETED'),
    (2, 2, '2026-01-20', 1, 499.99, 'COMPLETED'),
    (3, 3, '2026-02-01', 1, 3500.00, 'PENDING'),
    (4, 4, '2026-02-10', 2, 4400.00, 'COMPLETED'),
    (1, 2, '2026-02-15', 3, 1499.97, 'CANCELLED');
    """

    cursor.executescript(schema_sql)
    conn.commit()
    cursor.close()
    conn.close()
    print("[SUCCESS] SQLite database successfully initialized and seeded!")

def seed_postgres(database_url: str):
    import psycopg2
    print(f"[INFO] Seeding PostgreSQL database...")
    conn = psycopg2.connect(database_url)
    conn.autocommit = True
    cursor = conn.cursor()

    schema_sql = """
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS customers CASCADE;

    CREATE TABLE customers (
        customer_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        region VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE products (
        product_id SERIAL PRIMARY KEY,
        product_name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock_quantity INT NOT NULL
    );

    CREATE TABLE orders (
        order_id SERIAL PRIMARY KEY,
        customer_id INT REFERENCES customers(customer_id) ON DELETE CASCADE,
        product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
        order_date DATE NOT NULL,
        quantity INT NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'))
    );

    INSERT INTO customers (name, email, region) VALUES
    ('Aarav Mehta', 'aarav@example.com', 'West'),
    ('Priya Sharma', 'priya@example.com', 'North'),
    ('Rohan Patel', 'rohan@example.com', 'West'),
    ('Ananya Iyer', 'ananya@example.com', 'South');

    INSERT INTO products (product_name, category, price, stock_quantity) VALUES
    ('Enterprise Analytics Suite', 'Software', 1500.00, 50),
    ('Cloud Database Connector', 'Software', 499.99, 100),
    ('AI Agent Server', 'Hardware', 3500.00, 15),
    ('Developer Workstation', 'Hardware', 2200.00, 25);

    INSERT INTO orders (customer_id, product_id, order_date, quantity, total_amount, status) VALUES
    (1, 1, '2026-01-15', 2, 3000.00, 'COMPLETED'),
    (2, 2, '2026-01-20', 1, 499.99, 'COMPLETED'),
    (3, 3, '2026-02-01', 1, 3500.00, 'PENDING'),
    (4, 4, '2026-02-10', 2, 4400.00, 'COMPLETED'),
    (1, 2, '2026-02-15', 3, 1499.97, 'CANCELLED');
    """

    cursor.execute(schema_sql)
    cursor.close()
    conn.close()
    print("[SUCCESS] PostgreSQL database successfully initialized and seeded!")

def main():
    parser = argparse.ArgumentParser(description="Seed database for SQLGuard.")
    parser.add_argument("--target", choices=["sqlite", "postgres", "supabase"], default="sqlite", help="Target database system")
    args = parser.parse_args()

    if args.target == "sqlite":
        seed_sqlite(settings.SQLITE_DB_PATH)
    else:
        seed_postgres(settings.DATABASE_URL)

if __name__ == "__main__":
    main()
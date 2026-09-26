import sqlite3
from app.core.db_factory import get_db_connection as factory_get_db_connection

def get_database_schema(db_config: dict = None) -> str:
    """
    Description: Introspects connected database (SQLite or PostgreSQL) dynamically.
    Usecase: Extracts table structure, column types, and foreign key relations for LLM context.
    """
    conn, dialect = factory_get_db_connection(db_config)
    cursor = conn.cursor()

    if dialect == "sqlite":
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [row["name"] for row in cursor.fetchall()]

        tables_dict = {}
        fk_list = []

        for table_name in tables:
            tables_dict[table_name] = []
            cursor.execute(f"PRAGMA table_info('{table_name}');")
            for col in cursor.fetchall():
                tables_dict[table_name].append(f"{col['name']} ({col['type']})")

            cursor.execute(f"PRAGMA foreign_key_list('{table_name}');")
            for fk in cursor.fetchall():
                fk_list.append(f"- {table_name}.{fk['from']} references {fk['table']}.{fk['to']}")

        cursor.close()
        conn.close()

        schema_str = "DATABASE SCHEMA:\n"
        for table_name, cols in tables_dict.items():
            schema_str += f"- Table '{table_name}': " + ", ".join(cols) + "\n"

        if fk_list:
            schema_str += "\nFOREIGN KEY RELATIONSHIPS:\n" + "\n".join(fk_list) + "\n"

        return schema_str

    else:
        # PostgreSQL Introspection
        columns_query = """
        SELECT 
            table_name, 
            column_name, 
            data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        ORDER BY table_name, ordinal_position;
        """

        fk_query = """
        SELECT
            tc.table_name AS foreign_table,
            kcu.column_name AS foreign_column,
            ccu.table_name AS primary_table,
            ccu.column_name AS primary_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY';
        """

        cursor.execute(columns_query)
        columns_data = cursor.fetchall()

        cursor.execute(fk_query)
        fk_data = cursor.fetchall()

        cursor.close()
        conn.close()

        tables_dict = {}
        for row in columns_data:
            t_name = row['table_name']
            c_info = f"{row['column_name']} ({row['data_type']})"
            if t_name not in tables_dict:
                tables_dict[t_name] = []
            tables_dict[t_name].append(c_info)

        schema_str = "DATABASE SCHEMA:\n"
        for table_name, cols in tables_dict.items():
            schema_str += f"- Table '{table_name}': " + ", ".join(cols) + "\n"

        if fk_data:
            schema_str += "\nFOREIGN KEY RELATIONSHIPS:\n"
            for fk in fk_data:
                schema_str += f"- {fk['foreign_table']}.{fk['foreign_column']} references {fk['primary_table']}.{fk['primary_column']}\n"

        return schema_str
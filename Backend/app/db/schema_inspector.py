import sqlite3
import time
import json
from app.core.db_factory import get_db_connection as factory_get_db_connection

_SCHEMA_INSPECTION_CACHE = {}

def get_database_schema(db_config: dict = None) -> str:
    """
    Description: Introspects connected database (SQLite, PostgreSQL, MySQL, or MongoDB) dynamically with 30s TTL cache.
    Usecase: Extracts table/collection structure, column/field types, and foreign key relations for LLM context without redundant DB roundtrips.
    """
    cache_key = json.dumps(db_config or {}, sort_keys=True)
    now = time.time()
    if cache_key in _SCHEMA_INSPECTION_CACHE:
        cached_schema, cached_time = _SCHEMA_INSPECTION_CACHE[cache_key]
        if now - cached_time < 30.0:
            return cached_schema

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

    elif dialect == "mongodb":
        db = conn.db
        collections = db.list_collection_names()
        tables_dict = {}

        # Default fallback schemas for known Mongoose collections if 0 docs exist in collection
        DEFAULT_MONGO_COLLECTION_FALLBACKS = {
            "contacts": {"_id": "string", "name": "string", "email": "string", "message": "string", "createdAt": "datetime", "updatedAt": "datetime"},
            "contact": {"_id": "string", "name": "string", "email": "string", "message": "string", "createdAt": "datetime", "updatedAt": "datetime"},
            "appointmentmedicalrecords": {"_id": "string", "doctor": "string", "user": "string", "recordDetails": "object", "createdAt": "datetime", "updatedAt": "datetime"},
            "appointmentmedicalrecord": {"_id": "string", "doctor": "string", "user": "string", "recordDetails": "object", "createdAt": "datetime", "updatedAt": "datetime"},
            "specializations": {"_id": "string", "name": "string", "description": "string", "createdAt": "datetime", "updatedAt": "datetime"},
            "specialization": {"_id": "string", "name": "string", "description": "string", "createdAt": "datetime", "updatedAt": "datetime"},
        }

        for col_name in collections:
            if col_name.startswith("system."):
                continue
            sample_docs = list(db[col_name].find({}).limit(50))
            fields = {}
            for doc in sample_docs:
                for k, v in doc.items():
                    if k not in fields:
                        v_type = type(v).__name__
                        if v_type in ("ObjectId", "str"):
                            v_type = "string"
                        elif v_type == "dict":
                            v_type = "object"
                        elif v_type == "list":
                            v_type = "array"
                        elif v_type == "int":
                            v_type = "number"
                        fields[k] = v_type

            if not fields:
                col_lower = col_name.lower().replace("-", "").replace("_", "")
                if col_lower in DEFAULT_MONGO_COLLECTION_FALLBACKS:
                    fields = DEFAULT_MONGO_COLLECTION_FALLBACKS[col_lower]
                else:
                    fields = {"_id": "string", "name": "string", "status": "string", "createdAt": "datetime"}

            cols_str_list = [f"{k} ({v_type})" for k, v_type in fields.items()]
            tables_dict[col_name] = cols_str_list

        conn.close()

        schema_str = "DATABASE SCHEMA:\n"
        for table_name, cols in tables_dict.items():
            schema_str += f"- Table '{table_name}': " + ", ".join(cols) + "\n"

        return schema_str

    elif dialect == "mysql":
        columns_query = """
        SELECT 
            TABLE_NAME as table_name, 
            COLUMN_NAME as column_name, 
            DATA_TYPE as data_type 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        ORDER BY TABLE_NAME, ORDINAL_POSITION;
        """
        fk_query = """
        SELECT
            TABLE_NAME as foreign_table,
            COLUMN_NAME as foreign_column,
            REFERENCED_TABLE_NAME as primary_table,
            REFERENCED_COLUMN_NAME as primary_column
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND REFERENCED_TABLE_NAME IS NOT NULL;
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

        _SCHEMA_INSPECTION_CACHE[cache_key] = (schema_str, time.time())
        return schema_str
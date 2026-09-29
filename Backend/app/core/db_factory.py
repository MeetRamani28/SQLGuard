import os
import re
import time
import sqlite3
import json
from urllib.parse import urlparse, unquote
import psycopg2
from psycopg2.extras import RealDictCursor
from app.core.config import settings

class SQLiteDictRow(sqlite3.Row):
    """Custom SQLite row wrapper returning dict objects similar to RealDictCursor."""
    def to_dict(self):
        return {key: self[key] for key in self.keys()}

class MongoDictCursor:
    """Cursor wrapper executing SQL queries against PyMongo database."""
    def __init__(self, db):
        self.db = db
        self.last_results = []

    def execute(self, query: str):
        import sqlglot
        from sqlglot import exp

        query_str = query.strip()
        cleaned_sql = query_str.rstrip(";").strip()

        try:
            parsed = sqlglot.parse_one(cleaned_sql)
        except Exception:
            parsed = None

        collection_name = None
        if parsed and isinstance(parsed, exp.Select):
            table_node = parsed.find(exp.Table)
            if table_node:
                collection_name = table_node.name

        if not collection_name:
            match = re.search(r'FROM\s+["`]?([a-zA-Z0-9_\-]+)["`]?', cleaned_sql, re.IGNORECASE)
            collection_name = match.group(1) if match else None

        all_collections = self.db.list_collection_names()
        
        target_coll = None
        if collection_name:
            if collection_name in all_collections:
                target_coll = collection_name
            else:
                for c in all_collections:
                    if c.lower() == collection_name.lower():
                        target_coll = c
                        break

        if not target_coll and all_collections:
            target_coll = [c for c in all_collections if not c.startswith("system.")][0]

        if target_coll:
            collection = self.db[target_coll]
            
            is_count = False
            if parsed and isinstance(parsed, exp.Select):
                for s in parsed.selects:
                    if isinstance(s, exp.Count) or "count(" in s.sql().lower():
                        is_count = True
                        break
            elif "count(" in cleaned_sql.lower():
                is_count = True

            if is_count:
                cnt = collection.count_documents({})
                self.last_results = [{"count": cnt, "total_records": cnt}]
                return

            limit_val = 100
            if parsed:
                limit_clause = parsed.args.get("limit")
                if limit_clause:
                    try:
                        limit_val = min(int(limit_clause.expression.this), 1000)
                    except Exception:
                        pass

            raw_docs = list(collection.find({}).limit(limit_val))
            cleaned_rows = []
            for doc in raw_docs:
                row = {}
                for k, v in doc.items():
                    if k == "_id":
                        row["_id"] = str(v)
                    elif isinstance(v, (dict, list)):
                        row[k] = json.dumps(v, default=str)
                    else:
                        row[k] = str(v) if not isinstance(v, (int, float, bool, type(None))) else v
                cleaned_rows.append(row)
            self.last_results = cleaned_rows
        else:
            self.last_results = []

    def fetchall(self):
        return self.last_results

    def close(self):
        pass

class MongoDictConnection:
    """Wrapper around PyMongo Database instance mimicking DB-API connection."""
    def __init__(self, client, db_name):
        self.client = client
        self.db = client[db_name]

    def cursor(self):
        return MongoDictCursor(self.db)

    def close(self):
        try:
            self.client.close()
        except Exception:
            pass

def connect_mongodb(url: str):
    import pymongo
    client = pymongo.MongoClient(url, serverSelectionTimeoutMS=6000)
    client.admin.command('ping')

    parsed = urlparse(url)
    db_name = parsed.path.lstrip('/')
    if "?" in db_name:
        db_name = db_name.split("?")[0]

    if not db_name:
        try:
            db_list = [d for d in client.list_database_names() if d not in ("admin", "config", "local")]
            db_name = db_list[0] if db_list else "test"
        except Exception:
            db_name = "test"

    return MongoDictConnection(client, db_name), "mongodb"

def connect_mysql(url: str, db_config: dict = None):
    import pymysql
    import pymysql.cursors

    parsed = urlparse(url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 3306
    user = unquote(parsed.username) if parsed.username else "root"
    password = unquote(parsed.password) if parsed.password else ""
    dbname = parsed.path.lstrip('/')
    if "?" in dbname:
        dbname = dbname.split("?")[0]

    conn = pymysql.connect(
        host=host,
        port=int(port),
        user=user,
        password=password,
        database=dbname if dbname else None,
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=6,
        autocommit=True
    )
    return conn, "mysql"

def get_db_connection(db_config: dict = None):
    """
    Description: Database factory returning connection object based on APP_ENV and optional dynamic custom DB config.
    Usecase: Connects to MongoDB, MySQL, PostgreSQL, Supabase, Neon, AWS RDS, CockroachDB, or SQLite.
    """
    if db_config:
        # Case A: Raw Connection URL string (MongoDB, MySQL, PostgreSQL, Supabase, Neon, Railway, SQLite, etc.)
        if db_config.get("connection_url") and db_config["connection_url"].strip():
            url = db_config["connection_url"].strip().strip("'\" ")

            # 1. MongoDB detection (mongodb:// or mongodb+srv://)
            if url.startswith("mongodb://") or url.startswith("mongodb+srv://") or "mongodb" in url.lower():
                try:
                    return connect_mongodb(url)
                except Exception as mongo_err:
                    raise RuntimeError(f"Failed to connect to MongoDB using Connection URL: {str(mongo_err)}")

            # 2. MySQL / MariaDB detection (mysql://, mysql2://, mariadb://)
            if url.startswith("mysql://") or url.startswith("mysql2://") or url.startswith("mariadb://") or ":3306" in url:
                try:
                    return connect_mysql(url, db_config)
                except Exception as mysql_err:
                    raise RuntimeError(f"Failed to connect to MySQL using Connection URL: {str(mysql_err)}")

            # 3. SQLite detection (sqlite:// or sqlite:///)
            if url.startswith("sqlite://"):
                path = url.replace("sqlite:///", "").replace("sqlite://", "")
                if not os.path.isabs(path):
                    path = os.path.abspath(path)
                conn = sqlite3.connect(path)
                conn.row_factory = sqlite3.Row
                conn.execute("PRAGMA foreign_keys = ON;")
                return conn, "sqlite"

            # 4. PostgreSQL / Supabase / Neon / CockroachDB / AWS RDS detection
            if url.startswith("postgres://"):
                url = "postgresql://" + url[11:]
            elif not url.startswith("postgresql://"):
                url = "postgresql://" + url

            url = url.replace("?ssl=true", "?sslmode=require").replace("&ssl=true", "&sslmode=require")

            try:
                conn = psycopg2.connect(
                    url,
                    cursor_factory=RealDictCursor,
                    connect_timeout=5
                )
                return conn, "postgres"
            except Exception as first_err:
                err_str = str(first_err)
                # Smart Supabase IPv4 Pooler Auto-Fallback across all regions worldwide
                match = re.search(r'db\.([a-z0-9]+)\.supabase\.co', url)
                if match:
                    ref = match.group(1)
                    user_pass_match = re.search(r'postgresql://([^@]+)@', url)
                    user_pass = user_pass_match.group(1) if user_pass_match else "postgres"
                    if ":" in user_pass:
                        u_name, p_word = user_pass.split(":", 1)
                    else:
                        u_name, p_word = user_pass, ""

                    p_word = unquote(p_word)
                    pooler_user = f"{u_name}.{ref}" if not u_name.endswith(f".{ref}") else u_name

                    dbname_match = re.search(r':\d+/([^?]+)', url)
                    dbname = dbname_match.group(1) if dbname_match else "postgres"

                    regions = [
                        "aws-0-us-east-1.pooler.supabase.com",     # N. Virginia
                        "aws-0-ap-south-1.pooler.supabase.com",     # Mumbai
                        "aws-0-eu-central-1.pooler.supabase.com",  # Frankfurt
                        "aws-0-us-west-2.pooler.supabase.com",     # Oregon
                        "aws-0-ap-southeast-1.pooler.supabase.com", # Singapore
                        "aws-0-eu-west-1.pooler.supabase.com",     # Ireland
                    ]
                    ports = [6543, 5432]

                    pooler_start = time.time()
                    for reg in regions:
                        if time.time() - pooler_start > 5.0:
                            break
                        for p_num in ports:
                            if time.time() - pooler_start > 5.0:
                                break
                            try:
                                conn = psycopg2.connect(
                                    host=reg,
                                    port=p_num,
                                    dbname=dbname,
                                    user=pooler_user,
                                    password=p_word,
                                    sslmode="require",
                                    options=f"project={ref}",
                                    cursor_factory=RealDictCursor,
                                    connect_timeout=1
                                )
                                return conn, "postgres"
                            except Exception:
                                continue

                if "Name or service not known" in err_str or "could not translate host name" in err_str or "Network is unreachable" in err_str:
                    err_str += " (Tip for Supabase: Direct db.ref.supabase.co requires IPv6. Using pooler host aws-0-region.pooler.supabase.com on port 6543/5432)."
                raise RuntimeError(f"Failed to connect using Connection URL: {err_str}")

        # Case B: Custom SQLite file path
        if db_config.get("sqlite_path") and db_config["sqlite_path"].strip():
            path = os.path.abspath(db_config["sqlite_path"].strip())
            if not os.path.exists(path):
                if getattr(settings, "DATABASE_URL", None) and settings.APP_ENV != "development":
                    try:
                        conn = psycopg2.connect(
                            settings.DATABASE_URL,
                            cursor_factory=RealDictCursor,
                            connect_timeout=8
                        )
                        return conn, "postgres"
                    except Exception:
                        pass
                
                dir_name = os.path.dirname(path)
                if dir_name and not os.path.exists(dir_name):
                    os.makedirs(dir_name, exist_ok=True)
                open(path, "a").close()

            conn = sqlite3.connect(path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn, "sqlite"

        # Case C: Discrete database credentials (host, port, dbname, user, password, optional sslmode)
        if all(k in db_config and str(db_config[k]).strip() for k in ("host", "port", "dbname", "user", "password")):
            db_type = (db_config.get("db_type") or "").lower()
            port = int(db_config["port"])

            if db_type == "mongodb" or port == 27017:
                url = f"mongodb://{db_config['user']}:{db_config['password']}@{db_config['host']}:{port}/{db_config['dbname']}"
                return connect_mongodb(url)

            if db_type in ("mysql", "mariadb") or port == 3306:
                url = f"mysql://{db_config['user']}:{db_config['password']}@{db_config['host']}:{port}/{db_config['dbname']}"
                return connect_mysql(url, db_config)

            try:
                sslmode = db_config.get("sslmode", "prefer")
                conn = psycopg2.connect(
                    host=db_config["host"],
                    port=port,
                    dbname=db_config["dbname"],
                    user=db_config["user"],
                    password=db_config["password"],
                    sslmode=sslmode if sslmode else "prefer",
                    cursor_factory=RealDictCursor,
                    connect_timeout=8
                )
                return conn, "postgres"
            except Exception as e:
                raise RuntimeError(f"Failed to connect to database '{db_config.get('dbname')}': {str(e)}")

    # 2. Default Environment-based connection
    if settings.APP_ENV == "development":
        db_path = os.path.abspath(settings.SQLITE_DB_PATH)
        if not os.path.exists(db_path):
            open(db_path, "a").close()
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        return conn, "sqlite"
    else:
        url = settings.DATABASE_URL
        if "postgresql" in url and "sslmode" not in url:
            sep = "&" if "?" in url else "?"
            url += f"{sep}sslmode=require"
        try:
            conn = psycopg2.connect(
                url,
                cursor_factory=RealDictCursor,
                connect_timeout=8
            )
            return conn, "postgres"
        except Exception as prod_err:
            db_path = os.path.abspath(settings.SQLITE_DB_PATH)
            if not os.path.exists(db_path):
                open(db_path, "a").close()
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn, "sqlite"

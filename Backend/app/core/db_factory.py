import os
import re
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from app.core.config import settings

class SQLiteDictRow(sqlite3.Row):
    """Custom SQLite row wrapper returning dict objects similar to RealDictCursor."""
    def to_dict(self):
        return {key: self[key] for key in self.keys()}

def get_db_connection(db_config: dict = None):
    """
    Description: Database factory returning connection object based on APP_ENV and optional dynamic custom DB config.
    Usecase: Connects to SQLite in dev mode, user dynamic PostgreSQL/Supabase, or production DB.
    """
    # 1. Custom database connection provided by user
    if db_config:
        # Case A: Raw Connection URL string (PostgreSQL, Supabase, Neon, Railway, etc.)
        if db_config.get("connection_url") and db_config["connection_url"].strip():
            url = db_config["connection_url"].strip().strip("'\" ")
            
            # Ensure protocol prefix
            if url.startswith("postgres://"):
                url = "postgresql://" + url[11:]
            elif not url.startswith("postgresql://") and not url.startswith("sqlite://"):
                url = "postgresql://" + url

            if url.startswith("sqlite://"):
                path = url.replace("sqlite:///", "").replace("sqlite://", "")
                if not os.path.isabs(path):
                    path = os.path.abspath(path)
                conn = sqlite3.connect(path)
                conn.row_factory = sqlite3.Row
                conn.execute("PRAGMA foreign_keys = ON;")
                return conn, "sqlite"
            else:
                try:
                    conn = psycopg2.connect(
                        url,
                        cursor_factory=RealDictCursor,
                        connect_timeout=8
                    )
                    return conn, "postgres"
                except Exception as first_err:
                    err_str = str(first_err)
                    # Smart Supabase IPv4 Pooler Auto-Fallback
                    if "db." in url and ".supabase.co" in url:
                        # Attempt pooler domain substitution if IPv6 direct host failed
                        pooler_url = re.sub(r'db\.([a-z0-9]+)\.supabase\.co', r'aws-0-us-east-1.pooler.supabase.com', url)
                        try:
                            conn = psycopg2.connect(
                                pooler_url,
                                cursor_factory=RealDictCursor,
                                connect_timeout=8
                            )
                            return conn, "postgres"
                        except Exception:
                            pass

                    if "Name or service not known" in err_str or "could not translate host name" in err_str:
                        err_str += " (Tip for Supabase: Direct db.ref.supabase.co requires IPv6. Please use Supabase Connection Pooler URL e.g. aws-0-us-east-1.pooler.supabase.com on port 6543 or 5432)."
                    raise RuntimeError(f"Failed to connect using Connection URL: {err_str}")

        # Case B: Custom SQLite file path
        if db_config.get("sqlite_path") and db_config["sqlite_path"].strip():
            path = os.path.abspath(db_config["sqlite_path"].strip())
            if not os.path.exists(path):
                raise RuntimeError(f"SQLite file not found at path: {path}")
            conn = sqlite3.connect(path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn, "sqlite"

        # Case C: Discrete Postgres credentials (host, port, dbname, user, password, optional sslmode)
        if all(k in db_config and str(db_config[k]).strip() for k in ("host", "port", "dbname", "user", "password")):
            try:
                sslmode = db_config.get("sslmode", "prefer")
                conn = psycopg2.connect(
                    host=db_config["host"],
                    port=int(db_config["port"]),
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
        conn = psycopg2.connect(
            settings.DATABASE_URL,
            cursor_factory=RealDictCursor
        )
        return conn, "postgres"

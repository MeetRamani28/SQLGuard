from app.core.db_factory import get_db_connection as factory_get_db_connection

def get_db_connection(db_config: dict = None):
    """
    Description: Connection delegate returning (conn, dialect) tuple via factory.
    Usecase: Connects to local SQLite in development mode or dynamic PostgreSQL user target.
    """
    conn, dialect = factory_get_db_connection(db_config)
    return conn
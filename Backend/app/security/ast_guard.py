import sqlglot
from sqlglot import exp

FORBIDDEN_FUNCTIONS = {
    "pragma", "load_extension", "readfile", "writefile", "eval", "edit",
    "fts3_tokenizer", "pg_sleep", "pg_read_file", "dblink", "xp_cmdshell"
}

def validate_read_only_sql(sql_query: str, dialect: str = "sqlite") -> tuple[bool, str]:
    """
    Description: Parses SQL queries into an Abstract Syntax Tree (AST) using sqlglot and validates read-only security rules.
    Usecase: Hardens SQL execution by blocking destructive operations, multi-statement queries, writable CTEs, SELECT INTO, and dangerous functions.
    
    Returns:
        tuple[bool, str]: (is_valid, error_message_or_cleaned_sql)
    """
    cleaned_sql = sql_query.strip()
    if cleaned_sql.startswith("```"):
        cleaned_sql = cleaned_sql.split("```")[1]
        if cleaned_sql.lower().startswith("sql"):
            cleaned_sql = cleaned_sql[3:].strip()
    if cleaned_sql.endswith("```"):
        cleaned_sql = cleaned_sql[:-3].strip()

    if not cleaned_sql:
        return False, "SECURITY ERROR: Empty SQL query string provided."

    try:
        # Parse expressions using target SQL dialect (sqlite or postgres)
        parsed_expressions = sqlglot.parse(cleaned_sql, read=dialect)
        non_empty_expressions = [e for e in parsed_expressions if e is not None]

        # 1. Enforce single-statement execution
        if len(non_empty_expressions) != 1:
            return False, "SECURITY ERROR: Multi-statement queries are strictly forbidden. Only a single SELECT query is permitted."

        expression = non_empty_expressions[0]

        # 2. Must be a SELECT expression
        if not isinstance(expression, exp.Select):
            forbidden_type = type(expression).__name__.upper()
            return False, f"SECURITY ERROR: Forbidden SQL command '{forbidden_type}'. Only SELECT queries are permitted."

        # 3. Block SELECT INTO statements
        if expression.find(exp.Into):
            return False, "SECURITY ERROR: 'SELECT INTO' operations are strictly forbidden."

        # 4. Check for destructive nodes anywhere in AST (including subqueries and CTEs)
        forbidden_nodes = (exp.Delete, exp.Drop, exp.Insert, exp.Update, exp.Alter, exp.Create)
        for node in expression.walk():
            if isinstance(node, forbidden_nodes):
                return False, f"SECURITY ERROR: Detected destructive operation '{type(node).__name__.upper()}' in query."

            # 5. Check for dangerous functions / pragmas
            if isinstance(node, (exp.Anonymous, exp.Func, exp.Command)):
                func_name = getattr(node, "name", "").lower()
                if func_name in FORBIDDEN_FUNCTIONS or any(f in func_name for f in ("load_extension", "readfile", "writefile", "pg_sleep")):
                    return False, f"SECURITY ERROR: Forbidden function or pragma call '{func_name}' detected."

        # 6. Enforce hard row LIMIT <= 1000
        limit_clause = expression.args.get("limit")
        if limit_clause is None:
            expression = expression.limit(1000)
        else:
            try:
                limit_val = int(limit_clause.expression.this)
                if limit_val > 1000:
                    expression = expression.limit(1000)
            except Exception:
                pass

        final_sql = expression.sql(dialect=dialect)
        return True, final_sql

    except sqlglot.errors.ParseError as pe:
        return False, f"SQL PARSE ERROR: Invalid SQL syntax - {str(pe)}"
    except Exception as e:
        return False, f"VALIDATION ERROR: Failed to parse SQL - {str(e)}"
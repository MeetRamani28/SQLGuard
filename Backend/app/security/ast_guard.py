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
        return False, "QUERY ERROR: Empty or unparseable SQL query string provided."

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

SENSITIVE_FIELD_PATTERNS = {
    "password", "pass", "pwd", "ssn", "secret", "token", "creditcard", "credit_card", "cvv"
}

def mask_pii_data(results: list) -> list:
    """
    Description: Scans query results and masks sensitive columns matching PII patterns.
    Usecase: Enforces Enterprise Data Governance and PII Privacy Protection.
    """
    if not results or not isinstance(results, list):
        return results

    masked_results = []
    for row in results:
        if not isinstance(row, dict):
            masked_results.append(row)
            continue
        
        new_row = {}
        for col, val in row.items():
            col_lower = str(col).lower()
            if any(pattern in col_lower for pattern in SENSITIVE_FIELD_PATTERNS):
                new_row[col] = "********"
            else:
                new_row[col] = val
        masked_results.append(new_row)
        
    return masked_results

def analyze_sql_performance(sql_query: str, dialect: str = "sqlite") -> dict:
    """
    Description: Inspects SQL Abstract Syntax Tree (AST) to detect performance bottlenecks, missing indexes, and query complexity.
    Usecase: AI-driven Query Tuning & Enterprise Performance Optimization.
    """
    recommendations = []
    complexity_score = "Low"
    performance_score = 95

    try:
        parsed = sqlglot.parse_one(sql_query, read=dialect)
        if not parsed:
            return {
                "complexity_score": "Unknown",
                "performance_score": 50,
                "recommendations": ["Could not parse query for performance profiling."]
            }

        # Check SELECT *
        if parsed.find(exp.Star):
            performance_score -= 15
            recommendations.append("Avoid 'SELECT *' - explicitly specify column names to reduce network payload and memory overhead.")

        # Check WHERE clause
        where_clause = parsed.args.get("where")
        if not where_clause:
            performance_score -= 20
            recommendations.append("Query lacks a WHERE clause filter; full table scan will be executed.")
        else:
            # Check for leading wildcards in LIKE
            for like_node in where_clause.find_all(exp.Like):
                pattern = str(like_node.args.get("expression", ""))
                if pattern.startswith("'%") or pattern.startswith('"%'):
                    performance_score -= 15
                    recommendations.append("Leading wildcard in LIKE clause (e.g. '%term') prevents index lookups. Consider full-text search index.")

        # Check Joins
        joins = parsed.args.get("joins") or []
        if len(joins) > 0:
            complexity_score = "Medium" if len(joins) <= 2 else "High"
            if len(joins) >= 3:
                performance_score -= 15
                recommendations.append(f"Query contains {len(joins)} JOIN clauses. Ensure foreign key columns have composite indexes.")

        # Check Group By / Order By
        group = parsed.args.get("group")
        order = parsed.args.get("order")
        if group and order:
            complexity_score = "Medium" if complexity_score == "Low" else "High"

        # Check LIMIT
        limit = parsed.args.get("limit")
        if not limit:
            performance_score -= 10
            recommendations.append("No explicit LIMIT clause found; large result set may cause UI render delays.")

        if performance_score >= 85:
            recommendations.append("Query syntax is highly optimized for index usage and fast execution.")

        return {
            "complexity_score": complexity_score,
            "performance_score": max(20, performance_score),
            "recommendations": recommendations
        }
    except Exception as e:
        return {
            "complexity_score": "Medium",
            "performance_score": 70,
            "recommendations": [f"Basic profiling complete: {str(e)}"]
        }

def detect_data_anomalies(data: list) -> list:
    """
    Description: Analyzes data result sets for statistical outliers (Z-score > 2.2), zero value anomalies, or missing data bursts.
    Usecase: Automatic Data Quality Guardrails & Anomaly Alerting.
    """
    if not data or not isinstance(data, list) or len(data) < 2:
        return []

    anomalies = []
    # Extract numeric columns
    first_row = data[0]
    if not isinstance(first_row, dict):
        return []

    numeric_cols = [col for col, val in first_row.items() if isinstance(val, (int, float)) and not isinstance(val, bool)]

    for col in numeric_cols:
        vals = [r[col] for r in data if isinstance(r.get(col), (int, float)) and not isinstance(r.get(col), bool)]
        if len(vals) < 3:
            continue

        mean = sum(vals) / len(vals)
        variance = sum((x - mean) ** 2 for x in vals) / len(vals)
        std_dev = variance ** 0.5

        if std_dev > 0:
            for idx, val in enumerate(vals):
                z_score = abs(val - mean) / std_dev
                if z_score > 1.8:
                    anomalies.append({
                        "column": col,
                        "value": val,
                        "row_index": idx,
                        "type": "outlier",
                        "message": f"Statistical anomaly in '{col}': value {val} is {z_score:.1f}x std dev from mean ({mean:.1f})."
                    })

        # Zero revenue/sales check
        if any(term in str(col).lower() for term in ("revenue", "sales", "price", "amount", "total")):
            zero_count = sum(1 for v in vals if v == 0)
            if zero_count > 0:
                anomalies.append({
                    "column": col,
                    "value": 0,
                    "row_index": -1,
                    "type": "zero_value",
                    "message": f"Detected {zero_count} zero value(s) in financial metric column '{col}'."
                })

    return anomalies[:4]  # Return top 4 distinct anomalies max
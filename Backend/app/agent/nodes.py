import json
import time
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
from app.agent.state import AgentState
from app.core.schema_rag import get_relevant_schema
from app.core.db_factory import get_db_connection as factory_get_db_connection
from app.security.ast_guard import validate_read_only_sql, mask_pii_data, detect_data_anomalies
from app.core.telemetry import record_llm_span, record_span

_LLM_INSTANCE = None

def get_llm():
    """Returns ChatGroq singleton instance with current model configuration."""
    global _LLM_INSTANCE
    if _LLM_INSTANCE is None:
        _LLM_INSTANCE = ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model_name=settings.MODEL_NAME,
            temperature=0.0,
            max_tokens=250
        )
    return _LLM_INSTANCE

def generate_sql_node(state: AgentState) -> dict:
    """
    Description: Synthesizes a SQL SELECT query based on user question, conversation history, and Schema-RAG retrieved context,
                 plus a 1-sentence breakdown explaining the SQL logic.
    Usecase: Initial step to convert text into structured JSON containing SQL + Explanation.
    """
    trace_id = state.get("trace_id")
    db_config = state.get("db_config")

    rag_start = time.time()
    schema = get_relevant_schema(state["question"], db_config=db_config, top_k=3)
    rag_duration = (time.time() - rag_start) * 1000
    record_span(
        name="sqlguard_schema_retrieval",
        span_type="retrieval",
        input_text=state["question"],
        output_text=f"Retrieved schema context ({len(schema)} chars)",
        duration_ms=rag_duration,
        trace_id=trace_id,
        metadata={"top_k": 3}
    )

    chat_history = state.get("chat_history") or []
    
    history_str = ""
    if chat_history:
        formatted_history = []
        for turn in chat_history[-4:]:  # Include last 4 turns for context
            user_q = turn.get("question", turn.get("user", ""))
            prev_sql = turn.get("sql_query", turn.get("sql", ""))
            if user_q:
                formatted_history.append(f"User: {user_q}\nPrevious SQL: {prev_sql}")
        if formatted_history:
            history_str = "\nPRIOR CONVERSATION HISTORY:\n" + "\n---\n".join(formatted_history) + "\n"

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"""You are an expert Data Engineer and Multilingual Database Assistant. 
Your task is to convert natural language business questions into valid SQL SELECT queries AND provide a direct 1-sentence breakdown explaining which tables/conditions you used.

MULTILINGUAL & SCHEMA MATCHING (CRITICAL):
- Understand questions in ENGLISH, GUJARATI (ગુજરાતી or Gujlish e.g. 'ketla users che', 'ketlu revenue thavu', 'aama ketla records che', 'mediq ma ketla tables che', 'aaje kayo doctor free 6e'), or HINDI (हिंदी or Hinglish e.g. 'kitne users hain', 'kul kitna revenue hua').
- "MEDIQ", "database", or "system" refers to the connected database itself.
- When asked "how many tables", "list tables", or "database tables", generate a valid query to list/count tables (e.g. `SELECT name FROM sqlite_master WHERE type='table';` for SQLite, or `SELECT table_name FROM information_schema.tables WHERE table_schema='public';` for Postgres/MySQL, or `SELECT * FROM specializations;`).
- Intelligently map natural synonyms to schema table names:
  * "specialization list", "specializations", "doctors", "specialist" -> `specializations` table
  * "appointments", "doctor free", "schedule", "bookings" -> `appointments` / `appointmentmedicalrecords` / `specializations` table
  * "contacts", "inquiries", "messages" -> `contacts` table
  * "users", "patients", "accounts" -> `users` table
{history_str}
CRITICAL RULES:
1. Output MUST be a valid JSON object with keys: "sql_query" and "sql_explanation".
2. NO INTRODUCTORY FILLER, PLEASANTRIES, OR LENGTHY EXPLANATIONS. Return direct actionable JSON only.
3. DO NOT include markdown formatting like ```json or explanations outside the JSON structure.
4. READ-ONLY STRICT SECURITY: 
   - ALWAYS generate read-only SELECT queries.
   - ONLY set "sql_query" to "FORBIDDEN_SECURITY_ERROR" if the user EXPLICITLY asks to delete, drop, update, insert, alter, or truncate data (e.g. "delete all users", "drop table appointments").
   - DO NOT set FORBIDDEN_SECURITY_ERROR for normal read questions, questions asking for lists, counts, table info, or questions in Gujarati/Hindi/English!
5. Use valid table and column names as specified in the schema below.

DATABASE SCHEMA:
{{schema}}"""),
        ("human", "Question: {question}")
    ])

    chain = prompt | get_llm()
    start_t = time.time()
    try:
        response = chain.invoke({"schema": schema, "question": state["question"]})
        duration_ms = (time.time() - start_t) * 1000
        clean_res = response.content.strip()
        
        if clean_res.startswith("```"):
            clean_res = clean_res.split("```")[1]
            if clean_res.lower().startswith("json"):
                clean_res = clean_res[4:].strip()
        if clean_res.endswith("```"):
            clean_res = clean_res[:-3].strip()

        parsed = json.loads(clean_res)
        
        token_usage = getattr(response, "response_metadata", {}).get("token_usage", {})
        record_llm_span(
            name="sqlguard_generate_sql",
            prompt_input=state["question"],
            output_text=clean_res,
            model=getattr(settings, "MODEL_NAME", "openai/gpt-oss-20b"),
            provider="groq",
            prompt_tokens=token_usage.get("prompt_tokens", 0),
            completion_tokens=token_usage.get("completion_tokens", 0),
            duration_ms=duration_ms,
            trace_id=trace_id,
        )

        return {
            "schema": schema,
            "sql_query": parsed.get("sql_query", "").strip(),
            "explanation": parsed.get("sql_explanation", "Executed SELECT query."),
            "retry_count": 0
        }
    except Exception:
        duration_ms = (time.time() - start_t) * 1000
        raw_output = getattr(response, "content", "").strip() if 'response' in locals() else ""
        record_llm_span(
            name="sqlguard_generate_sql_fallback",
            prompt_input=state["question"],
            output_text=raw_output,
            model=getattr(settings, "MODEL_NAME", "openai/gpt-oss-20b"),
            provider="groq",
            duration_ms=duration_ms,
            trace_id=trace_id,
        )
        return {
            "schema": schema,
            "sql_query": raw_output,
            "explanation": "Synthesized SELECT query.",
            "retry_count": 0
        }

def validate_sql_node(state: AgentState) -> dict:
    """
    Description: Validates generated SQL using the AST parser to block non-SELECT queries 
                 and intercepts schema or security error flags.
    Usecase: Enforces Database Read-Only Guardrails before hitting the DB engine.
    """
    trace_id = state.get("trace_id")
    val_start = time.time()
    sql = state.get("sql_query", "").strip()
    explanation = state.get("explanation", "")

    if sql.startswith("FORBIDDEN_SCHEMA_ERROR"):
        val_duration = (time.time() - val_start) * 1000
        record_span(
            name="sqlguard_ast_guard_validation",
            span_type="tool",
            input_text=sql,
            output_text=f"SCHEMA ERROR: {explanation}",
            duration_ms=val_duration,
            trace_id=trace_id,
            status="error",
            error_message="Requested tables or columns do not exist.",
            metadata={"status": "rejected_schema"}
        )
        return {
            "is_valid_sql": False,
            "error_trace": f"SCHEMA ERROR: {explanation if explanation else 'Requested tables or columns do not exist in this database.'}"
        }

    if sql.startswith("FORBIDDEN_SECURITY_ERROR") or sql.startswith("FORBIDDEN_OPERATION"):
        val_duration = (time.time() - val_start) * 1000
        record_span(
            name="sqlguard_ast_guard_validation",
            span_type="tool",
            input_text=sql,
            output_text=f"SECURITY ERROR: {explanation}",
            duration_ms=val_duration,
            trace_id=trace_id,
            status="error",
            error_message="Destructive operations forbidden.",
            metadata={"status": "rejected_security"}
        )
        return {
            "is_valid_sql": False,
            "error_trace": f"SECURITY ERROR: {explanation if explanation else 'Destructive operations are strictly forbidden.'}"
        }

    db_config = state.get("db_config")
    _, dialect = factory_get_db_connection(db_config)
    read_dialect = "mysql" if dialect in ("mysql", "mongodb") else dialect
    is_valid, result = validate_read_only_sql(sql, dialect=read_dialect)
    val_duration = (time.time() - val_start) * 1000
    
    if is_valid:
        record_span(
            name="sqlguard_ast_guard_validation",
            span_type="tool",
            input_text=sql,
            output_text="PASSED: Read-only AST verified",
            duration_ms=val_duration,
            trace_id=trace_id,
            status="ok",
            metadata={"dialect": read_dialect, "is_valid": True}
        )
        return {
            "is_valid_sql": True,
            "sql_query": result,  
            "error_trace": None
        }
    else:
        record_span(
            name="sqlguard_ast_guard_validation",
            span_type="tool",
            input_text=sql,
            output_text=f"BLOCKED: {result}",
            duration_ms=val_duration,
            trace_id=trace_id,
            status="error",
            error_message=result,
            metadata={"dialect": read_dialect, "is_valid": False}
        )
        return {
            "is_valid_sql": False,
            "sql_query": "FORBIDDEN",
            "error_trace": result
        }

def execute_sql_node(state: AgentState) -> dict:
    """
    Description: Executes validated SQL query against target database (SQLite or PostgreSQL).
    Usecase: Retrieves data rows or catches database runtime errors, applying PII data masking.
    """
    trace_id = state.get("trace_id")
    exec_start = time.time()
    try:
        db_config = state.get("db_config")
        conn, dialect = factory_get_db_connection(db_config)
        cursor = conn.cursor()
        cursor.execute(state["sql_query"])
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        dict_results = [dict(row) for row in rows]
        masked_results = mask_pii_data(dict_results)
        anomalies = detect_data_anomalies(dict_results)
        exec_duration = (time.time() - exec_start) * 1000

        record_span(
            name="sqlguard_execute_db_query",
            span_type="tool",
            input_text=state.get("sql_query", ""),
            output_text=f"Retrieved {len(masked_results)} rows. Anomalies: {len(anomalies)}",
            duration_ms=exec_duration,
            trace_id=trace_id,
            status="ok",
            metadata={"row_count": len(masked_results), "anomalies_count": len(anomalies), "dialect": dialect}
        )
        
        return {
            "query_result": masked_results,
            "anomalies": anomalies,
            "error_trace": None
        }
    except Exception as e:
        exec_duration = (time.time() - exec_start) * 1000
        record_span(
            name="sqlguard_execute_db_query",
            span_type="tool",
            input_text=state.get("sql_query", ""),
            output_text="Database execution failed",
            duration_ms=exec_duration,
            trace_id=trace_id,
            status="error",
            error_message=str(e),
        )
        return {
            "query_result": None,
            "error_trace": f"Database Execution Error: {str(e)}"
        }

def self_correct_node(state: AgentState) -> dict:
    """
    Description: Takes failed SQL query + error trace and re-prompts LLM to fix the query.
    Usecase: Autonomous self-healing loop for SQL syntax or schema mismatch errors.
    """
    trace_id = state.get("trace_id")
    current_retry = state.get("retry_count", 0) + 1
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert Data Engineer and Multilingual Database Assistant. 
Your previous SQL query failed validation or execution. Fix the error and generate a valid SELECT query.

MULTILINGUAL CAPABILITY:
- Understand user questions in English, Gujarati (ગુજરાતી / Gujlish), and Hindi (हिंदी / Hinglish).

CRITICAL RULES:
1. Return ONLY the raw executable SQL query.
2. DO NOT include markdown syntax like ```sql or explanations.
3. Ensure table/column names match the schema exactly.
4. STRICT SECURITY RULE: You MUST ONLY generate read-only SELECT queries. If the query cannot be fixed without modifying data, start with 'FORBIDDEN_SECURITY_ERROR'.

DATABASE SCHEMA:
{schema}"""),
        ("human", """User Question: {question}
Failed Query: {sql_query}
Error Message: {error_trace}

Corrected SQL Query:""")
    ])

    chain = prompt | get_llm()
    start_t = time.time()
    response = chain.invoke({
        "schema": state["schema"],
        "question": state["question"],
        "sql_query": state["sql_query"],
        "error_trace": state["error_trace"]
    })
    duration_ms = (time.time() - start_t) * 1000
    token_usage = getattr(response, "response_metadata", {}).get("token_usage", {})
    record_llm_span(
        name="sqlguard_self_correct_sql",
        prompt_input=f"Question: {state['question']} | Error: {state['error_trace']}",
        output_text=response.content.strip(),
        model=getattr(settings, "MODEL_NAME", "openai/gpt-oss-20b"),
        provider="groq",
        prompt_tokens=token_usage.get("prompt_tokens", 0),
        completion_tokens=token_usage.get("completion_tokens", 0),
        duration_ms=duration_ms,
        trace_id=trace_id,
        metadata={"retry_count": current_retry},
    )

    return {
        "sql_query": response.content.strip(),
        "retry_count": current_retry
    }

def chart_mapping_node(state: AgentState) -> dict:
    """
    Description: High-speed deterministic data analyzer selecting optimal chart type and executive summary in 0ms.
    Usecase: Eliminates 3-second LLM latency bottleneck for sub-2-second query responses.
    """
    trace_id = state.get("trace_id")
    chart_start = time.time()
    results = state.get("query_result", [])
    explanation = state.get("explanation")
    question = state.get("question", "")

    if not results:
        record_span(
            name="sqlguard_chart_mapping_summary",
            span_type="tool",
            input_text="No query results",
            output_text="Selected chart: none",
            duration_ms=(time.time() - chart_start) * 1000,
            trace_id=trace_id,
            metadata={"chart_type": "none"}
        )
        return {
            "chart_type": "none",
            "explanation": explanation or "No data records found for this query.",
            "executive_summary": ["No database records were returned for this question."]
        }

    keys = list(results[0].keys())
    row_count = len(results)

    # Detect column data types
    numeric_keys = []
    date_keys = []
    string_keys = []

    for k in keys:
        sample_vals = [r[k] for r in results[:10] if r.get(k) is not None]
        if not sample_vals:
            continue
        first_val = sample_vals[0]
        if isinstance(first_val, (int, float)) and not (k.lower() == "id" or k.lower().endswith("_id")):
            numeric_keys.append(k)
        elif any(term in k.lower() for term in ("date", "time", "created_at", "month", "year", "day")):
            date_keys.append(k)
        elif isinstance(first_val, str):
            string_keys.append(k)

    # Heuristic Chart Selection
    if date_keys and numeric_keys:
        chart_type = "line"
    elif string_keys and numeric_keys and row_count <= 6:
        chart_type = "pie"
    elif string_keys and numeric_keys:
        chart_type = "bar"
    elif numeric_keys and row_count <= 10:
        chart_type = "bar"
    else:
        chart_type = "table"

    if not explanation or explanation == "Executed SELECT query.":
        explanation = f"Successfully retrieved {row_count} row{'s' if row_count != 1 else ''}."

    summary_bullets = [
        f"Retrieved {row_count} record{'s' if row_count != 1 else ''} from database across {len(keys)} column{'s' if len(keys) != 1 else ''}."
    ]

    if numeric_keys:
        target_num = numeric_keys[0]
        num_vals = [r[target_num] for r in results if isinstance(r.get(target_num), (int, float))]
        if num_vals:
            max_v = max(num_vals)
            min_v = min(num_vals)
            summary_bullets.append(f"Metric '{target_num}' ranges from {min_v:,} to {max_v:,}.")

    chart_duration = (time.time() - chart_start) * 1000
    record_span(
        name="sqlguard_chart_mapping_summary",
        span_type="tool",
        input_text=f"Columns: {len(keys)}, Rows: {row_count}",
        output_text=f"Selected chart: {chart_type} | Summary bullets: {len(summary_bullets)}",
        duration_ms=chart_duration,
        trace_id=trace_id,
        metadata={"chart_type": chart_type, "rows": row_count, "columns": len(keys)}
    )

    return {
        "chart_type": chart_type,
        "explanation": explanation,
        "executive_summary": summary_bullets
    }
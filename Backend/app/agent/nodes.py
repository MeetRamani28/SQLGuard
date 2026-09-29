import json
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
from app.agent.state import AgentState
from app.core.schema_rag import get_relevant_schema
from app.core.db_factory import get_db_connection as factory_get_db_connection
from app.security.ast_guard import validate_read_only_sql, mask_pii_data, detect_data_anomalies

_LLM_INSTANCE = None

def get_llm():
    """Returns ChatGroq singleton instance with current model configuration."""
    global _LLM_INSTANCE
    if _LLM_INSTANCE is None:
        _LLM_INSTANCE = ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model_name=settings.MODEL_NAME,
            temperature=0.0
        )
    return _LLM_INSTANCE

def generate_sql_node(state: AgentState) -> dict:
    """
    Description: Synthesizes a SQL SELECT query based on user question, conversation history, and Schema-RAG retrieved context,
                 plus a 1-sentence breakdown explaining the SQL logic.
    Usecase: Initial step to convert text into structured JSON containing SQL + Explanation.
    """
    db_config = state.get("db_config")
    schema = get_relevant_schema(state["question"], db_config=db_config, top_k=3)
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
Your task is to convert natural language business questions into valid SQL SELECT queries AND provide a brief 1-sentence breakdown explaining which tables/conditions you used.

MULTILINGUAL SUPPORT (CRITICAL):
- The user question can be in ENGLISH, GUJARATI (ગુજરાતી or Roman Gujarati/Gujlish e.g. 'ketla users che', 'ketlu revenue thavu', 'aama ketla records che'), or HINDI (हिंदी or Roman Hindi/Hinglish e.g. 'kitne users hain', 'kul kitna revenue hua', 'sabse mehanga product').
- Comprehend the intent in ANY of these 3 languages (or mixed code-switched scripts) and map words accurately to the database schema.
{history_str}
CRITICAL RULES:
1. Output MUST be a valid JSON object with keys: "sql_query" and "sql_explanation".
2. DO NOT include markdown formatting like ```json or explanations outside the JSON structure.
3. STRICT SECURITY & SCHEMA RULES: 
   - You MUST ONLY generate read-only SELECT queries using tables and columns present in the schema below.
   - If the user asks to modify, update, insert, delete, drop, or truncate data (in English, Gujarati, or Hindi), set "sql_query" to "FORBIDDEN_SECURITY_ERROR" and "sql_explanation" to "Destructive database operations are strictly forbidden."
   - If the user asks about tables or columns that DO NOT exist in the provided schema, set "sql_query" to "FORBIDDEN_SCHEMA_ERROR" and "sql_explanation" to "The requested tables or columns do not exist in the connected database schema."
4. Use valid table and column names as specified in the schema below.

DATABASE SCHEMA:
{{schema}}"""),
        ("human", "Question: {question}")
    ])

    chain = prompt | get_llm()
    try:
        response = chain.invoke({"schema": schema, "question": state["question"]})
        clean_res = response.content.strip()
        
        if clean_res.startswith("```"):
            clean_res = clean_res.split("```")[1]
            if clean_res.lower().startswith("json"):
                clean_res = clean_res[4:].strip()
        if clean_res.endswith("```"):
            clean_res = clean_res[:-3].strip()

        parsed = json.loads(clean_res)
        return {
            "schema": schema,
            "sql_query": parsed.get("sql_query", "").strip(),
            "explanation": parsed.get("sql_explanation", "Executed SELECT query."),
            "retry_count": 0
        }
    except Exception:
        raw_output = getattr(response, "content", "").strip() if 'response' in locals() else ""
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
    sql = state.get("sql_query", "").strip()
    explanation = state.get("explanation", "")

    if sql.startswith("FORBIDDEN_SCHEMA_ERROR"):
        return {
            "is_valid_sql": False,
            "error_trace": f"SCHEMA ERROR: {explanation if explanation else 'Requested tables or columns do not exist in this database.'}"
        }

    if sql.startswith("FORBIDDEN_SECURITY_ERROR") or sql.startswith("FORBIDDEN_OPERATION"):
        return {
            "is_valid_sql": False,
            "error_trace": f"SECURITY ERROR: {explanation if explanation else 'Destructive operations are strictly forbidden.'}"
        }

    db_config = state.get("db_config")
    _, dialect = factory_get_db_connection(db_config)
    read_dialect = "mysql" if dialect in ("mysql", "mongodb") else dialect
    is_valid, result = validate_read_only_sql(sql, dialect=read_dialect)
    
    if is_valid:
        return {
            "is_valid_sql": True,
            "sql_query": result,  
            "error_trace": None
        }
    else:
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
        
        return {
            "query_result": masked_results,
            "anomalies": anomalies,
            "error_trace": None
        }
    except Exception as e:
        return {
            "query_result": None,
            "error_trace": f"Database Execution Error: {str(e)}"
        }

def self_correct_node(state: AgentState) -> dict:
    """
    Description: Takes failed SQL query + error trace and re-prompts LLM to fix the query.
    Usecase: Autonomous self-healing loop for SQL syntax or schema mismatch errors.
    """
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
    response = chain.invoke({
        "schema": state["schema"],
        "question": state["question"],
        "sql_query": state["sql_query"],
        "error_trace": state["error_trace"]
    })

    return {
        "sql_query": response.content.strip(),
        "retry_count": current_retry
    }

def chart_mapping_node(state: AgentState) -> dict:
    """
    Description: Analyzes data result set and selects optimal visual chart type + business insight + executive summary bullets.
    Usecase: Powers React Recharts UI dynamically with executive summaries.
    """
    results = state.get("query_result", [])
    if not results:
        return {
            "chart_type": "none",
            "explanation": "No data records found for this query.",
            "executive_summary": ["No database records were returned for this question."]
        }

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a Data Analytics & Visualization Specialist.
Analyze the provided query results and user question, then output a JSON object with:
1. "chart_type": Choose best from ['bar', 'line', 'pie', 'table']
   - Use 'bar' for categorical comparisons or rankings.
   - Use 'line' for time-series / date trends.
   - Use 'pie' for proportional breakdown of a whole (under 6 items).
   - Use 'table' for multi-column details or text-dense outputs.
2. "explanation": A concise 1-2 sentence business insight derived from the data.
3. "executive_summary": An array of 2-3 bullet point key insights summarizing key trends or metrics in the data.

Return ONLY raw JSON in this format: {{"chart_type": "...", "explanation": "...", "executive_summary": ["...", "..."]}}"""),
        ("human", "Question: {question}\nData Sample: {data_sample}")
    ])

    chain = prompt | get_llm()
    try:
        response = chain.invoke({
            "question": state["question"],
            "data_sample": json.dumps(results[:5], default=str)
        })
        
        clean_json = response.content.strip()
        if clean_json.startswith("```"):
            clean_json = clean_json.split("```")[1]
            if clean_json.lower().startswith("json"):
                clean_json = clean_json[4:].strip()
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3].strip()

        parsed = json.loads(clean_json)
        exec_summary = parsed.get("executive_summary", [])
        if not isinstance(exec_summary, list):
            exec_summary = [str(exec_summary)]

        return {
            "chart_type": parsed.get("chart_type", "table"),
            "explanation": parsed.get("explanation", "Query executed successfully."),
            "executive_summary": exec_summary
        }
    except Exception:
        return {
            "chart_type": "table",
            "explanation": f"Successfully retrieved {len(results)} rows.",
            "executive_summary": [f"Retrieved {len(results)} records from the database."]
        }
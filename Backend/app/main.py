import json
import time
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.auth import get_current_user, User
from app.core.realtime_factory import realtime_manager
from app.agent.graph import query_sense_agent
from app.db.schema_inspector import get_database_schema

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SQLGuard: Dual-Environment Autonomous Text-to-SQL Engine with LangGraph Self-Correction & AST Security",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DbConfigSchema(BaseModel):
    db_type: Optional[str] = "postgres"
    connection_url: Optional[str] = None
    host: Optional[str] = "localhost"
    port: Optional[int] = 5432
    dbname: Optional[str] = None
    user: Optional[str] = "postgres"
    password: Optional[str] = None
    sslmode: Optional[str] = "prefer"
    sqlite_path: Optional[str] = None

class TestDbResponse(BaseModel):
    success: bool
    dialect: str
    message: str

class SchemaRequest(BaseModel):
    db_config: Optional[DbConfigSchema] = None

class TableColumnInfo(BaseModel):
    name: str
    type: str

class TableSchemaInfo(BaseModel):
    table_name: str
    columns: List[TableColumnInfo]

class SchemaResponse(BaseModel):
    success: bool
    dialect: str
    tables: List[TableSchemaInfo]
    raw_schema: str
    error: Optional[str] = None

class QueryRequest(BaseModel):
    question: str = Field(..., example="Show me total revenue by region")
    db_config: Optional[DbConfigSchema] = None

class QueryResponse(BaseModel):
    question: str
    sql_query: Optional[str] = None
    query_result: Optional[List[Dict[str, Any]]] = None
    chart_type: Optional[str] = "table"
    explanation: Optional[str] = None
    retry_count: int = 0
    error_trace: Optional[str] = None
    execution_time_ms: Optional[int] = 0

@app.get("/")
def health_check():
    """
    Description: Health check endpoint to verify backend server status and environment.
    """
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "environment": settings.APP_ENV,
        "model": settings.MODEL_NAME
    }

@app.post("/api/v1/test-db", response_model=TestDbResponse)
async def test_database_connection(config: DbConfigSchema):
    """
    Description: Test endpoint to verify dynamic database connectivity.
    """
    try:
        db_config_dict = config.model_dump() if hasattr(config, 'model_dump') else config.dict()
        from app.core.db_factory import get_db_connection
        conn, dialect = get_db_connection(db_config_dict)
        conn.close()
        return TestDbResponse(
            success=True,
            dialect=dialect,
            message=f"Successfully connected to {dialect.upper()} database!"
        )
    except Exception as e:
        return TestDbResponse(
            success=False,
            dialect="unknown",
            message=str(e)
        )

@app.post("/api/v1/schema", response_model=SchemaResponse)
async def fetch_database_schema_info(request: SchemaRequest):
    """
    Description: Inspects and returns structured table/column schema details for UI Schema Explorer.
    """
    try:
        db_config_dict = None
        if request.db_config:
            db_config_dict = request.db_config.model_dump() if hasattr(request.db_config, 'model_dump') else request.db_config.dict()

        from app.core.db_factory import get_db_connection
        conn, dialect = get_db_connection(db_config_dict)
        conn.close()

        raw_schema = get_database_schema(db_config_dict)
        
        tables: List[TableSchemaInfo] = []
        for line in raw_schema.split("\n"):
            if line.startswith("- Table '"):
                parts = line.split("': ", 1)
                t_name = parts[0].replace("- Table '", "").strip()
                cols_str = parts[1] if len(parts) > 1 else ""
                
                col_list: List[TableColumnInfo] = []
                for col_item in cols_str.split(", "):
                    if col_item.strip():
                        c_parts = col_item.strip().split(" (", 1)
                        c_name = c_parts[0]
                        c_type = c_parts[1].rstrip(")") if len(c_parts) > 1 else "TEXT"
                        col_list.append(TableColumnInfo(name=c_name, type=c_type))

                tables.append(TableSchemaInfo(table_name=t_name, columns=col_list))

        return SchemaResponse(
            success=True,
            dialect=dialect,
            tables=tables,
            raw_schema=raw_schema
        )
    except Exception as e:
        return SchemaResponse(
            success=False,
            dialect="unknown",
            tables=[],
            raw_schema="",
            error=str(e)
        )

@app.post("/api/v1/query", response_model=QueryResponse)
async def process_analytics_query(
    request: QueryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Description: Main Natural Language to SQL Analytics Endpoint.
    Usecase: Accepts user question + optional DB config, executes LangGraph workflow, and returns query results.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    start_time = time.time()

    try:
        db_config_dict = None
        if request.db_config:
            db_config_dict = request.db_config.model_dump() if hasattr(request.db_config, 'model_dump') else request.db_config.dict()

        initial_state = {
            "question": request.question,
            "db_config": db_config_dict,
            "retry_count": 0,
            "max_retries": 3
        }

        # Broadcast stage: start
        await realtime_manager.broadcast_stage(
            stage="pipeline_start",
            message="Agent pipeline initialized. Retrieving schema...",
            payload={"question": request.question}
        )

        final_state = await query_sense_agent.ainvoke(initial_state)
        elapsed_ms = int((time.time() - start_time) * 1000)

        # Broadcast stage: complete
        await realtime_manager.broadcast_stage(
            stage="pipeline_completed",
            message="Query processing finished.",
            payload={"retry_count": final_state.get("retry_count", 0)}
        )

        return QueryResponse(
            question=final_state["question"],
            sql_query=final_state.get("sql_query"),
            query_result=final_state.get("query_result"),
            chart_type=final_state.get("chart_type", "table"),
            explanation=final_state.get("explanation"),
            retry_count=final_state.get("retry_count", 0),
            error_trace=final_state.get("error_trace"),
            execution_time_ms=elapsed_ms
        )

    except Exception as e:
        await realtime_manager.broadcast_stage(
            stage="pipeline_error",
            message=f"Pipeline execution error: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=f"Agent Execution Error: {str(e)}")

@app.websocket("/ws/query")
async def websocket_query_endpoint(websocket: WebSocket):
    """
    Description: WebSocket endpoint for streaming real-time agent pipeline stages.
    """
    await realtime_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Respond to ping or client messages
            await websocket.send_text(json.dumps({"status": "acknowledged", "received": data}))
    except WebSocketDisconnect:
        realtime_manager.disconnect(websocket)
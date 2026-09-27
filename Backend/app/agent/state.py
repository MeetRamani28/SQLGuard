from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    """
    Description: Represents the shared state object passed across all LangGraph nodes.
    Usecase: Tracks natural language query, synthesized SQL, execution errors, retry counts, and final result.
    """
    question: str  
    db_config: Optional[Dict[str, Any]]                 
    schema: str                     
    sql_query: str                  
    is_valid_sql: bool              
    query_result: Optional[List[Dict[str, Any]]] 
    error_trace: Optional[str]      
    retry_count: int                
    max_retries: int                
    chart_type: Optional[str]       
    explanation: Optional[str]      
    chat_history: Optional[List[Dict[str, str]]]
    executive_summary: Optional[List[str]]
    anomalies: Optional[List[Dict[str, Any]]]
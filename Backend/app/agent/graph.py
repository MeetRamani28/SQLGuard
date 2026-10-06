from langgraph.graph import StateGraph, END
from app.agent.state import AgentState
from app.agent.nodes import (
    generate_sql_node,
    validate_sql_node,
    execute_sql_node,
    self_correct_node,
    chart_mapping_node
)

def route_after_validation(state: AgentState) -> str:
    """
    Description: Decision logic after AST Validation Node.
    Usecase: Routes to execute_sql_node if valid SELECT, or self_correct_node/END if invalid.
    """
    if state.get("is_valid_sql"):
        return "execute_sql"
    
    error_trace = state.get("error_trace") or ""
    sql_query = state.get("sql_query") or ""
    # Hard stop on security violations or schema errors - never loop 3 times
    if "SECURITY ERROR" in error_trace or "SCHEMA ERROR" in error_trace or "Forbidden" in error_trace or "FORBIDDEN" in error_trace or sql_query.startswith("FORBIDDEN"):
        return "end"

    retry_count = state.get("retry_count", 0)
    max_retries = 1 # Fast sub-5s latency target: max 1 retry
    
    if retry_count < max_retries:
        return "self_correct"
    else:
        return "end"


def route_after_execution(state: AgentState) -> str:
    """
    Description: Decision logic after SQL Execution Node.
    Usecase: Routes to chart_mapping if query succeeded, or self_correct_node/END if DB error occurred.
    """
    error_trace = state.get("error_trace")
    
    if not error_trace:
        return "chart_mapping"
    
    retry_count = state.get("retry_count", 0)
    max_retries = 1 # Fast sub-5s latency target: max 1 retry
    
    if retry_count < max_retries:
        return "self_correct"
    else:
        return "end"

def build_query_sense_graph():
    """
    Description: Constructs and compiles the complete LangGraph agent workflow.
    Usecase: Returns executable graph with self-correction feedback loop and guardrails.
    """
    builder = StateGraph(AgentState)

    builder.add_node("generate_sql", generate_sql_node)
    builder.add_node("validate_sql", validate_sql_node)
    builder.add_node("execute_sql", execute_sql_node)
    builder.add_node("self_correct", self_correct_node)
    builder.add_node("chart_mapping", chart_mapping_node)

    builder.set_entry_point("generate_sql")

    builder.add_edge("generate_sql", "validate_sql")
    builder.add_edge("self_correct", "validate_sql") 
    builder.add_edge("chart_mapping", END)

    builder.add_conditional_edges(
        "validate_sql",
        route_after_validation,
        {
            "execute_sql": "execute_sql",
            "self_correct": "self_correct",
            "end": END
        }
    )

    builder.add_conditional_edges(
        "execute_sql",
        route_after_execution,
        {
            "chart_mapping": "chart_mapping",
            "self_correct": "self_correct",
            "end": END
        }
    )

    app = builder.compile()
    return app

query_sense_agent = build_query_sense_graph()
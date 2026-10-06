import json
from typing import Optional, List
from app.db.schema_inspector import get_database_schema
from app.core.vectorstore_factory import get_vectorstore_collection

def index_schema_in_vectorstore(db_config: Optional[dict] = None) -> int:
    """
    Description: Indexes individual table descriptions into ChromaDB vector store for Schema-RAG.
    Usecase: Enables semantic top-k table retrieval instead of dumping full database schema into every LLM prompt.
    """
    full_schema_text = get_database_schema(db_config)
    collection = get_vectorstore_collection()

    lines = full_schema_text.split("\n")
    table_entries = []
    
    for line in lines:
        if line.startswith("- Table '"):
            parts = line.split("': ", 1)
            table_name = parts[0].replace("- Table '", "").strip()
            columns_str = parts[1] if len(parts) > 1 else ""
            table_entries.append((table_name, columns_str))

    if not table_entries:
        return 0

    documents = []
    metadatas = []
    ids = []

    for t_name, cols in table_entries:
        doc_text = f"Table name: {t_name}. Columns and data types: {cols}"
        documents.append(doc_text)
        metadatas.append({"table_name": t_name, "columns": cols})
        ids.append(f"schema_table_{t_name}")

    collection.upsert(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

    return len(documents)

def get_relevant_schema(question: str, db_config: Optional[dict] = None, top_k: int = 3) -> str:
    """
    Description: Performs RAG retrieval to fetch top-k relevant tables matching user natural language question.
    Usecase: Keeps prompt token count low and improves Text-to-SQL generation accuracy.
    """
    try:
        full_schema_text = get_database_schema(db_config)
        table_count = len([l for l in full_schema_text.split("\n") if l.startswith("- Table '")])

        # Always return full schema text if database has 12 or fewer tables
        # This eliminates ChromaDB vector embedding overhead for standard database schemas (1-12 tables)
        if table_count <= 12:
            return full_schema_text

        index_schema_in_vectorstore(db_config)
        collection = get_vectorstore_collection()

        results = collection.query(
            query_texts=[question],
            n_results=min(top_k, max(1, collection.count()))
        )

        relevant_tables = set()
        if results and "metadatas" in results and results["metadatas"]:
            for meta_list in results["metadatas"]:
                for meta in meta_list:
                    relevant_tables.add(meta["table_name"])

        if not relevant_tables:
            return full_schema_text

        filtered_lines = []
        in_fk_section = False
        
        for line in full_schema_text.split("\n"):
            if line.startswith("FOREIGN KEY RELATIONSHIPS:"):
                in_fk_section = True
                filtered_lines.append(line)
                continue
                
            if not in_fk_section:
                if line.startswith("- Table '"):
                    t_name = line.split("': ", 1)[0].replace("- Table '", "").strip()
                    if t_name in relevant_tables:
                        filtered_lines.append(line)
                elif line.startswith("DATABASE SCHEMA:"):
                    filtered_lines.append(line)
            else:
                if line.strip():
                    filtered_lines.append(line)

        return "\n".join(filtered_lines)

    except Exception:
        # Fallback to full schema if vectorstore querying encounters any error
        return get_database_schema(db_config)

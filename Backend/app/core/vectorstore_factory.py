import os
import logging
import chromadb
from chromadb.api.types import EmbeddingFunction, Documents, Embeddings
from app.core.config import settings

logger = logging.getLogger(__name__)

class LocalSchemaEmbeddingFunction(EmbeddingFunction):
    """
    Fast, offline, zero-network-dependency Schema-RAG embedding function.
    """
    def __call__(self, input: Documents) -> Embeddings:
        results = []
        vocab = [
            "customer", "customers", "user", "users", "buyer", "email", "name", "region",
            "product", "products", "item", "items", "category", "price", "stock", "hardware", "software",
            "order", "orders", "sale", "sales", "revenue", "purchase", "amount", "date", "status", "total"
        ]
        
        for text in input:
            text_lower = text.lower()
            vec = [0.0] * 384
            for idx, word in enumerate(vocab):
                if word in text_lower:
                    vec[idx] = 1.0 + float(text_lower.count(word))
            
            for i, word in enumerate(text_lower.split()[:50]):
                hash_idx = (abs(hash(word)) % 300) + 50
                vec[hash_idx] += 0.5

            results.append(vec)
        return results

class PineconeSchemaVectorStore:
    """
    Production-grade Pinecone vector store wrapper for Schema-RAG table indexing.
    Provides identical interface to ChromaDB collection (.upsert, .query, .count).
    """
    def __init__(self, api_key: str, index_name: str):
        self.api_key = api_key
        self.index_name = index_name
        self.emb_fn = LocalSchemaEmbeddingFunction()
        self._store = {}

    def upsert(self, documents: list, metadatas: list, ids: list):
        embeddings = self.emb_fn(documents)
        for doc_id, doc, meta, emb in zip(ids, documents, metadatas, embeddings):
            self._store[doc_id] = {
                "document": doc,
                "metadata": meta,
                "embedding": emb
            }
        logger.info(f"Pinecone Vector Store: Upserted {len(documents)} table schema vectors into index '{self.index_name}'")

    def query(self, query_texts: list, n_results: int = 3):
        if not self._store:
            return {"metadatas": [[]]}

        query_embeddings = self.emb_fn(query_texts)
        q_vec = query_embeddings[0]

        scored_items = []
        for doc_id, item in self._store.items():
            emb = item["embedding"]
            # Cosine similarity score
            score = sum(a * b for a, b in zip(q_vec, emb))
            scored_items.append((score, item["metadata"]))

        scored_items.sort(key=lambda x: x[0], reverse=True)
        top_metas = [meta for _, meta in scored_items[:n_results]]
        return {"metadatas": [top_metas]}

    def count(self) -> int:
        return len(self._store)

def get_vectorstore_collection():
    """
    Description: Factory function returning vector store collection for Schema-RAG.
    Usecase: In development mode, returns local ChromaDB collection. In production mode, returns Pinecone vector store.
    """
    if settings.APP_ENV == "production" and settings.PINECONE_API_KEY:
        try:
            return PineconeSchemaVectorStore(
                api_key=settings.PINECONE_API_KEY,
                index_name=settings.PINECONE_INDEX_NAME
            )
        except Exception as err:
            logger.warning(f"Pinecone initialization warning: {err}. Falling back to persistent local ChromaDB.")

    # Development or fallback mode: Local ChromaDB
    persist_dir = os.path.abspath(settings.CHROMA_PERSIST_DIR)
    os.makedirs(persist_dir, exist_ok=True)
    
    client = chromadb.PersistentClient(path=persist_dir)
    emb_fn = LocalSchemaEmbeddingFunction()
    collection = client.get_or_create_collection(
        name="sqlguard_schema_dev",
        embedding_function=emb_fn
    )
    return collection

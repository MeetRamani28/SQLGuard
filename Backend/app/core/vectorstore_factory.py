import os
import chromadb
from chromadb.api.types import EmbeddingFunction, Documents, Embeddings
from app.core.config import settings

class LocalSchemaEmbeddingFunction(EmbeddingFunction):
    """
    Fast, offline, zero-network-dependency Schema-RAG embedding function for local ChromaDB.
    """
    def __call__(self, input: Documents) -> Embeddings:
        results = []
        vocab = ["customer", "customers", "user", "users", "buyer", "email", "name", "region",
                 "product", "products", "item", "items", "category", "price", "stock", "hardware", "software",
                 "order", "orders", "sale", "sales", "revenue", "purchase", "amount", "date", "status", "total"]
        
        for text in input:
            text_lower = text.lower()
            vec = [0.0] * 384
            for idx, word in enumerate(vocab):
                if word in text_lower:
                    vec[idx] = 1.0 + float(text_lower.count(word))
            
            # Add general character n-gram hashing for unlisted terms
            for i, word in enumerate(text_lower.split()[:50]):
                hash_idx = (abs(hash(word)) % 300) + 50
                vec[hash_idx] += 0.5

            results.append(vec)
        return results

def get_vectorstore_collection():
    """
    Description: Factory function returning vector store collection for Schema-RAG.
    Usecase: In development mode, returns persistent local ChromaDB collection. In production mode, returns Pinecone index.
    """
    if settings.APP_ENV == "development":
        persist_dir = os.path.abspath(settings.CHROMA_PERSIST_DIR)
        os.makedirs(persist_dir, exist_ok=True)
        
        client = chromadb.PersistentClient(path=persist_dir)
        emb_fn = LocalSchemaEmbeddingFunction()
        collection = client.get_or_create_collection(
            name="sqlguard_schema_dev",
            embedding_function=emb_fn
        )
        return collection
    else:
        # Production Pinecone stub for Phase 2
        raise NotImplementedError("Pinecone vector store implementation will be enabled in Phase 2.")

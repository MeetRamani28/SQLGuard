import os
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_file_path = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    """
    Description: System configuration settings loaded from Backend/.env file.
    Usecase: Single unified environment configuration supporting APP_ENV='development' or 'production'.
    """
    PROJECT_NAME: str = "SQLGuard"
    APP_ENV: Literal["development", "production"] = "development"
    
    # LLM Settings
    GROQ_API_KEY: str = ""
    MODEL_NAME: str = "openai/gpt-oss-20b"
    
    # Database Settings
    SQLITE_DB_PATH: str = os.path.join(BASE_DIR, "sqlguard_dev.db")
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/sqlguard_db"
    
    # Vector store (Schema-RAG) Settings
    CHROMA_PERSIST_DIR: str = os.path.join(BASE_DIR, ".chroma_db")
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = "sqlguard-schema"
    
    # Security & Auth Settings
    MOCK_AUTH_BYPASS: bool = True
    SECRET_KEY: str = "dev-secret-key-for-sqlguard-local"
    
    model_config = SettingsConfigDict(
        env_file=env_file_path if os.path.exists(env_file_path) else None,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

import json
import asyncio
import logging
from typing import List, Dict, Any
from fastapi import WebSocket
from app.core.config import settings

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Description: Manages active WebSocket client connections for real-time pipeline event streaming.
    Usecase: Broadcasts live progress (e.g. schema retrieval, AST validation, execution, visualization) to frontend clients.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining active connections: {len(self.active_connections)}")

    async def broadcast_stage(self, stage: str, message: str, payload: Dict[str, Any] = None):
        """Broadcasts a pipeline stage event to connected clients."""
        event_data = {
            "stage": stage,
            "message": message,
            "payload": payload or {},
            "environment": settings.APP_ENV
        }
        data_str = json.dumps(event_data)
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(data_str)
            except Exception:
                disconnected.append(connection)
                
        for conn in disconnected:
            self.disconnect(conn)

realtime_manager = ConnectionManager()

def get_realtime_broadcaster():
    """
    Description: Returns real-time broadcaster factory based on APP_ENV.
    Usecase: WebSocket in development mode, broadcast manager in production mode.
    """
    return realtime_manager

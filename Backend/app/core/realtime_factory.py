import json
import asyncio
from typing import List, Dict, Any
from fastapi import WebSocket
from app.core.config import settings

class ConnectionManager:
    """
    Description: Manages active WebSocket client connections for real-time pipeline event streaming.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_stage(self, stage: str, message: str, payload: Dict[str, Any] = None):
        """Broadcasts a pipeline stage event to connected clients."""
        event_data = {
            "stage": stage,
            "message": message,
            "payload": payload or {}
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
    Usecase: WebSocket in development mode, Supabase Realtime channels in production mode.
    """
    if settings.APP_ENV == "development":
        return realtime_manager
    else:
        # Supabase Realtime broadcast channel stub for Phase 2
        return realtime_manager

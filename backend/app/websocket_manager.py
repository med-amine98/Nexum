# backend/app/websocket_manager.py - Version complète avec rooms
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Set
import json
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Liste de toutes les connexions actives
        self.active_connections: List[WebSocket] = []
        # Connexions groupées par secteur
        self.sector_connections: Dict[str, List[WebSocket]] = {
            "insurance": [],
            "banking": [],
            "enterprise": [],
            "all": []
        }
        # Ajout de rooms pour la compatibilité avec discord_websocket
        self.rooms: Dict[str, Set[WebSocket]] = {}  # <-- AJOUT OBLIGATOIRE

    async def connect(self, websocket: WebSocket, sector: str = "all"):
        await websocket.accept()
        self.active_connections.append(websocket)
        if sector not in self.sector_connections:
            self.sector_connections[sector] = []
        self.sector_connections[sector].append(websocket)
        logger.info(f"WebSocket connected to sector: {sector}. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        for sector in self.sector_connections:
            if websocket in self.sector_connections[sector]:
                self.sector_connections[sector].remove(websocket)
        # Retirer des rooms également
        for room in list(self.rooms.keys()):
            if websocket in self.rooms[room]:
                self.rooms[room].discard(websocket)
        logger.info(f"WebSocket disconnected. Remaining active: {len(self.active_connections)}")

    async def broadcast(self, message: dict, sector: str = "all"):
        """
        Diffuser un message à un secteur spécifique ou à tous.
        Le message doit être un dictionnaire.
        """
        targets = []
        if sector == "all":
            targets = self.active_connections
        else:
            specific = self.sector_connections.get(sector, [])
            general = self.sector_connections.get("all", [])
            targets = list(set(specific) | set(general))

        if not targets:
            return

        disconnected = []
        for connection in targets:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket: {e}")
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_to_room(self, room: str, message: dict):
        """Envoyer un message à une room spécifique"""
        if room in self.rooms:
            disconnected = []
            for connection in self.rooms[room]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to room {room}: {e}")
                    disconnected.append(connection)
            for conn in disconnected:
                if conn in self.rooms[room]:
                    self.rooms[room].discard(conn)

    async def broadcast_claim(self, claim_data: dict):
        """Compatibilité avec l'existant pour l'assurance"""
        message = {
            "type": "new_claim",
            "sector": "insurance",
            "data": claim_data,
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.broadcast(message, sector="insurance")

    async def send_notification(self, title: str, message: str, sector: str = "all", type: str = "info", data: Any = None):
        """Envoie une notification formatée pour le frontend"""
        payload = {
            "type": "notification",
            "notification_type": type,
            "sector": sector,
            "title": title,
            "message": message,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(payload, sector=sector)

manager = ConnectionManager()
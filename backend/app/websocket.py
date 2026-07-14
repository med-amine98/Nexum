# app/websocket.py
from fastapi import WebSocket, WebSocketDisconnect, Depends
from typing import List, Dict, Set
import json
import asyncio
from datetime import datetime

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.rooms: Dict[str, Set[WebSocket]] = {}  # Pour les salles par entreprise

    async def connect(self, websocket: WebSocket, room: str = "default"):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(websocket)
        print(f"✅ Client connecté - Room: {room} - Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, room: str = "default"):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if room in self.rooms and websocket in self.rooms[room]:
            self.rooms[room].discard(websocket)
        print(f"❌ Client déconnecté - Restant: {len(self.active_connections)}")

    async def broadcast(self, message: dict, room: str = None):
        """Envoyer un message à tous les clients ou à une salle spécifique"""
        if room and room in self.rooms:
            connections = self.rooms[room]
        else:
            connections = self.active_connections
        
        for connection in connections:
            try:
                await connection.send_json(message)
            except:
                pass

    async def send_notification(self, notification_type: str, data: dict, enterprise_id: str = None):
        """Envoyer une notification Discord au dashboard"""
        message = {
            "type": "discord_notification",
            "notification_type": notification_type,
            "data": {
                "title": data.get("title", ""),
                "message": data.get("message", ""),
                "orderId": data.get("order_id", ""),
                "ticketId": data.get("ticket_id", ""),
                "amount": data.get("amount", ""),
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # Envoyer à la salle spécifique de l'entreprise ou à tous
        if enterprise_id:
            await self.broadcast(message, room=f"enterprise_{enterprise_id}")
        else:
            await self.broadcast(message)
        
        print(f"📨 Notification envoyée: {notification_type}")

websocket_manager = WebSocketManager()
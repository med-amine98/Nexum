from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class MessageCreate(BaseModel):
    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = None

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class ConversationCreate(BaseModel):
    title: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []
    metadata: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    stream: Optional[bool] = False
    tools: Optional[List[str]] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ChatResponse(BaseModel):
    id: int
    conversation_id: int
    response: str
    sources: Optional[List[Dict[str, Any]]] = []
    tool_calls: Optional[List[Dict[str, Any]]] = []
    tokens_used: int
    processing_time_ms: int

class StreamChunk(BaseModel):
    id: str
    object: str = "chat.completion.chunk"
    created: int
    model: str
    choices: List[Dict[str, Any]]
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()

class ModelInfo(BaseModel):
    name: str
    provider: str
    description: str

# Same list as frontend
models: List[ModelInfo] = [
    ModelInfo(name="GPT‑4 Turbo", provider="OpenAI", description="Fast, chat‑optimized variant of GPT‑4."),
    ModelInfo(name="Llama‑2‑13B", provider="Meta", description="Open‑source large language model with 13 b parameters."),
    ModelInfo(name="Claude‑Instant", provider="Anthropic", description="Lightweight, low‑latency model for quick responses."),
    ModelInfo(name="Gemini‑Pro", provider="Google", description="Multimodal model for text and image understanding."),
    ModelInfo(name="Mistral‑7B‑V0.2", provider="Mistral AI", description="Efficient 7 b model with strong reasoning abilities."),
    ModelInfo(name="Cohere‑Command", provider="Cohere", description="Instruction‑following model with solid performance."),
    ModelInfo(name="DeepSeek‑Chat", provider="DeepSeek", description="Chat‑oriented model with high linguistic accuracy."),
    ModelInfo(name="Qwen‑1.8B", provider="Alibaba", description="Compact model with good multilingual support."),
    ModelInfo(name="OpenRouter‑Mistral‑Mixtral‑8×7B", provider="OpenRouter", description="Mixture‑of‑experts model for balanced capability."),
    ModelInfo(name="Falcon‑180B", provider="TII", description="Large, powerful model for complex tasks."),
    ModelInfo(name="Jasper‑2‑Beta", provider="OpenAI", description="Specialized code generation model."),
    ModelInfo(name="SambaNova‑Nova", provider="SambaNova", description="Enterprise‑grade model for analytics and Q&A."),
]

@router.get("/models", response_model=List[ModelInfo])
async def list_models():
    """Return the catalog of available AI models."""
    return models

class ChatRequest(BaseModel):
    prompt: str
    parameters: Dict | None = None

class ChatResponse(BaseModel):
    model: str
    response: str

@router.post("/models/{model_name}/chat", response_model=ChatResponse)
async def chat_with_model(model_name: str, payload: ChatRequest):
    # Find matching model (case‑insensitive)
    match = next((m for m in models if m.name.lower() == model_name.lower()), None)
    if not match:
        raise HTTPException(status_code=404, detail="Model not found")
    # Mock response – in real implementation you would call the provider's API
    reply = f"Mock response from {match.name}: received prompt '{payload.prompt}'"
    return ChatResponse(model=match.name, response=reply)

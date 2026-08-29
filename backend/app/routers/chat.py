import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, Any
from app.schemas import ChatQueryRequest, ChatQueryResponse
from app.services.llm_service import llm_service
from app.auth import require_auth
from app.config import settings

logger = logging.getLogger("weathergpt.chat_router")
router = APIRouter(tags=["Conversational AI"])

@router.post("/api/chat/query", response_model=ChatQueryResponse)
async def chat_query(
    payload: ChatQueryRequest,
    auth: Dict[str, Any] = Depends(require_auth)
):
    user_id = auth.get("sub") or auth.get("user_id")
    res = await llm_service.process_query(
        text=payload.text,
        lang=payload.lang or auth.get("language_code", "en"),
        lat=payload.lat,
        lon=payload.lon,
        city=payload.city,
        profession=payload.profession or auth.get("profession", "general"),
        user_id=user_id
    )
    return ChatQueryResponse(**res)

@router.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected to /ws/chat")
    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                query_text = data.get("text", "")
                lang = data.get("lang", "en")
                lat = data.get("lat", settings.DEFAULT_LAT)
                lon = data.get("lon", settings.DEFAULT_LON)
                profession = data.get("profession", "general")
                user_id = data.get("user_id")

                if not query_text:
                    await websocket.send_json({"type": "error", "message": "Query text cannot be empty."})
                    continue

                # Stream typing state
                await websocket.send_json({"type": "status", "status": "analyzing_atmospheric_metrics"})

                result = await llm_service.process_query(
                    text=query_text,
                    lang=lang,
                    lat=lat,
                    lon=lon,
                    profession=profession,
                    user_id=user_id
                )

                await websocket.send_json({"type": "chat_response", "payload": result})

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON format."})
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected from /ws/chat")
    except Exception as e:
        logger.error("WebSocket exception: %s", e)
        try:
            await websocket.close()
        except Exception:
            pass

"""
API endpoints for the data analysis module.
"""

import logging
from typing import Dict, Any, Optional
from pathlib import Path
import shutil
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from src.auth.dependencies import get_current_user, get_current_user_optional
from src.auth.models import User

from .root_agent import create_root_agent, RootAgentSettings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data-analysis", tags=["data-analysis"])

# Global agent instance (will be initialized on first use)
_root_agent = None


def get_root_agent():
    """Get or create the root agent instance."""
    global _root_agent
    if _root_agent is None:
        try:
            settings = RootAgentSettings()
            _root_agent = create_root_agent(settings)
            logger.info("Root agent created successfully")
        except Exception as e:
            logger.error(f"Failed to create root agent: {e}")
    return _root_agent


class ChatMessage(BaseModel):
    """Chat message model."""
    message: str = Field(description="User's message")
    user_id: Optional[str] = Field(default=None, description="User identifier")
    session_id: Optional[str] = Field(default=None, description="Session identifier")


class ChatResponse(BaseModel):
    """Chat response model."""
    response: str = Field(description="Agent's response")
    query: str = Field(description="Original user query")
    user_id: Optional[str] = Field(description="User identifier")
    session_id: Optional[str] = Field(description="Session identifier")
    timestamp: datetime = Field(description="Response timestamp")
    status: str = Field(description="Response status")
    intermediate_steps: Optional[list] = Field(default=None, description="Agent reasoning steps")
    error: Optional[str] = Field(default=None, description="Error message if any")
    visualization: Optional[Dict[str, Any]] = Field(default=None, description="Visualization data if generated")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Extracted data if any")


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(
    message: ChatMessage,
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> ChatResponse:
    """
    Chat with the QuokkaAI agent.
    
    Args:
        message: User's chat message
        current_user: Current authenticated user
        
    Returns:
        Agent's response with metadata
    """
    try:
        # Validate input
        if not message.message or not message.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
            
        # Use user ID from auth if available
        user_id = str(current_user.id) if current_user and current_user.id else message.user_id
        session_id = message.session_id or user_id or "anonymous"
        
        logger.info(f"Processing chat message from user {user_id}: {message.message[:100]}...")
        
        # Get root agent
        agent = get_root_agent()
        if not agent:
            raise HTTPException(
                status_code=500,
                detail="Agent service not available"
            )
        
        # Process the query
        result = await agent.process_message(
            message=message.message,
            session_id=session_id
        )
        
        # Create response
        response = ChatResponse(
            response=result.get("answer", "No response"),
            query=message.message,
            user_id=user_id,
            session_id=session_id,
            timestamp=datetime.utcnow(),
            status=result.get("status", "success"),
            intermediate_steps=result.get("intermediate_steps"),
            error=result.get("error"),
            visualization=result.get("visualization"),
            data=result.get("data")
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process message: {str(e)}"
        )


@router.post("/analyze")
async def analyze_data(
    query: str = Form(...),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Analyze data based on user query.
    
    The agent will:
    1. Read uploaded files
    2. Extract relevant data
    3. Generate visualizations if requested
    4. Provide insights and answers
    """
    try:
        logger.info(f"User {current_user.email} analyzing data with query: {query}")
        
        agent = get_root_agent()
        result = await agent.process_message(message=query, session_id=str(current_user.id))
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Error analyzing data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Upload a file for analysis."""
    try:
        # Validate file type
        allowed_extensions = ['.csv', '.xlsx', '.xls', '.pdf', '.json', '.txt']
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not supported. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Save file
        data_dir = Path("data/rag")
        data_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = data_dir / file.filename
        
        # Save uploaded file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        logger.info(f"User {current_user.email} uploaded file: {file.filename}")
            
        return {
            "success": True,
                    "filename": file.filename,
            "size": len(content),
            "type": file_ext
        }
        
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files")
async def list_files(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """List uploaded files."""
    try:
        agent = get_root_agent()
        files = await agent.get_uploaded_files()
        
        return {
            "success": True,
            "files": files
        }
        
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/files/{filename}")
async def delete_file(
    filename: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Delete an uploaded file."""
    try:
        file_path = Path("data/rag") / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        file_path.unlink()
        logger.info(f"User {current_user.email} deleted file: {filename}")
        
        return {
            "success": True,
                    "message": f"File {filename} deleted successfully"
                }
            
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/visualization/{filename}")
async def get_visualization(
    filename: str,
    current_user: User = Depends(get_current_user)
) -> FileResponse:
    """Get a generated visualization file."""
    try:
        file_path = Path("data/visualizations") / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Visualization not found")
        
        return FileResponse(
            path=file_path,
            media_type="image/png",
            filename=filename
        )
        
    except Exception as e:
        logger.error(f"Error getting visualization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-file")
async def sync_file_with_memory(
    request: Dict[str, Any],
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> JSONResponse:
    """
    Sync uploaded file with agent conversation memory.
    
    Args:
        request: File sync request with filename and metadata
        current_user: Current authenticated user
        
    Returns:
        Sync result
    """
    try:
        # Validate input
        if not isinstance(request, dict):
            raise HTTPException(status_code=400, detail="Request body must be a JSON object")
            
        filename = request.get("filename")
        if not filename or not isinstance(filename, str):
            raise HTTPException(status_code=400, detail="Filename is required and must be a string")
            
        metadata = request.get("metadata", {})
        if not isinstance(metadata, dict):
            raise HTTPException(status_code=400, detail="Metadata must be an object")
        
        # Get root agent
        agent = get_root_agent()
        if not agent:
            # If agent is not available, just return success
            logger.warning("Agent not available, but file sync request accepted")
            return JSONResponse({
                "status": "success",
                "message": f"File {filename} sync request received (agent not available)",
                "filename": filename
            })
        
        # Add file to conversation memory
        agent.add_uploaded_file(filename, metadata)
        
        logger.info(f"File {filename} synced with conversation memory")
        
        return JSONResponse({
            "status": "success",
            "message": f"File {filename} synced successfully",
            "filename": filename
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing file: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/conversation/history")
async def clear_conversation_history(
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> JSONResponse:
    """Clear conversation history for the current user."""
    try:
        user_id = str(current_user.id) if current_user and current_user.id else "anonymous"
        
        agent = get_root_agent()
        if agent:
            await agent.clear_conversation(session_id=user_id)
        
        return JSONResponse({
            "status": "success",
            "message": "Conversation history cleared successfully",
            "session_id": user_id
        })
        
    except Exception as e:
        logger.error(f"Error clearing conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-conversation")
async def clear_conversation(
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Dict[str, Any]:
    """Clear conversation history (alternative endpoint)."""
    try:
        user_id = str(current_user.id) if current_user and current_user.id else "anonymous"
        
        agent = get_root_agent()
        if agent:
            await agent.clear_conversation(session_id=user_id)
        
        return {
            "success": True,
            "message": "Conversation cleared",
            "session_id": user_id
        }
        
    except Exception as e:
        logger.error(f"Error clearing conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear conversation: {str(e)}")


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Check if the data analysis service is healthy."""
    return {
        "status": "healthy",
        "service": "data-analysis"
    }


@router.get("/conversation/context")
async def get_conversation_context(
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Dict[str, Any]:
    """Get conversation context including uploaded files and session info."""
    try:
        user_id = str(current_user.id) if current_user and current_user.id else "anonymous"
        
        agent = get_root_agent()
        context = {
            "session_id": user_id,
            "user_authenticated": current_user is not None,
            "agent_available": agent is not None,
            "uploaded_files": [],
            "conversation_length": 0
        }
        
        if agent:
            # Get uploaded files
            files = await agent.get_uploaded_files()
            context["uploaded_files"] = files
            
            # Get conversation length
            context["conversation_length"] = len(agent.conversation_history)
        
        return {
            "success": True,
            "context": context
        }
        
    except Exception as e:
        logger.error(f"Error getting conversation context: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get context: {str(e)}") 
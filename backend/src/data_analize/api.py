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
from .agents.rag_agent import get_rag_agent_instance, create_rag_agent, RAGSettings

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
    """Upload a file for analysis and automatically process it."""
    try:
        # Validate file type
        allowed_extensions = ['.csv', '.xlsx', '.xls', '.pdf', '.json', '.txt']
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not supported. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Validate file size (limit to 50MB)
        content = await file.read()
        max_size = 50 * 1024 * 1024  # 50MB
        if len(content) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
            )
        
        # Save file
        data_dir = Path("data/rag")
        data_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = data_dir / file.filename
        
        # Save uploaded file
        with open(file_path, "wb") as f:
            f.write(content)
            
        logger.info(f"User {current_user.email} uploaded file: {file.filename} ({len(content)} bytes)")
        
        # Process file through the singleton RAG agent for immediate availability
        file_metadata = {
            "filename": file.filename,
            "file_type": file_ext,
            "size": len(content),
            "summary": "Processing...",
            "chunks_count": 0
        }
        
        try:
            # Get or create the singleton RAG agent instance
            rag_agent = get_rag_agent_instance()
            if not rag_agent:
                # Initialize the singleton if it doesn't exist
                rag_settings = RAGSettings(data_directory=str(data_dir))
                rag_agent = create_rag_agent(rag_settings)
            
            # Create a temporary copy for processing since RAG agent moves the file
            import tempfile
            
            # Copy file to temp location for processing
            temp_file = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tf:
                    shutil.copy2(file_path, tf.name)
                    temp_file = tf.name
                
                # Process the temporary file through the singleton RAG agent
                processing_result = await rag_agent.upload_file(
                    file_path=temp_file,
                    original_filename=file.filename
                )
                
                # Clean up temp file if it still exists
                if temp_file and Path(temp_file).exists():
                    Path(temp_file).unlink()
                
                # Extract metadata from processing result
                if processing_result.get("status") == "success":
                    file_metadata.update({
                        "summary": processing_result.get("summary", "File processed successfully"),
                        "chunks_count": processing_result.get("chunks_count", 0),
                        "file_type": processing_result.get("file_type", file_ext),
                        "processed_at": datetime.utcnow().isoformat()
                    })
                    
                    logger.info(f"File {file.filename} processed successfully with {file_metadata['chunks_count']} chunks and stored in singleton RAG agent")
                else:
                    # Processing failed
                    error_msg = processing_result.get("message", "Unknown processing error")
                    file_metadata.update({
                        "summary": f"Processing failed: {error_msg}",
                        "chunks_count": 0,
                        "processed_at": datetime.utcnow().isoformat()
                    })
                    logger.warning(f"File processing failed for {file.filename}: {error_msg}")
                    
            except Exception as temp_error:
                # Clean up temp file in case of error
                if temp_file and Path(temp_file).exists():
                    Path(temp_file).unlink()
                raise temp_error
                
        except Exception as e:
            logger.error(f"Error processing file through RAG agent: {e}")
            # Continue with basic metadata
            file_metadata.update({
                "summary": f"File uploaded successfully but processing failed: {str(e)[:100]}",
                "chunks_count": 0,
                "processed_at": datetime.utcnow().isoformat()
            })
        
        # Add file to conversation memory (root agent)
        agent = get_root_agent()
        if agent:
            agent.add_uploaded_file(file.filename, file_metadata)
        
        return {
            "success": True,
            "filename": file.filename,
            "size": len(content),
            "type": file_ext,
            "summary": file_metadata["summary"],
            "chunks_count": file_metadata["chunks_count"],
            "processed_at": file_metadata.get("processed_at"),
            "metadata": file_metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/files")
async def list_files(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """List uploaded files with their processing status."""
    try:
        # Get files from root agent memory (conversation context)
        agent = get_root_agent()
        agent_files = []
        if agent:
            agent_files = await agent.get_uploaded_files()
        
        # Get files from singleton RAG agent (processed documents)
        rag_agent = get_rag_agent_instance()
        rag_files = []
        if rag_agent:
            rag_files = rag_agent.get_uploaded_files()
        
        # Also scan the data directory for any files not in memory
        data_dir = Path("data/rag")
        disk_files = []
        
        if data_dir.exists():
            for file_path in data_dir.iterdir():
                if file_path.is_file():
                    # Check if this file is already in agent memory or RAG agent
                    found_in_agent = any(f["filename"] == file_path.name for f in agent_files)
                    found_in_rag = any(f["filename"] == file_path.name for f in rag_files)
                    
                    if not found_in_agent and not found_in_rag:
                        # Add basic metadata for files not processed by either agent
                        disk_files.append({
                            "filename": file_path.name,
                            "file_type": file_path.suffix.lower(),
                            "size": str(file_path.stat().st_size),
                            "processed_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                            "chunks_count": 0,
                            "summary": "File not processed by agent"
                        })
        
        # Combine all lists, prioritizing RAG agent data over conversation memory
        # Create a dict to merge data for same files
        file_dict = {}
        
        # Add disk files first (lowest priority)
        for file_info in disk_files:
            file_dict[file_info["filename"]] = file_info
        
        # Add conversation memory files (medium priority)
        for file_info in agent_files:
            filename = file_info["filename"]
            if filename in file_dict:
                # Merge with existing data
                file_dict[filename].update(file_info)
            else:
                file_dict[filename] = file_info
        
        # Add RAG agent files (highest priority - most accurate)
        for file_info in rag_files:
            filename = file_info["filename"]
            if filename in file_dict:
                # Merge with existing data, RAG data takes precedence
                file_dict[filename].update(file_info)
            else:
                file_dict[filename] = file_info
        
        all_files = list(file_dict.values())
        
        return {
            "success": True,
            "files": all_files,
            "total_files": len(all_files),
            "sources": {
                "conversation_memory": len(agent_files),
                "rag_processed": len(rag_files),
                "disk_only": len(disk_files)
            }
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
            
            # Get conversation summary
            summary = await agent.get_conversation_summary()
            context.update(summary)
        
        return {
            "success": True,
            "context": context
        }
        
    except Exception as e:
        logger.error(f"Error getting conversation context: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get context: {str(e)}")


@router.post("/process-file/{filename}")
async def process_existing_file(
    filename: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Process an existing uploaded file through the RAG agent."""
    try:
        # Check if file exists
        data_dir = Path("data/rag")
        file_path = data_dir / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Get file info
        file_ext = file_path.suffix.lower()
        file_size = file_path.stat().st_size
        
        logger.info(f"User {current_user.email} processing existing file: {filename}")
        
        # Process file through the singleton RAG agent
        file_metadata = {
            "filename": filename,
            "file_type": file_ext,
            "size": file_size,
            "summary": "Processing...",
            "chunks_count": 0
        }
        
        try:
            # Get or create the singleton RAG agent instance
            rag_agent = get_rag_agent_instance()
            if not rag_agent:
                # Initialize the singleton if it doesn't exist
                rag_settings = RAGSettings(data_directory=str(data_dir))
                rag_agent = create_rag_agent(rag_settings)
            
            # Create a temporary copy for processing since RAG agent moves the file
            import tempfile
            
            # Copy file to temp location for processing
            temp_file = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tf:
                    shutil.copy2(file_path, tf.name)
                    temp_file = tf.name
                
                # Process the temporary file through the singleton RAG agent
                processing_result = await rag_agent.upload_file(
                    file_path=temp_file,
                    original_filename=filename
                )
                
                # Clean up temp file if it still exists
                if temp_file and Path(temp_file).exists():
                    Path(temp_file).unlink()
                
                # Extract metadata from processing result
                if processing_result.get("status") == "success":
                    file_metadata.update({
                        "summary": processing_result.get("summary", "File processed successfully"),
                        "chunks_count": processing_result.get("chunks_count", 0),
                        "file_type": processing_result.get("file_type", file_ext),
                        "processed_at": datetime.utcnow().isoformat()
                    })
                    
                    logger.info(f"File {filename} processed successfully with {file_metadata['chunks_count']} chunks and stored in singleton RAG agent")
                else:
                    # Processing failed
                    error_msg = processing_result.get("message", "Unknown processing error")
                    file_metadata.update({
                        "summary": f"Processing failed: {error_msg}",
                        "chunks_count": 0,
                        "processed_at": datetime.utcnow().isoformat()
                    })
                    logger.warning(f"File processing failed for {filename}: {error_msg}")
                    
            except Exception as temp_error:
                # Clean up temp file in case of error
                if temp_file and Path(temp_file).exists():
                    Path(temp_file).unlink()
                raise temp_error
            
            # Add to conversation memory (root agent)
            agent = get_root_agent()
            if agent:
                agent.add_uploaded_file(filename, file_metadata)
                
            return {
                "success": True,
                "filename": filename,
                "summary": file_metadata["summary"],
                "chunks_count": file_metadata["chunks_count"],
                "processed_at": file_metadata.get("processed_at"),
                "message": "File processed successfully"
            }
                
        except Exception as e:
            logger.error(f"Error processing file through RAG agent: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process file: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing existing file: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 
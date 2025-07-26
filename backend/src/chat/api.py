"""
FastAPI router for chat thread management.
"""

import logging
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from src.auth.dependencies import get_current_user
from src.auth.models import User

from .service import (
    create_new_thread, get_user_thread_list, get_thread_details,
    send_message_to_thread, get_thread_conversation, update_thread_documents,
    update_thread_title, remove_thread, get_thread_context, create_message
)
from .models import (
    CreateThreadRequest, SendMessageRequest, UpdateThreadRequest, MessageCreate,
    ThreadResponse, ThreadListResponse, MessagesListResponse,
    MessageResponse, ThreadContextResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/threads", response_model=ThreadListResponse)
async def list_user_threads(
    current_user: User = Depends(get_current_user)
) -> ThreadListResponse:
    """
    Get all chat threads for the current user.
    
    Args:
        current_user: Authenticated user
        
    Returns:
        List of user threads
    """
    try:
        threads = await get_user_thread_list(str(current_user.id))
        
        return ThreadListResponse(
            success=True,
            threads=threads,
            total_count=len(threads),
            message=f"Found {len(threads)} chat threads"
        )
        
    except Exception as e:
        logger.error(f"Error listing threads: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list threads: {str(e)}"
        )


@router.post("/threads", response_model=ThreadResponse)
async def create_thread(
    request: CreateThreadRequest,
    current_user: User = Depends(get_current_user)
) -> ThreadResponse:
    """
    Create a new chat thread with selected documents.
    
    Args:
        request: Thread creation request
        current_user: Authenticated user
        
    Returns:
        Created thread details
    """
    try:
        # Validate input
        if not request.first_message or not request.first_message.strip():
            raise HTTPException(
                status_code=400,
                detail="First message cannot be empty"
            )
        
        # Create thread
        thread = await create_new_thread(
            user_id=str(current_user.id),
            first_message=request.first_message.strip(),
            selected_documents=request.selected_documents
        )
        
        logger.info(f"User {current_user.email} created thread: {thread.id}")
        
        return ThreadResponse(
            success=True,
            thread=thread,
            message=f"Chat thread '{thread.title}' created successfully"
        )
        
    except ValueError as e:
        # Business logic errors (e.g., invalid document access)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating thread: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create thread: {str(e)}"
        )


@router.get("/threads/{thread_id}", response_model=ThreadResponse)
async def get_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user)
) -> ThreadResponse:
    """
    Get thread details by ID.
    
    Args:
        thread_id: Thread ID
        current_user: Authenticated user
        
    Returns:
        Thread details
    """
    try:
        thread = await get_thread_details(str(current_user.id), thread_id)
        
        if not thread:
            raise HTTPException(
                status_code=404,
                detail="Thread not found or you don't have access"
            )
        
        return ThreadResponse(
            success=True,
            thread=thread,
            message="Thread details retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thread: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get thread: {str(e)}"
        )


@router.put("/threads/{thread_id}", response_model=ThreadResponse)
async def update_thread(
    thread_id: str,
    request: UpdateThreadRequest,
    current_user: User = Depends(get_current_user)
) -> ThreadResponse:
    """
    Update thread metadata (title or selected documents).
    
    Args:
        thread_id: Thread ID
        request: Update request
        current_user: Authenticated user
        
    Returns:
        Updated thread
    """
    try:
        thread = None
        
        # Update title if provided
        if request.title is not None:
            thread = await update_thread_title(
                user_id=str(current_user.id),
                thread_id=thread_id,
                new_title=request.title
            )
        
        # Update selected documents if provided
        if request.selected_documents is not None:
            thread = await update_thread_documents(
                user_id=str(current_user.id),
                thread_id=thread_id,
                selected_documents=request.selected_documents
            )
        
        if not thread:
            raise HTTPException(
                status_code=404,
                detail="Thread not found or you don't have access"
            )
        
        return ThreadResponse(
            success=True,
            thread=thread,
            message="Thread updated successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating thread: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update thread: {str(e)}"
        )


@router.delete("/threads/{thread_id}")
async def delete_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user)
) -> JSONResponse:
    """
    Delete a chat thread.
    
    Args:
        thread_id: Thread ID
        current_user: Authenticated user
        
    Returns:
        Deletion result
    """
    try:
        success = await remove_thread(str(current_user.id), thread_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Thread not found or you don't have access"
            )
        
        logger.info(f"User {current_user.email} deleted thread: {thread_id}")
        
        return JSONResponse({
            "success": True,
            "message": "Thread deleted successfully"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting thread: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete thread: {str(e)}"
        )


@router.get("/threads/{thread_id}/messages", response_model=MessagesListResponse)
async def get_thread_messages(
    thread_id: str,
    limit: Optional[int] = None,
    current_user: User = Depends(get_current_user)
) -> MessagesListResponse:
    """
    Get conversation history for a thread.
    
    Args:
        thread_id: Thread ID
        limit: Optional limit on number of messages
        current_user: Authenticated user
        
    Returns:
        List of messages
    """
    try:
        messages = await get_thread_conversation(
            user_id=str(current_user.id),
            thread_id=thread_id,
            limit=limit
        )
        
        return MessagesListResponse(
            success=True,
            messages=messages,
            thread_id=thread_id,
            total_count=len(messages),
            message=f"Retrieved {len(messages)} messages"
        )
        
    except Exception as e:
        logger.error(f"Error getting thread messages: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get messages: {str(e)}"
        )


@router.post("/threads/{thread_id}/messages", response_model=MessageResponse)
async def send_message_to_thread(
    thread_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
) -> MessageResponse:
    """
    Send a message to a thread and get AI response.
    
    This endpoint processes user messages through the AI agent system
    and returns both the user message and AI response.
    """
    try:
        logger.info(f"Processing message for thread {thread_id}, user {current_user.id}")
        logger.info(f"Message content: {message_data.content[:100]}...")
        
        # Validate thread ownership
        thread = await get_thread_details(str(current_user.id), thread_id)
        if not thread:
            logger.error(f"Thread {thread_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Import here to avoid circular imports
        from .agent_manager import get_thread_agent_manager, ThreadAgentError
        from .memory_crud import ThreadMemoryError, add_message_to_memory
        
        # First, save user message to thread memory
        await add_message_to_memory(
            thread_id=thread_id,
            user_id=str(current_user.id),
            message_type="human",
            content=message_data.content,
            metadata={"selected_documents": message_data.selected_documents}
        )
        
        # Get thread agent manager and process message
        agent_manager = get_thread_agent_manager()
        
        # Use thread's selected documents if message doesn't specify any
        selected_documents = message_data.selected_documents
        if not selected_documents and thread.selected_documents:
            selected_documents = thread.selected_documents
            logger.info(f"Using thread's selected documents: {selected_documents}")
        
        # Process message through AI agent
        ai_response = await agent_manager.process_message(
            thread_id=thread_id,
            user_id=str(current_user.id),
            message=message_data.content,
            selected_documents=selected_documents
        )
        
        # Save AI response to thread memory
        await add_message_to_memory(
            thread_id=thread_id,
            user_id=str(current_user.id),
            message_type="ai",
            content=ai_response.get("answer", "I couldn't process your request."),
            metadata={
                "ai_response_type": ai_response.get("type"),
                "confidence": ai_response.get("confidence"),
                "visualization": ai_response.get("visualization"),
                "sources": ai_response.get("sources", []),
                "quick_prompts": ai_response.get("quick_prompts", [])
            }
        )
        
        # Create user message record for API response
        user_message = await create_message(
            thread_id=thread_id,
            user_id=str(current_user.id),
            content=message_data.content,
            message_type="user",
            selected_documents=message_data.selected_documents
        )
        
        # Create AI response message record for API response
        ai_message = await create_message(
            thread_id=thread_id,
            user_id=str(current_user.id),
            content=ai_response.get("answer", "I couldn't process your request."),
            message_type="assistant",
            metadata={
                "ai_response_type": ai_response.get("type"),
                "confidence": ai_response.get("confidence"),
                "visualization": ai_response.get("visualization"),
                "sources": ai_response.get("sources", []),
                "quick_prompts": ai_response.get("quick_prompts", [])
            }
        )
        
        logger.info(f"Message processed for thread {thread_id}: {ai_response.get('type', 'general')}")
        
        # Return the AI response message
        return MessageResponse(
            success=True,
            user_message=user_message,
            assistant_message=ai_message,
            thread_id=thread_id,
            message="Message processed successfully"
        )
        
    except ThreadMemoryError as e:
        logger.error(f"Thread memory error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error saving conversation memory: {str(e)}")
    except ThreadAgentError as e:
        logger.error(f"Thread agent error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing message with AI agent: {str(e)}")
    except Exception as e:
        logger.error(f"Error in send_message_to_thread: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/threads/{thread_id}/documents", response_model=Dict[str, Any])
async def update_thread_documents(
    thread_id: str,
    document_update: Dict[str, List[str]],
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Update selected documents for a thread.
    
    This will reload the thread's AI agent with new document context.
    """
    try:
        # Validate thread ownership
        thread = await get_thread_details(str(current_user.id), thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        selected_documents = document_update.get("selected_documents", [])
        
        # Validate document access
        from src.documents.service import validate_document_access
        if not await validate_document_access(str(current_user.id), selected_documents):
            raise HTTPException(status_code=403, detail="Access denied to one or more documents")
        
        # Update thread's selected documents
        updated_thread = await update_thread_documents(
            user_id=str(current_user.id),
            thread_id=thread_id,
            selected_documents=selected_documents
        )
        
        if not updated_thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Update agent manager
        from .agent_manager import get_thread_agent_manager
        agent_manager = get_thread_agent_manager()
        
        await agent_manager.update_thread_documents(
            thread_id=thread_id,
            user_id=str(current_user.id),
            selected_documents=selected_documents
        )
        
        logger.info(f"Thread documents updated: {thread_id} with {len(selected_documents)} documents")
        
        return {
            "thread_id": thread_id,
            "selected_documents": selected_documents,
            "status": "updated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating thread documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/threads/{thread_id}/agent/stats", response_model=Dict[str, Any])
async def get_thread_agent_stats(
    thread_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get statistics about the thread's AI agent.
    """
    try:
        # Validate thread ownership
        thread = await get_thread_details(str(current_user.id), thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        from .agent_manager import get_thread_agent_manager
        agent_manager = get_thread_agent_manager()
        
        # Get global agent stats
        global_stats = await agent_manager.get_agent_stats()
        
        # Check if this thread has an active agent
        has_active_agent = thread_id in agent_manager._agents
        
        return {
            "thread_id": thread_id,
            "has_active_agent": has_active_agent,
            "global_stats": global_stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thread agent stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/threads/{thread_id}/context", response_model=ThreadContextResponse)
async def get_thread_context_details(
    thread_id: str,
    current_user: User = Depends(get_current_user)
) -> ThreadContextResponse:
    """
    Get complete thread context including messages and selected documents.
    
    Args:
        thread_id: Thread ID
        current_user: Authenticated user
        
    Returns:
        Complete thread context
    """
    try:
        context = await get_thread_context(str(current_user.id), thread_id)
        
        if context.get("error"):
            raise HTTPException(
                status_code=404,
                detail=context["error"]
            )
        
        return ThreadContextResponse(
            success=True,
            thread=context["thread"],
            messages=context["messages"],
            selected_documents=context["selected_documents"],
            message="Thread context retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thread context: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get thread context: {str(e)}"
        )


@router.get("/threads/{thread_id}/documents", response_model=Dict[str, Any])
async def get_thread_documents(
    thread_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get detailed document information for a thread.
    
    Args:
        thread_id: Thread ID
        current_user: Authenticated user
        
    Returns:
        List of documents with full metadata
    """
    try:
        # Get thread details
        thread = await get_thread_details(str(current_user.id), thread_id)
        if not thread:
            raise HTTPException(
                status_code=404,
                detail="Thread not found or you don't have access"
            )
        
        # Get documents with full details
        from src.documents.service import get_documents_for_thread
        documents = await get_documents_for_thread(str(current_user.id), thread.selected_documents)
        
        # Convert to response format
        document_list = []
        for doc in documents:
            document_list.append({
                "id": doc.id,
                "user_id": doc.user_id,
                "filename": doc.filename,
                "original_filename": doc.original_filename,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "file_path": doc.file_path,
                "summary": doc.summary,
                "chunks_count": doc.chunks_count,
                "processed_at": doc.created_at.isoformat() if doc.created_at else None,
                "tags": doc.tags,
                "is_active": doc.is_active,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "updated_at": doc.updated_at.isoformat() if doc.updated_at else None
            })
        
        return {
            "success": True,
            "thread_id": thread_id,
            "documents": document_list,
            "total_count": len(document_list),
            "message": f"Found {len(document_list)} documents for thread"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thread documents: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get thread documents: {str(e)}"
        )


@router.post("/quick-prompts/generate", response_model=Dict[str, Any])
async def generate_quick_prompts_endpoint(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Generate enhanced LLM-based quick prompts for given context.
    
    Args:
        request: Dictionary containing:
            - message: The user message or context
            - previous_response: Optional previous AI response
            - thread_id: Optional thread ID for context
        current_user: Authenticated user
        
    Returns:
        JSON response with 2-3 quick prompt suggestions
    """
    try:
        from .quick_prompts import generate_quick_prompts
        
        message = request.get("message", "")
        previous_response = request.get("previous_response", "")
        thread_id = request.get("thread_id")
        
        if not message:
            raise HTTPException(
                status_code=400,
                detail="Message is required for quick prompt generation"
            )
        
        # Get thread context if thread_id is provided
        thread_context = None
        if thread_id:
            try:
                thread = await get_thread_details(str(current_user.id), thread_id)
                if thread:
                    # Get recent messages for context
                    from .service import get_thread_messages
                    messages = await get_thread_messages(str(current_user.id), thread_id, limit=5)
                    thread_context = {
                        "thread_title": thread.title,
                        "recent_messages": [
                            {
                                "type": msg.message_type,
                                "content": msg.content
                            }
                            for msg in messages
                        ]
                    }
            except Exception as e:
                logger.warning(f"Could not get thread context: {e}")
        
        # Generate quick prompts
        quick_prompts = generate_quick_prompts(
            ai_response=previous_response,
            response_type="general",
            user_message=message,
            current_data=None,
            visualization=None
        )
        
        return {
            "success": True,
            "quick_prompts": quick_prompts,
            "count": len(quick_prompts),
            "message": f"Generated {len(quick_prompts)} quick prompts successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating quick prompts: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quick prompts: {str(e)}"
        )


@router.get("/health/check")
async def health_check():
    """Health check for chat module."""
    return {"status": "ok", "module": "chat"}
"""
Business logic for chat thread management.
"""

import logging
from typing import List, Optional, Dict, Any

from .crud import (
    create_thread, get_user_threads, get_thread_by_id,
    update_thread, delete_thread, add_message, get_thread_messages,
    get_thread_document_selections
)
from .models import ChatThread, ChatMessage
from src.documents.service import validate_document_access, get_documents_for_thread

logger = logging.getLogger(__name__)


async def create_new_thread(
    user_id: str,
    first_message: str,
    selected_documents: Optional[List[str]] = None
) -> ChatThread:
    """
    Create a new chat thread with first user message.
    
    Args:
        user_id: User ID
        first_message: First message content
        selected_documents: Document IDs to include in thread
        
    Returns:
        Created ChatThread
    """
    # Validate document access if provided
    if selected_documents:
        has_access = await validate_document_access(user_id, selected_documents)
        if not has_access:
            raise ValueError("You don't have access to one or more selected documents")
    
    # Create thread
    thread = await create_thread(
        user_id=user_id,
        first_message=first_message,
        selected_documents=selected_documents
    )
    
    # Add first user message
    await add_message(
        thread_id=thread.id,
        user_id=user_id,
        role="user",
        content=first_message
    )
    
    logger.info(f"Created thread {thread.id} for user {user_id}")
    return thread


async def get_user_thread_list(user_id: str) -> List[ChatThread]:
    """
    Get all threads for a user, ordered by last activity.
    
    Args:
        user_id: User ID
        
    Returns:
        List of user threads
    """
    return await get_user_threads(user_id, include_inactive=False)


async def get_thread_details(user_id: str, thread_id: str) -> Optional[ChatThread]:
    """
    Get thread details by ID.
    
    Args:
        user_id: User ID (for security)
        thread_id: Thread ID
        
    Returns:
        ChatThread if found and belongs to user
    """
    return await get_thread_by_id(user_id, thread_id)


async def send_message_to_thread(
    user_id: str,
    thread_id: str,
    message_content: str
) -> ChatMessage:
    """
    Send a user message to a thread.
    
    Args:
        user_id: User ID
        thread_id: Thread ID
        message_content: Message content
        
    Returns:
        Created ChatMessage
    """
    # Verify thread exists and belongs to user
    thread = await get_thread_by_id(user_id, thread_id)
    if not thread:
        raise ValueError("Thread not found or you don't have access")
    
    # Add user message
    user_message = await add_message(
        thread_id=thread_id,
        user_id=user_id,
        role="user",
        content=message_content
    )
    
    logger.info(f"User message added to thread {thread_id}")
    return user_message


async def add_assistant_response(
    thread_id: str,
    user_id: str,
    response_content: str,
    metadata: Optional[Dict[str, Any]] = None
) -> ChatMessage:
    """
    Add assistant response to a thread.
    
    Args:
        thread_id: Thread ID
        user_id: User ID
        response_content: Assistant response
        metadata: Optional metadata (visualizations, etc.)
        
    Returns:
        Created ChatMessage
    """
    assistant_message = await add_message(
        thread_id=thread_id,
        user_id=user_id,
        role="assistant",
        content=response_content,
        metadata=metadata
    )
    
    logger.info(f"Assistant response added to thread {thread_id}")
    return assistant_message


async def create_message(
    thread_id: str,
    user_id: str,
    content: str,
    message_type: str,
    selected_documents: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> ChatMessage:
    """
    Create a message in a thread with full metadata.
    
    Args:
        thread_id: Thread ID
        user_id: User ID
        content: Message content
        message_type: Message type ('user' or 'assistant')
        selected_documents: Selected documents for this message
        metadata: Additional metadata
        
    Returns:
        Created ChatMessage
    """
    # Verify thread exists and belongs to user
    thread = await get_thread_by_id(user_id, thread_id)
    if not thread:
        raise ValueError("Thread not found or you don't have access")
    
    # Add selected documents to metadata if provided
    full_metadata = metadata or {}
    if selected_documents:
        full_metadata["selected_documents"] = selected_documents
    
    # Create the message
    message = await add_message(
        thread_id=thread_id,
        user_id=user_id,
        role=message_type,
        content=content,
        metadata=full_metadata if full_metadata else None
    )
    
    logger.info(f"Message created in thread {thread_id}: {message_type}")
    return message


async def get_thread_conversation(
    user_id: str,
    thread_id: str,
    limit: Optional[int] = None
) -> List[ChatMessage]:
    """
    Get conversation history for a thread.
    
    Args:
        user_id: User ID (for security)
        thread_id: Thread ID
        limit: Optional limit on messages
        
    Returns:
        List of messages in chronological order
    """
    return await get_thread_messages(thread_id, user_id, limit)


async def update_thread_documents(
    user_id: str,
    thread_id: str,
    selected_documents: List[str]
) -> Optional[ChatThread]:
    """
    Update selected documents for a thread.
    
    Args:
        user_id: User ID (for security)
        thread_id: Thread ID
        selected_documents: New document IDs
        
    Returns:
        Updated ChatThread if successful
    """
    # Validate document access
    if selected_documents:
        has_access = await validate_document_access(user_id, selected_documents)
        if not has_access:
            raise ValueError("You don't have access to one or more selected documents")
    
    # Update thread
    return await update_thread(
        user_id=user_id,
        thread_id=thread_id,
        updates={"selected_documents": selected_documents}
    )


async def update_thread_title(
    user_id: str,
    thread_id: str,
    new_title: str
) -> Optional[ChatThread]:
    """
    Update thread title.
    
    Args:
        user_id: User ID (for security)
        thread_id: Thread ID
        new_title: New title
        
    Returns:
        Updated ChatThread if successful
    """
    return await update_thread(
        user_id=user_id,
        thread_id=thread_id,
        updates={"title": new_title}
    )


async def remove_thread(user_id: str, thread_id: str) -> bool:
    """
    Delete a thread (soft delete).
    
    Args:
        user_id: User ID (for security)
        thread_id: Thread ID
        
    Returns:
        True if deleted successfully
    """
    success = await delete_thread(user_id, thread_id)
    
    if success:
        logger.info(f"Thread {thread_id} deleted for user {user_id}")
        
        # TODO: In future, also clean up associated Chroma data
    
    return success


async def get_thread_context(user_id: str, thread_id: str) -> Dict[str, Any]:
    """
    Get complete thread context including messages and selected documents.
    
    Args:
        user_id: User ID (for security)
        thread_id: Thread ID
        
    Returns:
        Dictionary with thread, messages, and document details
    """
    # Get thread details
    thread = await get_thread_by_id(user_id, thread_id)
    if not thread:
        return {
            "thread": None,
            "messages": [],
            "selected_documents": [],
            "error": "Thread not found or access denied"
        }
    
    # Get conversation history
    messages = await get_thread_messages(thread_id, user_id)
    
    # Get selected documents with metadata
    document_ids = thread.selected_documents
    documents = []
    if document_ids:
        documents = await get_documents_for_thread(user_id, document_ids)
    
    return {
        "thread": thread,
        "messages": messages,
        "selected_documents": [
            {
                "id": doc.id,
                "filename": doc.original_filename,
                "file_type": doc.file_type,
                "summary": doc.summary,
                "tags": doc.tags
            }
            for doc in documents
        ]
    } 
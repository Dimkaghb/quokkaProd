"""
CRUD operations for chat threads and messages.
"""

import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from src.auth.database import get_database
from .models import ChatThread, ChatMessage, ThreadDocumentSelection

logger = logging.getLogger(__name__)

# In-memory storage as fallback
_threads_storage: Dict[str, Dict[str, Any]] = {}
_messages_storage: Dict[str, List[Dict[str, Any]]] = {}
_thread_documents_storage: Dict[str, List[str]] = {}


def _generate_thread_title(first_message: str) -> str:
    """
    Generate thread title from first message (ChatGPT style).
    
    Args:
        first_message: First user message
        
    Returns:
        Generated title (max 50 chars)
    """
    # Take first 5 words or 50 characters, whichever is shorter
    words = first_message.strip().split()
    if len(words) <= 5:
        title = first_message.strip()
    else:
        title = " ".join(words[:5])
    
    # Truncate to 50 characters
    if len(title) > 50:
        title = title[:47] + "..."
    
    return title if title else "New Chat"


async def create_thread(
    user_id: str,
    first_message: str,
    selected_documents: Optional[List[str]] = None
) -> ChatThread:
    """
    Create a new chat thread with first message.
    
    Args:
        user_id: User ID
        first_message: First message content
        selected_documents: Document IDs to include
        
    Returns:
        Created ChatThread
    """
    db = get_database()
    
    # Generate unique thread ID and title
    thread_id = str(uuid.uuid4())
    title = _generate_thread_title(first_message)
    
    # Create thread dict
    thread_dict = {
        "_id": thread_id,
        "id": thread_id,
        "user_id": user_id,
        "title": title,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "message_count": 1,  # Include first message
        "selected_documents": selected_documents or [],
        "is_active": True
    }
    
    if db.mongodb_connected:
        try:
            # Insert into MongoDB
            threads_collection = db.db.chat_threads
            await threads_collection.insert_one(thread_dict)
            logger.info(f"Thread {thread_id} created in MongoDB for user {user_id}")
        except Exception as e:
            logger.error(f"Error inserting thread to MongoDB: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    if user_id not in _threads_storage:
        _threads_storage[user_id] = {}
    _threads_storage[user_id][thread_id] = thread_dict
    
    # Store document selections
    if selected_documents:
        _thread_documents_storage[thread_id] = selected_documents
    
    logger.info(f"Thread {thread_id} created for user {user_id}")
    
    return ChatThread(**thread_dict)


async def get_user_threads(user_id: str, include_inactive: bool = False) -> List[ChatThread]:
    """
    Get all threads for a user.
    
    Args:
        user_id: User ID
        include_inactive: Include inactive threads
        
    Returns:
        List of user threads
    """
    db = get_database()
    
    # Build filter
    filter_query = {"user_id": user_id}
    if not include_inactive:
        filter_query["is_active"] = True
    
    if db.mongodb_connected:
        try:
            threads_collection = db.db.chat_threads
            cursor = threads_collection.find(filter_query).sort("updated_at", -1)
            threads = await cursor.to_list(length=None)
            return [ChatThread(**thread) for thread in threads]
        except Exception as e:
            logger.error(f"Error querying MongoDB for user threads: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    user_threads = _threads_storage.get(user_id, {})
    threads = []
    for thread_dict in user_threads.values():
        if include_inactive or thread_dict.get("is_active", True):
            threads.append(ChatThread(**thread_dict))
    
    # Sort by updated_at descending
    threads.sort(key=lambda t: t.updated_at, reverse=True)
    return threads


async def get_thread_by_id(user_id: str, thread_id: str) -> Optional[ChatThread]:
    """
    Get a specific thread by ID.
    
    Args:
        user_id: User ID (for security)
        thread_id: Thread ID
        
    Returns:
        ChatThread if found, None otherwise
    """
    db = get_database()
    
    if db.mongodb_connected:
        try:
            threads_collection = db.db.chat_threads
            thread = await threads_collection.find_one({
                "_id": thread_id,
                "user_id": user_id
            })
            if thread:
                return ChatThread(**thread)
        except Exception as e:
            logger.error(f"Error querying MongoDB for thread: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    user_threads = _threads_storage.get(user_id, {})
    thread_dict = user_threads.get(thread_id)
    if thread_dict:
        return ChatThread(**thread_dict)
    
    return None


async def update_thread(
    user_id: str,
    thread_id: str,
    updates: Dict[str, Any]
) -> Optional[ChatThread]:
    """
    Update thread metadata.
    
    Args:
        user_id: User ID (for security)
        thread_id: Thread ID
        updates: Fields to update
        
    Returns:
        Updated ChatThread if found, None otherwise
    """
    db = get_database()
    
    # Add updated_at timestamp
    updates["updated_at"] = datetime.utcnow()
    
    if db.mongodb_connected:
        try:
            threads_collection = db.db.chat_threads
            result = await threads_collection.update_one(
                {"_id": thread_id, "user_id": user_id},
                {"$set": updates}
            )
            if result.modified_count > 0:
                # Fetch updated thread
                thread = await threads_collection.find_one({
                    "_id": thread_id,
                    "user_id": user_id
                })
                if thread:
                    return ChatThread(**thread)
        except Exception as e:
            logger.error(f"Error updating thread in MongoDB: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    user_threads = _threads_storage.get(user_id, {})
    if thread_id in user_threads:
        user_threads[thread_id].update(updates)
        
        # Update document selections if provided
        if "selected_documents" in updates:
            _thread_documents_storage[thread_id] = updates["selected_documents"]
        
        return ChatThread(**user_threads[thread_id])
    
    return None


async def delete_thread(user_id: str, thread_id: str) -> bool:
    """
    Soft delete a thread (mark as inactive).
    
    Args:
        user_id: User ID (for security)
        thread_id: Thread ID
        
    Returns:
        True if deleted, False otherwise
    """
    db = get_database()
    
    delete_updates = {
        "is_active": False,
        "updated_at": datetime.utcnow()
    }
    
    if db.mongodb_connected:
        try:
            threads_collection = db.db.chat_threads
            result = await threads_collection.update_one(
                {"_id": thread_id, "user_id": user_id},
                {"$set": delete_updates}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error deleting thread in MongoDB: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    user_threads = _threads_storage.get(user_id, {})
    if thread_id in user_threads:
        user_threads[thread_id].update(delete_updates)
        return True
    
    return False


async def add_message(
    thread_id: str,
    user_id: str,
    role: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None
) -> ChatMessage:
    """
    Add a message to a thread.
    
    Args:
        thread_id: Thread ID
        user_id: User ID
        role: Message role ('user' or 'assistant')
        content: Message content
        metadata: Optional metadata
        
    Returns:
        Created ChatMessage
    """
    db = get_database()
    
    # Generate unique message ID
    message_id = str(uuid.uuid4())
    
    # Create message dict
    message_dict = {
        "_id": message_id,
        "id": message_id,
        "thread_id": thread_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow(),
        "metadata": metadata
    }
    
    if db.mongodb_connected:
        try:
            # Insert message
            messages_collection = db.db.chat_messages
            await messages_collection.insert_one(message_dict)
            
            # Update thread message count and updated_at
            threads_collection = db.db.chat_threads
            await threads_collection.update_one(
                {"_id": thread_id},
                {
                    "$inc": {"message_count": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            logger.info(f"Message {message_id} added to thread {thread_id} in MongoDB")
        except Exception as e:
            logger.error(f"Error inserting message to MongoDB: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    if thread_id not in _messages_storage:
        _messages_storage[thread_id] = []
    _messages_storage[thread_id].append(message_dict)
    
    # Update thread in memory
    for user_threads in _threads_storage.values():
        if thread_id in user_threads:
            user_threads[thread_id]["message_count"] += 1
            user_threads[thread_id]["updated_at"] = datetime.utcnow()
            break
    
    logger.info(f"Message {message_id} added to thread {thread_id}")
    
    return ChatMessage(**message_dict)


async def get_thread_messages(
    thread_id: str,
    user_id: str,
    limit: Optional[int] = None
) -> List[ChatMessage]:
    """
    Get messages for a thread.
    
    Args:
        thread_id: Thread ID
        user_id: User ID (for security)
        limit: Optional limit on number of messages
        
    Returns:
        List of messages ordered by timestamp
    """
    db = get_database()
    
    # First verify user has access to thread
    thread = await get_thread_by_id(user_id, thread_id)
    if not thread:
        return []
    
    if db.mongodb_connected:
        try:
            messages_collection = db.db.chat_messages
            cursor = messages_collection.find({"thread_id": thread_id}).sort("timestamp", 1)
            if limit:
                cursor = cursor.limit(limit)
            messages = await cursor.to_list(length=None)
            return [ChatMessage(**msg) for msg in messages]
        except Exception as e:
            logger.error(f"Error querying MongoDB for thread messages: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    messages = _messages_storage.get(thread_id, [])
    message_objects = [ChatMessage(**msg) for msg in messages]
    
    # Sort by timestamp
    message_objects.sort(key=lambda m: m.timestamp)
    
    # Apply limit if specified
    if limit:
        message_objects = message_objects[-limit:]
    
    return message_objects


async def get_thread_document_selections(thread_id: str) -> List[str]:
    """
    Get document IDs selected for a thread.
    
    Args:
        thread_id: Thread ID
        
    Returns:
        List of document IDs
    """
    db = get_database()
    
    if db.mongodb_connected:
        try:
            threads_collection = db.db.chat_threads
            thread = await threads_collection.find_one({"_id": thread_id})
            if thread:
                return thread.get("selected_documents", [])
        except Exception as e:
            logger.error(f"Error querying MongoDB for thread documents: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    return _thread_documents_storage.get(thread_id, []) 
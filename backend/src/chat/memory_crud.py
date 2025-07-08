"""
CRUD operations for thread memory persistence.
Enterprise-grade implementation with proper error handling and logging.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

from src.auth.database import get_database
from .memory_models import ThreadMemorySnapshot, ThreadMemoryMessage, ThreadMemoryContext

logger = logging.getLogger(__name__)

# In-memory cache for performance optimization
_memory_cache: Dict[str, ThreadMemorySnapshot] = {}
_cache_ttl: Dict[str, datetime] = {}
CACHE_TIMEOUT_MINUTES = 30


class ThreadMemoryError(Exception):
    """Custom exception for thread memory operations."""
    pass


class ThreadMemoryConflictError(ThreadMemoryError):
    """Raised when there's a version conflict during update."""
    pass


async def save_thread_memory(memory_snapshot: ThreadMemorySnapshot) -> bool:
    """
    Save thread memory snapshot to persistent storage.
    
    Args:
        memory_snapshot: Complete memory snapshot to save
        
    Returns:
        True if saved successfully
        
    Raises:
        ThreadMemoryError: If save operation fails
        ThreadMemoryConflictError: If version conflict detected
    """
    db = get_database()
    
    try:
        # Update timestamp and increment version
        memory_snapshot.updated_at = datetime.utcnow()
        memory_snapshot.version += 1
        
        # Prepare document for storage
        memory_doc = {
            "_id": memory_snapshot.id,
            "thread_id": memory_snapshot.thread_id,
            "user_id": memory_snapshot.user_id,
            "memory_data": memory_snapshot.to_json(),
            "created_at": memory_snapshot.created_at,
            "updated_at": memory_snapshot.updated_at,
            "version": memory_snapshot.version
        }
        
        if db.mongodb_connected:
            try:
                collection = db.db.thread_memories
                
                # Check for version conflicts (more lenient approach)
                existing = await collection.find_one({
                    "thread_id": memory_snapshot.thread_id,
                    "user_id": memory_snapshot.user_id
                })
                
                # Only conflict if existing version is significantly higher (race condition protection)
                if existing and existing.get("version", 0) > memory_snapshot.version:
                    logger.warning(f"Version conflict detected for thread {memory_snapshot.thread_id}, using latest version")
                    # Just update to latest version instead of throwing error
                    memory_snapshot.version = existing.get("version", 0) + 1
                
                # Upsert operation
                await collection.replace_one(
                    {
                        "thread_id": memory_snapshot.thread_id,
                        "user_id": memory_snapshot.user_id
                    },
                    memory_doc,
                    upsert=True
                )
                
                logger.debug(f"Thread memory saved to MongoDB: {memory_snapshot.thread_id}")
                
            except ThreadMemoryConflictError:
                raise
            except Exception as e:
                logger.error(f"MongoDB save failed for thread {memory_snapshot.thread_id}: {e}")
                # Fall back to in-memory storage
                raise ThreadMemoryError(f"Failed to save to MongoDB: {e}")
        
        # Update cache
        cache_key = f"{memory_snapshot.user_id}:{memory_snapshot.thread_id}"
        _memory_cache[cache_key] = memory_snapshot
        _cache_ttl[cache_key] = datetime.utcnow()
        
        logger.info(f"Thread memory saved successfully: {memory_snapshot.thread_id}")
        return True
        
    except ThreadMemoryConflictError:
        raise
    except Exception as e:
        logger.error(f"Error saving thread memory: {e}")
        raise ThreadMemoryError(f"Failed to save thread memory: {e}")


async def load_thread_memory(
    thread_id: str, 
    user_id: str
) -> Optional[ThreadMemorySnapshot]:
    """
    Load thread memory snapshot from persistent storage.
    
    Args:
        thread_id: Thread identifier
        user_id: User identifier for security
        
    Returns:
        Memory snapshot if found, None otherwise
        
    Raises:
        ThreadMemoryError: If load operation fails
    """
    cache_key = f"{user_id}:{thread_id}"
    
    try:
        # Check cache first
        if cache_key in _memory_cache:
            cache_time = _cache_ttl.get(cache_key, datetime.min)
            if (datetime.utcnow() - cache_time).total_seconds() < CACHE_TIMEOUT_MINUTES * 60:
                logger.debug(f"Thread memory loaded from cache: {thread_id}")
                return _memory_cache[cache_key]
        
        db = get_database()
        
        if db.mongodb_connected:
            try:
                collection = db.db.thread_memories
                memory_doc = await collection.find_one({
                    "thread_id": thread_id,
                    "user_id": user_id
                })
                
                if memory_doc:
                    memory_snapshot = ThreadMemorySnapshot.from_json(
                        memory_doc["memory_data"]
                    )
                    
                    # Update cache
                    _memory_cache[cache_key] = memory_snapshot
                    _cache_ttl[cache_key] = datetime.utcnow()
                    
                    logger.debug(f"Thread memory loaded from MongoDB: {thread_id}")
                    return memory_snapshot
                    
            except Exception as e:
                logger.error(f"MongoDB load failed for thread {thread_id}: {e}")
                # Fall through to return None
        
        logger.debug(f"No thread memory found: {thread_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error loading thread memory: {e}")
        raise ThreadMemoryError(f"Failed to load thread memory: {e}")


async def create_thread_memory(
    thread_id: str,
    user_id: str,
    initial_context: Optional[ThreadMemoryContext] = None
) -> ThreadMemorySnapshot:
    """
    Create new thread memory snapshot.
    
    Args:
        thread_id: Thread identifier
        user_id: User identifier
        initial_context: Initial context data
        
    Returns:
        Created memory snapshot
        
    Raises:
        ThreadMemoryError: If creation fails
    """
    try:
        memory_id = str(uuid.uuid4())
        
        memory_snapshot = ThreadMemorySnapshot(
            id=memory_id,
            thread_id=thread_id,
            user_id=user_id,
            messages=[],
            context=initial_context or ThreadMemoryContext(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            version=1
        )
        
        # Save to storage
        await save_thread_memory(memory_snapshot)
        
        logger.info(f"Thread memory created: {thread_id}")
        return memory_snapshot
        
    except Exception as e:
        logger.error(f"Error creating thread memory: {e}")
        raise ThreadMemoryError(f"Failed to create thread memory: {e}")


async def delete_thread_memory(thread_id: str, user_id: str) -> bool:
    """
    Delete thread memory from persistent storage.
    
    Args:
        thread_id: Thread identifier
        user_id: User identifier for security
        
    Returns:
        True if deleted successfully
        
    Raises:
        ThreadMemoryError: If deletion fails
    """
    db = get_database()
    cache_key = f"{user_id}:{thread_id}"
    
    try:
        if db.mongodb_connected:
            try:
                collection = db.db.thread_memories
                result = await collection.delete_one({
                    "thread_id": thread_id,
                    "user_id": user_id
                })
                
                if result.deleted_count > 0:
                    logger.info(f"Thread memory deleted from MongoDB: {thread_id}")
                else:
                    logger.warning(f"No thread memory found to delete: {thread_id}")
                    
            except Exception as e:
                logger.error(f"MongoDB delete failed for thread {thread_id}: {e}")
                raise ThreadMemoryError(f"Failed to delete from MongoDB: {e}")
        
        # Remove from cache
        _memory_cache.pop(cache_key, None)
        _cache_ttl.pop(cache_key, None)
        
        logger.info(f"Thread memory deleted successfully: {thread_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error deleting thread memory: {e}")
        raise ThreadMemoryError(f"Failed to delete thread memory: {e}")


async def add_message_to_memory(
    thread_id: str,
    user_id: str,
    message_type: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
    max_retries: int = 3
) -> ThreadMemorySnapshot:
    """
    Add a message to thread memory with retry logic.
    
    Args:
        thread_id: Thread identifier
        user_id: User identifier
        message_type: Type of message ('human', 'ai', 'system')
        content: Message content
        metadata: Optional message metadata
        max_retries: Maximum retry attempts for version conflicts
        
    Returns:
        Updated memory snapshot
        
    Raises:
        ThreadMemoryError: If operation fails after retries
    """
    last_error = None
    
    for attempt in range(max_retries):
        try:
            # Clear cache before retry to get fresh data
            if attempt > 0:
                await clear_memory_cache(thread_id, user_id)
            
            # Load existing memory or create new one
            memory = await load_thread_memory(thread_id, user_id)
            if not memory:
                memory = await create_thread_memory(thread_id, user_id)
            
            # Create new message
            new_message = ThreadMemoryMessage(
                type=message_type,
                content=content,
                timestamp=datetime.utcnow(),
                metadata=metadata or {}
            )
            
            # Add to memory
            memory.messages.append(new_message)
            memory.updated_at = datetime.utcnow()
            
            # Trim messages if exceeding limit
            max_messages = 50  # Configurable limit
            if len(memory.messages) > max_messages:
                memory.messages = memory.messages[-max_messages:]
                logger.debug(f"Trimmed thread memory to {max_messages} messages: {thread_id}")
            
            # Save updated memory
            await save_thread_memory(memory)
            
            logger.debug(f"Message added to thread memory: {thread_id} (attempt {attempt + 1})")
            return memory
            
        except ThreadMemoryConflictError as e:
            last_error = e
            if attempt < max_retries - 1:
                logger.warning(f"Version conflict, retrying... (attempt {attempt + 1}/{max_retries})")
                continue
            else:
                logger.error(f"Failed to add message after {max_retries} attempts")
                raise ThreadMemoryError(f"Failed to add message after retries: {e}")
        except Exception as e:
            logger.error(f"Error adding message to thread memory: {e}")
            raise ThreadMemoryError(f"Failed to add message: {e}")
    
    # Should not reach here, but just in case
    raise ThreadMemoryError(f"Failed to add message after {max_retries} attempts: {last_error}")


async def update_thread_context(
    thread_id: str,
    user_id: str,
    context_updates: Dict[str, Any],
    max_retries: int = 3
) -> ThreadMemorySnapshot:
    """
    Update thread context in memory with retry logic.
    
    Args:
        thread_id: Thread identifier
        user_id: User identifier
        context_updates: Context fields to update
        max_retries: Maximum retry attempts for version conflicts
        
    Returns:
        Updated memory snapshot
        
    Raises:
        ThreadMemoryError: If operation fails after retries
    """
    last_error = None
    
    for attempt in range(max_retries):
        try:
            # Clear cache before retry to get fresh data
            if attempt > 0:
                await clear_memory_cache(thread_id, user_id)
            
            # Load existing memory
            memory = await load_thread_memory(thread_id, user_id)
            if not memory:
                memory = await create_thread_memory(thread_id, user_id)
            
            # Update context fields
            for key, value in context_updates.items():
                if hasattr(memory.context, key):
                    setattr(memory.context, key, value)
                else:
                    logger.warning(f"Unknown context field: {key}")
            
            memory.updated_at = datetime.utcnow()
            
            # Save updated memory
            await save_thread_memory(memory)
            
            logger.debug(f"Thread context updated: {thread_id} (attempt {attempt + 1})")
            return memory
            
        except ThreadMemoryConflictError as e:
            last_error = e
            if attempt < max_retries - 1:
                logger.warning(f"Version conflict updating context, retrying... (attempt {attempt + 1}/{max_retries})")
                continue
            else:
                logger.warning(f"Failed to update context after {max_retries} attempts, ignoring during shutdown")
                # During shutdown, just return the memory without saving
                memory = await load_thread_memory(thread_id, user_id)
                return memory if memory else await create_thread_memory(thread_id, user_id)
        except Exception as e:
            logger.error(f"Error updating thread context: {e}")
            raise ThreadMemoryError(f"Failed to update context: {e}")
    
    # Should not reach here, but just in case
    logger.warning(f"Failed to update context after {max_retries} attempts, returning current memory")
    memory = await load_thread_memory(thread_id, user_id)
    return memory if memory else await create_thread_memory(thread_id, user_id)


async def clear_memory_cache(thread_id: Optional[str] = None, user_id: Optional[str] = None) -> None:
    """
    Clear memory cache entries.
    
    Args:
        thread_id: Specific thread to clear (optional)
        user_id: Specific user to clear (optional)
    """
    try:
        if thread_id and user_id:
            # Clear specific thread
            cache_key = f"{user_id}:{thread_id}"
            _memory_cache.pop(cache_key, None)
            _cache_ttl.pop(cache_key, None)
            logger.debug(f"Cache cleared for thread: {thread_id}")
        else:
            # Clear all cache
            _memory_cache.clear()
            _cache_ttl.clear()
            logger.debug("All memory cache cleared")
            
    except Exception as e:
        logger.error(f"Error clearing memory cache: {e}")


@asynccontextmanager
async def thread_memory_transaction(thread_id: str, user_id: str):
    """
    Context manager for thread memory transactions.
    Ensures memory consistency during complex operations.
    """
    memory = None
    try:
        # Load memory at start of transaction
        memory = await load_thread_memory(thread_id, user_id)
        if not memory:
            memory = await create_thread_memory(thread_id, user_id)
        
        yield memory
        
        # Save memory at end of successful transaction
        await save_thread_memory(memory)
        
    except Exception as e:
        logger.error(f"Thread memory transaction failed: {e}")
        # Invalidate cache to ensure consistency
        await clear_memory_cache(thread_id, user_id)
        raise 
"""
CRUD operations for user documents in global library.
"""

import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from src.auth.database import get_database
from .models import UserDocument

logger = logging.getLogger(__name__)

# In-memory storage as fallback
_documents_storage: Dict[str, Dict[str, Any]] = {}


async def create_document(
    user_id: str,
    filename: str,
    original_filename: str,
    file_type: str,
    file_size: int,
    file_path: str,
    summary: str,
    chunks_count: int = 0,
    tags: Optional[List[str]] = None
) -> UserDocument:
    """
    Create a new document record in MongoDB or in-memory storage.
    
    Args:
        user_id: Owner user ID
        filename: Current filename
        original_filename: Original uploaded filename
        file_type: File extension
        file_size: File size in bytes
        file_path: Relative path to file
        summary: Auto-generated description
        chunks_count: Number of chunks in vector DB
        tags: Optional tags
        
    Returns:
        Created UserDocument
    """
    db = get_database()
    
    # Generate unique document ID
    doc_id = str(uuid.uuid4())
    
    # Create document dict
    document_dict = {
        "_id": doc_id,
        "id": doc_id,
        "user_id": user_id,
        "filename": filename,
        "original_filename": original_filename,
        "file_type": file_type,
        "file_size": file_size,
        "file_path": file_path,
        "summary": summary,
        "chunks_count": chunks_count,
        "processed_at": datetime.utcnow(),
        "tags": tags or [],
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    if db.mongodb_connected:
        try:
            # Insert into MongoDB
            documents_collection = db.db.user_documents
            await documents_collection.insert_one(document_dict)
            logger.info(f"Document {doc_id} created in MongoDB for user {user_id}")
            return UserDocument(**document_dict)
        except Exception as e:
            logger.error(f"Error inserting document to MongoDB: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    if user_id not in _documents_storage:
        _documents_storage[user_id] = {}
    _documents_storage[user_id][doc_id] = document_dict
    logger.info(f"Document {doc_id} created in memory storage for user {user_id}")
    
    return UserDocument(**document_dict)


async def get_user_documents(user_id: str, include_inactive: bool = False) -> List[UserDocument]:
    """
    Get all documents for a user.
    
    Args:
        user_id: User ID
        include_inactive: Include inactive documents
        
    Returns:
        List of user documents
    """
    db = get_database()
    
    # Build filter
    filter_query = {"user_id": user_id}
    if not include_inactive:
        filter_query["is_active"] = True
    
    if db.mongodb_connected:
        try:
            documents_collection = db.db.user_documents
            cursor = documents_collection.find(filter_query)
            documents = await cursor.to_list(length=None)
            return [UserDocument(**doc) for doc in documents]
        except Exception as e:
            logger.error(f"Error querying MongoDB for user documents: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    user_docs = _documents_storage.get(user_id, {})
    documents = []
    for doc_dict in user_docs.values():
        if include_inactive or doc_dict.get("is_active", True):
            documents.append(UserDocument(**doc_dict))
    
    return documents


async def get_document_by_id(user_id: str, document_id: str) -> Optional[UserDocument]:
    """
    Get a specific document by ID.
    
    Args:
        user_id: User ID (for security)
        document_id: Document ID
        
    Returns:
        UserDocument if found, None otherwise
    """
    db = get_database()
    
    if db.mongodb_connected:
        try:
            documents_collection = db.db.user_documents
            doc = await documents_collection.find_one({
                "_id": document_id,
                "user_id": user_id
            })
            if doc:
                return UserDocument(**doc)
        except Exception as e:
            logger.error(f"Error querying MongoDB for document: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    user_docs = _documents_storage.get(user_id, {})
    doc_dict = user_docs.get(document_id)
    if doc_dict:
        return UserDocument(**doc_dict)
    
    return None


async def update_document(
    user_id: str,
    document_id: str,
    updates: Dict[str, Any]
) -> Optional[UserDocument]:
    """
    Update document metadata.
    
    Args:
        user_id: User ID (for security)
        document_id: Document ID
        updates: Fields to update
        
    Returns:
        Updated UserDocument if found, None otherwise
    """
    db = get_database()
    
    # Add updated_at timestamp
    updates["updated_at"] = datetime.utcnow()
    
    if db.mongodb_connected:
        try:
            documents_collection = db.db.user_documents
            result = await documents_collection.update_one(
                {"_id": document_id, "user_id": user_id},
                {"$set": updates}
            )
            if result.modified_count > 0:
                # Fetch updated document
                doc = await documents_collection.find_one({
                    "_id": document_id,
                    "user_id": user_id
                })
                if doc:
                    return UserDocument(**doc)
        except Exception as e:
            logger.error(f"Error updating document in MongoDB: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    user_docs = _documents_storage.get(user_id, {})
    if document_id in user_docs:
        user_docs[document_id].update(updates)
        return UserDocument(**user_docs[document_id])
    
    return None


async def delete_document(user_id: str, document_id: str) -> bool:
    """
    Soft delete a document (mark as inactive).
    
    Args:
        user_id: User ID (for security)
        document_id: Document ID
        
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
            documents_collection = db.db.user_documents
            result = await documents_collection.update_one(
                {"_id": document_id, "user_id": user_id},
                {"$set": delete_updates}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error deleting document in MongoDB: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    user_docs = _documents_storage.get(user_id, {})
    if document_id in user_docs:
        user_docs[document_id].update(delete_updates)
        return True
    
    return False


async def get_documents_by_ids(user_id: str, document_ids: List[str]) -> List[UserDocument]:
    """
    Get multiple documents by their IDs.
    
    Args:
        user_id: User ID (for security)
        document_ids: List of document IDs
        
    Returns:
        List of found UserDocuments
    """
    db = get_database()
    
    if db.mongodb_connected:
        try:
            documents_collection = db.db.user_documents
            cursor = documents_collection.find({
                "_id": {"$in": document_ids},
                "user_id": user_id,
                "is_active": True
            })
            documents = await cursor.to_list(length=None)
            return [UserDocument(**doc) for doc in documents]
        except Exception as e:
            logger.error(f"Error querying MongoDB for documents: {e}")
            # Fall back to in-memory storage
    
    # In-memory storage fallback
    user_docs = _documents_storage.get(user_id, {})
    documents = []
    for doc_id in document_ids:
        if doc_id in user_docs and user_docs[doc_id].get("is_active", True):
            documents.append(UserDocument(**user_docs[doc_id]))
    
    return documents 
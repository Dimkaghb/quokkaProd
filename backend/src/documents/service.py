"""
Business logic for document management and processing.
"""

import uuid
import logging
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

from .crud import (
    create_document, get_user_documents, get_document_by_id,
    update_document, delete_document, get_documents_by_ids
)
from .models import UserDocument

logger = logging.getLogger(__name__)


async def process_uploaded_file(
    user_id: str,
    file_content: bytes,
    original_filename: str,
    file_type: str,
    tags: Optional[List[str]] = None
) -> UserDocument:
    """
    Process uploaded file and store in user's document library.
    
    Args:
        user_id: User ID
        file_content: File content bytes
        original_filename: Original filename
        file_type: File extension
        tags: Optional tags
        
    Returns:
        Created UserDocument
    """
    # Generate unique filename to avoid conflicts
    doc_id = str(uuid.uuid4())
    unique_filename = f"doc_{doc_id}_{original_filename}"
    
    # Create user directory structure
    user_dir = Path(f"data/documents/user_{user_id}")
    user_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file to disk
    file_path = user_dir / unique_filename
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Store relative path for database (consistent with current working directory)
    relative_path = f"data/documents/user_{user_id}/{unique_filename}"
    
    # Ensure the file actually exists at the expected location
    absolute_path = Path.cwd() / relative_path
    if not absolute_path.exists():
        logger.error(f"File was not saved correctly. Expected at: {absolute_path.absolute()}")
        raise Exception(f"Failed to save file to expected location: {absolute_path.absolute()}")
    
    logger.info(f"File saved to: {file_path.absolute()}, stored path: {relative_path}")
    logger.info(f"Verified file exists at: {absolute_path.absolute()}")
    logger.info(f"Current working directory: {Path.cwd()}")
    
    # Create document record (without processing summary for now)
    document = await create_document(
        user_id=user_id,
        filename=unique_filename,
        original_filename=original_filename,
        file_type=file_type,
        file_size=len(file_content),
        file_path=relative_path,
        summary="Document uploaded successfully. Processing summary...",
        chunks_count=0,
        tags=tags
    )
    
    logger.info(f"Document {document.id} uploaded for user {user_id}")
    return document


async def get_user_document_library(user_id: str) -> List[UserDocument]:
    """
    Get all documents in user's library.
    
    Args:
        user_id: User ID
        
    Returns:
        List of user documents
    """
    return await get_user_documents(user_id, include_inactive=False)


async def get_document_details(user_id: str, document_id: str) -> Optional[UserDocument]:
    """
    Get document details by ID.
    
    Args:
        user_id: User ID (for security)
        document_id: Document ID
        
    Returns:
        UserDocument if found and belongs to user
    """
    return await get_document_by_id(user_id, document_id)


async def update_document_metadata(
    user_id: str,
    document_id: str,
    tags: Optional[List[str]] = None,
    summary: Optional[str] = None
) -> Optional[UserDocument]:
    """
    Update document metadata.
    
    Args:
        user_id: User ID (for security)
        document_id: Document ID
        tags: New tags
        summary: New summary
        
    Returns:
        Updated UserDocument if found
    """
    updates = {}
    if tags is not None:
        updates["tags"] = tags
    if summary is not None:
        updates["summary"] = summary
    
    if not updates:
        return await get_document_by_id(user_id, document_id)
    
    return await update_document(user_id, document_id, updates)


async def remove_document_from_library(user_id: str, document_id: str) -> bool:
    """
    Remove document from user's library (soft delete).
    
    Args:
        user_id: User ID (for security)
        document_id: Document ID
        
    Returns:
        True if deleted successfully
    """
    # Get document to check if it exists and belongs to user
    document = await get_document_by_id(user_id, document_id)
    if not document:
        return False
    
    # Soft delete in database
    success = await delete_document(user_id, document_id)
    
    if success:
        logger.info(f"Document {document_id} deleted for user {user_id}")
        
        # TODO: In future, also remove from Chroma vector stores
        # For now, just mark as inactive in database
    
    return success


async def get_documents_for_thread(
    user_id: str, 
    document_ids: List[str]
) -> List[UserDocument]:
    """
    Get documents accessible to a user for thread context.
    
    Args:
        user_id: User identifier
        document_ids: List of document IDs to retrieve
        
    Returns:
        List of accessible documents
    """
    try:
        documents = []
        
        for doc_id in document_ids:
            document = await get_document_by_id(user_id, doc_id)
            if document:
                documents.append(document)
                logger.debug(f"Added document to thread context: {document.original_filename}")
            else:
                logger.warning(f"Document not accessible for thread: {doc_id}")
        
        logger.info(f"Retrieved {len(documents)} documents for thread context")
        return documents
        
    except Exception as e:
        logger.error(f"Error getting documents for thread: {e}")
        return []


async def validate_document_access(user_id: str, document_ids: List[str]) -> bool:
    """
    Validate that user has access to all specified documents.
    
    Args:
        user_id: User ID
        document_ids: List of document IDs to validate
        
    Returns:
        True if user has access to all documents
    """
    if not document_ids:
        return True
    
    accessible_docs = await get_documents_by_ids(user_id, document_ids)
    accessible_ids = {doc.id for doc in accessible_docs}
    
    return all(doc_id in accessible_ids for doc_id in document_ids)
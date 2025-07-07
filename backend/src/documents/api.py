"""
FastAPI router for document library management.
"""

import logging
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse

from src.auth.dependencies import get_current_user
from src.auth.models import User

from .service import (
    process_uploaded_file, get_user_document_library, get_document_details,
    update_document_metadata, remove_document_from_library
)
from .models import (
    DocumentResponse, DocumentListResponse, DocumentUpdateRequest,
    UserDocument
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    tags: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user)
) -> DocumentResponse:
    """
    Upload a document to user's global library.
    
    Args:
        file: Uploaded file
        tags: Optional comma-separated tags
        current_user: Authenticated user
        
    Returns:
        Document upload result
    """
    try:
        # Validate file type
        allowed_extensions = ['.csv', '.xlsx', '.xls', '.pdf', '.json', '.txt', '.md']
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not supported. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Validate file size (50MB limit)
        content = await file.read()
        max_size = 50 * 1024 * 1024  # 50MB
        if len(content) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
            )
        
        # Parse tags
        tag_list = None
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        
        # Process and store document
        document = await process_uploaded_file(
            user_id=str(current_user.id),
            file_content=content,
            original_filename=file.filename,
            file_type=file_ext,
            tags=tag_list
        )
        
        logger.info(f"User {current_user.email} uploaded document: {file.filename}")
        
        return DocumentResponse(
            success=True,
            document=document,
            message=f"Document '{file.filename}' uploaded successfully to your library"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.get("/", response_model=DocumentListResponse)
async def list_user_documents(
    current_user: User = Depends(get_current_user)
) -> DocumentListResponse:
    """
    Get all documents in user's library.
    
    Args:
        current_user: Authenticated user
        
    Returns:
        List of user documents
    """
    try:
        documents = await get_user_document_library(str(current_user.id))
        
        return DocumentListResponse(
            success=True,
            documents=documents,
            total_count=len(documents),
            message=f"Found {len(documents)} documents in your library"
        )
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list documents: {str(e)}"
        )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
) -> DocumentResponse:
    """
    Get document details by ID.
    
    Args:
        document_id: Document ID
        current_user: Authenticated user
        
    Returns:
        Document details
    """
    try:
        document = await get_document_details(str(current_user.id), document_id)
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or you don't have access"
            )
        
        return DocumentResponse(
            success=True,
            document=document,
            message="Document details retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get document: {str(e)}"
        )


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    updates: DocumentUpdateRequest,
    current_user: User = Depends(get_current_user)
) -> DocumentResponse:
    """
    Update document metadata.
    
    Args:
        document_id: Document ID
        updates: Update request
        current_user: Authenticated user
        
    Returns:
        Updated document
    """
    try:
        document = await update_document_metadata(
            user_id=str(current_user.id),
            document_id=document_id,
            tags=updates.tags,
            summary=updates.summary
        )
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or you don't have access"
            )
        
        return DocumentResponse(
            success=True,
            document=document,
            message="Document updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update document: {str(e)}"
        )


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
) -> JSONResponse:
    """
    Delete document from library.
    
    Args:
        document_id: Document ID
        current_user: Authenticated user
        
    Returns:
        Deletion result
    """
    try:
        success = await remove_document_from_library(str(current_user.id), document_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Document not found or you don't have access"
            )
        
        logger.info(f"User {current_user.email} deleted document: {document_id}")
        
        return JSONResponse({
            "success": True,
            "message": "Document deleted successfully from your library"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(e)}"
        )


@router.get("/{document_id}/content")
async def get_document_content(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get document content for viewing.
    
    Args:
        document_id: Document ID
        current_user: Authenticated user
        
    Returns:
        Document file content
    """
    try:
        # Get document details to verify ownership
        document = await get_document_details(str(current_user.id), document_id)
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or you don't have access"
            )
        
        # Use the stored file path directly (it's already a relative path)
        file_path = Path(document.file_path)
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail="Document file not found on server"
            )
        
        # Return file content
        return FileResponse(
            path=str(file_path),
            filename=document.original_filename,
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document content: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get document content: {str(e)}"
        )


@router.get("/health/check")
async def health_check():
    """Health check for documents module."""
    return {"status": "ok", "module": "documents"}
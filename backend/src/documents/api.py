"""
FastAPI router for document library management.
Enhanced with streaming file uploads for better performance and memory usage.
"""

import logging
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse

from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.utils.file_utils import (
    validate_file_extension, save_uploaded_file_stream, 
    get_file_size_mb, MAX_FILE_SIZE_LARGE
)

from .service import (
    process_uploaded_file_stream, get_user_document_library, get_document_details,
    update_document_metadata, remove_document_from_library
)
from .enhanced_service import get_document_processing_service
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
    Upload a document to user's global library using streaming for large files.
    
    Args:
        file: Uploaded file (up to 200MB supported)
        tags: Optional comma-separated tags
        current_user: Authenticated user
        
    Returns:
        Document upload result
    """
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file selected")
        
        # Validate file type early
        allowed_extensions = ['.csv', '.xlsx', '.xls', '.pdf', '.json', '.txt', '.md', '.docx']
        file_ext = validate_file_extension(file.filename, allowed_extensions)
        
        # Parse tags
        tag_list = None
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        
        # Create user directory structure
        user_dir = Path(f"data/documents/user_{current_user.id}")
        user_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename to avoid conflicts
        import uuid
        doc_id = str(uuid.uuid4())
        unique_filename = f"doc_{doc_id}_{file.filename}"
        destination_path = user_dir / unique_filename
        
        # Stream file to disk (handles size validation automatically)
        file_size, saved_path = await save_uploaded_file_stream(
            file=file,
            destination_path=destination_path,
            max_size=MAX_FILE_SIZE_LARGE  # 200MB limit for documents
        )
        
        # Process and store document record with enhanced RAG integration
        processing_service = get_document_processing_service()
        document = await processing_service.process_document_with_rag(
            user_id=str(current_user.id),
            file_path=saved_path,
            original_filename=file.filename,
            file_type=file_ext,
            file_size=file_size,
            tags=tag_list
        )
        
        logger.info(f"User {current_user.email} uploaded document: {file.filename} ({get_file_size_mb(file_size)}MB)")
        
        return DocumentResponse(
            success=True,
            document=document,
            message=f"Document '{file.filename}' ({get_file_size_mb(file_size)}MB) uploaded successfully to your library"
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
        logger.info(f"🔍 REQUEST: Document content requested - user={current_user.email}, document_id={document_id}")
        
        # Get document details to verify ownership
        document = await get_document_details(str(current_user.id), document_id)
        
        if not document:
            logger.warning(f"❌ DOCUMENT NOT FOUND: user={current_user.email}, document_id={document_id}")
            raise HTTPException(
                status_code=404,
                detail="Document not found or you don't have access"
            )
        
        logger.info(f"✅ DOCUMENT FOUND: {document.original_filename}, file_type={document.file_type}, file_path={document.file_path}")
        
        # Simplified and more robust file path resolution
        file_path = Path(document.file_path)
        
        # If path is not absolute, resolve it relative to the current working directory
        if not file_path.is_absolute():
            file_path = Path.cwd() / document.file_path
        
        logger.info(f"📁 RESOLVED PATH: {file_path.absolute()}")
        logger.info(f"📂 CURRENT WORKING DIR: {Path.cwd()}")
        
        # Check if file exists
        if not file_path.exists():
            logger.error(f"❌ FILE NOT FOUND at: {file_path.absolute()}")
            
            # Try to find the file in the user's directory
            user_dir = Path.cwd() / "data" / "documents" / f"user_{current_user.id}"
            logger.info(f"🔍 SEARCHING in user directory: {user_dir.absolute()}")
            
            if user_dir.exists():
                # Look for files with the same original filename
                matching_files = list(user_dir.glob(f"*{document.original_filename}"))
                logger.info(f"🔍 FOUND {len(matching_files)} matching files: {[str(f) for f in matching_files]}")
                
                if matching_files:
                    file_path = matching_files[0]
                    logger.info(f"✅ USING MATCHED FILE: {file_path.absolute()}")
                else:
                    logger.error(f"❌ NO MATCHING FILES for: {document.original_filename}")
                    raise HTTPException(
                        status_code=404,
                        detail="Document file not found on server"
                    )
            else:
                logger.error(f"❌ USER DIRECTORY NOT FOUND: {user_dir.absolute()}")
                raise HTTPException(
                    status_code=404,
                    detail="User document directory not found"
                )
        
        # Verify file is readable
        if not file_path.is_file():
            logger.error(f"❌ PATH IS NOT A FILE: {file_path.absolute()}")
            raise HTTPException(
                status_code=500,
                detail="Document path is not a valid file"
            )
        
        # Get file size for logging
        file_size = file_path.stat().st_size
        logger.info(f"📊 FILE INFO: path={file_path.absolute()}, size={file_size} bytes")
        
        # Determine appropriate media type based on file extension
        media_type = 'application/octet-stream'
        file_ext = file_path.suffix.lower()
        
        if file_ext == '.pdf':
            media_type = 'application/pdf'
        elif file_ext in ['.xlsx', '.xls']:
            media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif file_ext in ['.docx', '.doc']:
            media_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif file_ext == '.csv':
            media_type = 'text/csv'
        
        logger.info(f"📤 SERVING FILE: media_type={media_type}, filename={document.original_filename}")
        
        # Return file content with proper headers
        return FileResponse(
            path=str(file_path),
            filename=document.original_filename,
            media_type=media_type,
            headers={
                "Content-Length": str(file_size),
                "Cache-Control": "no-cache"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 EXCEPTION in get_document_content: {e}")
        logger.exception("Full exception details:")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get document content: {str(e)}"
        )


@router.post("/search")
async def search_documents(
    query: str = Form(...),
    limit: int = Form(default=5),
    current_user: User = Depends(get_current_user)
) -> JSONResponse:
    """
    Search user documents using intelligent RAG system.
    
    Args:
        query: Search query
        limit: Maximum number of results
        current_user: Authenticated user
        
    Returns:
        Search results with AI-generated answers
    """
    try:
        processing_service = get_document_processing_service()
        results = await processing_service.search_documents(
            user_id=str(current_user.id),
            query=query,
            limit=limit
        )
        
        if not results.get("success"):
            raise HTTPException(
                status_code=500,
                detail=results.get("error", "Search failed")
            )
        
        return JSONResponse({
            "success": True,
            "query": query,
            "answer": results.get("answer"),
            "sources": results.get("sources", []),
            "document_count": results.get("document_count", 0)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search documents: {str(e)}"
        )


@router.post("/reprocess")
async def reprocess_documents(
    current_user: User = Depends(get_current_user)
) -> JSONResponse:
    """
    Reprocess all user documents for enhanced RAG system.
    
    Args:
        current_user: Authenticated user
        
    Returns:
        Processing results
    """
    try:
        processing_service = get_document_processing_service()
        results = await processing_service.reprocess_documents_for_user(str(current_user.id))
        
        if not results.get("success"):
            raise HTTPException(
                status_code=500,
                detail=results.get("error", "Reprocessing failed")
            )
        
        processing_results = results.get("results", {})
        
        return JSONResponse({
            "success": True,
            "message": "Document reprocessing completed",
            "total_documents": processing_results.get("total_documents", 0),
            "processed": processing_results.get("processed", 0),
            "errors": processing_results.get("errors", 0),
            "details": processing_results.get("details", [])
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reprocessing documents: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reprocess documents: {str(e)}"
        )


@router.get("/rag/stats")
async def get_rag_statistics(
    current_user: User = Depends(get_current_user)
) -> JSONResponse:
    """
    Get RAG system statistics.
    
    Args:
        current_user: Authenticated user
        
    Returns:
        RAG system statistics
    """
    try:
        processing_service = get_document_processing_service()
        stats = processing_service.get_rag_stats()
        
        return JSONResponse({
            "success": True,
            "rag_available": stats.get("available", False),
            "collection_name": stats.get("collection_name"),
            "document_count": stats.get("document_count", 0),
            "persist_directory": stats.get("persist_directory"),
            "error": stats.get("error")
        })
        
    except Exception as e:
        logger.error(f"Error getting RAG stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get RAG statistics: {str(e)}"
        )


@router.get("/health/check")
async def health_check():
    """Health check for documents module."""
    return {"status": "ok", "module": "documents"}
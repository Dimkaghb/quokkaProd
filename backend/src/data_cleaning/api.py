"""
API endpoints for data cleaning operations.
"""

import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
import uuid
import os
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

try:
    from src.auth.dependencies import get_current_user, get_current_user_optional
    from src.auth.models import User
    AUTH_AVAILABLE = True
except ImportError:
    # Fallback when auth is not available - DISABLE ALL ENDPOINTS
    AUTH_AVAILABLE = False
    
    async def get_current_user():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available"
        )
    
    async def get_current_user_optional():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available"
        )
    
    class User:
        id = "test-user"

from .service import DataCleaningService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data-cleaning", tags=["data-cleaning"])

# Configuration
DOCUMENTS_BASE_FOLDER = Path("data/documents")
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

# Create base documents directory if it doesn't exist
DOCUMENTS_BASE_FOLDER.mkdir(parents=True, exist_ok=True)


def get_user_documents_folder(user_id: str) -> Path:
    """Get user-specific documents folder path."""
    user_folder = DOCUMENTS_BASE_FOLDER / f"user_{user_id}"
    user_folder.mkdir(parents=True, exist_ok=True)
    return user_folder


def get_user_temp_folder(user_id: str) -> Path:
    """Get user-specific temporary folder for cleaning operations."""
    temp_folder = DOCUMENTS_BASE_FOLDER / f"user_{user_id}" / "temp"
    temp_folder.mkdir(parents=True, exist_ok=True)
    return temp_folder


class DataCleaningRequest(BaseModel):
    """Request model for data cleaning operations."""
    file_path: str = Field(description="Path to the uploaded file")
    operations: List[str] = Field(description="List of cleaning operations to perform")
    

class DataCleaningResponse(BaseModel):
    """Response model for data cleaning operations."""
    success: bool = Field(description="Whether the cleaning was successful")
    cleaned_file_path: Optional[str] = Field(default=None, description="Path to the cleaned file")
    download_url: Optional[str] = Field(default=None, description="URL to download the cleaned file")
    operations_performed: Optional[List[str]] = Field(default=None, description="List of operations that were performed")
    error: Optional[str] = Field(default=None, description="Error message if any")
    file_info: Optional[Dict[str, Any]] = Field(default=None, description="Information about the processed file")


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed for data cleaning."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@router.post("/upload-and-clean", response_model=DataCleaningResponse)
async def upload_and_clean_data(
    file: UploadFile = File(...),
    operations: str = Form(...),  # JSON string of operations list
    current_user = Depends(get_current_user_optional if AUTH_AVAILABLE else get_current_user)
) -> DataCleaningResponse:
    """
    Upload a file and perform data cleaning operations.
    
    Args:
        file: Uploaded file (CSV, Excel)
        operations: JSON string of cleaning operations to perform
        current_user: Current authenticated user
        
    Returns:
        Cleaned file information and download URL
    """
    try:
        user_id = getattr(current_user, 'id', 'anonymous') if current_user else 'anonymous'
        logger.info(f"Received data cleaning request from user {user_id}: {file.filename}")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail='No file selected')
        
        if not allowed_file(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            )
        
        # Parse operations
        import json
        try:
            operations_list = json.loads(operations)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail='Invalid operations format')
        
        if not operations_list:
            raise HTTPException(status_code=400, detail='No cleaning operations specified')
        
        # Get user-specific folders
        user_temp_folder = get_user_temp_folder(str(user_id))
        
        # Generate unique ID for this upload
        file_id = str(uuid.uuid4())
        logger.info(f"Generated file ID: {file_id} for user {user_id}")
        
        # Save uploaded file to user's temp folder
        file_path = user_temp_folder / f'{file_id}_{file.filename}'
        logger.info(f"Saving file to: {file_path}")
        
        # Read file content
        content = await file.read()
        
        # Validate file size (limit to 50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        if len(content) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
            )
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(content)
        
        logger.info(f"File saved successfully for user {user_id}, starting data cleaning...")
        
        # Initialize data cleaning service
        cleaning_service = DataCleaningService()
        
        # Perform cleaning operations (output to same temp folder)
        cleaned_file_path = await cleaning_service.clean_data(
            str(file_path), 
            operations_list, 
            str(user_temp_folder)
        )
        
        # Generate download URL
        cleaned_filename = Path(cleaned_file_path).name
        download_url = f"/data-cleaning/download/{cleaned_filename}"
        
        # Prepare file info
        file_info = {
            'original_filename': file.filename,
            'cleaned_filename': cleaned_filename,
            'size': len(content),
            'type': file.filename.split('.')[-1].lower(),
            'cleaning_time': datetime.utcnow().isoformat(),
            'file_id': file_id,
            'user_id': str(user_id)
        }
        
        logger.info(f"Data cleaning completed successfully for file {file.filename} for user {user_id}")
        
        return DataCleaningResponse(
            success=True,
            cleaned_file_path=cleaned_file_path,
            download_url=download_url,
            operations_performed=operations_list,
            file_info=file_info
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload_and_clean_data for user {user_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return DataCleaningResponse(
            success=False,
            error=str(e)
        )


@router.get("/download/{filename}")
async def download_cleaned_file(
    filename: str,
    auto_delete: bool = True,
    current_user = Depends(get_current_user_optional if AUTH_AVAILABLE else get_current_user)
) -> FileResponse:
    """
    Download a cleaned file with optional auto-deletion.
    
    Args:
        filename: Name of the cleaned file to download
        auto_delete: Whether to delete the file after download (default: True)
        current_user: Current authenticated user
        
    Returns:
        File download response
    """
    try:
        user_id = getattr(current_user, 'id', 'anonymous') if current_user else 'anonymous'
        user_temp_folder = get_user_temp_folder(str(user_id))
        file_path = user_temp_folder / filename
        
        # Security check: ensure file is within user's temp folder
        if not str(file_path).startswith(str(user_temp_folder)):
            raise HTTPException(status_code=403, detail="Access denied: File not in user's folder")
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Create response with auto-deletion header
        response = FileResponse(
            path=str(file_path),
            filename=filename,
            media_type='application/octet-stream'
        )
        
        if auto_delete:
            # Schedule file deletion after response is sent
            import asyncio
            asyncio.create_task(_cleanup_file_after_download(str(file_path), filename, str(user_id)))
            response.headers["X-Auto-Delete"] = "true"
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file {filename} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def _cleanup_file_after_download(file_path: str, filename: str, user_id: str):
    """Clean up file after a short delay to ensure download completes."""
    try:
        # Wait a bit to ensure download starts
        await asyncio.sleep(2)
        
        if os.path.exists(file_path):
            os.unlink(file_path)
            logger.info(f"Auto-deleted cleaned file: {filename} for user {user_id}")
            
            # Also try to find and delete the original uploaded file
            # Extract file_id from cleaned filename
            parts = filename.split('_')
            if len(parts) >= 4:  # cleaned_timestamp_fileid_originalname
                file_id = parts[2]
                
                # Search for original file in user's temp folder
                user_temp_folder = get_user_temp_folder(user_id)
                for upload_file in user_temp_folder.glob(f"{file_id}_*"):
                    if upload_file.exists() and upload_file != Path(file_path):
                        upload_file.unlink()
                        logger.info(f"Auto-deleted original file: {upload_file.name} for user {user_id}")
                        
    except Exception as e:
        logger.error(f"Error during file cleanup for user {user_id}: {e}")


@router.get("/supported-operations")
async def get_supported_operations() -> Dict[str, Any]:
    """
    Get list of supported data cleaning operations.
    
    Returns:
        Dictionary of supported operations with descriptions
    """
    return {
        "operations": [
            {
                "id": "remove_duplicates",
                "name": "Remove Duplicates",
                "description": "Remove duplicate rows from the dataset"
            },
            {
                "id": "handle_missing",
                "name": "Handle Missing Values",
                "description": "Fill or remove missing values in the dataset"
            },
            {
                "id": "standardize_format",
                "name": "Standardize Format",
                "description": "Standardize text formatting, dates, and fix common data issues"
            }
        ]
    }


@router.delete("/cancel/{filename}")
async def cancel_and_cleanup(
    filename: str,
    current_user = Depends(get_current_user_optional if AUTH_AVAILABLE else get_current_user)
) -> Dict[str, Any]:
    """
    Cancel operation and delete both original and cleaned files.
    
    Args:
        filename: Name of the cleaned file to cancel
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    try:
        user_id = getattr(current_user, 'id', 'anonymous') if current_user else 'anonymous'
        user_temp_folder = get_user_temp_folder(str(user_id))
        cleaned_file_path = user_temp_folder / filename
        deleted_files = []
        
        # Security check: ensure file is within user's temp folder
        if not str(cleaned_file_path).startswith(str(user_temp_folder)):
            raise HTTPException(status_code=403, detail="Access denied: File not in user's folder")
        
        # Delete cleaned file if exists
        if cleaned_file_path.exists():
            cleaned_file_path.unlink()
            deleted_files.append(f"temp/{filename}")
            logger.info(f"Deleted cleaned file: {filename} for user {user_id}")
        
        # Find and delete original uploaded file
        parts = filename.split('_')
        if len(parts) >= 4:  # cleaned_timestamp_fileid_originalname
            file_id = parts[2]
            
            for upload_file in user_temp_folder.glob(f"{file_id}_*"):
                if upload_file.exists() and upload_file != cleaned_file_path:
                    upload_file.unlink()
                    deleted_files.append(f"temp/{upload_file.name}")
                    logger.info(f"Deleted original file: {upload_file.name} for user {user_id}")
        
        return {
            "message": "Files deleted successfully",
            "deleted_files": deleted_files,
            "user_id": str(user_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during file cleanup for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to cleanup files")


@router.post("/add-to-docs/{filename}")
async def add_to_documents(
    filename: str,
    current_user = Depends(get_current_user_optional if AUTH_AVAILABLE else get_current_user)
) -> Dict[str, Any]:
    """
    Add cleaned file to user's documents collection.
    
    Args:
        filename: Name of the cleaned file to add to documents
        current_user: Current authenticated user
        
    Returns:
        Success message with document info
    """
    try:
        user_id = getattr(current_user, 'id', 'anonymous') if current_user else 'anonymous'
        user_temp_folder = get_user_temp_folder(str(user_id))
        user_documents_folder = get_user_documents_folder(str(user_id))
        
        cleaned_file_path = user_temp_folder / filename
        
        # Security check: ensure file is within user's temp folder
        if not str(cleaned_file_path).startswith(str(user_temp_folder)):
            raise HTTPException(status_code=403, detail="Access denied: File not in user's folder")
        
        if not cleaned_file_path.exists():
            raise HTTPException(status_code=404, detail="Cleaned file not found")
        
        # Extract original filename from cleaned filename
        parts = filename.split('_')
        if len(parts) >= 4:  # cleaned_timestamp_fileid_originalname
            original_name = '_'.join(parts[3:])  # Get original filename
        else:
            original_name = filename
            
        # Generate unique document name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        doc_filename = f"{timestamp}_{original_name}"
        doc_path = user_documents_folder / doc_filename
        
        # Copy the file to user's documents folder
        import shutil
        shutil.copy2(cleaned_file_path, doc_path)
        
        logger.info(f"Added cleaned file to documents: {doc_filename} for user {user_id}")
        
        # Delete temporary files since they're now saved as documents
        deleted_files = []
        
        # Delete cleaned file
        if cleaned_file_path.exists():
            cleaned_file_path.unlink()
            deleted_files.append(f"temp/{filename}")
        
        # Delete original uploaded file
        parts = filename.split('_')
        if len(parts) >= 4:
            file_id = parts[2]
            for upload_file in user_temp_folder.glob(f"{file_id}_*"):
                if upload_file.exists() and upload_file != cleaned_file_path:
                    upload_file.unlink()
                    deleted_files.append(f"temp/{upload_file.name}")
        
        return {
            "message": "File added to documents successfully",
            "document_name": doc_filename,
            "original_name": original_name,
            "document_path": str(doc_path),
            "deleted_temp_files": deleted_files,
            "user_id": str(user_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding file to documents for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add file to documents")


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint for data cleaning service."""
    return {"status": "ok", "service": "data-cleaning"}
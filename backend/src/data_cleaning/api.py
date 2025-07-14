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

router = APIRouter(prefix="/data-cleaning", tags=["data-cleaning"])

# Configuration
UPLOAD_FOLDER = Path("data/uploads")
CLEANED_FOLDER = Path("data/cleaned")
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

# Create directories if they don't exist
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
CLEANED_FOLDER.mkdir(parents=True, exist_ok=True)


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
        
        # Generate unique ID for this upload
        file_id = str(uuid.uuid4())
        logger.info(f"Generated file ID: {file_id}")
        
        # Save uploaded file
        file_path = UPLOAD_FOLDER / f'{file_id}_{file.filename}'
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
        
        logger.info(f"File saved successfully, starting data cleaning...")
        
        # Initialize data cleaning service
        cleaning_service = DataCleaningService()
        
        # Perform cleaning operations
        cleaned_file_path = await cleaning_service.clean_data(
            str(file_path), 
            operations_list, 
            str(CLEANED_FOLDER)
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
            'file_id': file_id
        }
        
        logger.info(f"Data cleaning completed successfully for file {file.filename}")
        
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
        logger.error(f"Error in upload_and_clean_data: {str(e)}")
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
        file_path = CLEANED_FOLDER / filename
        
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
            asyncio.create_task(_cleanup_file_after_download(str(file_path), filename))
            response.headers["X-Auto-Delete"] = "true"
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def _cleanup_file_after_download(file_path: str, filename: str):
    """Clean up file after a short delay to ensure download completes."""
    try:
        # Wait a bit to ensure download starts
        await asyncio.sleep(2)
        
        if os.path.exists(file_path):
            os.unlink(file_path)
            logger.info(f"Auto-deleted cleaned file: {filename}")
            
            # Also try to find and delete the original uploaded file
            # Extract file_id from cleaned filename
            parts = filename.split('_')
            if len(parts) >= 4:  # cleaned_timestamp_fileid_originalname
                file_id = parts[2]
                
                # Search for original file in uploads folder
                for upload_file in UPLOAD_FOLDER.glob(f"{file_id}_*"):
                    if upload_file.exists():
                        upload_file.unlink()
                        logger.info(f"Auto-deleted original file: {upload_file.name}")
                        
    except Exception as e:
        logger.error(f"Error during file cleanup: {e}")


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
        cleaned_file_path = CLEANED_FOLDER / filename
        deleted_files = []
        
        # Delete cleaned file if exists
        if cleaned_file_path.exists():
            cleaned_file_path.unlink()
            deleted_files.append(f"cleaned/{filename}")
            logger.info(f"Deleted cleaned file: {filename}")
        
        # Find and delete original uploaded file
        parts = filename.split('_')
        if len(parts) >= 4:  # cleaned_timestamp_fileid_originalname
            file_id = parts[2]
            
            for upload_file in UPLOAD_FOLDER.glob(f"{file_id}_*"):
                if upload_file.exists():
                    upload_file.unlink()
                    deleted_files.append(f"uploads/{upload_file.name}")
                    logger.info(f"Deleted original file: {upload_file.name}")
        
        return {
            "message": "Files deleted successfully",
            "deleted_files": deleted_files
        }
        
    except Exception as e:
        logger.error(f"Error during file cleanup: {e}")
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
        cleaned_file_path = CLEANED_FOLDER / filename
        
        if not cleaned_file_path.exists():
            raise HTTPException(status_code=404, detail="Cleaned file not found")
        
        # Create documents directory if it doesn't exist
        documents_folder = Path("backend/data/documents")
        documents_folder.mkdir(parents=True, exist_ok=True)
        
        # Copy file to documents with a clean name
        parts = filename.split('_')
        if len(parts) >= 4:  # cleaned_timestamp_fileid_originalname
            original_name = '_'.join(parts[3:])  # Get original filename
        else:
            original_name = filename
            
        # Generate unique document name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        doc_filename = f"{timestamp}_{original_name}"
        doc_path = documents_folder / doc_filename
        
        # Copy the file
        import shutil
        shutil.copy2(cleaned_file_path, doc_path)
        
        logger.info(f"Added cleaned file to documents: {doc_filename}")
        
        # Delete original files since they're now saved as documents
        deleted_files = []
        
        # Delete cleaned file
        if cleaned_file_path.exists():
            cleaned_file_path.unlink()
            deleted_files.append(f"cleaned/{filename}")
        
        # Delete original uploaded file
        parts = filename.split('_')
        if len(parts) >= 4:
            file_id = parts[2]
            for upload_file in UPLOAD_FOLDER.glob(f"{file_id}_*"):
                if upload_file.exists():
                    upload_file.unlink()
                    deleted_files.append(f"uploads/{upload_file.name}")
        
        return {
            "message": "File added to documents successfully",
            "document_name": doc_filename,
            "original_name": original_name,
            "document_path": str(doc_path),
            "deleted_temp_files": deleted_files
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding file to documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to add file to documents")


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint for data cleaning service."""
    return {"status": "ok", "service": "data-cleaning"}
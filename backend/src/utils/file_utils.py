"""
Enhanced file upload utilities with streaming support and async operations.
Addresses memory issues with large file uploads.
"""

import os
import uuid
import logging
import asyncio
from pathlib import Path
from typing import Tuple, Optional, AsyncGenerator, BinaryIO
from contextlib import asynccontextmanager

import aiofiles
from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

# Configuration constants
CHUNK_SIZE = 1024 * 1024  # 1MB chunks for streaming
MAX_FILE_SIZE_DEFAULT = 200 * 1024 * 1024  # 200MB default limit
MAX_FILE_SIZE_LARGE = 500 * 1024 * 1024   # 500MB for data files


async def get_file_size(file: UploadFile) -> int:
    """
    Get file size without loading entire content into memory.
    
    Args:
        file: FastAPI UploadFile instance
        
    Returns:
        File size in bytes
    """
    try:
        # First, try to get size from file object attributes
        if hasattr(file.file, 'seek') and hasattr(file.file, 'tell'):
            try:
                current_pos = file.file.tell()
                file.file.seek(0, 2)  # Seek to end
                size = file.file.tell()
                file.file.seek(current_pos)  # Reset to original position
                return size
            except Exception:
                pass
        
        # Fallback: try to get size from content-length header
        if hasattr(file, 'headers') and file.headers:
            content_length = file.headers.get('content-length')
            if content_length:
                return int(content_length)
        
        # Last resort: read file content to determine size (for small files this is acceptable)
        await file.seek(0)
        content = await file.read()
        await file.seek(0)  # Reset to beginning
        return len(content)
        
    except Exception as e:
        logger.error(f"Error getting file size: {e}")
        raise HTTPException(
            status_code=400, 
            detail=f"Unable to determine file size: {str(e)}"
        )


async def validate_file_size(file: UploadFile, max_size: int = MAX_FILE_SIZE_DEFAULT) -> int:
    """
    Validate file size before processing.
    
    Args:
        file: FastAPI UploadFile instance
        max_size: Maximum allowed file size in bytes
        
    Returns:
        File size in bytes
        
    Raises:
        HTTPException: If file is too large
    """
    try:
        file_size = await get_file_size(file)
        
        if file_size > max_size:
            max_size_mb = max_size // (1024 * 1024)
            actual_size_mb = file_size // (1024 * 1024)
            raise HTTPException(
                status_code=413,  # Request Entity Too Large
                detail=f"File too large ({actual_size_mb}MB). Maximum size: {max_size_mb}MB"
            )
        
        return file_size
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Could not validate file size: {e}. Will proceed with streaming validation.")
        return 0  # Return 0 to indicate unknown size, will be validated during streaming


async def save_small_file_simple(
    file: UploadFile,
    destination_path: Path,
    max_size: int = 10 * 1024 * 1024  # 10MB limit for simple method
) -> Tuple[int, str]:
    """
    Simple method for saving small files without streaming complexity.
    
    Args:
        file: FastAPI UploadFile instance
        destination_path: Path where file should be saved
        max_size: Maximum allowed file size
        
    Returns:
        Tuple of (file_size, file_path)
    """
    try:
        # Create destination directory if it doesn't exist
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Read file content (for small files this is acceptable)
        await file.seek(0)
        content = await file.read()
        file_size = len(content)
        
        # Validate size
        if file_size > max_size:
            max_size_mb = max_size // (1024 * 1024)
            actual_size_mb = file_size // (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"File too large ({actual_size_mb}MB). Maximum size: {max_size_mb}MB"
            )
        
        # Save file using aiofiles
        async with aiofiles.open(destination_path, 'wb') as dest_file:
            await dest_file.write(content)
        
        # Verify file was saved correctly
        if not destination_path.exists() or destination_path.stat().st_size != file_size:
            raise HTTPException(
                status_code=500,
                detail="File save verification failed"
            )
        
        logger.info(f"Successfully saved small file to {destination_path} ({file_size} bytes)")
        return file_size, str(destination_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving small file: {e}")
        # Clean up partial file
        try:
            destination_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )


async def stream_file_chunks(file: UploadFile, chunk_size: int = CHUNK_SIZE) -> AsyncGenerator[bytes, None]:
    """
    Stream file content in chunks to avoid memory issues.
    
    Args:
        file: FastAPI UploadFile instance
        chunk_size: Size of each chunk in bytes
        
    Yields:
        Chunks of file content as bytes
    """
    try:
        await file.seek(0)  # Ensure we start from beginning
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            yield chunk
    except Exception as e:
        logger.error(f"Error streaming file chunks: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error reading file content"
        )


async def save_uploaded_file_stream(
    file: UploadFile,
    destination_path: Path,
    max_size: int = MAX_FILE_SIZE_DEFAULT,
    chunk_size: int = CHUNK_SIZE
) -> Tuple[int, str]:
    """
    Save uploaded file using streaming to avoid memory issues.
    
    Args:
        file: FastAPI UploadFile instance
        destination_path: Path where file should be saved
        max_size: Maximum allowed file size
        chunk_size: Size of chunks for streaming
        
    Returns:
        Tuple of (file_size, file_path)
        
    Raises:
        HTTPException: If file is too large or save fails
    """
    try:
        # Try to determine file size to choose optimal method
        estimated_size = None
        try:
            estimated_size = await get_file_size(file)
            if estimated_size > max_size:
                max_size_mb = max_size // (1024 * 1024)
                actual_size_mb = estimated_size // (1024 * 1024)
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large ({actual_size_mb}MB). Maximum size: {max_size_mb}MB"
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Could not determine file size upfront: {e}. Will try simple method first.")
        
        # For small files or when we can't determine size, use simple method
        if estimated_size is None or estimated_size <= 10 * 1024 * 1024:  # 10MB threshold
            try:
                return await save_small_file_simple(file, destination_path, max_size)
            except Exception as simple_error:
                logger.warning(f"Simple save method failed: {simple_error}. Trying streaming method.")
                # Reset file position and try streaming method
                await file.seek(0)
        
        # Stream file to disk
        bytes_written = 0
        async with aiofiles.open(destination_path, 'wb') as dest_file:
            # Reset file position to beginning
            await file.seek(0)
            
            async for chunk in stream_file_chunks(file, chunk_size):
                await dest_file.write(chunk)
                bytes_written += len(chunk)
                
                # Safety check to prevent infinite streaming
                if bytes_written > max_size:
                    # Clean up partial file
                    try:
                        await dest_file.close()
                        destination_path.unlink(missing_ok=True)
                    except Exception:
                        pass
                    raise HTTPException(
                        status_code=413,
                        detail="File size exceeded during upload"
                    )
        
        # Get actual file size from saved file
        actual_file_size = destination_path.stat().st_size
        
        # Verify file was saved correctly
        if not destination_path.exists() or actual_file_size == 0:
            raise HTTPException(
                status_code=500,
                detail="File save verification failed"
            )
        
        # If we had an estimated_size from before, verify it matches
        if estimated_size is not None and actual_file_size != estimated_size:
            logger.warning(f"File size mismatch: expected {estimated_size}, got {actual_file_size}")
        
        logger.info(f"Successfully saved file to {destination_path} ({actual_file_size} bytes)")
        return actual_file_size, str(destination_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving uploaded file: {e}")
        # Clean up partial file
        try:
            destination_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )


async def process_file_in_chunks(
    file_path: Path,
    processor_func,
    chunk_size: int = CHUNK_SIZE,
    **kwargs
):
    """
    Process large files in chunks to avoid memory issues.
    
    Args:
        file_path: Path to file to process
        processor_func: Function to process each chunk
        chunk_size: Size of chunks to read
        **kwargs: Additional arguments for processor_func
        
    Returns:
        Results from processor_func
    """
    try:
        results = []
        async with aiofiles.open(file_path, 'rb') as file:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                
                # Process chunk
                result = await processor_func(chunk, **kwargs)
                if result:
                    results.append(result)
        
        return results
        
    except Exception as e:
        logger.error(f"Error processing file in chunks: {e}")
        raise


@asynccontextmanager
async def temporary_file_context(suffix: str = "", prefix: str = "temp_"):
    """
    Context manager for temporary files with automatic cleanup.
    
    Args:
        suffix: File suffix/extension
        prefix: File prefix
        
    Yields:
        Path to temporary file
    """
    temp_dir = Path("temp")
    temp_dir.mkdir(exist_ok=True)
    
    temp_file = temp_dir / f"{prefix}{uuid.uuid4().hex}{suffix}"
    
    try:
        yield temp_file
    finally:
        # Clean up temporary file
        try:
            if temp_file.exists():
                temp_file.unlink()
                logger.debug(f"Cleaned up temporary file: {temp_file}")
        except Exception as e:
            logger.warning(f"Failed to clean up temporary file {temp_file}: {e}")


def get_file_size_mb(size_bytes: int) -> float:
    """Convert bytes to megabytes for display."""
    return round(size_bytes / (1024 * 1024), 2)


def validate_file_extension(filename: str, allowed_extensions: list) -> str:
    """
    Validate file extension.
    
    Args:
        filename: Name of the file
        allowed_extensions: List of allowed extensions (with or without dots)
        
    Returns:
        Normalized file extension
        
    Raises:
        HTTPException: If extension not allowed
    """
    if not filename or '.' not in filename:
        raise HTTPException(
            status_code=400,
            detail="File must have an extension"
        )
    
    file_ext = Path(filename).suffix.lower()
    
    # Normalize allowed extensions (ensure they start with dot)
    normalized_extensions = []
    for ext in allowed_extensions:
        if not ext.startswith('.'):
            ext = f'.{ext}'
        normalized_extensions.append(ext.lower())
    
    if file_ext not in normalized_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not supported. Allowed: {', '.join(normalized_extensions)}"
        )
    
    return file_ext


async def cleanup_old_files(directory: Path, max_age_hours: int = 24):
    """
    Clean up old files in a directory.
    
    Args:
        directory: Directory to clean
        max_age_hours: Maximum age of files to keep
    """
    try:
        if not directory.exists():
            return
        
        import time
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        files_cleaned = 0
        for file_path in directory.rglob('*'):
            if file_path.is_file():
                file_age = current_time - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    try:
                        file_path.unlink()
                        files_cleaned += 1
                    except Exception as e:
                        logger.warning(f"Failed to delete old file {file_path}: {e}")
        
        if files_cleaned > 0:
            logger.info(f"Cleaned up {files_cleaned} old files from {directory}")
            
    except Exception as e:
        logger.error(f"Error during file cleanup: {e}")
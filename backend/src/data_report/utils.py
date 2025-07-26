"""
Utility functions for data report processing.
"""

import os
import uuid
import shutil
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

# Allowed file extensions
ALLOWED_PREVIEW_EXTENSIONS = {'.pdf', '.docx', '.txt', '.md'}
ALLOWED_DATA_EXTENSIONS = {'.csv', '.xlsx', '.xls', '.json', '.tsv'}

# File size limits (in bytes)
MAX_PREVIEW_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_DATA_FILE_SIZE = 100 * 1024 * 1024    # 100MB


def validate_file_type(filename: str, file_type: str) -> bool:
    """
    Validate file type based on extension.
    
    Args:
        filename: Name of the file
        file_type: Type of file ('preview' or 'data')
        
    Returns:
        True if file type is valid, False otherwise
    """
    file_ext = Path(filename).suffix.lower()
    
    if file_type == 'preview':
        return file_ext in ALLOWED_PREVIEW_EXTENSIONS
    elif file_type == 'data':
        return file_ext in ALLOWED_DATA_EXTENSIONS
    
    return False


def validate_file_size(file_size: int, file_type: str) -> bool:
    """
    Validate file size based on type.
    
    Args:
        file_size: Size of the file in bytes
        file_type: Type of file ('preview' or 'data')
        
    Returns:
        True if file size is valid, False otherwise
    """
    if file_type == 'preview':
        return file_size <= MAX_PREVIEW_FILE_SIZE
    elif file_type == 'data':
        return file_size <= MAX_DATA_FILE_SIZE
    
    return False


def generate_file_id() -> str:
    """Generate a unique file identifier."""
    return str(uuid.uuid4())


def generate_report_id() -> str:
    """Generate a unique report identifier."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    return f"report_{timestamp}_{unique_id}"


def get_user_upload_dir(user_id: str) -> Path:
    """
    Get the upload directory for a specific user.
    
    Args:
        user_id: User identifier
        
    Returns:
        Path to user's upload directory
    """
    base_dir = Path("backend/uploads/data_reports")
    user_dir = base_dir / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def get_user_reports_dir(user_id: str) -> Path:
    """
    Get the reports directory for a specific user.
    
    Args:
        user_id: User identifier
        
    Returns:
        Path to user's reports directory
    """
    base_dir = Path("backend/data/reports")
    user_dir = base_dir / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def save_uploaded_file(file_content: bytes, filename: str, user_id: str, file_type: str) -> Tuple[str, str]:
    """
    Save uploaded file to user's directory.
    
    Args:
        file_content: File content as bytes
        filename: Original filename
        user_id: User identifier
        file_type: Type of file ('preview' or 'data')
        
    Returns:
        Tuple of (file_id, file_path)
    """
    file_id = generate_file_id()
    user_dir = get_user_upload_dir(user_id)
    
    # Create subdirectory for file type
    type_dir = user_dir / file_type
    type_dir.mkdir(exist_ok=True)
    
    # Generate safe filename
    file_ext = Path(filename).suffix
    safe_filename = f"{file_id}{file_ext}"
    file_path = type_dir / safe_filename
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    logger.info(f"Saved {file_type} file: {filename} -> {file_path}")
    return file_id, str(file_path)


def get_file_hash(file_path: str) -> str:
    """
    Calculate MD5 hash of a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        MD5 hash string
    """
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def save_report_metadata(report_id: str, user_id: str, metadata: Dict[str, Any]) -> str:
    """
    Save report metadata to JSON file.
    
    Args:
        report_id: Report identifier
        user_id: User identifier
        metadata: Metadata dictionary
        
    Returns:
        Path to metadata file
    """
    reports_dir = get_user_reports_dir(user_id)
    metadata_file = reports_dir / f"{report_id}_metadata.json"
    
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, default=str)
    
    return str(metadata_file)


def load_report_metadata(report_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Load report metadata from JSON file.
    
    Args:
        report_id: Report identifier
        user_id: User identifier
        
    Returns:
        Metadata dictionary or None if not found
    """
    reports_dir = get_user_reports_dir(user_id)
    metadata_file = reports_dir / f"{report_id}_metadata.json"
    
    if not metadata_file.exists():
        return None
    
    try:
        with open(metadata_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading metadata for report {report_id}: {e}")
        return None


def cleanup_temp_files(user_id: str, older_than_hours: int = 24) -> int:
    """
    Clean up temporary files older than specified hours.
    
    Args:
        user_id: User identifier
        older_than_hours: Remove files older than this many hours
        
    Returns:
        Number of files cleaned up
    """
    user_dir = get_user_upload_dir(user_id)
    current_time = datetime.now().timestamp()
    cutoff_time = current_time - (older_than_hours * 3600)
    
    cleaned_count = 0
    
    for file_path in user_dir.rglob('*'):
        if file_path.is_file():
            file_mtime = file_path.stat().st_mtime
            if file_mtime < cutoff_time:
                try:
                    file_path.unlink()
                    cleaned_count += 1
                    logger.info(f"Cleaned up old file: {file_path}")
                except Exception as e:
                    logger.error(f"Error cleaning up file {file_path}: {e}")
    
    return cleaned_count


def format_file_size(size_bytes: int) -> str:
    """
    Convert bytes to human readable format.
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        Human readable size string
    """
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024**2:
        return f"{size_bytes/1024:.1f} KB"
    elif size_bytes < 1024**3:
        return f"{size_bytes/1024**2:.1f} MB"
    else:
        return f"{size_bytes/1024**3:.1f} GB"


def get_content_type(filename: str) -> str:
    """
    Get MIME content type based on file extension.
    
    Args:
        filename: Name of the file
        
    Returns:
        MIME content type string
    """
    ext = Path(filename).suffix.lower()
    
    content_types = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.csv': 'text/csv',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.json': 'application/json',
        '.tsv': 'text/tab-separated-values'
    }
    
    return content_types.get(ext, 'application/octet-stream')


def ensure_directories_exist():
    """Ensure all required directories exist."""
    base_dirs = [
        Path("backend/uploads/data_reports"),
        Path("backend/data/reports")
    ]
    
    for dir_path in base_dirs:
        dir_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Ensured directory exists: {dir_path}")


def get_report_file_path(report_id: str, user_id: str) -> Optional[str]:
    """
    Get the file path for a generated report.
    
    Args:
        report_id: Report identifier
        user_id: User identifier
        
    Returns:
        Path to report file or None if not found
    """
    # First, check metadata for the actual file path
    metadata = load_report_metadata(report_id, user_id)
    if metadata and metadata.get('file_path'):
        file_path = metadata['file_path']
        if os.path.exists(file_path):
            return file_path
    
    # Fallback: Look for files with simple naming convention
    reports_dir = get_user_reports_dir(user_id)
    
    # Look for DOCX file
    docx_file = reports_dir / f"{report_id}.docx"
    if docx_file.exists():
        return str(docx_file)
    
    # Look for PDF file
    pdf_file = reports_dir / f"{report_id}.pdf"
    if pdf_file.exists():
        return str(pdf_file)
    
    return None


def generate_unique_id() -> str:
    """
    Generate a unique identifier for reports.
    
    Returns:
        Unique identifier string
    """
    return str(uuid.uuid4())


def get_file_path_from_id(file_id: str, user_id: str, file_type: str) -> Optional[str]:
    """
    Get file path from file ID.
    
    Args:
        file_id: File identifier
        user_id: User identifier
        file_type: Type of file ('preview' or 'data')
        
    Returns:
        Path to file or None if not found
    """
    user_dir = get_user_upload_dir(user_id)
    type_dir = user_dir / file_type
    
    # Look for files with the file_id prefix
    for file_path in type_dir.glob(f"{file_id}.*"):
        if file_path.is_file():
            return str(file_path)
    
    return None
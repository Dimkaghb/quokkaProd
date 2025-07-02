"""
Document models for global user document library.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class UserDocument(BaseModel):
    """Model for user's document in global library."""
    
    id: str = Field(description="Unique document ID (UUID)")
    user_id: str = Field(description="Owner user ID")
    filename: str = Field(description="Current filename") 
    original_filename: str = Field(description="Original uploaded filename")
    file_type: str = Field(description="File extension (.pdf, .csv, etc)")
    file_size: int = Field(description="File size in bytes")
    file_path: str = Field(description="Relative path to file on disk")
    summary: str = Field(description="Auto-generated description")
    chunks_count: int = Field(default=0, description="Number of chunks in vector DB")
    processed_at: datetime = Field(description="When document was processed")
    tags: List[str] = Field(default_factory=list, description="User tags for organization")
    is_active: bool = Field(default=True, description="Is document active")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


class DocumentUploadRequest(BaseModel):
    """Request model for document upload."""
    
    tags: Optional[List[str]] = Field(default=None, description="Optional tags for the document")


class DocumentUpdateRequest(BaseModel):
    """Request model for updating document metadata."""
    
    tags: Optional[List[str]] = Field(default=None, description="Update document tags")
    summary: Optional[str] = Field(default=None, description="Update document summary")


class DocumentResponse(BaseModel):
    """Response model for document operations."""
    
    success: bool
    document: Optional[UserDocument] = None
    message: str
    
    
class DocumentListResponse(BaseModel):
    """Response model for document listing."""
    
    success: bool
    documents: List[UserDocument]
    total_count: int
    message: str 
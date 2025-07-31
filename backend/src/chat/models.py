"""
Chat models for threaded conversations with document selection.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ChatThread(BaseModel):
    """Model for chat thread with selected documents."""
    
    id: str = Field(description="Unique thread ID (UUID)")
    user_id: str = Field(description="Owner user ID")
    title: str = Field(description="Auto-generated thread title")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    message_count: int = Field(default=0, description="Number of messages in thread")
    selected_documents: List[str] = Field(default_factory=list, description="Document IDs selected for this thread")
    is_active: bool = Field(default=True, description="Is thread active")
    
    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    """Model for messages in chat threads."""
    
    id: str = Field(description="Unique message ID (UUID)")
    thread_id: str = Field(description="Parent thread ID")
    user_id: str = Field(description="User ID")
    role: str = Field(description="Message role: 'user' or 'assistant'")
    content: str = Field(description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata (visualizations, used files, etc)")
    
    class Config:
        from_attributes = True


class ThreadDocumentSelection(BaseModel):
    """Model for tracking which documents are selected for each thread."""
    
    thread_id: str = Field(description="Thread ID")
    document_id: str = Field(description="Document ID")
    selected_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


# Request/Response models

class CreateThreadRequest(BaseModel):
    """Request to create a new chat thread."""
    
    first_message: str = Field(description="First message to start the conversation")
    selected_documents: Optional[List[str]] = Field(default=None, description="Document IDs to include in thread")
    language: Optional[str] = Field(default="en", description="User's preferred language (en/ru)")


class UpdateThreadRequest(BaseModel):
    """Request to update thread metadata."""
    
    title: Optional[str] = Field(default=None, description="Update thread title")
    selected_documents: Optional[List[str]] = Field(default=None, description="Update selected documents")


class SendMessageRequest(BaseModel):
    """Request to send a message in a thread."""
    
    message: str = Field(description="Message content")


class MessageCreate(BaseModel):
    """Request to create a message with document selection."""
    
    content: str = Field(description="Message content")
    selected_documents: List[str] = Field(default_factory=list, description="Document IDs selected for this message")


class ThreadResponse(BaseModel):
    """Response for thread operations."""
    
    success: bool
    thread: Optional[ChatThread] = None
    message: str


class ThreadListResponse(BaseModel):
    """Response for listing threads."""
    
    success: bool
    threads: List[ChatThread]
    total_count: int
    message: str


class MessageResponse(BaseModel):
    """Response for message operations."""
    
    success: bool
    user_message: Optional[ChatMessage] = None
    assistant_message: Optional[ChatMessage] = None
    thread_id: str
    message: str


class MessagesListResponse(BaseModel):
    """Response for listing messages in a thread."""
    
    success: bool
    messages: List[ChatMessage]
    thread_id: str
    total_count: int
    message: str


class ThreadContextResponse(BaseModel):
    """Response for thread context (messages + selected documents)."""
    
    success: bool
    thread: Optional[ChatThread] = None
    messages: List[ChatMessage]
    selected_documents: List[Dict[str, Any]]  # Document metadata
    message: str
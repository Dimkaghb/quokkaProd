"""
Pydantic models for data report operations.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ReportStatus(str, Enum):
    """Report generation status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DataReportRequest(BaseModel):
    """Request model for data report generation."""
    preview_file_id: str = Field(..., description="ID of the uploaded preview file")
    data_file_id: str = Field(..., description="ID of the uploaded data file")
    llm_provider: str = Field(..., description="LLM provider (openai, anthropic, ollama)")
    llm_model: Optional[str] = Field(default=None, description="Specific LLM model to use")
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    anthropic_api_key: Optional[str] = Field(default=None, description="Anthropic API key")
    ollama_base_url: Optional[str] = Field(default=None, description="Ollama base URL")
    custom_prompt: Optional[str] = Field(default=None, description="Custom analysis prompt")


class DataReportResponse(BaseModel):
    """Response model for data report generation."""
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Status message")
    report_id: str = Field(..., description="Unique report identifier")
    status: ReportStatus = Field(..., description="Current status of the report")


class ReportListItem(BaseModel):
    """Model for report list items."""
    report_id: str
    preview_file_name: str
    data_file_name: str
    status: ReportStatus
    created_at: datetime
    file_size: Optional[int] = None
    download_url: Optional[str] = None


class ReportListResponse(BaseModel):
    """Response model for listing user reports."""
    reports: List[ReportListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class ReportStatusResponse(BaseModel):
    """Response model for report status check."""
    report_id: str
    status: ReportStatus
    message: str
    progress: Optional[int] = Field(default=None, description="Progress percentage (0-100)")
    created_at: datetime
    completed_at: Optional[datetime] = None
    download_url: Optional[str] = None
    error_details: Optional[str] = None


class FileUploadResponse(BaseModel):
    """Response model for file upload."""
    success: bool = Field(..., description="Whether the upload was successful")
    message: str = Field(..., description="Upload status message")
    file_id: str = Field(..., description="Unique file identifier")
    filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")


class AnalysisConfig(BaseModel):
    """Configuration for analysis parameters."""
    llm_provider: str = Field(default="openai", description="LLM provider (openai, anthropic, ollama)")
    model_name: Optional[str] = Field(default=None, description="Specific model to use")
    temperature: float = Field(default=0.7, description="LLM temperature setting")
    max_tokens: Optional[int] = Field(default=None, description="Maximum tokens for response")
    include_visualizations: bool = Field(default=True, description="Whether to include data visualizations")
    analysis_depth: str = Field(default="comprehensive", description="Analysis depth (basic, comprehensive, detailed)")


class ReportMetadata(BaseModel):
    """Metadata for generated reports."""
    report_id: str
    user_id: str
    preview_file_info: Dict[str, Any]
    data_file_info: Dict[str, Any]
    analysis_config: AnalysisConfig
    generation_stats: Dict[str, Any]
    created_at: datetime
    completed_at: Optional[datetime] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
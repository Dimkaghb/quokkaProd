"""
Graph models for user graph storage and management.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    """Model for a graph node."""
    
    id: str = Field(description="Node ID")
    position: Dict[str, float] = Field(description="Node position {x, y}")
    data: Dict[str, Any] = Field(description="Node data including label")
    style: Optional[Dict[str, Any]] = Field(default=None, description="Node styling")


class GraphEdge(BaseModel):
    """Model for a graph edge."""
    
    id: str = Field(description="Edge ID")
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    style: Optional[Dict[str, Any]] = Field(default=None, description="Edge styling")


class GraphFile(BaseModel):
    """Model for files associated with a graph."""
    
    id: str = Field(description="File ID")
    name: str = Field(description="File name")
    type: str = Field(description="File type")
    size: int = Field(description="File size in bytes")
    uploaded_at: datetime = Field(description="Upload timestamp")


class UserGraph(BaseModel):
    """Model for user's saved graph."""
    
    id: str = Field(description="Unique graph ID (UUID)")
    user_id: str = Field(description="Owner user ID")
    name: str = Field(description="Graph name")
    description: Optional[str] = Field(default="", description="Graph description")
    nodes: List[GraphNode] = Field(description="Graph nodes")
    edges: List[GraphEdge] = Field(description="Graph edges")
    files: List[GraphFile] = Field(description="Associated files")
    thumbnail: Optional[str] = Field(default=None, description="Base64 encoded thumbnail")
    is_public: bool = Field(default=False, description="Is graph publicly visible")
    tags: List[str] = Field(default_factory=list, description="User tags for organization")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


class GraphCreateRequest(BaseModel):
    """Request model for creating a new graph."""
    
    name: str = Field(description="Graph name")
    description: Optional[str] = Field(default="", description="Graph description")
    nodes: List[GraphNode] = Field(description="Graph nodes")
    edges: List[GraphEdge] = Field(description="Graph edges")
    files: List[GraphFile] = Field(description="Associated files")
    thumbnail: Optional[str] = Field(default=None, description="Base64 encoded thumbnail")
    tags: Optional[List[str]] = Field(default_factory=list, description="Graph tags")


class GraphUpdateRequest(BaseModel):
    """Request model for updating an existing graph."""
    
    name: Optional[str] = Field(default=None, description="Graph name")
    description: Optional[str] = Field(default=None, description="Graph description")
    nodes: Optional[List[GraphNode]] = Field(default=None, description="Graph nodes")
    edges: Optional[List[GraphEdge]] = Field(default=None, description="Graph edges")
    files: Optional[List[GraphFile]] = Field(default=None, description="Associated files")
    thumbnail: Optional[str] = Field(default=None, description="Base64 encoded thumbnail")
    tags: Optional[List[str]] = Field(default=None, description="Graph tags")


class GraphResponse(BaseModel):
    """Response model for graph operations."""
    
    success: bool
    graph: Optional[UserGraph] = None
    message: str


class GraphListResponse(BaseModel):
    """Response model for graph listing."""
    
    success: bool
    graphs: List[UserGraph]
    total_count: int
    message: str


class GraphSummary(BaseModel):
    """Summary model for graph listing (without full node/edge data)."""
    
    id: str
    name: str
    description: str
    files_count: int
    nodes_count: int
    edges_count: int
    thumbnail: Optional[str] = None
    tags: List[str]
    created_at: datetime
    updated_at: datetime


class GraphListSummaryResponse(BaseModel):
    """Response model for graph listing with summaries."""
    
    success: bool
    graphs: List[GraphSummary]
    total_count: int
    message: str
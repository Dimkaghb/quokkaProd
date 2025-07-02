"""
Models for persistent thread memory and context storage.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import json


class ThreadMemoryMessage(BaseModel):
    """Serializable representation of LangChain message."""
    
    type: str = Field(description="Message type: 'human', 'ai', 'system'")
    content: str = Field(description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        from_attributes = True


class ThreadMemoryContext(BaseModel):
    """Serializable conversation context for a thread."""
    
    uploaded_files: List[Dict[str, Any]] = Field(default_factory=list)
    current_topic: Optional[str] = None
    last_analysis_type: Optional[str] = None
    user_preferences: Dict[str, Any] = Field(default_factory=dict)
    session_metadata: Dict[str, Any] = Field(default_factory=dict)
    selected_documents: List[str] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


class ThreadMemorySnapshot(BaseModel):
    """Complete memory snapshot for a thread."""
    
    id: str = Field(description="Unique memory snapshot ID")
    thread_id: str = Field(description="Associated thread ID")
    user_id: str = Field(description="Thread owner ID")
    messages: List[ThreadMemoryMessage] = Field(default_factory=list)
    context: ThreadMemoryContext = Field(default_factory=ThreadMemoryContext)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = Field(default=1, description="Memory version for conflict resolution")
    
    class Config:
        from_attributes = True
    
    def to_json(self) -> str:
        """Serialize to JSON string for database storage."""
        return json.dumps(self.model_dump(), default=str)
    
    @classmethod
    def from_json(cls, json_str: str) -> "ThreadMemorySnapshot":
        """Deserialize from JSON string."""
        data = json.loads(json_str)
        # Convert timestamp strings back to datetime objects
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
        
        # Convert message timestamps
        for msg in data.get('messages', []):
            if 'timestamp' in msg and isinstance(msg['timestamp'], str):
                msg['timestamp'] = datetime.fromisoformat(msg['timestamp'].replace('Z', '+00:00'))
        
        return cls(**data)


class ThreadAgentConfig(BaseModel):
    """Configuration for thread-specific agent."""
    
    thread_id: str
    user_id: str
    selected_documents: List[str] = Field(default_factory=list)
    llm_model: str = Field(default="gpt-4o-mini")
    temperature: float = Field(default=0.3)
    max_memory_window: int = Field(default=20)
    data_directory: str = Field(description="Thread-specific data directory")
    
    class Config:
        from_attributes = True 
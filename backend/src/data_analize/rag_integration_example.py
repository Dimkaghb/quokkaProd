"""
RAG System Integration Example
This file demonstrates how to integrate the RAG system into your FastAPI application.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from src.data_analize.rag_system import RAGSystem

# Initialize FastAPI app
app = FastAPI()

# Initialize RAG system (you might want to do this as a singleton or dependency)
rag_system = RAGSystem()

# Pydantic models for API requests/responses
class QueryRequest(BaseModel):
    question: str
    use_memory: bool = True

class QueryResponse(BaseModel):
    answer: str
    sources: List[str]
    conversation_id: Optional[str] = None

class MemoryResponse(BaseModel):
    total_messages: int
    memory_buffer_size: int
    has_conversation: bool

class UpdateKnowledgeRequest(BaseModel):
    file_path: str

class UpdateKnowledgeResponse(BaseModel):
    success: bool
    chunks_added: Optional[int] = None
    error: Optional[str] = None

# API Endpoints
@app.post("/rag/query", response_model=QueryResponse)
async def query_rag_system(request: QueryRequest):
    """Query the RAG system with a question"""
    try:
        result = rag_system.query(request.question)
        return QueryResponse(
            answer=result["answer"],
            sources=result["sources"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@app.get("/rag/memory", response_model=MemoryResponse)
async def get_memory_status():
    """Get current memory status"""
    try:
        summary = rag_system.get_memory_summary()
        if "error" in summary:
            raise HTTPException(status_code=500, detail=summary["error"])
        return MemoryResponse(**summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Memory status failed: {str(e)}")

@app.post("/rag/memory/clear")
async def clear_memory():
    """Clear conversation memory"""
    try:
        rag_system.clear_memory()
        return {"message": "Memory cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clear memory failed: {str(e)}")

@app.get("/rag/conversation/history")
async def get_conversation_history():
    """Get conversation history"""
    try:
        history = rag_system.get_conversation_history()
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get history failed: {str(e)}")

@app.post("/rag/knowledge/update", response_model=UpdateKnowledgeResponse)
async def update_knowledge_base(request: UpdateKnowledgeRequest):
    """Update knowledge base with new file"""
    try:
        result = rag_system.update_knowledge_base(request.file_path)
        return UpdateKnowledgeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Knowledge update failed: {str(e)}")

@app.get("/rag/knowledge/search")
async def search_knowledge_base(query: str, k: int = 3):
    """Search knowledge base"""
    try:
        results = rag_system.search_knowledge_base(query, k)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Knowledge search failed: {str(e)}")

# Health check
@app.get("/rag/health")
async def health_check():
    """Health check for RAG system"""
    return {"status": "healthy", "message": "RAG system is operational"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
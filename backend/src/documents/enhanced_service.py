"""
Enhanced document service with streaming processing and Chroma integration.
"""

import logging
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any

from .service import process_uploaded_file_stream, get_user_document_library
from .models import UserDocument
from .crud import update_document

logger = logging.getLogger(__name__)


class DocumentProcessingService:
    """Enhanced document processing with RAG integration."""
    
    def __init__(self):
        self.rag_system = None
        self._initialize_rag()
    
    def _initialize_rag(self):
        """Initialize RAG system lazily."""
        try:
            from src.data_analize.enhanced_rag_system import get_rag_system
            self.rag_system = get_rag_system("document_library")
            logger.info("Enhanced RAG system initialized for document processing")
        except Exception as e:
            logger.warning(f"RAG system not available: {e}")
            self.rag_system = None
    
    async def process_document_with_rag(
        self,
        user_id: str,
        file_path: str,
        original_filename: str,
        file_type: str,
        file_size: int,
        tags: Optional[List[str]] = None
    ) -> UserDocument:
        """
        Process document with enhanced RAG integration.
        
        Args:
            user_id: User ID
            file_path: Path to saved file
            original_filename: Original filename
            file_type: File extension
            file_size: File size in bytes
            tags: Optional tags
            
        Returns:
            Created UserDocument with enhanced processing
        """
        try:
            # First, create the document record using streaming service
            document = await process_uploaded_file_stream(
                user_id=user_id,
                file_path=file_path,
                original_filename=original_filename,
                file_type=file_type,
                file_size=file_size,
                tags=tags
            )
            
            # If RAG system is available, process the document
            if self.rag_system:
                try:
                    # Add document to RAG system in background
                    asyncio.create_task(
                        self._add_to_rag_background(
                            document.id, 
                            file_path, 
                            original_filename,
                            user_id
                        )
                    )
                    logger.info(f"Queued document {document.id} for RAG processing")
                except Exception as e:
                    logger.error(f"Error queuing document for RAG: {e}")
            
            return document
            
        except Exception as e:
            logger.error(f"Error in enhanced document processing: {e}")
            raise
    
    async def _add_to_rag_background(
        self,
        document_id: str,
        file_path: str,
        filename: str,
        user_id: str
    ):
        """Add document to RAG system in background."""
        try:
            if not self.rag_system:
                return
            
            # Prepare metadata
            metadata = {
                "document_id": document_id,
                "user_id": user_id,
                "filename": filename,
                "file_type": Path(file_path).suffix.lower()
            }
            
            # Add to RAG system
            result = await self.rag_system.add_document_async(
                file_path=file_path,
                metadata=metadata,
                chunk_documents=True
            )
            
            if result.get("success"):
                chunks_added = result.get("chunks_added", 0)
                logger.info(f"Added document {document_id} to RAG with {chunks_added} chunks")
                
                # Update document record with chunk count
                try:
                    await update_document(
                        user_id=user_id,
                        document_id=document_id,
                        updates={
                            "chunks_count": chunks_added,
                            "summary": f"Document processed successfully. Added {chunks_added} chunks to knowledge base."
                        }
                    )
                except Exception as e:
                    logger.error(f"Error updating document chunks count: {e}")
            else:
                error_msg = result.get("error", "Unknown error")
                logger.error(f"Failed to add document {document_id} to RAG: {error_msg}")
                
                # Update document with error status
                try:
                    await update_document(
                        user_id=user_id,
                        document_id=document_id,
                        updates={
                            "summary": f"Document uploaded but RAG processing failed: {error_msg}"
                        }
                    )
                except Exception as e:
                    logger.error(f"Error updating document error status: {e}")
                    
        except Exception as e:
            logger.error(f"Error in background RAG processing: {e}")
    
    async def reprocess_documents_for_user(self, user_id: str) -> Dict[str, Any]:
        """
        Reprocess all user documents for RAG.
        
        Args:
            user_id: User ID
            
        Returns:
            Processing results
        """
        try:
            if not self.rag_system:
                return {"success": False, "error": "RAG system not available"}
            
            # Get all user documents
            documents = await get_user_document_library(user_id)
            
            results = {
                "total_documents": len(documents),
                "processed": 0,
                "errors": 0,
                "details": []
            }
            
            for document in documents:
                try:
                    file_path = Path(document.file_path)
                    if not file_path.is_absolute():
                        file_path = Path.cwd() / document.file_path
                    
                    if not file_path.exists():
                        logger.warning(f"File not found for document {document.id}: {file_path}")
                        results["errors"] += 1
                        results["details"].append({
                            "document_id": document.id,
                            "filename": document.original_filename,
                            "status": "error",
                            "error": "File not found"
                        })
                        continue
                    
                    # Add to RAG system
                    metadata = {
                        "document_id": document.id,
                        "user_id": user_id,
                        "filename": document.original_filename,
                        "file_type": document.file_type
                    }
                    
                    result = await self.rag_system.add_document_async(
                        file_path=str(file_path),
                        metadata=metadata,
                        chunk_documents=True
                    )
                    
                    if result.get("success"):
                        chunks_added = result.get("chunks_added", 0)
                        results["processed"] += 1
                        results["details"].append({
                            "document_id": document.id,
                            "filename": document.original_filename,
                            "status": "success",
                            "chunks_added": chunks_added
                        })
                        
                        # Update document record
                        await update_document(
                            user_id=user_id,
                            document_id=document.id,
                            updates={
                                "chunks_count": chunks_added,
                                "summary": f"Document reprocessed successfully. Added {chunks_added} chunks to knowledge base."
                            }
                        )
                    else:
                        error_msg = result.get("error", "Unknown error")
                        results["errors"] += 1
                        results["details"].append({
                            "document_id": document.id,
                            "filename": document.original_filename,
                            "status": "error",
                            "error": error_msg
                        })
                        
                except Exception as e:
                    logger.error(f"Error reprocessing document {document.id}: {e}")
                    results["errors"] += 1
                    results["details"].append({
                        "document_id": document.id,
                        "filename": getattr(document, 'original_filename', 'Unknown'),
                        "status": "error",
                        "error": str(e)
                    })
            
            logger.info(f"Reprocessed {results['processed']}/{results['total_documents']} documents for user {user_id}")
            return {"success": True, "results": results}
            
        except Exception as e:
            logger.error(f"Error in bulk reprocessing: {e}")
            return {"success": False, "error": str(e)}
    
    def get_rag_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics."""
        if not self.rag_system:
            return {"available": False, "error": "RAG system not initialized"}
        
        try:
            stats = self.rag_system.get_collection_stats()
            stats["available"] = True
            return stats
        except Exception as e:
            logger.error(f"Error getting RAG stats: {e}")
            return {"available": False, "error": str(e)}
    
    async def search_documents(
        self,
        user_id: str,
        query: str,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Search user documents using RAG system.
        
        Args:
            user_id: User ID
            query: Search query
            limit: Maximum number of results
            
        Returns:
            Search results
        """
        try:
            if not self.rag_system:
                return {"success": False, "error": "RAG system not available"}
            
            # Query the RAG system
            result = self.rag_system.query(query)
            
            if result.get("error"):
                return {"success": False, "error": result["error"]}
            
            # Filter sources by user ID (if metadata contains user_id)
            sources = result.get("sources", [])
            user_sources = []
            
            for source in sources:
                # This would need to be enhanced to properly filter by user
                # For now, include all sources
                user_sources.append(source)
            
            return {
                "success": True,
                "answer": result.get("answer"),
                "sources": user_sources[:limit],
                "document_count": result.get("document_count", 0)
            }
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return {"success": False, "error": str(e)}


# Global service instance
_processing_service = None

def get_document_processing_service() -> DocumentProcessingService:
    """Get global document processing service instance."""
    global _processing_service
    if _processing_service is None:
        _processing_service = DocumentProcessingService()
    return _processing_service
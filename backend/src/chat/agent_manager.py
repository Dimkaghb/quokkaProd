"""
Agent Manager for QuokkaAI - Simplified version using visualization.py directly
"""

import asyncio
import logging
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.memory import ConversationBufferWindowMemory

from src.data_analize.visualization import process_user_request
from src.documents.service import get_documents_for_thread
from .memory_models import ThreadAgentConfig, ThreadMemorySnapshot, ThreadMemoryMessage
from .memory_crud import add_message_to_memory, load_thread_memory, update_thread_context
from .quick_prompts import generate_quick_prompts

logger = logging.getLogger(__name__)

class ThreadAgentError(Exception):
    """Custom exception for thread agent errors."""
    pass

class ThreadAgentManager:
    """
    Simple manager for thread-specific visualization data.
    Stores current chart data and handles visualization requests.
    """
    
    def __init__(self):
        # Store current data and charts for each thread
        self._thread_data: Dict[str, List[Dict]] = {}  # thread_id -> current_data
        self._thread_charts: Dict[str, Dict[str, Any]] = {}  # thread_id -> current_chart
        self._last_access: Dict[str, datetime] = {}
        
        logger.info("ThreadAgentManager initialized")
    
    def _update_access_time(self, thread_id: str) -> None:
        """Update last access time for thread"""
        self._last_access[thread_id] = datetime.utcnow()
    
    async def process_message(
        self,
        thread_id: str,
        user_id: str,
        message: str,
        selected_documents: List[str]
    ) -> Dict[str, Any]:
        """
        Process a message using visualization.py directly.
        """
        try:
            self._update_access_time(thread_id)
            
            # Get actual file paths for selected documents
            file_paths = []
            logger.info(f"Processing message with {len(selected_documents)} selected documents")
            
            if selected_documents:
                documents = await get_documents_for_thread(user_id, selected_documents)
                logger.info(f"Retrieved {len(documents)} documents from database")
                
                for doc in documents:
                    logger.debug(f"Processing document: {doc.original_filename}, file_path: {doc.file_path}")
                    if doc.file_path:
                        # Resolve absolute path
                        file_path = Path(doc.file_path)
                        if not file_path.is_absolute():
                            file_path = Path.cwd() / doc.file_path
                        
                        if file_path.exists():
                            file_paths.append(str(file_path))
                            logger.info(f"Added file path for processing: {doc.original_filename} -> {file_path}")
                        else:
                            logger.error(f"File not found for document {doc.id}: {file_path}")
                    else:
                        logger.error(f"No file path for document {doc.id}")
            
            # Get current thread data and chart
            current_data = self._thread_data.get(thread_id)
            current_chart = self._thread_charts.get(thread_id)
            
            # Process through visualization.py
            logger.info(f"Calling process_user_request with {len(file_paths)} file paths")
            result = process_user_request(
                file_paths=file_paths,
                user_message=message,
                current_data=current_data,
                current_chart=current_chart
            )
            
            # Store updated data and chart for this thread
            if result.get('current_data'):
                self._thread_data[thread_id] = result['current_data']
            if result.get('visualization'):
                self._thread_charts[thread_id] = result['visualization']
            
            # Ensure the result has the correct format for frontend
            if not result.get('timestamp'):
                result['timestamp'] = datetime.utcnow().isoformat()
            if not result.get('confidence'):
                result['confidence'] = 0.8
            if not result.get('sources'):
                result['sources'] = []
            
            # Generate quick prompts based on the response
            try:
                quick_prompts = generate_quick_prompts(
                    ai_response=result.get('answer', ''),
                    response_type=result.get('type', 'general'),
                    visualization=result.get('visualization'),
                    current_data=current_data,
                    user_message=message
                )
                result['quick_prompts'] = quick_prompts
                logger.info(f"Generated {len(quick_prompts)} quick prompts for thread {thread_id}")
            except Exception as e:
                logger.error(f"Error generating quick prompts: {e}")
                result['quick_prompts'] = []
            
            logger.info(f"Message processed for thread: {thread_id}, result type: {result.get('type')}, has_visualization: {'visualization' in result}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            raise ThreadAgentError(f"Failed to process message: {e}")
    
    async def get_thread_stats(self, thread_id: str) -> Dict[str, Any]:
        """Get statistics for a thread"""
        return {
            "thread_id": thread_id,
            "has_data": thread_id in self._thread_data,
            "has_chart": thread_id in self._thread_charts,
            "last_access": self._last_access.get(thread_id),
            "data_records": len(self._thread_data.get(thread_id, [])),
            "chart_type": self._thread_charts.get(thread_id, {}).get('chartType', 'None')
        }
    
    async def cleanup_thread(self, thread_id: str) -> None:
        """Clean up thread data"""
        self._thread_data.pop(thread_id, None)
        self._thread_charts.pop(thread_id, None)
        self._last_access.pop(thread_id, None)
        logger.debug(f"Thread cleaned up: {thread_id}")
    
    async def get_all_stats(self) -> Dict[str, Any]:
        """Get overall statistics"""
        return {
            "total_threads": len(self._last_access),
            "threads_with_data": len(self._thread_data),
            "threads_with_charts": len(self._thread_charts),
            "active_threads": [
                thread_id for thread_id, last_access in self._last_access.items()
                if (datetime.utcnow() - last_access).total_seconds() < 3600  # 1 hour
            ]
        }

# Global instance
_thread_agent_manager: Optional[ThreadAgentManager] = None

def get_thread_agent_manager() -> ThreadAgentManager:
    """Get or create the global thread agent manager instance."""
    global _thread_agent_manager
    if _thread_agent_manager is None:
        _thread_agent_manager = ThreadAgentManager()
    return _thread_agent_manager
"""
Thread Agent Manager - Enterprise-grade agent orchestration per thread.
Manages isolated RootAgent instances with persistent memory and document context.
"""

import asyncio
import logging
from typing import Dict, Optional, List, Any
from datetime import datetime, timedelta
from pathlib import Path
from contextlib import asynccontextmanager
import shutil
import tempfile

from langchain_openai import ChatOpenAI
from langchain.memory.chat_memory import BaseChatMemory
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.memory import ConversationBufferWindowMemory

from src.data_analize.root_agent import RootAgent, RootAgentSettings, ConversationContext
from src.documents.service import get_documents_for_thread
from .memory_models import ThreadAgentConfig, ThreadMemorySnapshot, ThreadMemoryMessage
from .memory_crud import (
    load_thread_memory, save_thread_memory, add_message_to_memory,
    update_thread_context, ThreadMemoryError
)

logger = logging.getLogger(__name__)


class ThreadAgentError(Exception):
    """Custom exception for thread agent operations."""
    pass


class ThreadAgentManager:
    """
    Enterprise-grade manager for thread-specific agents.
    
    Features:
    - Isolated agents per thread with document context
    - Persistent memory restoration from database
    - Automatic cleanup of inactive agents
    - Thread-specific Chroma vector stores
    - Robust error handling and logging
    """
    
    def __init__(self):
        self._agents: Dict[str, RootAgent] = {}
        self._agent_configs: Dict[str, ThreadAgentConfig] = {}
        self._last_access: Dict[str, datetime] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        self._max_inactive_minutes = 60  # Cleanup agents after 1 hour
        self._max_concurrent_agents = 50  # Prevent memory issues
        
        # Start cleanup task
        self._start_cleanup_task()
        
        logger.info("ThreadAgentManager initialized")
    
    def _start_cleanup_task(self) -> None:
        """Start background task for cleaning up inactive agents."""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_inactive_agents())
    
    async def _cleanup_inactive_agents(self) -> None:
        """Background task to cleanup inactive agents."""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                
                cutoff_time = datetime.utcnow() - timedelta(minutes=self._max_inactive_minutes)
                inactive_threads = [
                    thread_id for thread_id, last_access in self._last_access.items()
                    if last_access < cutoff_time
                ]
                
                for thread_id in inactive_threads:
                    await self._cleanup_thread_agent(thread_id)
                    
                logger.debug(f"Cleaned up {len(inactive_threads)} inactive agents")
                
            except Exception as e:
                logger.error(f"Error in agent cleanup task: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def get_thread_agent(
        self,
        thread_id: str,
        user_id: str,
        selected_documents: List[str],
        force_reload: bool = False
    ) -> RootAgent:
        """
        Get or create a thread-specific agent with proper context.
        
        Args:
            thread_id: Thread identifier
            user_id: User identifier
            selected_documents: List of document IDs for this thread
            force_reload: Force recreation of agent
            
        Returns:
            Configured RootAgent for the thread
            
        Raises:
            ThreadAgentError: If agent creation/loading fails
        """
        try:
            # Check if we need to limit concurrent agents
            if len(self._agents) >= self._max_concurrent_agents and thread_id not in self._agents:
                await self._cleanup_oldest_agent()
            
            # Return existing agent if available and no reload needed
            if thread_id in self._agents and not force_reload:
                self._last_access[thread_id] = datetime.utcnow()
                logger.debug(f"Returning existing agent for thread: {thread_id}")
                return self._agents[thread_id]
            
            # Clean up existing agent if force reload
            if force_reload and thread_id in self._agents:
                await self._cleanup_thread_agent(thread_id)
            
            # Create new agent
            agent = await self._create_thread_agent(thread_id, user_id, selected_documents)
            
            # Store agent and update access time
            self._agents[thread_id] = agent
            self._last_access[thread_id] = datetime.utcnow()
            
            logger.info(f"Thread agent created/loaded for thread: {thread_id}")
            return agent
            
        except Exception as e:
            logger.error(f"Error getting thread agent: {e}")
            raise ThreadAgentError(f"Failed to get thread agent: {e}")
    
    async def _create_thread_agent(
        self,
        thread_id: str,
        user_id: str,
        selected_documents: List[str]
    ) -> RootAgent:
        """
        Create a new thread-specific agent with proper configuration.
        
        Args:
            thread_id: Thread identifier
            user_id: User identifier
            selected_documents: Document IDs for thread context
            
        Returns:
            Configured RootAgent
        """
        try:
            # Create thread-specific data directory
            thread_data_dir = Path(f"data/threads/user_{user_id}/thread_{thread_id}")
            thread_data_dir.mkdir(parents=True, exist_ok=True)
            
            # Create agent configuration
            config = ThreadAgentConfig(
                thread_id=thread_id,
                user_id=user_id,
                selected_documents=selected_documents,
                data_directory=str(thread_data_dir)
            )
            
            # Store configuration
            self._agent_configs[thread_id] = config
            
            # Setup thread-specific document context
            await self._setup_thread_documents(config, selected_documents)
            
            # Create agent settings with thread-specific configuration
            agent_settings = RootAgentSettings(
                data_directory=config.data_directory,
                llm_model=config.llm_model,
                temperature=config.temperature,
                max_memory_window=config.max_memory_window
            )
            
            # Create agent
            agent = RootAgent(agent_settings)
            
            # Setup thread-specific file context for agent
            await self._setup_agent_file_context(agent, config, selected_documents)
            
            # Restore persistent memory
            await self._restore_agent_memory(agent, thread_id, user_id)
            
            logger.info(f"Thread agent created with {len(selected_documents)} documents")
            return agent
            
        except Exception as e:
            logger.error(f"Error creating thread agent: {e}")
            raise ThreadAgentError(f"Failed to create thread agent: {e}")
    
    async def _setup_thread_documents(
        self,
        config: ThreadAgentConfig,
        selected_documents: List[str]
    ) -> None:
        """
        Setup document context for thread by copying selected documents.
        
        Args:
            config: Thread agent configuration
            selected_documents: List of document IDs to include
        """
        try:
            if not selected_documents:
                logger.debug(f"No documents selected for thread: {config.thread_id}")
                return
            
            # Get document metadata
            documents = await get_documents_for_thread(config.user_id, selected_documents)
            
            if not documents:
                logger.warning(f"No accessible documents found for thread: {config.thread_id}")
                return
            
            # Create symlinks to documents in thread directory
            thread_docs_dir = Path(config.data_directory) / "documents"
            thread_docs_dir.mkdir(exist_ok=True)
            
            for doc in documents:
                source_path = Path(doc.file_path)
                if source_path.exists():
                    target_path = thread_docs_dir / doc.original_filename
                    
                    # Remove existing symlink/file
                    if target_path.exists():
                        target_path.unlink()
                    
                    # Create symlink (or copy on Windows)
                    try:
                        target_path.symlink_to(source_path.absolute())
                    except OSError:
                        # Fallback to copying on systems that don't support symlinks
                        shutil.copy2(source_path, target_path)
                    
                    logger.debug(f"Document linked: {doc.original_filename}")
            
            logger.info(f"Setup {len(documents)} documents for thread: {config.thread_id}")
            
        except Exception as e:
            logger.error(f"Error setting up thread documents: {e}")
            # Don't raise - thread can work without documents

    async def _setup_agent_file_context(
        self,
        agent: RootAgent,
        config: ThreadAgentConfig,
        selected_documents: List[str]
    ) -> None:
        """
        Setup file context in the agent's conversation context.
        
        Args:
            agent: RootAgent to setup
            config: Thread configuration
            selected_documents: List of document IDs
        """
        try:
            if not selected_documents:
                logger.debug(f"No documents to setup for agent context: {config.thread_id}")
                return
            
            # Get document metadata
            documents = await get_documents_for_thread(config.user_id, selected_documents)
            
            if not documents:
                logger.warning(f"No accessible documents found for agent context: {config.thread_id}")
                return
            
            # Setup agent file context
            for doc in documents:
                file_info = {
                    "filename": doc.original_filename,
                    "file_type": doc.file_type,
                    "size": str(doc.file_size),
                    "processed_at": doc.processed_at.isoformat() if doc.processed_at else datetime.utcnow().isoformat(),
                    "chunks_count": doc.chunks_count,
                    "summary": doc.summary,
                    "tags": doc.tags
                }
                
                # Add file to agent context
                agent.add_uploaded_file(doc.original_filename, file_info)
            
            # Update agent context with thread info
            agent.context.session_metadata.update({
                "thread_id": config.thread_id,
                "user_id": config.user_id,
                "selected_documents": selected_documents,
                "thread_data_directory": config.data_directory
            })
            
            logger.info(f"Setup agent file context with {len(documents)} documents for thread: {config.thread_id}")
            
        except Exception as e:
            logger.error(f"Error setting up agent file context: {e}")
            # Don't raise - agent can work without file context
    
    async def _restore_agent_memory(
        self,
        agent: RootAgent,
        thread_id: str,
        user_id: str
    ) -> None:
        """
        Restore agent memory from persistent storage.
        
        Args:
            agent: RootAgent to restore memory for
            thread_id: Thread identifier
            user_id: User identifier
        """
        try:
            # Load persistent memory
            memory_snapshot = await load_thread_memory(thread_id, user_id)
            
            if not memory_snapshot:
                logger.debug(f"No persistent memory found for thread: {thread_id}")
                return
            
            # Convert stored messages to LangChain messages
            langchain_messages = []
            for stored_msg in memory_snapshot.messages:
                if stored_msg.type == "human":
                    langchain_messages.append(HumanMessage(content=stored_msg.content))
                elif stored_msg.type == "ai":
                    langchain_messages.append(AIMessage(content=stored_msg.content))
                elif stored_msg.type == "system":
                    langchain_messages.append(SystemMessage(content=stored_msg.content))
            
            # Restore memory in agent
            if langchain_messages:
                # Clear default memory and add restored messages
                agent.memory.clear()
                for msg in langchain_messages:
                    agent.memory.chat_memory.add_message(msg)
            
            # Restore context
            if memory_snapshot.context:
                agent.context.uploaded_files = memory_snapshot.context.uploaded_files
                agent.context.current_topic = memory_snapshot.context.current_topic
                agent.context.last_analysis_type = memory_snapshot.context.last_analysis_type
                agent.context.user_preferences = memory_snapshot.context.user_preferences
                agent.context.session_metadata = memory_snapshot.context.session_metadata
            
            logger.info(f"Restored {len(langchain_messages)} messages for thread: {thread_id}")
            
        except Exception as e:
            logger.error(f"Error restoring agent memory: {e}")
            # Don't raise - agent can work without restored memory
    
    async def save_agent_memory(
        self,
        thread_id: str,
        user_id: str,
        agent: Optional[RootAgent] = None
    ) -> None:
        """
        Save agent memory to persistent storage.
        
        Args:
            thread_id: Thread identifier
            user_id: User identifier
            agent: RootAgent to save (optional, will get from cache)
        """
        try:
            if not agent:
                agent = self._agents.get(thread_id)
                if not agent:
                    logger.warning(f"No agent found to save memory for thread: {thread_id}")
                    return
            
            # Convert LangChain messages to storable format
            stored_messages = []
            for msg in agent.memory.chat_memory.messages:
                msg_type = "system"
                if isinstance(msg, HumanMessage):
                    msg_type = "human"
                elif isinstance(msg, AIMessage):
                    msg_type = "ai"
                
                stored_messages.append(ThreadMemoryMessage(
                    type=msg_type,
                    content=msg.content,
                    timestamp=datetime.utcnow(),
                    metadata={}
                ))
            
            # Save to persistent storage
            await add_message_to_memory(
                thread_id=thread_id,
                user_id=user_id,
                message_type="system",
                content="[Memory checkpoint]",
                metadata={"stored_messages": len(stored_messages)}
            )
            
            # Update context
            context_updates = {
                "uploaded_files": agent.context.uploaded_files,
                "current_topic": agent.context.current_topic,
                "last_analysis_type": agent.context.last_analysis_type,
                "user_preferences": agent.context.user_preferences,
                "session_metadata": agent.context.session_metadata
            }
            
            await update_thread_context(thread_id, user_id, context_updates)
            
            logger.debug(f"Agent memory saved for thread: {thread_id}")
            
        except Exception as e:
            logger.error(f"Error saving agent memory: {e}")
            raise ThreadAgentError(f"Failed to save agent memory: {e}")
    
    async def process_message(
        self,
        thread_id: str,
        user_id: str,
        message: str,
        selected_documents: List[str]
    ) -> Dict[str, Any]:
        """
        Process a message through the thread-specific agent.
        
        Args:
            thread_id: Thread identifier
            user_id: User identifier
            message: User message content
            selected_documents: Current selected documents
            
        Returns:
            Agent response
        """
        try:
            # Get thread agent
            agent = await self.get_thread_agent(thread_id, user_id, selected_documents)
            
            # Process message through agent (agent handles memory internally)
            result = await agent.process_message(message, session_id=thread_id)
            
            logger.info(f"Message processed for thread: {thread_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            raise ThreadAgentError(f"Failed to process message: {e}")
    
    async def _cleanup_thread_agent(self, thread_id: str) -> None:
        """
        Clean up resources for a specific thread agent.
        
        Args:
            thread_id: Thread to cleanup
        """
        try:
            # Save memory before cleanup
            if thread_id in self._agents:
                config = self._agent_configs.get(thread_id)
                if config:
                    await self.save_agent_memory(thread_id, config.user_id)
            
            # Remove from caches
            self._agents.pop(thread_id, None)
            self._agent_configs.pop(thread_id, None)
            self._last_access.pop(thread_id, None)
            
            logger.debug(f"Thread agent cleaned up: {thread_id}")
            
        except Exception as e:
            logger.error(f"Error cleaning up thread agent: {e}")
    
    async def _cleanup_oldest_agent(self) -> None:
        """Clean up the oldest accessed agent to free resources."""
        if not self._last_access:
            return
        
        oldest_thread = min(self._last_access.items(), key=lambda x: x[1])[0]
        await self._cleanup_thread_agent(oldest_thread)
        logger.debug(f"Cleaned up oldest agent: {oldest_thread}")
    
    async def update_thread_documents(
        self,
        thread_id: str,
        user_id: str,
        selected_documents: List[str]
    ) -> None:
        """
        Update selected documents for a thread and reload agent.
        
        Args:
            thread_id: Thread identifier
            user_id: User identifier
            selected_documents: New list of selected documents
        """
        try:
            # Force reload of agent with new documents
            await self.get_thread_agent(
                thread_id=thread_id,
                user_id=user_id,
                selected_documents=selected_documents,
                force_reload=True
            )
            
            logger.info(f"Thread documents updated: {thread_id}")
            
        except Exception as e:
            logger.error(f"Error updating thread documents: {e}")
            raise ThreadAgentError(f"Failed to update thread documents: {e}")
    
    async def cleanup_user_agents(self, user_id: str) -> None:
        """
        Clean up all agents for a specific user.
        
        Args:
            user_id: User identifier
        """
        try:
            user_threads = [
                thread_id for thread_id, config in self._agent_configs.items()
                if config.user_id == user_id
            ]
            
            for thread_id in user_threads:
                await self._cleanup_thread_agent(thread_id)
            
            logger.info(f"Cleaned up {len(user_threads)} agents for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Error cleaning up user agents: {e}")
    
    async def get_agent_stats(self) -> Dict[str, Any]:
        """Get statistics about active agents."""
        return {
            "active_agents": len(self._agents),
            "total_configs": len(self._agent_configs),
            "cleanup_task_running": self._cleanup_task and not self._cleanup_task.done(),
            "max_concurrent_agents": self._max_concurrent_agents,
            "max_inactive_minutes": self._max_inactive_minutes
        }
    
    async def shutdown(self) -> None:
        """Graceful shutdown of the agent manager."""
        try:
            # Cancel cleanup task
            if self._cleanup_task:
                self._cleanup_task.cancel()
            
            # Save all agent memories
            for thread_id, config in self._agent_configs.items():
                await self.save_agent_memory(thread_id, config.user_id)
            
            # Clear all caches
            self._agents.clear()
            self._agent_configs.clear()
            self._last_access.clear()
            
            logger.info("ThreadAgentManager shutdown completed")
            
        except Exception as e:
            logger.error(f"Error during agent manager shutdown: {e}")


# Global instance
_thread_agent_manager: Optional[ThreadAgentManager] = None


def get_thread_agent_manager() -> ThreadAgentManager:
    """Get the global thread agent manager instance."""
    global _thread_agent_manager
    if _thread_agent_manager is None:
        _thread_agent_manager = ThreadAgentManager()
    return _thread_agent_manager
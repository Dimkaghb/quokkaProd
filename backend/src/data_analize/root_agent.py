"""
Root Agent for QuokkaAI - Dynamic AI-powered data analysis.

This agent works like FormulaBot:
1. AI reads actual file content (not just metadata)
2. AI extracts specific data from files
3. AI generates Python code dynamically for visualizations
4. Everything is AI-generated, no templates
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.tools import Tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Import our dynamic agent
from .dynamic_agent import DynamicAIAgent, DynamicAgentSettings, AnalysisResponse

logger = logging.getLogger(__name__)


class RootAgentSettings(BaseSettings):
    """Settings for the root agent."""
    
    openai_api_key: str = Field(alias="OPENAI_API_KEY", description="OpenAI API key")
    data_directory: str = Field(default="data/rag", description="Directory for uploaded files")
    llm_model: str = Field(default="gpt-4o-mini", description="OpenAI model to use")
    temperature: float = Field(default=0.1, description="LLM temperature")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


class RootAgent:
    """
    Root agent that orchestrates the dynamic AI agent.
    
    This is a simplified version that focuses on:
    1. Understanding user intent
    2. Delegating to the dynamic agent
    3. Maintaining conversation context
    """
    
    def __init__(self, settings: Optional[RootAgentSettings] = None):
        """Initialize the root agent."""
        self.settings = settings or RootAgentSettings()
        
        # Initialize the dynamic agent
        dynamic_settings = DynamicAgentSettings(
            openai_api_key=self.settings.openai_api_key,
            data_directory=self.settings.data_directory,
            llm_model=self.settings.llm_model,
            temperature=self.settings.temperature
        )
        self.dynamic_agent = DynamicAIAgent(dynamic_settings)
        
        # Initialize LLM for conversation management
        self.llm = ChatOpenAI(
            model=self.settings.llm_model,
            api_key=self.settings.openai_api_key,
            temperature=self.settings.temperature
        )
        
        # Conversation memory
        self.conversation_history: List[Dict[str, str]] = []
        
        logger.info("RootAgent initialized with dynamic AI capabilities")
    
    async def process_message(self, message: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a user message using the dynamic AI agent.
        
        This is the main entry point for all user interactions.
        """
        try:
            logger.info(f"Processing message: {message}")
            
            # Add to conversation history
            self.conversation_history.append({"role": "user", "content": message})
            
            # Check if this is a file-related query
            if await self._is_file_query(message):
                # Use the dynamic agent for file analysis
                response = await self.dynamic_agent.process_query(message)
                
                # Format the response
                formatted_response = self._format_dynamic_response(response)
                
                # Add to conversation history
                self.conversation_history.append({"role": "assistant", "content": formatted_response["answer"]})
                
                return formatted_response
            else:
                # Handle non-file queries (general conversation)
                response = await self._handle_general_query(message)
                
                # Add to conversation history
                self.conversation_history.append({"role": "assistant", "content": response["answer"]})
                
                return response
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return {
                "answer": f"I encountered an error: {str(e)}. Please try again.",
                "error": str(e),
                "type": "error"
            }
    
    async def _is_file_query(self, message: str) -> bool:
        """Determine if the query is about files/data."""
        # Check for file-related keywords
        file_keywords = [
            "file", "data", "analyze", "chart", "graph", "plot", "visualiz",
            "table", "csv", "excel", "pdf", "document", "upload", "show",
            "what", "extract", "find", "calculate", "trend", "pattern"
        ]
        
        message_lower = message.lower()
        
        # Quick keyword check
        if any(keyword in message_lower for keyword in file_keywords):
            return True
        
        # Check if we have files uploaded
        data_dir = Path(self.settings.data_directory)
        if data_dir.exists() and any(data_dir.iterdir()):
            # If files exist and query seems analytical, assume it's file-related
            analytical_keywords = ["what", "how", "why", "when", "where", "show", "tell", "explain"]
            if any(keyword in message_lower for keyword in analytical_keywords):
                return True
        
        return False
    
    async def _handle_general_query(self, message: str) -> Dict[str, Any]:
        """Handle non-file queries."""
        # Build conversation context
        context = self._build_conversation_context()
        
        prompt = f"""
        You are QuokkaAI, an intelligent data analysis assistant.
        
        Previous conversation:
        {context}
        
        User: {message}
        
        Respond helpfully. If they're asking about your capabilities, explain that you can:
        1. Analyze uploaded files (PDF, CSV, Excel)
        2. Extract specific data from documents
        3. Create visualizations and charts
        4. Answer questions about data
        
        If they haven't uploaded files yet, encourage them to do so.
        """
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        return {
            "answer": response.content,
            "type": "general",
            "sources": []
        }
    
    def _format_dynamic_response(self, response: AnalysisResponse) -> Dict[str, Any]:
        """Format the dynamic agent response for the API."""
        result = {
            "answer": response.answer,
            "type": "analysis",
            "confidence": response.confidence,
            "sources": response.sources
        }
        
        if response.code_generated:
            result["code"] = response.code_generated
        
        if response.visualization_path:
            # Check if it's a PNG path or JSON data
            if response.visualization_path.endswith('.png'):
                # Convert file path to URL
                path = Path(response.visualization_path)
                if path.exists():
                    # Extract just the filename
                    filename = path.name
                    # Create URL for the static file
                    visualization_url = f"/visualizations/{filename}"
                    
                    # Add base64 encoded image for direct display in chat
                    import base64
                    try:
                        with open(path, "rb") as img_file:
                            img_data = base64.b64encode(img_file.read()).decode('utf-8')
                            
                        result["visualization"] = {
                            "url": visualization_url,
                            "path": response.visualization_path,
                            "type": "image",
                            "format": "png",
                            "base64": f"data:image/png;base64,{img_data}"
                        }
                    except Exception as e:
                        logger.error(f"Error encoding image: {e}")
                        result["visualization"] = {
                            "url": visualization_url,
                            "path": response.visualization_path,
                            "type": "image",
                            "format": "png"
                        }
                else:
                    result["visualization"] = {
                        "path": response.visualization_path,
                        "type": "image",
                        "format": "png",
                        "error": "File not found"
                    }
            else:
                result["visualization"] = {
                    "path": response.visualization_path,
                    "type": "generated"
                }
        
        if response.data_extracted:
            result["data"] = response.data_extracted
        
        return result
    
    def _build_conversation_context(self, max_messages: int = 5) -> str:
        """Build conversation context from history."""
        if not self.conversation_history:
            return "No previous conversation."
        
        # Get last N messages
        recent_history = self.conversation_history[-max_messages:]
        
        context = ""
        for msg in recent_history:
            role = msg["role"].capitalize()
            content = msg["content"][:200] + "..." if len(msg["content"]) > 200 else msg["content"]
            context += f"{role}: {content}\n"
        
        return context
    
    async def get_uploaded_files(self) -> List[Dict[str, str]]:
        """Get list of uploaded files."""
        data_dir = Path(self.settings.data_directory)
        
        if not data_dir.exists():
            return []
        
        files = []
        for file_path in data_dir.iterdir():
            if file_path.is_file():
                files.append({
                    "filename": file_path.name,
                    "file_type": file_path.suffix.lower(),
                    "size": file_path.stat().st_size,
                    "processed_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                    "chunks_count": 0,  # Default value
                    "summary": f"File: {file_path.name}"
                })
        
        return files
    
    def add_uploaded_file(self, filename: str, metadata: Dict[str, Any]) -> None:
        """Add uploaded file to conversation memory."""
        # For now, this is a no-op since we read files directly from disk
        # In a full implementation, this would update conversation context
        logger.info(f"File {filename} added to conversation memory: {metadata}")
        pass
    
    async def clear_conversation(self, session_id: Optional[str] = None) -> bool:
        """Clear conversation history."""
        self.conversation_history = []
        logger.info(f"Cleared conversation history for session: {session_id}")
        return True


def create_root_agent(settings: Optional[RootAgentSettings] = None) -> RootAgent:
    """Create a root agent instance."""
    return RootAgent(settings)


# For backward compatibility with the API
async def analyze_with_agent(query: str, settings: Optional[RootAgentSettings] = None) -> Dict[str, Any]:
    """Analyze query using the root agent."""
    agent = create_root_agent(settings)
    return await agent.process_message(query)

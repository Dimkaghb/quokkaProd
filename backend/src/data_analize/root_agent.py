"""
Root Agent for QuokkaAI - Intelligent multi-agent orchestrator.

This agent serves as the central orchestrator for QuokkaAI's multi-agent system:
- Maintains conversation context and memory
- Uses AI to intelligently route queries to appropriate sub-agents
- Handles file uploads and processing coordination
- Provides unified response formatting and user experience
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.tools import Tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferWindowMemory

# Import sub-agents
from .agents.rag_agent import create_rag_tool, RAGSettings
from .agents.web_search_agent import create_web_search_tool, WebSearchSettings
from .agents.visualization_agent import create_visualization_tool, VisualizationSettings

logger = logging.getLogger(__name__)


class RootAgentSettings(BaseSettings):
    """Settings for the root agent."""
    
    openai_api_key: str = Field(alias="OPENAI_API_KEY", description="OpenAI API key")
    data_directory: str = Field(default="data/rag", description="Directory for uploaded files")
    llm_model: str = Field(default="gpt-4o-mini", description="OpenAI model to use")
    temperature: float = Field(default=0.3, description="LLM temperature for reasoning")
    max_memory_window: int = Field(default=10, description="Number of conversation turns to remember")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


class ConversationContext(BaseModel):
    """Tracks conversation context and state."""
    
    uploaded_files: List[Dict[str, str]] = []
    current_topic: Optional[str] = None
    last_analysis_type: Optional[str] = None
    user_preferences: Dict[str, Any] = {}
    session_metadata: Dict[str, Any] = {}


class RootAgent:
    """
    Intelligent root agent that orchestrates QuokkaAI's multi-agent system.
    
    Key capabilities:
    - AI-driven tool selection based on user queries
    - Conversation memory and context management
    - File upload coordination and processing
    - Response synthesis and formatting
    - Error handling and graceful degradation
    """
    
    def __init__(self, settings: Optional[RootAgentSettings] = None):
        """Initialize the root agent with sub-agents and conversation memory."""
        self.settings = settings or RootAgentSettings()
        
        # Initialize LLM with proper temperature for reasoning
        self.llm = ChatOpenAI(
            model=self.settings.llm_model,
            api_key=self.settings.openai_api_key,
            temperature=self.settings.temperature
        )
        
        # Initialize conversation memory
        self.memory = ConversationBufferWindowMemory(
            k=self.settings.max_memory_window,
            return_messages=True,
            memory_key="chat_history"
        )
        
        # Initialize conversation context
        self.context = ConversationContext()
        
        # Initialize sub-agents as tools
        self.tools = self._initialize_tools()
        
        # Initialize the agent executor
        self.agent_executor = self._create_agent_executor()
        
        logger.info("RootAgent initialized with intelligent multi-agent orchestration")
    
    def _initialize_tools(self) -> List[Tool]:
        """Initialize all sub-agent tools with proper configuration."""
        tools = []
        
        try:
            # RAG Agent for document analysis with thread-specific settings
            rag_settings = RAGSettings(
                openai_api_key=self.settings.openai_api_key,
                data_directory=self.settings.data_directory,
                chroma_directory=f"{self.settings.data_directory}/chroma"
            )
            tools.append(create_rag_tool(rag_settings))
            
            # Web Search Agent for external information
            web_settings = WebSearchSettings(
                openai_api_key=self.settings.openai_api_key
            )
            tools.append(create_web_search_tool(web_settings))
            
            # Visualization Agent for data charts
            viz_settings = VisualizationSettings(
                openai_api_key=self.settings.openai_api_key,
                data_directory=self.settings.data_directory
            )
            tools.append(create_visualization_tool(viz_settings))
            
        except Exception as e:
            logger.error(f"Error initializing tools: {e}")
            # Continue with available tools
        
        logger.info(f"Initialized {len(tools)} sub-agent tools")
        return tools
    
    def _create_agent_executor(self) -> AgentExecutor:
        """Create the LangChain agent executor with intelligent routing."""
        
        # Define the system prompt for intelligent routing
        system_prompt = """You are QuokkaAI, an intelligent data analysis assistant. You coordinate multiple specialized agents to help users analyze data, create visualizations, and find information.

Your capabilities through sub-agents:
- **DocumentAnalysis**: Analyze uploaded files (PDFs, CSVs, Excel, JSON, etc.), extract insights, perform statistical analysis
- **DataVisualization**: Create interactive charts and visualizations from data files
- **WebSearch**: Search the internet for current information, statistics, and facts

ROUTING INTELLIGENCE:
- Use DocumentAnalysis for: questions about uploaded files, data analysis, statistical insights, document content
- Use DataVisualization for: requests to create charts, graphs, visualizations, plots
- Use WebSearch for: current events, recent data, external facts, web information

CONVERSATION PRINCIPLES:
- Maintain context across messages
- Remember user preferences and previous analyses
- Provide clear, actionable insights
- Ask clarifying questions when needed
- Be conversational and helpful

When users upload files, automatically analyze them to understand the content and suggest relevant analyses or visualizations.

FILE CONTEXT MANAGEMENT:
- Always check available files before answering questions
- Reference specific files when providing analysis
- Inform users about document availability and status
- Suggest appropriate analysis based on file types available"""

        # Create the prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Create the agent
        agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt
        )
        
        # Create and return the executor
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            memory=self.memory,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=3
        )
    
    async def process_message(self, message: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process user message using intelligent agent orchestration.
        
        Args:
            message: User's message/query
            session_id: Optional session identifier for context
            
        Returns:
            Formatted response with analysis results
        """
        try:
            logger.info(f"Processing message: {message[:100]}...")
            
            # Update conversation context
            await self._update_context(message, session_id)
            
            # Check for uploaded files and provide context
            file_context = await self._get_file_context()
            enhanced_message = self._enhance_message_with_context(message, file_context)
            
            # Execute the agent
            response = await self.agent_executor.ainvoke({
                "input": enhanced_message
            })
            
            # Format and return the response
            return self._format_response(response)
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return {
                "answer": f"I encountered an error processing your request: {str(e)}. Please try rephrasing your question or check if your files are properly uploaded.",
                "error": str(e),
                "type": "error",
                "confidence": 0.0
            }
    
    async def _update_context(self, message: str, session_id: Optional[str]) -> None:
        """Update conversation context with new information."""
        
        # Update session metadata
        if session_id:
            self.context.session_metadata["session_id"] = session_id
            self.context.session_metadata["last_activity"] = datetime.now().isoformat()
        
        # Detect topic changes or preferences
        message_lower = message.lower()
        
        # Update current topic based on keywords
        if any(word in message_lower for word in ["chart", "graph", "plot", "visualiz"]):
            self.context.current_topic = "visualization"
            self.context.last_analysis_type = "visualization"
        elif any(word in message_lower for word in ["search", "find", "recent", "current"]):
            self.context.current_topic = "web_search"
            self.context.last_analysis_type = "web_search"
        elif any(word in message_lower for word in ["analyze", "data", "document", "file"]):
            self.context.current_topic = "analysis"
            self.context.last_analysis_type = "document_analysis"
        
        # Update user preferences
        if "prefer" in message_lower or "like" in message_lower:
            # Extract preferences (simple implementation)
            self.context.user_preferences["last_preference"] = message
    
    async def _get_file_context(self) -> str:
        """Get context about uploaded files."""
        # First check if we have files in agent context (from thread setup)
        if self.context.uploaded_files:
            context = f"Available files ({len(self.context.uploaded_files)} total):\n"
            for file_info in self.context.uploaded_files:
                filename = file_info.get("filename", "unknown")
                file_type = file_info.get("file_type", "")
                size_mb = round(int(file_info.get("size", "0")) / 1024 / 1024, 2)
                summary = file_info.get("summary", "No summary available")
                
                context += f"- {filename} ({file_type}, {size_mb}MB)\n"
                context += f"  Summary: {summary[:100]}...\n"
            
            return context
        
        # Fallback: check documents subdirectory for thread-based agents
        data_dir = Path(self.settings.data_directory)
        docs_dir = data_dir / "documents"
        
        # Try documents subdirectory first (for thread agents)
        check_dirs = [docs_dir, data_dir] if docs_dir.exists() else [data_dir]
        
        files = []
        for check_dir in check_dirs:
            if check_dir.exists():
                for file_path in check_dir.iterdir():
                    if file_path.is_file():
                        files.append({
                            "filename": file_path.name,
                            "type": file_path.suffix.lower(),
                            "size_mb": round(file_path.stat().st_size / 1024 / 1024, 2)
                        })
                if files:  # Found files in this directory
                    break
        
        if not files:
            return "No files have been uploaded yet."
        
        context = f"Available files ({len(files)} total):\n"
        for file in files:
            context += f"- {file['filename']} ({file['type']}, {file['size_mb']}MB)\n"
        
        return context
    
    def _enhance_message_with_context(self, message: str, file_context: str) -> str:
        """Enhance user message with relevant context."""
        
        enhanced = message
        
        # Add file context if relevant
        if file_context != "No files have been uploaded yet.":
            enhanced += f"\n\nContext: {file_context}"
        
        # Add conversation context
        if self.context.current_topic:
            enhanced += f"\nCurrent topic focus: {self.context.current_topic}"
        
        if self.context.last_analysis_type:
            enhanced += f"\nPrevious analysis type: {self.context.last_analysis_type}"
        
        return enhanced
    
    def _format_response(self, agent_response: Dict[str, Any]) -> Dict[str, Any]:
        """Format agent response for the API."""
        
        output = agent_response.get("output", "")
        
        # Extract visualization data if present
        visualization = None
        if "Chart Data:" in output:
            # Extract chart data (simple implementation)
            parts = output.split("Chart Data:")
            if len(parts) > 1:
                chart_data = parts[1].strip()
                visualization = {
                    "type": "plotly",
                    "data": chart_data
                }
        
        # Determine response type based on content
        response_type = "general"
        if any(word in output.lower() for word in ["chart", "visualization", "graph"]):
            response_type = "visualization"
        elif any(word in output.lower() for word in ["analysis", "insights", "statistics"]):
            response_type = "analysis"
        elif any(word in output.lower() for word in ["search results", "found", "according to"]):
            response_type = "web_search"
        
        result = {
            "answer": output,
            "type": response_type,
            "confidence": 0.85,  # Default confidence
            "sources": [],
            "timestamp": datetime.now().isoformat()
        }
        
        if visualization:
            result["visualization"] = visualization
        
        return result
    
    async def get_uploaded_files(self) -> List[Dict[str, str]]:
        """Get list of uploaded files with metadata."""
        data_dir = Path(self.settings.data_directory)
        
        if not data_dir.exists():
            return []
        
        files = []
        for file_path in data_dir.iterdir():
            if file_path.is_file():
                files.append({
                    "filename": file_path.name,
                    "file_type": file_path.suffix.lower(),
                    "size": str(file_path.stat().st_size),
                    "processed_at": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                    "chunks_count": 0,  # Placeholder
                    "summary": f"File: {file_path.name}"
                })
        
        # Update context
        self.context.uploaded_files = files
        
        return files
    
    def add_uploaded_file(self, filename: str, metadata: Dict[str, Any]) -> None:
        """Add uploaded file to conversation context."""
        
        file_info = {
            "filename": filename,
            "uploaded_at": datetime.now().isoformat(),
            **metadata
        }
        
        # Add to context
        self.context.uploaded_files.append(file_info)
        
        logger.info(f"Added file to conversation context: {filename}")
    
    async def clear_conversation(self, session_id: Optional[str] = None) -> bool:
        """Clear conversation history and context."""
        
        try:
            # Clear memory
            self.memory.clear()
            
            # Reset context
            self.context = ConversationContext()
            
            logger.info(f"Cleared conversation for session: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error clearing conversation: {e}")
            return False
    
    async def get_conversation_summary(self) -> Dict[str, Any]:
        """Get summary of current conversation state."""
        
        return {
            "uploaded_files": len(self.context.uploaded_files),
            "current_topic": self.context.current_topic,
            "last_analysis_type": self.context.last_analysis_type,
            "memory_length": len(self.memory.chat_memory.messages),
            "session_metadata": self.context.session_metadata
        }


def create_root_agent(settings: Optional[RootAgentSettings] = None) -> RootAgent:
    """Create a root agent instance."""
    return RootAgent(settings)


# For backward compatibility with the API
async def analyze_with_agent(query: str, settings: Optional[RootAgentSettings] = None) -> Dict[str, Any]:
    """Analyze query using the root agent."""
    agent = create_root_agent(settings)
    return await agent.process_message(query)

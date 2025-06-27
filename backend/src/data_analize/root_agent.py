"""
Root Agent for QuokkaAI - orchestrates user queries and routes to appropriate specialized agents.

This module implements the main orchestration agent that analyzes user queries and determines
which specialized tools/agents to use (web search, RAG, visualization, etc.).
Enhanced with conversation memory and Context7 MCP integration.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from dataclasses import dataclass
import json
import uuid
from datetime import datetime

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.tools import Tool
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationSummaryBufferMemory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough

from .agents.web_search_agent import create_web_search_tool, WebSearchSettings
from .agents.rag_agent import create_rag_tool, RAGSettings, create_rag_agent

logger = logging.getLogger(__name__)


class QueryType(Enum):
    """Types of queries the root agent can handle."""
    WEB_SEARCH = "web_search"
    RAG_DOCUMENT = "rag_document"
    DATA_VISUALIZATION = "data_visualization"
    GENERAL_CONVERSATION = "general_conversation"
    MULTI_STEP = "multi_step"


class RootAgentSettings(BaseSettings):
    """Settings for the root agent."""
    
    openai_api_key: str = Field(alias="OPENAI_API_KEY", description="OpenAI API key")
    llm_model: str = Field(default="gpt-4o-mini", description="OpenAI model to use")
    temperature: float = Field(default=0.2, description="LLM temperature for balanced creativity")
    max_tokens: int = Field(default=3000, description="Maximum tokens for responses")
    
    # Web search settings
    serper_api_key: Optional[str] = Field(default=None, alias="SERPER_API_KEY", description="Serper API key")
    google_api_key: Optional[str] = Field(default=None, alias="GOOGLE_API_KEY", description="Google Custom Search API key")
    google_cx: Optional[str] = Field(default=None, alias="GOOGLE_CSE_ID", description="Google Custom Search Engine ID")
    
    # RAG settings
    data_directory: str = Field(default="data/rag", description="Directory for uploaded files")
    chroma_directory: str = Field(default="data/chroma", description="Chroma database directory")
    
    # Agent behavior settings
    verbose: bool = Field(default=True, description="Enable verbose logging")
    max_iterations: int = Field(default=15, description="Maximum agent iterations")
    memory_max_token_limit: int = Field(default=2000, description="Maximum tokens for conversation memory")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"  # Allow extra fields from environment
    }


@dataclass
class QueryAnalysis:
    """Analysis result for user query."""
    query_type: QueryType
    confidence: float
    reasoning: str
    suggested_tools: List[str]
    extracted_entities: Dict[str, Any]
    requires_data_context: bool = False


class ConversationMemory:
    """Enhanced conversation memory with data context awareness."""
    
    def __init__(self, llm: ChatOpenAI, max_token_limit: int = 2000):
        self.llm = llm
        self.max_token_limit = max_token_limit
        self.memory = ConversationSummaryBufferMemory(
            llm=llm,
            max_token_limit=max_token_limit,
            memory_key="chat_history",
            return_messages=True
        )
        self.uploaded_files: Dict[str, Dict[str, Any]] = {}
        self.data_context: Dict[str, Any] = {}
        
    def add_uploaded_file(self, filename: str, metadata: Dict[str, Any]) -> None:
        """Add information about an uploaded file."""
        self.uploaded_files[filename] = {
            **metadata,
            "uploaded_at": datetime.utcnow().isoformat()
        }
        logger.info(f"Added file to memory: {filename}")
        
    def update_data_context(self, context: Dict[str, Any]) -> None:
        """Update the current data analysis context."""
        self.data_context.update(context)
        
    def get_data_context_summary(self) -> str:
        """Get a summary of available data and context."""
        if not self.uploaded_files:
            return "No data files have been uploaded yet."
            
        summary = "📊 **Available Data Context:**\n"
        for filename, metadata in self.uploaded_files.items():
            summary += f"• **{filename}** ({metadata.get('file_type', 'unknown')}): {metadata.get('summary', 'No summary available')}\n"
            
        if self.data_context:
            summary += f"\n🔍 **Recent Analysis Context:** {json.dumps(self.data_context, indent=2)[:200]}..."
            
        return summary
        
    def add_interaction(self, human_message: str, ai_message: str) -> None:
        """Add a human-AI interaction to memory."""
        self.memory.save_context(
            {"input": human_message},
            {"output": ai_message}
        )
        
    def get_conversation_history(self) -> List[BaseMessage]:
        """Get the conversation history."""
        return self.memory.chat_memory.messages
        
    def clear(self) -> None:
        """Clear conversation memory but keep data context."""
        self.memory.clear()
        # Keep uploaded files info but clear analysis context
        self.data_context.clear()


class EnhancedRootAgent:
    """
    Enhanced root agent for QuokkaAI with conversation memory and intelligent routing.
    
    Features:
    - Conversation memory with data context awareness
    - Intelligent query routing to appropriate tools
    - Context7 MCP integration for enhanced documentation
    - Multi-turn conversation support
    - Data-aware responses similar to Julius.AI
    """
    
    def __init__(self, settings: Optional[RootAgentSettings] = None):
        """
        Initialize the enhanced root agent.
        
        Args:
            settings: Configuration settings for the agent
        """
        self.settings = settings or RootAgentSettings()
        self.llm = self._initialize_llm()
        self.conversation_memory = ConversationMemory(
            self.llm, 
            self.settings.memory_max_token_limit
        )
        self.rag_agent = self._initialize_rag_agent()
        self.tools = self._initialize_tools()
        self.agent_executor = self._create_agent_executor()
        
        logger.info("EnhancedRootAgent initialized successfully")

    def _initialize_llm(self) -> ChatOpenAI:
        """Initialize the main LLM for the root agent."""
        return ChatOpenAI(
            model=self.settings.llm_model,
            api_key=self.settings.openai_api_key,
            temperature=self.settings.temperature,
            max_tokens=self.settings.max_tokens
        )

    def _initialize_rag_agent(self):
        """Initialize the RAG agent for document analysis."""
        try:
            rag_settings = RAGSettings(
                openai_api_key=self.settings.openai_api_key,
                data_directory=self.settings.data_directory,
                chroma_directory=self.settings.chroma_directory
            )
            return create_rag_agent(rag_settings)
        except Exception as e:
            logger.error(f"Failed to initialize RAG agent: {e}")
            return None

    def _initialize_tools(self) -> List[Tool]:
        """Initialize all available tools for the agent."""
        tools = []
        
        # Enhanced RAG Document Analysis Tool
        if self.rag_agent:
            tools.append(self._create_enhanced_rag_tool())
            logger.info("Enhanced RAG document analysis tool initialized")
        
        # Web Search Tool
        try:
            web_search_settings = WebSearchSettings(
                serper_api_key=self.settings.serper_api_key,
                google_api_key=self.settings.google_api_key,
                google_cx=self.settings.google_cx,
                openai_api_key=self.settings.openai_api_key
            )
            web_search_tool = create_web_search_tool(web_search_settings)
            tools.append(web_search_tool)
            logger.info("Web search tool initialized")
        except Exception as e:
            logger.warning(f"Web search tool initialization failed: {e}")

        # Data Context Tool
        tools.append(self._create_data_context_tool())
        
        # Query Analysis Tool
        tools.append(self._create_enhanced_query_analysis_tool())
        
        logger.info(f"Initialized {len(tools)} tools")
        return tools

    def _create_enhanced_rag_tool(self) -> Tool:
        """Create an enhanced RAG tool that's aware of conversation context."""
        
        async def analyze_with_context(query: str) -> str:
            """Analyze documents with full conversation context."""
            try:
                # Get data context summary
                data_context = self.conversation_memory.get_data_context_summary()
                
                # Enhanced query with context
                enhanced_query = f"""
                Data Context: {data_context}
                
                User Query: {query}
                
                Please provide a detailed analysis of the uploaded data related to this query. 
                If the query relates to previously uploaded files, analyze them thoroughly.
                Include specific insights, patterns, and actionable recommendations.
                """
                
                # Use RAG agent for analysis
                result = await self.rag_agent.analyze_data(enhanced_query)
                
                # Update conversation memory with analysis context
                self.conversation_memory.update_data_context({
                    "last_query": query,
                    "analysis_type": "document_analysis",
                    "insights_count": len(result.insights),
                    "recommendations_count": len(result.recommendations)
                })
                
                # Format comprehensive response
                response = f"""## 📊 Document Analysis Results

**Summary:** {result.summary}

### 🔍 Key Insights:
{chr(10).join(f"• {insight}" for insight in result.insights[:5])}

### 💡 Recommendations:
{chr(10).join(f"• {rec}" for rec in result.recommendations[:5])}

### 📈 Statistical Analysis:
{json.dumps(result.statistical_analysis, indent=2)[:800]}...

**Confidence Score:** {result.confidence_score:.2f}
**Visualizations Generated:** {len(result.visualizations)}
"""
                
                return response
                
            except Exception as e:
                logger.error(f"Enhanced RAG tool error: {e}")
                return f"I encountered an error analyzing your data: {str(e)}. Please ensure you have uploaded relevant data files."
        
        return Tool(
            name="DocumentAnalysis",
            description=(
                "Analyze uploaded documents and datasets with conversation context awareness. "
                "Use this tool when users ask questions about their uploaded data, want statistical analysis, "
                "need insights from documents, or request data-driven recommendations. "
                "This tool maintains context from previous conversations and provides detailed analysis "
                "similar to a professional data analyst."
            ),
            func=lambda query: asyncio.run(analyze_with_context(query))
        )

    def _create_data_context_tool(self) -> Tool:
        """Create a tool for managing data context and file information."""
        
        def get_data_context(query: str = "") -> str:
            """Get information about uploaded files and data context."""
            context_summary = self.conversation_memory.get_data_context_summary()
            
            if not self.conversation_memory.uploaded_files:
                return """I don't see any uploaded data files yet. To get started with data analysis:

1. **Upload your data files** (CSV, Excel, PDF, etc.)
2. **Ask specific questions** about your data
3. **Request analysis** like "analyze the trends in my data" or "what insights can you find?"

I'm designed to work like a professional data analyst - once you upload data, I can provide detailed insights, statistical analysis, and actionable recommendations!"""
            
            files_info = "## 📁 Your Uploaded Files:\n"
            for filename, metadata in self.conversation_memory.uploaded_files.items():
                files_info += f"• **{filename}** - {metadata.get('summary', 'Ready for analysis')}\n"
                
            files_info += f"\n{context_summary}\n\n"
            files_info += "💬 **Ask me anything about your data!** For example:\n"
            files_info += "• 'What are the main trends in my data?'\n"
            files_info += "• 'Can you find any correlations?'\n"
            files_info += "• 'What insights do you see?'\n"
            files_info += "• 'Create a summary of the key findings'\n"
            
            return files_info
        
        return Tool(
            name="DataContext",
            description=(
                "Get information about uploaded files and current data analysis context. "
                "Use this when users ask about what data is available, want to see uploaded files, "
                "or need context about previous analysis."
            ),
            func=get_data_context
        )

    def _create_enhanced_query_analysis_tool(self) -> Tool:
        """Create an enhanced query analysis tool."""
        
        def analyze_query_with_context(query: str) -> str:
            """Analyze user query with conversation and data context."""
            try:
                analysis = self._analyze_user_query_enhanced(query)
                
                return json.dumps({
                    "query_type": analysis.query_type.value,
                    "confidence": analysis.confidence,
                    "reasoning": analysis.reasoning,
                    "suggested_tools": analysis.suggested_tools,
                    "requires_data_context": analysis.requires_data_context,
                    "entities": analysis.extracted_entities,
                    "has_uploaded_data": len(self.conversation_memory.uploaded_files) > 0
                }, indent=2)
            except Exception as e:
                logger.error(f"Enhanced query analysis failed: {e}")
                return f"Analysis failed: {str(e)}"

        return Tool(
            name="QueryAnalysis",
            description=(
                "Analyze user queries with conversation context to determine intent and required tools. "
                "Use this to understand what the user is asking for and how to best help them."
            ),
            func=analyze_query_with_context
        )

    def _analyze_user_query_enhanced(self, query: str) -> QueryAnalysis:
        """Enhanced query analysis with data context awareness and better tool routing."""
        
        # Check if user has uploaded data
        has_data = len(self.conversation_memory.uploaded_files) > 0
        
        # Enhanced indicators for different query types
        data_analysis_indicators = [
            "analyze", "analysis", "insights", "trends", "patterns", "correlation", 
            "summary", "findings", "statistics", "what does", "show me", "explain",
            "breakdown", "distribution", "relationship", "compare", "comparison",
            "prediction", "forecast", "model", "clustering", "regression",
            "visualization", "chart", "graph", "plot", "my data", "uploaded", 
            "file", "document", "dataset", "data", "numbers", "values"
        ]
        
        web_search_indicators = [
            "latest", "current", "recent", "news", "what's happening", "today", 
            "now", "update", "search", "find information", "google", "look up", 
            "research", "facts", "statistics about", "market data", "industry trends",
            "real-time", "live", "breaking", "new", "fresh", "up-to-date"
        ]
        
        context_request_indicators = [
            "what files", "uploaded files", "available data", "what data", 
            "files do i have", "show files", "list files", "my files",
            "what can you analyze", "what's available"
        ]
        
        query_lower = query.lower()
        
        # Calculate scores with better weighting
        data_analysis_score = sum(2 if indicator in query_lower else 0 for indicator in data_analysis_indicators)
        web_search_score = sum(1 for indicator in web_search_indicators if indicator in query_lower)
        context_request_score = sum(3 for indicator in context_request_indicators if indicator in query_lower)
        
        # Boost data analysis score significantly if user has uploaded data
        if has_data:
            data_analysis_score += 5
            
        # Boost context request score if asking about files/data
        if any(word in query_lower for word in ["files", "data", "uploaded", "available"]):
            context_request_score += 2
        
        # Determine primary query type with better logic
        if context_request_score > 0:
            primary_type = QueryType.RAG_DOCUMENT  # Use DataContext tool
            confidence = 0.95
            suggested_tools = ["DataContext"]
            requires_data_context = True
            reasoning = f"User is asking about available files/data (context score: {context_request_score})"
            
        elif data_analysis_score > web_search_score and has_data:
            primary_type = QueryType.RAG_DOCUMENT
            confidence = min(0.95, 0.7 + (data_analysis_score * 0.05))
            suggested_tools = ["DocumentAnalysis"]
            requires_data_context = True
            reasoning = f"Data analysis query with uploaded data (analysis score: {data_analysis_score}, has data: True)"
            
        elif web_search_score > 0 and (not has_data or web_search_score > data_analysis_score):
            primary_type = QueryType.WEB_SEARCH
            confidence = min(0.9, 0.6 + (web_search_score * 0.1))
            suggested_tools = ["WebSearch"]
            requires_data_context = False
            reasoning = f"Web search query (search score: {web_search_score}, has data: {has_data})"
            
        elif has_data and data_analysis_score > 0:
            primary_type = QueryType.RAG_DOCUMENT
            confidence = 0.85
            suggested_tools = ["DocumentAnalysis"]
            requires_data_context = True
            reasoning = f"Data-related query with available data (analysis score: {data_analysis_score})"
            
        elif has_data:
            # User has data but query is ambiguous - default to showing context
            primary_type = QueryType.RAG_DOCUMENT
            confidence = 0.7
            suggested_tools = ["DataContext"]
            requires_data_context = True
            reasoning = f"Ambiguous query with available data - showing context"
            
        else:
            # No data, general conversation
            primary_type = QueryType.GENERAL_CONVERSATION
            confidence = 0.8
            suggested_tools = ["DataContext"]  # Show what they can do
            requires_data_context = False
            reasoning = f"General conversation without uploaded data"
        
        # Extract entities with enhanced context awareness
        entities = self._extract_enhanced_entities(query)
        
        return QueryAnalysis(
            query_type=primary_type,
            confidence=confidence,
            reasoning=reasoning,
            suggested_tools=suggested_tools,
            extracted_entities=entities,
            requires_data_context=requires_data_context
        )

    def _extract_enhanced_entities(self, query: str) -> Dict[str, Any]:
        """Extract entities with data context awareness."""
        import re
        
        entities = {}
        
        # Extract file references
        file_refs = []
        for filename in self.conversation_memory.uploaded_files.keys():
            if filename.lower() in query.lower():
                file_refs.append(filename)
        if file_refs:
            entities['referenced_files'] = file_refs
            
        # Extract analysis types
        analysis_types = []
        analysis_keywords = {
            'trend': ['trend', 'trending', 'over time'],
            'correlation': ['correlation', 'relationship', 'related'],
            'distribution': ['distribution', 'spread', 'range'],
            'comparison': ['compare', 'versus', 'vs', 'difference'],
            'prediction': ['predict', 'forecast', 'future'],
            'summary': ['summary', 'overview', 'summarize']
        }
        
        query_lower = query.lower()
        for analysis_type, keywords in analysis_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                analysis_types.append(analysis_type)
        
        if analysis_types:
            entities['analysis_types'] = analysis_types
            
        # Extract numbers and dates
        years = re.findall(r'\b(19|20)\d{2}\b', query)
        if years:
            entities['years'] = years
            
        numbers = re.findall(r'\b\d+\.?\d*\b', query)
        if numbers:
            entities['numbers'] = numbers
            
        return entities

    def _create_agent_executor(self) -> AgentExecutor:
        """Create the main agent executor with enhanced prompts and memory."""
        
        # Enhanced system prompt
        system_prompt = ENHANCED_ROOT_AGENT_SYSTEM_PROMPT
        
        # Create the prompt template with memory
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            HumanMessage(content="{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        # Create the agent
        agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt
        )
        
        # Create the executor
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            memory=self.conversation_memory.memory,
            verbose=self.settings.verbose,
            max_iterations=self.settings.max_iterations,
            return_intermediate_steps=True
        )

    async def process_query(self, query: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a user query with enhanced conversation memory and context awareness.
        
        Args:
            query: User's input query
            user_id: Optional user identifier for session management
            
        Returns:
            Dictionary containing response and metadata
        """
        try:
            logger.info(f"Processing enhanced query: {query[:100]}...")
            
            # Execute the agent with conversation memory
            result = await asyncio.get_event_loop().run_in_executor(
                None, 
                self.agent_executor.invoke,
                {"input": query}
            )
            
            # Extract response
            response_text = result.get("output", "I apologize, but I couldn't process your request.")
            
            # Add interaction to memory
            self.conversation_memory.add_interaction(query, response_text)
            
            response = {
                "response": response_text,
                "query": query,
                "user_id": user_id,
                "intermediate_steps": result.get("intermediate_steps", []),
                "status": "success",
                "conversation_context": {
                    "has_uploaded_data": len(self.conversation_memory.uploaded_files) > 0,
                    "uploaded_files": list(self.conversation_memory.uploaded_files.keys()),
                    "data_context": self.conversation_memory.data_context
                }
            }
            
            logger.info("Enhanced query processed successfully")
            return response
            
        except Exception as e:
            logger.error(f"Error processing enhanced query: {e}")
            return {
                "response": f"I encountered an error while processing your request: {str(e)}",
                "query": query,
                "user_id": user_id,
                "status": "error",
                "error": str(e)
            }

    def add_uploaded_file(self, filename: str, metadata: Dict[str, Any]) -> None:
        """Add information about an uploaded file to conversation memory."""
        self.conversation_memory.add_uploaded_file(filename, metadata)
        
        # If RAG agent exists, ensure it has the file context
        if self.rag_agent:
            logger.info(f"File {filename} added to conversation context")

    def get_conversation_history(self) -> List[BaseMessage]:
        """Get the current conversation history."""
        return self.conversation_memory.get_conversation_history()

    def clear_conversation_history(self) -> None:
        """Clear the conversation history but keep data context."""
        self.conversation_memory.clear()
        logger.info("Conversation history cleared")

    async def close(self) -> None:
        """Clean up resources."""
        if self.rag_agent:
            await self.rag_agent.close()
        logger.info("EnhancedRootAgent resources cleaned up")


def create_enhanced_root_agent(settings: Optional[RootAgentSettings] = None) -> EnhancedRootAgent:
    """
    Factory function to create a configured Enhanced RootAgent.
    
    Args:
        settings: Optional configuration settings
        
    Returns:
        Configured EnhancedRootAgent instance
    """
    return EnhancedRootAgent(settings)


# Enhanced system prompt for the root agent
ENHANCED_ROOT_AGENT_SYSTEM_PROMPT = """
You are QuokkaAI, an intelligent data analysis assistant similar to Julius.AI, designed to help users analyze their data through natural conversation.

## Your Core Identity:
You are a professional data analyst who speaks conversationally and maintains context throughout our discussion. You excel at analyzing uploaded documents, datasets, and providing actionable insights.

## Key Capabilities:
1. **Data Analysis Expert**: Analyze CSV, Excel, PDF, and other data files with professional-level insights
2. **Conversation Memory**: Remember previous interactions, uploaded files, and analysis context
3. **Context Awareness**: Always consider what data the user has uploaded and previous analysis
4. **Web Research**: Find current information when needed for context or comparison
5. **Actionable Insights**: Provide specific, actionable recommendations based on data

## Operating Guidelines:

### Query Handling Strategy:
- **For Data Questions**: Always use DocumentAnalysis when users ask about their uploaded data
- **For Context Questions**: Use DataContext to show available files and previous analysis
- **For Current Info**: Use WebSearch for real-time information and market data
- **For Analysis**: Provide detailed, specific insights with statistical backing

### Response Quality Standards:
- **Be Conversational**: Talk like a helpful data analyst colleague
- **Be Specific**: Reference actual data points, trends, and patterns
- **Be Actionable**: Always provide concrete next steps or recommendations
- **Be Contextual**: Build on previous conversations and uploaded data
- **Be Professional**: Maintain expertise while being approachable

### Data Analysis Approach:
1. **Understand Context**: What data does the user have? What have we discussed?
2. **Analyze Thoroughly**: Look for patterns, trends, correlations, outliers
3. **Provide Insights**: Explain what the data means in business/practical terms
4. **Give Recommendations**: Suggest specific actions based on findings
5. **Maintain Memory**: Remember findings for future conversations

### Conversation Flow:
- **Remember Everything**: Previous questions, uploaded files, analysis results
- **Build Context**: Each response should acknowledge and build on previous interactions
- **Stay Focused**: Keep the conversation centered on the user's data and goals
- **Ask Smart Questions**: When needed, ask clarifying questions to provide better analysis

### Error Handling:
- If no data is uploaded, guide users on how to upload and what you can analyze
- If analysis fails, explain what went wrong and suggest alternatives
- Always try to be helpful even when facing limitations

## Response Format:
Structure responses to be conversational yet informative:
1. **Acknowledge Context**: Reference previous conversation or uploaded data
2. **Provide Analysis**: Give detailed insights with specific data points
3. **Explain Significance**: What do these findings mean?
4. **Recommend Actions**: What should the user do with this information?
5. **Invite Follow-up**: Encourage deeper analysis or questions

Remember: You're not just answering questions - you're having an ongoing conversation about the user's data to help them make better decisions. Always maintain context and build on previous interactions like a real data analyst would.
"""

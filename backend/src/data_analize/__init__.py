"""
QuokkaAI Data Analysis Module - Intelligent Multi-Agent System

This module provides a sophisticated multi-agent architecture for data analysis,
file processing, and conversational AI interactions. The system is designed
with clean separation of concerns and professional prompt engineering.

Architecture Overview:
=====================

1. ROOT AGENT (root_agent.py)
   - Central orchestrator for the entire multi-agent system
   - Intelligent routing of user queries to appropriate sub-agents
   - Conversation memory and context management
   - Unified response formatting and error handling
   - AI-driven tool selection using LangChain OpenAI Functions

2. RAG AGENT (agents/rag_agent.py)
   - Document analysis and retrieval-augmented generation
   - Supports all major file formats (PDF, CSV, Excel, JSON, TXT)
   - Statistical analysis and data insights
   - Vector embeddings with Chroma database
   - Professional qualitative and quantitative analysis

3. VISUALIZATION AGENT (agents/visualization_agent.py)
   - Interactive chart creation with Plotly
   - Intelligent chart type recommendation
   - Statistical analysis alongside visualizations
   - Support for 10+ chart types (line, bar, scatter, heatmap, etc.)
   - Professional styling and formatting

4. WEB SEARCH AGENT (agents/web_search_agent.py)
   - Multi-source web search (Serper, Google Custom Search)
   - Fact-driven result prioritization
   - Confidence scoring and source verification
   - Real-time information retrieval
   - Authority-first search strategy

Key Improvements:
================

✅ CLEAN ARCHITECTURE
   - Proper separation of concerns
   - Single responsibility principle
   - Dependency injection pattern
   - Factory functions for agent creation

✅ PROFESSIONAL PROMPTING
   - Generic, reusable system prompts
   - No hard-coded examples or specific use cases
   - Context-aware prompt engineering
   - Clear capability definitions

✅ INTELLIGENT ROUTING
   - AI-driven tool selection instead of keyword matching
   - Conversation context preservation
   - Dynamic message enhancement with relevant context
   - Graceful error handling and fallbacks

✅ CONVERSATION MANAGEMENT
   - Persistent conversation memory
   - Session-based context tracking
   - User preference learning
   - Topic flow management

✅ ROBUST ERROR HANDLING
   - Comprehensive exception management
   - Graceful degradation when services fail
   - Detailed logging and monitoring
   - User-friendly error messages

Usage Example:
==============

```python
from src.data_analize import create_root_agent

# Create agent with default settings
agent = create_root_agent()

# Process user message
result = await agent.process_message(
    message="Analyze my uploaded sales data and create a trend chart",
    session_id="user_123"
)

# Access response
print(result["answer"])
if result.get("visualization"):
    # Handle chart data
    chart_data = result["visualization"]
```

Best Practices:
===============

1. PROMPTING:
   - Use generic, capability-focused system prompts
   - Avoid specific examples or domain-specific language
   - Focus on principles and methodologies
   - Maintain professional, helpful tone

2. AGENT DESIGN:
   - Keep each agent focused on a single domain
   - Use clear interfaces between agents
   - Implement proper error handling
   - Log all significant operations

3. CONVERSATION FLOW:
   - Preserve context across interactions
   - Track user preferences and patterns
   - Provide relevant suggestions
   - Maintain conversational coherence

4. FILE PROCESSING:
   - Support multiple file formats generically
   - Extract maximum value from any data source
   - Provide fallbacks for processing failures
   - Maintain data security and privacy

This architecture enables QuokkaAI to handle any type of data analysis request
while maintaining high code quality, extensibility, and user experience.
"""

__version__ = "2.0.0"
__author__ = "QuokkaAI Team"

# Export main components
from .root_agent import create_root_agent, RootAgent, RootAgentSettings
from .agents.rag_agent import create_rag_agent, create_rag_tool
from .agents.visualization_agent import create_visualization_agent, create_visualization_tool
from .agents.web_search_agent import create_web_search_agent, create_web_search_tool

__all__ = [
    "create_root_agent",
    "RootAgent", 
    "RootAgentSettings",
    "create_rag_agent",
    "create_rag_tool",
    "create_visualization_agent", 
    "create_visualization_tool",
    "create_web_search_agent",
    "create_web_search_tool"
] 
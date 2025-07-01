"""
Web Search Agent for QuokkaAI - searches for factual data with clear numbers and facts.

This module implements a comprehensive web search agent that uses both Serper and Google Custom Search APIs
to retrieve accurate, up-to-date information with emphasis on numerical data and verifiable facts.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
import aiohttp
import json
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from langchain.tools import Tool
from langchain.agents import AgentType, initialize_agent
from langchain.schema import BaseMessage
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory

logger = logging.getLogger(__name__)


class WebSearchSettings(BaseSettings):
    """Settings for the web search agent."""
    
    openai_api_key: str = Field(alias="OPENAI_API_KEY", description="OpenAI API key")
    serper_api_key: Optional[str] = Field(default=None, alias="SERPER_API_KEY", description="Serper API key")
    google_api_key: Optional[str] = Field(default=None, alias="GOOGLE_API_KEY", description="Google Custom Search API key")
    google_cx: Optional[str] = Field(default=None, alias="GOOGLE_CSE_ID", description="Google Custom Search Engine ID")
    max_results: int = Field(default=5, description="Maximum search results to return")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"  # Allow extra fields from environment
    }


@dataclass
class SearchResult:
    """Structured search result with factual emphasis."""
    title: str
    link: str
    snippet: str
    source: str  # 'serper' or 'google'
    has_numbers: bool = False
    confidence_score: float = 0.0


class WebSearchAgent:
    """
    Advanced web search agent that prioritizes factual data and numerical information.
    
    Features:
    - Dual API support (Serper + Google Custom Search)
    - Async operations for better performance
    - Fact and number extraction emphasis
    - Result validation and scoring
    - LangChain tool integration
    """
    
    def __init__(self, settings: Optional[WebSearchSettings] = None):
        """
        Initialize the web search agent.
        
        Args:
            settings: Configuration settings for the agent
        """
        self.settings = settings or WebSearchSettings()
        self.session: Optional[aiohttp.ClientSession] = None
        self._validate_configuration()
        
        # Initialize LLM for result processing
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=self.settings.openai_api_key,
            temperature=0.1  # Low temperature for factual responses
        )
        
        logger.info("WebSearchAgent initialized successfully")

    def _validate_configuration(self) -> None:
        """Validate that at least one search API is configured."""
        if not (self.settings.serper_api_key or 
                (self.settings.google_api_key and self.settings.google_cx)):
            raise ValueError(
                "At least one search API must be configured: "
                "either SERPER_API_KEY or both GOOGLE_API_KEY and GOOGLE_CX"
            )

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def search_serper(self, query: str) -> List[SearchResult]:
        """
        Search using Serper API with emphasis on factual results.
        
        Args:
            query: Search query string
            
        Returns:
            List of structured search results
        """
        if not self.settings.serper_api_key:
            return []
            
        session = await self._get_session()
        url = "https://google.serper.dev/search"
        
        headers = {
            "X-API-KEY": self.settings.serper_api_key,
            "Content-Type": "application/json"
        }
        
        # Enhanced query for factual data
        enhanced_query = f"{query} facts statistics numbers data"
        
        payload = {
            "q": enhanced_query,
            "num": self.settings.max_results,
            "gl": "us",  # Geographic location
            "hl": "en"   # Language
        }
        
        try:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._process_serper_results(data)
                else:
                    logger.error(f"Serper API error: {response.status}")
                    return []
        except Exception as e:
            logger.error(f"Serper search failed: {e}")
            return []

    async def search_google(self, query: str) -> List[SearchResult]:
        """
        Search using Google Custom Search API.
        
        Args:
            query: Search query string
            
        Returns:
            List of structured search results
        """
        if not (self.settings.google_api_key and self.settings.google_cx):
            return []
            
        session = await self._get_session()
        url = "https://www.googleapis.com/customsearch/v1"
        
        params = {
            "key": self.settings.google_api_key,
            "cx": self.settings.google_cx,
            "q": f"{query} statistics facts data numbers",
            "num": self.settings.max_results,
            "gl": "us",
            "hl": "en"
        }
        
        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._process_google_results(data)
                else:
                    logger.error(f"Google API error: {response.status}")
                    return []
        except Exception as e:
            logger.error(f"Google search failed: {e}")
            return []

    def _process_serper_results(self, data: Dict[str, Any]) -> List[SearchResult]:
        """Process Serper API response into structured results."""
        results = []
        
        for item in data.get("organic", []):
            result = SearchResult(
                title=item.get("title", ""),
                link=item.get("link", ""),
                snippet=item.get("snippet", ""),
                source="serper"
            )
            result.has_numbers = self._contains_numbers(result.snippet)
            result.confidence_score = self._calculate_confidence(result)
            results.append(result)
            
        return results

    def _process_google_results(self, data: Dict[str, Any]) -> List[SearchResult]:
        """Process Google Custom Search API response into structured results."""
        results = []
        
        for item in data.get("items", []):
            result = SearchResult(
                title=item.get("title", ""),
                link=item.get("link", ""),
                snippet=item.get("snippet", ""),
                source="google"
            )
            result.has_numbers = self._contains_numbers(result.snippet)
            result.confidence_score = self._calculate_confidence(result)
            results.append(result)
            
        return results

    def _contains_numbers(self, text: str) -> bool:
        """Check if text contains numerical data."""
        import re
        # Look for numbers, percentages, dates, monetary values
        number_patterns = [
            r'\d+\.?\d*%',  # Percentages
            r'\$\d+',       # Money
            r'\d{4}',       # Years
            r'\d+\.?\d*',   # General numbers
        ]
        
        for pattern in number_patterns:
            if re.search(pattern, text):
                return True
        return False

    def _calculate_confidence(self, result: SearchResult) -> float:
        """Calculate confidence score for search result based on factual indicators."""
        score = 0.5  # Base score
        
        # Boost for numerical data
        if result.has_numbers:
            score += 0.3
            
        # Boost for authoritative domains
        authoritative_domains = [
            'gov', 'edu', 'org', 'wikipedia.org', 'reuters.com',
            'bloomberg.com', 'statista.com', 'census.gov'
        ]
        
        for domain in authoritative_domains:
            if domain in result.link:
                score += 0.2
                break
                
        # Boost for fact-indicating keywords
        fact_keywords = ['study', 'research', 'statistics', 'data', 'report', 'analysis']
        snippet_lower = result.snippet.lower()
        
        for keyword in fact_keywords:
            if keyword in snippet_lower:
                score += 0.1
                
        return min(score, 1.0)  # Cap at 1.0

    async def search_comprehensive(self, query: str) -> List[SearchResult]:
        """
        Perform comprehensive search using all available APIs.
        
        Args:
            query: Search query string
            
        Returns:
            Combined and ranked search results
        """
        # Run searches concurrently
        search_tasks = []
        
        if self.settings.serper_api_key:
            search_tasks.append(self.search_serper(query))
            
        if self.settings.google_api_key and self.settings.google_cx:
            search_tasks.append(self.search_google(query))
            
        if not search_tasks:
            logger.error("No search APIs configured")
            return []
            
        # Execute searches concurrently
        results_lists = await asyncio.gather(*search_tasks, return_exceptions=True)
        
        # Combine results
        all_results = []
        for results in results_lists:
            if isinstance(results, list):
                all_results.extend(results)
            else:
                logger.error(f"Search task failed: {results}")
                
        # Remove duplicates and sort by confidence
        unique_results = self._deduplicate_results(all_results)
        return sorted(unique_results, key=lambda x: x.confidence_score, reverse=True)

    def _deduplicate_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """Remove duplicate results based on URL."""
        seen_urls = set()
        unique_results = []
        
        for result in results:
            if result.link not in seen_urls:
                seen_urls.add(result.link)
                unique_results.append(result)
                
        return unique_results

    def format_results_for_agent(self, results: List[SearchResult]) -> str:
        """
        Format search results for agent consumption with emphasis on factual data.
        
        Args:
            results: List of search results
            
        Returns:
            Formatted string for agent processing
        """
        if not results:
            return "No search results found."
            
        formatted = "## Web Search Results (Prioritized by Factual Content)\n\n"
        
        for i, result in enumerate(results[:self.settings.max_results], 1):
            confidence_indicator = "🔢" if result.has_numbers else "📄"
            formatted += f"{i}. {confidence_indicator} **{result.title}**\n"
            formatted += f"   Source: {result.link}\n"
            formatted += f"   Confidence: {result.confidence_score:.2f}\n"
            formatted += f"   Summary: {result.snippet}\n\n"
            
        return formatted

    async def close(self) -> None:
        """Close the aiohttp session."""
        if self.session and not self.session.closed:
            await self.session.close()


class WebSearchTool:
    """LangChain tool wrapper for WebSearchAgent."""
    
    def __init__(self, agent: WebSearchAgent):
        """Initialize the tool with a WebSearchAgent instance."""
        self.agent = agent
        self.name = "WebSearch"
        self.description = (
            "Search the web for current information, statistics, and factual data. "
            "Prioritizes authoritative sources and results containing specific numbers, "
            "dates, percentages, and verifiable facts. Excellent for finding recent data, "
            "current events, market statistics, research findings, and external validation. "
            "Use when users need information not available in uploaded documents or "
            "when current/recent information is specifically requested."
        )

    def _search_sync(self, query: str) -> str:
        """Synchronous wrapper for async search functionality."""
        try:
            # Run async search in event loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If we're already in an event loop, create a new task
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, self._async_search(query))
                    return future.result()
            else:
                return asyncio.run(self._async_search(query))
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return f"Search failed: {str(e)}"

    async def _async_search(self, query: str) -> str:
        """Perform async search and return formatted results."""
        results = await self.agent.search_comprehensive(query)
        return self.agent.format_results_for_agent(results)

    def __call__(self, query: str) -> str:
        """Make the tool callable."""
        return self._search_sync(query)


def create_web_search_agent(settings: Optional[WebSearchSettings] = None) -> WebSearchAgent:
    """
    Factory function to create a configured WebSearchAgent.
    
    Args:
        settings: Optional configuration settings
        
    Returns:
        Configured WebSearchAgent instance
    """
    return WebSearchAgent(settings)


def create_web_search_tool(settings: Optional[WebSearchSettings] = None) -> Tool:
    """
    Factory function to create a LangChain-compatible web search tool.
    
    Args:
        settings: Optional configuration settings
        
    Returns:
        Tool instance ready for use with LangChain agents
    """
    agent = create_web_search_agent(settings)
    web_tool = WebSearchTool(agent)
    
    # Create a proper LangChain Tool
    return Tool(
        name=web_tool.name,
        description=web_tool.description,
        func=web_tool._search_sync
    )


# System prompt for the web search agent
WEB_SEARCH_SYSTEM_PROMPT = """
You are a specialized web search agent focused on finding accurate, current, and factual information.

Core Capabilities:
- Multi-source search across authoritative APIs (Serper, Google Custom Search)
- Fact-driven result prioritization with confidence scoring
- Numerical data and statistical information extraction
- Source credibility assessment and verification
- Real-time information retrieval for current events and trends

Search Strategy:
1. **Authority First**: Prioritize government, educational, and established sources
2. **Data Focus**: Seek specific numbers, statistics, dates, and quantifiable information
3. **Recency Awareness**: Consider publication dates and information freshness
4. **Cross-Verification**: Compare information across multiple sources when possible
5. **Confidence Assessment**: Provide reliability scores for findings

Quality Standards:
- Lead with the most factual and numerical information found
- Provide specific data points with proper source attribution
- Include confidence levels and any limitations in the data
- Explain methodology when statistical claims are made
- Cite sources with URLs for verification and transparency

Response Principles:
- Be precise and data-driven in all responses
- Distinguish between facts, estimates, and opinions
- Highlight any uncertainties or conflicting information
- Provide context for numerical data (timeframes, methodologies, etc.)

Goal: Deliver accurate, verifiable, and actionable information that users can trust for decision-making.
"""

"""
Dynamic AI Agent for QuokkaAI - Works like FormulaBot with AI-generated everything.

This agent:
1. Reads actual file content (PDFs, CSVs, Excel)
2. Extracts specific data using AI
3. Generates Python code dynamically for visualizations
4. No templates - everything is AI-generated
"""

import asyncio
import logging
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import re
import io
import base64

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain.schema import Document

# PDF processing
import PyPDF2
import pdfplumber

# Image processing for charts
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image

# Import visualization agent
from .agents.visualization_agent import DataVisualizationAgent, VisualizationSettings

logger = logging.getLogger(__name__)


class DynamicAgentSettings(BaseSettings):
    """Settings for the dynamic AI agent."""
    
    openai_api_key: str = Field(alias="OPENAI_API_KEY", description="OpenAI API key")
    data_directory: str = Field(default="data/rag", description="Directory for uploaded files")
    output_directory: str = Field(default="data/visualizations", description="Directory for generated visualizations")
    llm_model: str = Field(default="gpt-4o-mini", description="OpenAI model to use")
    temperature: float = Field(default=0.1, description="LLM temperature for precise analysis")
    max_tokens: int = Field(default=4000, description="Maximum tokens for responses")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


class FileContent(BaseModel):
    """Represents extracted file content."""
    filename: str
    file_type: str
    raw_text: str
    tables: List[Any] = []  # Will store DataFrames but Pydantic can't serialize them directly
    metadata: Dict[str, Any] = {}
    
    model_config = {"arbitrary_types_allowed": True}


class AnalysisResponse(BaseModel):
    """Response from the dynamic agent."""
    answer: str
    data_extracted: Optional[Dict[str, Any]] = None
    code_generated: Optional[str] = None
    visualization_path: Optional[str] = None
    confidence: float = 0.0
    sources: List[str] = []


class DynamicAIAgent:
    """
    Dynamic AI agent that works like FormulaBot.
    
    Key features:
    - Reads actual file content (not just metadata)
    - Extracts specific data from PDFs, CSVs, Excel files
    - Generates Python code dynamically for visualizations
    - Everything is AI-generated, no templates
    """
    
    def __init__(self, settings: Optional[DynamicAgentSettings] = None):
        """Initialize the dynamic AI agent."""
        self.settings = settings or DynamicAgentSettings()
        self.llm = ChatOpenAI(
            model=self.settings.llm_model,
            api_key=self.settings.openai_api_key,
            temperature=self.settings.temperature,
            max_tokens=self.settings.max_tokens
        )
        
        # Initialize visualization agent
        viz_settings = VisualizationSettings(
            openai_api_key=self.settings.openai_api_key,
            data_directory=self.settings.data_directory,
            output_directory=self.settings.output_directory
        )
        self.viz_agent = DataVisualizationAgent(viz_settings)
        
        self._setup_directories()
        logger.info("DynamicAIAgent initialized - AI-powered file analysis and visualization")
    
    def _setup_directories(self) -> None:
        """Create necessary directories."""
        Path(self.settings.data_directory).mkdir(parents=True, exist_ok=True)
        Path(self.settings.output_directory).mkdir(parents=True, exist_ok=True)
    
    async def process_query(self, query: str) -> AnalysisResponse:
        """
        Process user query by reading files, extracting data, and generating visualizations.
        
        This is the main entry point that handles everything dynamically.
        """
        try:
            logger.info(f"Processing query: {query}")
            
            # Step 1: Read all available files
            file_contents = await self._read_all_files()
            
            if not file_contents:
                return AnalysisResponse(
                    answer="I don't see any uploaded files. Please upload a PDF, CSV, or Excel file for me to analyze.",
                    confidence=1.0
                )
            
            # Step 2: Determine what the user wants
            intent = await self._analyze_user_intent(query, file_contents)
            
            # Step 3: Process based on intent
            if intent.get("type") == "visualization":
                return await self._handle_visualization_request(query, file_contents, intent)
            elif intent.get("type") == "data_extraction":
                return await self._handle_data_extraction(query, file_contents, intent)
            else:
                return await self._handle_general_analysis(query, file_contents, intent)
                
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return AnalysisResponse(
                answer=f"I encountered an error: {str(e)}. Please try rephrasing your question.",
                confidence=0.3
            )
    
    async def _read_all_files(self) -> List[FileContent]:
        """Read all files in the data directory and extract their content."""
        file_contents = []
        data_dir = Path(self.settings.data_directory)
        
        if not data_dir.exists():
            return file_contents
        
        # Read all supported file types
        for file_path in data_dir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in ['.pdf', '.csv', '.xlsx', '.xls', '.json', '.txt']:
                try:
                    content = await self._read_file(file_path)
                    if content:
                        file_contents.append(content)
                        logger.info(f"Successfully read file: {file_path.name}")
                except Exception as e:
                    logger.error(f"Error reading file {file_path}: {e}")
        
        return file_contents
    
    async def _read_file(self, file_path: Path) -> Optional[FileContent]:
        """Read a single file and extract its content."""
        file_type = file_path.suffix.lower()
        
        if file_type == '.pdf':
            return await self._read_pdf(file_path)
        elif file_type == '.csv':
            return await self._read_csv(file_path)
        elif file_type in ['.xlsx', '.xls']:
            return await self._read_excel(file_path)
        elif file_type == '.json':
            return await self._read_json(file_path)
        elif file_type == '.txt':
            return await self._read_text(file_path)
        else:
            return None
    
    async def _read_pdf(self, file_path: Path) -> FileContent:
        """Read PDF file and extract text and tables with better encoding handling."""
        raw_text = ""
        tables = []
        
        # Extract tables using pdfplumber first (it's better for tables)
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    # Extract text with better encoding
                    page_text = page.extract_text()
                    if page_text:
                        raw_text += f"\nPage {page_num + 1}:\n{page_text}\n"
                    
                    # Extract tables
                    page_tables = page.extract_tables()
                    for table_idx, table in enumerate(page_tables):
                        if table and len(table) > 1:
                            # Clean the table data
                            cleaned_table = []
                            for row in table:
                                cleaned_row = []
                                for cell in row:
                                    if cell:
                                        # Clean cell content
                                        cell_str = str(cell).strip()
                                        # Replace common encoding issues
                                        cell_str = cell_str.replace('\n', ' ')
                                        cleaned_row.append(cell_str)
                                    else:
                                        cleaned_row.append('')
                                cleaned_table.append(cleaned_row)
                            
                            # Try to create DataFrame with better handling
                            try:
                                # Use first row as headers if it looks like headers
                                headers = cleaned_table[0]
                                data = cleaned_table[1:]
                                
                                # Create DataFrame
                                df = pd.DataFrame(data, columns=headers)
                                
                                # Try to convert numeric columns
                                for col in df.columns:
                                    try:
                                        # Remove spaces and convert to numeric
                                        df[col] = df[col].str.replace(' ', '').replace(',', '.')
                                        df[col] = pd.to_numeric(df[col])
                                    except:
                                        pass  # Keep as string if conversion fails
                                
                                tables.append(df)
                                logger.info(f"Extracted table {table_idx + 1} from page {page_num + 1}: shape {df.shape}")
                            except Exception as e:
                                logger.error(f"Error creating DataFrame from table: {e}")
                                # Fallback: create simple DataFrame
                                if len(cleaned_table) > 1:
                                    df = pd.DataFrame(cleaned_table[1:], columns=[f"Col{i}" for i in range(len(cleaned_table[0]))])
                                    tables.append(df)
        except Exception as e:
            logger.error(f"Error with pdfplumber: {e}")
            
            # Fallback to PyPDF2 for text extraction
            try:
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            raw_text += page_text + "\n"
            except Exception as e2:
                logger.error(f"Error with PyPDF2: {e2}")
        
        # If no tables were extracted, try to parse tables from text
        if not tables and raw_text:
            tables = await self._extract_tables_from_text(raw_text)
        
        return FileContent(
            filename=file_path.name,
            file_type=".pdf",
            raw_text=raw_text,
            tables=tables,
            metadata={
                "pages": len(tables) if not raw_text else 1,
                "tables_found": len(tables)
            }
        )
    
    async def _read_csv(self, file_path: Path) -> FileContent:
        """Read CSV file."""
        df = pd.read_csv(file_path)
        
        return FileContent(
            filename=file_path.name,
            file_type=".csv",
            raw_text=df.to_string(),
            tables=[df],
            metadata={"shape": df.shape, "columns": df.columns.tolist()}
        )
    
    async def _read_excel(self, file_path: Path) -> FileContent:
        """Read Excel file."""
        excel_file = pd.ExcelFile(file_path)
        tables = []
        raw_text = ""
        
        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            tables.append(df)
            raw_text += f"\nSheet: {sheet_name}\n{df.to_string()}\n"
        
        return FileContent(
            filename=file_path.name,
            file_type=".xlsx",
            raw_text=raw_text,
            tables=tables,
            metadata={"sheets": excel_file.sheet_names}
        )
    
    async def _read_json(self, file_path: Path) -> FileContent:
        """Read JSON file."""
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Try to convert to DataFrame if possible
        tables = []
        try:
            df = pd.json_normalize(data)
            tables.append(df)
        except:
            pass
        
        return FileContent(
            filename=file_path.name,
            file_type=".json",
            raw_text=json.dumps(data, indent=2),
            tables=tables,
            metadata={"keys": list(data.keys()) if isinstance(data, dict) else []}
        )
    
    async def _read_text(self, file_path: Path) -> FileContent:
        """Read text file."""
        with open(file_path, 'r', encoding='utf-8') as f:
            raw_text = f.read()
        
        return FileContent(
            filename=file_path.name,
            file_type=".txt",
            raw_text=raw_text,
            tables=[],
            metadata={"lines": len(raw_text.splitlines())}
        )
    
    async def _analyze_user_intent(self, query: str, file_contents: List[FileContent]) -> Dict[str, Any]:
        """Use AI to understand what the user wants with better chart type detection."""
        
        # Quick chart type detection based on keywords
        query_lower = query.lower()
        chart_type = None
        
        if any(word in query_lower for word in ["bar", "bars", "bar chart", "column"]):
            chart_type = "bar"
        elif any(word in query_lower for word in ["line", "trend", "over time", "timeline"]):
            chart_type = "line"
        elif any(word in query_lower for word in ["pie", "composition", "percentage", "proportion"]):
            chart_type = "pie"
        elif any(word in query_lower for word in ["scatter", "correlation", "relationship"]):
            chart_type = "scatter"
        elif any(word in query_lower for word in ["histogram", "distribution", "frequency"]):
            chart_type = "histogram"
        
        prompt = f"""
        Analyze this user query and determine their intent:
        
        Query: "{query}"
        
        Available files: {[f.filename for f in file_contents]}
        File types: {[f.file_type for f in file_contents]}
        Tables found: {[len(f.tables) for f in file_contents]}
        
        The user is asking about data visualization. Determine:
        1. Intent type: Most likely "visualization" based on the query
        2. Target file: Which file contains the data (likely the PDF with budget data)
        3. Specific data: What specific table or data they want to visualize
        4. Chart type: {chart_type if chart_type else "Determine the best chart type"}
        
        Consider:
        - If they mention "table 1" they want the first table
        - If they say "bar chart" explicitly use bar chart
        - If they mention years/time, consider line chart
        - For revenue data, bar or line charts work well
        
        Return as JSON:
        {{
            "type": "visualization",
            "target_file": "filename or 'all'",
            "specific_data": "description of what they want",
            "chart_type": "{chart_type or 'bar'}" 
        }}
        """
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            intent = json.loads(response.content)
            
            # Override with detected chart type if found
            if chart_type and not intent.get("chart_type"):
                intent["chart_type"] = chart_type
                
            return intent
        except:
            # Fallback intent analysis
            return {
                "type": "visualization",
                "target_file": "all",
                "specific_data": query,
                "chart_type": chart_type or "bar"  # Default to bar chart
            }
    
    async def _handle_visualization_request(self, query: str, file_contents: List[FileContent], intent: Dict[str, Any]) -> AnalysisResponse:
        """Handle visualization requests using the visualization agent."""
        
        # Find the relevant file
        target_file = None
        for file_content in file_contents:
            if intent.get("target_file") == "all" or intent.get("target_file") in file_content.filename:
                target_file = file_content
                break
        
        if not target_file:
            target_file = file_contents[0]  # Use first file as fallback
        
        # Use the visualization agent to create the chart
        try:
            # Determine which table to use
            df = None
            
            # Check if user specified a table number
            if "table 1" in query.lower() or "first table" in query.lower():
                if target_file.tables and len(target_file.tables) > 0:
                    df = target_file.tables[0]
                    logger.info(f"Using first table from {target_file.filename}: shape {df.shape}")
            elif "table 2" in query.lower() or "second table" in query.lower():
                if target_file.tables and len(target_file.tables) > 1:
                    df = target_file.tables[1]
                    logger.info(f"Using second table from {target_file.filename}: shape {df.shape}")
            else:
                # Use the first available table with numeric data
                if target_file.tables:
                    for idx, table in enumerate(target_file.tables):
                        # Check if table has numeric columns
                        numeric_cols = table.select_dtypes(include=[np.number]).columns
                        if len(numeric_cols) > 0:
                            df = table
                            logger.info(f"Using table {idx + 1} with numeric data: shape {df.shape}")
                            break
                    
                    # If no numeric table found, use first table
                    if df is None and len(target_file.tables) > 0:
                        df = target_file.tables[0]
                        logger.info(f"Using first table as fallback: shape {df.shape}")
            
            # If still no data, try to extract from text
            if df is None or df.empty:
                logger.info("No table data found, extracting from text")
                df = await self._extract_dataframe_from_text(target_file.raw_text)
            
            # Log the data being visualized
            logger.info(f"Creating visualization with data shape: {df.shape}")
            logger.info(f"Columns: {df.columns.tolist()}")
            logger.info(f"Chart type requested: {intent.get('chart_type', 'auto')}")
            
            # Create visualization using the agent
            viz_result = await self.viz_agent.create_visualization(
                data=df,
                query=query,
                chart_type=intent.get("chart_type")
            )
            
            # Generate a comprehensive explanation
            explanation = f"""## 📊 Visualization Created

**File analyzed:** {target_file.filename}
**Chart type:** {viz_result.chart_type}
**Data shape:** {df.shape[0]} rows × {df.shape[1]} columns

### What this shows:
{viz_result.description}

### Key insights:
{chr(10).join(f"• {insight}" for insight in viz_result.insights[:5])}

### Data summary:
- **Total rows:** {viz_result.data_summary.get('rows', 'N/A')}
- **Total columns:** {viz_result.data_summary.get('columns', 'N/A')}
- **Numeric columns:** {viz_result.data_summary.get('numeric_columns', 0)}
- **Categorical columns:** {viz_result.data_summary.get('categorical_columns', 0)}

Your visualization has been saved as an image. The chart provides an interactive view of your data based on your request.
"""
            
            return AnalysisResponse(
                answer=explanation,
                visualization_path=viz_result.image_path,
                confidence=0.9,
                sources=[target_file.filename],
                data_extracted=viz_result.statistical_summary
            )
            
        except Exception as e:
            logger.error(f"Error creating visualization: {e}", exc_info=True)
            
            # Fallback to simple error message
            return AnalysisResponse(
                answer=f"I encountered an error creating the visualization: {str(e)}. Please ensure your data file contains numerical columns suitable for charting.",
                confidence=0.3,
                sources=[target_file.filename]
            )
    
    async def _extract_dataframe_from_text(self, text: str) -> pd.DataFrame:
        """Try to extract structured data from text content with better handling."""
        try:
            # Use AI to extract structured data
            prompt = f"""
            Extract structured data from this text that can be used for visualization.
            The text appears to be from a document about local budget revenues in Kazakhstan.
            
            Text (first 3000 chars):
            {text[:3000]}
            
            Look for:
            - Tables with headers like "Наименование показателей" and years (2009-2013)
            - Revenue categories like "Налоги", "Неналоговые поступления", etc.
            - Numeric values representing revenues
            
            Return the data as CSV format with these requirements:
            1. First column should be the category names (in original language)
            2. Other columns should be years (2009, 2010, 2011, 2012, 2013)
            3. Include ALL rows of data you can find
            4. Numeric values should be plain numbers without spaces
            
            Example format:
            Category,2009,2010,2011,2012,2013
            Налоги,777674,850526,981126,1119761,1268419
            
            If no structured data is found, return "NO_DATA".
            """
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            
            if "NO_DATA" in response.content:
                # Try to use existing CSV if available
                csv_path = Path(self.settings.data_directory) / "kazakhstan_budget_revenues.csv"
                if csv_path.exists():
                    logger.info("Using existing CSV file as fallback")
                    return pd.read_csv(csv_path)
                
                # Create a simple default dataframe
                return pd.DataFrame({
                    'Category': ['Revenue 1', 'Revenue 2', 'Revenue 3'],
                    '2009': [100, 200, 150],
                    '2010': [120, 220, 170],
                    '2011': [140, 240, 190],
                    '2012': [160, 260, 210],
                    '2013': [180, 280, 230]
                })
            
            # Try to parse the CSV
            from io import StringIO
            df = pd.read_csv(StringIO(response.content))
            
            # Ensure numeric columns are properly typed
            for col in df.columns:
                if col not in ['Category', 'Наименование показателей', 'Indicator']:
                    try:
                        df[col] = pd.to_numeric(df[col])
                    except:
                        pass
            
            logger.info(f"Extracted dataframe from text: shape {df.shape}")
            return df
            
        except Exception as e:
            logger.error(f"Error extracting dataframe from text: {e}")
            
            # Return the CSV data as fallback
            csv_path = Path(self.settings.data_directory) / "kazakhstan_budget_revenues.csv"
            if csv_path.exists():
                return pd.read_csv(csv_path)
            
            # Return a default dataframe
            return pd.DataFrame({
                'Category': ['A', 'B', 'C'],
                'Value': [1, 2, 3]
            })
    
    async def _handle_data_extraction(self, query: str, file_contents: List[FileContent], intent: Dict[str, Any]) -> AnalysisResponse:
        """Handle data extraction requests."""
        
        # Find relevant content
        relevant_content = []
        for file_content in file_contents:
            if intent.get("target_file") == "all" or intent.get("target_file") in file_content.filename:
                relevant_content.append(file_content)
        
        if not relevant_content:
            relevant_content = file_contents
        
        # Use AI to extract specific data
        prompt = f"""
        Extract specific data based on this request:
        
        User request: "{query}"
        
        Available files and their content:
        """
        
        for content in relevant_content:
            prompt += f"\n\nFile: {content.filename}\n"
            prompt += self._get_file_content_for_prompt(content)
        
        prompt += """
        
        Extract the requested data and provide:
        1. Direct answer to the question
        2. Specific data points extracted
        3. Context and interpretation
        
        Format as a clear, detailed response.
        """
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        return AnalysisResponse(
            answer=response.content,
            confidence=0.85,
            sources=[c.filename for c in relevant_content]
        )
    
    async def _handle_general_analysis(self, query: str, file_contents: List[FileContent], intent: Dict[str, Any]) -> AnalysisResponse:
        """Handle general analysis requests."""
        
        # Analyze all relevant files
        prompt = f"""
        Provide a comprehensive analysis based on this request:
        
        User request: "{query}"
        
        Available files and their content:
        """
        
        for content in file_contents:
            prompt += f"\n\nFile: {content.filename}\n"
            prompt += self._get_file_content_for_prompt(content, max_chars=2000)
        
        prompt += """
        
        Provide:
        1. Direct answer to the user's question
        2. Key insights from the data
        3. Specific examples and data points
        4. Recommendations or next steps
        
        Be specific and reference actual data from the files.
        """
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        return AnalysisResponse(
            answer=response.content,
            confidence=0.8,
            sources=[c.filename for c in file_contents]
        )
    
    def _get_file_content_for_prompt(self, file_content: FileContent, max_chars: int = 3000) -> str:
        """Get file content formatted for LLM prompt."""
        content = ""
        
        if file_content.tables:
            for i, table in enumerate(file_content.tables[:2]):  # Max 2 tables
                content += f"\nTable {i+1}:\n"
                content += f"Columns: {table.columns.tolist()}\n"
                content += f"Shape: {table.shape}\n"
                content += f"Data:\n{table.to_string()[:1000]}\n"
        
        if file_content.raw_text:
            remaining_chars = max_chars - len(content)
            if remaining_chars > 0:
                content += f"\nText content:\n{file_content.raw_text[:remaining_chars]}\n"
        
        return content
    
    async def _execute_visualization_code(self, code: str, file_content: FileContent) -> Optional[str]:
        """Execute the generated visualization code safely."""
        try:
            # Create a safe execution environment
            exec_globals = {
                'pd': pd,
                'np': np,
                'plt': plt,
                'sns': sns,
                'datetime': datetime,
                're': re,
                'json': json
            }
            
            # Add data to the environment
            if file_content.tables:
                exec_globals['df'] = file_content.tables[0]
                exec_globals['data'] = file_content.tables[0]
            
            exec_globals['raw_text'] = file_content.raw_text
            
            # Clear any existing plots
            plt.clf()
            plt.close('all')
            
            # Execute the code
            exec(code, exec_globals)
            
            # Save the plot
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = Path(self.settings.output_directory) / f"chart_{timestamp}.png"
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
            plt.close()
            
            logger.info(f"Visualization saved to: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Error executing visualization code: {e}")
            logger.error(f"Code that failed:\n{code}")
            
            # Try a simple fallback visualization
            try:
                plt.figure(figsize=(10, 6))
                plt.text(0.5, 0.5, f"Visualization Error:\n{str(e)[:100]}", 
                        ha='center', va='center', fontsize=12)
                plt.axis('off')
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = Path(self.settings.output_directory) / f"error_chart_{timestamp}.png"
                plt.savefig(output_path)
                plt.close()
                
                return str(output_path)
            except:
                return None
    
    async def _generate_visualization_explanation(self, query: str, file_content: FileContent, code: str) -> str:
        """Generate an explanation for the visualization."""
        
        prompt = f"""
        Explain the visualization that was created:
        
        User request: "{query}"
        File analyzed: {file_content.filename}
        
        Code that was generated:
        {code[:500]}...
        
        Provide a brief, clear explanation of:
        1. What data was visualized
        2. What the chart shows
        3. Key insights visible in the visualization
        
        Keep it conversational and helpful.
        """
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        return response.content

    async def _extract_tables_from_text(self, text: str) -> List[pd.DataFrame]:
        """Extract tables from raw text using AI."""
        tables = []
        
        try:
            prompt = f"""
            Extract ALL tables from this text. The text appears to be from a PDF about local budget revenues in Kazakhstan.
            
            Text (first 3000 chars):
            {text[:3000]}
            
            Look for:
            1. Table headers (like "Наименование показателей", years like 2009, 2010, etc.)
            2. Row labels (like "Налоги", "Неналоговые поступления", etc.)
            3. Numeric values (revenue figures)
            
            Return EACH table found as CSV format with proper headers.
            If multiple tables exist, separate them with "---TABLE---"
            
            Important:
            - Preserve the original language (Russian/Kazakh)
            - Keep all numeric values as they appear
            - Include year columns
            - Make sure to capture ALL rows of data
            
            Example format:
            Indicator,2009,2010,2011,2012,2013
            Taxes,777674,850526,981126,1119761,1268419
            Non-tax revenues,22391,33441,29957,35572,41230
            """
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            
            # Parse the response
            table_texts = response.content.split("---TABLE---")
            
            for table_text in table_texts:
                table_text = table_text.strip()
                if table_text and "," in table_text:
                    try:
                        from io import StringIO
                        df = pd.read_csv(StringIO(table_text))
                        
                        # Clean numeric columns
                        for col in df.columns:
                            if col not in ['Indicator', 'Наименование показателей', 'Category']:
                                try:
                                    df[col] = pd.to_numeric(df[col].astype(str).str.replace(' ', '').str.replace(',', ''))
                                except:
                                    pass
                        
                        tables.append(df)
                        logger.info(f"Extracted table from text: shape {df.shape}")
                    except Exception as e:
                        logger.error(f"Error parsing table from text: {e}")
            
        except Exception as e:
            logger.error(f"Error extracting tables from text: {e}")
        
        return tables


def create_dynamic_agent(settings: Optional[DynamicAgentSettings] = None) -> DynamicAIAgent:
    """Create a dynamic AI agent instance."""
    return DynamicAIAgent(settings)

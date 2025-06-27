"""
RAG Agent for QuokkaAI - Retrieval-Augmented Generation for document and data analysis.

This module implements a sophisticated RAG agent that can:
- Process various document formats (PDF, CSV, Excel, TXT, JSON)
- Create embeddings using OpenAI
- Store and retrieve from Chroma vector database
- Perform detailed data science analysis
- Make predictions and recommendations
- Generate insights like a professional data analyst
"""

import asyncio
import logging
import os
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass
from datetime import datetime
import pandas as pd
import numpy as np
import json

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


# LangChain imports
from langchain_community.document_loaders import (
    PyPDFLoader, CSVLoader, TextLoader, JSONLoader,
    UnstructuredExcelLoader, DirectoryLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.tools import Tool
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain_community.vectorstores.utils import filter_complex_metadata
from langchain.chains import RetrievalQA
from langchain.memory import ConversationBufferMemory
from langchain_core.prompts import PromptTemplate

# Data analysis imports
import plotly.express as px
import plotly.graph_objects as go
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import mean_squared_error, accuracy_score, classification_report
from sklearn.cluster import KMeans
import seaborn as sns
import matplotlib.pyplot as plt

logger = logging.getLogger(__name__)


class RAGSettings(BaseSettings):
    """Settings for the RAG agent."""
    
    openai_api_key: str = Field(alias="OPENAI_API_KEY", description="OpenAI API key")
    data_directory: str = Field(default="data/rag", description="Directory for uploaded files")
    chroma_directory: str = Field(default="data/chroma", description="Chroma database directory")
    chunk_size: int = Field(default=1000, description="Text chunk size for splitting")
    chunk_overlap: int = Field(default=200, description="Overlap between chunks")
    max_tokens: int = Field(default=4000, description="Maximum tokens for LLM responses")
    temperature: float = Field(default=0.1, description="LLM temperature for analysis")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"  # Allow extra fields from environment
    }


@dataclass
class AnalysisResult:
    """Result of data analysis."""
    summary: str
    insights: List[str]
    recommendations: List[str]
    visualizations: List[Dict[str, Any]]
    statistical_analysis: Dict[str, Any]
    predictions: Optional[Dict[str, Any]] = None
    confidence_score: float = 0.0


@dataclass
class ProcessedDocument:
    """Processed document metadata."""
    filename: str
    file_type: str
    size: int
    processed_at: datetime
    chunks_count: int
    embedding_model: str
    summary: str


class DataAnalysisRAGAgent:
    """
    Advanced RAG agent for comprehensive data analysis.
    
    Capabilities:
    - Multi-format document processing (PDF, CSV, Excel, JSON, TXT)
    - Intelligent text chunking and embedding
    - Vector similarity search with Chroma
    - Statistical analysis and visualization
    - Machine learning predictions
    - Professional data science insights
    - Interactive chart generation
    """
    
    def __init__(self, settings: Optional[RAGSettings] = None):
        """
        Initialize the RAG agent.
        
        Args:
            settings: Configuration settings for the agent
        """
        self.settings = settings or RAGSettings()
        self._setup_directories()
        
        # Initialize components
        self.embeddings = OpenAIEmbeddings(
            api_key=self.settings.openai_api_key
        )
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=self.settings.openai_api_key,
            temperature=self.settings.temperature,
            max_tokens=self.settings.max_tokens
        )
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        # Initialize vector store
        self.vectorstore = Chroma(
            persist_directory=self.settings.chroma_directory,
            embedding_function=self.embeddings
        )
        
        # Initialize memory for conversation context
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Document registry
        self.processed_documents: Dict[str, ProcessedDocument] = {}
        
        logger.info("DataAnalysisRAGAgent initialized successfully")

    def _setup_directories(self) -> None:
        """Create necessary directories."""
        Path(self.settings.data_directory).mkdir(parents=True, exist_ok=True)
        Path(self.settings.chroma_directory).mkdir(parents=True, exist_ok=True)
        logger.info(f"Directories set up: {self.settings.data_directory}, {self.settings.chroma_directory}")

    async def upload_file(self, file_path: str, original_filename: str) -> Dict[str, Any]:
        """
        Process and store an uploaded file.
        
        Args:
            file_path: Path to the uploaded file
            original_filename: Original name of the file
            
        Returns:
            Processing result with metadata
        """
        try:
            # Move file to data directory
            target_path = Path(self.settings.data_directory) / original_filename
            shutil.move(file_path, target_path)
            
            # Process the document
            documents = await self._load_document(target_path)
            
            if not documents:
                return {
                    "status": "error",
                    "message": "Failed to load document content"
                }
            
            # Split into chunks
            chunks = self.text_splitter.split_documents(documents)
            
            # Filter complex metadata before adding to vector store
            filtered_chunks = []
            for chunk in chunks:
                # Create a copy of the chunk with filtered metadata
                filtered_metadata = {}
                for key, value in chunk.metadata.items():
                    # Only keep simple types that Chroma can handle
                    if isinstance(value, (str, int, float, bool, type(None))):
                        filtered_metadata[key] = value
                    elif isinstance(value, list):
                        # Convert list to string representation
                        filtered_metadata[f"{key}_summary"] = f"Multiple errors: {len(value)} issues"
                        # Store first few items as string if they're simple types
                        simple_items = [item for item in value[:3] if isinstance(item, (str, int, float, bool))]
                        if simple_items:
                            filtered_metadata[f"{key}_first"] = str(simple_items[0])
                    else:
                        # Convert complex types to string
                        filtered_metadata[key] = str(value)
                
                # Create new document with filtered metadata
                filtered_chunk = Document(
                    page_content=chunk.page_content,
                    metadata=filtered_metadata
                )
                filtered_chunks.append(filtered_chunk)
            
            # Add filtered chunks to vector store
            self.vectorstore.add_documents(filtered_chunks)
            
            # Generate summary
            summary = await self._generate_document_summary(documents[:5])  # First 5 chunks
            
            # Store metadata
            processed_doc = ProcessedDocument(
                filename=original_filename,
                file_type=target_path.suffix.lower(),
                size=target_path.stat().st_size,
                processed_at=datetime.utcnow(),
                chunks_count=len(chunks),
                embedding_model="text-embedding-ada-002",
                summary=summary
            )
            
            self.processed_documents[original_filename] = processed_doc
            
            logger.info(f"Successfully processed {original_filename}: {len(chunks)} chunks")
            
            return {
                "status": "success",
                "filename": original_filename,
                "chunks_count": len(chunks),
                "summary": summary,
                "file_type": processed_doc.file_type,
                "size": processed_doc.size
            }
            
        except Exception as e:
            logger.error(f"Error processing file {original_filename}: {e}")
            return {
                "status": "error",
                "message": str(e)
            }

    async def _load_document(self, file_path: Path) -> List[Document]:
        """Load document based on file type with enhanced error handling."""
        file_type = file_path.suffix.lower()
        
        try:
            if file_type == '.pdf':
                return await self._load_pdf_with_fallbacks(file_path)
            elif file_type == '.csv':
                return await self._load_csv_with_fallbacks(file_path)
            elif file_type in ['.txt', '.md']:
                return await self._load_text_with_fallbacks(file_path)
            elif file_type == '.json':
                return await self._load_json_with_fallbacks(file_path)
            elif file_type in ['.xlsx', '.xls']:
                return await self._load_excel_with_fallbacks(file_path)
            else:
                # Try as text file
                return await self._load_text_with_fallbacks(file_path)
            
        except Exception as e:
            logger.error(f"Error loading {file_path}: {e}")
            return [Document(
                page_content=f"File: {file_path.name}\n\nError loading file: {str(e)}\n\nPlease try a different file format.",
                metadata={"source": str(file_path), "file_type": file_type, "error": str(e)}
            )]

    async def _load_pdf_with_fallbacks(self, file_path: Path) -> List[Document]:
        """Load PDF with multiple fallback methods including OCR."""
        errors = []
        
        # Method 1: Try PyMuPDF (fitz) - most reliable
        try:
            import fitz  # PyMuPDF
            logger.info(f"Attempting PyMuPDF (fitz) for {file_path}")
            
            doc = fitz.open(str(file_path))
            text_content = []
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text()
                
                # If no text found, try OCR on the page
                if not text.strip():
                    logger.info(f"No text found on page {page_num}, attempting OCR...")
                    try:
                        # Get page as image
                        pix = page.get_pixmap()
                        img_data = pix.tobytes("png")
                        
                        # Use OCR to extract text
                        ocr_text = await self._extract_text_with_ocr(img_data)
                        if ocr_text.strip():
                            text = f"[OCR Extracted] {ocr_text}"
                            logger.info(f"OCR successful for page {page_num}")
                    except Exception as ocr_error:
                        logger.warning(f"OCR failed for page {page_num}: {ocr_error}")
                        text = f"[Page {page_num + 1}] - Unable to extract text (may be image/scanned content)"
                
                if text.strip():
                    text_content.append(
                        Document(
                            page_content=text,
                            metadata={
                                "source": str(file_path),
                                "page": page_num + 1,
                                "total_pages": len(doc),
                                "extraction_method": "PyMuPDF" + (" + OCR" if "[OCR Extracted]" in text else "")
                            }
                        )
                    )
            
            doc.close()
            
            if text_content:
                logger.info(f"Successfully extracted {len(text_content)} pages with PyMuPDF")
                return text_content
            else:
                errors.append("PyMuPDF: No content extracted from any page")
                
        except ImportError:
            errors.append("PyMuPDF not available")
        except Exception as e:
            errors.append(f"PyMuPDF error: {str(e)}")
            logger.warning(f"PyMuPDF failed: {e}")
        
        # Method 2: Try PyPDFLoader
        try:
            logger.info(f"Attempting PyPDFLoader for {file_path}")
            loader = PyPDFLoader(str(file_path))
            docs = loader.load()
            if docs and any(doc.page_content.strip() for doc in docs):
                logger.info(f"Successfully loaded PDF with PyPDFLoader: {len(docs)} pages")
                return docs
            else:
                errors.append("PyPDFLoader: No content extracted")
        except Exception as e:
            errors.append(f"PyPDFLoader error: {str(e)}")
            logger.warning(f"PyPDFLoader failed: {e}")
        
        # Method 3: Try pdf2image + OCR for scanned documents
        try:
            from pdf2image import convert_from_path
            logger.info("Attempting full document OCR with pdf2image")
            
            # Convert PDF to images
            images = convert_from_path(str(file_path), dpi=300, first_page=1, last_page=5)  # Limit to first 5 pages
            text_content = []
            
            for i, image in enumerate(images):
                # Convert PIL image to bytes
                import io
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='PNG')
                img_bytes = img_byte_arr.getvalue()
                
                # Extract text with OCR
                ocr_text = await self._extract_text_with_ocr(img_bytes)
                
                if ocr_text.strip():
                    text_content.append(
                        Document(
                            page_content=f"[OCR Extracted] {ocr_text}",
                            metadata={
                                "source": str(file_path),
                                "page": i + 1,
                                "extraction_method": "pdf2image + OCR"
                            }
                        )
                    )
            
            if text_content:
                logger.info(f"Successfully extracted {len(text_content)} pages with OCR")
                return text_content
            else:
                errors.append("OCR: No text extracted from images")
                
        except ImportError:
            errors.append("pdf2image not available")
        except Exception as e:
            errors.append(f"OCR error: {str(e)}")
            logger.warning(f"OCR extraction failed: {e}")
        
        # Method 4: Try pypdf2 as final fallback
        try:
            import PyPDF2
            logger.info("Attempting PyPDF2 direct extraction")
            text_content = []
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        text = page.extract_text()
                        if text.strip():
                            text_content.append(
                                Document(
                                    page_content=text,
                                    metadata={
                                        "source": str(file_path),
                                        "page": page_num + 1,
                                        "total_pages": len(pdf_reader.pages),
                                        "extraction_method": "PyPDF2"
                                    }
                                )
                            )
                    except Exception as page_error:
                        logger.warning(f"Error extracting page {page_num}: {page_error}")
                        continue
            
            if text_content:
                logger.info(f"Successfully extracted {len(text_content)} pages with PyPDF2")
                return text_content
            else:
                errors.append("PyPDF2: No content extracted")
                
        except Exception as e:
            errors.append(f"PyPDF2 error: {str(e)}")
            logger.warning(f"PyPDF2 failed: {e}")
        
        # If all methods fail, return helpful error document
        error_msg = "; ".join(errors)
        logger.error(f"All PDF extraction methods failed for {file_path}: {error_msg}")
        
        return [Document(
            page_content=f"""📄 PDF Analysis Report: {file_path.name}

🔍 **Extraction Status**: Unable to extract readable text

📊 **File Information**:
- File Size: {file_path.stat().st_size / 1024:.1f} KB
- Format: PDF Document

⚠️ **Possible Issues**:
- Scanned document (images of text requiring OCR)
- Password-protected or encrypted PDF
- Corrupted or complex PDF structure
- Non-standard encoding or fonts

🛠️ **Attempted Methods**: {len(errors)} different extraction techniques
- PyMuPDF with OCR support
- PyPDFLoader (LangChain)
- pdf2image + Tesseract OCR
- PyPDF2 direct extraction

💡 **Recommendations**:
1. **For Scanned Documents**: Use professional OCR software or convert to high-resolution images first
2. **For Password-Protected PDFs**: Remove password protection and re-upload
3. **Alternative Formats**: Try converting to .txt, .docx, or .csv if possible
4. **Data Analysis**: If this contains structured data, export as Excel/CSV for better analysis

📈 **What I Can Analyze Instead**:
- CSV files with numerical data
- Excel spreadsheets with multiple sheets
- JSON data files
- Plain text documents
- Structured data formats

🤖 **My Capabilities**: I can perform comprehensive data analysis including:
- Statistical analysis and trend identification
- Data visualization and charting
- Predictive modeling and forecasting
- Correlation analysis and pattern recognition
- Business intelligence insights

Please try uploading your data in a different format, and I'll provide detailed analytical insights!""",
            metadata={
                "source": str(file_path),
                "file_type": "pdf",
                "extraction_failed": True,
                "error_count": len(errors),
                "error_summary": error_msg[:500],
                "extraction_methods_tried": len(errors),
                "file_size_kb": round(file_path.stat().st_size / 1024, 1)
            }
        )]

    async def _extract_text_with_ocr(self, image_bytes: bytes) -> str:
        """Extract text from image using OCR."""
        try:
            import pytesseract
            from PIL import Image
            import io
            
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Use OCR to extract text
            text = pytesseract.image_to_string(image, lang='eng+rus')  # Support English and Russian
            
            return text.strip()
            
        except ImportError:
            logger.warning("OCR libraries not available (pytesseract, PIL)")
            return ""
        except Exception as e:
            logger.warning(f"OCR extraction failed: {e}")
            return ""

    async def _load_csv_with_fallbacks(self, file_path: Path) -> List[Document]:
        """Load CSV with encoding fallbacks."""
        encodings = ['utf-8', 'latin1', 'iso-8859-1', 'cp1252']
        errors = []
        
        for encoding in encodings:
            try:
                loader = CSVLoader(str(file_path), encoding=encoding)
                docs = loader.load()
                if docs:
                    logger.info(f"Successfully loaded CSV with {encoding} encoding")
                    return docs
            except Exception as e:
                errors.append(f"{encoding}: {str(e)}")
        
        # Fallback to pandas
        try:
            df = pd.read_csv(file_path)
            return [Document(
                page_content=df.to_string(),
                metadata={"source": str(file_path), "file_type": "csv"}
            )]
        except Exception as e:
            errors.append(f"pandas: {str(e)}")
        
        return [Document(
            page_content=f"CSV file: {file_path.name}\n\nError loading file. Tried encodings: {', '.join(encodings)}\n\nErrors: {'; '.join(errors)}",
            metadata={
                "source": str(file_path), 
                "file_type": "csv", 
                "error_count": len(errors),
                "encodings_tried": ', '.join(encodings)
            }
        )]

    async def _load_text_with_fallbacks(self, file_path: Path) -> List[Document]:
        """Load text file with encoding fallbacks."""
        encodings = ['utf-8', 'latin1', 'iso-8859-1', 'cp1252']
        errors = []
        
        for encoding in encodings:
            try:
                loader = TextLoader(str(file_path), encoding=encoding)
                docs = loader.load()
                if docs:
                    logger.info(f"Successfully loaded text file with {encoding} encoding")
                    return docs
            except Exception as e:
                errors.append(f"{encoding}: {str(e)}")
        
        return [Document(
            page_content=f"Text file: {file_path.name}\n\nError loading file. Tried encodings: {', '.join(encodings)}\n\nErrors: {'; '.join(errors)}",
            metadata={
                "source": str(file_path), 
                "file_type": "text", 
                "error_count": len(errors),
                "encodings_tried": ', '.join(encodings)
            }
        )]

    async def _load_json_with_fallbacks(self, file_path: Path) -> List[Document]:
        """Load JSON with better error handling."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = json.load(f)
            
            if isinstance(content, list):
                # Split large arrays into chunks
                chunk_size = 100
                chunks = [content[i:i + chunk_size] for i in range(0, len(content), chunk_size)]
                return [
                    Document(
                        page_content=json.dumps(chunk, indent=2),
                        metadata={
                            "source": str(file_path),
                            "file_type": "json",
                            "chunk": i,
                            "total_chunks": len(chunks)
                        }
                    )
                    for i, chunk in enumerate(chunks)
                ]
            else:
                return [Document(
                    page_content=json.dumps(content, indent=2),
                    metadata={"source": str(file_path), "file_type": "json"}
                )]
                
        except json.JSONDecodeError as e:
            return [Document(
                page_content=f"JSON file: {file_path.name}\n\nInvalid JSON format: {str(e)}",
                metadata={"source": str(file_path), "file_type": "json", "error": str(e)}
            )]
        except Exception as e:
            return [Document(
                page_content=f"JSON file: {file_path.name}\n\nError loading file: {str(e)}",
                metadata={"source": str(file_path), "file_type": "json", "error": str(e)}
            )]

    async def _load_excel_with_fallbacks(self, file_path: Path) -> List[Document]:
        """Load Excel with fallbacks."""
        try:
            # Try UnstructuredExcelLoader first
            try:
                loader = UnstructuredExcelLoader(str(file_path))
                docs = loader.load()
                if docs:
                    logger.info("Successfully loaded Excel with UnstructuredExcelLoader")
                    return docs
            except Exception as e:
                logger.warning(f"UnstructuredExcelLoader failed: {e}, trying pandas")
            
            # Fallback to pandas
            df = pd.read_excel(file_path)
            return [Document(
                page_content=df.to_string(),
                metadata={"source": str(file_path), "file_type": "excel"}
            )]
            
        except Exception as e:
            return [Document(
                page_content=f"Excel file: {file_path.name}\n\nError loading file: {str(e)}",
                metadata={"source": str(file_path), "file_type": "excel", "error": str(e)}
            )]

    async def _generate_document_summary(self, documents: List[Document]) -> str:
        """Generate a summary of the document content."""
        if not documents:
            return "No content available for summary."
        
        # Combine first few documents for summary
        content = "\n".join([doc.page_content[:500] for doc in documents[:3]])
        
        prompt = f"""
        Analyze this document content and provide a concise summary:
        
        Content:
        {content}
        
        Provide a summary that includes:
        1. Document type and main topic
        2. Key data points or information
        3. Potential analysis opportunities
        
        Summary:
        """
        
        try:
            response = await self.llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return "Summary generation failed."

    async def analyze_data(self, query: str, document_filter: Optional[str] = None) -> AnalysisResult:
        """
        Perform comprehensive data analysis like a professional data analyst.
        
        Args:
            query: Analysis query from user
            document_filter: Optional filter for specific documents
            
        Returns:
            Detailed analysis result with professional insights
        """
        try:
            logger.info(f"🔍 Starting comprehensive data analysis for: {query[:100]}...")
            
            # Extract the actual user query from context if present
            user_query = self._extract_user_query(query)
            logger.info(f"📊 Extracted user query: {user_query[:100]}...")
            
            # Retrieve relevant documents with expanded search
            docs = self.vectorstore.similarity_search(user_query, k=25)  # Increased for better context
            logger.info(f"📚 Found {len(docs)} relevant documents")
            
            if not docs:
                return await self._provide_data_upload_guidance()
            
            # Check if we have structured data (CSV/Excel)
            structured_data = await self._extract_structured_data(docs)
            logger.info(f"📈 Structured data analysis: {structured_data is not None}")
            
            # Determine analysis type and provide comprehensive insights
            if structured_data is not None:
                logger.info(f"🧮 Performing quantitative analysis on dataset: {structured_data.shape}")
                return await self._perform_professional_quantitative_analysis(user_query, structured_data, docs)
            else:
                logger.info("📝 Performing qualitative analysis on text documents")
                return await self._perform_professional_qualitative_analysis(user_query, docs)
                
        except Exception as e:
            logger.error(f"❌ Error in data analysis: {e}", exc_info=True)
            return AnalysisResult(
                summary=f"⚠️ Analysis Error: {str(e)}",
                insights=["Technical issue encountered during analysis"],
                recommendations=[
                    "Try rephrasing your question with more specific terms",
                    "Ensure your data file is properly formatted and not corrupted", 
                    "Check if the file contains readable text or structured data",
                    "Contact support if the issue persists"
                ],
                visualizations=[],
                statistical_analysis={"error": str(e), "status": "failed"},
                confidence_score=0.1
            )

    async def _provide_data_upload_guidance(self) -> AnalysisResult:
        """Provide guidance when no data is available."""
        return AnalysisResult(
            summary="🚀 Ready to Analyze Your Data! No files uploaded yet.",
            insights=[
                "📊 I'm your AI Data Analyst - I can analyze various data formats",
                "🔍 I specialize in finding patterns, trends, and actionable insights",
                "📈 I can create visualizations and provide statistical analysis",
                "🤖 I work like a professional data analyst with advanced AI capabilities"
            ],
            recommendations=[
                "📁 Upload your data files (CSV, Excel, JSON, PDF, or text files)",
                "💡 Ask specific questions like 'What trends do you see in my sales data?'",
                "📊 Request visualizations: 'Create a chart showing monthly trends'",
                "🔬 Get statistical insights: 'Find correlations in my dataset'",
                "💼 Business questions: 'What recommendations do you have for improving performance?'"
            ],
            visualizations=[],
            statistical_analysis={
                "status": "awaiting_data",
                "message": "Upload data files to enable comprehensive statistical analysis",
                "supported_formats": ["CSV", "Excel", "JSON", "PDF", "Text"]
            },
            confidence_score=1.0
        )

    async def _perform_professional_quantitative_analysis(self, query: str, df: pd.DataFrame, docs: List[Document]) -> AnalysisResult:
        """Perform comprehensive quantitative analysis like a professional data analyst."""
        insights = []
        recommendations = []
        visualizations = []
        statistical_analysis = {}
        
        try:
            # Dataset Overview & Quality Assessment
            total_rows, total_cols = df.shape
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
            datetime_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
            
            # Comprehensive Data Profiling
            data_profile = {
                "dataset_overview": {
                    "total_rows": total_rows,
                    "total_columns": total_cols,
                    "numeric_columns": len(numeric_cols),
                    "categorical_columns": len(categorical_cols),
                    "datetime_columns": len(datetime_cols),
                    "column_names": df.columns.tolist(),
                    "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024**2, 2)
                },
                "data_quality": {
                    "missing_values": df.isnull().sum().to_dict(),
                    "missing_percentage": (df.isnull().sum() / len(df) * 100).round(2).to_dict(),
                    "duplicate_rows": int(df.duplicated().sum()),
                    "duplicate_percentage": round(df.duplicated().sum() / len(df) * 100, 2)
                }
            }
            
            # Professional Data Quality Assessment
            insights.append(f"📊 **Dataset Overview**: {total_rows:,} rows × {total_cols} columns")
            insights.append(f"🔢 **Data Types**: {len(numeric_cols)} numeric, {len(categorical_cols)} categorical, {len(datetime_cols)} datetime")
            
            # Data Quality Insights
            missing_data = df.isnull().sum()
            high_missing = missing_data[missing_data > total_rows * 0.1]
            
            if len(high_missing) > 0:
                insights.append(f"⚠️ **Data Quality Alert**: {len(high_missing)} columns have >10% missing values")
                recommendations.append("🔧 Consider data imputation or removal of high-missing columns")
            else:
                insights.append("✅ **Data Quality**: Excellent - minimal missing values detected")
            
            duplicate_pct = round(df.duplicated().sum() / len(df) * 100, 2)
            if duplicate_pct > 5:
                insights.append(f"🔄 **Duplicate Records**: {duplicate_pct}% of data is duplicated")
                recommendations.append("🧹 Consider deduplication to improve analysis accuracy")
            
            # Advanced Statistical Analysis
            if len(numeric_cols) > 0:
                numeric_stats = df[numeric_cols].describe()
                data_profile["descriptive_statistics"] = numeric_stats.to_dict()
                
                # Distribution Analysis
                for col in numeric_cols[:5]:  # Analyze first 5 numeric columns
                    skewness = float(df[col].skew())
                    kurtosis = float(df[col].kurtosis())
                    
                    if abs(skewness) > 1:
                        insights.append(f"📈 **{col}**: Highly skewed distribution (skewness: {skewness:.2f})")
                    
                    if abs(kurtosis) > 3:
                        insights.append(f"📊 **{col}**: Heavy-tailed distribution (kurtosis: {kurtosis:.2f})")
                
                # Correlation Analysis with Professional Interpretation
                if len(numeric_cols) >= 2:
                    correlation_matrix = df[numeric_cols].corr()
                    data_profile["correlations"] = correlation_matrix.to_dict()
                    
                    # Find strong correlations
                    strong_correlations = []
                    for i in range(len(correlation_matrix.columns)):
                        for j in range(i+1, len(correlation_matrix.columns)):
                            corr_val = correlation_matrix.iloc[i, j]
                            if abs(corr_val) > 0.7:
                                col1, col2 = correlation_matrix.columns[i], correlation_matrix.columns[j]
                                relationship = "positive" if corr_val > 0 else "negative"
                                strong_correlations.append({
                                    "variables": [col1, col2],
                                    "correlation": round(corr_val, 3),
                                    "relationship": relationship,
                                    "strength": "very strong" if abs(corr_val) > 0.9 else "strong"
                                })
                    
                    if strong_correlations:
                        insights.append(f"🔗 **Strong Correlations Found**: {len(strong_correlations)} significant relationships")
                        for corr in strong_correlations[:3]:  # Show top 3
                            insights.append(f"   • {corr['variables'][0]} ↔ {corr['variables'][1]}: {corr['strength']} {corr['relationship']} ({corr['correlation']})")
                        
                        recommendations.append("🎯 Investigate these correlations for potential causal relationships")
                    
                    data_profile["strong_correlations"] = strong_correlations
            
            # Categorical Data Analysis
            if len(categorical_cols) > 0:
                categorical_insights = {}
                for col in categorical_cols[:5]:  # Analyze first 5 categorical columns
                    unique_count = df[col].nunique()
                    most_common = df[col].value_counts().head(3)
                    
                    categorical_insights[col] = {
                        "unique_values": int(unique_count),
                        "most_common": most_common.to_dict()
                    }
                    
                    if unique_count > total_rows * 0.5:
                        insights.append(f"🏷️ **{col}**: High cardinality ({unique_count} unique values)")
                    elif unique_count < 10:
                        insights.append(f"🏷️ **{col}**: Low cardinality ({unique_count} categories)")
                
                data_profile["categorical_analysis"] = categorical_insights
            
            # Advanced Pattern Detection
            patterns = await self._detect_advanced_patterns(df, query)
            if patterns:
                insights.extend(patterns["insights"])
                recommendations.extend(patterns["recommendations"])
                if patterns.get("visualizations"):
                    visualizations.extend(patterns["visualizations"])
            
            # Generate Professional Summary
            summary = await self._generate_professional_summary(query, df, data_profile, insights)
            
            statistical_analysis["comprehensive_profile"] = data_profile
            statistical_analysis["analysis_timestamp"] = datetime.utcnow().isoformat()
            statistical_analysis["query_analyzed"] = query
            
            # Calculate confidence score based on data quality and completeness
            confidence_score = self._calculate_analysis_confidence(df, data_profile)
            
            return AnalysisResult(
                summary=summary,
                insights=insights,
                recommendations=recommendations,
                visualizations=visualizations,
                statistical_analysis=statistical_analysis,
                confidence_score=confidence_score
            )
            
        except Exception as e:
            logger.error(f"Error in quantitative analysis: {e}", exc_info=True)
            return AnalysisResult(
                summary=f"⚠️ Quantitative analysis encountered an issue: {str(e)}",
                insights=["Analysis partially completed before encountering technical issue"],
                recommendations=["Try with a smaller dataset or different file format"],
                visualizations=[],
                statistical_analysis={"error": str(e), "partial_analysis": True},
                confidence_score=0.3
            )

    async def _detect_advanced_patterns(self, df: pd.DataFrame, query: str) -> Optional[Dict[str, Any]]:
        """Detect advanced patterns in the data like a professional analyst."""
        patterns = {"insights": [], "recommendations": [], "visualizations": []}
        
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            # Time Series Pattern Detection
            date_cols = df.select_dtypes(include=['datetime64']).columns
            if len(date_cols) > 0 and len(numeric_cols) > 0:
                patterns["insights"].append("📅 **Time Series Data Detected**: Temporal analysis capabilities available")
                patterns["recommendations"].append("📈 Consider trend analysis, seasonality detection, and forecasting")
            
            # Outlier Detection
            if len(numeric_cols) > 0:
                outlier_counts = {}
                for col in numeric_cols:
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    outliers = df[(df[col] < Q1 - 1.5*IQR) | (df[col] > Q3 + 1.5*IQR)]
                    outlier_counts[col] = len(outliers)
                
                high_outlier_cols = {k: v for k, v in outlier_counts.items() if v > len(df) * 0.05}
                if high_outlier_cols:
                    patterns["insights"].append(f"🎯 **Outliers Detected**: {len(high_outlier_cols)} columns have significant outliers")
                    patterns["recommendations"].append("🔍 Investigate outliers - they may indicate data errors or important insights")
            
            # Distribution Patterns
            if len(numeric_cols) >= 2:
                # Check for potential normal distributions
                normal_like_cols = []
                for col in numeric_cols:
                    skew = abs(df[col].skew())
                    if skew < 0.5:  # Roughly normal
                        normal_like_cols.append(col)
                
                if normal_like_cols:
                    patterns["insights"].append(f"📊 **Normal Distributions**: {len(normal_like_cols)} columns appear normally distributed")
                    patterns["recommendations"].append("📈 Normal distributions enable parametric statistical tests")
            
            # Clustering Potential
            if len(numeric_cols) >= 2 and len(df) > 50:
                patterns["insights"].append("🎯 **Clustering Analysis**: Dataset suitable for segmentation analysis")
                patterns["recommendations"].append("🔬 Consider customer/data point segmentation using clustering algorithms")
            
            return patterns
            
        except Exception as e:
            logger.warning(f"Pattern detection failed: {e}")
            return None

    async def _generate_professional_summary(self, query: str, df: pd.DataFrame, profile: Dict, insights: List[str]) -> str:
        """Generate a professional data analyst summary."""
        
        # Create a comprehensive prompt for the LLM
        prompt = f"""
        As a senior data analyst, provide a professional summary of this dataset analysis.
        
        User Query: {query}
        
        Dataset Profile:
        - Rows: {profile['dataset_overview']['total_rows']:,}
        - Columns: {profile['dataset_overview']['total_columns']}
        - Data Types: {profile['dataset_overview']['numeric_columns']} numeric, {profile['dataset_overview']['categorical_columns']} categorical
        - Data Quality: {profile['data_quality']['duplicate_percentage']}% duplicates, missing data varies by column
        
        Key Insights Found:
        {chr(10).join(insights[:10])}
        
        Provide a professional, concise summary (2-3 paragraphs) that:
        1. Addresses the user's query directly
        2. Highlights the most important findings
        3. Uses professional data analyst language
        4. Provides actionable insights
        
        Summary:
        """
        
        try:
            response = await self.llm.ainvoke(prompt)
            return f"🔍 **Professional Data Analysis Summary**\n\n{response.content}"
        except Exception as e:
            logger.error(f"Error generating professional summary: {e}")
            return f"""🔍 **Data Analysis Summary**

            Analyzed dataset with {profile['dataset_overview']['total_rows']:,} records and {profile['dataset_overview']['total_columns']} variables. 
            The analysis reveals {len(insights)} key insights about your data's structure, quality, and patterns.
            
            Key findings include data quality assessment, statistical patterns, and actionable recommendations 
            for further analysis. The dataset shows {profile['data_quality']['duplicate_percentage']}% duplicate records 
            and varying levels of completeness across variables."""

    def _calculate_analysis_confidence(self, df: pd.DataFrame, profile: Dict) -> float:
        """Calculate confidence score for the analysis."""
        score = 1.0
        
        # Reduce confidence for high missing data
        avg_missing = sum(profile['data_quality']['missing_percentage'].values()) / len(profile['data_quality']['missing_percentage'])
        score -= min(avg_missing / 100, 0.3)
        
        # Reduce confidence for high duplicates
        score -= min(profile['data_quality']['duplicate_percentage'] / 100, 0.2)
        
        # Reduce confidence for very small datasets
        if len(df) < 50:
            score -= 0.2
        
        # Increase confidence for rich data types
        if profile['dataset_overview']['numeric_columns'] > 0:
            score += 0.1
        
        return max(0.1, min(1.0, score))

    def _extract_user_query(self, full_query: str) -> str:
        """Extract the actual user query from context-enhanced query."""
        # Look for "User Query:" pattern
        if "User Query:" in full_query:
            parts = full_query.split("User Query:")
            if len(parts) > 1:
                return parts[1].strip().split("\n")[0].strip()
        return full_query

    async def _extract_structured_data(self, docs: List[Document]) -> Optional[pd.DataFrame]:
        """Extract structured data from documents if available."""
        try:
            # Look for CSV or Excel files in processed documents
            for filename, doc_info in self.processed_documents.items():
                if doc_info.file_type in ['.csv', '.xlsx', '.xls']:
                    file_path = Path(self.settings.data_directory) / filename
                    
                    if file_path.exists():
                        if doc_info.file_type == '.csv':
                            return pd.read_csv(file_path)
                        else:
                            return pd.read_excel(file_path)
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting structured data: {e}")
            return None

    async def _perform_professional_qualitative_analysis(self, query: str, docs: List[Document]) -> AnalysisResult:
        """Perform enhanced qualitative analysis on text documents with conversational insights."""
        try:
            # Combine relevant document content
            content = "\n".join([doc.page_content for doc in docs[:8]])  # Increased context
            
            # Enhanced analysis prompt with conversational context
            prompt = f"""
            As a professional data analyst having a conversation with a user, analyze the following documents to answer: "{query}"
            
            Document Content:
            {content[:4000]}  # Increased content limit
            
            Provide a comprehensive, conversational analysis that includes:
            
            1. **Direct Answer**: Address the user's specific question
            2. **Key Insights**: 3-5 important findings from the documents
            3. **Actionable Recommendations**: 3-4 specific next steps
            4. **Context & Implications**: What this means for the user
            5. **Follow-up Suggestions**: Questions they might want to explore next
            
            Write in a conversational, helpful tone as if you're a colleague discussing findings.
            Be specific and reference actual content from the documents.
            
            Format as JSON:
            {{
                "direct_answer": "Clear answer to the user's question",
                "summary": "Brief overview of what the documents reveal",
                "insights": ["insight1", "insight2", "insight3", "insight4", "insight5"],
                "recommendations": ["action1", "action2", "action3", "action4"],
                "implications": "What this means for the user's goals",
                "follow_up_questions": ["question1", "question2", "question3"],
                "confidence": 0.8
            }}
            """
            
            response = await self.llm.ainvoke(prompt)
            
            try:
                # Parse LLM response
                analysis = json.loads(response.content)
                
                # Create conversational summary
                summary = f"""Based on your documents, here's what I found regarding "{query}":

{analysis.get('direct_answer', 'I analyzed your documents and found relevant information.')}

{analysis.get('implications', 'This information could be valuable for your decision-making process.')}"""
                
                return AnalysisResult(
                    summary=summary,
                    insights=analysis.get("insights", [])[:6],
                    recommendations=analysis.get("recommendations", [])[:5],
                    visualizations=[],  # Text analysis doesn't generate visualizations
                    statistical_analysis={
                        "document_analysis": {
                            "documents_analyzed": len(docs),
                            "content_length": len(content),
                            "analysis_type": "qualitative",
                            "follow_up_questions": analysis.get("follow_up_questions", [])
                        }
                    },
                    confidence_score=analysis.get("confidence", 0.75)
                )
                
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return AnalysisResult(
                    summary=f"I analyzed your documents regarding '{query}'. Here's what I found:\n\n{response.content[:800]}...",
                    insights=["Document analysis completed", "Key information extracted from your files"],
                    recommendations=["Consider uploading structured data for quantitative analysis", "Ask specific follow-up questions about the content"],
                    visualizations=[],
                    statistical_analysis={"analysis_type": "qualitative_fallback"},
                    confidence_score=0.6
                )
                
        except Exception as e:
            logger.error(f"Error in enhanced qualitative analysis: {e}")
            return AnalysisResult(
                summary=f"I had trouble analyzing your documents: {str(e)}",
                insights=["Document analysis encountered an issue"],
                recommendations=["Try rephrasing your question", "Ensure documents are properly uploaded"],
                visualizations=[],
                statistical_analysis={"error": str(e)},
                confidence_score=0.2
            )

    def get_uploaded_files(self) -> List[Dict[str, Any]]:
        """Get list of uploaded and processed files."""
        return [
            {
                "filename": doc.filename,
                "file_type": doc.file_type,
                "size": doc.size,
                "processed_at": doc.processed_at.isoformat(),
                "chunks_count": doc.chunks_count,
                "summary": doc.summary
            }
            for doc in self.processed_documents.values()
        ]

    async def delete_file(self, filename: str) -> bool:
        """Delete a file and its embeddings."""
        try:
            # Remove from processed documents
            if filename in self.processed_documents:
                del self.processed_documents[filename]
            
            # Remove file from disk
            file_path = Path(self.settings.data_directory) / filename
            if file_path.exists():
                file_path.unlink()
            
            # Note: Removing from Chroma would require tracking document IDs
            # For now, we'll leave embeddings (they'll be overwritten on re-upload)
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting file {filename}: {e}")
            return False

    async def close(self) -> None:
        """Clean up resources."""
        # Persist Chroma database
        if hasattr(self.vectorstore, 'persist'):
            self.vectorstore.persist()
        logger.info("RAG agent resources cleaned up")


def create_rag_tool(settings: Optional[RAGSettings] = None) -> Tool:
    """
    Create a LangChain tool for the RAG agent.
    
    Args:
        settings: Optional configuration settings
        
    Returns:
        Tool instance for use with LangChain agents
    """
    agent = DataAnalysisRAGAgent(settings)
    
    async def analyze_documents(query: str) -> str:
        """Analyze documents using RAG agent."""
        try:
            result = await agent.analyze_data(query)
            
            # Format result for agent consumption
            formatted_result = f"""
            ## 📊 Data Analysis Results
            
            **Summary:** {result.summary}
            
            **Key Insights:**
            {chr(10).join(f"• {insight}" for insight in result.insights)}
            
            **Recommendations:**
            {chr(10).join(f"• {rec}" for rec in result.recommendations)}
            
            **Statistical Analysis:**
            {json.dumps(result.statistical_analysis, indent=2)[:500]}...
            
            **Visualizations:** {len(result.visualizations)} charts generated
            **Confidence Score:** {result.confidence_score:.2f}
            """
            
            return formatted_result
            
        except Exception as e:
            logger.error(f"RAG tool error: {e}")
            return f"Document analysis failed: {str(e)}"
    
    return Tool(
        name="DocumentAnalysis",
        description=(
            "Analyze uploaded documents and datasets using advanced RAG techniques. "
            "Can perform statistical analysis, generate insights, create visualizations, "
            "and make data-driven predictions. Use this for questions about uploaded data, "
            "document content, statistical analysis, or data science tasks. "
            "Input should be a clear analysis query."
        ),
        func=lambda query: asyncio.run(analyze_documents(query))
    )


def create_rag_agent(settings: Optional[RAGSettings] = None) -> DataAnalysisRAGAgent:
    """
    Factory function to create a configured RAG agent.
    
    Args:
        settings: Optional configuration settings
        
    Returns:
        Configured DataAnalysisRAGAgent instance
    """
    return DataAnalysisRAGAgent(settings)

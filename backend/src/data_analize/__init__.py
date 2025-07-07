"""
QuokkaAI Data Analysis Module - Intelligent Visualization System

This module provides an AI-powered data visualization system that automatically
processes various file formats and creates intelligent chart configurations.

Architecture Overview:
=====================

1. TEXT_PDF_PROCESSOR (text_pdf_processor.py)
   - Extracts and structures data from PDF, DOCX, TXT files
   - Uses AI to intelligently parse unstructured text
   - Converts text data into structured DataFrames
   - Handles multiple document formats with fallback strategies

2. VISUALIZATION (visualization.py)
   - Creates intelligent Recharts configurations using OpenAI
   - Analyzes data characteristics to recommend optimal chart types
   - Generates professional analytical text descriptions
   - Supports multiple chart types (line, bar, scatter, pie, etc.)
   - Provides fallback configurations when AI fails

3. API (api.py)
   - FastAPI endpoints for file upload and visualization
   - Handles file validation and processing
   - Returns Recharts-compatible JSON configurations
   - Supports CSV, Excel, PDF, TXT, DOCX formats

Key Features:
=============

✅ INTELLIGENT DATA PROCESSING
   - AI-powered text extraction and structuring
   - Automatic data type detection and conversion
   - Handles both structured and unstructured data
   - Robust error handling and fallbacks

✅ SMART VISUALIZATION
   - AI-driven chart type selection
   - Professional analytical text generation
   - Recharts-compatible configurations
   - Responsive design considerations

✅ MULTI-FORMAT SUPPORT
   - CSV, Excel (xlsx, xls)
   - PDF documents
   - Text files (txt, docx)
   - Automatic format detection

✅ PRODUCTION READY
   - Comprehensive error handling
   - File size validation
   - Security considerations
   - Scalable architecture

Usage Example:
==============

```python
from src.data_analize.visualization import create_intelligent_visualization

# Create visualization from file
chart_config = create_intelligent_visualization("path/to/data.csv")

# Access chart configuration
chart_type = chart_config["chartType"]
data = chart_config["data"]
config = chart_config["config"]
analysis = chart_config["analyticalText"]
```

API Endpoints:
==============

- POST /data-analysis/upload - Upload file and create visualization
- POST /data-analysis/visualize - Create visualization from existing file
- GET /data-analysis/files - List uploaded files
- DELETE /data-analysis/files/{filename} - Delete uploaded file
- GET /data-analysis/supported-formats - Get supported file formats

This system provides a streamlined approach to data visualization that works
with any type of data source while maintaining high code quality and user experience.
"""

__version__ = "3.0.0"
__author__ = "QuokkaAI Team"

# Export main components
from .visualization import create_intelligent_visualization, read_data, analyze_data_structure
from .text_pdf_processor import process_text_file, extract_text_from_pdf, extract_text_from_docx

__all__ = [
    "create_intelligent_visualization",
    "read_data",
    "analyze_data_structure", 
    "process_text_file",
    "extract_text_from_pdf",
    "extract_text_from_docx"
] 
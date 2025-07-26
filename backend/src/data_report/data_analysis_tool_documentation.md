# Data Analysis Tool Documentation

## Overview

The `data_analysis_tool.py` is a comprehensive Python application that combines multiple data analysis functionalities into a single unified tool. It provides capabilities for file extraction, structure templating, LLM (Large Language Model) analysis, and professional report generation.

## Key Features

- **Multi-format File Extraction**: Supports CSV, JSON, TXT, MD, DOCX, PDF, Excel, and more
- **Intelligent Table Detection**: Automatically identifies and formats tabular data
- **Structure Template Management**: Extracts and applies document structure templates for consistent reporting
- **LLM Integration**: Connects with OpenAI, Anthropic, and Ollama for AI-powered analysis
- **Professional DOCX Generation**: Creates formatted Word documents with proper styling
- **Interactive CLI**: User-friendly command-line interface with guided workflow

## Architecture

The tool is built with a modular architecture consisting of four main components:

1. **FileExtractor**: Handles file content extraction with enhanced table detection
2. **StructurePreview**: Manages structure extraction and template management
3. **LLMAnalyzer**: Integrates with AI services for content analysis
4. **DocxGenerator**: Creates professionally formatted DOCX reports

These components are orchestrated by the main `DataAnalysisTool` class, which provides the workflow and user interface.

## Component Details

### FileExtractor

Responsible for extracting and formatting content from various file types:

- Detects and formats tabular data (CSV, TSV, tables in text)
- Extracts content from JSON, XML, PDF, DOCX, and Excel files
- Provides file metadata and statistics
- Formats tables for better readability

### StructurePreview

Analyzes document structure and creates templates for consistent reporting:

- Extracts section headers, formatting patterns, and content types
- Detects document organization style (numbered, markdown, hierarchical)
- Generates structure prompts for LLM to follow
- Maintains consistent formatting across reports

### LLMAnalyzer

Integrates with AI services to analyze file content:

- Supports multiple API providers (OpenAI, Anthropic, Ollama)
- Configurable system prompts for specialized analysis
- Handles API authentication and request formatting
- Processes responses for consistent output

### DocxGenerator

Creates professionally formatted Word documents:

- Custom styles for titles, headings, and body text
- Automatic table formatting from markdown
- Bullet and numbered list support
- Professional header with title and timestamp

## Implementation Details

### Dependencies

The tool has both required and optional dependencies:

**Required:**
- Python 3.6+
- Standard libraries: os, sys, json, csv, re, requests, pathlib, datetime, typing

**Optional:**
- python-docx: For DOCX generation
- pandas: For Excel file support
- PyPDF2: For PDF file support

### API Integration

The tool supports three LLM providers:

1. **OpenAI**
   - Default model: GPT-4
   - Endpoint: https://api.openai.com/v1/chat/completions
   - Authentication: Bearer token

2. **Anthropic**
   - Default model: Claude-3-Sonnet
   - Endpoint: https://api.anthropic.com/v1/messages
   - Authentication: API key header

3. **Ollama**
   - Default model: Llama2
   - Endpoint: http://localhost:11434/api/generate
   - No authentication required (local)

### Error Handling

The tool implements comprehensive error handling:

- Graceful degradation when optional dependencies are missing
- Detailed error messages for API failures
- Exception handling for file operations
- User-friendly error reporting in the CLI

## Workflow

The main workflow consists of six steps:

1. **Structure Preview Setup** (Optional)
   - Select a template file for consistent formatting
   - Extract structure patterns

2. **File Selection**
   - Choose a file to analyze
   - Validate file existence and readability

3. **Content Extraction**
   - Extract and preview file content
   - Format tables and structured data

4. **API Configuration**
   - Select LLM provider (OpenAI, Anthropic, Ollama)
   - Configure API key

5. **LLM Analysis**
   - Send content to LLM with structure template
   - Receive and display analysis

6. **Report Generation**
   - Create DOCX report (optional)
   - Save analysis results and summary

## Usage Instructions

### Basic Usage

Run the tool with no arguments to start the interactive workflow:

```bash
python data_analysis_tool.py
```

Follow the prompts to:
1. Set up a structure template (optional)
2. Select a file to analyze
3. Configure the LLM provider and API key
4. Generate and save reports

### API Configuration

The tool requires an API key for OpenAI or Anthropic. You can:

- Enter the API key when prompted
- Set environment variables:
  - `OPENAI_API_KEY` for OpenAI
  - `ANTHROPIC_API_KEY` for Anthropic

For Ollama, ensure the local server is running at `http://localhost:11434`.

### Structure Templates

To use a structure template:

1. Select option 1 in the Structure Preview Setup menu
2. Choose a well-formatted document as a template
3. The tool will extract the structure and apply it to the LLM analysis

## Integration Guide

### Importing as a Module

The tool can be imported and used programmatically:

```python
from data_analysis_tool import FileExtractor, StructurePreview, LLMAnalyzer, DocxGenerator

# Extract file content
extractor = FileExtractor()
content = extractor.extract_file_content('path/to/file.csv')

# Analyze with LLM
analyzer = LLMAnalyzer(api_key='your_api_key', api_provider='openai')
analysis = analyzer.analyze_content(content, 'file.csv')

# Generate DOCX report
generator = DocxGenerator()
generator.add_header('Analysis Report', 'File Analysis')
generator.parse_and_format_content(analysis)
generator.save_document('report.docx')
```

### API Endpoints

To integrate with a web application, you can wrap the core functionality in API endpoints:

1. **File Upload**: Accept file uploads and extract content
2. **Structure Template**: Upload and extract structure templates
3. **Analysis**: Send content to LLM and return analysis
4. **Report Generation**: Create and return DOCX reports

## Customization

### Adding New File Types

To support additional file types, extend the `extract_file_content` method in the `FileExtractor` class:

```python
# Example: Add support for .xyz files
elif extension == '.xyz':
    # Custom extraction logic
    with open(file_path, 'r', encoding='utf-8') as file:
        # Process the content
        return processed_content
```

### Adding New LLM Providers

To add a new LLM provider, extend the `LLMAnalyzer` class:

1. Add the new provider to the `__init__` method
2. Create a new `_send_to_provider` method
3. Update the `analyze_content` method to use the new provider

### Customizing DOCX Styling

To customize the DOCX report styling, modify the `setup_styles` method in the `DocxGenerator` class:

```python
# Example: Change title font and size
title_font = title_style.font
title_font.name = 'Calibri'
title_font.size = Pt(24)
```

## Technical Specifications

### Performance Considerations

- **File Size**: The tool can handle files up to several MB in size
- **API Limits**: Respects token limits of LLM providers
- **Memory Usage**: Optimized for efficient memory usage with large files

### Security Notes

- API keys are never saved to disk
- File operations use secure practices
- No external network requests except to configured API providers

## Troubleshooting

### Common Issues

1. **Missing Dependencies**
   - Install optional dependencies: `pip install python-docx pandas PyPDF2`

2. **API Authentication Errors**
   - Verify API key is correct
   - Check for API rate limits or quotas

3. **File Extraction Issues**
   - Ensure file is not corrupted
   - Check file encoding (UTF-8 recommended)

4. **DOCX Generation Failures**
   - Install python-docx: `pip install python-docx`
   - Check for write permissions in the directory

## Conclusion

The `data_analysis_tool.py` provides a comprehensive solution for file analysis and report generation with AI integration. Its modular architecture allows for easy extension and customization, while the interactive CLI makes it accessible for users of all technical levels.

By combining file extraction, structure templating, LLM analysis, and report generation into a single tool, it streamlines the data analysis workflow and ensures consistent, professional results.
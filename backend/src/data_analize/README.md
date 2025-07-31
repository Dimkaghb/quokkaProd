# Data Analysis Module

This module contains data analysis tools and systems for the QuokkaAI platform.

## RAG System

### Overview
The RAG (Retrieval Augmented Generation) system provides intelligent question-answering capabilities using LangChain, OpenAI embeddings, and conversation memory.

### Features
- **Document Processing**: Automatic text chunking and indexing
- **Vector Search**: Semantic similarity search using OpenAI embeddings
- **Conversation Memory**: Maintains context across multiple queries
- **Professional Responses**: Direct, detailed, and professional answers
- **Knowledge Base Management**: Add and update documents dynamically

### Quick Start

#### Basic Usage
```python
from src.data_analize.rag_system import RAGSystem

# Initialize the system
rag = RAGSystem()

# Query the system
result = rag.query("What is QuokkaAI?")
print(f"Answer: {result['answer']}")
print(f"Sources: {', '.join(result['sources'])}")
```

#### Custom Knowledge Base
```python
# Initialize with custom knowledge file
rag = RAGSystem(knowledge_file="path/to/your/knowledge.txt")

# Or update existing knowledge base
result = rag.update_knowledge_base("path/to/new/document.txt")
```

### API Methods

#### Core Methods
- `query(question: str)` - Ask a question and get an answer
- `search_knowledge_base(query: str, k: int = 3)` - Search for relevant documents
- `get_conversation_history()` - Get chat history
- `clear_memory()` - Clear conversation memory

#### Knowledge Management
- `update_knowledge_base(file_path: str)` - Add new documents
- `add_document(content: str, metadata: dict)` - Add single document

#### Memory Management
- `get_memory_summary()` - Get memory status
- `clear_memory()` - Reset conversation

### Integration Example

See `rag_integration_example.py` for a complete FastAPI integration example with endpoints for:
- `/rag/query` - Query the system
- `/rag/memory` - Memory management
- `/rag/knowledge/update` - Update knowledge base
- `/rag/conversation/history` - Get chat history

### Configuration

#### Environment Variables
Make sure your `.env` file contains:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Excel Data Cleaning Scripts

A collection of simple Python scripts for cleaning Excel data, designed for college students learning data cleaning techniques.

### Scripts Overview

1. `create_data.py`
   - Creates a sample Excel file with common data issues
   - Includes missing values, duplicates, and formatting inconsistencies
   - Generates 'student_data.xlsx'

2. `remove_missing.py`
   - Removes rows with missing values
   - Creates 'student_data_clean.xlsx'

3. `remove_duplicate.py`
   - Removes exact duplicate rows
   - Creates 'student_data_no_duplicates.xlsx'

4. `standardize_format.py`
   - Standardizes text case
   - Removes extra spaces
   - Fixes typos
   - Creates 'student_data_standardized.xlsx'

## Dependencies
See requirements.txt for the complete list of dependencies. Main packages used:
- pandas
- numpy
- langchain
- langchain-openai
- langchain-community
- python-dotenv
- openai
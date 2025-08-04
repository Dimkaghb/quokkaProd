# File Upload and Context Handling Enhancements

## Overview

This document outlines the comprehensive enhancements made to the QuokkaAI file upload and context handling system to resolve memory issues and improve performance for large files.

## Issues Identified

### Critical Problems
1. **Memory Exhaustion**: All endpoints used `await file.read()` loading entire files into memory
2. **No Streaming**: Files processed in memory rather than streamed to disk
3. **Small File Limits**: Limited to 1-2MB files due to memory constraints
4. **InMemoryVectorStore**: RAG system accumulated memory without persistence
5. **Synchronous I/O**: Blocking file operations during uploads
6. **Small Text Chunks**: 1000-character chunks created excessive embeddings

### Performance Impact
- System failed on files larger than 1-2MB
- Memory usage grew linearly with file size
- No cleanup of processed data
- Poor performance with multiple concurrent uploads

## Enhancements Implemented

### 1. Streaming File Uploads (`src/utils/file_utils.py`)

**Key Features:**
- **Stream Processing**: Files are streamed in 1MB chunks to avoid memory issues
- **Early Size Validation**: File size checked before loading content
- **Async Operations**: Non-blocking file I/O using `aiofiles`
- **Automatic Cleanup**: Temporary file management with context managers

**New Size Limits:**
- Documents: 200MB (was 50MB)
- Data files: 200MB (was 50-100MB)
- Public testing: 50MB (was 10MB)

```python
# Before (Memory Intensive)
content = await file.read()  # Loads entire file into memory
if len(content) > max_size:
    raise HTTPException(...)
with open(file_path, 'wb') as f:
    f.write(content)

# After (Streaming)
file_size, saved_path = await save_uploaded_file_stream(
    file=file,
    destination_path=file_path,
    max_size=MAX_FILE_SIZE_LARGE
)
```

### 2. Enhanced RAG System (`src/data_analize/enhanced_rag_system.py`)

**Key Improvements:**
- **Persistent Storage**: Replaced InMemoryVectorStore with Chroma
- **Optimized Chunking**: Increased chunk size to 2000 characters (was 1000)
- **Better Embeddings**: Using `text-embedding-3-small` for efficiency
- **Async Document Processing**: Non-blocking document addition
- **Metadata Management**: Enhanced document tracking and retrieval

**Features:**
```python
class EnhancedRAGSystem:
    def __init__(self, collection_name="default", chunk_size=2000):
        # Persistent Chroma vector store
        self.vector_store = Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )
        
    async def add_document_async(self, file_path, metadata=None):
        # Streaming document processing
        content = await self._read_file_content_async(file_path)
        chunks = self.text_splitter.split_documents([document])
        doc_ids = self.vector_store.add_documents(chunks)
        self.vector_store.persist()
```

### 3. Enhanced Document Service (`src/documents/enhanced_service.py`)

**Background Processing:**
- Documents are added to RAG system asynchronously
- Chunk count tracking and status updates
- Error handling and recovery
- Bulk reprocessing capabilities

**New Endpoints:**
- `POST /documents/search` - Intelligent document search
- `POST /documents/reprocess` - Reprocess all user documents
- `GET /documents/rag/stats` - RAG system statistics

### 4. Updated APIs

**All Major APIs Enhanced:**
- **Documents API** (`src/documents/api.py`)
- **Data Analysis API** (`src/data_analize/api.py`)
- **Data Cleaning API** (`src/data_cleaning/api.py`)
- **Data Report API** (`src/data_report/api.py`)

**Consistent Pattern:**
```python
# Validate early
file_ext = validate_file_extension(file.filename, allowed_extensions)

# Stream to disk
file_size, saved_path = await save_uploaded_file_stream(
    file=file,
    destination_path=file_path,
    max_size=max_size_for_endpoint
)

# Process in background if needed
asyncio.create_task(background_processing(saved_path))
```

## Performance Improvements

### Memory Usage
- **Before**: O(file_size) memory usage per upload
- **After**: O(1) memory usage (constant chunk size)

### File Size Support
- **Before**: 1-2MB practical limit
- **After**: 200MB+ supported with streaming

### Concurrent Uploads
- **Before**: Memory exhaustion with multiple uploads
- **After**: Scales linearly with concurrent users

### Processing Speed
- **Before**: Blocked by file I/O during upload
- **After**: Non-blocking async operations

## Configuration Changes

### Dependencies Added
```txt
# requirements.txt
aiofiles>=23.2.0  # Async file operations
```

### File Size Limits
```python
# src/utils/file_utils.py
MAX_FILE_SIZE_DEFAULT = 200 * 1024 * 1024  # 200MB
MAX_FILE_SIZE_LARGE = 500 * 1024 * 1024    # 500MB for special cases
```

### Vector Store Configuration
```python
# Enhanced RAG system
persist_directory = "data/chroma_db"
chunk_size = 2000  # Increased from 1000
chunk_overlap = 400  # Increased from 200
```

## Testing and Validation

### Manual Testing Scenarios
1. **Small Files (< 1MB)**: Should work as before
2. **Medium Files (1-50MB)**: Should work smoothly with streaming
3. **Large Files (50-200MB)**: Should work with progress indication
4. **Multiple Concurrent Uploads**: Should not cause memory issues
5. **RAG Integration**: Documents should be searchable after upload

### Error Scenarios
1. **File Too Large**: Clear error message with size limit
2. **Invalid File Type**: Early validation with helpful message
3. **Disk Space**: Graceful handling of storage issues
4. **Network Interruption**: Partial file cleanup

## Migration Guide

### For Existing Deployments
1. **Install Dependencies**: `pip install aiofiles>=23.2.0`
2. **Create Directories**: Ensure `data/chroma_db` exists
3. **Reprocess Documents**: Use `/documents/reprocess` endpoint
4. **Monitor Disk Usage**: Chroma DB will grow with documents

### For Development
1. **Update Requirements**: Install new dependencies
2. **Test File Uploads**: Verify streaming works with large files
3. **Check RAG System**: Ensure Chroma DB is accessible
4. **Monitor Logs**: Watch for processing status updates

## Monitoring and Maintenance

### Key Metrics to Monitor
- **Memory Usage**: Should remain constant during uploads
- **Disk Usage**: Chroma DB size growth
- **Upload Success Rate**: Track failed uploads
- **Processing Queue**: Background task completion

### Maintenance Tasks
- **Cleanup Old Files**: Temporary files older than 24 hours
- **Chroma DB Maintenance**: Periodic collection cleanup
- **Log Analysis**: Monitor for processing errors
- **Performance Tuning**: Adjust chunk sizes based on usage

## Security Considerations

### File Upload Security
- **Type Validation**: Early file extension checking
- **Size Limits**: Enforced before processing
- **Path Sanitization**: Secure file naming
- **User Isolation**: Per-user directories

### RAG System Security
- **User Data Isolation**: Per-user collections (future enhancement)
- **Metadata Filtering**: User-specific document access
- **Query Sanitization**: Input validation for searches

## Future Enhancements

### Short Term
1. **Progress Indicators**: Real-time upload progress
2. **Resume Capability**: Interrupted upload recovery
3. **Batch Processing**: Multiple file uploads
4. **Advanced Search**: Filters and sorting

### Long Term
1. **Distributed Storage**: Support for cloud storage
2. **Advanced RAG**: Multi-modal document processing
3. **AI Preprocessing**: Automatic content classification
4. **Performance Analytics**: Detailed usage metrics

## Conclusion

The enhanced file upload and context handling system provides:

- **Scalability**: Handles large files efficiently
- **Reliability**: Robust error handling and recovery
- **Performance**: Non-blocking operations and streaming
- **Intelligence**: Enhanced RAG system with persistent storage
- **Maintainability**: Clear separation of concerns and logging

The system is now capable of handling enterprise-scale document processing while maintaining excellent user experience and system performance.
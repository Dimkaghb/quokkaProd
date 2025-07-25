"""
API endpoints for the data analysis and visualization module.
"""

import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
import shutil
import uuid
import os
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from src.auth.dependencies import get_current_user
from src.auth.models import User

from .visualization import create_intelligent_visualization, read_data, customize_visualization, process_data_with_llm
from .data_analyzer import analyze_data_with_ai, create_visualization_from_query

# Import chat service for thread creation
try:
    from src.chat.service import create_new_thread
    CHAT_AVAILABLE = True
except ImportError:
    CHAT_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Chat service not available - threads will not be created")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data-analysis", tags=["data-analysis"])

# Configuration
DOCUMENTS_BASE_FOLDER = Path("data/documents")
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv', 'pdf', 'txt', 'docx'}

# Create base documents directory if it doesn't exist
DOCUMENTS_BASE_FOLDER.mkdir(parents=True, exist_ok=True)

def get_user_documents_folder(user_id: str) -> Path:
    """Get user-specific documents folder path."""
    user_folder = DOCUMENTS_BASE_FOLDER / f"user_{user_id}"
    user_folder.mkdir(parents=True, exist_ok=True)
    return user_folder


class VisualizationRequest(BaseModel):
    """Request model for visualization creation."""
    file_path: str = Field(description="Path to the data file")
    chart_type: Optional[str] = Field(default=None, description="Specific chart type to create")
    query: Optional[str] = Field(default="", description="User query for context")


class DataAnalysisRequest(BaseModel):
    """Request model for data analysis."""
    file_path: str = Field(description="Path to the data file")
    user_query: Optional[str] = Field(default="", description="User query for context")


class CustomVisualizationRequest(BaseModel):
    """Request model for custom visualization based on user query."""
    file_path: Optional[str] = Field(default=None, description="Path to the data file")
    user_query: str = Field(description="User's question or request")
    selected_columns: Optional[List[str]] = Field(default=None, description="Selected columns to focus on")
    current_data: Optional[List[Dict[str, Any]]] = Field(default=None, description="Current data for customization")


class VisualizationResponse(BaseModel):
    """Response model for visualization creation."""
    success: bool = Field(description="Whether the visualization was created successfully")
    chart_config: Optional[Dict[str, Any]] = Field(default=None, description="Recharts configuration")
    analytical_text: Optional[str] = Field(default=None, description="AI-generated analysis")
    error: Optional[str] = Field(default=None, description="Error message if any")
    file_info: Optional[Dict[str, Any]] = Field(default=None, description="Information about the processed file")
    thread_id: Optional[str] = Field(default=None, description="Associated chat thread ID")


class DataAnalysisResponse(BaseModel):
    """Response model for data analysis."""
    success: bool = Field(description="Whether the analysis was completed successfully")
    complexity_score: Optional[float] = Field(default=None, description="Data complexity score (0-10)")
    summary: Optional[str] = Field(default=None, description="AI-generated summary")
    recommendations: Optional[List[Dict[str, Any]]] = Field(default=None, description="Visualization recommendations")
    suggested_questions: Optional[List[str]] = Field(default=None, description="Suggested questions for the data")
    column_info: Optional[Dict[str, Any]] = Field(default=None, description="Column analysis information")
    error: Optional[str] = Field(default=None, description="Error message if any")


class LargeDataClarificationRequest(BaseModel):
    """Request model for large dataset clarification."""
    file_path: str = Field(description="Path to the data file")
    user_clarification: str = Field(description="User's clarification about what to visualize")
    selected_columns: Optional[List[str]] = Field(default=None, description="Specific columns user wants to focus on")


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@router.post("/upload", response_model=VisualizationResponse)
async def upload_and_visualize(
    file: UploadFile = File(...),
    user_query: str = Form(""),
    current_user: User = Depends(get_current_user)
) -> VisualizationResponse:
    """
    Upload a file and create intelligent visualization with optional user query.
    
    Args:
        file: Uploaded file (CSV, Excel, PDF, TXT, DOCX)
        user_query: Optional user query for customization
        current_user: Current authenticated user
        
    Returns:
        Visualization configuration and analysis
    """
    try:
        logger.info(f"Received file upload: {file.filename} with query: '{user_query}' for user {current_user.id}")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail='No file selected')
        
        if not allowed_file(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            )
        
        # Generate unique ID for this upload
        file_id = str(uuid.uuid4())
        logger.info(f"Generated file ID: {file_id}")
        
        # Get user-specific documents folder
        user_folder = get_user_documents_folder(str(current_user.id))
        
        # Save uploaded file to user's documents folder
        file_path = user_folder / f'{file_id}_{file.filename}'
        logger.info(f"Saving file to: {file_path}")
        
        # Read file content
        content = await file.read()
        
        # Validate file size (limit to 50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        if len(content) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
            )
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(content)
        
        logger.info(f"File saved successfully, creating visualization...")
        
        # Create intelligent visualization using the enhanced system
        chart_config = create_intelligent_visualization(str(file_path), user_query)
        
        # Check if we need user clarification for large datasets
        if chart_config.get('needs_clarification'):
            logger.info(f"Large dataset detected, requesting user clarification")
            
            # Prepare file info
            file_info = {
                'filename': file.filename,
                'size': len(content),
                'type': file.filename.split('.')[-1].lower(),
                'upload_time': datetime.utcnow().isoformat(),
                'file_id': file_id,
                'user_id': str(current_user.id)
            }
            
            return VisualizationResponse(
                success=True,
                chart_config=chart_config,
                analytical_text=chart_config.get('message'),
                file_info=file_info
            )
        
        logger.info(f"Visualization created successfully")
        
        # Prepare file info
        file_info = {
            'filename': file.filename,
            'size': len(content),
            'type': file.filename.split('.')[-1].lower(),
            'upload_time': datetime.utcnow().isoformat(),
            'file_id': file_id,
            'user_id': str(current_user.id)
        }
        
        # Create a chat thread for this analysis if user is authenticated and chat is available
        thread_id = None
        if current_user and CHAT_AVAILABLE:
            try:
                thread_title = f"Data Analysis: {file.filename}"
                first_message = f"I've uploaded and analyzed the file '{file.filename}'. Here's what I found:"
                thread = await create_new_thread(
                    user_id=str(current_user.id),
                    first_message=first_message,
                    selected_documents=[]
                )
                thread_id = thread.id
                logger.info(f"Created thread {thread_id} for data analysis")
            except Exception as e:
                logger.warning(f"Failed to create thread: {e}")
        
        return VisualizationResponse(
            success=True,
            chart_config=chart_config,
            analytical_text=chart_config.get('analytical_text', 'Analysis completed successfully'),
            file_info=file_info,
            thread_id=thread_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload_and_visualize: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/visualize", response_model=VisualizationResponse)
async def create_visualization(
    request: VisualizationRequest,
    current_user: User = Depends(get_current_user)
) -> VisualizationResponse:
    """
    Create visualization from existing file.
    
    Args:
        request: Visualization request with file path and optional query
        current_user: Current authenticated user
        
    Returns:
        Visualization configuration and analysis
    """
    try:
        logger.info(f"Creating visualization for file: {request.file_path}")
        
        # Check if file exists
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Create visualization using the new simplified system
        chart_config = create_intelligent_visualization(request.file_path, request.query)
        
        logger.info(f"Visualization created successfully")
        
        return VisualizationResponse(
            success=True,
            chart_config=chart_config,
            analytical_text=chart_config.get('analyticalText')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_visualization: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return VisualizationResponse(
            success=False,
            error=str(e)
        )


@router.get("/files")
async def list_uploaded_files(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """List all uploaded files for the current user."""
    try:
        files = []
        
        # Get user-specific documents folder
        user_folder = get_user_documents_folder(str(current_user.id))
        
        if user_folder.exists():
            for file_path in user_folder.iterdir():
                if file_path.is_file():
                    stat = file_path.stat()
                    files.append({
                        'filename': file_path.name,
                        'size': stat.st_size,
                        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        'path': str(file_path),
                        'user_id': str(current_user.id)
                    })
        
        return {
            'success': True,
            'files': files,
            'total_count': len(files),
            'user_id': str(current_user.id)
        }
        
    except Exception as e:
        logger.error(f"Error listing files for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list files")


@router.delete("/files/{filename}")
async def delete_file(
    filename: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Delete an uploaded file for the current user."""
    try:
        # Get user-specific documents folder
        user_folder = get_user_documents_folder(str(current_user.id))
        file_path = user_folder / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify the file belongs to the user's folder (security check)
        if not str(file_path).startswith(str(user_folder)):
            raise HTTPException(status_code=403, detail="Access denied")
        
        file_path.unlink()
        logger.info(f"Deleted file {filename} for user {current_user.id}")
        
        return {
            'success': True,
            'message': f'File {filename} deleted successfully',
            'user_id': str(current_user.id)
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file {filename} for user {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete file")


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "data-analysis"}


@router.get("/supported-formats")
async def get_supported_formats() -> Dict[str, Any]:
    """Get list of supported file formats."""
    return {
        'success': True,
        'formats': list(ALLOWED_EXTENSIONS),
        'descriptions': {
            'csv': 'Comma-separated values',
            'xlsx': 'Excel spreadsheet',
            'xls': 'Excel spreadsheet (legacy)',
            'pdf': 'Portable Document Format',
            'txt': 'Plain text file',
            'docx': 'Microsoft Word document'
        }
    }


@router.post("/analyze", response_model=DataAnalysisResponse)
async def analyze_data(
    request: DataAnalysisRequest,
    current_user: User = Depends(get_current_user)
) -> DataAnalysisResponse:
    """
    Analyze data file and provide intelligent recommendations.
    
    Args:
        request: Data analysis request
        current_user: Current authenticated user
        
    Returns:
        Data analysis with recommendations and suggested questions
    """
    try:
        logger.info(f"Analyzing data file: {request.file_path} for user {current_user.id}")
        
        # Get user-specific documents folder
        user_folder = get_user_documents_folder(str(current_user.id))
        
        # Construct full file path and validate it's within user's folder
        file_path = Path(request.file_path)
        if not file_path.is_absolute():
            # If relative path, assume it's relative to user's folder
            full_file_path = user_folder / file_path
        else:
            full_file_path = file_path
        
        # Security check: ensure file is within user's folder
        if not str(full_file_path).startswith(str(user_folder)):
            raise HTTPException(status_code=403, detail="Access denied: File not in user's folder")
        
        # Check if file exists
        if not full_file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read data
        data = read_data(str(full_file_path))
        
        # Perform AI analysis
        analysis = analyze_data_with_ai(data, request.user_query)
        
        # Convert recommendations to dict format
        recommendations = []
        for rec in analysis.recommendations:
            recommendations.append({
                "chart_type": rec.chart_type,
                "columns": rec.columns,
                "description": rec.description,
                "confidence": rec.confidence,
                "reasoning": rec.reasoning
            })
        
        logger.info(f"Analysis completed successfully for user {current_user.id}")
        
        return DataAnalysisResponse(
            success=True,
            complexity_score=analysis.complexity_score,
            summary=analysis.summary,
            recommendations=recommendations,
            suggested_questions=analysis.suggested_questions,
            column_info=analysis.column_analysis
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in analyze_data for user {current_user.id}: {str(e)}")
        return DataAnalysisResponse(
            success=False,
            error=str(e)
        )


@router.post("/custom-visualization", response_model=VisualizationResponse)
async def create_custom_visualization(
    request: CustomVisualizationRequest,
    current_user: User = Depends(get_current_user)
) -> VisualizationResponse:
    """
    Create custom visualization based on user query.
    Now supports both file-based and data-based customization.
    
    Args:
        request: Custom visualization request
        current_user: Current authenticated user
        
    Returns:
        Custom visualization configuration and analysis
    """
    try:
        logger.info(f"Creating custom visualization for query: {request.user_query} for user {current_user.id}")
        
        # Case 1: File-based customization
        if request.file_path:
            # Get user-specific documents folder
            user_folder = get_user_documents_folder(str(current_user.id))
            
            # Construct full file path and validate it's within user's folder
            file_path = Path(request.file_path)
            if not file_path.is_absolute():
                # If relative path, assume it's relative to user's folder
                full_file_path = user_folder / file_path
            else:
                full_file_path = file_path
            
            # Security check: ensure file is within user's folder
            if not str(full_file_path).startswith(str(user_folder)):
                raise HTTPException(status_code=403, detail="Access denied: File not in user's folder")
            
            # Check if file exists
            if not full_file_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            # Read data and create visualization
            data = read_data(str(full_file_path))
            chart_config = process_data_with_llm(data, request.user_query, str(full_file_path))
            
            # Check if we need user clarification for large datasets
            if chart_config.get('needs_clarification'):
                logger.info(f"Large dataset detected, requesting user clarification")
                return VisualizationResponse(
                    success=True,
                    chart_config=chart_config,
                    analytical_text=chart_config.get('message')
                )
            
        # Case 2: Data-based customization (for existing visualizations)
        elif request.current_data:
            # Convert data to DataFrame
            import pandas as pd
            data = pd.DataFrame(request.current_data)
            chart_config = customize_visualization(data, request.user_query)
            
        else:
            raise HTTPException(status_code=400, detail="Either file_path or current_data must be provided")
        
        logger.info(f"Custom visualization created successfully for user {current_user.id}")
        
        return VisualizationResponse(
            success=True,
            chart_config=chart_config,
            analytical_text=chart_config.get('analytical_text')
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_custom_visualization for user {current_user.id}: {str(e)}")
        return VisualizationResponse(
            success=False,
            error=str(e)
        ) 


@router.post("/clarify-large-data", response_model=VisualizationResponse)
async def clarify_large_data_visualization(
    request: LargeDataClarificationRequest,
    current_user: User = Depends(get_current_user)
) -> VisualizationResponse:
    """
    Handle user clarification for large dataset visualization.
    
    Args:
        request: Large data clarification request
        current_user: Current authenticated user
        
    Returns:
        Visualization configuration based on user clarification
    """
    try:
        logger.info(f"Processing large data clarification: {request.user_clarification} for user {current_user.id}")
        
        # Get user-specific documents folder
        user_folder = get_user_documents_folder(str(current_user.id))
        
        # Construct full file path and validate it's within user's folder
        file_path = Path(request.file_path)
        if not file_path.is_absolute():
            # If relative path, assume it's relative to user's folder
            full_file_path = user_folder / file_path
        else:
            full_file_path = file_path
        
        # Security check: ensure file is within user's folder
        if not str(full_file_path).startswith(str(user_folder)):
            raise HTTPException(status_code=403, detail="Access denied: File not in user's folder")
        
        # Check if file exists
        if not full_file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read data
        data = read_data(str(full_file_path))
        logger.info(f"Data loaded: {data.shape} rows x {data.shape[1]} columns")
        
        # If user specified columns, filter the data
        if request.selected_columns:
            # Validate columns exist
            missing_columns = [col for col in request.selected_columns if col not in data.columns]
            if missing_columns:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Columns not found: {missing_columns}"
                )
            
            # Filter data to selected columns
            data = data[request.selected_columns]
            logger.info(f"Data filtered to selected columns: {data.shape}")
        
        # Process with LLM using user's clarification
        chart_config = process_data_with_llm(data, request.user_clarification, str(full_file_path))
        
        # Prepare file info
        file_name = full_file_path.name
        file_info = {
            'filename': file_name,
            'filtered_columns': request.selected_columns,
            'resulting_shape': data.shape,
            'user_id': str(current_user.id)
        }
        
        logger.info(f"Large data visualization created successfully for user {current_user.id}")
        
        return VisualizationResponse(
            success=True,
            chart_config=chart_config,
            analytical_text=chart_config.get('analytical_text'),
            file_info=file_info
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in clarify_large_data_visualization for user {current_user.id}: {str(e)}")
        return VisualizationResponse(
            success=False,
            error=str(e)
        )
        
        return VisualizationResponse(
            success=True,
            chart_config=chart_config,
            analytical_text=chart_config.get('analyticalText'),
            file_info=file_info
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in clarify_large_data_visualization: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return VisualizationResponse(
            success=False,
            error=str(e)
        )
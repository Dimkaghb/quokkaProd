"""
FastAPI router for data report operations.
"""

import logging
import asyncio
from typing import List, Optional
from pathlib import Path
import os
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import HTTPBearer

from src.auth.dependencies import get_current_user
from src.auth.models import User

from .models import (
    DataReportResponse, ReportListResponse, ReportStatusResponse,
    FileUploadResponse, AnalysisConfig, ReportStatus, DataReportRequest
)
from .service import get_data_report_service
from .utils import (
    validate_file_type, validate_file_size, save_uploaded_file,
    get_content_type, ensure_directories_exist, get_report_file_path,
    cleanup_temp_files, generate_unique_id, get_file_path_from_id
)

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/data-report", tags=["data-report"])

# Security
security = HTTPBearer()

# Ensure directories exist on module load
ensure_directories_exist()


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    file_type: str = Form(..., description="Type of file: 'preview' or 'data'"),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a file for data report generation.
    
    Args:
        file: The uploaded file
        file_type: Type of file ('preview' or 'data')
        current_user: Authenticated user
        
    Returns:
        File upload response with file ID
    """
    try:
        # Validate file type
        if file_type not in ['preview', 'data']:
            raise HTTPException(
                status_code=400,
                detail="file_type must be 'preview' or 'data'"
            )
        
        # Validate file extension
        if not validate_file_type(file.filename, file_type):
            allowed_exts = "PDF, DOCX, TXT, MD" if file_type == 'preview' else "CSV, XLSX, XLS, JSON, TSV"
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type for {file_type} file. Allowed: {allowed_exts}"
            )
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validate file size
        if not validate_file_size(file_size, file_type):
            max_size = "50MB" if file_type == 'preview' else "100MB"
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size for {file_type} files: {max_size}"
            )
        
        # Save file
        file_id, file_path = save_uploaded_file(
            file_content, file.filename, str(current_user.id), file_type
        )
        
        logger.info(f"File uploaded successfully: {file.filename} -> {file_id}")
        
        return FileUploadResponse(
            success=True,
            message="File uploaded successfully",
            file_id=file_id,
            filename=file.filename,
            file_size=file_size
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.post("/generate", response_model=DataReportResponse)
async def generate_report(
    request: DataReportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a data report from uploaded files.
    
    Args:
        request: Report generation request
        background_tasks: FastAPI background tasks
        current_user: Current authenticated user
        
    Returns:
        Report generation response with report ID
    """
    try:
        # Convert file IDs to file paths
        preview_file_path = None
        data_file_path = None
        
        if request.preview_file_id:
            preview_file_path = get_file_path_from_id(request.preview_file_id, str(current_user.id), "preview")
            if not preview_file_path:
                raise HTTPException(status_code=404, detail=f"Preview file not found: {request.preview_file_id}")
        
        if request.data_file_id:
            data_file_path = get_file_path_from_id(request.data_file_id, str(current_user.id), "data")
            if not data_file_path:
                raise HTTPException(status_code=404, detail=f"Data file not found: {request.data_file_id}")
        
        # Validate file paths exist
        if data_file_path and not os.path.exists(data_file_path):
            raise HTTPException(status_code=404, detail="Data file not found")
        
        if preview_file_path and not os.path.exists(preview_file_path):
            raise HTTPException(status_code=404, detail="Preview file not found")
        
        # Create AnalysisConfig from request fields
        analysis_config = AnalysisConfig(
            llm_provider=request.llm_provider,
            model_name=request.llm_model,
            temperature=0.7,  # Default value
            max_tokens=None,  # Default value
            include_visualizations=True,  # Default value
            analysis_depth="comprehensive"  # Default value
        )
        
        # Get API key from environment or request
        api_key = None
        if request.llm_provider == 'openai':
            api_key = request.openai_api_key or os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise HTTPException(
                    status_code=400,
                    detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable or provide it in the request."
                )
        elif request.llm_provider == 'anthropic':
            api_key = request.anthropic_api_key or os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                raise HTTPException(
                    status_code=400,
                    detail="Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable or provide it in the request."
                )
        elif request.llm_provider == 'ollama':
            # Ollama doesn't require API key, but check if service is available
            pass
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported LLM provider: {request.llm_provider}"
            )
        
        # Generate unique report ID
        report_id = generate_unique_id()
        
        # Get service instance
        service = get_data_report_service()
        
        # Start report generation in background
        background_tasks.add_task(
            service.generate_report,
            report_id=report_id,
            user_id=str(current_user.id),
            preview_file_path=preview_file_path,
            data_file_path=data_file_path,
            analysis_config=analysis_config,
            api_key=api_key
        )
        
        logger.info(f"Report generation started: {report_id}")
        
        return DataReportResponse(
            success=True,
            report_id=report_id,
            status=ReportStatus.PENDING,
            message="Report generation started"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting report generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start report generation: {str(e)}")


@router.get("/status/{report_id}", response_model=ReportStatusResponse)
async def get_report_status(
    report_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get the status of a report generation.
    
    Args:
        report_id: Report identifier
        current_user: Authenticated user
        
    Returns:
        Report status response
    """
    try:
        service = get_data_report_service()
        status_info = service.get_report_status(report_id, str(current_user.id))
        
        return ReportStatusResponse(
            report_id=report_id,
            status=status_info.get('status', ReportStatus.FAILED),
            message=status_info.get('message', 'Unknown status'),
            progress=status_info.get('progress'),
            created_at=status_info.get('metadata', {}).get('created_at', datetime.now()),
            completed_at=status_info.get('metadata', {}).get('completed_at'),
            download_url=f"/api/data-report/download/{report_id}" if status_info.get('file_path') else None,
            error_details=status_info.get('error')
        )
        
    except Exception as e:
        logger.error(f"Error getting report status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get report status: {str(e)}")


@router.get("/list", response_model=ReportListResponse)
async def list_reports(
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user)
):
    """
    List reports for the current user.
    
    Args:
        page: Page number (1-based)
        page_size: Number of reports per page
        current_user: Authenticated user
        
    Returns:
        Paginated list of reports
    """
    try:
        service = get_data_report_service()
        result = service.list_user_reports(str(current_user.id), page, page_size)
        
        return ReportListResponse(**result)
        
    except Exception as e:
        logger.error(f"Error listing reports: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list reports: {str(e)}")


@router.get("/download/{report_id}")
async def download_report(
    report_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Download a generated report.
    
    Args:
        report_id: Report identifier
        current_user: Authenticated user
        
    Returns:
        File response with the report
    """
    try:
        file_path = get_report_file_path(report_id, str(current_user.id))
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Report file not found")
        
        # Get filename for download
        filename = f"data_report_{report_id}.docx"
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download report: {str(e)}")


@router.delete("/delete/{report_id}")
async def delete_report(
    report_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a report and its associated files.
    
    Args:
        report_id: Report identifier
        current_user: Authenticated user
        
    Returns:
        Success response
    """
    try:
        service = get_data_report_service()
        success = service.delete_report(report_id, str(current_user.id))
        
        if not success:
            raise HTTPException(status_code=404, detail="Report not found or could not be deleted")
        
        return JSONResponse(
            content={"message": "Report deleted successfully"},
            status_code=200
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete report: {str(e)}")


@router.post("/cleanup")
async def cleanup_user_files(
    older_than_hours: int = 24,
    current_user: User = Depends(get_current_user)
):
    """
    Clean up old temporary files for the current user.
    
    Args:
        older_than_hours: Remove files older than this many hours
        current_user: Authenticated user
        
    Returns:
        Cleanup result
    """
    try:
        cleaned_count = cleanup_temp_files(str(current_user.id), older_than_hours)
        
        return JSONResponse(
            content={
                "message": f"Cleanup completed. Removed {cleaned_count} files.",
                "files_removed": cleaned_count
            },
            status_code=200
        )
        
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats."""
    return {
        "success": True,
        "preview_formats": ["pdf", "docx", "txt", "md"],
        "data_formats": ["csv", "xlsx", "xls", "json", "tsv"]
    }
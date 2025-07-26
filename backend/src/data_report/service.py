"""Data report service implementation."""

import asyncio
import logging
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

from .models import ReportStatus, AnalysisConfig, ReportMetadata
from .utils import (
    save_report_metadata, load_report_metadata, get_report_file_path,
    get_user_reports_dir, format_file_size, cleanup_temp_files
)

# Import the existing data analysis tool components
from .data_analysis_tool import FileExtractor, StructurePreview, LLMAnalyzer, DocxGenerator

logger = logging.getLogger(__name__)


class DataReportService:
    """Service for handling data report generation and management."""
    
    def __init__(self):
        self.file_extractor = FileExtractor()
        self.structure_preview = StructurePreview()
        self.active_reports: Dict[str, Dict] = {}
    
    async def generate_report(
        self,
        report_id: str,
        user_id: str,
        preview_file_path: str,
        data_file_path: str,
        analysis_config: AnalysisConfig,
        api_key: Optional[str] = None
    ) -> bool:
        """
        Generate a data report asynchronously.
        
        Args:
            report_id: Unique report identifier
            user_id: User identifier
            preview_file_path: Path to the preview/template file
            data_file_path: Path to the data file to analyze
            analysis_config: Configuration for analysis
            api_key: API key for LLM service
            
        Returns:
            Success status
        """
        try:
            # Initialize report status
            self.active_reports[report_id] = {
                'status': ReportStatus.PENDING,
                'progress': 0,
                'message': 'Starting report generation...',
                'user_id': user_id,
                'created_at': datetime.now()
            }
            
            # Save initial metadata
            preview_file_info = {
                "file_path": preview_file_path,
                "file_name": os.path.basename(preview_file_path) if preview_file_path else None,
                "file_size": os.path.getsize(preview_file_path) if preview_file_path and os.path.exists(preview_file_path) else None
            }
            
            data_file_info = {
                "file_path": data_file_path,
                "file_name": os.path.basename(data_file_path),
                "file_size": os.path.getsize(data_file_path) if os.path.exists(data_file_path) else None
            }
            
            generation_stats = {
                "status": ReportStatus.PENDING,
                "start_time": datetime.now().isoformat(),
                "progress": 0
            }
            
            metadata = ReportMetadata(
                report_id=report_id,
                user_id=user_id,
                preview_file_info=preview_file_info,
                data_file_info=data_file_info,
                analysis_config=analysis_config,
                generation_stats=generation_stats,
                created_at=datetime.now()
            )
            save_report_metadata(report_id, user_id, metadata.dict())
            
            # Update progress
            await self._update_progress(report_id, 10, "Extracting structure template...")
            
            # Step 1: Extract structure from preview file
            structure_template = ""
            if preview_file_path and os.path.exists(preview_file_path):
                try:
                    structure_info = self.structure_preview.extract_structure_from_file(preview_file_path)
                    structure_template = self.structure_preview.generate_structure_prompt()
                    logger.info(f"Structure template extracted from {preview_file_path}")
                except Exception as e:
                    logger.warning(f"Could not extract structure template: {str(e)}")
                    structure_template = ""
            
            await self._update_progress(report_id, 30, "Extracting data file content...")
            
            # Step 2: Extract content from data file
            if not os.path.exists(data_file_path):
                raise FileNotFoundError(f"Data file not found: {data_file_path}")
            
            content = self.file_extractor.extract_file_content(data_file_path)
            if not content:
                raise ValueError("Could not extract content from data file")
            
            await self._update_progress(report_id, 50, "Analyzing data with LLM...")
            
            # Step 3: Analyze content with LLM
            analyzer = LLMAnalyzer(
                api_key=api_key,
                api_provider=analysis_config.llm_provider
            )
            
            analysis = analyzer.analyze_content(
                content=content,
                file_path=data_file_path,
                structure_template=structure_template
            )
            
            if not analysis:
                raise ValueError("LLM analysis failed or returned empty result")
            
            await self._update_progress(report_id, 80, "Generating DOCX report...")
            
            # Step 4: Generate DOCX report
            report_file_path = await self._generate_docx_report(
                report_id, user_id, analysis, data_file_path, preview_file_path
            )
            
            await self._update_progress(report_id, 100, "Report generation completed")
            
            # Update final status
            self.active_reports[report_id].update({
                'status': ReportStatus.COMPLETED,
                'message': 'Report generated successfully',
                'file_path': report_file_path,
                'completed_at': datetime.now()
            })
            
            # Update metadata
            metadata.generation_stats.update({
                "status": ReportStatus.COMPLETED,
                "end_time": datetime.now().isoformat(),
                "progress": 100
            })
            metadata.completed_at = datetime.now()
            metadata.file_path = report_file_path
            if os.path.exists(report_file_path):
                metadata.file_size = os.path.getsize(report_file_path)
            save_report_metadata(report_id, user_id, metadata.dict())
            
            logger.info(f"Report {report_id} generated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error generating report {report_id}: {str(e)}")
            
            # Update error status
            self.active_reports[report_id] = {
                'status': ReportStatus.FAILED,
                'message': f'Report generation failed: {str(e)}',
                'error': str(e),
                'user_id': user_id,
                'created_at': self.active_reports.get(report_id, {}).get('created_at', datetime.now())
            }
            
            # Update metadata
            try:
                metadata.generation_stats.update({
                    "status": ReportStatus.FAILED,
                    "end_time": datetime.now().isoformat(),
                    "error": str(e)
                })
                save_report_metadata(report_id, user_id, metadata.dict())
            except Exception as metadata_error:
                logger.error(f"Failed to update metadata: {str(metadata_error)}")
                # Fallback: try to load and update existing metadata
                try:
                    existing_metadata = load_report_metadata(report_id, user_id)
                    if existing_metadata:
                        existing_metadata['generation_stats'] = {
                            "status": ReportStatus.FAILED,
                            "end_time": datetime.now().isoformat(),
                            "error": str(e)
                        }
                        save_report_metadata(report_id, user_id, existing_metadata)
                except Exception:
                    pass
            
            return False
    
    async def _update_progress(self, report_id: str, progress: int, message: str):
        """Update report progress."""
        if report_id in self.active_reports:
            self.active_reports[report_id].update({
                'progress': progress,
                'message': message
            })
        
        # Small delay to allow for async processing
        await asyncio.sleep(0.1)
    
    async def _generate_docx_report(
        self,
        report_id: str,
        user_id: str,
        analysis: str,
        data_file_path: str,
        preview_file_path: Optional[str] = None
    ) -> str:
        """Generate DOCX report from analysis."""
        try:
            # Create reports directory for user
            reports_dir = get_user_reports_dir(user_id)
            reports_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            data_file_name = Path(data_file_path).stem
            docx_filename = f"data_report_{data_file_name}_{timestamp}.docx"
            docx_path = reports_dir / docx_filename
            
            # Generate DOCX using the existing generator
            generator = DocxGenerator()
            
            # Add header
            data_file_display = Path(data_file_path).name
            preview_file_display = Path(preview_file_path).name if preview_file_path else "No template"
            
            generator.add_header(
                "Comprehensive Data Analysis Report",
                f"Analysis of {data_file_display} | Template: {preview_file_display}"
            )
            
            # Add metadata section
            metadata_content = f"""
## Report Information

- **Report ID**: {report_id}
- **Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **Data File**: {data_file_display}
- **Template File**: {preview_file_display}
- **File Size**: {format_file_size(os.path.getsize(data_file_path))}

---

"""
            
            # Parse and format the analysis content
            full_content = metadata_content + analysis
            generator.parse_and_format_content(full_content)
            
            # Save the document
            final_path = generator.save_document(str(docx_path))
            
            logger.info(f"DOCX report saved to: {final_path}")
            return final_path
            
        except Exception as e:
            logger.error(f"Error generating DOCX report: {str(e)}")
            raise
    
    def get_report_status(self, report_id: str, user_id: str) -> Dict[str, Any]:
        """Get the status of a report generation."""
        try:
            # Check active reports first
            if report_id in self.active_reports:
                report_info = self.active_reports[report_id].copy()
                
                # Verify user access
                if report_info.get('user_id') != user_id:
                    raise PermissionError("Access denied to this report")
                
                return report_info
            
            # Check saved metadata
            metadata = load_report_metadata(report_id, user_id)
            if metadata:
                status_info = {
                    'status': metadata.get('status', ReportStatus.FAILED),
                    'message': 'Report completed' if metadata.get('status') == ReportStatus.COMPLETED else 'Report failed',
                    'metadata': metadata
                }
                
                # Add file path if available
                if metadata.get('file_path') and os.path.exists(metadata['file_path']):
                    status_info['file_path'] = metadata['file_path']
                
                return status_info
            
            # Report not found
            return {
                'status': ReportStatus.FAILED,
                'message': 'Report not found',
                'error': 'Report ID not found or access denied'
            }
            
        except Exception as e:
            logger.error(f"Error getting report status: {str(e)}")
            return {
                'status': ReportStatus.FAILED,
                'message': 'Error retrieving report status',
                'error': str(e)
            }
    
    def list_user_reports(self, user_id: str, page: int = 1, page_size: int = 10) -> Dict[str, Any]:
        """List reports for a user with pagination."""
        try:
            reports_dir = get_user_reports_dir(user_id)
            
            if not reports_dir.exists():
                return {
                    'reports': [],
                    'total': 0,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': 0
                }
            
            # Get all metadata files
            metadata_files = list(reports_dir.glob("*.metadata.json"))
            
            reports = []
            for metadata_file in metadata_files:
                try:
                    report_id = metadata_file.stem.replace('.metadata', '')
                    metadata = load_report_metadata(report_id, user_id)
                    
                    if metadata:
                        report_item = {
                            'report_id': report_id,
                            'status': metadata.get('status', ReportStatus.FAILED),
                            'created_at': metadata.get('created_at'),
                            'completed_at': metadata.get('completed_at'),
                            'data_file_name': Path(metadata.get('data_file_path', '')).name,
                            'preview_file_name': Path(metadata.get('preview_file_path', '')).name if metadata.get('preview_file_path') else None,
                            'file_size': None
                        }
                        
                        # Add file size if report file exists
                        if metadata.get('file_path') and os.path.exists(metadata['file_path']):
                            report_item['file_size'] = os.path.getsize(metadata['file_path'])
                            report_item['download_available'] = True
                        else:
                            report_item['download_available'] = False
                        
                        reports.append(report_item)
                        
                except Exception as e:
                    logger.warning(f"Error loading metadata for {metadata_file}: {str(e)}")
                    continue
            
            # Sort by creation date (newest first)
            reports.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
            
            # Pagination
            total = len(reports)
            total_pages = (total + page_size - 1) // page_size
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paginated_reports = reports[start_idx:end_idx]
            
            return {
                'reports': paginated_reports,
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages
            }
            
        except Exception as e:
            logger.error(f"Error listing user reports: {str(e)}")
            return {
                'reports': [],
                'total': 0,
                'page': page,
                'page_size': page_size,
                'total_pages': 0,
                'error': str(e)
            }
    
    def delete_report(self, report_id: str, user_id: str) -> bool:
        """Delete a report and its associated files."""
        try:
            # Load metadata to get file paths
            metadata = load_report_metadata(report_id, user_id)
            if not metadata:
                return False
            
            reports_dir = get_user_reports_dir(user_id)
            
            # Delete report file
            if metadata.get('file_path') and os.path.exists(metadata['file_path']):
                os.remove(metadata['file_path'])
                logger.info(f"Deleted report file: {metadata['file_path']}")
            
            # Delete metadata file
            metadata_file = reports_dir / f"{report_id}.metadata.json"
            if metadata_file.exists():
                metadata_file.unlink()
                logger.info(f"Deleted metadata file: {metadata_file}")
            
            # Remove from active reports if present
            if report_id in self.active_reports:
                del self.active_reports[report_id]
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting report {report_id}: {str(e)}")
            return False
    



# Singleton instance
_data_report_service = None


def get_data_report_service() -> DataReportService:
    """Get the singleton data report service instance."""
    global _data_report_service
    if _data_report_service is None:
        _data_report_service = DataReportService()
    return _data_report_service
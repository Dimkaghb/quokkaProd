"""
Data cleaning service layer.
Handles the business logic for data cleaning operations.
"""

import logging
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from pathlib import Path
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)


class DataCleaningService:
    """Service class for data cleaning operations."""
    
    def __init__(self):
        """Initialize the data cleaning service."""
        self.supported_operations = {
            'remove_duplicates': self._remove_duplicates,
            'handle_missing': self._handle_missing_values,
            'standardize_format': self._standardize_format
        }
    
    async def clean_data(
        self, 
        file_path: str, 
        operations: List[str], 
        output_dir: str
    ) -> str:
        """
        Clean data file with specified operations.
        
        Args:
            file_path: Path to the input file
            operations: List of cleaning operations to perform
            output_dir: Directory to save cleaned file
            
        Returns:
            Path to the cleaned file
        """
        try:
            logger.info(f"Starting data cleaning for file: {file_path}")
            logger.info(f"Operations requested: {operations}")
            
            # Read the data file
            df = await self._read_data_file(file_path)
            
            # Apply each cleaning operation
            for operation in operations:
                if operation in self.supported_operations:
                    logger.info(f"Applying operation: {operation}")
                    df = await self.supported_operations[operation](df)
                else:
                    logger.warning(f"Unknown operation: {operation}")
            
            # Generate output filename
            input_path = Path(file_path)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"cleaned_{timestamp}_{input_path.name}"
            output_path = Path(output_dir) / output_filename
            
            # Save cleaned data
            await self._save_data_file(df, str(output_path), input_path.suffix)
            
            logger.info(f"Data cleaning completed. Output saved to: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Error in data cleaning: {str(e)}")
            raise
    
    async def _read_data_file(self, file_path: str) -> pd.DataFrame:
        """
        Read data file into pandas DataFrame.
        
        Args:
            file_path: Path to the data file
            
        Returns:
            pandas DataFrame
        """
        try:
            file_extension = Path(file_path).suffix.lower()
            
            if file_extension in ['.xlsx', '.xls']:
                # Run in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                df = await loop.run_in_executor(
                    None, 
                    pd.read_excel, 
                    file_path
                )
            elif file_extension == '.csv':
                loop = asyncio.get_event_loop()
                df = await loop.run_in_executor(
                    None, 
                    pd.read_csv, 
                    file_path
                )
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            logger.info(f"Successfully read file {file_path}: {df.shape[0]} rows, {df.shape[1]} columns")
            return df
            
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {str(e)}")
            raise
    
    async def _save_data_file(self, df: pd.DataFrame, file_path: str, file_extension: str) -> None:
        """
        Save DataFrame to file.
        
        Args:
            df: pandas DataFrame to save
            file_path: Output file path
            file_extension: File extension to determine format
        """
        try:
            loop = asyncio.get_event_loop()
            
            if file_extension in ['.xlsx', '.xls']:
                await loop.run_in_executor(
                    None, 
                    lambda: df.to_excel(file_path, index=False)
                )
            elif file_extension == '.csv':
                await loop.run_in_executor(
                    None, 
                    lambda: df.to_csv(file_path, index=False)
                )
            else:
                # Default to Excel format
                await loop.run_in_executor(
                    None, 
                    lambda: df.to_excel(file_path.replace(file_extension, '.xlsx'), index=False)
                )
            
            logger.info(f"Successfully saved cleaned data to: {file_path}")
            
        except Exception as e:
            logger.error(f"Error saving file {file_path}: {str(e)}")
            raise
    
    async def _remove_duplicates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Remove duplicate rows from DataFrame.
        
        Args:
            df: Input DataFrame
            
        Returns:
            DataFrame with duplicates removed
        """
        try:
            original_rows = len(df)
            
            # Remove exact duplicates
            df_cleaned = df.drop_duplicates()
            
            removed_rows = original_rows - len(df_cleaned)
            logger.info(f"Removed {removed_rows} duplicate rows")
            
            return df_cleaned
            
        except Exception as e:
            logger.error(f"Error removing duplicates: {str(e)}")
            raise
    
    async def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing values in DataFrame.
        
        Args:
            df: Input DataFrame
            
        Returns:
            DataFrame with missing values handled
        """
        try:
            original_missing = df.isnull().sum().sum()
            logger.info(f"Found {original_missing} missing values")
            
            df_cleaned = df.copy()
            
            # Handle numeric columns - fill with mean
            numeric_columns = df_cleaned.select_dtypes(include=[np.number]).columns
            for col in numeric_columns:
                if df_cleaned[col].isnull().any():
                    mean_value = df_cleaned[col].mean()
                    df_cleaned[col] = df_cleaned[col].fillna(mean_value)
                    logger.info(f"Filled missing values in {col} with mean: {mean_value:.2f}")
            
            # Handle categorical columns - fill with mode
            categorical_columns = df_cleaned.select_dtypes(include=['object']).columns
            for col in categorical_columns:
                if df_cleaned[col].isnull().any():
                    mode_values = df_cleaned[col].mode()
                    if len(mode_values) > 0:
                        mode_value = mode_values[0]
                        df_cleaned[col] = df_cleaned[col].fillna(mode_value)
                        logger.info(f"Filled missing values in {col} with mode: {mode_value}")
            
            # Handle datetime columns - fill with median
            datetime_columns = df_cleaned.select_dtypes(include=['datetime64']).columns
            for col in datetime_columns:
                if df_cleaned[col].isnull().any():
                    median_value = df_cleaned[col].median()
                    df_cleaned[col] = df_cleaned[col].fillna(median_value)
                    logger.info(f"Filled missing values in {col} with median: {median_value}")
            
            final_missing = df_cleaned.isnull().sum().sum()
            logger.info(f"Handled missing values: {original_missing} -> {final_missing}")
            
            return df_cleaned
            
        except Exception as e:
            logger.error(f"Error handling missing values: {str(e)}")
            raise
    
    async def _standardize_format(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Standardize data formatting.
        
        Args:
            df: Input DataFrame
            
        Returns:
            DataFrame with standardized formatting
        """
        try:
            df_cleaned = df.copy()
            
            # Standardize text columns
            text_columns = df_cleaned.select_dtypes(include=['object']).columns
            for col in text_columns:
                if df_cleaned[col].dtype == 'object':
                    # Remove leading/trailing whitespace
                    df_cleaned[col] = df_cleaned[col].astype(str).str.strip()
                    
                    # Check if column contains mostly text (not numbers)
                    sample_values = df_cleaned[col].dropna().head(10)
                    if sample_values.str.contains(r'[a-zA-Z]').any():
                        # Apply title case for text columns
                        df_cleaned[col] = df_cleaned[col].str.title()
                        logger.info(f"Applied title case to column: {col}")
            
            # Standardize date columns
            for col in df_cleaned.columns:
                if df_cleaned[col].dtype == 'object':
                    # Try to convert to datetime if it looks like a date
                    sample_values = df_cleaned[col].dropna().head(10).astype(str)
                    if sample_values.str.contains(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}').any():
                        try:
                            df_cleaned[col] = pd.to_datetime(df_cleaned[col], errors='ignore')
                            if df_cleaned[col].dtype.kind == 'M':  # datetime type
                                df_cleaned[col] = df_cleaned[col].dt.strftime('%Y-%m-%d')
                                logger.info(f"Standardized date format in column: {col}")
                        except:
                            pass  # Keep original if conversion fails
            
            # Fix common typos (basic implementation)
            typo_corrections = {
                'Computter Science': 'Computer Science',
                'Enginnering': 'Engineering',
                'Managment': 'Management',
                'Buisness': 'Business',
                'Recieve': 'Receive',
                'Seperate': 'Separate'
            }
            
            for col in text_columns:
                if df_cleaned[col].dtype == 'object':
                    df_cleaned[col] = df_cleaned[col].replace(typo_corrections)
            
            logger.info("Applied format standardization")
            
            return df_cleaned
            
        except Exception as e:
            logger.error(f"Error standardizing format: {str(e)}")
            raise
    
    def get_supported_operations(self) -> List[str]:
        """
        Get list of supported cleaning operations.
        
        Returns:
            List of supported operation names
        """
        return list(self.supported_operations.keys()) 
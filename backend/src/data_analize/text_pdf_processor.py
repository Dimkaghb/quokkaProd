import re
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
import PyPDF2
import docx
import openai
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import io
import os

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text content from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise Exception(f"Error reading PDF: {str(e)}")

def extract_text_from_docx(file_path: str) -> str:
    """Extract text content from DOCX file"""
    try:
        doc = docx.Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        raise Exception(f"Error reading DOCX: {str(e)}")

def extract_text_from_txt(file_path: str) -> str:
    """Extract text content from TXT file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read().strip()
    except UnicodeDecodeError:
        # Try with different encoding
        with open(file_path, 'r', encoding='latin-1') as file:
            return file.read().strip()
    except Exception as e:
        raise Exception(f"Error reading TXT: {str(e)}")

def extract_numbers_and_patterns(text: str) -> Dict[str, List]:
    """Extract numerical data and patterns from text"""
    # Extract numbers with context
    number_pattern = r'([a-zA-Z\s]+)\s*[:\-]?\s*(\d+(?:\.\d+)?(?:%|\$|€|£)?(?:\s*(?:million|billion|thousand|k|m|b))?)'  
    matches = re.findall(number_pattern, text, re.IGNORECASE)
    
    # Extract dates
    date_patterns = [
        r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',  # MM/DD/YYYY or DD/MM/YYYY
        r'\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b',    # YYYY/MM/DD
        r'\b([A-Za-z]+\s+\d{1,2},?\s+\d{4})\b',  # Month DD, YYYY
        r'\b(\d{1,2}\s+[A-Za-z]+\s+\d{4})\b'     # DD Month YYYY
    ]
    
    dates = []
    for pattern in date_patterns:
        dates.extend(re.findall(pattern, text))
    
    # Extract percentages
    percentage_pattern = r'([a-zA-Z\s]+)\s*[:\-]?\s*(\d+(?:\.\d+)?%)'
    percentages = re.findall(percentage_pattern, text, re.IGNORECASE)
    
    # Extract currency amounts
    currency_pattern = r'([a-zA-Z\s]+)\s*[:\-]?\s*([\$€£]\d+(?:,\d{3})*(?:\.\d{2})?)'
    currencies = re.findall(currency_pattern, text, re.IGNORECASE)
    
    return {
        'numbers': matches,
        'dates': dates,
        'percentages': percentages,
        'currencies': currencies
    }

def structure_data_with_ai(text: str, extracted_data: Dict) -> pd.DataFrame:
    """Use AI to structure unstructured text data into a table format"""
    try:
        # Prepare data summary for AI
        data_summary = {
            'text_length': len(text),
            'numbers_found': len(extracted_data['numbers']),
            'dates_found': len(extracted_data['dates']),
            'percentages_found': len(extracted_data['percentages']),
            'currencies_found': len(extracted_data['currencies']),
            'sample_numbers': extracted_data['numbers'][:5],
            'sample_dates': extracted_data['dates'][:5],
            'sample_text': text[:1000]  # First 1000 characters
        }
        
        prompt = f"""
        You are an expert data analyst. Analyze the following unstructured text and extracted data patterns, then create a structured table format.
        
        Text Sample: {data_summary['sample_text']}
        
        Extracted Data:
        - Numbers with context: {data_summary['sample_numbers']}
        - Dates found: {data_summary['sample_dates']}
        - Total numbers: {data_summary['numbers_found']}
        - Total dates: {data_summary['dates_found']}
        - Total percentages: {data_summary['percentages_found']}
        - Total currencies: {data_summary['currencies_found']}
        
        Requirements:
        1. Create a structured table with meaningful columns based on the data patterns
        2. Return a JSON object with 'columns' and 'data' arrays
        3. Ensure at least 2-3 columns for visualization
        4. Use descriptive column names
        5. Convert text data into quantifiable metrics where possible
        6. If the data contains time series, include date/time columns
        7. Return ONLY valid JSON, no explanations
        
        Example format:
        {{
            "columns": ["Category", "Value", "Date"],
            "data": [
                {{"Category": "Sales", "Value": 1000, "Date": "2023-01-01"}},
                {{"Category": "Revenue", "Value": 2000, "Date": "2023-01-02"}}
            ]
        }}
        
        Generate structured data:
        """
        
        openai.api_key = os.getenv("OPENAI_API_KEY")
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert data structuring specialist. Generate only clean, valid JSON for tabular data."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.3,
        )
        
        config_text = response['choices'][0]['message']['content'].strip()
        
        # Clean the response
        if config_text.startswith('```json'):
            config_text = config_text[7:]
        if config_text.startswith('```'):
            config_text = config_text[3:]
        if config_text.endswith('```'):
            config_text = config_text[:-3]
            
        structured_data = json.loads(config_text)
        
        # Convert to DataFrame
        df = pd.DataFrame(structured_data['data'])
        
        print(f"AI structured data successfully: {df.shape}")
        return df
        
    except Exception as e:
        print(f"Error in AI structuring: {e}")
        return create_fallback_structure(extracted_data)

def create_fallback_structure(extracted_data: Dict) -> pd.DataFrame:
    """Create a fallback structured table when AI fails"""
    try:
        data_rows = []
        
        # Process numbers with context
        for i, (context, value) in enumerate(extracted_data['numbers'][:20]):  # Limit to 20 items
            # Clean and convert value
            clean_value = re.sub(r'[^\d.]', '', value)
            try:
                numeric_value = float(clean_value)
            except:
                numeric_value = 0
                
            data_rows.append({
                'Category': context.strip(),
                'Value': numeric_value,
                'Type': 'Number',
                'Index': i + 1
            })
        
        # Process percentages
        for i, (context, value) in enumerate(extracted_data['percentages'][:10]):
            clean_value = re.sub(r'[^\d.]', '', value)
            try:
                numeric_value = float(clean_value)
            except:
                numeric_value = 0
                
            data_rows.append({
                'Category': context.strip(),
                'Value': numeric_value,
                'Type': 'Percentage',
                'Index': len(data_rows) + 1
            })
        
        # Process currencies
        for i, (context, value) in enumerate(extracted_data['currencies'][:10]):
            clean_value = re.sub(r'[^\d.]', '', value)
            try:
                numeric_value = float(clean_value)
            except:
                numeric_value = 0
                
            data_rows.append({
                'Category': context.strip(),
                'Value': numeric_value,
                'Type': 'Currency',
                'Index': len(data_rows) + 1
            })
        
        # If no structured data found, create sample data
        if not data_rows:
            data_rows = [
                {'Category': 'Text Length', 'Value': len(str(extracted_data)), 'Type': 'Metric', 'Index': 1},
                {'Category': 'Numbers Found', 'Value': len(extracted_data['numbers']), 'Type': 'Count', 'Index': 2},
                {'Category': 'Dates Found', 'Value': len(extracted_data['dates']), 'Type': 'Count', 'Index': 3},
                {'Category': 'Percentages Found', 'Value': len(extracted_data['percentages']), 'Type': 'Count', 'Index': 4}
            ]
        
        df = pd.DataFrame(data_rows)
        print(f"Fallback structure created: {df.shape}")
        return df
        
    except Exception as e:
        print(f"Error in fallback structure: {e}")
        # Ultimate fallback
        return pd.DataFrame({
            'Category': ['Data Processing'],
            'Value': [1],
            'Type': ['Status'],
            'Index': [1]
        })

def process_text_file(file_path: str) -> pd.DataFrame:
    """Main function to process text/PDF files and return structured data"""
    try:
        from pathlib import Path
        
        # Resolve absolute path if relative path is provided
        path_obj = Path(file_path)
        if not path_obj.is_absolute():
            path_obj = Path.cwd() / file_path
        
        if not path_obj.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Determine file type and extract text
        file_extension = path_obj.suffix.lower()
        
        if file_extension == '.pdf':
            text = extract_text_from_pdf(str(path_obj))
        elif file_extension == '.docx':
            text = extract_text_from_docx(str(path_obj))
        elif file_extension in ['.txt', '.text']:
            text = extract_text_from_txt(str(path_obj))
        else:
            raise ValueError(f"Unsupported file format: {file_extension}")
        
        print(f"Extracted text length: {len(text)} characters")
        
        # Extract patterns and data
        extracted_data = extract_numbers_and_patterns(text)
        print(f"Extracted patterns: {len(extracted_data['numbers'])} numbers, {len(extracted_data['dates'])} dates")
        
        # Structure data using AI
        structured_df = structure_data_with_ai(text, extracted_data)
        
        return structured_df
        
    except Exception as e:
        print(f"Error processing text file: {e}")
        raise e

def analyze_text_data_structure(data: pd.DataFrame) -> Dict[str, Any]:
    """Analyze the structure of text-derived data"""
    analysis = {
        'shape': data.shape,
        'columns': list(data.columns),
        'numeric_columns': data.select_dtypes(include=['number']).columns.tolist(),
        'categorical_columns': data.select_dtypes(include=['object', 'category']).columns.tolist(),
        'datetime_columns': data.select_dtypes(include=['datetime64']).columns.tolist(),
        'missing_values': data.isnull().sum().to_dict(),
        'sample_data': data.head(3).to_dict('records'),
        'data_source': 'text_pdf_extraction'
    }
    return analysis
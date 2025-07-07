import openai
import pandas as pd
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from .text_pdf_processor import process_text_file, analyze_text_data_structure

# Initialize OpenAI client
def get_openai_client():
    """Get OpenAI client with API key from environment"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    return openai.OpenAI(api_key=api_key)

def read_data(file_path: str) -> pd.DataFrame:
    """Read data from various file formats including text and PDF"""
    from pathlib import Path
    
    # Resolve absolute path if relative path is provided
    path_obj = Path(file_path)
    if not path_obj.is_absolute():
        # Try to resolve relative to current working directory
        path_obj = Path.cwd() / file_path
    
    if not path_obj.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    file_extension = path_obj.suffix.lower()
    if file_extension == '.csv':
        return pd.read_csv(str(path_obj))
    elif file_extension in ['.xlsx', '.xls']:
        return pd.read_excel(str(path_obj))
    elif file_extension in ['.pdf', '.txt', '.docx']:
        return process_text_file(str(path_obj))
    else:
        raise ValueError(f"Unsupported file format: {file_extension}")

def analyze_data_structure(data: pd.DataFrame, file_path: str = None) -> Dict[str, Any]:
    """Analyze the structure and characteristics of the data"""
    analysis = {
        'shape': data.shape,
        'columns': list(data.columns),
        'numeric_columns': data.select_dtypes(include=['number']).columns.tolist(),
        'categorical_columns': data.select_dtypes(include=['object', 'category']).columns.tolist(),
        'datetime_columns': data.select_dtypes(include=['datetime64']).columns.tolist(),
        'missing_values': data.isnull().sum().to_dict(),
        'sample_data': data.head(3).to_dict('records')
    }
    
    # Add file type information
    if file_path:
        file_extension = file_path.split('.')[-1].lower()
        analysis['file_type'] = file_extension
        analysis['is_text_derived'] = file_extension in ['pdf', 'txt', 'docx']
    
    return analysis

def process_data_with_llm(data: pd.DataFrame, user_prompt: str = "", file_path: str = "") -> Dict[str, Any]:
    """
    Main function: Send extracted data + user prompt to LLM, get back analysis + Recharts JSON
    This is the core of the new simplified system
    """
    try:
        # Detect user language
        def detect_language(text: str) -> str:
            cyrillic_chars = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
            return "ru" if cyrillic_chars > 0 else "en"
        
        user_language = detect_language(user_prompt) if user_prompt else "ru"
        
        # Prepare data summary for LLM
        data_info = {
            'shape': data.shape,
            'columns': list(data.columns),
            'numeric_columns': data.select_dtypes(include=['number']).columns.tolist(),
            'categorical_columns': data.select_dtypes(include=['object', 'category']).columns.tolist(),
            'datetime_columns': data.select_dtypes(include=['datetime64']).columns.tolist(),
            'sample_data': data.head(5).to_dict('records'),
            'data_types': {col: str(dtype) for col, dtype in data.dtypes.items()},
            'unique_values': {col: int(data[col].nunique()) for col in data.columns},
            'null_counts': data.isnull().sum().to_dict()
        }
        
        # Add statistics for numeric columns
        numeric_stats = {}
        for col in data_info['numeric_columns']:
            if col in data.columns:
                numeric_stats[col] = {
                    'min': float(data[col].min()),
                    'max': float(data[col].max()),
                    'mean': float(data[col].mean()),
                    'median': float(data[col].median()),
                    'std': float(data[col].std()) if data[col].std() == data[col].std() else 0  # Handle NaN
                }
        data_info['numeric_stats'] = numeric_stats
        
        # Create comprehensive prompt for LLM
        if user_language == "ru":
            system_prompt = """Ты эксперт по анализу данных и визуализации. Твоя задача:

1. АНАЛИЗИРОВАТЬ данные и понимать что они показывают
2. ВЫПОЛНЯТЬ запросы пользователя (сортировка, группировка, фильтрация, выбор типа графика)
3. СОЗДАВАТЬ правильную конфигурацию для Recharts
4. ДАВАТЬ краткий анализ на русском языке

Доступные типы графиков:
- BarChart: для категориальных данных, сравнений
- LineChart: для временных рядов, трендов
- AreaChart: для накопительных данных
- PieChart: для пропорций (до 8 категорий)
- ScatterChart: для корреляций между числовыми переменными
- RadarChart: для многомерных сравнений
- ComposedChart: для комбинированных визуализаций

ВАЖНО: 
- Если пользователь просит сортировку/группировку - ОБЯЗАТЕЛЬНО примени это к данным
- Если пользователь просит конкретный тип графика - используй его
- Если пользователь просит показать конкретные колонки - используй их
- Возвращай ТОЛЬКО валидный JSON без markdown блоков

Формат ответа:
{
    "chartType": "тип_графика",
    "data": [обработанные_данные_с_учетом_запроса],
    "config": {
        "xKey": "колонка_X",
        "yKey": "колонка_Y_или_массив",
        "title": "Заголовок графика",
        "xLabel": "Подпись X",
        "yLabel": "Подпись Y",
        "colors": ["#8884d8", "#82ca9d", "#ffc658"]
    },
    "analyticalText": "Краткий анализ данных и графика на русском языке"
}"""
            
            if user_prompt:
                user_message = f"""
ДАННЫЕ:
Размер: {data_info['shape']} строк и столбцов
Колонки: {data_info['columns']}
Числовые: {data_info['numeric_columns']}
Категориальные: {data_info['categorical_columns']}
Статистика: {data_info['numeric_stats']}

ПРИМЕРЫ ДАННЫХ:
{json.dumps(data_info['sample_data'], indent=2, ensure_ascii=False)}

ЗАПРОС ПОЛЬЗОВАТЕЛЯ: "{user_prompt}"

Обработай данные согласно запросу пользователя и создай подходящую визуализацию.
"""
            else:
                user_message = f"""
ДАННЫЕ:
Размер: {data_info['shape']} строк и столбцов
Колонки: {data_info['columns']}
Числовые: {data_info['numeric_columns']}
Категориальные: {data_info['categorical_columns']}
Статистика: {data_info['numeric_stats']}

ПРИМЕРЫ ДАННЫХ:
{json.dumps(data_info['sample_data'], indent=2, ensure_ascii=False)}

Создай наиболее подходящую визуализацию для этих данных.
"""
        else:
            system_prompt = """You are an expert in data analysis and visualization. Your task:

1. ANALYZE data and understand what it shows
2. EXECUTE user requests (sorting, grouping, filtering, chart type selection)
3. CREATE proper Recharts configuration
4. PROVIDE brief analysis in English

Available chart types:
- BarChart: for categorical data, comparisons
- LineChart: for time series, trends
- AreaChart: for cumulative data
- PieChart: for proportions (up to 8 categories)
- ScatterChart: for correlations between numeric variables
- RadarChart: for multi-dimensional comparisons
- ComposedChart: for combined visualizations

IMPORTANT:
- If user asks for sorting/grouping - MUST apply it to data
- If user asks for specific chart type - use it
- If user asks to show specific columns - use them
- Return ONLY valid JSON without markdown blocks

Response format:
{
    "chartType": "chart_type",
    "data": [processed_data_according_to_request],
    "config": {
        "xKey": "x_column",
        "yKey": "y_column_or_array",
        "title": "Chart title",
        "xLabel": "X label",
        "yLabel": "Y label",
        "colors": ["#8884d8", "#82ca9d", "#ffc658"]
    },
    "analyticalText": "Brief analysis of data and chart in English"
}"""
            
            if user_prompt:
                user_message = f"""
DATA:
Size: {data_info['shape']} rows and columns
Columns: {data_info['columns']}
Numeric: {data_info['numeric_columns']}
Categorical: {data_info['categorical_columns']}
Statistics: {data_info['numeric_stats']}

SAMPLE DATA:
{json.dumps(data_info['sample_data'], indent=2)}

USER REQUEST: "{user_prompt}"

Process the data according to user request and create appropriate visualization.
"""
            else:
                user_message = f"""
DATA:
Size: {data_info['shape']} rows and columns
Columns: {data_info['columns']}
Numeric: {data_info['numeric_columns']}
Categorical: {data_info['categorical_columns']}
Statistics: {data_info['numeric_stats']}

SAMPLE DATA:
{json.dumps(data_info['sample_data'], indent=2)}

Create the most appropriate visualization for this data.
"""
        
        # Call OpenAI API
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=2000,
            temperature=0.2
        )
        
        config_text = response.choices[0].message.content.strip()
        
        # Clean JSON response
        if config_text.startswith('```json'):
            config_text = config_text[7:]
        if config_text.startswith('```'):
            config_text = config_text[3:]
        if config_text.endswith('```'):
            config_text = config_text[:-3]
        
        # Parse JSON
        result = json.loads(config_text)
        
        # If LLM didn't provide processed data, use original data
        if not result.get('data'):
            result['data'] = data.to_dict('records')
        
        # Process data according to user request if LLM provided processed data
        if result.get('data') and isinstance(result['data'], list):
            # Convert back to DataFrame for any additional processing
            processed_df = pd.DataFrame(result['data'])
            
            # Apply user requests to data if not already handled by LLM
            if user_prompt and processed_df.shape == data.shape:
                processed_df = apply_user_requests_to_data(data, user_prompt)
                result['data'] = processed_df.to_dict('records')
        
        print(f"✅ LLM processed data successfully: {len(result['data'])} records")
        return result
            
    except Exception as e:
        print(f"❌ Error in LLM processing: {e}")
        # Fallback to simple processing
        return create_fallback_visualization(data, user_prompt, user_language)

def apply_user_requests_to_data(data: pd.DataFrame, user_prompt: str) -> pd.DataFrame:
    """Apply user requests like sorting, grouping, filtering to data"""
    try:
        processed_data = data.copy()
        prompt_lower = user_prompt.lower()
        
        # Handle sorting requests
        if any(word in prompt_lower for word in ['сортируй', 'отсортируй', 'sort', 'order']):
            # Find numeric columns for sorting
            numeric_cols = data.select_dtypes(include=['number']).columns.tolist()
            if numeric_cols:
                main_col = numeric_cols[0]
                if 'убыв' in prompt_lower or 'descend' in prompt_lower or 'больш' in prompt_lower:
                    processed_data = processed_data.sort_values(main_col, ascending=False)
                else:
                    processed_data = processed_data.sort_values(main_col, ascending=True)
        
        # Handle grouping requests
        if any(word in prompt_lower for word in ['групп', 'group', 'по количеству', 'by count']):
            categorical_cols = data.select_dtypes(include=['object', 'category']).columns.tolist()
            if categorical_cols:
                group_col = categorical_cols[0]
                # Count occurrences
                grouped = processed_data.groupby(group_col).size().reset_index(name='Count')
                grouped = grouped.sort_values('Count', ascending=False)
                processed_data = grouped
        
        # Handle filtering requests
        if 'топ' in prompt_lower or 'top' in prompt_lower:
            # Extract number
            import re
            numbers = re.findall(r'\d+', user_prompt)
            if numbers:
                n = int(numbers[0])
                processed_data = processed_data.head(n)
        
        return processed_data
        
    except Exception as e:
        print(f"Error applying user requests: {e}")
        return data

def create_fallback_visualization(data: pd.DataFrame, user_prompt: str, user_language: str) -> Dict[str, Any]:
    """Create fallback visualization when LLM fails"""
    try:
        # Apply user requests to data
        processed_data = apply_user_requests_to_data(data, user_prompt)
        
        # Determine chart type
        numeric_cols = processed_data.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = processed_data.select_dtypes(include=['object', 'category']).columns.tolist()
        
        if len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
            chart_type = "BarChart"
            x_key = categorical_cols[0]
            y_key = numeric_cols[0]
        elif len(numeric_cols) >= 2:
            chart_type = "ScatterChart"
            x_key = numeric_cols[0]
            y_key = numeric_cols[1]
        else:
            chart_type = "BarChart"
            x_key = list(processed_data.columns)[0]
            y_key = list(processed_data.columns)[1] if len(processed_data.columns) > 1 else list(processed_data.columns)[0]
        
        # Create config
        if user_language == "ru":
            title = f"График: {y_key} по {x_key}"
            analytical_text = f"Создан график типа {chart_type} с {len(processed_data)} записями. Показывает {y_key} в зависимости от {x_key}."
        else:
            title = f"Chart: {y_key} by {x_key}"
            analytical_text = f"Created {chart_type} with {len(processed_data)} records. Shows {y_key} by {x_key}."
        
        return {
            "chartType": chart_type,
            "data": processed_data.to_dict('records'),
            "config": {
                "xKey": x_key,
                "yKey": y_key,
                "title": title,
                "xLabel": x_key,
                "yLabel": y_key,
                "colors": ["#8884d8", "#82ca9d", "#ffc658"]
            },
            "analyticalText": analytical_text
        }
        
    except Exception as e:
        print(f"Error in fallback visualization: {e}")
        return {
            "chartType": "BarChart",
            "data": data.to_dict('records'),
            "config": {
                "xKey": list(data.columns)[0],
                "yKey": list(data.columns)[1] if len(data.columns) > 1 else list(data.columns)[0],
                "title": "Data Visualization",
                "xLabel": "X",
                "yLabel": "Y",
                "colors": ["#8884d8", "#82ca9d", "#ffc658"]
            },
            "analyticalText": "Basic data visualization created."
        }

def create_intelligent_visualization(file_path: str, user_prompt: str = "") -> Dict[str, Any]:
    """
    Main function: Create visualization from file
    This replaces the old complex system with a simple: file -> data -> LLM -> result
    """
    try:
        # Step 1: Read data from file
        data = read_data(file_path)
        print(f"📊 Data loaded: {data.shape} rows x {data.shape[1]} columns")
        
        # Step 2: Process with LLM
        result = process_data_with_llm(data, user_prompt, file_path)
        
        print(f"✅ Visualization created successfully")
        return result
        
    except Exception as e:
        print(f"❌ Error creating visualization: {e}")
        raise e

def customize_visualization(current_data: pd.DataFrame, user_prompt: str) -> Dict[str, Any]:
    """
    Customize existing visualization based on user prompt
    This is now much simpler - just process data with LLM using the prompt
    """
    try:
        # Convert DataFrame if needed
        if isinstance(current_data, list):
            current_data = pd.DataFrame(current_data)
        
        # Process with LLM
        result = process_data_with_llm(current_data, user_prompt)
        
        print(f"✅ Visualization customized successfully")
        return result
        
    except Exception as e:
        print(f"❌ Error customizing visualization: {e}")
        raise e

# Legacy compatibility functions
def process_user_request(file_paths: List[str], user_message: str, current_data: pd.DataFrame = None, current_chart: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Legacy function for backward compatibility
    Now uses the new simplified system
    """
    try:
        # Detect user language
        def detect_language(text: str) -> str:
            cyrillic_chars = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
            return "ru" if cyrillic_chars > 0 else "en"
        
        user_language = detect_language(user_message)
        
        # Case 1: New file uploaded
        if file_paths:
            file_path = file_paths[0]
            chart_config = create_intelligent_visualization(file_path, user_message)
            
            # Store data for future use
            data = read_data(file_path)
            
            file_name = os.path.basename(file_path)
            analytical_text = chart_config.get('analyticalText', '')
            
            if user_language == "ru":
                response_text = f"✅ Создал визуализацию из файла {file_name}.\n\n{analytical_text}\n\n💡 Можете попросить изменить тип графика, сортировку, фильтры и т.д."
            else:
                response_text = f"✅ Created visualization from file {file_name}.\n\n{analytical_text}\n\n💡 You can ask to change chart type, sorting, filters, etc."
            
            return {
                "answer": response_text,
                "type": "data_analysis",
                "confidence": 0.9,
                "sources": [file_name],
                "timestamp": datetime.utcnow().isoformat(),
                "visualization": chart_config,
                "current_data": data.to_dict('records'),
                "success": True
            }
        
        # Case 2: Customize existing chart
        elif current_data is not None:
            new_chart_config = customize_visualization(current_data, user_message)
            
            analytical_text = new_chart_config.get('analyticalText', '')
            
            if user_language == "ru":
                response_text = f"✅ Обновил график: \"{user_message}\"\n\n{analytical_text}"
            else:
                response_text = f"✅ Updated chart: \"{user_message}\"\n\n{analytical_text}"
            
            return {
                "answer": response_text,
                "type": "data_analysis",
                "confidence": 0.9,
                "sources": [],
                "timestamp": datetime.utcnow().isoformat(),
                "visualization": new_chart_config,
                "current_data": current_data if isinstance(current_data, list) else current_data.to_dict('records'),
                "success": True
            }
        
        # Case 3: General chat
        else:
            if user_language == "ru":
                response_text = "Привет! 👋 Загрузите файл, и я создам визуализацию. Затем можете просить изменения."
            else:
                response_text = "Hello! 👋 Upload a file and I'll create a visualization. Then you can ask for changes."
            
            return {
                "answer": response_text,
                "type": "general",
                "confidence": 0.8,
                "sources": [],
                "timestamp": datetime.utcnow().isoformat(),
                "success": True
            }
            
    except Exception as e:
        print(f"❌ Error processing user request: {e}")
        
        user_language = "ru" if sum(1 for c in user_message if '\u0400' <= c <= '\u04FF') > 0 else "en"
        
        if user_language == "ru":
            error_text = f"Ошибка: {str(e)}"
        else:
            error_text = f"Error: {str(e)}"
        
        return {
            "answer": error_text,
            "type": "error",
            "confidence": 0.0,
            "sources": [],
            "timestamp": datetime.utcnow().isoformat(),
            "success": False
        }

def main(file_path: str):
    """Legacy main function for backward compatibility"""
    return create_intelligent_visualization(file_path)
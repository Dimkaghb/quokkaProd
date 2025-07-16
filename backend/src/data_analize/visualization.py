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

def get_intelligent_data_sample(data: pd.DataFrame, max_rows: int = 50) -> Dict[str, Any]:
    """
    Get intelligent sample of data that represents the full dataset well.
    
    Args:
        data: Full DataFrame
        max_rows: Maximum number of rows to sample
        
    Returns:
        Dictionary with sample data and metadata
    """
    total_rows = len(data)
    
    if total_rows <= max_rows:
        return {
            'sample_data': data.to_dict('records'),
            'is_sampled': False,
            'total_rows': total_rows,
            'sample_rows': total_rows,
            'sampling_method': 'full_data'
        }
    
    # For large datasets, use intelligent sampling
    sample_data = []
    sampling_methods = []
    
    # 1. Always include first few rows
    head_rows = min(5, max_rows // 3)
    sample_data.extend(data.head(head_rows).to_dict('records'))
    sampling_methods.append(f'first_{head_rows}_rows')
    
    # 2. Include last few rows
    tail_rows = min(5, max_rows // 3)
    sample_data.extend(data.tail(tail_rows).to_dict('records'))
    sampling_methods.append(f'last_{tail_rows}_rows')
    
    # 3. Random sampling from middle
    remaining_rows = max_rows - head_rows - tail_rows
    if remaining_rows > 0 and total_rows > head_rows + tail_rows:
        middle_data = data.iloc[head_rows:-tail_rows] if tail_rows > 0 else data.iloc[head_rows:]
        if len(middle_data) > 0:
            random_sample = middle_data.sample(n=min(remaining_rows, len(middle_data)), random_state=42)
            sample_data.extend(random_sample.to_dict('records'))
            sampling_methods.append(f'random_{len(random_sample)}_rows')
    
    return {
        'sample_data': sample_data[:max_rows],  # Ensure we don't exceed max_rows
        'is_sampled': True,
        'total_rows': total_rows,
        'sample_rows': len(sample_data[:max_rows]),
        'sampling_method': '+'.join(sampling_methods)
    }

def analyze_data_complexity_for_llm(data: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyze data complexity to determine if we need user clarification.
    
    Args:
        data: DataFrame to analyze
        
    Returns:
        Dictionary with complexity analysis
    """
    analysis = {
        'total_rows': len(data),
        'total_columns': len(data.columns),
        'numeric_columns': data.select_dtypes(include=['number']).columns.tolist(),
        'categorical_columns': data.select_dtypes(include=['object', 'category']).columns.tolist(),
        'datetime_columns': data.select_dtypes(include=['datetime64']).columns.tolist(),
        'columns': list(data.columns),
        'data_types': {col: str(dtype) for col, dtype in data.dtypes.items()},
        'unique_values': {col: int(data[col].nunique()) for col in data.columns},
        'null_counts': data.isnull().sum().to_dict(),
        'memory_usage_mb': data.memory_usage(deep=True).sum() / 1024 / 1024
    }
    
    # Calculate complexity scores
    analysis['is_large_dataset'] = analysis['total_rows'] > 1000 or analysis['total_columns'] > 20
    analysis['is_very_large_dataset'] = analysis['total_rows'] > 10000 or analysis['total_columns'] > 50
    analysis['is_complex'] = (
        analysis['total_columns'] > 10 or 
        len(analysis['numeric_columns']) > 8 or
        analysis['memory_usage_mb'] > 100
    )
    
    # Calculate data richness score
    richness_score = 0
    if len(analysis['numeric_columns']) > 0:
        richness_score += 3
    if len(analysis['categorical_columns']) > 0:
        richness_score += 2
    if len(analysis['datetime_columns']) > 0:
        richness_score += 3
    if analysis['total_columns'] > 5:
        richness_score += 2
    
    analysis['richness_score'] = richness_score
    analysis['needs_user_clarification'] = (
        analysis['is_very_large_dataset'] and 
        analysis['is_complex'] and 
        richness_score > 5
    )
    
    return analysis

def get_comprehensive_column_info(data: pd.DataFrame) -> Dict[str, Any]:
    """
    Get comprehensive information about each column for LLM context.
    
    Args:
        data: DataFrame to analyze
        
    Returns:
        Dictionary with detailed column information
    """
    column_info = {}
    
    for col in data.columns:
        col_data = data[col]
        info = {
            'type': str(col_data.dtype),
            'unique_count': int(col_data.nunique()),
            'null_count': int(col_data.isnull().sum()),
            'null_percentage': float(col_data.isnull().sum() / len(data) * 100)
        }
        
        if pd.api.types.is_numeric_dtype(col_data):
            info.update({
                'min': float(col_data.min()) if pd.notnull(col_data.min()) else None,
                'max': float(col_data.max()) if pd.notnull(col_data.max()) else None,
                'mean': float(col_data.mean()) if pd.notnull(col_data.mean()) else None,
                'median': float(col_data.median()) if pd.notnull(col_data.median()) else None,
                'std': float(col_data.std()) if pd.notnull(col_data.std()) else None,
                'data_category': 'numeric'
            })
            
            # Detect potential data categories
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['price', 'cost', 'revenue', 'profit', 'income', 'sales', 'amount']):
                info['semantic_type'] = 'financial'
            elif any(keyword in col_lower for keyword in ['count', 'quantity', 'units', 'sold', 'number']):
                info['semantic_type'] = 'quantity'
            elif any(keyword in col_lower for keyword in ['score', 'rating', 'grade', 'point']):
                info['semantic_type'] = 'score'
            else:
                info['semantic_type'] = 'general_numeric'
                
        elif pd.api.types.is_categorical_dtype(col_data) or pd.api.types.is_object_dtype(col_data):
            unique_values = col_data.value_counts().head(10)
            info.update({
                'top_values': unique_values.to_dict(),
                'data_category': 'categorical',
                'semantic_type': 'category'
            })
            
        elif pd.api.types.is_datetime64_any_dtype(col_data):
            info.update({
                'min_date': str(col_data.min()) if pd.notnull(col_data.min()) else None,
                'max_date': str(col_data.max()) if pd.notnull(col_data.max()) else None,
                'data_category': 'datetime',
                'semantic_type': 'temporal'
            })
        
        column_info[col] = info
    
    return column_info

def process_data_with_llm(data: pd.DataFrame, user_prompt: str = "", file_path: str = "") -> Dict[str, Any]:
    """
    Enhanced function: Send intelligent data sample + comprehensive metadata to LLM
    Now handles large datasets intelligently and provides rich context
    """
    try:
        # Detect user language
        def detect_language(text: str) -> str:
            cyrillic_chars = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
            return "ru" if cyrillic_chars > 0 else "en"
        
        user_language = detect_language(user_prompt) if user_prompt else "ru"
        
        # Analyze data complexity
        complexity = analyze_data_complexity_for_llm(data)
        
        # Get intelligent data sample
        sample_info = get_intelligent_data_sample(data, max_rows=30)
        
        # Get comprehensive column information
        column_info = get_comprehensive_column_info(data)
        
        # Check if we need user clarification for very large/complex datasets
        if complexity['needs_user_clarification'] and not user_prompt:
            if user_language == "ru":
                return {
                    "needs_clarification": True,
                    "message": f"Данные содержат {complexity['total_rows']:,} строк и {complexity['total_columns']} столбцов. Это очень большой набор данных. Пожалуйста, уточните:\n\n" +
                              f"Доступные столбцы:\n" + 
                              "\n".join([f"• {col} ({info['data_category']})" + 
                                       (f" - {info.get('semantic_type', '')}" if info.get('semantic_type') else "") 
                                       for col, info in column_info.items()]) +
                              f"\n\nКакие именно данные вы хотите визуализировать?",
                    "complexity": complexity,
                    "column_info": column_info,
                    "suggestions": [
                        "Покажи топ 10 категорий по продажам",
                        "Создай график тренда по времени", 
                        "Сравни показатели по регионам",
                        "Покажи распределение по возрастам"
                    ]
                }
            else:
                return {
                    "needs_clarification": True,
                    "message": f"Data contains {complexity['total_rows']:,} rows and {complexity['total_columns']} columns. This is a very large dataset. Please specify:\n\n" +
                              f"Available columns:\n" + 
                              "\n".join([f"• {col} ({info['data_category']})" + 
                                       (f" - {info.get('semantic_type', '')}" if info.get('semantic_type') else "") 
                                       for col, info in column_info.items()]) +
                              f"\n\nWhat specific data would you like to visualize?",
                    "complexity": complexity,
                    "column_info": column_info,
                    "suggestions": [
                        "Show top 10 categories by sales",
                        "Create time trend chart",
                        "Compare metrics by regions", 
                        "Show age distribution"
                    ]
                }
        
        # Prepare enhanced data info for LLM
        data_info = {
            'shape': data.shape,
            'columns': list(data.columns),
            'numeric_columns': complexity['numeric_columns'],
            'categorical_columns': complexity['categorical_columns'],
            'datetime_columns': complexity['datetime_columns'],
            'sample_data': sample_info['sample_data'],
            'data_types': complexity['data_types'],
            'unique_values': complexity['unique_values'],
            'null_counts': complexity['null_counts'],
            'column_details': column_info,
            'sampling_info': {
                'is_sampled': sample_info['is_sampled'],
                'total_rows': sample_info['total_rows'],
                'sample_rows': sample_info['sample_rows'],
                'sampling_method': sample_info['sampling_method']
            },
            'complexity_flags': {
                'is_large_dataset': complexity['is_large_dataset'],
                'is_very_large_dataset': complexity['is_very_large_dataset'],
                'is_complex': complexity['is_complex']
            }
        }
        
        # Add comprehensive statistics for numeric columns
        numeric_stats = {}
        for col in data_info['numeric_columns']:
            if col in data.columns and col in column_info:
                numeric_stats[col] = {
                    'min': column_info[col].get('min'),
                    'max': column_info[col].get('max'),
                    'mean': column_info[col].get('mean'),
                    'median': column_info[col].get('median'),
                    'std': column_info[col].get('std'),
                    'semantic_type': column_info[col].get('semantic_type', 'general_numeric')
                }
        data_info['numeric_stats'] = numeric_stats
        
        # Create enhanced prompt for LLM with large dataset handling
        if user_language == "ru":
            system_prompt = """Ты эксперт по анализу данных и визуализации. Ты работаешь с большими наборами данных и создаёшь интеллектуальные визуализации.

ТВОЯ ЗАДАЧА:
1. АНАЛИЗИРОВАТЬ структуру данных и понимать семантику столбцов
2. ОБРАБАТЫВАТЬ большие наборы данных эффективно 
3. ВЫПОЛНЯТЬ запросы пользователя (сортировка, группировка, фильтрация, агрегация)
4. СОЗДАВАТЬ правильную конфигурацию для Recharts
5. ДАВАТЬ полезный анализ на русском языке

РАБОТА С БОЛЬШИМИ ДАННЫМИ:
- Если данные отобраны (is_sampled=true), учитывай общий размер dataset'а
- Используй semantic_type столбцов для лучшего понимания
- Создавай агрегации для больших данных (группировка, топ-N, суммы)
- Приоритизируй наиболее значимые данные

ДОСТУПНЫЕ ТИПЫ ГРАФИКОВ:
- BarChart: категориальные данные, сравнения, топ-N
- LineChart: временные ряды, тренды
- AreaChart: накопительные данные, тренды областей
- PieChart: пропорции (максимум 8 категорий)
- ScatterChart: корреляции между числовыми переменными
- RadarChart: многомерные сравнения
- ComposedChart: комбинированные визуализации
- RadialBarChart: круговые столбчатые диаграммы, прогресс
- Treemap: иерархические данные, вложенные прямоугольники
- FunnelChart: воронки процессов (например, продажи)
- Sankey: потоки между состояниями (экспериментальный)

ВЫБОР ТИПА ГРАФИКА (если пользователь не указал):
- Временные данные → LineChart или AreaChart
- Категории + числа → BarChart
- Пропорции/доли → PieChart (до 8 категорий)
- Корреляции → ScatterChart
- Иерархические данные → Treemap
- Процессы/воронки → FunnelChart
- Многомерные данные → RadarChart
- Прогресс/достижения → RadialBarChart
- Потоки данных → Sankey

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:
- Если пользователь просит сортировку/группировку - примени к данным
- Если просит конкретный тип графика - используй его
- Если просит конкретные столбцы - фокусируйся на них
- Для больших данных создавай осмысленные агрегации
- Используй semantic_type для выбора лучших визуализаций
- Возвращай ТОЛЬКО валидный JSON без markdown блоков

ФОРМАТ ОТВЕТА:
{
    "chartType": "тип_графика",
    "data": [обработанные_данные_с_агрегацией_если_нужно],
    "config": {
        "xKey": "колонка_X",
        "yKey": "колонка_Y_или_массив",
        "title": "Осмысленный заголовок графика",
        "xLabel": "Подпись X",
        "yLabel": "Подпись Y",
        "colors": ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"]
    },
    "analyticalText": "Подробный анализ данных с упоминанием размера dataset'а и ключевых инсайтов"
}"""
            
            if user_prompt:
                user_message = f"""
АНАЛИЗ ДАННЫХ:
📊 Размер: {data_info['shape'][0]:,} строк × {data_info['shape'][1]} столбцов
📈 Данные {"отобраны" if data_info['sampling_info']['is_sampled'] else "полные"}: {data_info['sampling_info']['sample_rows']} из {data_info['sampling_info']['total_rows']:,} строк
🔄 Метод выборки: {data_info['sampling_info']['sampling_method']}

СТРУКТУРА СТОЛБЦОВ:
{json.dumps(data_info['column_details'], indent=2, ensure_ascii=False)}

СТАТИСТИКА ЧИСЛОВЫХ СТОЛБЦОВ:
{json.dumps(data_info['numeric_stats'], indent=2, ensure_ascii=False)}

ПРИМЕРЫ ДАННЫХ:
{json.dumps(data_info['sample_data'], indent=2, ensure_ascii=False)}

ФЛАГИ СЛОЖНОСТИ:
- Большой dataset: {data_info['complexity_flags']['is_large_dataset']}
- Очень большой dataset: {data_info['complexity_flags']['is_very_large_dataset']}
- Сложная структура: {data_info['complexity_flags']['is_complex']}

ЗАПРОС ПОЛЬЗОВАТЕЛЯ: "{user_prompt}"

Создай оптимальную визуализацию с учётом размера данных и запроса пользователя. Если данных много, используй агрегацию.
"""
            else:
                user_message = f"""
АНАЛИЗ ДАННЫХ:
📊 Размер: {data_info['shape'][0]:,} строк × {data_info['shape'][1]} столбцов
📈 Данные {"отобраны" if data_info['sampling_info']['is_sampled'] else "полные"}: {data_info['sampling_info']['sample_rows']} из {data_info['sampling_info']['total_rows']:,} строк
🔄 Метод выборки: {data_info['sampling_info']['sampling_method']}

СТРУКТУРА СТОЛБЦОВ:
{json.dumps(data_info['column_details'], indent=2, ensure_ascii=False)}

СТАТИСТИКА ЧИСЛОВЫХ СТОЛБЦОВ:
{json.dumps(data_info['numeric_stats'], indent=2, ensure_ascii=False)}

ПРИМЕРЫ ДАННЫХ:
{json.dumps(data_info['sample_data'], indent=2, ensure_ascii=False)}

ФЛАГИ СЛОЖНОСТИ:
- Большой dataset: {data_info['complexity_flags']['is_large_dataset']}
- Очень большой dataset: {data_info['complexity_flags']['is_very_large_dataset']}
- Сложная структура: {data_info['complexity_flags']['is_complex']}

Создай наиболее подходящую и информативную визуализацию. Используй semantic_type столбцов для выбора лучшего типа графика. Если данных много, создай агрегацию.
"""
        else:
            system_prompt = """You are an expert in data analysis and visualization. You work with large datasets and create intelligent visualizations.

YOUR TASK:
1. ANALYZE data structure and understand column semantics
2. HANDLE large datasets efficiently
3. EXECUTE user requests (sorting, grouping, filtering, aggregation)
4. CREATE proper Recharts configuration
5. PROVIDE useful analysis in English

LARGE DATA HANDLING:
- If data is sampled (is_sampled=true), consider the total dataset size
- Use semantic_type of columns for better understanding
- Create aggregations for large data (grouping, top-N, sums)
- Prioritize most significant data

AVAILABLE CHART TYPES:
- BarChart: categorical data, comparisons, top-N
- LineChart: time series, trends
- AreaChart: cumulative data, area trends
- PieChart: proportions (max 8 categories)
- ScatterChart: correlations between numeric variables
- RadarChart: multi-dimensional comparisons
- ComposedChart: combined visualizations
- RadialBarChart: circular bar charts, progress indicators
- Treemap: hierarchical data, nested rectangles
- FunnelChart: process funnels (e.g., sales funnel)
- Sankey: flow between states (experimental)

CHART TYPE SELECTION (if user doesn't specify):
- Time-based data → LineChart or AreaChart
- Categories + numbers → BarChart
- Proportions/shares → PieChart (up to 8 categories)
- Correlations → ScatterChart
- Hierarchical data → Treemap
- Process/funnels → FunnelChart
- Multi-dimensional data → RadarChart
- Progress/achievements → RadialBarChart
- Data flows → Sankey

MANDATORY REQUIREMENTS:
- If user asks for sorting/grouping - apply to data
- If asks for specific chart type - use it
- If asks for specific columns - focus on them
- For large data create meaningful aggregations
- Use semantic_type for better visualization choices
- Return ONLY valid JSON without markdown blocks

RESPONSE FORMAT:
{
    "chartType": "chart_type",
    "data": [processed_data_with_aggregation_if_needed],
    "config": {
        "xKey": "x_column",
        "yKey": "y_column_or_array",
        "title": "Meaningful chart title",
        "xLabel": "X label",
        "yLabel": "Y label",
        "colors": ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"]
    },
    "analyticalText": "Detailed analysis mentioning dataset size and key insights"
}"""
            
            if user_prompt:
                user_message = f"""
DATA ANALYSIS:
📊 Size: {data_info['shape'][0]:,} rows × {data_info['shape'][1]} columns
📈 Data {"sampled" if data_info['sampling_info']['is_sampled'] else "complete"}: {data_info['sampling_info']['sample_rows']} out of {data_info['sampling_info']['total_rows']:,} rows
🔄 Sampling method: {data_info['sampling_info']['sampling_method']}

COLUMN STRUCTURE:
{json.dumps(data_info['column_details'], indent=2)}

NUMERIC STATISTICS:
{json.dumps(data_info['numeric_stats'], indent=2)}

SAMPLE DATA:
{json.dumps(data_info['sample_data'], indent=2)}

COMPLEXITY FLAGS:
- Large dataset: {data_info['complexity_flags']['is_large_dataset']}
- Very large dataset: {data_info['complexity_flags']['is_very_large_dataset']}
- Complex structure: {data_info['complexity_flags']['is_complex']}

USER REQUEST: "{user_prompt}"

Create optimal visualization considering data size and user request. If data is large, use aggregation.
"""
            else:
                user_message = f"""
DATA ANALYSIS:
📊 Size: {data_info['shape'][0]:,} rows × {data_info['shape'][1]} columns
📈 Data {"sampled" if data_info['sampling_info']['is_sampled'] else "complete"}: {data_info['sampling_info']['sample_rows']} out of {data_info['sampling_info']['total_rows']:,} rows
🔄 Sampling method: {data_info['sampling_info']['sampling_method']}

COLUMN STRUCTURE:
{json.dumps(data_info['column_details'], indent=2)}

NUMERIC STATISTICS:
{json.dumps(data_info['numeric_stats'], indent=2)}

SAMPLE DATA:
{json.dumps(data_info['sample_data'], indent=2)}

COMPLEXITY FLAGS:
- Large dataset: {data_info['complexity_flags']['is_large_dataset']}
- Very large dataset: {data_info['complexity_flags']['is_very_large_dataset']}
- Complex structure: {data_info['complexity_flags']['is_complex']}

Create the most appropriate and informative visualization. Use semantic_type of columns for better chart selection. If data is large, create aggregation.
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
    """Enhanced function to apply user requests including intelligent aggregations for large datasets"""
    try:
        processed_data = data.copy()
        prompt_lower = user_prompt.lower()
        
        # Extract numbers from prompt for top-N operations
        import re
        numbers = re.findall(r'\d+', user_prompt)
        
        # Handle top-N requests
        if any(word in prompt_lower for word in ['топ', 'top', 'первые', 'лучшие', 'наиболее']):
            n = int(numbers[0]) if numbers else 10
            
            # Find the best column to sort by
            numeric_cols = data.select_dtypes(include=['number']).columns.tolist()
            if numeric_cols:
                # Priority for financial columns
                financial_cols = [col for col in numeric_cols if any(keyword in col.lower() 
                                for keyword in ['sales', 'revenue', 'profit', 'income', 'amount', 'price', 'cost'])]
                sort_col = financial_cols[0] if financial_cols else numeric_cols[0]
                processed_data = processed_data.nlargest(n, sort_col)
            else:
                processed_data = processed_data.head(n)
        
        # Handle grouping and aggregation requests
        elif any(word in prompt_lower for word in ['группировка', 'group', 'по категориям', 'by category', 'сумма', 'sum', 'среднее', 'average']):
            categorical_cols = data.select_dtypes(include=['object', 'category']).columns.tolist()
            numeric_cols = data.select_dtypes(include=['number']).columns.tolist()
            
            if categorical_cols and numeric_cols:
                group_col = categorical_cols[0]
                
                # Choose aggregation type based on prompt
                if any(word in prompt_lower for word in ['сумма', 'sum', 'total', 'итого']):
                    agg_func = 'sum'
                elif any(word in prompt_lower for word in ['среднее', 'average', 'mean', 'средний']):
                    agg_func = 'mean'
                elif any(word in prompt_lower for word in ['количество', 'count', 'число']):
                    # Count occurrences
                    grouped = processed_data.groupby(group_col).size().reset_index(name='Count')
                    processed_data = grouped.sort_values('Count', ascending=False)
                    return processed_data
                else:
                    agg_func = 'sum'  # Default to sum
                
                # Apply aggregation
                agg_col = numeric_cols[0]  # Use first numeric column
                grouped = processed_data.groupby(group_col)[agg_col].agg(agg_func).reset_index()
                grouped.columns = [group_col, f'{agg_func.title()}_{agg_col}']
                processed_data = grouped.sort_values(f'{agg_func.title()}_{agg_col}', ascending=False)
            
            elif categorical_cols:
                # Just count by category
                group_col = categorical_cols[0]
                grouped = processed_data.groupby(group_col).size().reset_index(name='Count')
                processed_data = grouped.sort_values('Count', ascending=False)
        
        # Handle sorting requests
        elif any(word in prompt_lower for word in ['сортировка', 'сортируй', 'sort', 'order', 'упорядочить']):
            numeric_cols = data.select_dtypes(include=['number']).columns.tolist()
            if numeric_cols:
                sort_col = numeric_cols[0]
                ascending = not any(word in prompt_lower for word in ['убыв', 'descend', 'больш', 'highest', 'largest'])
                processed_data = processed_data.sort_values(sort_col, ascending=ascending)
        
        # Handle time-based requests
        elif any(word in prompt_lower for word in ['тренд', 'trend', 'по времени', 'over time', 'динамика']):
            datetime_cols = data.select_dtypes(include=['datetime64']).columns.tolist()
            if datetime_cols:
                time_col = datetime_cols[0]
                processed_data = processed_data.sort_values(time_col)
        
        # Handle filtering by specific values
        elif any(word in prompt_lower for word in ['только', 'only', 'фильтр', 'filter', 'где', 'where']):
            # This is a placeholder for more complex filtering logic
            # Could be enhanced to parse specific filter conditions
            pass
        
        # For large datasets without specific requests, intelligently sample
        if len(processed_data) > 100 and not any(word in prompt_lower for word in ['все', 'all', 'полностью', 'complete']):
            # If no specific aggregation was applied, create a smart sample
            if len(processed_data) == len(data):  # No processing was done
                # For categorical data, get top categories by count
                categorical_cols = data.select_dtypes(include=['object', 'category']).columns.tolist()
                numeric_cols = data.select_dtypes(include=['number']).columns.tolist()
                
                if categorical_cols and numeric_cols:
                    cat_col = categorical_cols[0]
                    num_col = numeric_cols[0]
                    # Group by category and sum numeric values
                    grouped = processed_data.groupby(cat_col)[num_col].sum().reset_index()
                    grouped.columns = [cat_col, f'Total_{num_col}']
                    processed_data = grouped.sort_values(f'Total_{num_col}', ascending=False).head(20)
                elif categorical_cols:
                    # Count by category
                    cat_col = categorical_cols[0]
                    grouped = processed_data.groupby(cat_col).size().reset_index(name='Count')
                    processed_data = grouped.sort_values('Count', ascending=False).head(20)
                else:
                    # Just take a representative sample
                    processed_data = processed_data.head(50)
        
        return processed_data
        
    except Exception as e:
        print(f"Error applying user requests: {e}")
        return data

def create_fallback_visualization(data: pd.DataFrame, user_prompt: str, user_language: str) -> Dict[str, Any]:
    """Create fallback visualization when LLM fails"""
    try:
        # Apply user requests to data
        processed_data = apply_user_requests_to_data(data, user_prompt)
        
        # Intelligent chart type selection
        numeric_cols = processed_data.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = processed_data.select_dtypes(include=['object', 'category']).columns.tolist()
        datetime_cols = processed_data.select_dtypes(include=['datetime64']).columns.tolist()
        
        # Check for time series data
        if datetime_cols or any('date' in col.lower() or 'time' in col.lower() for col in processed_data.columns):
            chart_type = "LineChart"
            x_key = datetime_cols[0] if datetime_cols else [col for col in processed_data.columns if 'date' in col.lower() or 'time' in col.lower()][0]
            y_key = numeric_cols[0] if numeric_cols else categorical_cols[0]
        
        # Check for hierarchical data (nested categories)
        elif len(categorical_cols) >= 2 and len(numeric_cols) >= 1:
            chart_type = "Treemap"
            x_key = categorical_cols[0]
            y_key = numeric_cols[0]
        
        # Check for proportional data (percentages, parts of whole)
        elif len(categorical_cols) == 1 and len(numeric_cols) == 1:
            # Check if data looks like proportions
            numeric_data = processed_data[numeric_cols[0]]
            if numeric_data.sum() <= 100 and numeric_data.min() >= 0:
                chart_type = "PieChart"
            else:
                chart_type = "BarChart"
            x_key = categorical_cols[0]
            y_key = numeric_cols[0]
        
        # Check for funnel-like data (decreasing values)
        elif len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
            numeric_data = processed_data[numeric_cols[0]].sort_values(ascending=False)
            if len(numeric_data) <= 10 and numeric_data.is_monotonic_decreasing:
                chart_type = "FunnelChart"
            else:
                chart_type = "BarChart"
            x_key = categorical_cols[0]
            y_key = numeric_cols[0]
        
        # Check for correlation/relationship data
        elif len(numeric_cols) >= 2:
            chart_type = "ScatterChart"
            x_key = numeric_cols[0]
            y_key = numeric_cols[1]
        
        # Default fallback
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
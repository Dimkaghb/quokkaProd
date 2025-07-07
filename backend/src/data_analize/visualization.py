import openai
import pandas as pd
import json
import os
from datetime import datetime
from typing import Dict, List, Any
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

def get_intelligent_recharts_config(data: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate intelligent Recharts configuration based on data analysis using OpenAI"""
    
    # Create a concise data summary for the prompt
    data_summary = {
        'shape': analysis['shape'],
        'columns': analysis['columns'],
        'numeric_columns': analysis['numeric_columns'],
        'categorical_columns': analysis['categorical_columns'],
        'datetime_columns': analysis['datetime_columns'],
        'sample_data': analysis['sample_data'][:3]  # Limit sample data
    }
    
    prompt = f"""
    You are an expert data visualization assistant. Analyze the following dataset and create the most appropriate Recharts configuration.

    Dataset Analysis:
    {json.dumps(data_summary, indent=2)}

    Requirements:
    1. Choose the MOST APPROPRIATE chart type based on the data:
       - LineChart for time series data
       - BarChart for categorical vs numeric data
       - ScatterChart for 2+ numeric variables
       - PieChart for categorical distributions
       - AreaChart for cumulative data
       - RadarChart for multi-dimensional data comparison (3+ metrics)
       - ComposedChart for multiple data series with different chart types
    2. Return a JSON configuration object with these properties:
       - chartType: string ("LineChart", "BarChart", "ScatterChart", "PieChart", "AreaChart", "RadarChart", "ComposedChart")
       - data: array of objects representing the chart data
       - config: object with chart configuration including:
         * xKey: string (x-axis data key)
         * yKey: string or array (y-axis data key(s))
         * title: string (chart title)
         * xLabel: string (x-axis label)
         * yLabel: string (y-axis label)
         * colors: array of color strings
    3. Use meaningful titles, axis labels, and professional colors
    4. Return ONLY valid JSON, no explanations or markdown
    5. Ensure data keys match the actual column names from the dataset
    
    Generate clean JSON configuration:
    """
    
    try:
        # Call the OpenAI API
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert data visualization specialist. Generate only clean, valid JSON configurations for Recharts visualizations."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.3,
        )

        config_text = response.choices[0].message.content.strip()
        
        # Clean the response (remove markdown formatting if present)
        if config_text.startswith('```json'):
            config_text = config_text[7:]
        if config_text.startswith('```'):
            config_text = config_text[3:]
        if config_text.endswith('```'):
            config_text = config_text[:-3]
            
        # Parse JSON
        chart_config = json.loads(config_text)
        
        # Add actual data from the dataset
        chart_config['data'] = data.to_dict('records')
        
        print("Generated Intelligent Recharts Config:", json.dumps(chart_config, indent=2))
        return chart_config
        
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        # Fallback to simple visualization
        return generate_fallback_config(data, analysis)

def generate_fallback_config(data: pd.DataFrame, analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate fallback Recharts configuration when OpenAI API fails"""
    numeric_cols = analysis['numeric_columns']
    categorical_cols = analysis['categorical_columns']
    datetime_cols = analysis['datetime_columns']
    
    if len(datetime_cols) >= 1 and len(numeric_cols) >= 1:
        # Enhanced time series chart selection
        x_col, y_col = datetime_cols[0], numeric_cols[0]
        data_size = len(data)
        
        if data_size > 100:
            chart_type = "AreaChart"
        else:
            chart_type = "LineChart"
            
        config = {
            "chartType": chart_type,
            "data": data.to_dict('records'),
            "config": {
                "xKey": x_col,
                "yKey": y_col,
                "title": f"{y_col.title()} Over Time",
                "xLabel": x_col.title(),
                "yLabel": y_col.title(),
                "colors": ["#8884d8", "#82ca9d", "#ffc658"]
            }
        }
    elif len(numeric_cols) >= 2:
        # Enhanced numeric data visualization
        x_col, y_col = numeric_cols[0], numeric_cols[1]
        data_size = len(data)
        
        if data_size <= 20 and len(numeric_cols) >= 3:
            chart_type = "RadarChart"
        elif len(numeric_cols) >= 3:
            chart_type = "ComposedChart"
        else:
            chart_type = "ScatterChart"
            
        config = {
            "chartType": chart_type,
            "data": data.to_dict('records'),
            "config": {
                "xKey": x_col,
                "yKey": y_col,
                "title": f"{y_col.title()} vs {x_col.title()}",
                "xLabel": x_col.title(),
                "yLabel": y_col.title(),
                "colors": ["#8884d8", "#82ca9d", "#ffc658"]
            }
        }
    elif len(numeric_cols) == 1 and len(categorical_cols) >= 1:
        # Enhanced categorical data visualization
        x_col, y_col = categorical_cols[0], numeric_cols[0]
        unique_categories = len(data[x_col].unique())
        
        if unique_categories <= 6:
            chart_type = "PieChart"
        else:
            chart_type = "BarChart"
            
        config = {
            "chartType": chart_type,
            "data": data.to_dict('records'),
            "config": {
                "xKey": x_col,
                "yKey": y_col,
                "title": f"{y_col.title()} by {x_col.title()}",
                "xLabel": x_col.title(),
                "yLabel": y_col.title(),
                "colors": ["#8884d8", "#82ca9d", "#ffc658"]
            }
        }
    else:
        # Default bar chart for any available data
        cols = list(data.columns)
        x_col, y_col = cols[0], cols[1] if len(cols) > 1 else cols[0]
        config = {
            "chartType": "BarChart",
            "data": data.to_dict('records'),
            "config": {
                "xKey": x_col,
                "yKey": y_col,
                "title": f"Data Visualization",
                "xLabel": x_col.title(),
                "yLabel": y_col.title(),
                "colors": ["#8884d8", "#82ca9d", "#ffc658"]
            }
        }
    
    return config

def validate_chart_config(chart_config: Dict[str, Any]) -> bool:
    """Validate the generated chart configuration"""
    try:
        required_fields = ['chartType', 'data', 'config']
        for field in required_fields:
            if field not in chart_config:
                print(f"Missing required field: {field}")
                return False
        
        config = chart_config['config']
        required_config_fields = ['xKey', 'yKey', 'title']
        for field in required_config_fields:
            if field not in config:
                print(f"Missing required config field: {field}")
                return False
        
        # Validate chart type
        valid_chart_types = [
            'LineChart', 'BarChart', 'ScatterChart', 'AreaChart', 'PieChart', 'RadarChart', 'ComposedChart',
            'line', 'bar', 'scatter', 'area', 'pie', 'radar', 'composed'
        ]
        if chart_config['chartType'] not in valid_chart_types:
            print(f"Invalid chart type: {chart_config['chartType']}")
            return False
        
        print("Chart configuration validated successfully!")
        return True
        
    except Exception as e:
        print(f"Error validating chart config: {e}")
        return False

def generate_analytical_text(data: pd.DataFrame, chart_config: Dict[str, Any]) -> str:
    """Generate analytical text description of the visualization in Russian"""
    try:
        # Prepare data summary for analysis
        data_summary = {
            'shape': data.shape,
            'columns': list(data.columns),
            'chart_type': chart_config.get('chartType', 'Unknown'),
            'title': chart_config.get('config', {}).get('title', 'График'),
            'x_key': chart_config.get('config', {}).get('xKey', ''),
            'y_key': chart_config.get('config', {}).get('yKey', ''),
            'sample_data': data.head(3).to_dict('records')
        }
        
        prompt = f"""
        Проанализируй данную визуализацию и создай профессиональное описание на русском языке.
        
        Информация о данных:
        - Размер данных: {data_summary['shape']}
        - Тип графика: {data_summary['chart_type']}
        - Заголовок: {data_summary['title']}
        - Ось X: {data_summary['x_key']}
        - Ось Y: {data_summary['y_key']}
        - Примеры данных: {data_summary['sample_data']}
        
        Создай описание которое включает:
        1. Что показывает визуализация
        2. Основные тренды или паттерны
        3. Конкретные числовые значения
        4. Выводы и рекомендации
        
        Пиши профессионально, но понятно. Используй конкретные данные из примеров.
        """
        
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Ты эксперт аналитик данных. Создавай детальные, профессиональные описания визуализаций на русском языке с конкретными числами и выводами."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.3,
        )
        
        analytical_text = response.choices[0].message.content.strip()
        return analytical_text
        
    except Exception as e:
        print(f"Error generating analytical text: {e}")
        # Fallback text
        return f"Данная визуализация показывает {chart_config.get('config', {}).get('title', 'данные')} на основе {data.shape[0]} записей. График типа {chart_config.get('chartType', 'неизвестный')} позволяет наглядно представить основные тренды и закономерности в данных."

def generate_analytical_text_en(data: pd.DataFrame, chart_config: Dict[str, Any]) -> str:
    """Generate analytical text description of the visualization in English"""
    try:
        # Prepare data summary for analysis
        data_summary = {
            'shape': data.shape,
            'columns': list(data.columns),
            'chart_type': chart_config.get('chartType', 'Unknown'),
            'title': chart_config.get('config', {}).get('title', 'Chart'),
            'x_key': chart_config.get('config', {}).get('xKey', ''),
            'y_key': chart_config.get('config', {}).get('yKey', ''),
            'sample_data': data.head(3).to_dict('records')
        }
        
        prompt = f"""
        Analyze this visualization and create a professional description in English.
        
        Data information:
        - Data size: {data_summary['shape']}
        - Chart type: {data_summary['chart_type']}
        - Title: {data_summary['title']}
        - X-axis: {data_summary['x_key']}
        - Y-axis: {data_summary['y_key']}
        - Sample data: {data_summary['sample_data']}
        
        Create a description that includes:
        1. What the visualization shows
        2. Key trends or patterns
        3. Specific numerical values
        4. Conclusions and recommendations
        
        Write professionally but clearly. Use specific data from the examples.
        """
        
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert data analyst. Create detailed, professional descriptions of visualizations in English with specific numbers and insights."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.3,
        )
        
        analytical_text = response.choices[0].message.content.strip()
        return analytical_text
        
    except Exception as e:
        print(f"Error generating analytical text: {e}")
        # Fallback text
        return f"This visualization shows {chart_config.get('config', {}).get('title', 'data')} based on {data.shape[0]} records. The {chart_config.get('chartType', 'unknown')} chart type allows for clear representation of key trends and patterns in the data."

def create_intelligent_visualization(file_path: str) -> Dict[str, Any]:
    """Main function to create intelligent Recharts visualizations for any data type"""
    try:
        # Step 1: Read data
        data = read_data(file_path)
        print(f"Data loaded successfully: {data.shape}")
        
        # Step 2: Analyze data structure
        analysis = analyze_data_structure(data, file_path)
        print(f"Data analysis completed: {analysis['columns']}")
        
        # Step 3: Generate intelligent Recharts configuration
        chart_config = get_intelligent_recharts_config(data, analysis)
        
        # Step 4: Generate analytical text
        analytical_text = generate_analytical_text(data, chart_config)
        chart_config['analyticalText'] = analytical_text
        
        # Step 5: Validate the configuration
        if validate_chart_config(chart_config):
            return chart_config
        else:
            raise Exception("Failed to generate valid chart configuration")
            
    except Exception as e:
        print(f"Error in create_intelligent_visualization: {e}")
        raise e

def customize_visualization(current_data: pd.DataFrame, current_chart: Dict[str, Any], user_prompt: str) -> Dict[str, Any]:
    """Advanced AI-powered visualization customization that handles complex user requests"""
    try:
        # Detect language from user prompt
        def detect_language(text: str) -> str:
            cyrillic_chars = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
            return "ru" if cyrillic_chars > 0 else "en"
        
        user_language = detect_language(user_prompt)
        
        # Comprehensive data analysis
        data_info = {
            'columns': list(current_data.columns),
            'shape': current_data.shape,
            'sample_data': current_data.head(5).to_dict('records'),
            'data_types': current_data.dtypes.to_dict(),
            'numeric_columns': current_data.select_dtypes(include=['number']).columns.tolist(),
            'categorical_columns': current_data.select_dtypes(include=['object', 'category']).columns.tolist(),
            'datetime_columns': current_data.select_dtypes(include=['datetime64']).columns.tolist(),
            'unique_values': {col: current_data[col].nunique() for col in current_data.columns},
            'null_counts': current_data.isnull().sum().to_dict(),
            'current_chart_type': current_chart.get('chartType', 'BarChart'),
            'current_title': current_chart.get('config', {}).get('title', 'Chart'),
            'current_x_key': current_chart.get('config', {}).get('xKey', ''),
            'current_y_key': current_chart.get('config', {}).get('yKey', ''),
            'current_colors': current_chart.get('config', {}).get('colors', [])
        }
        
        # Add statistical summaries for numeric columns
        numeric_stats = {}
        for col in data_info['numeric_columns']:
            if col in current_data.columns:
                numeric_stats[col] = {
                    'min': float(current_data[col].min()),
                    'max': float(current_data[col].max()),
                    'mean': float(current_data[col].mean()),
                    'median': float(current_data[col].median()),
                    'std': float(current_data[col].std())
                }
        data_info['numeric_stats'] = numeric_stats
        
        # Try OpenAI API first
        try:
            # Create comprehensive AI prompt
            if user_language == "ru":
                system_prompt = """Ты продвинутый ИИ-ассистент по визуализации данных. Ты можешь:

1. ИЗМЕНЯТЬ ТИПЫ ГРАФИКОВ:
   - BarChart, LineChart, AreaChart, PieChart, ScatterChart, RadarChart, ComposedChart

2. ВЫБИРАТЬ И МЕНЯТЬ КОЛОНКИ:
   - Понимать запросы типа "покажи Revenue vs Year"
   - "сравни продажи по регионам"
   - "отобрази только 2022 год"
   - "покажи топ 5 значений"

3. ФИЛЬТРОВАТЬ ДАННЫЕ:
   - "только данные больше 50000"
   - "исключи нулевые значения"
   - "покажи только последние 3 года"

4. НАСТРАИВАТЬ ДИЗАЙН:
   - Менять цвета, заголовки, подписи осей
   - Добавлять/убирать легенды
   - Настраивать стили

5. СОЗДАВАТЬ СРАВНЕНИЯ:
   - Множественные метрики на одном графике
   - Группировки по категориям

ВАЖНО: Возвращай ТОЛЬКО валидный JSON без объяснений. Если нужно отфильтровать данные, включи отфильтрованные данные в поле "data".

Доступные типы графиков: BarChart, LineChart, AreaChart, PieChart, ScatterChart, RadarChart, ComposedChart"""
                
                user_prompt_text = f"""
ТЕКУЩИЕ ДАННЫЕ:
- Колонки: {data_info['columns']}
- Типы данных: {data_info['data_types']}
- Размер: {data_info['shape']} строк
- Числовые колонки: {data_info['numeric_columns']}
- Категориальные: {data_info['categorical_columns']}
- Уникальные значения: {data_info['unique_values']}
- Статистика: {data_info['numeric_stats']}

ТЕКУЩИЙ ГРАФИК:
- Тип: {data_info['current_chart_type']}
- X-ось: {data_info['current_x_key']}
- Y-ось: {data_info['current_y_key']}
- Заголовок: {data_info['current_title']}

ОБРАЗЕЦ ДАННЫХ:
{json.dumps(data_info['sample_data'], indent=2, ensure_ascii=False)}

ЗАПРОС ПОЛЬЗОВАТЕЛЯ: "{user_prompt}"

Создай новую конфигурацию графика. Если нужно отфильтровать/изменить данные, включи их в поле "data". Верни JSON:
{{
    "chartType": "тип_графика",
    "data": [отфильтрованные_данные_если_нужно],
    "config": {{
        "xKey": "колонка_X",
        "yKey": "колонка_Y_или_массив_колонок",
        "title": "Новый заголовок",
        "xLabel": "Подпись X",
        "yLabel": "Подпись Y", 
        "colors": ["#цвет1", "#цвет2", "#цвет3"],
        "additional_config": {{}}
    }},
    "explanation": "Краткое объяснение изменений"
}}
"""
            else:
                system_prompt = """You are an advanced AI assistant for data visualization. You can:

1. CHANGE CHART TYPES:
   - BarChart, LineChart, AreaChart, PieChart, ScatterChart, RadarChart, ComposedChart

2. SELECT AND CHANGE COLUMNS:
   - Understand requests like "show Revenue vs Year"
   - "compare sales by regions"
   - "display only 2022 data"
   - "show top 5 values"

3. FILTER DATA:
   - "only data greater than 50000"
   - "exclude null values"
   - "show only last 3 years"

4. CUSTOMIZE DESIGN:
   - Change colors, titles, axis labels
   - Add/remove legends
   - Configure styles

5. CREATE COMPARISONS:
   - Multiple metrics on one chart
   - Groupings by categories

IMPORTANT: Return ONLY valid JSON without explanations. If data filtering is needed, include filtered data in the "data" field.

Available chart types: BarChart, LineChart, AreaChart, PieChart, ScatterChart, RadarChart, ComposedChart"""
                
                user_prompt_text = f"""
CURRENT DATA:
- Columns: {data_info['columns']}
- Data types: {data_info['data_types']}
- Size: {data_info['shape']} rows
- Numeric columns: {data_info['numeric_columns']}
- Categorical: {data_info['categorical_columns']}
- Unique values: {data_info['unique_values']}
- Statistics: {data_info['numeric_stats']}

CURRENT CHART:
- Type: {data_info['current_chart_type']}
- X-axis: {data_info['current_x_key']}
- Y-axis: {data_info['current_y_key']}
- Title: {data_info['current_title']}

SAMPLE DATA:
{json.dumps(data_info['sample_data'], indent=2)}

USER REQUEST: "{user_prompt}"

Create a new chart configuration. If data filtering/modification is needed, include it in the "data" field. Return JSON:
{{
    "chartType": "chart_type",
    "data": [filtered_data_if_needed],
    "config": {{
        "xKey": "x_column",
        "yKey": "y_column_or_array",
        "title": "New title",
        "xLabel": "X label",
        "yLabel": "Y label",
        "colors": ["#color1", "#color2", "#color3"],
        "additional_config": {{}}
    }},
    "explanation": "Brief explanation of changes"
}}
"""
            
            client = get_openai_client()
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Using better model for complex reasoning
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt_text}
                ],
                max_tokens=1500,
                temperature=0.2  # Lower temperature for more consistent JSON
            )
            
            config_text = response.choices[0].message.content.strip()
            
            # Clean JSON response
            if config_text.startswith('```json'):
                config_text = config_text[7:]
            if config_text.startswith('```'):
                config_text = config_text[3:]
            if config_text.endswith('```'):
                config_text = config_text[:-3]
            
            new_chart_config = json.loads(config_text)
            
            # If no data provided in response, use current data
            if not new_chart_config.get('data'):
                new_chart_config['data'] = current_data.to_dict('records')
            
            # Generate comprehensive analytical text
            if user_language == "ru":
                analytical_text = generate_advanced_analytical_text_ru(current_data, new_chart_config, user_prompt)
                new_chart_config['analyticalText'] = analytical_text
            else:
                analytical_text = generate_advanced_analytical_text_en(current_data, new_chart_config, user_prompt)
                new_chart_config['analyticalText'] = analytical_text
            
            return new_chart_config
            
        except Exception as e:
            print(f"OpenAI API error: {e}, using advanced fallback")
            # Advanced fallback that still handles complex requests
            return customize_visualization_advanced_fallback(current_data, current_chart, user_prompt, user_language, data_info)
            
    except Exception as e:
        print(f"Error customizing chart: {e}")
        return current_chart

def customize_visualization_fallback(current_data: pd.DataFrame, current_chart: Dict[str, Any], user_prompt: str, user_language: str) -> Dict[str, Any]:
    """Fallback customization without OpenAI API"""
    try:
        prompt_lower = user_prompt.lower()
        
        # Simple chart type detection
        new_chart_type = current_chart.get('chartType', 'BarChart')
        
        if any(word in prompt_lower for word in ['area', 'ареа', 'площад']):
            new_chart_type = 'AreaChart'
        elif any(word in prompt_lower for word in ['line', 'линейн', 'линия']):
            new_chart_type = 'LineChart'
        elif any(word in prompt_lower for word in ['bar', 'барн', 'столб']):
            new_chart_type = 'BarChart'
        elif any(word in prompt_lower for word in ['pie', 'пай', 'круг']):
            new_chart_type = 'PieChart'
        elif any(word in prompt_lower for word in ['scatter', 'точечн', 'разброс']):
            new_chart_type = 'ScatterChart'
        elif any(word in prompt_lower for word in ['radar', 'радар']):
            new_chart_type = 'RadarChart'
        
        # Create new chart config
        new_chart_config = {
            'chartType': new_chart_type,
            'data': current_data.to_dict('records'),
            'config': {
                'xKey': current_chart.get('config', {}).get('xKey', ''),
                'yKey': current_chart.get('config', {}).get('yKey', ''),
                'title': current_chart.get('config', {}).get('title', 'Chart'),
                'xLabel': current_chart.get('config', {}).get('xLabel', 'X'),
                'yLabel': current_chart.get('config', {}).get('yLabel', 'Y'),
                'colors': ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"]
            }
        }
        
        # Update title based on chart type
        if user_language == "ru":
            type_names = {
                'AreaChart': 'Площадной график',
                'LineChart': 'Линейный график',
                'BarChart': 'Барный график',
                'PieChart': 'Пай-чарт',
                'ScatterChart': 'Точечный график',
                'RadarChart': 'Радарный график'
            }
            new_chart_config['config']['title'] = type_names.get(new_chart_type, 'График')
            
            # Fallback analytical text
            new_chart_config['analyticalText'] = f"График изменен на {type_names.get(new_chart_type, 'новый тип')} согласно вашему запросу. Данные остались прежними - {current_data.shape[0]} записей с колонками {list(current_data.columns)}."
        else:
            type_names = {
                'AreaChart': 'Area Chart',
                'LineChart': 'Line Chart',
                'BarChart': 'Bar Chart',
                'PieChart': 'Pie Chart',
                'ScatterChart': 'Scatter Chart',
                'RadarChart': 'Radar Chart'
            }
            new_chart_config['config']['title'] = type_names.get(new_chart_type, 'Chart')
            
            # Fallback analytical text
            new_chart_config['analyticalText'] = f"Chart changed to {type_names.get(new_chart_type, 'new type')} according to your request. Data remains the same - {current_data.shape[0]} records with columns {list(current_data.columns)}."
        
        return new_chart_config
        
    except Exception as e:
        print(f"Error in fallback customization: {e}")
        return current_chart

def process_user_request(file_paths: List[str], user_message: str, current_data: pd.DataFrame = None, current_chart: Dict[str, Any] = None) -> Dict[str, Any]:
    """Main function to process user requests - either create new chart or customize existing"""
    try:
        # Language detection function
        def detect_language(text: str) -> str:
            # Simple language detection based on Cyrillic characters
            cyrillic_chars = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
            return "ru" if cyrillic_chars > 0 else "en"
        
        user_language = detect_language(user_message)
        
        # Case 1: New file uploaded - ALWAYS create new visualization automatically
        if file_paths:
            file_path = file_paths[0]  # Take first file
            chart_config = create_intelligent_visualization(file_path)
            
            # Store data for future customization
            data = read_data(file_path)
            
            # Auto-create visualization message
            file_name = os.path.basename(file_path)
            chart_title = chart_config.get('config', {}).get('title', 'График')
            analytical_text = chart_config.get('analyticalText', '')
            
            if user_language == "ru":
                response_text = f"✅ Я автоматически создал {chart_title} из файла {file_name}.\n\n"
                
                if analytical_text:
                    response_text += f"{analytical_text}\n\n"
                
                response_text += "💡 Теперь вы можете попросить:\n• Изменить тип графика (пай-чарт, линейный, барный)\n• Показать другие колонки\n• Изменить цвета или стиль\n• Добавить фильтры\n\nЧто хотите изменить?"
            else:
                response_text = f"✅ I automatically created {chart_title} from file {file_name}.\n\n"
                
                if analytical_text:
                    response_text += f"{analytical_text}\n\n"
                
                response_text += "💡 Now you can ask to:\n• Change chart type (pie chart, line, bar)\n• Show other columns\n• Change colors or style\n• Add filters\n\nWhat would you like to change?"
            
            return {
                "answer": response_text,
                "type": "data_analysis",  # Changed to match frontend expectations
                "confidence": 0.9,
                "sources": [file_name],
                "timestamp": datetime.utcnow().isoformat() if 'datetime' in globals() else None,
                "visualization": chart_config,
                "current_data": data.to_dict('records'),  # Store for frontend
                "success": True
            }
        
        # Case 2: Customize existing chart
        elif current_data is not None and current_chart is not None:
            # Convert back to DataFrame if needed
            if isinstance(current_data, list):
                current_data = pd.DataFrame(current_data)
            
            new_chart_config = customize_visualization(current_data, current_chart, user_message)
            
            # Generate response in user's language
            if user_language == "ru":
                response_text = f"✅ Я обновил график согласно вашему запросу: \"{user_message}\"\n\n"
                if 'analyticalText' in new_chart_config:
                    response_text += new_chart_config['analyticalText']
            else:
                response_text = f"✅ I updated the chart according to your request: \"{user_message}\"\n\n"
                if 'analyticalText' in new_chart_config:
                    response_text += new_chart_config['analyticalText']
            
            return {
                "answer": response_text,
                "type": "data_analysis",
                "confidence": 0.9,
                "sources": [],
                "timestamp": datetime.utcnow().isoformat() if 'datetime' in globals() else None,
                "visualization": new_chart_config,
                "current_data": current_data.to_dict('records'),
                "success": True
            }
        
        # Case 3: General chat without files
        else:
            if user_language == "ru":
                response_text = "Привет! 👋 Загрузите файл (CSV, Excel, PDF, TXT), и я автоматически создам для вас красивую визуализацию. Затем сможете попросить изменить тип графика, цвета или другие параметры."
            else:
                response_text = "Hello! 👋 Upload a file (CSV, Excel, PDF, TXT), and I'll automatically create a beautiful visualization for you. Then you can ask to change chart type, colors, or other parameters."
            
            return {
                "answer": response_text,
                "type": "general",
                "confidence": 0.8,
                "sources": [],
                "timestamp": datetime.utcnow().isoformat() if 'datetime' in globals() else None,
                "success": True
            }
            
    except Exception as e:
        print(f"Error processing user request: {e}")
        
        # Error message in user's language
        user_language = "ru" if sum(1 for c in user_message if '\u0400' <= c <= '\u04FF') > 0 else "en"
        
        if user_language == "ru":
            error_text = f"Произошла ошибка при обработке запроса: {str(e)}"
        else:
            error_text = f"An error occurred while processing the request: {str(e)}"
        
        return {
            "answer": error_text,
            "type": "error",
            "confidence": 0.0,
            "sources": [],
            "timestamp": datetime.utcnow().isoformat() if 'datetime' in globals() else None,
            "success": False
        }

def main(file_path: str):
    """Legacy main function for backward compatibility"""
    return create_intelligent_visualization(file_path)

def generate_advanced_analytical_text_ru(data: pd.DataFrame, chart_config: Dict[str, Any], user_request: str) -> str:
    """Generate advanced analytical text in Russian based on user request"""
    try:
        chart_type = chart_config.get('chartType', 'Chart')
        title = chart_config.get('config', {}).get('title', 'График')
        explanation = chart_config.get('explanation', '')
        
        client = get_openai_client()
        
        prompt = f"""
        Создай детальный анализ визуализации на русском языке.
        
        Информация:
        - Тип графика: {chart_type}
        - Заголовок: {title}
        - Размер данных: {data.shape}
        - Колонки: {list(data.columns)}
        - Запрос пользователя: "{user_request}"
        - Объяснение изменений: {explanation}
        
        Создай профессиональный анализ который включает:
        1. Что показывает новая визуализация
        2. Какие изменения были сделаны по запросу
        3. Ключевые инсайты из данных
        4. Рекомендации для дальнейшего анализа
        
        Пиши конкретно и профессионально, используй данные из графика.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Ты эксперт-аналитик данных. Создавай детальные профессиональные анализы визуализаций на русском языке."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"Error generating advanced analytical text: {e}")
        return f"Визуализация обновлена согласно запросу: '{user_request}'. График типа {chart_config.get('chartType', 'неизвестный')} показывает данные из {data.shape[0]} записей."

def generate_advanced_analytical_text_en(data: pd.DataFrame, chart_config: Dict[str, Any], user_request: str) -> str:
    """Generate advanced analytical text in English based on user request"""
    try:
        chart_type = chart_config.get('chartType', 'Chart')
        title = chart_config.get('config', {}).get('title', 'Chart')
        explanation = chart_config.get('explanation', '')
        
        client = get_openai_client()
        
        prompt = f"""
        Create a detailed analysis of the visualization in English.
        
        Information:
        - Chart type: {chart_type}
        - Title: {title}
        - Data size: {data.shape}
        - Columns: {list(data.columns)}
        - User request: "{user_request}"
        - Changes explanation: {explanation}
        
        Create a professional analysis that includes:
        1. What the new visualization shows
        2. What changes were made per the request
        3. Key insights from the data
        4. Recommendations for further analysis
        
        Write specifically and professionally, use data from the chart.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert data analyst. Create detailed professional analyses of visualizations in English."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"Error generating advanced analytical text: {e}")
        return f"Visualization updated according to request: '{user_request}'. The {chart_config.get('chartType', 'unknown')} chart shows data from {data.shape[0]} records."

def customize_visualization_advanced_fallback(current_data: pd.DataFrame, current_chart: Dict[str, Any], user_prompt: str, user_language: str, data_info: Dict) -> Dict[str, Any]:
    """Advanced fallback customization that handles complex requests without OpenAI"""
    try:
        prompt_lower = user_prompt.lower()
        
        # Start with current chart config
        new_chart_config = {
            'chartType': current_chart.get('chartType', 'BarChart'),
            'data': current_data.to_dict('records'),
            'config': {
                'xKey': current_chart.get('config', {}).get('xKey', ''),
                'yKey': current_chart.get('config', {}).get('yKey', ''),
                'title': current_chart.get('config', {}).get('title', 'Chart'),
                'xLabel': current_chart.get('config', {}).get('xLabel', 'X'),
                'yLabel': current_chart.get('config', {}).get('yLabel', 'Y'),
                'colors': current_chart.get('config', {}).get('colors', ["#8884d8", "#82ca9d", "#ffc658"])
            }
        }
        
        # 1. Handle chart type changes
        chart_type_mappings = {
            'area': 'AreaChart', 'площад': 'AreaChart', 'ареа': 'AreaChart',
            'line': 'LineChart', 'линейн': 'LineChart', 'линия': 'LineChart',
            'bar': 'BarChart', 'барн': 'BarChart', 'столб': 'BarChart',
            'pie': 'PieChart', 'пай': 'PieChart', 'круг': 'PieChart',
            'scatter': 'ScatterChart', 'точечн': 'ScatterChart', 'разброс': 'ScatterChart',
            'radar': 'RadarChart', 'радар': 'RadarChart'
        }
        
        for keyword, chart_type in chart_type_mappings.items():
            if keyword in prompt_lower:
                new_chart_config['chartType'] = chart_type
                break
        
        # 2. Handle column selection
        columns = data_info['columns']
        numeric_cols = data_info['numeric_columns']
        
        # Look for specific column mentions
        for col in columns:
            if col.lower() in prompt_lower:
                if col in numeric_cols:
                    new_chart_config['config']['yKey'] = col
                else:
                    new_chart_config['config']['xKey'] = col
        
        # 3. Handle data filtering
        filtered_data = current_data.copy()
        
        # Filter by value ranges
        if 'больше' in prompt_lower or 'greater' in prompt_lower:
            for word in prompt_lower.split():
                if word.isdigit():
                    value = int(word)
                    for col in numeric_cols:
                        if col in filtered_data.columns:
                            filtered_data = filtered_data[filtered_data[col] > value]
                            break
        
        if 'меньше' in prompt_lower or 'less' in prompt_lower:
            for word in prompt_lower.split():
                if word.isdigit():
                    value = int(word)
                    for col in numeric_cols:
                        if col in filtered_data.columns:
                            filtered_data = filtered_data[filtered_data[col] < value]
                            break
        
        # Filter by year
        year_matches = []
        for word in prompt_lower.split():
            if word.isdigit() and len(word) == 4 and word.startswith('20'):
                year_matches.append(int(word))
        
        if year_matches:
            for col in columns:
                if 'year' in col.lower() or 'год' in col.lower():
                    filtered_data = filtered_data[filtered_data[col].isin(year_matches)]
                    break
        
        # Top N filtering
        if 'топ' in prompt_lower or 'top' in prompt_lower:
            for word in prompt_lower.split():
                if word.isdigit():
                    n = int(word)
                    if len(numeric_cols) > 0:
                        main_col = numeric_cols[0]
                        filtered_data = filtered_data.nlargest(n, main_col)
                    break
        
        new_chart_config['data'] = filtered_data.to_dict('records')
        
        # 4. Handle color changes
        color_schemes = {
            'синий': ["#1f77b4", "#aec7e8", "#c5dbf7"],
            'красный': ["#d62728", "#ff9999", "#ffcccc"],
            'зеленый': ["#2ca02c", "#98df8a", "#c7f5c7"],
            'blue': ["#1f77b4", "#aec7e8", "#c5dbf7"],
            'red': ["#d62728", "#ff9999", "#ffcccc"],
            'green': ["#2ca02c", "#98df8a", "#c7f5c7"]
        }
        
        for color_name, colors in color_schemes.items():
            if color_name in prompt_lower:
                new_chart_config['config']['colors'] = colors
                break
        
        # 5. Update title based on changes
        if user_language == "ru":
            type_names = {
                'AreaChart': 'Площадной график',
                'LineChart': 'Линейный график', 
                'BarChart': 'Барный график',
                'PieChart': 'Пай-чарт',
                'ScatterChart': 'Точечный график',
                'RadarChart': 'Радарный график'
            }
            
            chart_name = type_names.get(new_chart_config['chartType'], 'График')
            if len(filtered_data) != len(current_data):
                new_chart_config['config']['title'] = f"{chart_name} (отфильтровано: {len(filtered_data)} из {len(current_data)})"
            else:
                new_chart_config['config']['title'] = chart_name
                
            # Generate explanation
            changes = []
            if new_chart_config['chartType'] != current_chart.get('chartType'):
                changes.append(f"изменен тип на {chart_name}")
            if len(filtered_data) != len(current_data):
                changes.append(f"отфильтровано {len(filtered_data)} записей")
            
            explanation = f"График обновлен: {', '.join(changes) if changes else 'применены изменения'}"
            new_chart_config['analyticalText'] = f"{explanation}. Данные: {len(filtered_data)} записей с колонками {list(filtered_data.columns)}."
            
        else:
            type_names = {
                'AreaChart': 'Area Chart',
                'LineChart': 'Line Chart',
                'BarChart': 'Bar Chart', 
                'PieChart': 'Pie Chart',
                'ScatterChart': 'Scatter Chart',
                'RadarChart': 'Radar Chart'
            }
            
            chart_name = type_names.get(new_chart_config['chartType'], 'Chart')
            if len(filtered_data) != len(current_data):
                new_chart_config['config']['title'] = f"{chart_name} (filtered: {len(filtered_data)} of {len(current_data)})"
            else:
                new_chart_config['config']['title'] = chart_name
                
            # Generate explanation
            changes = []
            if new_chart_config['chartType'] != current_chart.get('chartType'):
                changes.append(f"changed type to {chart_name}")
            if len(filtered_data) != len(current_data):
                changes.append(f"filtered to {len(filtered_data)} records")
            
            explanation = f"Chart updated: {', '.join(changes) if changes else 'changes applied'}"
            new_chart_config['analyticalText'] = f"{explanation}. Data: {len(filtered_data)} records with columns {list(filtered_data.columns)}."
        
        return new_chart_config
        
    except Exception as e:
        print(f"Error in advanced fallback: {e}")
        return current_chart

if __name__ == "__main__":
    # Example usage
    excel_file_path = "sample.xlsx"  # Replace with the path to your file
    chart_config = main(excel_file_path)
    print(f"Chart configuration created: {json.dumps(chart_config, indent=2)}")
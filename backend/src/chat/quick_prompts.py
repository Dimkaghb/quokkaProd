"""
Enhanced LLM-based Quick Prompt Generator for QuokkaAI
Generates intelligent, contextual follow-up prompts based on AI responses and data analysis.
"""

import logging
import json
import random
from typing import List, Dict, Any, Optional
import pandas as pd

logger = logging.getLogger(__name__)

def generate_quick_prompts(
    ai_response: str,
    response_type: str,
    visualization: Optional[Dict[str, Any]] = None,
    current_data: Optional[List[Dict]] = None,
    user_message: str = ""
) -> List[str]:
    """
    Generate 2-3 intelligent contextual quick prompts using LLM analysis.
    
    Args:
        ai_response: The AI's response text
        response_type: Type of response (visualization, analysis, general, etc.)
        visualization: Visualization configuration if present
        current_data: Current data being analyzed
        user_message: Original user message for context
        
    Returns:
        List of 2-3 quick prompt suggestions
    """
    try:
        # Try LLM-based generation first
        llm_prompts = _generate_llm_based_prompts(
            ai_response, response_type, visualization, current_data, user_message
        )
        
        if llm_prompts and len(llm_prompts) >= 2:
            logger.info(f"Generated {len(llm_prompts)} LLM-based quick prompts")
            return llm_prompts[:3]  # Return max 3 prompts
        
        # Fallback to rule-based generation
        logger.info("Falling back to rule-based prompt generation")
        return _generate_rule_based_prompts(ai_response, response_type, visualization, current_data, user_message)
        
    except Exception as e:
        logger.error(f"Error generating quick prompts: {e}")
        return _get_fallback_prompts()

def _generate_llm_based_prompts(
    ai_response: str,
    response_type: str,
    visualization: Optional[Dict[str, Any]] = None,
    current_data: Optional[List[Dict]] = None,
    user_message: str = ""
) -> List[str]:
    """Generate intelligent prompts using LLM analysis of data context."""
    try:
        from ..data_analize.visualization import get_openai_client
        
        # Analyze data context
        data_context = _analyze_data_context(current_data) if current_data else {}
        
        # Detect language
        user_language = _detect_language(user_message + " " + ai_response)
        
        # Create LLM prompt for generating quick prompts
        system_prompt = _get_llm_system_prompt(user_language)
        user_prompt = _create_llm_user_prompt(
            ai_response, response_type, visualization, data_context, user_message, user_language
        )
        
        # Get LLM client
        llm_client = get_openai_client()
        response = llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        # Parse LLM response
        llm_response = response.choices[0].message.content.strip()
        
        # Extract JSON from response
        try:
            # Try to find JSON in the response
            start_idx = llm_response.find('{')
            end_idx = llm_response.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = llm_response[start_idx:end_idx]
                result = json.loads(json_str)
                
                if isinstance(result, dict) and 'prompts' in result:
                    prompts = result['prompts']
                    if isinstance(prompts, list) and len(prompts) >= 2:
                        return prompts[:3]  # Return max 3 prompts
            
        except json.JSONDecodeError:
            logger.warning("Failed to parse LLM response as JSON")
        
        return []
        
    except Exception as e:
        logger.error(f"Error in LLM-based prompt generation: {e}")
        return []

def _get_llm_system_prompt(language: str) -> str:
    """Get system prompt for LLM-based quick prompt generation."""
    if language == "ru":
        return """Ты эксперт по анализу данных, который генерирует умные быстрые подсказки для пользователей.

ТВОЯ ЗАДАЧА:
- Анализировать контекст данных и ответ ИИ
- Генерировать 2-3 релевантных, полезных и НЕ банальных быстрых подсказки
- Подсказки должны быть основаны на реальной структуре данных
- Избегать общих фраз типа "Создай визуализацию" - делать конкретные предложения

ПРИНЦИПЫ:
1. Анализируй структуру данных (столбцы, типы, значения)
2. Учитывай предыдущий запрос пользователя
3. Предлагай следующие логические шаги анализа
4. Делай подсказки специфичными для данных
5. Используй названия реальных столбцов из данных

ФОРМАТ ОТВЕТА (ТОЛЬКО JSON):
{
    "prompts": [
        "Конкретная подсказка 1 с названиями столбцов",
        "Конкретная подсказка 2 с анализом данных",
        "Конкретная подсказка 3 с визуализацией"
    ]
}"""
    else:
        return """You are a data analysis expert who generates smart quick prompts for users.

YOUR TASK:
- Analyze data context and AI response
- Generate 2-3 relevant, useful and NON-trivial quick prompts
- Prompts should be based on actual data structure
- Avoid generic phrases like "Create visualization" - make specific suggestions

PRINCIPLES:
1. Analyze data structure (columns, types, values)
2. Consider user's previous request
3. Suggest logical next steps in analysis
4. Make prompts specific to the data
5. Use actual column names from the data

RESPONSE FORMAT (JSON ONLY):
{
    "prompts": [
        "Specific prompt 1 with column names",
        "Specific prompt 2 with data analysis",
        "Specific prompt 3 with visualization"
    ]
}"""

def _create_llm_user_prompt(
    ai_response: str,
    response_type: str,
    visualization: Optional[Dict[str, Any]],
    data_context: Dict[str, Any],
    user_message: str,
    language: str
) -> str:
    """Create user prompt for LLM-based quick prompt generation."""
    
    # Get column information for more specific prompts
    columns = data_context.get('columns', [])
    numeric_columns = data_context.get('numeric_columns', [])
    categorical_columns = data_context.get('categorical_columns', [])
    
    if language == "ru":
        prompt = f"""КОНТЕКСТ ДАННЫХ:
Столбцы: {data_context.get('columns', [])}
Числовые столбцы: {data_context.get('numeric_columns', [])}
Категориальные столбцы: {data_context.get('categorical_columns', [])}
Временные столбцы: {data_context.get('datetime_columns', [])}
Размер данных: {data_context.get('data_size', 'неизвестно')}

ПРЕДЫДУЩИЙ ЗАПРОС ПОЛЬЗОВАТЕЛЯ: "{user_message}"

ОТВЕТ ИИ: "{ai_response[:500]}..."

ТИП ОТВЕТА: {response_type}

ТЕКУЩАЯ ВИЗУАЛИЗАЦИЯ: {json.dumps(visualization, ensure_ascii=False) if visualization else 'Нет'}

ЗАДАЧА: Сгенерируй 2-3 релевантных, полезных и НЕ тривиальных быстрых подсказки, которые:

1. ОБЯЗАТЕЛЬНО используют КОНКРЕТНЫЕ названия столбцов из данных
2. Предлагают следующие логические шаги анализа
3. Помогают углубить понимание данных
4. Специфичны для текущего контекста и данных

ПРАВИЛА:
- Используй ТОЧНЫЕ названия столбцов: {', '.join(columns[:5]) if columns else 'нет столбцов'}
- НЕ используй общие фразы типа "Покажи примеры", "Создай визуализацию"
- Каждая подсказка должна быть конкретной и действенной
- Фокусируйся на реальных столбцах и их анализе
- Предлагай конкретные виды анализа для конкретных полей

ПРИМЕРЫ ХОРОШИХ ПОДСКАЗОК (если есть столбцы "popularity", "region"):
- "Найди корреляцию между popularity и region"
- "Покажи топ-5 region по popularity"
- "Анализируй выбросы в popularity"""
    else:
        prompt = f"""DATA CONTEXT:
Columns: {data_context.get('columns', [])}
Numeric columns: {data_context.get('numeric_columns', [])}
Categorical columns: {data_context.get('categorical_columns', [])}
DateTime columns: {data_context.get('datetime_columns', [])}
Data size: {data_context.get('data_size', 'unknown')}

PREVIOUS USER REQUEST: "{user_message}"

AI RESPONSE: "{ai_response[:500]}..."

RESPONSE TYPE: {response_type}

CURRENT VISUALIZATION: {json.dumps(visualization) if visualization else 'None'}

TASK: Generate 2-3 relevant, useful and NON-trivial quick prompts that:

1. MUST use SPECIFIC column names from the data
2. Suggest logical next analysis steps
3. Help deepen data understanding
4. Are specific to current context and data

RULES:
- Use EXACT column names: {', '.join(columns[:5]) if columns else 'no columns'}
- DON'T use generic phrases like "Show examples", "Create visualization"
- Each prompt should be specific and actionable
- Focus on real columns and their analysis
- Suggest specific analysis types for specific fields

GOOD PROMPT EXAMPLES (if columns "popularity", "region" exist):
- "Find correlation between popularity and region"
- "Show top-5 region by popularity"
- "Analyze outliers in popularity"""
    
    return prompt

def _analyze_data_context(current_data: List[Dict]) -> Dict[str, Any]:
    """Analyze data structure and content for LLM context."""
    if not current_data:
        return {}
    
    try:
        # Convert to DataFrame for analysis
        df = pd.DataFrame(current_data)
        
        # Basic info
        columns = list(df.columns)
        data_size = f"{len(df)} rows × {len(columns)} columns"
        
        # Categorize columns by type
        numeric_columns = []
        categorical_columns = []
        datetime_columns = []
        
        for col in columns:
            if df[col].dtype in ['int64', 'float64', 'int32', 'float32']:
                numeric_columns.append(col)
            elif df[col].dtype == 'datetime64[ns]' or 'date' in col.lower() or 'time' in col.lower():
                datetime_columns.append(col)
            else:
                # Check if it's categorical (limited unique values)
                unique_ratio = df[col].nunique() / len(df)
                if unique_ratio < 0.5 or df[col].nunique() < 20:
                    categorical_columns.append(col)
                else:
                    categorical_columns.append(col)  # Default to categorical
        
        return {
            'columns': columns,
            'numeric_columns': numeric_columns,
            'categorical_columns': categorical_columns,
            'datetime_columns': datetime_columns,
            'data_size': data_size,
            'total_rows': len(df),
            'total_columns': len(columns)
        }
        
    except Exception as e:
        logger.error(f"Error analyzing data context: {e}")
        return {
            'columns': list(current_data[0].keys()) if current_data else [],
            'data_size': f"{len(current_data)} rows"
        }

def _detect_language(text: str) -> str:
    """Detect language from text (Russian or English)."""
    if not text:
        return "ru"  # Default to Russian
    
    # Count Cyrillic characters
    cyrillic_chars = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
    total_chars = len([c for c in text if c.isalpha()])
    
    if total_chars == 0:
        return "ru"
    
    cyrillic_ratio = cyrillic_chars / total_chars
    return "ru" if cyrillic_ratio > 0.3 else "en"

def _generate_rule_based_prompts(
    ai_response: str,
    response_type: str,
    visualization: Optional[Dict[str, Any]] = None,
    current_data: Optional[List[Dict]] = None,
    user_message: str = ""
) -> List[str]:
    """Fallback rule-based prompt generation."""
    try:
        prompts = []
        
        # Base prompts for different response types
        if response_type == "visualization":
            prompts.extend(_get_visualization_prompts(visualization, current_data))
        elif response_type == "analysis":
            prompts.extend(_get_analysis_prompts(ai_response, current_data))
        elif response_type == "data_processing":
            prompts.extend(_get_data_processing_prompts(current_data))
        else:
            prompts.extend(_get_general_prompts(ai_response, current_data))
        
        # Add contextual prompts based on data content
        if current_data:
            prompts.extend(_get_data_context_prompts(current_data))
        
        # Shuffle and select 2-3 prompts
        random.shuffle(prompts)
        selected_prompts = prompts[:3] if len(prompts) >= 3 else prompts[:2] if len(prompts) >= 2 else prompts
        
        # Ensure we have at least 2 prompts
        if len(selected_prompts) < 2:
            selected_prompts.extend(_get_fallback_prompts())
            selected_prompts = selected_prompts[:3]
        
        return selected_prompts
        
    except Exception as e:
        logger.error(f"Error in rule-based prompt generation: {e}")
        return _get_fallback_prompts()

def _get_visualization_prompts(visualization: Optional[Dict[str, Any]], current_data: Optional[List[Dict]]) -> List[str]:
    """Generate prompts for visualization responses"""
    prompts = [
        "Измени тип графика на линейный",
        "Добавь фильтры к этой визуализации",
        "Покажи топ-5 значений",
        "Создай сравнительный график",
        "Добавь тренд линию",
        "Измени цветовую схему",
        "Сделай интерактивную диаграмму",
        "Покажи данные по периодам"
    ]
    
    if visualization:
        chart_type = visualization.get('chartType', '').lower()
        if 'bar' in chart_type:
            prompts.extend([
                "Преобразуй в круговую диаграмму",
                "Сделай горизонтальные столбцы",
                "Добавь группировку данных"
            ])
        elif 'line' in chart_type:
            prompts.extend([
                "Добавь точки данных",
                "Покажи несколько линий",
                "Сделай область под графиком"
            ])
        elif 'pie' in chart_type:
            prompts.extend([
                "Преобразуй в столбчатую диаграмму",
                "Покажи проценты на диаграмме",
                "Выдели самый большой сегмент"
            ])
    
    return prompts

def _get_analysis_prompts(ai_response: str, current_data: Optional[List[Dict]]) -> List[str]:
    """Generate prompts for analysis responses"""
    prompts = [
        "Проведи более детальный анализ",
        "Найди корреляции в данных",
        "Покажи статистические показатели",
        "Выяви аномалии в данных",
        "Сравни с предыдущими периодами",
        "Создай прогноз на основе данных",
        "Покажи распределение данных",
        "Найди закономерности"
    ]
    
    # Add specific prompts based on analysis content
    if "тренд" in ai_response.lower() or "trend" in ai_response.lower():
        prompts.extend([
            "Покажи детали тренда",
            "Спрогнозируй будущие значения",
            "Найди причины изменений"
        ])
    
    if "корреляция" in ai_response.lower() or "correlation" in ai_response.lower():
        prompts.extend([
            "Покажи матрицу корреляций",
            "Найди самые сильные связи",
            "Объясни найденные корреляции"
        ])
    
    return prompts

def _get_data_processing_prompts(current_data: Optional[List[Dict]]) -> List[str]:
    """Generate prompts for data processing responses"""
    prompts = [
        "Очисти данные от выбросов",
        "Группируй данные по категориям",
        "Покажи сводную таблицу",
        "Экспортируй обработанные данные",
        "Добавь вычисляемые поля",
        "Фильтруй данные по условию",
        "Сортируй по важности",
        "Покажи уникальные значения"
    ]
    
    return prompts

def _get_general_prompts(ai_response: str, current_data: Optional[List[Dict]]) -> List[str]:
    """Generate general prompts"""
    prompts = []
    
    # If we have data, prioritize data-specific prompts
    if current_data:
        # Analyze the data structure first
        sample_record = current_data[0] if current_data else {}
        columns = list(sample_record.keys()) if sample_record else []
        
        # Generate data-specific prompts based on actual columns
        if columns:
            # Find numeric columns
            numeric_columns = []
            for col in columns:
                if sample_record.get(col) and isinstance(sample_record[col], (int, float)):
                    numeric_columns.append(col)
            
            # Find categorical columns
            categorical_columns = [col for col in columns if col not in numeric_columns]
            
            # Generate specific prompts based on data structure
            if numeric_columns:
                prompts.extend([
                    f"Покажи статистику по {numeric_columns[0]}",
                    f"Найди выбросы в {numeric_columns[0]}",
                    "Посчитай корреляции между числовыми полями"
                ])
            
            if categorical_columns:
                prompts.extend([
                    f"Группируй данные по {categorical_columns[0]}",
                    f"Покажи распределение {categorical_columns[0]}",
                    "Сравни категории между собой"
                ])
            
            # Add visualization prompts specific to the data
            if len(numeric_columns) >= 2:
                prompts.append(f"Создай scatter plot {numeric_columns[0]} vs {numeric_columns[1]}")
            
            if len(categorical_columns) >= 1 and len(numeric_columns) >= 1:
                prompts.append(f"Покажи {numeric_columns[0]} по {categorical_columns[0]}")
        
        # Add general data analysis prompts
        prompts.extend([
            "Найди интересные закономерности в данных",
            "Покажи основные метрики и статистику",
            "Создай сводную таблицу"
        ])
    else:
        # Fallback to general prompts only if no data
        prompts = [
            "Объясни подробнее",
            "Покажи примеры",
            "Дай рекомендации"
        ]
    
    return prompts

def _get_data_context_prompts(current_data: List[Dict]) -> List[str]:
    """Generate prompts based on data context"""
    prompts = []
    
    if not current_data:
        return prompts
    
    # Analyze data structure
    sample_record = current_data[0] if current_data else {}
    columns = list(sample_record.keys()) if sample_record else []
    
    # Numeric columns
    numeric_columns = []
    for col in columns:
        if sample_record.get(col) and isinstance(sample_record[col], (int, float)):
            numeric_columns.append(col)
    
    if numeric_columns:
        # Use actual column names in prompts
        for col in numeric_columns[:2]:  # Limit to first 2 numeric columns
            prompts.extend([
                f"Покажи распределение {col}",
                f"Найди выбросы в {col}",
                f"Посчитай статистику для {col}"
            ])
        
        if len(numeric_columns) >= 2:
            prompts.append(f"Сравни {numeric_columns[0]} и {numeric_columns[1]}")
    
    # Date/time columns
    date_columns = [col for col in columns if 'date' in col.lower() or 'time' in col.lower() or 'год' in col.lower() or 'дата' in col.lower()]
    if date_columns:
        date_col = date_columns[0]
        prompts.extend([
            f"Покажи динамику по {date_col}",
            f"Группируй данные по {date_col}",
            f"Найди тренды в {date_col}"
        ])
    
    # Category columns
    category_columns = [col for col in columns if col not in numeric_columns and col not in date_columns]
    if category_columns:
        # Use actual category column names
        for col in category_columns[:2]:  # Limit to first 2 category columns
            prompts.extend([
                f"Группируй по {col}",
                f"Покажи топ значения {col}",
                f"Сравни группы по {col}"
            ])
    
    # Cross-column analysis
    if len(numeric_columns) >= 1 and len(category_columns) >= 1:
        prompts.append(f"Анализируй {numeric_columns[0]} по {category_columns[0]}")
    
    return prompts

def _get_fallback_prompts() -> List[str]:
    """Fallback prompts when generation fails"""
    return [
        "Создай визуализацию",
        "Проанализируй данные",
        "Покажи статистику"
    ]
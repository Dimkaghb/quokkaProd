"""
Intelligent data analysis and recommendation system.
"""

import openai
import pandas as pd
import json
import os
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

@dataclass
class DataRecommendation:
    """Data structure for visualization recommendations."""
    chart_type: str
    columns: List[str]
    description: str
    confidence: float
    reasoning: str

@dataclass
class DataAnalysis:
    """Complete data analysis result."""
    complexity_score: float
    column_analysis: Dict[str, Dict[str, Any]]
    recommendations: List[DataRecommendation]
    suggested_questions: List[str]
    summary: str

def analyze_data_complexity(data: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyze data complexity and characteristics.
    
    Args:
        data: DataFrame to analyze
        
    Returns:
        Dictionary with complexity metrics
    """
    analysis = {
        'shape': data.shape,
        'columns': list(data.columns),
        'numeric_columns': data.select_dtypes(include=['number']).columns.tolist(),
        'categorical_columns': data.select_dtypes(include=['object', 'category']).columns.tolist(),
        'datetime_columns': data.select_dtypes(include=['datetime64']).columns.tolist(),
        'missing_values': data.isnull().sum().to_dict(),
        'unique_values': {col: data[col].nunique() for col in data.columns},
        'data_types': {col: str(data[col].dtype) for col in data.columns},
        'sample_data': data.head(5).to_dict('records')
    }
    
    # Calculate complexity score
    num_columns = len(data.columns)
    num_rows = len(data)
    num_numeric = len(analysis['numeric_columns'])
    num_categorical = len(analysis['categorical_columns'])
    
    complexity_score = (
        (num_columns * 0.3) +
        (min(num_rows / 1000, 10) * 0.2) +
        (num_numeric * 0.25) +
        (num_categorical * 0.25)
    )
    
    analysis['complexity_score'] = min(complexity_score, 10.0)
    analysis['is_complex'] = complexity_score > 5.0
    
    return analysis

def get_column_recommendations(data: pd.DataFrame, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate intelligent column recommendations for visualization.
    
    Args:
        data: DataFrame to analyze
        analysis: Data analysis results
        
    Returns:
        List of column recommendations
    """
    recommendations = []
    
    numeric_cols = analysis['numeric_columns']
    categorical_cols = analysis['categorical_columns']
    datetime_cols = analysis['datetime_columns']
    
    # Revenue/profit analysis recommendations
    revenue_keywords = ['revenue', 'profit', 'income', 'sales', 'price', 'cost', 'amount']
    quantity_keywords = ['quantity', 'count', 'sold', 'units', 'number']
    
    for col in numeric_cols:
        col_lower = col.lower()
        
        # Find potential revenue/profit columns
        if any(keyword in col_lower for keyword in revenue_keywords):
            recommendations.append({
                'type': 'revenue_analysis',
                'primary_column': col,
                'description': f'Analyze {col} patterns and trends',
                'suggested_charts': ['BarChart', 'LineChart', 'AreaChart'],
                'confidence': 0.9
            })
        
        # Find quantity-related columns
        if any(keyword in col_lower for keyword in quantity_keywords):
            recommendations.append({
                'type': 'quantity_analysis',
                'primary_column': col,
                'description': f'Analyze {col} distribution and patterns',
                'suggested_charts': ['BarChart', 'PieChart', 'LineChart'],
                'confidence': 0.8
            })
    
    # Category-based analysis
    for cat_col in categorical_cols:
        if len(data[cat_col].unique()) <= 20:  # Reasonable number of categories
            recommendations.append({
                'type': 'category_analysis',
                'primary_column': cat_col,
                'description': f'Compare performance across {cat_col}',
                'suggested_charts': ['BarChart', 'PieChart'],
                'confidence': 0.7
            })
    
    # Time-based analysis
    for date_col in datetime_cols:
        recommendations.append({
            'type': 'time_analysis',
            'primary_column': date_col,
            'description': f'Analyze trends over time using {date_col}',
            'suggested_charts': ['LineChart', 'AreaChart'],
            'confidence': 0.9
        })
    
    # Multi-column analysis
    if len(numeric_cols) >= 2:
        for i, col1 in enumerate(numeric_cols):
            for col2 in numeric_cols[i+1:]:
                recommendations.append({
                    'type': 'correlation_analysis',
                    'primary_column': col1,
                    'secondary_column': col2,
                    'description': f'Analyze relationship between {col1} and {col2}',
                    'suggested_charts': ['ScatterChart', 'ComposedChart'],
                    'confidence': 0.6
                })
    
    return recommendations

def generate_suggested_questions(data: pd.DataFrame, analysis: Dict[str, Any]) -> List[str]:
    """
    Generate intelligent questions users might want to ask about the data.
    
    Args:
        data: DataFrame to analyze
        analysis: Data analysis results
        
    Returns:
        List of suggested questions
    """
    questions = []
    
    numeric_cols = analysis['numeric_columns']
    categorical_cols = analysis['categorical_columns']
    datetime_cols = analysis['datetime_columns']
    
    # Revenue/business questions
    revenue_cols = [col for col in numeric_cols if any(keyword in col.lower() 
                   for keyword in ['revenue', 'profit', 'sales', 'income', 'price'])]
    
    if revenue_cols:
        questions.extend([
            f"Which {categorical_cols[0] if categorical_cols else 'category'} generated the most revenue?",
            f"What is the trend of {revenue_cols[0]} over time?",
            f"How does {revenue_cols[0]} compare across different categories?"
        ])
    
    # Quantity/performance questions
    quantity_cols = [col for col in numeric_cols if any(keyword in col.lower() 
                    for keyword in ['quantity', 'count', 'sold', 'units', 'number'])]
    
    if quantity_cols:
        questions.extend([
            f"What is the distribution of {quantity_cols[0]}?",
            f"Which products/items have the highest {quantity_cols[0]}?"
        ])
    
    # Category analysis questions
    if categorical_cols:
        questions.extend([
            f"How do values compare across {categorical_cols[0]}?",
            f"What is the breakdown by {categorical_cols[0]}?"
        ])
    
    # Time analysis questions
    if datetime_cols:
        questions.extend([
            f"What are the trends over {datetime_cols[0]}?",
            f"How do values change over time?"
        ])
    
    # Correlation questions
    if len(numeric_cols) >= 2:
        questions.extend([
            f"Is there a relationship between {numeric_cols[0]} and {numeric_cols[1]}?",
            f"How do {numeric_cols[0]} and {numeric_cols[1]} correlate?"
        ])
    
    return questions[:8]  # Limit to 8 questions

def analyze_data_with_ai(data: pd.DataFrame, user_query: str = "") -> DataAnalysis:
    """
    Perform comprehensive AI-powered data analysis.
    
    Args:
        data: DataFrame to analyze
        user_query: Optional user query for context
        
    Returns:
        Complete data analysis with recommendations
    """
    # Get basic analysis
    basic_analysis = analyze_data_complexity(data)
    
    # Get column recommendations
    column_recs = get_column_recommendations(data, basic_analysis)
    
    # Generate suggested questions
    suggested_questions = generate_suggested_questions(data, basic_analysis)
    
    # Create AI prompt for deeper analysis
    prompt = f"""
    Analyze this dataset and provide intelligent recommendations:

    Dataset Info:
    - Shape: {basic_analysis['shape']}
    - Columns: {basic_analysis['columns']}
    - Numeric columns: {basic_analysis['numeric_columns']}
    - Categorical columns: {basic_analysis['categorical_columns']}
    - Sample data: {json.dumps(basic_analysis['sample_data'][:3], indent=2)}

    User Query: {user_query if user_query else "General analysis"}

    Provide:
    1. A summary of what this data represents
    2. Top 3 visualization recommendations with reasoning
    3. Key insights about the data structure

    Return as JSON with this structure:
    {{
        "summary": "Brief description of the dataset",
        "recommendations": [
            {{
                "chart_type": "ChartType",
                "columns": ["col1", "col2"],
                "description": "Why this visualization is recommended",
                "confidence": 0.9,
                "reasoning": "Detailed reasoning"
            }}
        ],
        "key_insights": ["insight1", "insight2", "insight3"]
    }}
    """
    
    try:
        openai.api_key = os.getenv("OPENAI_API_KEY")
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert data analyst. Provide concise, actionable insights."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.3,
        )

        ai_response = response['choices'][0]['message']['content'].strip()
        
        # Clean and parse AI response
        if ai_response.startswith('```json'):
            ai_response = ai_response[7:]
        if ai_response.startswith('```'):
            ai_response = ai_response[3:]
        if ai_response.endswith('```'):
            ai_response = ai_response[:-3]
            
        ai_analysis = json.loads(ai_response)
        
        # Convert to DataRecommendation objects
        recommendations = []
        for rec in ai_analysis.get('recommendations', []):
            recommendations.append(DataRecommendation(
                chart_type=rec.get('chart_type', 'BarChart'),
                columns=rec.get('columns', []),
                description=rec.get('description', ''),
                confidence=rec.get('confidence', 0.5),
                reasoning=rec.get('reasoning', '')
            ))
        
        return DataAnalysis(
            complexity_score=basic_analysis['complexity_score'],
            column_analysis=basic_analysis,
            recommendations=recommendations,
            suggested_questions=suggested_questions,
            summary=ai_analysis.get('summary', 'Data analysis completed')
        )
        
    except Exception as e:
        print(f"Error in AI analysis: {e}")
        
        # Fallback to basic recommendations
        recommendations = []
        for rec in column_recs[:3]:
            recommendations.append(DataRecommendation(
                chart_type=rec['suggested_charts'][0],
                columns=[rec['primary_column']],
                description=rec['description'],
                confidence=rec['confidence'],
                reasoning=f"Based on column type and content analysis"
            ))
        
        return DataAnalysis(
            complexity_score=basic_analysis['complexity_score'],
            column_analysis=basic_analysis,
            recommendations=recommendations,
            suggested_questions=suggested_questions,
            summary="Basic data analysis completed"
        )

def create_visualization_from_query(data: pd.DataFrame, user_query: str, selected_columns: List[str] = None) -> Dict[str, Any]:
    """
    Create visualization based on user query and selected columns.
    
    Args:
        data: DataFrame to visualize
        user_query: User's question/request
        selected_columns: Optional list of columns to focus on
        
    Returns:
        Recharts configuration and analysis
    """
    # Analyze data first
    analysis = analyze_data_complexity(data)
    
    # Filter data if columns are selected
    if selected_columns:
        available_columns = [col for col in selected_columns if col in data.columns]
        if available_columns:
            data = data[available_columns]
            analysis = analyze_data_complexity(data)
    
    # Create structured prompt for visualization
    prompt = f"""
    Create a Recharts visualization configuration based on the user's query and data.

    User Query: "{user_query}"

    Dataset Info:
    - Shape: {analysis['shape']}
    - Columns: {analysis['columns']}
    - Numeric columns: {analysis['numeric_columns']}
    - Categorical columns: {analysis['categorical_columns']}
    - Sample data: {json.dumps(analysis['sample_data'][:3], indent=2)}

    Requirements:
    1. Choose the most appropriate chart type for the user's question
    2. Select the right columns to answer their query
    3. Create meaningful titles and labels
    4. Provide analytical text that directly answers the user's question

    Return JSON with this exact structure:
    {{
        "chartType": "ChartType",
        "data": [],
        "config": {{
            "xKey": "column_name",
            "yKey": "column_name",
            "title": "Chart Title",
            "xLabel": "X Axis Label",
            "yLabel": "Y Axis Label",
            "colors": ["#8884d8", "#82ca9d", "#ffc658"]
        }},
        "analyticalText": "Detailed analysis answering the user's question in Russian"
    }}

    Chart types available: LineChart, BarChart, ScatterChart, PieChart, AreaChart, RadarChart, ComposedChart
    """
    
    try:
        openai.api_key = os.getenv("OPENAI_API_KEY")
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert data visualization specialist. Create configurations that directly answer user questions."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
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
            
        # Parse JSON
        chart_config = json.loads(config_text)
        
        # Add actual data
        chart_config['data'] = data.to_dict('records')
        
        return chart_config
        
    except Exception as e:
        print(f"Error creating visualization from query: {e}")
        
        # Fallback to basic visualization
        from .visualization import generate_fallback_config
        return generate_fallback_config(data, analysis) 
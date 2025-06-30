"""
Data Visualization Agent for QuokkaAI - creates interactive charts and visualizations from data.

This module implements a sophisticated visualization agent that can:
- Analyze numerical and statistical data from uploaded files
- Generate appropriate chart types based on data characteristics
- Create interactive visualizations using Plotly
- Provide statistical insights alongside visualizations
- Integrate seamlessly with the root agent for conversational data analysis
"""

import asyncio
import logging
import os
import json
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass
from datetime import datetime
import pandas as pd
import numpy as np

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

# Visualization libraries
import plotly.express as px
import plotly.graph_objects as go
import plotly.figure_factory as ff
from plotly.subplots import make_subplots
import plotly.io as pio
import matplotlib.pyplot as plt
import seaborn as sns

# Try to import kaleido for PNG export
try:
    import kaleido
    KALEIDO_AVAILABLE = True
except ImportError:
    KALEIDO_AVAILABLE = False
    logger.warning("Kaleido not installed. PNG export will not be available. Install with: pip install kaleido")

# Statistical analysis
from scipy import stats
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

# LangChain imports
from langchain_core.tools import Tool
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)


class VisualizationSettings(BaseSettings):
    """Settings for the visualization agent."""
    
    openai_api_key: str = Field(alias="OPENAI_API_KEY", description="OpenAI API key")
    data_directory: str = Field(default="data/rag", description="Directory for data files")
    output_directory: str = Field(default="data/visualizations", description="Directory for saved visualizations")
    default_theme: str = Field(default="plotly_white", description="Default Plotly theme")
    max_data_points: int = Field(default=10000, description="Maximum data points for visualization")
    chart_width: int = Field(default=800, description="Default chart width")
    chart_height: int = Field(default=600, description="Default chart height")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


@dataclass
class ChartRecommendation:
    """Recommendation for chart type based on data analysis."""
    chart_type: str
    confidence: float
    reasoning: str
    suggested_columns: List[str]
    chart_config: Dict[str, Any]


@dataclass
class VisualizationResult:
    """Result of data visualization."""
    chart_json: str
    chart_type: str
    title: str
    description: str
    insights: List[str]
    statistical_summary: Dict[str, Any]
    data_summary: Dict[str, Any]
    recommendations: List[str]
    image_path: str


class DataAnalyzer:
    """Analyzes data characteristics to recommend appropriate visualizations."""
    
    @staticmethod
    def analyze_data_characteristics(df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze data to understand its characteristics."""
        characteristics = {
            "shape": df.shape,
            "columns": list(df.columns),
            "dtypes": df.dtypes.to_dict(),
            "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
            "categorical_columns": df.select_dtypes(include=['object', 'category']).columns.tolist(),
            "datetime_columns": df.select_dtypes(include=['datetime64']).columns.tolist(),
            "missing_values": df.isnull().sum().to_dict(),
            "unique_counts": {col: df[col].nunique() for col in df.columns},
        }
        
        # Statistical summaries for numeric columns
        if characteristics["numeric_columns"]:
            characteristics["numeric_summary"] = df[characteristics["numeric_columns"]].describe().to_dict()
        
        # Categorical summaries
        categorical_summary = {}
        for col in characteristics["categorical_columns"]:
            if df[col].nunique() <= 20:  # Only for columns with reasonable number of categories
                categorical_summary[col] = df[col].value_counts().head(10).to_dict()
        characteristics["categorical_summary"] = categorical_summary
        
        return characteristics

    @staticmethod
    def recommend_chart_types(df: pd.DataFrame, query: str = "") -> List[ChartRecommendation]:
        """Recommend appropriate chart types based on data characteristics and user query."""
        characteristics = DataAnalyzer.analyze_data_characteristics(df)
        recommendations = []
        
        numeric_cols = characteristics["numeric_columns"]
        categorical_cols = characteristics["categorical_columns"]
        datetime_cols = characteristics["datetime_columns"]
        
        query_lower = query.lower()
        
        # Time series analysis
        if datetime_cols and numeric_cols:
            for date_col in datetime_cols:
                for num_col in numeric_cols:
                    recommendations.append(ChartRecommendation(
                        chart_type="line",
                        confidence=0.9,
                        reasoning=f"Time series data detected with {date_col} and {num_col}",
                        suggested_columns=[date_col, num_col],
                        chart_config={"x": date_col, "y": num_col, "title": f"{num_col} over {date_col}"}
                    ))
        
        # Correlation analysis for multiple numeric columns
        if len(numeric_cols) >= 2:
            if "correlation" in query_lower or "relationship" in query_lower:
                recommendations.append(ChartRecommendation(
                    chart_type="scatter",
                    confidence=0.85,
                    reasoning="Multiple numeric columns suitable for correlation analysis",
                    suggested_columns=numeric_cols[:2],
                    chart_config={"x": numeric_cols[0], "y": numeric_cols[1], "title": f"{numeric_cols[1]} vs {numeric_cols[0]}"}
                ))
            
            # Heatmap for correlation matrix
            if len(numeric_cols) >= 3:
                recommendations.append(ChartRecommendation(
                    chart_type="heatmap",
                    confidence=0.8,
                    reasoning="Multiple numeric columns suitable for correlation heatmap",
                    suggested_columns=numeric_cols,
                    chart_config={"title": "Correlation Matrix"}
                ))
        
        # Distribution analysis
        if numeric_cols:
            for col in numeric_cols[:3]:  # Limit to first 3 numeric columns
                if "distribution" in query_lower or "histogram" in query_lower:
                    recommendations.append(ChartRecommendation(
                        chart_type="histogram",
                        confidence=0.8,
                        reasoning=f"Numeric column {col} suitable for distribution analysis",
                        suggested_columns=[col],
                        chart_config={"x": col, "title": f"Distribution of {col}"}
                    ))
                else:
                    # Add histogram as default for numeric columns
                    recommendations.append(ChartRecommendation(
                        chart_type="histogram",
                        confidence=0.6,
                        reasoning=f"Numeric column {col} can show distribution",
                        suggested_columns=[col],
                        chart_config={"x": col, "title": f"Distribution of {col}"}
                    ))
        
        # Categorical analysis
        if categorical_cols and numeric_cols:
            for cat_col in categorical_cols:
                if df[cat_col].nunique() <= 10:  # Reasonable number of categories
                    for num_col in numeric_cols:
                        recommendations.append(ChartRecommendation(
                            chart_type="bar",
                            confidence=0.75,
                            reasoning=f"Categorical column {cat_col} with numeric {num_col}",
                            suggested_columns=[cat_col, num_col],
                            chart_config={"x": cat_col, "y": num_col, "title": f"{num_col} by {cat_col}"}
                        ))
        
        # Box plots for categorical vs numeric
        if categorical_cols and numeric_cols:
            for cat_col in categorical_cols:
                if df[cat_col].nunique() <= 8:
                    for num_col in numeric_cols:
                        recommendations.append(ChartRecommendation(
                            chart_type="box",
                            confidence=0.7,
                            reasoning=f"Box plot to show {num_col} distribution across {cat_col} categories",
                            suggested_columns=[cat_col, num_col],
                            chart_config={"x": cat_col, "y": num_col, "title": f"{num_col} Distribution by {cat_col}"}
                        ))
        
        # Pie charts for categorical data
        if categorical_cols:
            for col in categorical_cols:
                if df[col].nunique() <= 8 and df[col].nunique() >= 2:
                    recommendations.append(ChartRecommendation(
                        chart_type="pie",
                        confidence=0.6,
                        reasoning=f"Categorical column {col} suitable for composition analysis",
                        suggested_columns=[col],
                        chart_config={"values": col, "title": f"Distribution of {col}"}
                    ))
        
        # Sort by confidence and return top recommendations
        return sorted(recommendations, key=lambda x: x.confidence, reverse=True)[:5]


class ChartGenerator:
    """Generates interactive charts using Plotly."""
    
    def __init__(self, settings: VisualizationSettings):
        self.settings = settings
        
    def create_line_chart(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create an interactive line chart with better handling for time series data."""
        try:
            # Check if this is revenue data with years as columns
            if 'Наименование показателей' in df.columns or 'Category' in df.columns:
                # This is likely the Kazakhstan budget data
                category_col = 'Наименование показателей' if 'Наименование показателей' in df.columns else 'Category'
                
                # Get year columns
                year_columns = [col for col in df.columns if col.isdigit() or col.startswith('20')]
                if year_columns:
                    # Create line chart with one line per category
                    fig = go.Figure()
                    
                    for _, row in df.iterrows():
                        category = row[category_col]
                        values = [row[year] for year in year_columns]
                        
                        fig.add_trace(go.Scatter(
                            x=year_columns,
                            y=values,
                            mode='lines+markers',
                            name=category,
                            line=dict(width=3),
                            marker=dict(size=8)
                        ))
                    
                    fig.update_layout(
                        title=config.get("title", "Revenue Trends Over Time"),
                        xaxis_title="Year",
                        yaxis_title="Revenue (тенге)",
                        template=self.settings.default_theme,
                        width=self.settings.chart_width,
                        height=self.settings.chart_height,
                        hovermode='x unified',
                        showlegend=True,
                        legend=dict(
                            orientation="v",
                            yanchor="top",
                            y=0.99,
                            xanchor="left",
                            x=1.01
                        )
                    )
                    
                    # Format y-axis for large numbers
                    fig.update_yaxis(tickformat=",")
                    
                    return fig
            
            # Standard line chart logic
            # Check if data is time series
            if config.get("x") and config.get("x") in df.columns:
                # Try to convert x to datetime if it looks like dates
                try:
                    df[config.get("x")] = pd.to_datetime(df[config.get("x")])
                    df = df.sort_values(config.get("x"))
                except:
                    pass
            
            fig = px.line(
                df,
                x=config.get("x"),
                y=config.get("y"),
                color=config.get("color"),
                title=config.get("title", "Line Chart"),
                template=self.settings.default_theme,
                markers=True
            )
            
            fig.update_layout(
                width=self.settings.chart_width,
                height=self.settings.chart_height
            )
            
            return fig
            
        except Exception as e:
            logger.error(f"Error creating line chart: {e}")
            # Return a simple error chart
            fig = go.Figure()
            fig.add_annotation(
                text=f"Error creating chart: {str(e)}",
                xref="paper", yref="paper",
                x=0.5, y=0.5,
                showarrow=False
            )
            return fig
    
    def create_scatter_plot(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create an interactive scatter plot."""
        fig = px.scatter(
            df,
            x=config.get("x"),
            y=config.get("y"),
            color=config.get("color"),
            size=config.get("size"),
            title=config.get("title", "Scatter Plot"),
            template=self.settings.default_theme,
            trendline="ols" if config.get("trendline", False) else None
        )
        
        fig.update_layout(
            width=self.settings.chart_width,
            height=self.settings.chart_height
        )
        
        return fig
    
    def create_bar_chart(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create an interactive bar chart with better handling for revenue data."""
        try:
            # Check if this is revenue data with years as columns
            if 'Наименование показателей' in df.columns or 'Category' in df.columns:
                # This is likely the Kazakhstan budget data
                category_col = 'Наименование показателей' if 'Наименование показателей' in df.columns else 'Category'
                
                # Reshape data for plotting (melt years into a single column)
                year_columns = [col for col in df.columns if col.isdigit() or col.startswith('20')]
                if year_columns:
                    df_melted = df.melt(
                        id_vars=[category_col],
                        value_vars=year_columns,
                        var_name='Year',
                        value_name='Revenue'
                    )
                    
                    # Create grouped bar chart
                    fig = px.bar(
                        df_melted,
                        x='Year',
                        y='Revenue',
                        color=category_col,
                        title=config.get("title", "Revenue by Year and Category"),
                        template=self.settings.default_theme,
                        text_auto='.2s'  # Format numbers nicely
                    )
                    
                    fig.update_layout(
                        width=self.settings.chart_width,
                        height=self.settings.chart_height,
                        xaxis_tickangle=0,
                        yaxis_title="Revenue (тенге)",
                        showlegend=True,
                        legend=dict(
                            orientation="h",
                            yanchor="bottom",
                            y=1.02,
                            xanchor="right",
                            x=1
                        )
                    )
                    
                    return fig
            
            # Standard bar chart logic
            # Aggregate data if needed
            if config.get("aggregate", True) and config.get("x") and config.get("y"):
                agg_df = df.groupby(config.get("x"))[config.get("y")].mean().reset_index()
            else:
                agg_df = df
                
            fig = px.bar(
                agg_df,
                x=config.get("x"),
                y=config.get("y"),
                color=config.get("color"),
                title=config.get("title", "Bar Chart"),
                template=self.settings.default_theme
            )
            
            fig.update_layout(
                width=self.settings.chart_width,
                height=self.settings.chart_height,
                xaxis_tickangle=-45
            )
            
            return fig
            
        except Exception as e:
            logger.error(f"Error creating bar chart: {e}")
            # Return a simple error chart
            fig = go.Figure()
            fig.add_annotation(
                text=f"Error creating chart: {str(e)}",
                xref="paper", yref="paper",
                x=0.5, y=0.5,
                showarrow=False
            )
            return fig
    
    def create_histogram(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create an interactive histogram."""
        fig = px.histogram(
            df,
            x=config.get("x"),
            color=config.get("color"),
            title=config.get("title", "Histogram"),
            template=self.settings.default_theme,
            marginal="box"  # Add box plot on top
        )
        
        fig.update_layout(
            width=self.settings.chart_width,
            height=self.settings.chart_height
        )
        
        return fig
    
    def create_box_plot(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create an interactive box plot."""
        fig = px.box(
            df,
            x=config.get("x"),
            y=config.get("y"),
            color=config.get("color"),
            title=config.get("title", "Box Plot"),
            template=self.settings.default_theme
        )
        
        fig.update_layout(
            width=self.settings.chart_width,
            height=self.settings.chart_height
        )
        
        return fig
    
    def create_heatmap(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create a correlation heatmap."""
        numeric_df = df.select_dtypes(include=[np.number])
        correlation_matrix = numeric_df.corr()
        
        fig = px.imshow(
            correlation_matrix,
            text_auto=True,
            aspect="auto",
            title=config.get("title", "Correlation Heatmap"),
            template=self.settings.default_theme,
            color_continuous_scale="RdBu_r"
        )
        
        fig.update_layout(
            width=self.settings.chart_width,
            height=self.settings.chart_height
        )
        
        return fig
    
    def create_pie_chart(self, df: pd.DataFrame, config: Dict[str, Any]) -> go.Figure:
        """Create an interactive pie chart with better handling for revenue composition."""
        try:
            # Check if this is revenue data with years as columns
            if 'Наименование показателей' in df.columns or 'Category' in df.columns:
                # This is likely the Kazakhstan budget data
                category_col = 'Наименование показателей' if 'Наименование показателей' in df.columns else 'Category'
                
                # Get year columns
                year_columns = [col for col in df.columns if col.isdigit() or col.startswith('20')]
                
                # Determine which year to show (default to latest year)
                year_to_show = config.get("year", year_columns[-1] if year_columns else None)
                
                # If a specific year is mentioned in the title, try to use that
                if config.get("title", ""):
                    for year in year_columns:
                        if year in config.get("title", ""):
                            year_to_show = year
                            break
                
                if year_to_show and year_to_show in df.columns:
                    # Create pie chart for specific year
                    values = df[year_to_show].tolist()
                    labels = df[category_col].tolist()
                    
                    # Filter out zero or negative values
                    filtered_data = [(label, value) for label, value in zip(labels, values) if value > 0]
                    if filtered_data:
                        labels, values = zip(*filtered_data)
                        
                        fig = px.pie(
                            values=values,
                            names=labels,
                            title=config.get("title", f"Revenue Composition for {year_to_show}"),
                            template=self.settings.default_theme
                        )
                        
                        # Update traces to show percentage and value
                        fig.update_traces(
                            textposition='inside',
                            textinfo='percent+label',
                            hovertemplate='%{label}<br>%{value:,.0f} тенге<br>%{percent}<extra></extra>'
                        )
                        
                        fig.update_layout(
                            width=self.settings.chart_width,
                            height=self.settings.chart_height,
                            showlegend=True,
                            legend=dict(
                                orientation="v",
                                yanchor="middle",
                                y=0.5,
                                xanchor="left",
                                x=1.05
                            )
                        )
                        
                        return fig
            
            # Standard pie chart logic for other data
            if config.get("values") and config.get("values") in df.columns:
                # Aggregate data for pie chart
                value_counts = df[config.get("values")].value_counts()
                
                fig = px.pie(
                    values=value_counts.values,
                    names=value_counts.index,
                    title=config.get("title", "Pie Chart"),
                    template=self.settings.default_theme
                )
            else:
                # Try to create pie chart from first categorical and numeric columns
                categorical_cols = df.select_dtypes(include=['object']).columns
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                
                if len(categorical_cols) > 0 and len(numeric_cols) > 0:
                    cat_col = categorical_cols[0]
                    num_col = numeric_cols[0]
                    
                    # Group by category and sum numeric values
                    grouped = df.groupby(cat_col)[num_col].sum().reset_index()
                    
                    fig = px.pie(
                        grouped,
                        values=num_col,
                        names=cat_col,
                        title=config.get("title", f"{num_col} by {cat_col}"),
                        template=self.settings.default_theme
                    )
                else:
                    # Fallback - create empty chart
                    fig = go.Figure()
                    fig.add_annotation(
                        text="No suitable data for pie chart",
                        xref="paper", yref="paper",
                        x=0.5, y=0.5,
                        showarrow=False
                    )
            
            fig.update_layout(
                width=self.settings.chart_width,
                height=self.settings.chart_height
            )
            
            return fig
            
        except Exception as e:
            logger.error(f"Error creating pie chart: {e}")
            # Return a simple error chart
            fig = go.Figure()
            fig.add_annotation(
                text=f"Error creating chart: {str(e)}",
                xref="paper", yref="paper",
                x=0.5, y=0.5,
                showarrow=False
            )
            return fig
    
    def create_advanced_chart(self, df: pd.DataFrame, chart_type: str, config: Dict[str, Any]) -> go.Figure:
        """Create advanced chart types."""
        if chart_type == "violin":
            fig = px.violin(
                df,
                x=config.get("x"),
                y=config.get("y"),
                color=config.get("color"),
                title=config.get("title", "Violin Plot"),
                template=self.settings.default_theme
            )
        elif chart_type == "density_heatmap":
            fig = px.density_heatmap(
                df,
                x=config.get("x"),
                y=config.get("y"),
                title=config.get("title", "Density Heatmap"),
                template=self.settings.default_theme
            )
        elif chart_type == "parallel_coordinates":
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            fig = px.parallel_coordinates(
                df,
                dimensions=numeric_cols[:6],  # Limit to 6 dimensions
                title=config.get("title", "Parallel Coordinates"),
                template=self.settings.default_theme
            )
        else:
            # Fallback to scatter plot
            fig = self.create_scatter_plot(df, config)
        
        fig.update_layout(
            width=self.settings.chart_width,
            height=self.settings.chart_height
        )
        
        return fig


class DataVisualizationAgent:
    """
    Advanced data visualization agent for creating interactive charts and insights.
    
    Capabilities:
    - Intelligent chart type recommendation based on data characteristics
    - Interactive visualizations using Plotly
    - Statistical analysis alongside visualizations
    - Context-aware chart generation based on user queries
    - Integration with conversation memory and data context
    """
    
    def __init__(self, settings: Optional[VisualizationSettings] = None):
        """Initialize the visualization agent."""
        self.settings = settings or VisualizationSettings()
        self._setup_directories()
        
        # Initialize components (LLM is optional for basic visualization)
        self.llm = None
        if self.settings.openai_api_key and self.settings.openai_api_key != "test_key":
            try:
                self.llm = ChatOpenAI(
                    model="gpt-4o-mini",
                    api_key=self.settings.openai_api_key,
                    temperature=0.1
                )
            except Exception as e:
                logger.warning(f"Could not initialize LLM: {e}. Continuing without AI insights.")
        
        self.data_analyzer = DataAnalyzer()
        self.chart_generator = ChartGenerator(self.settings)
        
        logger.info("DataVisualizationAgent initialized successfully")
    
    def _setup_directories(self) -> None:
        """Create necessary directories."""
        Path(self.settings.output_directory).mkdir(parents=True, exist_ok=True)
    
    async def create_visualization(
        self, 
        data: Union[pd.DataFrame, str, Dict[str, Any]], 
        query: str = "",
        chart_type: Optional[str] = None
    ) -> VisualizationResult:
        """
        Create visualization from data with intelligent chart selection.
        
        Args:
            data: DataFrame, file path, or data dictionary
            query: User query to guide visualization choice
            chart_type: Specific chart type to create (optional)
            
        Returns:
            VisualizationResult with chart and insights
        """
        try:
            # Convert data to DataFrame if needed
            df = await self._prepare_data(data)
            
            if df.empty:
                return VisualizationResult(
                    chart_json="{}",
                    chart_type="error",
                    title="No Data Available",
                    description="No valid data found for visualization",
                    insights=["Please upload data with numerical or categorical columns"],
                    statistical_summary={},
                    data_summary={},
                    recommendations=["Upload a CSV or Excel file with data to visualize"],
                    image_path=""
                )
            
            # Analyze data characteristics
            characteristics = self.data_analyzer.analyze_data_characteristics(df)
            
            # Get chart recommendations
            recommendations = self.data_analyzer.recommend_chart_types(df, query)
            
            if not recommendations:
                return VisualizationResult(
                    chart_json="{}",
                    chart_type="error",
                    title="No Suitable Visualization",
                    description="Could not determine appropriate chart type for this data",
                    insights=["Data may not be suitable for visualization"],
                    statistical_summary=characteristics.get("numeric_summary", {}),
                    data_summary=characteristics,
                    recommendations=["Try uploading data with numerical columns"],
                    image_path=""
                )
            
            # Select chart type
            if chart_type:
                # Find matching recommendation or create a custom one
                selected_rec = next(
                    (rec for rec in recommendations if rec.chart_type == chart_type),
                    None
                )
                
                if selected_rec is None:
                    # Create a custom recommendation for the requested chart type
                    selected_rec = self._create_custom_chart_recommendation(df, chart_type, query)
            else:
                selected_rec = recommendations[0]
            
            # Generate the chart
            fig = await self._generate_chart(df, selected_rec)
            
            # Generate insights
            insights = await self._generate_insights(df, characteristics, selected_rec, query)
            
            # Create statistical summary
            statistical_summary = await self._create_statistical_summary(df, selected_rec)
            
            # Generate recommendations
            chart_recommendations = [
                f"Try {rec.chart_type} chart: {rec.reasoning}" 
                for rec in recommendations[:3]
            ]
            
            # Save chart as image
            image_path = self._save_chart_as_image(fig)
            
            return VisualizationResult(
                chart_json=fig.to_json(),
                chart_type=selected_rec.chart_type,
                title=selected_rec.chart_config.get("title", "Data Visualization"),
                description=f"Interactive {selected_rec.chart_type} chart showing {', '.join(selected_rec.suggested_columns)}",
                insights=insights,
                statistical_summary=statistical_summary,
                data_summary={
                    "rows": df.shape[0],
                    "columns": df.shape[1],
                    "numeric_columns": len(characteristics["numeric_columns"]),
                    "categorical_columns": len(characteristics["categorical_columns"])
                },
                recommendations=chart_recommendations,
                image_path=image_path
            )
            
        except Exception as e:
            logger.error(f"Error creating visualization: {e}")
            return VisualizationResult(
                chart_json="{}",
                chart_type="error",
                title="Visualization Error",
                description=f"Error creating visualization: {str(e)}",
                insights=[f"Error: {str(e)}"],
                statistical_summary={},
                data_summary={},
                recommendations=["Please check your data format and try again"],
                image_path=""
            )
    
    async def _prepare_data(self, data: Union[pd.DataFrame, str, Dict[str, Any]]) -> pd.DataFrame:
        """Prepare data for visualization."""
        if isinstance(data, pd.DataFrame):
            return data
        elif isinstance(data, str):
            # Assume it's a file path
            return await self._load_data_from_file(data)
        elif isinstance(data, dict):
            return pd.DataFrame(data)
        else:
            raise ValueError(f"Unsupported data type: {type(data)}")
    
    async def _load_data_from_file(self, file_path: str) -> pd.DataFrame:
        """Load data from file with enhanced error handling and format support."""
        path = Path(file_path)
        
        if not path.exists():
            # Try in data directory
            path = Path(self.settings.data_directory) / file_path
        
        if not path.exists():
            # Try finding the most recent file in data directory
            data_dir = Path(self.settings.data_directory)
            if data_dir.exists():
                data_files = []
                for ext in ['.csv', '.xlsx', '.xls', '.json']:
                    data_files.extend(list(data_dir.glob(f"*{ext}")))
                
                if data_files:
                    # Use the most recently modified file
                    path = max(data_files, key=lambda f: f.stat().st_mtime)
                    logger.info(f"Using most recent data file: {path}")
                else:
                    raise FileNotFoundError(f"No data files found in {data_dir}")
            else:
                raise FileNotFoundError(f"Data directory not found: {data_dir}")
        
        # Load based on file extension with better error handling
        try:
            if path.suffix.lower() == '.csv':
                # Try different encodings and separators
                try:
                    return pd.read_csv(path, encoding='utf-8')
                except UnicodeDecodeError:
                    try:
                        return pd.read_csv(path, encoding='latin-1')
                    except:
                        return pd.read_csv(path, encoding='cp1252')
            elif path.suffix.lower() in ['.xlsx', '.xls']:
                return pd.read_excel(path)
            elif path.suffix.lower() == '.json':
                return pd.read_json(path)
            else:
                raise ValueError(f"Unsupported file format: {path.suffix}")
        except Exception as e:
            logger.error(f"Error loading file {path}: {e}")
            raise ValueError(f"Failed to load data file {path}: {str(e)}")
    
    async def _generate_chart(self, df: pd.DataFrame, recommendation: ChartRecommendation) -> go.Figure:
        """Generate chart based on recommendation."""
        chart_type = recommendation.chart_type
        config = recommendation.chart_config
        
        # Ensure we don't exceed max data points
        if len(df) > self.settings.max_data_points:
            df = df.sample(n=self.settings.max_data_points)
        
        if chart_type == "line":
            return self.chart_generator.create_line_chart(df, config)
        elif chart_type == "scatter":
            return self.chart_generator.create_scatter_plot(df, config)
        elif chart_type == "bar":
            return self.chart_generator.create_bar_chart(df, config)
        elif chart_type == "histogram":
            return self.chart_generator.create_histogram(df, config)
        elif chart_type == "box":
            return self.chart_generator.create_box_plot(df, config)
        elif chart_type == "heatmap":
            return self.chart_generator.create_heatmap(df, config)
        elif chart_type == "pie":
            return self.chart_generator.create_pie_chart(df, config)
        else:
            return self.chart_generator.create_advanced_chart(df, chart_type, config)
    
    async def _generate_insights(
        self, 
        df: pd.DataFrame, 
        characteristics: Dict[str, Any], 
        recommendation: ChartRecommendation,
        query: str
    ) -> List[str]:
        """Generate insights about the data and visualization."""
        insights = []
        
        # Basic data insights
        insights.append(f"Dataset contains {df.shape[0]:,} rows and {df.shape[1]} columns")
        
        if characteristics["numeric_columns"]:
            numeric_df = df[characteristics["numeric_columns"]]
            insights.append(f"Found {len(characteristics['numeric_columns'])} numeric columns for analysis")
            
            # Statistical insights for business data
            for col in characteristics["numeric_columns"][:3]:
                mean_val = numeric_df[col].mean()
                std_val = numeric_df[col].std()
                min_val = numeric_df[col].min()
                max_val = numeric_df[col].max()
                
                if col == 'sales':
                    insights.append(f"Sales range from ${min_val:,.0f} to ${max_val:,.0f} (avg: ${mean_val:,.0f})")
                elif col == 'profit':
                    insights.append(f"Profit ranges from ${min_val:,.0f} to ${max_val:,.0f} (avg: ${mean_val:,.0f})")
                elif col == 'profit_margin':
                    insights.append(f"Profit margin ranges from {min_val:.1%} to {max_val:.1%} (avg: {mean_val:.1%})")
                elif col == 'customer_satisfaction':
                    insights.append(f"Customer satisfaction: {min_val:.1f} to {max_val:.1f} stars (avg: {mean_val:.1f})")
                else:
                    insights.append(f"{col.replace('_', ' ').title()}: {min_val:.2f} to {max_val:.2f} (avg: {mean_val:.2f})")
        
        if characteristics["categorical_columns"]:
            insights.append(f"Found {len(characteristics['categorical_columns'])} categorical columns")
            
            # Category-specific insights
            for col in characteristics["categorical_columns"]:
                if col in df.columns and df[col].nunique() <= 10:
                    top_categories = df[col].value_counts().head(3)
                    if col == 'category':
                        insights.append(f"Top product categories: {', '.join(top_categories.index.tolist())}")
                    elif col == 'region':
                        insights.append(f"Top regions: {', '.join(top_categories.index.tolist())}")
        
        # Chart-specific insights
        if recommendation.chart_type == "scatter" and len(characteristics["numeric_columns"]) >= 2:
            x_col, y_col = recommendation.suggested_columns[:2]
            if x_col in df.columns and y_col in df.columns:
                correlation = df[x_col].corr(df[y_col])
                if correlation > 0.7:
                    insights.append(f"Strong positive correlation between {x_col} and {y_col} ({correlation:.3f})")
                elif correlation < -0.7:
                    insights.append(f"Strong negative correlation between {x_col} and {y_col} ({correlation:.3f})")
                else:
                    insights.append(f"Moderate correlation between {x_col} and {y_col} ({correlation:.3f})")
        
        # Time-based insights if date column exists
        if 'date' in df.columns:
            try:
                df_copy = df.copy()
                df_copy['date'] = pd.to_datetime(df_copy['date'])
                date_range = df_copy['date'].max() - df_copy['date'].min()
                insights.append(f"Data spans {date_range.days} days from {df_copy['date'].min().strftime('%Y-%m-%d')} to {df_copy['date'].max().strftime('%Y-%m-%d')}")
            except:
                pass
        
        # Missing data insights
        missing_data = df.isnull().sum()
        if missing_data.sum() > 0:
            insights.append(f"Missing data found in {missing_data[missing_data > 0].count()} columns")
        else:
            insights.append("No missing data found - clean dataset!")
        
        return insights
    
    def _create_custom_chart_recommendation(self, df: pd.DataFrame, chart_type: str, query: str) -> ChartRecommendation:
        """Create a custom chart recommendation for a specific chart type."""
        characteristics = self.data_analyzer.analyze_data_characteristics(df)
        numeric_cols = characteristics["numeric_columns"]
        categorical_cols = characteristics["categorical_columns"]
        datetime_cols = characteristics["datetime_columns"]
        
        if chart_type == "scatter" and len(numeric_cols) >= 2:
            return ChartRecommendation(
                chart_type="scatter",
                confidence=0.8,
                reasoning=f"Custom scatter plot using {numeric_cols[0]} and {numeric_cols[1]}",
                suggested_columns=numeric_cols[:2],
                chart_config={"x": numeric_cols[0], "y": numeric_cols[1], "title": f"{numeric_cols[1]} vs {numeric_cols[0]}"}
            )
        elif chart_type == "bar" and categorical_cols and numeric_cols:
            return ChartRecommendation(
                chart_type="bar",
                confidence=0.8,
                reasoning=f"Custom bar chart using {categorical_cols[0]} and {numeric_cols[0]}",
                suggested_columns=[categorical_cols[0], numeric_cols[0]],
                chart_config={"x": categorical_cols[0], "y": numeric_cols[0], "title": f"{numeric_cols[0]} by {categorical_cols[0]}"}
            )
        elif chart_type == "histogram" and numeric_cols:
            return ChartRecommendation(
                chart_type="histogram",
                confidence=0.8,
                reasoning=f"Custom histogram for {numeric_cols[0]}",
                suggested_columns=[numeric_cols[0]],
                chart_config={"x": numeric_cols[0], "title": f"Distribution of {numeric_cols[0]}"}
            )
        elif chart_type == "heatmap" and len(numeric_cols) >= 2:
            return ChartRecommendation(
                chart_type="heatmap",
                confidence=0.8,
                reasoning="Custom correlation heatmap",
                suggested_columns=numeric_cols,
                chart_config={"title": "Correlation Matrix"}
            )
        elif chart_type == "pie" and categorical_cols:
            return ChartRecommendation(
                chart_type="pie",
                confidence=0.8,
                reasoning=f"Custom pie chart for {categorical_cols[0]}",
                suggested_columns=[categorical_cols[0]],
                chart_config={"values": categorical_cols[0], "title": f"Distribution of {categorical_cols[0]}"}
            )
        else:
            # Fallback to first available numeric column for any chart type
            if numeric_cols:
                return ChartRecommendation(
                    chart_type=chart_type,
                    confidence=0.6,
                    reasoning=f"Custom {chart_type} chart using available data",
                    suggested_columns=[numeric_cols[0]],
                    chart_config={"x": numeric_cols[0], "title": f"{chart_type.title()} Chart"}
                )
            else:
                # Fallback to categorical data
                return ChartRecommendation(
                    chart_type="bar",
                    confidence=0.5,
                    reasoning="Fallback to bar chart with available categorical data",
                    suggested_columns=[categorical_cols[0]] if categorical_cols else ["index"],
                    chart_config={"x": categorical_cols[0] if categorical_cols else "index", "title": "Data Overview"}
                )

    async def _create_statistical_summary(
        self, 
        df: pd.DataFrame, 
        recommendation: ChartRecommendation
    ) -> Dict[str, Any]:
        """Create statistical summary for the visualization."""
        summary = {}
        
        # Basic statistics
        if recommendation.suggested_columns:
            for col in recommendation.suggested_columns:
                if col in df.columns:
                    if df[col].dtype in ['int64', 'float64']:
                        summary[col] = {
                            "mean": float(df[col].mean()),
                            "median": float(df[col].median()),
                            "std": float(df[col].std()),
                            "min": float(df[col].min()),
                            "max": float(df[col].max()),
                            "count": int(df[col].count())
                        }
                    else:
                        summary[col] = {
                            "unique_values": int(df[col].nunique()),
                            "most_common": str(df[col].mode().iloc[0] if not df[col].mode().empty else "N/A"),
                            "count": int(df[col].count())
                        }
        
        return summary
    
    def get_available_chart_types(self) -> List[Dict[str, str]]:
        """Get list of available chart types with descriptions."""
        return [
            {"type": "line", "description": "Line chart for time series or continuous data"},
            {"type": "scatter", "description": "Scatter plot for correlation analysis"},
            {"type": "bar", "description": "Bar chart for categorical comparisons"},
            {"type": "histogram", "description": "Histogram for data distribution"},
            {"type": "box", "description": "Box plot for distribution and outliers"},
            {"type": "heatmap", "description": "Heatmap for correlation matrix"},
            {"type": "pie", "description": "Pie chart for composition analysis"},
            {"type": "violin", "description": "Violin plot for distribution shape"},
            {"type": "density_heatmap", "description": "Density heatmap for 2D distributions"}
        ]

    def _save_chart_as_image(self, fig: go.Figure) -> str:
        """Save the chart as an image and return the image path."""
        try:
            if not KALEIDO_AVAILABLE:
                logger.warning("Kaleido not available for PNG export")
                return ""
            
            # Create output directory if it doesn't exist
            output_dir = Path(self.settings.output_directory)
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"chart_{timestamp}_{uuid.uuid4().hex[:8]}.png"
            image_path = output_dir / filename
            
            # Write the image
            fig.write_image(str(image_path), width=self.settings.chart_width, height=self.settings.chart_height)
            
            logger.info(f"Chart saved as PNG: {image_path}")
            return str(image_path)
            
        except Exception as e:
            logger.error(f"Error saving chart as image: {e}")
            return ""


def create_visualization_tool(settings: Optional[VisualizationSettings] = None) -> Tool:
    """
    Create a LangChain tool for data visualization with enhanced conversation awareness.
    
    Args:
        settings: Optional visualization settings
        
    Returns:
        LangChain Tool for visualization
    """
    agent = DataVisualizationAgent(settings)
    
    def create_chart(query: str) -> str:
        """Create visualization based on user query and available data with conversation context."""
        try:
            logger.info(f"Creating visualization for query: {query}")
            
            # Extract file references and chart preferences from query
            query_lower = query.lower()
            
            # Try to find data files in the data directory
            data_dir = Path(agent.settings.data_directory)
            data_files = []
            
            if data_dir.exists():
                for ext in ['.csv', '.xlsx', '.xls', '.json']:
                    data_files.extend(list(data_dir.glob(f"*{ext}")))
            
            if not data_files:
                return """🚫 **No data files found for visualization.**

I can see you have uploaded a file (sf11_ekonom_110.pdf), but I need structured data files to create visualizations.

📊 **What I can visualize:**
- **Line charts** for time series data and trends
- **Scatter plots** for correlations and relationships  
- **Bar charts** for categorical comparisons
- **Histograms** for data distributions
- **Heatmaps** for correlation matrices
- **Pie charts** for composition analysis
- **Box plots** for statistical distributions

💡 **To get started:**
1. **Upload a CSV or Excel file** with your numerical data
2. **Ask me to create specific charts** like:
   - "Create a line chart showing sales over time"
   - "Make a bar chart comparing categories"
   - "Show me a correlation heatmap"
   - "Visualize the data distribution"

🔧 **Supported formats:** CSV, Excel (.xlsx/.xls), JSON
"""
            
            # Use the most recent data file or find the best match
            latest_file = max(data_files, key=lambda f: f.stat().st_mtime)
            logger.info(f"Using data file: {latest_file}")
            
            # Enhanced chart type detection
            chart_type = None
            chart_keywords = {
                "line": ["line", "trend", "time", "series", "over time", "timeline"],
                "scatter": ["scatter", "correlation", "relationship", "vs", "against"],
                "bar": ["bar", "compare", "category", "categorical", "by category"],
                "histogram": ["histogram", "distribution", "frequency", "spread"],
                "box": ["box", "boxplot", "outlier", "quartile", "statistical"],
                "heatmap": ["heatmap", "correlation matrix", "correlations"],
                "pie": ["pie", "composition", "percentage", "proportion", "breakdown"]
            }
            
            # Find the best matching chart type
            for chart, keywords in chart_keywords.items():
                if any(keyword in query_lower for keyword in keywords):
                    chart_type = chart
                    logger.info(f"Detected chart type: {chart_type}")
                    break
            
            # Create visualization with enhanced context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(agent.create_visualization(
                    data=str(latest_file),
                    query=query,
                    chart_type=chart_type
                ))
            finally:
                loop.close()
            
            # Enhanced response formatting
            response = f"""## 📊 {result.title}

**Data Source:** {latest_file.name}
**Chart Type:** {result.chart_type.title()} Chart
**Description:** {result.description}

### 🔍 Key Data Insights:
{chr(10).join(f"• {insight}" for insight in result.insights)}

### 📈 Dataset Overview:
- **Total Records:** {result.data_summary.get('rows', 'N/A'):,}
- **Data Columns:** {result.data_summary.get('columns', 'N/A')}
- **Numeric Fields:** {result.data_summary.get('numeric_columns', 'N/A')}
- **Category Fields:** {result.data_summary.get('categorical_columns', 'N/A')}

### 📊 Statistical Summary:
{chr(10).join(f"• **{col}**: {stats}" for col, stats in result.statistical_summary.items())}

### 💡 Alternative Visualizations:
{chr(10).join(f"• {rec}" for rec in result.recommendations[:3])}

🎯 **Your interactive chart is ready!** The visualization shows your data patterns and can be explored interactively.

**Chart Data:** {result.chart_json}
"""
            
            logger.info("Visualization created successfully")
            return response
            
        except Exception as e:
            logger.error(f"Visualization tool error: {e}")
            error_msg = f"""❌ **Error creating visualization: {str(e)}**

🔧 **Troubleshooting steps:**
1. **Check your data file format** - Ensure it's CSV, Excel, or JSON
2. **Verify data structure** - Make sure you have numerical columns for charts
3. **Try a different chart type** - Some visualizations need specific data types

💡 **Common solutions:**
- For line charts: Include date/time and numeric columns
- For bar charts: Include categorical and numeric columns  
- For scatter plots: Include two numeric columns
- For pie charts: Include categorical data

Would you like me to help you with a specific type of visualization?

You will make it!!"""
            return error_msg
    
    return Tool(
        name="DataVisualization",
        description=(
            "Create interactive data visualizations and charts from uploaded data files. "
            "This tool automatically detects available data files and creates appropriate visualizations "
            "based on user requests. It can generate line charts, scatter plots, bar charts, histograms, "
            "heatmaps, pie charts, and more. Use this when users ask to visualize data, create charts, "
            "or analyze patterns visually. The tool provides detailed insights and statistical analysis "
            "alongside the visualizations."
        ),
        func=create_chart
    )


def create_visualization_agent(settings: Optional[VisualizationSettings] = None) -> DataVisualizationAgent:
    """
    Factory function to create a configured DataVisualizationAgent.
    
    Args:
        settings: Optional configuration settings
        
    Returns:
        Configured DataVisualizationAgent instance
    """
    return DataVisualizationAgent(settings)


# System prompt for the visualization agent
VISUALIZATION_AGENT_SYSTEM_PROMPT = """
You are a specialized data visualization expert focused on creating insightful, interactive charts from data.

Your capabilities:
- Analyze data characteristics to recommend appropriate chart types
- Generate interactive visualizations using Plotly
- Provide statistical insights alongside visualizations
- Create publication-ready charts with proper titles and labels
- Handle various data formats (CSV, Excel, JSON)

Guidelines for effective visualization:
1. Always analyze data characteristics first
2. Choose chart types that best represent the data story
3. Provide clear titles, labels, and legends
4. Include statistical insights and patterns
5. Suggest alternative visualization approaches
6. Ensure charts are interactive and engaging

Chart type selection criteria:
- Line charts: Time series, trends, continuous data
- Scatter plots: Correlations, relationships between variables
- Bar charts: Categorical comparisons, rankings
- Histograms: Data distributions, frequency analysis
- Box plots: Statistical distributions, outlier detection
- Heatmaps: Correlation matrices, density patterns
- Pie charts: Composition, percentages, parts of whole

Remember: Your goal is to make data insights visual, accessible, and actionable through compelling visualizations.
"""

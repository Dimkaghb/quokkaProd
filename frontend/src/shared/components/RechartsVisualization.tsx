import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ChartConfig {
  chartType: string;
  data: any[];
  config: {
    xKey: string;
    yKey: string | string[];
    title: string;
    xLabel: string;
    yLabel: string;
    colors: string[];
  };
  analyticalText?: string;
}

interface RechartsVisualizationProps {
  chartConfig: ChartConfig;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

export const RechartsVisualization: React.FC<RechartsVisualizationProps> = ({ chartConfig }) => {
  const { chartType, data, config } = chartConfig;

  const renderChart = () => {
    const commonProps = {
      width: 800,
      height: 400,
      data: data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType.toLowerCase()) {
      case 'linechart':
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(config.yKey) ? (
              config.yKey.map((key, index) => (
                <Line 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  stroke={config.colors[index] || COLORS[index % COLORS.length]}
                  strokeWidth={2}
                />
              ))
            ) : (
              <Line 
                type="monotone" 
                dataKey={config.yKey} 
                stroke={config.colors[0] || COLORS[0]}
                strokeWidth={2}
              />
            )}
          </LineChart>
        );

      case 'barchart':
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(config.yKey) ? (
              config.yKey.map((key, index) => (
                <Bar 
                  key={key}
                  dataKey={key} 
                  fill={config.colors[index] || COLORS[index % COLORS.length]}
                />
              ))
            ) : (
              <Bar 
                dataKey={config.yKey} 
                fill={config.colors[0] || COLORS[0]}
              />
            )}
          </BarChart>
        );

      case 'scatterchart':
      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter 
              name={config.title}
              data={data} 
              fill={config.colors[0] || COLORS[0]}
            />
          </ScatterChart>
        );

      case 'piechart':
      case 'pie':
        return (
          <PieChart width={400} height={400}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey}
              nameKey={config.xKey}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      case 'areachart':
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(config.yKey) ? (
              config.yKey.map((key, index) => (
                <Area 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  stackId="1"
                  stroke={config.colors[index] || COLORS[index % COLORS.length]}
                  fill={config.colors[index] || COLORS[index % COLORS.length]}
                />
              ))
            ) : (
              <Area 
                type="monotone" 
                dataKey={config.yKey} 
                stroke={config.colors[0] || COLORS[0]}
                fill={config.colors[0] || COLORS[0]}
              />
            )}
          </AreaChart>
        );

      case 'radarchart':
      case 'radar':
        return (
          <RadarChart width={400} height={400} data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey={config.xKey} />
            <PolarRadiusAxis />
            <Radar
              name={config.title}
              dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey}
              stroke={config.colors[0] || COLORS[0]}
              fill={config.colors[0] || COLORS[0]}
              fillOpacity={0.6}
            />
            <Legend />
            <Tooltip />
          </RadarChart>
        );

      case 'composedchart':
      case 'composed':
        const yKeys = Array.isArray(config.yKey) ? config.yKey : [config.yKey];
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, index) => {
              if (index === 0) {
                return (
                  <Bar 
                    key={key}
                    dataKey={key} 
                    fill={config.colors[index] || COLORS[index % COLORS.length]}
                  />
                );
              } else {
                return (
                  <Line 
                    key={key}
                    type="monotone" 
                    dataKey={key} 
                    stroke={config.colors[index] || COLORS[index % COLORS.length]}
                    strokeWidth={2}
                  />
                );
              }
            })}
          </ComposedChart>
        );

      default:
        // Fallback to bar chart
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey} 
              fill={config.colors[0] || COLORS[0]}
            />
          </BarChart>
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-center">{config.title}</h3>
      
      <div className="flex justify-center">
        <ResponsiveContainer width="100%" height={400}>
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Chart Info */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>X-Axis: {config.xLabel} | Y-Axis: {config.yLabel}</p>
        <p>Data Points: {data.length} | Chart Type: {chartType}</p>
      </div>

      {/* AI Analysis */}
      {chartConfig.analyticalText && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">AI Analysis:</h4>
          <p className="text-blue-800 whitespace-pre-wrap">{chartConfig.analyticalText}</p>
        </div>
      )}
    </div>
  );
}; 
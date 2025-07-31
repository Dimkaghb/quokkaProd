import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

interface VisualizationChartProps {
  chartConfig: ChartConfig;
  className?: string;
}

export const VisualizationChart: React.FC<VisualizationChartProps> = ({ 
  chartConfig, 
  className = "" 
}) => {
  const { chartType, data, config } = chartConfig;
  const { xKey, yKey, colors } = config;

  const renderChart = () => {
    switch (chartType.toLowerCase()) {
      case 'barchart':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(yKey) ? (
              yKey.map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={colors[index % colors.length]} 
                />
              ))
            ) : (
              <Bar dataKey={yKey} fill={colors[0]} />
            )}
          </BarChart>
        );

      case 'linechart':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(yKey) ? (
              yKey.map((key, index) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={colors[index % colors.length]} 
                  strokeWidth={2}
                />
              ))
            ) : (
              <Line 
                type="monotone" 
                dataKey={yKey} 
                stroke={colors[0]} 
                strokeWidth={2}
              />
            )}
          </LineChart>
        );

      case 'areachart':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(yKey) ? (
              yKey.map((key, index) => (
                <Area 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stackId="1"
                  stroke={colors[index % colors.length]} 
                  fill={colors[index % colors.length]}
                />
              ))
            ) : (
              <Area 
                type="monotone" 
                dataKey={yKey} 
                stroke={colors[0]} 
                fill={colors[0]}
              />
            )}
          </AreaChart>
        );

      case 'piechart':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yKey as string}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );

      case 'scatterchart':
        return (
          <ScatterChart data={data}>
            <CartesianGrid />
            <XAxis dataKey={xKey} />
            <YAxis dataKey={yKey as string} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter fill={colors[0]} />
          </ScatterChart>
        );

      case 'radarchart':
        return (
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey={xKey} />
            <PolarRadiusAxis />
            <Radar
              name="Data"
              dataKey={yKey as string}
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={0.6}
            />
            <Tooltip />
          </RadarChart>
        );

      case 'composedchart':
        return (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(yKey) ? (
              yKey.map((key, index) => (
                index % 2 === 0 ? (
                  <Bar 
                    key={key} 
                    dataKey={key} 
                    fill={colors[index % colors.length]} 
                  />
                ) : (
                  <Line 
                    key={key} 
                    type="monotone" 
                    dataKey={key} 
                    stroke={colors[index % colors.length]} 
                  />
                )
              ))
            ) : (
              <Bar dataKey={yKey} fill={colors[0]} />
            )}
          </ComposedChart>
        );

      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={yKey as string} fill={colors[0]} />
          </BarChart>
        );
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {config.title}
        </h3>
      </div>
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      {chartConfig.analyticalText && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Analysis</h4>
          <p className="text-gray-700 text-sm leading-relaxed">
            {chartConfig.analyticalText}
          </p>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
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
  RadialBarChart,
  RadialBar,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from '../../lib/utils';

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
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const renderChart = () => {
    const commonProps = {
      data: data,
      margin: isMobile 
        ? { top: 10, right: 10, left: 0, bottom: 5 }
        : { top: 20, right: 30, left: 20, bottom: 5 }
    };

    // Mobile-specific props for axes
    const axisProps = {
      tick: { fontSize: isMobile ? 10 : 12 }
    };

    switch (chartType.toLowerCase()) {
      case 'linechart':
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={config.xKey} 
              {...axisProps}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis {...axisProps} />
            <Tooltip />
            {!isMobile && <Legend />}
            {Array.isArray(config.yKey) ? (
              config.yKey.map((key, index) => (
                <Line 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  stroke={config.colors[index] || COLORS[index % COLORS.length]}
                  strokeWidth={isMobile ? 1.5 : 2}
                  dot={isMobile ? { r: 2 } : { r: 3 }}
                />
              ))
            ) : (
              <Line 
                type="monotone" 
                dataKey={config.yKey} 
                stroke={config.colors[0] || COLORS[0]}
                strokeWidth={isMobile ? 1.5 : 2}
                dot={isMobile ? { r: 2 } : { r: 3 }}
              />
            )}
          </LineChart>
        );

      case 'barchart':
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={config.xKey} 
              {...axisProps}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis {...axisProps} />
            <Tooltip />
            {!isMobile && <Legend />}
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
            <XAxis 
              dataKey={config.xKey} 
              {...axisProps}
            />
            <YAxis 
              dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey} 
              {...axisProps}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            {!isMobile && <Legend />}
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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={isMobile ? false : ({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={isMobile ? 80 : 120}
              fill="#8884d8"
              dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey}
              nameKey={config.xKey}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            {!isMobile && <Legend />}
          </PieChart>
        );

      case 'areachart':
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={config.xKey} 
              {...axisProps}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis {...axisProps} />
            <Tooltip />
            {!isMobile && <Legend />}
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
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis 
              dataKey={config.xKey} 
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <PolarRadiusAxis 
              tick={{ fontSize: isMobile ? 8 : 10 }}
            />
            <Radar
              name={config.title}
              dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey}
              stroke={config.colors[0] || COLORS[0]}
              fill={config.colors[0] || COLORS[0]}
              fillOpacity={0.6}
            />
            {!isMobile && <Legend />}
            <Tooltip />
          </RadarChart>
        );

      case 'composedchart':
      case 'composed':
        const yKeys = Array.isArray(config.yKey) ? config.yKey : [config.yKey];
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={config.xKey} 
              {...axisProps}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis {...axisProps} />
            <Tooltip />
            {!isMobile && <Legend />}
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
                    strokeWidth={isMobile ? 1.5 : 2}
                  />
                );
              }
            })}
          </ComposedChart>
        );

      case 'radialbarchart':
      case 'radialbar':
        return (
          <RadialBarChart 
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? "10%" : "20%"}
            outerRadius={isMobile ? "80%" : "90%"}
          >
            <RadialBar
              dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey}
              cornerRadius={10}
              fill={config.colors[0] || COLORS[0]}
            />
            <PolarAngleAxis 
              type="number" 
              domain={[0, 'dataMax']}
              angleAxisId={0}
              tick={false}
            />
            <Tooltip />
            {!isMobile && <Legend />}
          </RadialBarChart>
        );

      case 'treemap':
        return (
          <Treemap
            data={data}
            dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey}
            stroke="#fff"
            fill={config.colors[0] || COLORS[0]}
          >
            <Tooltip />
          </Treemap>
        );

      case 'funnelchart':
      case 'funnel':
        return (
          <FunnelChart data={data}>
            <Tooltip />
            <Funnel
              dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey}
              data={data}
              isAnimationActive
            >
              <LabelList position="center" fill="#fff" stroke="none" />
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Funnel>
          </FunnelChart>
        );

      case 'sankey':
        // Note: Sankey is experimental in Recharts
        // For now, we'll fallback to a bar chart with a note
        return (
          <div className="text-center p-4">
            <p className="text-gray-600 mb-4">Sankey charts are experimental. Showing as bar chart instead:</p>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={config.xKey} 
                {...axisProps}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? 'end' : 'middle'}
                height={isMobile ? 60 : 30}
              />
              <YAxis {...axisProps} />
              <Tooltip />
              {!isMobile && <Legend />}
              <Bar 
                dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey} 
                fill={config.colors[0] || COLORS[0]}
              />
            </BarChart>
          </div>
        );

      default:
        // Fallback to bar chart
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={config.xKey} 
              {...axisProps}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis {...axisProps} />
            <Tooltip />
            {!isMobile && <Legend />}
            <Bar 
              dataKey={Array.isArray(config.yKey) ? config.yKey[0] : config.yKey} 
              fill={config.colors[0] || COLORS[0]}
            />
          </BarChart>
        );
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-lg shadow-lg",
      isMobile ? "p-3" : "p-6"
    )}>
      <h3 className={cn(
        "font-bold mb-3 text-center",
        isMobile ? "text-lg" : "text-xl mb-4"
      )}>{config.title}</h3>
      
      <div className="flex justify-center">
        <ResponsiveContainer 
          width="100%" 
          height={isMobile ? 250 : 400}
        >
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Chart Info */}
      <div className={cn(
        "mt-3 text-gray-600 text-center",
        isMobile ? "text-xs" : "text-sm mt-4"
      )}>
        <p>X-Axis: {config.xLabel} | Y-Axis: {config.yLabel}</p>
        <p>Data Points: {data.length} | Chart Type: {chartType}</p>
        {(chartType.toLowerCase() === 'sankey') && (
          <p className="text-yellow-600 text-xs mt-1">Note: Sankey charts are experimental in Recharts</p>
        )}
      </div>

      {/* AI Analysis */}
      {chartConfig.analyticalText && (
        <div className={cn(
          "mt-4 bg-blue-50 rounded-lg",
          isMobile ? "p-3" : "p-4 mt-6"
        )}>
          <h4 className={cn(
            "font-semibold text-blue-900 mb-2",
            isMobile ? "text-sm" : ""
          )}>AI Analysis:</h4>
          <p className={cn(
            "text-blue-800 whitespace-pre-wrap",
            isMobile ? "text-xs" : ""
          )}>{chartConfig.analyticalText}</p>
        </div>
      )}
    </div>
  );
};
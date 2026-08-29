"use client";

/**
 * OPTIMIZED CHART GENERATION GUIDE FOR AI PROMPTS
 * 
 * Supported Chart Types: "line", "area", "bar", "pie", "scatter"
 * 
 * Required Parameters:
 * - type: One of the supported chart types above
 * - data: Array of objects with consistent keys
 * - xKey: String key for X-axis data
 * - yKey: String key for Y-axis data (or "value" as default)
 * 
 * Optional Parameters:
 * - title: Chart title
 * - dataKeys: Array of strings for multi-series charts
 * - colors: Array of hex colors
 * - width/height: Custom dimensions
 * 
 * OPTIMAL DATA FORMATS:
 * 
 * Bar/Line/Area Charts:
 * { "algorithm": "Bubble Sort", "time": 1000, "complexity": "O(n²)" }
 * xKey: "algorithm", yKey: "time" or dataKeys: ["time", "complexity"]
 * 
 * Pie Charts:
 * { "algorithm": "Quick Sort", "percentage": 45 }
 * xKey: "algorithm", yKey: "percentage"
 * 
 * Scatter Charts:
 * { "algorithm": "Merge Sort", "size": 1000, "time": 100 }
 * xKey: "algorithm", yKey: "size", dataKeys: ["time"]
 * 
 * TOKEN-EFFICIENT EXAMPLES:
 * 
 * Simple Bar: { type: "bar", data: [...], xKey: "name", yKey: "value" }
 * Multi-series: { type: "line", data: [...], xKey: "x", dataKeys: ["y1", "y2"] }
 * Pie Chart: { type: "pie", data: [...], xKey: "category", yKey: "amount" }
 */

import React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { useTheme } from "@/contexts/theme-context";
import { CopyToImageButton } from "@/components/copy-to-image-button";
import { useIsMobile } from "@/hooks/use-mobile";

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface ChartConfig {
  title?: string;
  type: "line" | "area" | "bar" | "pie" | "scatter";
  data: ChartDataPoint[];
  xKey: string;
  yKey?: string;
  dataKeys?: string[];
  colors?: string[];
  width?: number;
  height?: number;
}

interface ChartProps {
  config: ChartConfig;
  className?: string;
  isInMasonry?: boolean; // New prop to indicate if chart is in masonry layout
}

/**
 * Validates and optimizes chart configuration for better rendering
 */
const optimizeChartConfig = (config: ChartConfig): ChartConfig => {
  const optimized = { ...config };
  
  // Ensure yKey default and auto-detect missing keys
  if (!optimized.yKey && !optimized.dataKeys && optimized.data.length > 0) {
    const firstItem = optimized.data[0];
    const numericKeys = Object.keys(firstItem).filter(key => 
      typeof firstItem[key] === 'number'
    );
    optimized.yKey = numericKeys[0] || "value";
  }
  
  // Auto-detect dataKeys for multi-series charts if not provided
  if (!optimized.dataKeys && optimized.data.length > 0) {
    const firstItem = optimized.data[0];
    const numericKeys = Object.keys(firstItem).filter(key => 
      key !== optimized.xKey && typeof firstItem[key] === 'number'
    );
    if (numericKeys.length > 1) {
      optimized.dataKeys = numericKeys;
    }
  }
  
  // Limit data points for performance (silent optimization)
  if (optimized.data.length > 50) {
    // Silently limit data points for better performance
    optimized.data = optimized.data.slice(0, 50);
  }
  
  // Optimize for mobile
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    optimized.data = optimized.data.slice(0, 20); // Limit on mobile
  }
  
  return optimized;
};

const Chart: React.FC<ChartProps> = ({ config: rawConfig, className = "", isInMasonry = false }) => {
  const config = optimizeChartConfig(rawConfig);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chartRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Responsive dimensions based on screen size with masonry optimization
  const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024 && !isMobile;
  
  // Adjust sizing based on whether chart is in masonry or standalone
  const getChartDimensions = () => {
    if (isInMasonry) {
      // In masonry, be more conservative with sizing to prevent overlap
      return {
        width: config.width || (isMobile ? 320 : isTablet ? 400 : 450),
        height: config.height || (isMobile ? 250 : isTablet ? 300 : 350)
      };
    } else {
      // Standalone charts can use full available space
      return {
        width: config.width || (isMobile ? 350 : isTablet ? 550 : 700),
        height: config.height || (isMobile ? 350 : isTablet ? 400 : 450)
      };
    }
  };

  const { width: chartWidth, height: chartHeight } = getChartDimensions();

  // Theme-based color palette
  const getThemeColors = () => {
    if (isDark) {
      return {
        grid: "#374151",
        text: "#E5E7EB",
        background: "transparent",
        tooltipBg: "#1F2937E6", // Semi-transparent
        primary: "#60A5FA",
        secondary: "#F59E0B",
        accent: "#10B981",
        muted: "#9CA3AF",
      };
    } else {
      return {
        grid: "#D1D5DB",
        text: "#374151",
        background: "transparent",
        tooltipBg: "#FFFFFFE6", // Semi-transparent
        primary: "#3B82F6",
        secondary: "#F59E0B",
        accent: "#059669",
        muted: "#6B7280",
      };
    }
  };

  const colors = getThemeColors();
  
  // Default color palette for multiple data series
  const defaultColors = [
    colors.primary,
    colors.secondary,
    colors.accent,
    "#EF4444", // red
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#84CC16", // lime
  ];

  const chartColors = config.colors || defaultColors;

  // Get SVG icon for different chart types
  const getChartIcon = (type: string) => {
    switch (type) {
      case "line":
        return (
          <svg className="w-6 h-6 text-gray-400 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4" />
          </svg>
        );
      case "area":
        return (
          <svg className="w-6 h-6 text-gray-400 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case "bar":
        return (
          <svg className="w-6 h-6 text-gray-400 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case "pie":
        return (
          <svg className="w-6 h-6 text-gray-400 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6.025A7.5 7.5 0 1 0 17.975 14H10V6.025Z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 3c-.169 0-.334.014-.5.025V11h7.975c.011-.166.025-.331.025-.5A7.5 7.5 0 0 0 13.5 3Z"/>
          </svg>
        );
      case "scatter":
        return (
          <svg className="w-6 h-6 text-gray-400 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="19" cy="7" r="1" fill="currentColor" />
            <circle cx="5" cy="17" r="1" fill="currentColor" />
            <circle cx="8" cy="9" r="1" fill="currentColor" />
            <circle cx="16" cy="15" r="1" fill="currentColor" />
            <circle cx="7" cy="5" r="1" fill="currentColor" />
            <circle cx="17" cy="19" r="1" fill="currentColor" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-400 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  };

  // Custom tooltip component with theme support - concise version
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      value: string | number;
      color: string;
      payload?: Record<string, unknown>;
      name?: string;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg border border-border/40 backdrop-blur-sm p-2 shadow-lg"
          style={{
            backgroundColor: colors.tooltipBg,
            borderColor: colors.grid,
          }}
        >
          {/* Concise label display */}
          {config.type !== "scatter" && label && (
            <p className="font-medium text-foreground text-xs mb-1">{label}</p>
          )}
          
          {/* For scatter charts, show the algorithm/item name */}
          {config.type === "scatter" && payload[0]?.payload && (
            <p className="font-medium text-foreground text-xs mb-1">
              {String((payload[0].payload as Record<string, unknown>)[config.xKey]) || 'Item'}
            </p>
          )}
          
          {payload.map((entry, index: number) => (
            <p
              key={index}
              className="text-xs"
              style={{ color: entry.color }}
            >
              {`${entry.name || entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render different chart types
  const renderChart = (): React.ReactElement => {
    // Calculate label space needed
    const maxLabelLength = Math.max(...config.data.map(item => 
      String(item[config.xKey] || '').length
    ));
    
    // Adjust margins based on chart type and data with masonry considerations
    const getMargins = () => {
      let baseMargin = {
        top: isInMasonry ? 10 : 15,
        right: isInMasonry ? 20 : 25,
        left: isInMasonry ? 40 : 45,
        bottom: isInMasonry ? 30 : 35
      };

      if (isMobile) {
        baseMargin = {
          top: 10,
          right: 15,
          left: 35,
          bottom: 25
        };
      }

      // Adjust for different chart types
      switch (config.type) {
        case "bar":
          // Calculate space needed for rotated labels
          const needsRotation = config.data.length > 5 || maxLabelLength > 8 || isMobile;
          baseMargin.bottom = needsRotation ? (isMobile ? 90 : isInMasonry ? 100 : 120) : (isInMasonry ? 40 : 50);
          baseMargin.left = isInMasonry ? 45 : 55;
          baseMargin.right = isInMasonry ? 25 : 35;
          break;
          
        case "area":
        case "line":
          baseMargin.bottom = isMobile ? 60 : isInMasonry ? 50 : 60;
          baseMargin.left = isInMasonry ? 45 : 55;
          baseMargin.right = isInMasonry ? 25 : 35;
          break;
          
        case "pie":
          // Less space needed for pie charts in masonry
          return isInMasonry 
            ? { top: 20, right: 40, left: 40, bottom: 20 }
            : { top: 40, right: 80, left: 80, bottom: 40 };
          
        case "scatter":
          baseMargin.left = isInMasonry ? 60 : 70;
          baseMargin.bottom = isInMasonry ? 60 : 70;
          baseMargin.right = isInMasonry ? 30 : 40;
          break;
      }

      return baseMargin;
    };

    const commonProps = {
      width: chartWidth,
      height: chartHeight,
      data: config.data,
      margin: getMargins(),
    };

    switch (config.type) {
      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey={config.xKey}
              stroke={colors.text}
              fontSize={isMobile ? 10 : 12}
              tickLine={false}
              axisLine={false}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={isMobile ? 80 : 50}
              interval={0}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis
              stroke={colors.text}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={isInMasonry ? 35 : 40}
              domain={['dataMin', 'dataMax']}
              scale="linear"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => {
                // Show proper key names instead of generic "time"
                return value === config.xKey ? config.xKey : value;
              }}
            />
            {config.dataKeys?.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={chartColors[index % chartColors.length]}
                strokeWidth={2}
                dot={{ fill: chartColors[index % chartColors.length], r: 4 }}
                activeDot={{ r: 6 }}
                name={key}
                connectNulls={false}
              />
            )) || (
              <Line
                type="monotone"
                dataKey={config.yKey || "value"}
                stroke={colors.primary}
                strokeWidth={2}
                dot={{ fill: colors.primary, r: 4 }}
                activeDot={{ r: 6 }}
                name={config.yKey || "value"}
                connectNulls={false}
              />
            )}
          </LineChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            <defs>
              {config.dataKeys?.map((key, index) => (
                <linearGradient key={key} id={`colorArea${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors[index % chartColors.length]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={chartColors[index % chartColors.length]} stopOpacity={0.1}/>
                </linearGradient>
              )) || (
                <linearGradient id="colorArea0" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={colors.primary} stopOpacity={0.1}/>
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey={config.xKey}
              stroke={colors.text}
              fontSize={isMobile ? 10 : 12}
              tickLine={false}
              axisLine={false}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={isMobile ? 80 : 50}
              interval={0}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis
              stroke={colors.text}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={isInMasonry ? 35 : 40}
              domain={['dataMin', 'dataMax']}
              scale="linear"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => {
                // Show proper key names instead of generic labels
                return value === config.xKey ? config.xKey : value;
              }}
            />
            {config.dataKeys?.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={chartColors[index % chartColors.length]}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#colorArea${index})`}
                name={key}
                dot={{ fill: chartColors[index % chartColors.length], r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            )) || (
              <Area
                type="monotone"
                dataKey={config.yKey || "value"}
                stroke={colors.primary}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorArea0)"
                name={config.yKey || "value"}
                dot={{ fill: colors.primary, r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            )}
          </AreaChart>
        );

      case "bar":
        const needsRotation = config.data.length > 5 || isMobile;
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey={config.xKey}
              stroke={colors.text}
              fontSize={isMobile ? 9 : 11}
              tickLine={false}
              axisLine={false}
              angle={needsRotation ? -45 : 0}
              textAnchor={needsRotation ? "end" : "middle"}
              height={needsRotation ? (isMobile ? 100 : 120) : 50}
              interval={0}
              tick={{ fontSize: isMobile ? 9 : 11 }}
            />
            <YAxis
              stroke={colors.text}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={isInMasonry ? 45 : 50}
              domain={[0, 'dataMax']}
              scale="linear"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => {
                // Show proper key names for better legend display
                return value === config.xKey ? config.xKey : value;
              }}
            />
            {config.dataKeys?.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={chartColors[index % chartColors.length]}
                radius={[2, 2, 0, 0]}
                name={key}
                maxBarSize={60}
              />
            )) || (
              <Bar
                dataKey={config.yKey || "value"}
                fill={colors.primary}
                radius={[2, 2, 0, 0]}
                name={config.yKey || "value"}
                maxBarSize={60}
              />
            )}
          </BarChart>
        );

      case "pie":
        // Calculate responsive radius based on container size with masonry optimization
        const containerWidth = chartWidth;
        const containerHeight = chartHeight;
        const availableSpace = Math.min(containerWidth - (isInMasonry ? 120 : 180), containerHeight - (isInMasonry ? 80 : 120));
        const pieRadius = Math.min(
          availableSpace / (isInMasonry ? 3.5 : 3), 
          isMobile ? (isInMasonry ? 45 : 55) : isTablet ? (isInMasonry ? 65 : 75) : (isInMasonry ? 80 : 100)
        );
        
        // Custom label function for always visible labels
        const renderCustomLabel = (props: PieLabelRenderProps) => {
          const {
            cx = 0,
            cy = 0,
            midAngle = 0,
            innerRadius = 0,
            outerRadius = 0,
            percent = 0,
          } = props;
          const RADIAN = Math.PI / 180;
          
          // Only show label if percentage is significant enough
          if (percent < 0.05) return null; // Hide labels for slices < 5%
          
          // Position labels inside the pie slice for better visibility
          const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);
          
          return (
            <text 
              x={x} 
              y={y} 
              fill="white" 
              textAnchor="middle" 
              dominantBaseline="central"
              fontSize={isMobile ? 9 : isInMasonry ? 10 : 11}
              fontWeight="600"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="0.5"
            >
              {`${(percent * 100).toFixed(0)}%`}
            </text>
          );
        };
        
        return (
          <PieChart {...commonProps}>
            <Pie
              data={config.data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={pieRadius}
              fill={colors.primary}
              dataKey={config.yKey || "value"}
              nameKey={config.xKey}
            >
              {config.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip 
              content={<CustomTooltip />}
              formatter={(value, name) => [value, name]}
            />
            <Legend 
              wrapperStyle={{ fontSize: isInMasonry ? '10px' : '11px' }}
              formatter={(value) => value}
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
            />
          </PieChart>
        );

      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              type="number"
              dataKey={config.yKey || "value"}
              stroke={colors.text}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              name="X Axis"
              domain={['dataMin', 'dataMax']}
              scale="linear"
            />
            <YAxis
              type="number" 
              dataKey={config.dataKeys?.[1] || "time"}
              stroke={colors.text}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              name="Y Axis"
              domain={['dataMin', 'dataMax']}
              scale="linear"
            />
            <Tooltip 
              content={(props) => {
                const { active, payload } = props;
                if (active && payload && payload.length) {
                  const data = payload[0].payload as Record<string, unknown>;
                  return (
                    <div
                      className="rounded-lg border border-border/40 backdrop-blur-sm p-3 shadow-lg"
                      style={{
                        backgroundColor: colors.tooltipBg,
                        borderColor: colors.grid,
                      }}
                    >
                      <p className="font-medium text-foreground mb-2">
                        {String(data[config.xKey]) || 'Data Point'}
                      </p>
                      {Object.entries(data).map(([key, value]) => {
                        if (key !== config.xKey && typeof value === 'number') {
                          return (
                            <p key={key} className="text-sm" style={{ color: colors.primary }}>
                              {`${key}: ${value}`}
                            </p>
                          );
                        }
                        return null;
                      })}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter
              data={config.data}
              fill={colors.primary}
              name="Data Point"
            />
          </ScatterChart>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className={`w-full ${isMobile ? 'mb-4 flex flex-col items-center' : ''} ${className}`}>
      {config.title && (
        <h3 className={`font-semibold text-foreground mb-4 text-center ${isMobile ? 'text-base' : isInMasonry ? 'text-base' : 'text-lg'}`}>
          {config.title}
        </h3>
      )}
      
      <div className="relative group w-full flex justify-center">
        <div 
          ref={chartRef}
          className={`bg-transparent rounded-lg border border-border/30 transition-none ${
            isMobile ? 'p-1 w-full max-w-[calc(100vw-1rem)]' : isInMasonry ? 'p-2 w-full' : 'p-4 w-full'
          }`}
          style={{
            maxWidth: isInMasonry ? (isMobile ? '100%' : '100%') : undefined
          }}
        >
          <div className="w-full overflow-visible flex justify-center items-center">
            <ResponsiveContainer 
              width="100%" 
              height={chartHeight}
              minWidth={isInMasonry ? (isMobile ? 280 : 350) : (isMobile ? 320 : 450)}
              minHeight={isInMasonry ? (isMobile ? 200 : 250) : (isMobile ? 300 : 350)}
            >
              {renderChart()}
            </ResponsiveContainer>
          </div>

        </div>
        
        {/* Copy button - minimal version */}
        {!isMobile && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <CopyToImageButton
              targetRef={chartRef}
              filename={`${config.type}-chart`}
              variant="outline"
              size="sm"
              showText={false}
              className="bg-background/80 backdrop-blur-sm border-border/40 hover:bg-accent shadow-sm"
            />
          </div>
        )}
      </div>
      
      {/* Minimal chart description */}
      <div className={`mt-1 text-muted-foreground/70 flex items-center gap-1 ${isMobile ? 'text-xs justify-center' : 'text-xs'}`}>
        <span className="inline-flex items-center gap-1">
          {getChartIcon(config.type)}
          {config.type.charAt(0).toUpperCase() + config.type.slice(1)}
        </span>
      </div>
    </div>
  );
};

export default Chart;

/**
 * CHART GENERATION HELPERS FOR AI OPTIMIZATION
 */

export const CHART_TEMPLATES = {
  performance: {
    type: "bar" as const,
    xKey: "algorithm",
    yKey: "time",
    title: "Performance Comparison"
  },
  distribution: {
    type: "pie" as const,
    xKey: "category", 
    yKey: "percentage",
    title: "Distribution Analysis"
  },
  trend: {
    type: "line" as const,
    xKey: "time",
    yKey: "value",
    title: "Trend Analysis"
  },
  correlation: {
    type: "scatter" as const,
    xKey: "algorithm",
    yKey: "size",
    dataKeys: ["time"],
    title: "Correlation Analysis"
  },
  cumulative: {
    type: "area" as const,
    xKey: "time",
    yKey: "value", 
    title: "Cumulative Analysis"
  }
};

export const generateOptimalChartConfig = (
  type: keyof typeof CHART_TEMPLATES,
  data: ChartDataPoint[],
  customizations?: Partial<ChartConfig>
): ChartConfig => {
  const template = CHART_TEMPLATES[type];
  return {
    ...template,
    data,
    ...customizations
  };
};

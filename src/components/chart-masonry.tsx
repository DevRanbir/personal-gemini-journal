"use client";

import React from "react";
import Chart, { ChartConfig } from "./chart";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChartMasonryProps {
  charts: ChartConfig[];
  className?: string;
}

const ChartMasonry: React.FC<ChartMasonryProps> = ({ charts, className = "" }) => {
  const isMobile = useIsMobile();
  
  if (charts.length === 0) return null;

  // For single chart, render normally
  if (charts.length === 1) {
    return (
      <div className={`w-full ${className}`}>
        <Chart config={charts[0]} />
      </div>
    );
  }

  // Helper function to determine charts per row based on total count
  const getChartsPerRow = (totalCharts: number): number => {
    if (isMobile) {
      // On mobile, always use single column layout for better readability
      return 1;
    }
    
    // Desktop behavior - optimized for up to 4 charts
    if (totalCharts <= 2) return totalCharts;
    if (totalCharts === 3) return 3; // Show 3 in a single row
    if (totalCharts === 4) return 2; // Show 4 in a 2x2 grid (2 per row)
    return 3; // For 5+ charts, use 3 per row
  };

  // Helper function to render charts in rows (left to right, then next row)
  const renderChartRows = (chartList: ChartConfig[]) => {
    const rows: React.ReactElement[] = [];
    const chartsPerRow = getChartsPerRow(chartList.length);
    
    for (let i = 0; i < chartList.length; i += chartsPerRow) {
      const rowCharts = chartList.slice(i, i + chartsPerRow);
      
      // Special spacing for 4-chart 2x2 grid
      const gapClass = chartList.length === 4 ? "gap-2" : "gap-3";
      
      rows.push(
        <div 
          key={`row-${i}`}
          className={`grid ${gapClass} w-full`}
          style={{
            gridTemplateColumns: `repeat(${rowCharts.length}, minmax(0, 1fr))`,
          }}
        >
          {rowCharts.map((chart, index) => {
            const globalIndex = i + index;
            const adjustedChart = {
              ...chart,
              height: getOptimalHeight(chart, globalIndex, chartList.length, isMobile)
            };
            
            return (
              <div 
                key={globalIndex}
                className="w-full min-w-0 flex-shrink-0"
                style={{ 
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}
              >
                <Chart config={adjustedChart} isInMasonry={true} />
              </div>
            );
          })}
        </div>
      );
    }
    
    return rows;
  };

  // For multiple charts, use row-first masonry layout
  return (
    <div className={`w-full ${className}`} style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <div className={charts.length === 4 ? "space-y-2" : "space-y-3"}>
        {renderChartRows(charts)}
      </div>
    </div>
  );
};

// Helper function to get optimal height for masonry layout
const getOptimalHeight = (chart: ChartConfig, index: number, totalCharts: number, isMobile: boolean): number => {
  // If height is already specified, use it
  if (chart.height) return chart.height;
  
  // Smaller base heights for masonry to prevent overlap
  const baseHeights = {
    line: isMobile ? 200 : 280,
    area: isMobile ? 200 : 280,
    bar: isMobile ? 200 : 260,
    pie: isMobile ? 220 : 300, // Slightly taller for pie charts
    scatter: isMobile ? 200 : 260
  };
  
  let height = baseHeights[chart.type] || (isMobile ? 200 : 280);
  
  // Special handling for 4 charts in 2x2 grid - make them more uniform and compact
  if (totalCharts === 4 && !isMobile) {
    height = chart.type === 'pie' ? 300 : 260;
  }
  // For other multi-chart layouts, keep heights consistent to prevent overlaps
  else if (totalCharts > 1 && !isMobile) {
    // Use consistent heights instead of variations
    height = chart.type === 'pie' ? 300 : 280;
  }
  
  // Ensure minimum height but keep it smaller for masonry
  return Math.max(height, isMobile ? 180 : 240);
};

export default ChartMasonry;
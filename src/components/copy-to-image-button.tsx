"use client";

import React, { useState } from "react";
import { Button } from "@/components/button";
import { Skeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";

interface CopyToImageButtonProps {
  targetRef: React.RefObject<HTMLElement | null>;
  filename?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  showText?: boolean;
}

export function CopyToImageButton({
  targetRef,
  filename = "chart-or-table",
  className,
  variant = "outline",
  size = "sm",
  showText = false,
}: CopyToImageButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const elementToCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
    const rect = element.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Unable to get canvas context');
    }

    // Set canvas size (2x for better quality)
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Create a simple white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Hide copy buttons temporarily
    const copyButtons = element.querySelectorAll('.copy-button');
    const originalDisplays: string[] = [];
    copyButtons.forEach((btn, index) => {
      originalDisplays[index] = (btn as HTMLElement).style.display;
      (btn as HTMLElement).style.display = 'none';
    });

    try {
      // Wait a moment for the button hiding to take effect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if this is a chart or table
      const svgElements = element.querySelectorAll('svg');
      const tableElements = element.querySelectorAll('table');
      
      if (svgElements.length > 0) {
        // This is a chart - capture SVGs only (no overlapping text)
        await captureChartsOnly(element, ctx, rect.width, rect.height);
      } else if (tableElements.length > 0) {
        // This is a table - use enhanced HTML capture
        await captureTableWithStyles(element, ctx, rect.width, rect.height);
      } else {
        // Regular content
        await captureWithForeignObject(element, ctx, rect.width, rect.height);
      }
      
    } finally {
      // Restore copy button visibility
      copyButtons.forEach((btn, index) => {
        (btn as HTMLElement).style.display = originalDisplays[index] || '';
      });
    }

    return canvas;
  };

  const captureChartsOnly = async (element: HTMLElement, ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Enhanced chart capture with better SVG handling and styling preservation
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Remove copy buttons from clone
    const copyButtons = clone.querySelectorAll('.copy-button');
    copyButtons.forEach(btn => btn.remove());
    
    // Get all computed styles from the original element and its children
    const styleSheet = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    // Extract SVG elements and prepare them for better rendering
    const svgElements = clone.querySelectorAll('svg');
    svgElements.forEach(svg => {
      // Ensure SVG has proper dimensions
      if (!svg.getAttribute('width')) {
        svg.setAttribute('width', '100%');
      }
      if (!svg.getAttribute('height')) {
        svg.setAttribute('height', '100%');
      }
      
      // Add viewBox if missing
      if (!svg.getAttribute('viewBox')) {
        const rect = svg.getBoundingClientRect();
        svg.setAttribute('viewBox', `0 0 ${rect.width || 400} ${rect.height || 300}`);
      }

      // Ensure proper namespace declarations
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

      // Fix text elements that might have inherited styles
      const textElements = svg.querySelectorAll('text, tspan');
      textElements.forEach(text => {
        const computedStyle = window.getComputedStyle(text);
        
        // Apply computed styles as inline styles
        text.setAttribute('fill', computedStyle.color || text.getAttribute('fill') || '#000');
        text.setAttribute('font-family', computedStyle.fontFamily || 'system-ui, -apple-system, sans-serif');
        text.setAttribute('font-size', computedStyle.fontSize || '12px');
        text.setAttribute('font-weight', computedStyle.fontWeight || 'normal');
        
        // Ensure text is visible
        if (!text.getAttribute('fill') || text.getAttribute('fill') === 'currentColor') {
          text.setAttribute('fill', '#374151');
        }
      });

      // Fix paths and shapes that might need color fixes
      const paths = svg.querySelectorAll('path, rect, circle, line, polyline, polygon');
      paths.forEach(shape => {
        const computedStyle = window.getComputedStyle(shape);
        
        if (shape.getAttribute('stroke') === 'currentColor') {
          shape.setAttribute('stroke', computedStyle.color || '#374151');
        }
        if (shape.getAttribute('fill') === 'currentColor') {
          shape.setAttribute('fill', computedStyle.color || '#374151');
        }
      });
    });
    
    // Create enhanced chart HTML with embedded styles
    const chartHTML = `
      <div style="
        width: ${width}px;
        height: ${height}px;
        background: white;
        padding: 16px;
        box-sizing: border-box;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #374151;
        position: relative;
        overflow: hidden;
      ">
        <style>
          ${styleSheet}
          
          /* Additional chart-specific styles */
          svg {
            max-width: 100%;
            max-height: 100%;
            display: block;
            margin: 0 auto;
          }
          
          text {
            font-family: system-ui, -apple-system, sans-serif !important;
            fill: #374151 !important;
          }
          
          .recharts-text {
            font-family: system-ui, -apple-system, sans-serif !important;
            fill: #374151 !important;
          }
          
          .recharts-cartesian-axis-tick-value {
            fill: #6B7280 !important;
          }
          
          .recharts-legend-item-text {
            color: #374151 !important;
            fill: #374151 !important;
          }
          
          /* Ensure all chart elements are visible */
          path[stroke="currentColor"] {
            stroke: #374151 !important;
          }
          
          [fill="currentColor"] {
            fill: #374151 !important;
          }
        </style>
        ${clone.innerHTML}
      </div>
    `;
    
    // Try multiple capture approaches for maximum compatibility
    const approaches = [
      // Approach 1: Enhanced SVG with proper encoding
      async () => {
        const svgData = `
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <foreignObject width="100%" height="100%">
              <div xmlns="http://www.w3.org/1999/xhtml">
                ${chartHTML}
              </div>
            </foreignObject>
          </svg>
        `;

        const img = new Image();
        img.crossOrigin = "anonymous";
        
        // Use proper base64 encoding with error handling
        const encodedSvg = btoa(unescape(encodeURIComponent(svgData)));
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Image load timeout')), 5000);
          
          img.onload = () => {
            clearTimeout(timeout);
            resolve(void 0);
          };
          img.onerror = (e) => {
            clearTimeout(timeout);
            reject(e);
          };
          
          img.src = `data:image/svg+xml;base64,${encodedSvg}`;
        });

        ctx.drawImage(img, 0, 0, width, height);
        return true;
      },
      
      // Approach 2: Direct SVG capture with manual positioning
      async () => {
        const svgElements = element.querySelectorAll('svg');
        let success = false;
        
        for (const svg of svgElements) {
          try {
            const svgRect = svg.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            
            const relativeX = Math.max(0, svgRect.left - elementRect.left);
            const relativeY = Math.max(0, svgRect.top - elementRect.top);
            
            // Clone and enhance the SVG
            const svgClone = svg.cloneNode(true) as SVGElement;
            
            // Ensure proper dimensions and styling
            svgClone.setAttribute('width', svgRect.width.toString());
            svgClone.setAttribute('height', svgRect.height.toString());
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            
            // Add inline styles for text elements
            const textElements = svgClone.querySelectorAll('text, tspan');
            textElements.forEach(text => {
              if (!text.getAttribute('fill') || text.getAttribute('fill') === 'currentColor') {
                text.setAttribute('fill', '#374151');
              }
              if (!text.getAttribute('font-family')) {
                text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
              }
            });
            
            const svgString = new XMLSerializer().serializeToString(svgClone);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);
            
            const svgImg = new Image();
            svgImg.crossOrigin = "anonymous";
            
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('SVG load timeout')), 3000);
              
              svgImg.onload = () => {
                clearTimeout(timeout);
                resolve(void 0);
              };
              svgImg.onerror = (e) => {
                clearTimeout(timeout);
                reject(e);
              };
              
              svgImg.src = svgUrl;
            });
            
            ctx.drawImage(svgImg, relativeX, relativeY, svgRect.width, svgRect.height);
            URL.revokeObjectURL(svgUrl);
            success = true;
            
          } catch (svgError) {
            console.warn('Individual SVG capture failed:', svgError);
            continue;
          }
        }
        
        if (!success) {
          throw new Error('No SVG elements could be captured');
        }
        
        return true;
      }
    ];
    
    // Try each approach in sequence
    let lastError: Error | null = null;
    
    for (const approach of approaches) {
      try {
        await approach();
        return; // Success, exit early
      } catch (error) {
        console.warn('Chart capture approach failed:', error);
        lastError = error as Error;
        continue;
      }
    }
    
    // If all approaches failed, throw the last error
    throw lastError || new Error('All chart capture approaches failed');
  };

  const captureTableWithStyles = async (element: HTMLElement, ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Use a simpler, more reliable approach for table capture
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Remove copy buttons from clone
    const copyButtons = clone.querySelectorAll('.copy-button');
    copyButtons.forEach(btn => btn.remove());
    
    // Calculate dynamic height based on content
    const rows = clone.querySelectorAll('tr');
    const estimatedRowHeight = Math.max(60, Math.ceil(height / Math.max(rows.length, 1)));
    const totalHeight = Math.max(height, rows.length * estimatedRowHeight + 40);
    
    // Create a simple, clean table HTML
    const tableHTML = `
      <div style="
        width: ${width}px;
        min-height: ${totalHeight}px;
        background: white;
        padding: 20px;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        border: 1px solid #e1e5e9;
        border-radius: 6px;
      ">
        <style>
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
            font-size: 14px;
            line-height: 1.4;
          }
          th {
            background-color: #f8f9fa;
            color: #2d3748;
            font-weight: 600;
            padding: 12px 16px;
            text-align: left;
            border: 1px solid #e2e8f0;
            vertical-align: top;
            word-wrap: break-word;
            max-width: ${Math.floor(width / 3 - 40)}px;
          }
          td {
            padding: 12px 16px;
            color: #4a5568;
            border: 1px solid #e2e8f0;
            vertical-align: top;
            word-wrap: break-word;
            max-width: ${Math.floor(width / 3 - 40)}px;
            line-height: 1.5;
            overflow-wrap: break-word;
            hyphens: auto;
          }
          .code-cell {
            font-family: 'SFMono-Regular', 'Monaco', 'Consolas', monospace;
            font-size: 12px;
            background-color: #f7fafc;
            border-radius: 3px;
            padding: 8px;
            white-space: pre-wrap;
            word-break: break-all;
          }
        </style>
        ${clone.innerHTML}
      </div>
    `;
    
    // Apply special styling to code examples in the last column
    const lastColumnCells = clone.querySelectorAll('td:last-child');
    lastColumnCells.forEach(cell => {
      if (cell.textContent && (cell.textContent.includes('(') || cell.textContent.includes('def'))) {
        cell.innerHTML = `<div class="code-cell">${cell.textContent}</div>`;
      }
    });
    
    const svgData = `
      <svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${tableHTML.replace(clone.innerHTML, clone.innerHTML)}
          </div>
        </foreignObject>
      </svg>
    `;

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      });

      // Adjust canvas size if needed
      if (totalHeight > height) {
        const originalCanvas = ctx.canvas;
        originalCanvas.height = totalHeight * 2; // Account for 2x scaling
        ctx.scale(2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, totalHeight);
      }

      ctx.drawImage(img, 0, 0, width, totalHeight);
    } catch (error) {
      console.warn('Table SVG capture failed, using manual rendering:', error);
      
      // Enhanced fallback with better text handling
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // Draw table border
      ctx.strokeStyle = '#e1e5e9';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, width - 20, height - 20);
      
      // Calculate column widths
      const table = clone.querySelector('table');
      if (table) {
        const headerCells = table.querySelectorAll('tr:first-child th, tr:first-child td');
        const columnCount = headerCells.length;
        const columnWidth = (width - 20) / columnCount;
        
        let yOffset = 20;
        const rowHeight = Math.min(60, (height - 40) / rows.length);
        
        rows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll('th, td');
          let xOffset = 10;
          
          cells.forEach((cell, cellIndex) => {
            // Draw cell border
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.strokeRect(xOffset, yOffset, columnWidth, rowHeight);
            
            // Fill header background
            if (cell.tagName === 'TH') {
              ctx.fillStyle = '#f8f9fa';
              ctx.fillRect(xOffset + 1, yOffset + 1, columnWidth - 2, rowHeight - 2);
            }
            
            // Draw text with proper wrapping
            ctx.fillStyle = cell.tagName === 'TH' ? '#2d3748' : '#4a5568';
            ctx.font = cell.tagName === 'TH' ? 'bold 14px system-ui' : '14px system-ui';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            const text = cell.textContent?.trim() || '';
            const maxWidth = columnWidth - 20;
            const lineHeight = 18;
            
            // Split text into lines that fit
            const words = text.split(' ');
            const lines: string[] = [];
            let currentLine = '';
            
            words.forEach(word => {
              const testLine = currentLine + (currentLine ? ' ' : '') + word;
              const testWidth = ctx.measureText(testLine).width;
              
              if (testWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            });
            
            if (currentLine) {
              lines.push(currentLine);
            }
            
            // Draw each line
            lines.slice(0, 3).forEach((line, lineIndex) => { // Limit to 3 lines
              const lineY = yOffset + 10 + (lineIndex * lineHeight);
              if (lineIndex === 2 && lines.length > 3) {
                // Truncate last line if too many lines
                ctx.fillText(line.substring(0, 30) + '...', xOffset + 10, lineY);
              } else {
                ctx.fillText(line, xOffset + 10, lineY);
              }
            });
            
            xOffset += columnWidth;
          });
          
          yOffset += rowHeight;
        });
      }
    }
  };

  const captureWithForeignObject = async (element: HTMLElement, ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Use the original foreignObject approach for non-chart content
    const data = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif;">
            ${element.innerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
    });

    ctx.drawImage(img, 0, 0, width, height);
  };

  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAsImage = async () => {
    if (!targetRef.current) return;

    try {
      setIsLoading(true);

      // Simple approach: convert element to canvas using native API
      const canvas = await elementToCanvas(targetRef.current);
      
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png", 1.0);
      });

      if (!blob) {
        throw new Error("Failed to generate image");
      }

      // Copy to clipboard
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error("Clipboard not supported");
      }

    } catch (error) {
      console.error("Error copying image:", error);
      // Simple fallback: just download the file
      try {
        const canvas = await elementToCanvas(targetRef.current!);
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/png", 1.0);
        });
        if (blob) {
          downloadBlob(blob);
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        alert("Unable to copy to clipboard. Browser may not support this feature.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCopyAsImage}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={cn(
        "copy-button transition-all duration-200",
        copied && "bg-green-500 hover:bg-green-600 text-white",
        className
      )}
      title={copied ? "Copied!" : "Copy as image"}
    >
      {isLoading ? (
        <Skeleton className="h-3 w-3 rounded-full bg-current/30" />
      ) : copied ? (
        <svg
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-400 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinejoin="round" strokeWidth="2" d="M9 8v3a1 1 0 0 1-1 1H5m11 4h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v1m4 3v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7.13a1 1 0 0 1 .24-.65L7.7 8.35A1 1 0 0 1 8.46 8H13a1 1 0 0 1 1 1Z"/>
        </svg>
      )}
      {showText && (
        <span className="hidden sm:inline ml-1">
          {copied ? "Copied!" : isLoading ? "Copying..." : "Copy"}
        </span>
      )}
    </Button>
  );
}

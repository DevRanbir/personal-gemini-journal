import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Chart, { ChartConfig } from '@/components/chart';
import ChartMasonry from '@/components/chart-masonry';
import { CopyToImageButton } from '@/components/copy-to-image-button';
import { useIsMobile } from '@/hooks/use-mobile';

interface FormattedMessageProps {
  content: string;
}

type ParsedSource = {
  number: string;
  title: string;
  url: string;
};

function extractSources(content: string) {
  const sourcesHeading = /(^|\n)\s*(#{1,6}\s*)?Sources\s*:?\s*(\n|$)/i.exec(content);

  if (!sourcesHeading) {
    return { body: content, sources: [] as ParsedSource[] };
  }

  const body = content.slice(0, sourcesHeading.index).trimEnd();
  const sourceText = content.slice(sourcesHeading.index);
  const sources: ParsedSource[] = [];
  const sourceRegex = /^\s*(\d+)\.\s+\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gm;
  let sourceMatch;

  while ((sourceMatch = sourceRegex.exec(sourceText)) !== null) {
    sources.push({
      number: sourceMatch[1],
      title: sourceMatch[2],
      url: sourceMatch[3],
    });
  }

  return { body, sources };
}

function linkInlineCitations(content: string, sources: ParsedSource[]) {
  if (sources.length === 0) {
    return content;
  }

  const sourceNumbers = new Set(sources.map(source => source.number));

  return content.replace(/\[(\d+)\](?!\()/g, (match, sourceNumber) => {
    return sourceNumbers.has(sourceNumber) ? `[${sourceNumber}](#source-${sourceNumber})` : match;
  });
}

// Helper function to detect and parse chart data from code blocks
function parseChartData(codeContent: string): ChartConfig | null {
  try {
    // Remove any language identifier and trim whitespace
    const cleanedContent = codeContent.replace(/^(json|chart|graph|data)\s*\n?/i, '').trim();
    
    // Basic validation: must contain JSON structure indicators
    if (!cleanedContent.includes('{') && !cleanedContent.includes('[')) {
      return null;
    }
    
    // Must be at least 10 characters to be meaningful JSON
    if (cleanedContent.length < 10) {
      return null;
    }
    
    // Try to parse as JSON
    const parsed = JSON.parse(cleanedContent);
    
    // Check if it looks like chart configuration
    if (parsed && typeof parsed === 'object') {
      // Direct chart config format - respect the requested type (PRIORITY #1)
      if (parsed.type && parsed.data && parsed.xKey) {
        // Validate that the chart type is supported
        const supportedTypes = ['line', 'area', 'bar', 'pie', 'scatter'];
        if (supportedTypes.includes(parsed.type)) {
          return parsed as ChartConfig;
        }
      }
      
      // Auto-detect simple data arrays and create chart config
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstItem = parsed[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          const keys = Object.keys(firstItem);
          if (keys.length >= 2) {
            // Auto-determine chart type based on data characteristics
            const stringKeys = keys.filter(key => typeof firstItem[key] === 'string');
            const numericKeys = keys.filter(key => typeof firstItem[key] === 'number');
            
            if (numericKeys.length > 0) {
              const xKey = stringKeys[0] || keys[0];
              const yKey = numericKeys[0];
              
              // Default to bar chart for auto-detection (was overriding user requests)
              let chartType: ChartConfig['type'] = 'bar';
              
              // If we have one string field and one numeric field, good for pie chart
              if (stringKeys.length === 1 && numericKeys.length === 1) {
                chartType = 'pie';
              }
              // If we have multiple numeric fields, use bar chart
              else if (numericKeys.length > 1) {
                chartType = 'bar';
              }
              // If the x-axis looks like a time series or continuous data, use line chart
              else if (parsed.length > 3 && typeof firstItem[xKey] === 'string') {
                const xValues = parsed.map(item => item[xKey]).filter(val => val);
                const isDateLike = xValues.some(val => 
                  /\d{4}|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(val)
                );
                if (isDateLike) chartType = 'line';
              }
              
              return {
                type: chartType,
                data: parsed,
                xKey: xKey,
                yKey: yKey,
                dataKeys: numericKeys.length > 1 ? numericKeys : undefined,
                title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`
              };
            }
          }
        }
      }
      
      // Handle chart data with metadata
      if (parsed.chartData || parsed.data) {
        const data = parsed.chartData || parsed.data;
        const title = parsed.title || parsed.chartTitle || 'Data Visualization';
        const type = parsed.type || parsed.chartType || 'bar';
        
        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0];
          if (typeof firstItem === 'object' && firstItem !== null) {
            const keys = Object.keys(firstItem);
            const stringKeys = keys.filter(key => typeof firstItem[key] === 'string');
            const numericKeys = keys.filter(key => typeof firstItem[key] === 'number');
            
            const xKey = parsed.xKey || stringKeys[0] || keys[0];
            const yKey = parsed.yKey || numericKeys[0] || keys.find(key => typeof firstItem[key] === 'number');
            
            return {
              type: type as ChartConfig['type'],
              data: data,
              xKey: xKey,
              yKey: yKey,
              dataKeys: numericKeys.length > 1 ? numericKeys : undefined,
              title: title
            };
          }
        }
      }
      
      // Handle object format like { "Category A": 10, "Category B": 20 }
      if (!Array.isArray(parsed) && Object.keys(parsed).length > 0) {
        const entries = Object.entries(parsed);
        const hasNumericValues = entries.every(([key, value]) => 
          typeof value === 'number' && !isNaN(value)
        );
        
        if (hasNumericValues) {
          const data = entries.map(([key, value]) => ({
            name: key,
            value: value as number
          }));
          
          return {
            type: 'pie',
            data: data,
            xKey: 'name',
            yKey: 'value',
            title: 'Data Distribution'
          };
        }
      }
    }
  } catch (error) {
    // Silently ignore parsing errors for non-chart content
  }
  
  return null;
}

export function FormattedMessage({ content }: FormattedMessageProps) {
  const isMobile = useIsMobile();
  let safeContent = typeof content === 'string' ? content : (content != null ? String(content) : '');
  try {
    if (safeContent.trim().startsWith('{') && (safeContent.includes('"response"') || safeContent.includes('"reply"'))) {
      const parsed = JSON.parse(safeContent.trim());
      if (parsed && typeof parsed === 'object') {
        const inner = parsed.reply || parsed.response || parsed.message || parsed.text || parsed.answer;
        if (inner && typeof inner === 'string') {
          safeContent = inner;
        }
      }
    }
  } catch (e) {}
  
  // Pre-process content to extract all charts and replace with placeholders
  const chartConfigs: ChartConfig[] = [];
  const { body, sources } = extractSources(safeContent);
  const contentWithLinkedCitations = linkInlineCitations(typeof body === 'string' ? body : String(body || ''), sources);
  let processedContent = typeof contentWithLinkedCitations === 'string' ? contentWithLinkedCitations : String(contentWithLinkedCitations || '');
  
  // Find all JSON code blocks and extract chart data
  const jsonCodeBlockRegex = /```(?:json|data|chart)?\s*\n?([\s\S]*?)\s*```/gi;
  let match;
  let chartIndex = 0;
  
  while ((match = jsonCodeBlockRegex.exec(contentWithLinkedCitations)) !== null) {
    const jsonContent = match[1].trim();
    const chartConfig = parseChartData(jsonContent);
    
    if (chartConfig) {
      chartConfigs.push(chartConfig);
      // Replace the code block with a placeholder
      if (typeof processedContent === 'string') {
        processedContent = processedContent.replace(match[0], `__CHART_PLACEHOLDER_${chartIndex}__`);
      }
      chartIndex++;
    }
  }

  // Remove all chart placeholders from the final content
  if (typeof processedContent === 'string') {
    processedContent = processedContent.replace(/__CHART_PLACEHOLDER_\d+__/g, '').trim();
  } else {
    processedContent = String(processedContent || '');
  }

  return (
    <div>
      {/* Render charts in masonry layout if any were found */}
      {chartConfigs.length > 0 && (
        <div className="my-6">
          <ChartMasonry charts={chartConfigs} />
          
          {/* Collapsible raw data section */}
          <details className="mt-4">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              View raw data ({chartConfigs.length} chart{chartConfigs.length !== 1 ? 's' : ''})
            </summary>
            <div className="mt-2 space-y-2">
              {chartConfigs.map((config, index) => (
                <div key={index} className="bg-black/5 dark:bg-white/5 border border-white/20 dark:border-white/20 rounded-md p-3 overflow-x-auto">
                  <pre className="text-sm">
                    <code>{JSON.stringify(config.data, null, 2)}</code>
                  </pre>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Render the markdown content with chart placeholders removed */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => {
            const TableComponent = () => {
              const tableRef = React.useRef<HTMLDivElement>(null);
              
              return (
                <div className={`my-6 ${isMobile ? 'flex flex-col items-center' : ''}`}>
                  <div className="relative group w-full flex justify-center">
                    <div 
                      ref={tableRef}
                      className={`overflow-x-auto border border-border/30 rounded-lg bg-card/50 backdrop-blur-sm shadow-sm ${
                        isMobile ? 'max-w-[calc(100vw-1rem)] w-full' : ''
                    }`}
                  >
                    <table className={`w-full border-collapse bg-transparent ${
                      isMobile ? 'min-w-full text-sm' : 'min-w-[600px]'
                    }`}>
                      {children}
                    </table>
                  </div>
                  
                  {/* Copy button - shows on hover, hidden on mobile for better touch experience */}
                  {!isMobile && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <CopyToImageButton
                        targetRef={tableRef}
                        filename="table"
                        variant="outline"
                        size="sm"
                        className="bg-background/80 backdrop-blur-sm border-border/40 hover:bg-accent shadow-sm"
                      />
                    </div>
                  )}
                </div>
                
                {/* Minimal table description */}
                <div className={`mt-1 text-muted-foreground/70 flex items-center gap-1 ${isMobile ? 'text-xs justify-center' : 'text-xs'}`}>
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeWidth="2" d="M3 11h18m-9 0v8m-8 0h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>
                    </svg>
                    Table
                  </span>
                </div>
              </div>
              );
            };
            
            return <TableComponent />;
          },
          th: ({ children }) => (
            <th className={`border-r border-b border-border/30 bg-muted/30 text-left font-semibold text-foreground last:border-r-0 ${
              isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-3'
            }`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`border-r border-b border-border/20 bg-transparent text-foreground last:border-r-0 hover:bg-muted/20 transition-colors ${
              isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-3'
            }`}>
              {children}
            </td>
          ),
          thead: ({ children }) => (
            <thead className="bg-transparent [&>tr:last-child>th]:border-b-2 [&>tr:last-child>th]:border-border/40">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-transparent [&>tr:last-child>td]:border-b-0 [&>tr:hover]:bg-muted/10">
              {children}
            </tbody>
          ),
          p: ({ children }) => {
            // Handle both string and React element children
            let processedChildren;
            
            if (typeof children === 'string') {
              processedChildren = children.replace(/__CHART_PLACEHOLDER_\d+__/g, '').trim();
            } else if (React.isValidElement(children)) {
              // If it's a React element, check its content
              const childContent = String((children.props as Record<string, unknown>)?.children || '');
              if (/__CHART_PLACEHOLDER_\d+__/.test(childContent)) {
                return null;
              }
              processedChildren = children;
            } else if (Array.isArray(children)) {
              // Filter out any chart placeholders from children array
              processedChildren = children.filter(child => {
                if (typeof child === 'string') {
                  return !/__CHART_PLACEHOLDER_\d+__/.test(child);
                }
                return true;
              });
              if (processedChildren.length === 0) return null;
            } else {
              processedChildren = children;
            }
            
            // Don't render empty paragraphs
            if (!processedChildren || 
                (typeof processedChildren === 'string' && processedChildren === '') ||
                (Array.isArray(processedChildren) && processedChildren.length === 0)) {
              return null;
            }
            
            return (
              <div className="mb-2 last:mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {processedChildren}
              </div>
            );
          },
          pre: ({ children }) => {
            // Skip rendering pre blocks that were converted to charts
            const codeContent = typeof children === 'string' ? children : 
              React.isValidElement(children) && children.type === 'code' 
                ? String((children.props as Record<string, unknown>).children || '') 
                : '';
            
            if (typeof codeContent === 'string' && parseChartData(codeContent)) {
              return null; // Skip chart code blocks as they're rendered above
            }

            // Extract language from className if it exists
            let language = 'code';
            let title = 'Code Snippet';
            
            if (React.isValidElement(children) && children.props) {
              const className = (children.props as { className?: string }).className || '';
              const langMatch = className.match(/language-(\w+)/);
              if (langMatch) {
                language = langMatch[1];
                // Set appropriate titles based on language
                switch (language.toLowerCase()) {
                  case 'python':
                    title = 'Python Implementation';
                    break;
                  case 'javascript':
                  case 'js':
                    title = 'JavaScript Implementation';
                    break;
                  case 'java':
                    title = 'Java Implementation';
                    break;
                  case 'cpp':
                  case 'c++':
                    title = 'C++ Implementation';
                    break;
                  case 'c':
                    title = 'C Implementation';
                    break;
                  default:
                    title = `${language.charAt(0).toUpperCase() + language.slice(1)} Code`;
                }
              }
            }

            const copyToClipboard = () => {
              const textContent = typeof codeContent === 'string' ? codeContent : '';
              navigator.clipboard.writeText(textContent).catch(console.error);
            };
            
            return (
              <div className="bg-black/5 dark:bg-white/5 border border-white/20 dark:border-white/20 rounded-md my-2 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-black/10 dark:bg-white/10 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wide">
                      {language}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-medium text-foreground">
                      {title}
                    </span>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-transparent hover:bg-white/10 dark:hover:bg-black/20 rounded transition-colors duration-200"
                    title="Copy to clipboard"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                {/* Code content */}
                <div className="p-3 overflow-x-auto">
                  <pre className="font-mono text-sm whitespace-pre-wrap" style={{ whiteSpace: 'pre' }}>
                    {children}
                  </pre>
                </div>
              </div>
            );
          },
          code: ({ inline, className, children, ...props }: { node?: unknown; inline?: boolean; className?: string; children?: React.ReactNode }) => {
            // For inline code, just render normally
            if (inline) {
              return (
                <code className="bg-black/5 dark:bg-white/5 border border-white/20 dark:border-white/20 px-1 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }
            
            // For block code, check if it's chart data and skip if so
            const codeContent = typeof children === 'string' ? children : String(children);
            if (parseChartData(codeContent)) {
              return null; // Skip chart code blocks
            }
            
            return (
              <code className={`block font-mono text-sm whitespace-pre-wrap ${className || ''}`} style={{ whiteSpace: 'pre' }} {...props}>
                {children}
              </code>
            );
          },
          a: ({ href, children }) => {
            const targetHref = href || '';
            const isCitation = targetHref.startsWith('#source-');

            if (isCitation) {
              return (
                <a
                  href={targetHref}
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(targetHref.slice(1))?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }}
                >
                  {children}
                </a>
              );
            }

            return (
              <a
                href={targetHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                {children}
              </a>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-white/30 dark:border-white/30 pl-4 my-2 italic text-foreground/70">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-2 text-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-2 text-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="my-1 text-foreground">
              {children}
            </li>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold my-3 text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold my-2 text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-md font-semibold my-2 text-foreground">
              {children}
            </h3>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic">
              {children}
            </em>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
      {sources.length > 0 && (
        <section className="mt-5 border-t border-border/30 pt-3">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Sources</h3>
          <ol className="space-y-1 text-sm text-foreground/90">
            {sources.map((source) => (
              <li
                key={`${source.number}-${source.url}`}
                id={`source-${source.number}`}
                className="scroll-mt-24 rounded-md px-2 py-1 transition-colors target:bg-primary/10"
              >
                <span className="mr-2 text-muted-foreground">{source.number}.</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  CardHeader, 
  Chip, 
  CircularProgress, 
  FormControl, 
  Grid, 
  InputLabel, 
  MenuItem, 
  Select, 
  SelectChangeEvent, 
  Tab, 
  Tabs, 
  Tooltip, 
  Typography 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TimelineIcon from '@mui/icons-material/Timeline';
import HeatMapIcon from '@mui/icons-material/Grid4x4';

// Import D3 for visualizations
import * as d3 from 'd3';

// Import from our analytics service
import { anonymousUsageTracker, UserActionEvent } from '../../services/analytics/AnonymousUsageTracker';

// Styled components for neon wireframe appearance
const NeonCard = styled(Card)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  borderRadius: 8,
  border: '1px solid #00FFFF',
  boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
}));

const NeonCardHeader = styled(CardHeader)(({ theme }) => ({
  color: '#00FFFF',
  borderBottom: '1px solid rgba(0, 255, 255, 0.3)'
}));

// Types for workflow data
export interface WorkflowNode {
  id: string;
  label: string;
  type: 'action' | 'page' | 'feature';
  count: number;
}

export interface WorkflowEdge {
  source: string;
  target: string;
  count: number;
  avgTime?: number; // Average time between steps in ms
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface TimelineEvent {
  timestamp: number;
  action: string;
  category: string;
  count: number;
}

interface HeatmapCell {
  x: string; // Day of week or hour
  y: string; // Feature or action
  value: number;
}

// Tabs interface definition
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workflow-tabpanel-${index}`}
      aria-labelledby={`workflow-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 1, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `workflow-tab-${index}`,
    'aria-controls': `workflow-tabpanel-${index}`,
  };
};

/**
 * Time range options for analytics
 */
const timeRangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' }
];

/**
 * Component for visualizing user workflows in the application
 */
const WorkflowVisualization: React.FC = () => {
  // State for selected tab
  const [tabValue, setTabValue] = useState(0);
  
  // State for selected time range
  const [timeRange, setTimeRange] = useState('30d');
  
  // State for loading status
  const [isLoading, setIsLoading] = useState(false);
  
  // State for workflow data
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  
  // State for timeline data
  const [timelineData, setTimelineData] = useState<TimelineEvent[]>([]);
  
  // State for heatmap data
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  
  // Refs for visualization containers
  const graphRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle time range change
  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };
  
  // Fetch workflow data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // In a real implementation, we'd fetch this from the server
        // For now, we'll generate mock data based on the time range
        setTimeout(() => {
          // Generate mock workflow graph data
          const mockWorkflowData: WorkflowData = {
            nodes: [
              { id: 'dashboard', label: 'Dashboard', type: 'page', count: 120 },
              { id: 'servers', label: 'Servers', type: 'page', count: 95 },
              { id: 'config', label: 'Configuration', type: 'page', count: 72 },
              { id: 'logs', label: 'Logs', type: 'page', count: 63 },
              { id: 'monitor', label: 'Monitoring', type: 'page', count: 58 },
              { id: 'debug', label: 'Debug Tools', type: 'page', count: 42 },
              { id: 'edit_config', label: 'Edit Config', type: 'action', count: 38 },
              { id: 'view_logs', label: 'View Logs', type: 'action', count: 35 },
              { id: 'restart', label: 'Restart Server', type: 'action', count: 30 },
              { id: 'create_server', label: 'Create Server', type: 'action', count: 25 }
            ],
            edges: [
              { source: 'dashboard', target: 'servers', count: 80 },
              { source: 'servers', target: 'config', count: 65 },
              { source: 'config', target: 'edit_config', count: 38 },
              { source: 'config', target: 'monitor', count: 27 },
              { source: 'servers', target: 'logs', count: 55 },
              { source: 'logs', target: 'view_logs', count: 35 },
              { source: 'logs', target: 'debug', count: 28 },
              { source: 'dashboard', target: 'monitor', count: 35 },
              { source: 'monitor', target: 'logs', count: 32 },
              { source: 'servers', target: 'restart', count: 30 },
              { source: 'dashboard', target: 'create_server', count: 25 }
            ]
          };
          
          // Generate mock timeline data
          const now = Date.now();
          const daysInRange = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 180;
          const timelineEvents: TimelineEvent[] = [];
          
          for (let i = 0; i < daysInRange; i++) {
            const day = now - (daysInRange - i) * 24 * 60 * 60 * 1000;
            
            // Add dashboard visits
            timelineEvents.push({
              timestamp: day,
              action: 'visit',
              category: 'dashboard',
              count: 5 + Math.floor(Math.random() * 10)
            });
            
            // Add server configuration
            timelineEvents.push({
              timestamp: day,
              action: 'configure',
              category: 'servers',
              count: 2 + Math.floor(Math.random() * 8)
            });
            
            // Add log views
            timelineEvents.push({
              timestamp: day,
              action: 'view',
              category: 'logs',
              count: 3 + Math.floor(Math.random() * 7)
            });
          }
          
          // Generate mock heatmap data for feature usage by day of week
          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const features = ['Dashboard', 'Server Config', 'Logs', 'Monitoring', 'Debugging', 'Deployment'];
          
          const heatmapCells: HeatmapCell[] = [];
          
          daysOfWeek.forEach(day => {
            features.forEach(feature => {
              heatmapCells.push({
                x: day,
                y: feature,
                value: 5 + Math.floor(Math.random() * 95) // 5-100 range
              });
            });
          });
          
          setWorkflowData(mockWorkflowData);
          setTimelineData(timelineEvents);
          setHeatmapData(heatmapCells);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to fetch workflow data:', error);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [timeRange]);
  
  // Render workflow graph using D3
  useEffect(() => {
    if (!graphRef.current || !workflowData || tabValue !== 0) return;
    
    const container = graphRef.current;
    container.innerHTML = '';
    
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    
    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto; font: 10px sans-serif;');
    
    // Create a force simulation
    const simulation = d3.forceSimulation(workflowData.nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(workflowData.edges)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));
    
    // Create a container for the graph
    const graph = svg.append('g');
    
    // Create links
    const link = graph.append('g')
      .attr('stroke', '#00AAFF')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(workflowData.edges)
      .join('line')
      .attr('stroke-width', d => Math.sqrt(d.count) / 2);
    
    // Create a group for each node
    const node = graph.append('g')
      .attr('fill', '#00FFFF')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('g')
      .data(workflowData.nodes)
      .join('g')
      .call(drag(simulation));
    
    // Add circles to nodes
    node.append('circle')
      .attr('r', d => Math.sqrt(d.count) * 2)
      .attr('fill', d => d.type === 'page' ? '#00FFFF' : d.type === 'action' ? '#FF00FF' : '#FFFF00')
      .attr('stroke', '#000')
      .attr('stroke-width', 2);
    
    // Add text labels to nodes
    node.append('text')
      .attr('x', 0)
      .attr('y', d => -Math.sqrt(d.count) * 2 - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .text(d => d.label);
    
    // Add count labels
    node.append('text')
      .attr('x', 0)
      .attr('y', d => Math.sqrt(d.count) * 2 + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .text(d => `(${d.count})`);
    
    // Create a drag behavior
    function drag(simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
    
    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    
    // Add zoom functionality
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        graph.attr('transform', event.transform);
      });
    
    svg.call(zoom as any);
    
    // Add a legend
    const legend = svg.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(['Page', 'Action', 'Feature'])
      .join('g')
      .attr('transform', (d, i) => `translate(10,${i * 20 + 10})`);
    
    legend.append('rect')
      .attr('x', 0)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', (d, i) => i === 0 ? '#00FFFF' : i === 1 ? '#FF00FF' : '#FFFF00');
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 7.5)
      .attr('dy', '0.32em')
      .attr('fill', '#fff')
      .text(d => d);
    
    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
  }, [workflowData, tabValue, graphRef]);
  
  // Render timeline using D3
  useEffect(() => {
    if (!timelineRef.current || timelineData.length === 0 || tabValue !== 1) return;
    
    const container = timelineRef.current;
    container.innerHTML = '';
    
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const margin = { top: 20, right: 50, bottom: 30, left: 50 };
    
    // Process data for timeline
    const categories = Array.from(new Set(timelineData.map(d => d.category)));
    
    // Group data by timestamp and category
    const groupedData: Map<number, Map<string, number>> = new Map();
    
    timelineData.forEach(d => {
      if (!groupedData.has(d.timestamp)) {
        groupedData.set(d.timestamp, new Map());
      }
      
      const categoryMap = groupedData.get(d.timestamp)!;
      categoryMap.set(d.category, (categoryMap.get(d.category) || 0) + d.count);
    });
    
    // Convert to array format for d3
    const processedData: Array<{ timestamp: number, category: string, count: number }> = [];
    
    groupedData.forEach((categoryMap, timestamp) => {
      categories.forEach(category => {
        processedData.push({
          timestamp,
          category,
          count: categoryMap.get(category) || 0
        });
      });
    });
    
    // Sort by timestamp
    processedData.sort((a, b) => a.timestamp - b.timestamp);
    
    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto; font: 10px sans-serif;');
    
    // Create scales
    const x = d3.scaleTime()
      .domain(d3.extent(processedData, d => new Date(d.timestamp)) as [Date, Date])
      .range([margin.left, width - margin.right]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.count) as number])
      .nice()
      .range([height - margin.bottom, margin.top]);
    
    const color = d3.scaleOrdinal<string>()
      .domain(categories)
      .range(['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00', '#FF0000']);
    
    // Group data by category for line paths
    const nestedData = Array.from(
      d3.group(processedData, d => d.category),
      ([key, values]) => ({ key, values })
    );
    
    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(width > 500 ? 10 : 5))
      .call(g => g.select('.domain').attr('stroke', '#ccc'))
      .call(g => g.selectAll('.tick line').attr('stroke', '#ccc'))
      .call(g => g.selectAll('.tick text').attr('fill', '#ccc'));
    
    // Add Y axis
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .call(g => g.select('.domain').attr('stroke', '#ccc'))
      .call(g => g.selectAll('.tick line').attr('stroke', '#ccc'))
      .call(g => g.selectAll('.tick text').attr('fill', '#ccc'))
      .call(g => g.append('text')
        .attr('x', -10)
        .attr('y', 10)
        .attr('fill', '#ccc')
        .attr('text-anchor', 'start')
        .text('Actions'));
    
    // Add lines
    const line = d3.line<{ timestamp: number, count: number }>()
      .x(d => x(new Date(d.timestamp)))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);
    
    svg.append('g')
      .selectAll('path')
      .data(nestedData)
      .join('path')
        .attr('fill', 'none')
        .attr('stroke', d => color(d.key))
        .attr('stroke-width', 2)
        .attr('d', d => line(d.values.map(v => ({ timestamp: v.timestamp, count: v.count }))));
    
    // Add legend
    const legend = svg.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(categories)
      .join('g')
        .attr('transform', (d, i) => `translate(${width - 120},${i * 20 + 20})`);
    
    legend.append('rect')
      .attr('x', 0)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => color(d));
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 7.5)
      .attr('dy', '0.32em')
      .attr('fill', '#fff')
      .text(d => d);
  }, [timelineData, tabValue, timelineRef]);
  
  // Render heatmap using D3
  useEffect(() => {
    if (!heatmapRef.current || heatmapData.length === 0 || tabValue !== 2) return;
    
    const container = heatmapRef.current;
    container.innerHTML = '';
    
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const margin = { top: 30, right: 30, bottom: 50, left: 100 };
    
    // Get unique x and y values
    const xValues = Array.from(new Set(heatmapData.map(d => d.x)));
    const yValues = Array.from(new Set(heatmapData.map(d => d.y)));
    
    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto; font: 10px sans-serif;');
    
    // Create scales
    const x = d3.scaleBand()
      .domain(xValues)
      .range([margin.left, width - margin.right])
      .padding(0.05);
    
    const y = d3.scaleBand()
      .domain(yValues)
      .range([height - margin.bottom, margin.top])
      .padding(0.05);
    
    // Color scale for the heatmap
    const colorScale = d3.scaleSequential(d3.interpolateYlGnBu)
      .domain([0, d3.max(heatmapData, d => d.value) as number]);
    
    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick text')
        .attr('fill', '#ccc')
        .style('text-anchor', 'start')
        .attr('dx', '0.8em')
        .attr('dy', '0.3em')
        .attr('transform', 'rotate(45)'));
    
    // Add Y axis
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick text')
        .attr('fill', '#ccc'));
    
    // Add heatmap cells
    svg.append('g')
      .selectAll('rect')
      .data(heatmapData)
      .join('rect')
        .attr('x', d => x(d.x) as number)
        .attr('y', d => y(d.y) as number)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', '#000')
        .attr('stroke-width', 0.5)
        .append('title')
        .text(d => `${d.y} on ${d.x}: ${d.value}`);
    
    // Add cell values
    svg.append('g')
      .selectAll('text')
      .data(heatmapData)
      .join('text')
        .attr('x', d => (x(d.x) as number) + x.bandwidth() / 2)
        .attr('y', d => (y(d.y) as number) + y.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', d => d.value > 50 ? '#000' : '#fff')
        .attr('font-size', '8px')
        .text(d => d.value);
    
    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ccc')
      .attr('font-size', '14px')
      .text('Feature Usage by Day of Week');
  }, [heatmapData, tabValue, heatmapRef]);
  
  return (
    <NeonCard>
      <NeonCardHeader 
        title="Workflow Visualization" 
        action={
          <Tooltip title="Shows how users navigate through the application">
            <InfoIcon sx={{ color: 'rgba(0, 255, 255, 0.7)' }} />
          </Tooltip>
        }
      />
      
      <CardContent sx={{ p: 1, display: 'flex', flexDirection: 'column', height: 'calc(100% - 64px)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            sx={{ 
              mb: 1,
              '& .MuiTabs-indicator': {
                backgroundColor: '#00FFFF'
              },
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: '#00FFFF'
                }
              }
            }}
          >
            <Tab 
              icon={<AccountTreeIcon />} 
              iconPosition="start" 
              label="Workflow Graph" 
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<TimelineIcon />} 
              iconPosition="start" 
              label="Activity Timeline" 
              {...a11yProps(1)} 
            />
            <Tab 
              icon={<HeatMapIcon />} 
              iconPosition="start" 
              label="Feature Heatmap" 
              {...a11yProps(2)} 
            />
          </Tabs>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="time-range-select-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Time Range</InputLabel>
            <Select
              labelId="time-range-select-label"
              id="time-range-select"
              value={timeRange}
              label="Time Range"
              onChange={handleTimeRangeChange}
              sx={{ 
                color: '#00FFFF',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 255, 255, 0.5)'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00FFFF'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00FFFF'
                },
                '.MuiSvgIcon-root': {
                  color: '#00FFFF'
                }
              }}
            >
              {timeRangeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        <Box sx={{ flexGrow: 1, position: 'relative', minHeight: 400 }}>
          {isLoading && (
            <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 10,
              borderRadius: 1
            }}>
              <CircularProgress sx={{ color: '#00FFFF' }} />
            </Box>
          )}
          
          <TabPanel value={tabValue} index={0}>
            <Box ref={graphRef} sx={{ width: '100%', height: '100%', minHeight: 400 }}></Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Box ref={timelineRef} sx={{ width: '100%', height: '100%', minHeight: 400 }}></Box>
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Box ref={heatmapRef} sx={{ width: '100%', height: '100%', minHeight: 400 }}></Box>
          </TabPanel>
        </Box>
        
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip 
            size="small" 
            label="Anonymous data collection" 
            sx={{ 
              backgroundColor: 'rgba(0, 255, 255, 0.1)', 
              color: '#00FFFF', 
              border: '1px solid rgba(0, 255, 255, 0.3)' 
            }} 
          />
          
          <Chip 
            size="small" 
            label="Privacy-focused" 
            sx={{ 
              backgroundColor: 'rgba(0, 255, 255, 0.1)', 
              color: '#00FFFF', 
              border: '1px solid rgba(0, 255, 255, 0.3)' 
            }} 
          />
          
          <Chip 
            size="small" 
            label="Opt-out available" 
            sx={{ 
              backgroundColor: 'rgba(0, 255, 255, 0.1)', 
              color: '#00FFFF', 
              border: '1px solid rgba(0, 255, 255, 0.3)' 
            }} 
          />
        </Box>
      </CardContent>
    </NeonCard>
  );
};

export default WorkflowVisualization;
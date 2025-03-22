/**
 * PerformanceAnalysisVisualizer.tsx
 * 
 * Component for visualizing performance metrics and anomalies in a neon wireframe style
 */

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Chip,
  Grid,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TableSortLabel,
  Tabs,
  Tab
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { LineChart, ScatterChart } from '@mui/x-charts';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import WarningIcon from '@mui/icons-material/Warning';

import { 
  PerformanceMetric, 
  PerformanceAnomaly 
} from '../../services/maintenance/models/types';

// Styled components for neon wireframe appearance
const NeonContainer = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  borderRadius: 8,
  border: '1px solid #00FFFF',
  boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
  padding: theme.spacing(2),
  margin: theme.spacing(1, 0),
  overflow: 'hidden'
}));

const NeonDivider = styled(Divider)(({ theme }) => ({
  backgroundColor: '#00FFFF',
  height: '2px',
  margin: theme.spacing(2, 0),
  boxShadow: '0 0 5px rgba(0, 255, 255, 0.5)'
}));

const NeonChip = styled(Chip)<{anomaly?: boolean}>(({ theme, anomaly }) => {
  const color = anomaly ? '#FF00FF' : '#00FFFF';
  
  return {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: `1px solid ${color}`,
    color: color,
    fontSize: '0.75rem',
    height: 24,
    '& .MuiChip-label': {
      padding: '0 8px'
    },
    boxShadow: `0 0 5px rgba(${anomaly ? '255, 0, 255' : '0, 255, 255'}, 0.5)`
  };
});

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  color: '#FFFFFF',
  borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
  padding: '8px 16px',
  fontSize: '0.875rem'
}));

const StyledTableHeaderCell = styled(TableCell)(({ theme }) => ({
  color: '#00FFFF',
  borderBottom: '1px solid rgba(0, 255, 255, 0.5)',
  padding: '8px 16px',
  fontWeight: 'bold',
  fontSize: '0.875rem'
}));

interface PerformanceAnalysisVisualizerProps {
  metrics: PerformanceMetric[];
  anomalies: PerformanceAnomaly[];
}

type Order = 'asc' | 'desc';
type MetricKey = keyof PerformanceMetric;

const PerformanceAnalysisVisualizer: React.FC<PerformanceAnalysisVisualizerProps> = ({ 
  metrics, 
  anomalies 
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [orderBy, setOrderBy] = useState<MetricKey>('timestamp');
  const [order, setOrder] = useState<Order>('desc');
  
  const handleRequestSort = (property: MetricKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Group metrics by type for comparison
  const cpuMetrics = metrics.filter(m => m.name.includes('CPU'));
  const memoryMetrics = metrics.filter(m => m.name.includes('Memory'));
  const networkMetrics = metrics.filter(m => m.name.includes('Network'));
  const diskMetrics = metrics.filter(m => m.name.includes('Disk'));
  
  // Format data for time series chart
  const getTimeSeriesData = (filteredMetrics: PerformanceMetric[]) => {
    return filteredMetrics.map(metric => ({
      time: new Date(metric.timestamp),
      value: metric.value,
      name: metric.name
    }));
  };
  
  // Prepare anomaly data for scatter plot
  const anomalyData = anomalies.map(anomaly => ({
    x: new Date(anomaly.timestamp),
    y: anomaly.actualValue,
    id: anomaly.id,
    size: 8,
    name: anomaly.metricName
  }));
  
  // Sort metrics for table display
  const sortedMetrics = [...metrics].sort((a, b) => {
    const valueA = a[orderBy];
    const valueB = b[orderBy];
    
    if (valueA < valueB) {
      return order === 'asc' ? -1 : 1;
    }
    if (valueA > valueB) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
  
  // Get metrics to display based on active tab
  const getMetricsForTab = () => {
    switch (activeTab) {
      case 0: return sortedMetrics; // All
      case 1: return cpuMetrics; // CPU
      case 2: return memoryMetrics; // Memory
      case 3: return networkMetrics.concat(diskMetrics); // I/O
      default: return sortedMetrics;
    }
  };
  
  // Get chart data based on active tab
  const getChartDataForTab = () => {
    switch (activeTab) {
      case 0: return cpuMetrics.length ? getTimeSeriesData(cpuMetrics) : []; // Default to CPU if available
      case 1: return getTimeSeriesData(cpuMetrics);
      case 2: return getTimeSeriesData(memoryMetrics);
      case 3: return getTimeSeriesData(networkMetrics.concat(diskMetrics));
      default: return getTimeSeriesData(cpuMetrics);
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Summary section */}
      <NeonContainer elevation={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold' }}>
            Performance Analysis Summary
          </Typography>
          <NeonChip 
            label={`${metrics.length} Metrics`} 
            icon={<SpeedIcon sx={{ fontSize: 16 }} />} 
          />
        </Box>
        
        <NeonDivider />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#FFFFFF' }}>
                  Monitoring Period
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {metrics.length > 0 ? (
                    `${new Date(metrics[0].timestamp).toLocaleString()} - 
                     ${new Date(metrics[metrics.length - 1].timestamp).toLocaleString()}`
                  ) : 'No data available'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#FFFFFF' }}>
                  Anomalies Detected
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ color: anomalies.length > 0 ? '#FF00FF' : '#00FF00' }}
                >
                  {anomalies.length} {anomalies.length === 1 ? 'anomaly' : 'anomalies'}
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" flexWrap="wrap" gap={1}>
              <NeonChip 
                label={`${cpuMetrics.length} CPU Metrics`} 
                icon={<MemoryIcon sx={{ fontSize: 16 }} />} 
              />
              <NeonChip 
                label={`${memoryMetrics.length} Memory Metrics`} 
                icon={<StorageIcon sx={{ fontSize: 16 }} />} 
              />
              <NeonChip 
                label={`${networkMetrics.length + diskMetrics.length} I/O Metrics`} 
                icon={<SpeedIcon sx={{ fontSize: 16 }} />} 
              />
              <NeonChip 
                label={`${anomalies.length} Anomalies`} 
                icon={<WarningIcon sx={{ fontSize: 16 }} />}
                anomaly={true}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={5}>
            {anomalies.length > 0 ? (
              <Box height={140}>
                <Typography variant="subtitle2" sx={{ color: '#FFFFFF', mb: 1 }}>
                  Anomaly Distribution
                </Typography>
                <ScatterChart
                  series={[
                    {
                      data: anomalyData,
                      label: 'Anomalies',
                      valueFormatter: (value) => new Date(value.x).toLocaleTimeString(),
                      color: '#FF00FF',
                    }
                  ]}
                  height={120}
                  margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
                  sx={{
                    '.MuiChartsAxis-tick': {
                      stroke: '#FFFFFF',
                    },
                    '.MuiChartsAxis-tickLabel': {
                      fill: '#FFFFFF',
                      fontSize: '0.75rem',
                    },
                    '.MuiChartsAxis-line': {
                      stroke: '#00FFFF',
                    },
                  }}
                  xAxis={[{ scaleType: 'time' }]}
                />
              </Box>
            ) : (
              <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                height={140}
                sx={{ color: '#00FF00' }}
              >
                <WarningIcon sx={{ mr: 1 }} />
                <Typography variant="body2">
                  No anomalies detected
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </NeonContainer>
      
      {/* Metrics section */}
      <NeonContainer elevation={3}>
        <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold', mb: 2 }}>
          Performance Metrics
        </Typography>
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            mb: 2,
            '& .MuiTabs-indicator': {
              backgroundColor: '#00FFFF',
              height: 3,
              boxShadow: '0 0 5px #00FFFF',
            },
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 'bold',
              '&.Mui-selected': {
                color: '#00FFFF',
              },
            },
          }}
        >
          <Tab label="All" />
          <Tab label="CPU" />
          <Tab label="Memory" />
          <Tab label="I/O" />
        </Tabs>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            {getChartDataForTab().length > 0 ? (
              <Box height={200} width="100%">
                <LineChart
                  series={[
                    {
                      data: getChartDataForTab().map(d => d.value),
                      showMark: false,
                      label: 'Value',
                      color: '#00FFFF',
                    }
                  ]}
                  xAxis={[
                    {
                      data: getChartDataForTab().map(d => d.time),
                      scaleType: 'time',
                    }
                  ]}
                  sx={{
                    '.MuiChartsAxis-tick': {
                      stroke: '#FFFFFF',
                    },
                    '.MuiChartsAxis-tickLabel': {
                      fill: '#FFFFFF',
                      fontSize: '0.75rem',
                    },
                    '.MuiChartsAxis-line': {
                      stroke: '#00FFFF',
                    },
                    '.MuiLineElement-root': {
                      strokeWidth: 2,
                    },
                  }}
                  height={200}
                />
              </Box>
            ) : (
              <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                height={200}
              >
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  No metric data available for this category
                </Typography>
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TableContainer sx={{ maxHeight: 200 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <StyledTableHeaderCell 
                      sortDirection={orderBy === 'name' ? order : false}
                    >
                      <TableSortLabel
                        active={orderBy === 'name'}
                        direction={orderBy === 'name' ? order : 'asc'}
                        onClick={() => handleRequestSort('name')}
                        sx={{
                          color: '#00FFFF',
                          '&.MuiTableSortLabel-active': {
                            color: '#00FFFF',
                          },
                          '& .MuiTableSortLabel-icon': {
                            color: '#00FFFF !important',
                          },
                        }}
                      >
                        Metric
                      </TableSortLabel>
                    </StyledTableHeaderCell>
                    <StyledTableHeaderCell 
                      sortDirection={orderBy === 'value' ? order : false}
                    >
                      <TableSortLabel
                        active={orderBy === 'value'}
                        direction={orderBy === 'value' ? order : 'asc'}
                        onClick={() => handleRequestSort('value')}
                        sx={{
                          color: '#00FFFF',
                          '&.MuiTableSortLabel-active': {
                            color: '#00FFFF',
                          },
                          '& .MuiTableSortLabel-icon': {
                            color: '#00FFFF !important',
                          },
                        }}
                      >
                        Value
                      </TableSortLabel>
                    </StyledTableHeaderCell>
                    <StyledTableHeaderCell 
                      sortDirection={orderBy === 'timestamp' ? order : false}
                    >
                      <TableSortLabel
                        active={orderBy === 'timestamp'}
                        direction={orderBy === 'timestamp' ? order : 'asc'}
                        onClick={() => handleRequestSort('timestamp')}
                        sx={{
                          color: '#00FFFF',
                          '&.MuiTableSortLabel-active': {
                            color: '#00FFFF',
                          },
                          '& .MuiTableSortLabel-icon': {
                            color: '#00FFFF !important',
                          },
                        }}
                      >
                        Time
                      </TableSortLabel>
                    </StyledTableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getMetricsForTab().slice(0, 6).map((metric) => (
                    <TableRow key={metric.id} hover>
                      <StyledTableCell>{metric.name}</StyledTableCell>
                      <StyledTableCell>{metric.value.toFixed(2)}</StyledTableCell>
                      <StyledTableCell>
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </StyledTableCell>
                    </TableRow>
                  ))}
                  {getMetricsForTab().length === 0 && (
                    <TableRow>
                      <StyledTableCell colSpan={3} align="center">
                        No metrics available
                      </StyledTableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </NeonContainer>
      
      {/* Anomalies section */}
      {anomalies.length > 0 && (
        <NeonContainer elevation={3}>
          <Typography variant="h6" sx={{ color: '#FF00FF', fontWeight: 'bold', mb: 2 }}>
            Detected Anomalies
          </Typography>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <StyledTableHeaderCell>Metric</StyledTableHeaderCell>
                  <StyledTableHeaderCell>Actual</StyledTableHeaderCell>
                  <StyledTableHeaderCell>Expected</StyledTableHeaderCell>
                  <StyledTableHeaderCell>Deviation</StyledTableHeaderCell>
                  <StyledTableHeaderCell>Time</StyledTableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {anomalies.map((anomaly) => (
                  <TableRow key={anomaly.id} hover>
                    <StyledTableCell>{anomaly.metricName}</StyledTableCell>
                    <StyledTableCell sx={{ color: '#FF00FF' }}>
                      {anomaly.actualValue.toFixed(2)}
                    </StyledTableCell>
                    <StyledTableCell>
                      {anomaly.expectedValue.toFixed(2)}
                    </StyledTableCell>
                    <StyledTableCell>
                      {((Math.abs(anomaly.actualValue - anomaly.expectedValue) / 
                        anomaly.expectedValue) * 100).toFixed(1)}%
                    </StyledTableCell>
                    <StyledTableCell>
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </StyledTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </NeonContainer>
      )}
    </Box>
  );
};

export default PerformanceAnalysisVisualizer;

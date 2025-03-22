import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Box,
  Grid,
  Paper,
  Slider,
  TextField,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Chip,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CameraIcon from '@mui/icons-material/Camera';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

import { 
  PerformanceProfilerService, 
  PerformanceMetric, 
  ProfilerSnapshot, 
  ResourceUsage,
  ProfilerSettings
} from '../../services/PerformanceProfilerService';
import { MCPServerConnection } from '../../types/MCPServerTypes';

interface PerformanceProfilerProps {
  serverConnection: MCPServerConnection;
}

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profiler-tabpanel-${index}`}
      aria-labelledby={`profiler-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export const PerformanceProfiler: React.FC<PerformanceProfilerProps> = ({ serverConnection }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [snapshots, setSnapshots] = useState<ProfilerSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [compareSnapshot, setCompareSnapshot] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<ProfilerSettings>({
    sampleInterval: 5000,
    maxHistorySize: 720,
    enableCPUProfiling: true,
    enableMemoryProfiling: true,
    enableNetworkProfiling: true,
    enableDiskProfiling: true,
    alertThresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      responseTime: 1000
    }
  });
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage>({
    cpu: {
      usage: 0,
      cores: 4
    },
    memory: {
      used: 0,
      total: 8 * 1024 * 1024 * 1024,
      percentage: 0
    },
    disk: {
      read: 0,
      write: 0,
      usage: 0
    },
    network: {
      bytesIn: 0,
      bytesOut: 0,
      connections: 0
    }
  });
  const [performanceScore, setPerformanceScore] = useState<number>(0);
  const [timeWindow, setTimeWindow] = useState<number>(300000); // 5 minutes
  const [snapshotNotes, setSnapshotNotes] = useState<string>('');
  const [localSettings, setLocalSettings] = useState<ProfilerSettings>({ ...settings });

  const profilerService = useRef(new PerformanceProfilerService());
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  // Setup and cleanup
  useEffect(() => {
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
      profilerService.current.stop();
    };
  }, []);

  // Handle running state
  useEffect(() => {
    if (isRunning) {
      profilerService.current.start(serverConnection, settings);
      
      // Set up periodic updates
      updateInterval.current = setInterval(() => {
        updateData();
      }, 1000); // Update UI every second
    } else {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
        updateInterval.current = null;
      }
      profilerService.current.stop();
    }
  }, [isRunning, serverConnection, settings]);

  // Set local settings when settings change
  useEffect(() => {
    setLocalSettings({ ...settings });
  }, [settings]);

  const updateData = () => {
    // Get metrics for the selected time window
    const filteredMetrics = profilerService.current.getMetrics({
      timeRange: {
        start: Date.now() - timeWindow,
        end: Date.now()
      }
    });
    
    setMetrics(filteredMetrics);
    
    // Update resource usage
    setResourceUsage(profilerService.current.getResourceUsage());
    
    // Update snapshots
    setSnapshots(profilerService.current.getSnapshots());
    
    // Update performance score
    setPerformanceScore(profilerService.current.getPerformanceScore());
  };

  const handleStartProfiling = () => {
    setIsRunning(true);
  };

  const handleStopProfiling = () => {
    setIsRunning(false);
  };

  const handleResetProfiling = () => {
    profilerService.current.resetMetrics();
    setMetrics([]);
    setSnapshots([]);
    setSelectedSnapshot(null);
    setCompareSnapshot(null);
    setPerformanceScore(0);
  };

  const handleTakeSnapshot = () => {
    const snapshot = profilerService.current.takeSnapshot(snapshotNotes);
    setSnapshots([...snapshots, snapshot]);
    setSnapshotNotes('');
  };

  const handleDeleteSnapshot = (id: string) => {
    profilerService.current.deleteSnapshot(id);
    
    if (selectedSnapshot === id) {
      setSelectedSnapshot(null);
    }
    
    if (compareSnapshot === id) {
      setCompareSnapshot(null);
    }
    
    setSnapshots(profilerService.current.getSnapshots());
  };

  const handleExportMetrics = () => {
    const csv = profilerService.current.exportMetricsAsCSV();
    
    // Create a blob and download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-metrics-${serverConnection.name}-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSettingsSave = () => {
    setSettings({ ...localSettings });
    profilerService.current.updateSettings(localSettings);
    setIsSettingsOpen(false);
  };

  const handleSettingsCancel = () => {
    setLocalSettings({ ...settings });
    setIsSettingsOpen(false);
  };

  const handleLocalSettingsChange = (
    field: keyof ProfilerSettings | keyof ProfilerSettings['alertThresholds'],
    value: any,
    isThreshold = false
  ) => {
    if (isThreshold) {
      setLocalSettings({
        ...localSettings,
        alertThresholds: {
          ...localSettings.alertThresholds,
          [field]: value
        }
      });
    } else {
      setLocalSettings({
        ...localSettings,
        [field]: value
      });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getMetricsByCategory = (category: 'cpu' | 'memory' | 'network' | 'disk' | 'response_time'): PerformanceMetric[] => {
    return metrics.filter(metric => metric.category === category);
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'cpu':
        return '#8884d8';
      case 'memory':
        return '#82ca9d';
      case 'network':
        return '#ffc658';
      case 'disk':
        return '#ff8042';
      case 'response_time':
        return '#0088fe';
      default:
        return '#888888';
    }
  };

  const getTrendIcon = (category: string, label: string): JSX.Element => {
    const trend = profilerService.current.getTrend(category, label, timeWindow);
    
    switch (trend) {
      case 'increasing':
        return <ArrowUpwardIcon color="error" fontSize="small" />;
      case 'decreasing':
        return <ArrowDownwardIcon color="success" fontSize="small" />;
      case 'stable':
      default:
        return <RemoveIcon color="action" fontSize="small" />;
    }
  };

  // Generate chart data for the Overview tab
  const generateCPUChartData = () => {
    const cpuMetrics = getMetricsByCategory('cpu');
    
    return cpuMetrics
      .filter(metric => metric.label === 'usage')
      .map(metric => ({
        time: formatTimestamp(metric.timestamp),
        value: metric.value
      }));
  };

  const generateMemoryChartData = () => {
    const memoryMetrics = getMetricsByCategory('memory');
    
    return memoryMetrics
      .filter(metric => metric.label === 'used')
      .map(metric => ({
        time: formatTimestamp(metric.timestamp),
        value: (metric.value / (1024 * 1024 * 1024)) // Convert to GB
      }));
  };
  
  const generateNetworkChartData = () => {
    const networkMetrics = getMetricsByCategory('network');
    const groupedByTimestamp = new Map<number, { time: string, in: number, out: number }>();
    
    // Group metrics by timestamp
    networkMetrics.forEach(metric => {
      const time = formatTimestamp(metric.timestamp);
      const existing = groupedByTimestamp.get(metric.timestamp) || { time, in: 0, out: 0 };
      
      if (metric.label === 'bytesIn') {
        existing.in = metric.value / (1024 * 1024); // Convert to MB
      } else if (metric.label === 'bytesOut') {
        existing.out = metric.value / (1024 * 1024); // Convert to MB
      }
      
      groupedByTimestamp.set(metric.timestamp, existing);
    });
    
    // Convert map to array
    return Array.from(groupedByTimestamp.values());
  };
  
  const generateResponseTimeChartData = () => {
    const responseTimeMetrics = getMetricsByCategory('response_time');
    
    return responseTimeMetrics
      .filter(metric => metric.label === 'average')
      .map(metric => ({
        time: formatTimestamp(metric.timestamp),
        value: metric.value
      }));
  };
  
  // Generate data for the performance score gauge
  const generateScoreData = () => {
    return [
      { name: 'Score', value: performanceScore },
      { name: 'Remaining', value: 100 - performanceScore }
    ];
  };

  // Render functions for different tabs
  const renderOverviewTab = () => {
    return (
      <Grid container spacing={2}>
        {/* Performance Score */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>Performance Score</Typography>
            <Box sx={{ position: 'relative', display: 'inline-flex', my: 2 }}>
              <CircularProgress
                variant="determinate"
                value={performanceScore}
                size={160}
                thickness={5}
                sx={{
                  color: performanceScore > 75 ? 'success.main' : (performanceScore > 50 ? 'warning.main' : 'error.main')
                }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h3" component="div" color="text.secondary">
                  {Math.round(performanceScore)}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              {performanceScore > 75 ? 'Excellent' : 
               (performanceScore > 50 ? 'Good' : 
               (performanceScore > 25 ? 'Fair' : 'Poor'))}
            </Typography>
          </Paper>
        </Grid>
        
        {/* Current Resource Usage */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Current Resource Usage</Typography>
            <Grid container spacing={2}>
              {/* CPU */}
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">CPU Usage</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h5">{resourceUsage.cpu.usage.toFixed(1)}%</Typography>
                  {getTrendIcon('cpu', 'usage')}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {resourceUsage.cpu.cores} Cores
                </Typography>
              </Grid>
              
              {/* Memory */}
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Memory Usage</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h5">{resourceUsage.memory.percentage.toFixed(1)}%</Typography>
                  {getTrendIcon('memory', 'used')}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {formatBytes(resourceUsage.memory.used)} / {formatBytes(resourceUsage.memory.total)}
                </Typography>
              </Grid>
              
              {/* Disk */}
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Disk I/O</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h5">{formatBytes(resourceUsage.disk.read + resourceUsage.disk.write)}/s</Typography>
                  {getTrendIcon('disk', 'read')}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Usage: {resourceUsage.disk.usage.toFixed(1)}%
                </Typography>
              </Grid>
              
              {/* Network */}
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Network</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h5">{formatBytes(resourceUsage.network.bytesIn + resourceUsage.network.bytesOut)}/s</Typography>
                  {getTrendIcon('network', 'bytesIn')}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {resourceUsage.network.connections} Connections
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* CPU Chart */}
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle1" gutterBottom>CPU Usage</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={generateCPUChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} unit="%" />
                <RechartsTooltip />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  name="CPU Usage" 
                  stroke={getCategoryColor('cpu')} 
                  fill={getCategoryColor('cpu')} 
                  fillOpacity={0.3} 
                  unit="%" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Memory Chart */}
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle1" gutterBottom>Memory Usage</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={generateMemoryChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 'dataMax']} unit="GB" />
                <RechartsTooltip />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  name="Memory Usage" 
                  stroke={getCategoryColor('memory')} 
                  fill={getCategoryColor('memory')} 
                  fillOpacity={0.3} 
                  unit="GB" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Network Chart */}
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle1" gutterBottom>Network Traffic</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={generateNetworkChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 'dataMax']} unit="MB/s" />
                <RechartsTooltip />
                <Area 
                  type="monotone" 
                  dataKey="in" 
                  name="Inbound" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3} 
                  unit="MB/s" 
                />
                <Area 
                  type="monotone" 
                  dataKey="out" 
                  name="Outbound" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  fillOpacity={0.3} 
                  unit="MB/s" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Response Time Chart */}
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle1" gutterBottom>Response Time</Typography>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={generateResponseTimeChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 'dataMax']} unit="ms" />
                <RechartsTooltip />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  name="Response Time" 
                  stroke={getCategoryColor('response_time')} 
                  fill={getCategoryColor('response_time')} 
                  fillOpacity={0.3} 
                  unit="ms" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };
  
  const renderSnapshotsTab = () => {
    const snapshot = selectedSnapshot ? profilerService.current.getSnapshot(selectedSnapshot) : null;
    const comparison = selectedSnapshot && compareSnapshot ?
      profilerService.current.compareSnapshots(selectedSnapshot, compareSnapshot) : null;
    
    return (
      <Grid container spacing={2}>
        {/* Snapshot Controls */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Snapshot Notes"
                variant="outlined"
                size="small"
                fullWidth
                value={snapshotNotes}
                onChange={(e) => setSnapshotNotes(e.target.value)}
              />
              <Button
                variant="contained"
                startIcon={<CameraIcon />}
                onClick={handleTakeSnapshot}
                disabled={!isRunning}
              >
                Take Snapshot
              </Button>
            </Stack>
          </Paper>
        </Grid>
        
        {/* Snapshot List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: 500, overflow: 'auto' }}>
            <List>
              {snapshots.length === 0 ? (
                <ListItem>
                  <ListItemText 
                    primary="No snapshots yet"
                    secondary="Use the camera button to take a snapshot of the current state" 
                  />
                </ListItem>
              ) : (
                snapshots.map((snapshot) => (
                  <ListItem
                    key={snapshot.id}
                    selected={selectedSnapshot === snapshot.id}
                    button
                    onClick={() => setSelectedSnapshot(snapshot.id)}
                  >
                    <ListItemText
                      primary={`Snapshot ${formatTimestamp(snapshot.timestamp)}`}
                      secondary={snapshot.notes || 'No notes'}
                    />
                    <ListItemSecondaryAction>
                      {selectedSnapshot === snapshot.id && (
                        <>
                          <Tooltip title="Compare with another snapshot">
                            <IconButton
                              edge="end"
                              aria-label="compare"
                              onClick={() => setCompareSnapshot(compareSnapshot ? null : (snapshots.find(s => s.id !== selectedSnapshot)?.id || null))}
                              color={compareSnapshot ? 'primary' : 'default'}
                            >
                              <CompareArrowsIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Delete snapshot">
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleDeleteSnapshot(snapshot.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>
        
        {/* Snapshot Details */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 500, overflow: 'auto' }}>
            {!snapshot ? (
              <Typography variant="body1" align="center" sx={{ my: 10 }}>
                Select a snapshot to view details
              </Typography>
            ) : (
              <>
                <Typography variant="h6">
                  Snapshot Details - {formatTimestamp(snapshot.timestamp)}
                </Typography>
                {snapshot.notes && (
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Notes: {snapshot.notes}
                  </Typography>
                )}
                
                {compareSnapshot ? (
                  // Comparison view
                  comparison && (
                    <>
                      <Typography variant="subtitle1" gutterBottom>
                        Comparing with: {formatTimestamp(comparison.snapshot2?.timestamp || 0)}
                      </Typography>
                      
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Metric</TableCell>
                              <TableCell>Original Value</TableCell>
                              <TableCell>Compared Value</TableCell>
                              <TableCell>Change</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {comparison.differences.map((diff, index) => (
                              <TableRow key={index}>
                                <TableCell>{diff.category} - {diff.metric}</TableCell>
                                <TableCell>{diff.value1.toFixed(2)}</TableCell>
                                <TableCell>{diff.value2.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={`${diff.percentChange > 0 ? '+' : ''}${diff.percentChange.toFixed(2)}%`}
                                    color={diff.percentChange > 0 ? 'error' : 'success'}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                            {comparison.differences.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} align="center">
                                  No significant differences found
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )
                ) : (
                  // Single snapshot view
                  <>
                    <Grid container spacing={2}>
                      {/* CPU stats */}
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1">CPU Usage</Typography>
                        {snapshot.metrics
                          .filter(m => m.category === 'cpu')
                          .map((metric, index) => (
                            <Box key={index} sx={{ mb: 1 }}>
                              <Typography variant="body2">{metric.label}: {metric.value.toFixed(2)}%</Typography>
                            </Box>
                          ))}
                      </Grid>
                      
                      {/* Memory stats */}
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1">Memory Usage</Typography>
                        {snapshot.metrics
                          .filter(m => m.category === 'memory')
                          .map((metric, index) => (
                            <Box key={index} sx={{ mb: 1 }}>
                              <Typography variant="body2">
                                {metric.label}: {formatBytes(metric.value)}
                              </Typography>
                            </Box>
                          ))}
                      </Grid>
                      
                      {/* Network stats */}
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1">Network Traffic</Typography>
                        {snapshot.metrics
                          .filter(m => m.category === 'network')
                          .map((metric, index) => (
                            <Box key={index} sx={{ mb: 1 }}>
                              <Typography variant="body2">
                                {metric.label}: {formatBytes(metric.value)}/s
                              </Typography>
                            </Box>
                          ))}
                      </Grid>
                      
                      {/* Response time stats */}
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1">Response Time</Typography>
                        {snapshot.metrics
                          .filter(m => m.category === 'response_time')
                          .map((metric, index) => (
                            <Box key={index} sx={{ mb: 1 }}>
                              <Typography variant="body2">
                                {metric.label}: {metric.value.toFixed(2)} ms
                              </Typography>
                            </Box>
                          ))}
                      </Grid>
                    </Grid>
                  </>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    );
  };
  
  const renderSettingsTab = () => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Profiler Settings</Typography>
              <Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSettingsSave}
                  sx={{ mr: 1 }}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloseIcon />}
                  onClick={handleSettingsCancel}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              {/* Sample Interval */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Sample Interval</InputLabel>
                  <Select
                    value={localSettings.sampleInterval}
                    label="Sample Interval"
                    onChange={(e) => handleLocalSettingsChange('sampleInterval', e.target.value)}
                  >
                    <MenuItem value={1000}>1 second</MenuItem>
                    <MenuItem value={2000}>2 seconds</MenuItem>
                    <MenuItem value={5000}>5 seconds</MenuItem>
                    <MenuItem value={10000}>10 seconds</MenuItem>
                    <MenuItem value={30000}>30 seconds</MenuItem>
                    <MenuItem value={60000}>60 seconds</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* History Size */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>History Size</InputLabel>
                  <Select
                    value={localSettings.maxHistorySize}
                    label="History Size"
                    onChange={(e) => handleLocalSettingsChange('maxHistorySize', e.target.value)}
                  >
                    <MenuItem value={60}>1 minute (1s interval)</MenuItem>
                    <MenuItem value={120}>2 minutes (1s interval)</MenuItem>
                    <MenuItem value={600}>10 minutes (1s interval)</MenuItem>
                    <MenuItem value={720}>1 hour (5s interval)</MenuItem>
                    <MenuItem value={1440}>2 hours (5s interval)</MenuItem>
                    <MenuItem value={8640}>12 hours (5s interval)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Profiling Switches */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Enabled Metrics</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.enableCPUProfiling}
                          onChange={(e) => handleLocalSettingsChange('enableCPUProfiling', e.target.checked)}
                        />
                      }
                      label="CPU Usage"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.enableMemoryProfiling}
                          onChange={(e) => handleLocalSettingsChange('enableMemoryProfiling', e.target.checked)}
                        />
                      }
                      label="Memory Usage"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.enableNetworkProfiling}
                          onChange={(e) => handleLocalSettingsChange('enableNetworkProfiling', e.target.checked)}
                        />
                      }
                      label="Network"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.enableDiskProfiling}
                          onChange={(e) => handleLocalSettingsChange('enableDiskProfiling', e.target.checked)}
                        />
                      }
                      label="Disk I/O"
                    />
                  </Grid>
                </Grid>
              </Grid>
              
              {/* Alert Thresholds */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Alert Thresholds</Typography>
                
                <Grid container spacing={2}>
                  {/* CPU Usage Threshold */}
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography gutterBottom>
                        CPU Usage: {localSettings.alertThresholds.cpuUsage}%
                      </Typography>
                      <Slider
                        value={localSettings.alertThresholds.cpuUsage}
                        onChange={(e, newValue) => handleLocalSettingsChange('cpuUsage', newValue, true)}
                        aria-labelledby="cpu-usage-threshold-slider"
                        valueLabelDisplay="auto"
                        step={5}
                        marks
                        min={50}
                        max={95}
                      />
                    </Box>
                  </Grid>
                  
                  {/* Memory Usage Threshold */}
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography gutterBottom>
                        Memory Usage: {localSettings.alertThresholds.memoryUsage}%
                      </Typography>
                      <Slider
                        value={localSettings.alertThresholds.memoryUsage}
                        onChange={(e, newValue) => handleLocalSettingsChange('memoryUsage', newValue, true)}
                        aria-labelledby="memory-usage-threshold-slider"
                        valueLabelDisplay="auto"
                        step={5}
                        marks
                        min={50}
                        max={95}
                      />
                    </Box>
                  </Grid>
                  
                  {/* Response Time Threshold */}
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography gutterBottom>
                        Response Time: {localSettings.alertThresholds.responseTime} ms
                      </Typography>
                      <Slider
                        value={localSettings.alertThresholds.responseTime}
                        onChange={(e, newValue) => handleLocalSettingsChange('responseTime', newValue, true)}
                        aria-labelledby="response-time-threshold-slider"
                        valueLabelDisplay="auto"
                        step={100}
                        marks
                        min={200}
                        max={2000}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              
              {/* Info Box */}
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  Settings will be applied immediately after saving. Changing sample interval or history size may affect performance.
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <Card>
      <CardHeader
        title="Performance Profiler"
        subheader={`Server: ${serverConnection.name}`}
        action={
          <Stack direction="row" spacing={1}>
            {!isRunning ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleStartProfiling}
              >
                Start Profiling
              </Button>
            ) : (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<StopIcon />}
                onClick={handleStopProfiling}
              >
                Stop Profiling
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleResetProfiling}
            >
              Reset
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportMetrics}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            >
              Settings
            </Button>
          </Stack>
        }
      />
      
      <Divider />
      
      <CardContent>
        {isSettingsOpen ? (
          // Settings view
          renderSettingsTab()
        ) : (
          // Normal tabs view
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                aria-label="profiler tabs"
              >
                <Tab label="Overview" id="profiler-tab-0" aria-controls="profiler-tabpanel-0" />
                <Tab label="Snapshots" id="profiler-tab-1" aria-controls="profiler-tabpanel-1" />
              </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
              {renderOverviewTab()}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              {renderSnapshotsTab()}
            </TabPanel>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceProfiler;

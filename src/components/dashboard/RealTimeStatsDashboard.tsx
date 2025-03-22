import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Stack,
  CircularProgress,
  LinearProgress,
  Chip,
  Card,
  CardHeader,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  useTheme
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';

import { useUI } from '../../context/UIContext';

// Mock data interfaces
interface ServerStats {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  uptime: number; // in seconds
  activeConnections: number;
  responseTime: number; // in ms
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  requestsPerMinute: number;
}

interface HistoricalData {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  activeConnections: number;
  requestsPerMinute: number;
}

interface DashboardProps {
  refreshInterval?: number;
}

const RealTimeStatsDashboard: React.FC<DashboardProps> = ({ refreshInterval = 5000 }) => {
  const theme = useTheme();
  const { state, addNotification, triggerUpdate } = useUI();
  
  // State for server statistics
  const [serverStats, setServerStats] = useState<ServerStats[]>([]);
  const [historicalData, setHistoricalData] = useState<{ [serverId: string]: HistoricalData[] }>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  
  // Refs for intervals
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mock function to fetch server statistics
  const fetchServerStats = () => {
    setIsLoading(true);
    setError(null);
    
    // Simulate API call delay
    setTimeout(() => {
      try {
        // Mock data
        const mockStats: ServerStats[] = [
          {
            id: 'server1',
            name: 'Primary MCP Server',
            status: 'online',
            uptime: 43200, // 12 hours
            activeConnections: 24,
            responseTime: 120,
            cpuUsage: 35,
            memoryUsage: 42,
            requestsPerMinute: 250
          },
          {
            id: 'server2',
            name: 'Secondary MCP Server',
            status: 'warning',
            uptime: 86400, // 24 hours
            activeConnections: 12,
            responseTime: 180,
            cpuUsage: 68,
            memoryUsage: 75,
            requestsPerMinute: 120
          },
          {
            id: 'server3',
            name: 'Development MCP Server',
            status: 'online',
            uptime: 7200, // 2 hours
            activeConnections: 3,
            responseTime: 90,
            cpuUsage: 15,
            memoryUsage: 30,
            requestsPerMinute: 45
          }
        ];
        
        // Check for alerts (high CPU, memory usage, etc.)
        mockStats.forEach(server => {
          if (server.cpuUsage > 80 && server.status !== 'error') {
            addNotification({
              message: `High CPU usage on ${server.name}: ${server.cpuUsage}%`,
              severity: 'warning',
              autoClose: true
            });
          }
          
          if (server.memoryUsage > 85 && server.status !== 'error') {
            addNotification({
              message: `High memory usage on ${server.name}: ${server.memoryUsage}%`,
              severity: 'warning',
              autoClose: true
            });
          }
          
          if (server.responseTime > 500 && server.status !== 'error') {
            addNotification({
              message: `Slow response time on ${server.name}: ${server.responseTime}ms`,
              severity: 'warning',
              autoClose: true
            });
          }
          
          if (server.status === 'error') {
            addNotification({
              message: `Server error on ${server.name}`,
              severity: 'error',
              autoClose: true
            });
          }
        });
        
        setServerStats(mockStats);
        
        // Set selected server if not already set
        if (!selectedServer && mockStats.length > 0) {
          setSelectedServer(mockStats[0].id);
        }
        
        // Update historical data
        const now = Date.now();
        const newHistoricalData = { ...historicalData };
        
        mockStats.forEach(server => {
          const serverHistory = newHistoricalData[server.id] || [];
          
          // Add some randomness to simulate real-time changes
          const newDataPoint: HistoricalData = {
            timestamp: now,
            cpuUsage: server.cpuUsage + (Math.random() * 10 - 5),
            memoryUsage: server.memoryUsage + (Math.random() * 6 - 3),
            responseTime: server.responseTime + (Math.random() * 20 - 10),
            activeConnections: server.activeConnections,
            requestsPerMinute: server.requestsPerMinute + (Math.random() * 30 - 15)
          };
          
          // Keep only the last 20 data points
          const updatedHistory = [...serverHistory, newDataPoint].slice(-20);
          newHistoricalData[server.id] = updatedHistory;
        });
        
        setHistoricalData(newHistoricalData);
        setIsLoading(false);
        
        // Trigger UI update
        triggerUpdate();
      } catch (err) {
        setError('Failed to fetch server statistics');
        setIsLoading(false);
        console.error('Error fetching server stats:', err);
        
        addNotification({
          message: 'Failed to fetch server statistics',
          severity: 'error',
          autoClose: true
        });
      }
    }, 1000); // Simulate 1 second delay
  };
  
  // Initialize and handle refresh interval
  useEffect(() => {
    // Initial fetch
    fetchServerStats();
    
    // Set up interval for regular updates
    refreshIntervalRef.current = setInterval(fetchServerStats, refreshInterval);
    
    // Clean up on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshInterval]);
  
  // Update interval when refresh rate changes
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    refreshIntervalRef.current = setInterval(fetchServerStats, state.refreshRate);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [state.refreshRate]);
  
  // Handle menu open/close
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  // Handle server selection
  const handleSelectServer = (serverId: string) => {
    setSelectedServer(serverId);
    handleMenuClose();
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchServerStats();
  };
  
  // Handle fullscreen toggle
  const handleFullscreenToggle = () => {
    setFullscreen(!fullscreen);
  };
  
  // Format uptime duration
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };
  
  // Get status icon and color
  const getStatusInfo = (status: ServerStats['status']) => {
    switch (status) {
      case 'online':
        return { icon: <CheckCircleIcon />, color: 'success.main', label: 'Online' };
      case 'offline':
        return { icon: <ErrorIcon />, color: 'error.main', label: 'Offline' };
      case 'warning':
        return { icon: <WarningIcon />, color: 'warning.main', label: 'Warning' };
      case 'error':
        return { icon: <ErrorIcon />, color: 'error.main', label: 'Error' };
      default:
        return { icon: <ErrorIcon />, color: 'text.disabled', label: 'Unknown' };
    }
  };
  
  // Get trend icon and direction
  const getTrendInfo = (current: number, previous: number) => {
    if (current > previous) {
      return { icon: <TrendingUpIcon />, color: 'error.main', direction: 'up' };
    } else if (current < previous) {
      return { icon: <TrendingDownIcon />, color: 'success.main', direction: 'down' };
    } else {
      return { icon: null, color: 'text.secondary', direction: 'stable' };
    }
  };
  
  // Calculate trend based on historical data
  const calculateTrend = (serverId: string, metric: keyof HistoricalData) => {
    const serverHistory = historicalData[serverId] || [];
    
    if (serverHistory.length < 2) {
      return { icon: null, color: 'text.secondary', direction: 'stable' };
    }
    
    const current = serverHistory[serverHistory.length - 1][metric];
    const previous = serverHistory[serverHistory.length - 2][metric];
    
    return getTrendInfo(current, previous);
  };
  
  // Selected server data
  const selectedServerData = serverStats.find(server => server.id === selectedServer);
  const selectedServerHistory = selectedServer ? historicalData[selectedServer] || [] : [];
  
  // Chart colors
  const chartColors = {
    cpu: theme.palette.primary.main,
    memory: theme.palette.secondary.main,
    responseTime: theme.palette.error.main,
    connections: theme.palette.success.main,
    requests: theme.palette.warning.main
  };
  
  // Status distribution data for pie chart
  const statusDistribution = [
    { name: 'Online', value: serverStats.filter(s => s.status === 'online').length, color: theme.palette.success.main },
    { name: 'Warning', value: serverStats.filter(s => s.status === 'warning').length, color: theme.palette.warning.main },
    { name: 'Error', value: serverStats.filter(s => s.status === 'error').length, color: theme.palette.error.main },
    { name: 'Offline', value: serverStats.filter(s => s.status === 'offline').length, color: theme.palette.text.disabled }
  ].filter(item => item.value > 0);
  
  return (
    <Box sx={{ p: 2, flexGrow: 1, ...(fullscreen && { 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      zIndex: 1300,
      bgcolor: 'background.paper',
      overflow: 'auto' 
    }) }}>
      {/* Dashboard header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Real-Time MCP Server Statistics</Typography>
        
        <Box>
          <IconButton onClick={handleRefresh} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
          
          <IconButton onClick={handleFullscreenToggle}>
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Box>
      </Box>
      
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      
      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.lighter' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
      
      <Grid container spacing={2}>
        {/* Server selector */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="MCP Servers"
              action={
                <IconButton onClick={handleMenuOpen}>
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
            >
              {serverStats.map(server => (
                <MenuItem
                  key={server.id}
                  onClick={() => handleSelectServer(server.id)}
                  selected={selectedServer === server.id}
                >
                  {server.name}
                </MenuItem>
              ))}
            </Menu>
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                {serverStats.map(server => {
                  const statusInfo = getStatusInfo(server.status);
                  
                  return (
                    <Paper
                      key={server.id}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderLeft: 4,
                        borderColor: statusInfo.color,
                        bgcolor: selectedServer === server.id ? 'action.selected' : 'background.paper'
                      }}
                      onClick={() => setSelectedServer(server.id)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1">{server.name}</Typography>
                        <Chip
                          icon={statusInfo.icon}
                          label={statusInfo.label}
                          size="small"
                          sx={{ color: statusInfo.color }}
                        />
                      </Box>
                      
                      <Box sx={{ mt: 1 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              CPU: {server.cpuUsage.toFixed(1)}%
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Memory: {server.memoryUsage.toFixed(1)}%
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Response: {server.responseTime}ms
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Uptime: {formatUptime(server.uptime)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Server details */}
        <Grid item xs={12} md={8}>
          {selectedServerData ? (
            <Card>
              <CardHeader
                title={`${selectedServerData.name} Details`}
                subheader={`Status: ${getStatusInfo(selectedServerData.status).label}`}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  {/* Resource usage gauges */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">CPU Usage</Typography>
                      <Box sx={{ position: 'relative', display: 'inline-flex', my: 1 }}>
                        <CircularProgress
                          variant="determinate"
                          value={selectedServerData.cpuUsage}
                          size={80}
                          thickness={8}
                          sx={{
                            color: selectedServerData.cpuUsage > 80 ? 'error.main' : 
                                  selectedServerData.cpuUsage > 60 ? 'warning.main' : 'success.main'
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
                          <Typography variant="h6" component="div">
                            {selectedServerData.cpuUsage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {calculateTrend(selectedServerData.id, 'cpuUsage').icon}
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Memory Usage</Typography>
                      <Box sx={{ position: 'relative', display: 'inline-flex', my: 1 }}>
                        <CircularProgress
                          variant="determinate"
                          value={selectedServerData.memoryUsage}
                          size={80}
                          thickness={8}
                          sx={{
                            color: selectedServerData.memoryUsage > 80 ? 'error.main' : 
                                  selectedServerData.memoryUsage > 60 ? 'warning.main' : 'success.main'
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
                          <Typography variant="h6" component="div">
                            {selectedServerData.memoryUsage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {calculateTrend(selectedServerData.id, 'memoryUsage').icon}
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Response Time</Typography>
                      <Typography variant="h4" sx={{ my: 1 }}>{selectedServerData.responseTime}ms</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {calculateTrend(selectedServerData.id, 'responseTime').icon}
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Requests/Min</Typography>
                      <Typography variant="h4" sx={{ my: 1 }}>{Math.round(selectedServerData.requestsPerMinute)}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {calculateTrend(selectedServerData.id, 'requestsPerMinute').icon}
                      </Box>
                    </Paper>
                  </Grid>
                  
                  {/* Historical charts */}
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>Resource Usage Trend</Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={selectedServerHistory}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="timestamp"
                              tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} 
                            />
                            <YAxis />
                            <Tooltip
                              labelFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                              formatter={(value, name) => {
                                switch (name) {
                                  case 'cpuUsage':
                                    return [`${value.toFixed(1)}%`, 'CPU Usage'];
                                  case 'memoryUsage':
                                    return [`${value.toFixed(1)}%`, 'Memory Usage'];
                                  default:
                                    return [value, name];
                                }
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="cpuUsage" 
                              name="CPU Usage" 
                              stroke={chartColors.cpu} 
                              activeDot={{ r: 8 }} 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="memoryUsage" 
                              name="Memory Usage" 
                              stroke={chartColors.memory} 
                            />
                            <ReferenceLine y={80} stroke="red" strokeDasharray="3 3" />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>Response Time Trend</Typography>
                      <Box sx={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={selectedServerHistory}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="timestamp"
                              tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} 
                            />
                            <YAxis />
                            <Tooltip
                              labelFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                              formatter={(value, name) => {
                                if (name === 'responseTime') {
                                  return [`${value.toFixed(1)} ms`, 'Response Time'];
                                }
                                return [value, name];
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="responseTime" 
                              name="Response Time" 
                              stroke={chartColors.responseTime} 
                              activeDot={{ r: 8 }} 
                            />
                            <ReferenceLine y={500} stroke="red" strokeDasharray="3 3" />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>Traffic Trend</Typography>
                      <Box sx={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={selectedServerHistory}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="timestamp"
                              tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} 
                            />
                            <YAxis />
                            <Tooltip
                              labelFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                              formatter={(value, name) => {
                                if (name === 'requestsPerMinute') {
                                  return [`${Math.round(value)}`, 'Requests/Min'];
                                } else if (name === 'activeConnections') {
                                  return [`${value}`, 'Active Connections'];
                                }
                                return [value, name];
                              }}
                            />
                            <Legend />
                            <Bar 
                              dataKey="requestsPerMinute" 
                              name="Requests/Min" 
                              fill={chartColors.requests} 
                            />
                            <Bar 
                              dataKey="activeConnections" 
                              name="Active Connections" 
                              fill={chartColors.connections} 
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ) : (
            <Paper sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Select a server to view details
              </Typography>
            </Paper>
          )}
        </Grid>
        
        {/* Overall Status */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Overall System Status" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                {/* Status distribution */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom align="center">Server Status Distribution</Typography>
                    <Box sx={{ height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
                
                {/* Key metrics comparison */}
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Server Comparison</Typography>
                    <Box sx={{ height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={serverStats}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'cpuUsage' || name === 'memoryUsage') {
                                return [`${value}%`, name === 'cpuUsage' ? 'CPU Usage' : 'Memory Usage'];
                              }
                              if (name === 'responseTime') {
                                return [`${value} ms`, 'Response Time'];
                              }
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="cpuUsage" name="CPU Usage" fill={chartColors.cpu} />
                          <Bar dataKey="memoryUsage" name="Memory Usage" fill={chartColors.memory} />
                          <Bar dataKey="responseTime" name="Response Time" fill={chartColors.responseTime} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RealTimeStatsDashboard;

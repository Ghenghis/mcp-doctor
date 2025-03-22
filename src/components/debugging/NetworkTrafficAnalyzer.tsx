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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';

import { NetworkTrafficAnalyzerService, NetworkPacket, NetworkStatistics } from '../../services/NetworkTrafficAnalyzerService';
import { MCPServerConnection } from '../../types/MCPServerTypes';

interface NetworkTrafficAnalyzerProps {
  serverConnection: MCPServerConnection;
}

export const NetworkTrafficAnalyzer: React.FC<NetworkTrafficAnalyzerProps> = ({ serverConnection }) => {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [packets, setPackets] = useState<NetworkPacket[]>([]);
  const [statistics, setStatistics] = useState<NetworkStatistics>({
    totalRequests: 0,
    totalErrors: 0,
    averageResponseTime: 0,
    requestsPerSecond: 0,
    bytesTransferred: 0
  });
  const [selectedPacket, setSelectedPacket] = useState<NetworkPacket | null>(null);
  const [timeWindow, setTimeWindow] = useState<number>(60000); // 1 minute by default
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterErrors, setFilterErrors] = useState<boolean | null>(null);

  const analyzerService = useRef(new NetworkTrafficAnalyzerService());
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  // Setup and cleanup
  useEffect(() => {
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
      analyzerService.current.stopCapture();
    };
  }, []);

  // Handle capturing state
  useEffect(() => {
    if (isCapturing) {
      analyzerService.current.startCapture(serverConnection);
      
      // Set up periodic updates
      updateInterval.current = setInterval(() => {
        updateData();
      }, 1000); // Update every second
    } else {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
        updateInterval.current = null;
      }
      analyzerService.current.stopCapture();
    }
  }, [isCapturing, serverConnection]);

  const updateData = () => {
    // Apply filters
    const filter: any = {};
    
    if (filterDirection !== 'all') {
      filter.direction = filterDirection;
    }
    
    if (filterType !== 'all') {
      filter.type = filterType;
    }
    
    if (filterErrors !== null) {
      filter.hasError = filterErrors;
    }
    
    // Get filtered packets
    const filteredPackets = analyzerService.current.getPackets(filter);
    setPackets(filteredPackets);
    
    // Update statistics
    setStatistics(analyzerService.current.getStatistics(timeWindow));
  };

  const handleStartCapture = () => {
    setIsCapturing(true);
  };

  const handleStopCapture = () => {
    setIsCapturing(false);
  };

  const handleResetCapture = () => {
    analyzerService.current.resetCapture();
    setPackets([]);
    setStatistics({
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      bytesTransferred: 0
    });
    setSelectedPacket(null);
  };

  const handleExportCapture = (format: 'json' | 'har') => {
    try {
      const exportData = analyzerService.current.exportCapture(format);
      
      // Create a blob and download
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `network-capture.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      // Could show an error message to the user here
    }
  };

  const handlePacketSelect = (packet: NetworkPacket) => {
    setSelectedPacket(packet);
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

  // Generate chart data
  const generateTrafficChartData = () => {
    // This would calculate traffic over time
    // For now, returning sample data
    return [
      { time: '00:00', inbound: 2.4, outbound: 1.8 },
      { time: '00:05', inbound: 3.2, outbound: 2.1 },
      { time: '00:10', inbound: 5.6, outbound: 3.3 },
      { time: '00:15', inbound: 4.2, outbound: 2.5 },
      { time: '00:20', inbound: 6.8, outbound: 3.9 },
    ];
  };

  const generateStatusCodeDistribution = () => {
    // This would calculate actual status code distribution
    // For now, returning sample data
    return [
      { status: '200', count: 45 },
      { status: '201', count: 12 },
      { status: '204', count: 5 },
      { status: '400', count: 3 },
      { status: '404', count: 2 },
      { status: '500', count: 1 },
    ];
  };

  return (
    <Card>
      <CardHeader 
        title="Network Traffic Analyzer" 
        subheader={`Server: ${serverConnection.name}`}
        action={
          <Stack direction="row" spacing={1}>
            {!isCapturing ? (
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<PlayArrowIcon />}
                onClick={handleStartCapture}
              >
                Start Capture
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="secondary" 
                startIcon={<StopIcon />}
                onClick={handleStopCapture}
              >
                Stop Capture
              </Button>
            )}
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<DeleteIcon />}
              onClick={handleResetCapture}
            >
              Reset
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExportCapture('json')}
            >
              Export
            </Button>
          </Stack>
        }
      />
      <Divider />
      <CardContent>
        <Grid container spacing={2}>
          {/* Statistics Cards */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Paper sx={{ p: 2, flexGrow: 1, textAlign: 'center' }}>
                <Typography variant="h6">{statistics.totalRequests}</Typography>
                <Typography variant="body2" color="textSecondary">Total Requests</Typography>
              </Paper>
              <Paper sx={{ p: 2, flexGrow: 1, textAlign: 'center' }}>
                <Typography variant="h6">{statistics.totalErrors}</Typography>
                <Typography variant="body2" color="textSecondary">Errors</Typography>
              </Paper>
              <Paper sx={{ p: 2, flexGrow: 1, textAlign: 'center' }}>
                <Typography variant="h6">{statistics.requestsPerSecond.toFixed(2)}/s</Typography>
                <Typography variant="body2" color="textSecondary">Request Rate</Typography>
              </Paper>
              <Paper sx={{ p: 2, flexGrow: 1, textAlign: 'center' }}>
                <Typography variant="h6">{formatBytes(statistics.bytesTransferred)}</Typography>
                <Typography variant="body2" color="textSecondary">Data Transferred</Typography>
              </Paper>
              <Paper sx={{ p: 2, flexGrow: 1, textAlign: 'center' }}>
                <Typography variant="h6">{statistics.averageResponseTime.toFixed(2)}ms</Typography>
                <Typography variant="body2" color="textSecondary">Avg Response Time</Typography>
              </Paper>
            </Stack>
          </Grid>

          {/* Traffic Charts */}
          <Grid item xs={8}>
            <Paper sx={{ p: 2, height: 300 }}>
              <Typography variant="subtitle1" gutterBottom>Network Traffic Over Time</Typography>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={generateTrafficChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="inbound" stroke="#8884d8" name="Inbound" />
                  <Line type="monotone" dataKey="outbound" stroke="#82ca9d" name="Outbound" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={4}>
            <Paper sx={{ p: 2, height: 300 }}>
              <Typography variant="subtitle1" gutterBottom>Status Code Distribution</Typography>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={generateStatusCodeDistribution()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="Count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Filters */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <FilterListIcon color="action" />
                <Typography variant="subtitle1">Filters:</Typography>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Direction</InputLabel>
                  <Select
                    value={filterDirection}
                    label="Direction"
                    onChange={(e) => setFilterDirection(e.target.value as any)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="inbound">Inbound</MenuItem>
                    <MenuItem value="outbound">Outbound</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filterType}
                    label="Type"
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="request">Request</MenuItem>
                    <MenuItem value="response">Response</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterErrors === null ? 'all' : (filterErrors ? 'error' : 'success')}
                    label="Status"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilterErrors(value === 'all' ? null : value === 'error');
                    }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="success">Success</MenuItem>
                    <MenuItem value="error">Error</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Time Window</InputLabel>
                  <Select
                    value={timeWindow}
                    label="Time Window"
                    onChange={(e) => setTimeWindow(Number(e.target.value))}
                  >
                    <MenuItem value={30000}>30 seconds</MenuItem>
                    <MenuItem value={60000}>1 minute</MenuItem>
                    <MenuItem value={300000}>5 minutes</MenuItem>
                    <MenuItem value={900000}>15 minutes</MenuItem>
                    <MenuItem value={1800000}>30 minutes</MenuItem>
                    <MenuItem value={3600000}>1 hour</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Paper>
          </Grid>

          {/* Packet List */}
          <Grid item xs={6}>
            <Paper sx={{ height: 400, overflow: 'auto' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Direction</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {packets.map((packet, index) => (
                      <TableRow 
                        key={index}
                        onClick={() => handlePacketSelect(packet)}
                        selected={selectedPacket === packet}
                        hover
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{formatTimestamp(packet.timestamp)}</TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={packet.direction} 
                            color={packet.direction === 'outbound' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>{packet.type}</TableCell>
                        <TableCell>{formatBytes(packet.size)}</TableCell>
                        <TableCell>
                          {packet.statusCode && (
                            <Chip 
                              size="small" 
                              label={packet.statusCode}
                              color={packet.statusCode >= 400 ? 'error' : 'success'}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {packets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                            {isCapturing ? 'Waiting for network activity...' : 'Start capturing to see network packets'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Packet Details */}
          <Grid item xs={6}>
            <Paper sx={{ p: 2, height: 400, overflow: 'auto' }}>
              <Typography variant="subtitle1" gutterBottom>Packet Details</Typography>
              {selectedPacket ? (
                <Box>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Time:</Typography>
                      <Typography variant="body1">{formatTimestamp(selectedPacket.timestamp)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Direction:</Typography>
                      <Typography variant="body1">{selectedPacket.direction}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Type:</Typography>
                      <Typography variant="body1">{selectedPacket.type}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Size:</Typography>
                      <Typography variant="body1">{formatBytes(selectedPacket.size)}</Typography>
                    </Grid>
                    {selectedPacket.statusCode && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Status Code:</Typography>
                        <Typography variant="body1">{selectedPacket.statusCode}</Typography>
                      </Grid>
                    )}
                  </Grid>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 2, mb: 1 }}>Content:</Typography>
                  <Box 
                    sx={{ 
                      p: 1, 
                      backgroundColor: 'background.default',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: 200,
                      overflow: 'auto'
                    }}
                  >
                    {JSON.stringify(selectedPacket.content, null, 2)}
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90%' }}>
                  Select a packet to see details
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default NetworkTrafficAnalyzer;

/**
 * MaintenanceDashboard.tsx
 * 
 * A dashboard component that integrates all predictive maintenance visualization components:
 * - LogAnalysisVisualizer
 * - PerformanceAnalysisVisualizer
 * - AlertViewer
 * 
 * This provides a comprehensive view of system health with a neon wireframe UI style.
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Tab,
  Tabs,
  Grid,
  IconButton,
  Button,
  Tooltip,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Import visualization components
import LogAnalysisVisualizer from '../logs/LogAnalysisVisualizer';
import PerformanceAnalysisVisualizer from '../performance/PerformanceAnalysisVisualizer';
import AlertViewer from '../alerts/AlertViewer';

// Import types
import { 
  LogAnalysisResult, 
  PerformanceMetric, 
  PerformanceAnomaly,
  PredictiveAlert
} from '../../services/maintenance/models/types';

// Import service
import { PredictiveMaintenanceService } from '../../services/maintenance/PredictiveMaintenanceService';

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

const NeonButton = styled(Button)(({ theme }) => ({
  color: '#00FFFF',
  borderColor: '#00FFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  '&:hover': {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderColor: '#00FFFF',
    boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
  }
}));

interface MaintenanceDashboardProps {
  maintenanceService: PredictiveMaintenanceService;
}

const MaintenanceDashboard: React.FC<MaintenanceDashboardProps> = ({ 
  maintenanceService 
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // Expanded state for sections
  const [alertsExpanded, setAlertsExpanded] = useState<boolean>(true);
  const [logsExpanded, setLogsExpanded] = useState<boolean>(true);
  const [performanceExpanded, setPerformanceExpanded] = useState<boolean>(true);
  
  // Data states
  const [logAnalysisResult, setLogAnalysisResult] = useState<LogAnalysisResult | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [performanceAnomalies, setPerformanceAnomalies] = useState<PerformanceAnomaly[]>([]);
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Load data from service
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get data from service
      const analysisResult = await maintenanceService.getLatestLogAnalysisResult();
      const metrics = await maintenanceService.getPerformanceMetrics();
      const anomalies = await maintenanceService.getPerformanceAnomalies();
      const activeAlerts = await maintenanceService.getActiveAlerts();
      
      // Update state
      setLogAnalysisResult(analysisResult);
      setPerformanceMetrics(metrics);
      setPerformanceAnomalies(anomalies);
      setAlerts(activeAlerts);
    } catch (err) {
      setError('Failed to load maintenance data: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle alert actions
  const handleAcknowledgeAlert = (alertId: string) => {
    maintenanceService.acknowledgeAlert(alertId);
    // Update alerts
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: !alert.acknowledged } 
        : alert
    ));
  };
  
  const handleSnoozeAlert = (alertId: string) => {
    maintenanceService.snoozeAlert(alertId);
    // Update alerts
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, snoozed: !alert.snoozed } 
        : alert
    ));
  };
  
  const handleDismissAlert = (alertId: string) => {
    maintenanceService.dismissAlert(alertId);
    // Remove alert from list
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };
  
  // Load data on mount
  useEffect(() => {
    loadData();
    
    // Set up event listeners for real-time updates
    const alertHandler = (alert: PredictiveAlert) => {
      setAlerts(prevAlerts => [...prevAlerts, alert]);
    };
    
    const metricHandler = (metric: PerformanceMetric) => {
      setPerformanceMetrics(prevMetrics => [...prevMetrics, metric]);
    };
    
    const anomalyHandler = (anomaly: PerformanceAnomaly) => {
      setPerformanceAnomalies(prevAnomalies => [...prevAnomalies, anomaly]);
    };
    
    const analysisHandler = (result: LogAnalysisResult) => {
      setLogAnalysisResult(result);
    };
    
    // Subscribe to events
    maintenanceService.on('alertCreated', alertHandler);
    maintenanceService.on('metricRecorded', metricHandler);
    maintenanceService.on('anomalyDetected', anomalyHandler);
    maintenanceService.on('logAnalysisCompleted', analysisHandler);
    
    // Cleanup on unmount
    return () => {
      maintenanceService.off('alertCreated', alertHandler);
      maintenanceService.off('metricRecorded', metricHandler);
      maintenanceService.off('anomalyDetected', anomalyHandler);
      maintenanceService.off('logAnalysisCompleted', analysisHandler);
    };
  }, [maintenanceService]);
  
  // Determine critical status
  const hasCriticalAlerts = alerts.some(alert => 
    alert.severity === 'critical' && !alert.acknowledged
  );
  
  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#111' }}>
      {/* Header with tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" px={2} pt={1}>
          <Typography variant="h5" sx={{ color: '#00FFFF', fontWeight: 'bold' }}>
            Predictive Maintenance
            {hasCriticalAlerts && (
              <WarningAmberIcon 
                sx={{ 
                  color: '#FF00FF', 
                  ml: 1, 
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                    '100%': { opacity: 1 }
                  }
                }} 
              />
            )}
          </Typography>
          <Box>
            <Tooltip title="Refresh data">
              <IconButton 
                size="small" 
                onClick={loadData}
                disabled={isLoading}
                sx={{ 
                  color: '#00FFFF',
                  '&:hover': { 
                    color: '#00FFFF',
                    backgroundColor: 'rgba(0, 255, 255, 0.1)'
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton 
                size="small"
                sx={{ 
                  color: '#00FFFF',
                  '&:hover': { 
                    color: '#00FFFF',
                    backgroundColor: 'rgba(0, 255, 255, 0.1)'
                  }
                }}
              >
                <TuneIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
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
          <Tab label="Dashboard" />
          <Tab label="Logs" />
          <Tab label="Performance" />
          <Tab label="Alerts" />
        </Tabs>
      </Box>
      
      {/* Content */}
      <Box p={2}>
        {error && (
          <NeonContainer elevation={3} sx={{ mb: 2, borderColor: '#FF5555' }}>
            <Typography sx={{ color: '#FF5555' }}>
              {error}
            </Typography>
          </NeonContainer>
        )}
        
        {activeTab === 0 && (
          // Dashboard tab - shows all components in a grid
          <Grid container spacing={3}>
            {/* Active Alerts Section */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
                  Active Alerts
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setAlertsExpanded(!alertsExpanded)}
                  sx={{ color: '#00FFFF' }}
                >
                  {alertsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              
              {alertsExpanded && (
                <Box sx={{ height: alerts.length > 0 ? 'auto' : '100px' }}>
                  {alerts.length > 0 ? (
                    <AlertViewer 
                      alerts={alerts}
                      onAcknowledge={handleAcknowledgeAlert}
                      onSnooze={handleSnoozeAlert}
                      onDismiss={handleDismissAlert}
                    />
                  ) : (
                    <NeonContainer 
                      elevation={3} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        height: '100%'
                      }}
                    >
                      <Typography variant="body1" sx={{ color: '#00FF00' }}>
                        No active alerts - System running normally
                      </Typography>
                    </NeonContainer>
                  )}
                </Box>
              )}
            </Grid>
            
            {/* Log Analysis Section */}
            <Grid item xs={12} md={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
                  Log Analysis
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setLogsExpanded(!logsExpanded)}
                  sx={{ color: '#00FFFF' }}
                >
                  {logsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              
              {logsExpanded && (
                <Box sx={{ height: logAnalysisResult ? 'auto' : '200px' }}>
                  {logAnalysisResult ? (
                    <LogAnalysisVisualizer analysisResult={logAnalysisResult} />
                  ) : (
                    <NeonContainer 
                      elevation={3} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        height: '100%'
                      }}
                    >
                      <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {isLoading ? 'Loading log analysis...' : 'No log analysis data available'}
                      </Typography>
                    </NeonContainer>
                  )}
                </Box>
              )}
            </Grid>
            
            {/* Performance Metrics Section */}
            <Grid item xs={12} md={6}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
                  Performance Metrics
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setPerformanceExpanded(!performanceExpanded)}
                  sx={{ color: '#00FFFF' }}
                >
                  {performanceExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              
              {performanceExpanded && (
                <Box sx={{ height: performanceMetrics.length > 0 ? 'auto' : '200px' }}>
                  {performanceMetrics.length > 0 ? (
                    <PerformanceAnalysisVisualizer 
                      metrics={performanceMetrics}
                      anomalies={performanceAnomalies}
                    />
                  ) : (
                    <NeonContainer 
                      elevation={3} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        height: '100%'
                      }}
                    >
                      <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {isLoading ? 'Loading performance data...' : 'No performance data available'}
                      </Typography>
                    </NeonContainer>
                  )}
                </Box>
              )}
            </Grid>
            
            {/* Actions Section */}
            <Grid item xs={12}>
              <NeonContainer elevation={3}>
                <Typography variant="subtitle1" sx={{ color: '#00FFFF', mb: 2 }}>
                  Maintenance Actions
                </Typography>
                
                <Box display="flex" gap={2} flexWrap="wrap">
                  <NeonButton variant="outlined" size="small">
                    Analyze Logs
                  </NeonButton>
                  <NeonButton variant="outlined" size="small">
                    Check Server Health
                  </NeonButton>
                  <NeonButton variant="outlined" size="small">
                    Run Diagnostics
                  </NeonButton>
                  <NeonButton variant="outlined" size="small">
                    Export Report
                  </NeonButton>
                </Box>
              </NeonContainer>
            </Grid>
          </Grid>
        )}
        
        {activeTab === 1 && (
          // Logs tab - dedicated view for log analysis
          <Box>
            {logAnalysisResult ? (
              <LogAnalysisVisualizer analysisResult={logAnalysisResult} />
            ) : (
              <NeonContainer 
                elevation={3} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: 300
                }}
              >
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {isLoading ? 'Loading log analysis...' : 'No log analysis data available'}
                </Typography>
              </NeonContainer>
            )}
          </Box>
        )}
        
        {activeTab === 2 && (
          // Performance tab - dedicated view for performance metrics
          <Box>
            {performanceMetrics.length > 0 ? (
              <PerformanceAnalysisVisualizer 
                metrics={performanceMetrics}
                anomalies={performanceAnomalies}
              />
            ) : (
              <NeonContainer 
                elevation={3} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: 300
                }}
              >
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {isLoading ? 'Loading performance data...' : 'No performance data available'}
                </Typography>
              </NeonContainer>
            )}
          </Box>
        )}
        
        {activeTab === 3 && (
          // Alerts tab - dedicated view for alerts
          <Box>
            {alerts.length > 0 ? (
              <AlertViewer 
                alerts={alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onSnooze={handleSnoozeAlert}
                onDismiss={handleDismissAlert}
              />
            ) : (
              <NeonContainer 
                elevation={3} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: 300
                }}
              >
                <Typography variant="body1" sx={{ color: '#00FF00' }}>
                  No active alerts - System running normally
                </Typography>
              </NeonContainer>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MaintenanceDashboard;

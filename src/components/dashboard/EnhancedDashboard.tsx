import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Tabs, 
  Tab, 
  Button, 
  IconButton, 
  Menu, 
  MenuItem, 
  Tooltip, 
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';

// Import visualization components
import HeatMapDisplay, { HeatMapDataPoint } from '../visualization/HeatMapDisplay';
import NetworkGraph, { GraphData } from '../visualization/NetworkGraph';
import { visualizationService, MetricGroup } from '../../services/visualization/VisualizationService';
import { useUI } from '../../context/UIContext';

// Import theme components
import ThemeSettingsPanel from '../ui/ThemeSettingsPanel';

// Reuse existing components
import RealTimeStatsDashboard from './RealTimeStatsDashboard';
import MaintenanceDashboard from './MaintenanceDashboard';
import LogAnalysisVisualizer from '../logs/LogAnalysisVisualizer';
import AlertViewer from '../alerts/AlertViewer';

// Import mock service for demo data
import { PredictiveMaintenanceService } from '../../services/maintenance/PredictiveMaintenanceService';

// Styled components for neon wireframe appearance
const NeonContainer = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  borderRadius: 8,
  border: '1px solid #00FFFF',
  boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
  padding: theme.spacing(2),
  margin: theme.spacing(1, 0),
  height: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
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

// Dashboard layout types
interface DashboardLayout {
  id: string;
  name: string;
  panels: Array<{
    id: string;
    title: string;
    type: 'network' | 'heatmap' | 'stats' | 'logs' | 'alerts' | 'maintenance';
    gridPos: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    options?: Record<string, any>;
  }>;
}

// Define available layouts
const availableLayouts: DashboardLayout[] = [
  {
    id: 'system-overview',
    name: 'System Overview',
    panels: [
      {
        id: 'server-stats',
        title: 'Server Statistics',
        type: 'stats',
        gridPos: { x: 0, y: 0, w: 12, h: 6 }
      },
      {
        id: 'server-network',
        title: 'Server Topology',
        type: 'network',
        gridPos: { x: 0, y: 6, w: 6, h: 6 }
      },
      {
        id: 'alerts',
        title: 'Active Alerts',
        type: 'alerts',
        gridPos: { x: 6, y: 6, w: 6, h: 6 }
      }
    ]
  },
  {
    id: 'maintenance',
    name: 'Predictive Maintenance',
    panels: [
      {
        id: 'maintenance-dashboard',
        title: 'Maintenance Dashboard',
        type: 'maintenance',
        gridPos: { x: 0, y: 0, w: 12, h: 6 }
      },
      {
        id: 'log-patterns',
        title: 'Log Pattern Distribution',
        type: 'heatmap',
        gridPos: { x: 0, y: 6, w: 6, h: 6 },
        options: {
          dataSource: 'log-patterns'
        }
      },
      {
        id: 'log-analysis',
        title: 'Log Analysis',
        type: 'logs',
        gridPos: { x: 6, y: 6, w: 6, h: 6 }
      }
    ]
  }
];

// Default dashboard states
const DEFAULT_LAYOUT_ID = 'system-overview';

// Generate mock data for demo
const generateMockData = () => {
  // Network graph data
  const networkData: GraphData = {
    nodes: [
      { id: 'server1', label: 'Main Server', type: 'server', size: 15 },
      { id: 'server2', label: 'Backup Server', type: 'server', size: 15 },
      { id: 'container1', label: 'MCP Container 1', type: 'container', size: 12 },
      { id: 'container2', label: 'MCP Container 2', type: 'container', size: 12 },
      { id: 'container3', label: 'Database', type: 'container', size: 12 },
      { id: 'process1', label: 'API Process', type: 'process', size: 10 },
      { id: 'process2', label: 'Worker Process', type: 'process', size: 10 },
      { id: 'error1', label: 'Failed Process', type: 'error', size: 10 }
    ],
    edges: [
      { source: 'server1', target: 'container1', type: 'connection' },
      { source: 'server1', target: 'container2', type: 'connection' },
      { source: 'server2', target: 'container3', type: 'connection' },
      { source: 'container1', target: 'process1', type: 'dependency' },
      { source: 'container2', target: 'process2', type: 'dependency' },
      { source: 'container3', target: 'process1', type: 'dependency' },
      { source: 'process1', target: 'error1', type: 'error' }
    ]
  };
  
  // Heatmap data for log patterns
  const heatmapData: HeatMapDataPoint[] = [
    { x: 15, y: 0, value: 5, label: 'Connection Error' },
    { x: 30, y: 25, value: 3, label: 'File Not Found' },
    { x: 45, y: 50, value: 8, label: 'Timeout Warning' },
    { x: 60, y: 75, value: 2, label: 'Config Load' },
    { x: 75, y: 0, value: 4, label: 'Authentication Error' },
    { x: 85, y: 25, value: 6, label: 'Query Error' },
    { x: 25, y: 50, value: 7, label: 'Disk Space Warning' },
    { x: 40, y: 0, value: 9, label: 'Fatal Error' },
    { x: 65, y: 75, value: 1, label: 'Startup Info' }
  ];
  
  return { networkData, heatmapData };
};

// The enhanced dashboard component
const EnhancedDashboard: React.FC = () => {
  const theme = useTheme();
  const { addNotification } = useUI();
  
  // Create service instances for demo
  const maintenanceService = new PredictiveMaintenanceService();
  
  // Dashboard state
  const [currentLayoutId, setCurrentLayoutId] = useState<string>(DEFAULT_LAYOUT_ID);
  const [layouts, setLayouts] = useState<DashboardLayout[]>(availableLayouts);
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Menu states
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState<null | HTMLElement>(null);
  const [panelMenuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  
  // Get current layout
  const currentLayout = layouts.find(layout => layout.id === currentLayoutId) || layouts[0];
  
  // Load mock data on mount
  useEffect(() => {
    const { networkData, heatmapData } = generateMockData();
    
    // Initialize visualization service with data
    visualizationService.updateNetworkGraph(networkData);
    visualizationService.updateHeatmap('log-patterns', heatmapData);
    
    // Listen for updates
    const handleNetworkUpdate = () => {
      // This would be called when the network graph is updated
      // For demo purposes, we don't need to do anything here
    };
    
    visualizationService.on('networkGraphUpdated', handleNetworkUpdate);
    
    return () => {
      visualizationService.off('networkGraphUpdated', handleNetworkUpdate);
    };
  }, []);
  
  // Handle layout menu
  const handleOpenLayoutMenu = (event: React.MouseEvent<HTMLElement>) => {
    setLayoutMenuAnchor(event.currentTarget);
  };
  
  const handleCloseLayoutMenu = () => {
    setLayoutMenuAnchor(null);
  };
  
  const handleSelectLayout = (layoutId: string) => {
    setCurrentLayoutId(layoutId);
    handleCloseLayoutMenu();
  };
  
  // Handle panel menu
  const handleOpenPanelMenu = (event: React.MouseEvent<HTMLElement>, panelId: string) => {
    setMenuAnchor(event.currentTarget);
    setActivePanelId(panelId);
  };
  
  const handleClosePanelMenu = () => {
    setMenuAnchor(null);
    setActivePanelId(null);
  };
  
  // Handle panel configurations
  const configurePanel = (panelId: string) => {
    // TODO: Implement panel configuration logic
    handleClosePanelMenu();
    
    addNotification({
      message: 'Panel configuration is not implemented yet',
      severity: 'info',
      autoClose: true
    });
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true);
    
    // Simulate data refresh
    setTimeout(() => {
      const { networkData, heatmapData } = generateMockData();
      visualizationService.updateNetworkGraph(networkData);
      visualizationService.updateHeatmap('log-patterns', heatmapData);
      
      setIsLoading(false);
      
      addNotification({
        message: 'Dashboard data refreshed',
        severity: 'success',
        autoClose: true
      });
    }, 1000);
  };
  
  // Handle compact mode toggle
  const handleToggleCompactMode = () => {
    setCompactMode(!compactMode);
  };
  
  // Render panel based on type
  const renderPanel = (panel: DashboardLayout['panels'][0]) => {
    switch (panel.type) {
      case 'network':
        return (
          <NetworkGraph 
            data={visualizationService.getNetworkGraph()}
            title={panel.title}
            width={panel.gridPos.w * 100 - 40}
            height={panel.gridPos.h * 75 - 60}
            interactive={true}
          />
        );
      
      case 'heatmap':
        const heatmapDataSource = panel.options?.dataSource || 'default';
        return (
          <HeatMapDisplay 
            data={visualizationService.getHeatmapData(heatmapDataSource)}
            title={panel.title}
            xLabel="Time"
            yLabel="Severity"
            width={panel.gridPos.w * 100 - 40}
            height={panel.gridPos.h * 75 - 60}
          />
        );
      
      case 'stats':
        return (
          <RealTimeStatsDashboard />
        );
      
      case 'logs':
        return (
          <NeonContainer elevation={3}>
            <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold', mb: 1 }}>
              {panel.title}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Log analysis component will be shown here
              </Typography>
            </Box>
          </NeonContainer>
        );
      
      case 'alerts':
        return (
          <NeonContainer elevation={3}>
            <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold', mb: 1 }}>
              {panel.title}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Alert component will be shown here
              </Typography>
            </Box>
          </NeonContainer>
        );
      
      case 'maintenance':
        return (
          <NeonContainer elevation={3}>
            <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold', mb: 1 }}>
              {panel.title}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Maintenance dashboard component will be shown here
              </Typography>
            </Box>
          </NeonContainer>
        );
      
      default:
        return (
          <NeonContainer elevation={3}>
            <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold', mb: 1 }}>
              {panel.title}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Unknown panel type: {panel.type}
              </Typography>
            </Box>
          </NeonContainer>
        );
    }
  };
  
  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#111' }}>
      {/* Dashboard header */}
      <Box 
        sx={{ 
          p: 2, 
          borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box display="flex" alignItems="center">
          <DashboardIcon sx={{ color: '#00FFFF', mr: 1 }} />
          <Typography variant="h5" sx={{ color: '#00FFFF', fontWeight: 'bold' }}>
            Enhanced Dashboard
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Add ThemeSettingsPanel here */}
          <ThemeSettingsPanel />
          
          <Tooltip title="Export dashboard">
            <IconButton sx={{ color: '#00FFFF' }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Import dashboard">
            <IconButton sx={{ color: '#00FFFF' }}>
              <FileUploadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={compactMode ? "Expand layout" : "Compact layout"}>
            <IconButton 
              sx={{ color: '#00FFFF' }}
              onClick={handleToggleCompactMode}
            >
              {compactMode ? <ViewComfyIcon /> : <ViewCompactIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh data">
            <IconButton 
              sx={{ color: '#00FFFF' }}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} sx={{ color: '#00FFFF' }} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          
          <NeonButton 
            variant="outlined" 
            size="small" 
            startIcon={<AddIcon />}
            sx={{ ml: 1 }}
          >
            Add Panel
          </NeonButton>
          
          <NeonButton 
            variant="outlined" 
            size="small" 
            endIcon={<SettingsIcon />}
            onClick={handleOpenLayoutMenu}
            sx={{ ml: 1 }}
          >
            {currentLayout.name}
          </NeonButton>
        </Box>
      </Box>
      
      {/* Dashboard content */}
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {currentLayout.panels.map(panel => (
            <Grid 
              item 
              key={panel.id} 
              xs={12} 
              md={compactMode ? panel.gridPos.w / 2 : panel.gridPos.w}
              sx={{ 
                height: compactMode ? panel.gridPos.h * 50 : panel.gridPos.h * 100,
                minHeight: 200
              }}
            >
              <Box sx={{ position: 'relative', height: '100%' }}>
                {/* Panel menu control */}
                <IconButton
                  size="small"
                  sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8, 
                    zIndex: 10,
                    color: 'rgba(255, 255, 255, 0.7)',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.5)'
                    }
                  }}
                  onClick={(e) => handleOpenPanelMenu(e, panel.id)}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                
                {/* Panel content */}
                {renderPanel(panel)}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
      
      {/* Layout menu */}
      <Menu
        anchorEl={layoutMenuAnchor}
        open={Boolean(layoutMenuAnchor)}
        onClose={handleCloseLayoutMenu}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">Select Dashboard</Typography>
        </MenuItem>
        <Divider />
        {layouts.map(layout => (
          <MenuItem 
            key={layout.id} 
            onClick={() => handleSelectLayout(layout.id)}
            selected={layout.id === currentLayoutId}
          >
            {layout.name}
          </MenuItem>
        ))}
      </Menu>
      
      {/* Panel menu */}
      <Menu
        anchorEl={panelMenuAnchor}
        open={Boolean(panelMenuAnchor)}
        onClose={handleClosePanelMenu}
      >
        <MenuItem onClick={() => configurePanel(activePanelId || '')}>
          Configure
        </MenuItem>
        <MenuItem onClick={handleClosePanelMenu}>
          Edit
        </MenuItem>
        <MenuItem onClick={handleClosePanelMenu}>
          Move
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleClosePanelMenu} sx={{ color: theme.palette.error.main }}>
          Remove
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default EnhancedDashboard;
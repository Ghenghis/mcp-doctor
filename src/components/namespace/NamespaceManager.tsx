import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Grid,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  CircularProgress,
  Tooltip,
  LinearProgress,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import DoDisturbIcon from '@mui/icons-material/DoDisturb';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';

import { useNamespace, Namespace, NamespaceType } from '../../context/NamespaceContext';
import { useUI } from '../../context/UIContext';
import { resourceService } from '../../services/ResourceService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`namespace-tabpanel-${index}`}
      aria-labelledby={`namespace-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const NamespaceManager: React.FC = () => {
  const theme = useTheme();
  const { 
    namespaces, 
    activeNamespace, 
    createNamespace, 
    deleteNamespace, 
    startNamespace, 
    stopNamespace, 
    restartNamespace,
    setActiveNamespace,
    isNamespaceRunning,
    getNamespaceStats
  } = useNamespace();
  const { addNotification } = useUI();
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [namespaceToDelete, setNamespaceToDelete] = useState<string | null>(null);
  
  // Form state for creating new namespace
  const [newNamespace, setNewNamespace] = useState<{
    name: string;
    type: NamespaceType;
    imageId?: string;
    resourcePreset: 'low' | 'medium' | 'high' | 'custom';
  }>({
    name: '',
    type: 'container',
    imageId: 'anthropic/mcp-server:latest',
    resourcePreset: 'medium'
  });
  
  // Form validation
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    imageId?: string;
  }>({});
  
  // Loading states
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  
  // Namespace stats
  const [namespaceStats, setNamespaceStats] = useState<Record<string, {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
  }>>({});
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Fetch namespace stats periodically
  useEffect(() => {
    const fetchStats = async () => {
      const stats: Record<string, any> = {};
      
      for (const namespace of namespaces) {
        if (namespace.status === 'running') {
          try {
            const namespaceStats = await getNamespaceStats(namespace.id);
            if (namespaceStats) {
              stats[namespace.id] = namespaceStats;
            }
          } catch (error) {
            console.error(`Failed to fetch stats for namespace ${namespace.id}:`, error);
          }
        }
      }
      
      setNamespaceStats(stats);
    };
    
    // Fetch stats immediately
    fetchStats();
    
    // Set up interval to fetch stats periodically
    const interval = setInterval(fetchStats, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, [namespaces, getNamespaceStats]);
  
  // Handle create dialog
  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };
  
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    // Reset form
    setNewNamespace({
      name: '',
      type: 'container',
      imageId: 'anthropic/mcp-server:latest',
      resourcePreset: 'medium'
    });
    setFormErrors({});
  };
  
  // Handle delete dialog
  const handleOpenDeleteDialog = (namespaceId: string) => {
    setNamespaceToDelete(namespaceId);
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setNamespaceToDelete(null);
  };
  
  // Handle form input change
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = event.target;
    
    if (name) {
      setNewNamespace(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Clear error for this field
      if (formErrors[name as keyof typeof formErrors]) {
        setFormErrors(prev => ({
          ...prev,
          [name]: undefined
        }));
      }
    }
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    
    if (!newNamespace.name) {
      errors.name = 'Name is required';
    } else if (namespaces.some(ns => ns.name === newNamespace.name)) {
      errors.name = 'Name must be unique';
    }
    
    if (newNamespace.type === 'container' && !newNamespace.imageId) {
      errors.imageId = 'Image ID is required for container namespaces';
    }
    
    setFormErrors(errors);
    
    return Object.keys(errors).length === 0;
  };
  
  // Handle create namespace
  const handleCreateNamespace = async () => {
    if (!validateForm()) {
      return;
    }
    
    // Get resource limits based on preset
    const presets = resourceService.getResourcePresets();
    const resourceLimits = presets[newNamespace.resourcePreset === 'custom' ? 'medium' : newNamespace.resourcePreset];
    
    try {
      // Create namespace
      const createdNamespace = await createNamespace({
        name: newNamespace.name,
        type: newNamespace.type,
        resourceLimits,
        environmentVariables: [],
        ports: [
          {
            internal: 3000,
            external: 3000 + namespaces.length, // Ensure unique external port
            protocol: 'tcp'
          }
        ],
        volumeMounts: [],
        imageId: newNamespace.type === 'container' ? newNamespace.imageId : undefined,
        metadata: {}
      });
      
      // Allocate resources
      await resourceService.allocateResources(createdNamespace.id, resourceLimits);
      
      // Close dialog
      handleCloseCreateDialog();
      
      // Set as active namespace
      setActiveNamespace(createdNamespace.id);
      
      // Show success notification
      addNotification({
        message: `Namespace "${createdNamespace.name}" created successfully`,
        severity: 'success',
        autoClose: true
      });
    } catch (error) {
      console.error('Failed to create namespace:', error);
      
      addNotification({
        message: 'Failed to create namespace',
        severity: 'error',
        autoClose: true
      });
    }
  };
  
  // Handle delete namespace
  const handleDeleteNamespace = async () => {
    if (!namespaceToDelete) return;
    
    try {
      setIsLoading(prev => ({ ...prev, [namespaceToDelete]: true }));
      
      // Delete namespace
      const success = await deleteNamespace(namespaceToDelete);
      
      if (success) {
        // Release resources
        await resourceService.releaseResources(namespaceToDelete);
        
        // Close dialog
        handleCloseDeleteDialog();
        
        // Show success notification
        addNotification({
          message: 'Namespace deleted successfully',
          severity: 'success',
          autoClose: true
        });
      }
    } catch (error) {
      console.error('Failed to delete namespace:', error);
      
      addNotification({
        message: 'Failed to delete namespace',
        severity: 'error',
        autoClose: true
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [namespaceToDelete]: false }));
    }
  };
  
  // Handle start namespace
  const handleStartNamespace = async (namespaceId: string) => {
    try {
      setIsLoading(prev => ({ ...prev, [namespaceId]: true }));
      
      // Start namespace
      const success = await startNamespace(namespaceId);
      
      if (success) {
        // Show success notification
        addNotification({
          message: 'Namespace started successfully',
          severity: 'success',
          autoClose: true
        });
      }
    } catch (error) {
      console.error(`Failed to start namespace ${namespaceId}:`, error);
      
      addNotification({
        message: 'Failed to start namespace',
        severity: 'error',
        autoClose: true
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [namespaceId]: false }));
    }
  };
  
  // Handle stop namespace
  const handleStopNamespace = async (namespaceId: string) => {
    try {
      setIsLoading(prev => ({ ...prev, [namespaceId]: true }));
      
      // Stop namespace
      const success = await stopNamespace(namespaceId);
      
      if (success) {
        // Show success notification
        addNotification({
          message: 'Namespace stopped successfully',
          severity: 'success',
          autoClose: true
        });
      }
    } catch (error) {
      console.error(`Failed to stop namespace ${namespaceId}:`, error);
      
      addNotification({
        message: 'Failed to stop namespace',
        severity: 'error',
        autoClose: true
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [namespaceId]: false }));
    }
  };
  
  // Handle restart namespace
  const handleRestartNamespace = async (namespaceId: string) => {
    try {
      setIsLoading(prev => ({ ...prev, [namespaceId]: true }));
      
      // Restart namespace
      const success = await restartNamespace(namespaceId);
      
      if (success) {
        // Show success notification
        addNotification({
          message: 'Namespace restarted successfully',
          severity: 'success',
          autoClose: true
        });
      }
    } catch (error) {
      console.error(`Failed to restart namespace ${namespaceId}:`, error);
      
      addNotification({
        message: 'Failed to restart namespace',
        severity: 'error',
        autoClose: true
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [namespaceId]: false }));
    }
  };
  
  // Get namespace status icon and color
  const getNamespaceStatusInfo = (status: Namespace['status']) => {
    switch (status) {
      case 'running':
        return { icon: <CheckCircleIcon />, color: 'success.main', label: 'Running' };
      case 'stopped':
        return { icon: <DoDisturbIcon />, color: 'text.disabled', label: 'Stopped' };
      case 'error':
        return { icon: <ErrorIcon />, color: 'error.main', label: 'Error' };
      case 'creating':
        return { icon: <CircularProgress size={16} />, color: 'info.main', label: 'Creating' };
      default:
        return { icon: <WarningIcon />, color: 'warning.main', label: 'Unknown' };
    }
  };
  
  // Format resource value
  const formatResourceValue = (value: number, unit: string): string => {
    if (value === 0) return 'Unlimited';
    
    if (unit === 'CPU') {
      return value === 1 ? '1 Core' : `${value} Cores`;
    }
    
    if (unit === 'Memory' || unit === 'Disk') {
      if (value < 1024) {
        return `${value} MB`;
      } else {
        return `${(value / 1024).toFixed(1)} GB`;
      }
    }
    
    if (unit === 'Network') {
      if (value < 1000) {
        return `${value} Mbps`;
      } else {
        return `${(value / 1000).toFixed(1)} Gbps`;
      }
    }
    
    return `${value} ${unit}`;
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="namespace tabs">
          <Tab label="Namespaces" id="namespace-tab-0" aria-controls="namespace-tabpanel-0" />
          <Tab label="Resources" id="namespace-tab-1" aria-controls="namespace-tabpanel-1" />
          <Tab label="Settings" id="namespace-tab-2" aria-controls="namespace-tabpanel-2" />
        </Tabs>
        
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Create Namespace
          </Button>
        </Box>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        {namespaces.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary" gutterBottom>
              No namespaces found
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Create a namespace to get started with isolated environments
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Create Namespace
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {namespaces.map(namespace => {
              const statusInfo = getNamespaceStatusInfo(namespace.status);
              const stats = namespaceStats[namespace.id];
              const isLoaded = Boolean(stats);
              
              return (
                <Grid item xs={12} md={6} lg={4} key={namespace.id}>
                  <Card 
                    variant="outlined"
                    sx={{
                      borderLeft: 4,
                      borderColor: statusInfo.color,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: activeNamespace?.id === namespace.id ? 'action.selected' : 'background.paper'
                    }}
                  >
                    <CardHeader
                      title={namespace.name}
                      subheader={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            icon={statusInfo.icon}
                            label={statusInfo.label}
                            size="small"
                            sx={{ color: statusInfo.color }}
                          />
                          <Chip
                            label={namespace.type}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      action={
                        <IconButton
                          onClick={() => handleOpenDeleteDialog(namespace.id)}
                          disabled={namespace.status === 'running' || isLoading[namespace.id]}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    />
                    
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Resources
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            CPU: {formatResourceValue(namespace.resourceLimits.cpu, 'CPU')}
                          </Typography>
                          {isLoaded && namespace.status === 'running' && (
                            <LinearProgress 
                              variant="determinate" 
                              value={stats.cpuUsage / namespace.resourceLimits.cpu}
                              sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                            />
                          )}
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Memory: {formatResourceValue(namespace.resourceLimits.memory, 'Memory')}
                          </Typography>
                          {isLoaded && namespace.status === 'running' && (
                            <LinearProgress 
                              variant="determinate" 
                              value={(stats.memoryUsage / namespace.resourceLimits.memory) * 100}
                              sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                            />
                          )}
                        </Grid>
                      </Grid>
                      
                      {namespace.type === 'container' && (
                        <>
                          <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                            Container Image
                          </Typography>
                          <Typography variant="body2" color="textSecondary" noWrap>
                            {namespace.imageId || 'No image specified'}
                          </Typography>
                        </>
                      )}
                      
                      {namespace.ports.length > 0 && (
                        <>
                          <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                            Port Mapping
                          </Typography>
                          <List dense disablePadding>
                            {namespace.ports.map((port, index) => (
                              <ListItem key={index} disableGutters>
                                <ListItemText
                                  primary={`${port.internal} → ${port.external}`}
                                  secondary={port.protocol.toUpperCase()}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      )}
                      
                      {namespace.environmentVariables.length > 0 && (
                        <>
                          <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                            Environment Variables
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {namespace.environmentVariables.length} variables defined
                          </Typography>
                        </>
                      )}
                    </CardContent>
                    
                    <Divider />
                    
                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<InfoIcon />}
                        onClick={() => setActiveNamespace(namespace.id)}
                      >
                        Details
                      </Button>
                      
                      {namespace.status === 'running' ? (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<StopIcon />}
                          onClick={() => handleStopNamespace(namespace.id)}
                          disabled={isLoading[namespace.id]}
                        >
                          {isLoading[namespace.id] ? 'Stopping...' : 'Stop'}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          color="success"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleStartNamespace(namespace.id)}
                          disabled={isLoading[namespace.id]}
                        >
                          {isLoading[namespace.id] ? 'Starting...' : 'Start'}
                        </Button>
                      )}
                      
                      <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => handleRestartNamespace(namespace.id)}
                        disabled={namespace.status !== 'running' || isLoading[namespace.id]}
                      >
                        Restart
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                System Resources
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="CPU Cores"
                    secondary={`${resourceService.getSystemResources().cpuCores} cores available`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Memory"
                    secondary={`${(resourceService.getSystemResources().totalMemory / 1024).toFixed(1)} GB total / ${(resourceService.getSystemResources().availableMemory / 1024).toFixed(1)} GB available`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Disk Space"
                    secondary={`${(resourceService.getSystemResources().totalDisk / 1024).toFixed(1)} GB total / ${(resourceService.getSystemResources().availableDisk / 1024).toFixed(1)} GB available`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Network Bandwidth"
                    secondary={`${resourceService.getSystemResources().networkBandwidth} Mbps`}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Resource Allocation
              </Typography>
              
              {namespaces.length === 0 ? (
                <Typography color="textSecondary" sx={{ my: 2 }}>
                  No namespaces to allocate resources to
                </Typography>
              ) : (
                <List>
                  <ListItem>
                    <ListItemText
                      primary="CPU Cores Allocated"
                      secondary={`${resourceService.getTotalAllocatedResources().cpu} / ${resourceService.getSystemResources().cpuCores} cores`}
                    />
                    <LinearProgress
                      variant="determinate"
                      value={(resourceService.getTotalAllocatedResources().cpu / resourceService.getSystemResources().cpuCores) * 100}
                      sx={{ width: 100, ml: 2 }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Memory Allocated"
                      secondary={`${resourceService.getTotalAllocatedResources().memory} MB / ${resourceService.getSystemResources().totalMemory} MB`}
                    />
                    <LinearProgress
                      variant="determinate"
                      value={(resourceService.getTotalAllocatedResources().memory / resourceService.getSystemResources().totalMemory) * 100}
                      sx={{ width: 100, ml: 2 }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Disk Space Allocated"
                      secondary={`${resourceService.getTotalAllocatedResources().disk} MB / ${resourceService.getSystemResources().totalDisk} MB`}
                    />
                    <LinearProgress
                      variant="determinate"
                      value={(resourceService.getTotalAllocatedResources().disk / resourceService.getSystemResources().totalDisk) * 100}
                      sx={{ width: 100, ml: 2 }}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Network Bandwidth Allocated"
                      secondary={`${resourceService.getTotalAllocatedResources().network} Mbps / ${resourceService.getSystemResources().networkBandwidth} Mbps`}
                    />
                    <LinearProgress
                      variant="determinate"
                      value={(resourceService.getTotalAllocatedResources().network / resourceService.getSystemResources().networkBandwidth) * 100}
                      sx={{ width: 100, ml: 2 }}
                    />
                  </ListItem>
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Namespace Isolation Settings
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Default Resource Limits
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Configure default resource limits for new namespaces. These values will be used when creating new namespaces unless specified otherwise.
              </Typography>
              
              {/* Default resource limits form would go here */}
              <Typography color="textSecondary" sx={{ mt: 2 }}>
                This feature is under development. Check back later for updates.
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
      
      {/* Create Namespace Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Namespace</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Create an isolated environment for your MCP server. Each namespace has its own resources and configuration.
          </DialogContentText>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Namespace Name"
                value={newNamespace.name}
                onChange={handleInputChange}
                fullWidth
                required
                margin="normal"
                error={Boolean(formErrors.name)}
                helperText={formErrors.name}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="namespace-type-label">Namespace Type</InputLabel>
                <Select
                  labelId="namespace-type-label"
                  name="type"
                  value={newNamespace.type}
                  onChange={handleInputChange}
                  label="Namespace Type"
                >
                  <MenuItem value="container">Container (Docker)</MenuItem>
                  <MenuItem value="process">Process</MenuItem>
                  <MenuItem value="virtual">Virtual</MenuItem>
                </Select>
                <FormHelperText>
                  {newNamespace.type === 'container' && 'Isolate using Docker containers'}
                  {newNamespace.type === 'process' && 'Isolate using separate processes'}
                  {newNamespace.type === 'virtual' && 'Isolate using virtual environments'}
                </FormHelperText>
              </FormControl>
            </Grid>
            
            {newNamespace.type === 'container' && (
              <Grid item xs={12}>
                <TextField
                  name="imageId"
                  label="Container Image"
                  value={newNamespace.imageId}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  error={Boolean(formErrors.imageId)}
                  helperText={formErrors.imageId || 'Docker image to use for the container'}
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="resource-preset-label">Resource Preset</InputLabel>
                <Select
                  labelId="resource-preset-label"
                  name="resourcePreset"
                  value={newNamespace.resourcePreset}
                  onChange={handleInputChange}
                  label="Resource Preset"
                >
                  <MenuItem value="low">Low (0.5 CPU, 512MB RAM)</MenuItem>
                  <MenuItem value="medium">Medium (1 CPU, 1GB RAM)</MenuItem>
                  <MenuItem value="high">High (2 CPU, 2GB RAM)</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
                <FormHelperText>
                  Predefined resource limits for the namespace
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateNamespace} 
            variant="contained" 
            color="primary"
            disabled={!newNamespace.name}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Namespace Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Delete Namespace</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this namespace? This action cannot be undone and all data associated with the namespace will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button 
            onClick={handleDeleteNamespace} 
            color="error"
            disabled={isLoading[namespaceToDelete || '']}
          >
            {isLoading[namespaceToDelete || ''] ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NamespaceManager;

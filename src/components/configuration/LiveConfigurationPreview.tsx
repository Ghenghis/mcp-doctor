import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Paper,
  Typography,
  TextField,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Alert,
  useTheme
} from '@mui/material';
import JSONPretty from 'react-json-pretty';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { useUI } from '../../context/UIContext';

// Mock server configuration interface
interface ServerConfig {
  name: string;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxConnections: number;
  timeout: number;
  enableMetrics: boolean;
  enableSecurity: boolean;
  metricsPort: number;
  corsOrigins: string[];
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstSize: number;
  };
  caching: {
    enabled: boolean;
    ttlSeconds: number;
    maxSize: number;
  };
  advanced: {
    workerThreads: number;
    socketTimeout: number;
    keepAliveTimeout: number;
    maxPayloadSize: number;
  };
}

interface ConfigurationPreviewProps {
  serverId?: string;
  initialConfig?: Partial<ServerConfig>;
  readOnly?: boolean;
  onSave?: (config: ServerConfig) => void;
}

// Tab panel component
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
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
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

const LiveConfigurationPreview: React.FC<ConfigurationPreviewProps> = ({
  serverId,
  initialConfig,
  readOnly = false,
  onSave
}) => {
  const theme = useTheme();
  const { addNotification, triggerUpdate } = useUI();
  
  // Default configuration
  const defaultConfig: ServerConfig = {
    name: 'New MCP Server',
    port: 3000,
    logLevel: 'info',
    maxConnections: 100,
    timeout: 30000,
    enableMetrics: true,
    enableSecurity: true,
    metricsPort: 9090,
    corsOrigins: ['http://localhost:3000'],
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 60,
      burstSize: 10
    },
    caching: {
      enabled: true,
      ttlSeconds: 300,
      maxSize: 1000
    },
    advanced: {
      workerThreads: 4,
      socketTimeout: 120000,
      keepAliveTimeout: 60000,
      maxPayloadSize: 1048576
    }
  };
  
  // Merge initial config with default
  const mergedConfig = { ...defaultConfig, ...initialConfig };
  
  // State
  const [config, setConfig] = useState<ServerConfig>(mergedConfig);
  const [originalConfig, setOriginalConfig] = useState<ServerConfig>(mergedConfig);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [corsInput, setCorsInput] = useState<string>('');
  
  // Effect to check for changes
  useEffect(() => {
    const isChanged = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setIsDirty(isChanged);
    
    // Validate configuration
    validateConfig(config);
    
    // Trigger UI update
    triggerUpdate();
  }, [config, originalConfig]);
  
  // Validate configuration
  const validateConfig = (config: ServerConfig) => {
    const errors: { [key: string]: string } = {};
    
    // Validate port
    if (config.port < 1 || config.port > 65535) {
      errors.port = 'Port must be between 1 and 65535';
    }
    
    // Validate metrics port
    if (config.metricsPort < 1 || config.metricsPort > 65535) {
      errors.metricsPort = 'Metrics port must be between 1 and 65535';
    }
    
    // Validate metrics port != server port
    if (config.port === config.metricsPort) {
      errors.metricsPort = 'Metrics port must be different from server port';
    }
    
    // Validate max connections
    if (config.maxConnections < 1) {
      errors.maxConnections = 'Max connections must be at least 1';
    }
    
    // Validate timeout
    if (config.timeout < 1000) {
      errors.timeout = 'Timeout must be at least 1000ms';
    }
    
    // Validate rate limiting
    if (config.rateLimiting.enabled && config.rateLimiting.requestsPerMinute < 1) {
      errors['rateLimiting.requestsPerMinute'] = 'Requests per minute must be at least 1';
    }
    
    // Validate caching
    if (config.caching.enabled) {
      if (config.caching.ttlSeconds < 1) {
        errors['caching.ttlSeconds'] = 'Cache TTL must be at least 1 second';
      }
      if (config.caching.maxSize < 1) {
        errors['caching.maxSize'] = 'Cache size must be at least 1';
      }
    }
    
    // Update validation errors
    setValidationErrors(errors);
    
    return Object.keys(errors).length === 0;
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setConfig(prevConfig => {
      const fieldParts = field.split('.');
      
      if (fieldParts.length === 1) {
        return {
          ...prevConfig,
          [field]: value
        };
      } else if (fieldParts.length === 2) {
        const [section, subField] = fieldParts;
        return {
          ...prevConfig,
          [section]: {
            ...prevConfig[section as keyof ServerConfig],
            [subField]: value
          }
        };
      }
      
      return prevConfig;
    });
  };
  
  // Handle CORS origins
  const handleAddCorsOrigin = () => {
    if (corsInput && !config.corsOrigins.includes(corsInput)) {
      setConfig(prevConfig => ({
        ...prevConfig,
        corsOrigins: [...prevConfig.corsOrigins, corsInput]
      }));
      setCorsInput('');
    }
  };
  
  const handleRemoveCorsOrigin = (origin: string) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      corsOrigins: prevConfig.corsOrigins.filter(o => o !== origin)
    }));
  };
  
  // Handle save
  const handleSave = () => {
    if (validateConfig(config)) {
      if (onSave) {
        onSave(config);
      }
      
      // Update original config
      setOriginalConfig({ ...config });
      setIsDirty(false);
      
      // Show notification
      addNotification({
        message: 'Configuration saved successfully',
        severity: 'success',
        autoClose: true
      });
    } else {
      // Show notification
      addNotification({
        message: 'Cannot save configuration due to validation errors',
        severity: 'error',
        autoClose: true
      });
    }
  };
  
  // Handle reset
  const handleReset = () => {
    setConfig({ ...originalConfig });
    setIsDirty(false);
    
    // Show notification
    addNotification({
      message: 'Configuration changes discarded',
      severity: 'info',
      autoClose: true
    });
  };
  
  // Handle copy to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
      .then(() => {
        addNotification({
          message: 'Configuration copied to clipboard',
          severity: 'success',
          autoClose: true
        });
      })
      .catch(err => {
        console.error('Failed to copy configuration:', err);
        addNotification({
          message: 'Failed to copy configuration',
          severity: 'error',
          autoClose: true
        });
      });
  };
  
  // JSON theme for preview
  const jsonTheme = {
    main: `line-height:1.3;color:${theme.palette.text.primary};background:${theme.palette.background.paper};overflow:auto;padding:16px;border-radius:4px;`,
    key: `color:${theme.palette.primary.main};`,
    string: `color:${theme.palette.success.main};`,
    value: `color:${theme.palette.secondary.main};`,
    boolean: `color:${theme.palette.warning.main};`
  };
  
  return (
    <Card>
      <CardHeader 
        title="Server Configuration"
        subheader={serverId ? `Server ID: ${serverId}` : 'New configuration'}
        action={
          <Box>
            {!readOnly && isDirty && (
              <Tooltip title="Changes not saved">
                <IconButton color="warning">
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Copy configuration">
              <IconButton onClick={handleCopyToClipboard}>
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
            {!readOnly && (
              <>
                <Tooltip title="Reset changes">
                  <span>
                    <IconButton 
                      onClick={handleReset}
                      disabled={!isDirty}
                    >
                      <UndoIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Save configuration">
                  <span>
                    <IconButton 
                      color="primary"
                      onClick={handleSave}
                      disabled={!isDirty || Object.keys(validationErrors).length > 0}
                    >
                      <SaveIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
          </Box>
        }
      />
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="configuration tabs">
          <Tab label="Basic" id="config-tab-0" aria-controls="config-tabpanel-0" />
          <Tab label="Network" id="config-tab-1" aria-controls="config-tabpanel-1" />
          <Tab label="Security" id="config-tab-2" aria-controls="config-tabpanel-2" />
          <Tab label="Advanced" id="config-tab-3" aria-controls="config-tabpanel-3" />
          <Tab label="Preview" id="config-tab-4" aria-controls="config-tabpanel-4" icon={<VisibilityIcon />} iconPosition="end" />
        </Tabs>
      </Box>
      
      <CardContent>
        {Object.keys(validationErrors).length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Configuration has validation errors. Please fix them before saving.
          </Alert>
        )}
        
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Server Name"
                value={config.name}
                onChange={e => handleInputChange('name', e.target.value)}
                fullWidth
                margin="normal"
                variant="outlined"
                disabled={readOnly}
                error={!!validationErrors.name}
                helperText={validationErrors.name}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="log-level-label">Log Level</InputLabel>
                <Select
                  labelId="log-level-label"
                  value={config.logLevel}
                  onChange={e => handleInputChange('logLevel', e.target.value)}
                  label="Log Level"
                  disabled={readOnly}
                >
                  <MenuItem value="debug">Debug</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warn">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Port"
                type="number"
                value={config.port}
                onChange={e => handleInputChange('port', parseInt(e.target.value))}
                fullWidth
                margin="normal"
                variant="outlined"
                disabled={readOnly}
                error={!!validationErrors.port}
                helperText={validationErrors.port}
                InputProps={{ inputProps: { min: 1, max: 65535 } }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Max Connections"
                type="number"
                value={config.maxConnections}
                onChange={e => handleInputChange('maxConnections', parseInt(e.target.value))}
                fullWidth
                margin="normal"
                variant="outlined"
                disabled={readOnly}
                error={!!validationErrors.maxConnections}
                helperText={validationErrors.maxConnections}
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Timeout (ms)"
                type="number"
                value={config.timeout}
                onChange={e => handleInputChange('timeout', parseInt(e.target.value))}
                fullWidth
                margin="normal"
                variant="outlined"
                disabled={readOnly}
                error={!!validationErrors.timeout}
                helperText={validationErrors.timeout}
                InputProps={{ inputProps: { min: 1000, step: 1000 } }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enableMetrics}
                    onChange={e => handleInputChange('enableMetrics', e.target.checked)}
                    disabled={readOnly}
                  />
                }
                label="Enable Metrics"
              />
            </Grid>
            
            {config.enableMetrics && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="Metrics Port"
                  type="number"
                  value={config.metricsPort}
                  onChange={e => handleInputChange('metricsPort', parseInt(e.target.value))}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  disabled={readOnly}
                  error={!!validationErrors.metricsPort}
                  helperText={validationErrors.metricsPort}
                  InputProps={{ inputProps: { min: 1, max: 65535 } }}
                />
              </Grid>
            )}
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>CORS Configuration</Typography>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Allowed Origin URLs
                  </Typography>
                  {config.corsOrigins.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No origins configured
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {config.corsOrigins.map(origin => (
                        <Chip
                          key={origin}
                          label={origin}
                          onDelete={readOnly ? undefined : () => handleRemoveCorsOrigin(origin)}
                          disabled={readOnly}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
                
                {!readOnly && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      label="Add Origin URL"
                      value={corsInput}
                      onChange={e => setCorsInput(e.target.value)}
                      size="small"
                      sx={{ flexGrow: 1 }}
                    />
                    <Button 
                      variant="contained" 
                      onClick={handleAddCorsOrigin}
                      disabled={!corsInput}
                    >
                      Add
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Rate Limiting</Typography>
              <Paper sx={{ p: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.rateLimiting.enabled}
                      onChange={e => handleInputChange('rateLimiting.enabled', e.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label="Enable Rate Limiting"
                />
                
                {config.rateLimiting.enabled && (
                  <>
                    <Box sx={{ mt: 2 }}>
                      <Typography id="requests-per-minute-slider" gutterBottom>
                        Requests Per Minute: {config.rateLimiting.requestsPerMinute}
                      </Typography>
                      <Slider
                        value={config.rateLimiting.requestsPerMinute}
                        onChange={(e, value) => handleInputChange('rateLimiting.requestsPerMinute', value as number)}
                        aria-labelledby="requests-per-minute-slider"
                        min={10}
                        max={1000}
                        step={10}
                        marks={[
                          { value: 10, label: '10' },
                          { value: 100, label: '100' },
                          { value: 500, label: '500' },
                          { value: 1000, label: '1000' }
                        ]}
                        disabled={readOnly}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="burst-size-slider" gutterBottom>
                        Burst Size: {config.rateLimiting.burstSize}
                      </Typography>
                      <Slider
                        value={config.rateLimiting.burstSize}
                        onChange={(e, value) => handleInputChange('rateLimiting.burstSize', value as number)}
                        aria-labelledby="burst-size-slider"
                        min={1}
                        max={100}
                        step={1}
                        marks={[
                          { value: 1, label: '1' },
                          { value: 25, label: '25' },
                          { value: 50, label: '50' },
                          { value: 100, label: '100' }
                        ]}
                        disabled={readOnly}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Caching</Typography>
              <Paper sx={{ p: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.caching.enabled}
                      onChange={e => handleInputChange('caching.enabled', e.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label="Enable Caching"
                />
                
                {config.caching.enabled && (
                  <>
                    <Box sx={{ mt: 2 }}>
                      <Typography id="ttl-seconds-slider" gutterBottom>
                        TTL (seconds): {config.caching.ttlSeconds}
                      </Typography>
                      <Slider
                        value={config.caching.ttlSeconds}
                        onChange={(e, value) => handleInputChange('caching.ttlSeconds', value as number)}
                        aria-labelledby="ttl-seconds-slider"
                        min={1}
                        max={3600}
                        step={10}
                        marks={[
                          { value: 60, label: '1m' },
                          { value: 300, label: '5m' },
                          { value: 1800, label: '30m' },
                          { value: 3600, label: '1h' }
                        ]}
                        disabled={readOnly}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography id="max-size-slider" gutterBottom>
                        Max Size: {config.caching.maxSize}
                      </Typography>
                      <Slider
                        value={config.caching.maxSize}
                        onChange={(e, value) => handleInputChange('caching.maxSize', value as number)}
                        aria-labelledby="max-size-slider"
                        min={100}
                        max={10000}
                        step={100}
                        marks={[
                          { value: 100, label: '100' },
                          { value: 1000, label: '1K' },
                          { value: 5000, label: '5K' },
                          { value: 10000, label: '10K' }
                        ]}
                        disabled={readOnly}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enableSecurity}
                      onChange={e => handleInputChange('enableSecurity', e.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label="Enable Security Features"
                />
                
                {config.enableSecurity && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    When security is enabled, all requests require authentication and are encrypted.
                  </Alert>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Worker Threads"
                type="number"
                value={config.advanced.workerThreads}
                onChange={e => handleInputChange('advanced.workerThreads', parseInt(e.target.value))}
                fullWidth
                margin="normal"
                variant="outlined"
                disabled={readOnly}
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Socket Timeout (ms)"
                type="number"
                value={config.advanced.socketTimeout}
                onChange={e => handleInputChange('advanced.socketTimeout', parseInt(e.target.value))}
                fullWidth
                margin="normal"
                variant="outlined"
                disabled={readOnly}
                InputProps={{ inputProps: { min: 1000, step: 1000 } }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Keep Alive Timeout (ms)"
                type="number"
                value={config.advanced.keepAliveTimeout}
                onChange={e => handleInputChange('advanced.keepAliveTimeout', parseInt(e.target.value))}
                fullWidth
                margin="normal"
                variant="outlined"
                disabled={readOnly}
                InputProps={{ inputProps: { min: 1000, step: 1000 } }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Max Payload Size (bytes)"
                type="number"
                value={config.advanced.maxPayloadSize}
                onChange={e => handleInputChange('advanced.maxPayloadSize', parseInt(e.target.value))}
                fullWidth
                margin="normal"
                variant="outlined"
                disabled={readOnly}
                InputProps={{ inputProps: { min: 1024, step: 1024 } }}
              />
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={4}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">JSON Configuration Preview</Typography>
              <Box>
                <Tooltip title={isDirty ? 'Unsaved changes' : 'No changes'}>
                  <IconButton 
                    color={isDirty ? 'warning' : 'success'} 
                    size="small"
                  >
                    {isDirty ? <InfoIcon /> : <CheckCircleIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy to clipboard">
                  <IconButton 
                    onClick={handleCopyToClipboard} 
                    size="small"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box>
              <JSONPretty 
                id="json-pretty" 
                data={config} 
                theme={jsonTheme} 
                style={{ fontSize: '0.9rem' }}
              />
            </Box>
          </Paper>
        </TabPanel>
      </CardContent>
    </Card>
  );
};

export default LiveConfigurationPreview;

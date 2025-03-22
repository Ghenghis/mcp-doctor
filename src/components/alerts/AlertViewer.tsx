/**
 * AlertViewer.tsx
 * 
 * Component for displaying and managing predictive maintenance alerts
 * in a neon wireframe style
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
  IconButton,
  Collapse,
  Button,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';

import { PredictiveAlert } from '../../services/maintenance/models/types';

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

const NeonChip = styled(Chip)<{severity?: string}>(({ theme, severity }) => {
  let color = '#00FFFF'; // default cyan
  
  switch (severity) {
    case 'critical':
      color = '#FF00FF'; // magenta
      break;
    case 'error':
      color = '#FF5555'; // reddish
      break;
    case 'warning':
      color = '#FFFF00'; // yellow
      break;
    case 'info':
      color = '#00FF00'; // green
      break;
  }
  
  return {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: `1px solid ${color}`,
    color: color,
    fontSize: '0.75rem',
    height: 24,
    '& .MuiChip-label': {
      padding: '0 8px'
    },
    boxShadow: `0 0 5px rgba(${color === '#FF00FF' ? '255, 0, 255' : 
                              color === '#FF5555' ? '255, 85, 85' : 
                              color === '#FFFF00' ? '255, 255, 0' : 
                              color === '#00FF00' ? '0, 255, 0' : 
                              '0, 255, 255'}, 0.5)`
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

const NeonButton = styled(Button)<{severity?: string}>(({ theme, severity }) => {
  let color = '#00FFFF'; // default cyan
  
  switch (severity) {
    case 'critical':
      color = '#FF00FF'; // magenta
      break;
    case 'error':
      color = '#FF5555'; // reddish
      break;
    case 'warning':
      color = '#FFFF00'; // yellow
      break;
    case 'info':
      color = '#00FF00'; // green
      break;
  }
  
  return {
    color: color,
    borderColor: color,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    '&:hover': {
      backgroundColor: `rgba(${color === '#FF00FF' ? '255, 0, 255' : 
                               color === '#FF5555' ? '255, 85, 85' : 
                               color === '#FFFF00' ? '255, 255, 0' : 
                               color === '#00FF00' ? '0, 255, 0' : 
                               '0, 255, 255'}, 0.1)`,
      borderColor: color,
      boxShadow: `0 0 10px rgba(${color === '#FF00FF' ? '255, 0, 255' : 
                                 color === '#FF5555' ? '255, 85, 85' : 
                                 color === '#FFFF00' ? '255, 255, 0' : 
                                 color === '#00FF00' ? '0, 255, 0' : 
                                 '0, 255, 255'}, 0.5)`
    }
  };
});

interface AlertViewerProps {
  alerts: PredictiveAlert[];
  onAcknowledge: (alertId: string) => void;
  onSnooze: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

interface AlertRowProps {
  alert: PredictiveAlert;
  onAcknowledge: (alertId: string) => void;
  onSnooze: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

const AlertRow: React.FC<AlertRowProps> = ({ alert, onAcknowledge, onSnooze, onDismiss }) => {
  const [open, setOpen] = useState(false);
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorOutlineIcon sx={{ color: '#FF00FF' }} />;
      case 'error':
        return <ErrorOutlineIcon sx={{ color: '#FF5555' }} />;
      case 'warning':
        return <WarningAmberIcon sx={{ color: '#FFFF00' }} />;
      case 'info':
        return <InfoOutlinedIcon sx={{ color: '#00FF00' }} />;
      default:
        return <InfoOutlinedIcon sx={{ color: '#00FFFF' }} />;
    }
  };
  
  return (
    <>
      <TableRow 
        sx={{ 
          '& > *': { borderBottom: 'unset' },
          backgroundColor: open ? 'rgba(0, 255, 255, 0.05)' : 'transparent'
        }}
      >
        <StyledTableCell padding="checkbox">
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ color: '#00FFFF' }}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </StyledTableCell>
        <StyledTableCell component="th" scope="row">
          <Box display="flex" alignItems="center" gap={1}>
            {getSeverityIcon(alert.severity)}
            <Typography variant="body2">
              {alert.title}
            </Typography>
          </Box>
        </StyledTableCell>
        <StyledTableCell>
          <NeonChip 
            label={alert.severity} 
            severity={alert.severity}
            size="small"
          />
        </StyledTableCell>
        <StyledTableCell>
          {alert.source}
        </StyledTableCell>
        <StyledTableCell>
          {new Date(alert.timestamp).toLocaleString()}
        </StyledTableCell>
        <StyledTableCell>
          <Box display="flex" alignItems="center">
            <Tooltip title={alert.acknowledged ? "Acknowledged" : "Not acknowledged"}>
              <IconButton 
                size="small" 
                sx={{ 
                  color: alert.acknowledged ? '#00FF00' : 'rgba(255, 255, 255, 0.3)',
                  '&:hover': { color: '#00FF00' }
                }}
                onClick={() => onAcknowledge(alert.id)}
              >
                <CheckCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={alert.snoozed ? "Notifications snoozed" : "Notifications active"}>
              <IconButton 
                size="small" 
                sx={{ 
                  color: alert.snoozed ? 'rgba(255, 255, 255, 0.3)' : '#FFFF00',
                  '&:hover': { color: '#FFFF00' }
                }}
                onClick={() => onSnooze(alert.id)}
              >
                {alert.snoozed ? <NotificationsOffIcon fontSize="small" /> : <NotificationsActiveIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </StyledTableCell>
      </TableRow>
      <TableRow>
        <StyledTableCell 
          style={{ padding: 0 }} 
          colSpan={6}
        >
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 3, backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <Typography variant="subtitle2" sx={{ color: '#00FFFF', mb: 1 }}>
                Details
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                {alert.description}
              </Typography>
              
              {alert.content && (
                <>
                  <Typography variant="subtitle2" sx={{ color: '#00FFFF', mb: 1 }}>
                    Content
                  </Typography>
                  <Box 
                    sx={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                      p: 1, 
                      borderRadius: 1,
                      border: '1px solid rgba(0, 255, 255, 0.2)',
                      mb: 2,
                      maxHeight: 100,
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}
                  >
                    {alert.content}
                  </Box>
                </>
              )}
              
              {alert.suggestedAction && (
                <>
                  <Typography variant="subtitle2" sx={{ color: '#00FF00', mb: 1 }}>
                    Suggested Action
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#00FF00', mb: 2 }}>
                    {alert.suggestedAction}
                  </Typography>
                </>
              )}
              
              <Box display="flex" justifyContent="flex-end" gap={1} mt={1}>
                <NeonButton 
                  variant="outlined" 
                  size="small" 
                  onClick={() => onSnooze(alert.id)}
                >
                  {alert.snoozed ? 'Unsnooze' : 'Snooze'}
                </NeonButton>
                <NeonButton 
                  variant="outlined" 
                  size="small" 
                  onClick={() => onAcknowledge(alert.id)}
                >
                  {alert.acknowledged ? 'Unacknowledge' : 'Acknowledge'}
                </NeonButton>
                <NeonButton 
                  variant="outlined" 
                  size="small" 
                  severity="error"
                  onClick={() => onDismiss(alert.id)}
                >
                  Dismiss
                </NeonButton>
              </Box>
            </Box>
          </Collapse>
        </StyledTableCell>
      </TableRow>
    </>
  );
};

const AlertViewer: React.FC<AlertViewerProps> = ({ 
  alerts, 
  onAcknowledge, 
  onSnooze, 
  onDismiss 
}) => {
  const [filter, setFilter] = useState<string>('all');
  
  // Filter alerts based on current filter
  const getFilteredAlerts = () => {
    switch (filter) {
      case 'critical':
        return alerts.filter(a => a.severity === 'critical');
      case 'error':
        return alerts.filter(a => a.severity === 'error');
      case 'warning':
        return alerts.filter(a => a.severity === 'warning');
      case 'info':
        return alerts.filter(a => a.severity === 'info');
      case 'unacknowledged':
        return alerts.filter(a => !a.acknowledged);
      default:
        return alerts;
    }
  };
  
  // Calculate counts for alerts by severity
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const errorCount = alerts.filter(a => a.severity === 'error').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
  
  return (
    <Box sx={{ width: '100%' }}>
      <NeonContainer elevation={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold' }}>
            Predictive Maintenance Alerts
          </Typography>
          <NeonChip 
            label={`${alerts.length} Alerts`} 
            icon={<NotificationsActiveIcon sx={{ fontSize: 16 }} />} 
          />
        </Box>
        
        <NeonDivider />
        
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          <NeonChip 
            label={`All (${alerts.length})`} 
            onClick={() => setFilter('all')}
            sx={{ 
              cursor: 'pointer',
              backgroundColor: filter === 'all' ? 'rgba(0, 255, 255, 0.2)' : undefined
            }}
          />
          <NeonChip 
            label={`Critical (${criticalCount})`} 
            severity="critical"
            onClick={() => setFilter('critical')}
            sx={{ 
              cursor: 'pointer',
              backgroundColor: filter === 'critical' ? 'rgba(255, 0, 255, 0.2)' : undefined
            }}
          />
          <NeonChip 
            label={`Error (${errorCount})`} 
            severity="error"
            onClick={() => setFilter('error')}
            sx={{ 
              cursor: 'pointer',
              backgroundColor: filter === 'error' ? 'rgba(255, 85, 85, 0.2)' : undefined
            }}
          />
          <NeonChip 
            label={`Warning (${warningCount})`} 
            severity="warning"
            onClick={() => setFilter('warning')}
            sx={{ 
              cursor: 'pointer',
              backgroundColor: filter === 'warning' ? 'rgba(255, 255, 0, 0.2)' : undefined
            }}
          />
          <NeonChip 
            label={`Info (${infoCount})`} 
            severity="info"
            onClick={() => setFilter('info')}
            sx={{ 
              cursor: 'pointer',
              backgroundColor: filter === 'info' ? 'rgba(0, 255, 0, 0.2)' : undefined
            }}
          />
          <NeonChip 
            label={`Unacknowledged (${unacknowledgedCount})`} 
            onClick={() => setFilter('unacknowledged')}
            sx={{ 
              cursor: 'pointer',
              backgroundColor: filter === 'unacknowledged' ? 'rgba(0, 255, 255, 0.2)' : undefined
            }}
          />
        </Box>
        
        <TableContainer>
          <Table size="small" aria-label="alerts table">
            <TableHead>
              <TableRow>
                <StyledTableHeaderCell width={50} />
                <StyledTableHeaderCell>Alert</StyledTableHeaderCell>
                <StyledTableHeaderCell>Severity</StyledTableHeaderCell>
                <StyledTableHeaderCell>Source</StyledTableHeaderCell>
                <StyledTableHeaderCell>Time</StyledTableHeaderCell>
                <StyledTableHeaderCell>Actions</StyledTableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredAlerts().length === 0 ? (
                <TableRow>
                  <StyledTableCell colSpan={6} align="center">
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', py: 2 }}>
                      No alerts to display
                    </Typography>
                  </StyledTableCell>
                </TableRow>
              ) : (
                getFilteredAlerts().map((alert) => (
                  <AlertRow 
                    key={alert.id} 
                    alert={alert} 
                    onAcknowledge={onAcknowledge}
                    onSnooze={onSnooze}
                    onDismiss={onDismiss}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </NeonContainer>
    </Box>
  );
};

export default AlertViewer;

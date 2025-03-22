import React, { useState } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Paper,
  Divider,
  Button,
  Snackbar,
  Alert,
  Slide,
  SlideProps,
  Stack
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CloseIcon from '@mui/icons-material/Close';

import { useUI, Notification, NotificationSeverity } from '../../context/UIContext';

// Transition component for Snackbar
function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="down" />;
}

const NotificationSystem: React.FC = () => {
  const { 
    state: { notifications },
    removeNotification,
    markNotificationAsRead,
    clearAllNotifications
  } = useUI();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentSnackbar, setCurrentSnackbar] = useState<Notification | null>(null);
  
  // Calculate unread notifications
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  // Handle notification panel open/close
  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    
    // Mark all notifications as read when panel is opened
    notifications.forEach(notification => {
      markNotificationAsRead(notification.id);
    });
  };
  
  const handleCloseNotifications = () => {
    setAnchorEl(null);
  };
  
  // Handle notification removal
  const handleRemoveNotification = (id: string) => {
    removeNotification(id);
  };
  
  // Process notifications for snackbar display
  React.useEffect(() => {
    const autoShowNotifications = notifications
      .filter(notification => notification.autoClose && !notification.read)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (autoShowNotifications.length > 0 && !currentSnackbar) {
      setCurrentSnackbar(autoShowNotifications[0]);
      markNotificationAsRead(autoShowNotifications[0].id);
    }
  }, [notifications, currentSnackbar, markNotificationAsRead]);
  
  // Handle snackbar close
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    
    setCurrentSnackbar(null);
  };
  
  // Get severity icon color
  const getSeverityColor = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'error':
        return 'error.main';
      case 'warning':
        return 'warning.main';
      case 'success':
        return 'success.main';
      case 'info':
      default:
        return 'info.main';
    }
  };
  
  return (
    <>
      {/* Notification Icon with Badge */}
      <IconButton 
        color="inherit" 
        onClick={handleOpenNotifications}
        aria-label={`${unreadCount} unread notifications`}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      {/* Notification Panel Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseNotifications}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Paper sx={{ width: 350, maxHeight: 400 }}>
          {/* Header */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            <IconButton 
              size="small" 
              onClick={clearAllNotifications}
              aria-label="Clear all notifications"
              disabled={notifications.length === 0}
            >
              <ClearAllIcon />
            </IconButton>
          </Box>
          
          <Divider />
          
          {/* Notification List */}
          {notifications.length === 0 ? (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleRemoveNotification(notification.id)}
                    >
                      <CloseIcon />
                    </IconButton>
                  }
                  sx={{
                    borderLeft: 3,
                    borderColor: getSeverityColor(notification.severity),
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                  }}
                >
                  <ListItemText
                    primary={notification.message}
                    secondary={new Date(notification.timestamp).toLocaleTimeString()}
                  />
                </ListItem>
              ))}
            </List>
          )}
          
          {/* Footer */}
          <Divider />
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              size="small" 
              onClick={handleCloseNotifications}
            >
              Close
            </Button>
          </Box>
        </Paper>
      </Popover>
      
      {/* Snackbar for auto-close notifications */}
      <Snackbar
        open={Boolean(currentSnackbar)}
        autoHideDuration={currentSnackbar?.duration || 6000}
        onClose={handleSnackbarClose}
        TransitionComponent={SlideTransition}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {currentSnackbar && (
          <Alert
            onClose={handleSnackbarClose}
            severity={currentSnackbar.severity}
            sx={{ width: '100%' }}
          >
            {currentSnackbar.message}
          </Alert>
        )}
      </Snackbar>
    </>
  );
};

export default NotificationSystem;

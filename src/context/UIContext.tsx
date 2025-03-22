import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define theme types
export type ThemeType = 'light' | 'dark' | 'neon';

// Define notification types
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: number;
  read: boolean;
  autoClose?: boolean;
  duration?: number;
}

// Define UI state interface
interface UIState {
  theme: ThemeType;
  refreshRate: number; // in milliseconds
  notifications: Notification[];
  expandedSidebar: boolean;
  activeView: string;
  fullscreen: boolean;
  lastUpdate: number;
}

// Define UI context interface
interface UIContextProps {
  // State
  state: UIState;
  
  // Theme methods
  setTheme: (theme: ThemeType) => void;
  
  // Refresh rate methods
  setRefreshRate: (rate: number) => void;
  
  // Notification methods
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  
  // UI state methods
  setExpandedSidebar: (expanded: boolean) => void;
  setActiveView: (view: string) => void;
  setFullscreen: (fullscreen: boolean) => void;
  
  // Update trigger
  triggerUpdate: () => void;
}

// Create the context with default values
const UIContext = createContext<UIContextProps | undefined>(undefined);

// UI Provider props
interface UIProviderProps {
  children: ReactNode;
  initialTheme?: ThemeType;
  initialRefreshRate?: number;
}

// Create a provider component
export const UIProvider: React.FC<UIProviderProps> = ({ 
  children, 
  initialTheme = 'dark',
  initialRefreshRate = 5000 
}) => {
  // Initialize state
  const [state, setState] = useState<UIState>({
    theme: initialTheme,
    refreshRate: initialRefreshRate,
    notifications: [],
    expandedSidebar: true,
    activeView: 'dashboard',
    fullscreen: false,
    lastUpdate: Date.now()
  });
  
  // Load saved preferences from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedRefreshRate = localStorage.getItem('refreshRate');
    
    if (savedTheme) {
      setState(prevState => ({
        ...prevState,
        theme: savedTheme as ThemeType
      }));
    }
    
    if (savedRefreshRate) {
      setState(prevState => ({
        ...prevState,
        refreshRate: parseInt(savedRefreshRate, 10)
      }));
    }
  }, []);
  
  // Apply theme to document body
  useEffect(() => {
    document.body.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
  }, [state.theme]);
  
  // Save refresh rate to localStorage when changed
  useEffect(() => {
    localStorage.setItem('refreshRate', state.refreshRate.toString());
  }, [state.refreshRate]);
  
  // Auto-close notifications
  useEffect(() => {
    const autoCloseNotifications = state.notifications
      .filter(notification => notification.autoClose && !notification.read);
    
    if (autoCloseNotifications.length > 0) {
      const timers = autoCloseNotifications.map(notification => {
        return setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration || 5000);
      });
      
      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [state.notifications]);
  
  // Theme methods
  const setTheme = (theme: ThemeType) => {
    setState(prevState => ({
      ...prevState,
      theme,
      lastUpdate: Date.now()
    }));
  };
  
  // Refresh rate methods
  const setRefreshRate = (rate: number) => {
    setState(prevState => ({
      ...prevState,
      refreshRate: rate,
      lastUpdate: Date.now()
    }));
  };
  
  // Notification methods
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();
    
    setState(prevState => ({
      ...prevState,
      notifications: [
        ...prevState.notifications,
        { ...notification, id, timestamp, read: false }
      ],
      lastUpdate: Date.now()
    }));
  };
  
  const removeNotification = (id: string) => {
    setState(prevState => ({
      ...prevState,
      notifications: prevState.notifications.filter(notification => notification.id !== id),
      lastUpdate: Date.now()
    }));
  };
  
  const markNotificationAsRead = (id: string) => {
    setState(prevState => ({
      ...prevState,
      notifications: prevState.notifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      ),
      lastUpdate: Date.now()
    }));
  };
  
  const clearAllNotifications = () => {
    setState(prevState => ({
      ...prevState,
      notifications: [],
      lastUpdate: Date.now()
    }));
  };
  
  // UI state methods
  const setExpandedSidebar = (expanded: boolean) => {
    setState(prevState => ({
      ...prevState,
      expandedSidebar: expanded,
      lastUpdate: Date.now()
    }));
  };
  
  const setActiveView = (view: string) => {
    setState(prevState => ({
      ...prevState,
      activeView: view,
      lastUpdate: Date.now()
    }));
  };
  
  const setFullscreen = (fullscreen: boolean) => {
    setState(prevState => ({
      ...prevState,
      fullscreen,
      lastUpdate: Date.now()
    }));
  };
  
  // Update trigger
  const triggerUpdate = () => {
    setState(prevState => ({
      ...prevState,
      lastUpdate: Date.now()
    }));
  };
  
  // Provide the context value
  const contextValue: UIContextProps = {
    state,
    setTheme,
    setRefreshRate,
    addNotification,
    removeNotification,
    markNotificationAsRead,
    clearAllNotifications,
    setExpandedSidebar,
    setActiveView,
    setFullscreen,
    triggerUpdate
  };
  
  return (
    <UIContext.Provider value={contextValue}>
      {children}
    </UIContext.Provider>
  );
};

// Create a custom hook to use the UI context
export const useUI = () => {
  const context = useContext(UIContext);
  
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  
  return context;
};

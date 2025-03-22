import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUI } from './UIContext';

// Define namespace types
export type NamespaceType = 'container' | 'process' | 'virtual';
export type ResourceLimit = 'none' | 'low' | 'medium' | 'high' | 'custom';

export interface NamespaceEnvironmentVariable {
  key: string;
  value: string;
  isSecret: boolean;
}

export interface NamespaceResourceLimits {
  cpu: number; // CPU cores (0.1 to n)
  memory: number; // Memory in MB
  disk: number; // Disk space in MB
  network: number; // Network bandwidth in Mbps
}

export interface Namespace {
  id: string;
  name: string;
  type: NamespaceType;
  status: 'running' | 'stopped' | 'error' | 'creating';
  resourceLimits: NamespaceResourceLimits;
  environmentVariables: NamespaceEnvironmentVariable[];
  createdAt: number;
  lastStartedAt?: number;
  ports: {
    internal: number;
    external: number;
    protocol: 'tcp' | 'udp';
  }[];
  volumeMounts: {
    hostPath: string;
    containerPath: string;
    readOnly: boolean;
  }[];
  imageId?: string; // For container-based namespaces
  processId?: number; // For process-based namespaces
  metadata: Record<string, any>;
}

// Define namespace context interface
interface NamespaceContextProps {
  // State
  namespaces: Namespace[];
  activeNamespace: Namespace | null;
  
  // CRUD methods
  createNamespace: (namespace: Omit<Namespace, 'id' | 'createdAt' | 'status'>) => Promise<Namespace>;
  getNamespace: (id: string) => Namespace | null;
  updateNamespace: (id: string, updates: Partial<Omit<Namespace, 'id' | 'createdAt'>>) => Promise<Namespace | null>;
  deleteNamespace: (id: string) => Promise<boolean>;
  
  // Status methods
  startNamespace: (id: string) => Promise<boolean>;
  stopNamespace: (id: string) => Promise<boolean>;
  restartNamespace: (id: string) => Promise<boolean>;
  
  // Environment variable methods
  setEnvironmentVariable: (namespaceId: string, key: string, value: string, isSecret?: boolean) => Promise<boolean>;
  removeEnvironmentVariable: (namespaceId: string, key: string) => Promise<boolean>;
  
  // Resource methods
  setResourceLimits: (namespaceId: string, limits: Partial<NamespaceResourceLimits>) => Promise<boolean>;
  applyResourcePreset: (namespaceId: string, preset: ResourceLimit) => Promise<boolean>;
  
  // Selection methods
  setActiveNamespace: (id: string | null) => void;
  
  // Utility methods
  isNamespaceRunning: (id: string) => boolean;
  getNamespaceStats: (id: string) => Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
  } | null>;
}

// Create the context with default values
const NamespaceContext = createContext<NamespaceContextProps | undefined>(undefined);

// Provider props
interface NamespaceProviderProps {
  children: ReactNode;
}

// Create a provider component
export const NamespaceProvider: React.FC<NamespaceProviderProps> = ({ children }) => {
  const { addNotification } = useUI();
  
  // State
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [activeNamespace, setActiveNamespace] = useState<Namespace | null>(null);
  
  // Load namespaces from localStorage on mount
  useEffect(() => {
    try {
      const savedNamespaces = localStorage.getItem('namespaces');
      if (savedNamespaces) {
        const parsedNamespaces = JSON.parse(savedNamespaces) as Namespace[];
        setNamespaces(parsedNamespaces);
        
        // Set active namespace if there is one previously selected
        const activeNamespaceId = localStorage.getItem('activeNamespaceId');
        if (activeNamespaceId) {
          const active = parsedNamespaces.find(ns => ns.id === activeNamespaceId) || null;
          setActiveNamespace(active);
        }
      }
    } catch (error) {
      console.error('Failed to load namespaces from localStorage:', error);
      addNotification({
        message: 'Failed to load namespaces from storage',
        severity: 'error',
        autoClose: true
      });
    }
  }, []);
  
  // Save namespaces to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem('namespaces', JSON.stringify(namespaces));
    } catch (error) {
      console.error('Failed to save namespaces to localStorage:', error);
    }
  }, [namespaces]);
  
  // Save active namespace to localStorage when changed
  useEffect(() => {
    try {
      if (activeNamespace) {
        localStorage.setItem('activeNamespaceId', activeNamespace.id);
      } else {
        localStorage.removeItem('activeNamespaceId');
      }
    } catch (error) {
      console.error('Failed to save active namespace to localStorage:', error);
    }
  }, [activeNamespace]);
  
  // CRUD Methods
  
  // Create a new namespace
  const createNamespace = async (namespace: Omit<Namespace, 'id' | 'createdAt' | 'status'>): Promise<Namespace> => {
    // Generate a unique ID
    const id = `namespace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the new namespace
    const newNamespace: Namespace = {
      ...namespace,
      id,
      createdAt: Date.now(),
      status: 'stopped',
      // Ensure default values for required fields
      environmentVariables: namespace.environmentVariables || [],
      ports: namespace.ports || [],
      volumeMounts: namespace.volumeMounts || [],
      metadata: namespace.metadata || {}
    };
    
    // Add to namespaces
    setNamespaces(prev => [...prev, newNamespace]);
    
    // Show notification
    addNotification({
      message: `Namespace "${newNamespace.name}" created`,
      severity: 'success',
      autoClose: true
    });
    
    return newNamespace;
  };
  
  // Get a namespace by ID
  const getNamespace = (id: string): Namespace | null => {
    return namespaces.find(ns => ns.id === id) || null;
  };
  
  // Update a namespace
  const updateNamespace = async (id: string, updates: Partial<Omit<Namespace, 'id' | 'createdAt'>>): Promise<Namespace | null> => {
    // Find the namespace
    const namespaceIndex = namespaces.findIndex(ns => ns.id === id);
    
    if (namespaceIndex === -1) {
      addNotification({
        message: `Namespace with ID "${id}" not found`,
        severity: 'error',
        autoClose: true
      });
      return null;
    }
    
    // Update the namespace
    const updatedNamespace = {
      ...namespaces[namespaceIndex],
      ...updates
    };
    
    // Update the namespaces array
    const newNamespaces = [...namespaces];
    newNamespaces[namespaceIndex] = updatedNamespace;
    setNamespaces(newNamespaces);
    
    // Update active namespace if it's the one being updated
    if (activeNamespace && activeNamespace.id === id) {
      setActiveNamespace(updatedNamespace);
    }
    
    // Show notification
    addNotification({
      message: `Namespace "${updatedNamespace.name}" updated`,
      severity: 'success',
      autoClose: true
    });
    
    return updatedNamespace;
  };
  
  // Delete a namespace
  const deleteNamespace = async (id: string): Promise<boolean> => {
    // Find the namespace
    const namespace = namespaces.find(ns => ns.id === id);
    
    if (!namespace) {
      addNotification({
        message: `Namespace with ID "${id}" not found`,
        severity: 'error',
        autoClose: true
      });
      return false;
    }
    
    // Check if namespace is running
    if (namespace.status === 'running') {
      addNotification({
        message: `Cannot delete running namespace "${namespace.name}". Stop it first.`,
        severity: 'warning',
        autoClose: true
      });
      return false;
    }
    
    // Remove from namespaces
    setNamespaces(prev => prev.filter(ns => ns.id !== id));
    
    // If active namespace is the one being deleted, clear active namespace
    if (activeNamespace && activeNamespace.id === id) {
      setActiveNamespace(null);
    }
    
    // Show notification
    addNotification({
      message: `Namespace "${namespace.name}" deleted`,
      severity: 'success',
      autoClose: true
    });
    
    return true;
  };
  
  // Status Methods
  
  // Start a namespace
  const startNamespace = async (id: string): Promise<boolean> => {
    // Find the namespace
    const namespaceIndex = namespaces.findIndex(ns => ns.id === id);
    
    if (namespaceIndex === -1) {
      addNotification({
        message: `Namespace with ID "${id}" not found`,
        severity: 'error',
        autoClose: true
      });
      return false;
    }
    
    // Check if already running
    if (namespaces[namespaceIndex].status === 'running') {
      addNotification({
        message: `Namespace "${namespaces[namespaceIndex].name}" is already running`,
        severity: 'info',
        autoClose: true
      });
      return true;
    }
    
    try {
      // Update status to 'creating'
      const updatingNamespace = {
        ...namespaces[namespaceIndex],
        status: 'creating'
      };
      
      const newNamespaces = [...namespaces];
      newNamespaces[namespaceIndex] = updatingNamespace;
      setNamespaces(newNamespaces);
      
      // Simulate starting a namespace (in a real app, this would call a service)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the namespace
      const startedNamespace = {
        ...updatingNamespace,
        status: 'running',
        lastStartedAt: Date.now()
      };
      
      // Update the namespaces array
      const finalNamespaces = [...newNamespaces];
      finalNamespaces[namespaceIndex] = startedNamespace;
      setNamespaces(finalNamespaces);
      
      // Update active namespace if it's the one being started
      if (activeNamespace && activeNamespace.id === id) {
        setActiveNamespace(startedNamespace);
      }
      
      // Show notification
      addNotification({
        message: `Namespace "${startedNamespace.name}" started successfully`,
        severity: 'success',
        autoClose: true
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to start namespace ${id}:`, error);
      
      // Update status back to 'stopped' in case of error
      const failedNamespace = {
        ...namespaces[namespaceIndex],
        status: 'error'
      };
      
      const newNamespaces = [...namespaces];
      newNamespaces[namespaceIndex] = failedNamespace;
      setNamespaces(newNamespaces);
      
      // Update active namespace if it's the one that failed
      if (activeNamespace && activeNamespace.id === id) {
        setActiveNamespace(failedNamespace);
      }
      
      // Show notification
      addNotification({
        message: `Failed to start namespace "${failedNamespace.name}"`,
        severity: 'error',
        autoClose: true
      });
      
      return false;
    }
  };
  
  // Stop a namespace
  const stopNamespace = async (id: string): Promise<boolean> => {
    // Find the namespace
    const namespaceIndex = namespaces.findIndex(ns => ns.id === id);
    
    if (namespaceIndex === -1) {
      addNotification({
        message: `Namespace with ID "${id}" not found`,
        severity: 'error',
        autoClose: true
      });
      return false;
    }
    
    // Check if already stopped
    if (namespaces[namespaceIndex].status === 'stopped' || namespaces[namespaceIndex].status === 'error') {
      addNotification({
        message: `Namespace "${namespaces[namespaceIndex].name}" is already stopped`,
        severity: 'info',
        autoClose: true
      });
      return true;
    }
    
    try {
      // Simulate stopping a namespace (in a real app, this would call a service)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the namespace
      const stoppedNamespace = {
        ...namespaces[namespaceIndex],
        status: 'stopped'
      };
      
      // Update the namespaces array
      const newNamespaces = [...namespaces];
      newNamespaces[namespaceIndex] = stoppedNamespace;
      setNamespaces(newNamespaces);
      
      // Update active namespace if it's the one being stopped
      if (activeNamespace && activeNamespace.id === id) {
        setActiveNamespace(stoppedNamespace);
      }
      
      // Show notification
      addNotification({
        message: `Namespace "${stoppedNamespace.name}" stopped successfully`,
        severity: 'success',
        autoClose: true
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to stop namespace ${id}:`, error);
      
      // Show notification
      addNotification({
        message: `Failed to stop namespace "${namespaces[namespaceIndex].name}"`,
        severity: 'error',
        autoClose: true
      });
      
      return false;
    }
  };
  
  // Restart a namespace
  const restartNamespace = async (id: string): Promise<boolean> => {
    const stopResult = await stopNamespace(id);
    if (!stopResult) {
      return false;
    }
    
    // Add a small delay before starting again
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return await startNamespace(id);
  };
  
  // Environment Variable Methods
  
  // Set environment variable
  const setEnvironmentVariable = async (namespaceId: string, key: string, value: string, isSecret: boolean = false): Promise<boolean> => {
    // Find the namespace
    const namespaceIndex = namespaces.findIndex(ns => ns.id === namespaceId);
    
    if (namespaceIndex === -1) {
      addNotification({
        message: `Namespace with ID "${namespaceId}" not found`,
        severity: 'error',
        autoClose: true
      });
      return false;
    }
    
    const namespace = namespaces[namespaceIndex];
    
    // Find if variable already exists
    const varIndex = namespace.environmentVariables.findIndex(env => env.key === key);
    
    // Create new env vars array
    const newEnvVars = [...namespace.environmentVariables];
    
    if (varIndex === -1) {
      // Add new variable
      newEnvVars.push({ key, value, isSecret });
    } else {
      // Update existing variable
      newEnvVars[varIndex] = { key, value, isSecret };
    }
    
    // Update namespace
    const updatedNamespace = {
      ...namespace,
      environmentVariables: newEnvVars
    };
    
    // Update namespaces array
    const newNamespaces = [...namespaces];
    newNamespaces[namespaceIndex] = updatedNamespace;
    setNamespaces(newNamespaces);
    
    // Update active namespace if it's the one being updated
    if (activeNamespace && activeNamespace.id === namespaceId) {
      setActiveNamespace(updatedNamespace);
    }
    
    return true;
  };
  
  // Remove environment variable
  const removeEnvironmentVariable = async (namespaceId: string, key: string): Promise<boolean> => {
    // Find the namespace
    const namespaceIndex = namespaces.findIndex(ns => ns.id === namespaceId);
    
    if (namespaceIndex === -1) {
      addNotification({
        message: `Namespace with ID "${namespaceId}" not found`,
        severity: 'error',
        autoClose: true
      });
      return false;
    }
    
    const namespace = namespaces[namespaceIndex];
    
    // Remove variable
    const newEnvVars = namespace.environmentVariables.filter(env => env.key !== key);
    
    // Update namespace
    const updatedNamespace = {
      ...namespace,
      environmentVariables: newEnvVars
    };
    
    // Update namespaces array
    const newNamespaces = [...namespaces];
    newNamespaces[namespaceIndex] = updatedNamespace;
    setNamespaces(newNamespaces);
    
    // Update active namespace if it's the one being updated
    if (activeNamespace && activeNamespace.id === namespaceId) {
      setActiveNamespace(updatedNamespace);
    }
    
    return true;
  };
  
  // Resource Methods
  
  // Set resource limits
  const setResourceLimits = async (namespaceId: string, limits: Partial<NamespaceResourceLimits>): Promise<boolean> => {
    // Find the namespace
    const namespaceIndex = namespaces.findIndex(ns => ns.id === namespaceId);
    
    if (namespaceIndex === -1) {
      addNotification({
        message: `Namespace with ID "${namespaceId}" not found`,
        severity: 'error',
        autoClose: true
      });
      return false;
    }
    
    const namespace = namespaces[namespaceIndex];
    
    // Update resource limits
    const updatedLimits = {
      ...namespace.resourceLimits,
      ...limits
    };
    
    // Update namespace
    const updatedNamespace = {
      ...namespace,
      resourceLimits: updatedLimits
    };
    
    // Update namespaces array
    const newNamespaces = [...namespaces];
    newNamespaces[namespaceIndex] = updatedNamespace;
    setNamespaces(newNamespaces);
    
    // Update active namespace if it's the one being updated
    if (activeNamespace && activeNamespace.id === namespaceId) {
      setActiveNamespace(updatedNamespace);
    }
    
    // If namespace is running, apply limits
    if (namespace.status === 'running') {
      // In a real app, this would call a service to apply limits to the running namespace
      
      // Show notification
      addNotification({
        message: `Resource limits updated for namespace "${namespace.name}"`,
        severity: 'success',
        autoClose: true
      });
    }
    
    return true;
  };
  
  // Apply resource preset
  const applyResourcePreset = async (namespaceId: string, preset: ResourceLimit): Promise<boolean> => {
    // Define presets
    const presets: Record<ResourceLimit, NamespaceResourceLimits> = {
      none: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0
      },
      low: {
        cpu: 0.5,
        memory: 512,
        disk: 1024,
        network: 10
      },
      medium: {
        cpu: 1,
        memory: 1024,
        disk: 5120,
        network: 25
      },
      high: {
        cpu: 2,
        memory: 2048,
        disk: 10240,
        network: 50
      },
      custom: {
        // Custom preset keeps existing values
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0
      }
    };
    
    // If custom preset, don't update limits
    if (preset === 'custom') {
      return true;
    }
    
    // Apply preset limits
    return await setResourceLimits(namespaceId, presets[preset]);
  };
  
  // Selection Methods
  
  // Set active namespace
  const setActiveNamespaceById = (id: string | null) => {
    if (id === null) {
      setActiveNamespace(null);
      return;
    }
    
    const namespace = namespaces.find(ns => ns.id === id) || null;
    setActiveNamespace(namespace);
  };
  
  // Utility Methods
  
  // Check if namespace is running
  const isNamespaceRunning = (id: string): boolean => {
    const namespace = namespaces.find(ns => ns.id === id);
    return namespace ? namespace.status === 'running' : false;
  };
  
  // Get namespace stats
  const getNamespaceStats = async (id: string): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
  } | null> => {
    const namespace = namespaces.find(ns => ns.id === id);
    
    if (!namespace) {
      return null;
    }
    
    if (namespace.status !== 'running') {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkUsage: 0
      };
    }
    
    // In a real app, this would fetch actual metrics from the namespace
    // For now, we'll return mock data
    return {
      cpuUsage: Math.random() * namespace.resourceLimits.cpu * 100,
      memoryUsage: Math.random() * namespace.resourceLimits.memory * 0.8,
      diskUsage: Math.random() * namespace.resourceLimits.disk * 0.5,
      networkUsage: Math.random() * namespace.resourceLimits.network * 0.7
    };
  };
  
  // Provide the context value
  const contextValue: NamespaceContextProps = {
    namespaces,
    activeNamespace,
    createNamespace,
    getNamespace,
    updateNamespace,
    deleteNamespace,
    startNamespace,
    stopNamespace,
    restartNamespace,
    setEnvironmentVariable,
    removeEnvironmentVariable,
    setResourceLimits,
    applyResourcePreset,
    setActiveNamespace: setActiveNamespaceById,
    isNamespaceRunning,
    getNamespaceStats
  };
  
  return (
    <NamespaceContext.Provider value={contextValue}>
      {children}
    </NamespaceContext.Provider>
  );
};

// Create a custom hook to use the namespace context
export const useNamespace = () => {
  const context = useContext(NamespaceContext);
  
  if (context === undefined) {
    throw new Error('useNamespace must be used within a NamespaceProvider');
  }
  
  return context;
};

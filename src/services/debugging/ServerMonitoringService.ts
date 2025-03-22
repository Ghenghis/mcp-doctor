import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { LogService } from '../logging/LogService';
import { IServerProfile } from '../management/ManagementService';
import fetch from 'node-fetch';

/**
 * Interface for server metrics
 */
export interface ServerMetrics {
  timestamp: Date;
  cpu: {
    usage: number;     // Percentage (0-100)
    cores: number;
  };
  memory: {
    used: number;      // Bytes
    total: number;     // Bytes
    percentage: number; // Percentage (0-100)
  };
  requests: {
    active: number;
    total: number;
    success: number;
    error: number;
    avgResponseTime: number; // ms
  };
  tokens: {
    input: number;
    output: number;
  };
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'error';
  uptime: number;      // Seconds
  errors: string[];
  warnings: string[];
}

/**
 * Interface for server monitoring options
 */
export interface MonitoringOptions {
  pollInterval: number; // ms
  logTailSize: number;  // Number of log lines to tail
  healthCheckEndpoint?: string;
  metricsEndpoint?: string;
  credentialsPath?: string;
}

/**
 * Interface for monitored server
 */
export interface MonitoredServer {
  profile: IServerProfile;
  options: MonitoringOptions;
  metrics: ServerMetrics[];
  isMonitoring: boolean;
  lastUpdated: Date;
  logWatcher?: fs.FSWatcher;
  processInfo?: {
    pid: number;
    command: string;
    args: string[];
  };
}

/**
 * Service for real-time monitoring of MCP servers
 */
export class ServerMonitoringService extends EventEmitter {
  private servers: Map<string, MonitoredServer> = new Map();
  private defaultOptions: MonitoringOptions = {
    pollInterval: 5000,    // 5 seconds
    logTailSize: 100,      // 100 lines
    healthCheckEndpoint: '/health',
    metricsEndpoint: '/metrics'
  };
  
  constructor(private logService: LogService) {
    super();
  }
  
  /**
   * Start monitoring a server
   * @param profile Server profile to monitor
   * @param options Monitoring options
   */
  public async startMonitoring(
    profile: IServerProfile,
    options?: Partial<MonitoringOptions>
  ): Promise<boolean> {
    try {
      this.logService.info('ServerMonitoringService', `Starting monitoring for ${profile.name}`);
      
      // Combine with default options
      const monitoringOptions: MonitoringOptions = {
        ...this.defaultOptions,
        ...options
      };
      
      // Check if already monitoring
      if (this.servers.has(profile.id)) {
        const existing = this.servers.get(profile.id)!;
        if (existing.isMonitoring) {
          this.logService.info('ServerMonitoringService', `Already monitoring ${profile.name}`);
          return true;
        }
        
        // Update options
        existing.options = monitoringOptions;
        existing.isMonitoring = true;
        
        // Restart monitoring
        return this.restartMonitoring(profile.id);
      }
      
      // Detect server process
      const processInfo = await this.detectServerProcess(profile);
      
      // Create initial metrics
      const initialMetrics: ServerMetrics = {
        timestamp: new Date(),
        cpu: { usage: 0, cores: os.cpus().length },
        memory: { used: 0, total: os.totalmem(), percentage: 0 },
        requests: { active: 0, total: 0, success: 0, error: 0, avgResponseTime: 0 },
        tokens: { input: 0, output: 0 },
        status: processInfo ? 'online' : 'offline',
        uptime: 0,
        errors: [],
        warnings: []
      };
      
      // Create monitored server
      const monitoredServer: MonitoredServer = {
        profile,
        options: monitoringOptions,
        metrics: [initialMetrics],
        isMonitoring: true,
        lastUpdated: new Date(),
        processInfo
      };
      
      // Start log file watching
      if (profile.logPath && fs.existsSync(profile.logPath)) {
        monitoredServer.logWatcher = this.watchLogFile(profile.id, profile.logPath);
      }
      
      // Store monitored server
      this.servers.set(profile.id, monitoredServer);
      
      // Start polling metrics
      this.pollServerMetrics(profile.id);
      
      // Emit server added event
      this.emit('server-added', profile.id);
      
      this.logService.info('ServerMonitoringService', `Started monitoring ${profile.name}`);
      return true;
    } catch (error) {
      this.logService.error('ServerMonitoringService', `Error starting monitoring: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Stop monitoring a server
   * @param profileId Server profile ID
   */
  public async stopMonitoring(profileId: string): Promise<boolean> {
    try {
      if (!this.servers.has(profileId)) {
        this.logService.warn('ServerMonitoringService', `Server ${profileId} not found`);
        return false;
      }
      
      const server = this.servers.get(profileId)!;
      server.isMonitoring = false;
      
      // Stop log file watching
      if (server.logWatcher) {
        server.logWatcher.close();
        server.logWatcher = undefined;
      }
      
      // Emit server stopped event
      this.emit('server-stopped', profileId);
      
      this.logService.info('ServerMonitoringService', `Stopped monitoring ${server.profile.name}`);
      return true;
    } catch (error) {
      this.logService.error('ServerMonitoringService', `Error stopping monitoring: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Restart monitoring a server
   * @param profileId Server profile ID
   */
  private async restartMonitoring(profileId: string): Promise<boolean> {
    try {
      if (!this.servers.has(profileId)) {
        this.logService.warn('ServerMonitoringService', `Server ${profileId} not found`);
        return false;
      }
      
      const server = this.servers.get(profileId)!;
      
      // Stop log file watching
      if (server.logWatcher) {
        server.logWatcher.close();
        server.logWatcher = undefined;
      }
      
      // Re-detect server process
      server.processInfo = await this.detectServerProcess(server.profile);
      
      // Update status in latest metrics
      if (server.metrics.length > 0) {
        const latestMetrics = server.metrics[server.metrics.length - 1];
        latestMetrics.status = server.processInfo ? 'online' : 'offline';
      }
      
      // Start log file watching
      if (server.profile.logPath && fs.existsSync(server.profile.logPath)) {
        server.logWatcher = this.watchLogFile(profileId, server.profile.logPath);
      }
      
      // Start polling metrics
      this.pollServerMetrics(profileId);
      
      // Emit server restarted event
      this.emit('server-restarted', profileId);
      
      this.logService.info('ServerMonitoringService', `Restarted monitoring ${server.profile.name}`);
      return true;
    } catch (error) {
      this.logService.error('ServerMonitoringService', `Error restarting monitoring: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Detect server process
   * @param profile Server profile
   */
  private async detectServerProcess(profile: IServerProfile): Promise<MonitoredServer['processInfo'] | undefined> {
    try {
      // This is platform-specific and would require a more comprehensive implementation
      // For now, we'll just check if the executable exists and return a mock process info
      
      if (fs.existsSync(profile.executablePath)) {
        return {
          pid: 0, // Mock PID
          command: profile.executablePath,
          args: []
        };
      }
      
      return undefined;
    } catch (error) {
      this.logService.error('ServerMonitoringService', `Error detecting server process: ${error.message}`);
      return undefined;
    }
  }
  
  /**
   * Watch log file for changes
   * @param profileId Server profile ID
   * @param logPath Path to log file
   */
  private watchLogFile(profileId: string, logPath: string): fs.FSWatcher {
    try {
      // Create directory if it doesn't exist
      const logDir = path.dirname(logPath);
      fs.ensureDirSync(logDir);
      
      // Create file if it doesn't exist
      if (!fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '', 'utf8');
      }
      
      // Watch log file
      const watcher = fs.watch(logPath, (eventType, filename) => {
        if (eventType === 'change') {
          this.processLogUpdate(profileId, logPath);
        }
      });
      
      this.logService.debug('ServerMonitoringService', `Watching log file: ${logPath}`);
      return watcher;
    } catch (error) {
      this.logService.error('ServerMonitoringService', `Error watching log file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Process log file update
   * @param profileId Server profile ID
   * @param logPath Path to log file
   */
  private async processLogUpdate(profileId: string, logPath: string): Promise<void> {
    try {
      if (!this.servers.has(profileId)) {
        return;
      }
      
      const server = this.servers.get(profileId)!;
      if (!server.isMonitoring) {
        return;
      }
      
      // Read last N lines from log file
      const content = await fs.readFile(logPath, 'utf8');
      const lines = content.split('\n');
      const lastLines = lines.slice(-server.options.logTailSize);
      
      // Process log lines to find errors and warnings
      const errors: string[] = [];
      const warnings: string[] = [];
      
      for (const line of lastLines) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('error') || lowerLine.includes('"level":"error"')) {
          errors.push(line);
        } else if (lowerLine.includes('warn') || lowerLine.includes('"level":"warn"')) {
          warnings.push(line);
        }
      }
      
      // Update last metrics
      if (server.metrics.length > 0) {
        const latestMetrics = server.metrics[server.metrics.length - 1];
        latestMetrics.errors = errors;
        latestMetrics.warnings = warnings;
        
        // Emit metrics updated event
        this.emit('metrics-updated', profileId, latestMetrics);
      }
      
      // Emit log updated event
      this.emit('log-updated', profileId, lastLines);
      
      this.logService.debug('ServerMonitoringService', `Processed log update for ${server.profile.name}`);
    } catch (error) {
      this.logService.error('ServerMonitoringService', `Error processing log update: ${error.message}`);
    }
  }
  
  /**
   * Poll server metrics
   * @param profileId Server profile ID
   */
  private async pollServerMetrics(profileId: string): Promise<void> {
    try {
      if (!this.servers.has(profileId)) {
        return;
      }
      
      const server = this.servers.get(profileId)!;
      if (!server.isMonitoring) {
        return;
      }
      
      // Get latest metrics
      const metrics = await this.collectServerMetrics(server);
      
      // Add to metrics history
      server.metrics.push(metrics);
      
      // Limit metrics history to 100 items
      if (server.metrics.length > 100) {
        server.metrics = server.metrics.slice(-100);
      }
      
      // Update last updated time
      server.lastUpdated = new Date();
      
      // Emit metrics updated event
      this.emit('metrics-updated', profileId, metrics);
      
      // Schedule next update
      setTimeout(() => {
        this.pollServerMetrics(profileId);
      }, server.options.pollInterval);
      
    } catch (error) {
      this.logService.error('ServerMonitoringService', `Error polling server metrics: ${error.message}`);
      
      // Schedule next update even on error
      setTimeout(() => {
        this.pollServerMetrics(profileId);
      }, this.servers.get(profileId)!.options.pollInterval);
    }
  }
  
  /**
   * Collect server metrics
   * @param server Monitored server
   */
  private async collectServerMetrics(server: MonitoredServer): Promise<ServerMetrics> {
    try {
      // Get previous metrics
      const previousMetrics = server.metrics.length > 0
        ? server.metrics[server.metrics.length - 1]
        : null;
      
      // Start with default metrics
      const metrics: ServerMetrics = {
        timestamp: new Date(),
        cpu: { usage: 0, cores: os.cpus().length },
        memory: { used: 0, total: os.totalmem(), percentage: 0 },
        requests: { 
          active: previousMetrics?.requests.active || 0,
          total: previousMetrics?.requests.total || 0,
          success: previousMetrics?.requests.success || 0,
          error: previousMetrics?.requests.error || 0,
          avgResponseTime: previousMetrics?.requests.avgResponseTime || 0
        },
        tokens: { 
          input: previousMetrics?.tokens.input || 0,
          output: previousMetrics?.tokens.output || 0
        },
        status: 'offline',
        uptime: previousMetrics?.uptime || 0,
        errors: previousMetrics?.errors || [],
        warnings: previousMetrics?.warnings || []
      };
      
      // Check if process info is available
      if (!server.processInfo) {
        // Try to detect process again
        server.processInfo = await this.detectServerProcess(server.profile);
        
        if (!server.processInfo) {
          return metrics;
        }
      }
      
      // Process is running, update status
      metrics.status = 'online';
      metrics.uptime = previousMetrics ? previousMetrics.uptime + (server.options.pollInterval / 1000) : 0;
      
      // Try to fetch metrics from server
      try {
        const serverUrl = this.getServerUrl(server.profile);
        
        if (serverUrl && server.options.metricsEndpoint) {
          const metricsUrl = new URL(server.options.metricsEndpoint, serverUrl).toString();
          const metricsResponse = await fetch(metricsUrl, {
            method: 'GET',
            timeout: 5000,
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json() as any;
            
            // Parse server-provided metrics
            if (metricsData.cpu && typeof metricsData.cpu.usage === 'number') {
              metrics.cpu.usage = metricsData.cpu.usage;
            }
            
            if (metricsData.memory) {
              if (typeof metricsData.memory.used === 'number') {
                metrics.memory.used = metricsData.memory.used;
              }
              
              if (typeof metricsData.memory.total === 'number') {
                metrics.memory.total = metricsData.memory.total;
              }
              
              if (typeof metricsData.memory.percentage === 'number') {
                metrics.memory.percentage = metricsData.memory.percentage;
              } else if (metrics.memory.total > 0) {
                metrics.memory.percentage = (metrics.memory.used / metrics.memory.total) * 100;
              }
            }
            
            if (metricsData.requests) {
              if (typeof metricsData.requests.active === 'number') {
                metrics.requests.active = metricsData.requests.active;
              }
              
              if (typeof metricsData.requests.total === 'number') {
                metrics.requests.total = metricsData.requests.total;
              }
              
              if (typeof metricsData.requests.success === 'number') {
                metrics.requests.success = metricsData.requests.success;
              }
              
              if (typeof metricsData.requests.error === 'number') {
                metrics.requests.error = metricsData.requests.error;
              }
              
              if (typeof metricsData.requests.avgResponseTime === 'number') {
                metrics.requests.avgResponseTime = metricsData.requests.avgResponseTime;
              }
            }
            
            if (metricsData.tokens) {
              if (typeof metricsData.tokens.input === 'number') {
                metrics.tokens.input = metricsData.tokens.input;
              }
              
              if (typeof metricsData.tokens.output === 'number') {
                metrics.tokens.output = metricsData.tokens.output;
              }
            }
            
            if (metricsData.uptime && typeof metricsData.uptime === 'number') {
              metrics.uptime = metricsData.uptime;
            }
          }
        }
      } catch (error) {
        this.logService.debug('ServerMonitoringService', `Error fetching server metrics: ${error.message}`);
      }
      
      // If we couldn't get CPU info from server, try to estimate it
      if (metrics.cpu.usage === 0 && server.processInfo.pid !== 0) {
        try {
          // This is platform-specific and would require a more comprehensive implementation
          // For now, we'll just use a random value
          metrics.cpu.usage = Math.random() * 10; // Mock 0-10% CPU usage
        } catch (error) {
          this.logService.debug('ServerMonitoringService', `Error estimating CPU usage: ${error.message}`);
        }
      }
      
      // If we couldn't get memory info from server, try to estimate it
      if (metrics.memory.used === 0 && server.processInfo.pid !== 0) {
        try {
          // This is platform-specific and would require a more comprehensive implementation
          // For now, we'll just use a random value
          metrics.memory.used = Math.random() * 100 * 1024 * 1024; // Mock 0-100 MB
          metrics.memory.percentage = (metrics.memory.used / metrics.memory.total) * 100;
        } catch (error) {
          this.logService.debug('ServerMonitoringService', `Error estimating memory usage: ${error.message}`);
        }
      }
      
      // Check server health
      try {
        const serverUrl = this.getServerUrl(server.profile);
        
        if (serverUrl && server.options.healthCheckEndpoint) {
          const healthUrl = new URL(server.options.healthCheckEndpoint, serverUrl).toString();
          const healthResponse = await fetch(healthUrl, {
            method: 'GET',
            timeout: 5000,
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!healthResponse.ok) {
            metrics.status = 'error';
            metrics.errors.push(`Health check failed with status ${healthResponse.status}`);
          }
        }
      } catch (error) {
        this.logService.debug('ServerMonitoringService', `Error checking server health: ${error.message}`);
        metrics.status = 'error';
        metrics.errors.push(`Health check failed: ${error.message}`);
      }
      
      return metrics;
    } catch (error) {
      this.logService.error('ServerMonitoringService', `Error collecting server metrics: ${error.message}`);
      
      // Return basic metrics
      return {
        timestamp: new Date(),
        cpu: { usage: 0, cores: os.cpus().length },
        memory: { used: 0, total: os.totalmem(), percentage: 0 },
        requests: { active: 0, total: 0, success: 0, error: 0, avgResponseTime: 0 },
        tokens: { input: 0, output: 0 },
        status: 'error',
        uptime: 0,
        errors: [error.message],
        warnings: []
      };
    }
  }
  
  /**
   * Get server URL from profile
   * @param profile Server profile
   */
  private getServerUrl(profile: IServerProfile): string | null {
    try {
      // Try to find URL in custom settings
      if (profile.customSettings && profile.customSettings.serverUrl) {
        return profile.customSettings.serverUrl;
      }
      
      if (profile.customSettings && profile.customSettings.server && profile.customSettings.server.url) {
        return profile.customSettings.server.url;
      }
      
      // Use localhost with default port
      let port = 3000; // Default port
      
      // Try to find port in custom settings
      if (profile.customSettings && profile.customSettings.port) {
        port = profile.customSettings.port;
      }
      
      if (profile.customSettings && profile.customSettings.server && profile.customSettings.server.port) {
        port = profile.customSettings.server.port;
      }
      
      return `http://localhost:${port}`;
    } catch (error) {
      this.logService.error('ServerMonitoringService', `Error getting server URL: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get all monitored servers
   */
  public getMonitoredServers(): MonitoredServer[] {
    return Array.from(this.servers.values());
  }
  
  /**
   * Get a monitored server by ID
   * @param profileId Server profile ID
   */
  public getMonitoredServer(profileId: string): MonitoredServer | null {
    return this.servers.get(profileId) || null;
  }
  
  /**
   * Get the latest metrics for a server
   * @param profileId Server profile ID
   */
  public getLatestMetrics(profileId: string): ServerMetrics | null {
    const server = this.servers.get(profileId);
    
    if (!server || server.metrics.length === 0) {
      return null;
    }
    
    return server.metrics[server.metrics.length - 1];
  }
  
  /**
   * Get metrics history for a server
   * @param profileId Server profile ID
   * @param limit Maximum number of metrics to return (0 for all)
   */
  public getMetricsHistory(profileId: string, limit: number = 0): ServerMetrics[] {
    const server = this.servers.get(profileId);
    
    if (!server) {
      return [];
    }
    
    if (limit <= 0 || limit >= server.metrics.length) {
      return [...server.metrics];
    }
    
    return server.metrics.slice(-limit);
  }
  
  /**
   * Check if a server is being monitored
   * @param profileId Server profile ID
   */
  public isMonitoring(profileId: string): boolean {
    const server = this.servers.get(profileId);
    return server ? server.isMonitoring : false;
  }
  
  /**
   * Stop all monitoring
   */
  public async stopAllMonitoring(): Promise<void> {
    const profileIds = Array.from(this.servers.keys());
    
    for (const profileId of profileIds) {
      await this.stopMonitoring(profileId);
    }
    
    this.logService.info('ServerMonitoringService', 'Stopped all monitoring');
  }
}
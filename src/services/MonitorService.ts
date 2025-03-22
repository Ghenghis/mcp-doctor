import { EventEmitter } from 'events';
import { getLogger } from '../core/logging';
import { SystemDetector } from '../core/diagnostics/SystemDetector';
import { LogAnalyzer } from '../core/diagnostics/LogAnalyzer';
import { ConfigManager } from '../core/config/ConfigManager';
import { HealthLevel, MCPClient, MCPError, MCPServer, SystemStatus } from '../types';

/**
 * Options for MonitorService
 */
export interface MonitorServiceOptions {
  systemDetector: SystemDetector;
  logAnalyzer: LogAnalyzer;
  configManager: ConfigManager;
  checkInterval?: number;
}

/**
 * Service for monitoring MCP servers
 */
export class MonitorService extends EventEmitter {
  private logger = getLogger('MonitorService');
  private systemDetector: SystemDetector;
  private logAnalyzer: LogAnalyzer;
  private configManager: ConfigManager;
  private checkInterval: number;
  private checkTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastStatus: SystemStatus | null = null;
  private clients: MCPClient[] = [];
  
  constructor(options: MonitorServiceOptions) {
    super();
    
    this.systemDetector = options.systemDetector;
    this.logAnalyzer = options.logAnalyzer;
    this.configManager = options.configManager;
    this.checkInterval = options.checkInterval || 60000; // Default: 1 minute
  }
  
  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.logger.info('Starting monitor service');
    
    // Set running state
    this.isRunning = true;
    
    // Detect clients
    await this.detectClients();
    
    // Initial check
    await this.checkStatus();
    
    // Start periodic checking
    this.checkTimer = setInterval(() => {
      this.checkStatus().catch(error => {
        this.logger.error('Failed to check status', error);
      });
    }, this.checkInterval);
    
    this.logger.info('Monitor service started');
  }
  
  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.logger.info('Stopping monitor service');
    
    // Clear timer
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    
    // Set running state
    this.isRunning = false;
    
    this.logger.info('Monitor service stopped');
  }
  
  /**
   * Check status of all clients and servers
   */
  async checkStatus(): Promise<SystemStatus> {
    this.logger.debug('Checking system status');
    
    // Detect clients if needed
    if (this.clients.length === 0) {
      await this.detectClients();
    }
    
    // Initialize status
    const status: SystemStatus = {
      overall: HealthLevel.Healthy,
      clients: {},
    };
    
    // Check each client
    for (const client of this.clients) {
      // Get client running state
      const clientRunning = await this.systemDetector.isClientRunning(client);
      
      // Initialize client status
      status.clients[client.type] = {
        health: clientRunning ? HealthLevel.Healthy : HealthLevel.Minor,
        servers: {},
      };
      
      // Skip server checks if client is not running
      if (!clientRunning) {
        continue;
      }
      
      // Analyze logs for each server
      const logAnalysis = await this.logAnalyzer.analyzeClientLogs(client);
      
      // Process each server
      for (const server of client.servers) {
        // Get server health
        const serverHealth = this.getServerHealth(server, logAnalysis.errors);
        
        // Update client health if needed
        if (
          serverHealth === HealthLevel.Critical && 
          status.clients[client.type].health !== HealthLevel.Critical
        ) {
          status.clients[client.type].health = HealthLevel.Major;
        } else if (
          serverHealth === HealthLevel.Major && 
          status.clients[client.type].health === HealthLevel.Healthy
        ) {
          status.clients[client.type].health = HealthLevel.Minor;
        }
        
        // Store server health
        status.clients[client.type].servers[server.name] = {
          health: serverHealth,
          errors: logAnalysis.errors.filter(error => error.server?.name === server.name),
        };
      }
      
      // Update overall health
      if (
        status.clients[client.type].health === HealthLevel.Critical && 
        status.overall !== HealthLevel.Critical
      ) {
        status.overall = HealthLevel.Major;
      } else if (
        status.clients[client.type].health === HealthLevel.Major && 
        status.overall === HealthLevel.Healthy
      ) {
        status.overall = HealthLevel.Minor;
      }
    }
    
    // Update last status
    this.lastStatus = status;
    
    // Emit status change
    this.emit('status', status);
    
    this.logger.debug(`System status: ${status.overall}`);
    
    return status;
  }
  
  /**
   * Get the last known status
   */
  getLastStatus(): SystemStatus | null {
    return this.lastStatus;
  }
  
  /**
   * Detect MCP clients
   */
  private async detectClients(): Promise<void> {
    this.logger.info('Detecting MCP clients');
    
    // Detect clients
    const detection = await this.systemDetector.detect();
    
    // Store clients
    this.clients = detection.mcpClients;
    
    this.logger.info(`Detected ${this.clients.length} MCP clients`);
  }
  
  /**
   * Get health level for a server based on errors
   * @param server Server to check
   * @param errors Errors found in logs
   */
  private getServerHealth(server: MCPServer, errors: MCPError[]): HealthLevel {
    // Get errors for this server
    const serverErrors = errors.filter(error => error.server?.name === server.name);
    
    // Check for critical errors
    const hasCriticalErrors = serverErrors.some(error => 
      error.type === 'process_error' || 
      error.type === 'permission_error'
    );
    
    if (hasCriticalErrors) {
      return HealthLevel.Critical;
    }
    
    // Check for major errors
    const hasMajorErrors = serverErrors.some(error => 
      error.type === 'path_error' || 
      error.type === 'config_error'
    );
    
    if (hasMajorErrors) {
      return HealthLevel.Major;
    }
    
    // Check for minor errors
    const hasMinorErrors = serverErrors.some(error => 
      error.type === 'network_error'
    );
    
    if (hasMinorErrors) {
      return HealthLevel.Minor;
    }
    
    // No errors
    return HealthLevel.Healthy;
  }
}
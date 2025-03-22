import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as si from 'systeminformation';
import { getLogger } from '../logging';
import { MCPClient, MCPClientType, MCPServer, Platform } from '../../types';

const execAsync = promisify(exec);

/**
 * System detection options
 */
export interface SystemDetectorOptions {
  // Additional paths to search for MCP clients
  additionalPaths?: string[];
}

/**
 * System detection result
 */
export interface SystemDetectionResult {
  platform: Platform;
  isWSL: boolean;
  nodeVersion?: string;
  mcpClients: MCPClient[];
}

/**
 * Detects system information and MCP clients
 */
export class SystemDetector {
  private logger = getLogger('SystemDetector');
  private options: SystemDetectorOptions;
  
  constructor(options: SystemDetectorOptions = {}) {
    this.options = options;
  }
  
  /**
   * Detect system information and MCP clients
   */
  async detect(): Promise<SystemDetectionResult> {
    this.logger.info('Starting system detection');
    
    // Detect platform
    const platform = this.detectPlatform();
    const isWSL = await this.detectWSL();
    
    // Detect Node.js
    const nodeVersion = await this.detectNodeVersion();
    
    // Detect MCP clients
    const mcpClients = await this.detectMCPClients(platform, isWSL);
    
    this.logger.info(`Detection complete: found ${mcpClients.length} MCP clients`);
    
    return {
      platform,
      isWSL,
      nodeVersion,
      mcpClients,
    };
  }
  
  /**
   * Detect platform (OS)
   */
  private detectPlatform(): Platform {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        return Platform.Windows;
      case 'darwin':
        return Platform.MacOS;
      case 'linux':
        return Platform.Linux;
      default:
        this.logger.warn(`Unknown platform: ${platform}, defaulting to Linux`);
        return Platform.Linux;
    }
  }
  
  /**
   * Detect if running in Windows Subsystem for Linux
   */
  private async detectWSL(): Promise<boolean> {
    if (os.platform() !== 'linux') {
      return false;
    }
    
    try {
      // Check for WSL-specific indicators
      const releaseInfo = await fs.readFile('/proc/version', 'utf-8');
      return releaseInfo.toLowerCase().includes('microsoft') || 
             releaseInfo.toLowerCase().includes('wsl');
    } catch (error) {
      this.logger.debug('Failed to detect WSL', error);
      return false;
    }
  }
  
  /**
   * Detect Node.js version
   */
  private async detectNodeVersion(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync('node --version');
      return stdout.trim();
    } catch (error) {
      this.logger.debug('Failed to detect Node.js version', error);
      return undefined;
    }
  }
  
  /**
   * Detect MCP clients
   */
  private async detectMCPClients(platform: Platform, isWSL: boolean): Promise<MCPClient[]> {
    const clients: MCPClient[] = [];
    
    // Detect Claude Desktop
    const claudeDesktop = await this.detectClaudeDesktop(platform, isWSL);
    if (claudeDesktop) {
      clients.push(claudeDesktop);
    }
    
    // Detect Windsurf
    const windsurf = await this.detectWindsurf(platform, isWSL);
    if (windsurf) {
      clients.push(windsurf);
    }
    
    // Detect Cursor
    const cursor = await this.detectCursor(platform, isWSL);
    if (cursor) {
      clients.push(cursor);
    }
    
    return clients;
  }
  
  /**
   * Detect Claude Desktop
   */
  private async detectClaudeDesktop(platform: Platform, isWSL: boolean): Promise<MCPClient | null> {
    try {
      let configPath: string | null = null;
      
      // Find config file based on platform
      switch (platform) {
        case Platform.Windows:
          configPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
          break;
        case Platform.MacOS:
          configPath = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
          break;
        case Platform.Linux:
          if (isWSL) {
            // Try to find config in Windows path when running in WSL
            const windowsHome = await this.getWindowsHomeFromWSL();
            if (windowsHome) {
              configPath = path.join(windowsHome, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
            }
          }
          break;
      }
      
      if (!configPath || !(await fs.pathExists(configPath))) {
        this.logger.debug(`Claude Desktop config not found at ${configPath}`);
        return null;
      }
      
      // Read config file
      const configJson = await fs.readJson(configPath);
      
      // Extract MCP servers from config
      const servers = this.extractMCPServersFromConfig(configJson);
      
      return {
        type: MCPClientType.ClaudeDesktop,
        name: 'Claude Desktop',
        configPath,
        servers,
      };
    } catch (error) {
      this.logger.debug('Failed to detect Claude Desktop', error);
      return null;
    }
  }
  
  /**
   * Detect Windsurf
   */
  private async detectWindsurf(platform: Platform, isWSL: boolean): Promise<MCPClient | null> {
    try {
      let configPath: string | null = null;
      
      // Find config file based on platform
      switch (platform) {
        case Platform.Windows:
          configPath = path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json');
          break;
        case Platform.MacOS:
          configPath = path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json');
          break;
        case Platform.Linux:
          configPath = path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json');
          if (isWSL) {
            // Try to find config in Windows path when running in WSL
            const windowsHome = await this.getWindowsHomeFromWSL();
            if (windowsHome) {
              configPath = path.join(windowsHome, '.codeium', 'windsurf', 'mcp_config.json');
            }
          }
          break;
      }
      
      if (!configPath || !(await fs.pathExists(configPath))) {
        this.logger.debug(`Windsurf config not found at ${configPath}`);
        return null;
      }
      
      // Read config file
      const configJson = await fs.readJson(configPath);
      
      // Extract MCP servers from config
      const servers = this.extractMCPServersFromConfig(configJson);
      
      return {
        type: MCPClientType.Windsurf,
        name: 'Windsurf Editor',
        configPath,
        servers,
      };
    } catch (error) {
      this.logger.debug('Failed to detect Windsurf', error);
      return null;
    }
  }
  
  /**
   * Detect Cursor
   */
  private async detectCursor(platform: Platform, isWSL: boolean): Promise<MCPClient | null> {
    try {
      let configPath: string | null = null;
      
      // Find config file based on platform
      switch (platform) {
        case Platform.Windows:
          configPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
          break;
        case Platform.MacOS:
          configPath = path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
          break;
        case Platform.Linux:
          configPath = path.join(os.homedir(), '.config', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
          if (isWSL) {
            // Try to find config in Windows path when running in WSL
            const windowsHome = await this.getWindowsHomeFromWSL();
            if (windowsHome) {
              configPath = path.join(windowsHome, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
            }
          }
          break;
      }
      
      if (!configPath || !(await fs.pathExists(configPath))) {
        this.logger.debug(`Cursor config not found at ${configPath}`);
        return null;
      }
      
      // Read config file
      const configJson = await fs.readJson(configPath);
      
      // Extract MCP servers from config
      const servers = this.extractMCPServersFromConfig(configJson);
      
      return {
        type: MCPClientType.Cursor,
        name: 'Cursor',
        configPath,
        servers,
      };
    } catch (error) {
      this.logger.debug('Failed to detect Cursor', error);
      return null;
    }
  }
  
  /**
   * Extract MCP servers from config file
   */
  private extractMCPServersFromConfig(config: any): MCPServer[] {
    const servers: MCPServer[] = [];
    
    // Check if mcpServers is defined in config
    if (!config.mcpServers) {
      return servers;
    }
    
    // Extract servers
    for (const [name, serverConfig] of Object.entries<any>(config.mcpServers)) {
      servers.push({
        name,
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env || {},
      });
    }
    
    return servers;
  }
  
  /**
   * Get Windows home directory from WSL
   */
  private async getWindowsHomeFromWSL(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('wslpath -u "$(wslvar USERPROFILE)"');
      return stdout.trim();
    } catch (error) {
      this.logger.debug('Failed to get Windows home from WSL', error);
      return null;
    }
  }
  
  /**
   * Check if an MCP client is running
   */
  async isClientRunning(client: MCPClient): Promise<boolean> {
    try {
      const processes = await si.processes();
      
      // Get process name based on client type
      let processName: string;
      switch (client.type) {
        case MCPClientType.ClaudeDesktop:
          processName = 'Claude';
          break;
        case MCPClientType.Windsurf:
          processName = 'Windsurf';
          break;
        case MCPClientType.Cursor:
          processName = 'Cursor';
          break;
        default:
          return false;
      }
      
      // Check if process is running
      return processes.list.some(process => 
        process.name.includes(processName) || 
        (process.command && process.command.includes(processName))
      );
    } catch (error) {
      this.logger.error('Failed to check if client is running', error);
      return false;
    }
  }
}
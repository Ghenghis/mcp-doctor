import * as fs from 'fs-extra';
import * as path from 'path';
import { getLogger } from '../logging';
import { MCPClient, MCPClientType, MCPServer, Platform } from '../../types';

/**
 * Configuration update to apply
 */
export interface ConfigUpdate {
  serverName: string;
  field: 'command' | 'args' | 'env';
  value: any;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Manages MCP client configurations
 */
export class ConfigManager {
  private logger = getLogger('ConfigManager');
  
  constructor() {}
  
  /**
   * Read configuration file
   * @param configPath Path to configuration file
   */
  async readConfig(configPath: string): Promise<any> {
    try {
      this.logger.debug(`Reading config from ${configPath}`);
      return await fs.readJson(configPath);
    } catch (error) {
      this.logger.error(`Failed to read config: ${configPath}`, error);
      throw new Error(`Failed to read configuration file: ${configPath}`);
    }
  }
  
  /**
   * Write configuration file
   * @param configPath Path to configuration file
   * @param config Configuration object
   */
  async writeConfig(configPath: string, config: any): Promise<void> {
    try {
      this.logger.debug(`Writing config to ${configPath}`);
      await fs.writeJson(configPath, config, { spaces: 2 });
    } catch (error) {
      this.logger.error(`Failed to write config: ${configPath}`, error);
      throw new Error(`Failed to write configuration file: ${configPath}`);
    }
  }
  
  /**
   * Update client configuration
   * @param client MCP client
   * @param updates Configuration updates to apply
   */
  async updateClientConfig(client: MCPClient, updates: ConfigUpdate[]): Promise<void> {
    this.logger.info(`Updating ${client.name} configuration`);
    
    // Read current config
    let config = await this.readConfig(client.configPath);
    
    // Ensure mcpServers section exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    
    // Apply updates
    for (const update of updates) {
      const { serverName, field, value } = update;
      
      // Create server config if it doesn't exist
      if (!config.mcpServers[serverName]) {
        config.mcpServers[serverName] = {
          command: '',
          args: [],
          env: {},
        };
      }
      
      // Update the field
      config.mcpServers[serverName][field] = value;
    }
    
    // Validate the updated config
    const validation = this.validateConfig(config, client.type);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    // Write updated config
    await this.writeConfig(client.configPath, config);
    
    this.logger.info(`Updated ${client.name} configuration`);
  }
  
  /**
   * Add server to client configuration
   * @param client MCP client
   * @param server MCP server to add
   */
  async addServer(client: MCPClient, server: MCPServer): Promise<void> {
    this.logger.info(`Adding server ${server.name} to ${client.name}`);
    
    // Read current config
    let config = await this.readConfig(client.configPath);
    
    // Ensure mcpServers section exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    
    // Check if server already exists
    if (config.mcpServers[server.name]) {
      throw new Error(`Server ${server.name} already exists in ${client.name} configuration`);
    }
    
    // Add server
    config.mcpServers[server.name] = {
      command: server.command,
      args: server.args,
      env: server.env,
    };
    
    // Validate the updated config
    const validation = this.validateConfig(config, client.type);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    // Write updated config
    await this.writeConfig(client.configPath, config);
    
    this.logger.info(`Added server ${server.name} to ${client.name}`);
  }
  
  /**
   * Remove server from client configuration
   * @param client MCP client
   * @param serverName Name of server to remove
   */
  async removeServer(client: MCPClient, serverName: string): Promise<void> {
    this.logger.info(`Removing server ${serverName} from ${client.name}`);
    
    // Read current config
    let config = await this.readConfig(client.configPath);
    
    // Check if mcpServers section exists
    if (!config.mcpServers) {
      throw new Error(`No servers configured in ${client.name}`);
    }
    
    // Check if server exists
    if (!config.mcpServers[serverName]) {
      throw new Error(`Server ${serverName} not found in ${client.name} configuration`);
    }
    
    // Remove server
    delete config.mcpServers[serverName];
    
    // Write updated config
    await this.writeConfig(client.configPath, config);
    
    this.logger.info(`Removed server ${serverName} from ${client.name}`);
  }
  
  /**
   * Enable server in client configuration
   * @param client MCP client
   * @param serverName Name of server to enable
   * @param serverConfig Server configuration
   */
  async enableServer(client: MCPClient, serverName: string, serverConfig: Partial<MCPServer>): Promise<void> {
    this.logger.info(`Enabling server ${serverName} in ${client.name}`);
    
    // Read current config
    let config = await this.readConfig(client.configPath);
    
    // Ensure mcpServers section exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    
    // Add or update server
    config.mcpServers[serverName] = {
      command: serverConfig.command || '',
      args: serverConfig.args || [],
      env: serverConfig.env || {},
    };
    
    // Validate the updated config
    const validation = this.validateConfig(config, client.type);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    // Write updated config
    await this.writeConfig(client.configPath, config);
    
    this.logger.info(`Enabled server ${serverName} in ${client.name}`);
  }
  
  /**
   * Disable server in client configuration
   * @param client MCP client
   * @param serverName Name of server to disable
   */
  async disableServer(client: MCPClient, serverName: string): Promise<MCPServer | null> {
    this.logger.info(`Disabling server ${serverName} in ${client.name}`);
    
    // Read current config
    let config = await this.readConfig(client.configPath);
    
    // Check if mcpServers section exists
    if (!config.mcpServers) {
      throw new Error(`No servers configured in ${client.name}`);
    }
    
    // Check if server exists
    if (!config.mcpServers[serverName]) {
      throw new Error(`Server ${serverName} not found in ${client.name} configuration`);
    }
    
    // Get server configuration before removing
    const serverConfig = config.mcpServers[serverName];
    const server: MCPServer = {
      name: serverName,
      command: serverConfig.command,
      args: serverConfig.args || [],
      env: serverConfig.env || {},
    };
    
    // Remove server
    delete config.mcpServers[serverName];
    
    // Write updated config
    await this.writeConfig(client.configPath, config);
    
    this.logger.info(`Disabled server ${serverName} in ${client.name}`);
    
    return server;
  }
  
  /**
   * Validate configuration
   * @param config Configuration object
   * @param clientType MCP client type
   */
  validateConfig(config: any, clientType: MCPClientType): ConfigValidationResult {
    const errors: string[] = [];
    
    // Check if mcpServers is defined
    if (!config.mcpServers) {
      errors.push('Missing mcpServers section');
      return { valid: false, errors };
    }
    
    // Check each server configuration
    for (const [serverName, serverConfig] of Object.entries<any>(config.mcpServers)) {
      // Check server name
      if (!serverName || serverName.trim() === '') {
        errors.push('Server name cannot be empty');
      }
      
      // Check command
      if (!serverConfig.command) {
        errors.push(`Server ${serverName}: Missing command`);
      }
      
      // Check args
      if (serverConfig.args && !Array.isArray(serverConfig.args)) {
        errors.push(`Server ${serverName}: args must be an array`);
      }
      
      // Check env
      if (serverConfig.env && typeof serverConfig.env !== 'object') {
        errors.push(`Server ${serverName}: env must be an object`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Create template configuration for a client
   * @param clientType MCP client type
   * @param configPath Path to save configuration
   */
  async createTemplateConfig(clientType: MCPClientType, configPath: string): Promise<void> {
    this.logger.info(`Creating template config for ${clientType} at ${configPath}`);
    
    // Create template config
    const config: any = {
      mcpServers: {
        'mcp-doctor': {
          command: 'npx',
          args: ['-y', 'mcp-doctor'],
          env: {},
        },
      },
    };
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(configPath));
    
    // Write config
    await this.writeConfig(configPath, config);
    
    this.logger.info(`Created template config for ${clientType}`);
  }
  
  /**
   * Repair configuration file
   * @param configPath Path to configuration file
   * @param clientType MCP client type
   */
  async repairConfig(configPath: string, clientType: MCPClientType): Promise<boolean> {
    this.logger.info(`Repairing config at ${configPath}`);
    
    try {
      // Check if file exists
      if (!(await fs.pathExists(configPath))) {
        // Create template config
        await this.createTemplateConfig(clientType, configPath);
        return true;
      }
      
      // Try to read config
      let config: any;
      try {
        config = await this.readConfig(configPath);
      } catch (error) {
        // Invalid JSON, create backup and template
        const backupPath = `${configPath}.backup-${Date.now()}`;
        await fs.copy(configPath, backupPath);
        this.logger.info(`Created backup of invalid config at ${backupPath}`);
        
        // Create template config
        await this.createTemplateConfig(clientType, configPath);
        return true;
      }
      
      // Validate config
      const validation = this.validateConfig(config, clientType);
      if (!validation.valid) {
        // Invalid config, fix issues
        if (!config.mcpServers) {
          config.mcpServers = {};
        }
        
        // Write fixed config
        await this.writeConfig(configPath, config);
        return true;
      }
      
      // Config is valid
      return false;
    } catch (error) {
      this.logger.error(`Failed to repair config at ${configPath}`, error);
      throw error;
    }
  }
}
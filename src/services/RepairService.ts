import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';
import { getLogger } from '../core/logging';
import { SystemDetector } from '../core/diagnostics/SystemDetector';
import { ConfigManager } from '../core/config/ConfigManager';
import { BackupManager } from '../core/backup/BackupManager';
import { Change, ChangeType, ErrorType, Fix, FixResult, MCPClient, MCPError, MCPServer, RepairPlan } from '../types';

/**
 * Options for RepairService
 */
export interface RepairServiceOptions {
  systemDetector: SystemDetector;
  configManager: ConfigManager;
  backupManager: BackupManager;
}

/**
 * Service for repairing MCP servers
 */
export class RepairService extends EventEmitter {
  private logger = getLogger('RepairService');
  private systemDetector: SystemDetector;
  private configManager: ConfigManager;
  private backupManager: BackupManager;
  
  constructor(options: RepairServiceOptions) {
    super();
    
    this.systemDetector = options.systemDetector;
    this.configManager = options.configManager;
    this.backupManager = options.backupManager;
  }
  
  /**
   * Start repair service
   */
  async start(): Promise<void> {
    this.logger.info('Starting repair service');
    
    // Initialize backup manager
    await this.backupManager.initialize();
    
    this.logger.info('Repair service started');
  }
  
  /**
   * Stop repair service
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping repair service');
    this.logger.info('Repair service stopped');
  }
  
  /**
   * Create repair plan for errors
   * @param client MCP client
   * @param errors Errors to fix
   */
  async createRepairPlan(client: MCPClient, errors: MCPError[]): Promise<RepairPlan> {
    this.logger.info(`Creating repair plan for ${client.name} with ${errors.length} errors`);
    
    const fixes: Fix[] = [];
    let requiresConfirmation = false;
    
    // Group errors by server and type
    const serverErrors = new Map<string, MCPError[]>();
    
    for (const error of errors) {
      if (!error.server) {
        continue;
      }
      
      const serverName = error.server.name;
      
      if (!serverErrors.has(serverName)) {
        serverErrors.set(serverName, []);
      }
      
      serverErrors.get(serverName)!.push(error);
    }
    
    // Process each server
    for (const [serverName, serverErrorList] of serverErrors.entries()) {
      const server = client.servers.find(s => s.name === serverName);
      
      if (!server) {
        continue;
      }
      
      // Process path errors
      const pathErrors = serverErrorList.filter(e => e.type === ErrorType.PathError);
      if (pathErrors.length > 0) {
        const pathFix = this.createPathErrorFix(client, server, pathErrors);
        if (pathFix) {
          fixes.push(pathFix);
          
          // Path fixes usually require confirmation
          requiresConfirmation = true;
        }
      }
      
      // Process permission errors
      const permissionErrors = serverErrorList.filter(e => e.type === ErrorType.PermissionError);
      if (permissionErrors.length > 0) {
        const permissionFix = this.createPermissionErrorFix(client, server, permissionErrors);
        if (permissionFix) {
          fixes.push(permissionFix);
          
          // Permission fixes always require confirmation
          requiresConfirmation = true;
        }
      }
      
      // Process config errors
      const configErrors = serverErrorList.filter(e => e.type === ErrorType.ConfigError);
      if (configErrors.length > 0) {
        const configFix = this.createConfigErrorFix(client, server, configErrors);
        if (configFix) {
          fixes.push(configFix);
        }
      }
    }
    
    return {
      errors,
      fixes,
      requiresConfirmation,
    };
  }
  
  /**
   * Apply repair plan
   * @param client MCP client
   * @param plan Repair plan to apply
   */
  async applyRepairPlan(client: MCPClient, plan: RepairPlan): Promise<FixResult[]> {
    this.logger.info(`Applying repair plan with ${plan.fixes.length} fixes`);
    
    const results: FixResult[] = [];
    
    // Create backup before applying fixes
    await this.backupManager.createBackup(client);
    
    // Apply each fix
    for (const fix of plan.fixes) {
      // Apply fix based on error type
      let result: FixResult;
      
      switch (fix.error.type) {
        case ErrorType.PathError:
          result = await this.applyPathErrorFix(client, fix);
          break;
        
        case ErrorType.PermissionError:
          result = await this.applyPermissionErrorFix(client, fix);
          break;
        
        case ErrorType.ConfigError:
          result = await this.applyConfigErrorFix(client, fix);
          break;
        
        default:
          result = {
            success: false,
            error: {
              type: ErrorType.UnknownError,
              message: `Cannot fix error of type: ${fix.error.type}`,
              fixable: false,
            },
          };
      }
      
      // Store result
      results.push(result);
      
      // Emit fix applied event
      this.emit('fixApplied', { fix, result });
    }
    
    return results;
  }
  
  /**
   * Create fix for path errors
   * @param client MCP client
   * @param server Server with path errors
   * @param errors Path errors to fix
   */
  private createPathErrorFix(client: MCPClient, server: MCPServer, errors: MCPError[]): Fix | null {
    // Check if any errors indicate command not found
    const commandNotFoundError = errors.find(e => e.message.includes('not found in PATH'));
    
    if (commandNotFoundError) {
      // Extract command name
      const match = commandNotFoundError.message.match(/"([^"]+)"/);
      if (match && match[1]) {
        const command = match[1];
        
        // Find alternative command or path
        const alternativeCommand = this.findAlternativeCommand(command);
        
        if (alternativeCommand) {
          return {
            error: commandNotFoundError,
            description: `Fix ${command} command by using ${alternativeCommand}`,
            changes: [
              {
                type: ChangeType.Command,
                description: `Replace ${command} with ${alternativeCommand}`,
                server,
                before: server.command,
                after: alternativeCommand,
              },
            ],
            automaticFix: true,
          };
        } else {
          // Suggest installing the command
          return {
            error: commandNotFoundError,
            description: `Install ${command} command`,
            changes: [
              {
                type: ChangeType.Command,
                description: `Install ${command}`,
                server,
                before: server.command,
                after: server.command,
              },
            ],
            automaticFix: false,
          };
        }
      }
    }
    
    // Check for module not found errors
    const moduleNotFoundError = errors.find(e => e.message.includes('Module not found'));
    
    if (moduleNotFoundError) {
      return {
        error: moduleNotFoundError,
        description: 'Install missing module',
        changes: [
          {
            type: ChangeType.Package,
            description: 'Install missing module',
            server,
            before: null,
            after: null,
          },
        ],
        automaticFix: false,
      };
    }
    
    return null;
  }
  
  /**
   * Apply path error fix
   * @param client MCP client
   * @param fix Fix to apply
   */
  private async applyPathErrorFix(client: MCPClient, fix: Fix): Promise<FixResult> {
    try {
      const commandChange = fix.changes.find(c => c.type === ChangeType.Command);
      
      if (commandChange && fix.automaticFix) {
        // Update server command
        await this.configManager.updateClientConfig(client, [
          {
            serverName: commandChange.server.name,
            field: 'command',
            value: commandChange.after,
          },
        ]);
        
        return {
          success: true,
          changes: [commandChange],
        };
      }
      
      // Cannot fix automatically
      return {
        success: false,
        error: {
          type: ErrorType.PathError,
          message: 'Cannot fix path error automatically',
          fixable: false,
        },
      };
    } catch (error) {
      this.logger.error('Failed to apply path error fix', error);
      
      return {
        success: false,
        error: {
          type: ErrorType.UnknownError,
          message: `Failed to apply path error fix: ${error instanceof Error ? error.message : String(error)}`,
          fixable: false,
        },
      };
    }
  }
  
  /**
   * Create fix for permission errors
   * @param client MCP client
   * @param server Server with permission errors
   * @param errors Permission errors to fix
   */
  private createPermissionErrorFix(client: MCPClient, server: MCPServer, errors: MCPError[]): Fix | null {
    // Permission errors are usually related to file access
    return {
      error: errors[0],
      description: 'Fix permission issues',
      changes: [
        {
          type: ChangeType.Permission,
          description: 'Fix permissions for server files',
          server,
          before: null,
          after: null,
        },
      ],
      automaticFix: false,
    };
  }
  
  /**
   * Apply permission error fix
   * @param client MCP client
   * @param fix Fix to apply
   */
  private async applyPermissionErrorFix(client: MCPClient, fix: Fix): Promise<FixResult> {
    // Permission fixes cannot be applied automatically
    return {
      success: false,
      error: {
        type: ErrorType.PermissionError,
        message: 'Cannot fix permission error automatically',
        fixable: false,
      },
    };
  }
  
  /**
   * Create fix for config errors
   * @param client MCP client
   * @param server Server with config errors
   * @param errors Config errors to fix
   */
  private createConfigErrorFix(client: MCPClient, server: MCPServer, errors: MCPError[]): Fix | null {
    // Config errors usually require schema validation
    // Attempt to fix JSON syntax errors
    return {
      error: errors[0],
      description: 'Fix configuration syntax',
      changes: [
        {
          type: ChangeType.Config,
          description: 'Repair configuration syntax',
          server,
          before: null,
          after: null,
        },
      ],
      automaticFix: true,
    };
  }
  
  /**
   * Apply config error fix
   * @param client MCP client
   * @param fix Fix to apply
   */
  private async applyConfigErrorFix(client: MCPClient, fix: Fix): Promise<FixResult> {
    try {
      // Attempt to repair config file
      const repaired = await this.configManager.repairConfig(client.configPath, client.type);
      
      if (repaired) {
        return {
          success: true,
          changes: fix.changes,
        };
      }
      
      // Config already valid
      return {
        success: false,
        error: {
          type: ErrorType.ConfigError,
          message: 'Configuration already valid',
          fixable: false,
        },
      };
    } catch (error) {
      this.logger.error('Failed to apply config error fix', error);
      
      return {
        success: false,
        error: {
          type: ErrorType.UnknownError,
          message: `Failed to apply config error fix: ${error instanceof Error ? error.message : String(error)}`,
          fixable: false,
        },
      };
    }
  }
  
  /**
   * Find alternative command for a missing command
   * @param command Missing command
   */
  private findAlternativeCommand(command: string): string | null {
    // Common command alternatives
    const alternatives: Record<string, string[]> = {
      node: ['nodejs', process.execPath],
      nodejs: ['node', process.execPath],
      npm: [path.join(path.dirname(process.execPath), 'npm')],
      npx: [path.join(path.dirname(process.execPath), 'npx'), 'npm exec'],
      python: ['python3', 'py'],
      python3: ['python', 'py'],
      pip: ['pip3'],
      pip3: ['pip'],
    };
    
    // Check for alternatives
    if (alternatives[command]) {
      for (const alt of alternatives[command]) {
        try {
          // Try if alternative exists
          execSync(`${alt} --version`, { stdio: 'ignore' });
          return alt;
        } catch (error) {
          // Alternative not found
        }
      }
    }
    
    // Check if this is a local command in node_modules
    try {
      const nodeModulesBin = path.join(process.cwd(), 'node_modules', '.bin', command);
      if (fs.existsSync(nodeModulesBin)) {
        return nodeModulesBin;
      }
    } catch (error) {
      // Node modules bin not found
    }
    
    return null;
  }
  
  /**
   * Fix all detected issues automatically
   * @param client MCP client
   */
  async fixAllIssues(client: MCPClient, errors: MCPError[]): Promise<FixResult[]> {
    this.logger.info(`Fixing all issues for ${client.name}`);
    
    // Create repair plan
    const plan = await this.createRepairPlan(client, errors);
    
    // Filter for automatic fixes
    const automaticFixes = plan.fixes.filter(fix => fix.automaticFix);
    
    // Create a new plan with only automatic fixes
    const automaticPlan: RepairPlan = {
      errors: plan.errors,
      fixes: automaticFixes,
      requiresConfirmation: false,
    };
    
    // Apply automatic fixes
    return await this.applyRepairPlan(client, automaticPlan);
  }
  
  /**
   * Auto-repair MCP client
   * @param client MCP client
   */
  async autoRepair(client: MCPClient): Promise<boolean> {
    this.logger.info(`Auto-repairing ${client.name}`);
    
    try {
      // Create backup
      await this.backupManager.createAutomaticBackupIfNeeded(client);
      
      // Verify config file
      const configRepaired = await this.configManager.repairConfig(client.configPath, client.type);
      
      if (configRepaired) {
        this.logger.info(`Repaired ${client.name} configuration`);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to auto-repair ${client.name}`, error);
      return false;
    }
  }
}
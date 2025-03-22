import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { getLogger } from '../logging';
import { ErrorType, MCPClient, MCPClientType, MCPError, MCPServer, Platform } from '../../types';

/**
 * Log analysis result
 */
export interface LogAnalysisResult {
  errors: MCPError[];
  warnings: string[];
  serverStatus: Record<string, boolean>;
}

/**
 * Error pattern definition
 */
interface ErrorPattern {
  regex: RegExp;
  type: ErrorType;
  message: string;
  fixable: boolean;
}

/**
 * Analyzes MCP server logs
 */
export class LogAnalyzer {
  private logger = getLogger('LogAnalyzer');
  
  // Common error patterns to detect
  private errorPatterns: ErrorPattern[] = [
    {
      regex: /spawn\s+(\w+)\s+ENOENT/i,
      type: ErrorType.PathError,
      message: 'Command not found in PATH',
      fixable: true,
    },
    {
      regex: /Error: connect ECONNREFUSED/i,
      type: ErrorType.NetworkError,
      message: 'Connection refused',
      fixable: false,
    },
    {
      regex: /EACCES: permission denied/i,
      type: ErrorType.PermissionError,
      message: 'Permission denied',
      fixable: true,
    },
    {
      regex: /Error: Cannot find module/i,
      type: ErrorType.PathError,
      message: 'Module not found',
      fixable: true,
    },
    {
      regex: /SyntaxError: Unexpected token/i,
      type: ErrorType.ConfigError,
      message: 'Invalid configuration syntax',
      fixable: true,
    },
    {
      regex: /Error: Failed to start server/i,
      type: ErrorType.ProcessError,
      message: 'Failed to start server',
      fixable: true,
    },
  ];
  
  constructor() {}
  
  /**
   * Get log file path for a client
   * @param client MCP client
   */
  getLogFilePaths(client: MCPClient): string[] {
    const logPaths: string[] = [];
    
    switch (client.type) {
      case MCPClientType.ClaudeDesktop:
        if (os.platform() === 'win32') {
          logPaths.push(path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'logs', 'mcp-server-*.log'));
        } else if (os.platform() === 'darwin') {
          logPaths.push(path.join(os.homedir(), 'Library', 'Logs', 'Claude', 'mcp-server-*.log'));
        }
        break;
      
      case MCPClientType.Windsurf:
        if (os.platform() === 'win32') {
          logPaths.push(path.join(os.homedir(), '.codeium', 'windsurf', 'logs', 'mcp-*.log'));
        } else if (os.platform() === 'darwin') {
          logPaths.push(path.join(os.homedir(), '.codeium', 'windsurf', 'logs', 'mcp-*.log'));
        } else {
          logPaths.push(path.join(os.homedir(), '.codeium', 'windsurf', 'logs', 'mcp-*.log'));
        }
        break;
      
      case MCPClientType.Cursor:
        if (os.platform() === 'win32') {
          logPaths.push(path.join(os.homedir(), 'AppData', 'Roaming', 'Cursor', 'logs', 'mcp-*.log'));
        } else if (os.platform() === 'darwin') {
          logPaths.push(path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'logs', 'mcp-*.log'));
        } else {
          logPaths.push(path.join(os.homedir(), '.config', 'Cursor', 'logs', 'mcp-*.log'));
        }
        break;
    }
    
    return logPaths;
  }
  
  /**
   * Find log files matching pattern
   * @param pattern Log file pattern
   */
  private async findLogFiles(pattern: string): Promise<string[]> {
    try {
      const dir = path.dirname(pattern);
      const filePattern = path.basename(pattern);
      
      // Check if directory exists
      if (!(await fs.pathExists(dir))) {
        return [];
      }
      
      // List files in directory
      const files = await fs.readdir(dir);
      
      // Match files against pattern
      const regex = new RegExp(filePattern.replace('*', '.*'));
      const matchingFiles = files.filter(file => regex.test(file));
      
      // Return full paths
      return matchingFiles.map(file => path.join(dir, file));
    } catch (error) {
      this.logger.error(`Failed to find log files for pattern: ${pattern}`, error);
      return [];
    }
  }
  
  /**
   * Analyze log file
   * @param logPath Log file path
   * @param server Server to analyze logs for
   */
  async analyzeLogFile(logPath: string, server?: MCPServer): Promise<MCPError[]> {
    try {
      this.logger.debug(`Analyzing log file: ${logPath}`);
      
      // Read log file
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n');
      
      // Analyze log content
      return this.analyzeLogContent(lines, server);
    } catch (error) {
      this.logger.error(`Failed to analyze log file: ${logPath}`, error);
      return [];
    }
  }
  
  /**
   * Analyze log content
   * @param lines Log file lines
   * @param server Server to analyze logs for
   */
  analyzeLogContent(lines: string[], server?: MCPServer): MCPError[] {
    const errors: MCPError[] = [];
    
    // Process each line
    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) {
        continue;
      }
      
      // Look for error patterns
      for (const pattern of this.errorPatterns) {
        const match = line.match(pattern.regex);
        if (match) {
          let message = pattern.message;
          
          // Extract more specific details if available
          if (pattern.type === ErrorType.PathError && match[1]) {
            message = `Command "${match[1]}" not found in PATH`;
          }
          
          errors.push({
            type: pattern.type,
            message,
            details: line,
            server,
            fixable: pattern.fixable,
          });
          
          // Only match one pattern per line
          break;
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Analyze logs for a client
   * @param client MCP client
   */
  async analyzeClientLogs(client: MCPClient): Promise<LogAnalysisResult> {
    this.logger.info(`Analyzing logs for ${client.name}`);
    
    const result: LogAnalysisResult = {
      errors: [],
      warnings: [],
      serverStatus: {},
    };
    
    // Get log paths
    const logPathPatterns = this.getLogFilePaths(client);
    
    // Process each log path pattern
    for (const pattern of logPathPatterns) {
      // Find log files matching pattern
      const logFiles = await this.findLogFiles(pattern);
      
      if (logFiles.length === 0) {
        result.warnings.push(`No log files found matching pattern: ${pattern}`);
        continue;
      }
      
      // Analyze each log file
      for (const logFile of logFiles) {
        // Extract server name from log file name if possible
        const fileName = path.basename(logFile);
        const serverNameMatch = fileName.match(/mcp-server-(.*?)\.log/);
        const serverName = serverNameMatch ? serverNameMatch[1] : undefined;
        
        // Find matching server in client
        let server: MCPServer | undefined;
        if (serverName) {
          server = client.servers.find(s => s.name === serverName);
        }
        
        // Analyze log file
        const errors = await this.analyzeLogFile(logFile, server);
        result.errors.push(...errors);
        
        // Update server status
        if (serverName) {
          // Check if server has critical errors
          const hasCriticalErrors = errors.some(error => 
            error.type === ErrorType.ProcessError || 
            error.type === ErrorType.PathError
          );
          
          result.serverStatus[serverName] = !hasCriticalErrors;
        }
      }
    }
    
    this.logger.info(`Found ${result.errors.length} errors and ${result.warnings.length} warnings for ${client.name}`);
    
    return result;
  }
  
  /**
   * Check log file for specific error pattern
   * @param logPath Log file path
   * @param errorType Error type to look for
   */
  async checkForErrorPattern(logPath: string, errorType: ErrorType): Promise<boolean> {
    try {
      // Read log file
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n');
      
      // Find matching patterns
      const matchingPatterns = this.errorPatterns.filter(pattern => pattern.type === errorType);
      
      // Check each line
      for (const line of lines) {
        for (const pattern of matchingPatterns) {
          if (pattern.regex.test(line)) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to check log file for error pattern: ${logPath}`, error);
      return false;
    }
  }
  
  /**
   * Clear log file
   * @param logPath Log file path
   */
  async clearLogFile(logPath: string): Promise<boolean> {
    try {
      await fs.writeFile(logPath, '', 'utf-8');
      return true;
    } catch (error) {
      this.logger.error(`Failed to clear log file: ${logPath}`, error);
      return false;
    }
  }
  
  /**
   * Add custom error pattern
   * @param pattern Error pattern to add
   */
  addErrorPattern(pattern: ErrorPattern): void {
    this.errorPatterns.push(pattern);
  }
  
  /**
   * Get fix suggestions for errors
   * @param errors Errors to get fixes for
   */
  getFixSuggestions(errors: MCPError[]): Record<string, string> {
    const suggestions: Record<string, string> = {};
    
    for (const error of errors) {
      if (!error.fixable) {
        continue;
      }
      
      const errorKey = `${error.type}-${error.message}`;
      
      switch (error.type) {
        case ErrorType.PathError:
          // Command not found
          if (error.message.includes('not found in PATH')) {
            const commandMatch = error.message.match(/"([^"]+)"/);
            if (commandMatch && commandMatch[1]) {
              const command = commandMatch[1];
              
              if (command === 'node' || command === 'nodejs') {
                suggestions[errorKey] = 'Install Node.js from https://nodejs.org/';
              } else if (command === 'npm') {
                suggestions[errorKey] = 'Install npm by installing Node.js from https://nodejs.org/';
              } else if (command === 'npx') {
                suggestions[errorKey] = 'Install npx by running "npm install -g npx"';
              } else if (command === 'python' || command === 'python3') {
                suggestions[errorKey] = 'Install Python from https://www.python.org/';
              } else if (command === 'pip' || command === 'pip3') {
                suggestions[errorKey] = 'Install pip by installing Python from https://www.python.org/';
              } else {
                suggestions[errorKey] = `Install ${command} or update your PATH environment variable`;
              }
            }
          }
          // Module not found
          else if (error.message.includes('Module not found')) {
            suggestions[errorKey] = 'Install the missing module using npm or yarn';
          }
          break;
        
        case ErrorType.PermissionError:
          suggestions[errorKey] = 'Fix file permissions or run with elevated privileges';
          break;
        
        case ErrorType.ConfigError:
          suggestions[errorKey] = 'Check and fix the configuration file syntax';
          break;
        
        case ErrorType.ProcessError:
          suggestions[errorKey] = 'Check the server process and its dependencies';
          break;
      }
    }
    
    return suggestions;
  }
}
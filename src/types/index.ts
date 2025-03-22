/**
 * Supported platforms
 */
export enum Platform {
  Windows = 'windows',
  MacOS = 'macos',
  Linux = 'linux',
}

/**
 * MCP client types
 */
export enum MCPClientType {
  ClaudeDesktop = 'claude_desktop',
  Windsurf = 'windsurf',
  Cursor = 'cursor',
  Custom = 'custom',
}

/**
 * MCP server definition
 */
export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  status?: MCPServerStatus;
}

/**
 * MCP server status
 */
export enum MCPServerStatus {
  Unknown = 'unknown',
  Running = 'running',
  Stopped = 'stopped',
  Error = 'error',
}

/**
 * MCP client definition
 */
export interface MCPClient {
  type: MCPClientType;
  name: string;
  configPath: string;
  servers: MCPServer[];
}

/**
 * Error type
 */
export enum ErrorType {
  PathError = 'path_error',
  EnvError = 'env_error',
  PermissionError = 'permission_error',
  ConfigError = 'config_error',
  NetworkError = 'network_error',
  ProcessError = 'process_error',
  UnknownError = 'unknown_error',
}

/**
 * Error definition
 */
export interface MCPError {
  type: ErrorType;
  message: string;
  details?: any;
  server?: MCPServer;
  client?: MCPClient;
  fixable: boolean;
}

/**
 * Health level
 */
export enum HealthLevel {
  Healthy = 'healthy',
  Minor = 'minor',
  Major = 'major',
  Critical = 'critical',
}

/**
 * System status
 */
export interface SystemStatus {
  overall: HealthLevel;
  clients: {
    [clientId: string]: {
      health: HealthLevel;
      servers: {
        [serverId: string]: {
          health: HealthLevel;
          errors: MCPError[];
        };
      };
    };
  };
}

/**
 * Fix result
 */
export interface FixResult {
  success: boolean;
  error?: MCPError;
  changes?: Change[];
}

/**
 * Change type
 */
export enum ChangeType {
  Path = 'path',
  Command = 'command',
  Argument = 'argument',
  Environment = 'environment',
  Permission = 'permission',
  Config = 'config',
  Package = 'package',
}

/**
 * Change definition
 */
export interface Change {
  type: ChangeType;
  description: string;
  server: MCPServer;
  before?: any;
  after?: any;
}

/**
 * Backup info
 */
export interface BackupInfo {
  id: string;
  clientType: MCPClientType;
  configPath: string;
  backupPath: string;
  timestamp: Date;
  servers: MCPServer[];
}

/**
 * Repair plan
 */
export interface RepairPlan {
  errors: MCPError[];
  fixes: Fix[];
  requiresConfirmation: boolean;
}

/**
 * Fix definition
 */
export interface Fix {
  error: MCPError;
  description: string;
  changes: Change[];
  automaticFix: boolean;
}

/**
 * Decision node for problem isolation
 */
export interface DecisionNode {
  test: (context: any) => Promise<boolean> | boolean;
  positive: DecisionNode | IsolationResult;
  negative: DecisionNode | IsolationResult;
}

/**
 * Isolation result
 */
export interface IsolationResult {
  errorType: ErrorType;
  description: string;
  details?: any;
  fixable: boolean;
}

/**
 * Self-test result
 */
export interface SelfTestResult {
  allTestsPassed: boolean;
  results: Record<string, TestResult>;
  timestamp: Date;
}

/**
 * Test result
 */
export interface TestResult {
  passed: boolean;
  name: string;
  description: string;
  error?: any;
}
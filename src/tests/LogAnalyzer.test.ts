import { LogAnalyzer } from '../core/diagnostics/LogAnalyzer';
import { ErrorType, MCPClientType, MCPServer } from '../types';

// Mock the fs-extra module
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
  readdir: jest.fn(),
  pathExists: jest.fn(),
}));

// Mock the logger
jest.mock('../core/logging', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('LogAnalyzer', () => {
  let logAnalyzer: LogAnalyzer;
  
  beforeEach(() => {
    logAnalyzer = new LogAnalyzer();
    
    // Reset all mock implementations
    jest.clearAllMocks();
  });
  
  describe('analyzeLogContent', () => {
    test('Should detect path errors in log content', () => {
      // Mock log lines
      const logLines = [
        '2025-03-22T12:00:00.000Z INFO Starting MCP server',
        '2025-03-22T12:00:01.000Z ERROR spawn node ENOENT',
        '2025-03-22T12:00:02.000Z INFO Retrying...',
      ];
      
      // Define a mock server
      const server: MCPServer = {
        name: 'test-server',
        command: 'node',
        args: ['server.js'],
        env: {},
      };
      
      // Analyze log content
      const errors = logAnalyzer.analyzeLogContent(logLines, server);
      
      // Assertions
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(ErrorType.PathError);
      expect(errors[0].message).toContain('not found in PATH');
      expect(errors[0].server).toBe(server);
      expect(errors[0].fixable).toBe(true);
    });
    
    test('Should detect permission errors in log content', () => {
      // Mock log lines
      const logLines = [
        '2025-03-22T12:00:00.000Z INFO Starting MCP server',
        '2025-03-22T12:00:01.000Z ERROR EACCES: permission denied, open "/usr/local/bin/config.json"',
        '2025-03-22T12:00:02.000Z INFO Retrying...',
      ];
      
      // Define a mock server
      const server: MCPServer = {
        name: 'test-server',
        command: 'node',
        args: ['server.js'],
        env: {},
      };
      
      // Analyze log content
      const errors = logAnalyzer.analyzeLogContent(logLines, server);
      
      // Assertions
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(ErrorType.PermissionError);
      expect(errors[0].message).toBe('Permission denied');
      expect(errors[0].server).toBe(server);
      expect(errors[0].fixable).toBe(true);
    });
    
    test('Should detect config errors in log content', () => {
      // Mock log lines
      const logLines = [
        '2025-03-22T12:00:00.000Z INFO Starting MCP server',
        '2025-03-22T12:00:01.000Z ERROR SyntaxError: Unexpected token } in JSON at position 42',
        '2025-03-22T12:00:02.000Z INFO Retrying...',
      ];
      
      // Define a mock server
      const server: MCPServer = {
        name: 'test-server',
        command: 'node',
        args: ['server.js'],
        env: {},
      };
      
      // Analyze log content
      const errors = logAnalyzer.analyzeLogContent(logLines, server);
      
      // Assertions
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(ErrorType.ConfigError);
      expect(errors[0].message).toBe('Invalid configuration syntax');
      expect(errors[0].server).toBe(server);
      expect(errors[0].fixable).toBe(true);
    });
    
    test('Should not report errors for normal log lines', () => {
      // Mock log lines
      const logLines = [
        '2025-03-22T12:00:00.000Z INFO Starting MCP server',
        '2025-03-22T12:00:01.000Z INFO Server started successfully',
        '2025-03-22T12:00:02.000Z INFO Listening on port 3000',
      ];
      
      // Define a mock server
      const server: MCPServer = {
        name: 'test-server',
        command: 'node',
        args: ['server.js'],
        env: {},
      };
      
      // Analyze log content
      const errors = logAnalyzer.analyzeLogContent(logLines, server);
      
      // Assertions
      expect(errors).toHaveLength(0);
    });
  });
  
  describe('getLogFilePaths', () => {
    test('Should return correct log paths for Claude Desktop on Windows', () => {
      // Mock os.platform and os.homedir
      jest.spyOn(require('os'), 'platform').mockReturnValue('win32');
      jest.spyOn(require('os'), 'homedir').mockReturnValue('C:\\Users\\testuser');
      
      // Get log file paths
      const client = {
        type: MCPClientType.ClaudeDesktop,
        name: 'Claude Desktop',
        configPath: 'C:\\Path\\To\\Config',
        servers: [],
      };
      
      const logPaths = logAnalyzer.getLogFilePaths(client);
      
      // Assertions
      expect(logPaths).toHaveLength(1);
      expect(logPaths[0]).toContain('AppData\\Roaming\\Claude\\logs');
      expect(logPaths[0]).toContain('mcp-server-*.log');
    });
    
    test('Should return correct log paths for Windsurf on macOS', () => {
      // Mock os.platform and os.homedir
      jest.spyOn(require('os'), 'platform').mockReturnValue('darwin');
      jest.spyOn(require('os'), 'homedir').mockReturnValue('/Users/testuser');
      
      // Get log file paths
      const client = {
        type: MCPClientType.Windsurf,
        name: 'Windsurf',
        configPath: '/Path/To/Config',
        servers: [],
      };
      
      const logPaths = logAnalyzer.getLogFilePaths(client);
      
      // Assertions
      expect(logPaths).toHaveLength(1);
      expect(logPaths[0]).toContain('.codeium/windsurf/logs');
      expect(logPaths[0]).toContain('mcp-*.log');
    });
  });
  
  describe('getFixSuggestions', () => {
    test('Should provide fix suggestions for path errors', () => {
      // Create mock errors
      const errors = [
        {
          type: ErrorType.PathError,
          message: 'Command "node" not found in PATH',
          fixable: true,
        },
      ];
      
      // Get fix suggestions
      const suggestions = logAnalyzer.getFixSuggestions(errors as any);
      
      // Assertions
      expect(Object.keys(suggestions)).toHaveLength(1);
      expect(suggestions[`${ErrorType.PathError}-Command "node" not found in PATH`]).toContain('Install Node.js');
    });
    
    test('Should provide fix suggestions for permission errors', () => {
      // Create mock errors
      const errors = [
        {
          type: ErrorType.PermissionError,
          message: 'Permission denied',
          fixable: true,
        },
      ];
      
      // Get fix suggestions
      const suggestions = logAnalyzer.getFixSuggestions(errors as any);
      
      // Assertions
      expect(Object.keys(suggestions)).toHaveLength(1);
      expect(suggestions[`${ErrorType.PermissionError}-Permission denied`]).toContain('Fix file permissions');
    });
  });
});

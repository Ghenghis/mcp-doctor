import { AIService } from '../../services/AIService';
import { AILogAnalyzerService } from '../../services/AILogAnalyzerService';
import { LogAnalyzer } from '../../core/diagnostics/LogAnalyzer';
import { RepairService } from '../../services/RepairService';
import { SystemDetector } from '../../core/diagnostics/SystemDetector';
import { ConfigManager } from '../../core/config/ConfigManager';
import { BackupManager } from '../../core/backup/BackupManager';
import { MCPClient, MCPClientType, MCPServer, MCPServerStatus } from '../../types';

// Mock dependencies
jest.mock('../../services/AIService');
jest.mock('../../core/diagnostics/LogAnalyzer');
jest.mock('../../core/diagnostics/SystemDetector');
jest.mock('../../core/config/ConfigManager');
jest.mock('../../core/backup/BackupManager');

// Mock the logger
jest.mock('../../core/logging', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('AI-Powered Repair Integration', () => {
  let aiService: AIService;
  let logAnalyzer: LogAnalyzer;
  let aiLogAnalyzer: AILogAnalyzerService;
  let repairService: RepairService;
  let systemDetector: SystemDetector;
  let configManager: ConfigManager;
  let backupManager: BackupManager;
  
  // Mock client data
  const mockServer: MCPServer = {
    name: 'test-server',
    command: 'node',
    args: ['server.js'],
    env: {},
    status: MCPServerStatus.Error,
  };
  
  const mockClient: MCPClient = {
    type: MCPClientType.ClaudeDesktop,
    name: 'Claude Desktop',
    configPath: '/path/to/config.json',
    servers: [mockServer],
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Initialize services
    aiService = new AIService({ apiKey: 'test-api-key' });
    logAnalyzer = new LogAnalyzer();
    systemDetector = new SystemDetector();
    configManager = new ConfigManager();
    backupManager = new BackupManager();
    
    // Initialize AI log analyzer
    aiLogAnalyzer = new AILogAnalyzerService({
      aiService,
      logAnalyzer,
    });
    
    // Initialize repair service
    repairService = new RepairService({
      systemDetector,
      configManager,
      backupManager,
      aiLogAnalyzer,
    });
    
    // Mock isAvailable method
    jest.spyOn(aiService, 'isAvailable').mockReturnValue(true);
    
    // Mock repair plan creation
    jest.spyOn(repairService, 'createRepairPlan').mockResolvedValue({
      errors: [],
      fixes: [],
      requiresConfirmation: false,
    });
    
    // Mock analyzeClientLogs method
    jest.spyOn(aiLogAnalyzer, 'analyzeClientLogs').mockResolvedValue({
      standardErrors: [],
      aiSuggestedFixes: [],
      explanation: 'Test explanation',
    });
    
    // Mock analyzeLog method
    jest.spyOn(aiService, 'analyzeLog').mockResolvedValue({
      suggestedFixes: [],
      confidence: 90,
      explanation: 'Test explanation',
    });
  });
  
  test('Should create AI repair plan', async () => {
    // Call createAIRepairPlan
    await repairService.createAIRepairPlan(mockClient);
    
    // Verify AI log analyzer was called
    expect(aiLogAnalyzer.analyzeClientLogs).toHaveBeenCalledWith(mockClient);
    
    // Verify standard repair plan was created
    expect(repairService.createRepairPlan).toHaveBeenCalled();
  });
  
  test('Should fall back to standard repair plan when AI service not available', async () => {
    // Make AI service unavailable
    jest.spyOn(aiService, 'isAvailable').mockReturnValue(false);
    
    // Call createAIRepairPlan
    await repairService.createAIRepairPlan(mockClient);
    
    // Verify AI log analyzer was not called
    expect(aiLogAnalyzer.analyzeClientLogs).not.toHaveBeenCalled();
    
    // Verify standard repair plan was created
    expect(repairService.createRepairPlan).toHaveBeenCalledWith(mockClient, []);
  });
  
  test('Should integrate AI suggestions with standard fixes', async () => {
    // Mock responses with sample data
    jest.spyOn(repairService, 'createRepairPlan').mockResolvedValue({
      errors: [{ type: 'path_error', message: 'Standard error' } as any],
      fixes: [{ description: 'Standard fix' } as any],
      requiresConfirmation: false,
    });
    
    jest.spyOn(aiLogAnalyzer, 'analyzeClientLogs').mockResolvedValue({
      standardErrors: [{ type: 'path_error', message: 'Standard error' } as any],
      aiSuggestedFixes: [{ description: 'AI suggested fix' } as any],
      explanation: 'AI explanation',
    });
    
    // Call createAIRepairPlan
    const plan = await repairService.createAIRepairPlan(mockClient);
    
    // Verify plan contains both standard and AI fixes
    expect(plan.fixes).toHaveLength(2);
    expect(plan.fixes[0].description).toBe('Standard fix');
    expect(plan.fixes[1].description).toBe('AI suggested fix');
    
    // Verify requiresConfirmation is true
    expect(plan.requiresConfirmation).toBe(true);
  });
  
  test('Should handle errors during AI analysis', async () => {
    // Mock error in AI log analyzer
    jest.spyOn(aiLogAnalyzer, 'analyzeClientLogs').mockRejectedValue(new Error('AI analysis failed'));
    
    // Call createAIRepairPlan
    await repairService.createAIRepairPlan(mockClient);
    
    // Verify standard repair plan was created
    expect(repairService.createRepairPlan).toHaveBeenCalledWith(mockClient, []);
  });
});

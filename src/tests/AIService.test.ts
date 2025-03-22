import { AIService } from '../services/AIService';
import { ErrorType } from '../types';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => {
    return {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            {
              text: `\`\`\`json
{
  "suggestedFixes": [
    {
      "type": "path_error",
      "description": "Install Node.js",
      "steps": ["Download from nodejs.org", "Run the installer"],
      "confidence": 90
    },
    {
      "type": "config_error",
      "description": "Fix JSON syntax",
      "steps": ["Add missing comma at line 42"],
      "confidence": 85
    }
  ],
  "explanation": "The log shows issues with Node.js not being found and a JSON syntax error."
}
\`\`\``
            }
          ]
        })
      }
    };
  });
});

// Mock the logger
jest.mock('../core/logging', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('AIService', () => {
  let aiService: AIService;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('initialization', () => {
    test('Should initialize with API key from options', () => {
      aiService = new AIService({
        apiKey: 'test-api-key',
      });
      
      expect(aiService.isAvailable()).toBe(true);
    });
    
    test('Should initialize with API key from environment', () => {
      // Set API key in environment
      process.env.CLAUDE_API_KEY = 'env-test-api-key';
      
      aiService = new AIService();
      
      expect(aiService.isAvailable()).toBe(true);
      
      // Clean up
      delete process.env.CLAUDE_API_KEY;
    });
    
    test('Should not be available without API key', () => {
      // Ensure no API key in environment
      delete process.env.CLAUDE_API_KEY;
      
      aiService = new AIService();
      
      expect(aiService.isAvailable()).toBe(false);
    });
  });
  
  describe('analyzeLog', () => {
    beforeEach(() => {
      aiService = new AIService({
        apiKey: 'test-api-key',
      });
    });
    
    test('Should throw error if not initialized', async () => {
      // Force AI service to be unavailable
      jest.spyOn(aiService as any, 'client', 'get').mockReturnValue(null);
      
      await expect(aiService.analyzeLog('log content', [])).rejects.toThrow('Claude API not initialized');
    });
    
    test('Should create a proper prompt with log content and errors', async () => {
      const createLogAnalysisPromptSpy = jest.spyOn(aiService as any, 'createLogAnalysisPrompt');
      
      const logContent = 'Error: Command "node" not found in PATH';
      const errors = [
        {
          type: ErrorType.PathError,
          message: 'Command not found in PATH',
          fixable: true,
        },
      ];
      
      await aiService.analyzeLog(logContent, errors as any);
      
      expect(createLogAnalysisPromptSpy).toHaveBeenCalledWith(logContent, errors);
      
      // Verify prompt content
      const prompt = createLogAnalysisPromptSpy.mock.results[0].value;
      expect(prompt).toContain(logContent);
      expect(prompt).toContain('KNOWN ERRORS:');
      expect(prompt).toContain(`- Type: ${errors[0].type}, Message: ${errors[0].message}`);
    });
    
    test('Should call Claude API with correct parameters', async () => {
      const mockAnthropicInstance = require('@anthropic-ai/sdk').mock.results[0].value;
      const createSpy = mockAnthropicInstance.messages.create;
      
      const logContent = 'Error: Command "node" not found in PATH';
      const errors: any[] = [];
      
      await aiService.analyzeLog(logContent, errors);
      
      expect(createSpy).toHaveBeenCalledTimes(1);
      
      // Check parameters
      const callParams = createSpy.mock.calls[0][0];
      expect(callParams.model).toBeDefined();
      expect(callParams.system).toBeDefined();
      expect(callParams.messages).toBeDefined();
      expect(callParams.messages[0].role).toBe('user');
    });
    
    test('Should parse response correctly', async () => {
      const result = await aiService.analyzeLog('log content', []);
      
      expect(result).toHaveProperty('suggestedFixes');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('explanation');
      
      expect(result.suggestedFixes).toHaveLength(2);
      expect(result.suggestedFixes[0].error.type).toBe(ErrorType.PathError);
      expect(result.suggestedFixes[0].description).toBe('Install Node.js');
      expect(result.explanation).toBe('The log shows issues with Node.js not being found and a JSON syntax error.');
    });
    
    test('Should handle response parsing error', async () => {
      // Mock invalid response format
      jest.spyOn(require('@anthropic-ai/sdk').mock.results[0].value.messages, 'create')
        .mockResolvedValueOnce({
          content: [{ text: 'Invalid JSON format' }]
        });
      
      await expect(aiService.analyzeLog('log content', [])).rejects.toThrow('Failed to parse Claude API response');
    });
  });
});

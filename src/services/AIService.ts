import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import { getLogger } from '../core/logging';
import { MCPError, ErrorType, Fix } from '../types';

/**
 * Options for AIService
 */
export interface AIServiceOptions {
  apiKey?: string;
  model?: string;
}

/**
 * AI analysis result
 */
export interface AIAnalysisResult {
  suggestedFixes: Fix[];
  confidence: number;
  explanation: string;
}

/**
 * Service for AI-powered analysis and repair recommendations
 */
export class AIService extends EventEmitter {
  private logger = getLogger('AIService');
  private client: Anthropic | null = null;
  private model: string;
  
  constructor(options: AIServiceOptions = {}) {
    super();
    
    const apiKey = options.apiKey || process.env.CLAUDE_API_KEY;
    this.model = options.model || 'claude-3-7-sonnet-20250219';
    
    if (apiKey) {
      this.client = new Anthropic({
        apiKey
      });
      this.logger.info('AI service initialized with Claude API');
    } else {
      this.logger.warn('AI service initialized without API key');
    }
  }
  
  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }
  
  /**
   * Analyze log content and suggest fixes
   * @param content Log content to analyze
   * @param errors Known errors
   */
  async analyzeLog(content: string, errors: MCPError[]): Promise<AIAnalysisResult> {
    if (!this.client) {
      throw new Error('Claude API not initialized');
    }
    
    this.logger.info('Analyzing log content with Claude API');
    
    try {
      // Create prompt for Claude
      const prompt = this.createLogAnalysisPrompt(content, errors);
      
      // Call Claude API
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        system: 'You are an expert at analyzing MCP server logs and identifying issues. You provide detailed analysis and suggest fixes in a structured format.'
      });
      
      // Parse response
      return this.parseLogAnalysisResponse(response);
    } catch (error) {
      this.logger.error('Failed to analyze log with Claude API', error);
      throw error;
    }
  }
  
  /**
   * Create prompt for log analysis
   * @param content Log content
   * @param errors Known errors
   */
  private createLogAnalysisPrompt(content: string, errors: MCPError[]): string {
    // Create structured prompt for Claude
    let prompt = `Analyze the following MCP server log content and suggest fixes for any issues you identify.

LOG CONTENT:
\`\`\`
${content}
\`\`\`

`;

    // Add known errors if available
    if (errors.length > 0) {
      prompt += `\nKNOWN ERRORS:
${errors.map(error => `- Type: ${error.type}, Message: ${error.message}`).join('\n')}

`;
    }

    // Add instructions for response format
    prompt += `Please analyze this log and provide the following in your response:
1. A list of suggested fixes in JSON format
2. A confidence score for each fix (0-100)
3. An explanation of each issue in plain language

Format your response as follows:
\`\`\`json
{
  "suggestedFixes": [
    {
      "type": "string (path_error, env_error, permission_error, config_error, network_error, process_error, unknown_error)",
      "description": "string",
      "steps": ["string"],
      "confidence": number
    }
  ],
  "explanation": "string"
}
\`\`\`
`;

    return prompt;
  }
  
  /**
   * Parse Claude API response
   * @param response Claude API response
   */
  private parseLogAnalysisResponse(response: any): AIAnalysisResult {
    try {
      // Extract JSON from response
      const content = response.content[0].text;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const jsonString = jsonMatch[1];
      const result = JSON.parse(jsonString);
      
      // Convert to AIAnalysisResult
      const fixes: Fix[] = result.suggestedFixes.map((fix: any) => ({
        error: {
          type: fix.type as ErrorType,
          message: fix.description,
          details: fix.steps,
          fixable: true,
        },
        description: fix.description,
        changes: [],
        automaticFix: false,
      }));
      
      return {
        suggestedFixes: fixes,
        confidence: result.suggestedFixes.reduce((acc: number, fix: any) => acc + fix.confidence, 0) / result.suggestedFixes.length,
        explanation: result.explanation,
      };
    } catch (error) {
      this.logger.error('Failed to parse Claude API response', error);
      throw new Error(`Failed to parse Claude API response: ${error}`);
    }
  }
}
import * as fs from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';
import { promisify } from 'util';
import { getLogger } from '../core/logging';
import { AIService } from './AIService';
import { LogAnalyzer } from '../core/diagnostics/LogAnalyzer';
import { MCPClient, MCPError, Fix } from '../types';

// Promisify glob function
const globPromise = promisify(glob);

/**
 * Options for AILogAnalyzerService
 */
export interface AILogAnalyzerServiceOptions {
  aiService: AIService;
  logAnalyzer: LogAnalyzer;
}

/**
 * AI-powered log analysis result
 */
export interface AILogAnalysisResult {
  standardErrors: MCPError[];
  aiSuggestedFixes: Fix[];
  explanation: string;
}

/**
 * Service for AI-powered log analysis
 */
export class AILogAnalyzerService {
  private logger = getLogger('AILogAnalyzerService');
  private aiService: AIService;
  private logAnalyzer: LogAnalyzer;
  
  constructor(options: AILogAnalyzerServiceOptions) {
    this.aiService = options.aiService;
    this.logAnalyzer = options.logAnalyzer;
  }
  
  /**
   * Analyze client logs with AI assistance
   * @param client MCP client
   */
  async analyzeClientLogs(client: MCPClient): Promise<AILogAnalysisResult> {
    this.logger.info(`Analyzing logs for ${client.name} with AI assistance`);
    
    try {
      // First, perform standard log analysis
      const standardAnalysis = await this.logAnalyzer.analyzeClientLogs(client);
      
      // Check if AI service is available
      if (!this.aiService.isAvailable()) {
        this.logger.warn('AI service not available, using standard analysis only');
        return {
          standardErrors: standardAnalysis.errors,
          aiSuggestedFixes: [],
          explanation: 'AI analysis not available',
        };
      }
      
      // Collect log content for AI analysis
      const logPaths = this.logAnalyzer.getLogFilePaths(client);
      const logContents: string[] = [];
      
      for (const logPath of logPaths) {
        // Find actual log files matching pattern
        const files = await this.findLogFiles(logPath);
        
        // Read each log file
        for (const file of files) {
          const content = await this.readLogFile(file);
          if (content) {
            logContents.push(content);
          }
        }
      }
      
      // Combine log contents
      const combinedLogContent = logContents.join('\n\n--- Next Log File ---\n\n');
      
      // If no log content found, return standard analysis
      if (!combinedLogContent) {
        this.logger.warn('No log content found for AI analysis');
        return {
          standardErrors: standardAnalysis.errors,
          aiSuggestedFixes: [],
          explanation: 'No log content available for AI analysis',
        };
      }
      
      // Perform AI analysis
      const aiAnalysis = await this.aiService.analyzeLog(combinedLogContent, standardAnalysis.errors);
      
      return {
        standardErrors: standardAnalysis.errors,
        aiSuggestedFixes: aiAnalysis.suggestedFixes,
        explanation: aiAnalysis.explanation,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze logs for ${client.name} with AI assistance`, error);
      throw error;
    }
  }
  
  /**
   * Find log files matching pattern
   * @param pattern Log file pattern
   */
  private async findLogFiles(pattern: string): Promise<string[]> {
    try {
      // Handle wildcard patterns
      if (pattern.includes('*')) {
        return await globPromise(pattern);
      }
      
      // Handle specific file
      if (await fs.pathExists(pattern)) {
        return [pattern];
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Failed to find log files matching pattern: ${pattern}`, error);
      return [];
    }
  }
  
  /**
   * Read log file
   * @param filePath Log file path
   */
  private async readLogFile(filePath: string): Promise<string | null> {
    try {
      // Check if file exists
      if (!(await fs.pathExists(filePath))) {
        return null;
      }
      
      // Read file
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      this.logger.error(`Failed to read log file: ${filePath}`, error);
      return null;
    }
  }
}
import * as fs from 'fs-extra';
import * as path from 'path';
import { EventEmitter } from 'events';
import { LogService } from '../logging/LogService';
import { IServerProfile } from '../management/ManagementService';
import fetch from 'node-fetch';

/**
 * Interface for request template
 */
export interface RequestTemplate {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
  variables?: Array<{
    name: string;
    description: string;
    default?: string;
    required?: boolean;
  }>;
  expectedStatus?: number;
  validation?: {
    schema?: any;
    fields?: Array<{
      path: string;
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required?: boolean;
    }>;
  };
  serverType: string;
}

/**
 * Interface for request execution options
 */
export interface RequestExecutionOptions {
  timeout?: number;
  variables?: Record<string, string>;
  saveResponse?: boolean;
  validateResponse?: boolean;
}

/**
 * Interface for request execution result
 */
export interface RequestExecutionResult {
  success: boolean;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: any;
  duration: number;
  error?: Error;
  validationErrors?: string[];
  requestUrl: string;
  requestBody?: any;
  requestHeaders: Record<string, string>;
  timestamp: Date;
  requestId: string;
}

/**
 * Interface for validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Service for inspecting and testing MCP server requests
 */
export class RequestInspectorService extends EventEmitter {
  private templates: RequestTemplate[] = [];
  private history: Record<string, RequestExecutionResult[]> = {};
  private templatesDir: string;
  
  constructor(private logService: LogService) {
    super();
    
    // Set templates directory
    this.templatesDir = path.join(
      process.env.APPDATA || process.env.HOME || '',
      '.mcp-doctor',
      'request-templates'
    );
    
    // Ensure directory exists
    fs.ensureDirSync(this.templatesDir);
  }
  
  /**
   * Initialize service
   */
  public async initialize(): Promise<void> {
    try {
      // Load templates
      await this.loadTemplates();
      
      // Create built-in templates if needed
      await this.createBuiltInTemplates();
      
      this.logService.info('RequestInspectorService', `Initialized with ${this.templates.length} templates`);
    } catch (error) {
      this.logService.error('RequestInspectorService', `Failed to initialize: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Load templates from disk
   */
  private async loadTemplates(): Promise<void> {
    try {
      // Read template files
      const files = await fs.readdir(this.templatesDir);
      
      // Reset templates
      this.templates = [];
      
      // Load each template
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(this.templatesDir, file), 'utf8');
            const template = JSON.parse(content) as RequestTemplate;
            this.templates.push(template);
          } catch (error) {
            this.logService.warn('RequestInspectorService', `Failed to load template ${file}: ${error.message}`);
          }
        }
      }
      
      this.logService.debug('RequestInspectorService', `Loaded ${this.templates.length} templates`);
    } catch (error) {
      this.logService.error('RequestInspectorService', `Failed to load templates: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create built-in templates
   */
  private async createBuiltInTemplates(): Promise<void> {
    try {
      // Check if basic Claude completion template exists
      if (!this.templates.some(t => t.id === 'claude-completion')) {
        const template: RequestTemplate = {
          id: 'claude-completion',
          name: 'Claude Completion API',
          description: 'Basic Claude API completion request',
          endpoint: '/api/v1/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-key': '${API_KEY}'
          },
          body: {
            model: 'claude-3-haiku-20240307',
            prompt: '${PROMPT}',
            max_tokens_to_sample: 200,
            temperature: 0.7,
            stop_sequences: []
          },
          variables: [
            {
              name: 'API_KEY',
              description: 'Claude API Key',
              required: true
            },
            {
              name: 'PROMPT',
              description: 'Text prompt for Claude',
              default: 'Hello, Claude!',
              required: true
            }
          ],
          expectedStatus: 200,
          validation: {
            fields: [
              {
                path: 'completion',
                type: 'string',
                required: true
              },
              {
                path: 'model',
                type: 'string',
                required: true
              }
            ]
          },
          serverType: 'claude-mcp'
        };
        
        await this.saveTemplate(template);
      }
      
      // Check if MCP server health check template exists
      if (!this.templates.some(t => t.id === 'mcp-health-check')) {
        const template: RequestTemplate = {
          id: 'mcp-health-check',
          name: 'MCP Server Health Check',
          description: 'Check the health of an MCP server',
          endpoint: '/health',
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          expectedStatus: 200,
          validation: {
            fields: [
              {
                path: 'status',
                type: 'string',
                required: true
              }
            ]
          },
          serverType: '*' // Works with any server
        };
        
        await this.saveTemplate(template);
      }
    } catch (error) {
      this.logService.error('RequestInspectorService', `Failed to create built-in templates: ${error.message}`);
    }
  }
  
  /**
   * Save a template to disk
   * @param template Template to save
   */
  public async saveTemplate(template: RequestTemplate): Promise<void> {
    try {
      // Save template to disk
      const filePath = path.join(this.templatesDir, `${template.id}.json`);
      await fs.writeJSON(filePath, template, { spaces: 2 });
      
      // Update in-memory template
      const existingIndex = this.templates.findIndex(t => t.id === template.id);
      if (existingIndex >= 0) {
        this.templates[existingIndex] = template;
      } else {
        this.templates.push(template);
      }
      
      this.logService.debug('RequestInspectorService', `Saved template ${template.id}`);
      this.emit('template-saved', template);
    } catch (error) {
      this.logService.error('RequestInspectorService', `Failed to save template ${template.id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a template
   * @param templateId Template ID to delete
   */
  public async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      // Delete template file
      const filePath = path.join(this.templatesDir, `${templateId}.json`);
      
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        
        // Remove from in-memory templates
        this.templates = this.templates.filter(t => t.id !== templateId);
        
        this.logService.debug('RequestInspectorService', `Deleted template ${templateId}`);
        this.emit('template-deleted', templateId);
        
        return true;
      }
      
      return false;
    } catch (error) {
      this.logService.error('RequestInspectorService', `Failed to delete template ${templateId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get all templates
   */
  public getTemplates(): RequestTemplate[] {
    return [...this.templates];
  }
  
  /**
   * Get template by ID
   * @param id Template ID
   */
  public getTemplateById(id: string): RequestTemplate | null {
    return this.templates.find(t => t.id === id) || null;
  }
  
  /**
   * Get templates compatible with a server
   * @param serverType Server type to check
   */
  public getCompatibleTemplates(serverType: string): RequestTemplate[] {
    return this.templates.filter(t => 
      t.serverType === serverType || t.serverType === '*'
    );
  }
  
  /**
   * Execute a request
   * @param template Request template
   * @param server Server profile
   * @param options Execution options
   */
  public async executeRequest(
    template: RequestTemplate,
    server: IServerProfile,
    options: RequestExecutionOptions = {}
  ): Promise<RequestExecutionResult> {
    try {
      this.logService.info('RequestInspectorService', `Executing request: ${template.name}`);
      
      // Generate request ID
      const requestId = Date.now().toString();
      
      // Get server URL
      const serverUrl = this.getServerUrl(server);
      
      if (!serverUrl) {
        throw new Error('Could not determine server URL');
      }
      
      // Process template with variables
      const processedTemplate = this.processTemplateVariables(template, options.variables || {});
      
      // Build request URL
      let requestUrl = new URL(processedTemplate.endpoint, serverUrl).toString();
      
      // Add query parameters
      if (processedTemplate.queryParams) {
        const url = new URL(requestUrl);
        
        for (const [key, value] of Object.entries(processedTemplate.queryParams)) {
          url.searchParams.append(key, value);
        }
        
        requestUrl = url.toString();
      }
      
      // Set default timeout
      const timeout = options.timeout || 30000;
      
      // Start timing
      const startTime = Date.now();
      
      // Execute request
      try {
        const response = await fetch(requestUrl, {
          method: processedTemplate.method,
          headers: processedTemplate.headers,
          body: processedTemplate.body ? JSON.stringify(processedTemplate.body) : undefined,
          timeout
        });
        
        // Calculate duration
        const duration = Date.now() - startTime;
        
        // Parse response
        let responseBody: any;
        let responseHeaders: Record<string, string> = {};
        
        // Convert headers to object
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        
        // Try to parse as JSON
        try {
          responseBody = await response.json();
        } catch (error) {
          // Try to get text
          try {
            responseBody = await response.text();
          } catch (error) {
            responseBody = null;
          }
        }
        
        // Validate response if requested
        let validationErrors: string[] = [];
        
        if (options.validateResponse && processedTemplate.validation) {
          const validationResult = this.validateResponse(responseBody, processedTemplate.validation);
          validationErrors = validationResult.errors;
        }
        
        // Check expected status code
        const success = !processedTemplate.expectedStatus || response.status === processedTemplate.expectedStatus;
        
        // Create result
        const result: RequestExecutionResult = {
          success: success && validationErrors.length === 0,
          statusCode: response.status,
          headers: responseHeaders,
          body: responseBody,
          duration,
          validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
          requestUrl,
          requestBody: processedTemplate.body,
          requestHeaders: processedTemplate.headers,
          timestamp: new Date(),
          requestId
        };
        
        // Save to history
        this.addToHistory(template.id, result);
        
        // Emit result event
        this.emit('request-executed', template.id, result);
        
        this.logService.info('RequestInspectorService', `Request completed in ${duration}ms with status ${response.status}`);
        return result;
      } catch (error) {
        // Calculate duration
        const duration = Date.now() - startTime;
        
        // Create error result
        const result: RequestExecutionResult = {
          success: false,
          duration,
          error,
          requestUrl,
          requestBody: processedTemplate.body,
          requestHeaders: processedTemplate.headers,
          timestamp: new Date(),
          requestId
        };
        
        // Save to history
        this.addToHistory(template.id, result);
        
        // Emit result event
        this.emit('request-executed', template.id, result);
        
        this.logService.error('RequestInspectorService', `Request failed: ${error.message}`);
        return result;
      }
    } catch (error) {
      this.logService.error('RequestInspectorService', `Error executing request: ${error.message}`);
      
      // Create error result
      const result: RequestExecutionResult = {
        success: false,
        duration: 0,
        error,
        requestUrl: '',
        requestHeaders: {},
        timestamp: new Date(),
        requestId: Date.now().toString()
      };
      
      return result;
    }
  }
  
  /**
   * Process template variables
   * @param template Template to process
   * @param variables Variables to use
   */
  private processTemplateVariables(
    template: RequestTemplate,
    variables: Record<string, string>
  ): RequestTemplate {
    try {
      // Clone template
      const processed = JSON.parse(JSON.stringify(template)) as RequestTemplate;
      
      // Process as string
      const templateString = JSON.stringify(processed);
      
      // Replace variables
      const processedString = templateString.replace(/\${([^}]+)}/g, (match, variableName) => {
        return variables[variableName] || match;
      });
      
      // Parse back to object
      return JSON.parse(processedString);
    } catch (error) {
      this.logService.error('RequestInspectorService', `Error processing template variables: ${error.message}`);
      return template;
    }
  }
  
  /**
   * Validate response
   * @param response Response to validate
   * @param validation Validation rules
   */
  private validateResponse(response: any, validation: RequestTemplate['validation']): ValidationResult {
    try {
      const errors: string[] = [];
      
      // Skip validation if no response
      if (!response) {
        errors.push('Response is empty');
        return { valid: false, errors };
      }
      
      // Skip validation if no validation rules
      if (!validation || (!validation.schema && !validation.fields)) {
        return { valid: true, errors: [] };
      }
      
      // TODO: Implement JSON Schema validation
      
      // Validate fields
      if (validation.fields) {
        for (const field of validation.fields) {
          // Get field value
          const value = this.getPropertyByPath(response, field.path);
          
          // Check if required
          if (field.required && (value === undefined || value === null)) {
            errors.push(`Required field '${field.path}' is missing`);
            continue;
          }
          
          // Skip type validation if no value
          if (value === undefined || value === null) {
            continue;
          }
          
          // Validate type
          switch (field.type) {
            case 'string':
              if (typeof value !== 'string') {
                errors.push(`Field '${field.path}' should be a string, got ${typeof value}`);
              }
              break;
            
            case 'number':
              if (typeof value !== 'number') {
                errors.push(`Field '${field.path}' should be a number, got ${typeof value}`);
              }
              break;
            
            case 'boolean':
              if (typeof value !== 'boolean') {
                errors.push(`Field '${field.path}' should be a boolean, got ${typeof value}`);
              }
              break;
            
            case 'object':
              if (typeof value !== 'object' || Array.isArray(value) || value === null) {
                errors.push(`Field '${field.path}' should be an object, got ${Array.isArray(value) ? 'array' : typeof value}`);
              }
              break;
            
            case 'array':
              if (!Array.isArray(value)) {
                errors.push(`Field '${field.path}' should be an array, got ${typeof value}`);
              }
              break;
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }
  
  /**
   * Get property value by path
   * @param obj Object to get property from
   * @param path Property path (e.g. 'user.name')
   */
  private getPropertyByPath(obj: any, path: string): any {
    try {
      return path.split('.').reduce((o, i) => o[i], obj);
    } catch (error) {
      return undefined;
    }
  }
  
  /**
   * Get server URL from profile
   * @param profile Server profile
   */
  private getServerUrl(profile: IServerProfile): string | null {
    try {
      // Try to find URL in custom settings
      if (profile.customSettings && profile.customSettings.serverUrl) {
        return profile.customSettings.serverUrl;
      }
      
      if (profile.customSettings && profile.customSettings.server && profile.customSettings.server.url) {
        return profile.customSettings.server.url;
      }
      
      // Use localhost with default port
      let port = 3000; // Default port
      
      // Try to find port in custom settings
      if (profile.customSettings && profile.customSettings.port) {
        port = profile.customSettings.port;
      }
      
      if (profile.customSettings && profile.customSettings.server && profile.customSettings.server.port) {
        port = profile.customSettings.server.port;
      }
      
      return `http://localhost:${port}`;
    } catch (error) {
      this.logService.error('RequestInspectorService', `Error getting server URL: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Add result to history
   * @param templateId Template ID
   * @param result Request result
   */
  private addToHistory(templateId: string, result: RequestExecutionResult): void {
    // Initialize history if needed
    if (!this.history[templateId]) {
      this.history[templateId] = [];
    }
    
    // Add to history
    this.history[templateId].push(result);
    
    // Limit history to 50 items per template
    if (this.history[templateId].length > 50) {
      this.history[templateId] = this.history[templateId].slice(-50);
    }
  }
  
  /**
   * Get request history for a template
   * @param templateId Template ID
   */
  public getHistory(templateId: string): RequestExecutionResult[] {
    return this.history[templateId] || [];
  }
  
  /**
   * Get all history
   */
  public getAllHistory(): Record<string, RequestExecutionResult[]> {
    return { ...this.history };
  }
  
  /**
   * Clear history for a template
   * @param templateId Template ID
   */
  public clearHistory(templateId: string): void {
    this.history[templateId] = [];
    this.emit('history-cleared', templateId);
  }
  
  /**
   * Clear all history
   */
  public clearAllHistory(): void {
    this.history = {};
    this.emit('all-history-cleared');
  }
  
  /**
   * Create a batch request
   * @param template Request template
   * @param server Server profile
   * @param variablesList List of variables to use
   * @param concurrency Number of concurrent requests
   */
  public async executeBatch(
    template: RequestTemplate,
    server: IServerProfile,
    variablesList: Record<string, string>[],
    concurrency: number = 5
  ): Promise<RequestExecutionResult[]> {
    try {
      this.logService.info('RequestInspectorService', `Executing batch of ${variablesList.length} requests`);
      
      const results: RequestExecutionResult[] = [];
      
      // Process in batches
      for (let i = 0; i < variablesList.length; i += concurrency) {
        const batch = variablesList.slice(i, i + concurrency);
        
        // Execute batch concurrently
        const batchPromises = batch.map(variables => 
          this.executeRequest(template, server, { variables })
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        // Add to results
        results.push(...batchResults);
        
        // Report progress
        this.emit('batch-progress', {
          completed: i + batch.length,
          total: variablesList.length,
          results: batchResults
        });
      }
      
      // Emit batch completed event
      this.emit('batch-completed', results);
      
      this.logService.info('RequestInspectorService', `Batch completed with ${results.length} requests`);
      return results;
    } catch (error) {
      this.logService.error('RequestInspectorService', `Error executing batch: ${error.message}`);
      throw error;
    }
  }
}
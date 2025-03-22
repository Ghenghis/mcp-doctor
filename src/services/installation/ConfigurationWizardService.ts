import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { LogService } from '../logging/LogService';
import { RepositoryInfo } from './ServerDetectionService';

/**
 * Interface for configuration template
 */
export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  compatibleServers: string[];
  author?: string;
  version?: string;
  tags?: string[];
}

/**
 * Interface for configuration field
 */
export interface ConfigurationField {
  id: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'password' | 'text' | 'path' | 'port';
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  options?: { label: string; value: any }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  advanced?: boolean;
  category?: string;
}

/**
 * Interface for configuration step
 */
export interface ConfigurationStep {
  id: string;
  title: string;
  description: string;
  fields: ConfigurationField[];
  nextStep?: string;
  previousStep?: string;
  optional?: boolean;
  condition?: {
    field: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
    value: any;
  };
}

/**
 * Interface for configuration wizard
 */
export interface ConfigurationWizard {
  id: string;
  title: string;
  description: string;
  steps: ConfigurationStep[];
  targetServerType: string;
}

/**
 * Class for creating and managing configuration wizards
 */
export class ConfigurationWizardService extends EventEmitter {
  private wizards: ConfigurationWizard[] = [];
  private templates: ConfigurationTemplate[] = [];
  private templatesPath: string;
  private wizardsPath: string;
  
  constructor(
    private logService: LogService
  ) {
    super();
    
    // Set up paths
    const appDataPath = path.join(os.homedir(), '.mcp-doctor');
    this.templatesPath = path.join(appDataPath, 'templates');
    this.wizardsPath = path.join(appDataPath, 'wizards');
    
    // Ensure directories exist
    fs.ensureDirSync(this.templatesPath);
    fs.ensureDirSync(this.wizardsPath);
  }
  
  /**
   * Initialize service
   */
  public async initialize(): Promise<void> {
    try {
      // Load templates
      await this.loadTemplates();
      
      // Load wizards
      await this.loadWizards();
      
      // Create built-in wizards and templates if needed
      await this.createBuiltInWizards();
      
      this.logService.info('ConfigurationWizardService', 'Initialized with ${this.templates.length} templates and ${this.wizards.length} wizards');
    } catch (error) {
      this.logService.error('ConfigurationWizardService', `Failed to initialize: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Load templates from disk
   */
  private async loadTemplates(): Promise<void> {
    try {
      // Read template files
      const files = await fs.readdir(this.templatesPath);
      
      // Reset templates
      this.templates = [];
      
      // Load each template
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(this.templatesPath, file), 'utf8');
            const template = JSON.parse(content) as ConfigurationTemplate;
            this.templates.push(template);
          } catch (error) {
            this.logService.warn('ConfigurationWizardService', `Failed to load template ${file}: ${error.message}`);
          }
        }
      }
      
      this.logService.debug('ConfigurationWizardService', `Loaded ${this.templates.length} templates`);
    } catch (error) {
      this.logService.error('ConfigurationWizardService', `Failed to load templates: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Load wizards from disk
   */
  private async loadWizards(): Promise<void> {
    try {
      // Read wizard files
      const files = await fs.readdir(this.wizardsPath);
      
      // Reset wizards
      this.wizards = [];
      
      // Load each wizard
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(this.wizardsPath, file), 'utf8');
            const wizard = JSON.parse(content) as ConfigurationWizard;
            this.wizards.push(wizard);
          } catch (error) {
            this.logService.warn('ConfigurationWizardService', `Failed to load wizard ${file}: ${error.message}`);
          }
        }
      }
      
      this.logService.debug('ConfigurationWizardService', `Loaded ${this.wizards.length} wizards`);
    } catch (error) {
      this.logService.error('ConfigurationWizardService', `Failed to load wizards: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create built-in wizards and templates
   */
  private async createBuiltInWizards(): Promise<void> {
    try {
      // Create default Claude MCP server template if not exists
      if (!this.templates.some(t => t.id === 'claude-mcp-default')) {
        const template: ConfigurationTemplate = {
          id: 'claude-mcp-default',
          name: 'Claude MCP Server (Default)',
          description: 'Default configuration for Claude MCP server',
          compatibleServers: ['claude-mcp'],
          config: {
            server: {
              port: 3000,
              host: 'localhost'
            },
            model: {
              provider: 'anthropic',
              service: 'claude',
              apiKey: '${CLAUDE_API_KEY}'
            },
            logging: {
              level: 'info',
              format: 'json',
              directory: './logs'
            },
            security: {
              enableCORS: true,
              authentication: 'none'
            }
          }
        };
        
        await this.saveTemplate(template);
      }
      
      // Create Claude MCP setup wizard if not exists
      if (!this.wizards.some(w => w.id === 'claude-mcp-setup')) {
        const wizard: ConfigurationWizard = {
          id: 'claude-mcp-setup',
          title: 'Claude MCP Server Setup',
          description: 'Configure your Claude MCP server',
          targetServerType: 'claude-mcp',
          steps: [
            {
              id: 'basics',
              title: 'Basic Settings',
              description: 'Configure the basic server settings',
              fields: [
                {
                  id: 'server.port',
                  type: 'port',
                  label: 'Server Port',
                  description: 'The port your MCP server will listen on',
                  defaultValue: 3000,
                  required: true,
                  validation: {
                    min: 1024,
                    max: 65535,
                    message: 'Port must be between 1024 and 65535'
                  }
                },
                {
                  id: 'server.host',
                  type: 'string',
                  label: 'Host',
                  description: 'The host address to bind to',
                  defaultValue: 'localhost',
                  required: true,
                  advanced: true
                }
              ],
              nextStep: 'api'
            },
            {
              id: 'api',
              title: 'API Configuration',
              description: 'Configure your API credentials',
              fields: [
                {
                  id: 'model.provider',
                  type: 'select',
                  label: 'Model Provider',
                  description: 'Select the AI model provider',
                  defaultValue: 'anthropic',
                  required: true,
                  options: [
                    { label: 'Anthropic', value: 'anthropic' },
                    { label: 'Other', value: 'other' }
                  ]
                },
                {
                  id: 'model.service',
                  type: 'select',
                  label: 'Service',
                  description: 'Select the service to use',
                  defaultValue: 'claude',
                  required: true,
                  options: [
                    { label: 'Claude', value: 'claude' },
                    { label: 'Custom', value: 'custom' }
                  ],
                  condition: {
                    field: 'model.provider',
                    operator: '==',
                    value: 'anthropic'
                  }
                },
                {
                  id: 'model.apiKey',
                  type: 'password',
                  label: 'API Key',
                  description: 'Your Anthropic API key',
                  placeholder: 'Enter your API key',
                  required: true
                }
              ],
              nextStep: 'logging',
              previousStep: 'basics'
            },
            {
              id: 'logging',
              title: 'Logging',
              description: 'Configure logging settings',
              fields: [
                {
                  id: 'logging.level',
                  type: 'select',
                  label: 'Log Level',
                  description: 'Select the logging level',
                  defaultValue: 'info',
                  required: true,
                  options: [
                    { label: 'Error', value: 'error' },
                    { label: 'Warn', value: 'warn' },
                    { label: 'Info', value: 'info' },
                    { label: 'Debug', value: 'debug' }
                  ]
                },
                {
                  id: 'logging.format',
                  type: 'select',
                  label: 'Log Format',
                  description: 'Select the logging format',
                  defaultValue: 'json',
                  required: true,
                  options: [
                    { label: 'JSON', value: 'json' },
                    { label: 'Plain Text', value: 'text' }
                  ]
                },
                {
                  id: 'logging.directory',
                  type: 'path',
                  label: 'Log Directory',
                  description: 'Directory to store log files',
                  defaultValue: './logs',
                  required: true
                }
              ],
              nextStep: 'security',
              previousStep: 'api'
            },
            {
              id: 'security',
              title: 'Security',
              description: 'Configure security settings',
              fields: [
                {
                  id: 'security.enableCORS',
                  type: 'boolean',
                  label: 'Enable CORS',
                  description: 'Enable Cross-Origin Resource Sharing',
                  defaultValue: true,
                  required: true
                },
                {
                  id: 'security.authentication',
                  type: 'select',
                  label: 'Authentication',
                  description: 'Select authentication method',
                  defaultValue: 'none',
                  required: true,
                  options: [
                    { label: 'None', value: 'none' },
                    { label: 'API Key', value: 'apiKey' },
                    { label: 'JWT', value: 'jwt' }
                  ]
                }
              ],
              previousStep: 'logging'
            }
          ]
        };
        
        await this.saveWizard(wizard);
      }
    } catch (error) {
      this.logService.error('ConfigurationWizardService', `Failed to create built-in wizards: ${error.message}`);
    }
  }
  
  /**
   * Save a template to disk
   * @param template Template to save
   */
  public async saveTemplate(template: ConfigurationTemplate): Promise<void> {
    try {
      // Save template to disk
      const filePath = path.join(this.templatesPath, `${template.id}.json`);
      await fs.writeJSON(filePath, template, { spaces: 2 });
      
      // Update in-memory template
      const existingIndex = this.templates.findIndex(t => t.id === template.id);
      if (existingIndex >= 0) {
        this.templates[existingIndex] = template;
      } else {
        this.templates.push(template);
      }
      
      this.logService.debug('ConfigurationWizardService', `Saved template ${template.id}`);
      this.emit('template-saved', template);
    } catch (error) {
      this.logService.error('ConfigurationWizardService', `Failed to save template ${template.id}: ${error.message}`);
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
      const filePath = path.join(this.templatesPath, `${templateId}.json`);
      
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        
        // Remove from in-memory templates
        this.templates = this.templates.filter(t => t.id !== templateId);
        
        this.logService.debug('ConfigurationWizardService', `Deleted template ${templateId}`);
        this.emit('template-deleted', templateId);
        
        return true;
      }
      
      return false;
    } catch (error) {
      this.logService.error('ConfigurationWizardService', `Failed to delete template ${templateId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Save a wizard to disk
   * @param wizard Wizard to save
   */
  public async saveWizard(wizard: ConfigurationWizard): Promise<void> {
    try {
      // Save wizard to disk
      const filePath = path.join(this.wizardsPath, `${wizard.id}.json`);
      await fs.writeJSON(filePath, wizard, { spaces: 2 });
      
      // Update in-memory wizard
      const existingIndex = this.wizards.findIndex(w => w.id === wizard.id);
      if (existingIndex >= 0) {
        this.wizards[existingIndex] = wizard;
      } else {
        this.wizards.push(wizard);
      }
      
      this.logService.debug('ConfigurationWizardService', `Saved wizard ${wizard.id}`);
      this.emit('wizard-saved', wizard);
    } catch (error) {
      this.logService.error('ConfigurationWizardService', `Failed to save wizard ${wizard.id}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a wizard
   * @param wizardId Wizard ID to delete
   */
  public async deleteWizard(wizardId: string): Promise<boolean> {
    try {
      // Delete wizard file
      const filePath = path.join(this.wizardsPath, `${wizardId}.json`);
      
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        
        // Remove from in-memory wizards
        this.wizards = this.wizards.filter(w => w.id !== wizardId);
        
        this.logService.debug('ConfigurationWizardService', `Deleted wizard ${wizardId}`);
        this.emit('wizard-deleted', wizardId);
        
        return true;
      }
      
      return false;
    } catch (error) {
      this.logService.error('ConfigurationWizardService', `Failed to delete wizard ${wizardId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get all templates
   */
  public getTemplates(): ConfigurationTemplate[] {
    return [...this.templates];
  }
  
  /**
   * Get template by ID
   * @param id Template ID
   */
  public getTemplateById(id: string): ConfigurationTemplate | null {
    return this.templates.find(t => t.id === id) || null;
  }
  
  /**
   * Get templates compatible with a server
   * @param serverType Server type to check
   */
  public getCompatibleTemplates(serverType: string): ConfigurationTemplate[] {
    return this.templates.filter(t => 
      t.compatibleServers.includes(serverType) || t.compatibleServers.includes('*')
    );
  }
  
  /**
   * Get all wizards
   */
  public getWizards(): ConfigurationWizard[] {
    return [...this.wizards];
  }
  
  /**
   * Get wizard by ID
   * @param id Wizard ID
   */
  public getWizardById(id: string): ConfigurationWizard | null {
    return this.wizards.find(w => w.id === id) || null;
  }
  
  /**
   * Get wizards for a server type
   * @param serverType Server type to check
   */
  public getWizardsForServerType(serverType: string): ConfigurationWizard[] {
    return this.wizards.filter(w => w.targetServerType === serverType);
  }
  
  /**
   * Process configuration values through a template
   * @param values Configuration values
   * @param template Template to apply
   */
  public processConfigWithTemplate(
    values: Record<string, any>,
    template: ConfigurationTemplate
  ): Record<string, any> {
    // Deep clone template config
    const config = JSON.parse(JSON.stringify(template.config));
    
    // Merge values into config
    for (const [key, value] of Object.entries(values)) {
      if (key.includes('.')) {
        // Handle nested keys (e.g. "server.port")
        const parts = key.split('.');
        let current = config;
        
        // Navigate to the deepest object
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        
        // Set the value
        const lastPart = parts[parts.length - 1];
        current[lastPart] = value;
      } else {
        // Handle top-level keys
        config[key] = value;
      }
    }
    
    // Process environment variables
    const processedConfig = this.processEnvironmentVariables(config);
    
    return processedConfig;
  }
  
  /**
   * Process environment variable placeholders in a configuration
   * @param config Configuration object
   */
  private processEnvironmentVariables(config: Record<string, any>): Record<string, any> {
    // Deep clone config
    const processedConfig = JSON.parse(JSON.stringify(config));
    
    // Helper function to process strings
    const processString = (str: string): string => {
      return str.replace(/\${([^}]+)}/g, (_, envName) => {
        return process.env[envName] || '';
      });
    };
    
    // Helper function to process object recursively
    const processObject = (obj: Record<string, any>): Record<string, any> => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          obj[key] = processString(value);
        } else if (typeof value === 'object' && value !== null) {
          obj[key] = processObject(value);
        }
      }
      return obj;
    };
    
    return processObject(processedConfig);
  }
  
  /**
   * Create a configuration file from wizard values
   * @param values Configuration values
   * @param templateId Template ID to use
   * @param outputPath Path to save configuration file
   */
  public async createConfigurationFile(
    values: Record<string, any>,
    templateId: string,
    outputPath: string
  ): Promise<string> {
    try {
      // Get template
      const template = this.getTemplateById(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      // Process configuration
      const config = this.processConfigWithTemplate(values, template);
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(outputPath));
      
      // Write configuration file
      await fs.writeJSON(outputPath, config, { spaces: 2 });
      
      this.logService.info('ConfigurationWizardService', `Created configuration file at ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logService.error('ConfigurationWizardService', `Failed to create configuration file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get default values for a wizard
   * @param wizardId Wizard ID
   */
  public getDefaultValues(wizardId: string): Record<string, any> {
    const wizard = this.getWizardById(wizardId);
    if (!wizard) {
      return {};
    }
    
    const values: Record<string, any> = {};
    
    // Collect default values from all steps
    for (const step of wizard.steps) {
      for (const field of step.fields) {
        if (typeof field.defaultValue !== 'undefined') {
          values[field.id] = field.defaultValue;
        }
      }
    }
    
    return values;
  }
  
  /**
   * Validate configuration values against a wizard
   * @param values Configuration values
   * @param wizardId Wizard ID
   */
  public validateValues(
    values: Record<string, any>,
    wizardId: string
  ): { valid: boolean; errors: Record<string, string> } {
    const wizard = this.getWizardById(wizardId);
    if (!wizard) {
      return { valid: false, errors: { _general: 'Wizard not found' } };
    }
    
    const errors: Record<string, string> = {};
    
    // Validate all fields
    for (const step of wizard.steps) {
      for (const field of step.fields) {
        // Skip if field has a condition that's not met
        if (field.condition) {
          const conditionField = values[field.condition.field];
          
          switch (field.condition.operator) {
            case '==':
              if (conditionField !== field.condition.value) continue;
              break;
            case '!=':
              if (conditionField === field.condition.value) continue;
              break;
            case '>':
              if (conditionField <= field.condition.value) continue;
              break;
            case '<':
              if (conditionField >= field.condition.value) continue;
              break;
            case '>=':
              if (conditionField < field.condition.value) continue;
              break;
            case '<=':
              if (conditionField > field.condition.value) continue;
              break;
          }
        }
        
        const value = values[field.id];
        
        // Check required fields
        if (field.required && (value === undefined || value === null || value === '')) {
          errors[field.id] = `${field.label} is required`;
          continue;
        }
        
        // Skip validation if no value
        if (value === undefined || value === null || value === '') {
          continue;
        }
        
        // Type validation
        switch (field.type) {
          case 'number':
          case 'port':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              errors[field.id] = `${field.label} must be a number`;
            } else if (field.validation) {
              const numValue = Number(value);
              if (field.validation.min !== undefined && numValue < field.validation.min) {
                errors[field.id] = field.validation.message || `${field.label} must be at least ${field.validation.min}`;
              }
              if (field.validation.max !== undefined && numValue > field.validation.max) {
                errors[field.id] = field.validation.message || `${field.label} must be at most ${field.validation.max}`;
              }
            }
            break;
          
          case 'string':
          case 'password':
          case 'text':
          case 'path':
            if (typeof value !== 'string') {
              errors[field.id] = `${field.label} must be a string`;
            } else if (field.validation && field.validation.pattern) {
              const regex = new RegExp(field.validation.pattern);
              if (!regex.test(value)) {
                errors[field.id] = field.validation.message || `${field.label} has an invalid format`;
              }
            }
            break;
          
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors[field.id] = `${field.label} must be a boolean`;
            }
            break;
          
          case 'select':
            const options = field.options || [];
            const validValues = options.map(o => o.value);
            if (!validValues.includes(value)) {
              errors[field.id] = `${field.label} must be one of the available options`;
            }
            break;
        }
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}
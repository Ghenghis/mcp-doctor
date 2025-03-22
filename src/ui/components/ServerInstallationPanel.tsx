import * as React from 'react';
import { 
  RepositoryInfo, 
  ServerCompatibility 
} from '../../services/installation/ServerDetectionService';
import {
  InstallationProgress,
  InstallationOptions,
  InstallationResult
} from '../../services/installation/InstallationService';
import {
  ConfigurationWizard,
  ConfigurationTemplate,
  ConfigurationStep,
  ConfigurationField
} from '../../services/installation/ConfigurationWizardService';
import { AppContext } from '../contexts/AppContext';

// Interface for props
interface ServerInstallationPanelProps {
  onClose: () => void;
  onInstallComplete: (result: InstallationResult) => void;
}

// Interface for state
interface ServerInstallationPanelState {
  currentView: 'search' | 'compare' | 'install' | 'configure' | 'complete';
  searchQuery: string;
  searchResults: RepositoryInfo[];
  selectedServer: RepositoryInfo | null;
  compatibilityResults: ServerCompatibility[];
  installationProgress: InstallationProgress | null;
  configurationValues: Record<string, any>;
  currentStep: string;
  installationOptions: InstallationOptions;
  availableWizards: ConfigurationWizard[];
  availableTemplates: ConfigurationTemplate[];
  selectedWizard: ConfigurationWizard | null;
  selectedTemplate: ConfigurationTemplate | null;
  validationErrors: Record<string, string>;
  installationResult: InstallationResult | null;
  isLoading: boolean;
  loadingMessage: string;
}

/**
 * Panel component for MCP server installation
 */
export class ServerInstallationPanel extends React.Component<
  ServerInstallationPanelProps,
  ServerInstallationPanelState
> {
  static contextType = AppContext;
  context!: React.ContextType<typeof AppContext>;

  constructor(props: ServerInstallationPanelProps) {
    super(props);
    this.state = {
      currentView: 'search',
      searchQuery: '',
      searchResults: [],
      selectedServer: null,
      compatibilityResults: [],
      installationProgress: null,
      configurationValues: {},
      currentStep: '',
      installationOptions: {
        createShortcut: true,
        autoStart: false,
        addToPath: false
      },
      availableWizards: [],
      availableTemplates: [],
      selectedWizard: null,
      selectedTemplate: null,
      validationErrors: {},
      installationResult: null,
      isLoading: false,
      loadingMessage: ''
    };
  }

  // Perform initial search when component mounts
  componentDidMount() {
    this.searchServers();
  }

  // Search for available MCP servers
  handleSearch = () => {
    this.searchServers();
  };

  // Search servers implementation
  searchServers = async () => {
    try {
      this.setState({ isLoading: true, loadingMessage: 'Searching for MCP servers...' });

      // Get services from context
      const installationService = this.context.installationService;
      const serverDetectionService = this.context.serverDetectionService;

      // Scan for repositories
      const repos = await serverDetectionService.scanRepositories();

      this.setState({ 
        searchResults: repos,
        isLoading: false
      });
    } catch (error) {
      this.context.appManager.showError('Search Failed', error);
      this.setState({ isLoading: false });
    }
  };

  // Handle server selection
  handleSelectServer = async (server: RepositoryInfo) => {
    try {
      this.setState({ 
        isLoading: true, 
        loadingMessage: `Checking compatibility for ${server.name}...` 
      });

      // Get services from context
      const serverDetectionService = this.context.serverDetectionService;

      // Check compatibility
      const compatibility = await serverDetectionService.checkCompatibility(server);

      // Get configuration wizards
      const configurationWizardService = this.context.configurationWizardService;
      const wizards = configurationWizardService.getWizardsForServerType(server.name);
      const templates = configurationWizardService.getCompatibleTemplates(server.name);
      
      // Select first wizard and template if available
      const selectedWizard = wizards.length > 0 ? wizards[0] : null;
      const selectedTemplate = templates.length > 0 ? templates[0] : null;
      
      // Get default values if wizard is available
      let configurationValues = {};
      if (selectedWizard) {
        configurationValues = configurationWizardService.getDefaultValues(selectedWizard.id);
      }

      this.setState({
        selectedServer: server,
        compatibilityResults: [compatibility],
        availableWizards: wizards,
        availableTemplates: templates,
        selectedWizard,
        selectedTemplate,
        configurationValues,
        currentStep: selectedWizard ? selectedWizard.steps[0].id : '',
        currentView: 'compare',
        isLoading: false
      });
    } catch (error) {
      this.context.appManager.showError('Selection Failed', error);
      this.setState({ isLoading: false });
    }
  };

  // Handle installation
  handleInstall = async () => {
    const { selectedServer, installationOptions, selectedTemplate, configurationValues } = this.state;

    if (!selectedServer) return;

    try {
      this.setState({ 
        currentView: 'install',
        installationProgress: {
          stage: 'preparation',
          progress: 0,
          message: 'Preparing installation...'
        }
      });

      // Get services from context
      const installationService = this.context.installationService;
      const configurationWizardService = this.context.configurationWizardService;

      // Register progress handler
      installationService.on('progress', this.handleInstallationProgress);

      // Start installation
      const result = await installationService.installServer(selectedServer, installationOptions);

      // Unregister progress handler
      installationService.removeListener('progress', this.handleInstallationProgress);

      // If configuration template is selected, create configuration file
      if (result.success && selectedTemplate) {
        try {
          await configurationWizardService.createConfigurationFile(
            configurationValues,
            selectedTemplate.id,
            result.configPath
          );
        } catch (error) {
          result.warnings.push(`Failed to create configuration file: ${error.message}`);
        }
      }

      // Update state with result
      this.setState({
        installationResult: result,
        currentView: 'complete'
      });

      // Notify parent
      this.props.onInstallComplete(result);
    } catch (error) {
      this.context.appManager.showError('Installation Failed', error);
      
      // Update state with error
      this.setState({
        installationResult: {
          success: false,
          server: selectedServer,
          installedPath: '',
          configPath: '',
          executablePath: '',
          error: error,
          warnings: []
        },
        currentView: 'complete'
      });
    }
  };

  // Handle installation progress updates
  handleInstallationProgress = (progress: InstallationProgress) => {
    this.setState({ installationProgress: progress });
  };

  // Handle wizard step navigation
  handleNextStep = () => {
    const { selectedWizard, currentStep } = this.state;
    if (!selectedWizard) return;

    // Find current step
    const step = selectedWizard.steps.find(s => s.id === currentStep);
    if (!step || !step.nextStep) return;

    // Validate current step
    const validation = this.validateCurrentStep();
    if (!validation.valid) {
      this.setState({ validationErrors: validation.errors });
      return;
    }

    // Move to next step
    this.setState({ 
      currentStep: step.nextStep,
      validationErrors: {}
    });
  };

  // Handle previous step navigation
  handlePreviousStep = () => {
    const { selectedWizard, currentStep } = this.state;
    if (!selectedWizard) return;

    // Find current step
    const step = selectedWizard.steps.find(s => s.id === currentStep);
    if (!step || !step.previousStep) return;

    // Move to previous step
    this.setState({ 
      currentStep: step.previousStep,
      validationErrors: {}
    });
  };

  // Validate current configuration step
  validateCurrentStep = () => {
    const { selectedWizard, currentStep, configurationValues } = this.state;
    if (!selectedWizard) return { valid: true, errors: {} };

    // Get current step
    const step = selectedWizard.steps.find(s => s.id === currentStep);
    if (!step) return { valid: true, errors: {} };

    // Create errors object
    const errors: Record<string, string> = {};

    // Validate each field
    for (const field of step.fields) {
      // Skip if field has a condition that's not met
      if (field.condition) {
        const conditionField = configurationValues[field.condition.field];
        
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

      const value = configurationValues[field.id];
      
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

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  };

  // Handle form field change
  handleFieldChange = (fieldId: string, value: any) => {
    this.setState(prevState => ({
      configurationValues: {
        ...prevState.configurationValues,
        [fieldId]: value
      },
      validationErrors: {
        ...prevState.validationErrors,
        [fieldId]: undefined
      }
    }));
  };

  // Handle wizard selection
  handleWizardChange = (wizardId: string) => {
    const { availableWizards } = this.state;
    const wizard = availableWizards.find(w => w.id === wizardId) || null;
    
    if (wizard) {
      // Get default values for the wizard
      const configurationWizardService = this.context.configurationWizardService;
      const defaultValues = configurationWizardService.getDefaultValues(wizard.id);
      
      this.setState({
        selectedWizard: wizard,
        currentStep: wizard.steps[0].id,
        configurationValues: defaultValues,
        validationErrors: {}
      });
    }
  };

  // Handle template selection
  handleTemplateChange = (templateId: string) => {
    const { availableTemplates } = this.state;
    const template = availableTemplates.find(t => t.id === templateId) || null;
    
    this.setState({ selectedTemplate: template });
  };

  // Handle installation option change
  handleOptionChange = (option: keyof InstallationOptions, value: any) => {
    this.setState(prevState => ({
      installationOptions: {
        ...prevState.installationOptions,
        [option]: value
      }
    }));
  };

  // Render server card
  renderServerCard = (server: RepositoryInfo) => {
    return (
      <div 
        key={`${server.owner}/${server.name}`}
        className="server-card"
        onClick={() => this.handleSelectServer(server)}
      >
        <div className="server-header">
          <h3>{server.name}</h3>
          <span className="server-stars">★ {server.stars}</span>
        </div>
        <div className="server-description">{server.description}</div>
        <div className="server-meta">
          <div className="server-owner">by {server.owner}</div>
          <div className="server-updated">
            Updated {new Date(server.lastUpdated).toLocaleDateString()}
          </div>
        </div>
        <div className="server-platforms">
          {server.compatibleOS.map(os => (
            <span key={os} className={`platform-badge ${os}`}>{os}</span>
          ))}
        </div>
      </div>
    );
  };

  // Render compatibility details
  renderCompatibilityDetails = (compatibility: ServerCompatibility) => {
    return (
      <div className="compatibility-details">
        <h3>Compatibility Check</h3>
        
        <div className={`compatibility-status ${compatibility.compatible ? 'compatible' : 'incompatible'}`}>
          {compatibility.compatible 
            ? 'Compatible with your system' 
            : 'Some compatibility issues detected'
          }
        </div>
        
        {compatibility.reasons.length > 0 && (
          <div className="compatibility-reasons">
            <h4>Issues</h4>
            <ul>
              {compatibility.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="installation-requirements">
          <h4>Installation Requirements</h4>
          <div className="requirement-item">
            <span className="requirement-label">Disk Space:</span>
            <span className="requirement-value">
              {Math.round(compatibility.installationRequirements.diskSpaceRequired / (1024 * 1024))} MB
            </span>
          </div>
          
          <div className="requirement-item">
            <span className="requirement-label">Estimated Install Time:</span>
            <span className="requirement-value">
              {Math.round(compatibility.installationRequirements.estimatedInstallTime / 60)} minutes
            </span>
          </div>
          
          {compatibility.installationRequirements.missingDependencies.length > 0 && (
            <div className="requirement-item">
              <span className="requirement-label">Missing Dependencies:</span>
              <span className="requirement-value">
                {compatibility.installationRequirements.missingDependencies.join(', ')}
              </span>
            </div>
          )}
        </div>
        
        <div className="recommendation-score">
          <h4>Recommendation Score</h4>
          <div className="score-bar">
            <div 
              className="score-fill"
              style={{ width: `${compatibility.recommendationScore}%` }}
            />
            <span className="score-value">{Math.round(compatibility.recommendationScore)}%</span>
          </div>
        </div>
      </div>
    );
  };

  // Render configuration wizard
  renderConfigurationWizard = () => {
    const { selectedWizard, currentStep, configurationValues, validationErrors } = this.state;
    if (!selectedWizard) return null;

    // Find current step
    const step = selectedWizard.steps.find(s => s.id === currentStep);
    if (!step) return null;

    return (
      <div className="configuration-wizard">
        <div className="wizard-steps">
          {selectedWizard.steps.map(wizardStep => (
            <div 
              key={wizardStep.id} 
              className={`wizard-step ${wizardStep.id === currentStep ? 'active' : ''}`}
            >
              {wizardStep.title}
            </div>
          ))}
        </div>

        <div className="wizard-content">
          <h3>{step.title}</h3>
          <p className="step-description">{step.description}</p>

          <div className="form-fields">
            {step.fields.map(field => this.renderFormField(field))}
          </div>

          <div className="wizard-navigation">
            {step.previousStep && (
              <button 
                className="previous-button" 
                onClick={this.handlePreviousStep}
              >
                Previous
              </button>
            )}
            
            {step.nextStep ? (
              <button 
                className="next-button" 
                onClick={this.handleNextStep}
              >
                Next
              </button>
            ) : (
              <button 
                className="install-button" 
                onClick={this.handleInstall}
              >
                Install
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render form field
  renderFormField = (field: ConfigurationField) => {
    const { configurationValues, validationErrors } = this.state;
    const value = configurationValues[field.id];
    const error = validationErrors[field.id];

    // Skip if field has a condition that's not met
    if (field.condition) {
      const conditionField = configurationValues[field.condition.field];
      
      let conditionMet = false;
      switch (field.condition.operator) {
        case '==':
          conditionMet = conditionField === field.condition.value;
          break;
        case '!=':
          conditionMet = conditionField !== field.condition.value;
          break;
        case '>':
          conditionMet = conditionField > field.condition.value;
          break;
        case '<':
          conditionMet = conditionField < field.condition.value;
          break;
        case '>=':
          conditionMet = conditionField >= field.condition.value;
          break;
        case '<=':
          conditionMet = conditionField <= field.condition.value;
          break;
      }
      
      if (!conditionMet) {
        return null;
      }
    }

    return (
      <div key={field.id} className={`form-field ${error ? 'has-error' : ''}`}>
        <label htmlFor={field.id}>{field.label}</label>
        
        {field.description && (
          <div className="field-description">{field.description}</div>
        )}
        
        {this.renderFieldInput(field)}
        
        {error && <div className="field-error">{error}</div>}
      </div>
    );
  };

  // Render field input based on type
  renderFieldInput = (field: ConfigurationField) => {
    const { configurationValues } = this.state;
    const value = configurationValues[field.id];

    switch (field.type) {
      case 'string':
      case 'path':
        return (
          <input
            id={field.id}
            type="text"
            value={value || ''}
            placeholder={field.placeholder}
            onChange={e => this.handleFieldChange(field.id, e.target.value)}
          />
        );
      
      case 'password':
        return (
          <input
            id={field.id}
            type="password"
            value={value || ''}
            placeholder={field.placeholder}
            onChange={e => this.handleFieldChange(field.id, e.target.value)}
          />
        );
      
      case 'number':
      case 'port':
        return (
          <input
            id={field.id}
            type="number"
            value={value || ''}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            onChange={e => this.handleFieldChange(field.id, Number(e.target.value))}
          />
        );
      
      case 'boolean':
        return (
          <div className="checkbox-field">
            <input
              id={field.id}
              type="checkbox"
              checked={Boolean(value)}
              onChange={e => this.handleFieldChange(field.id, e.target.checked)}
            />
            <label htmlFor={field.id}>{field.label}</label>
          </div>
        );
      
      case 'select':
        return (
          <select
            id={field.id}
            value={value || ''}
            onChange={e => this.handleFieldChange(field.id, e.target.value)}
          >
            <option value="" disabled>Select...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'text':
        return (
          <textarea
            id={field.id}
            value={value || ''}
            placeholder={field.placeholder}
            onChange={e => this.handleFieldChange(field.id, e.target.value)}
          />
        );
      
      default:
        return null;
    }
  };

  // Render installation progress
  renderInstallationProgress = () => {
    const { installationProgress } = this.state;
    if (!installationProgress) return null;

    return (
      <div className="installation-progress">
        <h3>Installing Server</h3>
        
        <div className="progress-stage">
          {installationProgress.stage === 'error' ? 'Error' : installationProgress.message}
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${installationProgress.progress}%` }}
          />
        </div>
        
        <div className="progress-details">
          {installationProgress.details}
        </div>
        
        {installationProgress.stage === 'error' && installationProgress.error && (
          <div className="progress-error">
            {installationProgress.error.message}
          </div>
        )}
      </div>
    );
  };

  // Render installation result
  renderInstallationResult = () => {
    const { installationResult } = this.state;
    if (!installationResult) return null;

    return (
      <div className="installation-result">
        <h3>
          {installationResult.success 
            ? 'Installation Complete' 
            : 'Installation Failed'
          }
        </h3>
        
        {installationResult.success ? (
          <div className="result-success">
            <div className="result-item">
              <span className="result-label">Installed At:</span>
              <span className="result-value">{installationResult.installedPath}</span>
            </div>
            
            <div className="result-item">
              <span className="result-label">Config Path:</span>
              <span className="result-value">{installationResult.configPath}</span>
            </div>
            
            <div className="result-item">
              <span className="result-label">Executable Path:</span>
              <span className="result-value">{installationResult.executablePath}</span>
            </div>
            
            {installationResult.warnings.length > 0 && (
              <div className="result-warnings">
                <h4>Warnings</h4>
                <ul>
                  {installationResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="result-error">
            <div className="error-message">
              {installationResult.error?.message || 'Unknown error occurred'}
            </div>
          </div>
        )}
        
        <div className="result-actions">
          <button className="close-button" onClick={this.props.onClose}>
            Close
          </button>
          
          {installationResult.success && (
            <button 
              className="configure-button"
              onClick={() => {
                // Navigate to the server management page
                // This would typically be handled by the parent component
                this.props.onClose();
              }}
            >
              Manage Servers
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render loading spinner
  renderLoading = () => {
    const { isLoading, loadingMessage } = this.state;
    if (!isLoading) return null;

    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <div className="loading-message">{loadingMessage}</div>
      </div>
    );
  };

  render() {
    const { 
      currentView, 
      searchQuery, 
      searchResults, 
      selectedServer, 
      compatibilityResults,
      availableWizards,
      availableTemplates,
      selectedWizard,
      selectedTemplate,
      installationOptions,
      isLoading
    } = this.state;

    return (
      <div className="server-installation-panel">
        {/* Panel Header */}
        <div className="panel-header">
          <h2>MCP Server Installation</h2>
          <button className="close-button" onClick={this.props.onClose}>×</button>
        </div>

        {/* Search View */}
        {currentView === 'search' && (
          <div className="search-view">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search for MCP servers..."
                value={searchQuery}
                onChange={e => this.setState({ searchQuery: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && this.handleSearch()}
              />
              <button className="search-button" onClick={this.handleSearch}>
                Search
              </button>
            </div>

            <div className="search-results">
              {searchResults.length === 0 ? (
                <div className="no-results">
                  No MCP servers found. Try a different search term or check your internet connection.
                </div>
              ) : (
                searchResults.map(this.renderServerCard)
              )}
            </div>
          </div>
        )}

        {/* Compare View */}
        {currentView === 'compare' && selectedServer && (
          <div className="compare-view">
            <div className="selected-server">
              <h3>{selectedServer.name}</h3>
              <div className="server-description">{selectedServer.description}</div>
              <div className="server-meta">
                <div className="server-owner">by {selectedServer.owner}</div>
                <div className="server-updated">
                  Updated {new Date(selectedServer.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </div>

            {compatibilityResults.length > 0 && (
              this.renderCompatibilityDetails(compatibilityResults[0])
            )}

            <div className="configuration-options">
              <h3>Configuration Options</h3>
              
              <div className="form-field">
                <label htmlFor="wizard-select">Configuration Wizard</label>
                <select
                  id="wizard-select"
                  value={selectedWizard?.id || ''}
                  onChange={e => this.handleWizardChange(e.target.value)}
                >
                  {availableWizards.length === 0 && (
                    <option value="">No wizards available</option>
                  )}
                  {availableWizards.map(wizard => (
                    <option key={wizard.id} value={wizard.id}>
                      {wizard.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-field">
                <label htmlFor="template-select">Configuration Template</label>
                <select
                  id="template-select"
                  value={selectedTemplate?.id || ''}
                  onChange={e => this.handleTemplateChange(e.target.value)}
                >
                  {availableTemplates.length === 0 && (
                    <option value="">No templates available</option>
                  )}
                  {availableTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="installation-options">
                <h4>Installation Options</h4>
                
                <div className="checkbox-field">
                  <input
                    id="create-shortcut"
                    type="checkbox"
                    checked={installationOptions.createShortcut}
                    onChange={e => this.handleOptionChange('createShortcut', e.target.checked)}
                  />
                  <label htmlFor="create-shortcut">Create Desktop Shortcut</label>
                </div>
                
                <div className="checkbox-field">
                  <input
                    id="auto-start"
                    type="checkbox"
                    checked={installationOptions.autoStart}
                    onChange={e => this.handleOptionChange('autoStart', e.target.checked)}
                  />
                  <label htmlFor="auto-start">Auto-Start After Installation</label>
                </div>
                
                <div className="checkbox-field">
                  <input
                    id="add-to-path"
                    type="checkbox"
                    checked={installationOptions.addToPath}
                    onChange={e => this.handleOptionChange('addToPath', e.target.checked)}
                  />
                  <label htmlFor="add-to-path">Add to PATH</label>
                </div>
              </div>
              
              <div className="configure-actions">
                <button className="back-button" onClick={() => this.setState({ currentView: 'search' })}>
                  Back
                </button>
                
                {selectedWizard ? (
                  <button 
                    className="configure-button" 
                    onClick={() => this.setState({ currentView: 'configure' })}
                  >
                    Configure
                  </button>
                ) : (
                  <button 
                    className="install-button" 
                    onClick={this.handleInstall}
                  >
                    Install
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configure View */}
        {currentView === 'configure' && selectedWizard && (
          <div className="configure-view">
            {this.renderConfigurationWizard()}
          </div>
        )}

        {/* Install View */}
        {currentView === 'install' && (
          <div className="install-view">
            {this.renderInstallationProgress()}
          </div>
        )}

        {/* Complete View */}
        {currentView === 'complete' && (
          <div className="complete-view">
            {this.renderInstallationResult()}
          </div>
        )}

        {/* Loading Overlay */}
        {this.renderLoading()}

        <style jsx>{`
          .server-installation-panel {
            display: flex;
            flex-direction: column;
            height: 100%;
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            position: relative;
          }

          .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid #e0e0e0;
          }

          .panel-header h2 {
            margin: 0;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
          }

          /* Search View */
          .search-view {
            display: flex;
            flex-direction: column;
            flex: 1;
            padding: 16px;
            overflow: hidden;
          }

          .search-box {
            display: flex;
            margin-bottom: 16px;
          }

          .search-box input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 4px 0 0 4px;
            font-size: 14px;
          }

          .search-button {
            padding: 8px 16px;
            background-color: #2196f3;
            color: white;
            border: none;
            border-radius: 0 4px 4px 0;
            cursor: pointer;
          }

          .search-results {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
            overflow-y: auto;
            padding: 8px 0;
          }

          .server-card {
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .server-card:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border-color: #2196f3;
          }

          .server-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .server-header h3 {
            margin: 0;
          }

          .server-stars {
            color: #ffc107;
            font-weight: bold;
          }

          .server-description {
            margin-bottom: 12px;
            color: #666;
          }

          .server-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #757575;
            margin-bottom: 8px;
          }

          .server-platforms {
            display: flex;
            gap: 8px;
          }

          .platform-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            text-transform: capitalize;
          }

          .platform-badge.windows {
            background-color: #e3f2fd;
            color: #1565c0;
          }

          .platform-badge.macos {
            background-color: #e8f5e9;
            color: #2e7d32;
          }

          .platform-badge.linux {
            background-color: #fff3e0;
            color: #e65100;
          }

          .no-results {
            grid-column: 1 / -1;
            text-align: center;
            padding: 32px;
            color: #757575;
          }

          /* Compare View */
          .compare-view {
            display: flex;
            flex-direction: column;
            padding: 16px;
            overflow-y: auto;
          }

          .selected-server {
            margin-bottom: 16px;
            padding: 16px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            background-color: #f5f5f5;
          }

          .compatibility-details {
            margin-bottom: 16px;
            padding: 16px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
          }

          .compatibility-status {
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 12px;
            font-weight: bold;
          }

          .compatibility-status.compatible {
            background-color: #e8f5e9;
            color: #2e7d32;
          }

          .compatibility-status.incompatible {
            background-color: #ffebee;
            color: #c62828;
          }

          .compatibility-reasons {
            margin-bottom: 12px;
          }

          .compatibility-reasons ul {
            margin: 0;
            padding-left: 20px;
          }

          .installation-requirements {
            margin-bottom: 12px;
          }

          .requirement-item {
            display: flex;
            margin-bottom: 4px;
          }

          .requirement-label {
            width: 150px;
            font-weight: 500;
          }

          .recommendation-score {
            margin-top: 16px;
          }

          .score-bar {
            height: 24px;
            background-color: #f5f5f5;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
          }

          .score-fill {
            height: 100%;
            background-color: #4caf50;
            border-radius: 4px;
          }

          .score-value {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
          }

          .configuration-options {
            padding: 16px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
          }

          .form-field {
            margin-bottom: 16px;
          }

          .form-field label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
          }

          .form-field select,
          .form-field input[type="text"],
          .form-field input[type="password"],
          .form-field input[type="number"],
          .form-field textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 14px;
          }

          .checkbox-field {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
          }

          .checkbox-field input {
            margin-right: 8px;
          }

          .installation-options {
            margin-top: 16px;
          }

          .configure-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 16px;
          }

          .back-button {
            padding: 8px 16px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }

          .configure-button,
          .install-button {
            padding: 8px 16px;
            background-color: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }

          /* Configure View */
          .configure-view {
            display: flex;
            flex-direction: column;
            padding: 16px;
            overflow-y: auto;
          }

          .configuration-wizard {
            display: flex;
            flex-direction: column;
          }

          .wizard-steps {
            display: flex;
            margin-bottom: 16px;
            overflow-x: auto;
            border-bottom: 1px solid #e0e0e0;
          }

          .wizard-step {
            padding: 12px 16px;
            white-space: nowrap;
            border-bottom: 2px solid transparent;
            color: #757575;
          }

          .wizard-step.active {
            border-bottom-color: #2196f3;
            color: #2196f3;
            font-weight: 500;
          }

          .wizard-content {
            padding: 16px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
          }

          .step-description {
            margin-bottom: 16px;
            color: #666;
          }

          .field-description {
            margin-bottom: 8px;
            color: #666;
            font-size: 14px;
          }

          .field-error {
            color: #f44336;
            font-size: 12px;
            margin-top: 4px;
          }

          .form-field.has-error input,
          .form-field.has-error select,
          .form-field.has-error textarea {
            border-color: #f44336;
          }

          .wizard-navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
          }

          .previous-button {
            padding: 8px 16px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }

          .next-button,
          .install-button {
            padding: 8px 16px;
            background-color: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }

          /* Install View */
          .install-view {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px;
            flex: 1;
          }

          .installation-progress {
            width: 100%;
            max-width: 500px;
            text-align: center;
          }

          .progress-stage {
            margin-bottom: 16px;
            font-weight: 500;
          }

          .progress-bar {
            height: 24px;
            background-color: #f5f5f5;
            border-radius: 4px;
            margin-bottom: 16px;
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            background-color: #4caf50;
            border-radius: 4px;
            transition: width 0.3s ease;
          }

          .progress-details {
            margin-bottom: 16px;
            color: #666;
          }

          .progress-error {
            padding: 12px;
            background-color: #ffebee;
            color: #c62828;
            border-radius: 4px;
            margin-top: 16px;
          }

          /* Complete View */
          .complete-view {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px;
            flex: 1;
          }

          .installation-result {
            width: 100%;
            max-width: 500px;
          }

          .result-success,
          .result-error {
            margin-bottom: 24px;
          }

          .result-item {
            display: flex;
            margin-bottom: 8px;
          }

          .result-label {
            width: 120px;
            font-weight: 500;
          }

          .result-value {
            flex: 1;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
          }

          .result-warnings {
            margin-top: 16px;
            padding: 12px;
            background-color: #fff8e1;
            border-radius: 4px;
          }

          .result-warnings h4 {
            margin-top: 0;
            color: #f57c00;
          }

          .error-message {
            padding: 12px;
            background-color: #ffebee;
            color: #c62828;
            border-radius: 4px;
          }

          .result-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
          }

          /* Loading Overlay */
          .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 100;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #2196f3;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .loading-message {
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }
}
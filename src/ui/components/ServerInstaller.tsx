import * as React from 'react';
import { RepositoryInfo } from '../../services/installation/RepositoryScanner';
import { ServerRecommendation } from '../../services/installation/RecommendationEngine';
import { InstallationStatus } from '../../services/installation/InstallationService';
import { AppContext } from '../contexts/AppContext';

// Interface for wizard steps
interface WizardStep {
  id: string;
  title: string;
  description: string;
}

// Interface for component props
interface ServerInstallerProps {
  onClose: () => void;
  onComplete: (result: any) => void;
}

// Interface for component state
interface ServerInstallerState {
  currentStep: string;
  loading: boolean;
  error: string | null;
  availableServers: RepositoryInfo[];
  filteredServers: RepositoryInfo[];
  recommendations: ServerRecommendation[];
  selectedServer: RepositoryInfo | null;
  searchQuery: string;
  usageType: 'personal' | 'development' | 'production';
  prioritizeFactor: 'stability' | 'features' | 'performance' | 'ease-of-use';
  requiredFeatures: string[];
  installationStatus: InstallationStatus | null;
}

/**
 * Component for selecting and installing MCP servers
 */
export class ServerInstaller extends React.Component<ServerInstallerProps, ServerInstallerState> {
  static contextType = AppContext;
  context!: React.ContextType<typeof AppContext>;
  
  // Define wizard steps
  private steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Install MCP Server',
      description: 'This wizard will help you install a new MCP server.'
    },
    {
      id: 'search',
      title: 'Find a Server',
      description: 'Search for available MCP servers or select from recommendations.'
    },
    {
      id: 'details',
      title: 'Server Details',
      description: 'View details about the selected server.'
    },
    {
      id: 'install',
      title: 'Installation',
      description: 'Install and configure the selected server.'
    },
    {
      id: 'complete',
      title: 'Complete',
      description: 'Server installation completed.'
    }
  ];
  
  // Available features for selection
  private availableFeatures: string[] = [
    'chat',
    'image-generation',
    'completions',
    'embeddings',
    'function-calling',
    'streaming',
    'websockets',
    'multiple-models',
    'web-search',
    'memory'
  ];
  
  constructor(props: ServerInstallerProps) {
    super(props);
    
    this.state = {
      currentStep: 'welcome',
      loading: false,
      error: null,
      availableServers: [],
      filteredServers: [],
      recommendations: [],
      selectedServer: null,
      searchQuery: '',
      usageType: 'personal',
      prioritizeFactor: 'ease-of-use',
      requiredFeatures: [],
      installationStatus: null
    };
  }
  
  componentDidMount() {
    // Preload available servers when component mounts
    this.loadAvailableServers();
  }
  
  /**
   * Load available servers from the installation service
   */
  loadAvailableServers = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      // Get installation service
      const installationService = this.context.appManager.getInstallationService();
      
      // Scan for available servers
      const servers = await installationService.scanAvailableServers();
      
      // Get recommendations
      const recommendations = await installationService.getServerRecommendations({
        usageType: this.state.usageType,
        prioritizeFactor: this.state.prioritizeFactor,
        requiredFeatures: this.state.requiredFeatures.length > 0 ? this.state.requiredFeatures : undefined
      });
      
      this.setState({
        loading: false,
        availableServers: servers,
        filteredServers: servers,
        recommendations
      });
    } catch (error) {
      this.setState({
        loading: false,
        error: `Failed to load available servers: ${error.message}`
      });
    }
  };
  
  /**
   * Handle search query change
   */
  handleSearchChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    this.setState({ searchQuery: query });
    
    // Filter servers based on search query
    if (query.trim() === '') {
      // Reset to all servers if query is empty
      this.setState({ filteredServers: this.state.availableServers });
    } else {
      try {
        // Get installation service
        const installationService = this.context.appManager.getInstallationService();
        
        // Search for servers
        const results = await installationService.searchForServers(query);
        
        this.setState({ filteredServers: results });
      } catch (error) {
        this.setState({
          error: `Failed to search for servers: ${error.message}`
        });
      }
    }
  };
  
  /**
   * Handle usage type change
   */
  handleUsageTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const usageType = event.target.value as 'personal' | 'development' | 'production';
    this.setState({ usageType }, () => {
      // Update recommendations
      this.updateRecommendations();
    });
  };
  
  /**
   * Handle prioritize factor change
   */
  handlePrioritizeFactorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const prioritizeFactor = event.target.value as 'stability' | 'features' | 'performance' | 'ease-of-use';
    this.setState({ prioritizeFactor }, () => {
      // Update recommendations
      this.updateRecommendations();
    });
  };
  
  /**
   * Handle feature selection change
   */
  handleFeatureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const feature = event.target.value;
    const isChecked = event.target.checked;
    
    this.setState(prevState => {
      let requiredFeatures = [...prevState.requiredFeatures];
      
      if (isChecked && !requiredFeatures.includes(feature)) {
        requiredFeatures.push(feature);
      } else if (!isChecked && requiredFeatures.includes(feature)) {
        requiredFeatures = requiredFeatures.filter(f => f !== feature);
      }
      
      return { requiredFeatures };
    }, () => {
      // Update recommendations
      this.updateRecommendations();
    });
  };
  
  /**
   * Update server recommendations based on current preferences
   */
  updateRecommendations = async () => {
    try {
      // Get installation service
      const installationService = this.context.appManager.getInstallationService();
      
      // Get recommendations
      const recommendations = await installationService.getServerRecommendations({
        usageType: this.state.usageType,
        prioritizeFactor: this.state.prioritizeFactor,
        requiredFeatures: this.state.requiredFeatures.length > 0 ? this.state.requiredFeatures : undefined
      });
      
      this.setState({ recommendations });
    } catch (error) {
      this.setState({
        error: `Failed to update recommendations: ${error.message}`
      });
    }
  };
  
  /**
   * Handle server selection
   */
  handleSelectServer = (server: RepositoryInfo) => {
    this.setState({
      selectedServer: server,
      currentStep: 'details'
    });
  };
  
  /**
   * Handle installation status update
   */
  handleInstallationStatus = (status: InstallationStatus) => {
    this.setState({ installationStatus: status });
    
    // If installation is completed or failed, update step
    if (status.stage === 'completed') {
      this.setState({ currentStep: 'complete' });
    }
  };
  
  /**
   * Start server installation
   */
  startInstallation = async () => {
    const { selectedServer } = this.state;
    
    if (!selectedServer) {
      return;
    }
    
    try {
      this.setState({
        currentStep: 'install',
        loading: true,
        error: null,
        installationStatus: {
          stage: 'installing',
          progress: 0,
          message: `Preparing to install ${selectedServer.name}...`
        }
      });
      
      // Get installation service
      const installationService = this.context.appManager.getInstallationService();
      
      // Listen for status updates
      installationService.on('status', this.handleInstallationStatus);
      
      // Install the server
      const result = await installationService.installServer(selectedServer);
      
      // Remove listener
      installationService.removeListener('status', this.handleInstallationStatus);
      
      // Update state
      this.setState({
        loading: false,
        currentStep: 'complete'
      });
      
      // Notify parent component
      this.props.onComplete(result);
    } catch (error) {
      // Remove listener
      const installationService = this.context.appManager.getInstallationService();
      installationService.removeListener('status', this.handleInstallationStatus);
      
      // Update state
      this.setState({
        loading: false,
        error: `Failed to install server: ${error.message}`,
        installationStatus: {
          stage: 'failed',
          progress: 0,
          message: `Failed to install ${selectedServer.name}`,
          error: error.message
        }
      });
    }
  };
  
  /**
   * Navigate to a specific step
   */
  goToStep = (step: string) => {
    this.setState({ currentStep: step });
  };
  
  /**
   * Navigate to the next step
   */
  nextStep = () => {
    const currentStepIndex = this.steps.findIndex(step => step.id === this.state.currentStep);
    
    if (currentStepIndex < this.steps.length - 1) {
      this.setState({
        currentStep: this.steps[currentStepIndex + 1].id
      });
    }
  };
  
  /**
   * Navigate to the previous step
   */
  prevStep = () => {
    const currentStepIndex = this.steps.findIndex(step => step.id === this.state.currentStep);
    
    if (currentStepIndex > 0) {
      this.setState({
        currentStep: this.steps[currentStepIndex - 1].id
      });
    }
  };
  
  /**
   * Format a date for display
   */
  formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  /**
   * Render the welcome step
   */
  renderWelcomeStep = () => {
    return (
      <div className="wizard-step">
        <div className="step-content">
          <h2>Welcome to MCP Server Installer</h2>
          <p>
            This wizard will help you find, install, and configure MCP servers for your system.
            The installer will:
          </p>
          <ul>
            <li>Search for available MCP servers</li>
            <li>Check compatibility with your system</li>
            <li>Recommend the best server for your needs</li>
            <li>Automatically install and configure the selected server</li>
          </ul>
          <p>
            Click "Next" to start finding the perfect MCP server for your needs.
          </p>
        </div>
        <div className="step-actions">
          <button
            className="btn-secondary"
            onClick={this.props.onClose}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => this.goToStep('search')}
          >
            Next
          </button>
        </div>
      </div>
    );
  };
  
  /**
   * Render the search step
   */
  renderSearchStep = () => {
    const { loading, error, filteredServers, recommendations, searchQuery, usageType, prioritizeFactor, requiredFeatures } = this.state;
    
    return (
      <div className="wizard-step">
        <div className="step-content">
          <h2>Find an MCP Server</h2>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="search-container">
            <div className="search-input">
              <input
                type="text"
                placeholder="Search for servers..."
                value={searchQuery}
                onChange={this.handleSearchChange}
              />
            </div>
            
            <div className="search-options">
              <h3>Preferences</h3>
              
              <div className="option-group">
                <label>Usage Type:</label>
                <select value={usageType} onChange={this.handleUsageTypeChange}>
                  <option value="personal">Personal</option>
                  <option value="development">Development</option>
                  <option value="production">Production</option>
                </select>
              </div>
              
              <div className="option-group">
                <label>Prioritize:</label>
                <select value={prioritizeFactor} onChange={this.handlePrioritizeFactorChange}>
                  <option value="stability">Stability</option>
                  <option value="features">Features</option>
                  <option value="performance">Performance</option>
                  <option value="ease-of-use">Ease of Use</option>
                </select>
              </div>
              
              <div className="option-group">
                <label>Required Features:</label>
                <div className="features-list">
                  {this.availableFeatures.map(feature => (
                    <div key={feature} className="feature-item">
                      <input
                        type="checkbox"
                        id={`feature-${feature}`}
                        value={feature}
                        checked={requiredFeatures.includes(feature)}
                        onChange={this.handleFeatureChange}
                      />
                      <label htmlFor={`feature-${feature}`}>
                        {feature.replace(/-/g, ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="search-results">
              {loading ? (
                <div className="loading">Loading servers...</div>
              ) : (
                <>
                  {recommendations.length > 0 && (
                    <div className="recommendations">
                      <h3>Recommended Servers</h3>
                      <div className="servers-grid">
                        {recommendations.slice(0, 3).map(recommendation => (
                          <div
                            key={recommendation.repository.id}
                            className="server-card recommended"
                            onClick={() => this.handleSelectServer(recommendation.repository)}
                          >
                            <div className="server-header">
                              <h4>{recommendation.repository.name}</h4>
                              <span className="score">{recommendation.score}% match</span>
                            </div>
                            <div className="server-description">
                              {recommendation.repository.description}
                            </div>
                            <div className="server-details">
                              <div className="detail">
                                <span className="label">Version:</span>
                                <span className="value">{recommendation.repository.version}</span>
                              </div>
                              <div className="detail">
                                <span className="label">Updated:</span>
                                <span className="value">{this.formatDate(recommendation.repository.lastUpdated)}</span>
                              </div>
                            </div>
                            <div className="server-reasons">
                              <strong>Why this server:</strong>
                              <ul>
                                {recommendation.reasons.slice(0, 2).map((reason, index) => (
                                  <li key={index}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="all-servers">
                    <h3>All Servers</h3>
                    {filteredServers.length === 0 ? (
                      <div className="no-results">No servers found matching your search</div>
                    ) : (
                      <div className="servers-list">
                        {filteredServers.map(server => (
                          <div
                            key={server.id}
                            className="server-item"
                            onClick={() => this.handleSelectServer(server)}
                          >
                            <div className="server-name">{server.name}</div>
                            <div className="server-owner">{server.owner}</div>
                            <div className="server-version">{server.version}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="step-actions">
          <button
            className="btn-secondary"
            onClick={() => this.goToStep('welcome')}
          >
            Back
          </button>
          <button
            className="btn-secondary"
            onClick={this.loadAvailableServers}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>
    );
  };
  
  /**
   * Render the details step
   */
  renderDetailsStep = () => {
    const { selectedServer } = this.state;
    
    if (!selectedServer) {
      return (
        <div className="wizard-step">
          <div className="step-content">
            <h2>Server Details</h2>
            <p>No server selected. Please go back and select a server.</p>
          </div>
          <div className="step-actions">
            <button
              className="btn-secondary"
              onClick={() => this.goToStep('search')}
            >
              Back
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="wizard-step">
        <div className="step-content">
          <h2>Server Details</h2>
          
          <div className="server-details-card">
            <div className="server-header">
              <h3>{selectedServer.name}</h3>
              <span className="server-version">v{selectedServer.version}</span>
            </div>
            
            <div className="server-description">
              {selectedServer.description}
            </div>
            
            <div className="server-metadata">
              <div className="metadata-item">
                <span className="label">Owner:</span>
                <span className="value">{selectedServer.owner}</span>
              </div>
              <div className="metadata-item">
                <span className="label">Last Updated:</span>
                <span className="value">{this.formatDate(selectedServer.lastUpdated)}</span>
              </div>
              <div className="metadata-item">
                <span className="label">Stars:</span>
                <span className="value">{selectedServer.stars}</span>
              </div>
            </div>
            
            {selectedServer.tags.length > 0 && (
              <div className="server-tags">
                <span className="label">Tags:</span>
                <div className="tags-list">
                  {selectedServer.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="server-requirements">
              <h4>System Requirements</h4>
              
              {selectedServer.requirements.os && (
                <div className="requirement-item">
                  <span className="label">Operating System:</span>
                  <span className="value">{selectedServer.requirements.os.join(', ')}</span>
                </div>
              )}
              
              {selectedServer.requirements.minMemory && (
                <div className="requirement-item">
                  <span className="label">Minimum Memory:</span>
                  <span className="value">{selectedServer.requirements.minMemory} MB</span>
                </div>
              )}
              
              {selectedServer.requirements.minCpu && (
                <div className="requirement-item">
                  <span className="label">Minimum CPU Cores:</span>
                  <span className="value">{selectedServer.requirements.minCpu}</span>
                </div>
              )}
              
              {selectedServer.requirements.dependencies && selectedServer.requirements.dependencies.length > 0 && (
                <div className="requirement-item">
                  <span className="label">Dependencies:</span>
                  <span className="value">{selectedServer.requirements.dependencies.join(', ')}</span>
                </div>
              )}
            </div>
            
            <div className="installation-source">
              <h4>Installation Source</h4>
              <div className="source-value">{selectedServer.installUrl}</div>
            </div>
          </div>
        </div>
        <div className="step-actions">
          <button
            className="btn-secondary"
            onClick={() => this.goToStep('search')}
          >
            Back
          </button>
          <button
            className="btn-primary"
            onClick={this.startInstallation}
          >
            Install
          </button>
        </div>
      </div>
    );
  };
  
  /**
   * Render the installation step
   */
  renderInstallStep = () => {
    const { installationStatus, selectedServer } = this.state;
    
    if (!selectedServer) {
      return null;
    }
    
    return (
      <div className="wizard-step">
        <div className="step-content">
          <h2>Installing {selectedServer.name}</h2>
          
          {installationStatus && (
            <div className="installation-status">
              <div className="status-header">
                <div className="status-stage">{installationStatus.stage}</div>
                <div className="status-progress">{installationStatus.progress}%</div>
              </div>
              
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${installationStatus.progress}%` }}
                />
              </div>
              
              <div className="status-message">
                {installationStatus.message}
              </div>
              
              {installationStatus.error && (
                <div className="status-error">
                  Error: {installationStatus.error.toString()}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="step-actions">
          {installationStatus && installationStatus.stage === 'failed' && (
            <>
              <button
                className="btn-secondary"
                onClick={() => this.goToStep('details')}
              >
                Back
              </button>
              <button
                className="btn-primary"
                onClick={this.startInstallation}
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    );
  };
  
  /**
   * Render the complete step
   */
  renderCompleteStep = () => {
    const { installationStatus, selectedServer } = this.state;
    
    if (!selectedServer || !installationStatus) {
      return null;
    }
    
    const successful = installationStatus.stage === 'completed';
    
    return (
      <div className="wizard-step">
        <div className="step-content">
          <div className={`completion-header ${successful ? 'success' : 'failed'}`}>
            <h2>
              {successful
                ? `Successfully Installed ${selectedServer.name}`
                : `Failed to Install ${selectedServer.name}`}
            </h2>
            <div className="completion-icon">
              {successful ? '✓' : '✗'}
            </div>
          </div>
          
          <div className="completion-message">
            {successful
              ? `${selectedServer.name} v${selectedServer.version} has been successfully installed and configured.`
              : `There was an error installing ${selectedServer.name}. ${installationStatus.message}`}
          </div>
          
          {successful && (
            <div className="next-steps">
              <h3>Next Steps</h3>
              <ul>
                <li>Configure API keys in the server configuration</li>
                <li>Start the server using the dashboard</li>
                <li>Connect your applications to the MCP server</li>
              </ul>
            </div>
          )}
        </div>
        <div className="step-actions">
          {!successful && (
            <button
              className="btn-secondary"
              onClick={() => this.goToStep('details')}
            >
              Back
            </button>
          )}
          <button
            className="btn-primary"
            onClick={this.props.onClose}
          >
            Finish
          </button>
        </div>
      </div>
    );
  };
  
  render() {
    const { currentStep } = this.state;
    const currentStepObj = this.steps.find(step => step.id === currentStep);
    
    if (!currentStepObj) {
      return null;
    }
    
    return (
      <div className="server-installer">
        <div className="installer-header">
          <h1>{currentStepObj.title}</h1>
          <p>{currentStepObj.description}</p>
        </div>
        
        <div className="installer-progress">
          {this.steps.map((step, index) => (
            <div
              key={step.id}
              className={`progress-step ${currentStep === step.id ? 'active' : ''} ${
                this.steps.findIndex(s => s.id === currentStep) > index ? 'completed' : ''
              }`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-name">{step.title}</div>
            </div>
          ))}
        </div>
        
        <div className="installer-content">
          {currentStep === 'welcome' && this.renderWelcomeStep()}
          {currentStep === 'search' && this.renderSearchStep()}
          {currentStep === 'details' && this.renderDetailsStep()}
          {currentStep === 'install' && this.renderInstallStep()}
          {currentStep === 'complete' && this.renderCompleteStep()}
        </div>

        <style jsx>{`
          .server-installer {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background-color: #f5f5f5;
            border-radius: 8px;
            overflow: hidden;
          }

          .installer-header {
            padding: 24px;
            background-color: #2196f3;
            color: white;
          }

          .installer-header h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
          }

          .installer-header p {
            margin: 0;
            opacity: 0.9;
          }

          .installer-progress {
            display: flex;
            background-color: white;
            padding: 16px;
            border-bottom: 1px solid #e0e0e0;
          }

          .progress-step {
            display: flex;
            align-items: center;
            flex: 1;
            position: relative;
          }

          .progress-step:not(:last-child)::after {
            content: '';
            position: absolute;
            top: 50%;
            left: calc(100% - 32px);
            right: 0;
            height: 2px;
            background-color: #e0e0e0;
            z-index: 1;
          }

          .progress-step.completed:not(:last-child)::after {
            background-color: #4caf50;
          }

          .step-number {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #e0e0e0;
            color: #616161;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 12px;
            z-index: 2;
          }

          .progress-step.active .step-number {
            background-color: #2196f3;
            color: white;
          }

          .progress-step.completed .step-number {
            background-color: #4caf50;
            color: white;
          }

          .step-name {
            font-size: 14px;
            font-weight: 500;
          }

          .installer-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
          }

          .wizard-step {
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .step-content {
            flex: 1;
          }

          .step-actions {
            display: flex;
            justify-content: flex-end;
            padding-top: 24px;
            gap: 12px;
          }

          button {
            padding: 10px 16px;
            border-radius: 4px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: background-color 0.2s;
          }

          .btn-primary {
            background-color: #2196f3;
            color: white;
          }

          .btn-primary:hover {
            background-color: #1976d2;
          }

          .btn-secondary {
            background-color: #f5f5f5;
            color: #424242;
            border: 1px solid #e0e0e0;
          }

          .btn-secondary:hover {
            background-color: #e0e0e0;
          }

          button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .error-message {
            padding: 12px;
            margin-bottom: 16px;
            background-color: #ffebee;
            color: #c62828;
            border-radius: 4px;
            border-left: 4px solid #f44336;
          }

          .search-container {
            display: grid;
            grid-template-columns: 1fr 3fr;
            grid-template-rows: auto 1fr;
            gap: 16px;
            height: 100%;
          }

          .search-input {
            grid-column: 1 / -1;
          }

          .search-input input {
            width: 100%;
            padding: 12px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 16px;
          }

          .search-options {
            background-color: white;
            padding: 16px;
            border-radius: 4px;
            border: 1px solid #e0e0e0;
          }

          .search-options h3 {
            margin-top: 0;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
          }

          .option-group {
            margin-bottom: 16px;
          }

          .option-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
          }

          .option-group select {
            width: 100%;
            padding: 8px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
          }

          .features-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .feature-item {
            display: flex;
            align-items: center;
          }

          .feature-item input {
            margin-right: 8px;
          }

          .search-results {
            background-color: white;
            border-radius: 4px;
            border: 1px solid #e0e0e0;
            overflow-y: auto;
          }

          .loading {
            padding: 24px;
            text-align: center;
            color: #616161;
          }

          .recommendations, .all-servers {
            padding: 16px;
          }

          .recommendations h3, .all-servers h3 {
            margin-top: 0;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
          }

          .servers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 16px;
          }

          .server-card {
            background-color: #f5f5f5;
            border-radius: 4px;
            padding: 16px;
            cursor: pointer;
            transition: box-shadow 0.2s;
          }

          .server-card:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .server-card.recommended {
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
          }

          .server-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }

          .server-header h4 {
            margin: 0;
          }

          .score {
            background-color: #2196f3;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }

          .server-description {
            margin-bottom: 12px;
            color: #616161;
            font-size: 14px;
          }

          .server-details {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
            font-size: 13px;
          }

          .detail {
            display: flex;
            flex-direction: column;
          }

          .label {
            font-weight: 500;
            color: #757575;
          }

          .server-reasons {
            font-size: 13px;
          }

          .server-reasons ul {
            margin: 4px 0 0 0;
            padding-left: 20px;
          }

          .servers-list {
            display: flex;
            flex-direction: column;
          }

          .server-item {
            display: flex;
            padding: 12px 16px;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
          }

          .server-item:hover {
            background-color: #f5f5f5;
          }

          .server-name {
            flex: 1;
            font-weight: 500;
          }

          .server-owner {
            margin-right: 16px;
            color: #616161;
          }

          .server-version {
            color: #757575;
            font-family: monospace;
          }

          .no-results {
            padding: 24px;
            text-align: center;
            color: #616161;
          }

          .server-details-card {
            background-color: white;
            border-radius: 4px;
            padding: 24px;
            border: 1px solid #e0e0e0;
          }

          .server-header {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
          }

          .server-header h3 {
            margin: 0;
            margin-right: 12px;
          }

          .server-version {
            background-color: #f5f5f5;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
            font-family: monospace;
          }

          .server-metadata {
            display: flex;
            gap: 24px;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid #f0f0f0;
          }

          .metadata-item {
            display: flex;
            flex-direction: column;
          }

          .server-tags {
            margin-bottom: 16px;
          }

          .tags-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
          }

          .tag {
            background-color: #f5f5f5;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
          }

          .server-requirements {
            margin-bottom: 16px;
          }

          .server-requirements h4, .installation-source h4 {
            margin-top: 0;
            margin-bottom: 12px;
          }

          .requirement-item {
            display: flex;
            margin-bottom: 8px;
          }

          .requirement-item .label {
            width: 160px;
          }

          .installation-source {
            background-color: #f5f5f5;
            padding: 16px;
            border-radius: 4px;
          }

          .source-value {
            font-family: monospace;
            word-break: break-all;
          }

          .installation-status {
            background-color: white;
            border-radius: 4px;
            padding: 24px;
            border: 1px solid #e0e0e0;
          }

          .status-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
          }

          .status-stage {
            text-transform: uppercase;
            font-weight: bold;
          }

          .progress-bar {
            height: 8px;
            background-color: #f5f5f5;
            border-radius: 4px;
            margin-bottom: 16px;
          }

          .progress-fill {
            height: 100%;
            background-color: #2196f3;
            border-radius: 4px;
            transition: width 0.3s;
          }

          .status-message {
            margin-bottom: 16px;
          }

          .status-error {
            padding: 12px;
            background-color: #ffebee;
            color: #c62828;
            border-radius: 4px;
          }

          .completion-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            padding: 24px;
            border-radius: 4px;
          }

          .completion-header.success {
            background-color: #e8f5e9;
            border-left: 4px solid #4caf50;
          }

          .completion-header.failed {
            background-color: #ffebee;
            border-left: 4px solid #f44336;
          }

          .completion-header h2 {
            margin: 0;
          }

          .completion-icon {
            font-size: 32px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .success .completion-icon {
            background-color: #4caf50;
            color: white;
          }

          .failed .completion-icon {
            background-color: #f44336;
            color: white;
          }

          .completion-message {
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 24px;
          }

          .next-steps {
            background-color: #f5f5f5;
            padding: 16px;
            border-radius: 4px;
          }

          .next-steps h3 {
            margin-top: 0;
            margin-bottom: 12px;
          }

          .next-steps ul {
            margin: 0;
            padding-left: 24px;
          }

          .next-steps li {
            margin-bottom: 8px;
          }
        `}</style>
      </div>
    );
  }
}
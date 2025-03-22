import * as React from 'react';
import { IServerProfile } from '../../services/management/ManagementService';

// Interface for props
interface ServerProfileFormProps {
  profile?: Partial<IServerProfile>;
  isEditing: boolean;
  onSave: (profile: Partial<IServerProfile>) => void;
  onCancel: () => void;
}

// Interface for state
interface ServerProfileFormState {
  name: string;
  type: 'Claude' | 'Windsurf' | 'Cursor' | 'Custom';
  executablePath: string;
  configPath: string;
  logPath: string;
  customSettings: Record<string, any>;
  errors: {
    name?: string;
    executablePath?: string;
    configPath?: string;
    logPath?: string;
  };
}

/**
 * Component for creating and editing server profiles
 */
export class ServerProfileForm extends React.Component<ServerProfileFormProps, ServerProfileFormState> {
  constructor(props: ServerProfileFormProps) {
    super(props);
    
    // Initialize state from props or defaults
    this.state = {
      name: props.profile?.name || '',
      type: props.profile?.type || 'Custom',
      executablePath: props.profile?.executablePath || '',
      configPath: props.profile?.configPath || '',
      logPath: props.profile?.logPath || '',
      customSettings: props.profile?.customSettings || {},
      errors: {}
    };
  }

  // Handle input changes
  handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    this.setState({ 
      [name]: value,
      errors: {
        ...this.state.errors,
        [name]: undefined
      }
    } as Pick<ServerProfileFormState, keyof ServerProfileFormState>);
  };

  // Browse for a file
  handleBrowse = async (fieldName: 'executablePath' | 'configPath' | 'logPath') => {
    try {
      // In Electron, we would use dialog.showOpenDialog
      // For this UI-only component, we'll simulate it with a file input
      const input = document.createElement('input');
      input.type = 'file';
      
      // Set appropriate filters based on fieldName
      if (fieldName === 'executablePath') {
        input.accept = '.exe,.app,.sh';
      } else if (fieldName === 'configPath') {
        input.accept = '.json,.yaml,.yml,.config,.conf';
      } else if (fieldName === 'logPath') {
        input.accept = '.log,.txt';
      }
      
      // Listen for file selection
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const filePath = files[0].path;
          this.setState({ 
            [fieldName]: filePath,
            errors: {
              ...this.state.errors,
              [fieldName]: undefined
            }
          } as Pick<ServerProfileFormState, keyof ServerProfileFormState>);
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  };

  // Add a custom setting
  handleAddCustomSetting = () => {
    const key = prompt('Enter setting key:');
    if (!key) return;
    
    const value = prompt('Enter setting value:');
    if (value === null) return;
    
    this.setState(prevState => ({
      customSettings: {
        ...prevState.customSettings,
        [key]: value
      }
    }));
  };

  // Remove a custom setting
  handleRemoveCustomSetting = (key: string) => {
    this.setState(prevState => {
      const customSettings = { ...prevState.customSettings };
      delete customSettings[key];
      return { customSettings };
    });
  };

  // Validate the form
  validateForm = (): boolean => {
    const errors: ServerProfileFormState['errors'] = {};
    
    if (!this.state.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!this.state.executablePath.trim()) {
      errors.executablePath = 'Executable path is required';
    }
    
    if (!this.state.configPath.trim()) {
      errors.configPath = 'Configuration path is required';
    }
    
    if (!this.state.logPath.trim()) {
      errors.logPath = 'Log path is required';
    }
    
    this.setState({ errors });
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!this.validateForm()) {
      return;
    }
    
    const { name, type, executablePath, configPath, logPath, customSettings } = this.state;
    
    this.props.onSave({
      ...(this.props.profile?.id ? { id: this.props.profile.id } : {}),
      name,
      type,
      executablePath,
      configPath,
      logPath,
      customSettings
    });
  };

  render() {
    const { isEditing, onCancel } = this.props;
    const { name, type, executablePath, configPath, logPath, customSettings, errors } = this.state;
    
    return (
      <div className="server-profile-form">
        <div className="form-header">
          <h2>{isEditing ? 'Edit Server Profile' : 'Create Server Profile'}</h2>
        </div>
        
        <form onSubmit={this.handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Profile Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={this.handleChange}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <div className="error-message">{errors.name}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="type">Server Type</label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={this.handleChange}
            >
              <option value="Claude">Claude Desktop</option>
              <option value="Windsurf">Windsurf Editor</option>
              <option value="Cursor">Cursor</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="executablePath">Executable Path</label>
            <div className="input-with-button">
              <input
                type="text"
                id="executablePath"
                name="executablePath"
                value={executablePath}
                onChange={this.handleChange}
                className={errors.executablePath ? 'error' : ''}
              />
              <button
                type="button"
                onClick={() => this.handleBrowse('executablePath')}
              >
                Browse
              </button>
            </div>
            {errors.executablePath && <div className="error-message">{errors.executablePath}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="configPath">Configuration Path</label>
            <div className="input-with-button">
              <input
                type="text"
                id="configPath"
                name="configPath"
                value={configPath}
                onChange={this.handleChange}
                className={errors.configPath ? 'error' : ''}
              />
              <button
                type="button"
                onClick={() => this.handleBrowse('configPath')}
              >
                Browse
              </button>
            </div>
            {errors.configPath && <div className="error-message">{errors.configPath}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="logPath">Log Path</label>
            <div className="input-with-button">
              <input
                type="text"
                id="logPath"
                name="logPath"
                value={logPath}
                onChange={this.handleChange}
                className={errors.logPath ? 'error' : ''}
              />
              <button
                type="button"
                onClick={() => this.handleBrowse('logPath')}
              >
                Browse
              </button>
            </div>
            {errors.logPath && <div className="error-message">{errors.logPath}</div>}
          </div>
          
          <div className="form-group">
            <label>Custom Settings</label>
            <div className="custom-settings-container">
              {Object.keys(customSettings).length === 0 ? (
                <div className="no-settings">No custom settings</div>
              ) : (
                <div className="custom-settings-list">
                  {Object.entries(customSettings).map(([key, value]) => (
                    <div key={key} className="custom-setting-item">
                      <div className="custom-setting-key">{key}</div>
                      <div className="custom-setting-value">{String(value)}</div>
                      <button
                        type="button"
                        className="remove-setting"
                        onClick={() => this.handleRemoveCustomSetting(key)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="add-setting"
                onClick={this.handleAddCustomSetting}
              >
                Add Custom Setting
              </button>
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="save-button">
              {isEditing ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        </form>

        <style jsx>{`
          .server-profile-form {
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
          }

          .form-header {
            padding: 16px;
            border-bottom: 1px solid #e0e0e0;
          }

          form {
            padding: 16px;
          }

          .form-group {
            margin-bottom: 16px;
          }

          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
          }

          input, select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 14px;
          }

          input.error, select.error {
            border-color: #f44336;
          }

          .error-message {
            color: #f44336;
            font-size: 12px;
            margin-top: 4px;
          }

          .input-with-button {
            display: flex;
            gap: 8px;
          }

          .input-with-button input {
            flex: 1;
          }

          .input-with-button button {
            padding: 8px 12px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
            white-space: nowrap;
          }

          .custom-settings-container {
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 12px;
            margin-top: 8px;
          }

          .no-settings {
            color: #757575;
            font-style: italic;
            margin-bottom: 12px;
          }

          .custom-settings-list {
            margin-bottom: 12px;
          }

          .custom-setting-item {
            display: flex;
            margin-bottom: 8px;
            padding: 8px;
            background-color: #f5f5f5;
            border-radius: 4px;
            align-items: center;
          }

          .custom-setting-key {
            font-weight: 500;
            margin-right: 8px;
          }

          .custom-setting-value {
            flex: 1;
            font-family: monospace;
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .remove-setting {
            background: none;
            border: none;
            color: #f44336;
            cursor: pointer;
            font-size: 16px;
            padding: 4px;
          }

          .add-setting {
            background-color: #e3f2fd;
            color: #1565c0;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            width: 100%;
          }

          .add-setting:hover {
            background-color: #bbdefb;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 24px;
          }

          .cancel-button {
            padding: 8px 16px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }

          .save-button {
            padding: 8px 16px;
            background-color: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }

          .save-button:hover {
            background-color: #1976d2;
          }
        `}</style>
      </div>
    );
  }
}
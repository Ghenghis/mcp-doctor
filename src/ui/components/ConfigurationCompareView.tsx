import * as React from 'react';
import { IServerProfile } from '../../services/management/ManagementService';

// Interface for the differences object
interface ConfigDifference {
  onlyIn?: 'profile1' | 'profile2';
  inBoth?: boolean;
  value?: any;
  profile1Value?: any;
  profile2Value?: any;
}

// Interface for component props
interface ConfigurationCompareViewProps {
  profile1: IServerProfile;
  profile2: IServerProfile;
  differences: Record<string, ConfigDifference>;
  onCopyToProfile1: (key: string, value: any) => void;
  onCopyToProfile2: (key: string, value: any) => void;
  onClose: () => void;
}

/**
 * Component for visually comparing configurations between two server profiles
 */
export class ConfigurationCompareView extends React.Component<ConfigurationCompareViewProps> {
  // Format a config value for display
  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  }

  // Render a difference row
  renderDifferenceRow(key: string, difference: ConfigDifference) {
    const { profile1, profile2 } = this.props;
    
    return (
      <div key={key} className="difference-row">
        <div className="key-column">
          <div className="key-name">{key}</div>
          <div className="key-type">
            {difference.onlyIn 
              ? `Only in ${difference.onlyIn === 'profile1' ? profile1.name : profile2.name}`
              : 'Different values'}
          </div>
        </div>
        
        <div className={`value-column ${difference.onlyIn === 'profile2' ? 'missing' : ''}`}>
          <div className="value-content">
            {difference.onlyIn === 'profile2' 
              ? <span className="missing-value">Missing</span>
              : <pre>{this.formatValue(difference.onlyIn === 'profile1' ? difference.value : difference.profile1Value)}</pre>
            }
          </div>
          {difference.onlyIn === 'profile2' && (
            <button 
              className="copy-button"
              onClick={() => this.props.onCopyToProfile1(key, difference.value)}
            >
              Copy to {profile1.name}
            </button>
          )}
        </div>
        
        <div className={`value-column ${difference.onlyIn === 'profile1' ? 'missing' : ''}`}>
          <div className="value-content">
            {difference.onlyIn === 'profile1' 
              ? <span className="missing-value">Missing</span>
              : <pre>{this.formatValue(difference.onlyIn === 'profile2' ? difference.value : difference.profile2Value)}</pre>
            }
          </div>
          {difference.onlyIn === 'profile1' && (
            <button 
              className="copy-button"
              onClick={() => this.props.onCopyToProfile2(key, difference.value)}
            >
              Copy to {profile2.name}
            </button>
          )}
        </div>
      </div>
    );
  }

  render() {
    const { profile1, profile2, differences, onClose } = this.props;
    const differenceKeys = Object.keys(differences);
    
    return (
      <div className="configuration-compare-view">
        <div className="compare-header">
          <h2>Configuration Comparison</h2>
          <button className="close-button" onClick={onClose}>Close</button>
        </div>
        
        <div className="profiles-header">
          <div className="key-column">Setting</div>
          <div className="value-column profile1-header">{profile1.name}</div>
          <div className="value-column profile2-header">{profile2.name}</div>
        </div>
        
        <div className="differences-container">
          {differenceKeys.length === 0 ? (
            <div className="no-differences">
              <p>No differences found between these configurations.</p>
            </div>
          ) : (
            differenceKeys.map(key => this.renderDifferenceRow(key, differences[key]))
          )}
        </div>
        
        <div className="compare-footer">
          <div className="difference-count">
            {differenceKeys.length} difference{differenceKeys.length !== 1 ? 's' : ''} found
          </div>
          <button className="close-button" onClick={onClose}>Close</button>
        </div>

        <style jsx>{`
          .configuration-compare-view {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .compare-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid #e0e0e0;
          }

          .profiles-header {
            display: flex;
            padding: 12px 16px;
            background-color: #f5f5f5;
            border-bottom: 1px solid #e0e0e0;
            font-weight: bold;
          }

          .profile1-header {
            background-color: #e3f2fd;
            color: #1565c0;
          }

          .profile2-header {
            background-color: #fff8e1;
            color: #ed6c02;
          }

          .differences-container {
            flex: 1;
            overflow-y: auto;
            padding: 8px 0;
          }

          .difference-row {
            display: flex;
            border-bottom: 1px solid #f0f0f0;
          }

          .difference-row:hover {
            background-color: #fafafa;
          }

          .key-column {
            width: 20%;
            padding: 12px 16px;
            border-right: 1px solid #f0f0f0;
          }

          .key-name {
            font-weight: 500;
            margin-bottom: 4px;
          }

          .key-type {
            font-size: 12px;
            color: #757575;
          }

          .value-column {
            flex: 1;
            padding: 12px 16px;
            position: relative;
            display: flex;
            flex-direction: column;
          }

          .value-column.missing {
            background-color: #ffebee;
          }

          .missing-value {
            color: #d32f2f;
            font-style: italic;
          }

          .value-content {
            flex: 1;
          }

          pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
          }

          .copy-button {
            align-self: flex-end;
            margin-top: 8px;
            padding: 6px 12px;
            background-color: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }

          .copy-button:hover {
            background-color: #1976d2;
          }

          .compare-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-top: 1px solid #e0e0e0;
            background-color: #f5f5f5;
          }

          .difference-count {
            font-weight: 500;
          }

          .close-button {
            padding: 8px 16px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }

          .close-button:hover {
            background-color: #e0e0e0;
          }

          .no-differences {
            padding: 32px;
            text-align: center;
            color: #757575;
          }
        `}</style>
      </div>
    );
  }
}
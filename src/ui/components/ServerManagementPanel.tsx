import * as React from 'react';
import { IServerProfile } from '../../services/management/ManagementService';

// Interface for props
interface ServerManagementPanelProps {
  profiles: IServerProfile[];
  activeProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onCreateProfile: () => void;
  onEditProfile: (id: string) => void;
  onDeleteProfile: (id: string) => void;
  onRefreshServers: () => void;
  onCompareServers: (id1: string, id2: string) => void;
}

// Interface for component state
interface ServerManagementPanelState {
  selectedProfileId: string | null;
  compareMode: boolean;
  compareProfileId: string | null;
}

/**
 * Component for managing multiple MCP server profiles
 */
export class ServerManagementPanel extends React.Component<ServerManagementPanelProps, ServerManagementPanelState> {
  constructor(props: ServerManagementPanelProps) {
    super(props);
    this.state = {
      selectedProfileId: props.activeProfileId,
      compareMode: false,
      compareProfileId: null
    };
  }

  // When new props arrive, update the selected profile if needed
  componentDidUpdate(prevProps: ServerManagementPanelProps) {
    if (prevProps.activeProfileId !== this.props.activeProfileId && !this.state.selectedProfileId) {
      this.setState({ selectedProfileId: this.props.activeProfileId });
    }
  }

  // Handle profile selection
  handleProfileSelect = (id: string) => {
    if (this.state.compareMode) {
      // In compare mode, set the second profile
      this.setState({ compareProfileId: id }, () => {
        if (this.state.selectedProfileId && this.state.compareProfileId) {
          this.props.onCompareServers(this.state.selectedProfileId, this.state.compareProfileId);
        }
      });
    } else {
      // Regular selection mode
      this.setState({ selectedProfileId: id });
      this.props.onSelectProfile(id);
    }
  };

  // Toggle compare mode
  toggleCompareMode = () => {
    this.setState(prevState => ({
      compareMode: !prevState.compareMode,
      compareProfileId: null
    }));
  };

  // Cancel compare mode
  cancelCompare = () => {
    this.setState({
      compareMode: false,
      compareProfileId: null
    });
  };

  // Get CSS class for the profile card
  getProfileCardClass = (profile: IServerProfile) => {
    let className = 'profile-card';
    
    if (profile.id === this.props.activeProfileId) {
      className += ' active-profile';
    }
    
    if (profile.id === this.state.selectedProfileId) {
      className += ' selected-profile';
    }
    
    if (profile.id === this.state.compareProfileId) {
      className += ' compare-profile';
    }
    
    return className;
  };

  // Render the profile card
  renderProfileCard = (profile: IServerProfile) => {
    return (
      <div 
        key={profile.id}
        className={this.getProfileCardClass(profile)}
        onClick={() => this.handleProfileSelect(profile.id)}
      >
        <div className="profile-header">
          <h3>{profile.name}</h3>
          <span className={`profile-type ${profile.type.toLowerCase()}`}>{profile.type}</span>
        </div>
        
        <div className="profile-details">
          <div className="detail-row">
            <span className="detail-label">Config:</span>
            <span className="detail-value">{profile.configPath}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Last used:</span>
            <span className="detail-value">{new Date(profile.lastUsed).toLocaleString()}</span>
          </div>
        </div>
        
        <div className="profile-actions">
          <button 
            className="edit-button"
            onClick={(e) => {
              e.stopPropagation();
              this.props.onEditProfile(profile.id);
            }}
          >
            Edit
          </button>
          <button 
            className="delete-button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to delete the profile "${profile.name}"?`)) {
                this.props.onDeleteProfile(profile.id);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  render() {
    const { profiles } = this.props;
    const { compareMode, selectedProfileId, compareProfileId } = this.state;

    return (
      <div className="server-management-panel">
        <div className="panel-header">
          <h2>MCP Server Management</h2>
          <div className="panel-actions">
            <button className="refresh-button" onClick={this.props.onRefreshServers}>
              Refresh Servers
            </button>
            <button className="create-button" onClick={this.props.onCreateProfile}>
              Create Profile
            </button>
            <button 
              className={`compare-button ${compareMode ? 'active' : ''}`} 
              onClick={this.toggleCompareMode}
            >
              {compareMode ? 'Cancel Compare' : 'Compare Servers'}
            </button>
          </div>
        </div>

        {compareMode && (
          <div className="compare-instructions">
            <p>
              {!selectedProfileId 
                ? 'Select the first server to compare' 
                : !compareProfileId 
                  ? 'Now select the second server to compare' 
                  : 'Comparing servers...'}
            </p>
            {(selectedProfileId || compareProfileId) && (
              <button className="reset-compare" onClick={this.cancelCompare}>
                Reset Selection
              </button>
            )}
          </div>
        )}

        <div className="profiles-grid">
          {profiles.length === 0 ? (
            <div className="no-profiles">
              <p>No server profiles found. Click "Refresh Servers" to detect installed servers or "Create Profile" to add one manually.</p>
            </div>
          ) : (
            profiles.map(profile => this.renderProfileCard(profile))
          )}
        </div>

        <style jsx>{`
          .server-management-panel {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
          }

          .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid #e0e0e0;
          }

          .panel-actions {
            display: flex;
            gap: 8px;
          }

          .compare-instructions {
            background-color: #f5f5f5;
            padding: 12px 16px;
            border-radius: 4px;
            margin: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .profiles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
            padding: 16px;
            overflow-y: auto;
          }

          .profile-card {
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .profile-card:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .active-profile {
            border-left: 4px solid #4caf50;
          }

          .selected-profile {
            background-color: #e3f2fd;
            border-color: #2196f3;
          }

          .compare-profile {
            background-color: #fff8e1;
            border-color: #ffc107;
          }

          .profile-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .profile-type {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }

          .profile-type.claude {
            background-color: #e3f2fd;
            color: #1565c0;
          }

          .profile-type.windsurf {
            background-color: #e8f5e9;
            color: #2e7d32;
          }

          .profile-type.cursor {
            background-color: #fff3e0;
            color: #e65100;
          }

          .profile-type.custom {
            background-color: #f3e5f5;
            color: #7b1fa2;
          }

          .profile-details {
            margin-bottom: 16px;
          }

          .detail-row {
            display: flex;
            margin-bottom: 4px;
          }

          .detail-label {
            font-weight: bold;
            width: 80px;
          }

          .detail-value {
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
          }

          .profile-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 8px;
          }

          button {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s ease;
          }

          .refresh-button {
            background-color: #f5f5f5;
            color: #333;
          }

          .create-button {
            background-color: #4caf50;
            color: white;
          }

          .compare-button {
            background-color: #2196f3;
            color: white;
          }

          .compare-button.active {
            background-color: #f44336;
          }

          .edit-button {
            background-color: #2196f3;
            color: white;
          }

          .delete-button {
            background-color: #f44336;
            color: white;
          }

          .reset-compare {
            background-color: #f5f5f5;
            color: #333;
          }

          button:hover {
            opacity: 0.9;
          }

          .no-profiles {
            grid-column: 1 / -1;
            text-align: center;
            padding: 32px;
            background-color: #f5f5f5;
            border-radius: 4px;
          }
        `}</style>
      </div>
    );
  }
}
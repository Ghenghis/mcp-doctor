import * as React from 'react';
import { ServerManagementPanel } from '../components/ServerManagementPanel';
import { ConfigurationCompareView } from '../components/ConfigurationCompareView';
import { ServerProfileForm } from '../components/ServerProfileForm';
import { IServerProfile } from '../../services/management/ManagementService';
import { AppContext } from '../contexts/AppContext';

// Interface for component state
interface ManagementPageState {
  currentView: 'list' | 'compare' | 'create' | 'edit';
  selectedProfileId: string | null;
  compareProfileId: string | null;
  editingProfile: IServerProfile | null;
  differenceData: Record<string, any> | null;
}

/**
 * Page component for managing MCP servers
 */
export class ManagementPage extends React.Component<{}, ManagementPageState> {
  static contextType = AppContext;
  context!: React.ContextType<typeof AppContext>;

  constructor(props: {}) {
    super(props);
    this.state = {
      currentView: 'list',
      selectedProfileId: null,
      compareProfileId: null,
      editingProfile: null,
      differenceData: null
    };
  }

  // Handle profile selection
  handleSelectProfile = (id: string) => {
    const { managementService, appManager } = this.context;
    
    managementService.setActiveProfile(id)
      .then(profile => {
        if (profile) {
          this.setState({ selectedProfileId: id });
          appManager.showNotification('Profile Active', `"${profile.name}" is now the active profile`);
        }
      })
      .catch(error => {
        appManager.showError('Error Activating Profile', error.message);
      });
  };

  // Handle refreshing server list
  handleRefreshServers = () => {
    const { managementService, appManager } = this.context;
    
    appManager.showLoading('Detecting Servers', 'Scanning for MCP servers...');
    
    managementService.detectServers()
      .then(detected => {
        appManager.hideLoading();
        appManager.showNotification('Server Detection', `Detected ${detected.length} MCP servers`);
      })
      .catch(error => {
        appManager.hideLoading();
        appManager.showError('Server Detection Failed', error.message);
      });
  };

  // Show create profile form
  handleCreateProfile = () => {
    this.setState({
      currentView: 'create',
      editingProfile: null
    });
  };

  // Show edit profile form
  handleEditProfile = (id: string) => {
    const { managementService } = this.context;
    const profile = managementService.getProfiles().find(p => p.id === id);
    
    if (profile) {
      this.setState({
        currentView: 'edit',
        editingProfile: profile
      });
    }
  };

  // Handle deleting a profile
  handleDeleteProfile = (id: string) => {
    const { managementService, appManager } = this.context;
    
    managementService.deleteProfile(id)
      .then(success => {
        if (success) {
          if (this.state.selectedProfileId === id) {
            this.setState({ selectedProfileId: null });
          }
          appManager.showNotification('Profile Deleted', 'Server profile has been deleted');
        } else {
          appManager.showError('Delete Failed', 'Failed to delete the profile');
        }
      })
      .catch(error => {
        appManager.showError('Delete Error', error.message);
      });
  };

  // Handle comparing servers
  handleCompareServers = async (id1: string, id2: string) => {
    const { managementService, appManager } = this.context;
    
    try {
      appManager.showLoading('Comparing Configurations', 'Analyzing differences...');
      
      const differences = await managementService.compareConfigurations(id1, id2);
      
      this.setState({
        currentView: 'compare',
        selectedProfileId: id1,
        compareProfileId: id2,
        differenceData: differences
      });
      
      appManager.hideLoading();
    } catch (error) {
      appManager.hideLoading();
      appManager.showError('Comparison Failed', error.message);
    }
  };

  // Handle saving a profile
  handleSaveProfile = (profileData: Partial<IServerProfile>) => {
    const { managementService, appManager } = this.context;
    const { currentView } = this.state;
    
    if (currentView === 'create') {
      // Creating a new profile
      managementService.createProfile(profileData as Omit<IServerProfile, 'id' | 'active' | 'lastUsed'>)
        .then(profile => {
          this.setState({ currentView: 'list' });
          appManager.showNotification('Profile Created', `"${profile.name}" profile has been created`);
        })
        .catch(error => {
          appManager.showError('Creation Failed', error.message);
        });
    } else if (currentView === 'edit' && profileData.id) {
      // Updating an existing profile
      managementService.updateProfile(profileData.id, profileData)
        .then(profile => {
          if (profile) {
            this.setState({ currentView: 'list', editingProfile: null });
            appManager.showNotification('Profile Updated', `"${profile.name}" profile has been updated`);
          } else {
            appManager.showError('Update Failed', 'Profile not found');
          }
        })
        .catch(error => {
          appManager.showError('Update Failed', error.message);
        });
    }
  };

  // Handle copying a setting from one profile to another
  handleCopySetting = async (key: string, value: any, toProfileId: string) => {
    const { managementService, appManager } = this.context;
    const { selectedProfileId, compareProfileId } = this.state;
    
    if (!selectedProfileId || !compareProfileId) return;
    
    try {
      const profile = managementService.getProfiles().find(p => p.id === toProfileId);
      if (!profile) {
        throw new Error('Target profile not found');
      }
      
      // Load the current config
      const config = await this.context.configService.loadConfigFile(profile.configPath);
      
      // Update the setting
      config[key] = value;
      
      // Save the updated config
      await this.context.configService.saveConfigFile(profile.configPath, config);
      
      // Refresh the comparison
      const newDifferences = await managementService.compareConfigurations(selectedProfileId, compareProfileId);
      this.setState({ differenceData: newDifferences });
      
      appManager.showNotification('Setting Copied', `Setting "${key}" has been copied to "${profile.name}"`);
    } catch (error) {
      appManager.showError('Copy Failed', error.message);
    }
  };

  // Render the component
  render() {
    const { currentView, selectedProfileId, compareProfileId, editingProfile, differenceData } = this.state;
    
    // Get profiles from management service
    const profiles = this.context.managementService.getProfiles();
    const activeProfileId = this.context.managementService.getActiveProfile()?.id || null;
    
    // For comparison view, get the selected profiles
    const selectedProfile = selectedProfileId 
      ? profiles.find(p => p.id === selectedProfileId) || null 
      : null;
      
    const compareProfile = compareProfileId
      ? profiles.find(p => p.id === compareProfileId) || null
      : null;
    
    return (
      <div className="management-page">
        {currentView === 'list' && (
          <ServerManagementPanel
            profiles={profiles}
            activeProfileId={activeProfileId}
            onSelectProfile={this.handleSelectProfile}
            onCreateProfile={this.handleCreateProfile}
            onEditProfile={this.handleEditProfile}
            onDeleteProfile={this.handleDeleteProfile}
            onRefreshServers={this.handleRefreshServers}
            onCompareServers={this.handleCompareServers}
          />
        )}
        
        {currentView === 'compare' && selectedProfile && compareProfile && differenceData && (
          <ConfigurationCompareView
            profile1={selectedProfile}
            profile2={compareProfile}
            differences={differenceData}
            onCopyToProfile1={(key, value) => this.handleCopySetting(key, value, selectedProfileId!)}
            onCopyToProfile2={(key, value) => this.handleCopySetting(key, value, compareProfileId!)}
            onClose={() => this.setState({ currentView: 'list' })}
          />
        )}
        
        {(currentView === 'create' || currentView === 'edit') && (
          <ServerProfileForm
            profile={currentView === 'edit' ? editingProfile || undefined : undefined}
            isEditing={currentView === 'edit'}
            onSave={this.handleSaveProfile}
            onCancel={() => this.setState({ currentView: 'list', editingProfile: null })}
          />
        )}

        <style jsx>{`
          .management-page {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 16px;
            background-color: #f9f9f9;
          }
        `}</style>
      </div>
    );
  }
}
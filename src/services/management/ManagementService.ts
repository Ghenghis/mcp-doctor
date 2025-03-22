import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { LogService } from '../logging/LogService';
import { ConfigService } from '../config/ConfigService';
import { SystemService } from '../system/SystemService';

/**
 * Interface representing an MCP server configuration profile
 */
export interface IServerProfile {
  id: string;
  name: string;
  type: 'Claude' | 'Windsurf' | 'Cursor' | 'Custom';
  executablePath: string;
  configPath: string;
  logPath: string;
  active: boolean;
  lastUsed: Date;
  customSettings: Record<string, any>;
}

/**
 * Service for unified management of multiple MCP servers
 */
export class ManagementService extends EventEmitter {
  private profiles: IServerProfile[] = [];
  private activeProfileId: string | null = null;
  private profilesPath: string;

  constructor(
    private logService: LogService,
    private configService: ConfigService,
    private systemService: SystemService
  ) {
    super();
    this.profilesPath = path.join(this.configService.getConfigDirectory(), 'profiles.json');
    this.loadProfiles();
  }

  /**
   * Load server profiles from storage
   */
  private async loadProfiles(): Promise<void> {
    try {
      if (await fs.pathExists(this.profilesPath)) {
        const data = await fs.readFile(this.profilesPath, 'utf8');
        this.profiles = JSON.parse(data);
        
        // Find active profile
        const activeProfile = this.profiles.find(p => p.active);
        if (activeProfile) {
          this.activeProfileId = activeProfile.id;
        }
        
        this.logService.info('ManagementService', `Loaded ${this.profiles.length} server profiles`);
      } else {
        this.logService.info('ManagementService', 'No profiles found, creating default profile store');
        await this.saveProfiles();
      }
    } catch (error) {
      this.logService.error('ManagementService', `Failed to load profiles: ${error.message}`);
      this.profiles = [];
    }
  }

  /**
   * Save server profiles to storage
   */
  private async saveProfiles(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.profilesPath));
      await fs.writeFile(this.profilesPath, JSON.stringify(this.profiles, null, 2));
      this.logService.debug('ManagementService', 'Profiles saved successfully');
    } catch (error) {
      this.logService.error('ManagementService', `Failed to save profiles: ${error.message}`);
    }
  }

  /**
   * Get all server profiles
   */
  public getProfiles(): IServerProfile[] {
    return [...this.profiles];
  }

  /**
   * Get active server profile
   */
  public getActiveProfile(): IServerProfile | null {
    if (!this.activeProfileId) return null;
    return this.profiles.find(p => p.id === this.activeProfileId) || null;
  }

  /**
   * Create a new server profile
   */
  public async createProfile(profile: Omit<IServerProfile, 'id' | 'active' | 'lastUsed'>): Promise<IServerProfile> {
    const newProfile: IServerProfile = {
      ...profile,
      id: Date.now().toString(),
      active: false,
      lastUsed: new Date()
    };

    this.profiles.push(newProfile);
    await this.saveProfiles();
    this.emit('profile-created', newProfile);
    return newProfile;
  }

  /**
   * Update an existing server profile
   */
  public async updateProfile(id: string, updates: Partial<Omit<IServerProfile, 'id'>>): Promise<IServerProfile | null> {
    const profileIndex = this.profiles.findIndex(p => p.id === id);
    if (profileIndex === -1) return null;

    const updatedProfile = {
      ...this.profiles[profileIndex],
      ...updates
    };

    this.profiles[profileIndex] = updatedProfile;
    await this.saveProfiles();
    this.emit('profile-updated', updatedProfile);
    return updatedProfile;
  }

  /**
   * Delete a server profile
   */
  public async deleteProfile(id: string): Promise<boolean> {
    const profileIndex = this.profiles.findIndex(p => p.id === id);
    if (profileIndex === -1) return false;

    // If deleting active profile, clear active profile
    if (this.activeProfileId === id) {
      this.activeProfileId = null;
    }

    const deletedProfile = this.profiles[profileIndex];
    this.profiles.splice(profileIndex, 1);
    await this.saveProfiles();
    this.emit('profile-deleted', deletedProfile);
    return true;
  }

  /**
   * Set a profile as active
   */
  public async setActiveProfile(id: string): Promise<IServerProfile | null> {
    const profileIndex = this.profiles.findIndex(p => p.id === id);
    if (profileIndex === -1) return null;

    // Deactivate current active profile
    if (this.activeProfileId) {
      const oldActiveIndex = this.profiles.findIndex(p => p.id === this.activeProfileId);
      if (oldActiveIndex !== -1) {
        this.profiles[oldActiveIndex].active = false;
      }
    }

    // Activate new profile
    this.profiles[profileIndex].active = true;
    this.profiles[profileIndex].lastUsed = new Date();
    this.activeProfileId = id;

    await this.saveProfiles();
    const activeProfile = this.profiles[profileIndex];
    this.emit('profile-activated', activeProfile);
    return activeProfile;
  }

  /**
   * Detect and create profiles for all installed MCP servers
   */
  public async detectServers(): Promise<IServerProfile[]> {
    const detectedServers: IServerProfile[] = [];
    
    try {
      // Detect Claude Desktop
      const claudeInfo = await this.systemService.detectClaudeDesktop();
      if (claudeInfo) {
        detectedServers.push({
          id: `claude-${Date.now()}`,
          name: 'Claude Desktop',
          type: 'Claude',
          executablePath: claudeInfo.executablePath,
          configPath: claudeInfo.configPath,
          logPath: claudeInfo.logPath,
          active: false,
          lastUsed: new Date(),
          customSettings: {}
        });
      }

      // Detect Windsurf
      const windsurfInfo = await this.systemService.detectWindsurf();
      if (windsurfInfo) {
        detectedServers.push({
          id: `windsurf-${Date.now()}`,
          name: 'Windsurf Editor',
          type: 'Windsurf',
          executablePath: windsurfInfo.executablePath,
          configPath: windsurfInfo.configPath,
          logPath: windsurfInfo.logPath,
          active: false,
          lastUsed: new Date(),
          customSettings: {}
        });
      }

      // Detect Cursor
      const cursorInfo = await this.systemService.detectCursor();
      if (cursorInfo) {
        detectedServers.push({
          id: `cursor-${Date.now()}`,
          name: 'Cursor',
          type: 'Cursor',
          executablePath: cursorInfo.executablePath,
          configPath: cursorInfo.configPath,
          logPath: cursorInfo.logPath,
          active: false,
          lastUsed: new Date(),
          customSettings: {}
        });
      }

      // Add detected servers to profiles
      for (const server of detectedServers) {
        // Check if server already exists in profiles
        const exists = this.profiles.some(
          p => p.type === server.type && p.executablePath === server.executablePath
        );

        if (!exists) {
          this.profiles.push(server);
        }
      }

      await this.saveProfiles();
      this.emit('servers-detected', detectedServers);
      return detectedServers;
    } catch (error) {
      this.logService.error('ManagementService', `Error detecting servers: ${error.message}`);
      return [];
    }
  }

  /**
   * Compare configurations between two server profiles
   */
  public async compareConfigurations(profileId1: string, profileId2: string): Promise<Record<string, any>> {
    const profile1 = this.profiles.find(p => p.id === profileId1);
    const profile2 = this.profiles.find(p => p.id === profileId2);
    
    if (!profile1 || !profile2) {
      throw new Error('One or both profiles not found');
    }

    try {
      const config1 = await this.configService.loadConfigFile(profile1.configPath);
      const config2 = await this.configService.loadConfigFile(profile2.configPath);
      
      // Create diff
      const differences: Record<string, any> = {};
      
      // Find all keys in both configs
      const allKeys = new Set([
        ...Object.keys(config1), 
        ...Object.keys(config2)
      ]);
      
      // Compare each key
      for (const key of allKeys) {
        if (!Object.prototype.hasOwnProperty.call(config1, key)) {
          differences[key] = { onlyIn: 'profile2', value: config2[key] };
        } else if (!Object.prototype.hasOwnProperty.call(config2, key)) {
          differences[key] = { onlyIn: 'profile1', value: config1[key] };
        } else if (JSON.stringify(config1[key]) !== JSON.stringify(config2[key])) {
          differences[key] = { 
            inBoth: true, 
            profile1Value: config1[key], 
            profile2Value: config2[key] 
          };
        }
      }
      
      return differences;
    } catch (error) {
      this.logService.error('ManagementService', `Error comparing configurations: ${error.message}`);
      throw error;
    }
  }
}
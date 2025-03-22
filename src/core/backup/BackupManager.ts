import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '../logging';
import { BackupInfo, MCPClient, MCPServer } from '../../types';

/**
 * Manages backups of MCP client configurations
 */
export class BackupManager {
  private logger = getLogger('BackupManager');
  private backupDir: string;
  private backups: BackupInfo[] = [];
  
  constructor() {
    // Set backup directory
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    
    // Ensure backup directory exists
    fs.ensureDirSync(this.backupDir);
  }
  
  /**
   * Initialize backup manager
   */
  async initialize(): Promise<void> {
    try {
      // Load existing backups
      await this.loadBackups();
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      this.logger.info(`Backup manager initialized with ${this.backups.length} backups`);
    } catch (error) {
      this.logger.error('Failed to initialize backup manager', error);
      throw error;
    }
  }
  
  /**
   * Create backup of client configuration
   * @param client MCP client
   */
  async createBackup(client: MCPClient): Promise<BackupInfo> {
    try {
      this.logger.info(`Creating backup of ${client.name} configuration`);
      
      // Generate backup ID
      const backupId = uuidv4();
      
      // Create backup file path
      const backupPath = path.join(
        this.backupDir,
        `${client.type}-${backupId}-${Date.now()}.json`
      );
      
      // Check if client config exists
      if (!(await fs.pathExists(client.configPath))) {
        throw new Error(`Client configuration file not found: ${client.configPath}`);
      }
      
      // Copy client config to backup
      await fs.copy(client.configPath, backupPath);
      
      // Create backup info
      const backupInfo: BackupInfo = {
        id: backupId,
        clientType: client.type,
        configPath: client.configPath,
        backupPath,
        timestamp: new Date(),
        servers: client.servers,
      };
      
      // Add to backups
      this.backups.push(backupInfo);
      
      // Save backup info
      await this.saveBackups();
      
      this.logger.info(`Created backup of ${client.name} configuration: ${backupId}`);
      
      return backupInfo;
    } catch (error) {
      this.logger.error(`Failed to create backup of ${client.name} configuration`, error);
      throw error;
    }
  }
  
  /**
   * Restore backup
   * @param backupId Backup ID
   */
  async restoreBackup(backupId: string): Promise<boolean> {
    try {
      // Find backup
      const backup = this.backups.find(b => b.id === backupId);
      if (!backup) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      this.logger.info(`Restoring backup: ${backupId}`);
      
      // Check if backup file exists
      if (!(await fs.pathExists(backup.backupPath))) {
        throw new Error(`Backup file not found: ${backup.backupPath}`);
      }
      
      // Create directory if it doesn't exist
      await fs.ensureDir(path.dirname(backup.configPath));
      
      // Copy backup to client config
      await fs.copy(backup.backupPath, backup.configPath);
      
      this.logger.info(`Restored backup: ${backupId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to restore backup: ${backupId}`, error);
      throw error;
    }
  }
  
  /**
   * Delete backup
   * @param backupId Backup ID
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      // Find backup
      const backupIndex = this.backups.findIndex(b => b.id === backupId);
      if (backupIndex === -1) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      const backup = this.backups[backupIndex];
      
      this.logger.info(`Deleting backup: ${backupId}`);
      
      // Delete backup file
      if (await fs.pathExists(backup.backupPath)) {
        await fs.unlink(backup.backupPath);
      }
      
      // Remove from backups
      this.backups.splice(backupIndex, 1);
      
      // Save backup info
      await this.saveBackups();
      
      this.logger.info(`Deleted backup: ${backupId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete backup: ${backupId}`, error);
      throw error;
    }
  }
  
  /**
   * Get all backups
   */
  getBackups(): BackupInfo[] {
    return [...this.backups];
  }
  
  /**
   * Get backup by ID
   * @param backupId Backup ID
   */
  getBackup(backupId: string): BackupInfo | undefined {
    return this.backups.find(b => b.id === backupId);
  }
  
  /**
   * Get backups for client
   * @param client MCP client
   */
  getBackupsForClient(client: MCPClient): BackupInfo[] {
    return this.backups.filter(b => 
      b.clientType === client.type && 
      b.configPath === client.configPath
    );
  }
  
  /**
   * Get latest backup for client
   * @param client MCP client
   */
  getLatestBackupForClient(client: MCPClient): BackupInfo | undefined {
    const clientBackups = this.getBackupsForClient(client);
    if (clientBackups.length === 0) {
      return undefined;
    }
    
    // Sort by timestamp (newest first)
    clientBackups.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    return clientBackups[0];
  }
  
  /**
   * Load backups from disk
   */
  private async loadBackups(): Promise<void> {
    try {
      // Load backup index
      const indexPath = path.join(this.backupDir, 'index.json');
      
      if (!(await fs.pathExists(indexPath))) {
        // No index file yet
        this.backups = [];
        return;
      }
      
      // Read and parse index
      const indexJson = await fs.readJson(indexPath);
      
      // Convert to BackupInfo objects
      this.backups = indexJson.map((backup: any) => ({
        ...backup,
        timestamp: new Date(backup.timestamp),
      }));
    } catch (error) {
      this.logger.error('Failed to load backups', error);
      this.backups = [];
    }
  }
  
  /**
   * Save backups to disk
   */
  private async saveBackups(): Promise<void> {
    try {
      // Save backup index
      const indexPath = path.join(this.backupDir, 'index.json');
      
      // Convert BackupInfo objects to JSON
      const indexJson = this.backups.map(backup => ({
        ...backup,
        timestamp: backup.timestamp.toISOString(),
      }));
      
      // Write index
      await fs.writeJson(indexPath, indexJson, { spaces: 2 });
    } catch (error) {
      this.logger.error('Failed to save backups', error);
      throw error;
    }
  }
  
  /**
   * Clean up old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      // Get maximum number of backups per client
      const maxBackupsPerClient = 10;
      
      // Group backups by client
      const clientBackups = new Map<string, BackupInfo[]>();
      
      for (const backup of this.backups) {
        const clientKey = `${backup.clientType}-${backup.configPath}`;
        
        if (!clientBackups.has(clientKey)) {
          clientBackups.set(clientKey, []);
        }
        
        clientBackups.get(clientKey)!.push(backup);
      }
      
      // Process each client
      for (const [clientKey, backups] of clientBackups.entries()) {
        // Sort by timestamp (newest first)
        backups.sort((a, b) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );
        
        // Keep only the newest backups
        if (backups.length > maxBackupsPerClient) {
          const backupsToDelete = backups.slice(maxBackupsPerClient);
          
          // Delete old backups
          for (const backup of backupsToDelete) {
            await this.deleteBackup(backup.id);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to clean up old backups', error);
    }
  }
  
  /**
   * Create automatic backup for client if needed
   * @param client MCP client
   */
  async createAutomaticBackupIfNeeded(client: MCPClient): Promise<BackupInfo | null> {
    try {
      // Get latest backup for client
      const latestBackup = this.getLatestBackupForClient(client);
      
      // Check if backup is needed
      const backupNeeded = !latestBackup || 
        Date.now() - latestBackup.timestamp.getTime() > 24 * 60 * 60 * 1000; // 24 hours
      
      if (backupNeeded) {
        // Create backup
        return await this.createBackup(client);
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to create automatic backup for ${client.name}`, error);
      return null;
    }
  }
}
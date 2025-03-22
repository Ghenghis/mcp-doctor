import { app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { EventEmitter } from 'events';
import { getLogger } from '../core/logging';

/**
 * Options for AutoUpdateService
 */
export interface AutoUpdateServiceOptions {
  /**
   * Whether to check for updates automatically at startup
   */
  checkAtStartup?: boolean;

  /**
   * Whether to install updates automatically
   */
  autoInstall?: boolean;

  /**
   * Whether to allow prerelease versions
   */
  allowPrerelease?: boolean;
}

/**
 * Service to handle application updates
 */
export class AutoUpdateService extends EventEmitter {
  private logger = getLogger('AutoUpdateService');
  private checkAtStartup: boolean;
  private autoInstall: boolean;

  /**
   * Create a new auto-update service
   * @param options Options for the service
   */
  constructor(options: AutoUpdateServiceOptions = {}) {
    super();
    
    this.checkAtStartup = options.checkAtStartup ?? true;
    this.autoInstall = options.autoInstall ?? false;
    
    // Configure auto updater
    autoUpdater.autoDownload = true;
    autoUpdater.allowPrerelease = options.allowPrerelease ?? false;
    
    // Set update channel based on app version
    if (app.getVersion().includes('beta')) {
      autoUpdater.channel = 'beta';
    } else if (app.getVersion().includes('alpha')) {
      autoUpdater.channel = 'alpha';
    } else {
      autoUpdater.channel = 'latest';
    }
    
    // Setup event handlers
    this.setupAutoUpdaterEvents();
  }
  
  /**
   * Start the auto-update service
   */
  async start(): Promise<void> {
    this.logger.info('Starting auto-update service');
    
    if (this.checkAtStartup) {
      // Wait for app to be ready before checking
      if (app.isReady()) {
        setTimeout(() => this.checkForUpdates(), 3000);
      } else {
        app.on('ready', () => {
          setTimeout(() => this.checkForUpdates(), 3000);
        });
      }
    }
  }
  
  /**
   * Check for updates
   * @param silent Whether to show notifications for no updates
   */
  async checkForUpdates(silent: boolean = false): Promise<void> {
    this.logger.info('Checking for updates...');
    
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.logger.error('Failed to check for updates', error);
      if (!silent) {
        dialog.showErrorBox(
          'Update Error',
          `Failed to check for updates: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
  
  /**
   * Download updates (if available)
   */
  async downloadUpdate(): Promise<void> {
    this.logger.info('Downloading update...');
    
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.logger.error('Failed to download update', error);
      dialog.showErrorBox(
        'Update Error',
        `Failed to download update: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Quit and install update
   */
  quitAndInstall(): void {
    this.logger.info('Installing update...');
    autoUpdater.quitAndInstall();
  }
  
  /**
   * Setup auto updater event handlers
   */
  private setupAutoUpdaterEvents(): void {
    // Update available
    autoUpdater.on('update-available', (info) => {
      this.logger.info(`Update available: ${info.version}`);
      this.emit('update-available', info);
      
      if (!this.autoInstall) {
        dialog.showMessageBox({
          type: 'info',
          title: 'Update Available',
          message: `Version ${info.version} is available. Download now?`,
          buttons: ['Yes', 'No'],
          defaultId: 0
        }).then(({ response }) => {
          if (response === 0) {
            this.downloadUpdate();
          }
        });
      }
    });
    
    // Update not available
    autoUpdater.on('update-not-available', (info) => {
      this.logger.info(`No update available: ${info.version}`);
      this.emit('update-not-available', info);
    });
    
    // Update error
    autoUpdater.on('error', (error) => {
      this.logger.error('Auto updater error', error);
      this.emit('error', error);
    });
    
    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      this.logger.info(`Update downloaded: ${info.version}`);
      this.emit('update-downloaded', info);
      
      if (this.autoInstall) {
        this.quitAndInstall();
      } else {
        dialog.showMessageBox({
          type: 'info',
          title: 'Update Ready',
          message: `Version ${info.version} has been downloaded. Install now?`,
          buttons: ['Install', 'Later'],
          defaultId: 0
        }).then(({ response }) => {
          if (response === 0) {
            this.quitAndInstall();
          }
        });
      }
    });
    
    // Download progress
    autoUpdater.on('download-progress', (progress) => {
      this.logger.debug(`Download progress: ${progress.percent.toFixed(2)}%`);
      this.emit('download-progress', progress);
    });
  }
}

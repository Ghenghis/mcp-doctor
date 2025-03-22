import { AutoUpdateService } from '../../services/AutoUpdateService';
import { AppManager } from '../../app/AppManager';
import { SystemDetector } from '../../core/diagnostics/SystemDetector';
import { LogAnalyzer } from '../../core/diagnostics/LogAnalyzer';
import { ConfigManager } from '../../core/config/ConfigManager';
import { BackupManager } from '../../core/backup/BackupManager';
import { UIService } from '../../services/UIService';

// Mock electron and electron-updater modules
jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    getPath: jest.fn().mockReturnValue('/mock/path'),
    isReady: jest.fn().mockReturnValue(true),
    on: jest.fn(),
  },
  dialog: {
    showMessageBox: jest.fn().mockResolvedValue({ response: 0 }),
    showErrorBox: jest.fn(),
  },
}));

jest.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: true,
    allowPrerelease: false,
    channel: 'latest',
    checkForUpdates: jest.fn().mockResolvedValue(undefined),
    downloadUpdate: jest.fn().mockResolvedValue(undefined),
    quitAndInstall: jest.fn(),
    on: jest.fn(),
  },
}));

// Mock dependencies
jest.mock('../../core/diagnostics/SystemDetector');
jest.mock('../../core/diagnostics/LogAnalyzer');
jest.mock('../../core/config/ConfigManager');
jest.mock('../../core/backup/BackupManager');
jest.mock('../../services/UIService');

// Mock the logger
jest.mock('../../core/logging', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('Auto Update Integration', () => {
  let autoUpdateService: AutoUpdateService;
  let appManager: AppManager;
  let systemDetector: SystemDetector;
  let logAnalyzer: LogAnalyzer;
  let configManager: ConfigManager;
  let backupManager: BackupManager;
  let uiService: UIService;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Initialize auto update service
    autoUpdateService = new AutoUpdateService({
      checkAtStartup: true,
      autoInstall: false,
    });
    
    // Initialize dependencies
    systemDetector = new SystemDetector();
    logAnalyzer = new LogAnalyzer();
    configManager = new ConfigManager();
    backupManager = new BackupManager();
    uiService = new UIService();
    
    // Initialize app manager
    appManager = new AppManager({
      systemDetector,
      logAnalyzer,
      configManager,
      backupManager,
      autoUpdateService,
    });
    
    // Mock UIService methods
    jest.spyOn(uiService, 'showNotification').mockImplementation();
    jest.spyOn(uiService, 'showErrorNotification').mockImplementation();
    
    // Set UI service
    (appManager as any).uiService = uiService;
  });
  
  test('Should initialize auto update service', async () => {
    // Start the auto update service
    await autoUpdateService.start();
    
    // Get the electron-updater autoUpdater mock
    const { autoUpdater } = require('electron-updater');
    
    // Verify auto-updater was configured
    expect(autoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function));
    expect(autoUpdater.on).toHaveBeenCalledWith('update-not-available', expect.any(Function));
    expect(autoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(autoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
    expect(autoUpdater.on).toHaveBeenCalledWith('download-progress', expect.any(Function));
    
    // Verify checkForUpdates was called
    expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
  });
  
  test('Should handle update available event', async () => {
    // Get the electron-updater autoUpdater mock
    const { autoUpdater } = require('electron-updater');
    
    // Register an event listener for update-available
    let updateAvailableCallback: Function | null = null;
    (autoUpdater.on as jest.Mock).mockImplementation((event, callback) => {
      if (event === 'update-available') {
        updateAvailableCallback = callback;
      }
    });
    
    // Start the auto update service
    await autoUpdateService.start();
    
    // Mock update info
    const updateInfo = {
      version: '1.1.0',
      releaseDate: '2025-03-22',
    };
    
    // Register event listener on the auto update service
    const updateAvailableSpy = jest.fn();
    autoUpdateService.on('update-available', updateAvailableSpy);
    
    // Trigger the update-available event
    if (updateAvailableCallback) {
      updateAvailableCallback(updateInfo);
    }
    
    // Verify event was emitted
    expect(updateAvailableSpy).toHaveBeenCalledWith(updateInfo);
    
    // Verify dialog was shown
    const { dialog } = require('electron');
    expect(dialog.showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Update Available',
      message: expect.stringContaining('1.1.0'),
    }));
    
    // Verify download was started (since dialog returns response 0)
    expect(autoUpdater.downloadUpdate).toHaveBeenCalled();
  });
  
  test('Should handle update downloaded event', async () => {
    // Get the electron-updater autoUpdater mock
    const { autoUpdater } = require('electron-updater');
    
    // Register an event listener for update-downloaded
    let updateDownloadedCallback: Function | null = null;
    (autoUpdater.on as jest.Mock).mockImplementation((event, callback) => {
      if (event === 'update-downloaded') {
        updateDownloadedCallback = callback;
      }
    });
    
    // Start the auto update service
    await autoUpdateService.start();
    
    // Mock update info
    const updateInfo = {
      version: '1.1.0',
      releaseDate: '2025-03-22',
    };
    
    // Register event listener on the auto update service
    const updateDownloadedSpy = jest.fn();
    autoUpdateService.on('update-downloaded', updateDownloadedSpy);
    
    // Trigger the update-downloaded event
    if (updateDownloadedCallback) {
      updateDownloadedCallback(updateInfo);
    }
    
    // Verify event was emitted
    expect(updateDownloadedSpy).toHaveBeenCalledWith(updateInfo);
    
    // Verify dialog was shown
    const { dialog } = require('electron');
    expect(dialog.showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Update Ready',
      message: expect.stringContaining('1.1.0'),
    }));
    
    // Verify quit and install was called (since dialog returns response 0)
    expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
  });
  
  test('Should handle error during update check', async () => {
    // Get the electron-updater autoUpdater mock
    const { autoUpdater } = require('electron-updater');
    
    // Mock checkForUpdates to throw an error
    (autoUpdater.checkForUpdates as jest.Mock).mockRejectedValue(new Error('Update check failed'));
    
    // Call checkForUpdates directly
    await autoUpdateService.checkForUpdates();
    
    // Verify error dialog was shown
    const { dialog } = require('electron');
    expect(dialog.showErrorBox).toHaveBeenCalledWith(
      'Update Error',
      expect.stringContaining('Update check failed')
    );
  });
  
  test('Should handle auto-install option', async () => {
    // Create auto update service with auto-install enabled
    const autoUpdateServiceWithAutoInstall = new AutoUpdateService({
      checkAtStartup: true,
      autoInstall: true,
    });
    
    // Get the electron-updater autoUpdater mock
    const { autoUpdater } = require('electron-updater');
    
    // Register an event listener for update-downloaded
    let updateDownloadedCallback: Function | null = null;
    (autoUpdater.on as jest.Mock).mockImplementation((event, callback) => {
      if (event === 'update-downloaded') {
        updateDownloadedCallback = callback;
      }
    });
    
    // Start the auto update service
    await autoUpdateServiceWithAutoInstall.start();
    
    // Trigger the update-downloaded event
    if (updateDownloadedCallback) {
      updateDownloadedCallback({ version: '1.1.0' });
    }
    
    // Verify dialog was NOT shown (since auto-install is enabled)
    const { dialog } = require('electron');
    expect(dialog.showMessageBox).not.toHaveBeenCalled();
    
    // Verify quit and install was called automatically
    expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
  });
});

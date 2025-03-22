import { app } from 'electron';
import { init as initLogger } from './core/logging';
import { AppManager } from './app/AppManager';
import { SystemDetector } from './core/diagnostics/SystemDetector';
import { LogAnalyzer } from './core/diagnostics/LogAnalyzer';
import { ConfigManager } from './core/config/ConfigManager';
import { BackupManager } from './core/backup/BackupManager';
import * as fs from 'fs-extra';
import * as path from 'path';

// Initialize logger
const logger = initLogger();

/**
 * Main entry point for MCP Doctor
 */
async function main() {
  logger.info('Starting MCP Doctor...');
  
  try {
    // Initialize the application
    const systemDetector = new SystemDetector();
    const logAnalyzer = new LogAnalyzer();
    const configManager = new ConfigManager();
    const backupManager = new BackupManager();
    
    // Create the app manager
    const appManager = new AppManager({
      systemDetector,
      logAnalyzer,
      configManager,
      backupManager,
    });
    
    // Initialize directories
    await initializeDirectories();
    
    // Start the application
    await appManager.start();
    
    // Run self-test
    await appManager.runSelfTest();
    
    logger.info('MCP Doctor started successfully');
  } catch (error) {
    logger.error('Failed to start MCP Doctor', error);
    app.quit();
  }
}

/**
 * Initialize required directories
 */
async function initializeDirectories() {
  // Ensure assets directory exists
  const assetsDir = path.join(__dirname, 'assets');
  await fs.ensureDir(assetsDir);
  
  // Ensure icons directory exists
  const iconsDir = path.join(assetsDir, 'icons');
  await fs.ensureDir(iconsDir);
  
  // Ensure icons subdirectories exist
  await fs.ensureDir(path.join(iconsDir, 'win'));
  await fs.ensureDir(path.join(iconsDir, 'mac'));
  await fs.ensureDir(path.join(iconsDir, 'png'));
  
  // Ensure logs directory exists
  const logsDir = path.join(app.getPath('userData'), 'logs');
  await fs.ensureDir(logsDir);
  
  // Ensure backups directory exists
  const backupsDir = path.join(app.getPath('userData'), 'backups');
  await fs.ensureDir(backupsDir);
}

// Handle app ready event
app.whenReady().then(main);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app activation
app.on('activate', () => {
  // On macOS re-create the window when the dock icon is clicked
  // AppManager will handle this event
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
});
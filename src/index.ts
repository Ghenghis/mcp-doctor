import { app } from 'electron';
import { init as initLogger } from './core/logging';
import { AppManager } from './app/AppManager';
import { SystemDetector } from './core/diagnostics/SystemDetector';
import { LogAnalyzer } from './core/diagnostics/LogAnalyzer';
import { ConfigManager } from './core/config/ConfigManager';
import { BackupManager } from './core/backup/BackupManager';
import { AIService } from './services/AIService';
import { AutoUpdateService } from './services/AutoUpdateService';
import { initializeSecurityServices } from './services/security';
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
    
    // Initialize AI service if API key is available
    let aiService = null;
    const apiKey = process.env.CLAUDE_API_KEY;
    if (apiKey) {
      aiService = new AIService({ apiKey });
      logger.info('Claude API integration initialized');
    } else {
      logger.info('Claude API key not found, AI features will be disabled');
    }
    
    // Initialize auto-update service
    const autoUpdateService = new AutoUpdateService({
      checkAtStartup: true,
      autoInstall: false,
      allowPrerelease: app.getVersion().includes('beta') || app.getVersion().includes('alpha')
    });
    logger.info('Auto-update service initialized');
    
    // Initialize security services
    initializeSecurityServices();
    logger.info('Security services initialized');
    
    // Create the app manager
    const appManager = new AppManager({
      systemDetector,
      logAnalyzer,
      configManager,
      backupManager,
      aiService,
      autoUpdateService
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
  
  // Ensure updates directory exists
  const updatesDir = path.join(app.getPath('userData'), 'updates');
  await fs.ensureDir(updatesDir);
  
  // Ensure security directory exists
  const securityDir = path.join(app.getPath('userData'), 'security');
  await fs.ensureDir(securityDir);
  await fs.ensureDir(path.join(securityDir, 'reports'));
  await fs.ensureDir(path.join(securityDir, 'patches'));
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

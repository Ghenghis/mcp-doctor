import { app, Tray, Menu, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getLogger } from '../core/logging';
import { SystemDetector } from '../core/diagnostics/SystemDetector';
import { LogAnalyzer } from '../core/diagnostics/LogAnalyzer';
import { ConfigManager } from '../core/config/ConfigManager';
import { BackupManager } from '../core/backup/BackupManager';
import { MonitorService } from '../services/MonitorService';
import { RepairService } from '../services/RepairService';
import { UIService } from '../services/UIService';
import { AIService } from '../services/AIService';
import { AILogAnalyzerService } from '../services/AILogAnalyzerService';
import { HealthLevel } from '../types';

/**
 * AppManager initialization options
 */
export interface AppManagerOptions {
  systemDetector: SystemDetector;
  logAnalyzer: LogAnalyzer;
  configManager: ConfigManager;
  backupManager: BackupManager;
  aiService?: AIService;
}

/**
 * Main application manager
 */
export class AppManager {
  private logger = getLogger('AppManager');
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private monitorService: MonitorService;
  private repairService: RepairService;
  private uiService: UIService;
  
  // Dependencies
  private systemDetector: SystemDetector;
  private logAnalyzer: LogAnalyzer;
  private configManager: ConfigManager;
  private backupManager: BackupManager;
  private aiService: AIService | null = null;
  private aiLogAnalyzerService: AILogAnalyzerService | null = null;
  
  constructor(options: AppManagerOptions) {
    this.systemDetector = options.systemDetector;
    this.logAnalyzer = options.logAnalyzer;
    this.configManager = options.configManager;
    this.backupManager = options.backupManager;
    
    // Initialize AI service if provided
    if (options.aiService) {
      this.aiService = options.aiService;
      
      // Initialize AI log analyzer service
      this.aiLogAnalyzerService = new AILogAnalyzerService({
        aiService: this.aiService,
        logAnalyzer: this.logAnalyzer,
      });
      
      this.logger.info('AI services initialized');
    }
    
    // Initialize services
    this.monitorService = new MonitorService({
      systemDetector: this.systemDetector,
      logAnalyzer: this.logAnalyzer,
      configManager: this.configManager,
    });
    
    this.repairService = new RepairService({
      systemDetector: this.systemDetector,
      configManager: this.configManager,
      backupManager: this.backupManager,
      aiLogAnalyzer: this.aiLogAnalyzerService || undefined,
    });
    
    this.uiService = new UIService();
  }
  
  /**
   * Start the application
   */
  async start(): Promise<void> {
    this.logger.info('Starting application manager');
    
    // Create tray icon
    await this.createTray();
    
    // Start monitoring service
    await this.monitorService.start();
    
    // Start repair service
    await this.repairService.start();
    
    // Start UI service
    await this.uiService.start();
    
    // Listen for status changes
    this.monitorService.on('status', (status) => {
      // Update tray icon based on status
      this.updateTrayIcon(status.overall);
      
      // Show notification for non-healthy status
      if (status.overall !== HealthLevel.Healthy) {
        this.uiService.showStatusNotification(status);
      }
    });
    
    this.logger.info('Application manager started');
  }
  
  /**
   * Stop the application
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping application manager');
    
    // Stop services
    await this.uiService.stop();
    await this.repairService.stop();
    await this.monitorService.stop();
    
    // Remove tray icon
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    
    this.logger.info('Application manager stopped');
  }
  
  /**
   * Create system tray icon and menu
   */
  private async createTray(): Promise<void> {
    // Get icon path based on platform
    const iconPath = path.join(__dirname, '..', 'assets', 'icons', 
      process.platform === 'win32' ? 'win/icon.ico' : 'png/16x16.png');
    
    // Create tray
    this.tray = new Tray(iconPath);
    this.tray.setToolTip('MCP Doctor');
    
    // Create tray menu with AI-powered option if available
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open Dashboard', click: () => this.openDashboard() },
      { label: 'Check Status', click: () => this.checkStatus() },
      { type: 'separator' },
      { label: 'Auto-Repair All', click: () => this.autoRepairAll() },
      ...(this.aiService ? [
        { label: 'AI-Powered Repair', click: () => this.aiRepairAll() },
      ] : []),
      { type: 'separator' },
      { label: 'Quit', click: () => this.quit() },
    ]);
    
    this.tray.setContextMenu(contextMenu);
    
    // Handle tray click
    this.tray.on('click', () => {
      this.openDashboard();
    });
  }
  
  /**
   * Update tray icon based on health level
   * @param healthLevel Health level to display
   */
  private updateTrayIcon(healthLevel: HealthLevel): void {
    if (!this.tray) {
      return;
    }
    
    // Get icon path based on health level
    let iconName: string;
    
    switch (healthLevel) {
      case HealthLevel.Healthy:
        iconName = 'icon';
        break;
      case HealthLevel.Minor:
        iconName = 'icon-warning';
        break;
      case HealthLevel.Major:
        iconName = 'icon-error';
        break;
      case HealthLevel.Critical:
        iconName = 'icon-critical';
        break;
      default:
        iconName = 'icon';
    }
    
    // Set icon based on platform
    const iconPath = path.join(
      __dirname,
      '..',
      'assets',
      'icons',
      process.platform === 'win32' ? `win/${iconName}.ico` : `png/16x16-${iconName}.png`
    );
    
    // Update tray icon
    this.tray.setImage(iconPath);
  }
  
  /**
   * Open the dashboard window
   */
  private openDashboard(): void {
    this.uiService.openMainWindow();
  }
  
  /**
   * Check status of all monitored servers
   */
  private async checkStatus(): Promise<void> {
    try {
      const status = await this.monitorService.checkStatus();
      this.uiService.showStatusNotification(status);
    } catch (error) {
      this.logger.error('Failed to check status', error);
      this.uiService.showErrorNotification('Failed to check status', error);
    }
  }
  
  /**
   * Auto-repair all clients
   */
  private async autoRepairAll(): Promise<void> {
    try {
      // Get system detection
      const detection = await this.systemDetector.detect();
      
      // Auto-repair each client
      for (const client of detection.mcpClients) {
        await this.repairService.autoRepair(client);
      }
      
      // Show success notification
      this.uiService.showNotification(
        'Auto-Repair Complete',
        'Automatic repairs have been applied'
      );
      
      // Check status again
      await this.checkStatus();
    } catch (error) {
      this.logger.error('Failed to auto-repair all', error);
      this.uiService.showErrorNotification('Failed to auto-repair all', error);
    }
  }
  
  /**
   * AI-powered repair for all clients
   */
  private async aiRepairAll(): Promise<void> {
    try {
      // Check if AI service is available
      if (!this.aiService || !this.aiLogAnalyzerService) {
        this.uiService.showErrorNotification(
          'AI Service Not Available',
          'AI-powered repair requires Claude API integration'
        );
        return;
      }
      
      // Get system detection
      const detection = await this.systemDetector.detect();
      
      // Show status notification
      this.uiService.showNotification(
        'AI-Powered Repair',
        'Analyzing system with Claude AI...'
      );
      
      // AI-powered repair for each client
      for (const client of detection.mcpClients) {
        // Create AI repair plan
        const plan = await this.repairService.createAIRepairPlan(client);
        
        // Apply repair plan
        await this.repairService.applyRepairPlan(client, plan);
      }
      
      // Show success notification
      this.uiService.showNotification(
        'AI-Powered Repair Complete',
        'Claude AI has analyzed and fixed issues'
      );
      
      // Check status again
      await this.checkStatus();
    } catch (error) {
      this.logger.error('Failed to perform AI-powered repair', error);
      this.uiService.showErrorNotification('Failed to perform AI-powered repair', error);
    }
  }
  
  /**
   * Quit the application
   */
  private quit(): void {
    this.stop().then(() => {
      app.quit();
    }).catch((error) => {
      this.logger.error('Error stopping application', error);
      app.exit(1);
    });
  }
  
  /**
   * Run self-test to verify application functionality
   */
  async runSelfTest(): Promise<boolean> {
    this.logger.info('Running self-test');
    
    try {
      // Test system detection
      const detection = await this.systemDetector.detect();
      this.logger.info(`Self-test: Detected ${detection.mcpClients.length} MCP clients`);
      
      // Test platform detection
      this.logger.info(`Self-test: Platform is ${detection.platform}`);
      
      // Test client status
      if (detection.mcpClients.length > 0) {
        // Test first client
        const client = detection.mcpClients[0];
        
        // Check client running
        const isRunning = await this.systemDetector.isClientRunning(client);
        this.logger.info(`Self-test: Client ${client.name} is ${isRunning ? 'running' : 'not running'}`);
        
        // Test log analysis
        const logAnalysis = await this.logAnalyzer.analyzeClientLogs(client);
        this.logger.info(`Self-test: Log analysis found ${logAnalysis.errors.length} errors and ${logAnalysis.warnings.length} warnings`);
        
        // Test AI log analysis if available
        if (this.aiLogAnalyzerService) {
          this.logger.info('Self-test: Testing AI log analysis');
          
          try {
            const aiAnalysis = await this.aiLogAnalyzerService.analyzeClientLogs(client);
            this.logger.info(`Self-test: AI log analysis found ${aiAnalysis.aiSuggestedFixes.length} suggested fixes`);
          } catch (error) {
            this.logger.warn('Self-test: AI log analysis failed', error);
          }
        }
      }
      
      this.logger.info('Self-test completed successfully');
      return true;
    } catch (error) {
      this.logger.error('Self-test failed', error);
      return false;
    }
  }
  
  /**
   * Initialize required directories and files
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing application');
    
    // Ensure assets directory exists
    const assetsDir = path.join(__dirname, '..', 'assets');
    await fs.ensureDir(assetsDir);
    
    // Ensure icons directory exists
    const iconsDir = path.join(assetsDir, 'icons');
    await fs.ensureDir(iconsDir);
    
    // Ensure logs directory exists
    const logsDir = path.join(app.getPath('userData'), 'logs');
    await fs.ensureDir(logsDir);
    
    // Ensure backups directory exists
    const backupsDir = path.join(app.getPath('userData'), 'backups');
    await fs.ensureDir(backupsDir);
    
    this.logger.info('Application initialized');
  }
}
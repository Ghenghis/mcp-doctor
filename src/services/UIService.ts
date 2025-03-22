import { app, Notification, BrowserWindow, dialog } from 'electron';
import * as path from 'path';
import { getLogger } from '../core/logging';
import { HealthLevel, SystemStatus } from '../types';

/**
 * Service for UI interactions
 */
export class UIService {
  private logger = getLogger('UIService');
  private mainWindow: BrowserWindow | null = null;
  
  constructor() {}
  
  /**
   * Start UI service
   */
  async start(): Promise<void> {
    this.logger.info('Starting UI service');
    this.logger.info('UI service started');
  }
  
  /**
   * Stop UI service
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping UI service');
    
    // Close main window if open
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close();
      this.mainWindow = null;
    }
    
    this.logger.info('UI service stopped');
  }
  
  /**
   * Show system status notification
   * @param status System status
   */
  showStatusNotification(status: SystemStatus): void {
    let title = 'MCP Doctor';
    let body = '';
    
    switch (status.overall) {
      case HealthLevel.Healthy:
        title = 'All MCP servers are healthy';
        body = 'No issues detected';
        break;
      
      case HealthLevel.Minor:
        title = 'Minor issues detected';
        body = 'Some MCP servers have minor issues';
        break;
      
      case HealthLevel.Major:
        title = 'Major issues detected';
        body = 'Some MCP servers have major issues that may require attention';
        break;
      
      case HealthLevel.Critical:
        title = 'Critical issues detected';
        body = 'Some MCP servers have critical issues that require immediate attention';
        break;
    }
    
    // Show notification
    this.showNotification(title, body);
  }
  
  /**
   * Show error notification
   * @param title Notification title
   * @param error Error to show
   */
  showErrorNotification(title: string, error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.showNotification(title, errorMessage);
  }
  
  /**
   * Show notification
   * @param title Notification title
   * @param body Notification body
   */
  showNotification(title: string, body: string): void {
    // Create notification
    const notification = new Notification({
      title,
      body,
      icon: this.getIconPath(),
    });
    
    // Show notification
    notification.show();
  }
  
  /**
   * Show message dialog
   * @param title Dialog title
   * @param message Dialog message
   * @param type Dialog type
   */
  async showMessageDialog(
    title: string,
    message: string,
    type: 'info' | 'error' | 'question' | 'warning' = 'info'
  ): Promise<void> {
    await dialog.showMessageBox({
      type,
      title,
      message,
      buttons: ['OK'],
      icon: this.getIconPath(),
    });
  }
  
  /**
   * Show confirmation dialog
   * @param title Dialog title
   * @param message Dialog message
   * @param type Dialog type
   */
  async showConfirmationDialog(
    title: string,
    message: string,
    type: 'info' | 'error' | 'question' | 'warning' = 'question'
  ): Promise<boolean> {
    const result = await dialog.showMessageBox({
      type,
      title,
      message,
      buttons: ['Cancel', 'OK'],
      defaultId: 1,
      cancelId: 0,
      icon: this.getIconPath(),
    });
    
    return result.response === 1;
  }
  
  /**
   * Open main window
   */
  openMainWindow(): void {
    // If window exists, bring it to front
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
      return;
    }
    
    // Create window
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: 'MCP Doctor',
      icon: this.getIconPath(),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
    
    // Load dashboard
    this.mainWindow.loadFile(path.join(__dirname, '..', 'assets', 'dashboard.html'));
    
    // Handle close
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }
  
  /**
   * Get icon path
   */
  private getIconPath(): string {
    // Get icon based on platform
    if (process.platform === 'win32') {
      return path.join(__dirname, '..', 'assets', 'icons', 'win', 'icon.ico');
    } else if (process.platform === 'darwin') {
      return path.join(__dirname, '..', 'assets', 'icons', 'mac', 'icon.icns');
    } else {
      return path.join(__dirname, '..', 'assets', 'icons', 'png', '256x256.png');
    }
  }
  
  /**
   * Get system status icon based on health level
   * @param healthLevel Health level
   */
  getStatusIcon(healthLevel: HealthLevel): string {
    switch (healthLevel) {
      case HealthLevel.Healthy:
        return '✅';
      case HealthLevel.Minor:
        return '⚠️';
      case HealthLevel.Major:
        return '⛔';
      case HealthLevel.Critical:
        return '🚨';
      default:
        return '❓';
    }
  }
  
  /**
   * Get system status text based on health level
   * @param healthLevel Health level
   */
  getStatusText(healthLevel: HealthLevel): string {
    switch (healthLevel) {
      case HealthLevel.Healthy:
        return 'Healthy';
      case HealthLevel.Minor:
        return 'Minor Issues';
      case HealthLevel.Major:
        return 'Major Issues';
      case HealthLevel.Critical:
        return 'Critical Issues';
      default:
        return 'Unknown';
    }
  }
  
  /**
   * Get system status color based on health level
   * @param healthLevel Health level
   */
  getStatusColor(healthLevel: HealthLevel): string {
    switch (healthLevel) {
      case HealthLevel.Healthy:
        return '#4caf50'; // Green
      case HealthLevel.Minor:
        return '#ff9800'; // Orange
      case HealthLevel.Major:
        return '#f44336'; // Red
      case HealthLevel.Critical:
        return '#9c27b0'; // Purple
      default:
        return '#9e9e9e'; // Gray
    }
  }
}
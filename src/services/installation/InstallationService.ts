import { exec } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { LogService } from '../logging/LogService';
import { SystemService } from '../system/SystemService';
import { RepositoryInfo, ServerDetectionService } from './ServerDetectionService';

/**
 * Interface for installation progress
 */
export interface InstallationProgress {
  stage: 'preparation' | 'dependencies' | 'download' | 'install' | 'configure' | 'verify' | 'complete' | 'error';
  progress: number;
  message: string;
  details?: string;
  error?: Error;
}

/**
 * Interface for installation result
 */
export interface InstallationResult {
  success: boolean;
  server: RepositoryInfo;
  installedPath: string;
  configPath: string;
  executablePath: string;
  error?: Error;
  warnings: string[];
}

/**
 * Interface for installation options
 */
export interface InstallationOptions {
  installPath?: string;
  configOptions?: Record<string, any>;
  customName?: string;
  autoStart?: boolean;
  createShortcut?: boolean;
  addToPath?: boolean;
}

/**
 * Service for installing MCP servers
 */
export class InstallationService extends EventEmitter {
  private installationPath: string;
  
  constructor(
    private logService: LogService,
    private systemService: SystemService,
    private serverDetectionService: ServerDetectionService
  ) {
    super();
    this.installationPath = path.join(os.homedir(), '.mcp-doctor', 'servers');
  }
  
  /**
   * Install an MCP server
   * @param server Repository to install
   * @param options Installation options
   */
  public async installServer(
    server: RepositoryInfo,
    options: InstallationOptions = {}
  ): Promise<InstallationResult> {
    this.logService.info('InstallationService', `Starting installation of ${server.name}`);
    
    try {
      // Create base result
      const result: InstallationResult = {
        success: false,
        server,
        installedPath: '',
        configPath: '',
        executablePath: '',
        warnings: []
      };
      
      // Determine installation path
      const installPath = options.installPath || this.getDefaultInstallPath(server);
      result.installedPath = installPath;
      
      // Emit preparation progress
      this.emitProgress({
        stage: 'preparation',
        progress: 0,
        message: 'Preparing installation environment'
      });
      
      // Create installation directory
      await fs.ensureDir(installPath);
      
      // Check for required dependencies
      const compatibility = await this.serverDetectionService.checkCompatibility(server);
      
      // Install missing dependencies
      if (compatibility.installationRequirements.missingDependencies.length > 0) {
        this.emitProgress({
          stage: 'dependencies',
          progress: 10,
          message: 'Installing missing dependencies',
          details: compatibility.installationRequirements.missingDependencies.join(', ')
        });
        
        for (const dependency of compatibility.installationRequirements.missingDependencies) {
          try {
            await this.installDependency(dependency);
          } catch (error) {
            result.warnings.push(`Failed to install dependency: ${dependency}`);
            this.logService.warn('InstallationService', `Failed to install dependency: ${dependency}`, error);
          }
        }
      }
      
      // Download from GitHub
      this.emitProgress({
        stage: 'download',
        progress: 30,
        message: 'Downloading from GitHub',
        details: `${server.owner}/${server.name}`
      });
      
      // Clone repository
      await this.executeCommand(`git clone https://github.com/${server.owner}/${server.name}.git .`, {
        cwd: installPath
      });
      
      // Install server
      this.emitProgress({
        stage: 'install',
        progress: 50,
        message: 'Installing server',
        details: server.installCommand
      });
      
      // Execute installation command
      await this.executeCommand('npm install', {
        cwd: installPath
      });
      
      // Configure server
      this.emitProgress({
        stage: 'configure',
        progress: 70,
        message: 'Configuring server',
        details: 'Setting up configuration files'
      });
      
      // Create configuration files
      const configPath = path.join(installPath, 'config');
      await fs.ensureDir(configPath);
      
      // Create default config
      const defaultConfig = await this.createDefaultConfig(server, options.configOptions || {});
      const configFilePath = path.join(configPath, 'config.json');
      await fs.writeJSON(configFilePath, defaultConfig, { spaces: 2 });
      
      result.configPath = configFilePath;
      
      // Determine executable path
      const executablePath = path.join(installPath, this.getExecutablePath(server));
      result.executablePath = executablePath;
      
      // Verify installation
      this.emitProgress({
        stage: 'verify',
        progress: 90,
        message: 'Verifying installation',
        details: 'Checking server functionality'
      });
      
      // Verify command
      const verifyResult = await this.verifyInstallation(server, installPath);
      
      if (!verifyResult.success) {
        result.warnings.push(`Verification warning: ${verifyResult.message}`);
      }
      
      // Post-installation tasks
      if (options.createShortcut) {
        await this.createShortcut(server, executablePath, options.customName);
      }
      
      if (options.addToPath) {
        await this.addToPath(executablePath);
      }
      
      // Auto-start if requested
      if (options.autoStart) {
        try {
          await this.startServer(server, installPath);
        } catch (error) {
          result.warnings.push(`Failed to auto-start server: ${error.message}`);
        }
      }
      
      // Complete installation
      this.emitProgress({
        stage: 'complete',
        progress: 100,
        message: 'Installation complete',
        details: `Server installed at ${installPath}`
      });
      
      result.success = true;
      return result;
    } catch (error) {
      this.logService.error('InstallationService', `Installation error for ${server.name}`, error);
      
      // Emit error progress
      this.emitProgress({
        stage: 'error',
        progress: 0,
        message: 'Installation failed',
        details: error.message,
        error
      });
      
      // Return error result
      return {
        success: false,
        server,
        installedPath: '',
        configPath: '',
        executablePath: '',
        error,
        warnings: []
      };
    }
  }
  
  /**
   * Get default installation path for a server
   * @param server Repository to install
   */
  private getDefaultInstallPath(server: RepositoryInfo): string {
    const sanitizedName = server.name.replace(/[^a-zA-Z0-9_-]/g, '-');
    return path.join(this.installationPath, sanitizedName);
  }
  
  /**
   * Install a dependency
   * @param dependency Dependency name
   */
  private async installDependency(dependency: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      exec(`npm install -g ${dependency}`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        resolve();
      });
    });
  }
  
  /**
   * Execute a command
   * @param command Command to execute
   * @param options Command options
   */
  private async executeCommand(command: string, options: { cwd?: string } = {}): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      exec(command, { cwd: options.cwd }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        resolve(stdout.trim());
      });
    });
  }
  
  /**
   * Create default configuration for a server
   * @param server Repository to configure
   * @param options Custom configuration options
   */
  private async createDefaultConfig(
    server: RepositoryInfo,
    options: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    // Base configuration
    const config: Record<string, any> = {
      server: {
        port: 3000,
        host: 'localhost'
      },
      logging: {
        level: 'info',
        directory: 'logs'
      },
      model: {
        provider: 'anthropic',
        apiKey: process.env.CLAUDE_API_KEY || ''
      }
    };
    
    // Merge custom options
    return {
      ...config,
      ...options
    };
  }
  
  /**
   * Get executable path for a server
   * @param server Repository to check
   */
  private getExecutablePath(server: RepositoryInfo): string {
    // Look for common executable patterns
    const possiblePaths = [
      'bin/server.js',
      'dist/server.js',
      'dist/index.js',
      'build/server.js',
      'build/index.js',
      'server.js',
      'index.js'
    ];
    
    // Return first match or default
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(path.join(this.installationPath, server.name, possiblePath))) {
        return possiblePath;
      }
    }
    
    return 'index.js';
  }
  
  /**
   * Verify server installation
   * @param server Repository to verify
   * @param installPath Installation path
   */
  private async verifyInstallation(
    server: RepositoryInfo,
    installPath: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check package.json exists
      if (!await fs.pathExists(path.join(installPath, 'package.json'))) {
        return {
          success: false,
          message: 'Missing package.json'
        };
      }
      
      // Check node_modules exists
      if (!await fs.pathExists(path.join(installPath, 'node_modules'))) {
        return {
          success: false,
          message: 'Missing node_modules'
        };
      }
      
      // Check for executable
      const executablePath = path.join(installPath, this.getExecutablePath(server));
      if (!await fs.pathExists(executablePath)) {
        return {
          success: false,
          message: 'Missing executable file'
        };
      }
      
      return {
        success: true,
        message: 'Verification successful'
      };
    } catch (error) {
      return {
        success: false,
        message: `Verification error: ${error.message}`
      };
    }
  }
  
  /**
   * Create shortcut for a server
   * @param server Repository to create shortcut for
   * @param executablePath Path to executable
   * @param customName Custom name for shortcut
   */
  private async createShortcut(
    server: RepositoryInfo,
    executablePath: string,
    customName?: string
  ): Promise<void> {
    // Platform-specific shortcut creation
    const shortcutName = customName || server.name;
    
    try {
      if (process.platform === 'win32') {
        // Windows shortcut
        const desktopPath = path.join(os.homedir(), 'Desktop');
        const shortcutPath = path.join(desktopPath, `${shortcutName}.lnk`);
        
        // Use Windows Script Host to create shortcut
        const script = `
          var wsh = new ActiveXObject('WScript.Shell');
          var shortcut = wsh.CreateShortcut('${shortcutPath}');
          shortcut.TargetPath = 'node';
          shortcut.Arguments = '"${executablePath}"';
          shortcut.Description = 'MCP Server - ${shortcutName}';
          shortcut.WorkingDirectory = '${path.dirname(executablePath)}';
          shortcut.Save();
        `;
        
        const scriptPath = path.join(os.tmpdir(), 'create-shortcut.js');
        await fs.writeFile(scriptPath, script);
        
        // Execute script
        await this.executeCommand(`cscript //NoLogo "${scriptPath}"`);
        
        // Cleanup
        await fs.remove(scriptPath);
      } else if (process.platform === 'darwin') {
        // macOS shortcut
        const applicationsPath = '/Applications';
        const appPath = path.join(applicationsPath, `${shortcutName}.app`);
        
        // Create .app structure
        await fs.ensureDir(path.join(appPath, 'Contents', 'MacOS'));
        
        // Create executable script
        const scriptContent = `#!/bin/bash
        cd "${path.dirname(executablePath)}"
        node "${executablePath}"
        `;
        
        const scriptPath = path.join(appPath, 'Contents', 'MacOS', shortcutName);
        await fs.writeFile(scriptPath, scriptContent);
        await fs.chmod(scriptPath, 0o755);
        
        // Create Info.plist
        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
        <plist version="1.0">
        <dict>
          <key>CFBundleExecutable</key>
          <string>${shortcutName}</string>
          <key>CFBundleIdentifier</key>
          <string>com.mcpdoctor.${shortcutName}</string>
          <key>CFBundleName</key>
          <string>${shortcutName}</string>
          <key>CFBundleDisplayName</key>
          <string>${shortcutName}</string>
        </dict>
        </plist>`;
        
        await fs.writeFile(path.join(appPath, 'Contents', 'Info.plist'), plistContent);
      } else {
        // Linux shortcut
        const desktopPath = path.join(os.homedir(), '.local', 'share', 'applications');
        await fs.ensureDir(desktopPath);
        
        const desktopContent = `[Desktop Entry]
        Type=Application
        Name=${shortcutName}
        Exec=node "${executablePath}"
        Terminal=true
        Categories=Development;
        `;
        
        await fs.writeFile(path.join(desktopPath, `${shortcutName}.desktop`), desktopContent);
        await fs.chmod(path.join(desktopPath, `${shortcutName}.desktop`), 0o755);
      }
    } catch (error) {
      this.logService.warn('InstallationService', `Failed to create shortcut: ${error.message}`);
      // Continue even if shortcut creation fails
    }
  }
  
  /**
   * Add executable to PATH
   * @param executablePath Path to executable
   */
  private async addToPath(executablePath: string): Promise<void> {
    try {
      const binDir = path.dirname(executablePath);
      
      if (process.platform === 'win32') {
        // Windows PATH
        const userPath = await this.executeCommand('echo %PATH%');
        if (!userPath.includes(binDir)) {
          // Add to user PATH using setx
          await this.executeCommand(`setx PATH "%PATH%;${binDir}"`);
        }
      } else {
        // Unix PATH
        const shellProfile = process.platform === 'darwin'
          ? path.join(os.homedir(), '.zshrc')  // macOS uses zsh by default now
          : path.join(os.homedir(), '.bashrc'); // Linux typically uses bash
        
        // Check if path already exists in profile
        let profileContent = '';
        try {
          profileContent = await fs.readFile(shellProfile, 'utf8');
        } catch (error) {
          // Create file if it doesn't exist
          await fs.writeFile(shellProfile, '', 'utf8');
        }
        
        // Only add if not already in PATH
        if (!profileContent.includes(binDir)) {
          const exportLine = `\n# Added by MCP Doctor\nexport PATH="$PATH:${binDir}"\n`;
          await fs.appendFile(shellProfile, exportLine);
        }
      }
    } catch (error) {
      this.logService.warn('InstallationService', `Failed to add to PATH: ${error.message}`);
      // Continue even if PATH modification fails
    }
  }
  
  /**
   * Start server after installation
   * @param server Repository to start
   * @param installPath Installation path
   */
  private async startServer(server: RepositoryInfo, installPath: string): Promise<void> {
    try {
      const executablePath = path.join(installPath, this.getExecutablePath(server));
      
      // Use detached process to keep server running after installation completes
      const { spawn } = require('child_process');
      const serverProcess = spawn('node', [executablePath], {
        cwd: installPath,
        detached: true,
        stdio: 'ignore'
      });
      
      // Unref process to allow parent to exit
      serverProcess.unref();
      
      this.logService.info('InstallationService', `Started server process with PID ${serverProcess.pid}`);
    } catch (error) {
      this.logService.error('InstallationService', `Failed to start server: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Emit installation progress
   * @param progress Progress data
   */
  private emitProgress(progress: InstallationProgress): void {
    this.emit('progress', progress);
    this.logService.debug('InstallationService', `Installation progress: ${progress.stage} (${progress.progress}%) - ${progress.message}`);
  }
  
  /**
   * Set base installation path
   * @param path New installation path
   */
  public setInstallationPath(path: string): void {
    this.installationPath = path;
  }
  
  /**
   * Get base installation path
   */
  public getInstallationPath(): string {
    return this.installationPath;
  }
  
  /**
   * Clean installation directory
   */
  public async cleanInstallations(): Promise<void> {
    try {
      await fs.emptyDir(this.installationPath);
      this.logService.info('InstallationService', 'Cleaned installation directory');
    } catch (error) {
      this.logService.error('InstallationService', `Failed to clean installation directory: ${error.message}`);
      throw error;
    }
  }
}
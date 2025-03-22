import { EventEmitter } from 'events';
import * as childProcess from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LogService } from '../logging/LogService';
import { RepositoryScanner, RepositoryInfo } from './RepositoryScanner';
import { CompatibilityChecker, CompatibilityResult, SystemInfo } from './CompatibilityChecker';
import { RecommendationEngine, UserPreferences, ServerRecommendation } from './RecommendationEngine';

// Convert child_process.exec to Promise
const execAsync = util.promisify(childProcess.exec);

/**
 * Installation status interface
 */
export interface InstallationStatus {
  stage: 'scanning' | 'analyzing' | 'installing' | 'configuring' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  repository?: RepositoryInfo;
  error?: any;
}

/**
 * Installation result interface
 */
export interface InstallationResult {
  success: boolean;
  repository: RepositoryInfo;
  installPath: string;
  configPath: string;
  error?: any;
  logs: string[];
}

/**
 * Options for installation service
 */
export interface InstallationServiceOptions {
  logService: LogService;
  installDir?: string;
  githubToken?: string;
  npmRegistry?: string;
}

/**
 * Service for installing MCP servers
 */
export class InstallationService extends EventEmitter {
  private logService: LogService;
  private repositoryScanner: RepositoryScanner;
  private compatibilityChecker: CompatibilityChecker;
  private recommendationEngine: RecommendationEngine;
  private installDir: string;
  
  constructor(options: InstallationServiceOptions) {
    super();
    
    this.logService = options.logService;
    
    // Initialize installDir
    this.installDir = options.installDir || path.join(process.env.HOME || process.env.USERPROFILE || '.', '.mcp-doctor', 'servers');
    
    // Initialize component services
    this.repositoryScanner = new RepositoryScanner({
      logService: this.logService,
      githubToken: options.githubToken,
      npmRegistry: options.npmRegistry
    });
    
    this.compatibilityChecker = new CompatibilityChecker({
      logService: this.logService
    });
    
    this.recommendationEngine = new RecommendationEngine({
      logService: this.logService
    });
    
    this.logService.info('InstallationService', 'Installation service initialized');
  }
  
  /**
   * Scan for available servers
   */
  async scanAvailableServers(): Promise<RepositoryInfo[]> {
    this.logService.info('InstallationService', 'Scanning for available servers');
    
    try {
      // Update status
      this.emitStatus({
        stage: 'scanning',
        progress: 0,
        message: 'Searching for available MCP servers...'
      });
      
      // Scan for servers
      const servers = await this.repositoryScanner.scanForServers();
      
      this.emitStatus({
        stage: 'scanning',
        progress: 100,
        message: `Found ${servers.length} MCP servers`
      });
      
      return servers;
    } catch (error) {
      this.logService.error('InstallationService', `Error scanning for servers: ${error.message}`);
      
      this.emitStatus({
        stage: 'failed',
        progress: 0,
        message: 'Failed to scan for servers',
        error
      });
      
      throw error;
    }
  }
  
  /**
   * Find compatible servers
   */
  async findCompatibleServers(): Promise<CompatibilityResult[]> {
    this.logService.info('InstallationService', 'Finding compatible servers');
    
    try {
      // Update status
      this.emitStatus({
        stage: 'analyzing',
        progress: 0,
        message: 'Analyzing system compatibility...'
      });
      
      // Scan for servers
      const servers = await this.scanAvailableServers();
      
      // Update status
      this.emitStatus({
        stage: 'analyzing',
        progress: 50,
        message: 'Checking server compatibility...'
      });
      
      // Check compatibility for all servers
      const compatibilityResults = await this.compatibilityChecker.batchCheckCompatibility(servers);
      
      // Update status
      this.emitStatus({
        stage: 'analyzing',
        progress: 100,
        message: `Found ${compatibilityResults.filter(r => r.compatible).length} compatible servers`
      });
      
      return compatibilityResults;
    } catch (error) {
      this.logService.error('InstallationService', `Error finding compatible servers: ${error.message}`);
      
      this.emitStatus({
        stage: 'failed',
        progress: 0,
        message: 'Failed to find compatible servers',
        error
      });
      
      throw error;
    }
  }
  
  /**
   * Get server recommendations based on user preferences
   * @param userPreferences User preferences for server recommendations
   */
  async getServerRecommendations(userPreferences?: UserPreferences): Promise<ServerRecommendation[]> {
    this.logService.info('InstallationService', 'Getting server recommendations');
    
    try {
      // Find compatible servers
      const compatibilityResults = await this.findCompatibleServers();
      
      // Generate recommendations
      const recommendations = this.recommendationEngine.recommendServers(
        compatibilityResults,
        userPreferences
      );
      
      this.logService.info('InstallationService', `Generated ${recommendations.length} server recommendations`);
      
      return recommendations;
    } catch (error) {
      this.logService.error('InstallationService', `Error getting server recommendations: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Install an MCP server
   * @param repository Repository to install
   */
  async installServer(repository: RepositoryInfo): Promise<InstallationResult> {
    this.logService.info('InstallationService', `Installing MCP server: ${repository.name}`);
    
    // Logs for the installation process
    const logs: string[] = [];
    const addLog = (message: string) => {
      this.logService.debug('InstallationService', message);
      logs.push(message);
    };
    
    try {
      // Update status
      this.emitStatus({
        stage: 'installing',
        progress: 0,
        message: `Preparing to install ${repository.name}...`,
        repository
      });
      
      // Create install directory
      const serverDir = path.join(this.installDir, repository.name);
      await fs.ensureDir(serverDir);
      
      addLog(`Created installation directory: ${serverDir}`);
      
      // Update status
      this.emitStatus({
        stage: 'installing',
        progress: 10,
        message: `Installing ${repository.name}...`,
        repository
      });
      
      // Install based on repository source
      if (repository.installUrl.startsWith('npm:')) {
        // Install from NPM
        await this.installFromNpm(repository, serverDir);
        addLog(`Installed ${repository.name} from NPM`);
      } else if (repository.installUrl.includes('github.com')) {
        // Install from GitHub
        await this.installFromGitHub(repository, serverDir);
        addLog(`Installed ${repository.name} from GitHub`);
      } else {
        throw new Error(`Unsupported installation source: ${repository.installUrl}`);
      }
      
      // Update status
      this.emitStatus({
        stage: 'configuring',
        progress: 70,
        message: `Configuring ${repository.name}...`,
        repository
      });
      
      // Create basic configuration
      const configPath = await this.createDefaultConfig(repository, serverDir);
      addLog(`Created default configuration at: ${configPath}`);
      
      // Update status
      this.emitStatus({
        stage: 'completed',
        progress: 100,
        message: `Successfully installed ${repository.name}`,
        repository
      });
      
      // Return installation result
      return {
        success: true,
        repository,
        installPath: serverDir,
        configPath,
        logs
      };
    } catch (error) {
      this.logService.error('InstallationService', `Error installing server ${repository.name}: ${error.message}`);
      
      // Update status
      this.emitStatus({
        stage: 'failed',
        progress: 0,
        message: `Failed to install ${repository.name}`,
        repository,
        error
      });
      
      addLog(`Installation failed: ${error.message}`);
      
      // Return error result
      return {
        success: false,
        repository,
        installPath: '',
        configPath: '',
        error,
        logs
      };
    }
  }
  
  /**
   * Install server from NPM
   * @param repository Repository info
   * @param installDir Installation directory
   */
  private async installFromNpm(repository: RepositoryInfo, installDir: string): Promise<void> {
    const packageName = repository.installUrl.replace(/^npm:/, '');
    
    // Check if npm is available
    try {
      await execAsync('npm --version');
    } catch (error) {
      throw new Error('npm is not available in the current environment');
    }
    
    // Initialize package.json if it doesn't exist
    if (!await fs.pathExists(path.join(installDir, 'package.json'))) {
      await execAsync('npm init -y', { cwd: installDir });
    }
    
    // Install the package
    try {
      this.emitStatus({
        stage: 'installing',
        progress: 30,
        message: `Installing ${packageName} via npm...`,
        repository
      });
      
      await execAsync(`npm install ${packageName} --save`, { cwd: installDir });
      
      this.emitStatus({
        stage: 'installing',
        progress: 60,
        message: `Successfully installed ${packageName}`,
        repository
      });
    } catch (error) {
      throw new Error(`Failed to install via npm: ${error.message}`);
    }
  }
  
  /**
   * Install server from GitHub
   * @param repository Repository info
   * @param installDir Installation directory
   */
  private async installFromGitHub(repository: RepositoryInfo, installDir: string): Promise<void> {
    const repoUrl = repository.installUrl;
    
    // Check if git is available
    try {
      await execAsync('git --version');
    } catch (error) {
      throw new Error('git is not available in the current environment');
    }
    
    // Clone the repository
    try {
      this.emitStatus({
        stage: 'installing',
        progress: 30,
        message: `Cloning repository from ${repoUrl}...`,
        repository
      });
      
      await execAsync(`git clone ${repoUrl} .`, { cwd: installDir });
      
      this.emitStatus({
        stage: 'installing',
        progress: 50,
        message: 'Installing dependencies...',
        repository
      });
      
      // Check if package.json exists and install dependencies
      if (await fs.pathExists(path.join(installDir, 'package.json'))) {
        await execAsync('npm install', { cwd: installDir });
      }
      
      this.emitStatus({
        stage: 'installing',
        progress: 60,
        message: 'Successfully installed from GitHub',
        repository
      });
    } catch (error) {
      throw new Error(`Failed to install from GitHub: ${error.message}`);
    }
  }
  
  /**
   * Create default configuration for the server
   * @param repository Repository info
   * @param installDir Installation directory
   */
  private async createDefaultConfig(repository: RepositoryInfo, installDir: string): Promise<string> {
    // Default config path
    const configPath = path.join(installDir, 'config.json');
    
    // Check if there's an example config in the repo
    const examplePaths = [
      path.join(installDir, 'config.example.json'),
      path.join(installDir, 'example.config.json'),
      path.join(installDir, 'examples', 'config.json'),
      path.join(installDir, 'example', 'config.json')
    ];
    
    // Try to find an example config
    let exampleConfig: any = null;
    
    for (const examplePath of examplePaths) {
      if (await fs.pathExists(examplePath)) {
        try {
          const configContent = await fs.readFile(examplePath, 'utf8');
          exampleConfig = JSON.parse(configContent);
          break;
        } catch (error) {
          this.logService.warn('InstallationService', `Failed to parse example config at ${examplePath}: ${error.message}`);
        }
      }
    }
    
    // If no example config found, create a basic one
    if (!exampleConfig) {
      exampleConfig = {
        port: 5004,
        host: '127.0.0.1',
        logLevel: 'info',
        models: {
          claude: {
            apiKey: 'YOUR_API_KEY_HERE'
          }
        }
      };
    }
    
    // Write the config file
    await fs.writeFile(configPath, JSON.stringify(exampleConfig, null, 2), 'utf8');
    
    return configPath;
  }
  
  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return this.compatibilityChecker.getSystemInfo();
  }
  
  /**
   * Search for MCP servers
   * @param query Search query
   */
  async searchForServers(query: string): Promise<RepositoryInfo[]> {
    return this.repositoryScanner.searchMcpServers(query);
  }
  
  /**
   * Emit status update
   * @param status Installation status
   */
  private emitStatus(status: InstallationStatus): void {
    this.emit('status', status);
  }
}
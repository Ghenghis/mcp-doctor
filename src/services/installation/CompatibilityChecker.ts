import * as os from 'os';
import * as childProcess from 'child_process';
import * as util from 'util';
import * as semver from 'semver';
import { LogService } from '../logging/LogService';
import { RepositoryInfo } from './RepositoryScanner';

// Convert child_process.exec to Promise
const execAsync = util.promisify(childProcess.exec);

/**
 * System information interface
 */
export interface SystemInfo {
  platform: string;
  nodeVersion?: string;
  architecture: string;
  totalMemory: number; // in bytes
  freeMemory: number; // in bytes
  cpuCores: number;
  installedPackages: string[];
}

/**
 * Compatibility result interface
 */
export interface CompatibilityResult {
  repository: RepositoryInfo;
  compatible: boolean;
  score: number; // 0-100
  issues: string[];
  missingDependencies: string[];
  recommendedAction: string;
}

/**
 * Options for compatibility checker
 */
export interface CompatibilityCheckerOptions {
  logService: LogService;
}

/**
 * Service for checking compatibility between MCP servers and the local system
 */
export class CompatibilityChecker {
  private logService: LogService;
  private systemInfo: SystemInfo | null = null;
  
  constructor(options: CompatibilityCheckerOptions) {
    this.logService = options.logService;
  }
  
  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    // Return cached info if available
    if (this.systemInfo) {
      return this.systemInfo;
    }
    
    this.logService.info('CompatibilityChecker', 'Gathering system information');
    
    try {
      // Get basic system info
      const platform = os.platform();
      const architecture = os.arch();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const cpuCores = os.cpus().length;
      
      // Get Node.js version
      let nodeVersion: string | undefined;
      try {
        const { stdout } = await execAsync('node --version');
        nodeVersion = stdout.trim().replace(/^v/, '');
      } catch (error) {
        this.logService.warn('CompatibilityChecker', `Failed to get Node.js version: ${error.message}`);
      }
      
      // Get globally installed npm packages
      let installedPackages: string[] = [];
      try {
        const { stdout } = await execAsync('npm list -g --depth=0 --json');
        const npmOutput = JSON.parse(stdout);
        installedPackages = Object.keys(npmOutput.dependencies || {});
      } catch (error) {
        this.logService.warn('CompatibilityChecker', `Failed to get globally installed packages: ${error.message}`);
      }
      
      // Create system info object
      this.systemInfo = {
        platform,
        nodeVersion,
        architecture,
        totalMemory,
        freeMemory,
        cpuCores,
        installedPackages
      };
      
      this.logService.debug('CompatibilityChecker', `System info: ${JSON.stringify(this.systemInfo)}`);
      
      return this.systemInfo;
    } catch (error) {
      this.logService.error('CompatibilityChecker', `Error gathering system information: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check compatibility between a repository and the local system
   * @param repository Repository to check
   */
  async checkCompatibility(repository: RepositoryInfo): Promise<CompatibilityResult> {
    this.logService.info('CompatibilityChecker', `Checking compatibility for ${repository.name}`);
    
    try {
      // Get system information
      const systemInfo = await this.getSystemInfo();
      
      // Initialize result
      const result: CompatibilityResult = {
        repository,
        compatible: true,
        score: 100,
        issues: [],
        missingDependencies: [],
        recommendedAction: ''
      };
      
      // Check OS compatibility
      if (repository.requirements.os && repository.requirements.os.length > 0) {
        const osMatch = repository.requirements.os.some(os => {
          if (os.startsWith('!')) {
            // Negated OS requirement
            return systemInfo.platform !== os.substring(1);
          } else {
            return systemInfo.platform === os || os === 'any';
          }
        });
        
        if (!osMatch) {
          result.compatible = false;
          result.score -= 50;
          result.issues.push(`Incompatible operating system: ${systemInfo.platform}`);
        }
      }
      
      // Check memory requirements
      if (repository.requirements.minMemory) {
        if (systemInfo.totalMemory < repository.requirements.minMemory) {
          result.compatible = false;
          result.score -= 30;
          result.issues.push(`Insufficient memory: ${formatMemorySize(systemInfo.totalMemory)} available, ${formatMemorySize(repository.requirements.minMemory)} required`);
        } else if (systemInfo.totalMemory < repository.requirements.minMemory * 1.5) {
          // Meets minimum but not recommended
          result.score -= 10;
          result.issues.push(`Memory is sufficient but not optimal: ${formatMemorySize(systemInfo.totalMemory)} available, ${formatMemorySize(repository.requirements.minMemory * 1.5)} recommended`);
        }
      }
      
      // Check CPU requirements
      if (repository.requirements.minCpu && systemInfo.cpuCores < repository.requirements.minCpu) {
        result.score -= 20;
        result.issues.push(`CPU cores below recommended: ${systemInfo.cpuCores} available, ${repository.requirements.minCpu} recommended`);
      }
      
      // Check for dependencies
      if (repository.requirements.dependencies && repository.requirements.dependencies.length > 0) {
        // Check each dependency
        for (const dep of repository.requirements.dependencies) {
          // Check if it's a Node.js version requirement
          if (dep.startsWith('node ') && systemInfo.nodeVersion) {
            const versionReq = dep.substring(5);
            if (!semver.satisfies(systemInfo.nodeVersion, versionReq)) {
              result.compatible = false;
              result.score -= 20;
              result.issues.push(`Node.js version incompatible: ${systemInfo.nodeVersion} installed, ${versionReq} required`);
              result.missingDependencies.push(dep);
            }
          } 
          // Check if dependency is installed
          else if (!systemInfo.installedPackages.some(pkg => pkg === dep || pkg.startsWith(`${dep}@`))) {
            result.score -= 10;
            result.issues.push(`Missing dependency: ${dep}`);
            result.missingDependencies.push(dep);
          }
        }
      }
      
      // Ensure score is within 0-100 range
      result.score = Math.max(0, Math.min(100, result.score));
      
      // Determine recommended action based on issues
      if (!result.compatible) {
        result.recommendedAction = 'Cannot install - system requirements not met';
      } else if (result.missingDependencies.length > 0) {
        result.recommendedAction = `Install missing dependencies: ${result.missingDependencies.join(', ')}`;
      } else if (result.score < 70) {
        result.recommendedAction = 'Install with caution - performance may be impacted';
      } else {
        result.recommendedAction = 'Ready for installation';
      }
      
      this.logService.debug('CompatibilityChecker', `Compatibility result for ${repository.name}: ${JSON.stringify(result)}`);
      
      return result;
    } catch (error) {
      this.logService.error('CompatibilityChecker', `Error checking compatibility for ${repository.name}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check compatibility for multiple repositories
   * @param repositories Repositories to check
   */
  async batchCheckCompatibility(repositories: RepositoryInfo[]): Promise<CompatibilityResult[]> {
    this.logService.info('CompatibilityChecker', `Batch checking compatibility for ${repositories.length} repositories`);
    
    const results: CompatibilityResult[] = [];
    
    for (const repo of repositories) {
      try {
        const result = await this.checkCompatibility(repo);
        results.push(result);
      } catch (error) {
        this.logService.error('CompatibilityChecker', `Error checking compatibility for ${repo.name}: ${error.message}`);
      }
    }
    
    return results;
  }
  
  /**
   * Filter repositories based on compatibility
   * @param repositories Repositories to filter
   * @param minScore Minimum compatibility score (0-100)
   */
  async filterCompatibleRepositories(repositories: RepositoryInfo[], minScore = 70): Promise<RepositoryInfo[]> {
    this.logService.info('CompatibilityChecker', `Filtering compatible repositories with min score ${minScore}`);
    
    const results = await this.batchCheckCompatibility(repositories);
    
    // Filter based on score
    return results
      .filter(result => result.score >= minScore)
      .map(result => result.repository);
  }
}

/**
 * Format memory size in human-readable format
 * @param bytes Memory size in bytes
 */
function formatMemorySize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
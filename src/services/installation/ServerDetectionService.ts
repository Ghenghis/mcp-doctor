import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import fetch from 'node-fetch';
import { EventEmitter } from 'events';
import { LogService } from '../logging/LogService';
import { SystemService } from '../system/SystemService';

/**
 * Interface for repository information
 */
export interface RepositoryInfo {
  name: string;
  owner: string;
  description: string;
  stars: number;
  url: string;
  mainBranch: string;
  lastUpdated: Date;
  installCommand: string;
  dependencies: string[];
  compatibleOS: ('windows' | 'macos' | 'linux')[];
  requiredNodeVersion?: string;
  requiredPythonVersion?: string;
}

/**
 * Interface for server compatibility result
 */
export interface ServerCompatibility {
  server: RepositoryInfo;
  compatible: boolean;
  reasons: string[];
  recommendationScore: number;
  installationRequirements: {
    missingDependencies: string[];
    nodeVersionCompatible: boolean;
    pythonVersionCompatible: boolean;
    diskSpaceRequired: number;
    estimatedInstallTime: number;
  };
}

/**
 * Service for detecting available MCP servers
 */
export class ServerDetectionService extends EventEmitter {
  private knownRepositories: RepositoryInfo[] = [];
  private compatibilityResults: ServerCompatibility[] = [];
  private githubApiUrl = 'https://api.github.com';
  private searchTerms = [
    'MCP server',
    'Model Context Protocol',
    'Claude MCP',
    'Anthropic MCP',
    'MCP implementation'
  ];

  constructor(
    private logService: LogService,
    private systemService: SystemService
  ) {
    super();
  }

  /**
   * Scan GitHub for available MCP server repositories
   */
  public async scanRepositories(): Promise<RepositoryInfo[]> {
    this.logService.info('ServerDetectionService', 'Scanning for MCP server repositories');

    try {
      this.knownRepositories = [];

      // Search for each term
      for (const term of this.searchTerms) {
        const encodedTerm = encodeURIComponent(term);
        const url = `${this.githubApiUrl}/search/repositories?q=${encodedTerm}+language:typescript+language:javascript`;

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'MCP-Doctor'
          }
        });

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        
        // Process each repository
        for (const repo of data.items) {
          // Check if it's an MCP server by looking for keywords in the description or readme
          if (this.isMCPServer(repo)) {
            // Add to known repositories
            this.knownRepositories.push({
              name: repo.name,
              owner: repo.owner.login,
              description: repo.description || '',
              stars: repo.stargazers_count,
              url: repo.html_url,
              mainBranch: repo.default_branch,
              lastUpdated: new Date(repo.updated_at),
              installCommand: this.getInstallCommand(repo),
              dependencies: await this.getDependencies(repo),
              compatibleOS: this.getCompatibleOS(repo)
            });
          }
        }
      }

      // Sort by stars
      this.knownRepositories.sort((a, b) => b.stars - a.stars);

      this.logService.info('ServerDetectionService', `Found ${this.knownRepositories.length} MCP server repositories`);
      return this.knownRepositories;
    } catch (error) {
      this.logService.error('ServerDetectionService', `Error scanning repositories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a repository is an MCP server
   * @param repo Repository data from GitHub API
   */
  private isMCPServer(repo: any): boolean {
    // Check description
    const description = (repo.description || '').toLowerCase();
    
    if (
      description.includes('mcp') ||
      description.includes('model context protocol') ||
      description.includes('claude') ||
      description.includes('anthropic')
    ) {
      return true;
    }

    // More sophisticated detection would involve fetching the README
    // and package.json to look for MCP-related keywords
    
    return false;
  }

  /**
   * Get install command for a repository
   * @param repo Repository data from GitHub API
   */
  private getInstallCommand(repo: any): string {
    // Default install command
    return `npm install ${repo.full_name}`;
  }

  /**
   * Get dependencies for a repository
   * @param repo Repository data from GitHub API
   */
  private async getDependencies(repo: any): Promise<string[]> {
    try {
      // Fetch package.json to get dependencies
      const url = `${this.githubApiUrl}/repos/${repo.full_name}/contents/package.json`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MCP-Doctor'
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as any;
      
      if (!data.content) {
        return [];
      }

      const content = Buffer.from(data.content, 'base64').toString('utf8');
      const packageJson = JSON.parse(content);
      
      // Combine dependencies
      const dependencies = [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {})
      ];
      
      return dependencies;
    } catch (error) {
      this.logService.debug('ServerDetectionService', `Error getting dependencies: ${error.message}`);
      return [];
    }
  }

  /**
   * Get compatible operating systems for a repository
   * @param repo Repository data from GitHub API
   */
  private getCompatibleOS(repo: any): ('windows' | 'macos' | 'linux')[] {
    // Default to all OS
    return ['windows', 'macos', 'linux'];
  }

  /**
   * Check compatibility of a repository with the current system
   * @param repo Repository to check
   */
  public async checkCompatibility(repo: RepositoryInfo): Promise<ServerCompatibility> {
    this.logService.info('ServerDetectionService', `Checking compatibility for ${repo.name}`);

    try {
      // Get system info
      const platform = os.platform();
      const nodeVersion = process.version;
      const pythonVersion = await this.systemService.getPythonVersion();
      
      // Check OS compatibility
      const osCompatible = (
        (platform === 'win32' && repo.compatibleOS.includes('windows')) ||
        (platform === 'darwin' && repo.compatibleOS.includes('macos')) ||
        (platform === 'linux' && repo.compatibleOS.includes('linux'))
      );
      
      // Check Node.js version compatibility
      let nodeVersionCompatible = true;
      if (repo.requiredNodeVersion) {
        nodeVersionCompatible = this.compareVersions(nodeVersion, repo.requiredNodeVersion);
      }
      
      // Check Python version compatibility
      let pythonVersionCompatible = true;
      if (repo.requiredPythonVersion && pythonVersion) {
        pythonVersionCompatible = this.compareVersions(pythonVersion, repo.requiredPythonVersion);
      }
      
      // Check dependencies
      const missingDependencies: string[] = [];
      for (const dependency of repo.dependencies) {
        if (!await this.checkDependencyInstalled(dependency)) {
          missingDependencies.push(dependency);
        }
      }
      
      // Calculate recommendation score (0-100)
      let recommendationScore = 0;
      
      // Base score from stars (max 30 points)
      recommendationScore += Math.min(repo.stars / 100, 1) * 30;
      
      // Recent updates (max 20 points)
      const daysSinceLastUpdate = (Date.now() - repo.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      recommendationScore += Math.max(0, 1 - (daysSinceLastUpdate / 90)) * 20;
      
      // Compatibility (max 50 points)
      if (osCompatible) recommendationScore += 20;
      if (nodeVersionCompatible) recommendationScore += 10;
      if (pythonVersionCompatible) recommendationScore += 10;
      recommendationScore += Math.max(0, 1 - (missingDependencies.length / 5)) * 10;
      
      // Reasons for compatibility issues
      const reasons: string[] = [];
      
      if (!osCompatible) {
        reasons.push(`Not compatible with ${platform} operating system`);
      }
      
      if (!nodeVersionCompatible) {
        reasons.push(`Requires Node.js ${repo.requiredNodeVersion}, but found ${nodeVersion}`);
      }
      
      if (!pythonVersionCompatible && repo.requiredPythonVersion) {
        reasons.push(`Requires Python ${repo.requiredPythonVersion}, but found ${pythonVersion || 'none'}`);
      }
      
      if (missingDependencies.length > 0) {
        reasons.push(`Missing dependencies: ${missingDependencies.join(', ')}`);
      }
      
      // Create compatibility result
      const compatibility: ServerCompatibility = {
        server: repo,
        compatible: osCompatible && nodeVersionCompatible && pythonVersionCompatible,
        reasons,
        recommendationScore,
        installationRequirements: {
          missingDependencies,
          nodeVersionCompatible,
          pythonVersionCompatible,
          diskSpaceRequired: this.estimateDiskSpaceRequired(repo),
          estimatedInstallTime: this.estimateInstallTime(repo, missingDependencies.length)
        }
      };
      
      // Store result
      const existingIndex = this.compatibilityResults.findIndex(r => 
        r.server.name === repo.name && r.server.owner === repo.owner
      );
      
      if (existingIndex >= 0) {
        this.compatibilityResults[existingIndex] = compatibility;
      } else {
        this.compatibilityResults.push(compatibility);
      }
      
      return compatibility;
    } catch (error) {
      this.logService.error('ServerDetectionService', `Error checking compatibility: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compare version strings
   * @param current Current version
   * @param required Required version
   */
  private compareVersions(current: string, required: string): boolean {
    // Simple version check, remove v prefix
    current = current.replace(/^v/, '');
    required = required.replace(/^v/, '');
    
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    // Compare major version
    if (currentParts[0] < requiredParts[0]) {
      return false;
    } else if (currentParts[0] > requiredParts[0]) {
      return true;
    }
    
    // Compare minor version
    if (currentParts[1] < requiredParts[1]) {
      return false;
    } else if (currentParts[1] > requiredParts[1]) {
      return true;
    }
    
    // Compare patch version
    if (currentParts[2] < requiredParts[2]) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if a dependency is installed
   * @param dependency Dependency name
   */
  private async checkDependencyInstalled(dependency: string): Promise<boolean> {
    // Check if Node module is installed
    try {
      await fs.access(path.join(process.cwd(), 'node_modules', dependency));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate disk space required for installation
   * @param repo Repository to check
   */
  private estimateDiskSpaceRequired(repo: RepositoryInfo): number {
    // Basic estimate based on dependencies count
    return 50 * 1024 * 1024 + repo.dependencies.length * 5 * 1024 * 1024; // Base 50MB + 5MB per dependency
  }

  /**
   * Estimate install time
   * @param repo Repository to check
   * @param missingDependencies Number of missing dependencies
   */
  private estimateInstallTime(repo: RepositoryInfo, missingDependencies: number): number {
    // Basic estimate in seconds
    return 30 + missingDependencies * 15; // Base 30 seconds + 15 seconds per missing dependency
  }

  /**
   * Get sorted server recommendations
   */
  public getRecommendations(): ServerCompatibility[] {
    // Sort by recommendation score
    return [...this.compatibilityResults].sort((a, b) => 
      b.recommendationScore - a.recommendationScore
    );
  }

  /**
   * Clear cached data
   */
  public clearCache(): void {
    this.knownRepositories = [];
    this.compatibilityResults = [];
  }
}
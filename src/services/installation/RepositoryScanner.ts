import axios from 'axios';
import * as semver from 'semver';
import { LogService } from '../logging/LogService';
import { URL } from 'url';

/**
 * Utility function to safely validate and sanitize URLs
 * @param urlString The URL to validate and sanitize
 * @returns Sanitized URL string or empty string if invalid
 */
function sanitizeUrl(urlString: string): string {
  try {
    // First, clean common patterns in repository URLs
    const cleanedUrl = urlString
      .replace(/^git\+/, '')
      .replace(/\.git$/, '');
    
    // Validate URL by parsing it
    const url = new URL(cleanedUrl);
    
    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    
    // Return the sanitized URL
    return url.toString();
  } catch (error) {
    // If URL parsing fails, return empty string
    return '';
  }
}

/**
 * Interface for repository metadata
 */
export interface RepositoryInfo {
  id: string;
  name: string;
  description: string;
  owner: string;
  stars: number;
  lastUpdated: Date;
  version: string;
  isMcpCompatible: boolean;
  url: string;
  installUrl: string;
  tags: string[];
  requirements: {
    os?: string[];
    minMemory?: number;
    minCpu?: number;
    dependencies?: string[];
  };
}

/**
 * Options for the repository scanner
 */
export interface RepositoryScannerOptions {
  logService: LogService;
  githubToken?: string;
  npmRegistry?: string;
}

/**
 * Service for scanning repositories to find available MCP servers
 */
export class RepositoryScanner {
  private logService: LogService;
  private githubToken?: string;
  private npmRegistry: string;
  
  // Known MCP server repositories
  private knownRepositories: {[key: string]: string} = {
    'anthropic/model-context-protocol': 'GitHub',
    'windsurf-editor/windsurf-server': 'GitHub',
    'cursor-io/cursor-server': 'GitHub',
    'mcp-server': 'NPM',
    'cursor-server': 'NPM',
    'windsurf-server': 'NPM',
    'anthropic-mcp': 'NPM'
  };

  constructor(options: RepositoryScannerOptions) {
    this.logService = options.logService;
    this.githubToken = options.githubToken;
    this.npmRegistry = options.npmRegistry || 'https://registry.npmjs.org';
  }

  /**
   * Scan for available MCP servers
   */
  async scanForServers(): Promise<RepositoryInfo[]> {
    this.logService.info('RepositoryScanner', 'Scanning for available MCP servers');

    const repositories: RepositoryInfo[] = [];

    try {
      // Scan GitHub repositories
      const githubRepos = await this.scanGitHubRepositories();
      repositories.push(...githubRepos);

      // Scan NPM packages
      const npmPackages = await this.scanNpmPackages();
      repositories.push(...npmPackages);

      this.logService.info('RepositoryScanner', `Found ${repositories.length} MCP servers`);
      return repositories;
    } catch (error) {
      this.logService.error('RepositoryScanner', `Error scanning for servers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scan GitHub for MCP servers
   */
  private async scanGitHubRepositories(): Promise<RepositoryInfo[]> {
    this.logService.debug('RepositoryScanner', 'Scanning GitHub repositories');
    
    const repositories: RepositoryInfo[] = [];
    const githubRepos = Object.keys(this.knownRepositories)
      .filter(repo => this.knownRepositories[repo] === 'GitHub');

    for (const repoFullName of githubRepos) {
      try {
        // Extract owner and repo name
        const [owner, name] = repoFullName.split('/');
        
        // Create request headers
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json'
        };
        
        // Add token if available
        if (this.githubToken) {
          headers['Authorization'] = `token ${this.githubToken}`;
        }

        // Fetch repository details
        const response = await axios.get(`https://api.github.com/repos/${repoFullName}`, { headers });
        const repoData = response.data;

        // Fetch repository tags/releases
        const tagsResponse = await axios.get(`https://api.github.com/repos/${repoFullName}/tags`, { headers });
        const tags = tagsResponse.data;
        
        // Find latest version
        let latestVersion = '0.0.0';
        if (tags.length > 0) {
          // Extract versions from tags and find the highest semver
          const versions = tags
            .map((tag: any) => tag.name.replace(/^v/, ''))
            .filter((version: string) => semver.valid(version));
          
          if (versions.length > 0) {
            latestVersion = semver.maxSatisfying(versions, '*') || '0.0.0';
          }
        }

        // Fetch package.json to check for MCP compatibility
        let isMcpCompatible = false;
        let requirements: RepositoryInfo['requirements'] = {};

        try {
          const packageJsonResponse = await axios.get(
            `https://raw.githubusercontent.com/${repoFullName}/master/package.json`,
            { headers }
          );
          const packageJson = packageJsonResponse.data;
          
          // Check if it has MCP-related keywords
          isMcpCompatible = this.isMcpServerPackage(packageJson);
          
          // Extract requirements
          requirements = this.extractRequirements(packageJson);
        } catch (error) {
          // Package.json might not exist or be accessible
          this.logService.debug('RepositoryScanner', `Could not fetch package.json for ${repoFullName}`);
        }

        // Add repository info
        repositories.push({
          id: repoData.id.toString(),
          name,
          description: repoData.description || '',
          owner,
          stars: repoData.stargazers_count,
          lastUpdated: new Date(repoData.updated_at),
          version: latestVersion,
          isMcpCompatible,
          url: sanitizeUrl(repoData.html_url),
          installUrl: `https://github.com/${repoFullName}`,
          tags: repoData.topics || [],
          requirements
        });

      } catch (error) {
        this.logService.error('RepositoryScanner', `Error fetching GitHub repo ${repoFullName}: ${error.message}`);
      }
    }

    return repositories;
  }

  /**
   * Scan NPM registry for MCP servers
   */
  private async scanNpmPackages(): Promise<RepositoryInfo[]> {
    this.logService.debug('RepositoryScanner', 'Scanning NPM packages');
    
    const repositories: RepositoryInfo[] = [];
    const npmPackages = Object.keys(this.knownRepositories)
      .filter(repo => this.knownRepositories[repo] === 'NPM');

    for (const packageName of npmPackages) {
      try {
        // Fetch package details from NPM
        const response = await axios.get(`${this.npmRegistry}/${packageName}`);
        const packageData = response.data;
        
        // Check if this is a MCP server
        const isMcpCompatible = this.isMcpServerPackage(packageData);
        
        // Extract the latest version
        const latestVersion = packageData['dist-tags']?.latest || '0.0.0';
        
        // Extract repository URL if available
        let repoUrl = '';
        let owner = '';
        
        if (packageData.repository?.url) {
          repoUrl = sanitizeUrl(packageData.repository.url);
          
          // Extract owner from GitHub URL
          if (repoUrl.includes('github.com')) {
            const match = repoUrl.match(/github\.com\/([^\/]+)/);
            if (match) {
              owner = match[1];
            }
          }
        }
        
        // Extract requirements
        const requirements = this.extractRequirements(packageData);

        // Add repository info
        repositories.push({
          id: packageName,
          name: packageName,
          description: packageData.description || '',
          owner: packageData.author?.name || owner || 'unknown',
          stars: 0, // NPM doesn't have stars
          lastUpdated: new Date(packageData.time?.modified || packageData.time?.created || Date.now()),
          version: latestVersion,
          isMcpCompatible,
          url: repoUrl || sanitizeUrl(`https://www.npmjs.com/package/${packageName}`),
          installUrl: `npm:${packageName}@${latestVersion}`,
          tags: packageData.keywords || [],
          requirements
        });

      } catch (error) {
        this.logService.error('RepositoryScanner', `Error fetching NPM package ${packageName}: ${error.message}`);
      }
    }

    // Also search for MCP-related packages
    try {
      const searchResponse = await axios.get(`${this.npmRegistry}/-/v1/search?text=keywords:mcp,model-context-protocol&size=20`);
      const searchResults = searchResponse.data.objects || [];
      
      for (const result of searchResults) {
        const packageName = result.package.name;
        
        // Skip if already processed
        if (repositories.some(repo => repo.id === packageName)) {
          continue;
        }
        
        // Process only if it looks like a server package
        if (this.isMcpServerPackage(result.package)) {
          try {
            // Fetch full package details
            const packageResponse = await axios.get(`${this.npmRegistry}/${packageName}`);
            const packageData = packageResponse.data;
            
            // Extract repository URL if available
            let repoUrl = '';
            let owner = '';
            
            if (packageData.repository?.url) {
              repoUrl = sanitizeUrl(packageData.repository.url);
              
              // Extract owner from GitHub URL
              if (repoUrl.includes('github.com')) {
                const match = repoUrl.match(/github\.com\/([^\/]+)/);
                if (match) {
                  owner = match[1];
                }
              }
            }
            
            // Extract the latest version
            const latestVersion = packageData['dist-tags']?.latest || '0.0.0';
            
            // Extract requirements
            const requirements = this.extractRequirements(packageData);

            // Add repository info
            repositories.push({
              id: packageName,
              name: packageName,
              description: packageData.description || '',
              owner: packageData.author?.name || owner || 'unknown',
              stars: 0,
              lastUpdated: new Date(packageData.time?.modified || packageData.time?.created || Date.now()),
              version: latestVersion,
              isMcpCompatible: true,
              url: repoUrl || sanitizeUrl(`https://www.npmjs.com/package/${packageName}`),
              installUrl: `npm:${packageName}@${latestVersion}`,
              tags: packageData.keywords || [],
              requirements
            });
          } catch (error) {
            this.logService.error('RepositoryScanner', `Error fetching NPM package details for ${packageName}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logService.error('RepositoryScanner', `Error searching NPM registry: ${error.message}`);
    }

    return repositories;
  }

  /**
   * Check if a package is an MCP server
   */
  private isMcpServerPackage(packageData: any): boolean {
    // Check package name
    if (packageData.name && 
        (packageData.name.includes('mcp') || 
         packageData.name.includes('model-context-protocol') ||
         packageData.name.includes('claude'))) {
      return true;
    }
    
    // Check keywords
    if (packageData.keywords && Array.isArray(packageData.keywords)) {
      const keywords = packageData.keywords.map((k: string) => k.toLowerCase());
      if (keywords.includes('mcp') || 
          keywords.includes('model-context-protocol') ||
          keywords.includes('claude') ||
          keywords.includes('mcp-server')) {
        return true;
      }
    }
    
    // Check description
    if (packageData.description && 
        (packageData.description.toLowerCase().includes('model context protocol') ||
         packageData.description.toLowerCase().includes('mcp server'))) {
      return true;
    }
    
    // Check dependencies
    if (packageData.dependencies) {
      const deps = Object.keys(packageData.dependencies);
      if (deps.some(dep => 
          dep.includes('mcp') || 
          dep.includes('model-context-protocol') ||
          dep.includes('@anthropic'))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Extract requirement information from package.json
   */
  private extractRequirements(packageData: any): RepositoryInfo['requirements'] {
    const requirements: RepositoryInfo['requirements'] = {};
    
    // Extract OS requirements
    if (packageData.os && Array.isArray(packageData.os)) {
      requirements.os = packageData.os;
    }
    
    // Extract dependencies
    if (packageData.dependencies) {
      requirements.dependencies = Object.keys(packageData.dependencies);
    }
    
    // Extract memory/CPU requirements from engines
    if (packageData.engines) {
      if (packageData.engines.node) {
        // Add node as a dependency
        if (!requirements.dependencies) {
          requirements.dependencies = [];
        }
        requirements.dependencies.push(`node ${packageData.engines.node}`);
      }
    }
    
    return requirements;
  }

  /**
   * Find MCP servers by keyword search
   */
  async searchMcpServers(query: string): Promise<RepositoryInfo[]> {
    this.logService.info('RepositoryScanner', `Searching for MCP servers with query: ${query}`);
    
    const allServers = await this.scanForServers();
    
    // Filter based on search query
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    return allServers.filter(server => {
      const searchableText = [
        server.name.toLowerCase(),
        server.description.toLowerCase(),
        server.owner.toLowerCase(),
        ...server.tags.map(tag => tag.toLowerCase())
      ].join(' ');
      
      return searchTerms.every(term => searchableText.includes(term));
    });
  }
  
  /**
   * Get compatibility score for a repository
   * @param repository Repository to score
   * @param systemInfo Local system information
   * @returns Score from 0-100
   */
  getCompatibilityScore(repository: RepositoryInfo, systemInfo: any): number {
    let score = 100;
    
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
        score -= 50; // Major compatibility issue
      }
    }
    
    // Check memory requirements
    if (repository.requirements.minMemory && systemInfo.totalMemory) {
      if (systemInfo.totalMemory < repository.requirements.minMemory) {
        score -= 30;
      } else if (systemInfo.totalMemory < repository.requirements.minMemory * 1.5) {
        score -= 10; // Meets minimum but not recommended
      }
    }
    
    // Check for dependencies
    if (repository.requirements.dependencies && repository.requirements.dependencies.length > 0) {
      // Count missing dependencies
      const missingDeps = repository.requirements.dependencies.filter(dep => {
        // This is a simplified check - would need to actually verify each dependency
        // Check if node version requirement is met
        if (dep.startsWith('node ') && systemInfo.nodeVersion) {
          const versionReq = dep.substring(5);
          return !semver.satisfies(systemInfo.nodeVersion, versionReq);
        }
        return !systemInfo.installedPackages?.includes(dep);
      });
      
      // Reduce score based on missing dependencies
      if (missingDeps.length > 0) {
        score -= Math.min(40, missingDeps.length * 10);
      }
    }
    
    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
  }
}
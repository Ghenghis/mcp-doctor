import { EventEmitter } from 'events';
import { MCPServer, MCPClient, ErrorType } from '../../types';
import { 
  Vulnerability, 
  VulnerabilityType, 
  VulnerabilitySeverity 
} from '../../types/security';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';

/**
 * Service to detect security vulnerabilities in MCP servers
 */
export class SecurityScanningService extends EventEmitter {
  private static instance: SecurityScanningService;
  private vulnerabilityDatabase: Map<string, Vulnerability>;
  private updateInProgress: boolean = false;
  private lastDatabaseUpdate: Date | null = null;
  private scheduledScans: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    super();
    this.vulnerabilityDatabase = new Map<string, Vulnerability>();
    this.initializeDatabase();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): SecurityScanningService {
    if (!SecurityScanningService.instance) {
      SecurityScanningService.instance = new SecurityScanningService();
    }
    return SecurityScanningService.instance;
  }
  
  /**
   * Initialize vulnerability database
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // First check if we have a cached database
      const dbPath = path.join(os.homedir(), '.mcp-doctor', 'security', 'vulnerability-db.json');
      
      try {
        await fs.mkdir(path.dirname(dbPath), { recursive: true });
        const dbContent = await fs.readFile(dbPath, 'utf-8');
        const data = JSON.parse(dbContent);
        
        if (data.lastUpdated && data.vulnerabilities) {
          const lastUpdated = new Date(data.lastUpdated);
          const now = new Date();
          const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
          
          // Load from cache if it's less than 1 day old
          if (daysSinceUpdate < 1) {
            this.loadVulnerabilitiesFromData(data.vulnerabilities);
            this.lastDatabaseUpdate = lastUpdated;
            this.emit('database-loaded', { count: this.vulnerabilityDatabase.size });
            return;
          }
        }
      } catch (error) {
        // Cache doesn't exist or is invalid, continue to update
        console.log('No valid vulnerability database cache found, updating from sources');
      }
      
      // If we reach here, we need to update the database
      await this.updateVulnerabilityDatabase();
      
    } catch (error) {
      console.error('Failed to initialize vulnerability database:', error);
      this.emit('error', {
        type: ErrorType.ConfigError,
        message: 'Failed to initialize vulnerability database',
        details: error,
        fixable: false
      });
    }
  }
  
  /**
   * Load vulnerabilities from data
   */
  private loadVulnerabilitiesFromData(vulnerabilities: Vulnerability[]): void {
    this.vulnerabilityDatabase.clear();
    for (const vuln of vulnerabilities) {
      this.vulnerabilityDatabase.set(vuln.id, {
        ...vuln,
        detectedAt: new Date(vuln.detectedAt)
      });
    }
  }
  
  /**
   * Update vulnerability database from remote sources
   */
  public async updateVulnerabilityDatabase(): Promise<void> {
    if (this.updateInProgress) {
      return;
    }
    
    this.updateInProgress = true;
    this.emit('database-update-started');
    
    try {
      // Collect vulnerabilities from multiple sources
      const vulnerabilities: Vulnerability[] = [];
      
      // 1. Check Node.js dependencies using NPM audit
      const npmVulnerabilities = await this.scanNpmDependencies();
      vulnerabilities.push(...npmVulnerabilities);
      
      // 2. Check for common MCP server misconfigurations
      const configVulnerabilities = await this.scanCommonMisconfigurations();
      vulnerabilities.push(...configVulnerabilities);
      
      // 3. Check for known server vulnerabilities
      const serverVulnerabilities = await this.fetchKnownServerVulnerabilities();
      vulnerabilities.push(...serverVulnerabilities);
      
      // Update our database
      this.loadVulnerabilitiesFromData(vulnerabilities);
      this.lastDatabaseUpdate = new Date();
      
      // Cache the database
      const dbPath = path.join(os.homedir(), '.mcp-doctor', 'security', 'vulnerability-db.json');
      const dbData = {
        lastUpdated: this.lastDatabaseUpdate.toISOString(),
        vulnerabilities: Array.from(this.vulnerabilityDatabase.values())
      };
      
      await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
      
      this.emit('database-updated', { 
        count: this.vulnerabilityDatabase.size,
        timestamp: this.lastDatabaseUpdate
      });
    } catch (error) {
      console.error('Failed to update vulnerability database:', error);
      this.emit('database-update-failed', error);
    } finally {
      this.updateInProgress = false;
    }
  }
  
  /**
   * Scan NPM dependencies for vulnerabilities
   */
  private async scanNpmDependencies(): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    try {
      // Run npm audit in the MCP server directories
      // For demo purposes, we'll return some sample vulnerabilities
      
      vulnerabilities.push({
        id: 'NPM-1234',
        type: VulnerabilityType.DependencyVulnerability,
        title: 'Prototype Pollution in lodash',
        description: 'Versions of lodash prior to 4.17.21 are vulnerable to prototype pollution.',
        severity: VulnerabilitySeverity.High,
        affectedComponent: 'lodash',
        cve: 'CVE-2021-23337',
        remediation: 'Update lodash to version 4.17.21 or later',
        patchAvailable: true,
        detectedAt: new Date()
      });
      
      vulnerabilities.push({
        id: 'NPM-5678',
        type: VulnerabilityType.DependencyVulnerability,
        title: 'Regular Expression Denial of Service in minimist',
        description: 'Versions of minimist prior to 1.2.6 are vulnerable to ReDoS attacks.',
        severity: VulnerabilitySeverity.Medium,
        affectedComponent: 'minimist',
        cve: 'CVE-2021-44906',
        remediation: 'Update minimist to version 1.2.6 or later',
        patchAvailable: true,
        detectedAt: new Date()
      });
      
    } catch (error) {
      console.error('Error scanning NPM dependencies:', error);
    }
    
    return vulnerabilities;
  }
  
  /**
   * Scan for common MCP server misconfigurations
   */
  private async scanCommonMisconfigurations(): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    try {
      // Check for common misconfigurations
      // For demo purposes, we'll return some sample vulnerabilities
      
      vulnerabilities.push({
        id: 'CONFIG-1234',
        type: VulnerabilityType.ConfigurationVulnerability,
        title: 'Insecure Default Permissions',
        description: 'MCP server configuration files have overly permissive file permissions.',
        severity: VulnerabilitySeverity.Medium,
        affectedComponent: 'server-config',
        remediation: 'Update file permissions to be accessible only by the owner',
        patchAvailable: true,
        detectedAt: new Date()
      });
      
      vulnerabilities.push({
        id: 'CONFIG-5678',
        type: VulnerabilityType.ConfigurationVulnerability,
        title: 'Plaintext Credentials',
        description: 'Credentials stored in plaintext in configuration files.',
        severity: VulnerabilitySeverity.Critical,
        affectedComponent: 'credentials-store',
        remediation: 'Use environment variables or a secure credential store',
        patchAvailable: true,
        detectedAt: new Date()
      });
      
    } catch (error) {
      console.error('Error scanning for misconfigurations:', error);
    }
    
    return vulnerabilities;
  }
  
  /**
   * Fetch known vulnerabilities for MCP servers
   */
  private async fetchKnownServerVulnerabilities(): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    try {
      // Normally, we would fetch from a central vulnerability database
      // For demo purposes, we'll return some sample vulnerabilities
      
      vulnerabilities.push({
        id: 'MCP-1234',
        type: VulnerabilityType.NetworkVulnerability,
        title: 'Unencrypted Communication',
        description: 'MCP server communicates over unencrypted channels.',
        severity: VulnerabilitySeverity.High,
        affectedComponent: 'network-layer',
        remediation: 'Enable TLS encryption for all communications',
        patchAvailable: true,
        detectedAt: new Date()
      });
      
      vulnerabilities.push({
        id: 'MCP-5678',
        type: VulnerabilityType.PermissionVulnerability,
        title: 'Insufficient Access Controls',
        description: 'MCP server lacks proper authentication for sensitive operations.',
        severity: VulnerabilitySeverity.Critical,
        affectedComponent: 'authentication-module',
        remediation: 'Implement proper authentication and authorization controls',
        patchAvailable: false,
        detectedAt: new Date()
      });
      
    } catch (error) {
      console.error('Error fetching known vulnerabilities:', error);
    }
    
    return vulnerabilities;
  }
  
  /**
   * Perform a security scan on an MCP server
   */
  public async scanServer(server: MCPServer): Promise<Vulnerability[]> {
    this.emit('scan-started', { server: server.name });
    
    // Make sure our database is initialized
    if (this.vulnerabilityDatabase.size === 0) {
      await this.initializeDatabase();
    }
    
    const vulnerabilities: Vulnerability[] = [];
    
    try {
      // 1. Check for known vulnerabilities
      for (const vuln of this.vulnerabilityDatabase.values()) {
        // Here we would check if this vulnerability applies to this server
        // For demo purposes, we'll assume some do
        if (Math.random() < 0.3) { // 30% chance for a vulnerability to apply
          vulnerabilities.push({
            ...vuln,
            detectedAt: new Date() // Update detection time
          });
        }
      }
      
      // 2. Perform server-specific checks
      const serverSpecificVulns = await this.scanServerConfiguration(server);
      vulnerabilities.push(...serverSpecificVulns);
      
      this.emit('scan-completed', {
        server: server.name,
        vulnerabilitiesFound: vulnerabilities.length
      });
      
      return vulnerabilities;
    } catch (error) {
      console.error(`Error scanning server ${server.name}:`, error);
      this.emit('scan-failed', {
        server: server.name,
        error
      });
      
      return [];
    }
  }
  
  /**
   * Scan server configuration for vulnerabilities
   */
  private async scanServerConfiguration(server: MCPServer): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    try {
      // Check environment variables for sensitive info
      const envVulns = this.checkEnvironmentVariables(server);
      vulnerabilities.push(...envVulns);
      
      // Check command-line arguments for security issues
      const argVulns = this.checkCommandLineArguments(server);
      vulnerabilities.push(...argVulns);
      
    } catch (error) {
      console.error(`Error scanning configuration for ${server.name}:`, error);
    }
    
    return vulnerabilities;
  }
  
  /**
   * Check environment variables for security issues
   */
  private checkEnvironmentVariables(server: MCPServer): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    
    // Check for sensitive data in environment variables
    const sensitiveEnvVars = ['PASSWORD', 'TOKEN', 'SECRET', 'KEY', 'CREDENTIAL'];
    
    for (const envVar of Object.keys(server.env)) {
      for (const sensitivePattern of sensitiveEnvVars) {
        if (envVar.toUpperCase().includes(sensitivePattern) && 
            server.env[envVar] && 
            server.env[envVar].length > 0) {
          vulnerabilities.push({
            id: `ENV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: VulnerabilityType.CredentialVulnerability,
            title: 'Sensitive Data in Environment Variable',
            description: `Environment variable ${envVar} may contain sensitive data.`,
            severity: VulnerabilitySeverity.High,
            affectedComponent: 'environment-variables',
            remediation: 'Use a secure credential store or environment variable management system',
            patchAvailable: true,
            detectedAt: new Date()
          });
          break; // Only report once per env var
        }
      }
    }
    
    return vulnerabilities;
  }
  
  /**
   * Check command-line arguments for security issues
   */
  private checkCommandLineArguments(server: MCPServer): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    
    // Check for sensitive flags in command-line arguments
    const sensitiveArgs = ['--password=', '--token=', '--secret=', '--key=', '--no-auth', '--disable-security'];
    
    for (const arg of server.args) {
      for (const sensitivePattern of sensitiveArgs) {
        if (arg.startsWith(sensitivePattern)) {
          vulnerabilities.push({
            id: `ARG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: VulnerabilityType.CredentialVulnerability,
            title: 'Sensitive Data in Command-Line Argument',
            description: `Command-line argument contains sensitive data: ${arg.split('=')[0]}`,
            severity: VulnerabilitySeverity.Critical,
            affectedComponent: 'command-line-arguments',
            remediation: 'Move sensitive data to environment variables or configuration files',
            patchAvailable: true,
            detectedAt: new Date()
          });
          break; // Only report once per arg
        }
      }
    }
    
    return vulnerabilities;
  }
  
  /**
   * Schedule regular scans for a server
   */
  public scheduleRegularScans(server: MCPServer, intervalHours: number = 24): void {
    // Cancel any existing scheduled scan for this server
    this.cancelScheduledScan(server);
    
    // Schedule a new scan
    const intervalMs = intervalHours * 60 * 60 * 1000;
    const timerId = setInterval(() => {
      this.scanServer(server).catch(error => {
        console.error(`Scheduled scan failed for ${server.name}:`, error);
      });
    }, intervalMs);
    
    this.scheduledScans.set(server.name, timerId);
    console.log(`Scheduled regular scans for ${server.name} every ${intervalHours} hours`);
  }
  
  /**
   * Cancel scheduled scans for a server
   */
  public cancelScheduledScan(server: MCPServer): void {
    const timerId = this.scheduledScans.get(server.name);
    if (timerId) {
      clearInterval(timerId);
      this.scheduledScans.delete(server.name);
      console.log(`Cancelled scheduled scans for ${server.name}`);
    }
  }
  
  /**
   * Get all known vulnerabilities
   */
  public getAllVulnerabilities(): Vulnerability[] {
    return Array.from(this.vulnerabilityDatabase.values());
  }
  
  /**
   * Get vulnerability by ID
   */
  public getVulnerabilityById(id: string): Vulnerability | undefined {
    return this.vulnerabilityDatabase.get(id);
  }
}

export default SecurityScanningService;

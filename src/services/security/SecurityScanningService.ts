import { EventEmitter } from 'events';

/**
 * Vulnerability severity levels
 */
export enum VulnerabilitySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Vulnerability types
 */
export enum VulnerabilityType {
  DEPENDENCY = 'dependency',
  CONFIGURATION = 'configuration',
  CODE = 'code',
  NETWORK = 'network',
  PERMISSION = 'permission',
  OS = 'os'
}

/**
 * Vulnerability definition
 */
export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  type: VulnerabilityType;
  affectedComponent: string;
  cveId?: string; // Common Vulnerabilities and Exposures ID if available
  cvssScore?: number; // Common Vulnerability Scoring System score (0-10)
  detectedAt: number; // timestamp
  fixAvailable: boolean;
  fixInstructions?: string;
  references?: string[];
  status: 'open' | 'inProgress' | 'fixed' | 'ignored';
}

/**
 * Scan target type
 */
export interface ScanTarget {
  id: string;
  name: string;
  type: 'server' | 'container' | 'configuration' | 'application';
  path?: string; // File path or URL if applicable
  attributes?: Record<string, any>; // Additional target attributes
}

/**
 * Scan configuration
 */
export interface ScanConfig {
  includeTypes?: VulnerabilityType[]; // Types to include in scan
  excludeTypes?: VulnerabilityType[]; // Types to exclude from scan
  minSeverity?: VulnerabilitySeverity; // Minimum severity level to report
  scanDependencies?: boolean; // Whether to scan dependencies
  scanConfigurations?: boolean; // Whether to scan configurations
  scanNetwork?: boolean; // Whether to scan network settings
  scanPermissions?: boolean; // Whether to scan permissions
  scanOS?: boolean; // Whether to scan OS-level vulnerabilities
  maxDepth?: number; // Maximum recursion depth for dependency scanning
  excludePatterns?: string[]; // Patterns to exclude from scan
  timeout?: number; // Scan timeout in milliseconds
}

/**
 * Scan result
 */
export interface ScanResult {
  id: string;
  targetId: string;
  targetName: string;
  startTime: number;
  endTime: number;
  scanDuration: number; // in milliseconds
  status: 'inProgress' | 'completed' | 'failed' | 'cancelled';
  vulnerabilities: Vulnerability[];
  error?: string;
  summary: {
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    fixableCount: number;
  };
}

/**
 * SecurityScanningService provides methods to scan MCP servers, containers,
 * and configurations for security vulnerabilities.
 */
export class SecurityScanningService extends EventEmitter {
  private static instance: SecurityScanningService;
  private scans: Map<string, ScanResult> = new Map();
  private scanTargets: Map<string, ScanTarget> = new Map();
  private currentScan: string | null = null;
  private vunerabilityDatabase: Map<string, any> = new Map(); // Simplified for demonstration
  private isInitialized: boolean = false;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    super();
  }
  
  /**
   * Get the singleton instance
   * @returns The SecurityScanningService instance
   */
  public static getInstance(): SecurityScanningService {
    if (!SecurityScanningService.instance) {
      SecurityScanningService.instance = new SecurityScanningService();
    }
    return SecurityScanningService.instance;
  }
  
  /**
   * Initialize the security scanning service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // In a real implementation, we would load vulnerability definitions,
      // scanner plugins, etc.
      
      // For demonstration, we'll create a simple mock vulnerability database
      this.loadMockVulnerabilityDatabase();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize SecurityScanningService:', error);
      throw error;
    }
  }
  
  /**
   * Load mock vulnerability database for demonstration
   * @private
   */
  private loadMockVulnerabilityDatabase(): void {
    // Mock vulnerability definitions for demonstration
    const mockVulnerabilities = [
      {
        id: 'VULN-DEMO-1',
        title: 'Insecure Default Configuration',
        description: 'The MCP server is using insecure default settings that could expose sensitive data.',
        severity: VulnerabilitySeverity.HIGH,
        type: VulnerabilityType.CONFIGURATION,
        detectionPattern: 'allowInsecureConnections=true',
        mitigation: 'Set allowInsecureConnections to false in the server configuration file.'
      },
      {
        id: 'VULN-DEMO-2',
        title: 'Outdated Dependency',
        description: 'The server is using an outdated dependency with known security vulnerabilities.',
        severity: VulnerabilitySeverity.MEDIUM,
        type: VulnerabilityType.DEPENDENCY,
        detectionPattern: 'package-version < 2.3.4',
        mitigation: 'Update the dependency to version 2.3.4 or later.'
      },
      {
        id: 'VULN-DEMO-3',
        title: 'Excessive Permissions',
        description: 'The MCP server is running with more permissions than needed.',
        severity: VulnerabilitySeverity.MEDIUM,
        type: VulnerabilityType.PERMISSION,
        detectionPattern: 'permissions=admin',
        mitigation: 'Use the principle of least privilege. Configure the server to run with minimal necessary permissions.'
      },
      {
        id: 'VULN-DEMO-4',
        title: 'Exposed Debug Endpoint',
        description: 'A debug endpoint is exposed on the server which could be used to leak sensitive information.',
        severity: VulnerabilitySeverity.CRITICAL,
        type: VulnerabilityType.NETWORK,
        detectionPattern: 'enableDebugEndpoint=true',
        mitigation: 'Disable the debug endpoint in production environments.'
      },
      {
        id: 'VULN-DEMO-5',
        title: 'Insufficient Logging',
        description: 'The server has insufficient logging configured which could make incident response difficult.',
        severity: VulnerabilitySeverity.LOW,
        type: VulnerabilityType.CONFIGURATION,
        detectionPattern: 'logLevel=minimal',
        mitigation: 'Increase the log level to at least "info" to capture important events.'
      }
    ];
    
    // Add to the database
    mockVulnerabilities.forEach(vuln => {
      this.vunerabilityDatabase.set(vuln.id, vuln);
    });
  }
  
  /**
   * Add a scan target
   * @param target The scan target
   * @returns The target ID
   */
  public addScanTarget(target: Omit<ScanTarget, 'id'>): string {
    const targetId = `target-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const newTarget: ScanTarget = {
      ...target,
      id: targetId
    };
    
    this.scanTargets.set(targetId, newTarget);
    this.emit('target_added', newTarget);
    
    return targetId;
  }
  
  /**
   * Get a scan target
   * @param targetId The target ID
   * @returns The scan target or undefined if not found
   */
  public getScanTarget(targetId: string): ScanTarget | undefined {
    return this.scanTargets.get(targetId);
  }
  
  /**
   * Get all scan targets
   * @returns Array of scan targets
   */
  public getAllScanTargets(): ScanTarget[] {
    return Array.from(this.scanTargets.values());
  }
  
  /**
   * Remove a scan target
   * @param targetId The target ID
   * @returns True if removed, false if not found
   */
  public removeScanTarget(targetId: string): boolean {
    if (!this.scanTargets.has(targetId)) return false;
    
    this.scanTargets.delete(targetId);
    this.emit('target_removed', targetId);
    
    return true;
  }
  
  /**
   * Start a scan on a target
   * @param targetId The target ID
   * @param config Optional scan configuration
   * @returns The scan result ID
   */
  public async startScan(targetId: string, config?: ScanConfig): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.currentScan) {
      throw new Error('A scan is already in progress. Please wait or cancel the current scan.');
    }
    
    const target = this.scanTargets.get(targetId);
    
    if (!target) {
      throw new Error(`Scan target with ID ${targetId} not found.`);
    }
    
    const scanId = `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create initial scan result
    const scanResult: ScanResult = {
      id: scanId,
      targetId,
      targetName: target.name,
      startTime: Date.now(),
      endTime: 0,
      scanDuration: 0,
      status: 'inProgress',
      vulnerabilities: [],
      summary: {
        totalVulnerabilities: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        fixableCount: 0
      }
    };
    
    this.scans.set(scanId, scanResult);
    this.currentScan = scanId;
    
    this.emit('scan_started', scanResult);
    
    // Simulate scanning in the background
    setTimeout(() => {
      this.performScan(scanId, target, config).catch(error => {
        console.error('Scan failed:', error);
        
        const failedScan = this.scans.get(scanId);
        
        if (failedScan) {
          failedScan.status = 'failed';
          failedScan.error = error.message;
          this.scans.set(scanId, failedScan);
          this.emit('scan_failed', failedScan);
        }
        
        this.currentScan = null;
      });
    }, 0);
    
    return scanId;
  }
  
  /**
   * Perform the scan operation
   * @param scanId The scan ID
   * @param target The scan target
   * @param config Optional scan configuration
   * @private
   */
  private async performScan(scanId: string, target: ScanTarget, config?: ScanConfig): Promise<void> {
    try {
      const scanResult = this.scans.get(scanId);
      
      if (!scanResult) {
        throw new Error(`Scan with ID ${scanId} not found.`);
      }
      
      // In a real implementation, this is where we would scan the target
      // using various scanners, tools, etc.
      
      // For demonstration, we'll simulate finding vulnerabilities based on the target type
      const detectedVulnerabilities = this.simulateVulnerabilityDetection(target);
      
      // Update the scan result
      scanResult.vulnerabilities = detectedVulnerabilities;
      scanResult.endTime = Date.now();
      scanResult.scanDuration = scanResult.endTime - scanResult.startTime;
      scanResult.status = 'completed';
      
      // Update summary
      const summary = {
        totalVulnerabilities: detectedVulnerabilities.length,
        criticalCount: detectedVulnerabilities.filter(v => v.severity === VulnerabilitySeverity.CRITICAL).length,
        highCount: detectedVulnerabilities.filter(v => v.severity === VulnerabilitySeverity.HIGH).length,
        mediumCount: detectedVulnerabilities.filter(v => v.severity === VulnerabilitySeverity.MEDIUM).length,
        lowCount: detectedVulnerabilities.filter(v => v.severity === VulnerabilitySeverity.LOW).length,
        fixableCount: detectedVulnerabilities.filter(v => v.fixAvailable).length
      };
      
      scanResult.summary = summary;
      
      this.scans.set(scanId, scanResult);
      this.emit('scan_completed', scanResult);
    } catch (error) {
      console.error('Error during scan:', error);
      throw error;
    } finally {
      this.currentScan = null;
    }
  }
  
  /**
   * Simulate detecting vulnerabilities based on the target type
   * @param target The scan target
   * @returns Array of detected vulnerabilities
   * @private
   */
  private simulateVulnerabilityDetection(target: ScanTarget): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    
    // This is just a simulation for demonstration
    switch (target.type) {
      case 'server':
        // Simulate server having configuration and network vulnerabilities
        vulnerabilities.push(this.createVulnerabilityInstance('VULN-DEMO-1', target));
        vulnerabilities.push(this.createVulnerabilityInstance('VULN-DEMO-4', target));
        break;
        
      case 'container':
        // Simulate container having dependency and permission vulnerabilities
        vulnerabilities.push(this.createVulnerabilityInstance('VULN-DEMO-2', target));
        vulnerabilities.push(this.createVulnerabilityInstance('VULN-DEMO-3', target));
        break;
        
      case 'configuration':
        // Simulate configuration having insufficient logging
        vulnerabilities.push(this.createVulnerabilityInstance('VULN-DEMO-5', target));
        break;
        
      case 'application':
        // Simulate application having multiple vulnerabilities
        vulnerabilities.push(this.createVulnerabilityInstance('VULN-DEMO-2', target));
        vulnerabilities.push(this.createVulnerabilityInstance('VULN-DEMO-3', target));
        vulnerabilities.push(this.createVulnerabilityInstance('VULN-DEMO-5', target));
        break;
    }
    
    // Randomly add more vulnerabilities
    if (Math.random() < 0.3) {
      vulnerabilities.push(this.createVulnerabilityInstance('VULN-DEMO-4', target));
    }
    
    return vulnerabilities;
  }
  
  /**
   * Create a vulnerability instance from a template
   * @param vulnId The vulnerability ID from the database
   * @param target The scan target
   * @returns The vulnerability instance
   * @private
   */
  private createVulnerabilityInstance(vulnId: string, target: ScanTarget): Vulnerability {
    const template = this.vunerabilityDatabase.get(vulnId);
    
    if (!template) {
      throw new Error(`Vulnerability template with ID ${vulnId} not found.`);
    }
    
    // Create a new vulnerability instance
    const vulnerability: Vulnerability = {
      id: `${vulnId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: template.title,
      description: template.description,
      severity: template.severity,
      type: template.type,
      affectedComponent: target.name,
      detectedAt: Date.now(),
      fixAvailable: true,
      fixInstructions: template.mitigation,
      status: 'open'
    };
    
    return vulnerability;
  }
  
  /**
   * Cancel an ongoing scan
   * @param scanId The scan ID
   * @returns True if cancelled, false if not found or already finished
   */
  public cancelScan(scanId: string): boolean {
    if (this.currentScan !== scanId) return false;
    
    const scanResult = this.scans.get(scanId);
    
    if (!scanResult || scanResult.status !== 'inProgress') return false;
    
    scanResult.status = 'cancelled';
    scanResult.endTime = Date.now();
    scanResult.scanDuration = scanResult.endTime - scanResult.startTime;
    
    this.scans.set(scanId, scanResult);
    this.currentScan = null;
    
    this.emit('scan_cancelled', scanResult);
    
    return true;
  }
  
  /**
   * Get a scan result
   * @param scanId The scan ID
   * @returns The scan result or undefined if not found
   */
  public getScanResult(scanId: string): ScanResult | undefined {
    return this.scans.get(scanId);
  }
  
  /**
   * Get all scan results
   * @returns Array of scan results
   */
  public getAllScanResults(): ScanResult[] {
    return Array.from(this.scans.values());
  }
  
  /**
   * Get vulnerabilities from a scan
   * @param scanId The scan ID
   * @returns Array of vulnerabilities or empty array if scan not found
   */
  public getVulnerabilities(scanId: string): Vulnerability[] {
    const scanResult = this.scans.get(scanId);
    
    if (!scanResult) return [];
    
    return scanResult.vulnerabilities;
  }
  
  /**
   * Update the status of a vulnerability
   * @param scanId The scan ID
   * @param vulnerabilityId The vulnerability ID
   * @param status The new status
   * @returns True if updated, false if not found
   */
  public updateVulnerabilityStatus(
    scanId: string,
    vulnerabilityId: string,
    status: 'open' | 'inProgress' | 'fixed' | 'ignored'
  ): boolean {
    const scanResult = this.scans.get(scanId);
    
    if (!scanResult) return false;
    
    const vulnerability = scanResult.vulnerabilities.find(v => v.id === vulnerabilityId);
    
    if (!vulnerability) return false;
    
    vulnerability.status = status;
    
    this.scans.set(scanId, scanResult);
    this.emit('vulnerability_updated', { scanId, vulnerabilityId, status });
    
    return true;
  }
  
  /**
   * Get the current scan
   * @returns The current scan ID or null if no scan is in progress
   */
  public getCurrentScan(): string | null {
    return this.currentScan;
  }
  
  /**
   * Check if a scan is in progress
   * @returns True if a scan is in progress
   */
  public isScanInProgress(): boolean {
    return this.currentScan !== null;
  }
}

// Export the singleton instance
export const securityScanningService = SecurityScanningService.getInstance();
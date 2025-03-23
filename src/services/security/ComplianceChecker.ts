import { EventEmitter } from 'events';
import { securityScanningService, ScanResult, Vulnerability } from './SecurityScanningService';

/**
 * Compliance standard definition
 */
export interface ComplianceStandard {
  id: string;
  name: string;
  description: string;
  version: string;
  requirements: ComplianceRequirement[];
  category: 'industry' | 'regulatory' | 'internal' | 'security';
  url?: string; // Reference URL for the standard
}

/**
 * Compliance requirement definition
 */
export interface ComplianceRequirement {
  id: string;
  standardId: string;
  name: string;
  description: string;
  section?: string; // Section or category within the standard
  level?: 'basic' | 'intermediate' | 'advanced'; // Requirement level if applicable
  checkFunction: (serverConfig: any, scanResults?: ScanResult[]) => ComplianceCheckResult;
}

/**
 * Compliance check result
 */
export interface ComplianceCheckResult {
  requirementId: string;
  standardId: string;
  status: 'compliant' | 'nonCompliant' | 'partiallyCompliant' | 'notApplicable';
  evidence?: string;
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  remediationSteps?: string;
}

/**
 * Compliance assessment result
 */
export interface ComplianceAssessment {
  id: string;
  standardId: string;
  targetId: string;
  targetName: string;
  timestamp: number;
  results: ComplianceCheckResult[];
  overallStatus: 'compliant' | 'nonCompliant' | 'partiallyCompliant';
  summary: {
    totalRequirements: number;
    compliantCount: number;
    nonCompliantCount: number;
    partiallyCompliantCount: number;
    notApplicableCount: number;
    compliancePercentage: number;
  };
}

/**
 * ComplianceChecker provides methods to check MCP server configurations against
 * various compliance standards.
 */
export class ComplianceChecker extends EventEmitter {
  private static instance: ComplianceChecker;
  private standards: Map<string, ComplianceStandard> = new Map();
  private assessments: Map<string, ComplianceAssessment> = new Map();
  private isInitialized: boolean = false;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    super();
  }
  
  /**
   * Get the singleton instance
   * @returns The ComplianceChecker instance
   */
  public static getInstance(): ComplianceChecker {
    if (!ComplianceChecker.instance) {
      ComplianceChecker.instance = new ComplianceChecker();
    }
    return ComplianceChecker.instance;
  }
  
  /**
   * Initialize the compliance checker
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // In a real implementation, we would load compliance standards from external sources,
      // but for demonstration, we'll create a set of built-in standards.
      this.loadBuiltInStandards();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize ComplianceChecker:', error);
      throw error;
    }
  }
  
  /**
   * Load built-in compliance standards
   * @private
   */
  private loadBuiltInStandards(): void {
    // Create a simplified security best practices standard
    const securityBestPractices: ComplianceStandard = {
      id: 'MCP-SEC-BEST-PRACTICES',
      name: 'MCP Security Best Practices',
      description: 'A set of security best practices for MCP servers',
      version: '1.0.0',
      category: 'security',
      requirements: [
        {
          id: 'SEC-BP-1',
          standardId: 'MCP-SEC-BEST-PRACTICES',
          name: 'Secure Connections',
          description: 'All connections to MCP servers should be encrypted',
          level: 'basic',
          checkFunction: (serverConfig) => {
            // Check if HTTPS is enabled
            const isHttpsEnabled = serverConfig?.https?.enabled === true;
            
            return {
              requirementId: 'SEC-BP-1',
              standardId: 'MCP-SEC-BEST-PRACTICES',
              status: isHttpsEnabled ? 'compliant' : 'nonCompliant',
              evidence: isHttpsEnabled 
                ? 'HTTPS is enabled in the server configuration' 
                : 'HTTPS is not enabled in the server configuration',
              severity: 'high',
              remediationSteps: 'Enable HTTPS in the server configuration and configure proper SSL certificates.'
            };
          }
        },
        {
          id: 'SEC-BP-2',
          standardId: 'MCP-SEC-BEST-PRACTICES',
          name: 'Strong Authentication',
          description: 'Strong authentication should be enforced for all users',
          level: 'basic',
          checkFunction: (serverConfig) => {
            // Check if strong authentication is enabled
            const authConfig = serverConfig?.authentication || {};
            const isStrongAuthEnabled = 
              authConfig.method === 'oauth2' || 
              authConfig.mfa === true || 
              authConfig.passwordMinLength >= 12;
            
            return {
              requirementId: 'SEC-BP-2',
              standardId: 'MCP-SEC-BEST-PRACTICES',
              status: isStrongAuthEnabled ? 'compliant' : 'nonCompliant',
              evidence: isStrongAuthEnabled 
                ? 'Strong authentication is enabled' 
                : 'Weak authentication is configured',
              severity: 'high',
              remediationSteps: 'Enable OAuth2, MFA, or enforce strong password policies.'
            };
          }
        },
        {
          id: 'SEC-BP-3',
          standardId: 'MCP-SEC-BEST-PRACTICES',
          name: 'Comprehensive Logging',
          description: 'Comprehensive logging should be enabled for auditing and troubleshooting',
          level: 'basic',
          checkFunction: (serverConfig) => {
            // Check if comprehensive logging is enabled
            const logConfig = serverConfig?.logging || {};
            const isComprehensiveLoggingEnabled = 
              logConfig.level === 'info' || 
              logConfig.level === 'debug' || 
              (logConfig.events && logConfig.events.includes('access') && logConfig.events.includes('error'));
            
            return {
              requirementId: 'SEC-BP-3',
              standardId: 'MCP-SEC-BEST-PRACTICES',
              status: isComprehensiveLoggingEnabled ? 'compliant' : 'nonCompliant',
              evidence: isComprehensiveLoggingEnabled 
                ? 'Comprehensive logging is enabled' 
                : 'Insufficient logging is configured',
              severity: 'medium',
              remediationSteps: 'Set log level to "info" or higher and enable logging for access and error events.'
            };
          }
        },
        {
          id: 'SEC-BP-4',
          standardId: 'MCP-SEC-BEST-PRACTICES',
          name: 'No Critical Vulnerabilities',
          description: 'There should be no critical vulnerabilities in the system',
          level: 'basic',
          checkFunction: (serverConfig, scanResults) => {
            // Check if there are any critical vulnerabilities
            let hasCriticalVulnerabilities = false;
            let evidence = 'No critical vulnerabilities found';
            
            if (scanResults && scanResults.length > 0) {
              const allVulnerabilities = scanResults.flatMap(result => result.vulnerabilities);
              const criticalVulnerabilities = allVulnerabilities.filter(
                vuln => vuln.severity === 'critical' && vuln.status === 'open'
              );
              
              hasCriticalVulnerabilities = criticalVulnerabilities.length > 0;
              evidence = hasCriticalVulnerabilities 
                ? `${criticalVulnerabilities.length} critical vulnerabilities found` 
                : 'No critical vulnerabilities found';
            }
            
            return {
              requirementId: 'SEC-BP-4',
              standardId: 'MCP-SEC-BEST-PRACTICES',
              status: hasCriticalVulnerabilities ? 'nonCompliant' : 'compliant',
              evidence,
              severity: 'critical',
              remediationSteps: 'Address all critical vulnerabilities identified in security scans.'
            };
          }
        },
        {
          id: 'SEC-BP-5',
          standardId: 'MCP-SEC-BEST-PRACTICES',
          name: 'Regular Security Updates',
          description: 'Regular security updates should be applied to all components',
          level: 'basic',
          checkFunction: (serverConfig) => {
            // Check if auto-updates are enabled or if updates were applied recently
            const updateConfig = serverConfig?.updates || {};
            const isAutoUpdateEnabled = updateConfig.autoUpdate === true;
            const lastUpdateTime = updateConfig.lastUpdateTime || 0;
            const isRecentlyUpdated = Date.now() - lastUpdateTime < 30 * 24 * 60 * 60 * 1000; // 30 days
            
            const isCompliant = isAutoUpdateEnabled || isRecentlyUpdated;
            
            return {
              requirementId: 'SEC-BP-5',
              standardId: 'MCP-SEC-BEST-PRACTICES',
              status: isCompliant ? 'compliant' : 'nonCompliant',
              evidence: isCompliant 
                ? isAutoUpdateEnabled 
                  ? 'Auto-updates are enabled' 
                  : 'System was updated within the last 30 days' 
                : 'Auto-updates are disabled and system has not been updated recently',
              severity: 'high',
              remediationSteps: 'Enable auto-updates or regularly apply security updates manually.'
            };
          }
        }
      ]
    };
    
    // Create a simplified PCI DSS standard (for demonstration)
    const pciDss: ComplianceStandard = {
      id: 'PCI-DSS-4.0',
      name: 'Payment Card Industry Data Security Standard',
      description: 'A set of security standards for organizations that handle credit card information',
      version: '4.0',
      category: 'industry',
      url: 'https://www.pcisecuritystandards.org/',
      requirements: [
        {
          id: 'PCI-1.2',
          standardId: 'PCI-DSS-4.0',
          name: 'Firewall Configuration',
          description: 'Install and maintain a firewall configuration to protect data',
          section: 'Requirement 1: Install and maintain network security controls',
          level: 'basic',
          checkFunction: (serverConfig) => {
            // Check if firewall is enabled and properly configured
            const networkConfig = serverConfig?.network || {};
            const firewallConfig = networkConfig.firewall || {};
            const isFirewallEnabled = firewallConfig.enabled === true;
            const hasRestrictiveRules = firewallConfig.defaultDeny === true || 
              (firewallConfig.rules && firewallConfig.rules.some(rule => rule.action === 'deny'));
            
            const isCompliant = isFirewallEnabled && hasRestrictiveRules;
            
            return {
              requirementId: 'PCI-1.2',
              standardId: 'PCI-DSS-4.0',
              status: isCompliant ? 'compliant' : 'nonCompliant',
              evidence: isCompliant 
                ? 'Firewall is enabled with restrictive rules' 
                : 'Firewall is not enabled or lacks restrictive rules',
              severity: 'high',
              remediationSteps: 'Enable the firewall and configure restrictive rules to deny unauthorized access.'
            };
          }
        },
        {
          id: 'PCI-3.4',
          standardId: 'PCI-DSS-4.0',
          name: 'Protect Stored Cardholder Data',
          description: 'Render PAN unreadable anywhere it is stored',
          section: 'Requirement 3: Protect stored account data',
          level: 'basic',
          checkFunction: (serverConfig) => {
            // Check if data encryption is enabled
            const dataConfig = serverConfig?.data || {};
            const isEncryptionEnabled = dataConfig.encryption === true;
            const isPanMasked = dataConfig.panMasking === true;
            
            const isCompliant = isEncryptionEnabled && isPanMasked;
            
            return {
              requirementId: 'PCI-3.4',
              standardId: 'PCI-DSS-4.0',
              status: isCompliant ? 'compliant' : 'nonCompliant',
              evidence: isCompliant 
                ? 'Data encryption and PAN masking are enabled' 
                : 'Data encryption or PAN masking is not enabled',
              severity: 'critical',
              remediationSteps: 'Enable data encryption and PAN masking for all stored cardholder data.'
            };
          }
        }
      ]
    };
    
    // Add the standards to the map
    this.standards.set(securityBestPractices.id, securityBestPractices);
    this.standards.set(pciDss.id, pciDss);
  }
  
  /**
   * Add a custom compliance standard
   * @param standard The compliance standard to add
   * @returns The standard ID
   */
  public addComplianceStandard(standard: Omit<ComplianceStandard, 'id'>): string {
    const standardId = `standard-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const newStandard: ComplianceStandard = {
      ...standard,
      id: standardId
    };
    
    this.standards.set(standardId, newStandard);
    this.emit('standard_added', newStandard);
    
    return standardId;
  }
  
  /**
   * Get a compliance standard
   * @param standardId The standard ID
   * @returns The compliance standard or undefined if not found
   */
  public getComplianceStandard(standardId: string): ComplianceStandard | undefined {
    return this.standards.get(standardId);
  }
  
  /**
   * Get all compliance standards
   * @returns Array of compliance standards
   */
  public getAllComplianceStandards(): ComplianceStandard[] {
    return Array.from(this.standards.values());
  }
  
  /**
   * Remove a compliance standard
   * @param standardId The standard ID
   * @returns True if removed, false if not found
   */
  public removeComplianceStandard(standardId: string): boolean {
    // Don't allow removing built-in standards
    if (standardId === 'MCP-SEC-BEST-PRACTICES' || standardId === 'PCI-DSS-4.0') {
      return false;
    }
    
    if (!this.standards.has(standardId)) return false;
    
    this.standards.delete(standardId);
    this.emit('standard_removed', standardId);
    
    return true;
  }
  
  /**
   * Assess a target against a compliance standard
   * @param standardId The standard ID
   * @param targetId The target ID
   * @param serverConfig The server configuration
   * @returns The assessment result
   */
  public async assessCompliance(
    standardId: string,
    targetId: string,
    targetName: string,
    serverConfig: any
  ): Promise<ComplianceAssessment> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const standard = this.standards.get(standardId);
    
    if (!standard) {
      throw new Error(`Compliance standard with ID ${standardId} not found.`);
    }
    
    // Get recent scan results for the target (if available)
    const scanResults = securityScanningService.getAllScanResults()
      .filter(result => result.targetId === targetId);
    
    // Run all compliance checks
    const checkResults: ComplianceCheckResult[] = [];
    
    for (const requirement of standard.requirements) {
      try {
        const result = requirement.checkFunction(serverConfig, scanResults);
        checkResults.push(result);
      } catch (error) {
        console.error(`Error checking compliance for requirement ${requirement.id}:`, error);
        
        // Add a fallback result
        checkResults.push({
          requirementId: requirement.id,
          standardId: standard.id,
          status: 'nonCompliant',
          evidence: `Error during compliance check: ${error.message}`,
          severity: 'medium',
          remediationSteps: 'Review server configuration and try again.'
        });
      }
    }
    
    // Calculate summary statistics
    const totalRequirements = checkResults.length;
    const compliantCount = checkResults.filter(result => result.status === 'compliant').length;
    const nonCompliantCount = checkResults.filter(result => result.status === 'nonCompliant').length;
    const partiallyCompliantCount = checkResults.filter(result => result.status === 'partiallyCompliant').length;
    const notApplicableCount = checkResults.filter(result => result.status === 'notApplicable').length;
    
    const compliancePercentage = totalRequirements > 0
      ? Math.round((compliantCount / (totalRequirements - notApplicableCount)) * 100)
      : 0;
    
    // Determine overall status
    let overallStatus: 'compliant' | 'nonCompliant' | 'partiallyCompliant';
    
    if (nonCompliantCount === 0 && partiallyCompliantCount === 0) {
      overallStatus = 'compliant';
    } else if (compliantCount === 0) {
      overallStatus = 'nonCompliant';
    } else {
      overallStatus = 'partiallyCompliant';
    }
    
    // Create the assessment
    const assessmentId = `assessment-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const assessment: ComplianceAssessment = {
      id: assessmentId,
      standardId,
      targetId,
      targetName,
      timestamp: Date.now(),
      results: checkResults,
      overallStatus,
      summary: {
        totalRequirements,
        compliantCount,
        nonCompliantCount,
        partiallyCompliantCount,
        notApplicableCount,
        compliancePercentage
      }
    };
    
    // Save the assessment
    this.assessments.set(assessmentId, assessment);
    this.emit('assessment_completed', assessment);
    
    return assessment;
  }
  
  /**
   * Get a compliance assessment
   * @param assessmentId The assessment ID
   * @returns The compliance assessment or undefined if not found
   */
  public getComplianceAssessment(assessmentId: string): ComplianceAssessment | undefined {
    return this.assessments.get(assessmentId);
  }
  
  /**
   * Get all compliance assessments
   * @returns Array of compliance assessments
   */
  public getAllComplianceAssessments(): ComplianceAssessment[] {
    return Array.from(this.assessments.values());
  }
  
  /**
   * Get compliance assessments for a target
   * @param targetId The target ID
   * @returns Array of compliance assessments for the target
   */
  public getComplianceAssessmentsForTarget(targetId: string): ComplianceAssessment[] {
    return Array.from(this.assessments.values())
      .filter(assessment => assessment.targetId === targetId);
  }
  
  /**
   * Get the latest compliance assessment for a target
   * @param targetId The target ID
   * @param standardId Optional standard ID
   * @returns The latest compliance assessment or undefined if none found
   */
  public getLatestComplianceAssessmentForTarget(
    targetId: string,
    standardId?: string
  ): ComplianceAssessment | undefined {
    let assessments = Array.from(this.assessments.values())
      .filter(assessment => assessment.targetId === targetId);
    
    if (standardId) {
      assessments = assessments.filter(assessment => assessment.standardId === standardId);
    }
    
    if (assessments.length === 0) return undefined;
    
    // Sort by timestamp (descending) and return the first one
    return assessments.sort((a, b) => b.timestamp - a.timestamp)[0];
  }
}

// Export the singleton instance
export const complianceChecker = ComplianceChecker.getInstance();
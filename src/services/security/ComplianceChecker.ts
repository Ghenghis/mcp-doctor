import { EventEmitter } from 'events';
import { MCPServer, MCPClient, ErrorType } from '../../types';
import { 
  ComplianceCheck, 
  ComplianceStandard,
  ComplianceStatus
} from '../../types/security';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Service to check compliance with security standards
 */
export class ComplianceChecker extends EventEmitter {
  private static instance: ComplianceChecker;
  private complianceStandards: Map<ComplianceStandard, ComplianceControl[]>;
  
  /**
   * Compliance control definition
   */
  private interface ComplianceControl {
    id: string;
    standard: ComplianceStandard;
    control: string;
    description: string;
    checkFunction: (server: MCPServer) => Promise<ComplianceStatus>;
    recommendations?: string;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    super();
    this.complianceStandards = new Map<ComplianceStandard, ComplianceControl[]>();
    this.initializeStandards();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ComplianceChecker {
    if (!ComplianceChecker.instance) {
      ComplianceChecker.instance = new ComplianceChecker();
    }
    return ComplianceChecker.instance;
  }
  
  /**
   * Initialize compliance standards
   */
  private initializeStandards(): void {
    // Initialize OWASP standards
    const owaspControls: ComplianceControl[] = this.initializeOWASPControls();
    this.complianceStandards.set(ComplianceStandard.OWASP, owaspControls);
    
    // Initialize NIST standards
    const nistControls: ComplianceControl[] = this.initializeNISTControls();
    this.complianceStandards.set(ComplianceStandard.NIST, nistControls);
    
    // Initialize PCI standards
    const pciControls: ComplianceControl[] = this.initializePCIControls();
    this.complianceStandards.set(ComplianceStandard.PCI, pciControls);
    
    // Initialize GDPR standards
    const gdprControls: ComplianceControl[] = this.initializeGDPRControls();
    this.complianceStandards.set(ComplianceStandard.GDPR, gdprControls);
    
    console.log('Compliance standards initialized:');
    for (const [standard, controls] of this.complianceStandards.entries()) {
      console.log(`- ${standard}: ${controls.length} controls`);
    }
  }
  
  /**
   * Initialize OWASP compliance controls
   */
  private initializeOWASPControls(): ComplianceControl[] {
    return [
      {
        id: 'OWASP-1',
        standard: ComplianceStandard.OWASP,
        control: 'A01:2021 – Broken Access Control',
        description: 'Verify that access control is properly implemented',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Check for authentication and authorization mechanisms
          const hasAuth = server.args.some(arg => 
            arg.includes('--auth') || 
            arg.includes('--authentication') || 
            server.env['MCP_AUTH_ENABLED'] === 'true'
          );
          
          return hasAuth ? ComplianceStatus.Pass : ComplianceStatus.Fail;
        },
        recommendations: 'Implement proper authentication and authorization mechanisms'
      },
      {
        id: 'OWASP-2',
        standard: ComplianceStandard.OWASP,
        control: 'A02:2021 – Cryptographic Failures',
        description: 'Check for proper encryption and cryptographic practices',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Check for TLS/HTTPS configuration
          const hasEncryption = server.args.some(arg => 
            arg.includes('--tls') || 
            arg.includes('--https') || 
            arg.includes('--ssl') ||
            server.env['MCP_USE_TLS'] === 'true'
          );
          
          return hasEncryption ? ComplianceStatus.Pass : ComplianceStatus.Fail;
        },
        recommendations: 'Enable TLS/HTTPS for all communications'
      },
      {
        id: 'OWASP-3',
        standard: ComplianceStandard.OWASP,
        control: 'A03:2021 – Injection',
        description: 'Check for protection against injection attacks',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // For MCP servers, this generally applies to input validation
          // This is a simplified check - a real implementation would be more thorough
          return ComplianceStatus.Warning; // Need manual review
        },
        recommendations: 'Implement proper input validation and sanitization'
      },
      {
        id: 'OWASP-4',
        standard: ComplianceStandard.OWASP,
        control: 'A05:2021 – Security Misconfiguration',
        description: 'Check for security misconfigurations',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Check for insecure configurations
          const hasInsecureConfig = server.args.some(arg => 
            arg.includes('--disable-security') || 
            arg.includes('--dev-mode') || 
            arg.includes('--skip-auth') ||
            server.env['MCP_DEV_MODE'] === 'true'
          );
          
          return hasInsecureConfig ? ComplianceStatus.Fail : ComplianceStatus.Pass;
        },
        recommendations: 'Remove insecure configurations and development flags in production'
      }
    ];
  }
  
  /**
   * Initialize NIST compliance controls
   */
  private initializeNISTControls(): ComplianceControl[] {
    return [
      {
        id: 'NIST-1',
        standard: ComplianceStandard.NIST,
        control: 'AC-2 Account Management',
        description: 'Verify account management practices',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Simplified check - would need more context in real implementation
          return ComplianceStatus.Warning; // Need manual review
        },
        recommendations: 'Implement proper account management practices'
      },
      {
        id: 'NIST-2',
        standard: ComplianceStandard.NIST,
        control: 'CM-6 Configuration Settings',
        description: 'Verify secure configuration settings',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Check for configuration file security
          // This is a simplified check - a real implementation would analyze actual config files
          return ComplianceStatus.Warning; // Need manual review
        },
        recommendations: 'Secure configuration files and settings'
      },
      {
        id: 'NIST-3',
        standard: ComplianceStandard.NIST,
        control: 'SC-8 Transmission Confidentiality and Integrity',
        description: 'Check for data protection during transmission',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Check for TLS/HTTPS configuration (similar to OWASP-2)
          const hasEncryption = server.args.some(arg => 
            arg.includes('--tls') || 
            arg.includes('--https') || 
            arg.includes('--ssl') ||
            server.env['MCP_USE_TLS'] === 'true'
          );
          
          return hasEncryption ? ComplianceStatus.Pass : ComplianceStatus.Fail;
        },
        recommendations: 'Enable TLS/HTTPS for all communications'
      }
    ];
  }
  
  /**
   * Initialize PCI compliance controls
   */
  private initializePCIControls(): ComplianceControl[] {
    return [
      {
        id: 'PCI-1',
        standard: ComplianceStandard.PCI,
        control: 'Requirement 2: Do not use vendor-supplied defaults',
        description: 'Check for default credentials or configurations',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Check for default credentials in environment variables
          const potentialDefaultCreds = [
            'admin', 'password', 'root', 'test', 'user', 'default'
          ];
          
          let hasDefaultCreds = false;
          
          // Check for common default passwords in env vars
          for (const [key, value] of Object.entries(server.env)) {
            if (key.toLowerCase().includes('password') && 
                potentialDefaultCreds.includes(value.toLowerCase())) {
              hasDefaultCreds = true;
              break;
            }
          }
          
          return hasDefaultCreds ? ComplianceStatus.Fail : ComplianceStatus.Pass;
        },
        recommendations: 'Change all default credentials and configurations'
      },
      {
        id: 'PCI-2',
        standard: ComplianceStandard.PCI,
        control: 'Requirement 3: Protect stored cardholder data',
        description: 'Check for proper protection of sensitive data',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // MCP servers typically don't handle cardholder data directly
          return ComplianceStatus.NotApplicable;
        },
        recommendations: 'If handling sensitive data, implement proper encryption'
      },
      {
        id: 'PCI-3',
        standard: ComplianceStandard.PCI,
        control: 'Requirement 4: Encrypt transmission of CHD',
        description: 'Check for encryption during data transmission',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Similar to OWASP-2 and NIST-3, but PCI specific
          const hasEncryption = server.args.some(arg => 
            arg.includes('--tls') || 
            arg.includes('--https') || 
            arg.includes('--ssl') ||
            server.env['MCP_USE_TLS'] === 'true'
          );
          
          // If not applicable, mark as such
          if (!server.args.some(arg => arg.includes('--payment')) &&
              !Object.keys(server.env).some(key => key.includes('PAYMENT'))) {
            return ComplianceStatus.NotApplicable;
          }
          
          return hasEncryption ? ComplianceStatus.Pass : ComplianceStatus.Fail;
        },
        recommendations: 'Enable TLS/HTTPS for all communications'
      }
    ];
  }
  
  /**
   * Initialize GDPR compliance controls
   */
  private initializeGDPRControls(): ComplianceControl[] {
    return [
      {
        id: 'GDPR-1',
        standard: ComplianceStandard.GDPR,
        control: 'Article 32 - Security of Processing',
        description: 'Check for appropriate technical measures to protect data',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Check for encryption and security measures
          const hasEncryption = server.args.some(arg => 
            arg.includes('--tls') || 
            arg.includes('--https') || 
            arg.includes('--ssl') ||
            server.env['MCP_USE_TLS'] === 'true'
          );
          
          const hasAuthentication = server.args.some(arg => 
            arg.includes('--auth') || 
            arg.includes('--authentication') || 
            server.env['MCP_AUTH_ENABLED'] === 'true'
          );
          
          if (hasEncryption && hasAuthentication) {
            return ComplianceStatus.Pass;
          } else if (hasEncryption || hasAuthentication) {
            return ComplianceStatus.Warning;
          } else {
            return ComplianceStatus.Fail;
          }
        },
        recommendations: 'Implement encryption and proper authentication for all data processing'
      },
      {
        id: 'GDPR-2',
        standard: ComplianceStandard.GDPR,
        control: 'Article 25 - Data Protection by Design',
        description: 'Check for privacy by design and by default',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Check for privacy configurations
          const hasPrivacyConfig = server.args.some(arg => 
            arg.includes('--privacy') || 
            arg.includes('--data-protection') ||
            server.env['MCP_PRIVACY_ENABLED'] === 'true'
          );
          
          // Check for data minimization
          const hasDataMinimization = server.args.some(arg => 
            arg.includes('--minimal-logging') || 
            arg.includes('--data-minimization') ||
            server.env['MCP_MINIMAL_DATA'] === 'true'
          );
          
          if (hasPrivacyConfig && hasDataMinimization) {
            return ComplianceStatus.Pass;
          } else if (hasPrivacyConfig || hasDataMinimization) {
            return ComplianceStatus.Warning;
          } else {
            return ComplianceStatus.Fail;
          }
        },
        recommendations: 'Implement privacy by design principles and data minimization'
      },
      {
        id: 'GDPR-3',
        standard: ComplianceStandard.GDPR,
        control: 'Article 30 - Records of Processing Activities',
        description: 'Check for logging of processing activities',
        checkFunction: async (server: MCPServer): Promise<ComplianceStatus> => {
          // Check for activity logging
          const hasLogging = server.args.some(arg => 
            arg.includes('--log') || 
            arg.includes('--logging') ||
            server.env['MCP_LOGGING_ENABLED'] === 'true'
          );
          
          return hasLogging ? ComplianceStatus.Pass : ComplianceStatus.Fail;
        },
        recommendations: 'Implement comprehensive logging of all data processing activities'
      }
    ];
  }
  
  /**
   * Check server compliance against a specific standard
   */
  public async checkCompliance(
    server: MCPServer, 
    standard: ComplianceStandard
  ): Promise<ComplianceCheck[]> {
    this.emit('compliance-check-started', { 
      server: server.name, 
      standard 
    });
    
    try {
      const controls = this.complianceStandards.get(standard) || [];
      if (controls.length === 0) {
        throw new Error(`No controls defined for standard: ${standard}`);
      }
      
      const results: ComplianceCheck[] = [];
      
      for (const control of controls) {
        try {
          const status = await control.checkFunction(server);
          
          results.push({
            id: control.id,
            standard: control.standard,
            control: control.control,
            description: control.description,
            status,
            recommendations: status !== ComplianceStatus.Pass ? control.recommendations : undefined,
            checkedAt: new Date()
          });
        } catch (error) {
          console.error(`Error checking compliance for ${control.id}:`, error);
          
          // Add as failure with error details
          results.push({
            id: control.id,
            standard: control.standard,
            control: control.control,
            description: control.description,
            status: ComplianceStatus.Fail,
            notes: `Error during check: ${error.message}`,
            recommendations: control.recommendations,
            checkedAt: new Date()
          });
        }
      }
      
      this.emit('compliance-check-completed', {
        server: server.name,
        standard,
        results: {
          pass: results.filter(r => r.status === ComplianceStatus.Pass).length,
          fail: results.filter(r => r.status === ComplianceStatus.Fail).length,
          warning: results.filter(r => r.status === ComplianceStatus.Warning).length,
          notApplicable: results.filter(r => r.status === ComplianceStatus.NotApplicable).length,
          total: results.length
        }
      });
      
      return results;
    } catch (error) {
      console.error(`Error checking compliance for ${server.name} against ${standard}:`, error);
      this.emit('compliance-check-failed', {
        server: server.name,
        standard,
        error
      });
      
      this.emit('error', {
        type: ErrorType.UnknownError,
        message: `Failed to check compliance for ${server.name} against ${standard}`,
        details: error,
        server,
        fixable: false
      });
      
      return [];
    }
  }
  
  /**
   * Check server compliance against all supported standards
   */
  public async checkAllCompliance(server: MCPServer): Promise<Map<ComplianceStandard, ComplianceCheck[]>> {
    const allResults = new Map<ComplianceStandard, ComplianceCheck[]>();
    
    for (const standard of this.complianceStandards.keys()) {
      const results = await this.checkCompliance(server, standard);
      allResults.set(standard, results);
    }
    
    return allResults;
  }
  
  /**
   * Get compliance score for a set of check results (0-100)
   */
  public getComplianceScore(checks: ComplianceCheck[]): number {
    const applicableChecks = checks.filter(check => 
      check.status !== ComplianceStatus.NotApplicable
    );
    
    if (applicableChecks.length === 0) {
      return 100; // No applicable checks means full compliance
    }
    
    const passedChecks = applicableChecks.filter(check => 
      check.status === ComplianceStatus.Pass
    );
    
    const warningChecks = applicableChecks.filter(check => 
      check.status === ComplianceStatus.Warning
    );
    
    // Count warnings as half passes
    const score = ((passedChecks.length + (warningChecks.length * 0.5)) / applicableChecks.length) * 100;
    
    return Math.round(score);
  }
  
  /**
   * Get priority remediation recommendations based on failed checks
   */
  public getPriorityRecommendations(checks: ComplianceCheck[], limit: number = 5): string[] {
    // Get all failed checks
    const failedChecks = checks.filter(check => 
      check.status === ComplianceStatus.Fail
    );
    
    // Extract unique recommendations
    const uniqueRecommendations = new Set<string>();
    
    for (const check of failedChecks) {
      if (check.recommendations) {
        uniqueRecommendations.add(check.recommendations);
      }
    }
    
    // Return top recommendations
    return Array.from(uniqueRecommendations).slice(0, limit);
  }
  
  /**
   * Get all available compliance standards
   */
  public getAvailableStandards(): ComplianceStandard[] {
    return Array.from(this.complianceStandards.keys());
  }
  
  /**
   * Get the number of controls for a specific standard
   */
  public getControlCount(standard: ComplianceStandard): number {
    const controls = this.complianceStandards.get(standard);
    return controls ? controls.length : 0;
  }
}

export default ComplianceChecker;

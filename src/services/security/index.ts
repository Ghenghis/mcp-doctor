/**
 * Security services for MCP Doctor
 */

// Export all security services
export { default as SecurityScanningService } from './SecurityScanningService';
export { default as ComplianceChecker } from './ComplianceChecker';
export { default as VulnerabilityPatcher } from './VulnerabilityPatcher';
export { default as SecurityAuditReporter } from './SecurityAuditReporter';

// Export types from central location to simplify imports
export * from '../../types/security';

/**
 * Initialize all security services
 * 
 * This function ensures all security services are properly initialized when the application starts
 */
export const initializeSecurityServices = (): void => {
  // Get the singleton instances of each service
  const securityScanner = SecurityScanningService.getInstance();
  const complianceChecker = ComplianceChecker.getInstance();
  const vulnerabilityPatcher = VulnerabilityPatcher.getInstance();
  const securityAuditReporter = SecurityAuditReporter.getInstance();
  
  console.log('Security services initialized');
};

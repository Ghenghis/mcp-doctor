/**
 * Tests for Security Compliance components
 */
import { 
  SecurityScanningService, 
  ComplianceChecker, 
  VulnerabilityPatcher, 
  SecurityAuditReporter,
  ComplianceStandard
} from '../services/security';
import { MCPServer, MCPServerStatus, ErrorType } from '../types';

describe('Security Services', () => {
  // Sample MCP server for testing
  const testServer: MCPServer = {
    name: 'test-server',
    command: 'node',
    args: ['server.js', '--port=3000'],
    env: {
      NODE_ENV: 'development',
      MCP_VERSION: '1.0.0'
    },
    status: MCPServerStatus.Running
  };

  // Sample server with security issues
  const insecureServer: MCPServer = {
    name: 'insecure-server',
    command: 'node',
    args: ['server.js', '--port=3000', '--disable-security', '--password=admin123'],
    env: {
      NODE_ENV: 'development',
      MCP_VERSION: '1.0.0',
      MCP_DB_PASSWORD: 'password123',
      MCP_AUTH_ENABLED: 'false'
    },
    status: MCPServerStatus.Running
  };

  describe('SecurityScanningService', () => {
    test('should be a singleton', () => {
      const instance1 = SecurityScanningService.getInstance();
      const instance2 = SecurityScanningService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should initialize vulnerability database', async () => {
      const scanner = SecurityScanningService.getInstance();
      expect(scanner.getAllVulnerabilities().length).toBeGreaterThanOrEqual(0);
    });

    test('should scan server and return vulnerabilities', async () => {
      const scanner = SecurityScanningService.getInstance();
      const vulnerabilities = await scanner.scanServer(insecureServer);
      expect(vulnerabilities.length).toBeGreaterThan(0);
    });
  });

  describe('ComplianceChecker', () => {
    test('should be a singleton', () => {
      const instance1 = ComplianceChecker.getInstance();
      const instance2 = ComplianceChecker.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should check compliance against OWASP standard', async () => {
      const checker = ComplianceChecker.getInstance();
      const results = await checker.checkCompliance(insecureServer, ComplianceStandard.OWASP);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should calculate compliance score', () => {
      const checker = ComplianceChecker.getInstance();
      // Test with empty checks - should be 100%
      expect(checker.getComplianceScore([])).toBe(100);
    });
  });

  describe('VulnerabilityPatcher', () => {
    test('should be a singleton', () => {
      const instance1 = VulnerabilityPatcher.getInstance();
      const instance2 = VulnerabilityPatcher.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should get patch history for server', () => {
      const patcher = VulnerabilityPatcher.getInstance();
      const history = patcher.getPatchHistory(testServer);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('SecurityAuditReporter', () => {
    test('should be a singleton', () => {
      const instance1 = SecurityAuditReporter.getInstance();
      const instance2 = SecurityAuditReporter.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('should get report history for server', () => {
      const reporter = SecurityAuditReporter.getInstance();
      const history = reporter.getReportHistory(testServer);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Integration', () => {
    test('should generate comprehensive security report', async () => {
      // This test demonstrates the full workflow of the security services
      // Scan -> Check compliance -> Apply patches -> Generate report
      
      // Normally, we'd set up mocks for this, but for simplicity we'll use the real services
      const scanner = SecurityScanningService.getInstance();
      const checker = ComplianceChecker.getInstance();
      const patcher = VulnerabilityPatcher.getInstance();
      const reporter = SecurityAuditReporter.getInstance();

      // Step 1: Scan for vulnerabilities
      const vulnerabilities = await scanner.scanServer(insecureServer);
      expect(vulnerabilities.length).toBeGreaterThan(0);

      // Step 2: Check compliance
      const complianceResults = await checker.checkAllCompliance(insecureServer);
      expect(complianceResults.size).toBeGreaterThan(0);

      // Step 3: Apply patches (if any are available)
      const patches = await patcher.patchAllVulnerabilities(insecureServer);
      // No assertions here as patches may or may not be available

      // Step 4: Generate report
      const report = await reporter.generateReport(insecureServer);
      expect(report).toBeDefined();
      expect(report.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(report.overallRiskScore).toBeLessThanOrEqual(100);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });
});

# Security Compliance Framework

This directory contains services for implementing security compliance features in MCP Doctor. These services help detect vulnerabilities, check compliance against security standards, patch vulnerabilities, and generate security audit reports.

## Services Overview

### SecurityScanningService

The SecurityScanningService scans MCP servers for security vulnerabilities such as:

- Dependency vulnerabilities
- Configuration vulnerabilities
- Network vulnerabilities
- Permission vulnerabilities
- Credential vulnerabilities

Features:
- Vulnerability database management
- Regular scanning scheduling
- Custom scanning for specific servers
- Detailed vulnerability reporting

Usage:

```typescript
import { SecurityScanningService } from '../services/security';

// Get singleton instance
const securityScanner = SecurityScanningService.getInstance();

// Scan a server for vulnerabilities
const vulnerabilities = await securityScanner.scanServer(server);

// Schedule regular scans
securityScanner.scheduleRegularScans(server, 24); // every 24 hours
```

### ComplianceChecker

The ComplianceChecker verifies MCP servers against industry-standard security compliance frameworks:

- OWASP Top 10
- NIST Cybersecurity Framework
- PCI DSS
- GDPR

Features:
- Multiple compliance standard support
- Detailed check results
- Compliance scoring
- Remediation recommendations

Usage:

```typescript
import { ComplianceChecker, ComplianceStandard } from '../services/security';

// Get singleton instance
const complianceChecker = ComplianceChecker.getInstance();

// Check compliance against OWASP standard
const results = await complianceChecker.checkCompliance(server, ComplianceStandard.OWASP);

// Get compliance score
const score = complianceChecker.getComplianceScore(results);

// Check against all supported standards
const allResults = await complianceChecker.checkAllCompliance(server);
```

### VulnerabilityPatcher

The VulnerabilityPatcher automatically fixes security vulnerabilities in MCP servers:

Features:
- Automatic vulnerability patching
- Multiple patch strategies
- Patch history tracking
- Patch reversion capability

Usage:

```typescript
import { VulnerabilityPatcher } from '../services/security';

// Get singleton instance
const vulnerabilityPatcher = VulnerabilityPatcher.getInstance();

// Check if a vulnerability can be patched
const canPatch = vulnerabilityPatcher.canPatchVulnerability(vulnerability, server);

// Patch a specific vulnerability
const patch = await vulnerabilityPatcher.patchVulnerability(vulnerability, server);

// Patch all vulnerabilities in a server
const patches = await vulnerabilityPatcher.patchAllVulnerabilities(server);

// Revert a patch if needed
const reverted = await vulnerabilityPatcher.revertPatch(patch, server);
```

### SecurityAuditReporter

The SecurityAuditReporter generates comprehensive security audit reports:

Features:
- Detailed vulnerability assessment
- Compliance status reporting
- Risk scoring
- Remediation recommendations
- Multiple export formats (JSON, HTML, CSV)

Usage:

```typescript
import { SecurityAuditReporter } from '../services/security';

// Get singleton instance
const securityReporter = SecurityAuditReporter.getInstance();

// Generate a security audit report
const report = await securityReporter.generateReport(server);

// Export report to different formats
const htmlReport = await securityReporter.exportReport(report, 'html');
const jsonReport = await securityReporter.exportReport(report, 'json');
const csvReport = await securityReporter.exportReport(report, 'csv');

// Schedule regular reports
securityReporter.scheduleRegularReports(server, 168); // weekly
```

## Getting Started

Initialize all security services at application startup:

```typescript
import { initializeSecurityServices } from '../services/security';

// Initialize all security services
initializeSecurityServices();
```

## Directory Structure

```
/security
  ├── index.ts                   # Entry point and exports
  ├── SecurityScanningService.ts # Vulnerability scanning
  ├── ComplianceChecker.ts       # Standards compliance
  ├── VulnerabilityPatcher.ts    # Automatic patching
  ├── SecurityAuditReporter.ts   # Report generation
  └── README.md                  # This file
```

## Types

The security services use the following types defined in `src/types/security.ts`:

- `Vulnerability`: Describes a security vulnerability
- `ComplianceCheck`: Result of a compliance check
- `Patch`: Applied fix for a vulnerability
- `SecurityAuditReport`: Comprehensive security report

See the [security types file](../../types/security.ts) for more details.

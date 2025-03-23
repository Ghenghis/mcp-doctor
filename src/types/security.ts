/**
 * Security-related types for MCP Doctor
 */

/**
 * Vulnerability severity levels
 */
export enum VulnerabilitySeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

/**
 * Vulnerability types
 */
export enum VulnerabilityType {
  DependencyVulnerability = 'dependency_vulnerability',
  ConfigurationVulnerability = 'configuration_vulnerability',
  CodeVulnerability = 'code_vulnerability',
  NetworkVulnerability = 'network_vulnerability',
  PermissionVulnerability = 'permission_vulnerability',
  CredentialVulnerability = 'credential_vulnerability',
}

/**
 * Vulnerability definition
 */
export interface Vulnerability {
  id: string;
  type: VulnerabilityType;
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
  affectedComponent: string;
  cve?: string;
  remediation?: string;
  patchAvailable: boolean;
  detectedAt: Date;
}

/**
 * Compliance standard
 */
export enum ComplianceStandard {
  OWASP = 'owasp',
  NIST = 'nist',
  PCI = 'pci',
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  SOC2 = 'soc2',
}

/**
 * Compliance control status
 */
export enum ComplianceStatus {
  Pass = 'pass',
  Fail = 'fail',
  Warning = 'warning',
  NotApplicable = 'not_applicable',
}

/**
 * Compliance check result
 */
export interface ComplianceCheck {
  id: string;
  standard: ComplianceStandard;
  control: string;
  description: string;
  status: ComplianceStatus;
  notes?: string;
  recommendations?: string;
  checkedAt: Date;
}

/**
 * Patch status
 */
export enum PatchStatus {
  Pending = 'pending',
  Applied = 'applied',
  Failed = 'failed',
  Reverted = 'reverted',
}

/**
 * Patch definition
 */
export interface Patch {
  id: string;
  vulnerabilityId: string;
  description: string;
  status: PatchStatus;
  appliedAt?: Date;
  revertable: boolean;
  changesMade: string[];
}

/**
 * Security audit report
 */
export interface SecurityAuditReport {
  id: string;
  generatedAt: Date;
  overallRiskScore: number; // 0-100, lower is better
  vulnerabilitiesBySeverity: {
    [key in VulnerabilitySeverity]: number;
  };
  complianceStatusByStandard: {
    [key in ComplianceStandard]?: {
      passedChecks: number;
      failedChecks: number;
      totalChecks: number;
      score: number; // 0-100, higher is better
    };
  };
  topVulnerabilities: Vulnerability[];
  recentPatches: Patch[];
  recommendations: string[];
}

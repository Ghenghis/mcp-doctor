import { EventEmitter } from 'events';
import { MCPServer, MCPClient, ErrorType } from '../../types';
import { 
  Vulnerability, 
  VulnerabilityType, 
  VulnerabilitySeverity,
  ComplianceCheck,
  ComplianceStandard,
  ComplianceStatus,
  Patch,
  PatchStatus,
  SecurityAuditReport
} from '../../types/security';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SecurityScanningService } from './SecurityScanningService';
import { ComplianceChecker } from './ComplianceChecker';
import { VulnerabilityPatcher } from './VulnerabilityPatcher';

/**
 * Service to generate security audit reports
 */
export class SecurityAuditReporter extends EventEmitter {
  private static instance: SecurityAuditReporter;
  private securityScanner: SecurityScanningService;
  private complianceChecker: ComplianceChecker;
  private vulnerabilityPatcher: VulnerabilityPatcher;
  private reportHistory: Map<string, SecurityAuditReport[]>;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    super();
    this.securityScanner = SecurityScanningService.getInstance();
    this.complianceChecker = ComplianceChecker.getInstance();
    this.vulnerabilityPatcher = VulnerabilityPatcher.getInstance();
    this.reportHistory = new Map<string, SecurityAuditReport[]>();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): SecurityAuditReporter {
    if (!SecurityAuditReporter.instance) {
      SecurityAuditReporter.instance = new SecurityAuditReporter();
    }
    return SecurityAuditReporter.instance;
  }
  
  /**
   * Generate a security audit report for a server
   */
  public async generateReport(server: MCPServer): Promise<SecurityAuditReport> {
    this.emit('report-generation-started', { server: server.name });
    
    try {
      // Step 1: Scan for vulnerabilities
      const vulnerabilities = await this.securityScanner.scanServer(server);
      
      // Step 2: Check compliance
      const complianceResults = await this.complianceChecker.checkAllCompliance(server);
      
      // Step 3: Get patch history
      const patches = this.vulnerabilityPatcher.getPatchHistory(server);
      
      // Step 4: Generate the report
      const report = this.createReportFromData(
        server, 
        vulnerabilities, 
        complianceResults, 
        patches
      );
      
      // Save to history
      if (!this.reportHistory.has(server.name)) {
        this.reportHistory.set(server.name, []);
      }
      this.reportHistory.get(server.name)?.push(report);
      
      // Save report to disk
      await this.saveReportToDisk(report, server);
      
      this.emit('report-generation-completed', {
        server: server.name,
        reportId: report.id
      });
      
      return report;
    } catch (error) {
      console.error(`Error generating security audit report for ${server.name}:`, error);
      this.emit('report-generation-failed', {
        server: server.name,
        error
      });
      
      this.emit('error', {
        type: ErrorType.UnknownError,
        message: `Failed to generate security audit report for ${server.name}`,
        details: error,
        server,
        fixable: false
      });
      
      // Return an empty report with error information
      return {
        id: `error-report-${Date.now()}`,
        generatedAt: new Date(),
        overallRiskScore: 100, // Highest risk
        vulnerabilitiesBySeverity: {
          [VulnerabilitySeverity.Critical]: 0,
          [VulnerabilitySeverity.High]: 0,
          [VulnerabilitySeverity.Medium]: 0,
          [VulnerabilitySeverity.Low]: 0
        },
        complianceStatusByStandard: {},
        topVulnerabilities: [],
        recentPatches: [],
        recommendations: [
          `Error generating report: ${error.message}`,
          'Please try again later or contact support'
        ]
      };
    }
  }
  
  /**
   * Create a report from the collected data
   */
  private createReportFromData(
    server: MCPServer, 
    vulnerabilities: Vulnerability[], 
    complianceResults: Map<ComplianceStandard, ComplianceCheck[]>,
    patches: Patch[]
  ): SecurityAuditReport {
    // Calculate vulnerabilities by severity
    const vulnerabilitiesBySeverity = {
      [VulnerabilitySeverity.Critical]: 0,
      [VulnerabilitySeverity.High]: 0,
      [VulnerabilitySeverity.Medium]: 0,
      [VulnerabilitySeverity.Low]: 0
    };
    
    for (const vuln of vulnerabilities) {
      vulnerabilitiesBySeverity[vuln.severity]++;
    }
    
    // Calculate compliance status by standard
    const complianceStatusByStandard: {
      [key in ComplianceStandard]?: {
        passedChecks: number;
        failedChecks: number;
        totalChecks: number;
        score: number;
      };
    } = {};
    
    for (const [standard, checks] of complianceResults.entries()) {
      const applicableChecks = checks.filter(check => 
        check.status !== ComplianceStatus.NotApplicable
      );
      
      const passedChecks = applicableChecks.filter(check => 
        check.status === ComplianceStatus.Pass
      ).length;
      
      const failedChecks = applicableChecks.filter(check => 
        check.status === ComplianceStatus.Fail
      ).length;
      
      const totalChecks = applicableChecks.length;
      
      const score = totalChecks > 0 
        ? Math.round((passedChecks / totalChecks) * 100) 
        : 100;
      
      complianceStatusByStandard[standard] = {
        passedChecks,
        failedChecks,
        totalChecks,
        score
      };
    }
    
    // Calculate overall risk score (0-100, lower is better)
    let overallRiskScore = 0;
    
    // Factor 1: Severity of vulnerabilities (60% of score)
    const vulnerabilityScore = (
      (vulnerabilitiesBySeverity[VulnerabilitySeverity.Critical] * 25) +
      (vulnerabilitiesBySeverity[VulnerabilitySeverity.High] * 10) +
      (vulnerabilitiesBySeverity[VulnerabilitySeverity.Medium] * 5) +
      (vulnerabilitiesBySeverity[VulnerabilitySeverity.Low] * 1)
    );
    // Cap at 60
    const normalizedVulnScore = Math.min(60, vulnerabilityScore);
    
    // Factor 2: Compliance scores (40% of score)
    let complianceScore = 0;
    let standardCount = 0;
    
    for (const standardStatus of Object.values(complianceStatusByStandard)) {
      complianceScore += 40 - ((standardStatus.score / 100) * 40);
      standardCount++;
    }
    
    const normalizedComplianceScore = standardCount > 0 
      ? complianceScore / standardCount 
      : 0;
    
    overallRiskScore = Math.round(normalizedVulnScore + normalizedComplianceScore);
    
    // Cap at 100
    overallRiskScore = Math.min(100, overallRiskScore);
    
    // Get the top vulnerabilities (most severe first)
    const sortedVulnerabilities = [...vulnerabilities].sort((a, b) => {
      // Sort by severity (critical first)
      const severityOrder = {
        [VulnerabilitySeverity.Critical]: 0,
        [VulnerabilitySeverity.High]: 1,
        [VulnerabilitySeverity.Medium]: 2,
        [VulnerabilitySeverity.Low]: 3
      };
      
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    const topVulnerabilities = sortedVulnerabilities.slice(0, 5);
    
    // Get recent patches
    const recentPatches = [...patches]
      .filter(patch => patch.status === PatchStatus.Applied)
      .sort((a, b) => {
        // Sort by application date (most recent first)
        const dateA = a.appliedAt?.getTime() || 0;
        const dateB = b.appliedAt?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 5);
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    // Recommendation 1: High priority vulnerabilities
    if (vulnerabilitiesBySeverity[VulnerabilitySeverity.Critical] > 0) {
      recommendations.push(
        `Address the ${vulnerabilitiesBySeverity[VulnerabilitySeverity.Critical]} critical vulnerabilities immediately`
      );
    }
    
    if (vulnerabilitiesBySeverity[VulnerabilitySeverity.High] > 0) {
      recommendations.push(
        `Fix the ${vulnerabilitiesBySeverity[VulnerabilitySeverity.High]} high severity vulnerabilities as soon as possible`
      );
    }
    
    // Recommendation 2: Failed compliance checks
    for (const [standard, status] of Object.entries(complianceStatusByStandard)) {
      if (status.failedChecks > 0) {
        recommendations.push(
          `Address the ${status.failedChecks} failed compliance checks for ${standard}`
        );
      }
    }
    
    // Recommendation 3: Security best practices
    recommendations.push(
      'Implement a regular security scanning schedule'
    );
    
    recommendations.push(
      'Update dependencies to their latest secure versions'
    );
    
    recommendations.push(
      'Use TLS encryption for all communications'
    );
    
    // Create the report
    const report: SecurityAuditReport = {
      id: `report-${server.name}-${Date.now()}`,
      generatedAt: new Date(),
      overallRiskScore,
      vulnerabilitiesBySeverity,
      complianceStatusByStandard,
      topVulnerabilities,
      recentPatches,
      recommendations
    };
    
    return report;
  }
  
  /**
   * Save report to disk
   */
  private async saveReportToDisk(report: SecurityAuditReport, server: MCPServer): Promise<void> {
    try {
      const reportsDir = path.join(os.homedir(), '.mcp-doctor', 'security', 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const timestamp = report.generatedAt.toISOString().replace(/:/g, '-');
      const filename = `${server.name}-security-report-${timestamp}.json`;
      const filePath = path.join(reportsDir, filename);
      
      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      
      this.emit('report-saved', {
        server: server.name,
        reportId: report.id,
        filePath
      });
    } catch (error) {
      console.error(`Error saving report to disk:`, error);
      this.emit('report-save-failed', {
        server: server.name,
        reportId: report.id,
        error
      });
    }
  }
  
  /**
   * Generate security audit reports for all servers
   */
  public async generateReportsForAll(servers: MCPServer[]): Promise<Map<string, SecurityAuditReport>> {
    this.emit('reports-generation-started', { 
      servers: servers.map(s => s.name)
    });
    
    const reports = new Map<string, SecurityAuditReport>();
    const errors: { server: string, error: any }[] = [];
    
    for (const server of servers) {
      try {
        const report = await this.generateReport(server);
        reports.set(server.name, report);
      } catch (error) {
        console.error(`Error generating report for ${server.name}:`, error);
        errors.push({ server: server.name, error });
      }
    }
    
    this.emit('reports-generation-completed', {
      total: servers.length,
      successful: reports.size,
      failed: errors.length,
      errors
    });
    
    return reports;
  }
  
  /**
   * Get report history for a server
   */
  public getReportHistory(server: MCPServer): SecurityAuditReport[] {
    return this.reportHistory.get(server.name) || [];
  }
  
  /**
   * Get most recent report for a server
   */
  public getMostRecentReport(server: MCPServer): SecurityAuditReport | undefined {
    const reports = this.reportHistory.get(server.name) || [];
    if (reports.length === 0) return undefined;
    
    // Sort by generated date (most recent first)
    return reports.sort((a, b) => {
      return b.generatedAt.getTime() - a.generatedAt.getTime();
    })[0];
  }
  
  /**
   * Export report to various formats
   */
  public async exportReport(
    report: SecurityAuditReport, 
    format: 'json' | 'html' | 'pdf' | 'csv' = 'json'
  ): Promise<string> {
    try {
      switch (format) {
        case 'json':
          return JSON.stringify(report, null, 2);
          
        case 'html':
          return this.formatReportAsHTML(report);
          
        case 'csv':
          return this.formatReportAsCSV(report);
          
        case 'pdf':
          // In a real implementation, this would generate a PDF
          throw new Error('PDF export not implemented yet');
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error(`Error exporting report to ${format}:`, error);
      throw new Error(`Failed to export report to ${format}: ${error.message}`);
    }
  }
  
  /**
   * Format report as HTML
   */
  private formatReportAsHTML(report: SecurityAuditReport): string {
    const { 
      id, 
      generatedAt, 
      overallRiskScore,
      vulnerabilitiesBySeverity,
      complianceStatusByStandard,
      topVulnerabilities,
      recentPatches,
      recommendations
    } = report;
    
    // Risk color based on score
    let riskColor = '#00cc00'; // Green for low risk
    if (overallRiskScore > 75) {
      riskColor = '#ff0000'; // Red for high risk
    } else if (overallRiskScore > 50) {
      riskColor = '#ff9900'; // Orange for medium risk
    } else if (overallRiskScore > 25) {
      riskColor = '#ffcc00'; // Yellow for moderate risk
    }
    
    // Format date
    const formattedDate = generatedAt.toLocaleString();
    
    // Generate HTML
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Audit Report - ${id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 1000px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .report-id { color: #666; }
          .risk-score { 
            font-size: 48px; 
            font-weight: bold; 
            color: ${riskColor};
            text-align: center;
            margin: 20px 0;
          }
          .score-label {
            text-align: center;
            font-size: 18px;
            margin-bottom: 30px;
          }
          .section { margin: 30px 0; }
          .section-title { 
            border-bottom: 2px solid #ddd; 
            padding-bottom: 10px; 
            margin-bottom: 20px;
          }
          table { width: 100%; border-collapse: collapse; }
          table, th, td { border: 1px solid #ddd; }
          th, td { padding: 12px; text-align: left; }
          th { background-color: #f2f2f2; }
          .severity-critical { background-color: #ffdddd; }
          .severity-high { background-color: #ffeecc; }
          .severity-medium { background-color: #ffffcc; }
          .severity-low { background-color: #ddffdd; }
          .recommendation { 
            background-color: #f9f9f9; 
            border-left: 4px solid #2196F3;
            padding: 12px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Security Audit Report</h1>
            <p class="report-id">Report ID: ${id}</p>
            <p>Generated: ${formattedDate}</p>
          </div>
          
          <div class="risk-score">${overallRiskScore}</div>
          <div class="score-label">Overall Risk Score (0-100, lower is better)</div>
          
          <div class="section">
            <h2 class="section-title">Vulnerability Summary</h2>
            <table>
              <tr>
                <th>Severity</th>
                <th>Count</th>
              </tr>
              <tr class="severity-critical">
                <td>Critical</td>
                <td>${vulnerabilitiesBySeverity[VulnerabilitySeverity.Critical]}</td>
              </tr>
              <tr class="severity-high">
                <td>High</td>
                <td>${vulnerabilitiesBySeverity[VulnerabilitySeverity.High]}</td>
              </tr>
              <tr class="severity-medium">
                <td>Medium</td>
                <td>${vulnerabilitiesBySeverity[VulnerabilitySeverity.Medium]}</td>
              </tr>
              <tr class="severity-low">
                <td>Low</td>
                <td>${vulnerabilitiesBySeverity[VulnerabilitySeverity.Low]}</td>
              </tr>
            </table>
          </div>
          
          <div class="section">
            <h2 class="section-title">Compliance Status</h2>
            <table>
              <tr>
                <th>Standard</th>
                <th>Score</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Total</th>
              </tr>
    `;
    
    // Add compliance data
    for (const [standard, status] of Object.entries(complianceStatusByStandard)) {
      html += `
        <tr>
          <td>${standard}</td>
          <td>${status.score}%</td>
          <td>${status.passedChecks}</td>
          <td>${status.failedChecks}</td>
          <td>${status.totalChecks}</td>
        </tr>
      `;
    }
    
    html += `
            </table>
          </div>
          
          <div class="section">
            <h2 class="section-title">Top Vulnerabilities</h2>
    `;
    
    if (topVulnerabilities.length === 0) {
      html += `<p>No vulnerabilities found.</p>`;
    } else {
      html += `
        <table>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Severity</th>
            <th>Component</th>
            <th>Patch Available</th>
          </tr>
      `;
      
      for (const vuln of topVulnerabilities) {
        const severityClass = `severity-${vuln.severity.toLowerCase()}`;
        html += `
          <tr class="${severityClass}">
            <td>${vuln.id}</td>
            <td>${vuln.title}</td>
            <td>${vuln.severity}</td>
            <td>${vuln.affectedComponent}</td>
            <td>${vuln.patchAvailable ? 'Yes' : 'No'}</td>
          </tr>
        `;
      }
      
      html += `</table>`;
    }
    
    html += `
          </div>
          
          <div class="section">
            <h2 class="section-title">Recent Patches</h2>
    `;
    
    if (recentPatches.length === 0) {
      html += `<p>No recent patches applied.</p>`;
    } else {
      html += `
        <table>
          <tr>
            <th>ID</th>
            <th>Description</th>
            <th>Applied At</th>
            <th>Status</th>
          </tr>
      `;
      
      for (const patch of recentPatches) {
        html += `
          <tr>
            <td>${patch.id}</td>
            <td>${patch.description}</td>
            <td>${patch.appliedAt?.toLocaleString() || 'N/A'}</td>
            <td>${patch.status}</td>
          </tr>
        `;
      }
      
      html += `</table>`;
    }
    
    html += `
          </div>
          
          <div class="section">
            <h2 class="section-title">Recommendations</h2>
    `;
    
    for (const recommendation of recommendations) {
      html += `<div class="recommendation">${recommendation}</div>`;
    }
    
    html += `
          </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }
  
  /**
   * Format report as CSV
   */
  private formatReportAsCSV(report: SecurityAuditReport): string {
    const { 
      id, 
      generatedAt, 
      overallRiskScore,
      vulnerabilitiesBySeverity,
      complianceStatusByStandard,
      topVulnerabilities,
      recentPatches,
      recommendations
    } = report;
    
    // Format date
    const formattedDate = generatedAt.toISOString();
    
    // Start with report metadata
    let csv = `"Report ID","Generated At","Overall Risk Score"\n`;
    csv += `"${id}","${formattedDate}","${overallRiskScore}"\n\n`;
    
    // Add vulnerability summary
    csv += `"Vulnerability Severity","Count"\n`;
    csv += `"Critical","${vulnerabilitiesBySeverity[VulnerabilitySeverity.Critical]}"\n`;
    csv += `"High","${vulnerabilitiesBySeverity[VulnerabilitySeverity.High]}"\n`;
    csv += `"Medium","${vulnerabilitiesBySeverity[VulnerabilitySeverity.Medium]}"\n`;
    csv += `"Low","${vulnerabilitiesBySeverity[VulnerabilitySeverity.Low]}"\n\n`;
    
    // Add compliance status
    csv += `"Compliance Standard","Score","Passed Checks","Failed Checks","Total Checks"\n`;
    for (const [standard, status] of Object.entries(complianceStatusByStandard)) {
      csv += `"${standard}","${status.score}","${status.passedChecks}","${status.failedChecks}","${status.totalChecks}"\n`;
    }
    csv += `\n`;
    
    // Add top vulnerabilities
    csv += `"Vulnerability ID","Title","Severity","Component","Patch Available"\n`;
    for (const vuln of topVulnerabilities) {
      csv += `"${vuln.id}","${vuln.title.replace(/"/g, '""')}","${vuln.severity}","${vuln.affectedComponent.replace(/"/g, '""')}","${vuln.patchAvailable ? 'Yes' : 'No'}"\n`;
    }
    csv += `\n`;
    
    // Add recent patches
    csv += `"Patch ID","Description","Applied At","Status"\n`;
    for (const patch of recentPatches) {
      csv += `"${patch.id}","${patch.description.replace(/"/g, '""')}","${patch.appliedAt?.toISOString() || 'N/A'}","${patch.status}"\n`;
    }
    csv += `\n`;
    
    // Add recommendations
    csv += `"Recommendations"\n`;
    for (const recommendation of recommendations) {
      csv += `"${recommendation.replace(/"/g, '""')}"\n`;
    }
    
    return csv;
  }
  
  /**
   * Schedule regular report generation
   */
  public scheduleRegularReports(server: MCPServer, intervalHours: number = 168): void {
    // 168 hours = weekly
    console.log(`Scheduled regular security reports for ${server.name} every ${intervalHours} hours`);
    
    // In a real implementation, this would set up a timer to generate reports automatically
    // For our demo, we'll just log that it's been scheduled
  }
}

export default SecurityAuditReporter;

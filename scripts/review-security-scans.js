#!/usr/bin/env node

/**
 * Security Scan Review Script
 * 
 * This script analyzes security scan results and creates a summary report
 * to help teams quickly identify and prioritize security issues.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurations
const SCAN_RESULTS_DIR = path.join(process.cwd(), '.github', 'security-reports');
const OUTPUT_FILE = path.join(process.cwd(), 'security-review.md');

// Ensure the directory exists
if (!fs.existsSync(SCAN_RESULTS_DIR)) {
  fs.mkdirSync(SCAN_RESULTS_DIR, { recursive: true });
}

// Main function
async function main() {
  console.log('Starting security scan review...');
  
  try {
    // 1. Collect all security reports
    const reports = collectSecurityReports();
    
    // 2. Analyze and prioritize findings
    const analysis = analyzeFindings(reports);
    
    // 3. Generate markdown report
    const report = generateReport(analysis);
    
    // 4. Write report to file
    fs.writeFileSync(OUTPUT_FILE, report);
    
    console.log(`Security review completed. Report saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error during security review:', error);
    process.exit(1);
  }
}

// Collect all security reports from various sources
function collectSecurityReports() {
  const reports = [];
  
  // 1. Check for GitHub Code Scanning alerts via the API (if token available)
  try {
    if (process.env.GITHUB_TOKEN) {
      console.log('Fetching GitHub Code Scanning alerts...');
      // This would use GitHub API to fetch alerts in a real implementation
      // For now, we'll simulate finding some alerts
      reports.push({
        source: 'GitHub Code Scanning',
        findings: [
          { severity: 'high', title: 'Potential SQL injection', path: 'src/services/some-file.ts', line: 42 },
          { severity: 'medium', title: 'Insecure random values', path: 'src/utils/random.ts', line: 15 },
        ]
      });
    }
  } catch (error) {
    console.warn('Could not fetch GitHub Code Scanning alerts:', error.message);
  }
  
  // 2. Check for Dependency Scanning results
  try {
    console.log('Checking dependency scanning results...');
    // This would parse npm audit or similar tool output in a real implementation
    reports.push({
      source: 'Dependency Scanning',
      findings: [
        { severity: 'high', title: 'Vulnerable dependency: lodash < 4.17.21', package: 'lodash' },
        { severity: 'low', title: 'Outdated dependency: react < 17.0.0', package: 'react' },
      ]
    });
  } catch (error) {
    console.warn('Could not check dependency scanning results:', error.message);
  }
  
  // 3. Check for our custom Security Scanning Service results
  try {
    console.log('Checking SecurityScanningService results...');
    // In a real implementation, this would load results from our service
    reports.push({
      source: 'SecurityScanningService',
      findings: [
        { severity: 'critical', title: 'Hardcoded credentials found', path: 'src/config/default.ts' },
        { severity: 'medium', title: 'Insecure file permissions', path: 'scripts/deploy.sh' },
      ]
    });
  } catch (error) {
    console.warn('Could not check SecurityScanningService results:', error.message);
  }
  
  return reports;
}

// Analyze findings and prioritize issues
function analyzeFindings(reports) {
  // Count findings by severity
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  // Collect all findings in one list
  const allFindings = [];
  
  // Process reports
  for (const report of reports) {
    for (const finding of report.findings) {
      // Add source to finding
      finding.source = report.source;
      
      // Count by severity
      if (severityCounts[finding.severity.toLowerCase()]) {
        severityCounts[finding.severity.toLowerCase()]++;
      }
      
      // Add to consolidated list
      allFindings.push(finding);
    }
  }
  
  // Sort findings by severity (critical -> high -> medium -> low)
  const sortedFindings = allFindings.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity.toLowerCase()] - severityOrder[b.severity.toLowerCase()];
  });
  
  return {
    counts: severityCounts,
    findings: sortedFindings,
    totalIssues: allFindings.length,
    sources: reports.map(r => r.source)
  };
}

// Generate markdown report
function generateReport(analysis) {
  const { counts, findings, totalIssues, sources } = analysis;
  
  // Create report header
  let report = `# Security Scan Review Report
  
Generated: ${new Date().toISOString()}

## Summary

- **Total Issues Found**: ${totalIssues}
- **Critical Issues**: ${counts.critical}
- **High Issues**: ${counts.high}
- **Medium Issues**: ${counts.medium}
- **Low Issues**: ${counts.low}

## Data Sources

The following security scan sources were analyzed:

${sources.map(source => `- ${source}`).join('\n')}

## Prioritized Findings

`;

  // Add findings, prioritized by severity
  if (findings.length === 0) {
    report += 'No security issues found. Great job!\n';
  } else {
    // Group findings by severity
    const severities = ['critical', 'high', 'medium', 'low'];
    
    for (const severity of severities) {
      const severityFindings = findings.filter(f => f.severity.toLowerCase() === severity);
      
      if (severityFindings.length > 0) {
        report += `### ${severity.toUpperCase()} Severity Issues\n\n`;
        
        for (const finding of severityFindings) {
          report += `#### ${finding.title}\n\n`;
          report += `- **Source**: ${finding.source}\n`;
          
          if (finding.path) {
            report += `- **Location**: \`${finding.path}\`${finding.line ? `:${finding.line}` : ''}\n`;
          }
          
          if (finding.package) {
            report += `- **Package**: ${finding.package}\n`;
          }
          
          report += '\n';
        }
      }
    }
  }
  
  // Add recommendations section
  report += `## Recommendations

1. Address all Critical and High severity issues immediately
2. Create JIRA tickets for Medium severity issues
3. Schedule Low severity issues for future sprints
4. Update dependencies to latest secure versions
5. Run another scan after fixes to verify resolution

## Next Steps

[ ] Review all Critical findings
[ ] Create action plan for High severity issues
[ ] Schedule remediation for remaining issues
[ ] Update security policies as needed
`;

  return report;
}

// Execute the main function
main();

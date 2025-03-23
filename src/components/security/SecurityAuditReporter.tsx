import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CircularProgress, 
  Divider, 
  FormControl, 
  Grid, 
  IconButton, 
  InputLabel, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  MenuItem, 
  Paper, 
  Select, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Tabs, 
  Tab, 
  Tooltip, 
  Typography 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';

// Import from our security services
import { 
  securityScanningService, 
  ScanResult, 
  Vulnerability, 
  VulnerabilitySeverity, 
  ScanTarget 
} from '../../services/security/SecurityScanningService';
import { 
  complianceChecker, 
  ComplianceAssessment, 
  ComplianceCheckResult, 
  ComplianceStandard 
} from '../../services/security/ComplianceChecker';

// Styled components for neon wireframe appearance
const NeonCard = styled(Card)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  borderRadius: 8,
  border: '1px solid #00FFFF',
  boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
  height: '100%',
  display: 'flex',
  flexDirection: 'column'
}));

const NeonCardHeader = styled(CardHeader)(({ theme }) => ({
  color: '#00FFFF',
  borderBottom: '1px solid rgba(0, 255, 255, 0.3)'
}));

const NeonButton = styled(Button)(({ theme }) => ({
  color: '#00FFFF',
  borderColor: '#00FFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  '&:hover': {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderColor: '#00FFFF',
    boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
  }
}));

// Tabs interface definition
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`security-tabpanel-${index}`}
      aria-labelledby={`security-tab-${index}`}
      {...other}
      style={{ height: 'calc(100% - 49px)', overflow: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 1, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `security-tab-${index}`,
    'aria-controls': `security-tabpanel-${index}`,
  };
};

/**
 * Severity color mapping
 */
const getSeverityColor = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return '#FF0055';
    case 'high':
      return '#FF5500';
    case 'medium':
      return '#FFAA00';
    case 'low':
      return '#AAFF00';
    default:
      return '#AAAAAA';
  }
};

/**
 * Status color mapping
 */
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'compliant':
      return '#00FF55';
    case 'partiallycompliant':
      return '#FFAA00';
    case 'noncompliant':
      return '#FF0055';
    case 'notapplicable':
      return '#AAAAAA';
    default:
      return '#FFFFFF';
  }
};

/**
 * Status icon mapping
 */
const getStatusIcon = (status: string): React.ReactNode => {
  switch (status.toLowerCase()) {
    case 'compliant':
      return <CheckCircleIcon sx={{ color: '#00FF55' }} />;
    case 'partiallycompliant':
      return <WarningIcon sx={{ color: '#FFAA00' }} />;
    case 'noncompliant':
      return <ErrorIcon sx={{ color: '#FF0055' }} />;
    case 'notapplicable':
      return <InfoIcon sx={{ color: '#AAAAAA' }} />;
    default:
      return <InfoIcon sx={{ color: '#FFFFFF' }} />;
  }
};

/**
 * SecurityAuditReporter component for generating and viewing security audit reports
 */
const SecurityAuditReporter: React.FC = () => {
  // State for selected tab
  const [tabValue, setTabValue] = useState(0);
  
  // State for loading status
  const [isLoading, setIsLoading] = useState(false);
  
  // State for scan targets
  const [scanTargets, setScanTargets] = useState<ScanTarget[]>([]);
  
  // State for selected target
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  
  // State for scan results
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  
  // State for compliance standards
  const [complianceStandards, setComplianceStandards] = useState<ComplianceStandard[]>([]);
  
  // State for selected standard
  const [selectedStandardId, setSelectedStandardId] = useState<string>('');
  
  // State for compliance assessments
  const [complianceAssessments, setComplianceAssessments] = useState<ComplianceAssessment[]>([]);
  
  // State for selected assessment
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Initialize services if needed
        if (!securityScanningService['isInitialized']) {
          await securityScanningService.initialize();
        }
        
        if (!complianceChecker['isInitialized']) {
          await complianceChecker.initialize();
        }
        
        // Load scan targets
        const targets = securityScanningService.getAllScanTargets();
        setScanTargets(targets);
        
        if (targets.length > 0) {
          setSelectedTargetId(targets[0].id);
        }
        
        // Load scan results
        const results = securityScanningService.getAllScanResults();
        setScanResults(results);
        
        // Load compliance standards
        const standards = complianceChecker.getAllComplianceStandards();
        setComplianceStandards(standards);
        
        if (standards.length > 0) {
          setSelectedStandardId(standards[0].id);
        }
        
        // Load compliance assessments
        const assessments = complianceChecker.getAllComplianceAssessments();
        setComplianceAssessments(assessments);
        
        if (assessments.length > 0) {
          setSelectedAssessmentId(assessments[0].id);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load security data:', error);
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Add mock data for demonstration if none exists
    if (scanTargets.length === 0) {
      addMockData();
    }
  }, []);
  
  // Add mock data for demonstration
  const addMockData = async () => {
    // Add mock scan targets
    const targetIds = [];
    
    targetIds.push(securityScanningService.addScanTarget({
      name: 'Primary MCP Server',
      type: 'server',
      path: '/var/lib/mcp/server1'
    }));
    
    targetIds.push(securityScanningService.addScanTarget({
      name: 'Secondary MCP Server',
      type: 'server',
      path: '/var/lib/mcp/server2'
    }));
    
    targetIds.push(securityScanningService.addScanTarget({
      name: 'MCP Container',
      type: 'container',
      path: 'docker://mcp-container'
    }));
    
    // Set the targets
    const targets = securityScanningService.getAllScanTargets();
    setScanTargets(targets);
    setSelectedTargetId(targets[0].id);
    
    // Start mock scans
    for (const targetId of targetIds) {
      try {
        await securityScanningService.startScan(targetId);
      } catch (error) {
        console.error(`Failed to start scan for target ${targetId}:`, error);
      }
    }
    
    // Wait for scans to complete
    setTimeout(() => {
      // Update scan results
      const results = securityScanningService.getAllScanResults();
      setScanResults(results);
      
      // Perform mock compliance assessments
      const target = securityScanningService.getScanTarget(targetIds[0]);
      
      if (target) {
        for (const standard of complianceStandards) {
          try {
            complianceChecker.assessCompliance(
              standard.id,
              targetIds[0],
              target.name,
              {
                https: { enabled: true },
                authentication: { method: 'oauth2', mfa: true, passwordMinLength: 12 },
                logging: { level: 'info', events: ['access', 'error'] },
                network: {
                  firewall: {
                    enabled: true,
                    defaultDeny: true,
                    rules: [{ action: 'allow', source: '192.168.1.0/24' }]
                  }
                },
                data: { encryption: true, panMasking: true },
                updates: { autoUpdate: true, lastUpdateTime: Date.now() - 7 * 24 * 60 * 60 * 1000 }
              }
            );
          } catch (error) {
            console.error(`Failed to assess compliance for standard ${standard.id}:`, error);
          }
        }
        
        // Update compliance assessments
        const assessments = complianceChecker.getAllComplianceAssessments();
        setComplianceAssessments(assessments);
        
        if (assessments.length > 0) {
          setSelectedAssessmentId(assessments[0].id);
        }
      }
    }, 2000);
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle target change
  const handleTargetChange = (event: any) => {
    setSelectedTargetId(event.target.value);
  };
  
  // Handle standard change
  const handleStandardChange = (event: any) => {
    setSelectedStandardId(event.target.value);
  };
  
  // Handle assessment change
  const handleAssessmentChange = (event: any) => {
    setSelectedAssessmentId(event.target.value);
  };
  
  // Get vulnerabilities for the selected target
  const getVulnerabilitiesForTarget = (): Vulnerability[] => {
    if (!selectedTargetId) return [];
    
    const targetResults = scanResults.filter(result => result.targetId === selectedTargetId);
    
    if (targetResults.length === 0) return [];
    
    return targetResults.flatMap(result => result.vulnerabilities);
  };
  
  // Get assessments for the selected target
  const getAssessmentsForTarget = (): ComplianceAssessment[] => {
    if (!selectedTargetId) return [];
    
    return complianceAssessments.filter(assessment => assessment.targetId === selectedTargetId);
  };
  
  // Get the latest assessment for the selected target and standard
  const getLatestAssessment = (): ComplianceAssessment | undefined => {
    if (!selectedTargetId || !selectedStandardId) return undefined;
    
    return complianceChecker.getLatestComplianceAssessmentForTarget(
      selectedTargetId,
      selectedStandardId
    );
  };
  
  // Get the selected assessment
  const getSelectedAssessment = (): ComplianceAssessment | undefined => {
    if (!selectedAssessmentId) return undefined;
    
    return complianceAssessments.find(assessment => assessment.id === selectedAssessmentId);
  };
  
  // Start a new scan
  const handleStartScan = async () => {
    if (!selectedTargetId) return;
    
    setIsLoading(true);
    
    try {
      await securityScanningService.startScan(selectedTargetId);
      
      // Wait for the scan to complete (simplified for demonstration)
      setTimeout(() => {
        const results = securityScanningService.getAllScanResults();
        setScanResults(results);
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to start scan:', error);
      setIsLoading(false);
    }
  };
  
  // Perform a compliance assessment
  const handleAssessCompliance = async () => {
    if (!selectedTargetId || !selectedStandardId) return;
    
    setIsLoading(true);
    
    try {
      const target = securityScanningService.getScanTarget(selectedTargetId);
      
      if (!target) {
        throw new Error(`Target with ID ${selectedTargetId} not found.`);
      }
      
      // In a real implementation, we would get the actual server configuration
      // For demonstration, we'll use mock data
      const mockServerConfig = {
        https: { enabled: Math.random() > 0.3 },
        authentication: {
          method: Math.random() > 0.5 ? 'oauth2' : 'basic',
          mfa: Math.random() > 0.4,
          passwordMinLength: Math.floor(Math.random() * 16) + 6
        },
        logging: {
          level: ['minimal', 'info', 'debug'][Math.floor(Math.random() * 3)],
          events: ['access', 'error', 'audit'].filter(() => Math.random() > 0.3)
        },
        network: {
          firewall: {
            enabled: Math.random() > 0.2,
            defaultDeny: Math.random() > 0.4,
            rules: [{ action: 'allow', source: '192.168.1.0/24' }]
          }
        },
        data: {
          encryption: Math.random() > 0.3,
          panMasking: Math.random() > 0.3
        },
        updates: {
          autoUpdate: Math.random() > 0.5,
          lastUpdateTime: Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000
        }
      };
      
      const assessment = await complianceChecker.assessCompliance(
        selectedStandardId,
        selectedTargetId,
        target.name,
        mockServerConfig
      );
      
      // Update assessments list
      const assessments = complianceChecker.getAllComplianceAssessments();
      setComplianceAssessments(assessments);
      setSelectedAssessmentId(assessment.id);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to assess compliance:', error);
      setIsLoading(false);
    }
  };
  
  // Generate and download a report
  const handleGenerateReport = () => {
    // In a real implementation, this would generate a PDF or HTML report
    // For demonstration, we'll just show how this would work
    
    if (!selectedTargetId) return;
    
    const target = scanTargets.find(t => t.id === selectedTargetId);
    
    if (!target) return;
    
    const vulnerabilities = getVulnerabilitiesForTarget();
    const assessments = getAssessmentsForTarget();
    
    // Create a simple report in JSON format
    const report = {
      title: `Security Audit Report for ${target.name}`,
      generatedAt: new Date().toISOString(),
      target: {
        id: target.id,
        name: target.name,
        type: target.type,
        path: target.path
      },
      vulnerabilities: {
        total: vulnerabilities.length,
        bySeverity: {
          critical: vulnerabilities.filter(v => v.severity === 'critical').length,
          high: vulnerabilities.filter(v => v.severity === 'high').length,
          medium: vulnerabilities.filter(v => v.severity === 'medium').length,
          low: vulnerabilities.filter(v => v.severity === 'low').length
        },
        items: vulnerabilities.map(v => ({
          id: v.id,
          title: v.title,
          severity: v.severity,
          status: v.status
        }))
      },
      complianceAssessments: assessments.map(a => ({
        id: a.id,
        standardId: a.standardId,
        standardName: complianceStandards.find(s => s.id === a.standardId)?.name || a.standardId,
        timestamp: a.timestamp,
        overallStatus: a.overallStatus,
        summary: a.summary
      }))
    };
    
    // Convert to JSON string
    const reportJson = JSON.stringify(report, null, 2);
    
    // Create a download link
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${target.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Render vulnerability table
  const renderVulnerabilityTable = () => {
    const vulnerabilities = getVulnerabilitiesForTarget();
    
    return (
      <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', color: '#fff' }}>
        <Table size="small" aria-label="vulnerability table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#00FFFF' }}>Severity</TableCell>
              <TableCell sx={{ color: '#00FFFF' }}>Title</TableCell>
              <TableCell sx={{ color: '#00FFFF' }}>Type</TableCell>
              <TableCell sx={{ color: '#00FFFF' }}>Status</TableCell>
              <TableCell sx={{ color: '#00FFFF' }}>Detected</TableCell>
              <TableCell sx={{ color: '#00FFFF' }}>Fix Available</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vulnerabilities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: '#fff' }}>
                  No vulnerabilities found
                </TableCell>
              </TableRow>
            ) : (
              vulnerabilities.map((vuln) => (
                <TableRow key={vuln.id}>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: getSeverityColor(vuln.severity)
                      }}
                    >
                      <ErrorIcon sx={{ mr: 1 }} />
                      {vuln.severity}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#fff' }}>{vuln.title}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{vuln.type}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{vuln.status}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>
                    {new Date(vuln.detectedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: vuln.fixAvailable ? '#00FF55' : '#FF5555'
                      }}
                    >
                      {vuln.fixAvailable ? <CheckCircleIcon sx={{ mr: 1 }} /> : <ErrorIcon sx={{ mr: 1 }} />}
                      {vuln.fixAvailable ? 'Yes' : 'No'}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  // Render compliance assessment
  const renderComplianceAssessment = () => {
    const assessment = getSelectedAssessment();
    
    if (!assessment) {
      return (
        <Box sx={{ textAlign: 'center', mt: 3, color: '#fff' }}>
          <Typography variant="body1">
            No compliance assessment selected
          </Typography>
        </Box>
      );
    }
    
    const standard = complianceStandards.find(s => s.id === assessment.standardId);
    
    return (
      <Box>
        <Typography variant="h6" sx={{ color: '#00FFFF', mb: 2 }}>
          Compliance Assessment for {assessment.targetName}
        </Typography>
        
        <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1 }}>
          Standard: {standard?.name || assessment.standardId}
        </Typography>
        
        <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2 }}>
          Performed on: {new Date(assessment.timestamp).toLocaleString()}
        </Typography>
        
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            p: 2,
            borderRadius: 1,
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${getStatusColor(assessment.overallStatus)}`
          }}
        >
          <Box sx={{ mr: 2 }}>
            {getStatusIcon(assessment.overallStatus)}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ color: getStatusColor(assessment.overallStatus) }}>
              {assessment.overallStatus === 'compliant'
                ? 'Compliant'
                : assessment.overallStatus === 'partiallyCompliant'
                ? 'Partially Compliant'
                : 'Non-Compliant'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              {assessment.summary.compliancePercentage}% compliance rate
              ({assessment.summary.compliantCount} of {assessment.summary.totalRequirements - assessment.summary.notApplicableCount} applicable requirements)
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="h6" sx={{ color: '#00FFFF', mb: 1 }}>
          Requirement Results
        </Typography>
        
        <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', color: '#fff' }}>
          <Table size="small" aria-label="compliance table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#00FFFF' }}>Status</TableCell>
                <TableCell sx={{ color: '#00FFFF' }}>Requirement</TableCell>
                <TableCell sx={{ color: '#00FFFF' }}>Evidence</TableCell>
                <TableCell sx={{ color: '#00FFFF' }}>Severity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assessment.results.map((result) => {
                const requirement = standard?.requirements.find(r => r.id === result.requirementId);
                
                return (
                  <TableRow key={result.requirementId}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getStatusIcon(result.status)}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>
                      {requirement?.name || result.requirementId}
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>
                      {result.evidence || '(No evidence provided)'}
                    </TableCell>
                    <TableCell sx={{ color: getSeverityColor(result.severity || 'medium') }}>
                      {result.severity || 'Medium'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };
  
  // Render summary metrics
  const renderSummaryMetrics = () => {
    const vulnerabilities = getVulnerabilitiesForTarget();
    const assessments = getAssessmentsForTarget();
    
    // Calculate metrics
    const totalVulnerabilities = vulnerabilities.length;
    const criticalVulnerabilities = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulnerabilities = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumVulnerabilities = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowVulnerabilities = vulnerabilities.filter(v => v.severity === 'low').length;
    const fixableVulnerabilities = vulnerabilities.filter(v => v.fixAvailable).length;
    
    const latestAssessment = assessments.length > 0
      ? assessments.sort((a, b) => b.timestamp - a.timestamp)[0]
      : undefined;
    
    const compliancePercentage = latestAssessment?.summary.compliancePercentage || 0;
    
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <NeonCard>
            <NeonCardHeader
              title="Vulnerability Summary"
              titleTypographyProps={{ variant: 'h6' }}
            />
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" sx={{ color: '#fff', flex: 1 }}>
                  Total Vulnerabilities:
                </Typography>
                <Typography variant="h6" sx={{ color: '#00FFFF' }}>
                  {totalVulnerabilities}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#fff', flex: 1 }}>
                  Critical:
                </Typography>
                <Typography variant="body1" sx={{ color: getSeverityColor('critical') }}>
                  {criticalVulnerabilities}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#fff', flex: 1 }}>
                  High:
                </Typography>
                <Typography variant="body1" sx={{ color: getSeverityColor('high') }}>
                  {highVulnerabilities}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#fff', flex: 1 }}>
                  Medium:
                </Typography>
                <Typography variant="body1" sx={{ color: getSeverityColor('medium') }}>
                  {mediumVulnerabilities}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#fff', flex: 1 }}>
                  Low:
                </Typography>
                <Typography variant="body1" sx={{ color: getSeverityColor('low') }}>
                  {lowVulnerabilities}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2, bgcolor: 'rgba(0, 255, 255, 0.3)' }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ color: '#fff', flex: 1 }}>
                  Fixable Vulnerabilities:
                </Typography>
                <Typography variant="h6" sx={{ color: '#00FF55' }}>
                  {fixableVulnerabilities}
                </Typography>
              </Box>
            </CardContent>
          </NeonCard>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <NeonCard>
            <NeonCardHeader
              title="Compliance Summary"
              titleTypographyProps={{ variant: 'h6' }}
            />
            <CardContent sx={{ flexGrow: 1 }}>
              {latestAssessment ? (
                <>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h5" sx={{ color: getStatusColor(latestAssessment.overallStatus) }}>
                      {compliancePercentage}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff' }}>
                      Overall Compliance
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <CheckCircleIcon sx={{ color: '#00FF55', mr: 1 }} />
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        Compliant:
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#00FF55' }}>
                      {latestAssessment.summary.compliantCount}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <WarningIcon sx={{ color: '#FFAA00', mr: 1 }} />
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        Partially Compliant:
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#FFAA00' }}>
                      {latestAssessment.summary.partiallyCompliantCount}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <ErrorIcon sx={{ color: '#FF0055', mr: 1 }} />
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        Non-Compliant:
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ color: '#FF0055' }}>
                      {latestAssessment.summary.nonCompliantCount}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2, bgcolor: 'rgba(0, 255, 255, 0.3)' }} />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#fff', flex: 1 }}>
                      Latest Assessment:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#AAAAAA' }}>
                      {new Date(latestAssessment.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Typography variant="body1" sx={{ color: '#fff', mb: 2 }}>
                    No compliance assessments available
                  </Typography>
                  <NeonButton
                    variant="outlined"
                    size="small"
                    onClick={handleAssessCompliance}
                    disabled={isLoading || !selectedTargetId || !selectedStandardId}
                  >
                    {isLoading ? <CircularProgress size={20} /> : 'Perform Assessment'}
                  </NeonButton>
                </Box>
              )}
            </CardContent>
          </NeonCard>
        </Grid>
      </Grid>
    );
  };
  
  return (
    <NeonCard>
      <NeonCardHeader 
        title="Security Audit Reporter" 
        action={
          <Box sx={{ display: 'flex' }}>
            <Tooltip title="Generate Report">
              <IconButton 
                size="small" 
                sx={{ color: '#00FFFF' }}
                onClick={handleGenerateReport}
                disabled={isLoading || !selectedTargetId}
              >
                <DescriptionIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Download Report">
              <IconButton 
                size="small" 
                sx={{ color: '#00FFFF' }}
                onClick={handleGenerateReport}
                disabled={isLoading || !selectedTargetId}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Refresh Data">
              <IconButton 
                size="small" 
                sx={{ color: '#00FFFF' }}
                onClick={() => {
                  // Reload data
                  const results = securityScanningService.getAllScanResults();
                  setScanResults(results);
                  
                  const assessments = complianceChecker.getAllComplianceAssessments();
                  setComplianceAssessments(assessments);
                }}
                disabled={isLoading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel id="target-select-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Target System
              </InputLabel>
              <Select
                labelId="target-select-label"
                id="target-select"
                value={selectedTargetId}
                onChange={handleTargetChange}
                label="Target System"
                sx={{ 
                  color: '#00FFFF',
                  '.MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 255, 255, 0.5)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00FFFF'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00FFFF'
                  },
                  '.MuiSvgIcon-root': {
                    color: '#00FFFF'
                  }
                }}
              >
                {scanTargets.map((target) => (
                  <MenuItem key={target.id} value={target.id}>
                    {target.name} ({target.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <NeonButton
                variant="outlined"
                size="small"
                onClick={handleStartScan}
                disabled={isLoading || !selectedTargetId}
                sx={{ flex: 1 }}
              >
                {isLoading ? <CircularProgress size={20} /> : 'Scan for Vulnerabilities'}
              </NeonButton>
              
              <NeonButton
                variant="outlined"
                size="small"
                onClick={handleAssessCompliance}
                disabled={isLoading || !selectedTargetId || !selectedStandardId}
                sx={{ flex: 1 }}
              >
                {isLoading ? <CircularProgress size={20} /> : 'Assess Compliance'}
              </NeonButton>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel id="standard-select-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Compliance Standard
              </InputLabel>
              <Select
                labelId="standard-select-label"
                id="standard-select"
                value={selectedStandardId}
                onChange={handleStandardChange}
                label="Compliance Standard"
                sx={{ 
                  color: '#00FFFF',
                  '.MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 255, 255, 0.5)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00FFFF'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00FFFF'
                  },
                  '.MuiSvgIcon-root': {
                    color: '#00FFFF'
                  }
                }}
              >
                {complianceStandards.map((standard) => (
                  <MenuItem key={standard.id} value={standard.id}>
                    {standard.name} ({standard.version})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(0, 255, 255, 0.3)' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{ 
            '& .MuiTabs-indicator': {
              backgroundColor: '#00FFFF'
            },
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              '&.Mui-selected': {
                color: '#00FFFF'
              }
            }
          }}
        >
          <Tab label="Summary" {...a11yProps(0)} />
          <Tab label="Vulnerabilities" {...a11yProps(1)} />
          <Tab label="Compliance" {...a11yProps(2)} />
        </Tabs>
      </Box>
      
      <Box sx={{ position: 'relative', flexGrow: 1 }}>
        {isLoading && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 10,
            borderRadius: 1
          }}>
            <CircularProgress sx={{ color: '#00FFFF' }} />
          </Box>
        )}
        
        <TabPanel value={tabValue} index={0}>
          {renderSummaryMetrics()}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {renderVulnerabilityTable()}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel id="assessment-select-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Assessment Report
              </InputLabel>
              <Select
                labelId="assessment-select-label"
                id="assessment-select"
                value={selectedAssessmentId}
                onChange={handleAssessmentChange}
                label="Assessment Report"
                sx={{ 
                  color: '#00FFFF',
                  '.MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 255, 255, 0.5)'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00FFFF'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00FFFF'
                  },
                  '.MuiSvgIcon-root': {
                    color: '#00FFFF'
                  }
                }}
              >
                {complianceAssessments
                  .filter(assessment => assessment.targetId === selectedTargetId)
                  .map((assessment) => {
                    const standard = complianceStandards.find(s => s.id === assessment.standardId);
                    
                    return (
                      <MenuItem key={assessment.id} value={assessment.id}>
                        {standard?.name || assessment.standardId} ({new Date(assessment.timestamp).toLocaleDateString()})
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>
          </Box>
          
          {renderComplianceAssessment()}
        </TabPanel>
      </Box>
    </NeonCard>
  );
};

export default SecurityAuditReporter;
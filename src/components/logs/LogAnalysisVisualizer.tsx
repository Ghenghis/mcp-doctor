/**
 * LogAnalysisVisualizer.tsx
 * 
 * Component for visualizing log analysis results in a neon wireframe style
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Chip, 
  LinearProgress,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Timeline, 
  TimelineSeparator, 
  TimelineConnector,
  TimelineContent, 
  TimelineItem, 
  TimelineDot
} from '@mui/lab';
import { BarChart, LineChart, PieChart } from '@mui/x-charts';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AnalyticsIcon from '@mui/icons-material/Analytics';

import { LogAnalysisResult, LogPattern } from '../../services/maintenance/models/types';

// Styled components for neon wireframe appearance
const NeonContainer = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  borderRadius: 8,
  border: '1px solid #00FFFF',
  boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
  padding: theme.spacing(2),
  margin: theme.spacing(1, 0),
  overflow: 'hidden'
}));

const NeonDivider = styled(Divider)(({ theme }) => ({
  backgroundColor: '#00FFFF',
  height: '2px',
  margin: theme.spacing(2, 0),
  boxShadow: '0 0 5px rgba(0, 255, 255, 0.5)'
}));

const NeonChip = styled(Chip)<{severity?: string}>(({ theme, severity }) => {
  let color = '#00FFFF'; // default cyan
  
  switch (severity) {
    case 'critical':
      color = '#FF00FF'; // magenta
      break;
    case 'error':
      color = '#FF5555'; // reddish
      break;
    case 'warning':
      color = '#FFFF00'; // yellow
      break;
    case 'info':
      color = '#00FF00'; // green
      break;
  }
  
  return {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: `1px solid ${color}`,
    color: color,
    fontSize: '0.75rem',
    height: 24,
    '& .MuiChip-label': {
      padding: '0 8px'
    },
    boxShadow: `0 0 5px rgba(${color === '#FF00FF' ? '255, 0, 255' : 
                               color === '#FF5555' ? '255, 85, 85' : 
                               color === '#FFFF00' ? '255, 255, 0' : 
                               color === '#00FF00' ? '0, 255, 0' : 
                               '0, 255, 255'}, 0.5)`
  };
});

const StyledTimelineDot = styled(TimelineDot)<{severity?: string}>(({ severity }) => {
  let color = '#00FFFF'; // default cyan
  
  switch (severity) {
    case 'critical':
      color = '#FF00FF'; // magenta
      break;
    case 'error':
      color = '#FF5555'; // reddish
      break;
    case 'warning':
      color = '#FFFF00'; // yellow
      break;
    case 'info':
      color = '#00FF00'; // green
      break;
  }
  
  return {
    backgroundColor: 'transparent',
    border: `2px solid ${color}`,
    boxShadow: `0 0 5px ${color}`
  };
});

const StyledTimelineConnector = styled(TimelineConnector)({
  backgroundColor: 'rgba(0, 255, 255, 0.5)'
});

interface LogAnalysisVisualizerProps {
  analysisResult: LogAnalysisResult;
}

const LogAnalysisVisualizer: React.FC<LogAnalysisVisualizerProps> = ({ analysisResult }) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [filteredPatterns, setFilteredPatterns] = useState<LogPattern[]>(analysisResult.patterns);
  
  useEffect(() => {
    // Update filtered patterns when tab changes
    if (activeTab === 0) {
      // All patterns
      setFilteredPatterns(analysisResult.patterns);
    } else if (activeTab === 1) {
      // Critical and error patterns
      setFilteredPatterns(analysisResult.patterns.filter(
        p => p.severity === 'critical' || p.severity === 'error'
      ));
    } else if (activeTab === 2) {
      // Warning patterns
      setFilteredPatterns(analysisResult.patterns.filter(
        p => p.severity === 'warning'
      ));
    } else {
      // Info patterns
      setFilteredPatterns(analysisResult.patterns.filter(
        p => p.severity === 'info'
      ));
    }
  }, [activeTab, analysisResult.patterns]);
  
  // Prepare data for charts
  const patternSeverityCounts = {
    critical: analysisResult.patterns.filter(p => p.severity === 'critical').length,
    error: analysisResult.patterns.filter(p => p.severity === 'error').length,
    warning: analysisResult.patterns.filter(p => p.severity === 'warning').length,
    info: analysisResult.patterns.filter(p => p.severity === 'info').length
  };
  
  // Pattern distribution data for pie chart
  const patternDistributionData = [
    { id: 0, value: patternSeverityCounts.critical, label: 'Critical', color: '#FF00FF' },
    { id: 1, value: patternSeverityCounts.error, label: 'Error', color: '#FF5555' },
    { id: 2, value: patternSeverityCounts.warning, label: 'Warning', color: '#FFFF00' },
    { id: 3, value: patternSeverityCounts.info, label: 'Info', color: '#00FF00' }
  ].filter(item => item.value > 0);
  
  // Top patterns data for bar chart
  const topPatternsData = analysisResult.patterns
    .slice(0, 5)
    .map((pattern, index) => ({
      id: index,
      value: pattern.count,
      label: pattern.id.substring(0, 15) + (pattern.id.length > 15 ? '...' : ''),
      color: pattern.severity === 'critical' ? '#FF00FF' : 
             pattern.severity === 'error' ? '#FF5555' : 
             pattern.severity === 'warning' ? '#FFFF00' : '#00FF00'
    }));
  
  // Error spike data for line chart
  const errorSpikeData = analysisResult.errorSpikes.map((spike, index) => ({
    time: new Date(spike.timestamp).toLocaleTimeString(),
    count: spike.count
  }));
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Summary section */}
      <NeonContainer elevation={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold' }}>
            Log Analysis Summary
          </Typography>
          <NeonChip 
            label={`${analysisResult.totalEntries} Entries`} 
            icon={<AnalyticsIcon sx={{ fontSize: 16 }} />} 
          />
        </Box>
        
        <NeonDivider />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box mb={1}>
              <Typography variant="subtitle2" sx={{ color: '#FFFFFF', mb: 0.5 }}>
                Error Rate
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <LinearProgress
                  variant="determinate"
                  value={(analysisResult.errorCount / analysisResult.totalEntries) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    width: '100%',
                    backgroundColor: 'rgba(255, 85, 85, 0.2)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: '#FF5555',
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: '#FF5555', minWidth: 45 }}>
                  {((analysisResult.errorCount / analysisResult.totalEntries) * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Box>
            
            <Box mb={1}>
              <Typography variant="subtitle2" sx={{ color: '#FFFFFF', mb: 0.5 }}>
                Warning Rate
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <LinearProgress
                  variant="determinate"
                  value={(analysisResult.warningCount / analysisResult.totalEntries) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 0, 0.2)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: '#FFFF00',
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: '#FFFF00', minWidth: 45 }}>
                  {((analysisResult.warningCount / analysisResult.totalEntries) * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
              <NeonChip 
                label={`${analysisResult.errorCount} Errors`} 
                severity="error"
                icon={<ErrorOutlineIcon sx={{ fontSize: 16 }} />} 
              />
              <NeonChip 
                label={`${analysisResult.warningCount} Warnings`} 
                severity="warning"
                icon={<WarningAmberIcon sx={{ fontSize: 16 }} />} 
              />
              <NeonChip 
                label={`${analysisResult.patterns.length} Patterns`} 
                severity="info"
                icon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />} 
              />
              <NeonChip 
                label={`${analysisResult.errorSpikes.length} Error Spikes`} 
                severity="critical"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            {patternDistributionData.length > 0 ? (
              <Box height={190} width="100%">
                <PieChart
                  series={[
                    {
                      data: patternDistributionData,
                      highlightScope: { faded: 'global', highlighted: 'item' },
                      innerRadius: 30,
                      outerRadius: 80,
                      paddingAngle: 2,
                      cornerRadius: 4,
                      startAngle: -90,
                      endAngle: 270,
                    },
                  ]}
                  margin={{ top: 10, bottom: 10 }}
                  slotProps={{
                    legend: { hidden: true },
                  }}
                  sx={{
                    '& .MuiChartsLegend-series': {
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 1,
                    },
                    '--ChartsLegend-rootSpacing': '10px',
                    '.MuiChartsLegend-root': {
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                    '.MuiChartsLegend-label': {
                      fill: 'white',
                      fontSize: 12,
                    },
                  }}
                  height={190}
                />
              </Box>
            ) : (
              <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                height={190}
              >
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  No pattern data available
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </NeonContainer>
      
      {/* Patterns section */}
      <NeonContainer elevation={3}>
        <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold', mb: 2 }}>
          Detected Patterns
        </Typography>
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            mb: 2,
            '& .MuiTabs-indicator': {
              backgroundColor: '#00FFFF',
              height: 3,
              boxShadow: '0 0 5px #00FFFF',
            },
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 'bold',
              '&.Mui-selected': {
                color: '#00FFFF',
              },
            },
          }}
        >
          <Tab label="All" />
          <Tab label="Critical & Error" />
          <Tab label="Warning" />
          <Tab label="Info" />
        </Tabs>
        
        {filteredPatterns.length === 0 ? (
          <Box py={2} textAlign="center">
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              No patterns found in this category
            </Typography>
          </Box>
        ) : (
          <Timeline position="right" sx={{ p: 0, m: 0 }}>
            {filteredPatterns.slice(0, 5).map((pattern, index) => (
              <TimelineItem key={pattern.id}>
                <TimelineSeparator>
                  <StyledTimelineDot severity={pattern.severity} />
                  {index < filteredPatterns.slice(0, 5).length - 1 && <StyledTimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="subtitle2" sx={{ color: '#FFFFFF' }}>
                        {pattern.id}
                      </Typography>
                      <NeonChip 
                        label={pattern.severity} 
                        severity={pattern.severity}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 0.5 }}>
                      {pattern.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block' }}>
                      Occurrences: {pattern.count} | First seen: {pattern.firstSeen.toLocaleString()} | Last seen: {pattern.lastSeen.toLocaleString()}
                    </Typography>
                    {pattern.suggestedAction && (
                      <Typography variant="caption" sx={{ color: '#00FF00', display: 'block', mt: 0.5 }}>
                        Suggested action: {pattern.suggestedAction}
                      </Typography>
                    )}
                  </Box>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </NeonContainer>
      
      {/* Charts section */}
      {(topPatternsData.length > 0 || errorSpikeData.length > 0) && (
        <NeonContainer elevation={3}>
          <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold', mb: 2 }}>
            Analysis Charts
          </Typography>
          
          <Grid container spacing={2}>
            {topPatternsData.length > 0 && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ color: '#FFFFFF', mb: 1 }}>
                  Top 5 Patterns by Occurrence
                </Typography>
                <Box height={200}>
                  <BarChart
                    series={[
                      {
                        data: topPatternsData.map(d => d.value),
                        color: '#00FFFF',
                        label: 'Occurrences',
                      }
                    ]}
                    xAxis={[
                      {
                        data: topPatternsData.map(d => d.label),
                        scaleType: 'band',
                      }
                    ]}
                    height={200}
                    margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
                    sx={{
                      '.MuiChartsAxis-tick': {
                        stroke: '#FFFFFF',
                      },
                      '.MuiChartsAxis-tickLabel': {
                        fill: '#FFFFFF',
                        fontSize: '0.75rem',
                      },
                      '.MuiChartsAxis-line': {
                        stroke: '#00FFFF',
                      },
                      '.MuiBarElement-root:hover': {
                        filter: 'brightness(1.2)',
                      },
                    }}
                  />
                </Box>
              </Grid>
            )}
            
            {errorSpikeData.length > 0 && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ color: '#FFFFFF', mb: 1 }}>
                  Error Spikes
                </Typography>
                <Box height={200}>
                  <LineChart
                    series={[
                      {
                        data: errorSpikeData.map(d => d.count),
                        color: '#FF00FF',
                        label: 'Error Count',
                        area: true,
                        showMark: true,
                      }
                    ]}
                    xAxis={[
                      {
                        data: errorSpikeData.map(d => d.time),
                        scaleType: 'point',
                      }
                    ]}
                    height={200}
                    margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
                    sx={{
                      '.MuiChartsAxis-tick': {
                        stroke: '#FFFFFF',
                      },
                      '.MuiChartsAxis-tickLabel': {
                        fill: '#FFFFFF',
                        fontSize: '0.75rem',
                      },
                      '.MuiChartsAxis-line': {
                        stroke: '#00FFFF',
                      },
                      '.MuiAreaElement-root': {
                        fillOpacity: 0.15,
                      },
                      '.MuiLineElement-root': {
                        strokeWidth: 2,
                      },
                      '.MuiMarkElement-root': {
                        stroke: '#FF00FF',
                        strokeWidth: 2,
                        fill: '#000',
                      },
                    }}
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </NeonContainer>
      )}
    </Box>
  );
};

export default LogAnalysisVisualizer;

/**
 * LogAnalysisVisualizer.test.tsx
 * 
 * Tests for the LogAnalysisVisualizer component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogAnalysisVisualizer from './LogAnalysisVisualizer';
import { LogAnalysisResult, LogPattern } from '../../services/maintenance/models/types';

// Mock data for testing
const mockLogPattern: LogPattern = {
  id: 'ERROR_CONNECTION_REFUSED',
  regex: /Connection refused/,
  description: 'Server connection refused',
  severity: 'error',
  count: 5,
  firstSeen: new Date('2025-03-20T10:00:00'),
  lastSeen: new Date('2025-03-20T12:00:00'),
  suggestedAction: 'Check server status and network connectivity'
};

const mockAnalysisResult: LogAnalysisResult = {
  totalEntries: 1000,
  errorCount: 25,
  warningCount: 50,
  patterns: [
    mockLogPattern,
    {
      id: 'WARNING_SLOW_RESPONSE',
      regex: /Response time exceeded threshold/,
      description: 'Server response time is slow',
      severity: 'warning',
      count: 10,
      firstSeen: new Date('2025-03-20T11:00:00'),
      lastSeen: new Date('2025-03-20T13:00:00'),
      suggestedAction: 'Check server load and optimize queries'
    }
  ],
  errorSpikes: [
    {
      timestamp: new Date('2025-03-20T11:30:00'),
      count: 15
    }
  ]
};

// Mock the charts to avoid rendering issues in tests
jest.mock('@mui/x-charts', () => ({
  PieChart: () => <div data-testid="mock-pie-chart">PieChart</div>,
  BarChart: () => <div data-testid="mock-bar-chart">BarChart</div>,
  LineChart: () => <div data-testid="mock-line-chart">LineChart</div>
}));

describe('LogAnalysisVisualizer', () => {
  test('renders component title', () => {
    render(<LogAnalysisVisualizer analysisResult={mockAnalysisResult} />);
    expect(screen.getByText('Log Analysis Summary')).toBeInTheDocument();
  });

  test('displays total entries count', () => {
    render(<LogAnalysisVisualizer analysisResult={mockAnalysisResult} />);
    expect(screen.getByText('1000 Entries')).toBeInTheDocument();
  });

  test('displays error and warning counts', () => {
    render(<LogAnalysisVisualizer analysisResult={mockAnalysisResult} />);
    expect(screen.getByText('25 Errors')).toBeInTheDocument();
    expect(screen.getByText('50 Warnings')).toBeInTheDocument();
  });

  test('displays detected patterns section', () => {
    render(<LogAnalysisVisualizer analysisResult={mockAnalysisResult} />);
    expect(screen.getByText('Detected Patterns')).toBeInTheDocument();
  });

  test('displays pattern details', () => {
    render(<LogAnalysisVisualizer analysisResult={mockAnalysisResult} />);
    expect(screen.getByText('ERROR_CONNECTION_REFUSED')).toBeInTheDocument();
    expect(screen.getByText('Server connection refused')).toBeInTheDocument();
    expect(screen.getByText('error', { exact: false })).toBeInTheDocument();
  });

  test('displays charts section when data is available', () => {
    render(<LogAnalysisVisualizer analysisResult={mockAnalysisResult} />);
    expect(screen.getByText('Analysis Charts')).toBeInTheDocument();
  });
});

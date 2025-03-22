/**
 * PerformanceAnalysisVisualizer.test.tsx
 * 
 * Tests for the PerformanceAnalysisVisualizer component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PerformanceAnalysisVisualizer from './PerformanceAnalysisVisualizer';
import { 
  PerformanceMetric, 
  PerformanceAnomaly 
} from '../../services/maintenance/models/types';

// Mock data for testing
const mockPerformanceMetrics: PerformanceMetric[] = [
  {
    id: 'metric-1',
    name: 'CPU Usage',
    value: 45.3,
    timestamp: new Date('2025-03-20T10:00:00').getTime(),
    metadata: { server: 'main-server' }
  },
  {
    id: 'metric-2',
    name: 'Memory Usage',
    value: 75.2,
    timestamp: new Date('2025-03-20T10:01:00').getTime(),
    metadata: { server: 'main-server' }
  },
  {
    id: 'metric-3',
    name: 'Network Traffic',
    value: 12.5,
    timestamp: new Date('2025-03-20T10:02:00').getTime(),
    metadata: { server: 'main-server' }
  },
  {
    id: 'metric-4',
    name: 'Disk I/O',
    value: 25.8,
    timestamp: new Date('2025-03-20T10:03:00').getTime(),
    metadata: { server: 'main-server' }
  }
];

const mockPerformanceAnomalies: PerformanceAnomaly[] = [
  {
    id: 'anomaly-1',
    metricName: 'CPU Usage',
    timestamp: new Date('2025-03-20T10:30:00').getTime(),
    expectedValue: 40.0,
    actualValue: 92.7,
    metadata: { server: 'main-server' }
  }
];

// Mock the charts to avoid rendering issues in tests
jest.mock('@mui/x-charts', () => ({
  LineChart: () => <div data-testid="mock-line-chart">LineChart</div>,
  ScatterChart: () => <div data-testid="mock-scatter-chart">ScatterChart</div>
}));

describe('PerformanceAnalysisVisualizer', () => {
  test('renders component title', () => {
    render(
      <PerformanceAnalysisVisualizer 
        metrics={mockPerformanceMetrics} 
        anomalies={mockPerformanceAnomalies} 
      />
    );
    expect(screen.getByText('Performance Analysis Summary')).toBeInTheDocument();
  });

  test('displays metrics count', () => {
    render(
      <PerformanceAnalysisVisualizer 
        metrics={mockPerformanceMetrics} 
        anomalies={mockPerformanceAnomalies} 
      />
    );
    expect(screen.getByText('4 Metrics')).toBeInTheDocument();
  });

  test('displays anomalies count', () => {
    render(
      <PerformanceAnalysisVisualizer 
        metrics={mockPerformanceMetrics} 
        anomalies={mockPerformanceAnomalies} 
      />
    );
    expect(screen.getByText('1 Anomalies')).toBeInTheDocument();
  });

  test('displays different metric types', () => {
    render(
      <PerformanceAnalysisVisualizer 
        metrics={mockPerformanceMetrics} 
        anomalies={mockPerformanceAnomalies} 
      />
    );
    expect(screen.getByText('CPU Metrics')).toBeInTheDocument();
    expect(screen.getByText('Memory Metrics')).toBeInTheDocument();
    expect(screen.getByText('I/O Metrics')).toBeInTheDocument();
  });

  test('displays performance metrics tab', () => {
    render(
      <PerformanceAnalysisVisualizer 
        metrics={mockPerformanceMetrics} 
        anomalies={mockPerformanceAnomalies} 
      />
    );
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
  });

  test('displays metrics table with data', () => {
    render(
      <PerformanceAnalysisVisualizer 
        metrics={mockPerformanceMetrics} 
        anomalies={mockPerformanceAnomalies} 
      />
    );
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
  });

  test('displays anomalies section when anomalies exist', () => {
    render(
      <PerformanceAnalysisVisualizer 
        metrics={mockPerformanceMetrics} 
        anomalies={mockPerformanceAnomalies} 
      />
    );
    expect(screen.getByText('Detected Anomalies')).toBeInTheDocument();
  });

  test('does not display anomalies section when no anomalies exist', () => {
    render(
      <PerformanceAnalysisVisualizer 
        metrics={mockPerformanceMetrics} 
        anomalies={[]} 
      />
    );
    expect(screen.queryByText('Detected Anomalies')).not.toBeInTheDocument();
  });
});

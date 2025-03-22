/**
 * AlertViewer.test.tsx
 * 
 * Tests for the AlertViewer component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlertViewer from './AlertViewer';
import { PredictiveAlert } from '../../services/maintenance/models/types';

// Mock data for testing
const mockAlerts: PredictiveAlert[] = [
  {
    id: 'alert-1',
    title: 'Critical Error in Server Connection',
    description: 'Server connection refused multiple times',
    severity: 'critical',
    timestamp: new Date('2025-03-20T10:00:00').getTime(),
    source: 'log-analysis',
    content: 'Error: Connection refused at line 42',
    suggestedAction: 'Check server status and network connectivity',
    acknowledged: false,
    snoozed: false
  },
  {
    id: 'alert-2',
    title: 'Memory Usage Anomaly',
    description: 'Memory usage spiked above threshold',
    severity: 'warning',
    timestamp: new Date('2025-03-20T11:00:00').getTime(),
    source: 'performance-metrics',
    content: 'Memory usage: 92.7% (Threshold: 80%)',
    suggestedAction: 'Check for memory leaks and consider restarting service',
    acknowledged: true,
    snoozed: false
  },
  {
    id: 'alert-3',
    title: 'Disk I/O Slowdown',
    description: 'Disk operations taking longer than usual',
    severity: 'error',
    timestamp: new Date('2025-03-20T12:00:00').getTime(),
    source: 'performance-metrics',
    content: 'Average I/O latency: 250ms (Baseline: 50ms)',
    suggestedAction: 'Check disk health and reduce unnecessary I/O operations',
    acknowledged: false,
    snoozed: true
  }
];

// Mock handlers
const mockAcknowledge = jest.fn();
const mockSnooze = jest.fn();
const mockDismiss = jest.fn();

describe('AlertViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders component title', () => {
    render(
      <AlertViewer 
        alerts={mockAlerts} 
        onAcknowledge={mockAcknowledge}
        onSnooze={mockSnooze}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByText('Predictive Maintenance Alerts')).toBeInTheDocument();
  });

  test('displays alerts count', () => {
    render(
      <AlertViewer 
        alerts={mockAlerts} 
        onAcknowledge={mockAcknowledge}
        onSnooze={mockSnooze}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByText('3 Alerts')).toBeInTheDocument();
  });

  test('displays filter chips for different severities', () => {
    render(
      <AlertViewer 
        alerts={mockAlerts} 
        onAcknowledge={mockAcknowledge}
        onSnooze={mockSnooze}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByText('All (3)')).toBeInTheDocument();
    expect(screen.getByText('Critical (1)')).toBeInTheDocument();
    expect(screen.getByText('Error (1)')).toBeInTheDocument();
    expect(screen.getByText('Warning (1)')).toBeInTheDocument();
    expect(screen.getByText('Unacknowledged (2)')).toBeInTheDocument();
  });

  test('displays alert table headers', () => {
    render(
      <AlertViewer 
        alerts={mockAlerts} 
        onAcknowledge={mockAcknowledge}
        onSnooze={mockSnooze}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  test('displays alert titles in table', () => {
    render(
      <AlertViewer 
        alerts={mockAlerts} 
        onAcknowledge={mockAcknowledge}
        onSnooze={mockSnooze}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByText('Critical Error in Server Connection')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage Anomaly')).toBeInTheDocument();
    expect(screen.getByText('Disk I/O Slowdown')).toBeInTheDocument();
  });

  test('clicking acknowledge button calls the onAcknowledge handler', () => {
    render(
      <AlertViewer 
        alerts={mockAlerts} 
        onAcknowledge={mockAcknowledge}
        onSnooze={mockSnooze}
        onDismiss={mockDismiss}
      />
    );
    
    const acknowledgeButtons = screen.getAllByTitle('Not acknowledged');
    fireEvent.click(acknowledgeButtons[0]);
    
    expect(mockAcknowledge).toHaveBeenCalledWith('alert-1');
  });

  test('clicking snooze button calls the onSnooze handler', () => {
    render(
      <AlertViewer 
        alerts={mockAlerts} 
        onAcknowledge={mockAcknowledge}
        onSnooze={mockSnooze}
        onDismiss={mockDismiss}
      />
    );
    
    const snoozeButtons = screen.getAllByTitle('Notifications active');
    fireEvent.click(snoozeButtons[0]);
    
    expect(mockSnooze).toHaveBeenCalledWith('alert-1');
  });

  test('displays message when no alerts', () => {
    render(
      <AlertViewer 
        alerts={[]} 
        onAcknowledge={mockAcknowledge}
        onSnooze={mockSnooze}
        onDismiss={mockDismiss}
      />
    );
    
    expect(screen.getByText('No alerts to display')).toBeInTheDocument();
  });

  test('filtering alerts by severity works', () => {
    render(
      <AlertViewer 
        alerts={mockAlerts} 
        onAcknowledge={mockAcknowledge}
        onSnooze={mockSnooze}
        onDismiss={mockDismiss}
      />
    );
    
    // Click on Critical filter
    fireEvent.click(screen.getByText('Critical (1)'));
    
    // Should show critical alert but not warning alert
    expect(screen.getByText('Critical Error in Server Connection')).toBeInTheDocument();
    expect(screen.queryByText('Memory Usage Anomaly')).not.toBeInTheDocument();
  });
});

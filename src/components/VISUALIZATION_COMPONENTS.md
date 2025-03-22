# Predictive Maintenance Visualization Components

## Overview

This package contains visualization components for the MCP Doctor's Predictive Maintenance Service. These components follow a neon wireframe UI design with dark backgrounds and bright accent colors, providing a compact, information-dense interface for monitoring system health.

## Components

### LogAnalysisVisualizer

Displays results from log file analysis, including:
- Error and warning rates
- Detected log patterns with severity levels
- Pattern distribution charts
- Timeline of error spikes

**Location:** `src/components/logs/LogAnalysisVisualizer.tsx`  
**Test:** `src/components/logs/LogAnalysisVisualizer.test.tsx`

### PerformanceAnalysisVisualizer

Visualizes performance metrics and anomalies, including:
- Time series charts for different metric types (CPU, Memory, I/O)
- Anomaly distribution visualization
- Metrics data table with sorting functionality
- Tabbed navigation between different metric categories

**Location:** `src/components/performance/PerformanceAnalysisVisualizer.tsx`  
**Test:** `src/components/performance/PerformanceAnalysisVisualizer.test.tsx`

### AlertViewer

Provides an interactive interface for managing predictive maintenance alerts:
- Filtering by severity (critical, error, warning, info)
- Filtering by acknowledgment status
- Expandable alert details with suggested actions
- Interactive acknowledgment, snoozing, and dismissal

**Location:** `src/components/alerts/AlertViewer.tsx`  
**Test:** `src/components/alerts/AlertViewer.test.tsx`

### MaintenanceDashboard

Integrates all visualization components into a unified dashboard:
- Tabbed navigation between overview and detailed views
- Real-time updates through event subscriptions
- Collapsible sections for customizable view
- Quick access maintenance actions

**Location:** `src/components/dashboard/MaintenanceDashboard.tsx`

## Design Principles

These components adhere to the following design principles:

1. **Neon Wireframe Aesthetic**
   - Dark backgrounds (black) with neon accent colors
   - No white text (per user preferences)
   - Glowing borders and interactive elements

2. **Color Coding**
   - Cyan (#00FFFF): Normal state, UI elements
   - Magenta (#FF00FF): Critical alerts
   - Yellow (#FFFF00): Warnings
   - Green (#00FF00): Info, success states
   - Red (#FF5555): Errors

3. **Compact Design**
   - Information-dense layouts
   - Smaller UI elements to show more content
   - Collapsible sections for user control
   - Responsive to window size changes

4. **Interactive Elements**
   - Glow effects on hover
   - Clear visual feedback for state changes
   - Minimal clicks required for common actions

## Integration with Services

These visualization components integrate with the modular Predictive Maintenance Service:

- **LogAnalyzer**: Provides data for the LogAnalysisVisualizer
- **PerformanceAnalyzer**: Provides metrics data for the PerformanceAnalysisVisualizer
- **AlertManager**: Manages alerts displayed in the AlertViewer

All components subscribe to relevant events from the PredictiveMaintenanceService to receive real-time updates.

## Testing

Each component includes comprehensive unit tests covering:
- Component rendering
- Data display functionality
- User interactions
- Conditional rendering based on input data

Tests use Jest and React Testing Library with appropriate mocks for Material UI and charting components.

## Usage Example

```tsx
import { PredictiveMaintenanceService } from '../../services/maintenance/PredictiveMaintenanceService';
import MaintenanceDashboard from '../components/dashboard/MaintenanceDashboard';

const maintenanceService = new PredictiveMaintenanceService();

// In your component:
<MaintenanceDashboard maintenanceService={maintenanceService} />

// Or use individual components:
<LogAnalysisVisualizer analysisResult={logAnalysisResult} />
<PerformanceAnalysisVisualizer metrics={metrics} anomalies={anomalies} />
<AlertViewer 
  alerts={alerts} 
  onAcknowledge={handleAcknowledge}
  onSnooze={handleSnooze}
  onDismiss={handleDismiss}
/>
```

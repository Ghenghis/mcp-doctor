import { MCPServerConnection } from '../types/MCPServerTypes';

export interface PerformanceMetric {
  timestamp: number;
  category: 'cpu' | 'memory' | 'network' | 'disk' | 'response_time';
  value: number;
  label: string;
}

export interface ProfilerSnapshot {
  id: string;
  timestamp: number;
  metrics: PerformanceMetric[];
  notes?: string;
}

export interface ResourceUsage {
  cpu: {
    usage: number; // percentage
    cores: number;
  };
  memory: {
    used: number; // bytes
    total: number; // bytes
    percentage: number;
  };
  disk: {
    read: number; // bytes/sec
    write: number; // bytes/sec
    usage: number; // percentage
  };
  network: {
    bytesIn: number; // bytes/sec
    bytesOut: number; // bytes/sec
    connections: number;
  };
}

export interface ProfilerSettings {
  sampleInterval: number; // milliseconds
  maxHistorySize: number; // number of samples to keep
  enableCPUProfiling: boolean;
  enableMemoryProfiling: boolean;
  enableNetworkProfiling: boolean;
  enableDiskProfiling: boolean;
  alertThresholds: {
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    responseTime: number; // milliseconds
  };
}

export class PerformanceProfilerService {
  private serverConnection: MCPServerConnection | null = null;
  private profileInterval: NodeJS.Timeout | null = null;
  private metrics: PerformanceMetric[] = [];
  private snapshots: ProfilerSnapshot[] = [];
  private isRunning: boolean = false;
  private settings: ProfilerSettings = {
    sampleInterval: 5000, // 5 seconds
    maxHistorySize: 720, // 1 hour at 5 second intervals
    enableCPUProfiling: true,
    enableMemoryProfiling: true,
    enableNetworkProfiling: true,
    enableDiskProfiling: true,
    alertThresholds: {
      cpuUsage: 80, // 80%
      memoryUsage: 85, // 85%
      responseTime: 1000, // 1 second
    }
  };

  constructor() {
    this.resetMetrics();
  }

  public start(serverConnection: MCPServerConnection, settings?: Partial<ProfilerSettings>): void {
    this.serverConnection = serverConnection;
    
    if (settings) {
      this.updateSettings(settings);
    }
    
    if (this.isRunning) {
      this.stop();
    }
    
    this.isRunning = true;
    this.startProfiling();
  }

  public stop(): void {
    if (this.profileInterval) {
      clearInterval(this.profileInterval);
      this.profileInterval = null;
    }
    
    this.isRunning = false;
  }

  public resetMetrics(): void {
    this.metrics = [];
    this.snapshots = [];
  }

  public updateSettings(settings: Partial<ProfilerSettings>): void {
    this.settings = {
      ...this.settings,
      ...settings
    };
    
    // If we're already running, restart to apply new settings
    if (this.isRunning && this.serverConnection) {
      this.stop();
      this.start(this.serverConnection);
    }
  }

  public getSettings(): ProfilerSettings {
    return { ...this.settings };
  }

  public getMetrics(
    filter?: {
      category?: 'cpu' | 'memory' | 'network' | 'disk' | 'response_time';
      timeRange?: { start: number; end: number };
      limit?: number;
    }
  ): PerformanceMetric[] {
    let result = [...this.metrics];
    
    if (filter) {
      if (filter.category) {
        result = result.filter(metric => metric.category === filter.category);
      }
      
      if (filter.timeRange) {
        result = result.filter(metric => 
          metric.timestamp >= filter.timeRange!.start && 
          metric.timestamp <= filter.timeRange!.end
        );
      }
      
      if (filter.limit && filter.limit > 0) {
        // Get the most recent metrics up to the limit
        result = result.slice(-filter.limit);
      }
    }
    
    return result;
  }

  public getResourceUsage(): ResourceUsage {
    // This would normally collect real metrics from the server
    // For demonstration, we're returning simulated values
    const cpuMetrics = this.getMetrics({ 
      category: 'cpu', 
      limit: 1 
    });
    
    const memoryMetrics = this.getMetrics({ 
      category: 'memory', 
      limit: 2 
    });
    
    const diskMetrics = this.getMetrics({ 
      category: 'disk', 
      limit: 3 
    });
    
    const networkMetrics = this.getMetrics({ 
      category: 'network', 
      limit: 2 
    });
    
    // Mock data for demonstration
    return {
      cpu: {
        usage: cpuMetrics.length > 0 ? cpuMetrics[0].value : 0,
        cores: 4
      },
      memory: {
        used: memoryMetrics.length > 0 ? memoryMetrics[0].value : 0,
        total: 8 * 1024 * 1024 * 1024, // 8 GB
        percentage: memoryMetrics.length > 0 ? (memoryMetrics[0].value / (8 * 1024 * 1024 * 1024)) * 100 : 0
      },
      disk: {
        read: diskMetrics.length > 0 ? diskMetrics[0].value : 0,
        write: diskMetrics.length > 1 ? diskMetrics[1].value : 0,
        usage: diskMetrics.length > 2 ? diskMetrics[2].value : 0
      },
      network: {
        bytesIn: networkMetrics.length > 0 ? networkMetrics[0].value : 0,
        bytesOut: networkMetrics.length > 1 ? networkMetrics[1].value : 0,
        connections: 10 // Mock value
      }
    };
  }

  public takeSnapshot(notes?: string): ProfilerSnapshot {
    const id = `snapshot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const snapshot: ProfilerSnapshot = {
      id,
      timestamp: Date.now(),
      metrics: [...this.metrics],
      notes
    };
    
    this.snapshots.push(snapshot);
    return snapshot;
  }

  public getSnapshots(): ProfilerSnapshot[] {
    return [...this.snapshots];
  }

  public getSnapshot(id: string): ProfilerSnapshot | null {
    const snapshot = this.snapshots.find(s => s.id === id);
    return snapshot ? { ...snapshot } : null;
  }

  public deleteSnapshot(id: string): boolean {
    const initialLength = this.snapshots.length;
    this.snapshots = this.snapshots.filter(s => s.id !== id);
    return initialLength !== this.snapshots.length;
  }

  public compareSnapshots(snapshotId1: string, snapshotId2: string): {
    snapshot1: ProfilerSnapshot | null;
    snapshot2: ProfilerSnapshot | null;
    differences: {
      category: string;
      metric: string;
      value1: number;
      value2: number;
      percentChange: number;
    }[];
  } {
    const snapshot1 = this.getSnapshot(snapshotId1);
    const snapshot2 = this.getSnapshot(snapshotId2);
    
    if (!snapshot1 || !snapshot2) {
      return {
        snapshot1,
        snapshot2,
        differences: []
      };
    }
    
    // Group metrics by category and label for easier comparison
    const metrics1Map = new Map<string, number>();
    const metrics2Map = new Map<string, number>();
    
    snapshot1.metrics.forEach(metric => {
      const key = `${metric.category}-${metric.label}`;
      metrics1Map.set(key, metric.value);
    });
    
    snapshot2.metrics.forEach(metric => {
      const key = `${metric.category}-${metric.label}`;
      metrics2Map.set(key, metric.value);
    });
    
    // Find differences
    const differences: {
      category: string;
      metric: string;
      value1: number;
      value2: number;
      percentChange: number;
    }[] = [];
    
    // Check metrics in snapshot1
    metrics1Map.forEach((value1, key) => {
      const [category, metric] = key.split('-');
      const value2 = metrics2Map.get(key) ?? 0;
      
      if (value1 !== value2) {
        const percentChange = value1 === 0 ? 
          (value2 > 0 ? 100 : 0) : 
          ((value2 - value1) / value1) * 100;
        
        differences.push({
          category,
          metric,
          value1,
          value2,
          percentChange
        });
      }
    });
    
    // Check metrics in snapshot2 that are not in snapshot1
    metrics2Map.forEach((value2, key) => {
      if (!metrics1Map.has(key)) {
        const [category, metric] = key.split('-');
        
        differences.push({
          category,
          metric,
          value1: 0,
          value2,
          percentChange: 100
        });
      }
    });
    
    return {
      snapshot1,
      snapshot2,
      differences
    };
  }

  private startProfiling(): void {
    if (!this.serverConnection) {
      return;
    }
    
    this.profileInterval = setInterval(() => {
      this.collectMetrics();
    }, this.settings.sampleInterval);
    
    // Collect initial metrics
    this.collectMetrics();
  }

  private collectMetrics(): void {
    if (!this.serverConnection) {
      return;
    }
    
    const timestamp = Date.now();
    
    // This would normally collect real metrics from the server
    // For demonstration, we're using simulated values
    
    // CPU usage (percentage)
    if (this.settings.enableCPUProfiling) {
      this.addMetric({
        timestamp,
        category: 'cpu',
        value: Math.random() * 100,
        label: 'usage'
      });
    }
    
    // Memory usage (bytes)
    if (this.settings.enableMemoryProfiling) {
      const memoryUsage = Math.random() * 8 * 1024 * 1024 * 1024; // 0-8 GB
      this.addMetric({
        timestamp,
        category: 'memory',
        value: memoryUsage,
        label: 'used'
      });
    }
    
    // Network metrics
    if (this.settings.enableNetworkProfiling) {
      // Bytes in per second
      this.addMetric({
        timestamp,
        category: 'network',
        value: Math.random() * 1024 * 1024, // 0-1 MB/s
        label: 'bytesIn'
      });
      
      // Bytes out per second
      this.addMetric({
        timestamp,
        category: 'network',
        value: Math.random() * 1024 * 1024, // 0-1 MB/s
        label: 'bytesOut'
      });
    }
    
    // Disk metrics
    if (this.settings.enableDiskProfiling) {
      // Disk read (bytes/sec)
      this.addMetric({
        timestamp,
        category: 'disk',
        value: Math.random() * 50 * 1024 * 1024, // 0-50 MB/s
        label: 'read'
      });
      
      // Disk write (bytes/sec)
      this.addMetric({
        timestamp,
        category: 'disk',
        value: Math.random() * 20 * 1024 * 1024, // 0-20 MB/s
        label: 'write'
      });
      
      // Disk usage (percentage)
      this.addMetric({
        timestamp,
        category: 'disk',
        value: 50 + Math.random() * 30, // 50-80%
        label: 'usage'
      });
    }
    
    // Response time (milliseconds)
    this.addMetric({
      timestamp,
      category: 'response_time',
      value: 50 + Math.random() * 450, // 50-500ms
      label: 'average'
    });
    
    // Check for alerts based on thresholds
    this.checkAlerts();
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep history size within limits
    if (this.metrics.length > this.settings.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.settings.maxHistorySize);
    }
  }

  private checkAlerts(): void {
    // Get the most recent metrics
    const cpuMetrics = this.getMetrics({ 
      category: 'cpu', 
      limit: 1 
    });
    
    const memoryMetrics = this.getMetrics({ 
      category: 'memory', 
      limit: 1 
    });
    
    const responseTimeMetrics = this.getMetrics({ 
      category: 'response_time', 
      limit: 1 
    });
    
    // Check CPU usage
    if (cpuMetrics.length > 0 && cpuMetrics[0].value > this.settings.alertThresholds.cpuUsage) {
      this.triggerAlert('cpu', cpuMetrics[0].value);
    }
    
    // Check memory usage
    if (memoryMetrics.length > 0) {
      const memoryPercentage = (memoryMetrics[0].value / (8 * 1024 * 1024 * 1024)) * 100;
      if (memoryPercentage > this.settings.alertThresholds.memoryUsage) {
        this.triggerAlert('memory', memoryPercentage);
      }
    }
    
    // Check response time
    if (responseTimeMetrics.length > 0 && 
        responseTimeMetrics[0].value > this.settings.alertThresholds.responseTime) {
      this.triggerAlert('response_time', responseTimeMetrics[0].value);
    }
  }

  private triggerAlert(type: string, value: number): void {
    // In a real implementation, this would send alerts through a notification system
    console.log(`ALERT: ${type} threshold exceeded. Current value: ${value}`);
    
    // Example of how you might emit an event for the UI to respond to
    // this.eventEmitter.emit('alert', { type, value, timestamp: Date.now() });
  }

  // Utility functions for data analysis
  
  public getAverageMetric(category: string, label: string, timeWindow?: number): number {
    const now = Date.now();
    let relevantMetrics = this.metrics.filter(m => 
      m.category === category && 
      m.label === label && 
      (!timeWindow || m.timestamp >= now - timeWindow)
    );
    
    if (relevantMetrics.length === 0) {
      return 0;
    }
    
    const sum = relevantMetrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / relevantMetrics.length;
  }
  
  public getMinMaxMetric(category: string, label: string, timeWindow?: number): { min: number; max: number } {
    const now = Date.now();
    let relevantMetrics = this.metrics.filter(m => 
      m.category === category && 
      m.label === label && 
      (!timeWindow || m.timestamp >= now - timeWindow)
    );
    
    if (relevantMetrics.length === 0) {
      return { min: 0, max: 0 };
    }
    
    const min = Math.min(...relevantMetrics.map(m => m.value));
    const max = Math.max(...relevantMetrics.map(m => m.value));
    
    return { min, max };
  }
  
  public getTrend(category: string, label: string, timeWindow: number): 'increasing' | 'decreasing' | 'stable' {
    const now = Date.now();
    let relevantMetrics = this.metrics.filter(m => 
      m.category === category && 
      m.label === label && 
      m.timestamp >= now - timeWindow
    );
    
    if (relevantMetrics.length < 2) {
      return 'stable';
    }
    
    // Sort by timestamp (oldest first)
    relevantMetrics.sort((a, b) => a.timestamp - b.timestamp);
    
    // Simple linear regression
    const n = relevantMetrics.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    
    relevantMetrics.forEach((metric, index) => {
      const x = index;
      const y = metric.value;
      
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Determine trend based on slope
    if (slope > 0.05) {
      return 'increasing';
    } else if (slope < -0.05) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }
  
  public getPerformanceScore(): number {
    // Calculate an overall performance score (0-100)
    // This is a simplified example - a real implementation would be more sophisticated
    
    // Get average CPU usage (last minute)
    const cpuAvg = this.getAverageMetric('cpu', 'usage', 60000);
    
    // Get memory usage percentage
    const memoryMetrics = this.getMetrics({ 
      category: 'memory', 
      limit: 1 
    });
    const memoryPercentage = memoryMetrics.length > 0 ? 
      (memoryMetrics[0].value / (8 * 1024 * 1024 * 1024)) * 100 : 0;
    
    // Get average response time (last minute)
    const responseTimeAvg = this.getAverageMetric('response_time', 'average', 60000);
    
    // Calculate score components (higher is better)
    const cpuScore = 100 - cpuAvg; // Lower CPU usage is better
    const memoryScore = 100 - memoryPercentage; // Lower memory usage is better
    const responseTimeScore = Math.max(0, 100 - (responseTimeAvg / 10)); // Lower response time is better
    
    // Weight and combine scores
    const score = (
      (cpuScore * 0.4) + 
      (memoryScore * 0.3) + 
      (responseTimeScore * 0.3)
    );
    
    return Math.max(0, Math.min(100, score));
  }
  
  public exportMetricsAsCSV(): string {
    let csv = 'timestamp,category,label,value\n';
    
    this.metrics.forEach(metric => {
      const timestamp = new Date(metric.timestamp).toISOString();
      csv += `${timestamp},${metric.category},${metric.label},${metric.value}\n`;
    });
    
    return csv;
  }
}

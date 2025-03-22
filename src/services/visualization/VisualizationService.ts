import { EventEmitter } from 'events';
import { HeatMapDataPoint } from '../../components/visualization/HeatMapDisplay';
import { GraphData, Node, Edge } from '../../components/visualization/NetworkGraph';

// Data types for different visualizations
export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  category?: string;
  label?: string;
}

export interface MetricGroup {
  id: string;
  name: string;
  metrics: TimeSeriesDataPoint[];
  anomalies?: TimeSeriesDataPoint[];
  thresholds?: {
    warning?: number;
    critical?: number;
  };
}

/**
 * Service for processing and transforming data for visualizations.
 * It provides methods to convert raw data into formats suitable for
 * different visualization components, and includes real-time updates.
 */
class VisualizationService extends EventEmitter {
  private metricGroups: Record<string, MetricGroup> = {};
  private networkData: GraphData = { nodes: [], edges: [] };
  private heatmapData: Record<string, HeatMapDataPoint[]> = {};
  
  constructor() {
    super();
    // Initialize with empty data structures
  }
  
  /**
   * Add or update a metric group
   */
  public addMetricGroup(group: MetricGroup): void {
    this.metricGroups[group.id] = group;
    this.emit('metricGroupUpdated', group);
  }
  
  /**
   * Add metrics to an existing group
   */
  public addMetrics(groupId: string, metrics: TimeSeriesDataPoint[]): void {
    if (!this.metricGroups[groupId]) {
      this.metricGroups[groupId] = {
        id: groupId,
        name: groupId,
        metrics: []
      };
    }
    
    this.metricGroups[groupId].metrics.push(...metrics);
    this.emit('metricsAdded', groupId, metrics);
  }
  
  /**
   * Add anomalies to an existing group
   */
  public addAnomalies(groupId: string, anomalies: TimeSeriesDataPoint[]): void {
    if (!this.metricGroups[groupId]) {
      console.warn(`Metric group ${groupId} not found for anomalies`);
      return;
    }
    
    if (!this.metricGroups[groupId].anomalies) {
      this.metricGroups[groupId].anomalies = [];
    }
    
    this.metricGroups[groupId].anomalies!.push(...anomalies);
    this.emit('anomaliesAdded', groupId, anomalies);
  }
  
  /**
   * Get all metric groups
   */
  public getMetricGroups(): MetricGroup[] {
    return Object.values(this.metricGroups);
  }
  
  /**
   * Get a specific metric group
   */
  public getMetricGroup(groupId: string): MetricGroup | undefined {
    return this.metricGroups[groupId];
  }
  
  /**
   * Update network graph data
   */
  public updateNetworkGraph(data: GraphData): void {
    this.networkData = data;
    this.emit('networkGraphUpdated', data);
  }
  
  /**
   * Add nodes to the network graph
   */
  public addNetworkNodes(nodes: Node[]): void {
    // Filter out existing nodes
    const newNodes = nodes.filter(
      node => !this.networkData.nodes.some(n => n.id === node.id)
    );
    
    if (newNodes.length === 0) return;
    
    this.networkData.nodes.push(...newNodes);
    this.emit('networkNodesAdded', newNodes);
  }
  
  /**
   * Add edges to the network graph
   */
  public addNetworkEdges(edges: Edge[]): void {
    // Filter out existing edges
    const newEdges = edges.filter(
      edge => !this.networkData.edges.some(
        e => e.source === edge.source && e.target === edge.target
      )
    );
    
    if (newEdges.length === 0) return;
    
    this.networkData.edges.push(...newEdges);
    this.emit('networkEdgesAdded', newEdges);
  }
  
  /**
   * Get the network graph data
   */
  public getNetworkGraph(): GraphData {
    return this.networkData;
  }
  
  /**
   * Update heatmap data for a specific visualization
   */
  public updateHeatmap(id: string, data: HeatMapDataPoint[]): void {
    this.heatmapData[id] = data;
    this.emit('heatmapUpdated', id, data);
  }
  
  /**
   * Get heatmap data for a specific visualization
   */
  public getHeatmapData(id: string): HeatMapDataPoint[] {
    return this.heatmapData[id] || [];
  }
  
  /**
   * Get all heatmap datasets
   */
  public getAllHeatmaps(): Record<string, HeatMapDataPoint[]> {
    return this.heatmapData;
  }
  
  /**
   * Transform system metrics to time series format
   */
  public transformMetricsToTimeSeries(
    metrics: Array<{
      name: string;
      value: number;
      timestamp: number;
      category?: string;
    }>
  ): Record<string, TimeSeriesDataPoint[]> {
    // Group by category
    const result: Record<string, TimeSeriesDataPoint[]> = {};
    
    metrics.forEach(metric => {
      const category = metric.category || 'default';
      
      if (!result[category]) {
        result[category] = [];
      }
      
      result[category].push({
        timestamp: metric.timestamp,
        value: metric.value,
        label: metric.name
      });
    });
    
    return result;
  }
  
  /**
   * Transform log patterns to heatmap format
   */
  public transformLogPatternsToHeatmap(
    patterns: Array<{
      id: string;
      count: number;
      severity: string;
      firstSeen: Date;
      lastSeen: Date;
    }>
  ): HeatMapDataPoint[] {
    return patterns.map((pattern, index) => {
      // Calculate coordinates based on timestamp and severity
      // X axis: time from first to last appearance
      // Y axis: severity level (error, warning, info)
      
      // Get severity level (0-3)
      let severityLevel = 0;
      switch (pattern.severity) {
        case 'critical': severityLevel = 0; break;
        case 'error': severityLevel = 1; break;
        case 'warning': severityLevel = 2; break;
        case 'info': severityLevel = 3; break;
      }
      
      // Calculate center point time
      const firstTime = pattern.firstSeen.getTime();
      const lastTime = pattern.lastSeen.getTime();
      const midTime = firstTime + (lastTime - firstTime) / 2;
      
      // Get earliest and latest timestamps across all patterns
      const allTimes = patterns.flatMap(p => [p.firstSeen.getTime(), p.lastSeen.getTime()]);
      const minTime = Math.min(...allTimes);
      const maxTime = Math.max(...allTimes);
      const timeRange = maxTime - minTime || 1; // Avoid division by zero
      
      // Normalize time to 0-100 scale
      const normalizedTime = ((midTime - minTime) / timeRange) * 100;
      
      return {
        x: normalizedTime,
        y: severityLevel * 25, // Distribute severity levels evenly (0, 25, 50, 75)
        value: pattern.count, // Intensity based on occurrence count
        label: pattern.id
      };
    });
  }
  
  /**
   * Transform server connections to network graph format
   */
  public transformServersToNetworkGraph(
    servers: Array<{
      id: string;
      name: string;
      type: string;
      connections: Array<{
        targetId: string;
        status: string;
        type: string;
      }>;
      status: string;
      metadata?: Record<string, any>;
    }>
  ): GraphData {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Create nodes for each server
    servers.forEach(server => {
      nodes.push({
        id: server.id,
        label: server.name,
        type: server.type === 'server' ? 'server' : 
              server.type === 'container' ? 'container' : 
              server.type === 'process' ? 'process' : 'service',
        size: 12, // Default size
        data: server.metadata
      });
      
      // Create edges for each connection
      server.connections.forEach(conn => {
        edges.push({
          source: server.id,
          target: conn.targetId,
          type: conn.status === 'error' ? 'error' :
                conn.status === 'success' ? 'success' :
                conn.type === 'dependency' ? 'dependency' : 'connection'
        });
      });
    });
    
    return { nodes, edges };
  }
  
  /**
   * Clear all data
   */
  public clearAllData(): void {
    this.metricGroups = {};
    this.networkData = { nodes: [], edges: [] };
    this.heatmapData = {};
    
    this.emit('dataCleared');
  }
}

// Export singleton instance
export const visualizationService = new VisualizationService();
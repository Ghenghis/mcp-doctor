import { EventEmitter } from 'events';
import { anonymousUsageTracker, UserActionEvent } from './AnonymousUsageTracker';

/**
 * Interface for feature usage statistics
 */
export interface FeatureUsageStats {
  feature: string;
  count: number;
  lastUsed: number; // timestamp
  averageDuration?: number; // in ms
}

/**
 * Interface for workflow pattern
 */
export interface WorkflowPattern {
  id: string;
  name: string;
  steps: string[];
  frequency: number;
  averageDuration: number; // in ms
}

/**
 * Interface for recommendation
 */
export interface Recommendation {
  id: string;
  type: 'shortcut' | 'feature' | 'configuration' | 'workflow';
  title: string;
  description: string;
  benefit: string;
  priority: 'low' | 'medium' | 'high';
  relatedFeatures?: string[];
  timestamp: number;
  dismissed?: boolean;
  implemented?: boolean;
}

/**
 * Service for recommending optimizations based on user behavior
 */
export class RecommendationEngine extends EventEmitter {
  private static instance: RecommendationEngine;
  private recommendations: Recommendation[] = [];
  private featureUsageStats: Map<string, FeatureUsageStats> = new Map();
  private workflowPatterns: WorkflowPattern[] = [];
  private userPreferences: Map<string, any> = new Map();
  private lastSessionStartTime: number = 0;
  private isEnabled: boolean = true;
  private minUsageThreshold: number = 5; // Minimum usage count to generate recommendations
  
  /**
   * Creates an instance of RecommendationEngine.
   * @private Use getInstance() instead
   */
  private constructor() {
    super();
    
    // Load saved recommendations and preferences
    this.loadRecommendations();
    
    // Subscribe to usage tracker events
    anonymousUsageTracker.on('event', this.handleUserAction);
    anonymousUsageTracker.on('session_start', this.handleSessionStart);
    anonymousUsageTracker.on('session_end', this.handleSessionEnd);
  }
  
  /**
   * Get the singleton instance of RecommendationEngine
   * @returns The RecommendationEngine instance
   */
  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }
  
  /**
   * Load saved recommendations from storage
   * @private
   */
  private loadRecommendations(): void {
    try {
      const savedRecommendations = localStorage.getItem('mcp-doctor-recommendations');
      if (savedRecommendations) {
        this.recommendations = JSON.parse(savedRecommendations);
      }
      
      const savedFeatureStats = localStorage.getItem('mcp-doctor-feature-stats');
      if (savedFeatureStats) {
        const stats = JSON.parse(savedFeatureStats);
        stats.forEach((stat: FeatureUsageStats) => {
          this.featureUsageStats.set(stat.feature, stat);
        });
      }
      
      const savedWorkflowPatterns = localStorage.getItem('mcp-doctor-workflow-patterns');
      if (savedWorkflowPatterns) {
        this.workflowPatterns = JSON.parse(savedWorkflowPatterns);
      }
      
      const savedUserPreferences = localStorage.getItem('mcp-doctor-user-preferences');
      if (savedUserPreferences) {
        const prefs = JSON.parse(savedUserPreferences);
        Object.keys(prefs).forEach(key => {
          this.userPreferences.set(key, prefs[key]);
        });
      }
      
      // Check for enabled status
      const settingsStr = localStorage.getItem('mcp-doctor-recommendation-settings');
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        this.isEnabled = settings.isEnabled ?? true;
        this.minUsageThreshold = settings.minUsageThreshold ?? 5;
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  }
  
  /**
   * Save recommendations to storage
   * @private
   */
  private saveRecommendations(): void {
    try {
      localStorage.setItem('mcp-doctor-recommendations', JSON.stringify(this.recommendations));
      
      // Save feature stats
      const featureStatsArray = Array.from(this.featureUsageStats.values());
      localStorage.setItem('mcp-doctor-feature-stats', JSON.stringify(featureStatsArray));
      
      // Save workflow patterns
      localStorage.setItem('mcp-doctor-workflow-patterns', JSON.stringify(this.workflowPatterns));
      
      // Save user preferences
      const prefsObj: Record<string, any> = {};
      this.userPreferences.forEach((value, key) => {
        prefsObj[key] = value;
      });
      
      localStorage.setItem('mcp-doctor-user-preferences', JSON.stringify(prefsObj));
      
      // Save settings
      localStorage.setItem('mcp-doctor-recommendation-settings', JSON.stringify({
        isEnabled: this.isEnabled,
        minUsageThreshold: this.minUsageThreshold
      }));
    } catch (error) {
      console.error('Failed to save recommendations:', error);
    }
  }
  
  /**
   * Enable or disable the recommendation engine
   * @param enabled Whether to enable recommendations
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.saveRecommendations();
    
    if (enabled) {
      this.emit('enabled');
    } else {
      this.emit('disabled');
    }
  }
  
  /**
   * Set the minimum usage threshold for generating recommendations
   * @param threshold The minimum number of times a feature must be used
   */
  public setMinUsageThreshold(threshold: number): void {
    if (threshold >= 0) {
      this.minUsageThreshold = threshold;
      this.saveRecommendations();
    }
  }
  
  /**
   * Handle user action events from the usage tracker
   * @param event The user action event
   * @private
   */
  private handleUserAction = (event: UserActionEvent): void => {
    if (!this.isEnabled) return;
    
    // Update feature usage statistics
    const featureKey = `${event.category}:${event.action}`;
    let featureStat = this.featureUsageStats.get(featureKey);
    
    if (featureStat) {
      featureStat.count += 1;
      featureStat.lastUsed = event.timestamp;
      
      // Update average duration if value (duration) is provided
      if (event.value && event.value > 0) {
        const existingDuration = featureStat.averageDuration || 0;
        const newCount = featureStat.count;
        featureStat.averageDuration = (existingDuration * (newCount - 1) + event.value) / newCount;
      }
    } else {
      featureStat = {
        feature: featureKey,
        count: 1,
        lastUsed: event.timestamp,
        averageDuration: event.value
      };
    }
    
    this.featureUsageStats.set(featureKey, featureStat);
    
    // Save statistics periodically
    // For performance, we don't want to save on every action
    if (Math.random() < 0.1) { // ~10% chance to save on each action
      this.saveRecommendations();
    }
    
    // Check for potential recommendations based on this action
    this.generateRecommendationsForAction(event);
  };
  
  /**
   * Handle session start events
   * @param sessionId The session ID
   * @private
   */
  private handleSessionStart = (sessionId: string): void => {
    this.lastSessionStartTime = Date.now();
  };
  
  /**
   * Handle session end events
   * @param sessionId The session ID
   * @param duration The session duration in ms
   * @private
   */
  private handleSessionEnd = (sessionId: string, duration: number): void => {
    if (!this.isEnabled) return;
    
    // Analyze session for workflow patterns
    this.analyzeWorkflowPatterns();
    
    // Generate overall recommendations based on usage stats
    this.generateRecommendations();
    
    // Save all data
    this.saveRecommendations();
  };
  
  /**
   * Analyze user actions to detect workflow patterns
   * @private
   */
  private analyzeWorkflowPatterns(): void {
    // This would use more sophisticated pattern recognition in a real implementation
    // For now, we'll use a simplified approach with mock patterns
    
    // Example workflow pattern detection logic - in a real implementation,
    // this would analyze the sequence of user actions to detect patterns
    
    // Mock workflow patterns for demonstration
    const mockWorkflowPatterns: WorkflowPattern[] = [
      {
        id: 'wp1',
        name: 'Server Configuration Workflow',
        steps: ['servers:view', 'server:select', 'configuration:edit', 'configuration:save'],
        frequency: 12,
        averageDuration: 180000 // 3 minutes
      },
      {
        id: 'wp2',
        name: 'Troubleshooting Workflow',
        steps: ['logs:view', 'logs:filter', 'logs:analyze', 'performance:check'],
        frequency: 8,
        averageDuration: 300000 // 5 minutes
      },
      {
        id: 'wp3',
        name: 'Server Installation',
        steps: ['dashboard:view', 'servers:add', 'server:configure', 'server:start'],
        frequency: 5,
        averageDuration: 240000 // 4 minutes
      }
    ];
    
    // For demonstration purposes, we'll just add these patterns
    // In a real implementation, we would identify patterns from actual usage
    this.workflowPatterns = mockWorkflowPatterns;
  }
  
  /**
   * Generate recommendations based on a specific user action
   * @param event The user action event
   * @private
   */
  private generateRecommendationsForAction(event: UserActionEvent): void {
    if (!this.isEnabled) return;
    
    const featureKey = `${event.category}:${event.action}`;
    const featureStat = this.featureUsageStats.get(featureKey);
    
    if (!featureStat || featureStat.count < this.minUsageThreshold) {
      return;
    }
    
    // Example recommendation generation based on specific actions
    switch (featureKey) {
      case 'logs:filter':
        // If the user frequently filters logs, suggest saved filters
        if (featureStat.count >= 10 && !this.hasRecommendation('rec_saved_filters')) {
          this.addRecommendation({
            id: 'rec_saved_filters',
            type: 'feature',
            title: 'Save Log Filters',
            description: 'You frequently filter logs. Save your common filters for quicker access.',
            benefit: 'Faster log analysis and consistent filtering.',
            priority: 'medium',
            relatedFeatures: ['logs:filter', 'logs:view'],
            timestamp: Date.now()
          });
        }
        break;
        
      case 'configuration:edit':
        // If the user frequently edits configurations, suggest shortcuts
        if (featureStat.count >= 15 && !this.hasRecommendation('rec_config_shortcuts')) {
          this.addRecommendation({
            id: 'rec_config_shortcuts',
            type: 'shortcut',
            title: 'Configuration Keyboard Shortcuts',
            description: 'Use keyboard shortcuts (Ctrl+S to save, Ctrl+F to find) for faster configuration editing.',
            benefit: 'Speed up configuration editing by 30%.',
            priority: 'high',
            relatedFeatures: ['configuration:edit', 'configuration:save'],
            timestamp: Date.now()
          });
        }
        break;
        
      case 'performance:check':
        // If user checks performance frequently, suggest automation
        if (featureStat.count >= 8 && !this.hasRecommendation('rec_auto_perf_check')) {
          this.addRecommendation({
            id: 'rec_auto_perf_check',
            type: 'configuration',
            title: 'Automated Performance Checks',
            description: 'Set up scheduled performance checks to automatically monitor server health.',
            benefit: 'Get alerted about performance issues without manual checks.',
            priority: 'medium',
            relatedFeatures: ['performance:check', 'alerts:view'],
            timestamp: Date.now()
          });
        }
        break;
    }
  }
  
  /**
   * Generate overall recommendations based on usage patterns
   * @private
   */
  private generateRecommendations(): void {
    if (!this.isEnabled) return;
    
    // Get most used features
    const sortedFeatures = Array.from(this.featureUsageStats.values())
      .sort((a, b) => b.count - a.count);
    
    const topFeatures = sortedFeatures.slice(0, 5);
    
    // Generate recommendations based on overall usage patterns
    
    // Example: If user frequently uses the dashboard but rarely uses advanced features
    const dashboardUsage = this.featureUsageStats.get('dashboard:view');
    const advancedFeaturesUsage = Array.from(this.featureUsageStats.entries())
      .filter(([key]) => key.includes('advanced'))
      .reduce((sum, [_, stats]) => sum + stats.count, 0);
    
    if (dashboardUsage && dashboardUsage.count > 20 && advancedFeaturesUsage < 5) {
      this.addRecommendation({
        id: 'rec_advanced_features',
        type: 'feature',
        title: 'Explore Advanced Features',
        description: 'You frequently use the dashboard but might be missing out on advanced features that could enhance your workflow.',
        benefit: 'Discover powerful tools to increase productivity.',
        priority: 'medium',
        relatedFeatures: ['dashboard:view', 'advanced:features'],
        timestamp: Date.now()
      });
    }
    
    // Example: If the user frequently switches between certain pages, suggest a workspace
    if (this.workflowPatterns.length > 0) {
      const mostFrequentWorkflow = this.workflowPatterns.sort((a, b) => b.frequency - a.frequency)[0];
      
      if (mostFrequentWorkflow.frequency >= 10 && !this.hasRecommendation('rec_custom_workspace')) {
        this.addRecommendation({
          id: 'rec_custom_workspace',
          type: 'workflow',
          title: 'Create Custom Workspace',
          description: `Create a custom workspace for your "${mostFrequentWorkflow.name}" workflow to have all needed tools in one place.`,
          benefit: 'Reduce navigation time and increase focus.',
          priority: 'high',
          relatedFeatures: mostFrequentWorkflow.steps,
          timestamp: Date.now()
        });
      }
    }
    
    // Example: Based on session duration, suggest configuration improvements
    const averageSessionDuration = 3600000; // Mock 1 hour average session
    
    if (averageSessionDuration > 1800000 && !this.hasRecommendation('rec_auto_save')) { // If sessions over 30 minutes
      this.addRecommendation({
        id: 'rec_auto_save',
        type: 'configuration',
        title: 'Enable Auto-Save',
        description: 'Your sessions are typically long. Enable auto-save to prevent data loss.',
        benefit: 'Protect your work against unexpected issues.',
        priority: 'high',
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Check if a recommendation with the given ID already exists
   * @param id The recommendation ID
   * @returns True if the recommendation exists
   * @private
   */
  private hasRecommendation(id: string): boolean {
    return this.recommendations.some(rec => rec.id === id && !rec.dismissed && !rec.implemented);
  }
  
  /**
   * Add a new recommendation
   * @param recommendation The recommendation to add
   * @private
   */
  private addRecommendation(recommendation: Recommendation): void {
    // Don't add duplicate recommendations
    if (this.hasRecommendation(recommendation.id)) {
      return;
    }
    
    // Remove any dismissed or implemented recommendations with the same ID
    this.recommendations = this.recommendations.filter(rec => rec.id !== recommendation.id);
    
    // Add the new recommendation
    this.recommendations.push(recommendation);
    
    // Save recommendations
    this.saveRecommendations();
    
    // Emit event for new recommendation
    this.emit('new_recommendation', recommendation);
  }
  
  /**
   * Get all active (not dismissed or implemented) recommendations
   * @returns Array of active recommendations
   */
  public getRecommendations(): Recommendation[] {
    return this.recommendations.filter(rec => !rec.dismissed && !rec.implemented);
  }
  
  /**
   * Get all recommendations including dismissed and implemented ones
   * @returns Array of all recommendations
   */
  public getAllRecommendations(): Recommendation[] {
    return [...this.recommendations];
  }
  
  /**
   * Mark a recommendation as dismissed
   * @param id The recommendation ID
   */
  public dismissRecommendation(id: string): void {
    const recommendation = this.recommendations.find(rec => rec.id === id);
    
    if (recommendation) {
      recommendation.dismissed = true;
      this.saveRecommendations();
      this.emit('recommendation_dismissed', recommendation);
    }
  }
  
  /**
   * Mark a recommendation as implemented
   * @param id The recommendation ID
   */
  public implementRecommendation(id: string): void {
    const recommendation = this.recommendations.find(rec => rec.id === id);
    
    if (recommendation) {
      recommendation.implemented = true;
      this.saveRecommendations();
      this.emit('recommendation_implemented', recommendation);
    }
  }
  
  /**
   * Reset a recommendation to active status
   * @param id The recommendation ID
   */
  public resetRecommendation(id: string): void {
    const recommendation = this.recommendations.find(rec => rec.id === id);
    
    if (recommendation) {
      recommendation.dismissed = false;
      recommendation.implemented = false;
      this.saveRecommendations();
      this.emit('recommendation_reset', recommendation);
    }
  }
  
  /**
   * Get feature usage statistics
   * @returns Array of feature usage statistics
   */
  public getFeatureUsageStats(): FeatureUsageStats[] {
    return Array.from(this.featureUsageStats.values());
  }
  
  /**
   * Get workflow patterns
   * @returns Array of workflow patterns
   */
  public getWorkflowPatterns(): WorkflowPattern[] {
    return [...this.workflowPatterns];
  }
  
  /**
   * Set a user preference
   * @param key The preference key
   * @param value The preference value
   */
  public setUserPreference(key: string, value: any): void {
    this.userPreferences.set(key, value);
    this.saveRecommendations();
  }
  
  /**
   * Get a user preference
   * @param key The preference key
   * @param defaultValue Default value if preference doesn't exist
   * @returns The preference value or default value
   */
  public getUserPreference<T>(key: string, defaultValue: T): T {
    return this.userPreferences.has(key) ? this.userPreferences.get(key) : defaultValue;
  }
  
  /**
   * Clear all recommendations
   */
  public clearRecommendations(): void {
    this.recommendations = [];
    this.saveRecommendations();
    this.emit('recommendations_cleared');
  }
}

// Export singleton instance
export const recommendationEngine = RecommendationEngine.getInstance();
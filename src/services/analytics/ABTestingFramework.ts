import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import localforage from 'localforage';
import { anonymousUsageTracker } from './AnonymousUsageTracker';

/**
 * Test variant definition
 */
export interface TestVariant {
  id: string;
  name: string;
  description?: string;
  weight?: number; // Weight for random assignment (default: 1)
}

/**
 * A/B Test definition
 */
export interface ABTest {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  startDate: number;
  endDate?: number;
  variants: TestVariant[];
  minSampleSize?: number; // Minimum participants before drawing conclusions
  targetMetric: string; // The key metric to measure (e.g., 'timeOnPage', 'clickRate')
  secondaryMetrics?: string[]; // Additional metrics to track
  userProperties?: { // Optional filters for participant selection
    [key: string]: any;
  };
}

/**
 * Metric event data
 */
export interface MetricEvent {
  testId: string;
  variantId: string;
  userId: string;
  metric: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Test results
 */
export interface TestResults {
  testId: string;
  testName: string;
  participantCount: number;
  variantResults: {
    variantId: string;
    variantName: string;
    participantCount: number;
    metrics: {
      [metric: string]: {
        mean: number;
        median: number;
        min: number;
        max: number;
        stdDev: number;
        sampleSize: number;
      };
    };
  }[];
  winningVariant?: {
    variantId: string;
    variantName: string;
    improvement: number; // percentage improvement over control
    confidenceLevel: number; // statistical confidence (0-1)
  };
  isSignificant: boolean;
  confidenceLevel: number;
  startDate: number;
  endDate?: number;
  lastUpdated: number;
}

/**
 * A/B Testing Framework for experimental feature testing
 */
export class ABTestingFramework extends EventEmitter {
  private static instance: ABTestingFramework;
  private userId: string = '';
  private tests: Map<string, ABTest> = new Map();
  private userAssignments: Map<string, string> = new Map(); // testId -> variantId
  private metricEvents: MetricEvent[] = [];
  private results: Map<string, TestResults> = new Map();
  private isEnabled: boolean = true;
  private store: LocalForage;
  
  /**
   * Creates an instance of ABTestingFramework.
   * @private Use getInstance() instead
   */
  private constructor() {
    super();
    
    // Initialize local storage for A/B testing data
    this.store = localforage.createInstance({
      name: 'mcp-doctor-ab-testing',
      storeName: 'test-data'
    });
    
    // Generate a persistent anonymous user ID if not already present
    this.initializeUserId();
    
    // Load saved tests and assignments
    this.loadData();
  }
  
  /**
   * Get the singleton instance of ABTestingFramework
   * @returns The ABTestingFramework instance
   */
  public static getInstance(): ABTestingFramework {
    if (!ABTestingFramework.instance) {
      ABTestingFramework.instance = new ABTestingFramework();
    }
    return ABTestingFramework.instance;
  }
  
  /**
   * Initialize or retrieve the user ID
   * @private
   */
  private initializeUserId(): void {
    let userId = localStorage.getItem('mcp-doctor-ab-user-id');
    
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('mcp-doctor-ab-user-id', userId);
    }
    
    this.userId = userId;
  }
  
  /**
   * Load saved tests and assignments
   * @private
   */
  private async loadData(): Promise<void> {
    try {
      // Load tests
      const tests = await this.store.getItem<ABTest[]>('tests') || [];
      tests.forEach(test => {
        this.tests.set(test.id, test);
      });
      
      // Load user assignments
      const assignments = await this.store.getItem<Record<string, string>>('user-assignments') || {};
      Object.entries(assignments).forEach(([testId, variantId]) => {
        this.userAssignments.set(testId, variantId);
      });
      
      // Load metric events
      this.metricEvents = await this.store.getItem<MetricEvent[]>('metric-events') || [];
      
      // Load test results
      const results = await this.store.getItem<TestResults[]>('test-results') || [];
      results.forEach(result => {
        this.results.set(result.testId, result);
      });
      
      // Check enabled status
      const settings = await this.store.getItem<{ isEnabled: boolean }>('settings');
      if (settings) {
        this.isEnabled = settings.isEnabled;
      }
      
      // Process any active tests that the user hasn't been assigned to yet
      this.assignUserToActiveTests();
      
      this.emit('data_loaded');
    } catch (error) {
      console.error('Failed to load A/B testing data:', error);
    }
  }
  
  /**
   * Save data to persistent storage
   * @private
   */
  private async saveData(): Promise<void> {
    try {
      // Save tests
      await this.store.setItem('tests', Array.from(this.tests.values()));
      
      // Save user assignments
      const assignments: Record<string, string> = {};
      this.userAssignments.forEach((variantId, testId) => {
        assignments[testId] = variantId;
      });
      await this.store.setItem('user-assignments', assignments);
      
      // Save metric events (only store the last 1000 events to prevent excessive storage use)
      const recentEvents = this.metricEvents.slice(-1000);
      await this.store.setItem('metric-events', recentEvents);
      
      // Save test results
      await this.store.setItem('test-results', Array.from(this.results.values()));
      
      // Save settings
      await this.store.setItem('settings', { isEnabled: this.isEnabled });
    } catch (error) {
      console.error('Failed to save A/B testing data:', error);
    }
  }
  
  /**
   * Enable or disable A/B testing
   * @param enabled Whether to enable A/B testing
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.saveData();
    
    if (enabled) {
      this.emit('enabled');
      // Re-assign user to active tests
      this.assignUserToActiveTests();
    } else {
      this.emit('disabled');
    }
  }
  
  /**
   * Assign user to all active tests they haven't been assigned to yet
   * @private
   */
  private assignUserToActiveTests(): void {
    if (!this.isEnabled) return;
    
    const activeTests = Array.from(this.tests.values()).filter(test => test.isActive);
    
    for (const test of activeTests) {
      if (!this.userAssignments.has(test.id)) {
        this.assignUserToTest(test);
      }
    }
  }
  
  /**
   * Assign user to a specific test
   * @param test The test to assign the user to
   * @private
   */
  private assignUserToTest(test: ABTest): void {
    if (!test.isActive || !this.isEnabled) return;
    
    // Check if user matches any filters
    if (test.userProperties && !this.userMatchesProperties(test.userProperties)) {
      return;
    }
    
    // Randomly assign variant based on weights
    const variantId = this.getRandomVariant(test);
    
    if (variantId) {
      this.userAssignments.set(test.id, variantId);
      this.saveData();
      
      // Track assignment event
      anonymousUsageTracker.trackEvent(
        'ab_testing',
        'assignment',
        test.id,
        undefined,
        { variantId, testName: test.name }
      );
      
      this.emit('user_assigned', { testId: test.id, variantId });
    }
  }
  
  /**
   * Check if user matches the required properties for a test
   * @param properties Properties to match
   * @returns True if user matches all properties
   * @private
   */
  private userMatchesProperties(properties: Record<string, any>): boolean {
    // In a real implementation, this would check against user properties
    // For now, we'll just return true to include everyone
    return true;
  }
  
  /**
   * Get a random variant based on variant weights
   * @param test The test to select a variant from
   * @returns The selected variant ID
   * @private
   */
  private getRandomVariant(test: ABTest): string {
    const variants = test.variants;
    
    if (variants.length === 0) return '';
    if (variants.length === 1) return variants[0].id;
    
    // Calculate total weight
    const totalWeight = variants.reduce(
      (sum, variant) => sum + (variant.weight || 1),
      0
    );
    
    // Generate random value
    const random = Math.random() * totalWeight;
    
    // Find the variant based on weight
    let cumulativeWeight = 0;
    
    for (const variant of variants) {
      cumulativeWeight += variant.weight || 1;
      
      if (random < cumulativeWeight) {
        return variant.id;
      }
    }
    
    // Fallback to the first variant
    return variants[0].id;
  }
  
  /**
   * Create a new A/B test
   * @param test The test configuration
   * @returns The created test ID
   */
  public createTest(test: Omit<ABTest, 'id'>): string {
    const testId = uuidv4();
    
    const newTest: ABTest = {
      ...test,
      id: testId,
      startDate: test.startDate || Date.now()
    };
    
    this.tests.set(testId, newTest);
    this.saveData();
    
    // If test is active, assign user
    if (newTest.isActive) {
      this.assignUserToTest(newTest);
    }
    
    this.emit('test_created', newTest);
    
    return testId;
  }
  
  /**
   * Update an existing test
   * @param testId The test ID
   * @param updates Updates to apply to the test
   * @returns True if the test was updated
   */
  public updateTest(testId: string, updates: Partial<ABTest>): boolean {
    const test = this.tests.get(testId);
    
    if (!test) return false;
    
    // Don't allow changing the test ID
    delete (updates as any).id;
    
    const wasActive = test.isActive;
    
    // Update the test
    const updatedTest: ABTest = {
      ...test,
      ...updates
    };
    
    this.tests.set(testId, updatedTest);
    this.saveData();
    
    // If test was not active but is now, assign user
    if (!wasActive && updatedTest.isActive) {
      this.assignUserToTest(updatedTest);
    }
    
    this.emit('test_updated', updatedTest);
    
    return true;
  }
  
  /**
   * Delete a test
   * @param testId The test ID
   * @returns True if the test was deleted
   */
  public deleteTest(testId: string): boolean {
    if (!this.tests.has(testId)) return false;
    
    // Delete the test
    this.tests.delete(testId);
    
    // Delete user assignments
    this.userAssignments.delete(testId);
    
    // Delete test results
    this.results.delete(testId);
    
    // Filter out metric events for this test
    this.metricEvents = this.metricEvents.filter(event => event.testId !== testId);
    
    this.saveData();
    
    this.emit('test_deleted', testId);
    
    return true;
  }
  
  /**
   * Start a test
   * @param testId The test ID
   * @returns True if the test was started
   */
  public startTest(testId: string): boolean {
    const test = this.tests.get(testId);
    
    if (!test) return false;
    
    test.isActive = true;
    test.startDate = Date.now();
    
    this.tests.set(testId, test);
    this.saveData();
    
    // Assign user to the test
    this.assignUserToTest(test);
    
    this.emit('test_started', test);
    
    return true;
  }
  
  /**
   * Stop a test
   * @param testId The test ID
   * @returns True if the test was stopped
   */
  public stopTest(testId: string): boolean {
    const test = this.tests.get(testId);
    
    if (!test) return false;
    
    test.isActive = false;
    test.endDate = Date.now();
    
    this.tests.set(testId, test);
    this.saveData();
    
    // Analyze results
    this.analyzeTestResults(testId);
    
    this.emit('test_stopped', test);
    
    return true;
  }
  
  /**
   * Get all tests
   * @returns Array of all tests
   */
  public getAllTests(): ABTest[] {
    return Array.from(this.tests.values());
  }
  
  /**
   * Get active tests
   * @returns Array of active tests
   */
  public getActiveTests(): ABTest[] {
    return Array.from(this.tests.values()).filter(test => test.isActive);
  }
  
  /**
   * Get a specific test
   * @param testId The test ID
   * @returns The test or undefined if not found
   */
  public getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }
  
  /**
   * Get the variant the user is assigned to for a specific test
   * @param testId The test ID
   * @returns The variant ID or undefined if not assigned
   */
  public getUserVariant(testId: string): string | undefined {
    return this.userAssignments.get(testId);
  }
  
  /**
   * Track a metric event for a specific test
   * @param testId The test ID
   * @param metric The metric name
   * @param value The metric value
   * @param metadata Additional metadata
   * @returns True if the event was tracked
   */
  public trackMetric(
    testId: string,
    metric: string,
    value: number,
    metadata?: Record<string, any>
  ): boolean {
    if (!this.isEnabled) return false;
    
    const variantId = this.userAssignments.get(testId);
    
    if (!variantId) return false;
    
    const test = this.tests.get(testId);
    
    if (!test || !test.isActive) return false;
    
    // Create the metric event
    const event: MetricEvent = {
      testId,
      variantId,
      userId: this.userId,
      metric,
      value,
      timestamp: Date.now(),
      metadata
    };
    
    // Add to the events array
    this.metricEvents.push(event);
    
    // Track via usage tracker as well
    anonymousUsageTracker.trackEvent(
      'ab_testing',
      'metric',
      testId,
      value,
      { variantId, metric, ...metadata }
    );
    
    // Save periodically
    if (this.metricEvents.length % 10 === 0) {
      this.saveData();
    }
    
    this.emit('metric_tracked', event);
    
    return true;
  }
  
  /**
   * Analyze results for a specific test
   * @param testId The test ID
   * @returns The analysis results
   */
  public analyzeTestResults(testId: string): TestResults | undefined {
    const test = this.tests.get(testId);
    
    if (!test) return undefined;
    
    // Get all metric events for this test
    const events = this.metricEvents.filter(event => event.testId === testId);
    
    if (events.length === 0) return undefined;
    
    // Group events by variant and metric
    const variantMetrics: Map<string, Map<string, number[]>> = new Map();
    
    for (const event of events) {
      if (!variantMetrics.has(event.variantId)) {
        variantMetrics.set(event.variantId, new Map());
      }
      
      const metricMap = variantMetrics.get(event.variantId)!;
      
      if (!metricMap.has(event.metric)) {
        metricMap.set(event.metric, []);
      }
      
      metricMap.get(event.metric)!.push(event.value);
    }
    
    // Count participants per variant
    const variantParticipants: Map<string, Set<string>> = new Map();
    
    for (const event of events) {
      if (!variantParticipants.has(event.variantId)) {
        variantParticipants.set(event.variantId, new Set());
      }
      
      variantParticipants.get(event.variantId)!.add(event.userId);
    }
    
    // Calculate statistics for each variant and metric
    const variantResults: TestResults['variantResults'] = [];
    
    for (const variant of test.variants) {
      const metricsMap = variantMetrics.get(variant.id) || new Map();
      const participants = variantParticipants.get(variant.id) || new Set();
      
      const metrics: Record<string, any> = {};
      
      // Add the target metric if not present
      if (!metricsMap.has(test.targetMetric)) {
        metricsMap.set(test.targetMetric, []);
      }
      
      // Calculate statistics for each metric
      for (const [metricName, values] of metricsMap.entries()) {
        // Calculate basic statistics
        const stats = this.calculateStatistics(values);
        
        metrics[metricName] = {
          mean: stats.mean,
          median: stats.median,
          min: stats.min,
          max: stats.max,
          stdDev: stats.stdDev,
          sampleSize: values.length
        };
      }
      
      variantResults.push({
        variantId: variant.id,
        variantName: variant.name,
        participantCount: participants.size,
        metrics
      });
    }
    
    // Find the winning variant based on the target metric
    let winningVariant: TestResults['winningVariant'] | undefined;
    let isSignificant = false;
    let confidenceLevel = 0;
    
    if (variantResults.length >= 2 && test.targetMetric) {
      // Find the control variant (typically the first one)
      const controlVariant = variantResults[0];
      const controlMetric = controlVariant.metrics[test.targetMetric];
      
      if (controlMetric) {
        let bestImprovement = 0;
        let bestVariant = controlVariant;
        
        for (let i = 1; i < variantResults.length; i++) {
          const variant = variantResults[i];
          const variantMetric = variant.metrics[test.targetMetric];
          
          if (variantMetric && variantMetric.mean > 0) {
            const improvement = (variantMetric.mean - controlMetric.mean) / controlMetric.mean;
            
            // Calculate statistical significance (simplified for demonstration)
            const significance = this.calculateSignificance(
              controlMetric.mean,
              controlMetric.stdDev,
              controlMetric.sampleSize,
              variantMetric.mean,
              variantMetric.stdDev,
              variantMetric.sampleSize
            );
            
            if (improvement > bestImprovement && significance.isSignificant) {
              bestImprovement = improvement;
              bestVariant = variant;
              confidenceLevel = significance.confidenceLevel;
              isSignificant = true;
            }
          }
        }
        
        if (bestImprovement > 0 && isSignificant) {
          winningVariant = {
            variantId: bestVariant.variantId,
            variantName: bestVariant.variantName,
            improvement: bestImprovement * 100, // Convert to percentage
            confidenceLevel
          };
        }
      }
    }
    
    // Create the test results
    const results: TestResults = {
      testId,
      testName: test.name,
      participantCount: events.filter(event => event.metric === test.targetMetric)
        .reduce((set, event) => set.add(event.userId), new Set<string>()).size,
      variantResults,
      winningVariant,
      isSignificant,
      confidenceLevel,
      startDate: test.startDate,
      endDate: test.endDate,
      lastUpdated: Date.now()
    };
    
    // Save the results
    this.results.set(testId, results);
    this.saveData();
    
    this.emit('results_updated', results);
    
    return results;
  }
  
  /**
   * Calculate basic statistics for an array of numbers
   * @param values Array of numbers
   * @returns Statistical measures
   * @private
   */
  private calculateStatistics(values: number[]): {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
  } {
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        stdDev: 0
      };
    }
    
    // Sort values for median and min/max
    const sortedValues = [...values].sort((a, b) => a - b);
    
    // Calculate mean
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    
    // Calculate median
    const midIndex = Math.floor(sortedValues.length / 2);
    const median = sortedValues.length % 2 === 0
      ? (sortedValues[midIndex - 1] + sortedValues[midIndex]) / 2
      : sortedValues[midIndex];
    
    // Calculate min and max
    const min = sortedValues[0];
    const max = sortedValues[sortedValues.length - 1];
    
    // Calculate standard deviation
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      median,
      min,
      max,
      stdDev
    };
  }
  
  /**
   * Calculate statistical significance between two groups
   * This is a simplified implementation for demonstration purposes
   * In a real implementation, proper statistical tests should be used
   * @private
   */
  private calculateSignificance(
    mean1: number,
    stdDev1: number,
    sampleSize1: number,
    mean2: number,
    stdDev2: number,
    sampleSize2: number
  ): { isSignificant: boolean; confidenceLevel: number } {
    // Minimum sample size check
    if (sampleSize1 < 30 || sampleSize2 < 30) {
      return { isSignificant: false, confidenceLevel: 0 };
    }
    
    // Calculate standard error
    const se1 = stdDev1 / Math.sqrt(sampleSize1);
    const se2 = stdDev2 / Math.sqrt(sampleSize2);
    const se = Math.sqrt(se1 * se1 + se2 * se2);
    
    // Calculate z-score
    const z = Math.abs(mean1 - mean2) / se;
    
    // Convert z-score to confidence level
    // This is a simplified approximation
    let confidenceLevel = 0;
    
    if (z > 2.576) confidenceLevel = 0.99;
    else if (z > 1.96) confidenceLevel = 0.95;
    else if (z > 1.645) confidenceLevel = 0.9;
    else if (z > 1.28) confidenceLevel = 0.8;
    else confidenceLevel = 0.5 + 0.3 * (z / 1.28);
    
    // Significant if confidence level >= 0.95 (95%)
    const isSignificant = confidenceLevel >= 0.95;
    
    return { isSignificant, confidenceLevel };
  }
  
  /**
   * Get results for a specific test
   * @param testId The test ID
   * @returns The test results or undefined if not available
   */
  public getTestResults(testId: string): TestResults | undefined {
    return this.results.get(testId);
  }
  
  /**
   * Get results for all tests
   * @returns Array of all test results
   */
  public getAllTestResults(): TestResults[] {
    return Array.from(this.results.values());
  }
  
  /**
   * Clear all A/B testing data
   */
  public clearAllData(): void {
    this.tests.clear();
    this.userAssignments.clear();
    this.metricEvents = [];
    this.results.clear();
    
    this.saveData();
    
    this.emit('data_cleared');
  }
}

// Export singleton instance
export const abTestingFramework = ABTestingFramework.getInstance();
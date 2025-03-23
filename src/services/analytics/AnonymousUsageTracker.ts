import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import localforage from 'localforage';

/**
 * Event type for tracking user actions
 */
export interface UserActionEvent {
  id: string;
  timestamp: number;
  sessionId: string;
  category: string;
  action: string;
  target?: string;
  value?: number;
  metadata?: Record<string, any>;
}

/**
 * Usage summary structure
 */
export interface UsageSummary {
  mostUsedFeatures: Array<{feature: string, count: number}>;
  averageSessionDuration: number;
  totalSessions: number;
  commonWorkflows: Array<{workflow: string, count: number}>;
  userRetention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

/**
 * Service for anonymously tracking user interactions with the application
 * while respecting privacy and allowing users to opt-out.
 */
export class AnonymousUsageTracker extends EventEmitter {
  private static instance: AnonymousUsageTracker;
  private isEnabled: boolean = false;
  private sessionId: string = '';
  private sessionStartTime: number = 0;
  private eventsStore: localforage;
  private bufferSize: number = 50;
  private eventBuffer: UserActionEvent[] = [];
  private sendInterval: number = 15 * 60 * 1000; // 15 minutes
  private sendIntervalId: NodeJS.Timeout | null = null;
  private anonymizeIpAddress: boolean = true;
  private trackingEndpoint: string = '/api/analytics/track';
  
  /**
   * Creates an instance of AnonymousUsageTracker.
   * @private Use getInstance() instead
   */
  private constructor() {
    super();
    
    // Initialize the store for events
    this.eventsStore = localforage.createInstance({
      name: 'mcp-doctor-analytics',
      storeName: 'usage-events'
    });
    
    // Check user preferences for tracking
    this.loadSettings();
  }
  
  /**
   * Get the singleton instance of AnonymousUsageTracker
   * @returns The AnonymousUsageTracker instance
   */
  public static getInstance(): AnonymousUsageTracker {
    if (!AnonymousUsageTracker.instance) {
      AnonymousUsageTracker.instance = new AnonymousUsageTracker();
    }
    return AnonymousUsageTracker.instance;
  }
  
  /**
   * Load tracking settings from local storage
   * @private
   */
  private async loadSettings(): Promise<void> {
    try {
      const settings = JSON.parse(localStorage.getItem('analytics-settings') || '{}');
      this.isEnabled = settings.isEnabled ?? false;
      this.anonymizeIpAddress = settings.anonymizeIpAddress ?? true;
      this.bufferSize = settings.bufferSize ?? 50;
      this.sendInterval = settings.sendInterval ?? 15 * 60 * 1000;
      
      if (this.isEnabled) {
        this.startSession();
        this.startPeriodicSend();
      }
    } catch (error) {
      console.error('Failed to load analytics settings:', error);
      this.isEnabled = false;
    }
  }
  
  /**
   * Save tracking settings to local storage
   * @private
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('analytics-settings', JSON.stringify({
        isEnabled: this.isEnabled,
        anonymizeIpAddress: this.anonymizeIpAddress,
        bufferSize: this.bufferSize,
        sendInterval: this.sendInterval
      }));
    } catch (error) {
      console.error('Failed to save analytics settings:', error);
    }
  }
  
  /**
   * Start a new tracking session
   * @private
   */
  private startSession(): void {
    this.sessionId = uuidv4();
    this.sessionStartTime = Date.now();
    
    // Track session start event
    this.trackEvent('system', 'session_start');
    
    // Setup window beforeunload to track session end
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }
  
  /**
   * End the current tracking session
   * @private
   */
  private endSession(): void {
    if (!this.sessionId) return;
    
    const sessionDuration = Date.now() - this.sessionStartTime;
    
    // Track session end event with duration
    this.trackEvent('system', 'session_end', undefined, sessionDuration);
    
    // Immediately try to send buffered events
    this.sendEvents(true);
    
    // Reset session data
    this.sessionId = '';
    this.sessionStartTime = 0;
    
    // Remove beforeunload listener
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
  
  /**
   * Handle beforeunload event to end session
   * @private
   */
  private handleBeforeUnload = (): void => {
    this.endSession();
  };
  
  /**
   * Start periodic sending of events
   * @private
   */
  private startPeriodicSend(): void {
    if (this.sendIntervalId) {
      clearInterval(this.sendIntervalId);
    }
    
    this.sendIntervalId = setInterval(() => {
      this.sendEvents(false);
    }, this.sendInterval);
  }
  
  /**
   * Stop periodic sending of events
   * @private
   */
  private stopPeriodicSend(): void {
    if (this.sendIntervalId) {
      clearInterval(this.sendIntervalId);
      this.sendIntervalId = null;
    }
  }
  
  /**
   * Enable usage tracking
   * @param consent Whether the user has given consent
   */
  public enable(consent: boolean = false): void {
    if (consent && !this.isEnabled) {
      this.isEnabled = true;
      this.saveSettings();
      this.startSession();
      this.startPeriodicSend();
      this.emit('enabled');
    }
  }
  
  /**
   * Disable usage tracking
   */
  public disable(): void {
    if (this.isEnabled) {
      this.endSession();
      this.stopPeriodicSend();
      this.isEnabled = false;
      this.saveSettings();
      this.emit('disabled');
    }
  }
  
  /**
   * Set tracking options
   * @param options Options for tracking
   */
  public setOptions(options: {
    anonymizeIpAddress?: boolean;
    bufferSize?: number;
    sendInterval?: number;
  }): void {
    if (options.anonymizeIpAddress !== undefined) {
      this.anonymizeIpAddress = options.anonymizeIpAddress;
    }
    
    if (options.bufferSize !== undefined && options.bufferSize > 0) {
      this.bufferSize = options.bufferSize;
    }
    
    if (options.sendInterval !== undefined && options.sendInterval > 0) {
      this.sendInterval = options.sendInterval;
      if (this.isEnabled && this.sendIntervalId) {
        this.stopPeriodicSend();
        this.startPeriodicSend();
      }
    }
    
    this.saveSettings();
  }
  
  /**
   * Track a user action event
   * @param category Event category
   * @param action Event action
   * @param target Optional target of the action
   * @param value Optional numeric value associated with the action
   * @param metadata Optional additional data
   * @returns Event ID if tracking is enabled, null otherwise
   */
  public trackEvent(
    category: string,
    action: string,
    target?: string,
    value?: number,
    metadata?: Record<string, any>
  ): string | null {
    if (!this.isEnabled || !this.sessionId) {
      return null;
    }
    
    const event: UserActionEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      category,
      action,
      target,
      value,
      metadata
    };
    
    // Add event to buffer
    this.eventBuffer.push(event);
    
    // Emit event for subscribers
    this.emit('event', event);
    
    // If buffer is full, schedule sending
    if (this.eventBuffer.length >= this.bufferSize) {
      setTimeout(() => this.sendEvents(false), 0);
    }
    
    return event.id;
  }
  
  /**
   * Send buffered events to the server or store locally if offline
   * @param immediate Whether to send immediately regardless of buffer size
   * @private
   */
  private async sendEvents(immediate: boolean = false): Promise<void> {
    if (!this.isEnabled || (!immediate && this.eventBuffer.length === 0)) {
      return;
    }
    
    const eventsToSend = [...this.eventBuffer];
    this.eventBuffer = [];
    
    try {
      // Check for network connectivity
      if (navigator.onLine) {
        // Attempt to send to server
        await this.sendToServer(eventsToSend);
      } else {
        // If offline, store locally for later sync
        await this.storeEvents(eventsToSend);
      }
      
      this.emit('events_sent', eventsToSend.length);
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      
      // Store events for later retry
      await this.storeEvents(eventsToSend);
      
      this.emit('events_send_failed', error);
    }
  }
  
  /**
   * Send events to the analytics server
   * @param events Events to send
   * @private
   */
  private async sendToServer(events: UserActionEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    try {
      const response = await fetch(this.trackingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events,
          anonymizeIp: this.anonymizeIpAddress
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending analytics data:', error);
      throw error; // Re-throw to trigger local storage fallback
    }
  }
  
  /**
   * Store events locally for later sync
   * @param events Events to store
   * @private
   */
  private async storeEvents(events: UserActionEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    try {
      // Get existing stored events
      const storedEvents = await this.eventsStore.getItem<UserActionEvent[]>('pending-events') || [];
      
      // Combine with new events
      const combinedEvents = [...storedEvents, ...events];
      
      // Store back
      await this.eventsStore.setItem('pending-events', combinedEvents);
    } catch (error) {
      console.error('Failed to store analytics events locally:', error);
      // In this case, we've lost the events unfortunately
    }
  }
  
  /**
   * Sync stored events to the server when coming back online
   * @private
   */
  public async syncOfflineEvents(): Promise<void> {
    if (!this.isEnabled) return;
    
    try {
      const pendingEvents = await this.eventsStore.getItem<UserActionEvent[]>('pending-events') || [];
      
      if (pendingEvents.length === 0) return;
      
      // Try to send pending events
      await this.sendToServer(pendingEvents);
      
      // If successful, clear pending events
      await this.eventsStore.removeItem('pending-events');
      
      this.emit('offline_events_synced', pendingEvents.length);
    } catch (error) {
      console.error('Failed to sync offline analytics events:', error);
      this.emit('offline_events_sync_failed', error);
    }
  }
  
  /**
   * Get a summary of usage data
   * @returns Promise resolving to usage summary
   */
  public async getUsageSummary(): Promise<UsageSummary> {
    // This would typically fetch from server or process local data
    // For this implementation, we'll return mock data
    return {
      mostUsedFeatures: [
        { feature: 'Server Monitoring', count: 156 },
        { feature: 'Configuration Editor', count: 89 },
        { feature: 'Log Explorer', count: 67 },
        { feature: 'Performance Profiler', count: 43 }
      ],
      averageSessionDuration: 1230, // in seconds
      totalSessions: 42,
      commonWorkflows: [
        { workflow: 'Config → Deploy → Monitor', count: 28 },
        { workflow: 'Monitor → Logs → Debug', count: 23 },
        { workflow: 'Install → Config → Test', count: 19 }
      ],
      userRetention: {
        daily: 0.76,
        weekly: 0.64,
        monthly: 0.52
      }
    };
  }
  
  /**
   * Clear all stored analytics data (for privacy)
   */
  public async clearAllData(): Promise<void> {
    try {
      await this.eventsStore.clear();
      this.eventBuffer = [];
      
      this.emit('data_cleared');
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
      this.emit('data_clear_failed', error);
    }
  }
}

// Export singleton instance
export const anonymousUsageTracker = AnonymousUsageTracker.getInstance();

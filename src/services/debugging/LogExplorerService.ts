import * as fs from 'fs-extra';
import * as path from 'path';
import { EventEmitter } from 'events';
import { LogService } from '../logging/LogService';

/**
 * Interface for a log entry
 */
export interface LogEntry {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'trace' | 'unknown';
  message: string;
  source?: string;
  details?: Record<string, any>;
  requestId?: string;
  userId?: string;
  lineNumber: number;
  raw: string;
}

/**
 * Interface for log file metadata
 */
export interface LogFileInfo {
  path: string;
  name: string;
  size: number;
  modifiedTime: Date;
  createdTime: Date;
  linesCount: number;
  errorCount: number;
  warnCount: number;
  logEntries?: LogEntry[];
}

/**
 * Interface for a log filter
 */
export interface LogFilter {
  level?: ('error' | 'warn' | 'info' | 'debug' | 'verbose' | 'trace')[];
  dateRange?: { start?: Date; end?: Date };
  search?: string;
  source?: string[];
  requestId?: string;
  userId?: string;
  custom?: (entry: LogEntry) => boolean;
}

/**
 * Service for exploring and analyzing log files
 */
export class LogExplorerService extends EventEmitter {
  private knownLogPatterns: RegExp[] = [
    // JSON log pattern (most common)
    /^\s*(\{.*\})\s*$/,
    
    // Winston/Bunyan style logs
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z) - (error|warn|info|debug|verbose|trace): (.*)$/i,
    
    // Standard format with timestamp and level
    /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{3}) \[(error|warn|info|debug|verbose|trace)\] (.*)$/i,
    
    // Simple format with square brackets for level
    /^\[(error|warn|info|debug|verbose|trace)\] (.*)$/i,
    
    // Standard Node.js console output format
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z) (error|warn|info|debug|verbose|trace) (.*)$/i,
    
    // Electron main process logs
    /^\[(\d{2}:\d{2}:\d{2}.\d{3})\] \[(error|warn|info|debug|verbose|trace)\] (.*)$/i
  ];
  
  // Known timestamp formats and their RegExp patterns
  private timestampFormats: Array<{ pattern: RegExp; format: string }> = [
    { pattern: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/, format: 'ISO' },
    { pattern: /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.\d{3}/, format: 'Standard' },
    { pattern: /\d{2}:\d{2}:\d{2}.\d{3}/, format: 'Time-only' }
  ];
  
  private cachedLogFiles: Map<string, LogFileInfo> = new Map();
  
  constructor(private logService: LogService) {
    super();
  }
  
  /**
   * Scan a directory for log files
   * @param directoryPath Directory to scan
   * @param recursively Whether to scan subdirectories
   * @param includePatterns Optional patterns to include files
   */
  public async scanDirectory(
    directoryPath: string,
    recursively: boolean = false,
    includePatterns: string[] = ['.log', '.txt']
  ): Promise<LogFileInfo[]> {
    try {
      this.logService.info('LogExplorerService', `Scanning directory: ${directoryPath}`);
      
      const logFiles: LogFileInfo[] = [];
      
      // Function to scan a directory
      const scanDir = async (dirPath: string) => {
        // Read directory contents
        const items = await fs.readdir(dirPath);
        
        // Process each item
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = await fs.stat(itemPath);
          
          if (stats.isDirectory() && recursively) {
            // Recursively scan subdirectory
            await scanDir(itemPath);
          } else if (stats.isFile()) {
            // Check if file matches include patterns
            const isLogFile = includePatterns.some(pattern => 
              item.toLowerCase().includes(pattern.toLowerCase())
            );
            
            if (isLogFile) {
              // Quick preview to count errors and warnings
              const { errorCount, warnCount, linesCount } = await this.quickPreviewLogFile(itemPath);
              
              // Create log file info
              const logFile: LogFileInfo = {
                path: itemPath,
                name: item,
                size: stats.size,
                modifiedTime: stats.mtime,
                createdTime: stats.ctime,
                linesCount,
                errorCount,
                warnCount
              };
              
              // Add to results
              logFiles.push(logFile);
              
              // Cache log file info
              this.cachedLogFiles.set(itemPath, logFile);
            }
          }
        }
      };
      
      // Start scanning
      await scanDir(directoryPath);
      
      // Sort by modification time (newest first)
      logFiles.sort((a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime());
      
      this.logService.info('LogExplorerService', `Found ${logFiles.length} log files`);
      return logFiles;
    } catch (error) {
      this.logService.error('LogExplorerService', `Error scanning directory: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Quick preview of a log file to count errors and warnings
   * @param filePath Path to log file
   */
  private async quickPreviewLogFile(filePath: string): Promise<{ errorCount: number; warnCount: number; linesCount: number }> {
    try {
      // Default counts
      let errorCount = 0;
      let warnCount = 0;
      let linesCount = 0;
      
      // Read the file line by line
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Count errors and warnings
      for (const line of lines) {
        if (line.trim()) {
          linesCount++;
          
          // Check for errors and warnings
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes('error') || lowerLine.includes('"level":"error"')) {
            errorCount++;
          } else if (lowerLine.includes('warn') || lowerLine.includes('"level":"warn"')) {
            warnCount++;
          }
        }
      }
      
      return { errorCount, warnCount, linesCount };
    } catch (error) {
      this.logService.error('LogExplorerService', `Error previewing log file: ${error.message}`);
      return { errorCount: 0, warnCount: 0, linesCount: 0 };
    }
  }
  
  /**
   * Parse a log file
   * @param filePath Path to log file
   * @param maxLines Maximum number of lines to parse (0 for all)
   * @param startLine Line to start parsing from (0-based)
   */
  public async parseLogFile(
    filePath: string,
    maxLines: number = 0,
    startLine: number = 0
  ): Promise<LogEntry[]> {
    try {
      this.logService.info('LogExplorerService', `Parsing log file: ${filePath}`);
      
      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      const entries: LogEntry[] = [];
      let lineNumber = 0;
      
      // Parse each line
      for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) {
          lineNumber++;
          continue;
        }
        
        // Skip lines before startLine
        if (lineNumber < startLine) {
          lineNumber++;
          continue;
        }
        
        // Parse log entry
        const entry = this.parseLogLine(line, lineNumber);
        if (entry) {
          entries.push(entry);
        }
        
        lineNumber++;
        
        // Break if maxLines is reached
        if (maxLines > 0 && entries.length >= maxLines) {
          break;
        }
      }
      
      // Update cache with parsed entries
      if (this.cachedLogFiles.has(filePath)) {
        const cachedInfo = this.cachedLogFiles.get(filePath)!;
        cachedInfo.logEntries = entries;
        this.cachedLogFiles.set(filePath, cachedInfo);
      }
      
      this.logService.info('LogExplorerService', `Parsed ${entries.length} log entries`);
      return entries;
    } catch (error) {
      this.logService.error('LogExplorerService', `Error parsing log file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Parse a single log line
   * @param line Log line to parse
   * @param lineNumber Line number
   */
  private parseLogLine(line: string, lineNumber: number): LogEntry | null {
    try {
      // Try to parse as JSON
      if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
        try {
          const jsonEntry = JSON.parse(line);
          
          // Extract fields from JSON
          const timestamp = jsonEntry.timestamp || jsonEntry.time || jsonEntry.date || new Date();
          const level = (jsonEntry.level || jsonEntry.severity || 'info').toLowerCase();
          const message = jsonEntry.message || jsonEntry.msg || jsonEntry.text || '';
          const source = jsonEntry.source || jsonEntry.logger || jsonEntry.component || undefined;
          
          // Create log entry
          return {
            timestamp: typeof timestamp === 'string' ? new Date(timestamp) : new Date(),
            level: this.normalizeLogLevel(level),
            message,
            source,
            details: jsonEntry,
            requestId: jsonEntry.requestId || jsonEntry.request_id || undefined,
            userId: jsonEntry.userId || jsonEntry.user_id || undefined,
            lineNumber,
            raw: line
          };
        } catch (error) {
          // Not valid JSON, continue with other patterns
        }
      }
      
      // Try known log patterns
      for (const pattern of this.knownLogPatterns) {
        const match = line.match(pattern);
        if (match) {
          // Match found, extract fields based on pattern
          if (pattern === this.knownLogPatterns[0]) {
            // Should be handled by the JSON parser above
            continue;
          } else if (pattern === this.knownLogPatterns[1]) {
            // Winston/Bunyan style logs
            const [, timestamp, level, message] = match;
            return {
              timestamp: new Date(timestamp),
              level: this.normalizeLogLevel(level),
              message,
              lineNumber,
              raw: line
            };
          } else if (pattern === this.knownLogPatterns[2]) {
            // Standard format with timestamp and level
            const [, timestamp, level, message] = match;
            return {
              timestamp: new Date(timestamp),
              level: this.normalizeLogLevel(level),
              message,
              lineNumber,
              raw: line
            };
          } else if (pattern === this.knownLogPatterns[3]) {
            // Simple format with square brackets for level
            const [, level, message] = match;
            return {
              timestamp: new Date(),
              level: this.normalizeLogLevel(level),
              message,
              lineNumber,
              raw: line
            };
          } else if (pattern === this.knownLogPatterns[4]) {
            // Standard Node.js console output format
            const [, timestamp, level, message] = match;
            return {
              timestamp: new Date(timestamp),
              level: this.normalizeLogLevel(level),
              message,
              lineNumber,
              raw: line
            };
          } else if (pattern === this.knownLogPatterns[5]) {
            // Electron main process logs
            const [, timestamp, level, message] = match;
            
            // Parse time-only timestamp
            const now = new Date();
            const [hours, minutes, seconds] = timestamp.split(':');
            const milliseconds = seconds.split('.')[1] || '000';
            
            now.setHours(parseInt(hours, 10));
            now.setMinutes(parseInt(minutes, 10));
            now.setSeconds(parseInt(seconds, 10));
            now.setMilliseconds(parseInt(milliseconds, 10));
            
            return {
              timestamp: now,
              level: this.normalizeLogLevel(level),
              message,
              lineNumber,
              raw: line
            };
          }
        }
      }
      
      // If no pattern matched, treat as raw text
      return {
        timestamp: new Date(),
        level: 'info',
        message: line,
        lineNumber,
        raw: line
      };
    } catch (error) {
      // If parsing fails, return a basic entry
      return {
        timestamp: new Date(),
        level: 'unknown',
        message: line,
        lineNumber,
        raw: line
      };
    }
  }
  
  /**
   * Normalize log level
   * @param level Log level to normalize
   */
  private normalizeLogLevel(level: string): LogEntry['level'] {
    level = level.toLowerCase();
    
    if (level.includes('error') || level.includes('severe') || level.includes('crit')) {
      return 'error';
    } else if (level.includes('warn')) {
      return 'warn';
    } else if (level.includes('info')) {
      return 'info';
    } else if (level.includes('debug')) {
      return 'debug';
    } else if (level.includes('verbose') || level.includes('trace')) {
      return 'trace';
    } else {
      return 'unknown';
    }
  }
  
  /**
   * Apply filters to log entries
   * @param entries Log entries to filter
   * @param filter Filter to apply
   */
  public filterLogEntries(entries: LogEntry[], filter: LogFilter): LogEntry[] {
    try {
      // Return original array if no filter
      if (!filter || Object.keys(filter).length === 0) {
        return entries;
      }
      
      // Apply filters
      return entries.filter(entry => {
        // Filter by level
        if (filter.level && filter.level.length > 0) {
          if (!filter.level.includes(entry.level as any)) {
            return false;
          }
        }
        
        // Filter by date range
        if (filter.dateRange) {
          if (filter.dateRange.start && entry.timestamp < filter.dateRange.start) {
            return false;
          }
          
          if (filter.dateRange.end && entry.timestamp > filter.dateRange.end) {
            return false;
          }
        }
        
        // Filter by search text
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          const messageLower = entry.message.toLowerCase();
          const rawLower = entry.raw.toLowerCase();
          
          if (!messageLower.includes(searchLower) && !rawLower.includes(searchLower)) {
            return false;
          }
        }
        
        // Filter by source
        if (filter.source && filter.source.length > 0) {
          if (!entry.source || !filter.source.includes(entry.source)) {
            return false;
          }
        }
        
        // Filter by request ID
        if (filter.requestId) {
          if (!entry.requestId || entry.requestId !== filter.requestId) {
            return false;
          }
        }
        
        // Filter by user ID
        if (filter.userId) {
          if (!entry.userId || entry.userId !== filter.userId) {
            return false;
          }
        }
        
        // Apply custom filter
        if (filter.custom) {
          return filter.custom(entry);
        }
        
        return true;
      });
    } catch (error) {
      this.logService.error('LogExplorerService', `Error filtering log entries: ${error.message}`);
      return entries;
    }
  }
  
  /**
   * Extract common patterns from log entries
   * @param entries Log entries to analyze
   */
  public analyzeLogPatterns(entries: LogEntry[]): Record<string, any> {
    try {
      const analysis: Record<string, any> = {
        totalEntries: entries.length,
        levelDistribution: {} as Record<string, number>,
        timeDistribution: {
          hourly: {} as Record<string, number>,
          daily: {} as Record<string, number>
        },
        sources: {} as Record<string, number>,
        commonMessages: [] as { message: string; count: number }[],
        requestIds: {} as Record<string, number>,
        userIds: {} as Record<string, number>
      };
      
      // Process each entry
      for (const entry of entries) {
        // Count log levels
        const level = entry.level || 'unknown';
        analysis.levelDistribution[level] = (analysis.levelDistribution[level] || 0) + 1;
        
        // Count time distribution
        const hour = entry.timestamp.getHours().toString().padStart(2, '0');
        analysis.timeDistribution.hourly[hour] = (analysis.timeDistribution.hourly[hour] || 0) + 1;
        
        const day = entry.timestamp.toISOString().split('T')[0];
        analysis.timeDistribution.daily[day] = (analysis.timeDistribution.daily[day] || 0) + 1;
        
        // Count sources
        if (entry.source) {
          analysis.sources[entry.source] = (analysis.sources[entry.source] || 0) + 1;
        }
        
        // Count request IDs
        if (entry.requestId) {
          analysis.requestIds[entry.requestId] = (analysis.requestIds[entry.requestId] || 0) + 1;
        }
        
        // Count user IDs
        if (entry.userId) {
          analysis.userIds[entry.userId] = (analysis.userIds[entry.userId] || 0) + 1;
        }
        
        // Find common messages (simplify messages first)
        const simplifiedMessage = this.simplifyMessage(entry.message);
        
        const existingMessage = analysis.commonMessages.find(m => m.message === simplifiedMessage);
        if (existingMessage) {
          existingMessage.count++;
        } else {
          analysis.commonMessages.push({ message: simplifiedMessage, count: 1 });
        }
      }
      
      // Sort common messages by count
      analysis.commonMessages.sort((a, b) => b.count - a.count);
      
      // Take top 20 common messages
      analysis.commonMessages = analysis.commonMessages.slice(0, 20);
      
      return analysis;
    } catch (error) {
      this.logService.error('LogExplorerService', `Error analyzing log patterns: ${error.message}`);
      return { error: error.message };
    }
  }
  
  /**
   * Simplify a message to find common patterns
   * @param message Message to simplify
   */
  private simplifyMessage(message: string): string {
    try {
      // Simplify numbers
      message = message.replace(/\d+/g, 'N');
      
      // Simplify UUIDs, object IDs, etc.
      message = message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID');
      message = message.replace(/[0-9a-f]{24}/gi, 'ID');
      
      // Simplify paths
      message = message.replace(/\/[\w\/.-]+/g, '/PATH');
      
      // Simplify URLs
      message = message.replace(/https?:\/\/[\w.-]+/g, 'URL');
      
      // Simplify IP addresses
      message = message.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, 'IP');
      
      // Trim and truncate
      message = message.trim();
      if (message.length > 100) {
        message = message.substring(0, 100) + '...';
      }
      
      return message;
    } catch (error) {
      return message;
    }
  }
  
  /**
   * Extract unique sources from log entries
   * @param entries Log entries
   */
  public extractSources(entries: LogEntry[]): string[] {
    const sources = new Set<string>();
    
    for (const entry of entries) {
      if (entry.source) {
        sources.add(entry.source);
      }
    }
    
    return Array.from(sources).sort();
  }
  
  /**
   * Extract unique request IDs from log entries
   * @param entries Log entries
   */
  public extractRequestIds(entries: LogEntry[]): string[] {
    const requestIds = new Set<string>();
    
    for (const entry of entries) {
      if (entry.requestId) {
        requestIds.add(entry.requestId);
      }
    }
    
    return Array.from(requestIds).sort();
  }
  
  /**
   * Extract unique user IDs from log entries
   * @param entries Log entries
   */
  public extractUserIds(entries: LogEntry[]): string[] {
    const userIds = new Set<string>();
    
    for (const entry of entries) {
      if (entry.userId) {
        userIds.add(entry.userId);
      }
    }
    
    return Array.from(userIds).sort();
  }
  
  /**
   * Group log entries by a field
   * @param entries Log entries
   * @param field Field to group by
   */
  public groupEntriesBy(
    entries: LogEntry[],
    field: 'level' | 'source' | 'requestId' | 'userId' | 'day' | 'hour'
  ): Record<string, LogEntry[]> {
    const grouped: Record<string, LogEntry[]> = {};
    
    for (const entry of entries) {
      let key: string;
      
      switch (field) {
        case 'level':
          key = entry.level || 'unknown';
          break;
        case 'source':
          key = entry.source || 'unknown';
          break;
        case 'requestId':
          key = entry.requestId || 'unknown';
          break;
        case 'userId':
          key = entry.userId || 'unknown';
          break;
        case 'day':
          key = entry.timestamp.toISOString().split('T')[0];
          break;
        case 'hour':
          key = entry.timestamp.getHours().toString().padStart(2, '0');
          break;
        default:
          key = 'unknown';
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      
      grouped[key].push(entry);
    }
    
    return grouped;
  }
  
  /**
   * Get a cached log file info
   * @param filePath Path to log file
   */
  public getCachedLogFile(filePath: string): LogFileInfo | null {
    return this.cachedLogFiles.get(filePath) || null;
  }
  
  /**
   * Clear the log file cache
   */
  public clearCache(): void {
    this.cachedLogFiles.clear();
  }
}
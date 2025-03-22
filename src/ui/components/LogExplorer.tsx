import * as React from 'react';
import { LogEntry, LogFileInfo, LogFilter } from '../../services/debugging/LogExplorerService';
import { AppContext } from '../contexts/AppContext';

// Interface for component props
interface LogExplorerProps {
  initialDirectories?: string[];
  onClose?: () => void;
}

// Interface for component state
interface LogExplorerState {
  selectedDirectory: string;
  logFiles: LogFileInfo[];
  selectedFile: LogFileInfo | null;
  logEntries: LogEntry[];
  currentPage: number;
  pageSize: number;
  filter: LogFilter;
  isLoading: boolean;
  isAnalyzing: boolean;
  analysis: Record<string, any> | null;
  directoryIsRecursive: boolean;
  searchQuery: string;
  selectedLevel: string;
  selectedSource: string;
  selectedRequestId: string;
  dateRange: { start?: Date; end?: Date };
  sources: string[];
  requestIds: string[];
  userIds: string[];
  showFilters: boolean;
  isSearching: boolean;
}

/**
 * Component for exploring and analyzing log files
 */
export default class LogExplorer extends React.Component<LogExplorerProps, LogExplorerState> {
  static contextType = AppContext;
  context!: React.ContextType<typeof AppContext>;

  constructor(props: LogExplorerProps) {
    super(props);

    this.state = {
      selectedDirectory: props.initialDirectories?.[0] || '',
      logFiles: [],
      selectedFile: null,
      logEntries: [],
      currentPage: 1,
      pageSize: 100,
      filter: {},
      isLoading: false,
      isAnalyzing: false,
      analysis: null,
      directoryIsRecursive: false,
      searchQuery: '',
      selectedLevel: '',
      selectedSource: '',
      selectedRequestId: '',
      dateRange: {},
      sources: [],
      requestIds: [],
      userIds: [],
      showFilters: false,
      isSearching: false
    };
  }

  // Load data when component mounts
  componentDidMount() {
    if (this.state.selectedDirectory) {
      this.scanDirectory(this.state.selectedDirectory);
    }
  }

  // Scan a directory for log files
  scanDirectory = async (directoryPath: string) => {
    try {
      this.setState({ isLoading: true });

      const { directoryIsRecursive } = this.state;
      const logExplorerService = this.context.logExplorerService;

      // Scan directory
      const logFiles = await logExplorerService.scanDirectory(
        directoryPath,
        directoryIsRecursive
      );

      // Update state
      this.setState({
        selectedDirectory: directoryPath,
        logFiles,
        selectedFile: null,
        logEntries: [],
        analysis: null,
        isLoading: false
      });
    } catch (error) {
      this.context.appManager.showError('Scan Failed', error);
      this.setState({ isLoading: false });
    }
  };

  // Change selected directory
  handleDirectoryChange = (directoryPath: string) => {
    this.scanDirectory(directoryPath);
  };

  // Toggle recursive directory scan
  toggleRecursive = () => {
    this.setState(
      { directoryIsRecursive: !this.state.directoryIsRecursive },
      () => {
        if (this.state.selectedDirectory) {
          this.scanDirectory(this.state.selectedDirectory);
        }
      }
    );
  };

  // Browse for a directory
  browseDirectory = async () => {
    try {
      // In a real implementation, this would use Electron's dialog.showOpenDialog
      // For this example, we'll prompt the user
      const directoryPath = prompt('Enter directory path:', this.state.selectedDirectory);

      if (directoryPath) {
        this.scanDirectory(directoryPath);
      }
    } catch (error) {
      this.context.appManager.showError('Browse Failed', error);
    }
  };

  // Select a log file
  selectLogFile = async (file: LogFileInfo) => {
    try {
      this.setState({ isLoading: true, selectedFile: file });

      const logExplorerService = this.context.logExplorerService;

      // Parse log file
      const logEntries = await logExplorerService.parseLogFile(file.path);

      // Extract metadata
      const sources = logExplorerService.extractSources(logEntries);
      const requestIds = logExplorerService.extractRequestIds(logEntries);
      const userIds = logExplorerService.extractUserIds(logEntries);

      // Update state
      this.setState({
        logEntries,
        currentPage: 1,
        filter: {},
        sources,
        requestIds,
        userIds,
        searchQuery: '',
        selectedLevel: '',
        selectedSource: '',
        selectedRequestId: '',
        dateRange: {},
        isLoading: false
      });
    } catch (error) {
      this.context.appManager.showError('Parse Failed', error);
      this.setState({ isLoading: false });
    }
  };

  // Apply filters to log entries
  applyFilters = () => {
    try {
      const { 
        searchQuery, 
        selectedLevel, 
        selectedSource, 
        selectedRequestId,
        dateRange,
        logEntries 
      } = this.state;

      const logExplorerService = this.context.logExplorerService;

      // Build filter
      const filter: LogFilter = {};

      if (selectedLevel) {
        filter.level = [selectedLevel as any];
      }

      if (selectedSource) {
        filter.source = [selectedSource];
      }

      if (selectedRequestId) {
        filter.requestId = selectedRequestId;
      }

      if (dateRange.start || dateRange.end) {
        filter.dateRange = dateRange;
      }

      if (searchQuery) {
        filter.search = searchQuery;
      }

      // Apply filter
      const filteredEntries = logExplorerService.filterLogEntries(logEntries, filter);

      // Update state
      this.setState({
        filter,
        currentPage: 1,
        isSearching: false
      });
    } catch (error) {
      this.context.appManager.showError('Filter Failed', error);
      this.setState({ isSearching: false });
    }
  };

  // Reset filters
  resetFilters = () => {
    this.setState({
      filter: {},
      searchQuery: '',
      selectedLevel: '',
      selectedSource: '',
      selectedRequestId: '',
      dateRange: {},
      currentPage: 1,
      isSearching: false
    });
  };

  // Analyze log patterns
  analyzeLogPatterns = async () => {
    try {
      this.setState({ isAnalyzing: true });

      const { logEntries, filter } = this.state;
      const logExplorerService = this.context.logExplorerService;

      // Filter entries
      const filteredEntries = logExplorerService.filterLogEntries(logEntries, filter);

      // Analyze patterns
      const analysis = logExplorerService.analyzeLogPatterns(filteredEntries);

      // Update state
      this.setState({
        analysis,
        isAnalyzing: false
      });
    } catch (error) {
      this.context.appManager.showError('Analysis Failed', error);
      this.setState({ isAnalyzing: false });
    }
  };

  // Get filtered log entries
  getFilteredEntries = (): LogEntry[] => {
    const { logEntries, filter } = this.state;
    const logExplorerService = this.context.logExplorerService;

    return logExplorerService.filterLogEntries(logEntries, filter);
  };

  // Get entries for current page
  getCurrentPageEntries = (): LogEntry[] => {
    const { currentPage, pageSize } = this.state;
    const filtered = this.getFilteredEntries();

    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  };

  // Handle page change
  handlePageChange = (page: number) => {
    this.setState({ currentPage: page });
  };

  // Format log timestamp
  formatTimestamp = (timestamp: Date): string => {
    try {
      return timestamp.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Get CSS class for log level
  getLevelClass = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'log-level-error';
      case 'warn':
        return 'log-level-warn';
      case 'info':
        return 'log-level-info';
      case 'debug':
        return 'log-level-debug';
      case 'verbose':
      case 'trace':
        return 'log-level-trace';
      default:
        return '';
    }
  };

  // Format bytes to human-readable size
  formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  };

  // Format log message
  formatMessage = (message: string): string => {
    // Truncate if too long
    if (message.length > 200) {
      return message.substring(0, 200) + '...';
    }
    return message;
  };

  // Export logs to file
  exportLogs = async () => {
    try {
      const { selectedFile } = this.state;
      const filtered = this.getFilteredEntries();

      if (!selectedFile) {
        return;
      }

      // In a real implementation, this would use Electron's dialog.showSaveDialog
      // For this example, we'll log to console
      console.log(`Exporting ${filtered.length} log entries to file`);
    } catch (error) {
      this.context.appManager.showError('Export Failed', error);
    }
  };

  // Toggle search/filter panel
  toggleFilters = () => {
    this.setState(prevState => ({ showFilters: !prevState.showFilters }));
  };

  // Perform search
  handleSearch = () => {
    this.setState({ isSearching: true }, this.applyFilters);
  };

  // Render file list
  renderFileList = () => {
    const { logFiles, selectedFile, isLoading } = this.state;

    if (isLoading) {
      return <div className="loading">Loading log files...</div>;
    }

    if (logFiles.length === 0) {
      return <div className="empty-state">No log files found in selected directory</div>;
    }

    return (
      <div className="file-list">
        {logFiles.map(file => (
          <div
            key={file.path}
            className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
            onClick={() => this.selectLogFile(file)}
          >
            <div className="file-name">{file.name}</div>
            <div className="file-meta">
              <span className="file-size">{this.formatFileSize(file.size)}</span>
              <span className="file-date">{new Date(file.modifiedTime).toLocaleDateString()}</span>
            </div>
            <div className="file-stats">
              <span className="file-errors">{file.errorCount} errors</span>
              <span className="file-warnings">{file.warnCount} warnings</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render filter panel
  renderFilterPanel = () => {
    const {
      showFilters,
      searchQuery,
      selectedLevel,
      selectedSource,
      selectedRequestId,
      dateRange,
      sources,
      requestIds,
      isSearching
    } = this.state;

    if (!showFilters) {
      return null;
    }

    return (
      <div className="filter-panel">
        <div className="filter-group">
          <label htmlFor="search-query">Search Text</label>
          <input
            id="search-query"
            type="text"
            value={searchQuery}
            onChange={e => this.setState({ searchQuery: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && this.handleSearch()}
            placeholder="Search in logs..."
          />
        </div>

        <div className="filter-group">
          <label htmlFor="log-level">Log Level</label>
          <select
            id="log-level"
            value={selectedLevel}
            onChange={e => this.setState({ selectedLevel: e.target.value })}
          >
            <option value="">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
            <option value="trace">Trace</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="log-source">Source</label>
          <select
            id="log-source"
            value={selectedSource}
            onChange={e => this.setState({ selectedSource: e.target.value })}
          >
            <option value="">All Sources</option>
            {sources.map(source => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="request-id">Request ID</label>
          <select
            id="request-id"
            value={selectedRequestId}
            onChange={e => this.setState({ selectedRequestId: e.target.value })}
          >
            <option value="">All Requests</option>
            {requestIds.map(id => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="date-from">Date Range</label>
          <div className="date-range">
            <input
              id="date-from"
              type="date"
              value={dateRange.start ? this.formatDateForInput(dateRange.start) : ''}
              onChange={e => this.setState({
                dateRange: {
                  ...dateRange,
                  start: e.target.value ? new Date(e.target.value) : undefined
                }
              })}
              placeholder="From"
            />
            <span>to</span>
            <input
              id="date-to"
              type="date"
              value={dateRange.end ? this.formatDateForInput(dateRange.end) : ''}
              onChange={e => this.setState({
                dateRange: {
                  ...dateRange,
                  end: e.target.value ? new Date(e.target.value) : undefined
                }
              })}
              placeholder="To"
            />
          </div>
        </div>

        <div className="filter-actions">
          <button
            className="apply-button"
            onClick={this.applyFilters}
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Apply Filters'}
          </button>
          <button
            className="reset-button"
            onClick={this.resetFilters}
            disabled={isSearching}
          >
            Reset
          </button>
        </div>
      </div>
    );
  };

  // Format date for input element
  formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Render log entries
  renderLogEntries = () => {
    const { selectedFile, isLoading, currentPage, pageSize } = this.state;

    if (isLoading) {
      return <div className="loading">Loading log entries...</div>;
    }

    if (!selectedFile) {
      return <div className="empty-state">Select a log file to view entries</div>;
    }

    const filteredEntries = this.getFilteredEntries();
    const currentEntries = this.getCurrentPageEntries();

    if (filteredEntries.length === 0) {
      return <div className="empty-state">No log entries match the current filters</div>;
    }

    const totalPages = Math.ceil(filteredEntries.length / pageSize);

    return (
      <div className="log-entries">
        <div className="log-stats">
          <div className="stats-text">
            Showing {currentEntries.length} of {filteredEntries.length} entries
            {filteredEntries.length !== this.state.logEntries.length && (
              <span> (filtered from {this.state.logEntries.length} total)</span>
            )}
          </div>
          <div className="stats-actions">
            <button className="analyze-button" onClick={this.analyzeLogPatterns}>
              Analyze Patterns
            </button>
            <button className="export-button" onClick={this.exportLogs}>
              Export
            </button>
          </div>
        </div>

        <table className="log-table">
          <thead>
            <tr>
              <th className="timestamp-column">Timestamp</th>
              <th className="level-column">Level</th>
              <th className="source-column">Source</th>
              <th className="message-column">Message</th>
            </tr>
          </thead>
          <tbody>
            {currentEntries.map(entry => (
              <tr
                key={`${entry.lineNumber}-${entry.timestamp.getTime()}`}
                className={this.getLevelClass(entry.level)}
              >
                <td className="timestamp-column">{this.formatTimestamp(entry.timestamp)}</td>
                <td className="level-column">{entry.level.toUpperCase()}</td>
                <td className="source-column">{entry.source || '-'}</td>
                <td className="message-column" title={entry.message}>
                  {this.formatMessage(entry.message)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => this.handlePageChange(1)}
            >
              First
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => this.handlePageChange(currentPage - 1)}
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => this.handlePageChange(currentPage + 1)}
            >
              Next
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => this.handlePageChange(totalPages)}
            >
              Last
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render analysis panel
  renderAnalysis = () => {
    const { analysis, isAnalyzing } = this.state;

    if (isAnalyzing) {
      return <div className="loading">Analyzing log patterns...</div>;
    }

    if (!analysis) {
      return null;
    }

    return (
      <div className="analysis-panel">
        <h3>Log Analysis</h3>
        
        <div className="analysis-section">
          <h4>Overview</h4>
          <div className="analysis-stats">
            <div className="stat-item">
              <div className="stat-label">Total Entries</div>
              <div className="stat-value">{analysis.totalEntries}</div>
            </div>
          </div>
        </div>
        
        <div className="analysis-section">
          <h4>Level Distribution</h4>
          <div className="level-distribution">
            {Object.entries(analysis.levelDistribution).map(([level, count]) => (
              <div key={level} className={`level-bar ${this.getLevelClass(level)}`}>
                <div className="level-name">{level}</div>
                <div className="level-count">{count as number}</div>
                <div 
                  className="level-bar-fill" 
                  style={{ width: `${(count as number) / analysis.totalEntries * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="analysis-section">
          <h4>Time Distribution</h4>
          <div className="time-distribution">
            <h5>Hourly</h5>
            <div className="time-bars">
              {Object.entries(analysis.timeDistribution.hourly)
                .sort(([hourA], [hourB]) => parseInt(hourA) - parseInt(hourB))
                .map(([hour, count]) => (
                  <div key={`hour-${hour}`} className="time-bar">
                    <div className="time-label">{hour}:00</div>
                    <div 
                      className="time-bar-fill" 
                      style={{ 
                        height: `${(count as number) / Math.max(...Object.values(analysis.timeDistribution.hourly) as number[]) * 100}%` 
                      }}
                    />
                    <div className="time-count">{count as number}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
        
        <div className="analysis-section">
          <h4>Common Message Patterns</h4>
          <div className="common-messages">
            {analysis.commonMessages.map((item: { message: string; count: number }, index: number) => (
              <div key={`msg-${index}`} className="message-item">
                <div className="message-count">{item.count}</div>
                <div className="message-text">{item.message}</div>
              </div>
            ))}
          </div>
        </div>
        
        <button className="close-analysis" onClick={() => this.setState({ analysis: null })}>
          Close Analysis
        </button>
      </div>
    );
  };

  render() {
    const { selectedDirectory, directoryIsRecursive, showFilters } = this.state;

    return (
      <div className="log-explorer">
        <div className="log-explorer-header">
          <h2>Log Explorer</h2>
          {this.props.onClose && (
            <button className="close-button" onClick={this.props.onClose}>
              Close
            </button>
          )}
        </div>

        <div className="directory-selector">
          <input
            type="text"
            value={selectedDirectory}
            onChange={e => this.setState({ selectedDirectory: e.target.value })}
            placeholder="Log directory path"
          />
          <button className="browse-button" onClick={this.browseDirectory}>
            Browse
          </button>
          <button className="scan-button" onClick={() => this.scanDirectory(selectedDirectory)}>
            Scan
          </button>
          <label className="recursive-checkbox">
            <input
              type="checkbox"
              checked={directoryIsRecursive}
              onChange={this.toggleRecursive}
            />
            Recursive
          </label>
        </div>

        <div className="filter-toggle-bar">
          <button className="filter-toggle" onClick={this.toggleFilters}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {this.renderFilterPanel()}

        <div className="log-explorer-main">
          <div className="file-panel">
            <h3>Log Files</h3>
            {this.renderFileList()}
          </div>

          <div className="entry-panel">
            <h3>Log Entries</h3>
            {this.renderLogEntries()}
          </div>

          {this.state.analysis && (
            <div className="analysis-overlay">
              {this.renderAnalysis()}
            </div>
          )}
        </div>

        <style jsx>{`
          .log-explorer {
            display: flex;
            flex-direction: column;
            height: 100%;
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            overflow: hidden;
          }

          .log-explorer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid #e0e0e0;
          }

          .log-explorer-header h2 {
            margin: 0;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
          }

          .directory-selector {
            display: flex;
            padding: 12px 16px;
            border-bottom: 1px solid #e0e0e0;
            background-color: #f5f5f5;
          }

          .directory-selector input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 14px;
          }

          .browse-button,
          .scan-button {
            margin-left: 8px;
            padding: 8px 12px;
            background-color: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }

          .recursive-checkbox {
            display: flex;
            align-items: center;
            margin-left: 16px;
            font-size: 14px;
          }

          .recursive-checkbox input {
            margin-right: 8px;
          }

          .filter-toggle-bar {
            padding: 8px 16px;
            border-bottom: 1px solid #e0e0e0;
            background-color: #f5f5f5;
          }

          .filter-toggle {
            padding: 6px 12px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }

          .filter-panel {
            padding: 16px;
            border-bottom: 1px solid #e0e0e0;
            background-color: #f5f5f5;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 16px;
          }

          .filter-group {
            display: flex;
            flex-direction: column;
          }

          .filter-group label {
            margin-bottom: 8px;
            font-weight: 500;
          }

          .filter-group input,
          .filter-group select {
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 14px;
          }

          .date-range {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .date-range input {
            flex: 1;
          }

          .filter-actions {
            display: flex;
            grid-column: 1 / -1;
            gap: 8px;
          }

          .apply-button {
            padding: 8px 16px;
            background-color: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }

          .reset-button {
            padding: 8px 16px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }

          .log-explorer-main {
            display: flex;
            flex: 1;
            overflow: hidden;
            position: relative;
          }

          .file-panel {
            width: 300px;
            border-right: 1px solid #e0e0e0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .file-panel h3 {
            padding: 12px 16px;
            margin: 0;
            border-bottom: 1px solid #e0e0e0;
          }

          .file-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
          }

          .file-item {
            padding: 12px;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 8px;
            border: 1px solid #e0e0e0;
            transition: background-color 0.2s ease;
          }

          .file-item:hover {
            background-color: #f5f5f5;
          }

          .file-item.selected {
            background-color: #e3f2fd;
            border-color: #2196f3;
          }

          .file-name {
            font-weight: 500;
            margin-bottom: 8px;
            word-break: break-all;
          }

          .file-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #757575;
            margin-bottom: 8px;
          }

          .file-stats {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
          }

          .file-errors {
            color: #f44336;
          }

          .file-warnings {
            color: #ff9800;
          }

          .entry-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .entry-panel h3 {
            padding: 12px 16px;
            margin: 0;
            border-bottom: 1px solid #e0e0e0;
          }

          .log-entries {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .log-stats {
            display: flex;
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid #e0e0e0;
            background-color: #f5f5f5;
          }

          .stats-actions {
            display: flex;
            gap: 8px;
          }

          .analyze-button,
          .export-button {
            padding: 6px 12px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }

          .log-table {
            width: 100%;
            border-collapse: collapse;
            flex: 1;
            overflow: auto;
            display: block;
          }

          .log-table th {
            position: sticky;
            top: 0;
            background-color: #f5f5f5;
            border-bottom: 1px solid #e0e0e0;
            padding: 12px 16px;
            text-align: left;
            font-weight: 500;
          }

          .log-table td {
            padding: 8px 16px;
            border-bottom: 1px solid #f0f0f0;
            vertical-align: top;
          }

          .timestamp-column {
            width: 180px;
            white-space: nowrap;
          }

          .level-column {
            width: 80px;
            white-space: nowrap;
          }

          .source-column {
            width: 120px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .message-column {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .log-level-error {
            background-color: #ffebee;
          }

          .log-level-warn {
            background-color: #fff8e1;
          }

          .log-level-info {
            background-color: #e3f2fd;
          }

          .log-level-debug {
            background-color: #e8f5e9;
          }

          .log-level-trace {
            background-color: #f3e5f5;
          }

          .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 12px 16px;
            border-top: 1px solid #e0e0e0;
            background-color: #f5f5f5;
          }

          .pagination button {
            padding: 6px 12px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
            margin: 0 4px;
          }

          .pagination button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .page-info {
            margin: 0 12px;
          }

          .empty-state {
            padding: 32px;
            text-align: center;
            color: #757575;
          }

          .loading {
            padding: 32px;
            text-align: center;
            color: #757575;
          }

          .analysis-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
          }

          .analysis-panel {
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            width: 800px;
            max-width: 90%;
            max-height: 90%;
            overflow-y: auto;
            padding: 24px;
          }

          .analysis-panel h3 {
            margin-top: 0;
            margin-bottom: 16px;
          }

          .analysis-section {
            margin-bottom: 24px;
          }

          .analysis-section h4 {
            margin-top: 0;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
          }

          .analysis-stats {
            display: flex;
            gap: 16px;
          }

          .stat-item {
            padding: 12px;
            border-radius: 4px;
            background-color: #f5f5f5;
            text-align: center;
          }

          .stat-label {
            font-size: 14px;
            margin-bottom: 4px;
            color: #757575;
          }

          .stat-value {
            font-size: 24px;
            font-weight: 500;
          }

          .level-distribution {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .level-bar {
            position: relative;
            height: 32px;
            border-radius: 4px;
            padding: 0 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #333;
            overflow: hidden;
          }

          .level-bar-fill {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.5);
            z-index: 1;
          }

          .level-name, .level-count {
            position: relative;
            z-index: 2;
          }

          .time-distribution {
            margin-top: 16px;
          }

          .time-distribution h5 {
            margin-top: 0;
            margin-bottom: 12px;
          }

          .time-bars {
            display: flex;
            height: 200px;
            align-items: flex-end;
            gap: 4px;
          }

          .time-bar {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .time-label {
            font-size: 12px;
            margin-bottom: 4px;
            writing-mode: vertical-lr;
            transform: rotate(180deg);
          }

          .time-bar-fill {
            width: 16px;
            background-color: #2196f3;
            border-radius: 2px 2px 0 0;
          }

          .time-count {
            font-size: 10px;
            margin-top: 4px;
          }

          .common-messages {
            max-height: 300px;
            overflow-y: auto;
          }

          .message-item {
            display: flex;
            gap: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
          }

          .message-count {
            min-width: 32px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #2196f3;
            color: white;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }

          .message-text {
            flex: 1;
            word-break: break-all;
          }

          .close-analysis {
            padding: 8px 16px;
            background-color: #f5f5f5;
            color: #333;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }
}
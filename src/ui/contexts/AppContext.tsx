import * as React from 'react';
import { AppManager } from '../../app/AppManager';
import { ConfigService } from '../../services/config/ConfigService';
import { LogService } from '../../services/logging/LogService';
import { DiagnosticService } from '../../services/diagnostic/DiagnosticService';
import { RepairService } from '../../services/repair/RepairService';
import { SystemService } from '../../services/system/SystemService';
import { AIService } from '../../services/ai/AIService';
import { ManagementService } from '../../services/management/ManagementService';

// Define the context interface
interface AppContextType {
  appManager: AppManager;
  configService: ConfigService;
  logService: LogService;
  diagnosticService: DiagnosticService;
  repairService: RepairService;
  systemService: SystemService;
  aiService: AIService | null;
  managementService: ManagementService;
}

// Create the context with a default value
export const AppContext = React.createContext<AppContextType>({} as AppContextType);

// Props for the context provider
interface AppContextProviderProps {
  appManager: AppManager;
  children: React.ReactNode;
}

/**
 * Context provider component that makes services available throughout the app
 */
export class AppContextProvider extends React.Component<AppContextProviderProps> {
  private configService: ConfigService;
  private logService: LogService;
  private systemService: SystemService;
  private diagnosticService: DiagnosticService;
  private repairService: RepairService;
  private aiService: AIService | null;
  private managementService: ManagementService;

  constructor(props: AppContextProviderProps) {
    super(props);
    
    // Get services from app manager
    this.configService = this.props.appManager.getConfigService();
    this.logService = this.props.appManager.getLogService();
    this.systemService = this.props.appManager.getSystemService();
    this.diagnosticService = this.props.appManager.getDiagnosticService();
    this.repairService = this.props.appManager.getRepairService();
    this.aiService = this.props.appManager.getAIService();
    this.managementService = this.props.appManager.getManagementService();
  }

  render() {
    // Create the context value with all services
    const contextValue: AppContextType = {
      appManager: this.props.appManager,
      configService: this.configService,
      logService: this.logService,
      systemService: this.systemService,
      diagnosticService: this.diagnosticService,
      repairService: this.repairService,
      aiService: this.aiService,
      managementService: this.managementService
    };

    return (
      <AppContext.Provider value={contextValue}>
        {this.props.children}
      </AppContext.Provider>
    );
  }
}
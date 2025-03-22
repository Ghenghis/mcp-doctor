import { createTheme, Theme, ThemeOptions } from '@mui/material/styles';
import { ThemeType } from '../../context/UIContext';

export interface CustomTheme {
  id: string;
  name: string;
  type: 'light' | 'dark';
  primary: string;
  secondary: string;
  error: string;
  warning: string;
  info: string;
  success: string;
  background: {
    default: string;
    paper: string;
  };
  text: {
    primary: string;
    secondary: string;
  };
  border: string;
  glow: boolean;
  glowIntensity: number;
  isCustom: boolean;
}

/**
 * Service for managing theme customization
 */
class CustomThemeService {
  private themes: Record<string, CustomTheme> = {};
  private muiThemes: Record<string, Theme> = {};
  
  constructor() {
    // Initialize with default themes
    this.initializeDefaultThemes();
  }
  
  /**
   * Initialize the default themes
   */
  private initializeDefaultThemes(): void {
    // Add default themes
    const darkTheme: CustomTheme = {
      id: 'dark',
      name: 'Dark',
      type: 'dark',
      primary: '#00FFFF', // Cyan
      secondary: '#FF00FF', // Magenta
      error: '#FF5555', // Red
      warning: '#FFFF00', // Yellow
      info: '#00BFFF', // Deep Sky Blue
      success: '#00FF00', // Green
      background: {
        default: '#000000',
        paper: '#121212'
      },
      text: {
        primary: '#FFFFFF',
        secondary: 'rgba(255, 255, 255, 0.7)'
      },
      border: '#00FFFF',
      glow: true,
      glowIntensity: 0.5,
      isCustom: false
    };
    
    const lightTheme: CustomTheme = {
      id: 'light',
      name: 'Light',
      type: 'light',
      primary: '#0088CC', // Blue
      secondary: '#FF00CC', // Pink
      error: '#F44336', // Red
      warning: '#FF9800', // Orange
      info: '#2196F3', // Blue
      success: '#4CAF50', // Green
      background: {
        default: '#F5F5F5',
        paper: '#FFFFFF'
      },
      text: {
        primary: '#000000',
        secondary: 'rgba(0, 0, 0, 0.7)'
      },
      border: '#0088CC',
      glow: false,
      glowIntensity: 0,
      isCustom: false
    };
    
    const neonTheme: CustomTheme = {
      id: 'neon',
      name: 'Neon',
      type: 'dark',
      primary: '#00FFFF', // Cyan
      secondary: '#FF00FF', // Magenta
      error: '#FF0000', // Red
      warning: '#FFFF00', // Yellow
      info: '#00BFFF', // Deep Sky Blue
      success: '#00FF00', // Green
      background: {
        default: '#000000',
        paper: '#000000'
      },
      text: {
        primary: '#FFFFFF',
        secondary: 'rgba(255, 255, 255, 0.7)'
      },
      border: '#00FFFF',
      glow: true,
      glowIntensity: 1,
      isCustom: false
    };
    
    const retroWaveTheme: CustomTheme = {
      id: 'retrowave',
      name: 'Retro Wave',
      type: 'dark',
      primary: '#FF00FF', // Magenta
      secondary: '#00FFFF', // Cyan
      error: '#FF5555', // Red
      warning: '#FFFF00', // Yellow
      info: '#00BFFF', // Deep Sky Blue
      success: '#00FF00', // Green
      background: {
        default: '#1F1135',
        paper: '#2B1B54'
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#FF71CE'
      },
      border: '#FF00FF',
      glow: true,
      glowIntensity: 0.7,
      isCustom: false
    };
    
    const matrixTheme: CustomTheme = {
      id: 'matrix',
      name: 'Matrix',
      type: 'dark',
      primary: '#00FF00', // Green
      secondary: '#00CC00', // Darker Green
      error: '#FF0000', // Red
      warning: '#FFFF00', // Yellow
      info: '#00FFFF', // Cyan
      success: '#00FF00', // Green
      background: {
        default: '#000000',
        paper: '#001100'
      },
      text: {
        primary: '#00FF00',
        secondary: 'rgba(0, 255, 0, 0.7)'
      },
      border: '#00FF00',
      glow: true,
      glowIntensity: 0.5,
      isCustom: false
    };
    
    // Add themes to service
    this.addTheme(darkTheme);
    this.addTheme(lightTheme);
    this.addTheme(neonTheme);
    this.addTheme(retroWaveTheme);
    this.addTheme(matrixTheme);
  }
  
  /**
   * Add a new theme
   */
  public addTheme(theme: CustomTheme): void {
    this.themes[theme.id] = theme;
    this.muiThemes[theme.id] = this.createMuiTheme(theme);
  }
  
  /**
   * Create a Material-UI theme from a custom theme
   */
  private createMuiTheme(theme: CustomTheme): Theme {
    const themeOptions: ThemeOptions = {
      palette: {
        mode: theme.type,
        primary: {
          main: theme.primary,
        },
        secondary: {
          main: theme.secondary,
        },
        error: {
          main: theme.error,
        },
        warning: {
          main: theme.warning,
        },
        info: {
          main: theme.info,
        },
        success: {
          main: theme.success,
        },
        background: {
          default: theme.background.default,
          paper: theme.background.paper,
        },
        text: {
          primary: theme.text.primary,
          secondary: theme.text.secondary,
        },
      },
      components: {
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundColor: theme.background.paper,
              ...(theme.glow && {
                boxShadow: `0 0 ${10 * theme.glowIntensity}px rgba(${this.hexToRgb(theme.primary)}, ${theme.glowIntensity})`,
                borderColor: theme.border,
              }),
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              ...(theme.glow && {
                '&:hover': {
                  boxShadow: `0 0 ${10 * theme.glowIntensity}px rgba(${this.hexToRgb(theme.primary)}, ${theme.glowIntensity})`,
                },
              }),
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              color: theme.primary,
              ...(theme.glow && {
                '&:hover': {
                  boxShadow: `0 0 ${10 * theme.glowIntensity}px rgba(${this.hexToRgb(theme.primary)}, ${theme.glowIntensity})`,
                },
              }),
            },
          },
        },
        MuiDivider: {
          styleOverrides: {
            root: {
              backgroundColor: theme.primary,
              ...(theme.glow && {
                boxShadow: `0 0 ${5 * theme.glowIntensity}px rgba(${this.hexToRgb(theme.primary)}, ${theme.glowIntensity})`,
              }),
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderColor: theme.primary,
              ...(theme.glow && {
                boxShadow: `0 0 ${5 * theme.glowIntensity}px rgba(${this.hexToRgb(theme.primary)}, ${theme.glowIntensity})`,
              }),
            },
          },
        },
      },
    };
    
    return createTheme(themeOptions);
  }
  
  /**
   * Get a theme by its ID
   */
  public getTheme(id: string): CustomTheme | undefined {
    return this.themes[id];
  }
  
  /**
   * Get a Material-UI theme by its ID
   */
  public getMuiTheme(id: string): Theme | undefined {
    return this.muiThemes[id];
  }
  
  /**
   * Get all available themes
   */
  public getAllThemes(): CustomTheme[] {
    return Object.values(this.themes);
  }
  
  /**
   * Delete a custom theme
   */
  public deleteTheme(id: string): boolean {
    // Don't allow deleting default themes
    if (!this.themes[id]?.isCustom) {
      return false;
    }
    
    delete this.themes[id];
    delete this.muiThemes[id];
    return true;
  }
  
  /**
   * Convert from UIContext ThemeType to theme ID
   */
  public themeTypeToId(themeType: ThemeType): string {
    switch (themeType) {
      case 'light': return 'light';
      case 'dark': return 'dark';
      case 'neon': return 'neon';
      default: return 'dark';
    }
  }
  
  /**
   * Convert from theme ID to UIContext ThemeType
   */
  public themeIdToType(id: string): ThemeType {
    switch (id) {
      case 'light': return 'light';
      case 'dark': return 'dark';
      case 'neon': return 'neon';
      default: return 'dark';
    }
  }
  
  /**
   * Create a new custom theme based on an existing theme
   */
  public createCustomTheme(name: string, baseThemeId: string, changes: Partial<CustomTheme>): CustomTheme {
    const baseTheme = this.getTheme(baseThemeId) || this.getTheme('dark')!;
    
    const customTheme: CustomTheme = {
      ...baseTheme,
      ...changes,
      id: `custom-${Date.now()}`,
      name,
      isCustom: true
    };
    
    this.addTheme(customTheme);
    return customTheme;
  }
  
  /**
   * Helper to convert hex color to RGB values
   */
  private hexToRgb(hex: string): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert 3-digit hex to 6-digit
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  }
}

// Export singleton instance
export const customThemeService = new CustomThemeService();
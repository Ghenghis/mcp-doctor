import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import PaletteIcon from '@mui/icons-material/Palette';

import ThemeSelector from './ThemeSelector';
import { customThemeService } from '../../services/theme/CustomThemeService';
import { useUI } from '../../context/UIContext';

// Styled components for neon wireframe appearance
const NeonButton = styled(Button)(({ theme }) => ({
  color: '#00FFFF',
  borderColor: '#00FFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  '&:hover': {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderColor: '#00FFFF',
    boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
  }
}));

interface ThemePreviewProps {
  themeId: string;
  onClick: () => void;
  selected: boolean;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ themeId, onClick, selected }) => {
  const theme = customThemeService.getTheme(themeId);
  
  if (!theme) return null;
  
  return (
    <Box 
      onClick={onClick}
      sx={{ 
        width: 120, 
        height: 80, 
        borderRadius: 1,
        overflow: 'hidden',
        cursor: 'pointer',
        border: selected ? `2px solid ${theme.primary}` : '1px solid rgba(255, 255, 255, 0.2)',
        ...(theme.glow && selected && {
          boxShadow: `0 0 ${Math.round(10 * theme.glowIntensity)}px ${theme.primary}`,
        }),
        '&:hover': {
          border: `2px solid ${theme.primary}`,
          ...(theme.glow && {
            boxShadow: `0 0 ${Math.round(10 * theme.glowIntensity)}px ${theme.primary}`,
          }),
        }
      }}
    >
      <Box 
        sx={{ 
          height: 20, 
          backgroundColor: theme.primary 
        }} 
      />
      <Box 
        sx={{ 
          p: 1, 
          backgroundColor: theme.background.paper,
          height: 'calc(100% - 20px)'
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ 
            color: theme.text.primary,
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {theme.name}
        </Typography>
        
        <Typography 
          variant="caption" 
          sx={{ 
            color: theme.text.secondary,
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {theme.type} theme
        </Typography>
      </Box>
    </Box>
  );
};

const ThemeSettingsPanel: React.FC = () => {
  const { state, setTheme } = useUI();
  const [openSelector, setOpenSelector] = useState(false);
  const [openQuickSelect, setOpenQuickSelect] = useState(false);
  const [quickSelectAnchor, setQuickSelectAnchor] = useState<null | HTMLElement>(null);
  
  // Get currently selected theme ID
  const currentThemeId = customThemeService.themeTypeToId(state.theme);
  
  // Get all available themes
  const allThemes = customThemeService.getAllThemes();
  
  // Handle theme selection
  const handleSelectTheme = (themeId: string) => {
    setTheme(customThemeService.themeIdToType(themeId));
    setOpenQuickSelect(false);
  };
  
  // Handle opening and closing quick select popup
  const handleOpenQuickSelect = (event: React.MouseEvent<HTMLElement>) => {
    setQuickSelectAnchor(event.currentTarget);
    setOpenQuickSelect(true);
  };
  
  const handleCloseQuickSelect = () => {
    setOpenQuickSelect(false);
    setQuickSelectAnchor(null);
  };
  
  // Handle opening and closing the full theme selector dialog
  const handleOpenSelector = () => {
    setOpenSelector(true);
    handleCloseQuickSelect();
  };
  
  const handleCloseSelector = () => {
    setOpenSelector(false);
  };
  
  return (
    <>
      {/* Icon button to open theme settings */}
      <Tooltip title="Theme Settings">
        <IconButton 
          onClick={handleOpenQuickSelect}
          sx={{ color: '#00FFFF' }}
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>
      
      {/* Quick theme selection popup */}
      <Dialog
        open={openQuickSelect}
        onClose={handleCloseQuickSelect}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(5px)',
            borderRadius: 2,
            border: '1px solid #00FFFF',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
            maxWidth: 'none'
          }
        }}
      >
        <DialogTitle sx={{ color: '#00FFFF' }}>
          Quick Theme Selection
        </DialogTitle>
        
        <DialogContent>
          <Box 
            sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 2,
              p: 1
            }}
          >
            {allThemes.map(theme => (
              <ThemePreview 
                key={theme.id}
                themeId={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                selected={theme.id === currentThemeId}
              />
            ))}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleCloseQuickSelect}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <NeonButton 
            onClick={handleOpenSelector}
            variant="outlined"
            startIcon={<ColorLensIcon />}
          >
            Advanced Theme Settings
          </NeonButton>
        </DialogActions>
      </Dialog>
      
      {/* Full theme selector dialog */}
      {openSelector && <ThemeSelector />}
    </>
  );
};

export default ThemeSettingsPanel;
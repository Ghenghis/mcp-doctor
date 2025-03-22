import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';

import { useUI, ThemeType } from '../../context/UIContext';

const ThemeSwitcher: React.FC = () => {
  const theme = useTheme();
  const { state: { theme: currentTheme }, setTheme } = useUI();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };
  
  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };
  
  const handleSelectTheme = (theme: ThemeType) => {
    setTheme(theme);
    handleCloseMenu();
  };
  
  // Theme options configuration
  const themeOptions: { value: ThemeType; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: <LightModeIcon />
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <DarkModeIcon />
    },
    {
      value: 'neon',
      label: 'Neon',
      icon: <PaletteIcon />
    }
  ];
  
  // Get current theme icon
  const getCurrentThemeIcon = () => {
    switch (currentTheme) {
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
      case 'neon':
        return <PaletteIcon />;
      default:
        return <SettingsBrightnessIcon />;
    }
  };
  
  return (
    <>
      <Tooltip title="Change theme">
        <IconButton
          onClick={handleOpenMenu}
          color="inherit"
          aria-label="Change theme"
        >
          {getCurrentThemeIcon()}
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, opacity: 0.7 }}>
          Select Theme
        </Typography>
        
        {themeOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleSelectTheme(option.value)}
            selected={currentTheme === option.value}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
            {currentTheme === option.value && (
              <CheckIcon fontSize="small" />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ThemeSwitcher;

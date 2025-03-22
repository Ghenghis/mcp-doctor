import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  Slider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Popover,
  Switch,
  FormControlLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import PaletteIcon from '@mui/icons-material/Palette';
import { SketchPicker } from 'react-color';

import { useUI } from '../../context/UIContext';
import { customThemeService, CustomTheme } from '../../services/theme/CustomThemeService';

// Styled components
const ThemePreview = styled(Paper)<{ 
  backgroundColor?: string; 
  primaryColor?: string;
  textColor?: string;
  selected?: boolean;
  glow?: boolean;
  glowIntensity?: number;
}>(({ 
  theme, 
  backgroundColor = '#000000', 
  primaryColor = '#00FFFF',
  textColor = '#FFFFFF',
  selected = false,
  glow = false,
  glowIntensity = 0.5
}) => ({
  backgroundColor,
  color: textColor,
  borderRadius: 8,
  overflow: 'hidden',
  height: 100,
  cursor: 'pointer',
  position: 'relative',
  border: selected ? `2px solid ${primaryColor}` : '1px solid rgba(255, 255, 255, 0.2)',
  transition: 'all 0.2s ease-in-out',
  ...(glow && selected && {
    boxShadow: `0 0 ${Math.round(10 * glowIntensity)}px ${primaryColor}`,
  }),
  '&:hover': {
    border: `2px solid ${primaryColor}`,
    ...(glow && {
      boxShadow: `0 0 ${Math.round(10 * glowIntensity)}px ${primaryColor}`,
    }),
  }
}));

const ThemeHeader = styled(Box)<{ 
  primaryColor?: string;
}>(({ 
  theme, 
  primaryColor = '#00FFFF'
}) => ({
  backgroundColor: primaryColor,
  height: 20,
  width: '100%'
}));

const ColorSwatch = styled(Box)<{ 
  color: string; 
  selected?: boolean;
}>(({ 
  theme, 
  color, 
  selected = false
}) => ({
  width: 24,
  height: 24,
  borderRadius: '50%',
  backgroundColor: color,
  cursor: 'pointer',
  border: selected ? '2px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.5)',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: '0 0 5px rgba(255, 255, 255, 0.5)',
  }
}));

interface ColorPickerProps {
  color: string;
  label: string;
  onChange: (color: string) => void;
}

// Color picker component
const ColorPicker: React.FC<ColorPickerProps> = ({ color, label, onChange }) => {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [currentColor, setCurrentColor] = useState(color);
  
  useEffect(() => {
    setCurrentColor(color);
  }, [color]);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen(true);
  };
  
  const handleClose = () => {
    setOpen(false);
    setAnchorEl(null);
  };
  
  const handleChange = (color: any) => {
    setCurrentColor(color.hex);
  };
  
  const handleChangeComplete = (color: any) => {
    onChange(color.hex);
  };
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ColorSwatch color={currentColor} onClick={handleClick} />
      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
        {label}
      </Typography>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <SketchPicker
          color={currentColor}
          onChange={handleChange}
          onChangeComplete={handleChangeComplete}
        />
      </Popover>
    </Box>
  );
};

// Main component
const ThemeSelector: React.FC = () => {
  const { state, setTheme } = useUI();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [allThemes, setAllThemes] = useState<CustomTheme[]>(customThemeService.getAllThemes());
  const [selectedThemeId, setSelectedThemeId] = useState<string>(
    customThemeService.themeTypeToId(state.theme)
  );
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // New theme form state
  const [newThemeName, setNewThemeName] = useState('');
  const [baseTheme, setBaseTheme] = useState('dark');
  const [newTheme, setNewTheme] = useState<CustomTheme>(customThemeService.getTheme('dark')!);
  
  useEffect(() => {
    // Update newTheme when baseTheme changes
    const baseThemeObj = customThemeService.getTheme(baseTheme);
    if (baseThemeObj) {
      setNewTheme({ ...baseThemeObj, name: newThemeName, id: 'new-theme' });
    }
  }, [baseTheme, newThemeName]);
  
  // Handle theme selection
  const handleSelectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    setTheme(customThemeService.themeIdToType(themeId));
    
    // Show snackbar
    setSnackbarMessage(`Theme "${customThemeService.getTheme(themeId)?.name}" applied`);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };
  
  // Handle dialog open/close
  const handleOpenDialog = () => {
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  // Handle create dialog open/close
  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };
  
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    
    // Reset form
    setNewThemeName('');
    setBaseTheme('dark');
    setNewTheme(customThemeService.getTheme('dark')!);
  };
  
  // Handle theme creation
  const handleCreateTheme = () => {
    if (!newThemeName) {
      setSnackbarMessage('Theme name is required');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      // Create new theme
      const createdTheme = customThemeService.createCustomTheme(
        newThemeName,
        baseTheme,
        {
          primary: newTheme.primary,
          secondary: newTheme.secondary,
          error: newTheme.error,
          warning: newTheme.warning,
          info: newTheme.info,
          success: newTheme.success,
          background: newTheme.background,
          text: newTheme.text,
          border: newTheme.border,
          glow: newTheme.glow,
          glowIntensity: newTheme.glowIntensity
        }
      );
      
      // Update themes list
      setAllThemes(customThemeService.getAllThemes());
      
      // Select new theme
      handleSelectTheme(createdTheme.id);
      
      // Close dialog
      handleCloseCreateDialog();
      
      // Show success message
      setSnackbarMessage(`Theme "${createdTheme.name}" created and applied`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to create theme:', error);
      
      // Show error message
      setSnackbarMessage('Failed to create theme');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // Handle theme deletion
  const handleDeleteTheme = (themeId: string) => {
    setThemeToDelete(themeId);
    setDeleteConfirmOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (!themeToDelete) return;
    
    try {
      const themeName = customThemeService.getTheme(themeToDelete)?.name;
      
      // Delete theme
      const success = customThemeService.deleteTheme(themeToDelete);
      
      if (success) {
        // Update themes list
        setAllThemes(customThemeService.getAllThemes());
        
        // If deleted theme was selected, switch to dark theme
        if (selectedThemeId === themeToDelete) {
          handleSelectTheme('dark');
        }
        
        // Show success message
        setSnackbarMessage(`Theme "${themeName}" deleted`);
        setSnackbarSeverity('success');
      } else {
        // Show error message
        setSnackbarMessage('Cannot delete default theme');
        setSnackbarSeverity('error');
      }
    } catch (error) {
      console.error('Failed to delete theme:', error);
      
      // Show error message
      setSnackbarMessage('Failed to delete theme');
      setSnackbarSeverity('error');
    }
    
    setSnackbarOpen(true);
    setDeleteConfirmOpen(false);
    setThemeToDelete(null);
  };
  
  // Handle color change in theme creation
  const handleColorChange = (property: keyof CustomTheme, value: string) => {
    setNewTheme(prev => ({
      ...prev,
      [property]: value
    }));
  };
  
  // Handle nested color change in theme creation
  const handleNestedColorChange = (
    parent: 'background' | 'text',
    property: 'default' | 'paper' | 'primary' | 'secondary',
    value: string
  ) => {
    setNewTheme(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [property]: value
      }
    }));
  };
  
  // Handle glow toggle in theme creation
  const handleGlowToggle = (checked: boolean) => {
    setNewTheme(prev => ({
      ...prev,
      glow: checked
    }));
  };
  
  // Handle glow intensity change in theme creation
  const handleGlowIntensityChange = (value: number) => {
    setNewTheme(prev => ({
      ...prev,
      glowIntensity: value
    }));
  };
  
  return (
    <>
      <Tooltip title="Theme Settings">
        <IconButton
          onClick={handleOpenDialog}
          sx={{ color: '#00FFFF' }}
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>
      
      {/* Theme selection dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(5px)',
            borderRadius: 2,
            border: '1px solid #00FFFF',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
          }
        }}
      >
        <DialogTitle sx={{ color: '#00FFFF' }}>
          Theme Settings
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={2}>
            {allThemes.map(theme => (
              <Grid item xs={6} sm={4} md={3} key={theme.id}>
                <ThemePreview
                  backgroundColor={theme.background.paper}
                  primaryColor={theme.primary}
                  textColor={theme.text.primary}
                  selected={selectedThemeId === theme.id}
                  glow={theme.glow}
                  glowIntensity={theme.glowIntensity}
                  onClick={() => handleSelectTheme(theme.id)}
                >
                  <ThemeHeader primaryColor={theme.primary} />
                  
                  <Box sx={{ p: 1 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {theme.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: theme.text.secondary }} noWrap>
                      {theme.type} theme
                    </Typography>
                  </Box>
                  
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      p: 0.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <ColorSwatch color={theme.primary} />
                      <ColorSwatch color={theme.secondary} />
                      <ColorSwatch color={theme.error} />
                    </Box>
                    
                    {theme.isCustom && (
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTheme(theme.id);
                        }}
                        sx={{ color: theme.error }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                    
                    {selectedThemeId === theme.id && (
                      <CheckIcon fontSize="small" sx={{ color: theme.success }} />
                    )}
                  </Box>
                </ThemePreview>
              </Grid>
            ))}
            
            {/* Add new theme button */}
            <Grid item xs={6} sm={4} md={3}>
              <ThemePreview
                backgroundColor="rgba(0, 0, 0, 0.5)"
                primaryColor="#00FFFF"
                textColor="#FFFFFF"
                onClick={handleOpenCreateDialog}
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 1,
                  border: '1px dashed rgba(0, 255, 255, 0.5)'
                }}
              >
                <AddIcon sx={{ fontSize: 24, color: '#00FFFF' }} />
                <Typography variant="body2" sx={{ color: '#00FFFF' }}>
                  Create Theme
                </Typography>
              </ThemePreview>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button 
            variant="contained" 
            onClick={handleCloseDialog}
            sx={{ 
              bgcolor: '#00FFFF', 
              color: '#000000',
              '&:hover': {
                bgcolor: '#00DDDD'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Create theme dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(5px)',
            borderRadius: 2,
            border: '1px solid #00FFFF',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
          }
        }}
      >
        <DialogTitle sx={{ color: '#00FFFF' }}>
          Create Custom Theme
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3}>
            {/* Basic settings */}
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ color: '#00FFFF', mb: 1 }}>
                  Basic Settings
                </Typography>
                
                <TextField
                  fullWidth
                  label="Theme Name"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  margin="normal"
                  variant="outlined"
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(0, 255, 255, 0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#00FFFF',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#00FFFF',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                    '& .MuiInputBase-input': {
                      color: '#FFFFFF',
                    },
                  }}
                />
                
                <FormControl 
                  fullWidth 
                  margin="normal"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(0, 255, 255, 0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#00FFFF',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#00FFFF',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                    '& .MuiInputBase-input': {
                      color: '#FFFFFF',
                    },
                  }}
                >
                  <InputLabel id="base-theme-label">Base Theme</InputLabel>
                  <Select
                    labelId="base-theme-label"
                    value={baseTheme}
                    onChange={(e) => setBaseTheme(e.target.value)}
                    label="Base Theme"
                  >
                    {allThemes
                      .filter(theme => !theme.isCustom)
                      .map(theme => (
                        <MenuItem key={theme.id} value={theme.id}>
                          {theme.name}
                        </MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
                
                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newTheme.glow}
                        onChange={(e) => handleGlowToggle(e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#00FFFF',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#00FFFF',
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Enable Glow Effects
                      </Typography>
                    }
                  />
                  
                  {newTheme.glow && (
                    <Box sx={{ px: 2, mt: 1 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Glow Intensity: {newTheme.glowIntensity.toFixed(1)}
                      </Typography>
                      <Slider
                        value={newTheme.glowIntensity}
                        min={0.1}
                        max={1}
                        step={0.1}
                        onChange={(_, value) => handleGlowIntensityChange(value as number)}
                        sx={{
                          color: '#00FFFF',
                          '& .MuiSlider-thumb': {
                            '&:hover, &.Mui-active': {
                              boxShadow: '0 0 0 8px rgba(0, 255, 255, 0.16)',
                            },
                          },
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#00FFFF', mb: 1 }}>
                  Background & Text
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <ColorPicker
                    color={newTheme.background.default}
                    label="Background"
                    onChange={(color) => handleNestedColorChange('background', 'default', color)}
                  />
                  
                  <ColorPicker
                    color={newTheme.background.paper}
                    label="Surface"
                    onChange={(color) => handleNestedColorChange('background', 'paper', color)}
                  />
                  
                  <ColorPicker
                    color={newTheme.text.primary}
                    label="Primary Text"
                    onChange={(color) => handleNestedColorChange('text', 'primary', color)}
                  />
                  
                  <ColorPicker
                    color={newTheme.text.secondary}
                    label="Secondary Text"
                    onChange={(color) => handleNestedColorChange('text', 'secondary', color)}
                  />
                  
                  <ColorPicker
                    color={newTheme.border}
                    label="Border"
                    onChange={(color) => handleColorChange('border', color)}
                  />
                </Box>
              </Box>
            </Grid>
            
            {/* Colors */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ color: '#00FFFF', mb: 1 }}>
                Theme Colors
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <ColorPicker
                  color={newTheme.primary}
                  label="Primary"
                  onChange={(color) => handleColorChange('primary', color)}
                />
                
                <ColorPicker
                  color={newTheme.secondary}
                  label="Secondary"
                  onChange={(color) => handleColorChange('secondary', color)}
                />
                
                <ColorPicker
                  color={newTheme.error}
                  label="Error"
                  onChange={(color) => handleColorChange('error', color)}
                />
                
                <ColorPicker
                  color={newTheme.warning}
                  label="Warning"
                  onChange={(color) => handleColorChange('warning', color)}
                />
                
                <ColorPicker
                  color={newTheme.info}
                  label="Info"
                  onChange={(color) => handleColorChange('info', color)}
                />
                
                <ColorPicker
                  color={newTheme.success}
                  label="Success"
                  onChange={(color) => handleColorChange('success', color)}
                />
              </Box>
              
              {/* Preview */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ color: '#00FFFF', mb: 1 }}>
                  Preview
                </Typography>
                
                <ThemePreview
                  backgroundColor={newTheme.background.paper}
                  primaryColor={newTheme.primary}
                  textColor={newTheme.text.primary}
                  glow={newTheme.glow}
                  glowIntensity={newTheme.glowIntensity}
                  sx={{ height: 150, cursor: 'default' }}
                >
                  <ThemeHeader primaryColor={newTheme.primary} />
                  
                  <Box sx={{ p: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {newThemeName || 'New Theme'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: newTheme.text.secondary }}>
                      {newTheme.type} theme
                    </Typography>
                    
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Box
                        sx={{
                          backgroundColor: newTheme.primary,
                          color: '#000000',
                          px: 1,
                          borderRadius: 1,
                          fontSize: '0.75rem'
                        }}
                      >
                        Primary
                      </Box>
                      
                      <Box
                        sx={{
                          backgroundColor: newTheme.secondary,
                          color: '#000000',
                          px: 1,
                          borderRadius: 1,
                          fontSize: '0.75rem'
                        }}
                      >
                        Secondary
                      </Box>
                      
                      <Box
                        sx={{
                          backgroundColor: newTheme.error,
                          color: '#000000',
                          px: 1,
                          borderRadius: 1,
                          fontSize: '0.75rem'
                        }}
                      >
                        Error
                      </Box>
                      
                      <Box
                        sx={{
                          backgroundColor: newTheme.success,
                          color: '#000000',
                          px: 1,
                          borderRadius: 1,
                          fontSize: '0.75rem'
                        }}
                      >
                        Success
                      </Box>
                    </Box>
                  </Box>
                </ThemePreview>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleCloseCreateDialog}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateTheme}
            disabled={!newThemeName}
            sx={{ 
              bgcolor: '#00FFFF', 
              color: '#000000',
              '&:hover': {
                bgcolor: '#00DDDD'
              }
            }}
          >
            Create Theme
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(5px)',
            borderRadius: 2,
            border: '1px solid #FF5555',
            boxShadow: '0 0 20px rgba(255, 85, 85, 0.5)'
          }
        }}
      >
        <DialogTitle sx={{ color: '#FF5555' }}>
          Delete Theme
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#FFFFFF' }}>
            Are you sure you want to delete this theme? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleConfirmDelete}
            sx={{ 
              bgcolor: '#FF5555', 
              color: '#FFFFFF',
              '&:hover': {
                bgcolor: '#FF3333'
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ThemeSelector;
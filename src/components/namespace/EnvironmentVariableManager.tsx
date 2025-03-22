import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  InputAdornment,
  Alert,
  AlertTitle,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { useNamespace, NamespaceEnvironmentVariable } from '../../context/NamespaceContext';
import { useUI } from '../../context/UIContext';
import { containerService } from '../../services/ContainerService';

interface EnvironmentVariableManagerProps {
  namespaceId?: string;
  readOnly?: boolean;
}

const EnvironmentVariableManager: React.FC<EnvironmentVariableManagerProps> = ({
  namespaceId,
  readOnly = false
}) => {
  const theme = useTheme();
  const { namespaces, activeNamespace, setEnvironmentVariable, removeEnvironmentVariable } = useNamespace();
  const { addNotification } = useUI();
  
  // Use provided namespaceId or active namespace id
  const targetNamespaceId = namespaceId || activeNamespace?.id;
  
  // Get the target namespace
  const namespace = targetNamespaceId
    ? namespaces.find(ns => ns.id === targetNamespaceId)
    : null;
  
  // Form state
  const [newVariable, setNewVariable] = useState<{
    key: string;
    value: string;
    isSecret: boolean;
  }>({
    key: '',
    value: '',
    isSecret: false
  });
  
  // Edit state
  const [editingVariable, setEditingVariable] = useState<{
    originalKey: string;
    key: string;
    value: string;
    isSecret: boolean;
  } | null>(null);
  
  // Visibility state for secret values
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  
  // Validation state
  const [errors, setErrors] = useState<{
    key?: string;
    value?: string;
  }>({});
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variableToDelete, setVariableToDelete] = useState<string | null>(null);
  
  // Reset form on namespace change
  useEffect(() => {
    setNewVariable({
      key: '',
      value: '',
      isSecret: false
    });
    setEditingVariable(null);
    setErrors({});
    setVisibleSecrets({});
  }, [targetNamespaceId]);
  
  // Handle input change for new variable
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown; checked?: boolean }>
  ) => {
    const { name, value, checked } = event.target;
    
    if (!name) return;
    
    if (name === 'isSecret') {
      setNewVariable(prev => ({
        ...prev,
        isSecret: checked === undefined ? prev.isSecret : checked
      }));
    } else {
      setNewVariable(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Clear error for this field
      if (errors[name as keyof typeof errors]) {
        setErrors(prev => ({
          ...prev,
          [name]: undefined
        }));
      }
    }
  };
  
  // Handle input change for editing variable
  const handleEditInputChange = (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown; checked?: boolean }>
  ) => {
    const { name, value, checked } = event.target;
    
    if (!name || !editingVariable) return;
    
    if (name === 'isSecret') {
      setEditingVariable(prev => ({
        ...prev!,
        isSecret: checked === undefined ? prev!.isSecret : checked
      }));
    } else {
      setEditingVariable(prev => ({
        ...prev!,
        [name]: value
      }));
      
      // Clear error for this field
      if (errors[name as keyof typeof errors]) {
        setErrors(prev => ({
          ...prev,
          [name]: undefined
        }));
      }
    }
  };
  
  // Validate form
  const validateForm = (key: string, value: string): boolean => {
    const newErrors: typeof errors = {};
    
    if (!key) {
      newErrors.key = 'Key is required';
    } else if (key.includes(' ')) {
      newErrors.key = 'Key cannot contain spaces';
    }
    
    if (!value && value !== '') {
      newErrors.value = 'Value is required';
    }
    
    setErrors(newErrors);
    
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle add variable
  const handleAddVariable = async () => {
    if (!targetNamespaceId || !namespace) {
      addNotification({
        message: 'No active namespace selected',
        severity: 'error',
        autoClose: true
      });
      return;
    }
    
    // Validate form
    if (!validateForm(newVariable.key, newVariable.value)) {
      return;
    }
    
    // Check if variable already exists
    const existingVar = namespace.environmentVariables.find(env => env.key === newVariable.key);
    if (existingVar) {
      setErrors({
        key: 'Variable with this key already exists'
      });
      return;
    }
    
    try {
      // Add variable to namespace
      const success = await setEnvironmentVariable(
        targetNamespaceId,
        newVariable.key,
        newVariable.value,
        newVariable.isSecret
      );
      
      if (success) {
        // If namespace is running, update container environment variables
        if (namespace.status === 'running' && namespace.type === 'container') {
          try {
            // Get updated env vars
            const updatedEnvVars = [
              ...namespace.environmentVariables,
              { ...newVariable }
            ];
            
            // Update container environment variables
            await containerService.updateContainerEnvironmentVariables(
              namespace.imageId!,
              updatedEnvVars
            );
          } catch (error) {
            console.error('Failed to update container environment variables:', error);
            
            addNotification({
              message: 'Variable added to namespace but failed to update running container',
              severity: 'warning',
              autoClose: true
            });
          }
        }
        
        // Reset form
        setNewVariable({
          key: '',
          value: '',
          isSecret: false
        });
        
        // Show success notification
        addNotification({
          message: `Environment variable "${newVariable.key}" added successfully`,
          severity: 'success',
          autoClose: true
        });
      }
    } catch (error) {
      console.error('Failed to add environment variable:', error);
      
      addNotification({
        message: 'Failed to add environment variable',
        severity: 'error',
        autoClose: true
      });
    }
  };
  
  // Handle edit variable
  const handleStartEditVariable = (variable: NamespaceEnvironmentVariable) => {
    setEditingVariable({
      originalKey: variable.key,
      key: variable.key,
      value: variable.value,
      isSecret: variable.isSecret
    });
    
    // Make sure the secret is visible while editing
    setVisibleSecrets(prev => ({
      ...prev,
      [variable.key]: true
    }));
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingVariable(null);
    setErrors({});
  };
  
  // Handle save edit
  const handleSaveEdit = async () => {
    if (!targetNamespaceId || !namespace || !editingVariable) {
      return;
    }
    
    // Validate form
    if (!validateForm(editingVariable.key, editingVariable.value)) {
      return;
    }
    
    // Check if variable with new key already exists (if key changed)
    if (
      editingVariable.key !== editingVariable.originalKey &&
      namespace.environmentVariables.some(env => env.key === editingVariable.key)
    ) {
      setErrors({
        key: 'Variable with this key already exists'
      });
      return;
    }
    
    try {
      // If key changed, remove old variable and add new one
      if (editingVariable.key !== editingVariable.originalKey) {
        // Remove old variable
        await removeEnvironmentVariable(targetNamespaceId, editingVariable.originalKey);
        
        // Add new variable
        await setEnvironmentVariable(
          targetNamespaceId,
          editingVariable.key,
          editingVariable.value,
          editingVariable.isSecret
        );
      } else {
        // Update existing variable
        await setEnvironmentVariable(
          targetNamespaceId,
          editingVariable.key,
          editingVariable.value,
          editingVariable.isSecret
        );
      }
      
      // If namespace is running, update container environment variables
      if (namespace.status === 'running' && namespace.type === 'container') {
        try {
          // Get updated env vars
          const updatedEnvVars = namespace.environmentVariables.map(env => {
            if (env.key === editingVariable.originalKey) {
              return {
                key: editingVariable.key,
                value: editingVariable.value,
                isSecret: editingVariable.isSecret
              };
            }
            return env;
          });
          
          // Update container environment variables
          await containerService.updateContainerEnvironmentVariables(
            namespace.imageId!,
            updatedEnvVars
          );
        } catch (error) {
          console.error('Failed to update container environment variables:', error);
          
          addNotification({
            message: 'Variable updated in namespace but failed to update running container',
            severity: 'warning',
            autoClose: true
          });
        }
      }
      
      // Reset edit state
      setEditingVariable(null);
      
      // Reset visibility for the original key
      setVisibleSecrets(prev => {
        const newVisibleSecrets = { ...prev };
        delete newVisibleSecrets[editingVariable.originalKey];
        return {
          ...newVisibleSecrets,
          [editingVariable.key]: false
        };
      });
      
      // Show success notification
      addNotification({
        message: `Environment variable "${editingVariable.key}" updated successfully`,
        severity: 'success',
        autoClose: true
      });
    } catch (error) {
      console.error('Failed to update environment variable:', error);
      
      addNotification({
        message: 'Failed to update environment variable',
        severity: 'error',
        autoClose: true
      });
    }
  };
  
  // Handle delete variable
  const handleOpenDeleteDialog = (key: string) => {
    setVariableToDelete(key);
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setVariableToDelete(null);
  };
  
  const handleDeleteVariable = async () => {
    if (!targetNamespaceId || !namespace || !variableToDelete) {
      return;
    }
    
    try {
      // Remove variable from namespace
      const success = await removeEnvironmentVariable(targetNamespaceId, variableToDelete);
      
      if (success) {
        // If namespace is running, update container environment variables
        if (namespace.status === 'running' && namespace.type === 'container') {
          try {
            // Get updated env vars
            const updatedEnvVars = namespace.environmentVariables.filter(
              env => env.key !== variableToDelete
            );
            
            // Update container environment variables
            await containerService.updateContainerEnvironmentVariables(
              namespace.imageId!,
              updatedEnvVars
            );
          } catch (error) {
            console.error('Failed to update container environment variables:', error);
            
            addNotification({
              message: 'Variable removed from namespace but failed to update running container',
              severity: 'warning',
              autoClose: true
            });
          }
        }
        
        // Close dialog
        handleCloseDeleteDialog();
        
        // Show success notification
        addNotification({
          message: `Environment variable "${variableToDelete}" removed successfully`,
          severity: 'success',
          autoClose: true
        });
      }
    } catch (error) {
      console.error('Failed to remove environment variable:', error);
      
      addNotification({
        message: 'Failed to remove environment variable',
        severity: 'error',
        autoClose: true
      });
    }
  };
  
  // Handle toggle secret visibility
  const handleToggleSecretVisibility = (key: string) => {
    setVisibleSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Handle copy value to clipboard
  const handleCopyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value)
      .then(() => {
        addNotification({
          message: 'Value copied to clipboard',
          severity: 'success',
          autoClose: true
        });
      })
      .catch(err => {
        console.error('Failed to copy value:', err);
        addNotification({
          message: 'Failed to copy value to clipboard',
          severity: 'error',
          autoClose: true
        });
      });
  };
  
  if (!namespace) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" color="text.secondary">
          No namespace selected. Please select a namespace to manage environment variables.
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Environment Variables for {namespace.name}
        </Typography>
        
        {namespace.status === 'running' && namespace.type !== 'container' && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <AlertTitle>Limited Functionality</AlertTitle>
            Environment variables can only be fully managed for container-based namespaces.
            Changes will be saved but may not be applied until the namespace is restarted.
          </Alert>
        )}
        
        {/* Add new variable form */}
        {!readOnly && (
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={5}>
                <TextField
                  name="key"
                  label="Variable Name"
                  value={newVariable.key}
                  onChange={handleInputChange}
                  fullWidth
                  error={Boolean(errors.key)}
                  helperText={errors.key}
                  disabled={Boolean(editingVariable)}
                />
              </Grid>
              
              <Grid item xs={12} sm={5}>
                <TextField
                  name="value"
                  label="Variable Value"
                  value={newVariable.value}
                  onChange={handleInputChange}
                  fullWidth
                  error={Boolean(errors.value)}
                  helperText={errors.value}
                  disabled={Boolean(editingVariable)}
                  type={newVariable.isSecret ? 'password' : 'text'}
                  InputProps={{
                    endAdornment: newVariable.isSecret && (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setNewVariable(prev => ({ ...prev, isSecret: !prev.isSecret }))}
                          edge="end"
                        >
                          {newVariable.isSecret ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={2}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="isSecret"
                        checked={newVariable.isSecret}
                        onChange={handleInputChange}
                        disabled={Boolean(editingVariable)}
                      />
                    }
                    label="Secret"
                  />
                  
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAddVariable}
                    disabled={Boolean(editingVariable) || !newVariable.key}
                  >
                    Add
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Edit variable form */}
        {editingVariable && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Edit Variable
            </Typography>
            
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={5}>
                <TextField
                  name="key"
                  label="Variable Name"
                  value={editingVariable.key}
                  onChange={handleEditInputChange}
                  fullWidth
                  error={Boolean(errors.key)}
                  helperText={errors.key}
                />
              </Grid>
              
              <Grid item xs={12} sm={5}>
                <TextField
                  name="value"
                  label="Variable Value"
                  value={editingVariable.value}
                  onChange={handleEditInputChange}
                  fullWidth
                  error={Boolean(errors.value)}
                  helperText={errors.value}
                  type={!visibleSecrets[editingVariable.originalKey] && editingVariable.isSecret ? 'password' : 'text'}
                  InputProps={{
                    endAdornment: editingVariable.isSecret && (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => handleToggleSecretVisibility(editingVariable.originalKey)}
                          edge="end"
                        >
                          {!visibleSecrets[editingVariable.originalKey] ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={2}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="isSecret"
                        checked={editingVariable.isSecret}
                        onChange={handleEditInputChange}
                      />
                    }
                    label="Secret"
                  />
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveEdit}
                disabled={!editingVariable.key}
              >
                Save
              </Button>
            </Box>
          </Box>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {/* Variables list */}
        {namespace.environmentVariables.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            No environment variables defined for this namespace.
            {!readOnly && ' Use the form above to add a new variable.'}
          </Typography>
        ) : (
          <List>
            {namespace.environmentVariables.map((variable) => (
              <ListItem
                key={variable.key}
                divider
                secondaryAction={
                  !readOnly && (
                    <Box>
                      <IconButton
                        edge="end"
                        onClick={() => handleStartEditVariable(variable)}
                        disabled={Boolean(editingVariable)}
                        aria-label={`Edit variable ${variable.key}`}
                      >
                        <EditIcon />
                      </IconButton>
                      
                      <IconButton
                        edge="end"
                        onClick={() => handleOpenDeleteDialog(variable.key)}
                        disabled={Boolean(editingVariable)}
                        aria-label={`Delete variable ${variable.key}`}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography>{variable.key}</Typography>
                      {variable.isSecret && (
                        <Chip
                          label="Secret"
                          size="small"
                          color="secondary"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="body2" component="span">
                        {variable.isSecret && !visibleSecrets[variable.key]
                          ? '••••••••••••'
                          : variable.value}
                      </Typography>
                      
                      {variable.isSecret && (
                        <Tooltip title={visibleSecrets[variable.key] ? 'Hide value' : 'Show value'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleSecretVisibility(variable.key)}
                            sx={{ ml: 1 }}
                          >
                            {visibleSecrets[variable.key] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <Tooltip title="Copy value">
                        <IconButton
                          size="small"
                          onClick={() => handleCopyToClipboard(variable.value)}
                          sx={{ ml: 1 }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">Delete Environment Variable</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the environment variable "{variableToDelete}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteVariable} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnvironmentVariableManager;

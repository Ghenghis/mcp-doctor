import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Slider,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Types for heatmap data
export interface HeatMapDataPoint {
  x: number;
  y: number;
  value: number;
  label?: string;
}

interface HeatMapDisplayProps {
  data: HeatMapDataPoint[];
  title: string;
  xLabel: string;
  yLabel: string;
  width?: number;
  height?: number;
  colorScheme?: 'neon' | 'thermal' | 'spectrum';
}

// Styled components for neon wireframe appearance
const NeonContainer = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  borderRadius: 8,
  border: '1px solid #00FFFF',
  boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
  padding: theme.spacing(2),
  margin: theme.spacing(1, 0),
  overflow: 'hidden'
}));

// Canvas-based heat map renderer
const HeatMapCanvas: React.FC<{
  data: HeatMapDataPoint[];
  width: number;
  height: number;
  colorScheme: 'neon' | 'thermal' | 'spectrum';
  intensity: number;
  showLabels: boolean;
}> = ({ 
  data, 
  width, 
  height, 
  colorScheme,
  intensity,
  showLabels
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  // Color mapping functions
  const getColor = (value: number): string => {
    // Normalize value between 0 and 1
    const normalizedValue = Math.max(0, Math.min(1, value));
    
    switch (colorScheme) {
      case 'neon':
        // Neon colors (cyan to magenta)
        const r = Math.round(255 * Math.min(1, 2 * normalizedValue - 1));
        const g = Math.round(255 * Math.min(1, 2 * (1 - normalizedValue)));
        const b = 255;
        return `rgba(${r}, ${g}, ${b}, ${intensity})`;
      
      case 'thermal':
        // Thermal colors (blue to red)
        const tr = Math.round(255 * normalizedValue);
        const tg = Math.round(255 * (1 - Math.abs(2 * normalizedValue - 1)));
        const tb = Math.round(255 * (1 - normalizedValue));
        return `rgba(${tr}, ${tg}, ${tb}, ${intensity})`;
      
      case 'spectrum':
        // Full spectrum
        const hue = normalizedValue * 270; // 0 to 270 degrees in HSL
        return `hsla(${hue}, 100%, 50%, ${intensity})`;
      
      default:
        return `rgba(0, 255, 255, ${intensity})`;
    }
  };
  
  // Render heat map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Find data ranges
    const xValues = data.map(p => p.x);
    const yValues = data.map(p => p.y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const valueRange = Math.max(...data.map(p => p.value)) - Math.min(...data.map(p => p.value));
    
    // Function to map data coordinates to canvas coordinates
    const mapX = (x: number) => (x - minX) / (maxX - minX) * width;
    const mapY = (y: number) => height - (y - minY) / (maxY - minY) * height;
    
    // Draw heat points
    const dotSize = Math.min(width, height) / 30;
    
    // First pass: draw glow effects
    data.forEach(point => {
      const x = mapX(point.x);
      const y = mapY(point.y);
      const normalizedValue = valueRange ? (point.value - Math.min(...data.map(p => p.value))) / valueRange : 0.5;
      
      // Create gradient for glow effect
      const glow = ctx.createRadialGradient(
        x, y, 0,
        x, y, dotSize * 3
      );
      
      const color = getColor(normalizedValue);
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, dotSize * 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Second pass: draw data points
    data.forEach(point => {
      const x = mapX(point.x);
      const y = mapY(point.y);
      const normalizedValue = valueRange ? (point.value - Math.min(...data.map(p => p.value))) / valueRange : 0.5;
      
      ctx.fillStyle = getColor(normalizedValue);
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add stroke
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add labels if enabled
      if (showLabels && point.label) {
        ctx.font = '10px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(point.label, x, y - dotSize - 5);
      }
    });
    
    // Draw axes
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.stroke();
    
  }, [data, width, height, colorScheme, intensity, showLabels]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      style={{ 
        width, 
        height,
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: 4
      }}
    />
  );
};

// Main component
const HeatMapDisplay: React.FC<HeatMapDisplayProps> = ({
  data,
  title,
  xLabel,
  yLabel,
  width = 600,
  height = 400,
  colorScheme = 'neon'
}) => {
  // Controls state
  const [selectedColorScheme, setSelectedColorScheme] = useState<'neon' | 'thermal' | 'spectrum'>(colorScheme);
  const [intensity, setIntensity] = useState<number>(0.7);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  
  return (
    <NeonContainer elevation={3}>
      <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold', mb: 1 }}>
        {title}
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <HeatMapCanvas 
          data={data}
          width={width}
          height={height}
          colorScheme={selectedColorScheme}
          intensity={intensity}
          showLabels={showLabels}
        />
      </Box>
      
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          {xLabel}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          {yLabel}
        </Typography>
      </Box>
      
      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="color-scheme-label" sx={{ color: '#00FFFF' }}>Color Scheme</InputLabel>
          <Select
            labelId="color-scheme-label"
            value={selectedColorScheme}
            label="Color Scheme"
            onChange={(e) => setSelectedColorScheme(e.target.value as 'neon' | 'thermal' | 'spectrum')}
            sx={{ 
              color: '#FFFFFF',
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 255, 255, 0.5)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00FFFF',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00FFFF',
              },
            }}
          >
            <MenuItem value="neon">Neon</MenuItem>
            <MenuItem value="thermal">Thermal</MenuItem>
            <MenuItem value="spectrum">Spectrum</MenuItem>
          </Select>
        </FormControl>
        
        <Box sx={{ width: 150 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Intensity
          </Typography>
          <Slider
            value={intensity}
            min={0.1}
            max={1}
            step={0.1}
            onChange={(_, value) => setIntensity(value as number)}
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
        
        <FormControlLabel
          control={
            <Switch
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#00FFFF',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 255, 255, 0.08)',
                  },
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#00FFFF',
                },
              }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Show Labels
            </Typography>
          }
        />
      </Box>
    </NeonContainer>
  );
};

export default HeatMapDisplay;
import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

// Types for graph data
export interface Node {
  id: string;
  label: string;
  type: 'service' | 'server' | 'container' | 'process' | 'error';
  size?: number;
  data?: Record<string, any>;
}

export interface Edge {
  source: string;
  target: string;
  label?: string;
  weight?: number;
  type?: 'connection' | 'dependency' | 'error' | 'success';
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface NetworkGraphProps {
  data: GraphData;
  title: string;
  width?: number;
  height?: number;
  interactive?: boolean;
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

// Canvas-based network graph renderer
const NetworkGraphCanvas: React.FC<{
  data: GraphData;
  width: number;
  height: number;
  interactive: boolean;
  physicsEnabled: boolean;
  showLabels: boolean;
  zoom: number;
  onNodeSelect?: (node: Node) => void;
}> = ({ 
  data, 
  width, 
  height, 
  interactive,
  physicsEnabled,
  showLabels,
  zoom,
  onNodeSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Store node positions and simulation state
  const [nodePositions, setNodePositions] = useState<Record<string, {x: number, y: number}>>({});
  const [dragging, setDragging] = useState<{nodeId: string, x: number, y: number} | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  // Initialize node positions
  useEffect(() => {
    const initialPositions: Record<string, {x: number, y: number}> = {};
    
    // Place nodes in a circle initially
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    
    data.nodes.forEach((node, index) => {
      const angle = (index / data.nodes.length) * Math.PI * 2;
      initialPositions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
    
    setNodePositions(initialPositions);
  }, [data.nodes, width, height]);
  
  // Apply force-directed layout algorithm
  useEffect(() => {
    if (!physicsEnabled || !Object.keys(nodePositions).length) return;
    
    const simulationStep = () => {
      const newPositions = { ...nodePositions };
      
      // Parameters
      const repulsionForce = 500 * zoom;
      const attractionForce = 0.05 / zoom;
      const centerForce = 0.01;
      
      // Apply repulsion between nodes
      for (let i = 0; i < data.nodes.length; i++) {
        const nodeA = data.nodes[i];
        if (dragging && dragging.nodeId === nodeA.id) continue; // Skip dragged node
        
        let forceX = 0;
        let forceY = 0;
        
        // Node-node repulsion
        for (let j = 0; j < data.nodes.length; j++) {
          if (i === j) continue;
          
          const nodeB = data.nodes[j];
          const posA = nodePositions[nodeA.id];
          const posB = nodePositions[nodeB.id];
          
          const dx = posA.x - posB.x;
          const dy = posA.y - posB.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Apply inverse square law for repulsion
          const force = repulsionForce / (distance * distance);
          
          forceX += (dx / distance) * force;
          forceY += (dy / distance) * force;
        }
        
        // Apply attraction for connected nodes
        data.edges.forEach(edge => {
          if (edge.source === nodeA.id || edge.target === nodeA.id) {
            const otherNodeId = edge.source === nodeA.id ? edge.target : edge.source;
            const posA = nodePositions[nodeA.id];
            const posB = nodePositions[otherNodeId];
            
            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Apply Hooke's law for attraction
            const edgeWeight = edge.weight || 1;
            const force = distance * attractionForce * edgeWeight;
            
            forceX += (dx / distance) * force;
            forceY += (dy / distance) * force;
          }
        });
        
        // Center gravity
        const centerX = width / 2;
        const centerY = height / 2;
        forceX += (centerX - nodePositions[nodeA.id].x) * centerForce;
        forceY += (centerY - nodePositions[nodeA.id].y) * centerForce;
        
        // Update position with forces
        newPositions[nodeA.id] = {
          x: Math.max(20, Math.min(width - 20, nodePositions[nodeA.id].x + forceX)),
          y: Math.max(20, Math.min(height - 20, nodePositions[nodeA.id].y + forceY))
        };
      }
      
      setNodePositions(newPositions);
    };
    
    const interval = setInterval(simulationStep, 50);
    return () => clearInterval(interval);
  }, [nodePositions, data.nodes, data.edges, physicsEnabled, width, height, dragging, zoom]);
  
  // Draw the network graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !Object.keys(nodePositions).length) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw edges
    data.edges.forEach(edge => {
      const sourcePos = nodePositions[edge.source];
      const targetPos = nodePositions[edge.target];
      
      if (!sourcePos || !targetPos) return;
      
      // Determine edge style based on type
      let strokeStyle = 'rgba(0, 255, 255, 0.5)';
      let lineWidth = 1;
      
      switch (edge.type) {
        case 'dependency':
          strokeStyle = 'rgba(255, 255, 0, 0.5)';
          lineWidth = edge.weight ? Math.max(1, Math.min(5, edge.weight)) : 1;
          break;
        case 'error':
          strokeStyle = 'rgba(255, 0, 255, 0.7)';
          lineWidth = 2;
          break;
        case 'success':
          strokeStyle = 'rgba(0, 255, 0, 0.5)';
          lineWidth = 1.5;
          break;
      }
      
      // Draw edge
      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      
      // Draw edge label if enabled
      if (showLabels && edge.label) {
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        
        ctx.font = '9px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add background for better readability
        const textWidth = ctx.measureText(edge.label).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(midX - textWidth/2 - 2, midY - 7, textWidth + 4, 14);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(edge.label, midX, midY);
      }
    });
    
    // Draw nodes
    data.nodes.forEach(node => {
      const position = nodePositions[node.id];
      if (!position) return;
      
      // Determine node style based on type
      let fillStyle = 'rgba(0, 255, 255, 0.2)';
      let strokeStyle = '#00FFFF';
      let size = node.size || 10;
      
      switch (node.type) {
        case 'service':
          fillStyle = 'rgba(0, 255, 255, 0.2)';
          strokeStyle = '#00FFFF';
          break;
        case 'server':
          fillStyle = 'rgba(0, 255, 0, 0.2)';
          strokeStyle = '#00FF00';
          break;
        case 'container':
          fillStyle = 'rgba(255, 255, 0, 0.2)';
          strokeStyle = '#FFFF00';
          break;
        case 'process':
          fillStyle = 'rgba(255, 165, 0, 0.2)';
          strokeStyle = '#FFA500';
          break;
        case 'error':
          fillStyle = 'rgba(255, 0, 255, 0.2)';
          strokeStyle = '#FF00FF';
          break;
      }
      
      // Highlight hovered node
      if (hoveredNode === node.id) {
        fillStyle = strokeStyle.replace(')', ', 0.4)').replace('rgb', 'rgba');
        size *= 1.2;
      }
      
      // Draw node glow effect
      const glow = ctx.createRadialGradient(
        position.x, position.y, 0,
        position.x, position.y, size * 2
      );
      glow.addColorStop(0, strokeStyle.replace(')', ', 0.2)').replace('rgb', 'rgba'));
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(position.x, position.y, size * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw node
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.arc(position.x, position.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw node border
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(position.x, position.y, size, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw node label if enabled
      if (showLabels || hoveredNode === node.id) {
        ctx.font = hoveredNode === node.id ? 'bold 11px Arial' : '10px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add background for better readability
        const textWidth = ctx.measureText(node.label).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          position.x - textWidth/2 - 2, 
          position.y + size + 2, 
          textWidth + 4, 
          14
        );
        
        ctx.fillStyle = hoveredNode === node.id ? strokeStyle : 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(node.label, position.x, position.y + size + 10);
      }
    });
    
  }, [nodePositions, data.nodes, data.edges, width, height, hoveredNode, showLabels, zoom]);
  
  // Handle mouse events for interactivity
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if a node was clicked
    for (const node of data.nodes) {
      const pos = nodePositions[node.id];
      if (!pos) continue;
      
      const size = node.size || 10;
      const dx = pos.x - x;
      const dy = pos.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= size) {
        setDragging({ nodeId: node.id, x, y });
        if (onNodeSelect) onNodeSelect(node);
        break;
      }
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle dragging
    if (dragging) {
      const dx = x - dragging.x;
      const dy = y - dragging.y;
      
      setNodePositions(prev => ({
        ...prev,
        [dragging.nodeId]: {
          x: Math.max(20, Math.min(width - 20, prev[dragging.nodeId].x + dx)),
          y: Math.max(20, Math.min(height - 20, prev[dragging.nodeId].y + dy))
        }
      }));
      
      setDragging({ nodeId: dragging.nodeId, x, y });
    } else {
      // Check for hover
      let foundHover = false;
      
      for (const node of data.nodes) {
        const pos = nodePositions[node.id];
        if (!pos) continue;
        
        const size = node.size || 10;
        const dx = pos.x - x;
        const dy = pos.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= size) {
          setHoveredNode(node.id);
          foundHover = true;
          break;
        }
      }
      
      if (!foundHover && hoveredNode) {
        setHoveredNode(null);
      }
    }
  };
  
  const handleMouseUp = () => {
    setDragging(null);
  };
  
  const handleMouseLeave = () => {
    setDragging(null);
    setHoveredNode(null);
  };
  
  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      style={{ 
        width, 
        height,
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: 4,
        cursor: dragging ? 'grabbing' : hoveredNode ? 'pointer' : 'default'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};

// Main component
const NetworkGraph: React.FC<NetworkGraphProps> = ({
  data,
  title,
  width = 600,
  height = 400,
  interactive = true
}) => {
  // Controls state
  const [physicsEnabled, setPhysicsEnabled] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  // Handle node selection
  const handleNodeSelect = (node: Node) => {
    setSelectedNode(prev => prev && prev.id === node.id ? null : node);
  };
  
  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.4));
  };
  
  // Reset layout
  const handleResetLayout = () => {
    // This will trigger a re-initialization of node positions
    setPhysicsEnabled(false);
    setTimeout(() => setPhysicsEnabled(true), 50);
  };
  
  // Handle fullscreen toggle
  const handleFullscreenToggle = () => {
    setFullscreen(!fullscreen);
  };
  
  // Calculate effective dimensions
  const effectiveWidth = fullscreen ? window.innerWidth - 100 : width;
  const effectiveHeight = fullscreen ? window.innerHeight - 200 : height;
  
  return (
    <NeonContainer 
      elevation={3}
      sx={fullscreen ? {
        position: 'fixed',
        top: 20,
        left: 20,
        right: 20,
        bottom: 20,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      } : {}}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6" sx={{ color: '#00FFFF', fontWeight: 'bold' }}>
          {title}
        </Typography>
        
        <Box>
          <Tooltip title="Zoom in">
            <IconButton 
              size="small" 
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              sx={{ color: '#00FFFF' }}
            >
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom out">
            <IconButton 
              size="small" 
              onClick={handleZoomOut}
              disabled={zoom <= 0.4}
              sx={{ color: '#00FFFF' }}
            >
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset layout">
            <IconButton 
              size="small" 
              onClick={handleResetLayout}
              sx={{ color: '#00FFFF' }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
            <IconButton 
              size="small" 
              onClick={handleFullscreenToggle}
              sx={{ color: '#00FFFF' }}
            >
              {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Box 
        sx={{ 
          flex: fullscreen ? 1 : 'none',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box 
          sx={{ 
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2
          }}
        >
          <NetworkGraphCanvas 
            data={data}
            width={effectiveWidth}
            height={effectiveHeight}
            interactive={interactive}
            physicsEnabled={physicsEnabled}
            showLabels={showLabels}
            zoom={zoom}
            onNodeSelect={handleNodeSelect}
          />
        </Box>
        
        <Box 
          sx={{ 
            mt: 2, 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 2, 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={physicsEnabled}
                  onChange={(e) => setPhysicsEnabled(e.target.checked)}
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
                  Physics
                </Typography>
              }
            />
            
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
                  Labels
                </Typography>
              }
            />
          </Box>
          
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {data.nodes.length} nodes, {data.edges.length} connections
          </Typography>
        </Box>
      </Box>
      
      {/* Node details panel */}
      {selectedNode && (
        <Box 
          sx={{ 
            mt: 2, 
            p: 1, 
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            borderRadius: 1
          }}
        >
          <Typography variant="subtitle2" sx={{ color: '#00FFFF' }}>
            Node: {selectedNode.label}
          </Typography>
          
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Type: {selectedNode.type}
          </Typography>
          
          {selectedNode.data && Object.keys(selectedNode.data).length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Properties:
              </Typography>
              
              {Object.entries(selectedNode.data).map(([key, value]) => (
                <Typography 
                  key={key} 
                  variant="caption" 
                  display="block"
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}
    </NeonContainer>
  );
};

export default NetworkGraph;
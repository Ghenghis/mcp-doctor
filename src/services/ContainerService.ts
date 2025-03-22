import { Namespace, NamespaceResourceLimits, NamespaceEnvironmentVariable } from '../context/NamespaceContext';

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  created: number;
  ports: {
    internal: number;
    external: number;
    protocol: 'tcp' | 'udp';
  }[];
  mounts: {
    source: string;
    destination: string;
    mode: string;
  }[];
  resources: {
    cpuLimit: string;
    memoryLimit: string;
    diskLimit: string;
  };
}

export interface ContainerStats {
  id: string;
  name: string;
  cpuUsage: number; // percentage
  memoryUsage: number; // bytes
  memoryLimit: number; // bytes
  diskRead: number; // bytes per second
  diskWrite: number; // bytes per second
  networkRx: number; // bytes per second
  networkTx: number; // bytes per second
  timestamp: number;
}

class ContainerService {
  private dockerAvailable = false;
  private cachedImages: string[] = [];
  private mockContainers: Record<string, ContainerInfo> = {};
  
  constructor() {
    // In a real implementation, this would check if Docker is available
    this.checkDockerAvailability();
  }
  
  private async checkDockerAvailability(): Promise<boolean> {
    try {
      // Simulate checking Docker API
      console.log('Checking Docker availability...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock Docker availability
      this.dockerAvailable = true;
      console.log('Docker is available');
      
      // Load cached images
      this.cachedImages = [
        'anthropic/mcp-server:latest',
        'anthropic/mcp-server:stable',
        'anthropic/mcp-server:dev',
        'metamcp/server:latest',
        'metamcp/server:debug',
        'node:18-alpine'
      ];
      
      return true;
    } catch (error) {
      console.error('Docker is not available:', error);
      this.dockerAvailable = false;
      return false;
    }
  }
  
  public isDockerAvailable(): boolean {
    return this.dockerAvailable;
  }
  
  public async listImages(): Promise<string[]> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    return this.cachedImages;
  }
  
  public async pullImage(image: string): Promise<boolean> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    console.log(`Pulling image: ${image}`);
    
    // Simulate pulling an image
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Add to cached images if not already there
    if (!this.cachedImages.includes(image)) {
      this.cachedImages.push(image);
    }
    
    return true;
  }
  
  public async createContainer(namespace: Namespace): Promise<string> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    if (!namespace.imageId) {
      throw new Error('Image ID is required to create a container');
    }
    
    console.log(`Creating container for namespace: ${namespace.name}`);
    
    // Simulate creating a container
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate a mock container ID
    const containerId = `container-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Store mock container info
    this.mockContainers[containerId] = {
      id: containerId,
      name: namespace.name,
      image: namespace.imageId,
      status: 'created',
      created: Date.now(),
      ports: namespace.ports,
      mounts: namespace.volumeMounts.map(mount => ({
        source: mount.hostPath,
        destination: mount.containerPath,
        mode: mount.readOnly ? 'ro' : 'rw'
      })),
      resources: {
        cpuLimit: `${namespace.resourceLimits.cpu} CPUs`,
        memoryLimit: `${namespace.resourceLimits.memory}MB`,
        diskLimit: `${namespace.resourceLimits.disk}MB`
      }
    };
    
    return containerId;
  }
  
  public async startContainer(containerId: string): Promise<boolean> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    const container = this.mockContainers[containerId];
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    console.log(`Starting container: ${containerId}`);
    
    // Simulate starting a container
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update container status
    this.mockContainers[containerId] = {
      ...container,
      status: 'running'
    };
    
    return true;
  }
  
  public async stopContainer(containerId: string): Promise<boolean> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    const container = this.mockContainers[containerId];
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    console.log(`Stopping container: ${containerId}`);
    
    // Simulate stopping a container
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update container status
    this.mockContainers[containerId] = {
      ...container,
      status: 'stopped'
    };
    
    return true;
  }
  
  public async removeContainer(containerId: string): Promise<boolean> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    const container = this.mockContainers[containerId];
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    console.log(`Removing container: ${containerId}`);
    
    // Simulate removing a container
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Remove container from mock containers
    delete this.mockContainers[containerId];
    
    return true;
  }
  
  public async getContainerLogs(containerId: string, lines: number = 100): Promise<string[]> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    const container = this.mockContainers[containerId];
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    console.log(`Getting logs for container: ${containerId}`);
    
    // Simulate getting logs
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Generate mock logs
    const mockLogs: string[] = [];
    const startTime = Date.now() - 60000; // 1 minute ago
    
    for (let i = 0; i < lines; i++) {
      const timestamp = new Date(startTime + (i * 1000));
      const logLevel = ['INFO', 'WARN', 'ERROR', 'DEBUG'][Math.floor(Math.random() * 4)];
      const message = `[${logLevel}] Container ${container.name} - ${this.getRandomLogMessage()}`;
      
      mockLogs.push(`${timestamp.toISOString()} ${message}`);
    }
    
    return mockLogs;
  }
  
  public async getContainerStats(containerId: string): Promise<ContainerStats> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    const container = this.mockContainers[containerId];
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    // Only running containers have stats
    if (container.status !== 'running') {
      throw new Error(`Container ${containerId} is not running`);
    }
    
    console.log(`Getting stats for container: ${containerId}`);
    
    // Parse resource limits
    const memoryLimit = parseInt(container.resources.memoryLimit, 10) * 1024 * 1024; // Convert MB to bytes
    
    // Generate mock stats
    return {
      id: containerId,
      name: container.name,
      cpuUsage: Math.random() * 100, // 0-100%
      memoryUsage: Math.random() * memoryLimit * 0.8, // 0-80% of limit
      memoryLimit,
      diskRead: Math.random() * 10 * 1024 * 1024, // 0-10 MB/s
      diskWrite: Math.random() * 5 * 1024 * 1024, // 0-5 MB/s
      networkRx: Math.random() * 20 * 1024 * 1024, // 0-20 MB/s
      networkTx: Math.random() * 10 * 1024 * 1024, // 0-10 MB/s
      timestamp: Date.now()
    };
  }
  
  public async updateContainerResources(containerId: string, limits: NamespaceResourceLimits): Promise<boolean> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    const container = this.mockContainers[containerId];
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    console.log(`Updating resources for container: ${containerId}`);
    
    // Simulate updating resources
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update container resources
    this.mockContainers[containerId] = {
      ...container,
      resources: {
        cpuLimit: `${limits.cpu} CPUs`,
        memoryLimit: `${limits.memory}MB`,
        diskLimit: `${limits.disk}MB`
      }
    };
    
    return true;
  }
  
  public async updateContainerEnvironmentVariables(
    containerId: string, 
    envVars: NamespaceEnvironmentVariable[]
  ): Promise<boolean> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    const container = this.mockContainers[containerId];
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    console.log(`Updating environment variables for container: ${containerId}`);
    
    // Simulate updating environment variables
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real implementation, this would update the container's environment variables
    // For now, we just log the variables
    console.log('New environment variables:', envVars.map(env => `${env.key}=${env.isSecret ? '*****' : env.value}`));
    
    return true;
  }
  
  public async listContainers(): Promise<ContainerInfo[]> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    console.log('Listing containers');
    
    // Return all mock containers as an array
    return Object.values(this.mockContainers);
  }
  
  public async getContainer(containerId: string): Promise<ContainerInfo | null> {
    if (!this.dockerAvailable) {
      throw new Error('Docker is not available');
    }
    
    return this.mockContainers[containerId] || null;
  }
  
  private getRandomLogMessage(): string {
    const messages = [
      'Processing request',
      'Server started',
      'Connected to database',
      'Request completed in 125ms',
      'Received new connection',
      'Memory usage: 256MB',
      'CPU usage: 45%',
      'Service registered',
      'Health check passed',
      'Configuration loaded',
      'Failed to connect to external service',
      'Retrying operation',
      'Cache hit ratio: 78%',
      'Garbage collection completed',
      'Thread pool exhausted',
      'API rate limit reached'
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

// Export singleton instance
export const containerService = new ContainerService();

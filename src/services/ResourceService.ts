import { NamespaceResourceLimits, ResourceLimit } from '../context/NamespaceContext';
import { containerService } from './ContainerService';

export interface SystemResources {
  cpuCores: number;
  cpuUsage: number;
  totalMemory: number;
  availableMemory: number;
  totalDisk: number;
  availableDisk: number;
  networkBandwidth: number;
}

export interface ResourceAllocation {
  namespaceId: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  priority: number;
}

class ResourceService {
  private systemResources: SystemResources = {
    cpuCores: 8,
    cpuUsage: 0,
    totalMemory: 16384, // 16GB in MB
    availableMemory: 12288, // 12GB in MB
    totalDisk: 512000, // 500GB in MB
    availableDisk: 409600, // 400GB in MB
    networkBandwidth: 1000 // 1Gbps in Mbps
  };
  
  private resourceAllocations: Record<string, ResourceAllocation> = {};
  
  constructor() {
    // In a real implementation, this would detect system resources
    this.detectSystemResources();
  }
  
  private async detectSystemResources(): Promise<void> {
    console.log('Detecting system resources...');
    
    // Simulate resource detection
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real implementation, this would detect actual system resources
    // For now, we'll use mock data
    
    // Simulate some random usage
    this.updateSystemUsage();
    
    // Set up periodic updates
    setInterval(() => this.updateSystemUsage(), 5000);
  }
  
  private updateSystemUsage(): void {
    // Update CPU usage (random between 10-60%)
    this.systemResources.cpuUsage = 10 + Math.random() * 50;
    
    // Update available memory (random between 50-90% of total)
    this.systemResources.availableMemory = this.systemResources.totalMemory * (0.5 + Math.random() * 0.4);
    
    // Update available disk (random between 70-95% of total)
    this.systemResources.availableDisk = this.systemResources.totalDisk * (0.7 + Math.random() * 0.25);
  }
  
  public getSystemResources(): SystemResources {
    return { ...this.systemResources };
  }
  
  public getResourceAllocations(): ResourceAllocation[] {
    return Object.values(this.resourceAllocations);
  }
  
  public getResourceAllocation(namespaceId: string): ResourceAllocation | null {
    return this.resourceAllocations[namespaceId] || null;
  }
  
  public async allocateResources(
    namespaceId: string, 
    resources: NamespaceResourceLimits, 
    priority: number = 5
  ): Promise<boolean> {
    console.log(`Allocating resources for namespace ${namespaceId}`);
    
    // Check if resources are available
    if (!this.areResourcesAvailable(resources)) {
      console.error('Insufficient system resources for allocation');
      return false;
    }
    
    // Create or update allocation
    this.resourceAllocations[namespaceId] = {
      namespaceId,
      cpu: resources.cpu,
      memory: resources.memory,
      disk: resources.disk,
      network: resources.network,
      priority
    };
    
    return true;
  }
  
  public async releaseResources(namespaceId: string): Promise<boolean> {
    console.log(`Releasing resources for namespace ${namespaceId}`);
    
    if (!this.resourceAllocations[namespaceId]) {
      console.warn(`No resources allocated for namespace ${namespaceId}`);
      return false;
    }
    
    // Remove allocation
    delete this.resourceAllocations[namespaceId];
    
    return true;
  }
  
  public async updateResourceAllocation(
    namespaceId: string, 
    resources: Partial<NamespaceResourceLimits>,
    priority?: number
  ): Promise<boolean> {
    console.log(`Updating resource allocation for namespace ${namespaceId}`);
    
    const currentAllocation = this.resourceAllocations[namespaceId];
    if (!currentAllocation) {
      console.error(`No resources allocated for namespace ${namespaceId}`);
      return false;
    }
    
    // Create updated allocation
    const updatedAllocation: ResourceAllocation = {
      ...currentAllocation,
      ...resources,
      priority: priority !== undefined ? priority : currentAllocation.priority
    };
    
    // Check if updated allocation is available
    if (!this.areResourcesAvailable({
      cpu: updatedAllocation.cpu,
      memory: updatedAllocation.memory,
      disk: updatedAllocation.disk,
      network: updatedAllocation.network
    }, namespaceId)) {
      console.error('Insufficient system resources for updated allocation');
      return false;
    }
    
    // Update allocation
    this.resourceAllocations[namespaceId] = updatedAllocation;
    
    return true;
  }
  
  public getResourcePresets(): Record<ResourceLimit, NamespaceResourceLimits> {
    // Define resource presets
    return {
      none: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0
      },
      low: {
        cpu: 0.5,
        memory: 512,
        disk: 1024,
        network: 10
      },
      medium: {
        cpu: 1,
        memory: 1024,
        disk: 5120,
        network: 25
      },
      high: {
        cpu: 2,
        memory: 2048,
        disk: 10240,
        network: 50
      },
      custom: {
        // Custom preset doesn't have predefined values
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0
      }
    };
  }
  
  public async applyResourceLimits(namespaceId: string, containerId: string): Promise<boolean> {
    console.log(`Applying resource limits for namespace ${namespaceId} to container ${containerId}`);
    
    const allocation = this.resourceAllocations[namespaceId];
    if (!allocation) {
      console.error(`No resources allocated for namespace ${namespaceId}`);
      return false;
    }
    
    try {
      // Apply resource limits to container
      await containerService.updateContainerResources(containerId, {
        cpu: allocation.cpu,
        memory: allocation.memory,
        disk: allocation.disk,
        network: allocation.network
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to apply resource limits to container ${containerId}:`, error);
      return false;
    }
  }
  
  public getResourceUtilization(namespaceId: string): Promise<{
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  } | null> {
    const allocation = this.resourceAllocations[namespaceId];
    if (!allocation) {
      return Promise.resolve(null);
    }
    
    // In a real implementation, this would get actual resource utilization
    // For now, we'll return mock data
    return Promise.resolve({
      cpu: Math.random() * allocation.cpu * 100, // percentage of allocated CPU
      memory: Math.random() * allocation.memory * 0.8, // MB used
      disk: Math.random() * allocation.disk * 0.7, // MB used
      network: Math.random() * allocation.network * 0.6 // Mbps used
    });
  }
  
  public getTotalAllocatedResources(): NamespaceResourceLimits {
    // Calculate total allocated resources
    const allocations = Object.values(this.resourceAllocations);
    
    return allocations.reduce((total, allocation) => {
      return {
        cpu: total.cpu + allocation.cpu,
        memory: total.memory + allocation.memory,
        disk: total.disk + allocation.disk,
        network: total.network + allocation.network
      };
    }, { cpu: 0, memory: 0, disk: 0, network: 0 });
  }
  
  public getAvailableResources(): NamespaceResourceLimits {
    const allocated = this.getTotalAllocatedResources();
    
    return {
      cpu: Math.max(0, this.systemResources.cpuCores - allocated.cpu),
      memory: Math.max(0, this.systemResources.availableMemory - allocated.memory),
      disk: Math.max(0, this.systemResources.availableDisk - allocated.disk),
      network: Math.max(0, this.systemResources.networkBandwidth - allocated.network)
    };
  }
  
  private areResourcesAvailable(
    resources: NamespaceResourceLimits, 
    excludeNamespaceId?: string
  ): boolean {
    // Get available resources excluding the specified namespace
    const available = this.getAvailableResources();
    
    // If excluding a namespace, add its allocation back to available
    if (excludeNamespaceId && this.resourceAllocations[excludeNamespaceId]) {
      const excludedAllocation = this.resourceAllocations[excludeNamespaceId];
      available.cpu += excludedAllocation.cpu;
      available.memory += excludedAllocation.memory;
      available.disk += excludedAllocation.disk;
      available.network += excludedAllocation.network;
    }
    
    // Check if resources are available
    return (
      resources.cpu <= available.cpu &&
      resources.memory <= available.memory &&
      resources.disk <= available.disk &&
      resources.network <= available.network
    );
  }
}

// Export singleton instance
export const resourceService = new ResourceService();

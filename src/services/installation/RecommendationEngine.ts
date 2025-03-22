import { LogService } from '../logging/LogService';
import { RepositoryInfo } from './RepositoryScanner';
import { CompatibilityResult } from './CompatibilityChecker';
import * as semver from 'semver';

/**
 * User preferences for server recommendation
 */
export interface UserPreferences {
  usageType?: 'personal' | 'development' | 'production';
  prioritizeFactor?: 'stability' | 'features' | 'performance' | 'ease-of-use';
  requiredFeatures?: string[];
  preferredOwner?: string;
  minimumVersion?: string;
}

/**
 * Server recommendation with explanation
 */
export interface ServerRecommendation {
  repository: RepositoryInfo;
  score: number;
  compatibility: CompatibilityResult;
  reasons: string[];
  alternatives: RepositoryInfo[];
}

/**
 * Options for recommendation engine
 */
export interface RecommendationEngineOptions {
  logService: LogService;
}

/**
 * Engine for recommending MCP servers based on user preferences and system compatibility
 */
export class RecommendationEngine {
  private logService: LogService;
  
  // Feature keywords mapping
  private featureKeywords: Record<string, string[]> = {
    'chat': ['chat', 'conversation', 'dialogue'],
    'image-generation': ['image', 'dalle', 'vision', 'img'],
    'completions': ['completion', 'text-generation', 'generate'],
    'embeddings': ['embedding', 'vector', 'semantic'],
    'function-calling': ['function', 'tool', 'plugin', 'action'],
    'streaming': ['stream', 'sse', 'realtime', 'real-time'],
    'websockets': ['websocket', 'ws', 'wss'],
    'multiple-models': ['multi-model', 'multiple-models', 'model-agnostic'],
    'web-search': ['search', 'web', 'retrieval'],
    'memory': ['memory', 'context', 'history']
  };
  
  constructor(options: RecommendationEngineOptions) {
    this.logService = options.logService;
  }
  
  /**
   * Recommend servers based on compatibility results and user preferences
   * @param compatibilityResults Compatibility check results
   * @param userPreferences User preferences
   */
  recommendServers(
    compatibilityResults: CompatibilityResult[],
    userPreferences: UserPreferences = {}
  ): ServerRecommendation[] {
    this.logService.info('RecommendationEngine', 'Generating server recommendations');
    
    // Filter compatible servers
    const compatibleServers = compatibilityResults.filter(result => result.compatible);
    
    if (compatibleServers.length === 0) {
      this.logService.warn('RecommendationEngine', 'No compatible servers found');
      return [];
    }
    
    // Score each server
    const scoredServers = compatibleServers.map(compatibility => {
      const repository = compatibility.repository;
      
      // Start with compatibility score
      let score = compatibility.score;
      const reasons: string[] = [];
      
      // Adjust score based on user preferences
      
      // 1. Check version if minimum is specified
      if (userPreferences.minimumVersion && repository.version) {
        if (semver.valid(repository.version) && semver.valid(userPreferences.minimumVersion)) {
          if (semver.lt(repository.version, userPreferences.minimumVersion)) {
            score -= 30;
            reasons.push(`Version ${repository.version} is below minimum required version ${userPreferences.minimumVersion}`);
          } else {
            reasons.push(`Meets version requirement (${repository.version})`);
          }
        }
      }
      
      // 2. Adjust for usage type
      if (userPreferences.usageType) {
        switch (userPreferences.usageType) {
          case 'personal':
            // For personal use, prioritize ease of use and simplicity
            if (repository.description.toLowerCase().includes('simple') || 
                repository.description.toLowerCase().includes('easy')) {
              score += 10;
              reasons.push('Good for personal use (emphasis on simplicity)');
            }
            break;
          
          case 'development':
            // For development, prioritize documentation and flexibility
            if (repository.description.toLowerCase().includes('develop') || 
                repository.description.toLowerCase().includes('customiz') ||
                repository.description.toLowerCase().includes('extend')) {
              score += 15;
              reasons.push('Good for development (emphasizes customization)');
            }
            break;
          
          case 'production':
            // For production, prioritize stability and performance
            if (repository.description.toLowerCase().includes('stable') || 
                repository.description.toLowerCase().includes('production') ||
                repository.description.toLowerCase().includes('performance')) {
              score += 20;
              reasons.push('Suitable for production use (emphasizes stability/performance)');
            }
            break;
        }
      }
      
      // 3. Adjust for prioritized factor
      if (userPreferences.prioritizeFactor) {
        switch (userPreferences.prioritizeFactor) {
          case 'stability':
            // Prioritize stability - higher version numbers and active maintenance
            if (repository.lastUpdated && new Date().getTime() - repository.lastUpdated.getTime() < 90 * 24 * 60 * 60 * 1000) {
              score += 15;
              reasons.push('Recently updated (within last 90 days)');
            }
            break;
          
          case 'features':
            // Prioritize feature richness
            if (repository.tags.length > 3) {
              score += 10;
              reasons.push('Feature-rich (has multiple capability tags)');
            }
            break;
          
          case 'performance':
            // Prioritize performance
            if (repository.description.toLowerCase().includes('fast') || 
                repository.description.toLowerCase().includes('performance') ||
                repository.description.toLowerCase().includes('efficient')) {
              score += 15;
              reasons.push('Emphasizes performance');
            }
            break;
          
          case 'ease-of-use':
            // Prioritize ease of use
            if (repository.description.toLowerCase().includes('simple') || 
                repository.description.toLowerCase().includes('easy') ||
                repository.description.toLowerCase().includes('beginner')) {
              score += 15;
              reasons.push('Emphasizes ease of use');
            }
            break;
        }
      }
      
      // 4. Check for required features
      if (userPreferences.requiredFeatures && userPreferences.requiredFeatures.length > 0) {
        const missingFeatures: string[] = [];
        
        for (const feature of userPreferences.requiredFeatures) {
          if (!this.hasFeature(repository, feature)) {
            missingFeatures.push(feature);
          }
        }
        
        if (missingFeatures.length > 0) {
          // Major penalty for missing required features
          score -= 30 * missingFeatures.length;
          reasons.push(`Missing required features: ${missingFeatures.join(', ')}`);
        } else {
          score += 20;
          reasons.push(`Includes all required features: ${userPreferences.requiredFeatures.join(', ')}`);
        }
      }
      
      // 5. Check for preferred owner
      if (userPreferences.preferredOwner && repository.owner.toLowerCase() === userPreferences.preferredOwner.toLowerCase()) {
        score += 15;
        reasons.push(`From preferred owner: ${repository.owner}`);
      }
      
      // Additional scoring factors
      
      // 6. Stars indicate popularity
      if (repository.stars > 100) {
        score += 10;
        reasons.push(`Popular repository (${repository.stars} stars)`);
      } else if (repository.stars > 10) {
        score += 5;
        reasons.push(`Moderately starred repository (${repository.stars} stars)`);
      }
      
      // 7. Recent updates indicate maintenance
      if (repository.lastUpdated) {
        const daysSinceUpdate = (new Date().getTime() - repository.lastUpdated.getTime()) / (24 * 60 * 60 * 1000);
        
        if (daysSinceUpdate < 30) {
          score += 10;
          reasons.push('Recently updated (within last 30 days)');
        } else if (daysSinceUpdate < 90) {
          score += 5;
          reasons.push('Updated within last 90 days');
        } else if (daysSinceUpdate > 365) {
          score -= 20;
          reasons.push('Not updated in over a year');
        }
      }
      
      // Cap score at 100
      score = Math.min(100, Math.max(0, score));
      
      return {
        repository,
        score,
        compatibility,
        reasons,
        alternatives: [] // Will fill this later
      };
    });
    
    // Sort by score
    scoredServers.sort((a, b) => b.score - a.score);
    
    // For each recommendation, find alternatives
    for (const recommendation of scoredServers) {
      // Find repositories similar to this one
      recommendation.alternatives = this.findAlternatives(
        recommendation.repository,
        scoredServers.map(s => s.repository)
      );
    }
    
    return scoredServers;
  }
  
  /**
   * Check if a repository has a specific feature
   * @param repository Repository to check
   * @param featureName Feature name
   */
  private hasFeature(repository: RepositoryInfo, featureName: string): boolean {
    // Check if feature name is in our keywords mapping
    const keywords = this.featureKeywords[featureName.toLowerCase()] || [featureName.toLowerCase()];
    
    // Check repository tags
    for (const tag of repository.tags) {
      if (keywords.some(keyword => tag.toLowerCase().includes(keyword))) {
        return true;
      }
    }
    
    // Check repository description
    if (repository.description && keywords.some(keyword => repository.description.toLowerCase().includes(keyword))) {
      return true;
    }
    
    // Check repository name
    if (keywords.some(keyword => repository.name.toLowerCase().includes(keyword))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Find alternative repositories similar to a given one
   * @param repository Base repository
   * @param allRepositories All available repositories
   */
  private findAlternatives(repository: RepositoryInfo, allRepositories: RepositoryInfo[]): RepositoryInfo[] {
    // Create a list of repositories with similarity scores
    const similarities = allRepositories
      .filter(repo => repo.id !== repository.id) // Exclude the base repository
      .map(repo => {
        // Calculate similarity based on tags, description, and owner
        let similarity = 0;
        
        // Similar tags
        const baseTags = new Set(repository.tags.map(t => t.toLowerCase()));
        const repoTags = new Set(repo.tags.map(t => t.toLowerCase()));
        const commonTags = new Set([...baseTags].filter(x => repoTags.has(x)));
        
        similarity += (commonTags.size / Math.max(1, baseTags.size)) * 50;
        
        // Similar description keywords
        const baseWords = new Set(repository.description.toLowerCase().split(/\W+/).filter(w => w.length > 3));
        const repoWords = new Set(repo.description.toLowerCase().split(/\W+/).filter(w => w.length > 3));
        const commonWords = new Set([...baseWords].filter(x => repoWords.has(x)));
        
        similarity += (commonWords.size / Math.max(1, baseWords.size)) * 30;
        
        // Same owner
        if (repo.owner === repository.owner) {
          similarity += 20;
        }
        
        return {
          repository: repo,
          similarity
        };
      });
    
    // Sort by similarity and return top 3
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, 3).map(s => s.repository);
  }
  
  /**
   * Get the most suitable server based on compatibility and preferences
   * @param compatibilityResults Compatibility check results
   * @param userPreferences User preferences
   */
  getBestServerRecommendation(
    compatibilityResults: CompatibilityResult[],
    userPreferences: UserPreferences = {}
  ): ServerRecommendation | null {
    const recommendations = this.recommendServers(compatibilityResults, userPreferences);
    
    if (recommendations.length === 0) {
      return null;
    }
    
    return recommendations[0];
  }
}
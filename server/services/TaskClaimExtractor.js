import { ClaimSchema } from '../models/ClaimModels.js';
import { v4 as uuidv4 } from 'uuid';

export class TaskClaimExtractor {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.claimTypes = ['duration', 'dependency', 'resource', 'deadline', 'requirement'];
  }

  /**
   * Extract all claims from a bimodal task
   * @param {Object} bimodalTask - The task to extract claims from
   * @returns {Array} Array of validated claims
   */
  async extractClaims(bimodalTask) {
    const claims = [];

    try {
      // Duration claim
      if (bimodalTask.duration) {
        const durationClaim = this.createDurationClaim(bimodalTask);
        claims.push(ClaimSchema.parse(durationClaim));
      }

      // Start date claim
      if (bimodalTask.startDate) {
        const startDateClaim = this.createStartDateClaim(bimodalTask);
        claims.push(ClaimSchema.parse(startDateClaim));
      }

      // Dependency claims
      if (bimodalTask.dependencies && bimodalTask.dependencies.length > 0) {
        const dependencyClaims = this.createDependencyClaims(bimodalTask);
        dependencyClaims.forEach(claim => claims.push(ClaimSchema.parse(claim)));
      }

      // Regulatory requirement claim
      if (bimodalTask.regulatoryRequirement?.isRequired) {
        const regulatoryClaim = this.createRegulatoryClaim(bimodalTask);
        claims.push(ClaimSchema.parse(regulatoryClaim));
      }

      // Resource claims (if present)
      if (bimodalTask.resources) {
        const resourceClaims = this.createResourceClaims(bimodalTask);
        resourceClaims.forEach(claim => claims.push(ClaimSchema.parse(claim)));
      }

      this.logger.info(`Extracted ${claims.length} claims from task ${bimodalTask.id}`);
      return claims;

    } catch (error) {
      this.logger.error(`Failed to extract claims from task ${bimodalTask.id}:`, error);
      throw error;
    }
  }

  createDurationClaim(task) {
    return {
      id: this.generateClaimId(task.id, 'duration'),
      taskId: task.id,
      claim: `Duration is ${task.duration.value} ${task.duration.unit}`,
      claimType: 'duration',
      source: this.extractSource(task, task.duration),
      confidence: task.duration.confidence,
      contradictions: [],
      validatedAt: new Date().toISOString()
    };
  }

  createStartDateClaim(task) {
    return {
      id: this.generateClaimId(task.id, 'startDate'),
      taskId: task.id,
      claim: `Starts on ${task.startDate.value}`,
      claimType: 'deadline',
      source: this.extractSource(task, task.startDate),
      confidence: task.startDate.confidence,
      contradictions: [],
      validatedAt: new Date().toISOString()
    };
  }

  createDependencyClaims(task) {
    return task.dependencies.map((depId, index) => ({
      id: this.generateClaimId(task.id, `dependency-${index}`),
      taskId: task.id,
      claim: `Depends on task ${depId}`,
      claimType: 'dependency',
      source: this.extractSource(task, { origin: 'explicit' }),
      confidence: task.confidence,
      contradictions: [],
      validatedAt: new Date().toISOString()
    }));
  }

  createRegulatoryClaim(task) {
    return {
      id: this.generateClaimId(task.id, 'regulatory'),
      taskId: task.id,
      claim: `Requires ${task.regulatoryRequirement.regulation} approval`,
      claimType: 'requirement',
      source: this.extractSource(task, task.regulatoryRequirement),
      confidence: task.regulatoryRequirement.confidence,
      contradictions: [],
      validatedAt: new Date().toISOString()
    };
  }

  createResourceClaims(task) {
    // Placeholder for resource claims
    return [];
  }

  extractSource(task, fieldData) {
    if (fieldData?.sourceCitations && fieldData.sourceCitations.length > 0) {
      return {
        documentName: fieldData.sourceCitations[0].documentName,
        provider: fieldData.sourceCitations[0].provider || 'INTERNAL',
        citation: fieldData.sourceCitations[0]
      };
    }

    if (fieldData?.inferenceRationale) {
      return {
        documentName: 'inferred',
        provider: fieldData.inferenceRationale.llmProvider || 'GEMINI',
        citation: null
      };
    }

    return {
      documentName: 'inferred',
      provider: 'GEMINI',
      citation: null
    };
  }

  generateClaimId(taskId, claimType) {
    // Generate a proper UUID for the claim ID
    return uuidv4();
  }

  /**
   * Batch extract claims from multiple tasks
   */
  async extractBatchClaims(tasks) {
    const results = [];

    for (const task of tasks) {
      try {
        const claims = await this.extractClaims(task);
        results.push({
          taskId: task.id,
          claims,
          success: true
        });
      } catch (error) {
        results.push({
          taskId: task.id,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }
}

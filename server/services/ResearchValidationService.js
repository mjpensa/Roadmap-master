import { ClaimLedger } from '../models/ClaimModels.js';
import { v4 as uuidv4 } from 'uuid';

export class ResearchValidationService {
  constructor(options = {}) {
    this.claimLedger = new ClaimLedger();
    this.logger = options.logger || console;
    this.config = {
      minConfidenceThreshold: options.minConfidenceThreshold || 0.5,
      citationCoverageThreshold: options.citationCoverageThreshold || 0.75,
      ...options
    };
  }

  /**
   * Main validation entry point
   * @param {Object} task - BimodalTask object
   * @param {Array} sourceDocuments - Array of source documents
   * @returns {Object} Validation result
   */
  async validateTaskClaims(task, sourceDocuments) {
    this.logger.info(`Validating task: ${task.id} - ${task.name}`);

    try {
      // Step 1: Extract atomic claims from task
      const claims = await this.extractTaskClaims(task);

      // Step 2: Validate each claim through pipeline
      const validatedClaims = [];
      const allContradictions = [];

      for (const claim of claims) {
        // Citation verification
        const citationResult = await this.verifyCitation(claim, sourceDocuments);

        // Contradiction check
        const contradictions = await this.checkContradictions(claim);

        // Provenance audit
        const provenance = await this.auditProvenance(claim, sourceDocuments);

        // Confidence calibration
        const calibratedClaim = await this.calibrateConfidence(
          claim,
          citationResult,
          contradictions,
          provenance
        );

        validatedClaims.push(calibratedClaim);
        allContradictions.push(...contradictions);
      }

      // Step 3: Aggregate results
      return this.aggregateValidationResults(validatedClaims, allContradictions);

    } catch (error) {
      this.logger.error(`Validation failed for task ${task.id}:`, error);
      throw error;
    }
  }

  /**
   * Extract claims from a bimodal task
   */
  async extractTaskClaims(task) {
    const claims = [];

    // Duration claim
    if (task.duration) {
      claims.push({
        id: uuidv4(),
        taskId: task.id,
        claim: `Task "${task.name}" takes ${task.duration.value} ${task.duration.unit}`,
        claimType: 'duration',
        source: this.extractSource(task, 'duration'),
        confidence: task.duration.confidence,
        contradictions: [],
        validatedAt: new Date().toISOString()
      });
    }

    // Start date claim
    if (task.startDate) {
      claims.push({
        id: uuidv4(),
        taskId: task.id,
        claim: `Task "${task.name}" starts on ${task.startDate.value}`,
        claimType: 'deadline',
        source: this.extractSource(task, 'startDate'),
        confidence: task.startDate.confidence,
        contradictions: [],
        validatedAt: new Date().toISOString()
      });
    }

    // Dependency claims
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(depId => {
        claims.push({
          id: uuidv4(),
          taskId: task.id,
          claim: `Task "${task.name}" depends on task ${depId}`,
          claimType: 'dependency',
          source: this.extractSource(task, 'dependencies'),
          confidence: task.confidence,
          contradictions: [],
          validatedAt: new Date().toISOString()
        });
      });
    }

    // Regulatory requirement claim
    if (task.regulatoryRequirement?.isRequired) {
      claims.push({
        id: uuidv4(),
        taskId: task.id,
        claim: `Task "${task.name}" requires ${task.regulatoryRequirement.regulation} approval`,
        claimType: 'requirement',
        source: this.extractSource(task, 'regulatoryRequirement'),
        confidence: task.regulatoryRequirement.confidence,
        contradictions: [],
        validatedAt: new Date().toISOString()
      });
    }

    return claims;
  }

  extractSource(task, field) {
    const fieldData = task[field];

    if (fieldData?.sourceCitations && fieldData.sourceCitations.length > 0) {
      return {
        documentName: fieldData.sourceCitations[0].documentName,
        provider: fieldData.sourceCitations[0].provider || 'INTERNAL',
        citation: fieldData.sourceCitations[0]
      };
    }

    return {
      documentName: 'inferred',
      provider: task.inferenceRationale?.llmProvider || 'UNKNOWN',
      citation: null
    };
  }

  // Placeholder methods - to be implemented in validation pipeline
  async verifyCitation(claim, sourceDocuments) {
    return { valid: true, reason: null };
  }

  async checkContradictions(claim) {
    return [];
  }

  async auditProvenance(claim, sourceDocuments) {
    return { score: 1.0, issues: [] };
  }

  async calibrateConfidence(claim, citationResult, contradictions, provenance) {
    return claim;
  }

  aggregateValidationResults(claims, contradictions) {
    const citedClaims = claims.filter(c => c.source.citation !== null);
    const citationCoverage = claims.length > 0 ? citedClaims.length / claims.length : 0;

    const highSeverityContradictions = contradictions.filter(c => c.severity === 'high');

    const avgProvenance = claims.length > 0
      ? claims.reduce((sum, c) => sum + (c.provenanceScore || 1), 0) / claims.length
      : 1.0;

    return {
      claims,
      contradictions,
      citationCoverage,
      provenanceScore: avgProvenance,
      qualityGates: {
        citationCoverage: citationCoverage >= this.config.citationCoverageThreshold,
        noHighContradictions: highSeverityContradictions.length === 0,
        confidenceThreshold: claims.every(c => c.confidence >= this.config.minConfidenceThreshold)
      }
    };
  }
}

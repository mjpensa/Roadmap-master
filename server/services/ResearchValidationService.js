import { ClaimLedger } from '../models/ClaimModels.js';
import { TaskClaimExtractor } from './TaskClaimExtractor.js';
import { CitationVerifier } from './CitationVerifier.js';
import { ContradictionDetector } from './ContradictionDetector.js';
import { ProvenanceAuditor } from './ProvenanceAuditor.js';
import { ConfidenceCalibrator } from './ConfidenceCalibrator.js';
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

    // Initialize validation services
    this.claimExtractor = new TaskClaimExtractor({ logger: this.logger });
    this.citationVerifier = new CitationVerifier({ logger: this.logger });
    this.contradictionDetector = new ContradictionDetector({ logger: this.logger });
    this.provenanceAuditor = new ProvenanceAuditor({ logger: this.logger });
    this.confidenceCalibrator = new ConfidenceCalibrator({ logger: this.logger });
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
   * Extract claims from a bimodal task (delegates to TaskClaimExtractor)
   */
  async extractTaskClaims(task) {
    return await this.claimExtractor.extractClaims(task);
  }

  /**
   * Verify citation for a claim
   */
  async verifyCitation(claim, sourceDocuments) {
    return await this.citationVerifier.verifyCitation(claim.source?.citation, sourceDocuments);
  }

  /**
   * Check for contradictions with existing claims
   */
  async checkContradictions(claim) {
    const allClaims = this.claimLedger.getAllClaims();
    const contradictions = [];

    for (const existingClaim of allClaims) {
      const contradiction = await this.contradictionDetector.detectContradiction(claim, existingClaim);
      if (contradiction) {
        // Add ID for ledger storage
        const contradictionWithId = {
          id: uuidv4(),
          ...contradiction
        };
        contradictions.push(contradictionWithId);
        this.claimLedger.addContradiction(contradictionWithId);
      }
    }

    // Add claim to ledger after checking
    this.claimLedger.addClaim(claim);

    return contradictions;
  }

  /**
   * Audit provenance of a claim
   */
  async auditProvenance(claim, sourceDocuments) {
    return await this.provenanceAuditor.auditProvenance(claim, sourceDocuments);
  }

  /**
   * Calibrate confidence based on validation results
   */
  async calibrateConfidence(claim, citationResult, contradictions, provenance) {
    return await this.confidenceCalibrator.calibrateConfidence(claim, citationResult, contradictions, provenance);
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

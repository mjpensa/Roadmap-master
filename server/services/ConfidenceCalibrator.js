/**
 * ConfidenceCalibrator - Calibrates confidence scores based on validation results
 *
 * Features:
 * - Citation quality weighting
 * - Contradiction penalty calculation
 * - Provenance score integration
 * - Origin-based adjustment
 * - Bayesian-style confidence updates
 */

export class ConfidenceCalibrator {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.config = {
      citationWeight: options.citationWeight || 0.3,
      contradictionWeight: options.contradictionWeight || 0.25,
      provenanceWeight: options.provenanceWeight || 0.25,
      originWeight: options.originWeight || 0.2,
      ...options
    };
  }

  /**
   * Calibrate confidence score for a claim
   * @param {Object} claim - The claim to calibrate
   * @param {Object} citationResult - Citation verification result
   * @param {Array} contradictions - Detected contradictions
   * @param {Object} provenance - Provenance audit result
   * @returns {Object} Calibrated claim
   */
  async calibrateConfidence(claim, citationResult, contradictions, provenance) {
    const baseConfidence = claim.confidence || 0.5;

    // Calculate adjustment factors
    const citationFactor = this.calculateCitationFactor(citationResult);
    const contradictionFactor = this.calculateContradictionFactor(contradictions);
    const provenanceFactor = provenance.score !== undefined ? provenance.score : 0.5;
    const originFactor = this.calculateOriginFactor(claim);

    // Weighted average
    const calibratedScore =
      citationFactor * this.config.citationWeight +
      contradictionFactor * this.config.contradictionWeight +
      provenanceFactor * this.config.provenanceWeight +
      originFactor * this.config.originWeight;

    // Blend with base confidence (70% calibrated, 30% original)
    const finalConfidence = (calibratedScore * 0.7) + (baseConfidence * 0.3);

    // Add calibration metadata
    const calibratedClaim = {
      ...claim,
      confidence: Math.max(0, Math.min(1, finalConfidence)),
      calibrationMetadata: {
        baseConfidence,
        calibratedScore: finalConfidence,
        factors: {
          citation: citationFactor,
          contradiction: contradictionFactor,
          provenance: provenanceFactor,
          origin: originFactor
        },
        adjustmentReason: this.generateAdjustmentReason({
          citation: citationFactor,
          contradiction: contradictionFactor,
          provenance: provenanceFactor,
          origin: originFactor
        }),
        calibratedAt: new Date().toISOString()
      }
    };

    return calibratedClaim;
  }

  /**
   * Calculate citation quality factor
   */
  calculateCitationFactor(citationResult) {
    if (!citationResult || !citationResult.valid) {
      return 0.3; // Low confidence without valid citation
    }

    // Use citation score if available
    if (citationResult.score !== undefined) {
      return citationResult.score;
    }

    // Use citation confidence if available
    if (citationResult.confidence !== undefined) {
      return citationResult.confidence;
    }

    return 0.9; // High confidence with valid citation
  }

  /**
   * Calculate contradiction penalty factor
   */
  calculateContradictionFactor(contradictions) {
    if (!contradictions || contradictions.length === 0) {
      return 1.0; // No contradictions = high confidence
    }

    // Count contradictions by severity
    const high = contradictions.filter(c => c.severity === 'high').length;
    const medium = contradictions.filter(c => c.severity === 'medium').length;
    const low = contradictions.filter(c => c.severity === 'low').length;

    // Penalty based on severity
    let penalty = 0;
    penalty += high * 0.3;   // High severity: -0.3 each
    penalty += medium * 0.15; // Medium severity: -0.15 each
    penalty += low * 0.05;    // Low severity: -0.05 each

    return Math.max(0.1, 1.0 - penalty);
  }

  /**
   * Calculate origin-based confidence factor
   */
  calculateOriginFactor(claim) {
    // Different confidence based on origin
    if (claim.source?.documentName === 'inferred') {
      return 0.6; // Inferences get lower baseline
    }

    if (claim.source?.citation) {
      return 0.95; // Explicit citations get high baseline
    }

    return 0.7; // Default for explicit without citation
  }

  /**
   * Generate human-readable adjustment reason
   */
  generateAdjustmentReason(factors) {
    const reasons = [];

    if (factors.citation < 0.5) {
      reasons.push('Weak or missing citation');
    }

    if (factors.contradiction < 0.7) {
      reasons.push('Contradictions detected');
    }

    if (factors.provenance < 0.7) {
      reasons.push('Low provenance score');
    }

    if (factors.origin < 0.7) {
      reasons.push('Inference-based claim');
    }

    if (reasons.length === 0) {
      return 'High confidence across all factors';
    }

    return reasons.join('; ');
  }

  /**
   * Calibrate confidence for an entire task
   */
  async calibrateTaskConfidence(task, validationResult) {
    const claims = validationResult.claims || [];

    if (claims.length === 0) {
      return task.confidence || 0.5;
    }

    // Average confidence across all claims
    const avgConfidence = claims.reduce((sum, claim) =>
      sum + (claim.confidence || 0), 0) / claims.length;

    // Adjust based on validation results
    let adjustment = 0;

    // Citation coverage adjustment
    if (validationResult.citationCoverage !== undefined && validationResult.citationCoverage < 0.75) {
      adjustment -= 0.1;
    }

    // Contradiction adjustment
    if (validationResult.contradictions && validationResult.contradictions.length > 0) {
      const highSeverity = validationResult.contradictions.filter(c => c.severity === 'high').length;
      adjustment -= highSeverity * 0.15;
    }

    // Provenance adjustment
    if (validationResult.provenanceScore !== undefined && validationResult.provenanceScore < 0.7) {
      adjustment -= 0.1;
    }

    const finalConfidence = Math.max(0, Math.min(1, avgConfidence + adjustment));

    this.logger.info(`Task ${task.id} confidence: ${task.confidence} → ${finalConfidence}`);

    return finalConfidence;
  }

  /**
   * Batch calibrate multiple claims
   */
  async batchCalibrate(claims, validationResults) {
    const calibrated = [];

    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i];
      const result = validationResults[i] || {};

      try {
        const calibratedClaim = await this.calibrateConfidence(
          claim,
          result.citation || {},
          result.contradictions || [],
          result.provenance || {}
        );
        calibrated.push(calibratedClaim);
      } catch (error) {
        this.logger.error(`Failed to calibrate claim ${claim.id}:`, error);
        calibrated.push(claim); // Return original if calibration fails
      }
    }

    return calibrated;
  }
}

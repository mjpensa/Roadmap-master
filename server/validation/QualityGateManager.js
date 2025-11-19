/**
 * QualityGateManager - Evaluates quality gates for bimodal Gantt data
 *
 * Features:
 * - 5 configurable quality gates
 * - Blocker vs warning classification
 * - Regulatory detection
 * - Custom gate support
 */

import { BimodalGanttDataSchema } from '../schemas/BimodalGanttSchema.js';

export class QualityGateManager {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.gates = [
      {
        name: 'CITATION_COVERAGE',
        threshold: options.citationCoverageThreshold || 0.75,
        blocker: true,
        evaluate: (data) => {
          const cited = data.tasks.filter(t =>
            t.duration?.sourceCitations?.length > 0 ||
            t.startDate?.sourceCitations?.length > 0
          ).length;
          return cited / data.tasks.length;
        }
      },
      {
        name: 'CONTRADICTION_SEVERITY',
        threshold: 'medium',
        blocker: true,
        evaluate: (data) => {
          const highSeverity = data.validationMetadata?.contradictions?.filter(
            c => c.severity === 'high'
          ) || [];
          return highSeverity.length === 0;
        }
      },
      {
        name: 'CONFIDENCE_MINIMUM',
        threshold: options.minConfidence || 0.50,
        blocker: true,
        evaluate: (data) => {
          return data.tasks.every(t => t.confidence >= (options.minConfidence || 0.50));
        }
      },
      {
        name: 'SCHEMA_COMPLIANCE',
        threshold: 1.00,
        blocker: true,
        evaluate: (data) => {
          const result = BimodalGanttDataSchema.safeParse(data);
          return result.success;
        }
      },
      {
        name: 'REGULATORY_FLAGS',
        threshold: 1.00,
        blocker: false,
        evaluate: (data) => {
          const regulatoryTasks = data.tasks.filter(t =>
            this.detectRegulation(t.name) !== 'General Compliance'
          );
          return regulatoryTasks.every(t =>
            t.regulatoryRequirement?.isRequired === true
          );
        }
      }
    ];
  }

  /**
   * Evaluate all quality gates against gantt data
   * @param {Object} ganttData - Bimodal gantt data
   * @returns {Object} Evaluation results
   */
  async evaluate(ganttData) {
    this.logger.info('Evaluating quality gates...');

    const results = {
      passed: true,
      failures: [],
      warnings: [],
      timestamp: new Date().toISOString()
    };

    for (const gate of this.gates) {
      try {
        const score = await gate.evaluate(ganttData);
        const passed = typeof gate.threshold === 'number'
          ? score >= gate.threshold
          : score === true;

        this.logger.info(`Quality gate ${gate.name}: ${passed ? 'PASS' : 'FAIL'} (score: ${score})`);

        if (!passed) {
          const failure = {
            gate: gate.name,
            score,
            threshold: gate.threshold,
            blocker: gate.blocker,
            timestamp: new Date().toISOString()
          };

          if (gate.blocker) {
            results.passed = false;
            results.failures.push(failure);
          } else {
            results.warnings.push(failure);
          }
        }
      } catch (error) {
        this.logger.error(`Quality gate ${gate.name} evaluation failed:`, error);
        results.passed = false;
        results.failures.push({
          gate: gate.name,
          error: error.message,
          blocker: gate.blocker
        });
      }
    }

    this.logger.info(`Quality gates ${results.passed ? 'PASSED' : 'FAILED'}`);
    return results;
  }

  /**
   * Detect regulatory requirement from task name
   * @param {string} taskName - Task name
   * @returns {string} Regulation name or 'General Compliance'
   */
  detectRegulation(taskName) {
    const regulations = {
      'FDA': /FDA|510\(k\)|premarket|clinical trial/i,
      'HIPAA': /HIPAA|protected health|phi|patient privacy/i,
      'SOX': /Sarbanes-Oxley|SOX|financial audit/i,
      'GDPR': /GDPR|data protection|privacy regulation/i,
      'PCI': /PCI DSS|payment card|cardholder data/i
    };

    for (const [regulation, pattern] of Object.entries(regulations)) {
      if (pattern.test(taskName)) {
        return regulation;
      }
    }

    return 'General Compliance';
  }

  /**
   * Add a custom quality gate
   * @param {Object} gate - Gate definition
   */
  addCustomGate(gate) {
    this.gates.push(gate);
  }

  /**
   * Remove a quality gate by name
   * @param {string} gateName - Gate name
   */
  removeGate(gateName) {
    this.gates = this.gates.filter(g => g.name !== gateName);
  }

  /**
   * Get all configured gates
   * @returns {Array} Quality gates
   */
  getGates() {
    return this.gates.map(g => ({
      name: g.name,
      threshold: g.threshold,
      blocker: g.blocker
    }));
  }
}

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ResearchValidationService } from '../../server/services/ResearchValidationService.js';
import { TaskClaimExtractor } from '../../server/services/TaskClaimExtractor.js';
import { BimodalGanttData } from '../../server/schemas/BimodalGanttSchema.js';
import { v4 as uuidv4 } from 'uuid';

describe('Phase 1 Integration Tests', () => {
  let validationService;
  let claimExtractor;

  beforeEach(() => {
    validationService = new ResearchValidationService();
    claimExtractor = new TaskClaimExtractor();
  });

  describe('Complete Bimodal Task Workflow', () => {
    it('Should create and validate a complete bimodal task with explicit origin', async () => {
      const task = {
        id: uuidv4(),
        name: 'Complete FDA 510(k) submission',
        origin: 'explicit',
        confidence: 0.85,
        duration: {
          value: 90,
          unit: 'days',
          confidence: 0.9,
          origin: 'explicit',
          sourceCitations: [{
            documentName: 'FDA_Guidelines.pdf',
            provider: 'INTERNAL',
            startChar: 1200,
            endChar: 1350,
            exactQuote: 'Standard review time is 90 days',
            retrievedAt: new Date().toISOString()
          }]
        },
        regulatoryRequirement: {
          isRequired: true,
          regulation: 'FDA 510(k)',
          confidence: 1.0,
          origin: 'explicit'
        }
      };

      // Step 1: Validate schema
      const parseResult = BimodalGanttData.safeParse({
        id: uuidv4(),
        projectName: 'FDA Approval Project',
        tasks: [task],
        metadata: {
          createdAt: new Date().toISOString(),
          totalTasks: 1,
          factRatio: 1.0,
          avgConfidence: 0.85
        }
      });

      expect(parseResult.success).toBe(true);

      // Step 2: Extract claims
      const claims = await claimExtractor.extractClaims(task);
      expect(claims.length).toBeGreaterThan(0);
      expect(claims.some(c => c.claimType === 'duration')).toBe(true);
      expect(claims.some(c => c.claimType === 'requirement')).toBe(true);

      // Step 3: Validate extracted claims
      const durationClaim = claims.find(c => c.claimType === 'duration');
      expect(durationClaim.confidence).toBe(0.9);
      expect(durationClaim.source.documentName).toBe('FDA_Guidelines.pdf');
      expect(durationClaim.source.provider).toBe('INTERNAL');

      const regulatoryClaim = claims.find(c => c.claimType === 'requirement');
      expect(regulatoryClaim.confidence).toBe(1.0);
      expect(regulatoryClaim.claim).toContain('FDA 510(k)');
    });

    it('Should handle inference-based tasks', async () => {
      const task = {
        id: uuidv4(),
        name: 'Internal team review',
        origin: 'inference',
        confidence: 0.65,
        duration: {
          value: 5,
          unit: 'days',
          confidence: 0.65,
          origin: 'inference',
          inferenceRationale: {
            reasoning: 'Based on typical team review cycles',
            supportingFacts: ['Historical data shows 3-7 day reviews', 'Team size is standard'],
            llmProvider: 'GEMINI',
            temperature: 0.7
          }
        }
      };

      // Extract claims
      const claims = await claimExtractor.extractClaims(task);
      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].source.provider).toBe('GEMINI');
      expect(claims[0].source.documentName).toBe('inferred');
      expect(claims[0].source.citation).toBeNull();
    });

    it('Should validate complete gantt data with multiple tasks', async () => {
      // Generate task IDs first
      const taskIds = {
        requirements: uuidv4(),
        development: uuidv4(),
        testing: uuidv4()
      };

      const tasks = [
        {
          id: taskIds.requirements,
          name: 'Requirements gathering',
          origin: 'explicit',
          confidence: 0.9,
          duration: {
            value: 2,
            unit: 'weeks',
            confidence: 0.9,
            origin: 'explicit',
            sourceCitations: [{
              documentName: 'project_plan.md',
              provider: 'INTERNAL',
              startChar: 100,
              endChar: 200,
              exactQuote: 'Requirements phase: 2 weeks',
              retrievedAt: new Date().toISOString()
            }]
          }
        },
        {
          id: taskIds.development,
          name: 'Development',
          origin: 'explicit',
          confidence: 0.85,
          duration: {
            value: 8,
            unit: 'weeks',
            confidence: 0.85,
            origin: 'explicit'
          },
          dependencies: [taskIds.requirements] // Depends on requirements
        },
        {
          id: taskIds.testing,
          name: 'Testing',
          origin: 'inference',
          confidence: 0.7,
          duration: {
            value: 3,
            unit: 'weeks',
            confidence: 0.7,
            origin: 'inference',
            inferenceRationale: {
              reasoning: 'Standard testing cycle',
              supportingFacts: ['Industry standard'],
              llmProvider: 'GEMINI'
            }
          },
          dependencies: [taskIds.development] // Depends on development
        }
      ];

      // Validate gantt data schema
      const ganttData = {
        id: uuidv4(),
        projectName: 'Software Development Project',
        tasks: tasks,
        metadata: {
          createdAt: new Date().toISOString(),
          totalTasks: tasks.length,
          factRatio: 2 / 3, // 2 explicit, 1 inference
          avgConfidence: (0.9 + 0.85 + 0.7) / 3
        }
      };

      const parseResult = BimodalGanttData.safeParse(ganttData);
      expect(parseResult.success).toBe(true);

      // Extract claims from all tasks
      const allClaims = [];
      for (const task of tasks) {
        const claims = await claimExtractor.extractClaims(task);
        allClaims.push(...claims);
      }

      // Should have duration claims for all tasks
      expect(allClaims.filter(c => c.claimType === 'duration')).toHaveLength(3);

      // Should have dependency claims for tasks 2 and 3
      expect(allClaims.filter(c => c.claimType === 'dependency')).toHaveLength(2);
    });

    it('Should extract and validate task with all claim types', async () => {
      const startDate = new Date('2025-01-01').toISOString();
      const depId = uuidv4();

      const task = {
        id: uuidv4(),
        name: 'FDA Compliance Review',
        origin: 'explicit',
        confidence: 0.88,
        duration: {
          value: 60,
          unit: 'days',
          confidence: 0.9,
          origin: 'explicit',
          sourceCitations: [{
            documentName: 'compliance_guide.pdf',
            provider: 'INTERNAL',
            startChar: 500,
            endChar: 650,
            exactQuote: 'Compliance review typically takes 60 days',
            retrievedAt: new Date().toISOString()
          }]
        },
        startDate: {
          value: startDate,
          confidence: 0.95,
          origin: 'explicit',
          sourceCitations: [{
            documentName: 'timeline.md',
            provider: 'INTERNAL',
            startChar: 100,
            endChar: 200,
            exactQuote: 'Review starts January 1, 2025',
            retrievedAt: new Date().toISOString()
          }]
        },
        dependencies: [depId],
        regulatoryRequirement: {
          isRequired: true,
          regulation: 'FDA 21 CFR Part 820',
          confidence: 1.0,
          origin: 'explicit',
          sourceCitations: [{
            documentName: 'regulatory_requirements.pdf',
            provider: 'INTERNAL',
            startChar: 1000,
            endChar: 1200,
            exactQuote: '21 CFR Part 820 compliance required',
            retrievedAt: new Date().toISOString()
          }]
        }
      };

      // Extract all claims
      const claims = await claimExtractor.extractClaims(task);

      // Verify all claim types are present
      expect(claims.some(c => c.claimType === 'duration')).toBe(true);
      expect(claims.some(c => c.claimType === 'deadline')).toBe(true);
      expect(claims.some(c => c.claimType === 'dependency')).toBe(true);
      expect(claims.some(c => c.claimType === 'requirement')).toBe(true);

      // Verify at least 4 claims (one of each type)
      expect(claims.length).toBeGreaterThanOrEqual(4);

      // Verify citations are preserved
      const durationClaim = claims.find(c => c.claimType === 'duration');
      expect(durationClaim.source.citation).toBeDefined();
      expect(durationClaim.source.citation.exactQuote).toBe('Compliance review typically takes 60 days');
    });

    it('Should validate batch extraction of claims', async () => {
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        tasks.push({
          id: uuidv4(),
          name: `Task ${i + 1}`,
          origin: i % 2 === 0 ? 'explicit' : 'inference',
          confidence: 0.7 + (i * 0.05),
          duration: {
            value: (i + 1) * 10,
            unit: 'days',
            confidence: 0.7 + (i * 0.05),
            origin: i % 2 === 0 ? 'explicit' : 'inference',
            ...(i % 2 === 0 ? {
              sourceCitations: [{
                documentName: `doc${i}.pdf`,
                provider: 'INTERNAL',
                startChar: 100,
                endChar: 200,
                exactQuote: `Task ${i + 1} takes ${(i + 1) * 10} days`,
                retrievedAt: new Date().toISOString()
              }]
            } : {
              inferenceRationale: {
                reasoning: 'Estimated',
                supportingFacts: ['Historical data'],
                llmProvider: 'GEMINI'
              }
            })
          }
        });
      }

      // Batch extract
      const results = await claimExtractor.extractBatchClaims(tasks);

      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);

      // Verify each task has claims
      results.forEach(result => {
        expect(result.claims.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('Should reject gantt data with invalid task', () => {
      const invalidGanttData = {
        id: uuidv4(),
        projectName: 'Invalid Project',
        tasks: [
          {
            id: 'not-a-uuid', // Invalid UUID
            name: 'Invalid Task',
            origin: 'explicit',
            confidence: 0.8,
            duration: {
              value: 10,
              unit: 'days',
              confidence: 0.8,
              origin: 'explicit'
            }
          }
        ],
        metadata: {
          createdAt: new Date().toISOString(),
          totalTasks: 1,
          factRatio: 1.0,
          avgConfidence: 0.8
        }
      };

      const parseResult = BimodalGanttData.safeParse(invalidGanttData);
      expect(parseResult.success).toBe(false);
    });

    it('Should reject task with out-of-bounds confidence', () => {
      const task = {
        id: uuidv4(),
        name: 'Invalid Task',
        origin: 'explicit',
        confidence: 1.5, // Invalid
        duration: {
          value: 10,
          unit: 'days',
          confidence: 0.8,
          origin: 'explicit'
        }
      };

      const ganttData = {
        id: uuidv4(),
        projectName: 'Test Project',
        tasks: [task],
        metadata: {
          createdAt: new Date().toISOString(),
          totalTasks: 1,
          factRatio: 1.0,
          avgConfidence: 1.5
        }
      };

      const parseResult = BimodalGanttData.safeParse(ganttData);
      expect(parseResult.success).toBe(false);
    });
  });
});

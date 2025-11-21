/**
 * Backend Configuration Module
 * Phase 4 Enhancement: Centralized backend configuration
 * Consolidates magic numbers, API settings, and security configuration
 */

import 'dotenv/config';

/**
 * Validates required environment variables
 * @throws {Error} If required variables are missing
 */
function validateEnvironment() {
  // Skip validation in test environment
  if (process.env.NODE_ENV === 'test') {
    console.log('🧪 Test environment detected - skipping strict validation');
    // Set dummy API key if not present
    if (!process.env.API_KEY) {
      process.env.API_KEY = 'test_api_key_for_testing';
    }
    return;
  }

  const required = ['API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please create a .env file with the following:');
    missing.forEach(key => console.error(`  ${key}=your_value_here`));
    process.exit(1);
  }

  // Validate API_KEY format
  if (process.env.API_KEY && process.env.API_KEY.length < 10) {
    console.warn('⚠️  API_KEY looks suspicious - might be invalid (too short)');
  }

  console.log('✅ Environment variables validated');
}

// Validate on module load
validateEnvironment();

/**
 * Backend Configuration Object
 */
export const CONFIG = {
  // Server settings
  SERVER: {
    PORT: parseInt(process.env.PORT, 10) || 3000,
    TRUST_PROXY_HOPS: 1 // Railway uses single proxy layer
  },

  // API Configuration
  API: {
    GEMINI_MODEL: 'gemini-2.5-flash-preview-09-2025',
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
    RETRY_COUNT: 3,
    RETRY_BASE_DELAY_MS: 1000, // 1 second base delay

    // Token limits
    MAX_OUTPUT_TOKENS_CHART: 65536,
    MAX_OUTPUT_TOKENS_ANALYSIS: 65536,
    MAX_OUTPUT_TOKENS_QA: 8192,
    MAX_OUTPUT_TOKENS_EXECUTIVE: 4096,      // NEW: Explicit limit for summaries
    MAX_OUTPUT_TOKENS_PRESENTATION: 16384,  // NEW: Explicit limit for slides

    // Thinking budgets
    THINKING_BUDGET_ANALYSIS: 24576, // Maximum thinking tokens for task analysis (complex reasoning)
    THINKING_BUDGET_RESEARCH: 24576, // Maximum thinking tokens for research synthesis
    THINKING_BUDGET_EXECUTIVE: 16384, // Thinking tokens for executive summaries

    // === DETERMINISTIC SETTINGS (for structured data extraction) ===
    // Use for: Chart generation, task analysis, research extraction
    TEMPERATURE_STRUCTURED: 0.0,    // Zero randomness for reproducibility
    TOP_P_STRUCTURED: 1.0,          // No nucleus sampling (consider all tokens)
    TOP_K_STRUCTURED: 1,            // Only most likely token (deterministic)

    // === CREATIVE SETTINGS (for narrative generation) ===
    // Use for: Executive summaries, presentations, creative narratives
    TEMPERATURE_CREATIVE: 0.7,      // 70% creativity for eloquent summaries
    TOP_P_CREATIVE: 0.95,           // Diverse vocabulary (nucleus sampling)
    TOP_K_CREATIVE: 40,             // Consider top 40 tokens for variety

    // === BALANCED SETTINGS (for Q&A responses) ===
    // Use for: Interactive Q&A, contextual responses
    TEMPERATURE_QA: 0.5,            // Semi-creative (balanced)
    TOP_P_QA: 0.9,                  // Moderate diversity
    TOP_K_QA: 20                    // Moderate token choices
  },

  // File upload limits
  FILES: {
    MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB per file
    MAX_COUNT: 500, // Increased to support folder uploads with many files
    MAX_FIELD_SIZE_BYTES: 200 * 1024 * 1024, // 200MB total - increased for folder uploads

    // PHASE 1 FIX: Research content character limits (after file processing)
    // These limits prevent exceeding Gemini context windows and response truncation
    MAX_RESEARCH_CHARS: 50000, // 50KB for standard mode (conservative limit)
    MAX_RESEARCH_CHARS_SEMANTIC: 100000, // 100KB for semantic mode (extended limit)

    ALLOWED_MIMES: [
      'text/markdown',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream', // Some browsers send .md files with this
      'application/pdf' // PDF support for research synthesis
    ],
    ALLOWED_EXTENSIONS: ['md', 'txt', 'docx', 'pdf']
  },

  // Research Synthesis Feature Configuration
  RESEARCH_SYNTHESIS: {
    LLM_PROVIDERS: ['GEMINI', 'GPT', 'CLAUDE', 'GROK', 'OTHER'],
    MAX_FILES_PER_PROVIDER: 10,
    MAX_CLAIMS_PER_FILE: 500,
    CONFIDENCE_THRESHOLD: 0.7,
    CITATION_REGEX: /\[(\d+)\]/g,
    MAX_PDF_PAGES: 100, // Limit PDF processing to 100 pages
    PDF_TIMEOUT_MS: 30000, // 30 seconds timeout for PDF parsing
    CLAIM_ID_LENGTH: 16 // Length of generated claim IDs
  },

  // Semantic Overlay Engine Configuration
  SEMANTIC: {
    ENABLE_DETERMINISTIC_MODE: process.env.ENABLE_SEMANTIC !== 'false',
    DEFAULT_CONFIDENCE_THRESHOLD: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7'),
    ENABLE_BANKING_RULES: process.env.ENABLE_BANKING_RULES !== 'false',
    CACHE_DETERMINISTIC_RESULTS: process.env.CACHE_SEMANTIC !== 'false',
    MIN_ACCEPTABLE_CONFIDENCE: 0.5, // Below this, inferences are rejected
    FACT_CONFIDENCE: 1.0, // Explicit facts always 100%
    MAX_RESEARCH_CHARS: 1000000, // Maximum research content characters (1M chars ≈ 250k tokens, well within Gemini 2.5 Flash's 1M token limit)
    // Gemini configuration for deterministic mode
    GEMINI: {
      MODEL: 'gemini-2.5-flash-preview-09-2025', // Must match API.GEMINI_MODEL
      API_URL: 'https://generativelanguage.googleapis.com/v1beta',
      TEMPERATURE: 0.0, // CRITICAL: Zero randomness
      TOP_K: 1, // CRITICAL: Only most likely token
      TOP_P: 0.0, // CRITICAL: No nucleus sampling
      MAX_OUTPUT_TOKENS_FACTS: 65536, // Pass 1: Fact extraction (maximum for Gemini 2.5 Flash)
      MAX_OUTPUT_TOKENS_INFERENCES: 65536 // Pass 2: Full structure (maximum for Gemini 2.5 Flash)
    }
  },

  // Timeout settings
  TIMEOUTS: {
    REQUEST_MS: 120000, // 2 minutes
    RESPONSE_MS: 120000
  },

  // PHASE 2 FIX: Job timeout and retry configuration
  JOB: {
    // Timeout for chart generation jobs (adjusts based on input size)
    TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes (default for standard inputs)
    TIMEOUT_LARGE_INPUT_MS: 10 * 60 * 1000, // 10 minutes for large inputs (>30KB)

    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 2000, // 2 seconds base delay
    RETRY_EXPONENTIAL_BACKOFF: true, // Use exponential backoff (2s, 4s, 8s)

    // Size threshold for extended timeout
    LARGE_INPUT_THRESHOLD_CHARS: 30000 // 30KB - inputs above this get extended timeout
  },

  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
    STRICT_MAX_REQUESTS: 20 // For resource-intensive endpoints
  },

  // Session/Storage expiration
  STORAGE: {
    EXPIRATION_MS: 60 * 60 * 1000, // 1 hour
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000 // 5 minutes
  },

  // Cache control (Phase 3 Enhancement: Result caching)
  CACHE: {
    ENABLED: process.env.CACHE_ENABLED !== 'false',              // Enable caching by default
    MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE, 10) || 100,  // Maximum cached items
    TTL_MS: parseInt(process.env.CACHE_TTL_MS, 10) || 3600000,  // 1 hour TTL
    CLEANUP_INTERVAL_MS: parseInt(process.env.CACHE_CLEANUP_MS, 10) || 300000, // 5 minutes cleanup
    STATIC_ASSETS_MAX_AGE: 86400 // 1 day in seconds
  },

  // Security patterns
  SECURITY: {
    // Prompt injection patterns
    // IMPORTANT: These patterns must be kept in sync with Public/config.js
    // Any changes here should be reflected in the client-side config
    INJECTION_PATTERNS: [
      { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, replacement: '[REDACTED]' },
      { pattern: /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, replacement: '[REDACTED]' },
      { pattern: /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, replacement: '[REDACTED]' },
      { pattern: /system\s*:/gi, replacement: '[REDACTED]' },
      { pattern: /\[SYSTEM\]/gi, replacement: '[REDACTED]' },
      { pattern: /\{SYSTEM\}/gi, replacement: '[REDACTED]' },
      { pattern: /new\s+instructions?\s*:/gi, replacement: '[REDACTED]' },
      { pattern: /override\s+instructions?/gi, replacement: '[REDACTED]' },
      { pattern: /you\s+are\s+now\s+/gi, replacement: '[REDACTED]' },
      { pattern: /act\s+as\s+if\s+you\s+are\s+/gi, replacement: '[REDACTED]' },
      { pattern: /pretend\s+(you\s+are|to\s+be)\s+/gi, replacement: '[REDACTED]' }
    ],

    // ID validation patterns
    PATTERNS: {
      CHART_ID: /^[a-f0-9]{32}$/i,
      JOB_ID: /^[a-f0-9]{32}$/i,
      SESSION_ID: /^[a-f0-9]{32}$/i
    }
  },

  // Validation limits
  VALIDATION: {
    MAX_QUESTION_LENGTH: 1000
  },

  // Error messages
  ERRORS: {
    MISSING_TASK_NAME: 'Missing taskName or entity',
    MISSING_SESSION_ID: 'Missing sessionId',
    SESSION_NOT_FOUND: 'Session not found or expired. Please regenerate the chart.',
    QUESTION_REQUIRED: 'Question is required and must be non-empty',
    ENTITY_REQUIRED: 'Entity is required',
    TASK_NAME_REQUIRED: 'Task name is required',
    QUESTION_TOO_LONG: 'Question too long (max 1000 characters)',
    INVALID_CHART_ID: 'Invalid chart ID format',
    CHART_NOT_FOUND: 'Chart not found or expired. Charts are available for 30 days after generation.',
    INVALID_JOB_ID: 'Invalid job ID format',
    JOB_NOT_FOUND: 'Job not found or expired. Jobs are available for 1 hour.',
    FILE_TOO_LARGE: 'File too large. Maximum size is 10MB per file.',
    TOO_MANY_FILES: 'Too many files. Maximum is 500 files per upload.',
    FIELD_TOO_LARGE: 'Field value too large. Maximum total size is 200MB.',
    RATE_LIMIT_EXCEEDED: 'Too many requests from this IP, please try again later.',
    STRICT_RATE_LIMIT_EXCEEDED: 'Too many chart generation requests. Please try again in 15 minutes.',
    INVALID_FILE_EXTENSION: (ext) => `Invalid file extension: .${ext}. Only .md, .txt, and .docx files are allowed.`,
    INVALID_FILE_TYPE: (type) => `Invalid file type: ${type}. Only .md, .txt, and .docx files are allowed.`,

    // PHASE 1 FIX: Research size validation error codes
    RESEARCH_TOO_LARGE: 'RESEARCH_TOO_LARGE', // Error code for oversized research content

    // PHASE 2 FIX: Additional structured error codes for enhanced error tracking
    // Input validation errors
    INVALID_FILE_TYPE_CODE: 'INVALID_FILE_TYPE',
    FILE_TOO_LARGE_CODE: 'FILE_TOO_LARGE',

    // AI API errors
    AI_TIMEOUT: 'AI_TIMEOUT',
    AI_JSON_TRUNCATED: 'AI_JSON_TRUNCATED',
    AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
    AI_MISSING_FIELD: 'AI_MISSING_FIELD',
    AI_RATE_LIMIT: 'AI_RATE_LIMIT',
    AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',

    // Job errors
    JOB_TIMEOUT: 'JOB_TIMEOUT',
    JOB_NOT_FOUND_CODE: 'JOB_NOT_FOUND',

    // System errors
    DATABASE_ERROR: 'DATABASE_ERROR',
    CACHE_ERROR: 'CACHE_ERROR'
  }
};

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.SERVER);
Object.freeze(CONFIG.API);
Object.freeze(CONFIG.FILES);
Object.freeze(CONFIG.JOB); // PHASE 2: Freeze job configuration
Object.freeze(CONFIG.RESEARCH_SYNTHESIS);
Object.freeze(CONFIG.TIMEOUTS);
Object.freeze(CONFIG.RATE_LIMIT);
Object.freeze(CONFIG.STORAGE);
Object.freeze(CONFIG.CACHE);
Object.freeze(CONFIG.SECURITY);
Object.freeze(CONFIG.SECURITY.PATTERNS);
Object.freeze(CONFIG.VALIDATION);
Object.freeze(CONFIG.ERRORS);

/**
 * Builds the Gemini API URL with the API key
 * @returns {string} Full API URL
 */
export function getGeminiApiUrl() {
  return `${CONFIG.API.BASE_URL}/models/${CONFIG.API.GEMINI_MODEL}:generateContent?key=${process.env.API_KEY}`;
}

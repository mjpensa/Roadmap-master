# Bug Remediation Plan - AI Roadmap Tool

**Created**: 2025-11-16
**Total Issues**: 20 bugs across 4 severity levels
**Estimated Total Effort**: 6-8 hours

---

## Executive Summary

This plan addresses 4 **CRITICAL** XSS vulnerabilities, 3 **HIGH** priority issues, 9 **MEDIUM** priority issues, and 4 **LOW** priority issues. The remediation will be executed in priority order to minimize security risks and improve application stability.

---

## Phase 1: CRITICAL Security Fixes (IMMEDIATE - 2 hours)

### Priority: P0 - Execute First

### 1.1 XSS Vulnerability Remediation

**Affected File**: `Public/chart-renderer.js`

**Problem**: Multiple instances of unsanitized data being inserted via `innerHTML`, allowing execution of malicious scripts.

**Root Cause**: Trusting API responses and user input without sanitization.

#### Fix Strategy

**Option A: Use `textContent` (Recommended for text-only content)**
- Safer and simpler
- Automatically escapes HTML entities
- Best for content that doesn't need HTML formatting

**Option B: Implement DOMPurify library**
- Allows safe HTML rendering
- Necessary if LLM responses need formatted output (bold, lists, etc.)
- Adds dependency but provides robust sanitization

**Decision**: Use hybrid approach:
- `textContent` for error messages and simple responses
- DOMPurify for LLM responses that may contain legitimate formatting

#### Specific Changes

**1.1.1 Fix Line 575** - Chat Answer Display
```javascript
// BEFORE (VULNERABLE):
spinnerEl.innerHTML = data.answer;

// AFTER (SECURE):
// Option 1: Text only (simple)
spinnerEl.textContent = data.answer;

// Option 2: Allow safe HTML with DOMPurify
spinnerEl.innerHTML = DOMPurify.sanitize(data.answer);
```
- **Rationale**: LLM responses may contain markdown or formatting, so DOMPurify recommended
- **Line**: 575
- **Risk Eliminated**: Code injection from API responses

**1.1.2 Fix Line 586** - Error Message Display
```javascript
// BEFORE (VULNERABLE):
const errorMsg = `<div class="error-message">Sorry, I encountered an error: ${error.message}</div>`;
spinnerEl.innerHTML = errorMsg;

// AFTER (SECURE):
const errorDiv = document.createElement('div');
errorDiv.className = 'error-message';
errorDiv.textContent = `Sorry, I encountered an error: ${error.message}`;
spinnerEl.innerHTML = ''; // Clear previous content
spinnerEl.appendChild(errorDiv);
```
- **Rationale**: Error messages don't need HTML, safer to use DOM methods
- **Line**: 586
- **Risk Eliminated**: Code injection from error messages

**1.1.3 Fix Line 495-502** - Modal Analysis Data
```javascript
// BEFORE (VULNERABLE):
modalBody.innerHTML = `
  <div class="analysis-content">
    <h3>${analysis.taskName}</h3>
    <div class="analysis-section">
      <h4>Description</h4>
      <p>${analysis.description}</p>
    </div>
    <!-- ... more sections ... -->
  </div>
`;

// AFTER (SECURE):
const content = document.createElement('div');
content.className = 'analysis-content';

const title = document.createElement('h3');
title.textContent = analysis.taskName;
content.appendChild(title);

const descSection = document.createElement('div');
descSection.className = 'analysis-section';
const descTitle = document.createElement('h4');
descTitle.textContent = 'Description';
const descText = document.createElement('p');
descText.textContent = analysis.description;
descSection.appendChild(descTitle);
descSection.appendChild(descText);
content.appendChild(descSection);

// Repeat for other sections...
modalBody.innerHTML = '';
modalBody.appendChild(content);
```
- **Rationale**: Complete DOM approach eliminates all injection vectors
- **Lines**: 495-502
- **Risk Eliminated**: Malicious HTML in analysis data

**1.1.4 Fix Line 608** - Chat Message History
```javascript
// BEFORE (VULNERABLE):
function addMessageToHistory(content, sender) {
  const history = document.getElementById('chat-history');
  const msg = document.createElement('div');
  msg.className = `chat-message ${sender}`;
  msg.innerHTML = content; // VULNERABLE
  history.appendChild(msg);
}

// AFTER (SECURE):
function addMessageToHistory(content, sender) {
  const history = document.getElementById('chat-history');
  if (!history) return; // Also fixes missing null check

  const msg = document.createElement('div');
  msg.className = `chat-message ${sender}`;

  // If content may have legitimate formatting, use DOMPurify
  if (sender === 'assistant') {
    msg.innerHTML = DOMPurify.sanitize(content);
  } else {
    // User messages should never have HTML
    msg.textContent = content;
  }

  history.appendChild(msg);
}
```
- **Rationale**: Differentiate between user and assistant messages
- **Line**: 608
- **Risk Eliminated**: XSS via chat history

**1.1.5 Fix Line 527** - Modal Error Display
```javascript
// BEFORE (VULNERABLE):
document.getElementById('modal-body-content').innerHTML =
  `<div class="modal-error">Failed to load analysis: ${error.message}</div>`;

// AFTER (SECURE):
const modalBody = document.getElementById('modal-body-content');
if (modalBody) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'modal-error';
  errorDiv.textContent = `Failed to load analysis: ${error.message}`;
  modalBody.innerHTML = '';
  modalBody.appendChild(errorDiv);
}
```
- **Line**: 527
- **Risk Eliminated**: XSS via error messages

#### Implementation Steps

1. **Decision Point**: Choose DOMPurify or textContent-only approach
   - If DOMPurify: Add to project via CDN or npm
   - CDN: Add `<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>` to HTML
   - NPM: `npm install dompurify`

2. **Update chart-renderer.js**: Apply all 5 fixes above

3. **Test each fix**:
   - Inject `<script>alert('XSS')</script>` in test data
   - Verify script doesn't execute but text displays properly
   - Ensure legitimate formatting still works (if using DOMPurify)

4. **Code Review**: Verify no other innerHTML usage remains

**Estimated Time**: 1.5-2 hours
**Testing Time**: 30 minutes

---

## Phase 2: HIGH Priority Fixes (URGENT - 1.5 hours)

### Priority: P1 - Execute within 24 hours

### 2.1 Fix HTML Syntax Error (Typo)

**File**: `Public/chart-renderer.js:460`

```javascript
// BEFORE:
<div classs="modal-spinner"></div>

// AFTER:
<div class="modal-spinner"></div>
```

**Impact**: Restores CSS styling for modal spinner
**Estimated Time**: 1 minute
**Testing**: Verify spinner displays correctly when loading

---

### 2.2 Fix URL Validation for XSS

**File**: `Public/chart-renderer.js:645`

**Problem**: URLs from API not validated, allowing `javascript:` protocol attacks

```javascript
// BEFORE (VULNERABLE):
sourceText = `<a href="${item.url}" target="_blank">...`;

// AFTER (SECURE):
function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (e) {
    return false; // Invalid URL
  }
}

// In the code:
if (item.url && isSafeUrl(item.url)) {
  sourceText = `<a href="${item.url}" target="_blank">...`;
} else {
  sourceText = `Source: ${item.title || 'Unknown'}`;
}
```

**Additional Enhancement**: Use `rel="noopener noreferrer"` for security
```javascript
sourceText = `<a href="${item.url}" target="_blank" rel="noopener noreferrer">...`;
```

**Estimated Time**: 15 minutes
**Testing**: Test with malicious URLs like `javascript:alert('XSS')`

---

### 2.3 Fix Unhandled JSON Parsing Errors

**Locations**:
- `Public/chart-renderer.js:29` - sessionStorage parsing
- `Public/chart-renderer.js:486` - Error response parsing
- `Public/main.js:192` - Error response parsing

**2.3.1 Fix sessionStorage JSON Parsing (Line 29)**
```javascript
// BEFORE (CRASHES ON INVALID JSON):
const ganttData = JSON.parse(sessionStorage.getItem('ganttData'));

// AFTER (GRACEFUL ERROR HANDLING):
let ganttData = null;
try {
  const stored = sessionStorage.getItem('ganttData');
  if (stored) {
    ganttData = JSON.parse(stored);
  }
} catch (error) {
  console.error('Failed to parse ganttData from sessionStorage:', error);
  // Optionally clear corrupted data
  sessionStorage.removeItem('ganttData');
  // Redirect to main page or show error
  window.location.href = '/';
}

if (!ganttData) {
  console.error('No gantt data available');
  window.location.href = '/';
}
```

**2.3.2 Fix Error Response Parsing (chart-renderer.js:486)**
```javascript
// BEFORE (ASSUMES JSON):
if (!response.ok) {
  const err = await response.json();
  throw new Error(err.error || `Server error: ${response.status}`);
}

// AFTER (HANDLES NON-JSON RESPONSES):
if (!response.ok) {
  let errorMessage = `Server error: ${response.status}`;
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const err = await response.json();
      errorMessage = err.error || errorMessage;
    } else {
      const text = await response.text();
      errorMessage = text.substring(0, 200) || errorMessage; // Limit error length
    }
  } catch (parseError) {
    console.error('Failed to parse error response:', parseError);
  }
  throw new Error(errorMessage);
}
```

**2.3.3 Fix Error Response Parsing (main.js:192)**
```javascript
// Apply same fix as 2.3.2 above
```

**Estimated Time**: 30 minutes
**Testing**:
- Test with corrupted sessionStorage data
- Test with server returning HTML error pages (500, 404)
- Verify graceful error messages display

---

## Phase 3: MEDIUM Priority Fixes (1.5-2 hours)

### Priority: P2 - Execute within 1 week

### 3.1 Add Null/Undefined Checks for DOM Elements

**Strategy**: Create a helper function for safe DOM access

```javascript
// Add to chart-renderer.js at top:
/**
 * Safely gets DOM element with error logging
 * @param {string} id - Element ID
 * @param {string} context - Context for error message
 * @returns {HTMLElement|null}
 */
function safeGetElement(id, context = '') {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Element not found: ${id}${context ? ` (in ${context})` : ''}`);
  }
  return element;
}

/**
 * Safely queries DOM element
 */
function safeQuerySelector(selector, context = '') {
  const element = document.querySelector(selector);
  if (!element) {
    console.error(`Element not found: ${selector}${context ? ` (in ${context})` : ''}`);
  }
  return element;
}
```

**Apply to all instances**:

**3.1.1 Line 491** - Modal Body
```javascript
// BEFORE:
const modalBody = document.getElementById('modal-body-content');
modalBody.innerHTML = '...'; // Crashes if null

// AFTER:
const modalBody = safeGetElement('modal-body-content', 'showTaskAnalysis');
if (!modalBody) return;
modalBody.innerHTML = '...';
```

**3.1.2 Line 602** - Chat History
```javascript
// BEFORE:
const history = document.getElementById('chat-history');
history.appendChild(msg);

// AFTER:
const history = safeGetElement('chat-history', 'addMessageToHistory');
if (!history) return;
history.appendChild(msg);
```

**3.1.3 Line 536** - Send Button
```javascript
// BEFORE:
const sendBtn = document.querySelector('.chat-send-btn');
sendBtn.disabled = false;

// AFTER:
const sendBtn = safeQuerySelector('.chat-send-btn', 'handleAskQuestion');
if (sendBtn) sendBtn.disabled = false;
```

**Apply same pattern to**:
- Line 36 - SVG element
- Line 50 - Container elements
- Line 515 - Modal elements
- All other unchecked DOM access points

**Estimated Time**: 45 minutes
**Testing**: Remove elements from DOM and verify graceful degradation

---

### 3.2 Fix Race Condition - Multiple Form Submissions

**File**: `Public/main.js:179`

**Problem**: Small window between validation and button disable allows double-submission

```javascript
// BEFORE:
generateBtn.addEventListener('click', async () => {
  // Validation happens here...
  if (!goalName || !entity || !deadline) {
    // ... error handling
    return;
  }

  generateBtn.disabled = true; // TOO LATE - race condition window exists

  try {
    const response = await fetch('/generate', {...});
    // ...
  }
});

// AFTER:
generateBtn.addEventListener('click', async () => {
  // Disable IMMEDIATELY to prevent double-clicks
  if (generateBtn.disabled) return; // Already processing
  generateBtn.disabled = true;

  const originalText = generateBtn.textContent;
  generateBtn.textContent = 'Generating...';

  try {
    // Validation
    const goalName = document.getElementById('goal-name').value.trim();
    const entity = document.getElementById('entity').value;
    const deadline = document.getElementById('deadline').value;

    if (!goalName || !entity || !deadline) {
      alert('Please fill in all fields');
      return; // Will re-enable in finally block
    }

    const response = await fetch('/generate', {...});
    // ... rest of logic

  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
  } finally {
    // Always re-enable button
    generateBtn.disabled = false;
    generateBtn.textContent = originalText;
  }
});
```

**Estimated Time**: 15 minutes
**Testing**: Rapidly click submit button, verify only one request sent

---

### 3.3 Add Environment Variable Validation

**File**: `server.js:10`

**Problem**: Missing API_KEY causes silent failures

```javascript
// BEFORE:
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.API_KEY}`;

// AFTER:
// At top of server.js, before any routes:
function validateEnvironment() {
  const required = ['API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please create a .env file with the following:');
    missing.forEach(key => console.error(`  ${key}=your_value_here`));
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
}

// Call before starting server:
validateEnvironment();

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.API_KEY}`;
```

**Additional Enhancement**: Validate API_KEY format
```javascript
if (process.env.API_KEY && process.env.API_KEY.length < 10) {
  console.warn('⚠️  API_KEY looks suspicious - might be invalid');
}
```

**Estimated Time**: 15 minutes
**Testing**: Remove .env and verify clear error message on startup

---

### 3.4 Improve Error Handling in Server

**Files**: `server.js:39, 83`

**Problem**: Assumes `response.text()` always succeeds

```javascript
// BEFORE:
const errorText = await response.text();
console.error('API Error:', errorText);

// AFTER:
let errorText = 'Unknown error';
try {
  errorText = await response.text();
} catch (e) {
  console.error('Failed to read error response:', e);
}
console.error('API Error:', errorText);
```

**Estimated Time**: 10 minutes

---

### 3.5 Add Input Validation for Ask Question Endpoint

**File**: `server.js` - `/ask-question` endpoint (around line 369-371)

```javascript
// ENHANCE EXISTING VALIDATION:
app.post('/ask-question', async (req, res) => {
  const { question, entity, taskName } = req.body;

  // Add validation
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Question is required and must be non-empty' });
  }

  if (!entity || typeof entity !== 'string' || !entity.trim()) {
    return res.status(400).json({ error: 'Entity is required' });
  }

  if (!taskName || typeof taskName !== 'string' || !taskName.trim()) {
    return res.status(400).json({ error: 'Task name is required' });
  }

  // Limit question length to prevent abuse
  if (question.trim().length > 1000) {
    return res.status(400).json({ error: 'Question too long (max 1000 characters)' });
  }

  // Continue with existing logic...
});
```

**Estimated Time**: 15 minutes
**Testing**: Send requests with empty/invalid data

---

### 3.6 SessionStorage Security Improvements

**Files**: `Public/main.js:212`, `Public/chart-renderer.js:29`

**Current Risk**: After XSS fixes, this is lower priority but still should validate data

```javascript
// In chart-renderer.js:29 (already partially addressed in 2.3.1):
function loadGanttData() {
  try {
    const stored = sessionStorage.getItem('ganttData');
    if (!stored) {
      throw new Error('No gantt data in session');
    }

    const ganttData = JSON.parse(stored);

    // Validate structure
    if (!ganttData || typeof ganttData !== 'object') {
      throw new Error('Invalid gantt data structure');
    }

    if (!Array.isArray(ganttData.tasks) || !ganttData.entity) {
      throw new Error('Gantt data missing required fields');
    }

    return ganttData;

  } catch (error) {
    console.error('Failed to load gantt data:', error);
    sessionStorage.removeItem('ganttData');
    alert('Session data is invalid. Redirecting to home.');
    window.location.href = '/';
    return null;
  }
}

const ganttData = loadGanttData();
if (!ganttData) {
  // Already redirected
}
```

**Estimated Time**: 20 minutes

---

## Phase 4: LOW Priority Fixes (1-1.5 hours)

### Priority: P3 - Execute within 2 weeks or as time permits

### 4.1 Optimize SVG Clone Performance

**File**: `Public/chart-renderer.js:112-118`

**Problem**: Creates fixed 10 clones regardless of need

```javascript
// BEFORE:
for (let i = 0; i < 10; i++) {
  const clone = svgElement.cloneNode(true);
  verticalSvgWrapper.appendChild(clone);
}

// AFTER:
// Calculate how many clones we actually need
const rowHeight = 40; // px per task row
const containerHeight = verticalSvgWrapper.offsetHeight;
const svgHeight = svgElement.offsetHeight;
const clonesNeeded = Math.ceil(containerHeight / svgHeight);

// Add small buffer but cap at reasonable max
const clonesToCreate = Math.min(clonesNeeded + 2, 15);

for (let i = 0; i < clonesToCreate; i++) {
  const clone = svgElement.cloneNode(true);
  verticalSvgWrapper.appendChild(clone);
}
```

**Estimated Time**: 15 minutes
**Testing**: Test with various chart sizes

---

### 4.2 Standardize Optional Chaining Usage

**File**: `Public/chart-renderer.js` - Multiple locations

**Problem**: Inconsistent defensive coding patterns

```javascript
// Create a standard pattern and document it:

/**
 * DOM Access Standard:
 * - Use optional chaining for cleanup operations: element?.remove()
 * - Use explicit null checks for required operations: if (!element) return;
 */

// Cleanup operations (can silently fail):
document.getElementById('old-modal')?.remove();

// Required operations (must check):
const modal = document.getElementById('required-modal');
if (!modal) {
  console.error('Required element not found');
  return;
}
```

**Apply consistently throughout codebase**

**Estimated Time**: 30 minutes

---

### 4.3 Improve Error State Restoration

**File**: `Public/chart-renderer.js:590-595`

**Current Code**:
```javascript
} finally {
  sendBtn.disabled = false;
  sendBtn.textContent = 'Send';
  input.value = '';
}
```

**Enhanced Version**:
```javascript
} finally {
  const sendBtn = document.querySelector('.chat-send-btn');
  const input = document.getElementById('user-question');

  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
  }

  // Only clear input on success, not on error
  // Move to success path instead
}
```

**Estimated Time**: 10 minutes

---

### 4.4 Code Documentation

Add JSDoc comments to critical functions:

```javascript
/**
 * Displays task analysis in a modal
 * @param {Object} analysis - Analysis data from API
 * @param {string} analysis.taskName - Name of the task
 * @param {string} analysis.description - Task description
 * @throws {Error} If modal element not found
 */
function showTaskAnalysis(analysis) {
  // ...
}
```

**Estimated Time**: 30 minutes

---

## Testing Strategy

### Unit Testing (Optional but Recommended)

1. **Install Testing Framework**:
   ```bash
   npm install --save-dev jest @testing-library/dom
   ```

2. **Create Test Files**:
   - `__tests__/sanitization.test.js` - Test XSS prevention
   - `__tests__/validation.test.js` - Test input validation
   - `__tests__/error-handling.test.js` - Test error scenarios

### Manual Testing Checklist

#### Security Testing
- [ ] Test XSS payloads in all input fields
- [ ] Test malicious URLs: `javascript:alert('XSS')`
- [ ] Test `<script>alert('XSS')</script>` in LLM responses
- [ ] Verify DOMPurify sanitizes correctly
- [ ] Test with invalid/corrupted sessionStorage

#### Functionality Testing
- [ ] Generate roadmap with valid data
- [ ] Test with missing/invalid fields
- [ ] Test error responses from API
- [ ] Test chat functionality
- [ ] Test modal analysis display
- [ ] Test with very long inputs
- [ ] Test rapid button clicking
- [ ] Test with API_KEY missing/invalid

#### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

#### Regression Testing
- [ ] All existing features still work
- [ ] No console errors
- [ ] Styles apply correctly
- [ ] All animations work

---

## Implementation Timeline

| Phase | Priority | Time Estimate | Dependencies | Timeline |
|-------|----------|---------------|--------------|----------|
| Phase 1: Critical XSS Fixes | P0 | 2 hours | None | Day 1 (IMMEDIATE) |
| Phase 2: High Priority | P1 | 1.5 hours | None | Day 1-2 |
| Testing & Validation | - | 1 hour | Phases 1-2 | Day 2 |
| Phase 3: Medium Priority | P2 | 2 hours | Phase 1 complete | Week 1 |
| Phase 4: Low Priority | P3 | 1.5 hours | None | Week 2 |
| **TOTAL** | - | **8 hours** | - | **2 weeks** |

---

## Risk Assessment

### High Risk (Complete First)
- XSS vulnerabilities could allow account takeover or data theft
- Unhandled errors cause poor user experience and debugging difficulty
- Missing validation allows malformed data to crash application

### Medium Risk
- Race conditions may cause duplicate API calls (cost implications)
- Missing null checks cause intermittent crashes
- Poor error messages frustrate users

### Low Risk
- Performance issues only notable with large datasets
- Code consistency doesn't affect functionality
- Documentation gaps don't impact runtime

---

## Rollback Plan

1. **Before starting**: Create backup branch
   ```bash
   git checkout -b backup-before-bug-fixes
   git push origin backup-before-bug-fixes
   ```

2. **For each phase**: Commit separately
   ```bash
   git commit -m "Phase 1: Fix XSS vulnerabilities"
   git commit -m "Phase 2: Fix high priority issues"
   ```

3. **If issues arise**: Revert specific commits
   ```bash
   git revert <commit-hash>
   ```

---

## Success Metrics

### Security Metrics
- [ ] Zero XSS vulnerabilities in security scan
- [ ] All user inputs properly sanitized
- [ ] All URLs validated before use

### Stability Metrics
- [ ] Zero unhandled exceptions in production
- [ ] Graceful error messages for all failure scenarios
- [ ] No application crashes from invalid data

### Code Quality Metrics
- [ ] All DOM access has null checks
- [ ] Consistent error handling patterns
- [ ] JSDoc comments on public functions

---

## Post-Remediation Actions

1. **Security Audit**: Run OWASP ZAP or similar tool
2. **Performance Testing**: Verify no performance degradation
3. **User Acceptance Testing**: Have stakeholders test major flows
4. **Documentation Update**: Update README with security improvements
5. **Monitoring**: Add error tracking (Sentry, LogRocket, etc.)

---

## Appendix A: Required Dependencies

If using DOMPurify approach:

```html
<!-- Add to Public/chart.html before closing </body> -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
```

Or via npm:
```bash
npm install dompurify
```

---

## Appendix B: Quick Reference - Priority Order

1. ✅ Fix XSS vulnerabilities (4 instances)
2. ✅ Fix URL validation
3. ✅ Fix JSON parsing errors (3 instances)
4. ✅ Fix HTML typo (classs → class)
5. ✅ Add null checks to DOM access (9 instances)
6. ✅ Fix race condition in form submission
7. ✅ Add environment variable validation
8. ✅ Improve server error handling
9. ✅ Add input validation
10. ✅ Enhance sessionStorage security
11. ⚪ Optimize SVG cloning
12. ⚪ Standardize optional chaining
13. ⚪ Improve error state restoration
14. ⚪ Add code documentation

---

**END OF REMEDIATION PLAN**

*Ready to proceed? Start with Phase 1 (Critical XSS Fixes)*

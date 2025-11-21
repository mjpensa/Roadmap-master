# Error Description - Chart Generation Failure Analysis

**Date:** 2025-11-21
**Environment:** Production (Railway deployment)
**Severity:** CRITICAL
**Status:** Multiple chart generation jobs failing with timeout

---

## Executive Summary

The AI Roadmap Generator is experiencing critical failures during chart generation. Jobs are timing out after 5 minutes (300 seconds) despite multiple retry attempts. The root cause is a combination of malformed JSON responses from the Gemini AI API and missing required data structures in the AI's output.

---

## Error Timeline

### Client-Side Error
```
Error: Job timed out after 5 minutes. Please try again.
Source: main.js:727
Job ID: a6e99cce15905525d140b3389dc8b405
```

### Job Processing Summary
- **Total poll attempts:** 300+ attempts (1 poll per second)
- **Initial phase:** ~148 attempts stuck at "Generating chart data with AI..."
- **Retry phase 2/3:** ~141 attempts (polls 149-289)
- **Retry phase 3/3:** ~11 attempts (polls 290-300)
- **Outcome:** Job timeout, chart generation failed

---

## Root Cause Analysis

### 1. **JSON Truncation Issue (PRIMARY)**

**Error Pattern 1: Truncated at 60,001 Characters**
```
JSON Parse Error: Unexpected end of JSON input
Total JSON length: 60001
```

**Observations:**
- Multiple instances of JSON responses truncated at exactly 60,001 characters
- This suggests a hard limit in the response handling or API configuration
- The AI generates valid JSON but it gets cut off mid-stream
- jsonrepair library attempts to fix it but fails with "Object key expected at position 59"

**Error Pattern 2: Unterminated String**
```
JSON Parse Error: Unterminated string in JSON at position 155410 (line 4 column 155391)
Total JSON length: 155410
```

**Observations:**
- Larger response (155KB) also truncated
- Unterminated string indicates incomplete JSON transmission
- Contains repeated text: "US-EU Cross-Border Payments (2025-2030) - The Great Bifurcation" (repeated multiple times)
- This suggests the AI may be stuck in a repetition loop

### 2. **Missing Required Field: timeColumns**

**Critical Validation Error:**
```
Job 073c14313be541f66484062f848fc8ed: Invalid timeColumns. Type: undefined Value: undefined
Error: AI returned invalid timeColumns (not an array)
Source: server/routes/charts.js:398
```

**Issue:**
- Even when JSON is successfully repaired (second retry attempt), the response lacks the required `timeColumns` field
- The response only contains `data` field
- Validation fails because `timeColumns` is undefined (expected: array)

### 3. **Excessive Retry Delays**

**Timeline:**
- **Attempt 1 failure:** 2025-11-21T00:42:24 (60KB truncated JSON)
- **Retry delay:** 1000ms (1 second)
- **Attempt 2 failure:** 2025-11-21T00:46:22 (60KB truncated JSON, 4 minutes later)
- **Attempt 2 success (partial):** 2025-11-21T00:46:27 (155KB, parsed but missing timeColumns)
- **Attempt 3:** Still processing when job timeout reached

**Problem:** Each AI request appears to take ~4 minutes before failing, causing the 3 retry attempts to exceed the 5-minute job timeout.

---

## Impact Assessment

### Affected Components
1. **Chart Generation Pipeline** (`server/routes/charts.js`)
   - Job ID: `073c14313be541f66484062f848fc8ed`
   - Session created with 12 files (360,068 characters total research)

2. **User Experience**
   - Client polling 300+ times over 5 minutes
   - No progress beyond "Generating chart data with AI..."
   - Final error: "Job timed out after 5 minutes"

3. **Analytics Impact**
   - Event tracked: `chart_failed`
   - Analytics summary updated: `charts_failed = 1`
   - Database analytics correctly recording failures

### Files Processed
- **File count:** 12 research documents
- **Total size:** 360,068 characters (~360KB)
- **Cache status:** MISS (no cached version available)
- **Mode:** STANDARD mode (not semantic)

---

## Technical Details

### Job Processing Flow
```
1. POST /generate-chart → Job created (073c14313be541f66484062f848fc8ed)
2. Background processing started
3. Cache MISS → Generate new chart
4. Call Gemini API (attempt 1)
   → JSON truncated at 60,001 chars
   → Parse failed
   → jsonrepair failed
5. Retry after 1000ms (attempt 2)
   → JSON truncated at 60,001 chars again
   → Parse failed
   → jsonrepair failed
6. Retry again (attempt 2 continued)
   → JSON returned 155,410 chars
   → jsonrepair SUCCESS
   → Validation FAILED (missing timeColumns)
   → Job marked as failed
7. Job continues processing (attempt 3?)
   → Timeout after 5 minutes
```

### Error Locations

**Backend Errors:**
- `server/routes/charts.js:398` - timeColumns validation failure
- JSON parsing in Gemini response handler

**Frontend Errors:**
- `main.js:387` - Job timeout detection
- `main.js:727` - Error display to user

### Server Warnings
```
⚠️  WARNING: Running on Railway with ephemeral filesystem!
⚠️  SQLite database will be DELETED on every container restart!
⚠️  For persistent storage, use Railway Postgres plugin or external database.
```

---

## Data Patterns

### JSON Response Issues

**Truncated JSON Structure (60KB):**
```json
{
  "data": [
    {
      // TRUNCATED MID-OBJECT
```

**Successful Parse but Invalid (155KB):**
```json
{
  "data": [
    // Valid array data
  ]
  // MISSING: timeColumns field
}
```

**Expected Structure:**
```json
{
  "timeColumns": ["Q1 2025", "Q2 2025", ...],
  "data": [...]
}
```

### Repetition Pattern
The unterminated string error shows repeated text:
```
"US-EU Cross-Border Payments (2025-2030) - The Great Bifurcation" (repeated ~3-4 times)
```

This suggests the AI may be generating redundant content, possibly exceeding token limits or getting stuck in a loop.

---

## Probable Causes (Ranked by Likelihood)

### 1. **AI Response Size Exceeding Limits** (90% confidence)
- Research input is 360KB (12 files)
- AI attempting to generate comprehensive roadmap
- Response truncated by:
  - Gemini API response size limit
  - Network buffer size limit
  - Server response handler limit

### 2. **Incorrect JSON Schema Configuration** (75% confidence)
- AI not including `timeColumns` in response
- Schema validation may not be enforced properly
- Prompt may not clearly specify required fields

### 3. **AI Model Context/Token Limits** (70% confidence)
- 360KB research input may exceed effective context window
- AI generates partial response before hitting token limit
- Explains both truncation and repetition patterns

### 4. **Network/Streaming Issues** (40% confidence)
- JSON response may be streamed
- Stream interrupted or closed prematurely
- Less likely given consistent 60,001 character truncation point

---

## Recommended Actions (Priority Order)

### IMMEDIATE (P0)
1. **Investigate 60,001 character limit**
   - Check Gemini API response configuration
   - Review `server/gemini.js` for response size limits
   - Check if there's a hardcoded buffer size

2. **Validate JSON Schema Enforcement**
   - Confirm `CHART_GENERATION_JSON_SCHEMA` includes `timeColumns` as required
   - Review prompt in `server/prompts.js` to ensure clarity
   - Add schema validation to Gemini API request

3. **Reduce Input Size**
   - Implement intelligent truncation for 360KB input
   - Current limit: 50KB for standard mode (config)
   - Actual input: 360KB (7x over limit)
   - **This may be the root cause** - input size exceeded configured limit

### SHORT-TERM (P1)
4. **Improve Error Handling**
   - Add detailed logging for Gemini API responses
   - Log full error responses (currently truncated in logs)
   - Capture partial responses for debugging

5. **Adjust Timeout/Retry Strategy**
   - Increase job timeout beyond 5 minutes for large inputs
   - Reduce retry delay if AI requests take 4+ minutes each
   - Consider exponential backoff with longer initial timeout

6. **Input Validation**
   - Reject uploads exceeding 50KB in standard mode
   - Direct users to semantic mode for larger inputs
   - Add clear error message about size limits

### MEDIUM-TERM (P2)
7. **Implement Progressive Processing**
   - Break large research documents into chunks
   - Generate chart in multiple passes
   - Combine results server-side

8. **Add Monitoring**
   - Track average response sizes from Gemini
   - Alert on responses approaching truncation limits
   - Dashboard for AI API health metrics

9. **Cache Optimization**
   - Implement partial result caching
   - Resume failed jobs from last successful phase
   - Reduce redundant API calls

---

## Testing Recommendations

### Reproduce Error
```bash
# Test with 12 files totaling ~360KB
# Expected: Should fail with truncation or validation error
# Current config limit: 50KB (CONFIG.FILE_LIMITS.MAX_RESEARCH_CHARS)
```

### Test Cases
1. **Large Input Test:** Upload 360KB research → Expect rejection or semantic mode redirect
2. **Schema Validation:** Verify Gemini enforces timeColumns requirement
3. **Truncation Limit:** Test response handling at 60KB, 100KB, 155KB sizes
4. **Timeout Behavior:** Verify job cleanup after 5-minute timeout

---

## Configuration Review Needed

### server/config.js
```javascript
CONFIG.FILE_LIMITS.MAX_RESEARCH_CHARS: 50000  // 50KB limit
// But actual input was 360KB - validation bypassed?
```

### server/prompts.js
- Verify `CHART_GENERATION_JSON_SCHEMA` requires `timeColumns`
- Check if prompt clearly instructs AI to include timeColumns

### server/gemini.js
- Check response size limits
- Verify streaming vs. buffered response handling
- Review timeout settings for AI API calls

---

## Related Issues

### Non-Critical Warnings
- **Tailwind CDN Warning:** Not production-ready (known issue, documented)
- **Favicon 404:** Missing favicon.ico (cosmetic)
- **Ephemeral Storage Warning:** Expected on Railway (documented limitation)

---

## Success Criteria for Resolution

1. ✅ Jobs with 360KB input either:
   - Process successfully in semantic mode, OR
   - Fail gracefully with clear size limit error

2. ✅ No JSON truncation at 60,001 characters

3. ✅ All successful responses include required `timeColumns` field

4. ✅ Retry mechanism completes within 5-minute timeout OR timeout extended appropriately

5. ✅ Clear user feedback if input exceeds limits

---

## Additional Notes

### Cache Behavior
```
Cache key: 12ff5df3369081f8...
Cache MISS - Generating new chart
Cleanup interval started (every 300s)
```
- Cache functioning correctly
- This was a new request (no cached result)
- Cache could help if retry succeeds and user tries again

### Analytics Tracking
- System correctly tracked failure in analytics
- Event type: `chart_failed`
- Error message stored: "AI returned invalid timeColumns (not an array)"
- Analytics summary updated for date: 2025-11-21

---

## Appendix: Key Log Excerpts

### Job Creation
```
Creating new job 073c14313be541f66484062f848fc8ed with 12 files
Processed 12 files (360068 characters total)
```

### Truncation Error
```
JSON Parse Error: Unexpected end of JSON input
Total JSON length: 60001
JSON repair failed: Object key expected at position 59
```

### Validation Error
```
Job 073c14313be541f66484062f848fc8ed: Has timeColumns: false Has data: true
Job 073c14313be541f66484062f848fc8ed: Invalid timeColumns. Type: undefined
Error: AI returned invalid timeColumns (not an array)
```

### Client Timeout
```
Poll attempt 300, job status: processing progress: Retrying AI request (attempt 3/3)...
Error generating chart: Error: Job timed out after 5 minutes. Please try again.
```

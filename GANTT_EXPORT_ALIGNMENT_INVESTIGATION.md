# Gantt Export Alignment Investigation

**Date**: 2025-11-22
**Branch**: `claude/gantt-export-alignment-fix-01XY3Do35TeSYBmH6ELhRNfE`
**Status**: Investigation Complete - Solution Proposed

---

## Problem Description

When exporting the Gantt chart to PNG using html2canvas, the grid alignment may be inconsistent with the on-screen display, causing:

1. **Label column width mismatch**: Labels appear cut off or misaligned
2. **Bar positioning errors**: Task bars don't align with the grid columns
3. **Grid line misalignment**: Vertical grid lines don't match time column boundaries
4. **Inconsistent rendering**: Export looks different from the displayed chart

---

## Root Cause Analysis

### Current Implementation (GanttChart.js:355)

```javascript
this.gridElement.style.gridTemplateColumns = `max-content repeat(${numCols}, 1fr)`;
```

**Why `max-content` causes issues:**

1. **Dynamic calculation**: `max-content` tells the browser to size the column based on its largest content item. This calculation happens during layout.

2. **html2canvas rendering difference**: When html2canvas creates a canvas from the DOM, it uses its own rendering engine which may calculate `max-content` differently than the browser's native layout engine.

3. **Font rendering variations**: Small differences in font rendering, anti-aliasing, or text measurement between the live display and canvas export can cause the `max-content` width to differ by several pixels.

4. **Race conditions**: If the chart is still settling (fonts loading, layout shifts) when export begins, the `max-content` calculation may be based on incomplete rendering.

5. **Cross-browser inconsistencies**: Different browsers calculate `max-content` with slight variations, and html2canvas may not match any specific browser's calculation.

### Evidence in Code

**Grid Creation** (GanttChart.js:345-364):
```javascript
_createGrid() {
  this.gridElement = document.createElement('div');
  this.gridElement.className = 'gantt-grid';
  const numCols = this.ganttData.timeColumns.length;

  // PROBLEM: max-content is browser-dependent
  this.gridElement.style.gridTemplateColumns = `max-content repeat(${numCols}, 1fr)`;

  this._createHeaderRow(numCols);
  this._createDataRows(numCols);
  this.chartWrapper.appendChild(this.gridElement);
}
```

**Bar Positioning** (GanttChart.js:541):
```javascript
// Bars are positioned using grid-column
barEl.style.gridColumn = `${bar.startCol} / ${bar.endCol}`;

// If the grid template is misaligned, bars appear in wrong positions
```

**Export Implementation** (GanttChart.js:1200-1206):
```javascript
const canvas = await html2canvas(chartContainer, {
  useCORS: true,
  logging: false,
  scale: 2, // 2x resolution can amplify alignment issues
  allowTaint: false,
  backgroundColor: null
});
```

---

## Impact Assessment

**Severity**: Medium-High
- Exports are a critical feature for presentations and documentation
- Misaligned exports reduce professional credibility
- Users may not trust the tool if exports are inconsistent

**Affected Users**:
- Banking executives preparing presentations (Light Mode feature)
- Teams sharing roadmaps externally
- Anyone exporting for documentation

**Frequency**:
- Occurs on every export if label content exceeds certain lengths
- More pronounced with:
  - Long task names (>50 characters)
  - Multiple word labels requiring wrapping
  - Complex hierarchies with indentation

---

## Proposed Solutions

### Solution 1: Pre-Calculate Label Width Before Export (RECOMMENDED)

**Approach**: Calculate the rendered width of the label column, set it to a fixed pixel value during export, then restore `max-content` after export completes.

**Implementation**:

```javascript
/**
 * Export chart to PNG with fixed column widths to prevent alignment issues
 * @private
 */
async _exportToPNGWithAlignment() {
  const chartContainer = document.getElementById('gantt-chart-container');
  const exportBtn = document.getElementById('export-btn');

  if (!exportBtn || !chartContainer) {
    console.warn('Export button or chart container not found.');
    return;
  }

  exportBtn.addEventListener('click', async () => {
    const startTime = performance.now();
    exportBtn.textContent = 'Exporting...';
    exportBtn.disabled = true;

    const loadingOverlay = this._createExportLoadingOverlay();
    document.body.appendChild(loadingOverlay);

    try {
      // SOLUTION: Fix column widths before export
      const originalGridTemplate = this.gridElement.style.gridTemplateColumns;

      // Calculate the actual rendered width of the first column (labels)
      const firstColumnWidth = this._calculateLabelColumnWidth();

      // Set fixed width for export (prevents html2canvas from recalculating)
      const numCols = this.ganttData.timeColumns.length;
      this.gridElement.style.gridTemplateColumns = `${firstColumnWidth}px repeat(${numCols}, 1fr)`;

      // Also fix widths for virtual rows if they exist
      const virtualRows = this.gridElement.querySelectorAll('.gantt-virtual-row');
      virtualRows.forEach(row => {
        row.style.gridTemplateColumns = `${firstColumnWidth}px repeat(${numCols}, 1fr)`;
      });

      // Wait for layout to settle
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve)); // Double RAF for stability

      const canvas = await html2canvas(chartContainer, {
        useCORS: true,
        logging: false,
        scale: 2,
        allowTaint: false,
        backgroundColor: null
      });

      // Restore original grid template
      this.gridElement.style.gridTemplateColumns = originalGridTemplate;
      virtualRows.forEach(row => {
        row.style.gridTemplateColumns = originalGridTemplate;
      });

      // Create download
      const link = document.createElement('a');
      link.download = 'gantt-chart.png';
      link.href = canvas.toDataURL('image/png');
      link.click();

      const duration = Math.round(performance.now() - startTime);
      console.log(`✓ PNG export completed in ${duration}ms`);

      trackEvent('export_png', {
        taskCount: this.ganttData.data.length,
        exportTime: duration,
        isExecutiveView: this.isExecutiveView,
        isCriticalPathView: this.isCriticalPathView
      });

      exportBtn.textContent = 'Export as PNG';
      exportBtn.disabled = false;
      document.body.removeChild(loadingOverlay);

    } catch (err) {
      console.error('Error exporting canvas:', err);

      // Restore grid template on error
      this.gridElement.style.gridTemplateColumns = originalGridTemplate;

      exportBtn.textContent = 'Export as PNG';
      exportBtn.disabled = false;
      if (loadingOverlay.parentNode) {
        document.body.removeChild(loadingOverlay);
      }
    }
  });
}

/**
 * Calculate the actual rendered width of the label column
 * @returns {number} Width in pixels
 * @private
 */
_calculateLabelColumnWidth() {
  // Get all label elements
  const labels = this.gridElement.querySelectorAll('.gantt-row-label');

  if (labels.length === 0) {
    return 300; // Fallback to default width
  }

  // Find the maximum width among all labels
  let maxWidth = 0;
  labels.forEach(label => {
    const width = label.getBoundingClientRect().width;
    if (width > maxWidth) {
      maxWidth = width;
    }
  });

  // Add small buffer for safety (account for borders, padding)
  return Math.ceil(maxWidth) + 4;
}
```

**Pros**:
- ✅ Maintains responsive `max-content` behavior during normal use
- ✅ Guarantees pixel-perfect alignment during export
- ✅ No visual impact on the displayed chart
- ✅ Works with any label length
- ✅ Minimal code changes

**Cons**:
- ⚠️ Adds slight complexity to export logic
- ⚠️ Requires calculating widths dynamically

---

### Solution 2: Use Fixed Label Width Always

**Approach**: Replace `max-content` with a fixed pixel width (e.g., 300px) for all rendering.

**Implementation**:

```javascript
// In _createGrid() (line 355)
this.gridElement.style.gridTemplateColumns = `300px repeat(${numCols}, 1fr)`;
```

**Pros**:
- ✅ Simple implementation
- ✅ Consistent rendering in all contexts
- ✅ No export-specific logic needed

**Cons**:
- ❌ Long labels will be cut off or require wrapping
- ❌ Short labels waste space
- ❌ Less responsive design
- ❌ May not work well with internationalization

---

### Solution 3: Use Percentage-Based Width

**Approach**: Use a percentage width for the label column (e.g., `20%`).

**Implementation**:

```javascript
// In _createGrid() (line 355)
this.gridElement.style.gridTemplateColumns = `20% repeat(${numCols}, 1fr)`;
```

**Pros**:
- ✅ Scales with container width
- ✅ Simple implementation

**Cons**:
- ❌ May be too wide or too narrow depending on content
- ❌ Doesn't solve the fundamental alignment issue (percentages can also render differently in html2canvas)
- ❌ Less precise than pixel-based widths

---

### Solution 4: Pre-Render to Hidden Canvas for Width Calculation

**Approach**: Before export, render labels to a hidden canvas to get exact widths, then apply.

**Pros**:
- ✅ Most accurate width calculation

**Cons**:
- ❌ Overly complex
- ❌ Performance overhead
- ❌ Not necessary given simpler solutions work

---

## Recommendation

**Implement Solution 1: Pre-Calculate Label Width Before Export**

### Reasoning:

1. **Best of both worlds**: Maintains the responsive `max-content` behavior for normal viewing while ensuring perfect alignment during export.

2. **Proven pattern**: This is a standard approach used in many charting libraries (Chart.js, D3.js, etc.) when preparing for canvas export.

3. **Minimal risk**: Changes are isolated to the export function, so no risk of breaking existing display behavior.

4. **Future-proof**: Works with any label length, internationalization, and dynamic content.

5. **User experience**: No change to the on-screen experience, only improves export quality.

---

## Implementation Plan

### Step 1: Add Width Calculation Helper (GanttChart.js)

```javascript
/**
 * Calculate the actual rendered width of the label column
 * @returns {number} Width in pixels
 * @private
 */
_calculateLabelColumnWidth() {
  const labels = this.gridElement.querySelectorAll('.gantt-row-label');

  if (labels.length === 0) {
    return 300; // Fallback
  }

  let maxWidth = 0;
  labels.forEach(label => {
    const width = label.getBoundingClientRect().width;
    if (width > maxWidth) {
      maxWidth = width;
    }
  });

  return Math.ceil(maxWidth) + 4; // Add buffer
}
```

### Step 2: Modify Export Listener (GanttChart.js:1184-1240)

Replace the export click handler with the new implementation that:
1. Captures original grid template
2. Calculates label column width
3. Sets fixed width
4. Updates virtual rows if present
5. Waits for layout to settle (double RAF)
6. Performs export
7. Restores original grid template

### Step 3: Test Scenarios

- [ ] Export with short labels (<20 chars)
- [ ] Export with long labels (>100 chars)
- [ ] Export with mixed label lengths
- [ ] Export in Executive View mode
- [ ] Export in Critical Path View mode
- [ ] Export in Light Mode theme
- [ ] Export with semantic overlays active
- [ ] Export after drag-to-edit changes
- [ ] Test on different screen sizes
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)

### Step 4: Performance Testing

- Measure export time before/after fix
- Ensure export time doesn't increase significantly
- Target: <3 second export for typical charts (20-30 tasks)

### Step 5: Documentation Update

- Update CLAUDE.md with new export implementation details
- Add troubleshooting section for export alignment
- Document the `_calculateLabelColumnWidth()` helper

---

## Alternative: Quick Fix for Testing

If you need a quick fix to test the hypothesis, temporarily use a fixed width:

```javascript
// In _createGrid() line 355, change from:
this.gridElement.style.gridTemplateColumns = `max-content repeat(${numCols}, 1fr)`;

// To:
this.gridElement.style.gridTemplateColumns = `350px repeat(${numCols}, 1fr)`;
```

This will immediately fix alignment issues but may cause label truncation. Use this only for testing, then implement Solution 1 properly.

---

## Risk Assessment

**Implementation Risk**: Low
- Changes are isolated to export functionality
- Easy to test and verify
- No impact on core rendering logic

**Regression Risk**: Very Low
- Original grid template is preserved and restored
- Fallback values prevent edge case failures
- Double RAF ensures layout stability

**Browser Compatibility**: High
- `getBoundingClientRect()` is widely supported
- `requestAnimationFrame` is standard
- No experimental APIs used

---

## Success Criteria

✅ Exported PNGs have labels that match on-screen display exactly
✅ Grid lines align perfectly with time columns in export
✅ Task bars are positioned correctly relative to grid
✅ Export time remains under 3 seconds for typical charts
✅ All view modes (Executive, Critical Path, Light Theme) export correctly
✅ No visual regression in on-screen display

---

## Next Steps

1. **Implement Solution 1** as described above
2. **Test thoroughly** across all scenarios
3. **Commit with clear message**: `[Export Fix] Pre-calculate label width to prevent alignment issues in PNG export`
4. **Push to branch**: `claude/gantt-export-alignment-fix-01XY3Do35TeSYBmH6ELhRNfE`
5. **Create pull request** with before/after screenshots
6. **Update documentation** with new export behavior

---

**Status**: Ready for implementation
**Estimated effort**: 1-2 hours (implementation + testing)
**Priority**: Medium-High (affects user-facing exports)

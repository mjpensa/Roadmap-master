/**
 * GanttChart Module
 * Phase 3 Enhancement: Extracted from chart-renderer.js
 * Phase 5 Enhancement: Integrated drag-to-edit functionality
 * Handles core Gantt chart rendering, layout, and export functionality
 */

import { CONFIG } from './config.js';
import { safeGetElement, findTodayColumnPosition, buildLegend } from './Utils.js';
import { DraggableGantt } from './DraggableGantt.js';
import { ResizableGantt } from './ResizableGantt.js';
import { ContextMenu } from './ContextMenu.js';
import { ExecutiveSummary } from './ExecutiveSummary.js';

/**
 * GanttChart Class
 * Responsible for rendering and managing the Gantt chart visualization
 */
export class GanttChart {
  /**
   * Creates a new GanttChart instance
   * @param {HTMLElement} container - The DOM element to render the chart into
   * @param {Object} ganttData - The chart configuration and data
   * @param {string} footerSVG - The SVG content for the footer decoration
   * @param {Function} onTaskClick - Callback function when a task is clicked
   */
  constructor(container, ganttData, footerSVG, onTaskClick) {
    this.container = container;
    this.ganttData = ganttData;
    this.footerSVG = footerSVG;
    this.onTaskClick = onTaskClick;
    this.chartWrapper = null;
    this.gridElement = null;
    this.draggableGantt = null; // Phase 5: Drag-to-edit functionality
    this.resizableGantt = null; // Phase 2: Bar resizing functionality
    this.contextMenu = null; // Phase 5: Context menu for color changing
    this.isEditMode = false; // Edit mode toggle - default is read-only
    this.titleElement = null; // Reference to the title element for edit mode
    this.legendElement = null; // Reference to the legend element for edit mode
  }

  /**
   * Renders the complete Gantt chart
   * @returns {void}
   */
  render() {
    if (!this.container) {
      console.error('Could not find chart container!');
      return;
    }

    // Clear container
    this.container.innerHTML = '';

    // Create the main chart wrapper
    this.chartWrapper = document.createElement('div');
    this.chartWrapper.id = 'gantt-chart-container';

    // Build chart components
    this._addLogo();

    // Add stripe above Gantt chart
    this._addHeaderSVG();

    this._addTitle();
    this._createGrid();
    this._addLegend();

    // Add Executive Summary (if available) - positioned below the chart
    if (this.ganttData.executiveSummary) {
      this._addExecutiveSummary();
    }

    // Add footer stripe after Executive Summary
    this._addFooterSVG();

    // Add export and edit mode toggle buttons
    const exportContainer = document.createElement('div');
    exportContainer.className = 'export-container';

    // Edit mode toggle button
    const editModeBtn = document.createElement('button');
    editModeBtn.id = 'edit-mode-toggle-btn';
    editModeBtn.className = 'edit-mode-toggle-button';
    editModeBtn.textContent = this.isEditMode ? '🔓 Edit Mode: ON' : '🔒 Edit Mode: OFF';
    editModeBtn.title = 'Toggle edit mode to enable/disable chart customization';
    editModeBtn.style.backgroundColor = this.isEditMode ? '#50AF7B' : '#BA3930';
    exportContainer.appendChild(editModeBtn);

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.id = 'export-png-btn';
    exportBtn.className = 'export-button';
    exportBtn.textContent = 'Export as PNG';
    exportContainer.appendChild(exportBtn);

    // Append to container
    this.container.appendChild(this.chartWrapper);
    this.container.appendChild(exportContainer);

    // Add listeners
    this._addEditModeToggleListener();
    this._addExportListener();

    // Add "Today" line
    const today = new Date();
    this.addTodayLine(today);

    // Phase 5: Initialize drag-to-edit functionality
    this._initializeDragToEdit();

    // Restore edit mode state if it was enabled before rendering
    console.log('🔧 Checking edit mode state after render:', this.isEditMode);
    if (this.isEditMode) {
      console.log('🔧 Restoring edit mode features after re-render');
      this._enableAllEditFeatures();
    }
  }

  /**
   * Adds the BIP logo to the chart
   * @private
   */
  _addLogo() {
    const logoImg = document.createElement('img');
    logoImg.src = '/bip_logo.png';
    logoImg.alt = 'BIP Logo';

    // Apply inline styles for positioning
    logoImg.style.position = 'absolute';
    logoImg.style.top = '31px'; // Adjusted to keep logo centered in thicker title cell (29px padding)
    logoImg.style.right = '32px';
    logoImg.style.height = `${CONFIG.SIZES.LOGO_HEIGHT}px`;
    logoImg.style.width = 'auto';
    logoImg.style.zIndex = '10';

    this.chartWrapper.appendChild(logoImg);
  }

  /**
   * Adds the chart title
   * @private
   */
  _addTitle() {
    this.titleElement = document.createElement('div');
    this.titleElement.className = 'gantt-title';
    this.titleElement.textContent = this.ganttData.title;

    // Add double-click to edit title (only in edit mode)
    this.titleElement.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (this.isEditMode) {
        this._makeChartTitleEditable();
      }
    });

    this.chartWrapper.appendChild(this.titleElement);
  }

  /**
   * Adds the executive summary component to the chart
   * @private
   */
  _addExecutiveSummary() {
    const executiveSummary = new ExecutiveSummary(this.ganttData.executiveSummary);
    const summaryElement = executiveSummary.render();
    this.chartWrapper.appendChild(summaryElement);
  }

  /**
   * Creates the main chart grid with timeline and tasks
   * @private
   */
  _createGrid() {
    this.gridElement = document.createElement('div');
    this.gridElement.className = 'gantt-grid';

    const numCols = this.ganttData.timeColumns.length;
    // Use max-content for first column to auto-expand and fit all text on single line
    this.gridElement.style.gridTemplateColumns = `max-content repeat(${numCols}, 1fr)`;

    // Create header row
    this._createHeaderRow(numCols);

    // Create data rows
    this._createDataRows(numCols);

    this.chartWrapper.appendChild(this.gridElement);
  }

  /**
   * Creates the header row with time column labels
   * @param {number} numCols - Number of time columns
   * @private
   */
  _createHeaderRow(numCols) {
    const headerFragment = document.createDocumentFragment();

    const headerLabel = document.createElement('div');
    headerLabel.className = 'gantt-header gantt-header-label';
    headerFragment.appendChild(headerLabel);

    for (const colName of this.ganttData.timeColumns) {
      const headerCell = document.createElement('div');
      headerCell.className = 'gantt-header';
      headerCell.textContent = colName;
      headerFragment.appendChild(headerCell);
    }

    // Append all header cells at once (single reflow)
    this.gridElement.appendChild(headerFragment);
  }

  /**
   * Creates data rows (swimlanes and tasks)
   * @param {number} numCols - Number of time columns
   * @private
   */
  _createDataRows(numCols) {
    // Use DocumentFragment to batch DOM operations for better performance
    const rowsFragment = document.createDocumentFragment();

    this.ganttData.data.forEach((row, dataIndex) => {
      const isSwimlane = row.isSwimlane;

      // Create label cell
      const labelEl = document.createElement('div');
      labelEl.className = `gantt-row-label ${isSwimlane ? 'swimlane' : 'task'}`;

      // Phase 3: Add row action buttons container
      const labelContent = document.createElement('span');
      labelContent.className = 'label-content';
      labelContent.textContent = row.title;
      labelEl.appendChild(labelContent);

      // Phase 3: Add action buttons for tasks (not swimlanes)
      if (!isSwimlane) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'row-actions';

        const addBtn = document.createElement('button');
        addBtn.className = 'row-action-btn add-task';
        addBtn.title = 'Add task below';
        addBtn.textContent = '+';
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.addNewTaskRow(dataIndex);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'row-action-btn delete-task';
        deleteBtn.title = 'Delete this row';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeTaskRow(dataIndex);
        });

        actionsDiv.appendChild(addBtn);
        actionsDiv.appendChild(deleteBtn);
        labelEl.appendChild(actionsDiv);
      }

      // Phase 1 Enhancement: Add unique row identifier
      labelEl.setAttribute('data-row-id', `row-${dataIndex}`);
      labelEl.setAttribute('data-task-index', dataIndex);

      // Phase 4: Add double-click to edit title (only in edit mode, for both tasks and swimlanes)
      labelContent.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (this.isEditMode) {
          this._makeEditable(labelContent, dataIndex);
        }
      });

      // Create bar area
      const barAreaEl = this._createBarArea(row, numCols, isSwimlane, dataIndex);

      // Add click listeners for tasks (only active when edit mode is OFF)
      if (!isSwimlane && row.bar && row.bar.startCol != null && this.onTaskClick) {
        const taskIdentifier = {
          taskName: row.title,
          entity: row.entity,
          sessionId: this.ganttData.sessionId
        };
        // Wrap click handlers to check edit mode - analysis screen only accessible when edit mode is OFF
        labelEl.addEventListener('click', () => {
          if (!this.isEditMode) {
            this.onTaskClick(taskIdentifier);
          }
        });
        barAreaEl.addEventListener('click', () => {
          if (!this.isEditMode) {
            this.onTaskClick(taskIdentifier);
          }
        });
        labelEl.style.cursor = 'pointer';
        barAreaEl.style.cursor = 'pointer';
      }

      // Add synchronized hover effect for task rows
      if (!isSwimlane) {
        this._addHoverEffects(labelEl, barAreaEl);
      }

      // Add both label and bar area to the fragment
      rowsFragment.appendChild(labelEl);
      rowsFragment.appendChild(barAreaEl);
    });

    // Append all rows at once (single reflow) - major performance improvement
    this.gridElement.appendChild(rowsFragment);
  }

  /**
   * Creates the bar area for a single row
   * @param {Object} row - Row data
   * @param {number} numCols - Number of time columns
   * @param {boolean} isSwimlane - Whether this is a swimlane row
   * @param {number} dataIndex - The index of this row in the data array
   * @returns {HTMLElement} The bar area element
   * @private
   */
  _createBarArea(row, numCols, isSwimlane, dataIndex) {
    const barAreaEl = document.createElement('div');
    barAreaEl.className = `gantt-bar-area ${isSwimlane ? 'swimlane' : 'task'}`;
    barAreaEl.style.gridColumn = `2 / span ${numCols}`;
    barAreaEl.style.gridTemplateColumns = `repeat(${numCols}, 1fr)`;
    barAreaEl.style.position = 'relative';
    barAreaEl.style.display = 'grid';

    // Phase 1 Enhancement: Add unique row identifiers
    barAreaEl.setAttribute('data-row-id', `row-${dataIndex}`);
    barAreaEl.setAttribute('data-task-index', dataIndex);

    // Create individual cell divs within the bar area for proper grid lines
    const cellsFragment = document.createDocumentFragment();
    for (let colIndex = 1; colIndex <= numCols; colIndex++) {
      const cellEl = document.createElement('div');
      cellEl.className = 'gantt-time-cell';
      cellEl.style.gridColumn = colIndex;
      cellEl.style.borderLeft = colIndex > 1 ? `1px solid ${CONFIG.COLORS.GRID_BORDER}` : 'none';
      cellEl.style.borderBottom = `1px solid ${CONFIG.COLORS.GRID_BORDER}`;
      cellEl.style.height = '100%';
      cellsFragment.appendChild(cellEl);
    }
    barAreaEl.appendChild(cellsFragment);

    // Add the bar if it's a task and has bar data
    if (!isSwimlane && row.bar && row.bar.startCol != null) {
      const bar = row.bar;

      const barEl = document.createElement('div');
      barEl.className = 'gantt-bar';
      barEl.setAttribute('data-color', bar.color || 'default');
      barEl.style.gridColumn = `${bar.startCol} / ${bar.endCol}`;

      barAreaEl.appendChild(barEl);
    }

    return barAreaEl;
  }

  /**
   * Adds synchronized hover effects between label and bar area
   * @param {HTMLElement} labelEl - The label element
   * @param {HTMLElement} barAreaEl - The bar area element
   * @private
   */
  _addHoverEffects(labelEl, barAreaEl) {
    // When hovering over the label, highlight the bar area
    labelEl.addEventListener('mouseenter', () => {
      barAreaEl.classList.add('row-hover');
    });
    labelEl.addEventListener('mouseleave', () => {
      barAreaEl.classList.remove('row-hover');
    });

    // When hovering over the bar area, keep it highlighted
    barAreaEl.addEventListener('mouseenter', () => {
      barAreaEl.classList.add('row-hover');
    });
    barAreaEl.addEventListener('mouseleave', () => {
      barAreaEl.classList.remove('row-hover');
    });
  }

  /**
   * Adds the legend if present in data
   * @private
   */
  _addLegend() {
    if (!this.ganttData.legend) {
      this.ganttData.legend = [];
    }

    // Ensure legend includes all colors used in the chart
    this._updateLegendWithUsedColors();

    if (this.ganttData.legend.length === 0) return;

    // Build legend with editable labels (inline format)
    this.legendElement = document.createElement('div');
    this.legendElement.className = 'gantt-legend';

    // Create a single-line container for "Legend:" and items
    const legendLine = document.createElement('div');
    legendLine.className = 'legend-line';

    // Add "Legend:" prefix
    const title = document.createElement('span');
    title.className = 'legend-title';
    title.textContent = 'Legend:';
    legendLine.appendChild(title);

    // Create list container for items
    const list = document.createElement('div');
    list.className = 'legend-list';

    this.ganttData.legend.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'legend-item';
      itemEl.setAttribute('data-legend-index', index);

      const colorBox = document.createElement('div');
      colorBox.className = 'legend-color-box';
      colorBox.setAttribute('data-color', item.color);

      const labelWrapper = document.createElement('span');
      labelWrapper.className = 'legend-label-wrapper';

      const label = document.createElement('span');
      label.className = 'legend-label';
      label.textContent = item.label;

      // Add double-click to edit legend label (only in edit mode)
      label.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (this.isEditMode) {
          this._makeLegendLabelEditable(label, index);
        }
      });

      labelWrapper.appendChild(label);
      itemEl.appendChild(colorBox);
      itemEl.appendChild(labelWrapper);
      list.appendChild(itemEl);
    });

    legendLine.appendChild(list);
    this.legendElement.appendChild(legendLine);
    this.chartWrapper.appendChild(this.legendElement);
  }

  /**
   * Refreshes the legend to include any new colors
   * @private
   */
  _refreshLegend() {
    if (!this.legendElement) return;

    // Check if any new colors need to be added
    const originalLength = this.ganttData.legend.length;
    this._updateLegendWithUsedColors();

    // If new colors were added, rebuild the legend
    if (this.ganttData.legend.length > originalLength) {
      const wasEditMode = this.isEditMode;

      // Remove old legend
      this.legendElement.remove();

      // Rebuild legend
      this._addLegend();

      // Restore edit mode class if needed
      if (wasEditMode && this.legendElement) {
        this.legendElement.classList.add('edit-mode-enabled');
      }
    }
  }

  /**
   * Adds the header SVG decoration above the Gantt chart
   * @private
   */
  _addHeaderSVG() {
    if (!this.footerSVG) return;

    const encodedFooterSVG = encodeURIComponent(this.footerSVG.replace(/(\r\n|\n|\r)/gm, ''));

    const headerSvgEl = document.createElement('div');
    headerSvgEl.className = 'gantt-header-svg';

    // Apply all styles inline
    headerSvgEl.style.height = '30px';
    headerSvgEl.style.backgroundImage = `url("data:image/svg+xml,${encodedFooterSVG}")`;
    headerSvgEl.style.backgroundRepeat = 'repeat-x';
    headerSvgEl.style.backgroundSize = 'auto 30px';

    this.chartWrapper.appendChild(headerSvgEl);
  }

  /**
   * Adds the footer SVG decoration after the Gantt chart
   * @private
   */
  _addGanttFooterSVG() {
    if (!this.footerSVG) return;

    const encodedFooterSVG = encodeURIComponent(this.footerSVG.replace(/(\r\n|\n|\r)/gm, ''));

    const footerSvgEl = document.createElement('div');
    footerSvgEl.className = 'gantt-footer-svg';

    // Apply all styles inline
    footerSvgEl.style.height = '30px';
    footerSvgEl.style.backgroundImage = `url("data:image/svg+xml,${encodedFooterSVG}")`;
    footerSvgEl.style.backgroundRepeat = 'repeat-x';
    footerSvgEl.style.backgroundSize = 'auto 30px';

    this.chartWrapper.appendChild(footerSvgEl);
  }

  /**
   * Adds the footer SVG decoration after the Executive Summary
   * @private
   */
  _addFooterSVG() {
    if (!this.footerSVG) return;

    const encodedFooterSVG = encodeURIComponent(this.footerSVG.replace(/(\r\n|\n|\r)/gm, ''));

    const footerSvgEl = document.createElement('div');
    footerSvgEl.className = 'gantt-footer-svg';

    // Apply all styles inline
    footerSvgEl.style.height = '30px';
    footerSvgEl.style.backgroundImage = `url("data:image/svg+xml,${encodedFooterSVG}")`;
    footerSvgEl.style.backgroundRepeat = 'repeat-x';
    footerSvgEl.style.backgroundSize = 'auto 30px';

    this.chartWrapper.appendChild(footerSvgEl);
  }

  /**
   * Adds edit mode toggle functionality
   * @private
   */
  _addEditModeToggleListener() {
    const editModeBtn = document.getElementById('edit-mode-toggle-btn');

    if (!editModeBtn) {
      console.warn('Edit mode toggle button not found.');
      return;
    }

    editModeBtn.addEventListener('click', () => {
      this.isEditMode = !this.isEditMode;
      editModeBtn.textContent = this.isEditMode ? '🔓 Edit Mode: ON' : '🔒 Edit Mode: OFF';
      // Change button color based on state (green when on, red when off)
      editModeBtn.style.backgroundColor = this.isEditMode ? '#50AF7B' : '#BA3930';

      if (this.isEditMode) {
        this._enableAllEditFeatures();
        console.log('✓ Edit mode enabled');
      } else {
        this._disableAllEditFeatures();
        console.log('✓ Edit mode disabled');
      }
    });
  }

  /**
   * Adds export to PNG functionality
   * @private
   */
  _addExportListener() {
    const exportBtn = document.getElementById('export-png-btn');
    const chartContainer = document.getElementById('gantt-chart-container');

    if (!exportBtn || !chartContainer) {
      console.warn('Export button or chart container not found.');
      return;
    }

    exportBtn.addEventListener('click', () => {
      exportBtn.textContent = 'Exporting...';
      exportBtn.disabled = true;

      html2canvas(chartContainer, {
        useCORS: true,
        logging: false,
        scale: 2 // Render at 2x resolution
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'gantt-chart.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        exportBtn.textContent = 'Export as PNG';
        exportBtn.disabled = false;
      }).catch(err => {
        console.error('Error exporting canvas:', err);
        exportBtn.textContent = 'Export as PNG';
        exportBtn.disabled = false;
        alert('Error exporting chart. See console for details.');
      });
    });
  }

  /**
   * Adds the "Today" line to the chart
   * @param {Date} today - The current date
   * @returns {void}
   */
  addTodayLine(today) {
    if (!this.gridElement) return;

    const position = findTodayColumnPosition(today, this.ganttData.timeColumns);
    if (!position) return; // Today is not in the chart's range

    try {
      // Get element dimensions for calculation
      const labelCol = this.gridElement.querySelector('.gantt-header-label');
      const headerRow = this.gridElement.querySelector('.gantt-header');

      if (!labelCol || !headerRow) return;

      const gridRect = this.gridElement.getBoundingClientRect();
      const containerRect = this.gridElement.parentElement.getBoundingClientRect();
      const leftMargin = gridRect.left - containerRect.left;

      const headerHeight = headerRow.offsetHeight;
      const gridClientWidth = this.gridElement.clientWidth;
      const labelColWidth = labelCol.offsetWidth;

      // Calculate pixel position
      const timeColAreaWidth = gridClientWidth - labelColWidth;
      const oneColWidth = timeColAreaWidth / this.ganttData.timeColumns.length;
      const todayOffset = (position.index + position.percentage) * oneColWidth;

      const lineLeftPosition = labelColWidth + todayOffset;

      // Create and append the line
      const todayLine = document.createElement('div');
      todayLine.className = 'gantt-today-line';
      todayLine.style.top = `${headerHeight}px`;
      todayLine.style.bottom = '0';
      todayLine.style.left = `${lineLeftPosition}px`;

      this.gridElement.appendChild(todayLine);

    } catch (e) {
      console.error("Error calculating 'Today' line position:", e);
    }
  }

  /**
   * Phase 5: Initializes drag-to-edit functionality
   * Phase 2: Initializes bar resizing functionality
   * @private
   */
  _initializeDragToEdit() {
    if (!this.gridElement) {
      console.warn('Cannot initialize drag-to-edit: gridElement not found');
      return;
    }

    // Create callback for task updates (drag)
    const onTaskUpdate = async (taskInfo) => {
      console.log('Task updated via drag:', taskInfo);

      // Persist to server if sessionId is available
      if (taskInfo.sessionId) {
        try {
          const response = await fetch('/update-task-dates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskInfo)
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

          const result = await response.json();
          console.log('✓ Task update persisted to server:', result);
        } catch (error) {
          console.error('Failed to persist task update:', error);
          throw error; // Re-throw to trigger rollback in DraggableGantt
        }
      }
    };

    // Phase 2: Create callback for task resize
    const onTaskResize = async (taskInfo) => {
      console.log('Task resized:', taskInfo);

      // Persist to server if sessionId is available
      if (taskInfo.sessionId) {
        try {
          const response = await fetch('/update-task-dates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskInfo)
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

          const result = await response.json();
          console.log('✓ Task resize persisted to server:', result);
        } catch (error) {
          console.error('Failed to persist task resize:', error);
          throw error; // Re-throw to trigger rollback in ResizableGantt
        }
      }
    };

    // Phase 5: Create callback for color change
    const onColorChange = async (taskInfo) => {
      console.log('Bar color changed:', taskInfo);

      // Persist to server if sessionId is available
      if (taskInfo.sessionId) {
        try {
          const response = await fetch('/update-task-color', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskInfo)
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

          const result = await response.json();
          console.log('✓ Color change persisted to server:', result);

          // Refresh legend to include new color if needed
          this._refreshLegend();
        } catch (error) {
          console.error('Failed to persist color change:', error);
          throw error; // Re-throw to trigger rollback in ContextMenu
        }
      }
    };

    // Initialize DraggableGantt
    this.draggableGantt = new DraggableGantt(
      this.gridElement,
      this.ganttData,
      onTaskUpdate
    );

    // Phase 2: Initialize ResizableGantt
    this.resizableGantt = new ResizableGantt(
      this.gridElement,
      this.ganttData,
      onTaskResize
    );

    // Phase 5: Initialize ContextMenu
    this.contextMenu = new ContextMenu(
      this.gridElement,
      this.ganttData,
      onColorChange
    );

    // Add cursor feedback (will only be active when edit mode is enabled)
    this._addCursorFeedback();

    // Edit features are disabled by default (edit mode is off)
    // They will be enabled when user toggles edit mode
    console.log('✓ Drag-to-edit, bar resizing, and context menu functionality initialized (disabled by default)');
  }

  /**
   * Adds dynamic cursor feedback based on mouse position over bars
   * @private
   */
  _addCursorFeedback() {
    this.gridElement.addEventListener('mousemove', (event) => {
      const bar = event.target.closest('.gantt-bar');
      if (!bar) return;

      // Only show edit cursors when in edit mode
      if (!this.isEditMode) {
        bar.style.cursor = 'pointer';
        return;
      }

      // Don't change cursor if actively dragging or resizing
      if (document.body.classList.contains('dragging') ||
          document.body.classList.contains('resizing')) {
        return;
      }

      const rect = bar.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const HANDLE_WIDTH = 10; // Updated to match new resize handle width

      if (x <= HANDLE_WIDTH || x >= rect.width - HANDLE_WIDTH) {
        // Hovering over resize handle
        bar.style.cursor = 'ew-resize';
      } else {
        // Hovering over middle (drag area)
        bar.style.cursor = 'move';
      }
    });
  }

  /**
   * Enables all editing features
   * @private
   */
  _enableAllEditFeatures() {
    console.log('🔧 _enableAllEditFeatures called, instances:', {
      draggable: !!this.draggableGantt,
      resizable: !!this.resizableGantt,
      contextMenu: !!this.contextMenu
    });

    // Enable drag, resize, and context menu
    if (this.draggableGantt) {
      this.draggableGantt.enableDragging();
    }
    if (this.resizableGantt) {
      this.resizableGantt.enableResizing();
    }
    if (this.contextMenu) {
      this.contextMenu.enable();
    }

    // Add edit-mode class to grid, title, and legend to enable CSS-based features
    this.gridElement.classList.add('edit-mode-enabled');
    if (this.titleElement) {
      this.titleElement.classList.add('edit-mode-enabled');
    }
    if (this.legendElement) {
      this.legendElement.classList.add('edit-mode-enabled');
    }
  }

  /**
   * Disables all editing features
   * @private
   */
  _disableAllEditFeatures() {
    // Disable drag, resize, and context menu
    if (this.draggableGantt) {
      this.draggableGantt.disableDragging();
    }
    if (this.resizableGantt) {
      this.resizableGantt.disableResizing();
    }
    if (this.contextMenu) {
      this.contextMenu.disable();
    }

    // Remove edit-mode class from grid, title, and legend to disable CSS-based features
    this.gridElement.classList.remove('edit-mode-enabled');
    if (this.titleElement) {
      this.titleElement.classList.remove('edit-mode-enabled');
    }
    if (this.legendElement) {
      this.legendElement.classList.remove('edit-mode-enabled');
    }

    // Reset all bar cursors to pointer
    const bars = this.gridElement.querySelectorAll('.gantt-bar');
    bars.forEach(bar => {
      bar.style.cursor = 'pointer';
    });
  }

  /**
   * Phase 5: Enables drag-to-edit functionality
   * @public
   */
  enableDragToEdit() {
    if (this.draggableGantt) {
      this.draggableGantt.enableDragging();
      console.log('Drag-to-edit enabled');
    }
  }

  /**
   * Phase 5: Disables drag-to-edit functionality
   * @public
   */
  disableDragToEdit() {
    if (this.draggableGantt) {
      this.draggableGantt.disableDragging();
      console.log('Drag-to-edit disabled');
    }
  }

  /**
   * Phase 3: Adds a new task row after the specified index
   * @param {number} afterIndex - Index to insert after
   * @public
   */
  addNewTaskRow(afterIndex) {
    // Create new task data with default values
    const newTask = {
      title: 'New Task',
      entity: 'New Entity',
      isSwimlane: false,
      bar: {
        startCol: 2,
        endCol: 4,
        color: 'mid-grey'
      }
    };

    // Insert into data model
    this.ganttData.data.splice(afterIndex + 1, 0, newTask);

    // Re-render the chart to show the new row
    this.render();

    console.log(`✓ Added new task row after index ${afterIndex}`);
  }

  /**
   * Phase 3: Removes a task row at the specified index
   * @param {number} taskIndex - Index of the task to remove
   * @public
   */
  removeTaskRow(taskIndex) {
    const taskData = this.ganttData.data[taskIndex];

    if (!taskData) {
      console.error('Cannot remove task: invalid index');
      return;
    }

    // Don't allow removing swimlanes
    if (taskData.isSwimlane) {
      console.warn('Cannot remove swimlane rows');
      return;
    }

    // Confirm deletion
    if (!confirm(`Delete task "${taskData.title}"?`)) {
      return;
    }

    // Remove from data model
    this.ganttData.data.splice(taskIndex, 1);

    // Re-render the chart
    this.render();

    console.log(`✓ Removed task row at index ${taskIndex}`);
  }

  /**
   * Phase 3: Updates the data-task-index attributes after row changes
   * @private
   */
  _updateRowIndices() {
    const allLabels = Array.from(this.gridElement.querySelectorAll('.gantt-row-label'));
    const allBarAreas = Array.from(this.gridElement.querySelectorAll('.gantt-bar-area'));

    allLabels.forEach((label, index) => {
      label.setAttribute('data-task-index', index);
      label.setAttribute('data-row-id', `row-${index}`);
    });

    allBarAreas.forEach((barArea, index) => {
      barArea.setAttribute('data-task-index', index);
      barArea.setAttribute('data-row-id', `row-${index}`);
    });
  }

  /**
   * Phase 4: Makes a label editable with contenteditable
   * @param {HTMLElement} labelElement - The label content element to make editable
   * @param {number} taskIndex - The index of the task in the data array
   * @private
   */
  _makeEditable(labelElement, taskIndex) {
    const originalText = labelElement.textContent;

    // Make editable
    labelElement.setAttribute('contenteditable', 'true');
    labelElement.classList.add('editing');
    labelElement.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(labelElement);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const saveChanges = async () => {
      labelElement.setAttribute('contenteditable', 'false');
      labelElement.classList.remove('editing');

      // Sanitize input - use textContent to prevent XSS
      const newText = labelElement.textContent.trim();

      // Set as text, not HTML (prevents XSS)
      labelElement.textContent = newText;

      // Only update if text actually changed
      if (newText && newText !== originalText) {
        // Update data model
        this.ganttData.data[taskIndex].title = newText;

        console.log(`✓ Title updated: "${originalText}" -> "${newText}"`);

        // TODO: Persist to server in Phase 6
        // await this._persistTitleChange(taskIndex, newText);
      } else {
        // Revert if empty or unchanged
        labelElement.textContent = originalText;
      }
    };

    const cancelEdit = () => {
      labelElement.setAttribute('contenteditable', 'false');
      labelElement.classList.remove('editing');
      labelElement.textContent = originalText;
    };

    // Save on blur
    const blurHandler = () => {
      saveChanges();
      labelElement.removeEventListener('blur', blurHandler);
    };
    labelElement.addEventListener('blur', blurHandler);

    // Handle keyboard events
    const keyHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        labelElement.blur(); // Trigger save
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        labelElement.removeEventListener('blur', blurHandler);
        cancelEdit();
        labelElement.removeEventListener('keydown', keyHandler);
      }
    };
    labelElement.addEventListener('keydown', keyHandler);
  }

  /**
   * Makes the chart title editable with contenteditable
   * @private
   */
  _makeChartTitleEditable() {
    if (!this.titleElement) return;

    const originalText = this.titleElement.textContent;

    // Make editable
    this.titleElement.setAttribute('contenteditable', 'true');
    this.titleElement.classList.add('editing');
    this.titleElement.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(this.titleElement);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const saveChanges = async () => {
      this.titleElement.setAttribute('contenteditable', 'false');
      this.titleElement.classList.remove('editing');

      // Sanitize input - use textContent to prevent XSS
      const newText = this.titleElement.textContent.trim();

      // Set as text, not HTML (prevents XSS)
      this.titleElement.textContent = newText;

      // Only update if text actually changed
      if (newText && newText !== originalText) {
        // Update data model
        this.ganttData.title = newText;

        console.log(`✓ Chart title updated: "${originalText}" -> "${newText}"`);

        // TODO: Persist to server if needed
      } else {
        // Revert if empty or unchanged
        this.titleElement.textContent = originalText;
      }
    };

    const cancelEdit = () => {
      this.titleElement.setAttribute('contenteditable', 'false');
      this.titleElement.classList.remove('editing');
      this.titleElement.textContent = originalText;
    };

    // Save on blur
    const blurHandler = () => {
      saveChanges();
      this.titleElement.removeEventListener('blur', blurHandler);
    };
    this.titleElement.addEventListener('blur', blurHandler);

    // Handle keyboard events
    const keyHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.titleElement.blur(); // Trigger save
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.titleElement.removeEventListener('blur', blurHandler);
        cancelEdit();
        this.titleElement.removeEventListener('keydown', keyHandler);
      }
    };
    this.titleElement.addEventListener('keydown', keyHandler);
  }

  /**
   * Updates the legend to include all colors used in the gantt chart
   * @private
   */
  _updateLegendWithUsedColors() {
    // Get all unique colors used in the gantt chart
    const usedColors = new Set();
    this.ganttData.data.forEach(row => {
      if (row.bar && row.bar.color) {
        usedColors.add(row.bar.color);
      }
    });

    // Check which colors are missing from the legend
    const legendColors = new Set(this.ganttData.legend.map(item => item.color));

    // Add missing colors to the legend with placeholder labels
    usedColors.forEach(color => {
      if (!legendColors.has(color)) {
        this.ganttData.legend.push({
          color: color,
          label: `[Define ${this._formatColorName(color)}]`
        });
        console.log(`✓ Added new color "${color}" to legend`);
      }
    });
  }

  /**
   * Formats a color name for display
   * @param {string} colorKey - The color key (e.g., "priority-red")
   * @returns {string} Formatted color name (e.g., "Priority Red")
   * @private
   */
  _formatColorName(colorKey) {
    return colorKey
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Makes a legend label editable with contenteditable
   * @param {HTMLElement} labelElement - The legend label element to make editable
   * @param {number} legendIndex - The index of the legend item in the data array
   * @private
   */
  _makeLegendLabelEditable(labelElement, legendIndex) {
    const originalText = labelElement.textContent;

    // Make editable
    labelElement.setAttribute('contenteditable', 'true');
    labelElement.classList.add('editing');
    labelElement.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(labelElement);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const saveChanges = async () => {
      labelElement.setAttribute('contenteditable', 'false');
      labelElement.classList.remove('editing');

      // Sanitize input - use textContent to prevent XSS
      const newText = labelElement.textContent.trim();

      // Set as text, not HTML (prevents XSS)
      labelElement.textContent = newText;

      // Only update if text actually changed
      if (newText && newText !== originalText) {
        // Update data model
        this.ganttData.legend[legendIndex].label = newText;

        console.log(`✓ Legend label updated: "${originalText}" -> "${newText}"`);

        // TODO: Persist to server if needed
      } else {
        // Revert if empty or unchanged
        labelElement.textContent = originalText;
      }
    };

    const cancelEdit = () => {
      labelElement.setAttribute('contenteditable', 'false');
      labelElement.classList.remove('editing');
      labelElement.textContent = originalText;
    };

    // Save on blur
    const blurHandler = () => {
      saveChanges();
      labelElement.removeEventListener('blur', blurHandler);
    };
    labelElement.addEventListener('blur', blurHandler);

    // Handle keyboard events
    const keyHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        labelElement.blur(); // Trigger save
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        labelElement.removeEventListener('blur', blurHandler);
        cancelEdit();
        labelElement.removeEventListener('keydown', keyHandler);
      }
    };
    labelElement.addEventListener('keydown', keyHandler);
  }
}

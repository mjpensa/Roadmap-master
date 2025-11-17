/**
 * GanttChart Module
 * Phase 3 Enhancement: Extracted from chart-renderer.js
 * Handles core Gantt chart rendering, layout, and export functionality
 */

import { CONFIG } from './config.js';
import { safeGetElement, findTodayColumnPosition, buildLegend } from './Utils.js';

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
    this._addTitle();
    this._createGrid();
    this._addLegend();
    this._addFooterSVG();

    // Add export button
    const exportContainer = document.createElement('div');
    exportContainer.className = 'export-container';
    const exportBtn = document.createElement('button');
    exportBtn.id = 'export-png-btn';
    exportBtn.className = 'export-button';
    exportBtn.textContent = 'Export as PNG';
    exportContainer.appendChild(exportBtn);

    // Append to container
    this.container.appendChild(this.chartWrapper);
    this.container.appendChild(exportContainer);

    // Add export listener
    this._addExportListener();

    // Add "Today" line
    const today = new Date('2025-11-14T12:00:00');
    this.addTodayLine(today);
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
    logoImg.style.top = '24px';
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
    const titleEl = document.createElement('div');
    titleEl.className = 'gantt-title';
    titleEl.textContent = this.ganttData.title;
    this.chartWrapper.appendChild(titleEl);
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

    for (const row of this.ganttData.data) {
      const isSwimlane = row.isSwimlane;

      // Create label cell
      const labelEl = document.createElement('div');
      labelEl.className = `gantt-row-label ${isSwimlane ? 'swimlane' : 'task'}`;
      labelEl.textContent = row.title;

      // Create bar area
      const barAreaEl = this._createBarArea(row, numCols, isSwimlane);

      // Add click listeners for tasks
      if (!isSwimlane && row.bar && row.bar.startCol != null && this.onTaskClick) {
        const taskIdentifier = {
          taskName: row.title,
          entity: row.entity,
          sessionId: this.ganttData.sessionId
        };
        labelEl.addEventListener('click', () => this.onTaskClick(taskIdentifier));
        barAreaEl.addEventListener('click', () => this.onTaskClick(taskIdentifier));
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
    }

    // Append all rows at once (single reflow) - major performance improvement
    this.gridElement.appendChild(rowsFragment);
  }

  /**
   * Creates the bar area for a single row
   * @param {Object} row - Row data
   * @param {number} numCols - Number of time columns
   * @param {boolean} isSwimlane - Whether this is a swimlane row
   * @returns {HTMLElement} The bar area element
   * @private
   */
  _createBarArea(row, numCols, isSwimlane) {
    const barAreaEl = document.createElement('div');
    barAreaEl.className = `gantt-bar-area ${isSwimlane ? 'swimlane' : 'task'}`;
    barAreaEl.style.gridColumn = `2 / span ${numCols}`;
    barAreaEl.style.gridTemplateColumns = `repeat(${numCols}, 1fr)`;
    barAreaEl.style.position = 'relative';
    barAreaEl.style.display = 'grid';

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
    if (this.ganttData.legend && this.ganttData.legend.length > 0) {
      const legendEl = buildLegend(this.ganttData.legend);
      this.chartWrapper.appendChild(legendEl);
    }
  }

  /**
   * Adds the footer SVG decoration
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
}

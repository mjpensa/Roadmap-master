/**
 * Chart Renderer - Main Orchestrator
 * Phase 3 Enhancement: Refactored into modular architecture
 * This file now serves as a lightweight orchestrator, coordinating between modules
 *
 * Previous size: 931 lines
 * Current size: ~150 lines (85% reduction)
 */

import { CONFIG } from './config.js';
import { safeGetElement, loadFooterSVG } from './Utils.js';
import { GanttChart } from './GanttChart.js';
import { TaskAnalyzer } from './TaskAnalyzer.js';

// Global variable to store ganttData (including sessionId)
let ganttData = null;
let footerSVG = '';

// Create TaskAnalyzer instance (shared across all task clicks)
const taskAnalyzer = new TaskAnalyzer();

/**
 * Main initialization function
 * Loads chart data from URL parameter or sessionStorage and renders the chart
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Try loading from URL parameter first (Phase 2 enhancement)
  const urlParams = new URLSearchParams(window.location.search);
  const chartId = urlParams.get('id');

  if (chartId) {
    // Load chart data from server using chart ID
    await loadChartFromServer(chartId);
  } else {
    // Fallback: Try loading from sessionStorage (backward compatibility)
    loadChartFromSessionStorage();
  }

  // If we have chart data, render it
  if (ganttData) {
    // Load SVG graphics before rendering
    footerSVG = await loadFooterSVG();
    renderChart();
  } else {
    displayNoChartDataMessage();
  }
});

/**
 * Loads chart data from the server using a chart ID
 * @async
 * @param {string} chartId - The chart ID from the URL
 * @returns {Promise<void>}
 */
async function loadChartFromServer(chartId) {
  try {
    const response = await fetch(`/chart/${chartId}`);
    if (!response.ok) {
      throw new Error(`Failed to load chart: ${response.status} ${response.statusText}`);
    }
    ganttData = await response.json();
    console.log('Chart loaded from URL:', chartId);
  } catch (error) {
    console.error('Failed to load chart from URL:', error);
    displayChartNotFoundMessage();
  }
}

/**
 * Loads chart data from sessionStorage (backward compatibility)
 * @returns {void}
 */
function loadChartFromSessionStorage() {
  try {
    const stored = sessionStorage.getItem('ganttData');
    if (stored) {
      ganttData = JSON.parse(stored);

      // Validate structure
      if (!ganttData || typeof ganttData !== 'object') {
        throw new Error('Invalid gantt data structure');
      }

      if (!Array.isArray(ganttData.data) || !ganttData.timeColumns) {
        throw new Error('Gantt data missing required fields');
      }
      console.log('Chart loaded from sessionStorage');
    }
  } catch (error) {
    console.error('Failed to parse ganttData from sessionStorage:', error);
    // Clear corrupted data
    sessionStorage.removeItem('ganttData');
    ganttData = null;
  }
}

/**
 * Renders the Gantt chart using the GanttChart module
 * @returns {void}
 */
function renderChart() {
  const container = document.getElementById('chart-root');
  if (!container) {
    console.error('Could not find chart container!');
    return;
  }

  // Create and render the chart
  const chart = new GanttChart(
    container,
    ganttData,
    footerSVG,
    handleTaskClick
  );
  chart.render();
}

/**
 * Handles task click events by showing the analysis modal
 * @param {Object} taskIdentifier - Task identification object
 * @returns {void}
 */
function handleTaskClick(taskIdentifier) {
  taskAnalyzer.showAnalysis(taskIdentifier);
}

/**
 * Displays a "chart not found" error message
 * @returns {void}
 */
function displayChartNotFoundMessage() {
  const container = safeGetElement('chart-root', 'displayChartNotFoundMessage');
  if (container) {
    container.innerHTML = `
      <div style="font-family: sans-serif; text-align: center; margin-top: 40px;">
        <h1>${CONFIG.UI.ERROR_MESSAGES.CHART_NOT_FOUND}</h1>
        <p style="color: #666;">${CONFIG.UI.ERROR_MESSAGES.CHART_EXPIRED}</p>
        <p style="color: #666;">${CONFIG.UI.ERROR_MESSAGES.CHART_AVAILABILITY}</p>
      </div>
    `;
  }
}

/**
 * Displays a "no chart data" error message
 * @returns {void}
 */
function displayNoChartDataMessage() {
  const container = safeGetElement('chart-root', 'displayNoChartDataMessage');
  if (container) {
    container.innerHTML = `
      <h1 style="font-family: sans-serif; text-align: center; margin-top: 40px;">${CONFIG.UI.ERROR_MESSAGES.NO_CHART_DATA}</h1>
    `;
  }
}

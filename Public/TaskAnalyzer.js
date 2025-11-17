/**
 * TaskAnalyzer Module
 * Phase 3 Enhancement: Extracted from chart-renderer.js
 * Handles task analysis modal functionality
 */

import { safeGetElement, safeQuerySelector, buildAnalysisSection, buildAnalysisList } from './Utils.js';
import { ChatInterface } from './ChatInterface.js';

/**
 * TaskAnalyzer Class
 * Manages the analysis modal for displaying task details
 */
export class TaskAnalyzer {
  /**
   * Creates a new TaskAnalyzer instance
   */
  constructor() {
    this.modal = null;
    this.chatInterface = null;
  }

  /**
   * Shows the analysis modal for a specific task
   * @async
   * @param {Object} taskIdentifier - Task identification object
   * @param {string} taskIdentifier.taskName - Name of the task to analyze
   * @param {string} taskIdentifier.entity - Entity/organization associated with the task
   * @param {string} taskIdentifier.sessionId - Session ID for backend requests
   * @returns {Promise<void>}
   */
  async showAnalysis(taskIdentifier) {
    // Remove any old modal
    document.getElementById('analysis-modal')?.remove();

    // Create modal structure
    this._createModal();

    // Add close listeners
    this._attachCloseListeners();

    // Fetch and display analysis data
    await this._fetchAndDisplayAnalysis(taskIdentifier);
  }

  /**
   * Creates the modal structure
   * @private
   */
  _createModal() {
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'analysis-modal';
    modalOverlay.className = 'modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    modalContent.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">Analyzing...</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body" id="modal-body-content">
        <div class="modal-spinner"></div>
      </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    this.modal = modalOverlay;
  }

  /**
   * Attaches close event listeners to the modal
   * @private
   */
  _attachCloseListeners() {
    if (!this.modal) return;

    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.modal?.remove();
      }
    });

    // Close on button click
    const closeBtn = document.getElementById('modal-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.modal?.remove();
    });
  }

  /**
   * Fetches analysis data from the server and displays it
   * @async
   * @param {Object} taskIdentifier - Task identification object
   * @private
   */
  async _fetchAndDisplayAnalysis(taskIdentifier) {
    try {
      const response = await fetch('/get-task-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskIdentifier)
      });

      if (!response.ok) {
        // Handle non-JSON error responses gracefully
        let errorMessage = `Server error: ${response.status}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const err = await response.json();
            errorMessage = err.error || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text.substring(0, 200) || errorMessage;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const analysis = await response.json();
      this._displayAnalysis(analysis, taskIdentifier);

    } catch (error) {
      console.error('Error fetching analysis:', error);
      this._displayError(error.message);
    }
  }

  /**
   * Displays the analysis data in the modal
   * @param {Object} analysis - The analysis data from the server
   * @param {Object} taskIdentifier - Task identification object
   * @private
   */
  _displayAnalysis(analysis, taskIdentifier) {
    const modalBody = safeGetElement('modal-body-content', 'TaskAnalyzer._displayAnalysis');
    if (!modalBody) return;

    // Update modal title
    const modalTitle = safeQuerySelector('.modal-title', 'TaskAnalyzer._displayAnalysis');
    if (modalTitle) modalTitle.textContent = analysis.taskName;

    // Build analysis HTML (sanitized to prevent XSS)
    const analysisHTML = `
      ${buildAnalysisSection('Status', `<span class="status-pill status-${analysis.status.replace(/\s+/g, '-').toLowerCase()}">${DOMPurify.sanitize(analysis.status)}</span>`)}
      ${buildAnalysisSection('Dates', `${DOMPurify.sanitize(analysis.startDate || 'N/A')} to ${DOMPurify.sanitize(analysis.endDate || 'N/A')}`)}
      ${buildAnalysisList('Facts', analysis.facts, 'fact', 'source')}
      ${buildAnalysisList('Assumptions', analysis.assumptions, 'assumption', 'source')}
      ${buildAnalysisSection('Summary', analysis.summary)}
      ${buildAnalysisSection('Rationale / Hurdles', analysis.rationale)}
    `;
    modalBody.innerHTML = DOMPurify.sanitize(analysisHTML);

    // Add chat interface
    this.chatInterface = new ChatInterface(modalBody, taskIdentifier);
    this.chatInterface.render();
  }

  /**
   * Displays an error message in the modal
   * @param {string} errorMessage - The error message to display
   * @private
   */
  _displayError(errorMessage) {
    const modalBody = document.getElementById('modal-body-content');
    if (modalBody) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'modal-error';
      errorDiv.textContent = `Failed to load analysis: ${errorMessage}`;
      modalBody.innerHTML = '';
      modalBody.appendChild(errorDiv);
    }
  }
}

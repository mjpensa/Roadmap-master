/**
 * DraggableGantt Module
 * Phase 5 Enhancement: Drag-to-Edit Functionality
 * Enables interactive dragging of Gantt chart bars to update task dates
 */

import { CONFIG } from './config.js';

/**
 * DraggableGantt Class
 * Adds drag-and-drop functionality to Gantt chart bars
 */
export class DraggableGantt {
  /**
   * Creates a new DraggableGantt instance
   * @param {HTMLElement} gridElement - The gantt grid element containing bars
   * @param {Object} ganttData - The chart data
   * @param {Function} onTaskUpdate - Callback when a task is updated
   */
  constructor(gridElement, ganttData, onTaskUpdate) {
    this.gridElement = gridElement;
    this.ganttData = ganttData;
    this.onTaskUpdate = onTaskUpdate;
    this.draggedTask = null;
    this.dragIndicator = null;
    this.originalPosition = null;
  }

  /**
   * Enables dragging on all task bars
   * @returns {void}
   */
  enableDragging() {
    const bars = this.gridElement.querySelectorAll('.gantt-bar');

    bars.forEach(bar => {
      // Make bars draggable
      bar.setAttribute('draggable', 'true');
      bar.style.cursor = 'move';

      // Add drag event listeners
      bar.addEventListener('dragstart', this._handleDragStart.bind(this));
      bar.addEventListener('dragend', this._handleDragEnd.bind(this));
    });

    // Add drop zones on bar areas (each row's timeline container)
    const barAreas = this.gridElement.querySelectorAll('.gantt-bar-area');
    barAreas.forEach(barArea => {
      barArea.addEventListener('dragover', this._handleDragOver.bind(this));
      barArea.addEventListener('drop', this._handleDrop.bind(this));
    });
  }

  /**
   * Handles the start of a drag operation
   * @param {DragEvent} event - The drag event
   * @private
   */
  _handleDragStart(event) {
    const bar = event.target;
    const barArea = bar.parentElement;
    const gridColumnStyle = bar.style.gridColumn;

    console.log('🚀 Drag started! Bar gridColumn:', gridColumnStyle);

    // Parse grid column (e.g., "2 / 5" -> startCol: 2, endCol: 5)
    const [startCol, endCol] = gridColumnStyle.split('/').map(v => parseInt(v.trim()));
    const duration = endCol - startCol;

    // Find the task data
    const taskIndex = this._findTaskIndexByBar(bar);
    if (taskIndex === -1) {
      console.error('Could not find task for dragged bar');
      return;
    }

    this.draggedTask = {
      element: bar,
      barArea: barArea,
      originalStartCol: startCol,
      originalEndCol: endCol,
      duration: duration,
      taskIndex: taskIndex,
      taskData: this.ganttData.data[taskIndex]
    };

    // Store original position for potential rollback
    this.originalPosition = {
      startCol: startCol,
      endCol: endCol
    };

    console.log('📦 Dragged task info:', {
      taskName: this.draggedTask.taskData.title,
      originalStartCol: startCol,
      originalEndCol: endCol,
      duration: duration,
      taskIndex: taskIndex
    });

    // Add visual feedback
    bar.style.opacity = '0.5';
    bar.style.pointerEvents = 'none'; // Allow drop events to pass through
    bar.classList.add('dragging');

    // Also disable pointer events on time cells within this bar area so they don't block drops
    const timeCells = barArea.querySelectorAll('.gantt-time-cell');
    timeCells.forEach(cell => {
      cell.style.pointerEvents = 'none';
    });

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', bar.innerHTML);

    // Create drag indicator
    this._createDragIndicator();
  }

  /**
   * Handles drag over a bar area
   * @param {DragEvent} event - The drag event
   * @private
   */
  _handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    // Only allow drop on the same row where the drag started
    if (!this.draggedTask) return;

    const barArea = event.currentTarget;
    if (barArea !== this.draggedTask.barArea) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
  }

  /**
   * Handles drop on a bar area
   * @param {DragEvent} event - The drag event
   * @private
   */
  async _handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    console.log('🎯 Drop event fired!', event.currentTarget);

    const barArea = event.currentTarget;

    if (!this.draggedTask) {
      console.warn('No dragged task found');
      return;
    }

    // Only allow drop on the same row
    if (barArea !== this.draggedTask.barArea) {
      console.warn('Cannot drop on a different row');
      this._rollbackDrag();
      return;
    }

    // Calculate the new column position based on mouse X position
    const newStartCol = this._getColumnFromMousePosition(event, barArea);
    const newEndCol = newStartCol + this.draggedTask.duration;

    console.log('📍 Drop position calculated:', {
      newStartCol,
      newEndCol,
      duration: this.draggedTask.duration,
      originalStartCol: this.draggedTask.originalStartCol,
      originalEndCol: this.draggedTask.originalEndCol
    });

    // Validate the new position
    const numCols = this.ganttData.timeColumns.length;
    if (newStartCol < 1 || newEndCol > numCols + 1) {
      console.warn('Cannot drop task beyond chart boundaries');
      this._rollbackDrag();
      return;
    }

    // Update the visual position
    console.log(`Updating bar gridColumn to: ${newStartCol} / ${newEndCol}`);
    this.draggedTask.element.style.gridColumn = `${newStartCol} / ${newEndCol}`;

    // Update the data model
    this.ganttData.data[this.draggedTask.taskIndex].bar.startCol = newStartCol;
    this.ganttData.data[this.draggedTask.taskIndex].bar.endCol = newEndCol;

    // Notify callback with updated task info
    if (this.onTaskUpdate) {
      const taskInfo = {
        taskName: this.draggedTask.taskData.title,
        entity: this.draggedTask.taskData.entity,
        sessionId: this.ganttData.sessionId,
        oldStartCol: this.draggedTask.originalStartCol,
        oldEndCol: this.draggedTask.originalEndCol,
        newStartCol: newStartCol,
        newEndCol: newEndCol,
        startDate: this.ganttData.timeColumns[newStartCol - 1],
        endDate: this.ganttData.timeColumns[newEndCol - 2] // -2 because endCol is exclusive
      };

      try {
        await this.onTaskUpdate(taskInfo);
        console.log('✓ Task position updated successfully:', taskInfo);
      } catch (error) {
        console.error('Failed to persist task update:', error);
        // Rollback on error
        this._rollbackDrag();
      }
    }
  }

  /**
   * Handles the end of a drag operation
   * @param {DragEvent} event - The drag event
   * @private
   */
  _handleDragEnd(event) {
    console.log('🏁 Drag ended');

    if (this.draggedTask) {
      // Restore opacity and pointer events on the bar
      this.draggedTask.element.style.opacity = '1';
      this.draggedTask.element.style.pointerEvents = '';
      this.draggedTask.element.classList.remove('dragging');

      // Restore pointer events on time cells
      const timeCells = this.draggedTask.barArea.querySelectorAll('.gantt-time-cell');
      timeCells.forEach(cell => {
        cell.style.pointerEvents = '';
      });

      console.log('✓ Bar visual properties restored. Final gridColumn:', this.draggedTask.element.style.gridColumn);
    }

    // Remove drag indicator
    this._removeDragIndicator();

    this.draggedTask = null;
    this.originalPosition = null;
  }

  /**
   * Rolls back a drag operation to original position
   * @private
   */
  _rollbackDrag() {
    console.warn('⚠️ Rolling back drag operation');

    if (!this.draggedTask || !this.originalPosition) {
      console.warn('Cannot rollback: missing draggedTask or originalPosition');
      return;
    }

    // Restore visual position
    this.draggedTask.element.style.gridColumn =
      `${this.originalPosition.startCol} / ${this.originalPosition.endCol}`;

    // Restore data model
    this.ganttData.data[this.draggedTask.taskIndex].bar.startCol = this.originalPosition.startCol;
    this.ganttData.data[this.draggedTask.taskIndex].bar.endCol = this.originalPosition.endCol;

    console.log('✓ Drag operation rolled back to:', this.originalPosition);
  }

  /**
   * Finds the task index by matching the bar element
   * @param {HTMLElement} bar - The bar element
   * @returns {number} The task index, or -1 if not found
   * @private
   */
  _findTaskIndexByBar(bar) {
    const barArea = bar.parentElement;
    const allBarAreas = Array.from(this.gridElement.querySelectorAll('.gantt-bar-area'));
    const barAreaIndex = allBarAreas.indexOf(barArea);

    // Account for swimlanes - they don't have task data
    let taskIndex = 0;
    for (let i = 0; i <= barAreaIndex && taskIndex < this.ganttData.data.length; i++) {
      if (i === barAreaIndex) {
        return taskIndex;
      }
      // Only increment if not a swimlane
      if (!this.ganttData.data[taskIndex].isSwimlane) {
        taskIndex++;
      }
    }

    return -1;
  }

  /**
   * Calculates the column number from mouse position within a bar area
   * @param {DragEvent} event - The drag event
   * @param {HTMLElement} barArea - The bar area element
   * @returns {number} The column number (1-indexed)
   * @private
   */
  _getColumnFromMousePosition(event, barArea) {
    // Get the bar area dimensions and position
    const rect = barArea.getBoundingClientRect();
    const mouseX = event.clientX;

    // Calculate relative position within the bar area
    const relativeX = mouseX - rect.left;

    // Get the number of columns
    const numCols = this.ganttData.timeColumns.length;

    // Calculate which column the mouse is over
    const columnWidth = rect.width / numCols;
    const column = Math.floor(relativeX / columnWidth) + 1; // +1 because grid columns are 1-indexed

    // Clamp to valid range
    const clampedColumn = Math.max(1, Math.min(column, numCols));

    console.log('Mouse position calculation:', {
      mouseX,
      rectLeft: rect.left,
      relativeX,
      columnWidth,
      calculatedColumn: column,
      clampedColumn,
      numCols
    });

    return clampedColumn;
  }

  /**
   * Creates a visual indicator during drag
   * @private
   */
  _createDragIndicator() {
    this.dragIndicator = document.createElement('div');
    this.dragIndicator.className = 'drag-indicator';
    this.dragIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: ${CONFIG.COLORS.PRIMARY || '#BA3930'};
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    this.dragIndicator.textContent = '↔ Drag to reschedule task';
    document.body.appendChild(this.dragIndicator);
  }

  /**
   * Removes the drag indicator
   * @private
   */
  _removeDragIndicator() {
    if (this.dragIndicator && this.dragIndicator.parentNode) {
      this.dragIndicator.parentNode.removeChild(this.dragIndicator);
      this.dragIndicator = null;
    }
  }

  /**
   * Disables dragging on all task bars
   * @returns {void}
   */
  disableDragging() {
    const bars = this.gridElement.querySelectorAll('.gantt-bar');

    bars.forEach(bar => {
      bar.setAttribute('draggable', 'false');
      bar.style.cursor = 'pointer';

      // Remove event listeners by cloning (removes all listeners)
      const newBar = bar.cloneNode(true);
      bar.parentNode.replaceChild(newBar, bar);
    });
  }
}

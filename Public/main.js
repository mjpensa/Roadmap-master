/**
 * This is the main frontend script.
 * It handles form submission, API calls, and chart rendering.
 */

// Phase 2 Enhancement: Import centralized configuration
import { CONFIG } from './config.js';

// Define supported file types for frontend validation using centralized config
const SUPPORTED_FILE_MIMES = CONFIG.FILES.SUPPORTED_MIMES;
const SUPPORTED_FILE_EXTENSIONS = CONFIG.FILES.SUPPORTED_EXTENSIONS;
const SUPPORTED_FILES_STRING = SUPPORTED_FILE_EXTENSIONS.join(', ');

// --- Helper function to display errors ---
function displayError(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Track current upload mode
let uploadMode = 'files'; // 'files' or 'folder'

// --- Helper to format file size ---
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- Helper to update folder statistics ---
function updateFolderStats(files, validFiles) {
    const folderStats = document.getElementById('folder-stats');
    const totalFiles = document.getElementById('total-files');
    const validFilesEl = document.getElementById('valid-files');
    const totalSize = document.getElementById('total-size');
    const fileTypes = document.getElementById('file-types');

    // Calculate total size
    let size = 0;
    for (const file of validFiles) {
        size += file.size;
    }

    // Get unique file types
    const types = new Set();
    for (const file of validFiles) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        types.add(ext);
    }

    totalFiles.textContent = files.length;
    validFilesEl.textContent = validFiles.length;
    totalSize.textContent = formatFileSize(size);
    fileTypes.textContent = Array.from(types).join(', ') || 'None';

    // Show stats only in folder mode
    if (uploadMode === 'folder') {
        folderStats.classList.remove('hidden');
    } else {
        folderStats.classList.add('hidden');
    }
}

// --- Helper to trigger file processing logic using a FileList object ---
function processFiles(files) {
    const fileInput = document.getElementById('upload-input');
    const dropzonePrompt = document.getElementById('dropzone-prompt');
    const fileListContainer = document.getElementById('file-list-container');
    const fileList = document.getElementById('file-list');

    // Clear previous errors
    document.getElementById('error-message').style.display = 'none';

    if (files.length === 0) {
        // No files selected
        dropzonePrompt.classList.remove('hidden');
        fileListContainer.classList.add('hidden');
        return;
    }

    const filesArray = Array.from(files);
    let validFiles = [];
    let invalidFiles = [];

    // 1. Validate files
    for (const file of filesArray) {
        // Check mime type (preferred) or rely on extension fallback
        const isValidMime = SUPPORTED_FILE_MIMES.includes(file.type);
        const isValidExtension = SUPPORTED_FILE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));

        if (isValidMime || isValidExtension) {
            validFiles.push(file);
        } else {
            invalidFiles.push(file.name);
        }
    }

    // 2. Show warning for invalid files but continue with valid ones
    if (invalidFiles.length > 0) {
        const warningMsg = `Skipping ${invalidFiles.length} unsupported file(s). Only ${SUPPORTED_FILES_STRING} files will be processed.`;
        displayError(warningMsg);
    }

    // 3. Check if we have any valid files
    if (validFiles.length === 0) {
        const errorMsg = `No valid files found. Please upload ${SUPPORTED_FILES_STRING} files.`;
        displayError(errorMsg);

        // Reset the input field
        fileInput.value = '';

        // Restore dropzone prompt
        dropzonePrompt.classList.remove('hidden');
        fileListContainer.classList.add('hidden');
        return;
    }

    // 4. Update folder statistics
    updateFolderStats(filesArray, validFiles);

    // 5. Update the file list display
    fileList.innerHTML = ''; // Clear previous list

    // Create a new DataTransfer object to hold valid files
    const dataTransfer = new DataTransfer();

    // Show first 50 files in the list, indicate if there are more
    const displayLimit = 50;
    const displayFiles = validFiles.slice(0, displayLimit);

    for (const file of displayFiles) {
        const li = document.createElement('li');
        li.className = 'truncate';
        // Show relative path if available (folder upload)
        const displayName = file.webkitRelativePath || file.name;
        li.textContent = displayName;
        li.title = displayName; // Show full name on hover
        fileList.appendChild(li);
        dataTransfer.items.add(file); // Add valid file to the DataTransfer
    }

    // Add remaining valid files to DataTransfer without displaying
    for (let i = displayLimit; i < validFiles.length; i++) {
        dataTransfer.items.add(validFiles[i]);
    }

    // Show indicator if there are more files
    if (validFiles.length > displayLimit) {
        const li = document.createElement('li');
        li.className = 'font-semibold text-custom-button';
        li.textContent = `... and ${validFiles.length - displayLimit} more file(s)`;
        fileList.appendChild(li);
    }

    // Update the input field's files property with the clean list
    fileInput.files = dataTransfer.files;

    dropzonePrompt.classList.add('hidden');
    fileListContainer.classList.remove('hidden');
}


// --- Function to set upload mode ---
function setUploadMode(mode) {
  uploadMode = mode;
  const uploadInput = document.getElementById('upload-input');
  const fileModeBtn = document.getElementById('file-mode-btn');
  const folderModeBtn = document.getElementById('folder-mode-btn');
  const dropzoneTitle = document.getElementById('dropzone-title');

  // Reset selection
  uploadInput.value = '';
  document.getElementById('dropzone-prompt').classList.remove('hidden');
  document.getElementById('file-list-container').classList.add('hidden');

  if (mode === 'folder') {
    // Enable folder upload
    uploadInput.setAttribute('webkitdirectory', '');
    uploadInput.setAttribute('directory', '');
    uploadInput.removeAttribute('multiple');

    // Update UI
    dropzoneTitle.textContent = 'Drop folder here or click to browse';
    folderModeBtn.classList.remove('bg-gray-700', 'text-gray-300');
    folderModeBtn.classList.add('bg-custom-button', 'text-white');
    fileModeBtn.classList.remove('bg-custom-button', 'text-white');
    fileModeBtn.classList.add('bg-gray-700', 'text-gray-300');
  } else {
    // Enable file upload
    uploadInput.removeAttribute('webkitdirectory');
    uploadInput.removeAttribute('directory');
    uploadInput.setAttribute('multiple', '');

    // Update UI
    dropzoneTitle.textContent = 'Drop files here or click to browse';
    fileModeBtn.classList.remove('bg-gray-700', 'text-gray-300');
    fileModeBtn.classList.add('bg-custom-button', 'text-white');
    folderModeBtn.classList.remove('bg-custom-button', 'text-white');
    folderModeBtn.classList.add('bg-gray-700', 'text-gray-300');
  }
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  const ganttForm = document.getElementById('gantt-form');
  ganttForm.addEventListener('submit', handleChartGenerate);

  const uploadInput = document.getElementById('upload-input');
  const dropzoneLabel = document.querySelector('.dropzone-container');
  const fileModeBtn = document.getElementById('file-mode-btn');
  const folderModeBtn = document.getElementById('folder-mode-btn');

  // Mode toggle handlers
  fileModeBtn.addEventListener('click', () => setUploadMode('files'));
  folderModeBtn.addEventListener('click', () => setUploadMode('folder'));

  // File/folder selection handler
  uploadInput.addEventListener('change', (e) => {
    processFiles(e.target.files);
  });

  // -------------------------------------------------------------------
  // --- DRAG AND DROP EVENT LISTENERS ---
  // -------------------------------------------------------------------

  // 1. Prevent default behavior on dragover/dragenter (REQUIRED for drop to work)
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzoneLabel.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  // 2. Handle file/folder drop
  dropzoneLabel.addEventListener('drop', (e) => {
    const droppedFiles = e.dataTransfer.files;
    processFiles(droppedFiles);
  }, false);

  // 3. Visual feedback for drag
  dropzoneLabel.addEventListener('dragenter', () => {
    dropzoneLabel.classList.add('border-white');
    dropzoneLabel.classList.remove('border-custom-outline');
  });

  dropzoneLabel.addEventListener('dragleave', (event) => {
    // Check if the cursor is actually leaving the element
    if (!dropzoneLabel.contains(document.elementFromPoint(event.clientX, event.clientY))) {
        dropzoneLabel.classList.remove('border-white');
        dropzoneLabel.classList.add('border-custom-outline');
    }
  });

  dropzoneLabel.addEventListener('drop', () => {
    // Reset visual state after drop
    dropzoneLabel.classList.remove('border-white');
    dropzoneLabel.classList.add('border-custom-outline');
  });

});

/**
 * Phase 3 Enhancement: Polls the /job/:id endpoint until job is complete
 * @param {string} jobId - The job ID returned from /generate-chart
 * @param {HTMLElement} generateBtn - The generate button element to update with progress
 * @returns {Promise<Object>} The chart data when job is complete
 * @throws {Error} If job fails or times out
 */
async function pollForJobCompletion(jobId, generateBtn) {
  const POLL_INTERVAL = 1000; // Poll every 1 second
  const MAX_ATTEMPTS = 300; // 5 minutes maximum (300 seconds)
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;

    try {
      const response = await fetch(`/job/${jobId}`);

      if (!response.ok) {
        // Handle non-JSON error responses gracefully
        let errorText = `Server error: ${response.status}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const err = await response.json();
            errorText = err.error || errorText;
          } else {
            const text = await response.text();
            errorText = text.substring(0, 200) || errorText;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorText);
      }

      const job = await response.json();

      // Debug: Log job response
      console.log(`Poll attempt ${attempts}, job status:`, job.status, 'progress:', job.progress);

      // Update button text with progress
      if (job.progress && generateBtn) {
        generateBtn.textContent = job.progress;
      }

      // Check job status
      if (job.status === 'complete') {
        console.log('Job completed successfully');
        console.log('Job data structure:', Object.keys(job.data || {}));

        // *** ENHANCED DEBUG: Log exact structure received from server ***
        console.log('=== DETAILED DATA STRUCTURE RECEIVED ===');
        console.log('job.data exists:', !!job.data);
        console.log('job.data type:', typeof job.data);
        console.log('job.data keys:', job.data ? Object.keys(job.data) : 'N/A');
        console.log('job.data.timeColumns exists:', job.data ? !!job.data.timeColumns : false);
        console.log('job.data.timeColumns type:', job.data?.timeColumns ? typeof job.data.timeColumns : 'N/A');
        console.log('job.data.timeColumns is array:', job.data?.timeColumns ? Array.isArray(job.data.timeColumns) : false);
        console.log('job.data.timeColumns value:', job.data?.timeColumns);
        console.log('job.data.data exists:', job.data ? !!job.data.data : false);
        console.log('job.data.data type:', job.data?.data ? typeof job.data.data : 'N/A');
        console.log('job.data.data is array:', job.data?.data ? Array.isArray(job.data.data) : false);
        console.log('job.data.data value:', job.data?.data);
        console.log('========================================');

        return job.data; // Return the chart data
      } else if (job.status === 'error') {
        throw new Error(job.error || 'Job failed with unknown error');
      }

      // Job still processing, wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

    } catch (error) {
      // If it's a network error, retry after a short delay
      if (error.message.includes('fetch')) {
        console.warn(`Poll attempt ${attempts} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        continue;
      }
      // For other errors (job errors), throw immediately
      throw error;
    }
  }

  // If we get here, we've exceeded max attempts
  throw new Error('Job timed out after 5 minutes. Please try again.');
}

/**
 * Handles the "Generate Chart" button click
 */
async function handleChartGenerate(event) {
  event.preventDefault(); // Stop form from reloading page

  const generateBtn = document.getElementById('generate-btn');
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorMessage = document.getElementById('error-message');
  const chartOutput = document.getElementById('chart-output');

  // Disable button IMMEDIATELY to prevent double-clicks (race condition fix)
  if (generateBtn.disabled) return; // Already processing
  generateBtn.disabled = true;

  const originalBtnText = generateBtn.textContent;
  generateBtn.textContent = 'Generating...';

  try {
    // 1. Get form data
    const promptInput = document.getElementById('prompt-input');
    const uploadInput = document.getElementById('upload-input');

    // 2. Validate inputs
    if (uploadInput.files.length === 0) {
      displayError('Error: Please upload at least one research document.');
      return; // Will re-enable button in finally block
    }

    if (!promptInput.value.trim()) {
      displayError('Error: Please provide project instructions in the prompt.');
      return; // Will re-enable button in finally block
    }

    const formData = new FormData();
    formData.append('prompt', promptInput.value);
    for (const file of uploadInput.files) {
      formData.append('researchFiles', file);
    }

    // 3. Update UI to show loading
    loadingIndicator.style.display = 'flex';
    errorMessage.style.display = 'none';
    chartOutput.innerHTML = ''; // Clear old chart

    // 3. Phase 3 Enhancement: Call /generate-chart to start async job
    const response = await fetch('/generate-chart', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Handle non-JSON error responses gracefully
      let errorText = `Server error: ${response.status}`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const err = await response.json();
          errorText = err.error || errorText;
        } else {
          const text = await response.text();
          errorText = text.substring(0, 200) || errorText; // Limit error length
        }
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
      }
      throw new Error(errorText);
    }

    // 4. Get job ID from response
    const jobResponse = await response.json();
    const jobId = jobResponse.jobId;

    if (!jobId) {
      throw new Error('Server did not return a job ID');
    }

    console.log('Job started:', jobId);

    // 5. Poll for job completion
    const ganttData = await pollForJobCompletion(jobId, generateBtn);

    // Debug: Log the received data structure
    console.log('Received ganttData:', ganttData);
    console.log('Has timeColumns:', !!ganttData?.timeColumns);
    console.log('Has data:', !!ganttData?.data);

    // 6. Validate the data structure with detailed error reporting
    if (!ganttData || typeof ganttData !== 'object') {
      console.error('Invalid data structure - ganttData is not an object. Type:', typeof ganttData, 'Value:', ganttData);
      throw new Error('Invalid chart data structure: Expected object, received ' + typeof ganttData);
    }

    if (!ganttData.timeColumns) {
      console.error('Invalid data structure - missing timeColumns. Keys:', Object.keys(ganttData), 'timeColumns value:', ganttData.timeColumns);
      throw new Error('Invalid chart data structure: Missing timeColumns field');
    }

    if (!Array.isArray(ganttData.timeColumns)) {
      console.error('Invalid data structure - timeColumns is not an array. Type:', typeof ganttData.timeColumns, 'Value:', ganttData.timeColumns);
      throw new Error('Invalid chart data structure: timeColumns is not an array (type: ' + typeof ganttData.timeColumns + ')');
    }

    if (!ganttData.data) {
      console.error('Invalid data structure - missing data. Keys:', Object.keys(ganttData), 'data value:', ganttData.data);
      throw new Error('Invalid chart data structure: Missing data field');
    }

    if (!Array.isArray(ganttData.data)) {
      console.error('Invalid data structure - data is not an array. Type:', typeof ganttData.data, 'Value:', ganttData.data);
      throw new Error('Invalid chart data structure: data is not an array (type: ' + typeof ganttData.data + ')');
    }

    console.log('✓ Data structure validation passed - timeColumns:', ganttData.timeColumns.length, 'data:', ganttData.data.length);

    // Check for empty data
    if (ganttData.timeColumns.length === 0 || ganttData.data.length === 0) {
      console.warn("AI returned valid but empty data.", ganttData);
      throw new Error('The AI was unable to find any tasks or time columns in the provided documents. Please check your files or try a different prompt.');
    }

    // 7. Open in new tab
    // Use URL-based sharing with chartId
    if (ganttData.chartId) {
      // Primary method: Open chart using URL parameter
      window.open(`/chart.html?id=${ganttData.chartId}`, '_blank');
      console.log('Chart opened with ID:', ganttData.chartId);

      // Also store in sessionStorage as fallback for backward compatibility
      sessionStorage.setItem('ganttData', JSON.stringify(ganttData));
    } else {
      // Fallback: Use sessionStorage method (for older API responses)
      sessionStorage.setItem('ganttData', JSON.stringify(ganttData));
      window.open('/chart.html', '_blank');
      console.log('Chart opened using sessionStorage (fallback)');
    }
    

  } catch (error) {
    console.error("Error generating chart:", error);
    errorMessage.textContent = `Error: ${error.message}`;
    errorMessage.style.display = 'block';
  } finally {
    // 7. Restore UI (always re-enable button)
    generateBtn.disabled = false;
    generateBtn.textContent = originalBtnText;
    loadingIndicator.style.display = 'none';
  }
}
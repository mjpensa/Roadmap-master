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

// --- Helper to trigger file processing logic using a FileList object ---
function processFiles(files) {
    const fileInput = document.getElementById('file-input');
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

    // 2. Handle invalid files
    if (invalidFiles.length > 0) {
        const errorMsg = `The following files are not supported: ${invalidFiles.join(', ')}. Please upload only ${SUPPORTED_FILES_STRING} files.`;
        displayError(errorMsg);
        
        // Reset the input field completely to prevent submission of bad files
        fileInput.value = '';
        
        // Restore dropzone prompt
        dropzonePrompt.classList.remove('hidden');
        fileListContainer.classList.add('hidden');
        return;
    }

    // 3. If files are valid, update the list display
    fileList.innerHTML = ''; // Clear previous list
    
    // Create a new DataTransfer object to hold valid files
    const dataTransfer = new DataTransfer();
    for (const file of validFiles) {
        const li = document.createElement('li');
        li.className = 'truncate'; 
        li.textContent = file.name;
        li.title = file.name; // Show full name on hover
        fileList.appendChild(li);
        dataTransfer.items.add(file); // Add valid file to the DataTransfer
    }
    
    // Update the input field's files property with the clean list
    fileInput.files = dataTransfer.files;

    dropzonePrompt.classList.add('hidden');
    fileListContainer.classList.remove('hidden');
}


// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  const ganttForm = document.getElementById('gantt-form');
  ganttForm.addEventListener('submit', handleChartGenerate);

  const fileInput = document.getElementById('file-input');
  const dropzoneLabel = document.querySelector('.dropzone-container'); // The clickable label

  // MODIFICATION: Consolidated file selection logic into processFiles
  fileInput.addEventListener('change', (e) => {
    processFiles(e.target.files);
  });
  
  // -------------------------------------------------------------------
  // --- NEW: DRAG AND DROP EVENT LISTENERS ---
  // -------------------------------------------------------------------

  // 1. Prevent default behavior on dragover/dragenter (REQUIRED for drop to work)
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzoneLabel.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });
  
  // 2. Handle file drop
  dropzoneLabel.addEventListener('drop', (e) => {
    const droppedFiles = e.dataTransfer.files;
    processFiles(droppedFiles);
  }, false);

  // 3. (Optional) Visual feedback for drag
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

      // Update button text with progress
      if (job.progress && generateBtn) {
        generateBtn.textContent = job.progress;
      }

      // Check job status
      if (job.status === 'complete') {
        console.log('Job completed successfully');
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
    const fileInput = document.getElementById('file-input');

    // 2. Validate inputs
    if (fileInput.files.length === 0) {
      displayError('Error: Please upload at least one research document.');
      return; // Will re-enable button in finally block
    }

    if (!promptInput.value.trim()) {
      displayError('Error: Please provide project instructions in the prompt.');
      return; // Will re-enable button in finally block
    }

    const formData = new FormData();
    formData.append('prompt', promptInput.value);
    for (const file of fileInput.files) {
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

    // 6. Validate the data structure
    if (!ganttData || !ganttData.timeColumns || !ganttData.data) {
      throw new Error('Invalid chart data structure received from server');
    }

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
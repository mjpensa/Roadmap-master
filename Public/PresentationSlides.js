/**
 * PresentationSlides Module (Refactored)
 * Loads and displays pre-built HTML slide templates (bip-slide-*.html)
 * Replaces the old dynamic slide generation system
 */

import { CONFIG } from './config.js';

/**
 * PresentationSlides Class
 * Responsible for loading and managing the presentation slides from HTML templates
 */
export class PresentationSlides {
  /**
   * Creates a new PresentationSlides instance
   * @param {Object} _unusedSlidesData - (Deprecated) No longer used - kept for backward compatibility
   * @param {string} _unusedFooterSVG - (Deprecated) No longer used - kept for backward compatibility
   */
  constructor(_unusedSlidesData = null, _unusedFooterSVG = null) {
    // Note: slidesData and footerSVG parameters are no longer used
    // They are kept in the constructor signature for backward compatibility with existing code
    this.isExpanded = true; // Default to expanded on load
    this.currentSlideIndex = 0;
    this.container = null;
    this.totalSlides = 13; // We have 13 pre-built slide templates (bip-slide-1.html through bip-slide-13.html)
    this.slideCache = {}; // Cache loaded slide content
  }

  /**
   * Renders the presentation slides component
   * @returns {HTMLElement} The rendered presentation slides container
   */
  render() {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'presentation-slides-container';
    this.container.id = 'presentationSlides';

    // Build header
    const header = this._buildHeader();
    this.container.appendChild(header);

    // Build content
    const content = this._buildContent();
    this.container.appendChild(content);

    return this.container;
  }

  /**
   * Builds the header section with title and toggle button
   * @private
   * @returns {HTMLElement} The header element
   */
  _buildHeader() {
    const header = document.createElement('div');
    header.className = 'slides-header';

    const title = document.createElement('h2');
    title.className = 'slides-title';
    title.innerHTML = '<span class="icon">📊</span> Presentation Slides';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'expand-toggle';
    toggleBtn.setAttribute('aria-label', 'Toggle slides');
    toggleBtn.innerHTML = `<span class="chevron">${this.isExpanded ? '▼' : '▶'}</span>`;

    // Make entire header clickable
    header.addEventListener('click', () => this._toggleExpand());

    header.appendChild(title);
    header.appendChild(toggleBtn);

    return header;
  }

  /**
   * Builds the content section with slide viewer
   * @private
   * @returns {HTMLElement} The content element
   */
  _buildContent() {
    const content = document.createElement('div');
    content.className = 'slides-content';
    content.style.display = this.isExpanded ? 'block' : 'none';

    // Create slide viewer
    const slideViewer = document.createElement('div');
    slideViewer.className = 'slide-viewer';

    // Create slide display
    const slideDisplay = document.createElement('div');
    slideDisplay.className = 'slide-display';
    slideDisplay.id = 'currentSlide';

    // Add loading indicator
    slideDisplay.innerHTML = '<div class="slide-loading">Loading slide...</div>';

    // Render the first slide
    this._renderSlide(slideDisplay, this.currentSlideIndex);

    slideViewer.appendChild(slideDisplay);

    // Create navigation controls
    const navigation = this._buildNavigation();
    slideViewer.appendChild(navigation);

    content.appendChild(slideViewer);

    return content;
  }

  /**
   * Renders a specific slide by fetching its HTML template
   * @private
   * @param {HTMLElement} container - The container to render the slide into
   * @param {number} index - The index of the slide to render (0-based)
   */
  async _renderSlide(container, index) {
    try {
      // Show loading state
      container.innerHTML = '<div class="slide-loading" style="padding: 40px; text-align: center; color: #6B7280;">Loading slide...</div>';

      // Slide numbers are 1-based in filenames (bip-slide-1.html, bip-slide-2.html, etc.)
      const slideNumber = index + 1;
      const slideUrl = `/bip-slide-${slideNumber}.html`;

      // Check cache first
      let slideHTML;
      if (this.slideCache[slideNumber]) {
        slideHTML = this.slideCache[slideNumber];
      } else {
        // Fetch the slide HTML
        const response = await fetch(slideUrl);

        if (!response.ok) {
          throw new Error(`Failed to load slide ${slideNumber}: ${response.statusText}`);
        }

        const fullHTML = await response.text();

        // Parse the HTML to extract both styles and body content
        const parser = new DOMParser();
        const doc = parser.parseFromString(fullHTML, 'text/html');

        // Extract all style tags from the head
        const styles = Array.from(doc.head.querySelectorAll('style'))
          .map(style => style.outerHTML)
          .join('\n');

        // Extract body content
        const bodyContent = doc.body.innerHTML;

        // Combine styles and body content
        slideHTML = styles + bodyContent;

        // Cache the extracted content
        this.slideCache[slideNumber] = slideHTML;
      }

      // Clear container and inject the slide content
      container.innerHTML = '';

      // Create a wrapper div to contain the slide
      const slideWrapper = document.createElement('div');
      slideWrapper.className = 'bip-slide-wrapper';
      slideWrapper.style.cssText = 'background: white; position: relative; width: 100%; height: 100%; overflow: auto;';
      slideWrapper.innerHTML = slideHTML;

      container.appendChild(slideWrapper);

    } catch (error) {
      console.error('Error loading slide:', error);
      container.innerHTML = `
        <div class="slide-error" style="padding: 40px; text-align: center; color: #DC2626;">
          <p><strong>Error loading slide ${index + 1}</strong></p>
          <p style="margin-top: 10px; color: #6B7280;">${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Builds the navigation controls
   * @private
   * @returns {HTMLElement} The navigation element
   */
  _buildNavigation() {
    const nav = document.createElement('div');
    nav.className = 'slide-navigation';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'nav-btn prev-btn';
    prevBtn.innerHTML = '◀ Previous';
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._previousSlide();
    });

    const slideIndicator = document.createElement('div');
    slideIndicator.className = 'slide-indicator';
    slideIndicator.id = 'slideIndicator';
    slideIndicator.textContent = `${this.currentSlideIndex + 1} / ${this.totalSlides}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'nav-btn next-btn';
    nextBtn.innerHTML = 'Next ▶';
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._nextSlide();
    });

    nav.appendChild(prevBtn);
    nav.appendChild(slideIndicator);
    nav.appendChild(nextBtn);

    return nav;
  }

  /**
   * Navigates to the previous slide
   * @private
   */
  _previousSlide() {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
      const slideDisplay = document.getElementById('currentSlide');
      const slideIndicator = document.getElementById('slideIndicator');

      if (slideDisplay) {
        this._renderSlide(slideDisplay, this.currentSlideIndex);
      }

      if (slideIndicator) {
        slideIndicator.textContent = `${this.currentSlideIndex + 1} / ${this.totalSlides}`;
      }
    }
  }

  /**
   * Navigates to the next slide
   * @private
   */
  _nextSlide() {
    if (this.currentSlideIndex < this.totalSlides - 1) {
      this.currentSlideIndex++;
      const slideDisplay = document.getElementById('currentSlide');
      const slideIndicator = document.getElementById('slideIndicator');

      if (slideDisplay) {
        this._renderSlide(slideDisplay, this.currentSlideIndex);
      }

      if (slideIndicator) {
        slideIndicator.textContent = `${this.currentSlideIndex + 1} / ${this.totalSlides}`;
      }
    }
  }

  /**
   * Toggles the expand/collapse state of the slides
   * @private
   */
  _toggleExpand() {
    this.isExpanded = !this.isExpanded;

    const content = this.container.querySelector('.slides-content');
    const chevron = this.container.querySelector('.chevron');

    if (content) {
      content.style.display = this.isExpanded ? 'block' : 'none';
    }

    if (chevron) {
      chevron.textContent = this.isExpanded ? '▼' : '▶';
    }
  }
}

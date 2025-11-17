/**
 * PresentationSlides Module
 * Renders AI-generated presentation slides in a collapsible format
 * Displays professional slide content with navigation
 */

import { CONFIG } from './config.js';

/**
 * PresentationSlides Class
 * Responsible for rendering and managing the presentation slides component
 */
export class PresentationSlides {
  /**
   * Creates a new PresentationSlides instance
   * @param {Object} slidesData - The presentation slides data from the API
   */
  constructor(slidesData) {
    this.slidesData = slidesData;
    this.isExpanded = true; // Default to expanded on load
    this.currentSlideIndex = 0;
    this.container = null;
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

    // Check if slides data exists
    if (!this.slidesData || !this.slidesData.slides || this.slidesData.slides.length === 0) {
      this.container.innerHTML = '<p class="slides-unavailable">Presentation slides not available for this chart.</p>';
      return this.container;
    }

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
   * Builds the content section with all slides
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
   * Renders a specific slide
   * @private
   * @param {HTMLElement} container - The container to render the slide into
   * @param {number} index - The index of the slide to render
   */
  _renderSlide(container, index) {
    const slide = this.slidesData.slides[index];
    container.innerHTML = '';

    const slideCard = document.createElement('div');
    slideCard.className = `slide-card slide-type-${slide.type}`;

    // Add slide number
    const slideNumber = document.createElement('div');
    slideNumber.className = 'slide-number';
    slideNumber.textContent = `${String(index + 1).padStart(2, '0')}`;
    slideCard.appendChild(slideNumber);

    // Render based on slide type
    switch (slide.type) {
      case 'title':
        this._renderTitleSlide(slideCard, slide);
        break;
      case 'narrative':
        this._renderNarrativeSlide(slideCard, slide);
        break;
      case 'drivers':
        this._renderDriversSlide(slideCard, slide);
        break;
      case 'dependencies':
        this._renderDependenciesSlide(slideCard, slide);
        break;
      case 'risks':
        this._renderRisksSlide(slideCard, slide);
        break;
      case 'insights':
        this._renderInsightsSlide(slideCard, slide);
        break;
      case 'simple':
        this._renderSimpleSlide(slideCard, slide);
        break;
      default:
        this._renderSimpleSlide(slideCard, slide);
    }

    container.appendChild(slideCard);
  }

  /**
   * Renders a title slide
   * @private
   */
  _renderTitleSlide(container, slide) {
    const content = document.createElement('div');
    content.className = 'title-content';
    content.innerHTML = `
      <h1 class="main-title">${slide.title || 'AI-Powered Strategic Intelligence'}</h1>
      <div class="title-accent"></div>
      <p class="subtitle">${slide.subtitle || 'Strategic Intelligence Brief'}</p>
    `;
    container.appendChild(content);
  }

  /**
   * Renders a narrative slide
   * @private
   */
  _renderNarrativeSlide(container, slide) {
    const content = document.createElement('div');
    content.className = 'narrative-slide';

    const header = document.createElement('h2');
    header.className = 'narrative-title';
    header.textContent = slide.title || 'Elevator Pitch';

    const narrativeContent = document.createElement('div');
    narrativeContent.className = 'narrative-content';

    if (Array.isArray(slide.content)) {
      slide.content.forEach(paragraph => {
        const p = document.createElement('p');
        p.textContent = paragraph;
        narrativeContent.appendChild(p);
      });
    } else {
      const p = document.createElement('p');
      p.textContent = slide.content;
      narrativeContent.appendChild(p);
    }

    content.appendChild(header);
    content.appendChild(narrativeContent);
    container.appendChild(content);
  }

  /**
   * Renders a drivers slide
   * @private
   */
  _renderDriversSlide(container, slide) {
    const content = document.createElement('div');
    content.className = 'drivers-slide';

    const header = document.createElement('h2');
    header.className = 'drivers-title';
    header.textContent = slide.title || 'Key Strategic Drivers';

    const driversList = document.createElement('div');
    driversList.className = 'drivers-list';

    if (slide.drivers && Array.isArray(slide.drivers)) {
      slide.drivers.forEach((driver, idx) => {
        const driverItem = document.createElement('div');
        driverItem.className = 'driver-item';
        driverItem.innerHTML = `
          <div class="driver-bullet">${idx + 1}</div>
          <div class="driver-content">
            <h3 class="driver-title">${driver.title}</h3>
            <p class="driver-description">${driver.description}</p>
          </div>
        `;
        driversList.appendChild(driverItem);
      });
    }

    content.appendChild(header);
    content.appendChild(driversList);
    container.appendChild(content);
  }

  /**
   * Renders a dependencies slide
   * @private
   */
  _renderDependenciesSlide(container, slide) {
    const content = document.createElement('div');
    content.className = 'dependencies-slide';

    const header = document.createElement('h2');
    header.className = 'dependencies-title';
    header.textContent = slide.title || 'Critical Dependencies';

    const dependenciesFlow = document.createElement('div');
    dependenciesFlow.className = 'dependencies-flow';

    if (slide.dependencies && Array.isArray(slide.dependencies)) {
      slide.dependencies.forEach((dep, idx) => {
        const depItem = document.createElement('div');
        depItem.className = `dependency-item ${dep.criticality}`;
        depItem.innerHTML = `
          <h3 class="dependency-name">${dep.name}</h3>
          <span class="dependency-criticality criticality-${dep.criticalityLevel}">${dep.criticality}</span>
          <p class="dependency-impact">${dep.impact}</p>
          ${idx < slide.dependencies.length - 1 ? '<span class="dependency-arrow">→</span>' : ''}
        `;
        dependenciesFlow.appendChild(depItem);
      });
    }

    content.appendChild(header);
    content.appendChild(dependenciesFlow);
    container.appendChild(content);
  }

  /**
   * Renders a risks slide
   * @private
   */
  _renderRisksSlide(container, slide) {
    const content = document.createElement('div');
    content.className = 'risks-slide';

    const header = document.createElement('h2');
    header.className = 'risks-title';
    header.textContent = slide.title || 'Strategic Risk Matrix';

    const risksList = document.createElement('div');
    risksList.className = 'risks-list';

    if (slide.risks && Array.isArray(slide.risks)) {
      slide.risks.forEach(risk => {
        const riskItem = document.createElement('div');
        riskItem.className = 'risk-item';
        riskItem.innerHTML = `
          <div class="risk-header">
            <span class="probability-badge probability-${risk.probability}">${risk.probability.toUpperCase()}</span>
            <span class="impact-badge impact-${risk.impact}">${risk.impact.toUpperCase()}</span>
          </div>
          <p class="risk-description">${risk.description}</p>
        `;
        risksList.appendChild(riskItem);
      });
    }

    content.appendChild(header);
    content.appendChild(risksList);
    container.appendChild(content);
  }

  /**
   * Renders an insights slide
   * @private
   */
  _renderInsightsSlide(container, slide) {
    const content = document.createElement('div');
    content.className = 'insights-slide';

    const header = document.createElement('h2');
    header.className = 'insights-title';
    header.textContent = slide.title || 'Expert Conversation Points';

    const insightsGrid = document.createElement('div');
    insightsGrid.className = 'insights-grid';

    if (slide.insights && Array.isArray(slide.insights)) {
      slide.insights.forEach(insight => {
        const insightCard = document.createElement('div');
        insightCard.className = 'insight-card';
        insightCard.innerHTML = `
          <span class="insight-category">${insight.category}</span>
          <p class="insight-text">${insight.text}</p>
        `;
        insightsGrid.appendChild(insightCard);
      });
    }

    content.appendChild(header);
    content.appendChild(insightsGrid);
    container.appendChild(content);
  }

  /**
   * Renders a simple text slide
   * @private
   */
  _renderSimpleSlide(container, slide) {
    const content = document.createElement('div');
    content.className = 'simple-slide';

    const header = document.createElement('h2');
    header.className = 'simple-title';
    header.textContent = slide.title || 'Summary';

    const text = document.createElement('p');
    text.className = 'simple-text';
    text.textContent = slide.content || slide.text || '';

    content.appendChild(header);
    content.appendChild(text);
    container.appendChild(content);
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
    slideIndicator.textContent = `${this.currentSlideIndex + 1} / ${this.slidesData.slides.length}`;

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
        slideIndicator.textContent = `${this.currentSlideIndex + 1} / ${this.slidesData.slides.length}`;
      }
    }
  }

  /**
   * Navigates to the next slide
   * @private
   */
  _nextSlide() {
    if (this.currentSlideIndex < this.slidesData.slides.length - 1) {
      this.currentSlideIndex++;
      const slideDisplay = document.getElementById('currentSlide');
      const slideIndicator = document.getElementById('slideIndicator');

      if (slideDisplay) {
        this._renderSlide(slideDisplay, this.currentSlideIndex);
      }

      if (slideIndicator) {
        slideIndicator.textContent = `${this.currentSlideIndex + 1} / ${this.slidesData.slides.length}`;
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

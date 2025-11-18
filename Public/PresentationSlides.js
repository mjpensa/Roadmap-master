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
   * @param {string} footerSVG - The SVG content for the header/footer decoration
   */
  constructor(slidesData, footerSVG) {
    this.slidesData = slidesData;
    this.footerSVG = footerSVG;
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

    // Create swiper-slide structure matching the template
    const swiperSlide = document.createElement('div');
    swiperSlide.className = `swiper-slide slide-${slide.type}`;

    const slideContainer = document.createElement('div');
    slideContainer.className = 'slide-container';

    // Add slide number
    const slideNumber = document.createElement('div');
    slideNumber.className = 'slide-number';
    slideNumber.textContent = `${String(index + 1).padStart(2, '0')}`;

    // Render based on slide type
    switch (slide.type) {
      case 'title':
        this._renderTitleSlide(slideContainer, slide);
        break;
      case 'narrative':
        this._renderNarrativeSlide(slideContainer, slide);
        break;
      case 'drivers':
        this._renderDriversSlide(slideContainer, slide);
        break;
      case 'dependencies':
        this._renderDependenciesSlide(slideContainer, slide);
        break;
      case 'risks':
        this._renderRisksSlide(slideContainer, slide);
        break;
      case 'insights':
        this._renderInsightsSlide(slideContainer, slide);
        break;
      case 'simple':
        this._renderSimpleSlide(slideContainer, slide);
        break;
      default:
        this._renderSimpleSlide(slideContainer, slide);
    }

    slideContainer.appendChild(slideNumber);
    swiperSlide.appendChild(slideContainer);
    container.appendChild(swiperSlide);
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
    const header = document.createElement('div');
    header.className = 'narrative-header';

    const title = document.createElement('h2');
    title.className = 'narrative-title';
    title.textContent = slide.title || 'Elevator Pitch';
    header.appendChild(title);

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

    container.appendChild(header);
    container.appendChild(narrativeContent);
  }

  /**
   * Renders a drivers slide
   * @private
   */
  _renderDriversSlide(container, slide) {
    const header = document.createElement('div');
    header.className = 'drivers-header';

    const title = document.createElement('h2');
    title.className = 'drivers-title';
    title.textContent = slide.title || 'Key Strategic Drivers';
    header.appendChild(title);

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

    container.appendChild(header);
    container.appendChild(driversList);
  }

  /**
   * Renders a dependencies slide
   * @private
   */
  _renderDependenciesSlide(container, slide) {
    const header = document.createElement('div');
    header.className = 'dependencies-header';

    const title = document.createElement('h2');
    title.className = 'dependencies-title';
    title.textContent = slide.title || 'Critical Dependencies';
    header.appendChild(title);

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

    container.appendChild(header);
    container.appendChild(dependenciesFlow);
  }

  /**
   * Renders a risks slide as 3x3 matrix grid
   * @private
   */
  _renderRisksSlide(container, slide) {
    const header = document.createElement('div');
    header.className = 'risks-header';

    const title = document.createElement('h2');
    title.className = 'risks-title';
    title.textContent = slide.title || 'Strategic Risk Matrix';
    header.appendChild(title);

    // Create 3x3 risk matrix grid
    const riskMatrix = document.createElement('div');
    riskMatrix.className = 'risk-matrix';

    // Group risks by probability and impact for positioning
    const risksByCell = {};
    if (slide.risks && Array.isArray(slide.risks)) {
      slide.risks.forEach(risk => {
        const key = `${risk.probability}-${risk.impact}`;
        if (!risksByCell[key]) {
          risksByCell[key] = [];
        }
        risksByCell[key].push(risk);
      });
    }

    // Build matrix: 4 rows (header + 3 probability levels) x 4 columns (label + 3 impact levels)

    // Row 1: Column headers
    riskMatrix.appendChild(this._createMatrixLabel('')); // Empty top-left corner
    riskMatrix.appendChild(this._createMatrixLabel('Low'));
    riskMatrix.appendChild(this._createMatrixLabel('Medium'));
    riskMatrix.appendChild(this._createMatrixLabel('High'));

    // Row 2: High Probability
    riskMatrix.appendChild(this._createMatrixLabel('High'));
    riskMatrix.appendChild(this._createMatrixCell('high', 'low', risksByCell['high-low']));
    riskMatrix.appendChild(this._createMatrixCell('high', 'medium', risksByCell['high-medium']));
    riskMatrix.appendChild(this._createMatrixCell('high', 'high', risksByCell['high-high']));

    // Row 3: Medium Probability
    riskMatrix.appendChild(this._createMatrixLabel('Medium'));
    riskMatrix.appendChild(this._createMatrixCell('medium', 'low', risksByCell['medium-low']));
    riskMatrix.appendChild(this._createMatrixCell('medium', 'medium', risksByCell['medium-medium']));
    riskMatrix.appendChild(this._createMatrixCell('medium', 'high', risksByCell['medium-high']));

    // Row 4: Low Probability
    riskMatrix.appendChild(this._createMatrixLabel('Low'));
    riskMatrix.appendChild(this._createMatrixCell('low', 'low', risksByCell['low-low']));
    riskMatrix.appendChild(this._createMatrixCell('low', 'medium', risksByCell['low-medium']));
    riskMatrix.appendChild(this._createMatrixCell('low', 'high', risksByCell['low-high']));

    // Create wrapper for matrix and axis labels
    const matrixWrapper = document.createElement('div');
    matrixWrapper.style.position = 'relative';
    matrixWrapper.style.display = 'inline-block';
    matrixWrapper.style.margin = '0 auto';

    // Add axis labels
    const xAxisLabel = document.createElement('span');
    xAxisLabel.className = 'axis-label x-axis';
    xAxisLabel.textContent = 'Impact →';

    const yAxisLabel = document.createElement('span');
    yAxisLabel.className = 'axis-label y-axis';
    yAxisLabel.textContent = 'Probability';

    matrixWrapper.appendChild(riskMatrix);
    matrixWrapper.appendChild(xAxisLabel);
    matrixWrapper.appendChild(yAxisLabel);

    container.appendChild(header);
    container.appendChild(matrixWrapper);
  }

  /**
   * Creates a matrix label cell
   * @private
   */
  _createMatrixLabel(text) {
    const label = document.createElement('div');
    label.className = 'matrix-label';
    label.textContent = text;
    return label;
  }

  /**
   * Creates a matrix cell with risks
   * @private
   */
  _createMatrixCell(probability, impact, risks) {
    const cell = document.createElement('div');
    cell.className = `matrix-cell ${probability}-${impact}`;

    if (risks && risks.length > 0) {
      risks.forEach(risk => {
        const riskItem = document.createElement('div');
        riskItem.className = 'risk-item';
        riskItem.innerHTML = `<p class="risk-description">${risk.description}</p>`;
        cell.appendChild(riskItem);
      });
    }

    return cell;
  }

  /**
   * Renders an insights slide
   * @private
   */
  _renderInsightsSlide(container, slide) {
    const header = document.createElement('div');
    header.className = 'insights-header';

    const title = document.createElement('h2');
    title.className = 'insights-title';
    title.textContent = slide.title || 'Expert Conversation Points';
    header.appendChild(title);

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

    container.appendChild(header);
    container.appendChild(insightsGrid);
  }

  /**
   * Renders a simple text slide
   * @private
   */
  _renderSimpleSlide(container, slide) {
    const content = document.createElement('div');
    content.className = 'simple-content';

    const header = document.createElement('h2');
    header.className = 'simple-title';
    header.textContent = slide.title || 'Summary';

    const textContent = document.createElement('p');
    textContent.className = 'simple-text';

    // Handle content as array or string for backwards compatibility
    if (Array.isArray(slide.content)) {
      textContent.textContent = slide.content.join(' ');
    } else {
      textContent.textContent = slide.content || slide.text || '';
    }

    content.appendChild(header);
    content.appendChild(textContent);
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

    // Export to PowerPoint button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'nav-btn export-pptx-btn';
    exportBtn.innerHTML = '📥 Export to PowerPoint';
    exportBtn.title = 'Export slides as PowerPoint presentation';
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._exportToPowerPoint();
    });

    nav.appendChild(prevBtn);
    nav.appendChild(slideIndicator);
    nav.appendChild(nextBtn);
    nav.appendChild(exportBtn);

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

  /**
   * Adds the header SVG decoration above the Presentation Slides
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

    this.container.appendChild(headerSvgEl);
  }

  /**
   * Adds the footer SVG decoration after the Presentation Slides
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

    this.container.appendChild(footerSvgEl);
  }

  /**
   * Exports the presentation to PowerPoint format
   * @private
   */
  _exportToPowerPoint() {
    // Check if PptxGenJS is available
    if (typeof PptxGenJS === 'undefined') {
      alert('PowerPoint export library not loaded. Please refresh the page and try again.');
      return;
    }

    try {
      // Create a new presentation
      const pptx = new PptxGenJS();

      // Set presentation properties
      pptx.author = 'AI Roadmap Generator';
      pptx.company = 'Strategic Intelligence';
      pptx.subject = 'Strategic Roadmap Presentation';
      pptx.title = this.slidesData.slides[0]?.title || 'Strategic Intelligence Brief';

      // Define color scheme (banking theme - dark blue)
      const colors = {
        primary: '1a3a52',      // Dark blue
        accent: '50AF7B',        // Green accent
        text: 'FFFFFF',          // White text
        background: '0F1419',    // Dark background
        lightText: 'E5E7EB',     // Light gray text
        red: 'DA291C',           // Priority red
        gray: '6B7280'           // Mid gray
      };

      // Process each slide
      this.slidesData.slides.forEach((slide, index) => {
        switch (slide.type) {
          case 'title':
            this._addTitleSlideToPPTX(pptx, slide, colors);
            break;
          case 'narrative':
            this._addNarrativeSlideToPPTX(pptx, slide, colors);
            break;
          case 'drivers':
            this._addDriversSlideToPPTX(pptx, slide, colors);
            break;
          case 'dependencies':
            this._addDependenciesSlideToPPTX(pptx, slide, colors);
            break;
          case 'risks':
            this._addRisksSlideToPPTX(pptx, slide, colors);
            break;
          case 'insights':
            this._addInsightsSlideToPPTX(pptx, slide, colors);
            break;
          case 'simple':
            this._addSimpleSlideToPPTX(pptx, slide, colors);
            break;
          default:
            this._addSimpleSlideToPPTX(pptx, slide, colors);
        }
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Strategic_Roadmap_${timestamp}.pptx`;

      // Save the presentation
      pptx.writeFile({ fileName: filename });

      console.log(`PowerPoint presentation exported: ${filename}`);
    } catch (error) {
      console.error('Error exporting to PowerPoint:', error);
      alert('Failed to export PowerPoint. Please try again or check the console for details.');
    }
  }

  /**
   * Adds a title slide to the PowerPoint presentation
   * @private
   */
  _addTitleSlideToPPTX(pptx, slide, colors) {
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: colors.background };

    // Main title
    titleSlide.addText(slide.title || 'AI-Powered Strategic Intelligence', {
      x: 0.5,
      y: 2.0,
      w: 9.0,
      h: 1.5,
      fontSize: 44,
      bold: true,
      color: colors.text,
      align: 'center',
      fontFace: 'Arial'
    });

    // Accent line
    titleSlide.addShape(pptx.ShapeType.rect, {
      x: 4.0,
      y: 3.6,
      w: 2.0,
      h: 0.1,
      fill: { color: colors.accent }
    });

    // Subtitle
    titleSlide.addText(slide.subtitle || 'Strategic Intelligence Brief', {
      x: 0.5,
      y: 4.0,
      w: 9.0,
      h: 0.8,
      fontSize: 24,
      color: colors.lightText,
      align: 'center',
      fontFace: 'Arial'
    });

    // Slide number
    titleSlide.addText('01', {
      x: 9.0,
      y: 5.0,
      w: 0.5,
      h: 0.3,
      fontSize: 14,
      color: colors.gray,
      align: 'right',
      fontFace: 'Arial'
    });
  }

  /**
   * Adds a narrative slide to the PowerPoint presentation
   * @private
   */
  _addNarrativeSlideToPPTX(pptx, slide, colors) {
    const narrativeSlide = pptx.addSlide();
    narrativeSlide.background = { color: colors.background };

    // Title
    narrativeSlide.addText(slide.title || 'Elevator Pitch', {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: colors.accent,
      fontFace: 'Arial'
    });

    // Content paragraphs
    const content = Array.isArray(slide.content) ? slide.content.join('\n\n') : slide.content;
    narrativeSlide.addText(content, {
      x: 0.5,
      y: 1.5,
      w: 9.0,
      h: 4.0,
      fontSize: 16,
      color: colors.lightText,
      align: 'left',
      fontFace: 'Arial',
      valign: 'top'
    });

    // Slide number
    const slideNum = this.slidesData.slides.findIndex(s => s === slide) + 1;
    narrativeSlide.addText(String(slideNum).padStart(2, '0'), {
      x: 9.0,
      y: 5.0,
      w: 0.5,
      h: 0.3,
      fontSize: 14,
      color: colors.gray,
      align: 'right',
      fontFace: 'Arial'
    });
  }

  /**
   * Adds a drivers slide to the PowerPoint presentation
   * @private
   */
  _addDriversSlideToPPTX(pptx, slide, colors) {
    const driversSlide = pptx.addSlide();
    driversSlide.background = { color: colors.background };

    // Title
    driversSlide.addText(slide.title || 'Key Strategic Drivers', {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: colors.accent,
      fontFace: 'Arial'
    });

    // Drivers list
    if (slide.drivers && Array.isArray(slide.drivers)) {
      slide.drivers.forEach((driver, idx) => {
        const yPos = 1.5 + (idx * 0.9);

        // Numbered bullet
        driversSlide.addShape(pptx.ShapeType.ellipse, {
          x: 0.5,
          y: yPos,
          w: 0.4,
          h: 0.4,
          fill: { color: colors.accent }
        });

        driversSlide.addText(String(idx + 1), {
          x: 0.5,
          y: yPos,
          w: 0.4,
          h: 0.4,
          fontSize: 18,
          bold: true,
          color: colors.background,
          align: 'center',
          valign: 'middle',
          fontFace: 'Arial'
        });

        // Driver title
        driversSlide.addText(driver.title, {
          x: 1.1,
          y: yPos,
          w: 8.4,
          h: 0.3,
          fontSize: 18,
          bold: true,
          color: colors.text,
          fontFace: 'Arial'
        });

        // Driver description
        driversSlide.addText(driver.description, {
          x: 1.1,
          y: yPos + 0.35,
          w: 8.4,
          h: 0.5,
          fontSize: 14,
          color: colors.lightText,
          fontFace: 'Arial'
        });
      });
    }

    // Slide number
    const slideNum = this.slidesData.slides.findIndex(s => s === slide) + 1;
    driversSlide.addText(String(slideNum).padStart(2, '0'), {
      x: 9.0,
      y: 5.0,
      w: 0.5,
      h: 0.3,
      fontSize: 14,
      color: colors.gray,
      align: 'right',
      fontFace: 'Arial'
    });
  }

  /**
   * Adds a dependencies slide to the PowerPoint presentation
   * @private
   */
  _addDependenciesSlideToPPTX(pptx, slide, colors) {
    const depsSlide = pptx.addSlide();
    depsSlide.background = { color: colors.background };

    // Title
    depsSlide.addText(slide.title || 'Critical Dependencies', {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: colors.accent,
      fontFace: 'Arial'
    });

    // Dependencies flow
    if (slide.dependencies && Array.isArray(slide.dependencies)) {
      slide.dependencies.forEach((dep, idx) => {
        const yPos = 1.8 + (idx * 1.2);

        // Criticality color
        let criticalityColor = colors.gray;
        if (dep.criticalityLevel === 'high') criticalityColor = colors.red;
        else if (dep.criticalityLevel === 'medium') criticalityColor = 'FFA500'; // Orange

        // Dependency box
        depsSlide.addShape(pptx.ShapeType.rect, {
          x: 1.0,
          y: yPos,
          w: 7.5,
          h: 0.9,
          fill: { color: colors.primary },
          line: { color: criticalityColor, width: 3 }
        });

        // Dependency name
        depsSlide.addText(dep.name, {
          x: 1.2,
          y: yPos + 0.1,
          w: 5.0,
          h: 0.3,
          fontSize: 18,
          bold: true,
          color: colors.text,
          fontFace: 'Arial'
        });

        // Criticality badge
        depsSlide.addText(dep.criticality, {
          x: 6.5,
          y: yPos + 0.1,
          w: 1.8,
          h: 0.3,
          fontSize: 12,
          bold: true,
          color: criticalityColor,
          align: 'right',
          fontFace: 'Arial'
        });

        // Impact
        depsSlide.addText(dep.impact, {
          x: 1.2,
          y: yPos + 0.45,
          w: 7.0,
          h: 0.4,
          fontSize: 12,
          color: colors.lightText,
          fontFace: 'Arial'
        });

        // Arrow (if not last)
        if (idx < slide.dependencies.length - 1) {
          depsSlide.addText('→', {
            x: 8.7,
            y: yPos + 0.3,
            w: 0.5,
            h: 0.3,
            fontSize: 24,
            color: colors.accent,
            fontFace: 'Arial'
          });
        }
      });
    }

    // Slide number
    const slideNum = this.slidesData.slides.findIndex(s => s === slide) + 1;
    depsSlide.addText(String(slideNum).padStart(2, '0'), {
      x: 9.0,
      y: 5.0,
      w: 0.5,
      h: 0.3,
      fontSize: 14,
      color: colors.gray,
      align: 'right',
      fontFace: 'Arial'
    });
  }

  /**
   * Adds a risks slide to the PowerPoint presentation
   * @private
   */
  _addRisksSlideToPPTX(pptx, slide, colors) {
    const risksSlide = pptx.addSlide();
    risksSlide.background = { color: colors.background };

    // Title
    risksSlide.addText(slide.title || 'Strategic Risk Matrix', {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: colors.accent,
      fontFace: 'Arial'
    });

    // Create 3x3 risk matrix
    const cellWidth = 2.5;
    const cellHeight = 1.0;
    const startX = 1.5;
    const startY = 2.0;

    // Axis labels
    risksSlide.addText('Impact →', {
      x: 4.5,
      y: 5.2,
      w: 2.0,
      h: 0.3,
      fontSize: 14,
      color: colors.lightText,
      align: 'center',
      fontFace: 'Arial'
    });

    risksSlide.addText('Probability', {
      x: 0.3,
      y: 3.0,
      w: 1.0,
      h: 0.3,
      fontSize: 14,
      color: colors.lightText,
      rotate: 270,
      fontFace: 'Arial'
    });

    // Group risks by probability and impact
    const risksByCell = {};
    if (slide.risks && Array.isArray(slide.risks)) {
      slide.risks.forEach(risk => {
        const key = `${risk.probability}-${risk.impact}`;
        if (!risksByCell[key]) risksByCell[key] = [];
        risksByCell[key].push(risk);
      });
    }

    // Build 3x3 matrix (probability: high/medium/low, impact: low/medium/high)
    const probabilities = ['high', 'medium', 'low'];
    const impacts = ['low', 'medium', 'high'];

    probabilities.forEach((prob, rowIdx) => {
      impacts.forEach((impact, colIdx) => {
        const x = startX + (colIdx * cellWidth);
        const y = startY + (rowIdx * cellHeight);

        // Cell color based on risk level
        let cellColor = '2D3748'; // Default dark gray
        if (prob === 'high' && impact === 'high') cellColor = 'DC2626'; // Red
        else if ((prob === 'high' && impact === 'medium') || (prob === 'medium' && impact === 'high')) cellColor = 'F59E0B'; // Orange
        else if (prob === 'low' && impact === 'low') cellColor = '10B981'; // Green

        // Draw cell
        risksSlide.addShape(pptx.ShapeType.rect, {
          x: x,
          y: y,
          w: cellWidth,
          h: cellHeight,
          fill: { color: cellColor, transparency: 50 },
          line: { color: colors.gray, width: 1 }
        });

        // Add risks to cell
        const key = `${prob}-${impact}`;
        if (risksByCell[key]) {
          risksByCell[key].forEach((risk, riskIdx) => {
            risksSlide.addText(risk.description, {
              x: x + 0.1,
              y: y + 0.1 + (riskIdx * 0.3),
              w: cellWidth - 0.2,
              h: 0.25,
              fontSize: 10,
              color: colors.text,
              fontFace: 'Arial',
              valign: 'top'
            });
          });
        }
      });
    });

    // Slide number
    const slideNum = this.slidesData.slides.findIndex(s => s === slide) + 1;
    risksSlide.addText(String(slideNum).padStart(2, '0'), {
      x: 9.0,
      y: 5.0,
      w: 0.5,
      h: 0.3,
      fontSize: 14,
      color: colors.gray,
      align: 'right',
      fontFace: 'Arial'
    });
  }

  /**
   * Adds an insights slide to the PowerPoint presentation
   * @private
   */
  _addInsightsSlideToPPTX(pptx, slide, colors) {
    const insightsSlide = pptx.addSlide();
    insightsSlide.background = { color: colors.background };

    // Title
    insightsSlide.addText(slide.title || 'Expert Conversation Points', {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: colors.accent,
      fontFace: 'Arial'
    });

    // Insights grid (2 columns)
    if (slide.insights && Array.isArray(slide.insights)) {
      slide.insights.forEach((insight, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 0.5 + (col * 4.75);
        const y = 1.5 + (row * 1.3);

        // Insight card
        insightsSlide.addShape(pptx.ShapeType.rect, {
          x: x,
          y: y,
          w: 4.5,
          h: 1.2,
          fill: { color: colors.primary },
          line: { color: colors.accent, width: 1 }
        });

        // Category badge
        insightsSlide.addText(insight.category, {
          x: x + 0.1,
          y: y + 0.1,
          w: 4.3,
          h: 0.25,
          fontSize: 10,
          bold: true,
          color: colors.accent,
          fontFace: 'Arial'
        });

        // Insight text
        insightsSlide.addText(insight.text, {
          x: x + 0.1,
          y: y + 0.4,
          w: 4.3,
          h: 0.7,
          fontSize: 11,
          color: colors.lightText,
          fontFace: 'Arial',
          valign: 'top'
        });
      });
    }

    // Slide number
    const slideNum = this.slidesData.slides.findIndex(s => s === slide) + 1;
    insightsSlide.addText(String(slideNum).padStart(2, '0'), {
      x: 9.0,
      y: 5.0,
      w: 0.5,
      h: 0.3,
      fontSize: 14,
      color: colors.gray,
      align: 'right',
      fontFace: 'Arial'
    });
  }

  /**
   * Adds a simple text slide to the PowerPoint presentation
   * @private
   */
  _addSimpleSlideToPPTX(pptx, slide, colors) {
    const simpleSlide = pptx.addSlide();
    simpleSlide.background = { color: colors.background };

    // Title
    simpleSlide.addText(slide.title || 'Summary', {
      x: 0.5,
      y: 0.5,
      w: 9.0,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: colors.accent,
      fontFace: 'Arial'
    });

    // Content
    const content = Array.isArray(slide.content) ? slide.content.join('\n\n') : (slide.content || slide.text || '');
    simpleSlide.addText(content, {
      x: 0.5,
      y: 1.5,
      w: 9.0,
      h: 4.0,
      fontSize: 16,
      color: colors.lightText,
      align: 'left',
      fontFace: 'Arial',
      valign: 'top'
    });

    // Slide number
    const slideNum = this.slidesData.slides.findIndex(s => s === slide) + 1;
    simpleSlide.addText(String(slideNum).padStart(2, '0'), {
      x: 9.0,
      y: 5.0,
      w: 0.5,
      h: 0.3,
      fontSize: 14,
      color: colors.gray,
      align: 'right',
      fontFace: 'Arial'
    });
  }
}

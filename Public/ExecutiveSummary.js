/**
 * ExecutiveSummary Module
 * Renders AI-generated executive intelligence briefing
 * Provides strategic insights, drivers, risks, and key talking points
 */

import { CONFIG } from './config.js';

/**
 * ExecutiveSummary Class
 * Responsible for rendering and managing the executive summary component
 */
export class ExecutiveSummary {
  /**
   * Creates a new ExecutiveSummary instance
   * @param {Object} summaryData - The executive summary data from the API
   * @param {string} footerSVG - The SVG content for the header/footer decoration
   */
  constructor(summaryData, footerSVG) {
    this.summaryData = summaryData;
    this.footerSVG = footerSVG;
    this.isExpanded = true; // Default to expanded on load
    this.container = null;
  }

  /**
   * Renders the executive summary component
   * @returns {HTMLElement} The rendered executive summary container
   */
  render() {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'executive-summary-container';
    this.container.id = 'executiveSummary';

    // Check if summary data exists
    if (!this.summaryData) {
      this.container.innerHTML = '<p class="summary-unavailable">Executive summary not available for this chart.</p>';
      return this.container;
    }

    // Add header SVG stripe
    this._addHeaderSVG();

    // Build header
    const header = this._buildHeader();
    this.container.appendChild(header);

    // Build content
    const content = this._buildContent();
    this.container.appendChild(content);

    // Add footer SVG stripe
    this._addFooterSVG();

    return this.container;
  }

  /**
   * Builds the header section with title and toggle button
   * @private
   * @returns {HTMLElement} The header element
   */
  _buildHeader() {
    const header = document.createElement('div');
    header.className = 'summary-header';

    const title = document.createElement('h2');
    title.className = 'summary-title';
    title.innerHTML = '<span class="icon">📊</span> Strategic Intelligence Brief';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'expand-toggle';
    toggleBtn.setAttribute('aria-label', 'Toggle summary');
    toggleBtn.innerHTML = `<span class="chevron">${this.isExpanded ? '▼' : '▶'}</span>`;

    // Make entire header clickable
    header.addEventListener('click', () => this._toggleExpand());

    header.appendChild(title);
    header.appendChild(toggleBtn);

    return header;
  }

  /**
   * Builds the content section with all summary components
   * @private
   * @returns {HTMLElement} The content element
   */
  _buildContent() {
    const content = document.createElement('div');
    content.className = 'summary-content';
    content.style.display = this.isExpanded ? 'block' : 'none';

    // Strategic Narrative Card
    if (this.summaryData.strategicNarrative) {
      const narrativeCard = this._buildNarrativeCard();
      content.appendChild(narrativeCard);
    }

    // Intelligence Grid
    const intelligenceGrid = document.createElement('div');
    intelligenceGrid.className = 'intelligence-grid';

    // Drivers Section
    if (this.summaryData.drivers && this.summaryData.drivers.length > 0) {
      const driversCard = this._buildDriversCard();
      intelligenceGrid.appendChild(driversCard);
    }

    // Dependencies Section
    if (this.summaryData.dependencies && this.summaryData.dependencies.length > 0) {
      const dependenciesCard = this._buildDependenciesCard();
      intelligenceGrid.appendChild(dependenciesCard);
    }

    // Risks Section
    if (this.summaryData.risks && this.summaryData.risks.length > 0) {
      const risksCard = this._buildRisksCard();
      intelligenceGrid.appendChild(risksCard);
    }

    content.appendChild(intelligenceGrid);

    // Key Insights Section
    if (this.summaryData.keyInsights && this.summaryData.keyInsights.length > 0) {
      const insightsCard = this._buildInsightsCard();
      content.appendChild(insightsCard);
    }

    return content;
  }

  /**
   * Builds the strategic narrative card
   * @private
   * @returns {HTMLElement} The narrative card element
   */
  _buildNarrativeCard() {
    const card = document.createElement('div');
    card.className = 'narrative-card elevated';

    const badge = document.createElement('div');
    badge.className = 'card-badge';
    badge.textContent = 'EXECUTIVE OVERVIEW';

    const pitch = document.createElement('p');
    pitch.className = 'elevator-pitch';
    pitch.textContent = this.summaryData.strategicNarrative.elevatorPitch;

    const valueProposition = document.createElement('p');
    valueProposition.className = 'value-proposition';
    valueProposition.textContent = this.summaryData.strategicNarrative.valueProposition;

    card.appendChild(badge);
    card.appendChild(pitch);
    card.appendChild(valueProposition);

    // Add metadata if available
    if (this.summaryData.metadata) {
      const metricsRow = document.createElement('div');
      metricsRow.className = 'value-metrics';

      if (this.summaryData.metadata.confidenceLevel !== undefined) {
        const confidenceMetric = document.createElement('span');
        confidenceMetric.className = 'metric';
        confidenceMetric.textContent = `Confidence: ${this.summaryData.metadata.confidenceLevel}%`;
        metricsRow.appendChild(confidenceMetric);
      }

      if (this.summaryData.metadata.documentsCited !== undefined) {
        const docsMetric = document.createElement('span');
        docsMetric.className = 'metric';
        docsMetric.textContent = `Sources: ${this.summaryData.metadata.documentsCited}`;
        metricsRow.appendChild(docsMetric);
      }

      if (this.summaryData.metadata.analysisDepth) {
        const depthMetric = document.createElement('span');
        depthMetric.className = 'metric';
        depthMetric.textContent = `Analysis: ${this.summaryData.metadata.analysisDepth}`;
        metricsRow.appendChild(depthMetric);
      }

      card.appendChild(metricsRow);
    }

    return card;
  }

  /**
   * Builds the drivers card
   * @private
   * @returns {HTMLElement} The drivers card element
   */
  _buildDriversCard() {
    const card = document.createElement('div');
    card.className = 'intel-card drivers';

    const header = document.createElement('h3');
    header.innerHTML = '<span class="icon">🚀</span> Key Drivers';

    const driversList = document.createElement('ul');
    driversList.className = 'driver-list';

    this.summaryData.drivers.forEach(driver => {
      const driverItem = document.createElement('li');
      driverItem.className = `driver-item priority-${driver.urgencyLevel}`;

      const title = document.createElement('strong');
      title.textContent = driver.title;

      const description = document.createElement('p');
      description.textContent = driver.description;

      driverItem.appendChild(title);
      driverItem.appendChild(description);

      // Add metrics if available
      if (driver.metrics && driver.metrics.length > 0) {
        const metricsRow = document.createElement('div');
        metricsRow.className = 'metrics-row';

        driver.metrics.forEach(metric => {
          const metricChip = document.createElement('span');
          metricChip.className = 'metric-chip';
          metricChip.textContent = metric;
          metricsRow.appendChild(metricChip);
        });

        driverItem.appendChild(metricsRow);
      }

      driversList.appendChild(driverItem);
    });

    card.appendChild(header);
    card.appendChild(driversList);

    return card;
  }

  /**
   * Builds the dependencies card
   * @private
   * @returns {HTMLElement} The dependencies card element
   */
  _buildDependenciesCard() {
    const card = document.createElement('div');
    card.className = 'intel-card dependencies';

    const header = document.createElement('h3');
    header.innerHTML = '<span class="icon">🔗</span> Critical Dependencies';

    const dependencyTimeline = document.createElement('div');
    dependencyTimeline.className = 'dependency-timeline';

    this.summaryData.dependencies.forEach(dep => {
      const depNode = document.createElement('div');
      depNode.className = 'dependency-node';

      const criticalityIndicator = document.createElement('div');
      criticalityIndicator.className = `criticality-indicator level-${dep.criticality.toLowerCase()}`;

      const name = document.createElement('h4');
      name.textContent = dep.name;

      depNode.appendChild(criticalityIndicator);
      depNode.appendChild(name);

      // Add impacted phases if available
      if (dep.impactedPhases && dep.impactedPhases.length > 0) {
        const phasesText = document.createElement('p');
        phasesText.className = 'impacted-phases';
        phasesText.textContent = `Impacts: ${dep.impactedPhases.join(', ')}`;
        depNode.appendChild(phasesText);
      }

      // Add mitigation strategy if available
      if (dep.mitigationStrategy) {
        const mitigation = document.createElement('p');
        mitigation.className = 'mitigation-strategy';
        mitigation.textContent = `Mitigation: ${dep.mitigationStrategy}`;
        depNode.appendChild(mitigation);
      }

      dependencyTimeline.appendChild(depNode);
    });

    card.appendChild(header);
    card.appendChild(dependencyTimeline);

    return card;
  }

  /**
   * Builds the risks card
   * @private
   * @returns {HTMLElement} The risks card element
   */
  _buildRisksCard() {
    const card = document.createElement('div');
    card.className = 'intel-card risks';

    const header = document.createElement('h3');
    header.innerHTML = '<span class="icon">⚠️</span> Strategic Risks';

    const riskMatrix = document.createElement('div');
    riskMatrix.className = 'risk-matrix';

    this.summaryData.risks.forEach(risk => {
      const riskItem = document.createElement('div');
      riskItem.className = `risk-item ${risk.category}`;

      const riskHeader = document.createElement('div');
      riskHeader.className = 'risk-header';

      const probabilityBadge = document.createElement('span');
      probabilityBadge.className = `probability-badge probability-${risk.probability}`;
      probabilityBadge.textContent = risk.probability.toUpperCase();

      const impactBadge = document.createElement('span');
      impactBadge.className = `impact-badge impact-${risk.impact}`;
      impactBadge.textContent = risk.impact.toUpperCase();

      riskHeader.appendChild(probabilityBadge);
      riskHeader.appendChild(impactBadge);

      const description = document.createElement('p');
      description.className = 'risk-description';
      description.textContent = risk.description;

      riskItem.appendChild(riskHeader);
      riskItem.appendChild(description);

      // Add early indicators if available
      if (risk.earlyIndicators && risk.earlyIndicators.length > 0) {
        const details = document.createElement('details');
        details.className = 'early-warnings';

        const summary = document.createElement('summary');
        summary.textContent = 'Early Indicators';

        const indicatorsList = document.createElement('ul');
        risk.earlyIndicators.forEach(indicator => {
          const li = document.createElement('li');
          li.textContent = indicator;
          indicatorsList.appendChild(li);
        });

        details.appendChild(summary);
        details.appendChild(indicatorsList);
        riskItem.appendChild(details);
      }

      riskMatrix.appendChild(riskItem);
    });

    card.appendChild(header);
    card.appendChild(riskMatrix);

    return card;
  }

  /**
   * Builds the key insights card
   * @private
   * @returns {HTMLElement} The insights card element
   */
  _buildInsightsCard() {
    const card = document.createElement('div');
    card.className = 'intel-card insights full-width';

    const header = document.createElement('h3');
    header.innerHTML = '<span class="icon">💡</span> Expert Conversation Points';

    const insightsCarousel = document.createElement('div');
    insightsCarousel.className = 'insights-carousel';

    this.summaryData.keyInsights.forEach(insight => {
      const insightCard = document.createElement('div');
      insightCard.className = 'insight-card';

      const categoryTag = document.createElement('div');
      categoryTag.className = 'category-tag';
      categoryTag.textContent = insight.category;

      const insightText = document.createElement('blockquote');
      insightText.className = 'insight-text';
      insightText.textContent = insight.insight;

      insightCard.appendChild(categoryTag);
      insightCard.appendChild(insightText);

      // Add talking point if available
      if (insight.talkingPoint) {
        const talkingPoint = document.createElement('p');
        talkingPoint.className = 'talking-point';
        talkingPoint.innerHTML = `<strong>Use this when discussing:</strong> ${insight.talkingPoint}`;
        insightCard.appendChild(talkingPoint);
      }

      // Add supporting data if available
      if (insight.supportingData) {
        const supportingData = document.createElement('div');
        supportingData.className = 'supporting-data';
        supportingData.textContent = insight.supportingData;
        insightCard.appendChild(supportingData);
      }

      insightsCarousel.appendChild(insightCard);
    });

    card.appendChild(header);
    card.appendChild(insightsCarousel);

    return card;
  }

  /**
   * Toggles the expand/collapse state of the summary
   * @private
   */
  _toggleExpand() {
    this.isExpanded = !this.isExpanded;

    const content = this.container.querySelector('.summary-content');
    const chevron = this.container.querySelector('.chevron');

    if (content) {
      content.style.display = this.isExpanded ? 'block' : 'none';
    }

    if (chevron) {
      chevron.textContent = this.isExpanded ? '▼' : '▶';
    }
  }

  /**
   * Adds the header SVG decoration above the Executive Summary
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

    this.container.appendChild(footerSvgEl);
  }
}

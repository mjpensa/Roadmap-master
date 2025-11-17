/**
 * HamburgerMenu Module
 * Provides navigation between the three main sections of the presentation:
 * 1. Roadmap (Gantt Chart)
 * 2. Executive Summary
 * 3. Presentation Slides
 * Each section is displayed in a separate full-screen view
 */

/**
 * HamburgerMenu Class
 * Responsible for rendering and managing the hamburger menu navigation
 */
export class HamburgerMenu {
  /**
   * Creates a new HamburgerMenu instance
   */
  constructor() {
    this.isOpen = false;
    this.menuElement = null;
    this.currentSection = 'all'; // Track current section: 'all', 'roadmap', 'executive-summary', 'presentation'
  }

  /**
   * Renders the hamburger menu
   * @returns {HTMLElement} The hamburger menu element
   */
  render() {
    // Create main container
    const container = document.createElement('div');
    container.className = 'hamburger-menu-container';

    // Create hamburger icon button
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.className = 'hamburger-button';
    hamburgerBtn.setAttribute('aria-label', 'Navigation menu');
    hamburgerBtn.innerHTML = `
      <div class="hamburger-icon">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

    // Create navigation menu
    const navMenu = document.createElement('nav');
    navMenu.className = 'hamburger-nav';
    navMenu.innerHTML = `
      <ul class="hamburger-nav-list">
        <li>
          <a href="#" class="hamburger-nav-item" data-section="all">
            <span class="nav-icon">📑</span>
            <span class="nav-text">Show All</span>
          </a>
        </li>
        <li>
          <a href="#" class="hamburger-nav-item" data-section="roadmap">
            <span class="nav-icon">📊</span>
            <span class="nav-text">Roadmap</span>
          </a>
        </li>
        <li>
          <a href="#" class="hamburger-nav-item" data-section="executive-summary">
            <span class="nav-icon">📋</span>
            <span class="nav-text">Executive Summary</span>
          </a>
        </li>
        <li>
          <a href="#" class="hamburger-nav-item" data-section="presentation">
            <span class="nav-icon">🎯</span>
            <span class="nav-text">Presentation</span>
          </a>
        </li>
      </ul>
    `;

    // Add elements to container
    container.appendChild(hamburgerBtn);
    container.appendChild(navMenu);

    // Store reference to menu element
    this.menuElement = container;

    // Add event listeners
    this._attachEventListeners(hamburgerBtn, navMenu);

    return container;
  }

  /**
   * Attaches event listeners to the hamburger menu
   * @private
   */
  _attachEventListeners(hamburgerBtn, navMenu) {
    // Toggle menu on button click
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleMenu(hamburgerBtn, navMenu);
    });

    // Handle navigation clicks
    const navItems = navMenu.querySelectorAll('.hamburger-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.getAttribute('data-section');
        this._navigateToSection(section);
        this._closeMenu(hamburgerBtn, navMenu);

        // Update active state in menu
        navItems.forEach(navItem => navItem.classList.remove('active'));
        item.classList.add('active');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.menuElement.contains(e.target)) {
        this._closeMenu(hamburgerBtn, navMenu);
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this._closeMenu(hamburgerBtn, navMenu);
      }
    });
  }

  /**
   * Toggles the menu open/closed state
   * @private
   */
  _toggleMenu(hamburgerBtn, navMenu) {
    if (this.isOpen) {
      this._closeMenu(hamburgerBtn, navMenu);
    } else {
      this._openMenu(hamburgerBtn, navMenu);
    }
  }

  /**
   * Opens the navigation menu
   * @private
   */
  _openMenu(hamburgerBtn, navMenu) {
    this.isOpen = true;
    hamburgerBtn.classList.add('active');
    navMenu.classList.add('active');
  }

  /**
   * Closes the navigation menu
   * @private
   */
  _closeMenu(hamburgerBtn, navMenu) {
    this.isOpen = false;
    hamburgerBtn.classList.remove('active');
    navMenu.classList.remove('active');
  }

  /**
   * Navigates to the specified section by hiding all others
   * @private
   * @param {string} section - The section to navigate to ('all', 'roadmap', 'executive-summary', or 'presentation')
   */
  _navigateToSection(section) {
    this.currentSection = section;

    // Get all section elements
    const roadmapSection = document.querySelector('.roadmap-section');
    const executiveSummary = document.querySelector('.executive-summary-container');
    const presentationSlides = document.querySelector('.presentation-slides-container');
    const exportContainer = document.querySelector('.export-container');

    if (section === 'all') {
      // Show all sections
      if (roadmapSection) {
        roadmapSection.classList.remove('section-isolated');
        roadmapSection.style.display = '';
      }
      if (executiveSummary) {
        executiveSummary.classList.remove('section-isolated');
        executiveSummary.style.display = '';
        // Auto-expand if collapsed
        const content = executiveSummary.querySelector('.summary-content');
        if (content && content.style.display === 'none') {
          const header = executiveSummary.querySelector('.summary-header');
          header?.click();
        }
      }
      if (presentationSlides) {
        presentationSlides.classList.remove('section-isolated');
        presentationSlides.style.display = '';
        // Auto-expand if collapsed
        const content = presentationSlides.querySelector('.slides-content');
        if (content && content.style.display === 'none') {
          const header = presentationSlides.querySelector('.slides-header');
          header?.click();
        }
      }
      if (exportContainer) {
        exportContainer.style.display = '';
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } else {
      // Hide all sections first
      if (roadmapSection) roadmapSection.style.display = 'none';
      if (executiveSummary) executiveSummary.style.display = 'none';
      if (presentationSlides) presentationSlides.style.display = 'none';
      if (exportContainer) exportContainer.style.display = 'none';

      // Show only the selected section
      let targetElement = null;

      switch (section) {
        case 'roadmap':
          if (roadmapSection) {
            roadmapSection.style.display = '';
            roadmapSection.classList.add('section-isolated');
            targetElement = roadmapSection;
          }
          if (exportContainer) {
            exportContainer.style.display = '';
          }
          break;

        case 'executive-summary':
          if (executiveSummary) {
            executiveSummary.style.display = '';
            executiveSummary.classList.add('section-isolated');
            targetElement = executiveSummary;

            // Auto-expand if collapsed
            const content = executiveSummary.querySelector('.summary-content');
            if (content && content.style.display === 'none') {
              const header = executiveSummary.querySelector('.summary-header');
              header?.click();
            }
          }
          break;

        case 'presentation':
          if (presentationSlides) {
            presentationSlides.style.display = '';
            presentationSlides.classList.add('section-isolated');
            targetElement = presentationSlides;

            // Auto-expand if collapsed
            const content = presentationSlides.querySelector('.slides-content');
            if (content && content.style.display === 'none') {
              const header = presentationSlides.querySelector('.slides-header');
              header?.click();
            }
          }
          break;
      }

      // Scroll to top of page to show the isolated section
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Add a subtle flash effect
      if (targetElement) {
        targetElement.classList.add('section-activated');
        setTimeout(() => {
          targetElement.classList.remove('section-activated');
        }, 800);
      }
    }
  }

  /**
   * Gets the current active section
   * @returns {string} The current section identifier
   */
  getCurrentSection() {
    return this.currentSection;
  }
}

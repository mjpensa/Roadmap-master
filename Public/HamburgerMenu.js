/**
 * HamburgerMenu Module
 * Provides navigation between the three main sections of the presentation:
 * 1. Roadmap (Gantt Chart)
 * 2. Executive Summary
 * 3. Presentation Slides
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
   * Navigates to the specified section
   * @private
   * @param {string} section - The section to navigate to ('roadmap', 'executive-summary', or 'presentation')
   */
  _navigateToSection(section) {
    let targetElement = null;

    switch (section) {
      case 'roadmap':
        // Scroll to the top of the gantt chart
        targetElement = document.querySelector('#gantt-chart-container .gantt-grid');
        if (!targetElement) {
          targetElement = document.querySelector('#gantt-chart-container');
        }
        break;

      case 'executive-summary':
        // Find executive summary section
        targetElement = document.querySelector('.executive-summary-container');
        // If collapsed, expand it first
        if (targetElement) {
          const header = targetElement.querySelector('.summary-header');
          const content = targetElement.querySelector('.summary-content');
          if (content && content.style.display === 'none') {
            // Expand the section by clicking the header
            header?.click();
          }
        }
        break;

      case 'presentation':
        // Find presentation slides section
        targetElement = document.querySelector('.presentation-slides-container');
        // If collapsed, expand it first
        if (targetElement) {
          const header = targetElement.querySelector('.slides-header');
          const content = targetElement.querySelector('.slides-content');
          if (content && content.style.display === 'none') {
            // Expand the section by clicking the header
            header?.click();
          }
        }
        break;
    }

    // Scroll to the target element with smooth animation
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Add a highlight effect
      targetElement.classList.add('section-highlight');
      setTimeout(() => {
        targetElement.classList.remove('section-highlight');
      }, 1500);
    } else {
      console.warn(`Section "${section}" not found in the document`);
    }
  }
}

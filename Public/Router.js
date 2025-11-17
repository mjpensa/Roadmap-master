/**
 * Router - Handles hash-based navigation between different sections
 */
class Router {
    constructor() {
        this.routes = {
            'roadmap': () => this.showSection('roadmap'),
            'executive-summary': () => this.showSection('executive-summary'),
            'presentation': () => this.showSection('presentation')
        };
        this.currentRoute = null;
        this.ganttChart = null;
        this.executiveSummary = null;
        this.presentationSlides = null;
        this.hamburgerMenu = null;

        // Bind event handlers
        this.handleHashChange = this.handleHashChange.bind(this);
    }

    /**
     * Initialize the router with component references
     */
    init(ganttChart, executiveSummary, presentationSlides) {
        this.ganttChart = ganttChart;
        this.executiveSummary = executiveSummary;
        this.presentationSlides = presentationSlides;
        this.hamburgerMenu = ganttChart?.hamburgerMenu;

        // Listen for hash changes
        window.addEventListener('hashchange', this.handleHashChange);

        // Handle initial route
        this.handleHashChange();
    }

    /**
     * Handle hash changes in the URL
     */
    handleHashChange() {
        const hash = window.location.hash.slice(1); // Remove the '#'
        const route = hash || 'roadmap'; // Default to roadmap

        if (this.routes[route]) {
            this.routes[route]();
            this.currentRoute = route;
        } else {
            // Unknown route, redirect to roadmap
            this.navigate('roadmap');
        }
    }

    /**
     * Navigate to a specific route
     */
    navigate(route) {
        window.location.hash = route;
    }

    /**
     * Show a specific section and hide others
     */
    showSection(section) {
        // Update hamburger menu active item
        if (this.hamburgerMenu) {
            this.hamburgerMenu.updateActiveItem(section);
        }

        // Get container elements
        const chartContainer = this.ganttChart?.chartWrapper;
        const summaryContainer = this.executiveSummary?.container;
        const slidesContainer = this.presentationSlides?.container;

        // Also get the legend if it exists
        const legend = document.querySelector('.legend');
        const exportContainer = document.querySelector('.export-container');

        switch (section) {
            case 'roadmap':
                // Show only the Gantt chart
                if (chartContainer) {
                    chartContainer.style.display = '';
                    chartContainer.classList.add('section-isolated');
                }
                if (legend) {
                    legend.style.display = '';
                }
                if (exportContainer) {
                    exportContainer.style.display = '';
                }
                if (summaryContainer) {
                    summaryContainer.style.display = 'none';
                    summaryContainer.classList.remove('section-isolated');
                }
                if (slidesContainer) {
                    slidesContainer.style.display = 'none';
                    slidesContainer.classList.remove('section-isolated');
                }
                break;

            case 'executive-summary':
                // Show only the Executive Summary
                if (chartContainer) {
                    chartContainer.style.display = 'none';
                    chartContainer.classList.remove('section-isolated');
                }
                if (legend) {
                    legend.style.display = 'none';
                }
                if (exportContainer) {
                    exportContainer.style.display = 'none';
                }
                if (summaryContainer) {
                    summaryContainer.style.display = '';
                    summaryContainer.classList.add('section-isolated');
                    // Make sure it's expanded
                    if (this.executiveSummary && this.executiveSummary.collapsed) {
                        this.executiveSummary.toggle();
                    }
                }
                if (slidesContainer) {
                    slidesContainer.style.display = 'none';
                    slidesContainer.classList.remove('section-isolated');
                }
                break;

            case 'presentation':
                // Show only the Presentation Slides
                if (chartContainer) {
                    chartContainer.style.display = 'none';
                    chartContainer.classList.remove('section-isolated');
                }
                if (legend) {
                    legend.style.display = 'none';
                }
                if (exportContainer) {
                    exportContainer.style.display = 'none';
                }
                if (summaryContainer) {
                    summaryContainer.style.display = 'none';
                    summaryContainer.classList.remove('section-isolated');
                }
                if (slidesContainer) {
                    slidesContainer.style.display = '';
                    slidesContainer.classList.add('section-isolated');
                    // Make sure it's expanded
                    if (this.presentationSlides && this.presentationSlides.collapsed) {
                        this.presentationSlides.toggle();
                    }
                }
                break;

            default:
                console.warn(`Unknown section: ${section}`);
        }

        // Scroll to top when switching sections
        window.scrollTo(0, 0);
    }

    /**
     * Get the current route
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Cleanup
     */
    destroy() {
        window.removeEventListener('hashchange', this.handleHashChange);
    }
}

// Make Router available globally
window.Router = Router;

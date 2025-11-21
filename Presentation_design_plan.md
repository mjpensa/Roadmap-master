# Presentation Screen Design Plan
**AI Roadmap Generator - Presentation Module Redesign**

**Version:** 1.0
**Date:** 2025-11-21
**Status:** Design Planning Phase

---

## Executive Summary

This document outlines a comprehensive redesign of the presentation slide system for the AI Roadmap Generator. The redesign focuses on three primary goals:

1. **Modern Slide Viewer** - Ultra-modern, responsive viewer with optimal zoom/scaling for readability
2. **16:9 Aspect Ratio** - Industry-standard widescreen format for PowerPoint compatibility
3. **Template Library Architecture** - Modular, pre-built HTML/JavaScript-based slide template system

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Problem Statement](#problem-statement)
3. [Design Goals & Requirements](#design-goals--requirements)
4. [Proposed Architecture](#proposed-architecture)
5. [Ultra-Modern Slide Viewer Design](#ultra-modern-slide-viewer-design)
6. [16:9 Aspect Ratio Implementation](#169-aspect-ratio-implementation)
7. [Template Library Architecture](#template-library-architecture)
8. [PowerPoint Export (.pptx) Integration](#powerpoint-export-pptx-integration)
9. [Implementation Phases](#implementation-phases)
10. [Technical Specifications](#technical-specifications)
11. [Migration Strategy](#migration-strategy)
12. [Testing & Validation](#testing--validation)

---

## Current State Analysis

### Existing Architecture

**Files Involved:**
- `Public/PresentationSlides.js` (553 lines) - Main presentation component
- `Public/presentation.html` - Standalone presentation page (Swiper.js-based)
- `Public/presentation.css` (803 lines) - Dark mode presentation styles
- `Public/style.css` - Chart view styles (includes `.slide-viewer`, `.slide-display`)
- `server/prompts.js` - AI slide generation prompts and schemas

**Current Slide Viewer (in chart.html):**

```javascript
// Location: PresentationSlides.js:92-111
.slide-viewer {
  width: 100%;
  max-width: 100%;
}

.slide-display {
  min-height: 80vh;
  height: 80vh;
  background: #1A1A1A;
  border-radius: 8px;
  padding: 0;
}
```

**Current Slide Types (7 types):**
1. `title` - Title slide with main title, accent, subtitle
2. `narrative` - Strategic narrative with paragraphs
3. `drivers` - Key drivers (numbered list with green bullets)
4. `dependencies` - Critical dependencies (flow diagram)
5. `risks` - Risk matrix (3x3 grid)
6. `insights` - Expert insights (card grid)
7. `simple` - Generic text slide

**Current Rendering:**
- JavaScript-based rendering (no templates, all DOM manipulation)
- Swiper.js for standalone presentation.html (navigation, pagination, keyboard)
- Embedded viewer in chart.html (Previous/Next buttons only)

### Key Issues Identified

**1. Zoom/Scale Problems:**
- Slides load "very zoomed out" in browser
- Fixed 80vh height can cause content to be too small
- No responsive scaling based on viewport
- Content overflow not handled elegantly

**2. Aspect Ratio:**
- No explicit aspect ratio enforcement
- Slides adapt to container, not to standard presentation ratio
- Not optimized for PowerPoint export (16:9 standard)

**3. Template Architecture:**
- Hardcoded rendering logic in PresentationSlides.js
- No separation between template and data
- Adding new slide types requires modifying core component
- No reusable template library

**4. Export Capabilities:**
- PNG export only (html2canvas)
- No native PowerPoint (.pptx) export
- Loss of editability when exported

---

## Problem Statement

**User Pain Points:**

> "The slides currently load very zoomed out in my web browser currently."

**Business Requirements:**

1. **Readability** - Slides must be immediately readable without zooming
2. **Standard Format** - 16:9 aspect ratio for seamless PowerPoint integration
3. **Modularity** - Template library for easy customization and extension
4. **Export Quality** - Native .pptx export with editable slides

**Technical Constraints:**

- Must maintain backward compatibility with existing AI-generated slide data
- Must work in both standalone (presentation.html) and embedded (chart.html) modes
- Must support existing 7 slide types during transition
- Must integrate with existing AI prompts and schemas

---

## Design Goals & Requirements

### Primary Goals

**G1: Ultra-Modern Slide Viewer**
- Responsive viewport scaling with optimal zoom level
- 16:9 aspect ratio container with automatic letterboxing/pillarboxing
- Smooth animations and transitions
- Fullscreen mode support
- Thumbnail navigation

**G2: 16:9 Aspect Ratio**
- All slides rendered in 1920x1080 logical pixels
- Scalable to viewport while maintaining ratio
- PowerPoint-compatible dimensions

**G3: Template Library Architecture**
- Modular, reusable slide templates (HTML/JS)
- Data-driven rendering (template + JSON = slide)
- Easy to extend with new templates
- Version-controlled template library

**G4: PowerPoint Export**
- Native .pptx export using PptxGenJS (already in codebase)
- Editable slides post-export
- Preserve formatting, colors, fonts

### Non-Functional Requirements

**Performance:**
- Slide transitions < 300ms
- Viewer initialization < 1s
- Template loading on-demand (lazy loading)

**Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode

**Browser Compatibility:**
- Chrome/Edge (primary)
- Firefox, Safari (secondary)
- Mobile responsive (iPad Pro landscape optimal)

---

## Proposed Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Chart Viewer (chart.html)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              ModernSlideViewer Component              │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │           AspectRatioContainer (16:9)           │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │        TemplateRenderer                   │  │  │  │
│  │  │  │   ┌────────────────────────────────┐      │  │  │  │
│  │  │  │   │  SlideTemplateLibrary          │      │  │  │  │
│  │  │  │   │  - WhiteSimpleTemplate.js      │      │  │  │  │
│  │  │  │   │  - (Future: DarkTemplate.js)   │      │  │  │  │
│  │  │  │   │  - (Future: BIPTemplate.js)    │      │  │  │  │
│  │  │  │   └────────────────────────────────┘      │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │        ViewerControls Component               │  │  │
│  │  │  [Prev] [Thumbnails] [Fullscreen] [Next]       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              PowerPoint Export Module (.pptx)               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  PptxExporter (uses PptxGenJS library)                │  │
│  │  - Converts template data to PowerPoint objects       │  │
│  │  - Maintains 16:9 slide dimensions (10" x 5.625")     │  │
│  │  - Preserves fonts, colors, layouts                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**1. ModernSlideViewer** (New - replaces PresentationSlides.js)
- **Purpose:** Main orchestrator for slide presentation
- **Responsibilities:**
  - Viewport management and scaling
  - Navigation state management
  - Keyboard/touch event handling
  - Fullscreen API integration
  - Thumbnail generation and navigation

**2. AspectRatioContainer** (New)
- **Purpose:** Enforce 16:9 aspect ratio with responsive scaling
- **Responsibilities:**
  - Calculate optimal scale factor based on viewport
  - Apply CSS transforms for centering and scaling
  - Handle letterboxing/pillarboxing
  - Maintain 1920x1080 logical pixel canvas

**3. TemplateRenderer** (New)
- **Purpose:** Render slides using template library
- **Responsibilities:**
  - Load appropriate template based on slide type
  - Pass slide data to template
  - Handle template errors gracefully
  - Cache compiled templates

**4. SlideTemplateLibrary** (New directory structure)
- **Purpose:** Modular, pre-built slide templates
- **Structure:**
  ```
  Public/templates/
  ├── base/
  │   ├── BaseTemplate.js         # Abstract base class
  │   └── TemplateRegistry.js     # Template registration system
  ├── white-simple/               # PHASE 1: Placeholder templates
  │   ├── WhiteSimpleTitle.js
  │   ├── WhiteSimpleBullets.js
  │   ├── WhiteSimpleTwoColumn.js
  │   └── styles.css
  └── future/                     # PHASE 2+: Custom templates
      ├── dark-executive/
      ├── bip-branded/
      └── minimal-tech/
  ```

**5. PptxExporter** (New)
- **Purpose:** Export slides to PowerPoint format
- **Responsibilities:**
  - Convert slide data to PptxGenJS objects
  - Map template styles to PowerPoint shapes
  - Generate downloadable .pptx file
  - Preserve editability

---

## Ultra-Modern Slide Viewer Design

### Visual Design Mockup

```
┌────────────────────────────────────────────────────────────────┐
│  ☰ Menu    AI Roadmap - Presentation        🔍 Zoom  ⛶ Full   │ ← Header Bar
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │                                                          │ │ ← Letterbox
│  ├──────────────────────────────────────────────────────────┤ │   (if needed)
│  │                                                          │ │
│  │              ┌────────────────────────┐                 │ │
│  │              │                        │                 │ │
│  │              │   SLIDE CONTENT        │                 │ │ ← 16:9 Slide
│  │              │   (1920 x 1080)        │                 │ │   Canvas
│  │              │                        │                 │ │
│  │              └────────────────────────┘                 │ │
│  │                                                          │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │                                                          │ │ ← Letterbox
│  │                                                          │ │   (if needed)
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │ ← Thumbnail
│  │ 01 │ │ 02 │ │ 03 │ │ 04 │ │ 05 │ │ 06 │ │ 07 │ ...       │   Strip
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘           │   (Optional)
├────────────────────────────────────────────────────────────────┤
│        ◀ Previous   [Slide 3 / 7]   Next ▶    📥 Export       │ ← Footer
└────────────────────────────────────────────────────────────────┘
```

### Key Features

**1. Responsive Aspect Ratio Container**

```javascript
// AspectRatioContainer.js
export class AspectRatioContainer {
  constructor(containerElement) {
    this.container = containerElement;
    this.aspectRatio = 16 / 9;
    this.logicalWidth = 1920;
    this.logicalHeight = 1080;
    this.scale = 1;

    this._initializeContainer();
    this._attachResizeListener();
  }

  _initializeContainer() {
    // Create wrapper with aspect ratio enforcement
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'aspect-ratio-wrapper';

    // Create slide canvas (logical 1920x1080)
    this.canvas = document.createElement('div');
    this.canvas.className = 'slide-canvas';
    this.canvas.style.width = `${this.logicalWidth}px`;
    this.canvas.style.height = `${this.logicalHeight}px`;

    this.wrapper.appendChild(this.canvas);
    this.container.appendChild(this.wrapper);

    this._updateScale();
  }

  _updateScale() {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    // Calculate scale to fit container while maintaining aspect ratio
    const scaleWidth = containerWidth / this.logicalWidth;
    const scaleHeight = containerHeight / this.logicalHeight;
    this.scale = Math.min(scaleWidth, scaleHeight) * 0.9; // 90% for padding

    // Apply transform
    this.canvas.style.transform = `scale(${this.scale})`;
    this.canvas.style.transformOrigin = 'top left';

    // Center the canvas
    const scaledWidth = this.logicalWidth * this.scale;
    const scaledHeight = this.logicalHeight * this.scale;
    const offsetX = (containerWidth - scaledWidth) / 2;
    const offsetY = (containerHeight - scaledHeight) / 2;

    this.wrapper.style.padding = `${offsetY}px ${offsetX}px`;
  }

  _attachResizeListener() {
    const resizeObserver = new ResizeObserver(() => this._updateScale());
    resizeObserver.observe(this.container);
  }

  getCanvas() {
    return this.canvas;
  }
}
```

**CSS Styles:**

```css
/* Public/modern-slide-viewer.css */

.aspect-ratio-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a; /* Dark background for letterboxing */
  box-sizing: border-box;
}

.slide-canvas {
  background: white; /* Default slide background */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

/* Modern viewer container */
.modern-slide-viewer {
  width: 100%;
  height: 90vh; /* Taller viewport for better readability */
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0c2340 0%, #0d2748 100%);
  border-radius: 12px;
  overflow: hidden;
}

.viewer-main {
  flex: 1;
  position: relative;
  min-height: 0; /* Important for flex */
}

/* Viewer controls */
.viewer-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.viewer-controls button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.viewer-controls button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.viewer-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.slide-indicator {
  color: white;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
}

/* Fullscreen mode */
.modern-slide-viewer.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  border-radius: 0;
}

/* Thumbnail strip (optional, toggleable) */
.thumbnail-strip {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;
  scrollbar-width: thin;
}

.thumbnail-item {
  flex-shrink: 0;
  width: 120px;
  height: 68px; /* 16:9 ratio */
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  overflow: hidden;
  position: relative;
}

.thumbnail-item.active {
  border-color: #da291c;
  box-shadow: 0 0 12px rgba(218, 41, 28, 0.5);
}

.thumbnail-item:hover {
  transform: scale(1.05);
  border-color: rgba(218, 41, 28, 0.5);
}

.thumbnail-number {
  position: absolute;
  bottom: 4px;
  right: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

/* Smooth transitions */
.slide-canvas > * {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**2. Zoom Controls**

```javascript
// Feature: Zoom in/out while maintaining aspect ratio
zoomIn() {
  this.scale = Math.min(this.scale * 1.2, 2.0); // Max 200%
  this._applyScale();
}

zoomOut() {
  this.scale = Math.max(this.scale * 0.8, 0.5); // Min 50%
  this._applyScale();
}

resetZoom() {
  this._updateScale(); // Recalculate optimal scale
}
```

**3. Fullscreen Mode**

```javascript
// Feature: Native fullscreen API
toggleFullscreen() {
  if (!document.fullscreenElement) {
    this.container.requestFullscreen();
    this.container.classList.add('fullscreen');
  } else {
    document.exitFullscreen();
    this.container.classList.remove('fullscreen');
  }
}
```

---

## 16:9 Aspect Ratio Implementation

### Standard Dimensions

**Logical Resolution:** 1920 x 1080 pixels
**Aspect Ratio:** 16:9 (1.7778:1)
**PowerPoint Equivalent:** 10" x 5.625" slide size

### Benefits

1. **PowerPoint Compatibility** - Standard widescreen format
2. **Predictable Layout** - Fixed canvas for consistent design
3. **High Resolution** - Sharp text and graphics
4. **Industry Standard** - Matches projectors, displays, monitors

### Implementation Strategy

**Step 1: Define Logical Canvas**

All slides rendered on a 1920x1080 pixel canvas, regardless of actual screen size.

```javascript
// Constants
const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;
const ASPECT_RATIO = 16 / 9;
```

**Step 2: Responsive Scaling**

CSS `transform: scale()` to fit viewport while maintaining aspect ratio.

```css
.slide-canvas {
  width: 1920px;
  height: 1080px;
  transform-origin: top left;
  /* Scale applied dynamically via JavaScript */
}
```

**Step 3: Layout Grid System**

12-column grid system within 1920x1080 canvas:

```
Column width: 1920 / 12 = 160px
Gutter: 20px
Content width: 1880px (with 20px margins)
```

**Padding Standards:**
- Outer margins: 60px (top/bottom/left/right)
- Safe zone: 1800 x 960 (avoids edge clipping)
- Title area: Top 200px
- Content area: Middle 680px
- Footer area: Bottom 200px

### Template Grid Reference

```
┌────────────────────────────────────────────────────────────┐
│ 60px margin                                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ TITLE AREA (200px height)                            │ │
│  │                                                        │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │                                                        │ │
│  │ CONTENT AREA (680px height)                          │ │
│  │                                                        │ │
│  │  12-column grid (160px cols + 20px gutters)          │ │
│  │                                                        │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ FOOTER AREA (200px height)                           │ │
│  │ Slide number, logo, etc.                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                 60px margin│
└────────────────────────────────────────────────────────────┘
      1920px width (1800px content + 60px margins)
```

---

## Template Library Architecture

### Design Philosophy

**Separation of Concerns:**
- **Templates** = Presentation (HTML structure + CSS styles)
- **Data** = Content (JSON from AI or user input)
- **Renderer** = Logic (Template + Data → DOM)

**Modularity:**
- Each template is a self-contained ES6 class
- Templates register themselves in TemplateRegistry
- Easy to add new templates without modifying core code

**Data-Driven:**
- Templates receive slide data as JSON
- Templates are stateless (pure functions: data → HTML)
- Same data can be rendered by different templates (theming)

### Phase 1: White Simple Templates (Placeholder)

**Goal:** Minimal, clean white slides with simple bullets as placeholder until custom template library is ready.

**Templates to Create:**

**1. WhiteSimpleTitle.js** - Title slide

```javascript
// Public/templates/white-simple/WhiteSimpleTitle.js
import { BaseTemplate } from '../base/BaseTemplate.js';

export class WhiteSimpleTitle extends BaseTemplate {
  constructor() {
    super('white-simple-title');
  }

  render(data) {
    // data: { title: string, subtitle?: string }
    return `
      <div class="white-simple-title" style="
        width: 1920px;
        height: 1080px;
        background: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: 'Work Sans', Arial, sans-serif;
      ">
        <h1 style="
          font-size: 96px;
          font-weight: 700;
          color: #0c2340;
          margin: 0 0 40px 0;
          text-align: center;
          max-width: 1600px;
          line-height: 1.2;
        ">${this.escape(data.title)}</h1>

        ${data.subtitle ? `
          <p style="
            font-size: 48px;
            font-weight: 400;
            color: #666;
            margin: 0;
            text-align: center;
            max-width: 1400px;
          ">${this.escape(data.subtitle)}</p>
        ` : ''}
      </div>
    `;
  }
}
```

**2. WhiteSimpleBullets.js** - Bullet list slide

```javascript
// Public/templates/white-simple/WhiteSimpleBullets.js
import { BaseTemplate } from '../base/BaseTemplate.js';

export class WhiteSimpleBullets extends BaseTemplate {
  constructor() {
    super('white-simple-bullets');
  }

  render(data) {
    // data: { title: string, bullets: string[] }
    const bullets = data.bullets || [];

    return `
      <div class="white-simple-bullets" style="
        width: 1920px;
        height: 1080px;
        background: white;
        padding: 60px 120px;
        box-sizing: border-box;
        font-family: 'Work Sans', Arial, sans-serif;
      ">
        <h2 style="
          font-size: 72px;
          font-weight: 600;
          color: #0c2340;
          margin: 0 0 80px 0;
          border-bottom: 4px solid #0c2340;
          padding-bottom: 20px;
        ">${this.escape(data.title)}</h2>

        <ul style="
          list-style: none;
          margin: 0;
          padding: 0;
        ">
          ${bullets.map(bullet => `
            <li style="
              font-size: 48px;
              color: #333;
              margin-bottom: 40px;
              padding-left: 60px;
              position: relative;
              line-height: 1.4;
            ">
              <span style="
                position: absolute;
                left: 0;
                color: #0c2340;
                font-weight: 700;
              ">•</span>
              ${this.escape(bullet)}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
}
```

**3. WhiteSimpleTwoColumn.js** - Two-column layout

```javascript
// Public/templates/white-simple/WhiteSimpleTwoColumn.js
import { BaseTemplate } from '../base/BaseTemplate.js';

export class WhiteSimpleTwoColumn extends BaseTemplate {
  constructor() {
    super('white-simple-two-column');
  }

  render(data) {
    // data: { title: string, leftContent: string[], rightContent: string[] }
    return `
      <div class="white-simple-two-column" style="
        width: 1920px;
        height: 1080px;
        background: white;
        padding: 60px 120px;
        box-sizing: border-box;
        font-family: 'Work Sans', Arial, sans-serif;
      ">
        <h2 style="
          font-size: 72px;
          font-weight: 600;
          color: #0c2340;
          margin: 0 0 60px 0;
        ">${this.escape(data.title)}</h2>

        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          height: calc(100% - 200px);
        ">
          <div style="
            border-right: 2px solid #e0e0e0;
            padding-right: 60px;
          ">
            <ul style="list-style: none; margin: 0; padding: 0;">
              ${(data.leftContent || []).map(item => `
                <li style="
                  font-size: 36px;
                  color: #333;
                  margin-bottom: 24px;
                  padding-left: 40px;
                  position: relative;
                ">
                  <span style="position: absolute; left: 0; color: #0c2340;">•</span>
                  ${this.escape(item)}
                </li>
              `).join('')}
            </ul>
          </div>

          <div>
            <ul style="list-style: none; margin: 0; padding: 0;">
              ${(data.rightContent || []).map(item => `
                <li style="
                  font-size: 36px;
                  color: #333;
                  margin-bottom: 24px;
                  padding-left: 40px;
                  position: relative;
                ">
                  <span style="position: absolute; left: 0; color: #0c2340;">•</span>
                  ${this.escape(item)}
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}
```

### Base Template Class

```javascript
// Public/templates/base/BaseTemplate.js

export class BaseTemplate {
  constructor(templateId) {
    this.templateId = templateId;
  }

  /**
   * Render the template with given data
   * @param {Object} data - Slide data
   * @returns {string} HTML string
   */
  render(data) {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get template metadata
   * @returns {Object}
   */
  getMetadata() {
    return {
      id: this.templateId,
      name: this.constructor.name,
      supportsTypes: [] // Override in subclass
    };
  }
}
```

### Template Registry

```javascript
// Public/templates/base/TemplateRegistry.js

class TemplateRegistryClass {
  constructor() {
    this.templates = new Map();
    this.typeMapping = new Map(); // slideType → templateId
  }

  /**
   * Register a template
   * @param {BaseTemplate} template
   */
  register(template) {
    this.templates.set(template.templateId, template);
    console.log(`✓ Registered template: ${template.templateId}`);
  }

  /**
   * Map a slide type to a template
   * @param {string} slideType - e.g., 'title', 'bullets'
   * @param {string} templateId - e.g., 'white-simple-title'
   */
  mapType(slideType, templateId) {
    this.typeMapping.set(slideType, templateId);
  }

  /**
   * Get template by ID
   * @param {string} templateId
   * @returns {BaseTemplate|null}
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get template for a slide type
   * @param {string} slideType
   * @returns {BaseTemplate|null}
   */
  getTemplateForType(slideType) {
    const templateId = this.typeMapping.get(slideType);
    return templateId ? this.getTemplate(templateId) : null;
  }

  /**
   * Render a slide using appropriate template
   * @param {string} slideType
   * @param {Object} data
   * @returns {string} HTML
   */
  renderSlide(slideType, data) {
    const template = this.getTemplateForType(slideType);
    if (!template) {
      console.error(`No template found for slide type: ${slideType}`);
      return this._renderFallback(data);
    }

    return template.render(data);
  }

  /**
   * Fallback renderer for unknown types
   * @private
   */
  _renderFallback(data) {
    return `
      <div style="
        width: 1920px; height: 1080px; background: white;
        display: flex; align-items: center; justify-content: center;
        font-family: Arial, sans-serif;
      ">
        <p style="font-size: 48px; color: #666;">
          Template not found
        </p>
      </div>
    `;
  }
}

// Singleton instance
export const TemplateRegistry = new TemplateRegistryClass();
```

### Template Initialization

```javascript
// Public/templates/init.js
// This file imports and registers all templates

import { TemplateRegistry } from './base/TemplateRegistry.js';
import { WhiteSimpleTitle } from './white-simple/WhiteSimpleTitle.js';
import { WhiteSimpleBullets } from './white-simple/WhiteSimpleBullets.js';
import { WhiteSimpleTwoColumn } from './white-simple/WhiteSimpleTwoColumn.js';

// Register Phase 1 templates
TemplateRegistry.register(new WhiteSimpleTitle());
TemplateRegistry.register(new WhiteSimpleBullets());
TemplateRegistry.register(new WhiteSimpleTwoColumn());

// Map slide types to templates
TemplateRegistry.mapType('title', 'white-simple-title');
TemplateRegistry.mapType('simple', 'white-simple-bullets');
TemplateRegistry.mapType('narrative', 'white-simple-bullets'); // Temporary
TemplateRegistry.mapType('drivers', 'white-simple-bullets'); // Temporary
TemplateRegistry.mapType('two-column', 'white-simple-two-column');

console.log('✓ Template library initialized');
```

### Data Adapter for Existing Slides

To maintain backward compatibility with existing AI-generated slides (7 types), we need an adapter:

```javascript
// Public/templates/LegacySlideAdapter.js

export class LegacySlideAdapter {
  /**
   * Convert legacy slide data to white-simple template format
   * @param {Object} slide - Legacy slide object
   * @returns {Object} Adapted slide data
   */
  static adapt(slide) {
    switch (slide.type) {
      case 'title':
        return {
          type: 'title',
          title: slide.title,
          subtitle: slide.subtitle
        };

      case 'narrative':
        // Convert paragraphs to bullets
        return {
          type: 'simple',
          title: slide.title || 'Strategic Narrative',
          bullets: Array.isArray(slide.content) ? slide.content : [slide.content]
        };

      case 'drivers':
        // Convert drivers to bullets
        return {
          type: 'simple',
          title: slide.title || 'Key Drivers',
          bullets: (slide.drivers || []).map(d => `${d.title}: ${d.description}`)
        };

      case 'dependencies':
        // Convert dependencies to bullets
        return {
          type: 'simple',
          title: slide.title || 'Dependencies',
          bullets: (slide.dependencies || []).map(d =>
            `[${d.criticality}] ${d.name}: ${d.impact}`
          )
        };

      case 'risks':
        // Convert risks to bullets
        return {
          type: 'simple',
          title: slide.title || 'Risks',
          bullets: (slide.risks || []).map(r =>
            `[P:${r.probability} I:${r.impact}] ${r.description}`
          )
        };

      case 'insights':
        // Convert insights to bullets
        return {
          type: 'simple',
          title: slide.title || 'Insights',
          bullets: (slide.insights || []).map(i => `${i.category}: ${i.text}`)
        };

      case 'simple':
      default:
        return {
          type: 'simple',
          title: slide.title,
          bullets: Array.isArray(slide.content) ? slide.content : [slide.content]
        };
    }
  }
}
```

---

## PowerPoint Export (.pptx) Integration

### PptxGenJS Integration

**Library:** PptxGenJS 4.0.1 (already in codebase - chart.html:16-21)

**Capabilities:**
- Create PowerPoint presentations programmatically
- 16:9 slide layout support
- Text, shapes, images, tables
- Custom fonts and colors
- Editable output (.pptx format)

### Exporter Architecture

```javascript
// Public/PptxExporter.js

import { TemplateRegistry } from './templates/base/TemplateRegistry.js';
import { LegacySlideAdapter } from './templates/LegacySlideAdapter.js';

export class PptxExporter {
  constructor() {
    // PptxGenJS is loaded via CDN (global: pptxgen)
    if (typeof pptxgen === 'undefined') {
      throw new Error('PptxGenJS library not loaded');
    }
  }

  /**
   * Export slides to PowerPoint
   * @param {Array} slides - Array of slide objects
   * @param {string} filename - Output filename (without extension)
   * @returns {Promise<void>}
   */
  async exportToPptx(slides, filename = 'presentation') {
    const pptx = new pptxgen();

    // Set presentation properties
    pptx.layout = 'LAYOUT_16x9'; // 10" x 5.625"
    pptx.author = 'AI Roadmap Generator';
    pptx.title = filename;

    // Convert each slide
    for (let i = 0; i < slides.length; i++) {
      const slideData = slides[i];
      await this._convertSlide(pptx, slideData, i + 1);
    }

    // Generate and download
    await pptx.writeFile({ fileName: `${filename}.pptx` });
    console.log(`✓ Exported ${slides.length} slides to ${filename}.pptx`);
  }

  /**
   * Convert a single slide to PowerPoint format
   * @private
   */
  async _convertSlide(pptx, slideData, slideNumber) {
    const slide = pptx.addSlide();

    // Adapt legacy slides to simple format
    const adapted = LegacySlideAdapter.adapt(slideData);

    // Set background
    slide.background = { color: 'FFFFFF' }; // White

    // Render based on type
    switch (adapted.type) {
      case 'title':
        this._renderTitleSlide(slide, adapted);
        break;

      case 'simple':
        this._renderBulletsSlide(slide, adapted);
        break;

      case 'two-column':
        this._renderTwoColumnSlide(slide, adapted);
        break;

      default:
        this._renderBulletsSlide(slide, adapted);
    }

    // Add slide number
    slide.addText(String(slideNumber).padStart(2, '0'), {
      x: 9.2,
      y: 5.0,
      w: 0.6,
      h: 0.3,
      fontSize: 12,
      color: '999999',
      align: 'right'
    });
  }

  /**
   * Render title slide in PowerPoint
   * @private
   */
  _renderTitleSlide(slide, data) {
    // Title
    slide.addText(data.title, {
      x: 0.5,
      y: 2.0,
      w: 9.0,
      h: 1.0,
      fontSize: 48,
      bold: true,
      color: '0c2340',
      align: 'center',
      valign: 'middle'
    });

    // Subtitle (if exists)
    if (data.subtitle) {
      slide.addText(data.subtitle, {
        x: 0.5,
        y: 3.2,
        w: 9.0,
        h: 0.6,
        fontSize: 24,
        color: '666666',
        align: 'center',
        valign: 'middle'
      });
    }
  }

  /**
   * Render bullets slide in PowerPoint
   * @private
   */
  _renderBulletsSlide(slide, data) {
    // Title
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9.0,
      h: 0.6,
      fontSize: 36,
      bold: true,
      color: '0c2340'
    });

    // Title underline
    slide.addShape('rect', {
      x: 0.5,
      y: 1.0,
      w: 9.0,
      h: 0.03,
      fill: { color: '0c2340' }
    });

    // Bullets (max 5-6 for readability)
    const bullets = data.bullets.slice(0, 6);
    const bulletYStart = 1.4;
    const bulletSpacing = 0.6;

    bullets.forEach((bullet, idx) => {
      slide.addText(`• ${bullet}`, {
        x: 0.8,
        y: bulletYStart + (idx * bulletSpacing),
        w: 8.4,
        h: 0.5,
        fontSize: 20,
        color: '333333',
        bullet: false // We add bullet manually
      });
    });
  }

  /**
   * Render two-column slide in PowerPoint
   * @private
   */
  _renderTwoColumnSlide(slide, data) {
    // Title
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9.0,
      h: 0.6,
      fontSize: 36,
      bold: true,
      color: '0c2340'
    });

    // Left column
    const leftBullets = (data.leftContent || []).slice(0, 5);
    leftBullets.forEach((bullet, idx) => {
      slide.addText(`• ${bullet}`, {
        x: 0.5,
        y: 1.2 + (idx * 0.5),
        w: 4.2,
        h: 0.4,
        fontSize: 18,
        color: '333333'
      });
    });

    // Divider line
    slide.addShape('line', {
      x: 5.0,
      y: 1.0,
      w: 0,
      h: 4.0,
      line: { color: 'e0e0e0', width: 2 }
    });

    // Right column
    const rightBullets = (data.rightContent || []).slice(0, 5);
    rightBullets.forEach((bullet, idx) => {
      slide.addText(`• ${bullet}`, {
        x: 5.3,
        y: 1.2 + (idx * 0.5),
        w: 4.2,
        h: 0.4,
        fontSize: 18,
        color: '333333'
      });
    });
  }
}
```

### Export Button Integration

```javascript
// In ModernSlideViewer.js

exportToPowerPoint() {
  const exporter = new PptxExporter();
  const filename = this.slidesData.title || 'presentation';

  // Show loading indicator
  this._showExportProgress('Generating PowerPoint...');

  exporter.exportToPptx(this.slidesData.slides, filename)
    .then(() => {
      this._hideExportProgress();
      this._showSuccessMessage('PowerPoint exported successfully!');
    })
    .catch(error => {
      console.error('PowerPoint export failed:', error);
      this._hideExportProgress();
      this._showErrorMessage('Export failed. Please try again.');
    });
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goals:**
- Modern slide viewer with 16:9 aspect ratio
- White simple template library (3 templates)
- Legacy slide adapter for backward compatibility

**Deliverables:**
1. `ModernSlideViewer.js` - New viewer component
2. `AspectRatioContainer.js` - 16:9 container with scaling
3. `modern-slide-viewer.css` - Modern viewer styles
4. `templates/base/BaseTemplate.js` - Abstract base class
5. `templates/base/TemplateRegistry.js` - Template registration system
6. `templates/white-simple/` - 3 white templates (title, bullets, two-column)
7. `templates/init.js` - Template initialization
8. `templates/LegacySlideAdapter.js` - Backward compatibility adapter

**Tasks:**
- [ ] Create new directory structure: `Public/templates/`
- [ ] Implement AspectRatioContainer with responsive scaling
- [ ] Build ModernSlideViewer component (replace PresentationSlides.js)
- [ ] Design and implement 3 white simple templates
- [ ] Create template registry and base class
- [ ] Build legacy slide adapter
- [ ] Update chart-renderer.js to use ModernSlideViewer
- [ ] Test with existing AI-generated slides
- [ ] Verify 16:9 aspect ratio on multiple screen sizes

**Success Criteria:**
- ✅ Slides display at readable size (not zoomed out)
- ✅ 16:9 aspect ratio maintained on all viewports
- ✅ All existing slides render in white simple format
- ✅ No regressions in navigation or functionality

### Phase 2: PowerPoint Export (Week 3)

**Goals:**
- Fully functional .pptx export with editable slides
- Export button in viewer controls

**Deliverables:**
1. `PptxExporter.js` - PowerPoint export module
2. Export button UI in viewer controls
3. Progress/success/error feedback for export

**Tasks:**
- [ ] Implement PptxExporter class
- [ ] Map template data to PowerPoint objects
- [ ] Add export button to viewer controls
- [ ] Implement loading/success/error states
- [ ] Test exported .pptx files in PowerPoint/Google Slides
- [ ] Verify editability of exported slides

**Success Criteria:**
- ✅ Export button generates valid .pptx file
- ✅ Exported slides are editable in PowerPoint
- ✅ Formatting (fonts, colors, layout) preserved
- ✅ 16:9 aspect ratio correct in PowerPoint

### Phase 3: Enhanced Viewer Features (Week 4)

**Goals:**
- Fullscreen mode
- Thumbnail navigation
- Zoom controls
- Keyboard shortcuts

**Deliverables:**
1. Fullscreen mode with ESC to exit
2. Thumbnail strip (toggleable)
3. Zoom in/out/reset controls
4. Keyboard shortcuts (arrow keys, F for fullscreen, etc.)

**Tasks:**
- [ ] Implement fullscreen API integration
- [ ] Build thumbnail strip component
- [ ] Add zoom controls (in/out/reset)
- [ ] Implement keyboard shortcut handler
- [ ] Add accessibility features (ARIA labels, focus management)
- [ ] Mobile touch gesture support

**Success Criteria:**
- ✅ Fullscreen mode works across browsers
- ✅ Thumbnails load and navigate correctly
- ✅ Zoom controls functional with smooth scaling
- ✅ All keyboard shortcuts documented and working

### Phase 4: Custom Template Library (Future)

**Goals:**
- Professional template library (beyond white simple)
- Template switcher/selector
- Custom branding support

**Deliverables:**
1. Dark executive template theme
2. BIP-branded template theme
3. Minimal tech template theme
4. Template selector UI

**Tasks:**
- [ ] Design dark executive templates (matching current presentation.css)
- [ ] Design BIP-branded templates (using existing BIP assets)
- [ ] Design minimal tech templates
- [ ] Build template selector UI
- [ ] Allow users to switch templates for entire deck
- [ ] Update AI prompts to support new template types

**Success Criteria:**
- ✅ At least 3 template themes available
- ✅ Users can switch themes with one click
- ✅ All slide types supported in each theme
- ✅ Custom branding (logos, colors) configurable

### Phase 5: AI Prompt Updates (Future)

**Goals:**
- Update AI prompts to generate slide data optimized for new templates
- Support new slide types (e.g., image slides, quote slides, comparison slides)

**Deliverables:**
1. Updated `server/prompts.js` with new slide type instructions
2. New JSON schemas for additional slide types
3. Migration script for old slide data

**Tasks:**
- [ ] Analyze new template capabilities
- [ ] Update PRESENTATION_OUTLINE_PROMPT
- [ ] Update PRESENTATION_CONTENT_PROMPT
- [ ] Add new slide type schemas
- [ ] Test AI generation with new prompts
- [ ] Create migration script for existing charts

**Success Criteria:**
- ✅ AI generates slides optimized for new templates
- ✅ New slide types (image, quote, comparison) supported
- ✅ Backward compatibility maintained

---

## Technical Specifications

### File Structure

```
Public/
├── ModernSlideViewer.js          # NEW - Main viewer component
├── AspectRatioContainer.js       # NEW - 16:9 container
├── PptxExporter.js               # NEW - PowerPoint export
├── modern-slide-viewer.css       # NEW - Viewer styles
│
├── templates/                     # NEW - Template library
│   ├── base/
│   │   ├── BaseTemplate.js
│   │   └── TemplateRegistry.js
│   ├── white-simple/
│   │   ├── WhiteSimpleTitle.js
│   │   ├── WhiteSimpleBullets.js
│   │   ├── WhiteSimpleTwoColumn.js
│   │   └── styles.css
│   ├── LegacySlideAdapter.js
│   └── init.js
│
├── PresentationSlides.js         # DEPRECATED (kept for reference)
├── presentation.html             # UPDATE (use ModernSlideViewer)
├── presentation.css              # KEEP (for standalone mode)
└── ...
```

### API Contracts

**ModernSlideViewer Constructor:**

```javascript
new ModernSlideViewer(containerId, slidesData, options)
```

**Parameters:**
- `containerId` (string) - DOM element ID for viewer
- `slidesData` (Object) - Slide data from API
  ```javascript
  {
    title: string,
    slides: [
      { type: string, title: string, ... }
    ]
  }
  ```
- `options` (Object) - Optional configuration
  ```javascript
  {
    theme: 'white-simple' | 'dark-executive' | 'bip-branded',
    showThumbnails: boolean,
    enableFullscreen: boolean,
    enableKeyboard: boolean
  }
  ```

**TemplateRegistry Methods:**

```javascript
TemplateRegistry.register(template)         // Register new template
TemplateRegistry.mapType(type, templateId) // Map slide type to template
TemplateRegistry.renderSlide(type, data)   // Render slide HTML
TemplateRegistry.getTemplate(templateId)   // Get template instance
```

**PptxExporter Methods:**

```javascript
exporter.exportToPptx(slides, filename)    // Export to PowerPoint
```

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Viewer initialization | < 1s | Time from DOMContentLoaded to first slide visible |
| Slide transition | < 300ms | Time between slide change and render complete |
| Template loading | < 100ms | Time to load and parse template |
| Thumbnail generation | < 50ms per slide | Time to generate thumbnail |
| PowerPoint export | < 5s for 10 slides | Time to generate .pptx file |
| Zoom animation | 60 fps | Frame rate during scale transform |

### Browser Compatibility

**Supported Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iPad Pro)

**Fallbacks:**
- No Fullscreen API → Hide fullscreen button
- No ResizeObserver → Use window resize event
- No CSS Grid → Flexbox fallback

### Accessibility Standards

**WCAG 2.1 AA Compliance:**
- ✅ Color contrast ratio > 4.5:1 for text
- ✅ Keyboard navigation for all controls
- ✅ ARIA labels for interactive elements
- ✅ Focus indicators visible
- ✅ Screen reader compatible
- ✅ Skip navigation link

**Keyboard Shortcuts:**
- `→` / `Space` - Next slide
- `←` - Previous slide
- `Home` - First slide
- `End` - Last slide
- `F` - Toggle fullscreen
- `T` - Toggle thumbnails
- `ESC` - Exit fullscreen
- `+` / `=` - Zoom in
- `-` / `_` - Zoom out
- `0` - Reset zoom

---

## Migration Strategy

### Backward Compatibility

**Goal:** Ensure existing AI-generated slides continue to work without modification.

**Strategy:**

1. **LegacySlideAdapter** - Automatically convert old slide format to new template format
2. **Dual Mode** - Keep old PresentationSlides.js available via feature flag
3. **Data Validation** - Detect old vs. new slide data format automatically

**Feature Flag:**

```javascript
// config.js
CONFIG.FEATURES = {
  USE_MODERN_VIEWER: true, // Set to false to use legacy viewer
};
```

**Automatic Detection:**

```javascript
// chart-renderer.js
import { CONFIG } from './config.js';
import { ModernSlideViewer } from './ModernSlideViewer.js';
import { PresentationSlides } from './PresentationSlides.js'; // Legacy

function renderPresentationSlides(slidesData) {
  if (CONFIG.FEATURES.USE_MODERN_VIEWER) {
    return new ModernSlideViewer('presentationSlides', slidesData, {
      theme: 'white-simple'
    });
  } else {
    return new PresentationSlides(slidesData, footerSVG);
  }
}
```

### Data Migration

**No database migration needed** - LegacySlideAdapter handles conversion on-the-fly.

**For new charts:** AI can continue generating same slide format; adapter converts to white simple format until AI prompts are updated.

### Rollout Plan

**Week 1-2 (Phase 1):**
- Deploy modern viewer behind feature flag (disabled by default)
- Internal testing with existing charts
- Bug fixes and refinements

**Week 3 (Phase 2):**
- Enable feature flag for beta users
- Collect feedback on readability and UX
- Add PowerPoint export feature

**Week 4 (Phase 3):**
- Enable feature flag for all users
- Monitor performance metrics
- Deprecation notice for old viewer

**Week 5+ (Future):**
- Complete migration to modern viewer
- Remove legacy PresentationSlides.js
- Update AI prompts for optimized generation

---

## Testing & Validation

### Unit Tests

**Test Coverage Targets:**
- AspectRatioContainer: 90%
- ModernSlideViewer: 85%
- TemplateRegistry: 95%
- PptxExporter: 80%
- LegacySlideAdapter: 100% (critical for compatibility)

**Test Cases:**

```javascript
// __tests__/unit/ModernSlideViewer.test.js
describe('ModernSlideViewer', () => {
  it('should maintain 16:9 aspect ratio on resize', () => {
    // Test aspect ratio calculation
  });

  it('should scale slides to fit viewport', () => {
    // Test scaling logic
  });

  it('should navigate between slides', () => {
    // Test prev/next functionality
  });

  it('should enter fullscreen mode', () => {
    // Test fullscreen API
  });
});

// __tests__/unit/LegacySlideAdapter.test.js
describe('LegacySlideAdapter', () => {
  it('should convert title slides', () => {
    const legacy = { type: 'title', title: 'Test', subtitle: 'Sub' };
    const adapted = LegacySlideAdapter.adapt(legacy);
    expect(adapted.type).toBe('title');
    expect(adapted.title).toBe('Test');
  });

  it('should convert narrative slides to bullets', () => {
    const legacy = {
      type: 'narrative',
      title: 'Story',
      content: ['Para 1', 'Para 2']
    };
    const adapted = LegacySlideAdapter.adapt(legacy);
    expect(adapted.type).toBe('simple');
    expect(adapted.bullets).toHaveLength(2);
  });

  // Test all 7 slide types...
});
```

### Integration Tests

**Test Scenarios:**

1. **Full Presentation Flow**
   - Load chart with slides
   - Navigate all slides
   - Export to PowerPoint
   - Verify .pptx file validity

2. **Responsive Behavior**
   - Test on mobile (320px width)
   - Test on tablet (768px width)
   - Test on desktop (1920px width)
   - Test on ultra-wide (3440px width)

3. **Browser Compatibility**
   - Chrome, Firefox, Safari, Edge
   - Test fullscreen, zoom, keyboard shortcuts

4. **Performance**
   - Load 50-slide presentation
   - Measure transition times
   - Measure export time
   - Memory usage profiling

### Manual Testing Checklist

**Visual QA:**
- [ ] Slides are readable without manual zoom
- [ ] 16:9 aspect ratio visible and correct
- [ ] No content overflow or clipping
- [ ] Smooth transitions between slides
- [ ] Thumbnail strip displays correctly
- [ ] Fullscreen mode works (ESC exits)
- [ ] Export button generates valid .pptx
- [ ] Exported slides editable in PowerPoint

**Accessibility QA:**
- [ ] Tab navigation works (all controls reachable)
- [ ] Screen reader announces slide changes
- [ ] Focus indicators visible
- [ ] Keyboard shortcuts functional
- [ ] High contrast mode readable

**Cross-Browser QA:**
- [ ] Chrome (Windows/Mac/Linux)
- [ ] Firefox (Windows/Mac/Linux)
- [ ] Safari (Mac/iPad)
- [ ] Edge (Windows)

### Acceptance Criteria

**Phase 1 Completion:**
- ✅ Modern viewer deployed behind feature flag
- ✅ 16:9 aspect ratio enforced
- ✅ Slides readable (not zoomed out)
- ✅ All existing slides render in white simple format
- ✅ No regressions in navigation

**Phase 2 Completion:**
- ✅ PowerPoint export functional
- ✅ Exported .pptx files editable
- ✅ Export button visible and accessible

**Phase 3 Completion:**
- ✅ Fullscreen mode works
- ✅ Thumbnail navigation functional
- ✅ Zoom controls operational
- ✅ Keyboard shortcuts documented

**Full Rollout Criteria:**
- ✅ All acceptance criteria met
- ✅ No critical bugs in production
- ✅ Performance targets achieved
- ✅ Accessibility audit passed
- ✅ User feedback positive (>80% satisfaction)

---

## Appendix

### A. Color Palette (White Simple Theme)

```
Background:      #FFFFFF (white)
Primary Text:    #0c2340 (dark blue)
Secondary Text:  #333333 (dark gray)
Muted Text:      #666666 (medium gray)
Accent:          #0c2340 (dark blue)
Dividers:        #e0e0e0 (light gray)
```

### B. Typography Standards

```
Font Family:     'Work Sans', Arial, sans-serif

Title Slide:
- Main Title:    96px, bold (weight 700)
- Subtitle:      48px, regular (weight 400)

Content Slides:
- Slide Title:   72px, semi-bold (weight 600)
- Bullets:       48px, regular (weight 400)
- Body Text:     36px, regular (weight 400)
- Slide Number:  24px, regular (weight 400)
```

### C. Spacing Standards (16:9 Canvas)

```
Outer Margins:   60px (all sides)
Content Width:   1800px (1920 - 120px)
Content Height:  960px (1080 - 120px)

Title Area:      200px height
Content Area:    680px height
Footer Area:     200px height

Grid Columns:    12 columns
Column Width:    160px
Gutter:          20px
```

### D. Animation Timings

```
Slide Transition:       300ms ease-out
Zoom Animation:         250ms ease-in-out
Thumbnail Hover:        200ms ease
Fullscreen Transition:  400ms ease-in-out
Button Hover:           150ms ease
```

### E. References

**Standards:**
- PowerPoint Standard Sizes: https://support.microsoft.com/en-us/office/change-the-size-of-your-slides-040a811c-be43-40b9-8d04-0de5ed79987e
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Fullscreen API: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API

**Libraries:**
- PptxGenJS Documentation: https://gitbrent.github.io/PptxGenJS/
- ResizeObserver API: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-21 | AI Assistant | Initial design plan created |

---

**End of Document**

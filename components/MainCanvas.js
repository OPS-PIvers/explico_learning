/**
 * MainCanvas Component for Explico Learning
 * Main preview area for slide content and hotspot visualization
 */

class MainCanvas {
  
  constructor(options = {}) {
    this.options = {
      backgroundUrl: '',
      backgroundType: MEDIA_TYPES.IMAGE,
      allowHotspotCreation: true,
      allowHotspotEditing: true,
      showGrid: false,
      showRulers: false,
      zoom: 1,
      pan: { x: 0, y: 0 },
      onHotspotCreate: null,
      onBackgroundClick: null,
      onCanvasResize: null,
      ...options
    };
    
    this.element = null;
    this.backgroundElement = null;
    this.hotspotRenderer = new HotspotRenderer();
    this.isCreatingHotspot = false;
    this.resizeObserver = null;
  }
  
  /**
   * Create and return the canvas element
   * @returns {HTMLElement} Canvas element
   */
  render() {
    this.element = document.createElement('section');
    this.element.className = 'main-canvas flex-1 flex flex-col items-center justify-center bg-[#1f2937] rounded-lg overflow-hidden relative';
    this.element.id = 'main-canvas';
    
    // Background container
    const backgroundContainer = this.createBackgroundContainer();
    this.element.appendChild(backgroundContainer);
    
    // Overlay elements (grid, rulers, etc.)
    if (this.options.showGrid) {
      const grid = this.createGrid();
      this.element.appendChild(grid);
    }
    
    if (this.options.showRulers) {
      const rulers = this.createRulers();
      this.element.appendChild(rulers);
    }
    
    // Setup hotspot renderer
    this.setupHotspotRenderer();
    
    // Setup resize observer
    this.setupResizeObserver();
    
    // Event listeners
    this.attachEventListeners();
    
    return this.element;
  }
  
  /**
   * Create background container
   * @returns {HTMLElement} Background container element
   */
  createBackgroundContainer() {
    const container = document.createElement('div');
    container.className = 'background-container w-full h-full relative';
    container.id = 'background-container';
    
    this.backgroundElement = this.createBackgroundElement();
    container.appendChild(this.backgroundElement);
    
    return container;
  }
  
  /**
   * Create background element based on type
   * @returns {HTMLElement} Background element
   */
  createBackgroundElement() {
    let element;
    
    switch (this.options.backgroundType) {
      case MEDIA_TYPES.VIDEO:
        element = this.createVideoBackground();
        break;
      case MEDIA_TYPES.YOUTUBE:
        element = this.createYouTubeBackground();
        break;
      case MEDIA_TYPES.IMAGE:
      default:
        element = this.createImageBackground();
        break;
    }
    
    // Apply zoom and pan transformations
    this.applyTransformations(element);
    
    return element;
  }
  
  /**
   * Create image background
   * @returns {HTMLElement} Image background element
   */
  createImageBackground() {
    const element = document.createElement('div');
    element.className = 'background-image w-full h-full bg-center bg-no-repeat bg-contain transition-transform duration-300 ease-in-out';
    element.style.backgroundImage = this.options.backgroundUrl ? `url("${this.options.backgroundUrl}")` : '';
    
    return element;
  }
  
  /**
   * Create video background
   * @returns {HTMLElement} Video background element
   */
  createVideoBackground() {
    const element = document.createElement('video');
    element.className = 'background-video w-full h-full object-contain transition-transform duration-300 ease-in-out';
    element.src = this.options.backgroundUrl;
    element.controls = true;
    element.muted = true;
    element.loop = true;
    
    return element;
  }
  
  /**
   * Create YouTube background
   * @returns {HTMLElement} YouTube iframe element
   */
  createYouTubeBackground() {
    const element = document.createElement('iframe');
    element.className = 'background-youtube w-full h-full transition-transform duration-300 ease-in-out';
    element.src = this.getYouTubeEmbedUrl(this.options.backgroundUrl);
    element.frameBorder = '0';
    element.allowFullscreen = true;
    
    return element;
  }
  
  /**
   * Create grid overlay
   * @returns {HTMLElement} Grid overlay element
   */
  createGrid() {
    const grid = document.createElement('div');
    grid.className = 'canvas-grid absolute inset-0 pointer-events-none';
    grid.style.backgroundImage = `
      linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
    `;
    grid.style.backgroundSize = '20px 20px';
    
    return grid;
  }
  
  /**
   * Create rulers overlay
   * @returns {HTMLElement} Rulers container element
   */
  createRulers() {
    const rulersContainer = document.createElement('div');
    rulersContainer.className = 'canvas-rulers absolute inset-0 pointer-events-none';
    
    // Horizontal ruler
    const horizontalRuler = document.createElement('div');
    horizontalRuler.className = 'ruler-horizontal absolute top-0 left-0 right-0 h-6 bg-gray-800 border-b border-gray-600';
    
    // Vertical ruler
    const verticalRuler = document.createElement('div');
    verticalRuler.className = 'ruler-vertical absolute top-0 left-0 bottom-0 w-6 bg-gray-800 border-r border-gray-600';
    
    rulersContainer.appendChild(horizontalRuler);
    rulersContainer.appendChild(verticalRuler);
    
    return rulersContainer;
  }
  
  /**
   * Setup hotspot renderer
   */
  setupHotspotRenderer() {
    const container = this.element.querySelector('#background-container');
    if (!container) return;
    
    this.hotspotRenderer.setEventHandlers({
      onHotspotCreate: this.options.onHotspotCreate,
      onHotspotSelect: (id, config) => {
        // Handle hotspot selection
        console.log('Hotspot selected:', id, config);
      },
      onHotspotUpdate: (id, config) => {
        // Handle hotspot updates
        console.log('Hotspot updated:', id, config);
      },
      onPositionChange: (id, position) => {
        // Handle position changes during drag
        console.log('Hotspot position changed:', id, position);
      }
    });
  }
  
  /**
   * Setup resize observer
   */
  setupResizeObserver() {
    if (!window.ResizeObserver) return;
    
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Update hotspot positions when canvas resizes
        this.hotspotRenderer.handleContainerResize(this.element.querySelector('#background-container'));
        
        // Trigger callback
        if (this.options.onCanvasResize) {
          this.options.onCanvasResize(entry.contentRect);
        }
      }
    });
    
    this.resizeObserver.observe(this.element);
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Background click for creating hotspots
    const container = this.element.querySelector('#background-container');
    if (container) {
      container.addEventListener('click', (e) => {
        if (this.options.allowHotspotCreation && this.isCreatingHotspot) {
          this.createHotspotAtPosition(e);
        } else if (this.options.onBackgroundClick) {
          this.options.onBackgroundClick(e);
        }
      });
      
      // Prevent context menu for better UX
      container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }
  
  /**
   * Create hotspot at click position
   * @param {MouseEvent} event - Click event
   */
  createHotspotAtPosition(event) {
    const container = this.element.querySelector('#background-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    const hotspotConfig = {
      id: this.hotspotRenderer.generateId(),
      position: { x, y },
      ...HOTSPOT_DEFAULTS
    };
    
    this.hotspotRenderer.createHotspot(hotspotConfig, container);
    
    // Exit creation mode
    this.setHotspotCreationMode(false);
    
    // Trigger callback
    if (this.options.onHotspotCreate) {
      this.options.onHotspotCreate(hotspotConfig);
    }
  }
  
  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyboardShortcuts(event) {
    // Only handle shortcuts when canvas is focused or active
    if (!this.element.contains(document.activeElement)) return;
    
    switch (event.key) {
      case 'Escape':
        this.setHotspotCreationMode(false);
        break;
      case 'h':
      case 'H':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.setHotspotCreationMode(!this.isCreatingHotspot);
        }
        break;
      case 'Delete':
      case 'Backspace':
        const selectedHotspotId = this.hotspotRenderer.selectedHotspot;
        if (selectedHotspotId) {
          this.removeHotspot(selectedHotspotId);
        }
        break;
    }
  }
  
  /**
   * Apply zoom and pan transformations
   * @param {HTMLElement} element - Element to transform
   */
  applyTransformations(element) {
    const { zoom, pan } = this.options;
    element.style.transform = `scale(${zoom}) translate(${pan.x}%, ${pan.y}%)`;
  }
  
  /**
   * Get YouTube embed URL
   * @param {string} url - YouTube URL
   * @returns {string} Embed URL
   */
  getYouTubeEmbedUrl(url) {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : '';
    return `${API_CONFIG.YOUTUBE_EMBED_URL}${videoId}?enablejsapi=1&origin=${window.location.origin}`;
  }
  
  /**
   * Set background URL and type
   * @param {string} url - Background URL
   * @param {string} type - Background type
   */
  setBackground(url, type = MEDIA_TYPES.IMAGE) {
    this.options.backgroundUrl = url;
    this.options.backgroundType = type;
    
    // Recreate background element
    const container = this.element?.querySelector('#background-container');
    if (container && this.backgroundElement) {
      this.backgroundElement.remove();
      this.backgroundElement = this.createBackgroundElement();
      container.appendChild(this.backgroundElement);
      
      // Update hotspot renderer container
      this.hotspotRenderer.handleContainerResize(container);
    }
  }
  
  /**
   * Set zoom level
   * @param {number} zoom - Zoom level
   */
  setZoom(zoom) {
    this.options.zoom = Math.max(UI_CONFIG.MIN_ZOOM_LEVEL, Math.min(zoom, UI_CONFIG.MAX_ZOOM_LEVEL));
    
    if (this.backgroundElement) {
      this.applyTransformations(this.backgroundElement);
    }
  }
  
  /**
   * Set pan offset
   * @param {Object} pan - Pan offset {x, y}
   */
  setPan(pan) {
    this.options.pan = pan;
    
    if (this.backgroundElement) {
      this.applyTransformations(this.backgroundElement);
    }
  }
  
  /**
   * Set hotspot creation mode
   * @param {boolean} enabled - Whether creation mode is enabled
   */
  setHotspotCreationMode(enabled) {
    this.isCreatingHotspot = enabled;
    
    // Update cursor
    const container = this.element?.querySelector('#background-container');
    if (container) {
      container.style.cursor = enabled ? 'crosshair' : 'default';
    }
    
    // Update canvas class
    this.element?.classList.toggle('creating-hotspot', enabled);
    
    // Show visual indicator
    if (enabled) {
      this.showCreationIndicator();
    } else {
      this.hideCreationIndicator();
    }
  }
  
  /**
   * Show creation mode indicator
   */
  showCreationIndicator() {
    let indicator = this.element?.querySelector('.creation-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'creation-indicator absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm z-50';
      indicator.textContent = 'Click to create hotspot (ESC to cancel)';
      this.element?.appendChild(indicator);
    }
  }
  
  /**
   * Hide creation mode indicator
   */
  hideCreationIndicator() {
    const indicator = this.element?.querySelector('.creation-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  /**
   * Add hotspot
   * @param {Object} config - Hotspot configuration
   */
  addHotspot(config) {
    const container = this.element?.querySelector('#background-container');
    if (container) {
      this.hotspotRenderer.createHotspot(config, container);
    }
  }
  
  /**
   * Remove hotspot
   * @param {string} id - Hotspot ID
   */
  removeHotspot(id) {
    this.hotspotRenderer.removeHotspot(id);
  }
  
  /**
   * Update hotspot
   * @param {string} id - Hotspot ID
   * @param {Object} updates - Configuration updates
   */
  updateHotspot(id, updates) {
    this.hotspotRenderer.updateHotspot(id, updates);
  }
  
  /**
   * Get hotspot
   * @param {string} id - Hotspot ID
   * @returns {Object|null} Hotspot configuration
   */
  getHotspot(id) {
    return this.hotspotRenderer.getHotspot(id);
  }
  
  /**
   * Get all hotspots
   * @returns {Array} Array of hotspot configurations
   */
  getAllHotspots() {
    return this.hotspotRenderer.getAllHotspots();
  }
  
  /**
   * Clear all hotspots
   */
  clearHotspots() {
    this.hotspotRenderer.clearHotspots();
  }
  
  /**
   * Set hotspots
   * @param {Array} hotspots - Array of hotspot configurations
   */
  setHotspots(hotspots) {
    this.clearHotspots();
    const container = this.element?.querySelector('#background-container');
    if (container) {
      hotspots.forEach(config => {
        this.hotspotRenderer.createHotspot(config, container);
      });
    }
  }
  
  /**
   * Select hotspot
   * @param {string} id - Hotspot ID
   */
  selectHotspot(id) {
    this.hotspotRenderer.selectHotspot(id);
  }
  
  /**
   * Get selected hotspot ID
   * @returns {string|null} Selected hotspot ID
   */
  getSelectedHotspotId() {
    return this.hotspotRenderer.selectedHotspot;
  }
  
  /**
   * Set editor mode
   * @param {boolean} isEditor - Whether in editor mode
   */
  setEditorMode(isEditor) {
    this.hotspotRenderer.setEditorMode(isEditor);
  }
  
  /**
   * Toggle grid overlay
   * @param {boolean} show - Whether to show grid
   */
  toggleGrid(show) {
    this.options.showGrid = show;
    
    let grid = this.element?.querySelector('.canvas-grid');
    if (show && !grid) {
      grid = this.createGrid();
      this.element?.appendChild(grid);
    } else if (!show && grid) {
      grid.remove();
    }
  }
  
  /**
   * Toggle rulers overlay
   * @param {boolean} show - Whether to show rulers
   */
  toggleRulers(show) {
    this.options.showRulers = show;
    
    let rulers = this.element?.querySelector('.canvas-rulers');
    if (show && !rulers) {
      rulers = this.createRulers();
      this.element?.appendChild(rulers);
    } else if (!show && rulers) {
      rulers.remove();
    }
  }
  
  /**
   * Export canvas as image
   * @returns {Promise<Blob>} Canvas image blob
   */
  async exportAsImage() {
    // This would require html2canvas or similar library
    // For now, return a placeholder
    console.log('Export as image not implemented yet');
    return null;
  }
  
  /**
   * Get canvas dimensions
   * @returns {Object} Canvas dimensions {width, height}
   */
  getDimensions() {
    const rect = this.element?.getBoundingClientRect();
    return {
      width: rect?.width || 0,
      height: rect?.height || 0
    };
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    if (this.hotspotRenderer) {
      this.hotspotRenderer.clearHotspots();
    }
    
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
  
  /**
   * Get canvas element
   * @returns {HTMLElement|null} Canvas element
   */
  getElement() {
    return this.element;
  }
}
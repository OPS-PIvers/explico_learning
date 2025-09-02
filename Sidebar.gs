/**
 * Sidebar Component for Explico Learning
 * Provides slide selection and navigation functionality
 */

class Sidebar {
  
  constructor(options = {}) {
    this.options = {
      title: 'Slide Selection',
      collapsible: true,
      collapsed: false,
      showAddButton: true,
      slides: [],
      activeSlideId: null,
      onSlideSelect: null,
      onSlideAdd: null,
      onSlideDelete: null,
      onSlideReorder: null,
      ...options
    };
    
    this.element = null;
    this.isCollapsed = this.options.collapsed;
    this.draggedSlide = null;
  }
  
  /**
   * Create and return the sidebar element
   * @returns {HTMLElement} Sidebar element
   */
  render() {
    this.element = document.createElement('aside');
    this.element.className = `sidebar flex flex-col gap-4 rounded-lg bg-[#1f2937] p-3 relative transition-all duration-300`;
    this.element.style.width = this.isCollapsed ? `${UI_CONFIG.SIDEBAR_COLLAPSED_WIDTH}px` : `${UI_CONFIG.SIDEBAR_WIDTH}px`;
    
    // Collapse/expand button
    if (this.options.collapsible) {
      const toggleButton = this.createToggleButton();
      this.element.appendChild(toggleButton);
    }
    
    // Header
    const header = this.createHeader();
    this.element.appendChild(header);
    
    // Slides container
    const slidesContainer = this.createSlidesContainer();
    this.element.appendChild(slidesContainer);
    
    // Add slide button
    if (this.options.showAddButton) {
      const addButton = this.createAddButton();
      this.element.appendChild(addButton);
    }
    
    // Render slides
    this.renderSlides();
    
    return this.element;
  }
  
  /**
   * Create toggle button for collapse/expand
   * @returns {HTMLElement} Toggle button element
   */
  createToggleButton() {
    const button = document.createElement('button');
    button.className = 'absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-10 bg-gray-700 text-white rounded-r-md flex items-center justify-center hover:bg-gray-600 transition-colors';
    button.id = 'sidebar-toggle';
    
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-sm';
    icon.textContent = this.isCollapsed ? 'chevron_right' : 'chevron_left';
    
    button.appendChild(icon);
    
    button.addEventListener('click', () => {
      this.toggle();
    });
    
    return button;
  }
  
  /**
   * Create sidebar header
   * @returns {HTMLElement} Header element
   */
  createHeader() {
    const header = document.createElement('h2');
    header.className = 'sidebar-title text-white text-base font-semibold px-1 transition-opacity duration-300';
    header.textContent = this.options.title;
    header.style.opacity = this.isCollapsed ? '0' : '1';
    
    return header;
  }
  
  /**
   * Create slides container
   * @returns {HTMLElement} Slides container element
   */
  createSlidesContainer() {
    const container = document.createElement('div');
    container.className = 'slides-container flex flex-col gap-2 overflow-y-auto pr-1 flex-1';
    container.id = 'slides-container';
    
    return container;
  }
  
  /**
   * Create add slide button
   * @returns {HTMLElement} Add button element
   */
  createAddButton() {
    const button = document.createElement('button');
    button.className = 'add-slide-button w-full flex items-center justify-center gap-2 rounded-md p-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white mt-auto transition-colors';
    button.id = 'add-slide-button';
    
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-base';
    icon.textContent = 'add';
    
    const text = document.createElement('span');
    text.className = 'transition-opacity duration-300';
    text.textContent = 'Add Slide';
    text.style.opacity = this.isCollapsed ? '0' : '1';
    
    button.appendChild(icon);
    button.appendChild(text);
    
    button.addEventListener('click', () => {
      if (this.options.onSlideAdd) {
        this.options.onSlideAdd();
      }
    });
    
    return button;
  }
  
  /**
   * Render all slides
   */
  renderSlides() {
    const container = this.element?.querySelector('#slides-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.options.slides.forEach((slide, index) => {
      const slideElement = this.createSlideElement(slide, index);
      container.appendChild(slideElement);
    });
  }
  
  /**
   * Create slide element
   * @param {Object} slide - Slide data
   * @param {number} index - Slide index
   * @returns {HTMLElement} Slide element
   */
  createSlideElement(slide, index) {
    const slideEl = document.createElement('div');
    slideEl.className = 'slide-item relative group cursor-pointer transition-all duration-200';
    slideEl.dataset.slideId = slide.id;
    slideEl.dataset.slideIndex = index;
    slideEl.draggable = true;
    
    // Slide thumbnail
    const thumbnail = this.createSlideThumbnail(slide);
    slideEl.appendChild(thumbnail);
    
    // Delete button (only shown on hover)
    const deleteButton = this.createDeleteButton(slide.id);
    slideEl.appendChild(deleteButton);
    
    // Slide title/number (for collapsed view)
    const slideNumber = this.createSlideNumber(index + 1);
    slideEl.appendChild(slideNumber);
    
    // Set active state
    if (slide.id === this.options.activeSlideId) {
      this.setSlideActive(slideEl, true);
    }
    
    // Event listeners
    this.attachSlideEventListeners(slideEl, slide);
    
    return slideEl;
  }
  
  /**
   * Create slide thumbnail
   * @param {Object} slide - Slide data
   * @returns {HTMLElement} Thumbnail element
   */
  createSlideThumbnail(slide) {
    const thumbnail = document.createElement('img');
    thumbnail.className = 'slide-thumbnail rounded border-2 border-transparent hover:border-gray-500 aspect-[16/9] object-cover w-full transition-all duration-200';
    thumbnail.alt = `${slide.name || 'Slide'} thumbnail`;
    thumbnail.src = slide.thumbnailUrl || slide.backgroundUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjEzNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjQwIiBoZWlnaHQ9IjEzNSIgZmlsbD0iIzM3NDE1MSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    
    // Handle image load errors
    thumbnail.addEventListener('error', () => {
      thumbnail.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjEzNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjQwIiBoZWlnaHQ9IjEzNSIgZmlsbD0iIzM3NDE1MSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    });
    
    return thumbnail;
  }
  
  /**
   * Create slide delete button
   * @param {string} slideId - Slide ID
   * @returns {HTMLElement} Delete button element
   */
  createDeleteButton(slideId) {
    const button = document.createElement('button');
    button.className = 'slide-delete absolute top-1 right-1 bg-[#4f46e5] text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500';
    button.title = 'Delete slide';
    
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-sm';
    icon.textContent = 'close';
    
    button.appendChild(icon);
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.options.onSlideDelete) {
        this.options.onSlideDelete(slideId);
      }
    });
    
    return button;
  }
  
  /**
   * Create slide number indicator (for collapsed view)
   * @param {number} slideNumber - Slide number
   * @returns {HTMLElement} Slide number element
   */
  createSlideNumber(slideNumber) {
    const numberEl = document.createElement('div');
    numberEl.className = 'slide-number absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded opacity-0 transition-opacity duration-300';
    numberEl.textContent = slideNumber.toString();
    numberEl.style.opacity = this.isCollapsed ? '1' : '0';
    
    return numberEl;
  }
  
  /**
   * Attach event listeners to slide element
   * @param {HTMLElement} slideEl - Slide element
   * @param {Object} slide - Slide data
   */
  attachSlideEventListeners(slideEl, slide) {
    // Click to select
    slideEl.addEventListener('click', () => {
      this.selectSlide(slide.id);
    });
    
    // Drag and drop for reordering
    slideEl.addEventListener('dragstart', (e) => {
      this.draggedSlide = slide.id;
      slideEl.classList.add('opacity-50');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', slideEl.outerHTML);
    });
    
    slideEl.addEventListener('dragend', () => {
      slideEl.classList.remove('opacity-50');
      this.draggedSlide = null;
    });
    
    slideEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slideEl.classList.add('border-blue-500');
    });
    
    slideEl.addEventListener('dragleave', () => {
      slideEl.classList.remove('border-blue-500');
    });
    
    slideEl.addEventListener('drop', (e) => {
      e.preventDefault();
      slideEl.classList.remove('border-blue-500');
      
      if (this.draggedSlide && this.draggedSlide !== slide.id) {
        const draggedIndex = this.options.slides.findIndex(s => s.id === this.draggedSlide);
        const targetIndex = this.options.slides.findIndex(s => s.id === slide.id);
        
        if (draggedIndex !== -1 && targetIndex !== -1 && this.options.onSlideReorder) {
          this.options.onSlideReorder(draggedIndex, targetIndex);
        }
      }
    });
  }
  
  /**
   * Select a slide
   * @param {string} slideId - Slide ID to select
   */
  selectSlide(slideId) {
    // Remove active state from all slides
    const slides = this.element?.querySelectorAll('.slide-item');
    slides?.forEach(slide => this.setSlideActive(slide, false));
    
    // Set active state on selected slide
    const selectedSlide = this.element?.querySelector(`[data-slide-id="${slideId}"]`);
    if (selectedSlide) {
      this.setSlideActive(selectedSlide, true);
    }
    
    this.options.activeSlideId = slideId;
    
    // Trigger callback
    if (this.options.onSlideSelect) {
      this.options.onSlideSelect(slideId);
    }
  }
  
  /**
   * Set slide active state
   * @param {HTMLElement} slideEl - Slide element
   * @param {boolean} active - Whether slide is active
   */
  setSlideActive(slideEl, active) {
    const thumbnail = slideEl.querySelector('.slide-thumbnail');
    if (!thumbnail) return;
    
    if (active) {
      thumbnail.classList.remove('border-transparent', 'hover:border-gray-500');
      thumbnail.classList.add('border-[#4f46e5]');
    } else {
      thumbnail.classList.remove('border-[#4f46e5]');
      thumbnail.classList.add('border-transparent', 'hover:border-gray-500');
    }
  }
  
  /**
   * Toggle sidebar collapsed state
   */
  toggle() {
    this.isCollapsed = !this.isCollapsed;
    
    // Update width
    this.element.style.width = this.isCollapsed ? `${UI_CONFIG.SIDEBAR_COLLAPSED_WIDTH}px` : `${UI_CONFIG.SIDEBAR_WIDTH}px`;
    
    // Update toggle button icon
    const toggleButton = this.element?.querySelector('#sidebar-toggle span');
    if (toggleButton) {
      toggleButton.textContent = this.isCollapsed ? 'chevron_right' : 'chevron_left';
    }
    
    // Update title visibility
    const title = this.element?.querySelector('.sidebar-title');
    if (title) {
      title.style.opacity = this.isCollapsed ? '0' : '1';
    }
    
    // Update add button text visibility
    const addButtonText = this.element?.querySelector('.add-slide-button span:last-child');
    if (addButtonText) {
      addButtonText.style.opacity = this.isCollapsed ? '0' : '1';
    }
    
    // Update slide numbers visibility
    const slideNumbers = this.element?.querySelectorAll('.slide-number');
    slideNumbers?.forEach(number => {
      number.style.opacity = this.isCollapsed ? '1' : '0';
    });
    
    // Trigger layout update event
    window.dispatchEvent(new CustomEvent('sidebarToggle', {
      detail: { collapsed: this.isCollapsed }
    }));
  }
  
  /**
   * Add a new slide
   * @param {Object} slide - Slide data
   */
  addSlide(slide) {
    this.options.slides.push(slide);
    this.renderSlides();
  }
  
  /**
   * Remove a slide
   * @param {string} slideId - Slide ID to remove
   */
  removeSlide(slideId) {
    this.options.slides = this.options.slides.filter(slide => slide.id !== slideId);
    
    // If removed slide was active, select first slide
    if (this.options.activeSlideId === slideId && this.options.slides.length > 0) {
      this.selectSlide(this.options.slides[0].id);
    }
    
    this.renderSlides();
  }
  
  /**
   * Update slide data
   * @param {string} slideId - Slide ID
   * @param {Object} updates - Slide updates
   */
  updateSlide(slideId, updates) {
    const slideIndex = this.options.slides.findIndex(slide => slide.id === slideId);
    if (slideIndex !== -1) {
      this.options.slides[slideIndex] = { ...this.options.slides[slideIndex], ...updates };
      this.renderSlides();
    }
  }
  
  /**
   * Reorder slides
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   */
  reorderSlides(fromIndex, toIndex) {
    const slides = [...this.options.slides];
    const [removed] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, removed);
    
    this.options.slides = slides;
    this.renderSlides();
  }
  
  /**
   * Set slides data
   * @param {Array} slides - Array of slide objects
   */
  setSlides(slides) {
    this.options.slides = slides;
    this.renderSlides();
  }
  
  /**
   * Get current slides
   * @returns {Array} Array of slide objects
   */
  getSlides() {
    return this.options.slides;
  }
  
  /**
   * Get active slide ID
   * @returns {string|null} Active slide ID
   */
  getActiveSlideId() {
    return this.options.activeSlideId;
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
  
  /**
   * Get sidebar element
   * @returns {HTMLElement|null} Sidebar element
   */
  getElement() {
    return this.element;
  }
}
/**
 * ProjectManager Client Service for Explico Learning
 * Handles client-side project management and communication with the server.
 */

class ProjectManager {
  
  constructor(options = {}) {
    this.options = {
      ...options
    };
    
    this.currentProject = null;
    this.currentSlide = null;
    this.isInitialized = false;
    this.eventListeners = new Map();
    
    // Component references (set by application)
    this.dashboard = null;
    this.header = null;
    this.sidebar = null;
    this.canvas = null;
    this.configPanel = null;
    this.sequencer = null;
  }
  
  /**
   * Initialize the project manager with components
   * @param {Object} components - Component instances
   * @returns {Promise<void>}
   */
  async initialize(components = {}) {
    this.setComponents(components);
    this.isInitialized = true;
    console.log('ProjectManager client initialized successfully');
  }
  
  /**
   * Set component references
   * @param {Object} components - Component instances
   */
  setComponents(components = {}) {
    this.dashboard = components.dashboard;
    this.header = components.header;
    this.sidebar = components.sidebar;
    this.canvas = components.canvas;
    this.configPanel = components.configPanel;
    this.sequencer = components.sequencer;
    
    this.setupComponentEventHandlers();
  }
  
  /**
   * Setup component event handlers
   */
  setupComponentEventHandlers() {
    if (this.dashboard) {
      this.dashboard.options.onProjectSelect = (project) => this.openProject(project.id);
      this.dashboard.options.onProjectCreate = () => this.createNewProject();
      this.dashboard.options.onProjectEdit = (project) => this.openProject(project.id);
      this.dashboard.options.onProjectDelete = (project) => this.deleteProject(project.id);
      this.dashboard.options.onProjectDuplicate = (project) => this.duplicateProject(project.id);
    }
    
    if (this.header) {
      this.header.options.onSave = () => this.saveCurrentProject();
      this.header.options.onShare = () => this.shareCurrentProject();
    }
    
    if (this.sidebar) {
      this.sidebar.options.onSlideSelect = (slideId) => this.selectSlide(slideId);
      this.sidebar.options.onSlideAdd = () => this.createNewSlide();
      this.sidebar.options.onSlideDelete = (slideId) => this.deleteSlide(slideId);
      this.sidebar.options.onSlideReorder = (fromIndex, toIndex) => this.reorderSlides(fromIndex, toIndex);
    }
  }
  
  /**
   * Create a new project
   * @param {Object} projectData - Initial project data
   * @returns {Promise<Object>} Created project
   */
  async createNewProject(projectData = {}) {
    return await google.script.run.createNewProject(projectData);
  }
  
  /**
   * Open an existing project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Opened project
   */
  async openProject(projectId) {
    const project = await google.script.run.openProject(projectId);
    this.currentProject = project;
    this.currentSlide = project.slides[0] || null;
    this.syncProjectToComponents();
    return project;
  }
  
  /**
   * Save current project
   * @returns {Promise<boolean>} Success status
   */
  async saveCurrentProject() {
    if (!this.currentProject) {
      console.warn('No current project to save');
      return false;
    }
    return await google.script.run.saveCurrentProject(this.currentProject);
  }
  
  /**
   * Delete a project
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProject(projectId) {
    return await google.script.run.deleteProject(projectId);
  }
  
  /**
   * Duplicate a project
   * @param {string} projectId - Project ID to duplicate
   * @returns {Promise<Object>} Duplicated project
   */
  async duplicateProject(projectId) {
    return await google.script.run.duplicateProject(projectId);
  }
  
  /**
   * Get all projects
   * @returns {Promise<Array<Object>>} Array of projects
   */
  async getAllProjects() {
    return await google.script.run.getAllProjects();
  }
  
  /**
   * Create a new slide
   * @param {Object} slideData - Slide data
   * @returns {Promise<Object>} Created slide
   */
  async createSlide(slideData = {}) {
    return await google.script.run.createSlide(slideData);
  }
  
  /**
   * Select a slide
   * @param {string} slideId - Slide ID
   * @returns {Promise<Object>} Selected slide
   */
  async selectSlide(slideId) {
    const slide = await google.script.run.selectSlide(slideId);
    this.currentSlide = slide;
    this.syncSlideToComponents();
    return slide;
  }
  
  /**
   * Delete a slide
   * @param {string} slideId - Slide ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteSlide(slideId) {
    return await google.script.run.deleteSlide(slideId);
  }
  
  /**
   * Update slide background
   * @param {string} slideId - Slide ID
   * @param {string} backgroundUrl - Background URL
   * @param {string} backgroundType - Background type
   * @returns {Promise<Object>} Updated slide
   */
  async updateSlideBackground(slideId, backgroundUrl, backgroundType) {
    return await google.script.run.updateSlideBackground(slideId, backgroundUrl, backgroundType);
  }
  
  /**
   * Reorder slides
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   * @returns {Promise<boolean>} Success status
   */
  async reorderSlides(fromIndex, toIndex) {
    return await google.script.run.reorderSlides(fromIndex, toIndex);
  }
  
  /**
   * Sync project data to components
   */
  syncProjectToComponents() {
    if (!this.currentProject) return;
    
    if (this.header) {
      this.header.setTitle(this.currentProject.name);
    }
    
    this.syncSlidesToSidebar();
  }
  
  /**
   * Sync slides to sidebar
   */
  syncSlidesToSidebar() {
    if (!this.sidebar || !this.currentProject) return;
    
    this.sidebar.setSlides(this.currentProject.slides || []);
  }
  
  /**
   * Sync slide data to components
   */
  syncSlideToComponents() {
    if (!this.currentSlide) return;

    if (this.canvas) {
      this.canvas.setBackground(this.currentSlide.backgroundUrl, this.currentSlide.backgroundType);
    }
  }
}

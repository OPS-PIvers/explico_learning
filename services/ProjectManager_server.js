/**
 * ProjectManager Server Service for Explico Learning
 * Orchestrates project-level operations and coordinates all other services on the server.
 */

class ProjectManager_server {
  
  constructor() {
    this.sheetsAPI = new GoogleSheetsAPI();
  }
  
  /**
   * Create a new project
   * @param {Object} projectData - Initial project data
   * @returns {Object} Created project
   */
  createNewProject(projectData) {
    this.sheetsAPI.initialize();
    const createdProject = this.sheetsAPI.createProject(projectData);
    return createdProject;
  }
  
  /**
   * Open an existing project
   * @param {string} projectId - Project ID
   * @returns {Object} Opened project
   */
  openProject(projectId) {
    this.sheetsAPI.initialize(projectId);
    const project = this.sheetsAPI.getProject(projectId);
    project.slides = this.sheetsAPI.getSlidesByProject(projectId);
    return project;
  }
  
  /**
   * Save current project
   * @param {Object} projectData - Project data to save
   * @returns {boolean} Success status
   */
  saveCurrentProject(projectData) {
    this.sheetsAPI.initialize(projectData.id);
    this.sheetsAPI.updateProject(projectData.id, projectData);
    return true;
  }
  
  /**
   * Delete a project
   * @param {string} projectId - Project ID
   * @returns {boolean} Success status
   */
  deleteProject(projectId) {
    this.sheetsAPI.initialize(projectId);
    this.sheetsAPI.deleteProject(projectId);
    return true;
  }
  
  /**
   * Duplicate a project
   * @param {string} projectId - Project ID to duplicate
   * @returns {Object} Duplicated project
   */
  duplicateProject(projectId) {
    this.sheetsAPI.initialize(projectId);
    const originalProject = this.sheetsAPI.getProject(projectId);
    const duplicatedProject = this.sheetsAPI.createProject({
      ...originalProject,
      name: `${originalProject.name} (Copy)`,
    });
    const originalSlides = this.sheetsAPI.getSlidesByProject(projectId);
    for (const slide of originalSlides) {
      const duplicatedSlide = this.sheetsAPI.createSlide({
        ...slide,
        projectId: duplicatedProject.id,
      });
      const originalHotspots = this.sheetsAPI.getHotspotsBySlide(slide.id);
      const duplicatedHotspots = originalHotspots.map(hotspot => ({
        ...hotspot,
        slideId: duplicatedSlide.id,
      }));
      if (duplicatedHotspots.length > 0) {
        this.sheetsAPI.saveHotspots(duplicatedHotspots);
      }
    }
    return duplicatedProject;
  }
  
  /**
   * Get all projects
   * @returns {Array<Object>} Array of projects
   */
  getAllProjects() {
    this.sheetsAPI.initialize();
    const projects = this.sheetsAPI.getAllProjects();
    return projects;
  }
  
  /**
   * Create a new slide
   * @param {Object} slideData - Slide data
   * @returns {Object} Created slide
   */
  createSlide(slideData) {
    this.sheetsAPI.initialize(slideData.projectId);
    const createdSlide = this.sheetsAPI.createSlide(slideData);
    return createdSlide;
  }
  
  /**
   * Select a slide
   * @param {string} slideId - Slide ID
   * @returns {Object} Selected slide
   */
  selectSlide(slideId) {
    const slide = this.sheetsAPI.getSlide(slideId);
    return slide;
  }
  
  /**
   * Delete a slide
   * @param {string} slideId - Slide ID
   * @returns {boolean} Success status
   */
  deleteSlide(slideId) {
    const slide = this.sheetsAPI.getSlide(slideId);
    this.sheetsAPI.initialize(slide.projectId);
    this.sheetsAPI.deleteSlide(slideId);
    return true;
  }
  
  /**
   * Update slide background
   * @param {string} slideId - Slide ID
   * @param {string} backgroundUrl - Background URL
   * @param {string} backgroundType - Background type
   * @returns {Object} Updated slide
   */
  updateSlideBackground(slideId, backgroundUrl, backgroundType) {
    const slide = this.sheetsAPI.getSlide(slideId);
    this.sheetsAPI.initialize(slide.projectId);
    const updatedSlide = this.sheetsAPI.updateSlide(slideId, {
      backgroundUrl: backgroundUrl,
      backgroundType: backgroundType,
    });
    return updatedSlide;
  }
  
  /**
   * Reorder slides
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   * @returns {boolean} Success status
   */
  reorderSlides(fromIndex, toIndex) {
    // This is a complex operation that requires getting all slides,
    // reordering them, and then updating them all. This is a placeholder
    // for the actual implementation.
    return true;
  }
}

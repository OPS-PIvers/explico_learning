/**
 * ProjectManager Server Service for Explico Learning
 * Orchestrates project-level operations and coordinates all other services on the server.
 */

class ProjectManager_server {
  
  constructor() {}
  
  /**
   * Create a new project
   * @param {Object} projectData - Initial project data
   * @returns {Object} Created project
   */
  createNewProject(projectData) {
    const sheetsAPI = new GoogleSheetsAPI();
    sheetsAPI.initialize();
    const createdProject = sheetsAPI.createProject(projectData);
    return createdProject;
  }
  
  /**
   * Open an existing project
   * @param {string} projectId - Project ID
   * @returns {Object} Opened project
   */
  openProject(projectId) {
    const sheetsAPI = new GoogleSheetsAPI();
    sheetsAPI.initialize(projectId);
    const project = sheetsAPI.getProject(projectId);
    project.slides = sheetsAPI.getSlidesByProject(projectId);
    return project;
  }
  
  /**
   * Save current project
   * @param {Object} projectData - Project data to save
   * @returns {boolean} Success status
   */
  saveCurrentProject(projectData) {
    const sheetsAPI = new GoogleSheetsAPI();
    sheetsAPI.initialize(projectData.id);
    sheetsAPI.updateProject(projectData.id, projectData);
    return true;
  }
  
  /**
   * Delete a project
   * @param {string} projectId - Project ID
   * @returns {boolean} Success status
   */
  deleteProject(projectId) {
    const sheetsAPI = new GoogleSheetsAPI();
    sheetsAPI.initialize(projectId);
    sheetsAPI.deleteProject(projectId);
    return true;
  }
  
  /**
   * Duplicate a project
   * @param {string} projectId - Project ID to duplicate
   * @returns {Object} Duplicated project
   */
  duplicateProject(projectId) {
    const sheetsAPI = new GoogleSheetsAPI();
    sheetsAPI.initialize(projectId);
    const originalProject = sheetsAPI.getProject(projectId);
    const duplicatedProject = sheetsAPI.createProject({
      ...originalProject,
      name: `${originalProject.name} (Copy)`,
    });
    const originalSlides = sheetsAPI.getSlidesByProject(projectId);
    for (const slide of originalSlides) {
      const duplicatedSlide = sheetsAPI.createSlide({
        ...slide,
        projectId: duplicatedProject.id,
      });
      const originalHotspots = sheetsAPI.getHotspotsBySlide(slide.id);
      const duplicatedHotspots = originalHotspots.map(hotspot => ({
        ...hotspot,
        slideId: duplicatedSlide.id,
      }));
      if (duplicatedHotspots.length > 0) {
        sheetsAPI.saveHotspots(duplicatedHotspots);
      }
    }
    return duplicatedProject;
  }
  
  /**
   * Get all projects
   * @returns {Array<Object>} Array of projects
   */
  getAllProjects() {
    const sheetsAPI = new GoogleSheetsAPI();
    sheetsAPI.initialize();
    const projects = sheetsAPI.getAllProjects();
    return projects;
  }
  
  /**
   * Create a new slide
   * @param {Object} slideData - Slide data
   * @returns {Object} Created slide
   */
  createSlide(slideData) {
    const sheetsAPI = new GoogleSheetsAPI();
    sheetsAPI.initialize(slideData.projectId);
    const createdSlide = sheetsAPI.createSlide(slideData);
    return createdSlide;
  }
  
  /**
   * Select a slide
   * @param {string} slideId - Slide ID
   * @returns {Object} Selected slide
   */
  selectSlide(slideId) {
    const sheetsAPI = new GoogleSheetsAPI();
    const slide = sheetsAPI.getSlide(slideId);
    return slide;
  }
  
  /**
   * Delete a slide
   * @param {string} slideId - Slide ID
   * @returns {boolean} Success status
   */
  deleteSlide(slideId) {
    const sheetsAPI = new GoogleSheetsAPI();
    const slide = sheetsAPI.getSlide(slideId);
    sheetsAPI.initialize(slide.projectId);
    sheetsAPI.deleteSlide(slideId);
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
    const sheetsAPI = new GoogleSheetsAPI();
    const slide = sheetsAPI.getSlide(slideId);
    sheetsAPI.initialize(slide.projectId);
    const updatedSlide = sheetsAPI.updateSlide(slideId, {
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

/**
 * ProjectManager Server Service for Explico Learning
 * Orchestrates project-level operations and coordinates all other services on the server.
 */

import { Project, Slide, Hotspot, MediaType } from '../../shared/types';
import { GoogleSheetsAPI } from './GoogleSheetsAPI';

declare const DriveApp: GoogleAppsScript.Drive.DriveApp;

interface ProjectData {
  name?: string;
  description?: string;
  settings?: any;
}

interface SlideData {
  projectId: string;
  title?: string;
  mediaUrl?: string;
  mediaType?: string;
  order?: number;
}

export class ProjectManager {
  constructor() {}

  /**
   * Create a new project
   */
  async createNewProject(projectData: ProjectData): Promise<Project> {
    const sheetsAPI = new GoogleSheetsAPI();

    // Step 1: Create a new spreadsheet for this project
    const spreadsheetId = await sheetsAPI.createProjectSpreadsheet(
      projectData.name || 'Untitled Project'
    );

    // Step 2: Initialize the GoogleSheetsAPI with the new spreadsheet ID
    await sheetsAPI.initialize(spreadsheetId);

    // Step 3: Create the project record in the spreadsheet
    const projectWithSpreadsheetId = {
      ...projectData,
      spreadsheetId: spreadsheetId,
    };
    const createdProject = await sheetsAPI.createProject(projectWithSpreadsheetId);

    // Step 4: Add project to master registry
    await sheetsAPI.initializeRegistry();
    await sheetsAPI.addProjectToRegistry(createdProject);

    return createdProject;
  }

  /**
   * Open an existing project
   */
  async openProject(
    projectId: string
  ): Promise<Project & { slides: (Slide & { hotspots: Hotspot[] })[] }> {
    const sheetsAPI = new GoogleSheetsAPI();

    // Step 1: Initialize registry to get project spreadsheet ID
    await sheetsAPI.initializeRegistry();
    const projects = await sheetsAPI.getAllProjects();
    const projectInfo = projects.find((p) => p.id === projectId);

    if (!projectInfo) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Step 2: Initialize with project spreadsheet and get project data
    await sheetsAPI.initialize(projectInfo.spreadsheetId);
    const project = await sheetsAPI.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} data not found`);
    }

    const slides = await sheetsAPI.getSlidesByProject(projectId);

    // Now, for each slide, get its hotspots
    const slidesWithHotspots = await Promise.all(
      slides.map(async (slide) => {
        const hotspots = await sheetsAPI.getHotspotsBySlide(slide.id);
        return {
          ...slide,
          hotspots,
        };
      })
    );

    return {
      ...project,
      slides: slidesWithHotspots,
    };
  }

  /**
   * Save current project
   */
  async saveCurrentProject(projectData: Project): Promise<boolean> {
    const sheetsAPI = new GoogleSheetsAPI();
    await sheetsAPI.initialize(projectData.spreadsheetId);
    await sheetsAPI.updateProject(projectData.id, projectData);
    return true;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<boolean> {
    const sheetsAPI = new GoogleSheetsAPI();

    // Step 1: Initialize registry to get project spreadsheet ID
    await sheetsAPI.initializeRegistry();
    const projects = await sheetsAPI.getAllProjects();
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Step 2: Initialize with project spreadsheet and delete project data
    await sheetsAPI.initialize(project.spreadsheetId);
    await sheetsAPI.deleteProject(projectId);

    // Step 3: Remove from registry
    await sheetsAPI.removeProjectFromRegistry(projectId);

    // Step 4: Delete the spreadsheet file
    try {
      DriveApp.getFileById(project.spreadsheetId).setTrashed(true);
    } catch (error) {
      console.warn('Could not delete spreadsheet file:', error);
    }

    return true;
  }

  /**
   * Duplicate a project
   */
  async duplicateProject(projectId: string): Promise<Project> {
    // Step 1: Get original project data
    const originalSheetsAPI = new GoogleSheetsAPI();

    // We need the spreadsheetId of the original project. Let's get it from the registry.
    await originalSheetsAPI.initializeRegistry();
    const allProjects = await originalSheetsAPI.getAllProjects();
    const originalProjectFromRegistry = allProjects.find((p) => p.id === projectId);

    if (!originalProjectFromRegistry) {
      throw new Error(`Project ${projectId} not found in registry.`);
    }

    // Now initialize with the original project's spreadsheet to get its contents
    await originalSheetsAPI.initialize(originalProjectFromRegistry.spreadsheetId);
    const originalProject = await originalSheetsAPI.getProject(projectId);
    if (!originalProject) {
      throw new Error(`Project ${projectId} data not found`);
    }

    const originalSlides = await originalSheetsAPI.getSlidesByProject(projectId);

    // Step 2: Create a new project
    const newProjectData = {
      name: `${originalProject.title} (Copy)`,
      description: originalProject.description,
      settings: originalProject.settings,
    };
    const newProject = await this.createNewProject(newProjectData);

    // Step 3: Initialize a new sheetsAPI instance for the new project
    const newSheetsAPI = new GoogleSheetsAPI();
    await newSheetsAPI.initialize(newProject.spreadsheetId);

    // Step 4: Copy slides and hotspots
    for (const slide of originalSlides) {
      // Get hotspots for the original slide
      const originalHotspots = await originalSheetsAPI.getHotspotsBySlide(slide.id);

      // Create a deep copy of the slide data to prevent shared references
      const slideCopy = JSON.parse(JSON.stringify(slide));

      const newSlideData = {
        ...slideCopy,
        projectId: newProject.id,
      };
      delete (newSlideData as any).id; // Let createSlide generate a new ID
      const newSlide = await newSheetsAPI.createSlide(newSlideData);

      // Create new hotspots for the new slide
      if (originalHotspots && originalHotspots.length > 0) {
        const newHotspots = originalHotspots.map((hotspot) => {
          const newHotspot = {
            ...hotspot,
            id: this.generateId('hotspot'),
            slideId: newSlide.id,
          };
          return newHotspot;
        });
        await newSheetsAPI.saveHotspots(newHotspots);
      }
    }

    return newProject;
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<Project[]> {
    const sheetsAPI = new GoogleSheetsAPI();
    await sheetsAPI.initializeRegistry();
    const projects = await sheetsAPI.getAllProjects();
    return projects;
  }

  /**
   * Create a new slide
   */
  async createSlide(slideData: SlideData): Promise<Slide> {
    const sheetsAPI = new GoogleSheetsAPI();
    // We need to find the project's spreadsheet ID from the registry
    await sheetsAPI.initializeRegistry();
    const projects = await sheetsAPI.getAllProjects();
    const project = projects.find((p) => p.id === slideData.projectId);

    if (!project) {
      throw new Error(`Project ${slideData.projectId} not found`);
    }

    await sheetsAPI.initialize(project.spreadsheetId);

    // Convert SlideData to Slide format
    const slideToCreate: Partial<Slide> = {
      ...slideData,
      mediaType: slideData.mediaType as MediaType,
    };

    const createdSlide = await sheetsAPI.createSlide(slideToCreate);
    return createdSlide;
  }

  /**
   * Get a slide
   */
  async getSlide(slideId: string): Promise<Slide | null> {
    // This is a simplified version - in practice we'd need to determine which project this slide belongs to
    const sheetsAPI = new GoogleSheetsAPI();
    // For now, we'll need the project ID or spreadsheet ID to properly initialize
    throw new Error('getSlide requires project context - use openProject instead');
  }

  /**
   * Delete a slide
   */
  async deleteSlide(slideId: string, projectId: string): Promise<boolean> {
    const sheetsAPI = new GoogleSheetsAPI();

    // Get project info to initialize with correct spreadsheet
    await sheetsAPI.initializeRegistry();
    const projects = await sheetsAPI.getAllProjects();
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    await sheetsAPI.initialize(project.spreadsheetId);

    // Delete hotspots for the slide first
    await sheetsAPI.deleteHotspotsBySlide(slideId);

    // Then delete the slide
    // Note: GoogleSheetsAPI doesn't have a deleteSlide method, we might need to add it
    // For now, this is a placeholder
    console.log(`Deleting slide ${slideId} from project ${projectId}`);

    return true;
  }

  /**
   * Update slide background
   */
  async updateSlideBackground(
    slideId: string,
    projectId: string,
    backgroundUrl: string,
    backgroundType: string
  ): Promise<Slide> {
    const sheetsAPI = new GoogleSheetsAPI();

    // Get project info to initialize with correct spreadsheet
    await sheetsAPI.initializeRegistry();
    const projects = await sheetsAPI.getAllProjects();
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    await sheetsAPI.initialize(project.spreadsheetId);
    const updatedSlide = await sheetsAPI.updateSlide(slideId, {
      mediaUrl: backgroundUrl,
      mediaType: backgroundType as MediaType,
    });
    return updatedSlide;
  }

  /**
   * Reorder slides
   */
  async reorderSlides(projectId: string, fromIndex: number, toIndex: number): Promise<boolean> {
    // This is a complex operation that requires getting all slides,
    // reordering them, and then updating them all. This is a placeholder
    // for the actual implementation.

    const sheetsAPI = new GoogleSheetsAPI();

    // Get project info to initialize with correct spreadsheet
    await sheetsAPI.initializeRegistry();
    const projects = await sheetsAPI.getAllProjects();
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    await sheetsAPI.initialize(project.spreadsheetId);

    // Get all slides, reorder them, and update
    const slides = await sheetsAPI.getSlidesByProject(projectId);

    if (fromIndex < 0 || toIndex < 0 || fromIndex >= slides.length || toIndex >= slides.length) {
      return false;
    }

    // Reorder the slides array
    const reorderedSlides = [...slides];
    const [movedSlide] = reorderedSlides.splice(fromIndex, 1);
    reorderedSlides.splice(toIndex, 0, movedSlide);

    // Update order property for all slides
    for (let i = 0; i < reorderedSlides.length; i++) {
      await sheetsAPI.updateSlide(reorderedSlides[i].id, { order: i });
    }

    return true;
  }

  /**
   * Generate unique ID with prefix
   */
  private generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }
}

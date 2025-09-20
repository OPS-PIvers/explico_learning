/**
 * ProjectManager Client Service for Explico Learning
 * Handles client-side project management and communication with the server.
 */

import { Project, Slide } from '../../shared/types';

declare const google: {
  script: {
    run: {
      createNewProject(projectData: any): Promise<Project>;
      openProject(projectId: string): Promise<Project & { slides: Slide[] }>;
      saveCurrentProject(project: Project): Promise<boolean>;
      deleteProject(projectId: string): Promise<boolean>;
      duplicateProject(projectId: string): Promise<Project>;
      getAllProjects(): Promise<Project[]>;
      createSlide(slideData: any): Promise<Slide>;
      selectSlide(slideId: string): Promise<Slide>;
      deleteSlide(slideId: string): Promise<boolean>;
      updateSlideBackground(
        slideId: string,
        backgroundUrl: string,
        backgroundType: string
      ): Promise<Slide>;
      reorderSlides(fromIndex: number, toIndex: number): Promise<boolean>;
    };
  };
};

interface ProjectManagerOptions {
  [key: string]: any;
}

interface ComponentReferences {
  dashboard?: any;
  header?: any;
  sidebar?: any;
  canvas?: any;
  configPanel?: any;
  sequencer?: any;
}

export class ProjectManager {
  private options: ProjectManagerOptions;
  private currentProject: (Project & { slides: Slide[] }) | null;
  private currentSlide: Slide | null;
  private isInitialized: boolean;
  private eventListeners: Map<string, Function[]>;

  // Component references (set by application)
  private dashboard: any | null;
  private header: any | null;
  private sidebar: any | null;
  private canvas: any | null;
  private configPanel: any | null;
  private sequencer: any | null;

  constructor(options: ProjectManagerOptions = {}) {
    this.options = {
      ...options,
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
   */
  initialize(components: ComponentReferences = {}): void {
    this.setComponents(components);
    this.isInitialized = true;
    console.log('ProjectManager client initialized successfully');
  }

  /**
   * Set component references
   */
  setComponents(components: ComponentReferences = {}): void {
    this.dashboard = components.dashboard || null;
    this.header = components.header || null;
    this.sidebar = components.sidebar || null;
    this.canvas = components.canvas || null;
    this.configPanel = components.configPanel || null;
    this.sequencer = components.sequencer || null;

    this.setupComponentEventHandlers();
  }

  /**
   * Setup component event handlers
   */
  private setupComponentEventHandlers(): void {
    if (this.dashboard && this.dashboard.options) {
      this.dashboard.options.onProjectSelect = (project: Project) => this.openProject(project.id);
      this.dashboard.options.onProjectCreate = () => this.createNewProject();
      this.dashboard.options.onProjectEdit = (project: Project) => this.openProject(project.id);
      this.dashboard.options.onProjectDelete = (project: Project) => this.deleteProject(project.id);
      this.dashboard.options.onProjectDuplicate = (project: Project) =>
        this.duplicateProject(project.id);
    }

    if (this.header && this.header.options) {
      this.header.options.onSave = () => this.saveCurrentProject();
      this.header.options.onShare = () => this.shareCurrentProject();
    }

    if (this.sidebar && this.sidebar.options) {
      this.sidebar.options.onSlideSelect = (slideId: string) => this.selectSlide(slideId);
      this.sidebar.options.onSlideAdd = () => this.createNewSlide();
      this.sidebar.options.onSlideDelete = (slideId: string) => this.deleteSlide(slideId);
      this.sidebar.options.onSlideReorder = (fromIndex: number, toIndex: number) =>
        this.reorderSlides(fromIndex, toIndex);
    }
  }

  /**
   * Create a new project
   */
  async createNewProject(projectData: any = {}): Promise<Project> {
    return await google.script.run.createNewProject(projectData);
  }

  /**
   * Open an existing project
   */
  async openProject(projectId: string): Promise<Project & { slides: Slide[] }> {
    const project = await google.script.run.openProject(projectId);
    this.currentProject = project;
    this.currentSlide = project.slides[0] || null;
    this.syncProjectToComponents();
    return project;
  }

  /**
   * Save current project
   */
  async saveCurrentProject(): Promise<boolean> {
    if (!this.currentProject) {
      console.warn('No current project to save');
      return false;
    }
    return await google.script.run.saveCurrentProject(this.currentProject);
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<boolean> {
    return await google.script.run.deleteProject(projectId);
  }

  /**
   * Duplicate a project
   */
  async duplicateProject(projectId: string): Promise<Project> {
    return await google.script.run.duplicateProject(projectId);
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<Project[]> {
    return await google.script.run.getAllProjects();
  }

  /**
   * Create a new slide
   */
  async createSlide(slideData: any = {}): Promise<Slide> {
    return await google.script.run.createSlide(slideData);
  }

  /**
   * Create a new slide for current project
   */
  async createNewSlide(): Promise<Slide | null> {
    if (!this.currentProject) {
      console.warn('No current project to create slide for');
      return null;
    }

    const slideData = {
      projectId: this.currentProject.id,
      title: `Slide ${this.currentProject.slides.length + 1}`,
      order: this.currentProject.slides.length,
    };

    const newSlide = await this.createSlide(slideData);

    // Add to current project slides
    this.currentProject.slides.push(newSlide);
    this.syncSlidesToSidebar();

    return newSlide;
  }

  /**
   * Select a slide
   */
  async selectSlide(slideId: string): Promise<Slide> {
    const slide = await google.script.run.selectSlide(slideId);
    this.currentSlide = slide;
    this.syncSlideToComponents();
    return slide;
  }

  /**
   * Delete a slide
   */
  async deleteSlide(slideId: string): Promise<boolean> {
    const result = await google.script.run.deleteSlide(slideId);

    if (result && this.currentProject) {
      // Remove from current project slides
      const slideIndex = this.currentProject.slides.findIndex((s) => s.id === slideId);
      if (slideIndex !== -1) {
        this.currentProject.slides.splice(slideIndex, 1);
        this.syncSlidesToSidebar();

        // Select first slide if current slide was deleted
        if (this.currentSlide?.id === slideId) {
          this.currentSlide = this.currentProject.slides[0] || null;
          if (this.currentSlide) {
            this.syncSlideToComponents();
          }
        }
      }
    }

    return result;
  }

  /**
   * Update slide background
   */
  async updateSlideBackground(
    slideId: string,
    backgroundUrl: string,
    backgroundType: string
  ): Promise<Slide> {
    return await google.script.run.updateSlideBackground(slideId, backgroundUrl, backgroundType);
  }

  /**
   * Reorder slides
   */
  async reorderSlides(fromIndex: number, toIndex: number): Promise<boolean> {
    return await google.script.run.reorderSlides(fromIndex, toIndex);
  }

  /**
   * Share current project
   */
  async shareCurrentProject(): Promise<void> {
    if (!this.currentProject) {
      console.warn('No current project to share');
      return;
    }

    // Implementation for sharing project
    console.log('Sharing project:', this.currentProject.id);
  }

  /**
   * Sync project data to components
   */
  private syncProjectToComponents(): void {
    if (!this.currentProject) return;

    if (this.header && this.header.setTitle) {
      this.header.setTitle(this.currentProject.title);
    }

    this.syncSlidesToSidebar();
  }

  /**
   * Sync slides to sidebar
   */
  private syncSlidesToSidebar(): void {
    if (!this.sidebar || !this.currentProject) return;

    if (this.sidebar.setSlides) {
      this.sidebar.setSlides(this.currentProject.slides || []);
    }
  }

  /**
   * Sync slide data to components
   */
  private syncSlideToComponents(): void {
    if (!this.currentSlide) return;

    if (this.canvas && this.canvas.setBackground) {
      this.canvas.setBackground(this.currentSlide.mediaUrl, this.currentSlide.mediaType);
    }
  }

  /**
   * Get current project
   */
  getCurrentProject(): (Project & { slides: Slide[] }) | null {
    return this.currentProject;
  }

  /**
   * Get current slide
   */
  getCurrentSlide(): Slide | null {
    return this.currentSlide;
  }

  /**
   * Check if initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

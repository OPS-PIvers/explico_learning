// Google Apps Script client-side API type definitions
import { Project, Slide, Hotspot } from '../../shared/types';

export interface GoogleAppsScriptAPI {
  script: {
    run: {
      // Project Dashboard API
      getProjects(): Promise<Project[]>;
      createProject(title: string, description: string): Promise<Project>;
      deleteProject(id: string): Promise<void>;

      // Hotspot Editor API
      getProjectData(projectId: string): Promise<{
        project: Project;
        slides: Slide[];
        hotspots: Hotspot[];
      }>;
      saveHotspots(projectId: string, hotspots: Hotspot[]): Promise<void>;
      saveSlides(projectId: string, slides: Slide[]): Promise<void>;
    } & {
      withSuccessHandler<T>(callback: (result: T) => void): GoogleAppsScriptRunner<T>;
      withFailureHandler(callback: (error: any) => void): GoogleAppsScriptRunner<any>;
    };
  };
}

interface GoogleAppsScriptRunner<T> {
  withSuccessHandler<U>(callback: (result: U) => void): GoogleAppsScriptRunner<U>;
  withFailureHandler(callback: (error: any) => void): GoogleAppsScriptRunner<T>;
  getProjects(): void;
  createProject(title: string, description: string): void;
  deleteProject(id: string): void;
  getProjectData(projectId: string): void;
  saveHotspots(projectId: string, hotspots: Hotspot[]): void;
  saveSlides(projectId: string, slides: Slide[]): void;
}

// Extend global Window interface
declare global {
  interface Window {
    google: GoogleAppsScriptAPI;
    projectId?: string;
  }
}

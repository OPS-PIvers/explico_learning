// Main entry point for Google Apps Script
// Migrated from Code.gs to TypeScript

import { PROJECT_DEFAULTS } from '../shared/constants';
import { Project } from '../shared/types';

// Google Apps Script global declarations
declare const HtmlService: GoogleAppsScript.HTML.HtmlService;
declare const DriveApp: GoogleAppsScript.Drive.DriveApp;
declare const SpreadsheetApp: GoogleAppsScript.Spreadsheet.SpreadsheetApp;

/**
 * Main entry point for web app requests
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  const page = e.parameter.page || 'dashboard';
  const projectId = e.parameter.project;

  try {
    switch (page) {
      case 'dashboard':
        return HtmlService.createTemplateFromFile('main-app')
          .evaluate()
          .setTitle('Explico Learning - Projects')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

      case 'editor':
        if (!projectId) {
          throw new Error('Project ID required for editor');
        }
        const template = HtmlService.createTemplateFromFile('editor-template');
        template.projectId = projectId;
        return template.evaluate()
          .setTitle('Explico Learning - Editor')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

      default:
        throw new Error(`Unknown page: ${page}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('doGet error: ' + errorMessage);
    return HtmlService.createHtmlOutput(`
      <div style="padding: 20px; text-align: center; color: #721c24; background: #f8d7da; margin: 20px; border-radius: 4px;">
        <h2>🚫 Application Error</h2>
        <p>Error: ${errorMessage}</p>
        <button onclick="window.location.reload()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `);
  }
}

/**
 * Include HTML files for templates
 */
function include(filename: string): string {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get all projects for the current user
 */
function getProjects(): Project[] {
  try {
    // TODO: Implement actual project loading from Google Sheets
    // For now, return sample data
    const sampleProject: Project = {
      id: 'sample-project-1',
      title: 'Sample Project',
      description: 'This is a sample project created during TypeScript migration',
      createdAt: new Date(),
      updatedAt: new Date(),
      spreadsheetId: 'sample-spreadsheet-id',
      settings: PROJECT_DEFAULTS.settings
    };

    return [sampleProject];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('getProjects error: ' + errorMessage);
    throw new Error('Failed to load projects: ' + errorMessage);
  }
}

/**
 * Create a new project
 */
function createProject(title: string, description: string): Project {
  try {
    // TODO: Implement actual project creation with Google Sheets
    const projectId = `proj_${Utilities.getUuid()}`;

    const newProject: Project = {
      id: projectId,
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      spreadsheetId: createProjectSpreadsheet(title),
      settings: PROJECT_DEFAULTS.settings
    };

    Logger.log(`Created project: ${projectId}`);
    return newProject;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('createProject error: ' + errorMessage);
    throw new Error('Failed to create project: ' + errorMessage);
  }
}

/**
 * Delete a project and its associated data
 */
function deleteProject(projectId: string): void {
  try {
    // TODO: Implement actual project deletion
    Logger.log(`Deleted project: ${projectId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('deleteProject error: ' + errorMessage);
    throw new Error('Failed to delete project: ' + errorMessage);
  }
}

/**
 * Get project data including slides and hotspots
 */
function getProjectData(projectId: string): any {
  try {
    // TODO: Implement actual data loading from Google Sheets
    return {
      project: {
        id: projectId,
        title: 'Sample Project',
        description: 'Sample project for testing',
        createdAt: new Date(),
        updatedAt: new Date(),
        spreadsheetId: 'sample-spreadsheet',
        settings: PROJECT_DEFAULTS.settings
      },
      slides: [
        {
          id: 'slide-1',
          projectId: projectId,
          title: 'Sample Slide',
          mediaType: 'image',
          mediaUrl: 'https://via.placeholder.com/800x600/007bff/ffffff?text=Sample+Image',
          order: 0,
          transition: 'fade'
        }
      ],
      hotspots: []
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('getProjectData error: ' + errorMessage);
    throw new Error('Failed to load project data: ' + errorMessage);
  }
}

/**
 * Save hotspots for a project
 */
function saveHotspots(projectId: string, hotspots: any[]): void {
  try {
    // TODO: Implement actual saving to Google Sheets
    Logger.log(`Saved ${hotspots.length} hotspots for project: ${projectId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('saveHotspots error: ' + errorMessage);
    throw new Error('Failed to save hotspots: ' + errorMessage);
  }
}

/**
 * Save slides for a project
 */
function saveSlides(projectId: string, slides: any[]): void {
  try {
    // TODO: Implement actual saving to Google Sheets
    Logger.log(`Saved ${slides.length} slides for project: ${projectId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('saveSlides error: ' + errorMessage);
    throw new Error('Failed to save slides: ' + errorMessage);
  }
}

/**
 * Create a new Google Spreadsheet for project data
 */
function createProjectSpreadsheet(projectTitle: string): string {
  try {
    const spreadsheet = SpreadsheetApp.create(`${projectTitle} - Explico Data`);
    const spreadsheetId = spreadsheet.getId();

    // Set up initial sheet structure
    setupSpreadsheetStructure(spreadsheet);

    Logger.log(`Created spreadsheet: ${spreadsheetId} for project: ${projectTitle}`);
    return spreadsheetId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('createProjectSpreadsheet error: ' + errorMessage);
    throw new Error('Failed to create project spreadsheet: ' + errorMessage);
  }
}

/**
 * Set up the basic structure for a project spreadsheet
 */
function setupSpreadsheetStructure(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  try {
    // Create and set up Projects sheet
    const projectsSheet = spreadsheet.getActiveSheet();
    projectsSheet.setName('Projects');
    projectsSheet.getRange(1, 1, 1, 7).setValues([
      ['ID', 'Title', 'Description', 'Created', 'Updated', 'SpreadsheetId', 'Settings']
    ]);

    // Create Slides sheet
    const slidesSheet = spreadsheet.insertSheet('Slides');
    slidesSheet.getRange(1, 1, 1, 8).setValues([
      ['ID', 'ProjectID', 'Order', 'Title', 'MediaType', 'MediaURL', 'Duration', 'Transition']
    ]);

    // Create Hotspots sheet
    const hotspotsSheet = spreadsheet.insertSheet('Hotspots');
    hotspotsSheet.getRange(1, 1, 1, 11).setValues([
      ['ID', 'SlideID', 'X', 'Y', 'Width', 'Height', 'EventType', 'TriggerType', 'Config', 'Order', 'Visible']
    ]);

    // Create Analytics sheet
    const analyticsSheet = spreadsheet.insertSheet('Analytics');
    analyticsSheet.getRange(1, 1, 1, 6).setValues([
      ['ID', 'ProjectID', 'SlideID', 'HotspotID', 'Timestamp', 'Action']
    ]);

    Logger.log('Spreadsheet structure created successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('setupSpreadsheetStructure error: ' + errorMessage);
    throw new Error('Failed to set up spreadsheet structure: ' + errorMessage);
  }
}

// Export functions for global access in Google Apps Script
// @ts-ignore
globalThis.doGet = doGet;
// @ts-ignore
globalThis.include = include;
// @ts-ignore
globalThis.getProjects = getProjects;
// @ts-ignore
globalThis.createProject = createProject;
// @ts-ignore
globalThis.deleteProject = deleteProject;
// @ts-ignore
globalThis.getProjectData = getProjectData;
// @ts-ignore
globalThis.saveHotspots = saveHotspots;
// @ts-ignore
globalThis.saveSlides = saveSlides;
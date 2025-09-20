/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/* unused harmony exports doGet, include, getProjects, createProject, deleteProject, getProjectData, saveHotspots, saveSlides */
// Main entry point for Google Apps Script
// Migrated from Code.gs to TypeScript

// Inline constants for GAS compatibility
var PROJECT_DEFAULTS = {
  settings: {
    autoSave: true,
    version: '1.0.0',
    theme: 'light',
    analytics: true
  }
};

// Google Apps Script globals are available via @types/google-apps-script

// Project interface for GAS compatibility

/**
 * Main entry point for web app requests
 */
function doGet(e) {
  var page = e.parameter.page || 'dashboard';
  var projectId = e.parameter.project;
  try {
    switch (page) {
      case 'dashboard':
        return HtmlService.createTemplateFromFile('main-app').evaluate().setTitle('Explico Learning - Projects').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      case 'editor':
        if (!projectId) {
          throw new Error('Project ID required for editor');
        }
        var template = HtmlService.createTemplateFromFile('editor-template');
        template.projectId = projectId;
        return template.evaluate().setTitle('Explico Learning - Editor').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      default:
        throw new Error("Unknown page: ".concat(page));
    }
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('doGet error: ' + errorMessage);
    return HtmlService.createHtmlOutput("\n      <div style=\"padding: 20px; text-align: center; color: #721c24; background: #f8d7da; margin: 20px; border-radius: 4px;\">\n        <h2>\uD83D\uDEAB Application Error</h2>\n        <p>Error: ".concat(errorMessage, "</p>\n        <button onclick=\"window.location.reload()\" style=\"padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;\">\n          Reload Page\n        </button>\n      </div>\n    "));
  }
}

/**
 * Include HTML files for templates
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get all projects for the current user
 */
function getProjects() {
  try {
    // TODO: Implement actual project loading from Google Sheets
    // For now, return sample data
    var sampleProject = {
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
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('getProjects error: ' + errorMessage);
    throw new Error('Failed to load projects: ' + errorMessage);
  }
}

/**
 * Create a new project
 */
function createProject(title, description) {
  try {
    // TODO: Implement actual project creation with Google Sheets
    var projectId = "proj_".concat(Utilities.getUuid());
    var newProject = {
      id: projectId,
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      spreadsheetId: createProjectSpreadsheet(title),
      settings: PROJECT_DEFAULTS.settings
    };
    Logger.log("Created project: ".concat(projectId));
    return newProject;
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('createProject error: ' + errorMessage);
    throw new Error('Failed to create project: ' + errorMessage);
  }
}

/**
 * Delete a project and its associated data
 */
function deleteProject(projectId) {
  try {
    // TODO: Implement actual project deletion
    Logger.log("Deleted project: ".concat(projectId));
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('deleteProject error: ' + errorMessage);
    throw new Error('Failed to delete project: ' + errorMessage);
  }
}

/**
 * Get project data including slides and hotspots
 */
function getProjectData(projectId) {
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
      slides: [{
        id: 'slide-1',
        projectId: projectId,
        title: 'Sample Slide',
        mediaType: 'image',
        mediaUrl: 'https://via.placeholder.com/800x600/007bff/ffffff?text=Sample+Image',
        order: 0,
        transition: 'fade'
      }],
      hotspots: []
    };
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('getProjectData error: ' + errorMessage);
    throw new Error('Failed to load project data: ' + errorMessage);
  }
}

/**
 * Save hotspots for a project
 */
function saveHotspots(projectId, hotspots) {
  try {
    // TODO: Implement actual saving to Google Sheets
    Logger.log("Saved ".concat(hotspots.length, " hotspots for project: ").concat(projectId));
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('saveHotspots error: ' + errorMessage);
    throw new Error('Failed to save hotspots: ' + errorMessage);
  }
}

/**
 * Save slides for a project
 */
function saveSlides(projectId, slides) {
  try {
    // TODO: Implement actual saving to Google Sheets
    Logger.log("Saved ".concat(slides.length, " slides for project: ").concat(projectId));
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('saveSlides error: ' + errorMessage);
    throw new Error('Failed to save slides: ' + errorMessage);
  }
}

/**
 * Create a new Google Spreadsheet for project data
 */
function createProjectSpreadsheet(projectTitle) {
  try {
    var spreadsheet = SpreadsheetApp.create("".concat(projectTitle, " - Explico Data"));
    var spreadsheetId = spreadsheet.getId();

    // Set up initial sheet structure
    setupSpreadsheetStructure(spreadsheet);
    Logger.log("Created spreadsheet: ".concat(spreadsheetId, " for project: ").concat(projectTitle));
    return spreadsheetId;
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('createProjectSpreadsheet error: ' + errorMessage);
    throw new Error('Failed to create project spreadsheet: ' + errorMessage);
  }
}

/**
 * Set up the basic structure for a project spreadsheet
 */
function setupSpreadsheetStructure(spreadsheet) {
  try {
    // Create and set up Projects sheet
    var projectsSheet = spreadsheet.getActiveSheet();
    projectsSheet.setName('Projects');
    projectsSheet.getRange(1, 1, 1, 7).setValues([['ID', 'Title', 'Description', 'Created', 'Updated', 'SpreadsheetId', 'Settings']]);

    // Create Slides sheet
    var slidesSheet = spreadsheet.insertSheet('Slides');
    slidesSheet.getRange(1, 1, 1, 8).setValues([['ID', 'ProjectID', 'Order', 'Title', 'MediaType', 'MediaURL', 'Duration', 'Transition']]);

    // Create Hotspots sheet
    var hotspotsSheet = spreadsheet.insertSheet('Hotspots');
    hotspotsSheet.getRange(1, 1, 1, 11).setValues([['ID', 'SlideID', 'X', 'Y', 'Width', 'Height', 'EventType', 'TriggerType', 'Config', 'Order', 'Visible']]);

    // Create Analytics sheet
    var analyticsSheet = spreadsheet.insertSheet('Analytics');
    analyticsSheet.getRange(1, 1, 1, 6).setValues([['ID', 'ProjectID', 'SlideID', 'HotspotID', 'Timestamp', 'Action']]);
    Logger.log('Spreadsheet structure created successfully');
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('setupSpreadsheetStructure error: ' + errorMessage);
    throw new Error('Failed to set up spreadsheet structure: ' + errorMessage);
  }
}

// Functions are automatically exported by gas-webpack-plugin
// No manual global exports needed
/******/ })()
;
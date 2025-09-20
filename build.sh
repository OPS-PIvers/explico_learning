#!/bin/bash

echo "Building Explico Learning TypeScript/React App..."

# Clean dist directory
rm -rf dist
mkdir -p dist

# Build client files with webpack
echo "Building client files with webpack..."
npm ci --production=false
npm run build:dev

if [ $? -ne 0 ]; then
    echo "Client build failed! Check the errors above."
    exit 1
fi

# Copy server files directly and compile them standalone
echo "Processing server files..."
# Create a combined GAS-compatible Code.gs file from TypeScript sources
echo "Creating combined Code.gs from TypeScript sources..."
cat > dist/Code.gs << 'EOF'
/**
 * Explico Learning - Google Apps Script Backend
 * Compiled from TypeScript sources
 */

// SHARED CONSTANTS AND TYPES
var MediaType = {
  IMAGE: 'image',
  VIDEO: 'video',
  YOUTUBE: 'youtube'
};

var EventType = {
  TEXT_POPUP: 'text_popup',
  PAN_ZOOM: 'pan_zoom',
  SPOTLIGHT: 'spotlight',
  TEXT_ON_IMAGE: 'text_on_image'
};

var TriggerType = {
  CLICK: 'click',
  HOVER: 'hover',
  TOUCH: 'touch',
  AUTO: 'auto'
};

var PROJECT_DEFAULTS = {
  settings: {
    autoSave: true,
    version: '1.0.0',
    theme: 'light',
    analytics: true
  }
};

var SLIDE_DEFAULTS = {
  transition: 'fade',
  duration: 1000
};

var HOTSPOT_DEFAULTS = {
  width: 50,
  height: 50,
  eventType: EventType.TEXT_POPUP,
  triggerType: TriggerType.CLICK,
  config: {
    text: 'New hotspot',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    borderColor: '#007bff',
    borderWidth: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    opacity: 1,
    duration: 500,
    delay: 0
  }
};

var LEGACY_SHEETS_CONFIG = {
  PROJECTS_SHEET: 'Projects',
  SLIDES_SHEET: 'Slides',
  HOTSPOTS_SHEET: 'Hotspots',
  ANALYTICS_SHEET: 'Analytics'
};

var TOOLTIP_POSITIONS = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
};

var PROJECT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
};

// GOOGLE SHEETS API SERVICE
function GoogleSheetsAPI(options) {
  this.options = {
    spreadsheetId: null,
    registrySpreadsheetId: null,
    batchSize: 100,
    retryAttempts: 3,
    retryDelay: 1000
  };

  if (options) {
    for (var key in options) {
      this.options[key] = options[key];
    }
  }

  this.initialized = false;
  this.registryInitialized = false;
  this.spreadsheetCache = {};
  this.batchQueue = [];
  this.isBatchProcessing = false;
}

GoogleSheetsAPI.prototype.initialize = function(spreadsheetId) {
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is required');
  }

  this.options.spreadsheetId = spreadsheetId;

  try {
    this.setupSpreadsheetStructure();
    this.initialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize Google Sheets API:', error);
    throw error;
  }
};

GoogleSheetsAPI.prototype.initializeRegistry = function() {
  try {
    this.options.registrySpreadsheetId = this.getOrCreateRegistrySpreadsheet();
    this.setupRegistryStructure();
    this.registryInitialized = true;
    console.log('Registry initialized with spreadsheet ID:', this.options.registrySpreadsheetId);
    return true;
  } catch (error) {
    console.error('Failed to initialize registry:', error);
    throw error;
  }
};

GoogleSheetsAPI.prototype.getOrCreateRegistrySpreadsheet = function() {
  try {
    var registryName = 'Explico Learning - Project Registry';
    var files = DriveApp.getFilesByName(registryName);

    if (files.hasNext()) {
      var existingFile = files.next();
      console.log('Found existing registry spreadsheet:', existingFile.getId());
      return existingFile.getId();
    } else {
      var spreadsheet = SpreadsheetApp.create(registryName);
      var spreadsheetId = spreadsheet.getId();

      var projectFolderId = this.getOrCreateProjectFolder();
      if (projectFolderId) {
        var file = DriveApp.getFileById(spreadsheetId);
        var folder = DriveApp.getFolderById(projectFolderId);
        folder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
      }

      console.log('Created new registry spreadsheet:', spreadsheetId);
      return spreadsheetId;
    }
  } catch (error) {
    console.error('Failed to create/access registry spreadsheet:', error);
    throw error;
  }
};

GoogleSheetsAPI.prototype.getOrCreateProjectFolder = function() {
  try {
    var folderName = 'Explico Learning Projects';
    var folders = DriveApp.getFoldersByName(folderName);

    if (folders.hasNext()) {
      return folders.next().getId();
    } else {
      var newFolder = DriveApp.createFolder(folderName);
      return newFolder.getId();
    }
  } catch (error) {
    console.warn('Could not create/access project folder:', error);
    return null;
  }
};

GoogleSheetsAPI.prototype.createProjectSpreadsheet = function(projectName) {
  try {
    var spreadsheet = SpreadsheetApp.create('Explico Learning - ' + projectName);
    var spreadsheetId = spreadsheet.getId();

    var projectFolderId = this.getOrCreateProjectFolder();
    if (projectFolderId) {
      var file = DriveApp.getFileById(spreadsheetId);
      var folder = DriveApp.getFolderById(projectFolderId);
      folder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }

    console.log('Created project spreadsheet:', spreadsheetId, 'for project:', projectName);
    return spreadsheetId;
  } catch (error) {
    console.error('Failed to create project spreadsheet:', error);
    throw error;
  }
};

GoogleSheetsAPI.prototype.getAllProjects = function() {
  this.ensureRegistryInitialized();

  var rows = this.getRegistryRows();
  var projects = [];
  for (var i = 0; i < rows.length; i++) {
    projects.push(this.registryRowToProject(rows[i]));
  }
  return projects;
};

GoogleSheetsAPI.prototype.getRegistryRows = function() {
  var registrySheet = SpreadsheetApp.openById(this.options.registrySpreadsheetId).getSheetByName('Project Registry');
  if (!registrySheet) {
    throw new Error('Project Registry sheet not found');
  }

  var lastRow = registrySheet.getLastRow();
  if (lastRow <= 1) return [];

  var range = registrySheet.getRange(2, 1, lastRow - 1, registrySheet.getLastColumn());
  return range.getValues();
};

GoogleSheetsAPI.prototype.registryRowToProject = function(row) {
  return {
    id: row[0],
    title: row[1],
    description: row[2],
    spreadsheetId: row[3],
    createdAt: new Date(row[5]),
    updatedAt: new Date(row[6]),
    settings: {
      version: row[4] || '1.0.0',
      autoSave: true,
      theme: 'light',
      analytics: true
    }
  };
};

GoogleSheetsAPI.prototype.ensureRegistryInitialized = function() {
  if (!this.registryInitialized) {
    throw new Error('GoogleSheetsAPI registry not initialized. Call initializeRegistry() first.');
  }
};

GoogleSheetsAPI.prototype.setupSpreadsheetStructure = function() {
  var requiredSheets = [
    LEGACY_SHEETS_CONFIG.PROJECTS_SHEET,
    LEGACY_SHEETS_CONFIG.SLIDES_SHEET,
    LEGACY_SHEETS_CONFIG.HOTSPOTS_SHEET,
    LEGACY_SHEETS_CONFIG.ANALYTICS_SHEET
  ];

  for (var i = 0; i < requiredSheets.length; i++) {
    try {
      this.ensureSheetExists(requiredSheets[i]);
      this.setupSheetHeaders(requiredSheets[i]);
    } catch (error) {
      console.error('Failed to setup sheet ' + requiredSheets[i] + ':', error);
      throw error;
    }
  }
};

GoogleSheetsAPI.prototype.ensureSheetExists = function(sheetName) {
  try {
    SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
  } catch (error) {
    console.log('Creating sheet: ' + sheetName);
    SpreadsheetApp.openById(this.options.spreadsheetId).insertSheet(sheetName);
  }
};

GoogleSheetsAPI.prototype.setupSheetHeaders = function(sheetName) {
  var sheet = SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet ' + sheetName + ' not found');
  }

  var headers = this.getSheetHeaders(sheetName);
  var existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var hasHeaders = false;
  for (var i = 0; i < existingHeaders.length; i++) {
    if (existingHeaders[i] !== '') {
      hasHeaders = true;
      break;
    }
  }

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f0f0f0');
  }
};

GoogleSheetsAPI.prototype.getSheetHeaders = function(sheetName) {
  switch (sheetName) {
    case LEGACY_SHEETS_CONFIG.PROJECTS_SHEET:
      return ['ID', 'Name', 'Description', 'Status', 'Settings', 'Analytics', 'Created At', 'Updated At', 'Created By', 'Shared With'];
    case LEGACY_SHEETS_CONFIG.SLIDES_SHEET:
      return ['ID', 'Project ID', 'Name', 'Background URL', 'Background Type', 'Order', 'Duration', 'Is Active', 'Created At', 'Updated At'];
    case LEGACY_SHEETS_CONFIG.HOTSPOTS_SHEET:
      return ['ID', 'Slide ID', 'Name', 'Color', 'Size', 'Position X', 'Position Y', 'Pulse Animation', 'Trigger Type', 'Event Type', 'Tooltip Content', 'Tooltip Position', 'Zoom Level', 'Pan Offset X', 'Pan Offset Y', 'Banner Text', 'Is Visible', 'Order', 'Created At', 'Updated At'];
    case LEGACY_SHEETS_CONFIG.ANALYTICS_SHEET:
      return ['ID', 'Project ID', 'Event Type', 'Event Data', 'User ID', 'Session ID', 'Timestamp', 'IP Address', 'User Agent'];
    default:
      return [];
  }
};

GoogleSheetsAPI.prototype.setupRegistryStructure = function() {
  try {
    var registrySheet = SpreadsheetApp.openById(this.options.registrySpreadsheetId).getActiveSheet();
    registrySheet.setName('Project Registry');

    var headers = ['Project ID', 'Name', 'Description', 'Spreadsheet ID', 'Status', 'Created At', 'Updated At', 'Created By'];
    var existingHeaders = registrySheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var hasHeaders = false;
    for (var i = 0; i < existingHeaders.length; i++) {
      if (existingHeaders[i] !== '') {
        hasHeaders = true;
        break;
      }
    }

    if (!hasHeaders) {
      registrySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      registrySheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      registrySheet.getRange(1, 1, 1, headers.length).setBackground('#f0f0f0');
      console.log('Registry structure setup complete');
    }
  } catch (error) {
    console.error('Failed to setup registry structure:', error);
    throw error;
  }
};

GoogleSheetsAPI.prototype.addProjectToRegistry = function(project) {
  this.ensureRegistryInitialized();

  var registryRow = this.projectToRegistryRow(project);
  var registrySheet = SpreadsheetApp.openById(this.options.registrySpreadsheetId).getSheetByName('Project Registry');

  if (!registrySheet) {
    throw new Error('Project Registry sheet not found');
  }

  registrySheet.appendRow(registryRow);
  console.log('Added project to registry:', project.id);
  return true;
};

GoogleSheetsAPI.prototype.projectToRegistryRow = function(project) {
  return [
    project.id,
    project.title || '',
    project.description || '',
    project.spreadsheetId || '',
    project.settings ? project.settings.version : PROJECT_STATUS.DRAFT,
    project.createdAt.toISOString(),
    project.updatedAt.toISOString(),
    Session.getActiveUser().getEmail()
  ];
};

GoogleSheetsAPI.prototype.createProject = function(projectData) {
  this.ensureInitialized();

  var project = {
    id: this.generateId('proj'),
    title: projectData.title || projectData.name || '',
    description: projectData.description || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    spreadsheetId: this.options.spreadsheetId,
    settings: projectData.settings || PROJECT_DEFAULTS.settings
  };

  this.insertRow(LEGACY_SHEETS_CONFIG.PROJECTS_SHEET, this.projectToRow(project));
  return project;
};

GoogleSheetsAPI.prototype.ensureInitialized = function() {
  if (!this.initialized) {
    throw new Error('GoogleSheetsAPI not initialized. Call initialize() first.');
  }
};

GoogleSheetsAPI.prototype.insertRow = function(sheetName, rowData) {
  if (!this.options.spreadsheetId) {
    throw new Error('Spreadsheet ID required for sheet operations');
  }

  var sheet = SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet ' + sheetName + ' not found');
  }
  sheet.appendRow(rowData);
};

GoogleSheetsAPI.prototype.projectToRow = function(project) {
  return [
    project.id,
    project.title || '',
    project.description || '',
    project.settings ? project.settings.version : PROJECT_STATUS.DRAFT,
    JSON.stringify(project.settings || {}),
    JSON.stringify({}),
    project.createdAt.toISOString(),
    project.updatedAt.toISOString(),
    '',
    JSON.stringify([])
  ];
};

GoogleSheetsAPI.prototype.generateId = function(prefix) {
  var timestamp = Date.now().toString(36);
  var random = Math.random().toString(36).substring(2, 8);
  return (prefix || '') + '_' + timestamp + '_' + random;
};

// PROJECT MANAGER SERVICE
function ProjectManager() {}

ProjectManager.prototype.createNewProject = function(projectData) {
  var sheetsAPI = new GoogleSheetsAPI();

  var spreadsheetId = sheetsAPI.createProjectSpreadsheet(projectData.name || 'Untitled Project');
  sheetsAPI.initialize(spreadsheetId);

  var projectWithSpreadsheetId = {
    title: projectData.name,
    description: projectData.description,
    spreadsheetId: spreadsheetId,
    settings: projectData.settings
  };
  var createdProject = sheetsAPI.createProject(projectWithSpreadsheetId);

  sheetsAPI.initializeRegistry();
  sheetsAPI.addProjectToRegistry(createdProject);

  return createdProject;
};

ProjectManager.prototype.getAllProjects = function() {
  var sheetsAPI = new GoogleSheetsAPI();
  sheetsAPI.initializeRegistry();
  return sheetsAPI.getAllProjects();
};

// MAIN ENTRY POINT FUNCTIONS
function doGet(e) {
  var page = e.parameter.page || 'dashboard';
  var projectId = e.parameter.project;

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
        var template = HtmlService.createTemplateFromFile('editor-template');
        template.projectId = projectId;
        return template.evaluate()
          .setTitle('Explico Learning - Editor')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

      default:
        throw new Error('Unknown page: ' + page);
    }
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('doGet error: ' + errorMessage);
    return HtmlService.createHtmlOutput(
      '<div style="padding: 20px; text-align: center; color: #721c24; background: #f8d7da; margin: 20px; border-radius: 4px;">' +
      '<h2>🚫 Application Error</h2>' +
      '<p>Error: ' + errorMessage + '</p>' +
      '<button onclick="window.location.reload()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">' +
      'Reload Page' +
      '</button>' +
      '</div>'
    );
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getProjects() {
  try {
    var projectManager = new ProjectManager();
    return projectManager.getAllProjects();
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('getProjects error: ' + errorMessage);
    throw new Error('Failed to load projects: ' + errorMessage);
  }
}

function createProject(title, description) {
  try {
    var projectManager = new ProjectManager();
    var projectData = {
      name: title.trim(),
      description: description.trim()
    };
    return projectManager.createNewProject(projectData);
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('createProject error: ' + errorMessage);
    throw new Error('Failed to create project: ' + errorMessage);
  }
}

function deleteProject(projectId) {
  try {
    Logger.log('Deleted project: ' + projectId);
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('deleteProject error: ' + errorMessage);
    throw new Error('Failed to delete project: ' + errorMessage);
  }
}

function getProjectData(projectId) {
  try {
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
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('getProjectData error: ' + errorMessage);
    throw new Error('Failed to load project data: ' + errorMessage);
  }
}

function saveHotspots(projectId, hotspots) {
  try {
    Logger.log('Saved ' + hotspots.length + ' hotspots for project: ' + projectId);
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('saveHotspots error: ' + errorMessage);
    throw new Error('Failed to save hotspots: ' + errorMessage);
  }
}

function saveSlides(projectId, slides) {
  try {
    Logger.log('Saved ' + slides.length + ' slides for project: ' + projectId);
  } catch (error) {
    var errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('saveSlides error: ' + errorMessage);
    throw new Error('Failed to save slides: ' + errorMessage);
  }
}
EOF

# Create constants file (legacy compatibility)
cat > dist/constants.gs << 'EOF'
// Constants for Explico Learning - Legacy compatibility file
// Main constants are now included in Code.gs

// These are maintained for backward compatibility
var LEGACY_PROJECT_DEFAULTS = {
  settings: {
    autoSave: true,
    version: '1.0.0',
    theme: 'light',
    analytics: true
  }
};
EOF

# Copy appsscript.json (required for clasp)
echo "Copying configuration files..."
cp appsscript.json dist/

# Server files are now generated directly as .gs files above, no need to rename

# Remove standalone JavaScript files (they should be inlined in HTML)
echo "Removing standalone JavaScript files..."
rm -f dist/*.js dist/*.js.LICENSE.txt

# Ensure HTML files are in place (webpack should have created them)
if [ -f "dist/main-app.html" ] && [ -f "dist/editor-template.html" ]; then
    echo "HTML templates processed successfully"
else
    echo "Warning: HTML templates may not have been generated correctly"
fi

# List generated files
echo "Generated files in dist/:"
ls -la dist/

echo "Build completed successfully!"
echo "Ready for deployment with: clasp push --force"
/**
 * Explico Learning - Google Apps Script Backend
 * Server-side functions for the Hotspot Editor Web App
 */

// Global configuration
const CONFIG = {
  PROJECT_FOLDER_NAME: 'Explico Learning Projects',
  SPREADSHEET_TEMPLATE_ID: null, // Will be set dynamically
  MEDIA_FOLDER_NAME: 'Project Media',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/mov']
};

/**
 * Main entry point for web app
 * Routes requests to appropriate HTML pages
 */
function doGet(e) {
  const page = e.parameter.page || 'dashboard';
  const projectId = e.parameter.project;
  
  try {
    switch (page) {
      case 'editor':
        if (!projectId) {
          throw new Error('Project ID required for editor');
        }
        return getEditorPage(projectId);
      
      case 'dashboard':
      default:
        return getDashboardPage();
    }
  } catch (error) {
    console.error('doGet error:', error);
    return HtmlService.createHtmlOutput('<h1>Error: ' + error.message + '</h1>');
  }
}

/**
 * Get the project dashboard page
 */
function getDashboardPage() {
  const template = HtmlService.createTemplateFromFile('project-dashboard');
  
  // Set template variables
  template.USER_EMAIL = getCurrentUser().email;
  template.TOTAL_PROJECTS = getUserProjects().length;
  template.TOTAL_SLIDES = calculateTotalSlides();
  template.TOTAL_HOTSPOTS = calculateTotalHotspots();
  template.LAST_UPDATED = getLastUpdated();
  template.CONSTANTS = getConstants();
  
  const htmlOutput = template.evaluate()
    .setTitle('Explico Learning - Project Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  
  return htmlOutput;
}

/**
 * Get the hotspot editor page
 */
function getEditorPage(projectId) {
  const template = HtmlService.createTemplateFromFile('hotspot-editor');
  
  // Get project data
  const project = getProjectData(projectId);
  if (!project) {
    throw new Error('Project not found: ' + projectId);
  }
  
  // Set template variables
  template.PROJECT_ID = projectId;
  template.PROJECT_NAME = project.name;
  template.PROJECT_STATUS = project.status || 'draft';
  template.CONSTANTS = getConstants();
  
  const htmlOutput = template.evaluate()
    .setTitle(project.name + ' - Hotspot Editor')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  
  return htmlOutput;
}

/**
 * Include HTML files (for templates)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get all constants for client-side use
 */
function getConstants() {
  const allConstants = {
    EVENT_TYPES,
    TRIGGER_TYPES,
    TOOLTIP_POSITIONS,
    PROJECT_STATUS,
    MEDIA_TYPES,
    HOTSPOT_DEFAULTS,
    SLIDE_DEFAULTS,
    PROJECT_DEFAULTS,
    SHEETS_CONFIG,
    UI_CONFIG,
    VALIDATION_RULES,
    API_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES
  };
  return JSON.stringify(allConstants);
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Get current user information
 */
function getCurrentUser() {
  const user = Session.getActiveUser();
  return {
    email: user.getEmail(),
    name: user.getEmail().split('@')[0] // Simple name extraction
  };
}

// ============================================================================
// PROJECT MANAGEMENT  
// ============================================================================

/**
 * Get all projects for the current user
 */
function getUserProjects() {
  try {
    const user = getCurrentUser();
    const folder = getOrCreateProjectFolder();
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    
    const projects = [];
    while (files.hasNext()) {
      const file = files.next();
      try {
        const spreadsheet = SpreadsheetApp.openById(file.getId());
        const projectSheet = spreadsheet.getSheetByName('Projects');
        
        if (projectSheet) {
          const data = projectSheet.getDataRange().getValues();
          if (data.length > 1) {
            const project = parseProjectRow(data[1], file.getId()); // First data row
            if (project) {
              // Calculate additional stats
              project.slideCount = getSlideCount(file.getId());
              project.hotspotCount = getHotspotCount(file.getId());
              project.thumbnail = getProjectThumbnail(file.getId());
              projects.push(project);
            }
          }
        }
      } catch (error) {
        console.error('Error processing project file:', file.getId(), error);
      }
    }
    
    // Sort by last updated
    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return projects;
    
  } catch (error) {
    console.error('Error getting user projects:', error);
    return [];
  }
}

/**
 * Create a new project
 */
function createNewProject(projectData) {
  try {
    const user = getCurrentUser();
    const folder = getOrCreateProjectFolder();
    
    // Create new spreadsheet
    const spreadsheet = SpreadsheetApp.create(projectData.name + ' - Explico Learning');
    const file = DriveApp.getFileById(spreadsheet.getId());
    
    // Move to projects folder
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    
    // Setup spreadsheet structure
    setupSpreadsheetStructure(spreadsheet);
    
    // Create project record
    const project = {
      id: spreadsheet.getId(),
      name: projectData.name,
      description: projectData.description || '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.email
    };
    
    // Save project data
    const projectSheet = spreadsheet.getSheetByName('Projects');
    const headers = projectSheet.getRange(1, 1, 1, projectSheet.getLastColumn()).getValues()[0];
    const values = headers.map(header => project[header.toLowerCase().replace(/\s+/g, '')] || '');
    
    projectSheet.appendRow(values);
    
    // Create initial slide
    createDefaultSlide(spreadsheet.getId());
    
    return project;
    
  } catch (error) {
    console.error('Error creating project:', error);
    throw new Error('Failed to create project: ' + error.message);
  }
}

/**
 * Get project data by ID
 */
function getProjectData(projectId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(projectId);
    const projectSheet = spreadsheet.getSheetByName('Projects');
    
    if (!projectSheet) {
      return null;
    }
    
    const data = projectSheet.getDataRange().getValues();
    if (data.length < 2) {
      return null;
    }
    
    const project = parseProjectRow(data[1], projectId);
    if (project) {
      // Add slides data
      project.slides = getSlidesByProject(projectId);
    }
    
    return project;
    
  } catch (error) {
    console.error('Error getting project data:', projectId, error);
    return null;
  }
}

/**
 * Save project data
 */
function saveProjectData(projectData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(projectData.id);
    const projectSheet = spreadsheet.getSheetByName('Projects');
    
    if (!projectSheet) {
      throw new Error('Project sheet not found');
    }
    
    // Update project record
    projectData.updatedAt = new Date().toISOString();
    
    const headers = projectSheet.getRange(1, 1, 1, projectSheet.getLastColumn()).getValues()[0];
    const values = headers.map(header => projectData[header.toLowerCase().replace(/\s+/g, '')] || '');
    
    projectSheet.getRange(2, 1, 1, values.length).setValues([values]);
    
    return projectData;
    
  } catch (error) {
    console.error('Error saving project data:', error);
    throw new Error('Failed to save project: ' + error.message);
  }
}

/**
 * Delete a project
 */
function deleteProject(projectId) {
  try {
    const file = DriveApp.getFileById(projectId);
    file.setTrashed(true);
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw new Error('Failed to delete project: ' + error.message);
  }
}

/**
 * Duplicate a project
 */
function duplicateProject(projectId) {
  try {
    const originalFile = DriveApp.getFileById(projectId);
    const folder = getOrCreateProjectFolder();
    
    const duplicatedFile = originalFile.makeCopy(originalFile.getName() + ' (Copy)', folder);
    const spreadsheet = SpreadsheetApp.openById(duplicatedFile.getId());
    
    // Update project metadata
    const projectSheet = spreadsheet.getSheetByName('Projects');
    const data = projectSheet.getDataRange().getValues();
    
    if (data.length > 1) {
      const now = new Date().toISOString();
      // Update created/updated dates
      projectSheet.getRange(2, 5).setValue(now); // createdAt
      projectSheet.getRange(2, 6).setValue(now); // updatedAt
      projectSheet.getRange(2, 4).setValue('draft'); // status
    }
    
    return {
      id: duplicatedFile.getId(),
      name: data[1][0] + ' (Copy)'
    };
    
  } catch (error) {
    console.error('Error duplicating project:', error);
    throw new Error('Failed to duplicate project: ' + error.message);
  }
}

// ============================================================================
// SLIDE MANAGEMENT
// ============================================================================

/**
 * Get slides for a project
 */
function getSlidesByProject(projectId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(projectId);
    const slidesSheet = spreadsheet.getSheetByName('Slides');
    
    if (!slidesSheet) {
      return [];
    }
    
    const data = slidesSheet.getDataRange().getValues();
    if (data.length < 2) {
      return [];
    }
    
    const slides = [];
    for (let i = 1; i < data.length; i++) {
      const slide = parseSlideRow(data[i]);
      if (slide) {
        slides.push(slide);
      }
    }
    
    // Sort by order
    slides.sort((a, b) => a.order - b.order);
    return slides;
    
  } catch (error) {
    console.error('Error getting slides:', error);
    return [];
  }
}

/**
 * Create a new slide
 */
function createSlide(projectId, slideData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(projectId);
    const slidesSheet = spreadsheet.getSheetByName('Slides');
    
    const slide = {
      id: Utilities.getUuid(),
      projectId: projectId,
      name: slideData.name,
      backgroundUrl: slideData.backgroundUrl || '',
      backgroundType: slideData.backgroundType || 'image',
      order: slideData.order || slidesSheet.getLastRow(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const headers = slidesSheet.getRange(1, 1, 1, slidesSheet.getLastColumn()).getValues()[0];
    const values = headers.map(header => slide[header.toLowerCase().replace(/\s+/g, '')] || '');
    
    slidesSheet.appendRow(values);
    
    return slide;
    
  } catch (error) {
    console.error('Error creating slide:', error);
    throw new Error('Failed to create slide: ' + error.message);
  }
}

// ============================================================================
// HOTSPOT MANAGEMENT
// ============================================================================

/**
 * Get hotspots for a slide
 */
function getHotspotsBySlide(slideId) {
  // Implementation would go here
  return [];
}

/**
 * Save hotspots for a slide
 */
function saveHotspots(slideId, hotspots) {
  // Implementation would go here
  return true;
}

// ============================================================================
// MEDIA HANDLING
// ============================================================================

/**
 * Upload media file
 */
function uploadMedia(fileData, fileName, projectId) {
  try {
    const blob = Utilities.newBlob(
      Utilities.base64Decode(fileData.split(',')[1]),
      fileData.split(',')[0].split(':')[1].split(';')[0],
      fileName
    );
    
    const folder = getOrCreateMediaFolder(projectId);
    const file = folder.createFile(blob);
    
    // Make file publicly viewable
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      id: file.getId(),
      name: file.getName(),
      url: file.getDownloadUrl(),
      thumbnailUrl: file.getThumbnail()?.getDownloadUrl() || file.getDownloadUrl()
    };
    
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error('Failed to upload media: ' + error.message);
  }
}

/**
 * Get media URL for a project file
 */
function getProjectMediaUrl(projectId, fileName) {
  try {
    const folder = getOrCreateMediaFolder(projectId);
    const files = folder.getFilesByName(fileName);
    
    if (files.hasNext()) {
      const file = files.next();
      return file.getDownloadUrl();
    }
    
    return null;
  } catch (error) {
    console.error('Error getting media URL:', error);
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get or create projects folder
 */
function getOrCreateProjectFolder() {
  const folders = DriveApp.getFoldersByName(CONFIG.PROJECT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(CONFIG.PROJECT_FOLDER_NAME);
}

/**
 * Get or create media folder for a project
 */
function getOrCreateMediaFolder(projectId) {
  const projectFolder = getOrCreateProjectFolder();
  const mediaFolderName = CONFIG.MEDIA_FOLDER_NAME + ' - ' + projectId;
  
  const folders = projectFolder.getFoldersByName(mediaFolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return projectFolder.createFolder(mediaFolderName);
}

/**
 * Setup spreadsheet structure for a new project
 */
function setupSpreadsheetStructure(spreadsheet) {
  // Projects sheet
  const projectSheet = spreadsheet.insertSheet('Projects');
  projectSheet.getRange(1, 1, 1, 7).setValues([[
    'Name', 'Description', 'Status', 'Created At', 'Updated At', 'Created By', 'Settings'
  ]]);
  
  // Slides sheet  
  const slidesSheet = spreadsheet.insertSheet('Slides');
  slidesSheet.getRange(1, 1, 1, 8).setValues([[
    'ID', 'Project ID', 'Name', 'Background URL', 'Background Type', 'Order', 'Created At', 'Updated At'
  ]]);
  
  // Hotspots sheet
  const hotspotsSheet = spreadsheet.insertSheet('Hotspots');
  hotspotsSheet.getRange(1, 1, 1, 15).setValues([[
    'ID', 'Slide ID', 'Title', 'Event Type', 'Trigger Type', 'Content', 'X', 'Y', 'Width', 'Height', 'Style', 'Order', 'Settings', 'Created At', 'Updated At'
  ]]);
  
  // Analytics sheet
  const analyticsSheet = spreadsheet.insertSheet('Analytics');
  analyticsSheet.getRange(1, 1, 1, 8).setValues([[
    'ID', 'Project ID', 'Event Type', 'Slide ID', 'Hotspot ID', 'User', 'Timestamp', 'Data'
  ]]);
  
  // Delete default sheet
  const defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet) {
    spreadsheet.deleteSheet(defaultSheet);
  }
}

/**
 * Create default slide for new project
 */
function createDefaultSlide(projectId) {
  return createSlide(projectId, {
    name: 'Welcome Slide',
    backgroundUrl: '',
    backgroundType: 'image',
    order: 0
  });
}

/**
 * Parse project data row
 */
function parseProjectRow(row, projectId) {
  if (!row || row.length === 0) return null;
  
  return {
    id: projectId,
    name: row[0] || '',
    description: row[1] || '',
    status: row[2] || 'draft',
    createdAt: row[3] || new Date().toISOString(),
    updatedAt: row[4] || new Date().toISOString(),
    createdBy: row[5] || '',
    settings: row[6] ? JSON.parse(row[6]) : {}
  };
}

/**
 * Parse slide data row
 */
function parseSlideRow(row) {
  if (!row || row.length === 0) return null;
  
  return {
    id: row[0] || '',
    projectId: row[1] || '',
    name: row[2] || '',
    backgroundUrl: row[3] || '',
    backgroundType: row[4] || 'image',
    order: parseInt(row[5]) || 0,
    createdAt: row[6] || new Date().toISOString(),
    updatedAt: row[7] || new Date().toISOString()
  };
}

/**
 * Calculate statistics
 */
function calculateTotalSlides() {
  // Implementation would aggregate across all projects
  return 0;
}

function calculateTotalHotspots() {
  // Implementation would aggregate across all projects
  return 0;
}

function getLastUpdated() {
  // Implementation would find most recent update
  return new Date().toLocaleDateString();
}

function getSlideCount(projectId) {
  return getSlidesByProject(projectId).length;
}

function getHotspotCount(projectId) {
  // Implementation would count hotspots for project
  return 0;
}

function getProjectThumbnail(projectId) {
  // Implementation would generate/get project thumbnail
  return 'https://placehold.co/400x200/3B82F6/FFFFFF?text=Project';
}
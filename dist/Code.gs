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
 * Main entry point for web app - Single Page Application
 * Returns the main app that handles all views client-side
 */
function doGet(e) {
  try {
    console.log('🚀 Loading Explico Learning Single Page App');
    
    const template = HtmlService.createTemplateFromFile('main-app');
    
    // Get constants for the template
    try {
      template.CONSTANTS = getConstants();
      console.log('✅ Constants loaded for main app template');
    } catch (constantsError) {
      console.error('❌ Error loading constants for main app:', constantsError);
      template.CONSTANTS = JSON.stringify({
        EVENT_TYPES: { TEXT_POPUP: 'text_popup', TEXT_ON_IMAGE: 'text_on_image' },
        TRIGGER_TYPES: { CLICK: 'click', HOVER: 'hover' },
        PROJECT_STATUS: { DRAFT: 'draft', PUBLISHED: 'published' }
      });
    }
    
    console.log('📄 Evaluating main app template...');
    const htmlOutput = template.evaluate()
      .setTitle('Explico Learning - Interactive Walkthroughs')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    console.log('✅ Single page app generated successfully');
    return htmlOutput;
    
  } catch (error) {
    console.error('❌ Error in doGet (single page app):', error);
    
    // Return a simple error page
    const errorHtml = HtmlService.createHtmlOutput(`
      <html>
        <head>
          <title>Explico Learning - Error</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 600px; 
              margin: 50px auto; 
              padding: 20px; 
              text-align: center; 
            }
            .error { 
              background: #fee; 
              border: 1px solid #fcc; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0;
            }
            .btn { 
              display: inline-block; 
              padding: 10px 20px; 
              margin: 10px; 
              text-decoration: none; 
              border-radius: 4px; 
              background: #007cba; 
              color: white; 
            }
          </style>
        </head>
        <body>
          <h1>🚨 Explico Learning</h1>
          <div class="error">
            <h3>Application Error</h3>
            <p><strong>Details:</strong> ${error.message}</p>
            <p>The application failed to load properly.</p>
          </div>
          <a href="javascript:location.reload()" class="btn">Refresh Page</a>
        </body>
      </html>
    `).setTitle('Explico Learning - Error')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return errorHtml;
  }
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
// PROJECT MANAGEMENT (exposed to client)
// ============================================================================

function createNewProject(projectData) {
  const projectManager = new ProjectManager_server();
  return projectManager.createNewProject(projectData);
}

function openProject(projectId) {
  const projectManager = new ProjectManager_server();
  return projectManager.openProject(projectId);
}

function saveCurrentProject(projectData) {
  const projectManager = new ProjectManager_server();
  return projectManager.saveCurrentProject(projectData);
}

function deleteProject(projectId) {
  const projectManager = new ProjectManager_server();
  return projectManager.deleteProject(projectId);
}

function duplicateProject(projectId) {
  const projectManager = new ProjectManager_server();
  return projectManager.duplicateProject(projectId);
}

function getAllProjects() {
  const projectManager = new ProjectManager_server();
  return projectManager.getAllProjects();
}

function getUserProjects() {
  const projectManager = new ProjectManager_server();
  return projectManager.getAllProjects();
}

function createSlide(slideData) {
  const projectManager = new ProjectManager_server();
  return projectManager.createSlide(slideData);
}

function selectSlide(slideId) {
  const projectManager = new ProjectManager_server();
  return projectManager.selectSlide(slideId);
}

function deleteSlide(slideId) {
  const projectManager = new ProjectManager_server();
  return projectManager.deleteSlide(slideId);
}

function updateSlideBackground(slideId, backgroundUrl, backgroundType) {
  const projectManager = new ProjectManager_server();
  return projectManager.updateSlideBackground(slideId, backgroundUrl, backgroundType);
}

function reorderSlides(fromIndex, toIndex) {
  const projectManager = new ProjectManager_server();
  return projectManager.reorderSlides(fromIndex, toIndex);
}

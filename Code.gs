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
  const startTime = new Date();
  
  try {
    console.log('🔍 Getting project data for ID:', projectId);
    
    if (!projectId) {
      console.error('❌ No project ID provided');
      throw new Error('Project ID is required');
    }
    
    let spreadsheet;
    
    try {
      // Try to open existing spreadsheet
      console.log('📂 Attempting to open spreadsheet:', projectId);
      spreadsheet = SpreadsheetApp.openById(projectId);
      console.log('✅ Spreadsheet opened successfully');
    } catch (error) {
      console.log('⚠️ Spreadsheet not found, creating new one for project:', projectId);
      console.log('📝 Error details:', error.message);
      
      try {
        // If spreadsheet doesn't exist, create it
        spreadsheet = createProjectSpreadsheet(projectId);
        console.log('✅ New spreadsheet created');
      } catch (createError) {
        console.error('❌ Failed to create new spreadsheet:', createError);
        throw new Error('Unable to create or access project spreadsheet: ' + createError.message);
      }
    }
    
    try {
      // Ensure the spreadsheet has the proper structure
      console.log('🔧 Ensuring spreadsheet structure...');
      ensureSpreadsheetStructure(spreadsheet);
      console.log('✅ Spreadsheet structure verified');
    } catch (structureError) {
      console.error('❌ Failed to setup spreadsheet structure:', structureError);
      throw new Error('Spreadsheet structure setup failed: ' + structureError.message);
    }
    
    const projectSheet = spreadsheet.getSheetByName('Projects');
    
    if (!projectSheet) {
      console.error('❌ Projects sheet not found after structure setup');
      throw new Error('Projects sheet could not be created or accessed');
    }
    
    try {
      const data = projectSheet.getDataRange().getValues();
      console.log('📊 Project sheet data rows:', data.length);
      
      if (data.length < 2) {
        console.log('📝 No project data exists, creating default project record...');
        
        // If no project data exists, create a default project record
        const currentUser = getCurrentUser();
        const defaultProject = {
          id: projectId,
          name: 'Untitled Project',
          description: '',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: currentUser.email
        };
        
        // Add the project record to the sheet
        const headers = projectSheet.getRange(1, 1, 1, projectSheet.getLastColumn()).getValues()[0];
        const values = headers.map(header => {
          const key = header.toLowerCase().replace(/\s+/g, '');
          return defaultProject[key] || '';
        });
        projectSheet.appendRow(values);
        
        console.log('✅ Default project record created');
        
        // Add default slide data
        defaultProject.slides = [];
        
        return defaultProject;
      }
      
      const project = parseProjectRow(data[1], projectId);
      if (!project) {
        console.error('❌ Failed to parse project data');
        throw new Error('Invalid project data format');
      }
      
      console.log('📋 Project parsed:', {
        name: project.name,
        status: project.status,
        createdAt: project.createdAt
      });
      
      // Add slides data with error handling
      try {
        console.log('📄 Loading slides for project...');
        project.slides = getSlidesByProject(projectId, spreadsheet);
        console.log('✅ Loaded', (project.slides || []).length, 'slides');
      } catch (slidesError) {
        console.error('⚠️ Error loading slides:', slidesError);
        project.slides = []; // Fallback to empty array
      }
      
      const endTime = new Date();
      const duration = endTime - startTime;
      console.log('✅ Project data loaded successfully in', duration, 'ms');
      
      return project;
      
    } catch (dataError) {
      console.error('❌ Error reading project data:', dataError);
      throw new Error('Failed to read project data: ' + dataError.message);
    }
    
  } catch (error) {
    const endTime = new Date();
    const duration = endTime - startTime;
    console.error('❌ Error getting project data after', duration, 'ms:', error);
    
    // Re-throw with more context
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      throw new Error(`Project "${projectId}" was not found or has been deleted.`);
    } else if (error.message.includes('Authorization') || error.message.includes('permission')) {
      throw new Error('You do not have permission to access this project.');
    } else {
      throw new Error('Failed to load project: ' + error.message);
    }
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
function getSlidesByProject(projectId, spreadsheet = null) {
  try {
    if (!spreadsheet) {
      spreadsheet = SpreadsheetApp.openById(projectId);
    }
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
  try {
    if (!slideId) {
      return [];
    }

    // Extract project ID from slideId (assuming format: proj_xxx_slide_yyy)
    var projectId = slideId.split('_slide_')[0];
    
    var spreadsheet = SpreadsheetApp.openById(projectId);
    var hotspotsSheet = spreadsheet.getSheetByName(SHEETS_CONFIG.HOTSPOTS_SHEET);
    
    if (!hotspotsSheet) {
      console.log('Hotspots sheet not found for project:', projectId);
      return [];
    }

    var dataRange = hotspotsSheet.getDataRange();
    if (dataRange.getNumRows() <= 1) {
      return []; // No data beyond headers
    }

    var values = dataRange.getValues();
    var headers = values[0];
    var hotspots = [];

    // Process each row (skip header row)
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      
      // Check if this hotspot belongs to the requested slide
      if (row[1] === slideId) { // SLIDE_ID is column B (index 1)
        var hotspot = {
          id: row[0], // ID
          slideId: row[1], // SLIDE_ID
          name: row[2] || '', // NAME
          color: row[3] || HOTSPOT_DEFAULTS.color, // COLOR
          size: row[4] || HOTSPOT_DEFAULTS.size, // SIZE
          position: {
            x: parseFloat(row[5]) || 50, // POSITION_X
            y: parseFloat(row[6]) || 50  // POSITION_Y
          },
          pulseAnimation: row[7] !== false, // PULSE_ANIMATION
          triggerType: row[8] || HOTSPOT_DEFAULTS.triggerType, // TRIGGER_TYPE
          eventType: row[9] || HOTSPOT_DEFAULTS.eventType, // EVENT_TYPE
          tooltipContent: row[10] || '', // TOOLTIP_CONTENT
          tooltipPosition: row[11] || TOOLTIP_POSITIONS.BOTTOM, // TOOLTIP_POSITION
          zoomLevel: parseFloat(row[12]) || 1, // ZOOM_LEVEL
          panOffset: {
            x: parseFloat(row[13]) || 0, // PAN_OFFSET_X
            y: parseFloat(row[14]) || 0  // PAN_OFFSET_Y
          },
          bannerText: row[15] || '', // BANNER_TEXT
          isVisible: row[16] !== false, // IS_VISIBLE
          order: parseInt(row[17]) || 0, // ORDER
          createdAt: row[18], // CREATED_AT
          updatedAt: row[19]  // UPDATED_AT
        };
        
        hotspots.push(hotspot);
      }
    }

    return hotspots;
  } catch (error) {
    console.error('Error getting hotspots for slide:', slideId, error);
    return [];
  }
}

/**
 * Save hotspots for a slide
 */
function saveHotspots(slideId, hotspots) {
  try {
    if (!slideId || !Array.isArray(hotspots)) {
      throw new Error('Invalid parameters: slideId and hotspots array required');
    }

    // Extract project ID from slideId
    var projectId = slideId.split('_slide_')[0];
    
    var spreadsheet = SpreadsheetApp.openById(projectId);
    var hotspotsSheet = spreadsheet.getSheetByName(SHEETS_CONFIG.HOTSPOTS_SHEET);
    
    if (!hotspotsSheet) {
      // Create hotspots sheet if it doesn't exist
      hotspotsSheet = spreadsheet.insertSheet(SHEETS_CONFIG.HOTSPOTS_SHEET);
      var headers = [
        'ID', 'SLIDE_ID', 'NAME', 'COLOR', 'SIZE', 'POSITION_X', 'POSITION_Y',
        'PULSE_ANIMATION', 'TRIGGER_TYPE', 'EVENT_TYPE', 'TOOLTIP_CONTENT',
        'TOOLTIP_POSITION', 'ZOOM_LEVEL', 'PAN_OFFSET_X', 'PAN_OFFSET_Y',
        'BANNER_TEXT', 'IS_VISIBLE', 'ORDER', 'CREATED_AT', 'UPDATED_AT'
      ];
      hotspotsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Get all existing data
    var dataRange = hotspotsSheet.getDataRange();
    var existingData = [];
    
    if (dataRange.getNumRows() > 1) {
      var values = dataRange.getValues();
      // Keep hotspots from other slides
      for (var i = 1; i < values.length; i++) {
        if (values[i][1] !== slideId) { // Keep if not this slideId
          existingData.push(values[i]);
        }
      }
    }

    // Convert hotspots to rows
    var newRows = [];
    var now = new Date().toISOString();
    
    for (var i = 0; i < hotspots.length; i++) {
      var hotspot = hotspots[i];
      
      // Generate ID if missing
      if (!hotspot.id) {
        hotspot.id = 'hotspot_' + Utilities.getUuid();
      }
      
      var row = [
        hotspot.id,
        slideId,
        hotspot.name || '',
        hotspot.color || HOTSPOT_DEFAULTS.color,
        hotspot.size || HOTSPOT_DEFAULTS.size,
        (hotspot.position && hotspot.position.x) || 50,
        (hotspot.position && hotspot.position.y) || 50,
        hotspot.pulseAnimation !== false,
        hotspot.triggerType || HOTSPOT_DEFAULTS.triggerType,
        hotspot.eventType || HOTSPOT_DEFAULTS.eventType,
        hotspot.tooltipContent || '',
        hotspot.tooltipPosition || TOOLTIP_POSITIONS.BOTTOM,
        hotspot.zoomLevel || 1,
        (hotspot.panOffset && hotspot.panOffset.x) || 0,
        (hotspot.panOffset && hotspot.panOffset.y) || 0,
        hotspot.bannerText || '',
        hotspot.isVisible !== false,
        hotspot.order || i,
        hotspot.createdAt || now,
        now // Always update updatedAt
      ];
      
      newRows.push(row);
    }

    // Clear all data except headers
    if (dataRange.getNumRows() > 1) {
      hotspotsSheet.getRange(2, 1, dataRange.getNumRows() - 1, dataRange.getNumColumns()).clear();
    }

    // Write all data (existing + new)
    var allRows = existingData.concat(newRows);
    if (allRows.length > 0) {
      hotspotsSheet.getRange(2, 1, allRows.length, 20).setValues(allRows);
    }

    return true;
  } catch (error) {
    console.error('Error saving hotspots for slide:', slideId, error);
    return false;
  }
}

/**
 * Create a new hotspot
 */
function createHotspot(slideId, hotspotData) {
  try {
    if (!slideId || !hotspotData) {
      throw new Error('Invalid parameters: slideId and hotspotData required');
    }

    // Generate unique ID
    var hotspotId = 'hotspot_' + Utilities.getUuid();
    var now = new Date().toISOString();

    // Create hotspot object with defaults
    var hotspot = {
      id: hotspotId,
      slideId: slideId,
      name: hotspotData.name || HOTSPOT_DEFAULTS.name,
      color: hotspotData.color || HOTSPOT_DEFAULTS.color,
      size: hotspotData.size || HOTSPOT_DEFAULTS.size,
      position: {
        x: (hotspotData.position && hotspotData.position.x) || 50,
        y: (hotspotData.position && hotspotData.position.y) || 50
      },
      pulseAnimation: hotspotData.pulseAnimation !== false,
      triggerType: hotspotData.triggerType || HOTSPOT_DEFAULTS.triggerType,
      eventType: hotspotData.eventType || HOTSPOT_DEFAULTS.eventType,
      tooltipContent: hotspotData.tooltipContent || '',
      tooltipPosition: hotspotData.tooltipPosition || TOOLTIP_POSITIONS.BOTTOM,
      zoomLevel: hotspotData.zoomLevel || 1,
      panOffset: {
        x: (hotspotData.panOffset && hotspotData.panOffset.x) || 0,
        y: (hotspotData.panOffset && hotspotData.panOffset.y) || 0
      },
      bannerText: hotspotData.bannerText || '',
      isVisible: hotspotData.isVisible !== false,
      order: hotspotData.order || 0,
      createdAt: now,
      updatedAt: now
    };

    // Extract project ID from slideId
    var projectId = slideId.split('_slide_')[0];
    
    var spreadsheet = SpreadsheetApp.openById(projectId);
    var hotspotsSheet = spreadsheet.getSheetByName(SHEETS_CONFIG.HOTSPOTS_SHEET);
    
    if (!hotspotsSheet) {
      // Create hotspots sheet if it doesn't exist
      hotspotsSheet = spreadsheet.insertSheet(SHEETS_CONFIG.HOTSPOTS_SHEET);
      var headers = [
        'ID', 'SLIDE_ID', 'NAME', 'COLOR', 'SIZE', 'POSITION_X', 'POSITION_Y',
        'PULSE_ANIMATION', 'TRIGGER_TYPE', 'EVENT_TYPE', 'TOOLTIP_CONTENT',
        'TOOLTIP_POSITION', 'ZOOM_LEVEL', 'PAN_OFFSET_X', 'PAN_OFFSET_Y',
        'BANNER_TEXT', 'IS_VISIBLE', 'ORDER', 'CREATED_AT', 'UPDATED_AT'
      ];
      hotspotsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Convert hotspot to row
    var row = [
      hotspot.id,
      hotspot.slideId,
      hotspot.name,
      hotspot.color,
      hotspot.size,
      hotspot.position.x,
      hotspot.position.y,
      hotspot.pulseAnimation,
      hotspot.triggerType,
      hotspot.eventType,
      hotspot.tooltipContent,
      hotspot.tooltipPosition,
      hotspot.zoomLevel,
      hotspot.panOffset.x,
      hotspot.panOffset.y,
      hotspot.bannerText,
      hotspot.isVisible,
      hotspot.order,
      hotspot.createdAt,
      hotspot.updatedAt
    ];

    // Add to sheet
    hotspotsSheet.appendRow(row);

    return hotspot;
  } catch (error) {
    console.error('Error creating hotspot:', error);
    throw error;
  }
}

/**
 * Update an existing hotspot
 */
function updateHotspot(hotspotId, updates) {
  try {
    if (!hotspotId || !updates) {
      throw new Error('Invalid parameters: hotspotId and updates required');
    }

    // Find the hotspot across all projects (need to search multiple spreadsheets)
    // For now, assume slideId is provided in updates to identify project
    if (!updates.slideId) {
      throw new Error('slideId required in updates to identify project');
    }

    var projectId = updates.slideId.split('_slide_')[0];
    var spreadsheet = SpreadsheetApp.openById(projectId);
    var hotspotsSheet = spreadsheet.getSheetByName(SHEETS_CONFIG.HOTSPOTS_SHEET);
    
    if (!hotspotsSheet) {
      throw new Error('Hotspots sheet not found');
    }

    var dataRange = hotspotsSheet.getDataRange();
    if (dataRange.getNumRows() <= 1) {
      throw new Error('Hotspot not found');
    }

    var values = dataRange.getValues();
    var hotspotRowIndex = -1;
    var existingHotspot = null;

    // Find the hotspot row
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === hotspotId) {
        hotspotRowIndex = i + 1; // Sheet rows are 1-indexed
        existingHotspot = {
          id: values[i][0],
          slideId: values[i][1],
          name: values[i][2],
          color: values[i][3],
          size: values[i][4],
          position: {
            x: parseFloat(values[i][5]) || 50,
            y: parseFloat(values[i][6]) || 50
          },
          pulseAnimation: values[i][7] !== false,
          triggerType: values[i][8],
          eventType: values[i][9],
          tooltipContent: values[i][10],
          tooltipPosition: values[i][11],
          zoomLevel: parseFloat(values[i][12]) || 1,
          panOffset: {
            x: parseFloat(values[i][13]) || 0,
            y: parseFloat(values[i][14]) || 0
          },
          bannerText: values[i][15],
          isVisible: values[i][16] !== false,
          order: parseInt(values[i][17]) || 0,
          createdAt: values[i][18],
          updatedAt: values[i][19]
        };
        break;
      }
    }

    if (hotspotRowIndex === -1) {
      throw new Error('Hotspot not found');
    }

    // Merge updates with existing hotspot
    var updatedHotspot = {
      id: existingHotspot.id,
      slideId: existingHotspot.slideId,
      name: updates.name !== undefined ? updates.name : existingHotspot.name,
      color: updates.color !== undefined ? updates.color : existingHotspot.color,
      size: updates.size !== undefined ? updates.size : existingHotspot.size,
      position: {
        x: (updates.position && updates.position.x !== undefined) ? updates.position.x : existingHotspot.position.x,
        y: (updates.position && updates.position.y !== undefined) ? updates.position.y : existingHotspot.position.y
      },
      pulseAnimation: updates.pulseAnimation !== undefined ? updates.pulseAnimation : existingHotspot.pulseAnimation,
      triggerType: updates.triggerType !== undefined ? updates.triggerType : existingHotspot.triggerType,
      eventType: updates.eventType !== undefined ? updates.eventType : existingHotspot.eventType,
      tooltipContent: updates.tooltipContent !== undefined ? updates.tooltipContent : existingHotspot.tooltipContent,
      tooltipPosition: updates.tooltipPosition !== undefined ? updates.tooltipPosition : existingHotspot.tooltipPosition,
      zoomLevel: updates.zoomLevel !== undefined ? updates.zoomLevel : existingHotspot.zoomLevel,
      panOffset: {
        x: (updates.panOffset && updates.panOffset.x !== undefined) ? updates.panOffset.x : existingHotspot.panOffset.x,
        y: (updates.panOffset && updates.panOffset.y !== undefined) ? updates.panOffset.y : existingHotspot.panOffset.y
      },
      bannerText: updates.bannerText !== undefined ? updates.bannerText : existingHotspot.bannerText,
      isVisible: updates.isVisible !== undefined ? updates.isVisible : existingHotspot.isVisible,
      order: updates.order !== undefined ? updates.order : existingHotspot.order,
      createdAt: existingHotspot.createdAt,
      updatedAt: new Date().toISOString()
    };

    // Convert to row
    var row = [
      updatedHotspot.id,
      updatedHotspot.slideId,
      updatedHotspot.name,
      updatedHotspot.color,
      updatedHotspot.size,
      updatedHotspot.position.x,
      updatedHotspot.position.y,
      updatedHotspot.pulseAnimation,
      updatedHotspot.triggerType,
      updatedHotspot.eventType,
      updatedHotspot.tooltipContent,
      updatedHotspot.tooltipPosition,
      updatedHotspot.zoomLevel,
      updatedHotspot.panOffset.x,
      updatedHotspot.panOffset.y,
      updatedHotspot.bannerText,
      updatedHotspot.isVisible,
      updatedHotspot.order,
      updatedHotspot.createdAt,
      updatedHotspot.updatedAt
    ];

    // Update the row
    hotspotsSheet.getRange(hotspotRowIndex, 1, 1, 20).setValues([row]);

    return updatedHotspot;
  } catch (error) {
    console.error('Error updating hotspot:', hotspotId, error);
    throw error;
  }
}

/**
 * Delete a hotspot
 */
function deleteHotspot(hotspotId, slideId) {
  try {
    if (!hotspotId) {
      throw new Error('hotspotId required');
    }

    // If slideId provided, use it to identify project
    if (slideId) {
      var projectId = slideId.split('_slide_')[0];
      return deleteHotspotFromProject(hotspotId, projectId);
    }

    // If no slideId provided, we need to search all user projects
    // This is less efficient but more flexible
    var folder = getOrCreateProjectFolder();
    var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    
    while (files.hasNext()) {
      var file = files.next();
      try {
        if (deleteHotspotFromProject(hotspotId, file.getId())) {
          return true;
        }
      } catch (error) {
        // Continue searching in other projects
        continue;
      }
    }

    return false; // Hotspot not found in any project
  } catch (error) {
    console.error('Error deleting hotspot:', hotspotId, error);
    return false;
  }
}

/**
 * Helper function to delete hotspot from a specific project
 */
function deleteHotspotFromProject(hotspotId, projectId) {
  try {
    var spreadsheet = SpreadsheetApp.openById(projectId);
    var hotspotsSheet = spreadsheet.getSheetByName(SHEETS_CONFIG.HOTSPOTS_SHEET);
    
    if (!hotspotsSheet) {
      return false;
    }

    var dataRange = hotspotsSheet.getDataRange();
    if (dataRange.getNumRows() <= 1) {
      return false;
    }

    var values = dataRange.getValues();

    // Find the hotspot row
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === hotspotId) {
        // Delete the row
        hotspotsSheet.deleteRow(i + 1);
        return true;
      }
    }

    return false;
  } catch (error) {
    throw error;
  }
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
 * Setup headers for a specific sheet
 */
function setupSheetHeaders(sheet, sheetName) {
  let headers = [];
  
  switch (sheetName) {
    case 'Projects':
      headers = ['Name', 'Description', 'Status', 'Created At', 'Updated At', 'Created By', 'Settings'];
      break;
    case 'Slides':
      headers = ['ID', 'Project ID', 'Name', 'Background URL', 'Background Type', 'Order', 'Created At', 'Updated At'];
      break;
    case 'Hotspots':
      headers = ['ID', 'Slide ID', 'Title', 'Event Type', 'Trigger Type', 'Content', 'X', 'Y', 'Width', 'Height', 'Style', 'Order', 'Settings', 'Created At', 'Updated At'];
      break;
    case 'Analytics':
      headers = ['ID', 'Project ID', 'Event Type', 'Slide ID', 'Hotspot ID', 'User', 'Timestamp', 'Data'];
      break;
  }
  
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f0f0f0');
  }
}

/**
 * Create a new spreadsheet for a project with the given ID
 * This handles cases where a project ID exists but no spreadsheet was created
 */
function createProjectSpreadsheet(projectId) {
  try {
    // Create new spreadsheet with a descriptive name
    const spreadsheet = SpreadsheetApp.create('Explico Learning Project');
    
    // Get the file and move it to the projects folder  
    const file = DriveApp.getFileById(spreadsheet.getId());
    const folder = getOrCreateProjectFolder();
    
    // Move to projects folder
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    
    console.log('Created new spreadsheet for missing project:', projectId, 'with actual ID:', spreadsheet.getId());
    
    // Setup the initial structure
    setupSpreadsheetStructure(spreadsheet);
    
    return spreadsheet;
    
  } catch (error) {
    console.error('Error creating project spreadsheet:', error);
    throw new Error('Failed to create project spreadsheet: ' + error.message);
  }
}

/**
 * Ensure spreadsheet has the proper structure (for existing projects)
 */
function ensureSpreadsheetStructure(spreadsheet) {
  const requiredSheets = ['Projects', 'Slides', 'Hotspots', 'Analytics'];
  
  requiredSheets.forEach(sheetName => {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      console.log(`Creating missing sheet: ${sheetName}`);
      sheet = spreadsheet.insertSheet(sheetName);
      setupSheetHeaders(sheet, sheetName);
    } else {
      // Check if sheet has headers
      const lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        setupSheetHeaders(sheet, sheetName);
      }
    }
  });
  
  // Remove default sheet if it exists and we have our required sheets
  const defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && spreadsheet.getSheets().length > 1) {
    try {
      spreadsheet.deleteSheet(defaultSheet);
    } catch (e) {
      // Ignore if we can't delete it
    }
  }
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
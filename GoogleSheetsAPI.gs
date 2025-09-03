/**
 * GoogleSheetsAPI Service for Explico Learning
 * Handles all Google Sheets data persistence operations for Google Apps Script
 */

function GoogleSheetsAPI(options) {
  options = options || {};
  this.options = {
    spreadsheetId: null, // Will be set per project
    batchSize: 100,
    retryAttempts: 3,
    retryDelay: 1000
  };
  this.options = Object.assign(this.options, options);

  this.initialized = false;
  this.spreadsheetCache = {}; // Replaced Map with Object
  this.batchQueue = [];
  this.isBatchProcessing = false;
}
  
  /**
   * Initialize the Google Sheets API service
   * @param {string} spreadsheetId - Google Sheets spreadsheet ID
   * @returns {Promise<boolean>} Success status
   */
GoogleSheetsAPI.prototype.initialize = function(spreadsheetId) {
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is required');
  }

  this.options.spreadsheetId = spreadsheetId;

  try {
    // Verify spreadsheet access and create sheets if needed
    this.setupSpreadsheetStructure();
    this.initialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize Google Sheets API:', error);
    throw error;
  }
};
  
  /**
   * Setup spreadsheet structure with required sheets
   * @returns {Promise<void>}
   */
GoogleSheetsAPI.prototype.setupSpreadsheetStructure = function() {
  var requiredSheets = [
    SHEETS_CONFIG.PROJECTS_SHEET,
    SHEETS_CONFIG.SLIDES_SHEET,
    SHEETS_CONFIG.HOTSPOTS_SHEET,
    SHEETS_CONFIG.ANALYTICS_SHEET
  ];

  for (var i = 0; i < requiredSheets.length; i++) {
    var sheetName = requiredSheets[i];
    try {
      this.ensureSheetExists(sheetName);
      this.setupSheetHeaders(sheetName);
    } catch (error) {
      console.error('Failed to setup sheet ' + sheetName + ':', error);
      throw error;
    }
  }
};

/**
 * Ensure a sheet exists, create if it doesn't
 * @param {string} sheetName - Name of the sheet
 */
GoogleSheetsAPI.prototype.ensureSheetExists = function(sheetName) {
  try {
    // Get the specific spreadsheet, not the "active" one
    var spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      console.log('Creating sheet: ' + sheetName);
      spreadsheet.insertSheet(sheetName);
    }
  } catch (error) {
    console.error('Error ensuring sheet exists: ' + sheetName, error);
    throw error;
  }
};

/**
 * Setup headers for a sheet
 * @param {string} sheetName - Name of the sheet
 */
GoogleSheetsAPI.prototype.setupSheetHeaders = function(sheetName) {
  var spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);
  var headers = this.getSheetHeaders(sheetName);

  // Check if headers already exist
  var existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var hasHeaders = existingHeaders.some(function(header) { return header !== ''; });

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f0f0f0');
  }
};
  
GoogleSheetsAPI.prototype.getSheetHeaders = function(sheetName) {
  switch (sheetName) {
    case SHEETS_CONFIG.PROJECTS_SHEET:
      return [
        'ID', 'Name', 'Description', 'Status', 'Settings',
        'Analytics', 'Created At', 'Updated At', 'Created By', 'Shared With'
      ];

    case SHEETS_CONFIG.SLIDES_SHEET:
      return [
        'ID', 'Project ID', 'Name', 'Background URL', 'Background Type',
        'Order', 'Duration', 'Is Active', 'Created At', 'Updated At'
      ];

    case SHEETS_CONFIG.HOTSPOTS_SHEET:
      return [
        'ID', 'Slide ID', 'Name', 'Color', 'Size', 'Position X', 'Position Y',
        'Pulse Animation', 'Trigger Type', 'Event Type', 'Tooltip Content',
        'Tooltip Position', 'Zoom Level', 'Pan Offset X', 'Pan Offset Y',
        'Banner Text', 'Is Visible', 'Order', 'Created At', 'Updated At'
      ];

    case SHEETS_CONFIG.ANALYTICS_SHEET:
      return [
        'ID', 'Project ID', 'Event Type', 'Event Data', 'User ID',
        'Session ID', 'Timestamp', 'IP Address', 'User Agent'
      ];

    default:
      return [];
  }
};

GoogleSheetsAPI.prototype.createProject = function(projectData) {
  this.ensureInitialized();

  var project = Object.assign({}, PROJECT_DEFAULTS, projectData, {
    id: this.generateId('proj'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  this.insertRow(SHEETS_CONFIG.PROJECTS_SHEET, this.projectToRow(project));
  return project;
};

GoogleSheetsAPI.prototype.updateProject = function(projectId, updates) {
  this.ensureInitialized();

  var existingProject = this.getProject(projectId);
  if (!existingProject) {
    throw new Error('Project ' + projectId + ' not found');
  }

  var updatedProject = Object.assign({}, existingProject, updates, {
    updatedAt: new Date().toISOString()
  });

  this.updateRowById(SHEETS_CONFIG.PROJECTS_SHEET, projectId, this.projectToRow(updatedProject));
  return updatedProject;
};

GoogleSheetsAPI.prototype.getProject = function(projectId) {
  this.ensureInitialized();
  var row = this.getRowById(SHEETS_CONFIG.PROJECTS_SHEET, projectId);
  return row ? this.rowToProject(row) : null;
};

GoogleSheetsAPI.prototype.getAllProjects = function() {
  this.ensureInitialized();
  var self = this;
  var rows = this.getAllRows(SHEETS_CONFIG.PROJECTS_SHEET);
  return rows.map(function(row) {
    return self.rowToProject(row);
  });
};

GoogleSheetsAPI.prototype.deleteProject = function(projectId) {
  this.ensureInitialized();

  this.deleteHotspotsByProject(projectId);
  this.deleteSlidesByProject(projectId);
  this.deleteRowById(SHEETS_CONFIG.PROJECTS_SHEET, projectId);

  return true;
};

GoogleSheetsAPI.prototype.createSlide = function(slideData) {
  this.ensureInitialized();

  var slide = Object.assign({}, SLIDE_DEFAULTS, slideData, {
    id: this.generateId('slide'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  this.insertRow(SHEETS_CONFIG.SLIDES_SHEET, this.slideToRow(slide));
  return slide;
};

GoogleSheetsAPI.prototype.updateSlide = function(slideId, updates) {
  this.ensureInitialized();

  var existingSlide = this.getSlide(slideId);
  if (!existingSlide) {
    throw new Error('Slide ' + slideId + ' not found');
  }

  var updatedSlide = Object.assign({}, existingSlide, updates, {
    updatedAt: new Date().toISOString()
  });

  this.updateRowById(SHEETS_CONFIG.SLIDES_SHEET, slideId, this.slideToRow(updatedSlide));
  return updatedSlide;
};

GoogleSheetsAPI.prototype.getSlidesByProject = function(projectId) {
  this.ensureInitialized();
  var self = this;
  var allRows = this.getAllRows(SHEETS_CONFIG.SLIDES_SHEET);
  var projectSlides = allRows.filter(function(row) {
    return row[1] === projectId;
  });
  return projectSlides.map(function(row) {
    return self.rowToSlide(row);
  });
};

GoogleSheetsAPI.prototype.getSlide = function(slideId) {
  this.ensureInitialized();
  var row = this.getRowById(SHEETS_CONFIG.SLIDES_SHEET, slideId);
  return row ? this.rowToSlide(row) : null;
};

GoogleSheetsAPI.prototype.deleteSlidesByProject = function(projectId) {
  this.ensureInitialized();

  var slides = this.getSlidesByProject(projectId);

  for (var i = 0; i < slides.length; i++) {
    this.deleteHotspotsBySlide(slides[i].id);
  }

  this.deleteRowsByColumn(SHEETS_CONFIG.SLIDES_SHEET, 'B', projectId);

  return true;
};

GoogleSheetsAPI.prototype.saveHotspots = function(hotspots) {
  this.ensureInitialized();

  if (!Array.isArray(hotspots) || hotspots.length === 0) {
    return true;
  }
  var self = this;
  var batches = this.chunkArray(hotspots, this.options.batchSize);

  for (var i = 0; i < batches.length; i++) {
    var batch = batches[i];
    var operations = batch.map(function(hotspot) {
      return {
        type: 'upsert',
        sheet: SHEETS_CONFIG.HOTSPOTS_SHEET,
        id: hotspot.id,
        data: self.hotspotToRow(hotspot)
      };
    });

    this.processBatch(operations);
  }

  return true;
};

GoogleSheetsAPI.prototype.getHotspotsBySlide = function(slideId) {
  this.ensureInitialized();
  var self = this;
  var allRows = this.getAllRows(SHEETS_CONFIG.HOTSPOTS_SHEET);
  var slideHotspots = allRows.filter(function(row) {
    return row[1] === slideId;
  });
  return slideHotspots.map(function(row) {
    return self.rowToHotspot(row);
  })
  .sort(function(a, b) {
    return (a.order || 0) - (b.order || 0);
  });
};

GoogleSheetsAPI.prototype.deleteHotspotsBySlide = function(slideId) {
  this.ensureInitialized();
  this.deleteRowsByColumn(SHEETS_CONFIG.HOTSPOTS_SHEET, 'B', slideId);
  return true;
};

GoogleSheetsAPI.prototype.deleteHotspotsByProject = function(projectId) {
  this.ensureInitialized();

  var slides = this.getSlidesByProject(projectId);

  for (var i = 0; i < slides.length; i++) {
    this.deleteHotspotsBySlide(slides[i].id);
  }

  return true;
};

GoogleSheetsAPI.prototype.recordAnalytics = function(eventData) {
  this.ensureInitialized();

  var analyticsRow = [
    this.generateId('analytics'),
    eventData.projectId || '',
    eventData.eventType || '',
    JSON.stringify(eventData.data || {}),
    eventData.userId || '',
    eventData.sessionId || '',
    new Date().toISOString(),
    eventData.ipAddress || '',
    eventData.userAgent || ''
  ];

  this.insertRow(SHEETS_CONFIG.ANALYTICS_SHEET, analyticsRow);
  return true;
};

GoogleSheetsAPI.prototype.getAnalytics = function(projectId, options) {
  this.ensureInitialized();
  options = options || {};
  var self = this;

  var allRows = this.getAllRows(SHEETS_CONFIG.ANALYTICS_SHEET);
  var analytics = allRows.filter(function(row) {
    return row[1] === projectId;
  });

  if (options.startDate || options.endDate) {
    analytics = analytics.filter(function(row) {
      var timestamp = new Date(row[6]);
      if (options.startDate && timestamp < new Date(options.startDate)) return false;
      if (options.endDate && timestamp > new Date(options.endDate)) return false;
      return true;
    });
  }

  if (options.limit) {
    analytics = analytics.slice(0, options.limit);
  }

  return analytics.map(function(row) {
    return {
      id: row[0],
      projectId: row[1],
      eventType: row[2],
      data: self.parseJSON(row[3]),
      userId: row[4],
      sessionId: row[5],
      timestamp: row[6],
      ipAddress: row[7],
      userAgent: row[8]
    };
  });
};

GoogleSheetsAPI.prototype.insertRow = function(sheetName, rowData) {
  var spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);
  sheet.appendRow(rowData);
};

GoogleSheetsAPI.prototype.getAllRows = function(sheetName) {
  var spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) return [];

  var range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  return range.getValues();
};

GoogleSheetsAPI.prototype.getRowById = function(sheetName, id) {
  var rows = this.getAllRows(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === id) {
      return rows[i];
    }
  }
  return null;
};

GoogleSheetsAPI.prototype.updateRowById = function(sheetName, id, newData) {
  var spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);
  var rows = this.getAllRows(sheetName);
  var rowIndex = -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === id) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error('Row with ID ' + id + ' not found');
  }

  var actualRowNumber = rowIndex + 2;
  var range = sheet.getRange(actualRowNumber, 1, 1, newData.length);
  range.setValues([newData]);

  return true;
};

GoogleSheetsAPI.prototype.deleteRowById = function(sheetName, id) {
  var spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);
  var rows = this.getAllRows(sheetName);
  var rowIndex = -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === id) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    return false;
  }

  var actualRowNumber = rowIndex + 2;
  sheet.deleteRow(actualRowNumber);

  return true;
};

GoogleSheetsAPI.prototype.deleteRowsByColumn = function(sheetName, column, value) {
  var spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);
  var rows = this.getAllRows(sheetName);
  var columnIndex = this.columnLetterToIndex(column);

  var deletedCount = 0;

  for (var i = rows.length - 1; i >= 0; i--) {
    if (rows[i][columnIndex] === value) {
      var actualRowNumber = i + 2;
      sheet.deleteRow(actualRowNumber);
      deletedCount++;
    }
  }

  return deletedCount;
};

GoogleSheetsAPI.prototype.processBatch = function(operations) {
  for (var i = 0; i < operations.length; i++) {
    var operation = operations[i];
    switch (operation.type) {
      case 'insert':
        this.insertRow(operation.sheet, operation.data);
        break;
      case 'update':
        this.updateRowById(operation.sheet, operation.id, operation.data);
        break;
      case 'upsert':
        var existingRow = this.getRowById(operation.sheet, operation.id);
        if (existingRow) {
          this.updateRowById(operation.sheet, operation.id, operation.data);
        } else {
          this.insertRow(operation.sheet, operation.data);
        }
        break;
      case 'delete':
        this.deleteRowById(operation.sheet, operation.id);
        break;
    }
  }
};

GoogleSheetsAPI.prototype.projectToRow = function(project) {
  return [
    project.id,
    project.name || '',
    project.description || '',
    project.status || PROJECT_STATUS.DRAFT,
    JSON.stringify(project.settings || {}),
    JSON.stringify(project.analytics || {}),
    project.createdAt,
    project.updatedAt,
    project.createdBy || '',
    JSON.stringify(project.sharedWith || [])
  ];
};

GoogleSheetsAPI.prototype.rowToProject = function(row) {
  return {
    id: row[0],
    name: row[1],
    description: row[2],
    status: row[3],
    settings: this.parseJSON(row[4]),
    analytics: this.parseJSON(row[5]),
    createdAt: row[6],
    updatedAt: row[7],
    createdBy: row[8],
    sharedWith: this.parseJSON(row[9])
  };
};

GoogleSheetsAPI.prototype.slideToRow = function(slide) {
  return [
    slide.id,
    slide.projectId,
    slide.name || '',
    slide.backgroundUrl || '',
    slide.backgroundType || MEDIA_TYPES.IMAGE,
    slide.order || 0,
    slide.duration || null,
    slide.isActive || true,
    slide.createdAt,
    slide.updatedAt
  ];
};

GoogleSheetsAPI.prototype.rowToSlide = function(row) {
  return {
    id: row[0],
    projectId: row[1],
    name: row[2],
    backgroundUrl: row[3],
    backgroundType: row[4],
    order: parseInt(row[5]) || 0,
    duration: row[6] || null,
    isActive: row[7] !== false,
    createdAt: row[8],
    updatedAt: row[9]
  };
};

/**
 * Safely gets a nested property value with type checking and default value.
 * @param {Object} obj - The object to access.
 * @param {Array|string} path - The property path (array or dot-separated string).
 * @param {string} type - The expected type of the value.
 * @param {*} defaultValue - The default value to return if not found or type mismatch.
 * @return {*} The property value or defaultValue.
 */
function getProp(obj, path, type, defaultValue) {
  if (typeof path === 'string') {
    path = path.split('.');
  }
  var value = obj;
  for (var i = 0; i < path.length; i++) {
    if (value == null || typeof value !== 'object') {
      return defaultValue;
    }
    value = value[path[i]];
  }
  if (typeof value === type) {
    return value;
  }
  return defaultValue;
}

GoogleSheetsAPI.prototype.hotspotToRow = function(hotspot) {
  var positionX = getProp(hotspot, ['position', 'x'], 'number', 50);
  var positionY = getProp(hotspot, ['position', 'y'], 'number', 50);
  var panOffsetX = getProp(hotspot, ['panOffset', 'x'], 'number', 0);
  var panOffsetY = getProp(hotspot, ['panOffset', 'y'], 'number', 0);

  return [
    hotspot.id,
    hotspot.slideId,
    hotspot.name || '',
    hotspot.color || HOTSPOT_DEFAULTS.color,
    hotspot.size || HOTSPOT_DEFAULTS.size,
    positionX,
    positionY,
    hotspot.pulseAnimation !== false,
    hotspot.triggerType || HOTSPOT_DEFAULTS.triggerType,
    hotspot.eventType || HOTSPOT_DEFAULTS.eventType,
    hotspot.tooltipContent || '',
    hotspot.tooltipPosition || TOOLTIP_POSITIONS.BOTTOM,
    hotspot.zoomLevel || 1,
    panOffsetX,
    panOffsetY,
    hotspot.bannerText || '',
    hotspot.isVisible !== false,
    hotspot.order || 0,
    hotspot.createdAt,
    hotspot.updatedAt
  ];
};

GoogleSheetsAPI.prototype.rowToHotspot = function(row) {
  return {
    id: row[0],
    slideId: row[1],
    name: row[2],
    color: row[3],
    size: parseInt(row[4]) || HOTSPOT_DEFAULTS.size,
    position: {
      x: parseFloat(row[5]) || 50,
      y: parseFloat(row[6]) || 50
    },
    pulseAnimation: row[7] !== false,
    triggerType: row[8],
    eventType: row[9],
    tooltipContent: row[10],
    tooltipPosition: row[11],
    zoomLevel: parseFloat(row[12]) || 1,
    panOffset: {
      x: parseFloat(row[13]) || 0,
      y: parseFloat(row[14]) || 0
    },
    bannerText: row[15],
    isVisible: row[16] !== false,
    order: parseInt(row[17]) || 0,
    createdAt: row[18],
    updatedAt: row[19]
  };
};

GoogleSheetsAPI.prototype.parseJSON = function(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return {};
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString);
    return {};
  }
};

GoogleSheetsAPI.prototype.generateId = function(prefix) {
  prefix = prefix || '';
  var timestamp = Date.now().toString(36);
  var random = Math.random().toString(36).substring(2, 8);
  return prefix + '_' + timestamp + '_' + random;
};

GoogleSheetsAPI.prototype.columnLetterToIndex = function(letter) {
  return letter.toUpperCase().charCodeAt(0) - 65;
};

GoogleSheetsAPI.prototype.chunkArray = function(array, size) {
  var chunks = [];
  for (var i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

GoogleSheetsAPI.prototype.ensureInitialized = function() {
  if (!this.initialized) {
    throw new Error('GoogleSheetsAPI not initialized. Call initialize() first.');
  }
};

GoogleSheetsAPI.prototype.getSpreadsheetId = function() {
  return this.options.spreadsheetId;
};

GoogleSheetsAPI.prototype.clearCache = function() {
  this.spreadsheetCache = {};
};

GoogleSheetsAPI.prototype.getStats = function() {
  return {
    initialized: this.initialized,
    spreadsheetId: this.options.spreadsheetId,
    cacheSize: Object.keys(this.spreadsheetCache).length,
    batchQueueSize: this.batchQueue.length,
    isBatchProcessing: this.isBatchProcessing
  };
};

GoogleSheetsAPI.prototype.destroy = function() {
  this.clearCache();
  this.batchQueue = [];
  this.initialized = false;
};
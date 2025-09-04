/**
 * GoogleSheetsAPI Service for Explico Learning
 * Handles all Google Sheets data persistence operations for Google Apps Script
 */

class GoogleSheetsAPI {
  
  constructor(options = {}) {
    this.options = {
      spreadsheetId: null, // Will be set per project
      batchSize: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };
    
    this.initialized = false;
    this.spreadsheetCache = new Map();
    this.batchQueue = [];
    this.isBatchProcessing = false;
  }
  
  /**
   * Initialize the Google Sheets API service
   * @param {string} spreadsheetId - Google Sheets spreadsheet ID
   * @returns {Promise<boolean>} Success status
   */
  async initialize(spreadsheetId) {
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }
    
    this.options.spreadsheetId = spreadsheetId;
    
    try {
      // Verify spreadsheet access and create sheets if needed
      await this.setupSpreadsheetStructure();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Sheets API:', error);
      throw error;
    }
  }
  
  /**
   * Setup spreadsheet structure with required sheets
   * @returns {Promise<void>}
   */
  async setupSpreadsheetStructure() {
    const requiredSheets = [
      SHEETS_CONFIG.PROJECTS_SHEET,
      SHEETS_CONFIG.SLIDES_SHEET,
      SHEETS_CONFIG.HOTSPOTS_SHEET,
      SHEETS_CONFIG.ANALYTICS_SHEET
    ];
    
    for (const sheetName of requiredSheets) {
      try {
        await this.ensureSheetExists(sheetName);
        await this.setupSheetHeaders(sheetName);
      } catch (error) {
        console.error(`Failed to setup sheet ${sheetName}:`, error);
        throw error;
      }
    }
  }
  
  /**
   * Ensure a sheet exists, create if it doesn't
   * @param {string} sheetName - Name of the sheet
   * @returns {Promise<void>}
   */
  async ensureSheetExists(sheetName) {
    try {
      // Try to get the sheet
      SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
    } catch (error) {
      // Sheet doesn't exist, create it
      console.log(`Creating sheet: ${sheetName}`);
      SpreadsheetApp.openById(this.options.spreadsheetId).insertSheet(sheetName);
    }
  }
  
  /**
   * Setup headers for a sheet
   * @param {string} sheetName - Name of the sheet
   * @returns {Promise<void>}
   */
  async setupSheetHeaders(sheetName) {
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
    const headers = this.getSheetHeaders(sheetName);
    
    // Check if headers already exist
    const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const hasHeaders = existingHeaders.some(header => header !== '');
    
    if (!hasHeaders) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.getRange(1, 1, 1, headers.length).setBackground('#f0f0f0');
    }
  }
  
  /**
   * Get headers for a specific sheet
   * @param {string} sheetName - Name of the sheet
   * @returns {Array<string>} Array of header names
   */
  getSheetHeaders(sheetName) {
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
  }
  
  /**
   * Create a new spreadsheet for a project
   * @param {string} projectName - Name of the project
   * @returns {Promise<string>} Created spreadsheet ID
   */
  async createProjectSpreadsheet(projectName) {
    try {
      // Create new spreadsheet
      const spreadsheet = SpreadsheetApp.create(`Explico Learning - ${projectName}`);
      const spreadsheetId = spreadsheet.getId();
      
      // Move to proper folder if needed
      const projectFolderId = this.getOrCreateProjectFolder();
      if (projectFolderId) {
        const file = DriveApp.getFileById(spreadsheetId);
        const folder = DriveApp.getFolderById(projectFolderId);
        folder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
      }
      
      console.log(`Created project spreadsheet: ${spreadsheetId} for project: ${projectName}`);
      return spreadsheetId;
      
    } catch (error) {
      console.error('Failed to create project spreadsheet:', error);
      throw error;
    }
  }
  
  /**
   * Get or create the main projects folder
   * @returns {string|null} Folder ID or null if creation fails
   */
  getOrCreateProjectFolder() {
    try {
      const folderName = 'Explico Learning Projects';
      const folders = DriveApp.getFoldersByName(folderName);
      
      if (folders.hasNext()) {
        return folders.next().getId();
      } else {
        const newFolder = DriveApp.createFolder(folderName);
        return newFolder.getId();
      }
    } catch (error) {
      console.warn('Could not create/access project folder:', error);
      return null;
    }
  }
  
  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Created project with ID
   */
  async createProject(projectData) {
    this.ensureInitialized();
    
    const project = {
      ...PROJECT_DEFAULTS,
      ...projectData,
      id: this.generateId('proj'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.insertRow(SHEETS_CONFIG.PROJECTS_SHEET, this.projectToRow(project));
    return project;
  }
  
  /**
   * Update a project
   * @param {string} projectId - Project ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(projectId, updates) {
    this.ensureInitialized();
    
    const existingProject = await this.getProject(projectId);
    if (!existingProject) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    const updatedProject = {
      ...existingProject,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.updateRowById(SHEETS_CONFIG.PROJECTS_SHEET, projectId, this.projectToRow(updatedProject));
    return updatedProject;
  }
  
  /**
   * Get a project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object|null>} Project data or null if not found
   */
  async getProject(projectId) {
    this.ensureInitialized();
    
    const row = await this.getRowById(SHEETS_CONFIG.PROJECTS_SHEET, projectId);
    return row ? this.rowToProject(row) : null;
  }
  
  /**
   * Get all projects
   * @returns {Promise<Array<Object>>} Array of projects
   */
  async getAllProjects() {
    this.ensureInitialized();
    
    const rows = await this.getAllRows(SHEETS_CONFIG.PROJECTS_SHEET);
    return rows.map(row => this.rowToProject(row));
  }
  
  /**
   * Delete a project and all its data
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProject(projectId) {
    this.ensureInitialized();
    
    // Delete in order: hotspots, slides, project
    await this.deleteHotspotsByProject(projectId);
    await this.deleteSlidesByProject(projectId);
    await this.deleteRowById(SHEETS_CONFIG.PROJECTS_SHEET, projectId);
    
    return true;
  }
  
  /**
   * Create a new slide
   * @param {Object} slideData - Slide data
   * @returns {Promise<Object>} Created slide with ID
   */
  async createSlide(slideData) {
    this.ensureInitialized();
    
    const slide = {
      ...SLIDE_DEFAULTS,
      ...slideData,
      id: this.generateId('slide'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.insertRow(SHEETS_CONFIG.SLIDES_SHEET, this.slideToRow(slide));
    return slide;
  }
  
  /**
   * Update a slide
   * @param {string} slideId - Slide ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated slide
   */
  async updateSlide(slideId, updates) {
    this.ensureInitialized();
    
    const existingSlide = await this.getSlide(slideId);
    if (!existingSlide) {
      throw new Error(`Slide ${slideId} not found`);
    }
    
    const updatedSlide = {
      ...existingSlide,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.updateRowById(SHEETS_CONFIG.SLIDES_SHEET, slideId, this.slideToRow(updatedSlide));
    return updatedSlide;
  }
  
  /**
   * Get slides by project ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Array<Object>>} Array of slides
   */
  async getSlidesByProject(projectId) {
    this.ensureInitialized();
    
    const allRows = await this.getAllRows(SHEETS_CONFIG.SLIDES_SHEET);
    const projectSlides = allRows.filter(row => row[1] === projectId); // Project ID column
    return projectSlides.map(row => this.rowToSlide(row));
  }
  
  /**
   * Get a slide by ID
   * @param {string} slideId - Slide ID
   * @returns {Promise<Object|null>} Slide data or null if not found
   */
  async getSlide(slideId) {
    this.ensureInitialized();
    
    const row = await this.getRowById(SHEETS_CONFIG.SLIDES_SHEET, slideId);
    return row ? this.rowToSlide(row) : null;
  }
  
  /**
   * Delete slides by project ID
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteSlidesByProject(projectId) {
    this.ensureInitialized();
    
    const slides = await this.getSlidesByProject(projectId);
    
    // Delete hotspots for each slide first
    for (const slide of slides) {
      await this.deleteHotspotsBySlide(slide.id);
    }
    
    // Delete slides
    await this.deleteRowsByColumn(SHEETS_CONFIG.SLIDES_SHEET, 'B', projectId); // Project ID column
    
    return true;
  }
  
  /**
   * Save hotspots (batch operation)
   * @param {Array<Object>} hotspots - Array of hotspot objects
   * @returns {Promise<boolean>} Success status
   */
  async saveHotspots(hotspots) {
    this.ensureInitialized();
    
    if (!Array.isArray(hotspots) || hotspots.length === 0) {
      return true;
    }
    
    // Process in batches
    const batches = this.chunkArray(hotspots, this.options.batchSize);
    
    for (const batch of batches) {
      const operations = batch.map(hotspot => ({
        type: 'upsert',
        sheet: SHEETS_CONFIG.HOTSPOTS_SHEET,
        id: hotspot.id,
        data: this.hotspotToRow(hotspot)
      }));
      
      await this.processBatch(operations);
    }
    
    return true;
  }
  
  /**
   * Get hotspots by slide ID
   * @param {string} slideId - Slide ID
   * @returns {Promise<Array<Object>>} Array of hotspots
   */
  async getHotspotsBySlide(slideId) {
    this.ensureInitialized();
    
    const allRows = await this.getAllRows(SHEETS_CONFIG.HOTSPOTS_SHEET);
    const slideHotspots = allRows.filter(row => row[1] === slideId); // Slide ID column
    return slideHotspots.map(row => this.rowToHotspot(row))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  
  /**
   * Delete hotspots by slide ID
   * @param {string} slideId - Slide ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteHotspotsBySlide(slideId) {
    this.ensureInitialized();
    
    await this.deleteRowsByColumn(SHEETS_CONFIG.HOTSPOTS_SHEET, 'B', slideId); // Slide ID column
    return true;
  }
  
  /**
   * Delete hotspots by project ID
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteHotspotsByProject(projectId) {
    this.ensureInitialized();
    
    // Get all slides for the project
    const slides = await this.getSlidesByProject(projectId);
    
    // Delete hotspots for each slide
    for (const slide of slides) {
      await this.deleteHotspotsBySlide(slide.id);
    }
    
    return true;
  }
  
  /**
   * Record analytics event
   * @param {Object} eventData - Event data
   * @returns {Promise<boolean>} Success status
   */
  async recordAnalytics(eventData) {
    this.ensureInitialized();
    
    const analyticsRow = [
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
    
    await this.insertRow(SHEETS_CONFIG.ANALYTICS_SHEET, analyticsRow);
    return true;
  }
  
  /**
   * Get analytics for a project
   * @param {string} projectId - Project ID
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} Analytics data
   */
  async getAnalytics(projectId, options = {}) {
    this.ensureInitialized();
    
    const allRows = await this.getAllRows(SHEETS_CONFIG.ANALYTICS_SHEET);
    let analytics = allRows.filter(row => row[1] === projectId);
    
    // Apply date filter if specified
    if (options.startDate || options.endDate) {
      analytics = analytics.filter(row => {
        const timestamp = new Date(row[6]); // Timestamp column
        if (options.startDate && timestamp < new Date(options.startDate)) return false;
        if (options.endDate && timestamp > new Date(options.endDate)) return false;
        return true;
      });
    }
    
    // Apply limit if specified
    if (options.limit) {
      analytics = analytics.slice(0, options.limit);
    }
    
    return analytics.map(row => ({
      id: row[0],
      projectId: row[1],
      eventType: row[2],
      data: this.parseJSON(row[3]),
      userId: row[4],
      sessionId: row[5],
      timestamp: row[6],
      ipAddress: row[7],
      userAgent: row[8]
    }));
  }
  
  /**
   * Generic method to insert a row
   * @param {string} sheetName - Sheet name
   * @param {Array} rowData - Row data array
   * @returns {Promise<void>}
   */
  async insertRow(sheetName, rowData) {
    if (!this.options.spreadsheetId) {
      throw new Error('Spreadsheet ID required for sheet operations');
    }
    
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
    sheet.appendRow(rowData);
  }
  
  /**
   * Get all rows from a sheet (excluding header)
   * @param {string} sheetName - Sheet name
   * @returns {Promise<Array<Array>>} Array of row arrays
   */
  async getAllRows(sheetName) {
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) return []; // No data rows
    
    const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    return range.getValues();
  }
  
  /**
   * Get a row by ID (assumes ID is in column A)
   * @param {string} sheetName - Sheet name
   * @param {string} id - ID to search for
   * @returns {Promise<Array|null>} Row data or null if not found
   */
  async getRowById(sheetName, id) {
    const rows = await this.getAllRows(sheetName);
    return rows.find(row => row[0] === id) || null;
  }
  
  /**
   * Update a row by ID
   * @param {string} sheetName - Sheet name
   * @param {string} id - ID to update
   * @param {Array} newData - New row data
   * @returns {Promise<boolean>} Success status
   */
  async updateRowById(sheetName, id, newData) {
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
    const rows = await this.getAllRows(sheetName);
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) {
      throw new Error(`Row with ID ${id} not found`);
    }
    
    const actualRowNumber = rowIndex + 2; // +2 because index is 0-based and we skip header
    const range = sheet.getRange(actualRowNumber, 1, 1, newData.length);
    range.setValues([newData]);
    
    return true;
  }
  
  /**
   * Delete a row by ID
   * @param {string} sheetName - Sheet name
   * @param {string} id - ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteRowById(sheetName, id) {
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
    const rows = await this.getAllRows(sheetName);
    const rowIndex = rows.findIndex(row => row[0] === id);
    
    if (rowIndex === -1) {
      return false; // Row not found
    }
    
    const actualRowNumber = rowIndex + 2; // +2 because index is 0-based and we skip header
    sheet.deleteRow(actualRowNumber);
    
    return true;
  }
  
  /**
   * Delete rows by column value
   * @param {string} sheetName - Sheet name
   * @param {string} column - Column letter (A, B, C, etc.)
   * @param {string} value - Value to match
   * @returns {Promise<number>} Number of deleted rows
   */
  async deleteRowsByColumn(sheetName, column, value) {
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
    const rows = await this.getAllRows(sheetName);
    const columnIndex = this.columnLetterToIndex(column);
    
    let deletedCount = 0;
    
    // Delete from bottom to top to avoid index shifting
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i][columnIndex] === value) {
        const actualRowNumber = i + 2; // +2 because index is 0-based and we skip header
        sheet.deleteRow(actualRowNumber);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
  
  /**
   * Process a batch of operations
   * @param {Array<Object>} operations - Array of operations
   * @returns {Promise<void>}
   */
  async processBatch(operations) {
    for (const operation of operations) {
      switch (operation.type) {
        case 'insert':
          await this.insertRow(operation.sheet, operation.data);
          break;
        
        case 'update':
          await this.updateRowById(operation.sheet, operation.id, operation.data);
          break;
        
        case 'upsert':
          const existingRow = await this.getRowById(operation.sheet, operation.id);
          if (existingRow) {
            await this.updateRowById(operation.sheet, operation.id, operation.data);
          } else {
            await this.insertRow(operation.sheet, operation.data);
          }
          break;
        
        case 'delete':
          await this.deleteRowById(operation.sheet, operation.id);
          break;
      }
    }
  }
  
  /**
   * Convert project object to row array
   * @param {Object} project - Project object
   * @returns {Array} Row data array
   */
  projectToRow(project) {
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
  }
  
  /**
   * Convert row array to project object
   * @param {Array} row - Row data array
   * @returns {Object} Project object
   */
  rowToProject(row) {
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
  }
  
  /**
   * Convert slide object to row array
   * @param {Object} slide - Slide object
   * @returns {Array} Row data array
   */
  slideToRow(slide) {
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
  }
  
  /**
   * Convert row array to slide object
   * @param {Array} row - Row data array
   * @returns {Object} Slide object
   */
  rowToSlide(row) {
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
  }
  
  /**
   * Convert hotspot object to row array
   * @param {Object} hotspot - Hotspot object
   * @returns {Array} Row data array
   */
  hotspotToRow(hotspot) {
    return [
      hotspot.id,
      hotspot.slideId,
      hotspot.name || '',
      hotspot.color || HOTSPOT_DEFAULTS.color,
      hotspot.size || HOTSPOT_DEFAULTS.size,
      hotspot.position?.x || 50,
      hotspot.position?.y || 50,
      hotspot.pulseAnimation !== false,
      hotspot.triggerType || HOTSPOT_DEFAULTS.triggerType,
      hotspot.eventType || HOTSPOT_DEFAULTS.eventType,
      hotspot.tooltipContent || '',
      hotspot.tooltipPosition || TOOLTIP_POSITIONS.BOTTOM,
      hotspot.zoomLevel || 1,
      hotspot.panOffset?.x || 0,
      hotspot.panOffset?.y || 0,
      hotspot.bannerText || '',
      hotspot.isVisible !== false,
      hotspot.order || 0,
      hotspot.createdAt,
      hotspot.updatedAt
    ];
  }
  
  /**
   * Convert row array to hotspot object
   * @param {Array} row - Row data array
   * @returns {Object} Hotspot object
   */
  rowToHotspot(row) {
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
  }
  
  /**
   * Parse JSON string safely
   * @param {string} jsonString - JSON string
   * @returns {any} Parsed object or empty object/array if invalid
   */
  parseJSON(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return {};
    }
    
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to parse JSON:', jsonString);
      return {};
    }
  }
  
  /**
   * Generate unique ID with prefix
   * @param {string} prefix - ID prefix
   * @returns {string} Generated ID
   */
  generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }
  
  /**
   * Convert column letter to index
   * @param {string} letter - Column letter (A, B, C, etc.)
   * @returns {number} Column index (0-based)
   */
  columnLetterToIndex(letter) {
    return letter.toUpperCase().charCodeAt(0) - 65;
  }
  
  /**
   * Chunk array into smaller arrays
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array<Array>} Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * Ensure the service is initialized
   * @throws {Error} If not initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('GoogleSheetsAPI not initialized. Call initialize() first.');
    }
  }
  
  /**
   * Get current spreadsheet ID
   * @returns {string|null} Spreadsheet ID
   */
  getSpreadsheetId() {
    return this.options.spreadsheetId;
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.spreadsheetCache.clear();
  }
  
  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      spreadsheetId: this.options.spreadsheetId,
      cacheSize: this.spreadsheetCache.size,
      batchQueueSize: this.batchQueue.length,
      isBatchProcessing: this.isBatchProcessing
    };
  }
  
  /**
   * Destroy the service
   */
  destroy() {
    this.clearCache();
    this.batchQueue = [];
    this.initialized = false;
  }
}
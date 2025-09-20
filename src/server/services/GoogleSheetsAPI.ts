/**
 * GoogleSheetsAPI Service for Explico Learning
 * Handles all Google Sheets data persistence operations for Google Apps Script
 */

import { Project, Slide, Hotspot, AnalyticsEvent, MediaType } from '../../shared/types';
import {
  LEGACY_SHEETS_CONFIG,
  PROJECT_DEFAULTS,
  SLIDE_DEFAULTS,
  HOTSPOT_DEFAULTS,
  PROJECT_STATUS,
  MEDIA_TYPES,
  TOOLTIP_POSITIONS,
} from '../../shared/constants';

declare const SpreadsheetApp: GoogleAppsScript.Spreadsheet.SpreadsheetApp;
declare const DriveApp: GoogleAppsScript.Drive.DriveApp;
declare const Session: GoogleAppsScript.Base.Session;

interface GoogleSheetsAPIOptions {
  spreadsheetId?: string | null;
  registrySpreadsheetId?: string | null;
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
}

interface BatchOperation {
  type: 'insert' | 'update' | 'upsert' | 'delete';
  sheet: string;
  id?: string;
  data: any[];
}

export class GoogleSheetsAPI {
  private options: GoogleSheetsAPIOptions;
  private initialized: boolean;
  private registryInitialized: boolean;
  private spreadsheetCache: Map<string, any>;
  private batchQueue: BatchOperation[];
  private isBatchProcessing: boolean;

  constructor(options: Partial<GoogleSheetsAPIOptions> = {}) {
    this.options = {
      spreadsheetId: null,
      registrySpreadsheetId: null,
      batchSize: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options,
    };

    this.initialized = false;
    this.registryInitialized = false;
    this.spreadsheetCache = new Map();
    this.batchQueue = [];
    this.isBatchProcessing = false;
  }

  /**
   * Initialize the Google Sheets API service for project-specific operations
   */
  async initialize(spreadsheetId: string): Promise<boolean> {
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
   * Initialize the Google Sheets API service for registry operations
   */
  async initializeRegistry(): Promise<boolean> {
    try {
      // Get or create the master registry spreadsheet
      this.options.registrySpreadsheetId = await this.getOrCreateRegistrySpreadsheet();
      await this.setupRegistryStructure();
      this.registryInitialized = true;
      console.log('Registry initialized with spreadsheet ID:', this.options.registrySpreadsheetId);
      return true;
    } catch (error) {
      console.error('Failed to initialize registry:', error);
      throw error;
    }
  }

  /**
   * Setup spreadsheet structure with required sheets
   */
  private async setupSpreadsheetStructure(): Promise<void> {
    const requiredSheets = [
      LEGACY_SHEETS_CONFIG.PROJECTS_SHEET,
      LEGACY_SHEETS_CONFIG.SLIDES_SHEET,
      LEGACY_SHEETS_CONFIG.HOTSPOTS_SHEET,
      LEGACY_SHEETS_CONFIG.ANALYTICS_SHEET,
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
   */
  private async ensureSheetExists(sheetName: string): Promise<void> {
    try {
      // Try to get the sheet
      SpreadsheetApp.openById(this.options.spreadsheetId!).getSheetByName(sheetName);
    } catch (error) {
      // Sheet doesn't exist, create it
      console.log(`Creating sheet: ${sheetName}`);
      SpreadsheetApp.openById(this.options.spreadsheetId!).insertSheet(sheetName);
    }
  }

  /**
   * Setup headers for a sheet
   */
  private async setupSheetHeaders(sheetName: string): Promise<void> {
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId!).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }

    const headers = this.getSheetHeaders(sheetName);

    // Check if headers already exist
    const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const hasHeaders = existingHeaders.some((header) => header !== '');

    if (!hasHeaders) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.getRange(1, 1, 1, headers.length).setBackground('#f0f0f0');
    }
  }

  /**
   * Get headers for a specific sheet
   */
  private getSheetHeaders(sheetName: string): string[] {
    switch (sheetName) {
      case LEGACY_SHEETS_CONFIG.PROJECTS_SHEET:
        return [
          'ID',
          'Name',
          'Description',
          'Status',
          'Settings',
          'Analytics',
          'Created At',
          'Updated At',
          'Created By',
          'Shared With',
        ];

      case LEGACY_SHEETS_CONFIG.SLIDES_SHEET:
        return [
          'ID',
          'Project ID',
          'Name',
          'Background URL',
          'Background Type',
          'Order',
          'Duration',
          'Is Active',
          'Created At',
          'Updated At',
        ];

      case LEGACY_SHEETS_CONFIG.HOTSPOTS_SHEET:
        return [
          'ID',
          'Slide ID',
          'Name',
          'Color',
          'Size',
          'Position X',
          'Position Y',
          'Pulse Animation',
          'Trigger Type',
          'Event Type',
          'Tooltip Content',
          'Tooltip Position',
          'Zoom Level',
          'Pan Offset X',
          'Pan Offset Y',
          'Banner Text',
          'Is Visible',
          'Order',
          'Created At',
          'Updated At',
        ];

      case LEGACY_SHEETS_CONFIG.ANALYTICS_SHEET:
        return [
          'ID',
          'Project ID',
          'Event Type',
          'Event Data',
          'User ID',
          'Session ID',
          'Timestamp',
          'IP Address',
          'User Agent',
        ];

      default:
        return [];
    }
  }

  /**
   * Create a new spreadsheet for a project
   */
  async createProjectSpreadsheet(projectName: string): Promise<string> {
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
   */
  private getOrCreateProjectFolder(): string | null {
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
   * Get or create the master registry spreadsheet
   */
  private async getOrCreateRegistrySpreadsheet(): Promise<string> {
    try {
      const registryName = 'Explico Learning - Project Registry';
      const files = DriveApp.getFilesByName(registryName);

      if (files.hasNext()) {
        const existingFile = files.next();
        console.log('Found existing registry spreadsheet:', existingFile.getId());
        return existingFile.getId();
      } else {
        // Create new registry spreadsheet
        const spreadsheet = SpreadsheetApp.create(registryName);
        const spreadsheetId = spreadsheet.getId();

        // Move to proper folder if needed
        const projectFolderId = this.getOrCreateProjectFolder();
        if (projectFolderId) {
          const file = DriveApp.getFileById(spreadsheetId);
          const folder = DriveApp.getFolderById(projectFolderId);
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
  }

  /**
   * Setup registry spreadsheet structure
   */
  private async setupRegistryStructure(): Promise<void> {
    try {
      const registrySheet = SpreadsheetApp.openById(
        this.options.registrySpreadsheetId!
      ).getActiveSheet();
      registrySheet.setName('Project Registry');

      // Setup registry headers
      const headers = [
        'Project ID',
        'Name',
        'Description',
        'Spreadsheet ID',
        'Status',
        'Created At',
        'Updated At',
        'Created By',
      ];

      // Check if headers already exist
      const existingHeaders = registrySheet.getRange(1, 1, 1, headers.length).getValues()[0];
      const hasHeaders = existingHeaders.some((header) => header !== '');

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
  }

  /**
   * Create a new project
   */
  async createProject(projectData: Partial<Project>): Promise<Project> {
    this.ensureInitialized();

    const project: Project = {
      ...PROJECT_DEFAULTS,
      ...projectData,
      id: this.generateId('proj'),
      createdAt: new Date(),
      updatedAt: new Date(),
      spreadsheetId: this.options.spreadsheetId!,
    } as Project;

    await this.insertRow(LEGACY_SHEETS_CONFIG.PROJECTS_SHEET, this.projectToRow(project));
    return project;
  }

  /**
   * Update a project
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    this.ensureInitialized();

    const existingProject = await this.getProject(projectId);
    if (!existingProject) {
      throw new Error(`Project ${projectId} not found`);
    }

    const updatedProject: Project = {
      ...existingProject,
      ...updates,
      updatedAt: new Date(),
    };

    await this.updateRowById(
      LEGACY_SHEETS_CONFIG.PROJECTS_SHEET,
      projectId,
      this.projectToRow(updatedProject)
    );
    return updatedProject;
  }

  /**
   * Get a project by ID
   */
  async getProject(projectId: string): Promise<Project | null> {
    this.ensureInitialized();

    const row = await this.getRowById(LEGACY_SHEETS_CONFIG.PROJECTS_SHEET, projectId);
    return row ? this.rowToProject(row) : null;
  }

  /**
   * Get all projects from registry
   */
  async getAllProjects(): Promise<Project[]> {
    this.ensureRegistryInitialized();

    const rows = await this.getRegistryRows();
    return rows.map((row) => this.registryRowToProject(row));
  }

  /**
   * Add project to registry
   */
  async addProjectToRegistry(project: Project): Promise<boolean> {
    this.ensureRegistryInitialized();

    const registryRow = this.projectToRegistryRow(project);
    const registrySheet = SpreadsheetApp.openById(
      this.options.registrySpreadsheetId!
    ).getSheetByName('Project Registry');

    if (!registrySheet) {
      throw new Error('Project Registry sheet not found');
    }

    registrySheet.appendRow(registryRow);

    console.log('Added project to registry:', project.id);
    return true;
  }

  /**
   * Update project in registry
   */
  async updateProjectInRegistry(projectId: string, updates: Partial<Project>): Promise<boolean> {
    this.ensureRegistryInitialized();

    const registrySheet = SpreadsheetApp.openById(
      this.options.registrySpreadsheetId!
    ).getSheetByName('Project Registry');
    if (!registrySheet) {
      throw new Error('Project Registry sheet not found');
    }

    const rows = await this.getRegistryRows();
    const rowIndex = rows.findIndex((row) => row[0] === projectId);

    if (rowIndex === -1) {
      throw new Error(`Project ${projectId} not found in registry`);
    }

    // Get existing project data and apply updates
    const existingProject = this.registryRowToProject(rows[rowIndex]);
    const updatedProject: Project = {
      ...existingProject,
      ...updates,
      updatedAt: new Date(),
    };

    const actualRowNumber = rowIndex + 2; // +2 because index is 0-based and we skip header
    const updatedRow = this.projectToRegistryRow(updatedProject);
    const range = registrySheet.getRange(actualRowNumber, 1, 1, updatedRow.length);
    range.setValues([updatedRow]);

    console.log('Updated project in registry:', projectId);
    return true;
  }

  /**
   * Remove project from registry
   */
  async removeProjectFromRegistry(projectId: string): Promise<boolean> {
    this.ensureRegistryInitialized();

    const registrySheet = SpreadsheetApp.openById(
      this.options.registrySpreadsheetId!
    ).getSheetByName('Project Registry');
    if (!registrySheet) {
      throw new Error('Project Registry sheet not found');
    }

    const rows = await this.getRegistryRows();
    const rowIndex = rows.findIndex((row) => row[0] === projectId);

    if (rowIndex === -1) {
      console.warn('Project not found in registry:', projectId);
      return false;
    }

    const actualRowNumber = rowIndex + 2; // +2 because index is 0-based and we skip header
    registrySheet.deleteRow(actualRowNumber);

    console.log('Removed project from registry:', projectId);
    return true;
  }

  /**
   * Delete a project and all its data
   */
  async deleteProject(projectId: string): Promise<boolean> {
    this.ensureInitialized();

    // Delete in order: hotspots, slides, project
    await this.deleteHotspotsByProject(projectId);
    await this.deleteSlidesByProject(projectId);
    await this.deleteRowById(LEGACY_SHEETS_CONFIG.PROJECTS_SHEET, projectId);

    return true;
  }

  /**
   * Create a new slide
   */
  async createSlide(slideData: Partial<Slide>): Promise<Slide> {
    this.ensureInitialized();

    const slide: Slide = {
      ...SLIDE_DEFAULTS,
      ...slideData,
      id: this.generateId('slide'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Slide;

    await this.insertRow(LEGACY_SHEETS_CONFIG.SLIDES_SHEET, this.slideToRow(slide));
    return slide;
  }

  /**
   * Update a slide
   */
  async updateSlide(slideId: string, updates: Partial<Slide>): Promise<Slide> {
    this.ensureInitialized();

    const existingSlide = await this.getSlide(slideId);
    if (!existingSlide) {
      throw new Error(`Slide ${slideId} not found`);
    }

    const updatedSlide: Slide = {
      ...existingSlide,
      ...updates,
      updatedAt: new Date(),
    };

    await this.updateRowById(
      LEGACY_SHEETS_CONFIG.SLIDES_SHEET,
      slideId,
      this.slideToRow(updatedSlide)
    );
    return updatedSlide;
  }

  /**
   * Get slides by project ID
   */
  async getSlidesByProject(projectId: string): Promise<Slide[]> {
    this.ensureInitialized();

    const allRows = await this.getAllRows(LEGACY_SHEETS_CONFIG.SLIDES_SHEET);
    const projectSlides = allRows.filter((row) => row[1] === projectId); // Project ID column
    return projectSlides.map((row) => this.rowToSlide(row));
  }

  /**
   * Get a slide by ID
   */
  async getSlide(slideId: string): Promise<Slide | null> {
    this.ensureInitialized();

    const row = await this.getRowById(LEGACY_SHEETS_CONFIG.SLIDES_SHEET, slideId);
    return row ? this.rowToSlide(row) : null;
  }

  /**
   * Delete slides by project ID
   */
  async deleteSlidesByProject(projectId: string): Promise<boolean> {
    this.ensureInitialized();

    const slides = await this.getSlidesByProject(projectId);

    // Delete hotspots for each slide first
    for (const slide of slides) {
      await this.deleteHotspotsBySlide(slide.id);
    }

    // Delete slides
    await this.deleteRowsByColumn(LEGACY_SHEETS_CONFIG.SLIDES_SHEET, 'B', projectId); // Project ID column

    return true;
  }

  /**
   * Save hotspots (batch operation)
   */
  async saveHotspots(hotspots: Hotspot[]): Promise<boolean> {
    this.ensureInitialized();

    if (!Array.isArray(hotspots) || hotspots.length === 0) {
      return true;
    }

    // Process in batches
    const batches = this.chunkArray(hotspots, this.options.batchSize);

    for (const batch of batches) {
      const operations: BatchOperation[] = batch.map((hotspot) => ({
        type: 'upsert',
        sheet: LEGACY_SHEETS_CONFIG.HOTSPOTS_SHEET,
        id: hotspot.id,
        data: this.hotspotToRow(hotspot),
      }));

      await this.processBatch(operations);
    }

    return true;
  }

  /**
   * Get hotspots by slide ID
   */
  async getHotspotsBySlide(slideId: string): Promise<Hotspot[]> {
    this.ensureInitialized();

    const allRows = await this.getAllRows(LEGACY_SHEETS_CONFIG.HOTSPOTS_SHEET);
    const slideHotspots = allRows.filter((row) => row[1] === slideId); // Slide ID column
    return slideHotspots
      .map((row) => this.rowToHotspot(row))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Delete hotspots by slide ID
   */
  async deleteHotspotsBySlide(slideId: string): Promise<boolean> {
    this.ensureInitialized();

    await this.deleteRowsByColumn(LEGACY_SHEETS_CONFIG.HOTSPOTS_SHEET, 'B', slideId); // Slide ID column
    return true;
  }

  /**
   * Delete hotspots by project ID
   */
  async deleteHotspotsByProject(projectId: string): Promise<boolean> {
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
   */
  async recordAnalytics(eventData: Partial<AnalyticsEvent>): Promise<boolean> {
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
      eventData.userAgent || '',
    ];

    await this.insertRow(LEGACY_SHEETS_CONFIG.ANALYTICS_SHEET, analyticsRow);
    return true;
  }

  /**
   * Get analytics for a project
   */
  async getAnalytics(
    projectId: string,
    options: { startDate?: string; endDate?: string; limit?: number } = {}
  ): Promise<AnalyticsEvent[]> {
    this.ensureInitialized();

    const allRows = await this.getAllRows(LEGACY_SHEETS_CONFIG.ANALYTICS_SHEET);
    let analytics = allRows.filter((row) => row[1] === projectId);

    // Apply date filter if specified
    if (options.startDate || options.endDate) {
      analytics = analytics.filter((row) => {
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

    return analytics.map((row) => ({
      id: row[0],
      projectId: row[1],
      eventType: row[2],
      data: this.parseJSON(row[3]),
      userId: row[4],
      sessionId: row[5],
      timestamp: new Date(row[6]),
      ipAddress: row[7],
      userAgent: row[8],
    }));
  }

  /**
   * Generic method to insert a row
   */
  private async insertRow(sheetName: string, rowData: any[]): Promise<void> {
    if (!this.options.spreadsheetId) {
      throw new Error('Spreadsheet ID required for sheet operations');
    }

    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }
    sheet.appendRow(rowData);
  }

  /**
   * Get all rows from a sheet (excluding header)
   */
  private async getAllRows(sheetName: string): Promise<any[][]> {
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId!).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }

    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) return []; // No data rows

    const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    return range.getValues();
  }

  /**
   * Get a row by ID (assumes ID is in column A)
   */
  private async getRowById(sheetName: string, id: string): Promise<any[] | null> {
    const rows = await this.getAllRows(sheetName);
    return rows.find((row) => row[0] === id) || null;
  }

  /**
   * Update a row by ID
   */
  private async updateRowById(sheetName: string, id: string, newData: any[]): Promise<boolean> {
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId!).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }

    const rows = await this.getAllRows(sheetName);
    const rowIndex = rows.findIndex((row) => row[0] === id);

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
   */
  private async deleteRowById(sheetName: string, id: string): Promise<boolean> {
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId!).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }

    const rows = await this.getAllRows(sheetName);
    const rowIndex = rows.findIndex((row) => row[0] === id);

    if (rowIndex === -1) {
      return false; // Row not found
    }

    const actualRowNumber = rowIndex + 2; // +2 because index is 0-based and we skip header
    sheet.deleteRow(actualRowNumber);

    return true;
  }

  /**
   * Delete rows by column value
   */
  private async deleteRowsByColumn(
    sheetName: string,
    column: string,
    value: string
  ): Promise<number> {
    const sheet = SpreadsheetApp.openById(this.options.spreadsheetId!).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }

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
   */
  private async processBatch(operations: BatchOperation[]): Promise<void> {
    for (const operation of operations) {
      switch (operation.type) {
        case 'insert':
          await this.insertRow(operation.sheet, operation.data);
          break;

        case 'update':
          await this.updateRowById(operation.sheet, operation.id!, operation.data);
          break;

        case 'upsert': {
          const existingRow = await this.getRowById(operation.sheet, operation.id!);
          if (existingRow !== null) {
            await this.updateRowById(operation.sheet, operation.id!, operation.data);
          } else {
            await this.insertRow(operation.sheet, operation.data);
          }
          break;
        }

        case 'delete':
          await this.deleteRowById(operation.sheet, operation.id!);
          break;
      }
    }
  }

  /**
   * Convert project object to row array
   */
  private projectToRow(project: Project): any[] {
    return [
      project.id,
      project.title || '',
      project.description || '',
      project.settings?.version || PROJECT_STATUS.DRAFT,
      JSON.stringify(project.settings || {}),
      JSON.stringify({}),
      project.createdAt.toISOString(),
      project.updatedAt.toISOString(),
      '',
      JSON.stringify([]),
    ];
  }

  /**
   * Convert row array to project object
   */
  private rowToProject(row: any[]): Project {
    return {
      id: row[0],
      title: row[1],
      description: row[2],
      createdAt: new Date(row[6]),
      updatedAt: new Date(row[7]),
      spreadsheetId: this.options.spreadsheetId!,
      settings: this.parseJSON(row[4]),
    };
  }

  /**
   * Convert slide object to row array
   */
  private slideToRow(slide: Slide): any[] {
    return [
      slide.id,
      slide.projectId,
      slide.title || '',
      slide.mediaUrl || '',
      slide.mediaType || MediaType.IMAGE,
      slide.order || 0,
      slide.duration || null,
      true,
      slide.createdAt?.toISOString() || new Date().toISOString(),
      slide.updatedAt?.toISOString() || new Date().toISOString(),
    ];
  }

  /**
   * Convert row array to slide object
   */
  private rowToSlide(row: any[]): Slide {
    return {
      id: row[0],
      projectId: row[1],
      title: row[2],
      mediaUrl: row[3],
      mediaType: row[4],
      order: parseInt(row[5]) || 0,
      duration: row[6] || null,
      transition: '',
      createdAt: new Date(row[8]),
      updatedAt: new Date(row[9]),
    };
  }

  /**
   * Convert hotspot object to row array
   */
  private hotspotToRow(hotspot: Hotspot): any[] {
    return [
      hotspot.id,
      hotspot.slideId,
      hotspot.config?.title || '',
      hotspot.config?.backgroundColor || HOTSPOT_DEFAULTS.config.backgroundColor,
      hotspot.width || HOTSPOT_DEFAULTS.width,
      hotspot.x || 50,
      hotspot.y || 50,
      true,
      hotspot.triggerType || HOTSPOT_DEFAULTS.triggerType,
      hotspot.eventType || HOTSPOT_DEFAULTS.eventType,
      hotspot.config?.tooltipContent || '',
      hotspot.config?.tooltipPosition || TOOLTIP_POSITIONS.BOTTOM,
      hotspot.config?.zoomLevel || 1,
      hotspot.config?.panOffset?.x || 0,
      hotspot.config?.panOffset?.y || 0,
      hotspot.config?.bannerText || '',
      hotspot.isVisible !== false,
      hotspot.order || 0,
      new Date().toISOString(),
      new Date().toISOString(),
    ];
  }

  /**
   * Convert row array to hotspot object
   */
  private rowToHotspot(row: any[]): Hotspot {
    return {
      id: row[0],
      slideId: row[1],
      x: parseFloat(row[5]) || 50,
      y: parseFloat(row[6]) || 50,
      width: parseInt(row[4]) || HOTSPOT_DEFAULTS.width,
      height: parseInt(row[4]) || HOTSPOT_DEFAULTS.height,
      eventType: row[9],
      triggerType: row[8],
      config: {
        title: row[2],
        backgroundColor: row[3],
        tooltipContent: row[10],
        tooltipPosition: row[11],
        zoomLevel: parseFloat(row[12]) || 1,
        panOffset: {
          x: parseFloat(row[13]) || 0,
          y: parseFloat(row[14]) || 0,
        },
        bannerText: row[15],
      },
      order: parseInt(row[17]) || 0,
      isVisible: row[16] !== false,
    };
  }

  /**
   * Parse JSON string safely
   */
  private parseJSON(jsonString: any): any {
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
   */
  private generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Convert column letter to index
   */
  private columnLetterToIndex(letter: string): number {
    return letter.toUpperCase().charCodeAt(0) - 65;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get all rows from registry sheet (excluding header)
   */
  private async getRegistryRows(): Promise<any[][]> {
    const registrySheet = SpreadsheetApp.openById(
      this.options.registrySpreadsheetId!
    ).getSheetByName('Project Registry');
    if (!registrySheet) {
      throw new Error('Project Registry sheet not found');
    }

    const lastRow = registrySheet.getLastRow();

    if (lastRow <= 1) return []; // No data rows

    const range = registrySheet.getRange(2, 1, lastRow - 1, registrySheet.getLastColumn());
    return range.getValues();
  }

  /**
   * Convert project object to registry row array
   */
  private projectToRegistryRow(project: Project): any[] {
    return [
      project.id,
      project.title || '',
      project.description || '',
      project.spreadsheetId || '',
      project.settings?.version || PROJECT_STATUS.DRAFT,
      project.createdAt.toISOString(),
      project.updatedAt.toISOString(),
      Session.getActiveUser().getEmail(),
    ];
  }

  /**
   * Convert registry row array to project object
   */
  private registryRowToProject(row: any[]): Project {
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
        theme: 'light' as const,
        analytics: true,
      },
    };
  }

  /**
   * Ensure the service is initialized for project operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('GoogleSheetsAPI not initialized. Call initialize() first.');
    }
  }

  /**
   * Ensure the service is initialized for registry operations
   */
  private ensureRegistryInitialized(): void {
    if (!this.registryInitialized) {
      throw new Error('GoogleSheetsAPI registry not initialized. Call initializeRegistry() first.');
    }
  }

  /**
   * Get current spreadsheet ID
   */
  getSpreadsheetId(): string | null {
    return this.options.spreadsheetId || null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.spreadsheetCache.clear();
  }

  /**
   * Get service statistics
   */
  getStats(): object {
    return {
      initialized: this.initialized,
      spreadsheetId: this.options.spreadsheetId,
      cacheSize: this.spreadsheetCache.size,
      batchQueueSize: this.batchQueue.length,
      isBatchProcessing: this.isBatchProcessing,
    };
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    this.clearCache();
    this.batchQueue = [];
    this.initialized = false;
  }
}

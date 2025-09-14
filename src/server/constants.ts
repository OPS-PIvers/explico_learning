// Server-side constants for Google Apps Script
// Migrated from constants.gs to TypeScript

// Re-export shared constants
export * from '../shared/constants';

// Server-specific constants
export const GAS_CONFIG = {
  maxExecutionTime: 300000, // 5 minutes in milliseconds
  maxResponseSize: 50 * 1024 * 1024, // 50MB
  batchSize: 1000, // Maximum rows to process at once
  retryAttempts: 3,
  retryDelay: 1000 // milliseconds
};

// Google Sheets API limits
export const SHEETS_LIMITS = {
  maxCells: 10000000, // 10 million cells per spreadsheet
  maxColumns: 18278, // Maximum columns (ZZZ)
  maxRows: 1000000, // Maximum rows per sheet
  maxSheets: 200, // Maximum sheets per spreadsheet
  batchUpdateLimit: 100 // Maximum requests per batchUpdate
};

// Drive API configuration
export const DRIVE_CONFIG = {
  folderName: 'Explico Learning Projects',
  mimeTypes: {
    spreadsheet: 'application/vnd.google-apps.spreadsheet',
    folder: 'application/vnd.google-apps.folder',
    image: 'image/*',
    video: 'video/*'
  }
};

// Error codes specific to server operations
export const SERVER_ERROR_CODES = {
  SHEETS_QUOTA_EXCEEDED: 'SHEETS_QUOTA_EXCEEDED',
  DRIVE_QUOTA_EXCEEDED: 'DRIVE_QUOTA_EXCEEDED',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
  INVALID_SPREADSHEET: 'INVALID_SPREADSHEET',
  PERMISSION_ERROR: 'PERMISSION_ERROR'
};

// Cache configuration for PropertiesService
export const CACHE_CONFIG = {
  expirationTime: 3600, // 1 hour in seconds
  keys: {
    userProjects: 'user_projects',
    projectData: 'project_data_',
    slides: 'slides_',
    hotspots: 'hotspots_'
  }
};

// Logging levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Current log level (can be changed for debugging)
export const CURRENT_LOG_LEVEL = LogLevel.INFO;
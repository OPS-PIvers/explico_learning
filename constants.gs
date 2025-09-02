/**
 * Core Constants and Configuration for Explico Learning
 * Google Apps Script Web App
 */

// Event Types for Hotspots
const EVENT_TYPES = {
  TEXT_POPUP: 'text_popup',
  TEXT_ON_IMAGE: 'text_on_image',
  PAN_ZOOM: 'pan_zoom',
  SPOTLIGHT: 'spotlight'
};

// Event Trigger Types
const TRIGGER_TYPES = {
  CLICK: 'click',
  HOVER: 'hover',
  TOUCH: 'touch'
};

// Tooltip Positions
const TOOLTIP_POSITIONS = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
};

// Project Status Values
const PROJECT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft',
  ARCHIVED: 'archived'
};

// Media Types
const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  YOUTUBE: 'youtube'
};

// Hotspot Configuration Defaults
const HOTSPOT_DEFAULTS = {
  name: 'New Hotspot',
  color: '#2d3f89',
  size: 32,
  pulseAnimation: true,
  triggerType: TRIGGER_TYPES.TOUCH,
  eventType: EVENT_TYPES.TEXT_ON_IMAGE,
  position: { x: 50, y: 50 }, // Percentage-based positioning
  zIndex: 1000,
  tooltipContent: 'Click to learn more',
  tooltipPosition: TOOLTIP_POSITIONS.BOTTOM,
  zoomLevel: 1.5,
  panOffset: { x: 0, y: 0 },
  bannerText: '',
  isVisible: true,
  order: 0
};

// Slide Configuration Defaults
const SLIDE_DEFAULTS = {
  name: 'New Slide',
  backgroundUrl: '',
  backgroundType: MEDIA_TYPES.IMAGE,
  hotspots: [],
  duration: null, // Auto-advance timing in milliseconds
  isActive: true
};

// Project Configuration Defaults
const PROJECT_DEFAULTS = {
  name: 'Untitled Walkthrough',
  description: '',
  status: PROJECT_STATUS.DRAFT,
  slides: [],
  settings: {
    autoAdvance: false,
    showProgress: true,
    allowSkip: true,
    theme: 'dark'
  },
  analytics: {
    views: 0,
    completionRate: 0,
    averageTime: 0
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: '',
  sharedWith: []
};

// Google Sheets Configuration
const SHEETS_CONFIG = {
  // Sheet names for different data types
  PROJECTS_SHEET: 'Projects',
  SLIDES_SHEET: 'Slides',
  HOTSPOTS_SHEET: 'Hotspots',
  ANALYTICS_SHEET: 'Analytics',
  
  // Column mappings for Projects sheet
  PROJECT_COLUMNS: {
    ID: 'A',
    NAME: 'B',
    DESCRIPTION: 'C', 
    STATUS: 'D',
    SETTINGS: 'E',
    ANALYTICS: 'F',
    CREATED_AT: 'G',
    UPDATED_AT: 'H',
    CREATED_BY: 'I',
    SHARED_WITH: 'J'
  },
  
  // Column mappings for Slides sheet
  SLIDE_COLUMNS: {
    ID: 'A',
    PROJECT_ID: 'B',
    NAME: 'C',
    BACKGROUND_URL: 'D',
    BACKGROUND_TYPE: 'E',
    ORDER: 'F',
    DURATION: 'G',
    IS_ACTIVE: 'H',
    CREATED_AT: 'I',
    UPDATED_AT: 'J'
  },
  
  // Column mappings for Hotspots sheet  
  HOTSPOT_COLUMNS: {
    ID: 'A',
    SLIDE_ID: 'B',
    NAME: 'C',
    COLOR: 'D',
    SIZE: 'E',
    POSITION_X: 'F',
    POSITION_Y: 'G',
    PULSE_ANIMATION: 'H',
    TRIGGER_TYPE: 'I',
    EVENT_TYPE: 'J',
    TOOLTIP_CONTENT: 'K',
    TOOLTIP_POSITION: 'L',
    ZOOM_LEVEL: 'M',
    PAN_OFFSET_X: 'N',
    PAN_OFFSET_Y: 'O',
    BANNER_TEXT: 'P',
    IS_VISIBLE: 'Q',
    ORDER: 'R',
    CREATED_AT: 'S',
    UPDATED_AT: 'T'
  }
};

// UI Configuration
const UI_CONFIG = {
  // Layout dimensions
  SIDEBAR_WIDTH: 180,
  SIDEBAR_COLLAPSED_WIDTH: 60,
  CONFIG_PANEL_WIDTH: 320,
  HEADER_HEIGHT: 80,
  
  // Animation durations
  TRANSITION_FAST: 150,
  TRANSITION_NORMAL: 200,
  TRANSITION_SLOW: 300,
  
  // Viewport breakpoints
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280
  },
  
  // Z-index layers
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL: 1040,
    POPOVER: 1050,
    TOOLTIP: 1060
  },
  
  // Maximum values
  MAX_HOTSPOTS_PER_SLIDE: 10,
  MAX_SLIDES_PER_PROJECT: 50,
  MAX_ZOOM_LEVEL: 5,
  MIN_ZOOM_LEVEL: 1,
  
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg']
};

// Validation Rules
const VALIDATION_RULES = {
  PROJECT_NAME: {
    minLength: 1,
    maxLength: 100,
    required: true
  },
  SLIDE_NAME: {
    minLength: 1,
    maxLength: 50,
    required: true
  },
  HOTSPOT_NAME: {
    minLength: 1,
    maxLength: 30,
    required: true
  },
  TOOLTIP_CONTENT: {
    minLength: 1,
    maxLength: 200,
    required: false
  },
  BANNER_TEXT: {
    minLength: 0,
    maxLength: 100,
    required: false
  }
};

// API Endpoints and URLs (for GAS web app)
const API_CONFIG = {
  // Base URLs will be set dynamically based on deployment
  BASE_URL: '',
  
  // Common Google APIs
  GOOGLE_FONTS_URL: 'https://fonts.googleapis.com/css2?family=Spline+Sans:wght@400;500;700&family=Noto+Sans:wght@400;500;700;900&display=swap',
  MATERIAL_ICONS_URL: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
  TAILWIND_CSS_URL: 'https://cdn.tailwindcss.com?plugins=forms,container-queries',
  
  // YouTube API configuration
  YOUTUBE_API_KEY: '', // To be set from GAS properties
  YOUTUBE_EMBED_URL: 'https://www.youtube.com/embed/'
};

// Error Messages
const ERROR_MESSAGES = {
  // General errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  
  // Validation errors
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  NAME_TOO_SHORT: 'Name must be at least {min} characters long.',
  NAME_TOO_LONG: 'Name must be no more than {max} characters long.',
  INVALID_COLOR: 'Please select a valid color.',
  INVALID_NUMBER: 'Please enter a valid number.',
  INVALID_URL: 'Please enter a valid URL.',
  
  // Data errors
  PROJECT_NOT_FOUND: 'Project not found.',
  SLIDE_NOT_FOUND: 'Slide not found.',
  HOTSPOT_NOT_FOUND: 'Hotspot not found.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  
  // File upload errors
  FILE_TOO_LARGE: 'File size must be less than {max}MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload an image or video file.',
  
  // Limit errors
  MAX_HOTSPOTS_EXCEEDED: 'Maximum number of hotspots per slide is {max}.',
  MAX_SLIDES_EXCEEDED: 'Maximum number of slides per project is {max}.'
};

// Success Messages
const SUCCESS_MESSAGES = {
  PROJECT_CREATED: 'Project created successfully.',
  PROJECT_UPDATED: 'Project updated successfully.',
  PROJECT_DELETED: 'Project deleted successfully.',
  SLIDE_CREATED: 'Slide created successfully.',
  SLIDE_UPDATED: 'Slide updated successfully.',
  SLIDE_DELETED: 'Slide deleted successfully.',
  HOTSPOT_CREATED: 'Hotspot created successfully.',
  HOTSPOT_UPDATED: 'Hotspot updated successfully.',
  HOTSPOT_DELETED: 'Hotspot deleted successfully.',
  SETTINGS_SAVED: 'Settings saved successfully.',
  FILE_UPLOADED: 'File uploaded successfully.'
};

// Export for Google Apps Script (global scope)
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment (for testing)
  module.exports = {
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
}
// Shared constants for Explico Learning
// Used by both client and server-side code

import { EventType, TriggerType, MediaType, AnimationType, SheetsConfig } from '../types';

// Event Types Configuration
export const EVENT_TYPES = {
  [EventType.TEXT_POPUP]: {
    name: 'Text Popup',
    description: 'Show text in a popup overlay',
    icon: '💬',
    requiredFields: ['text'],
    optionalFields: ['title', 'backgroundColor', 'textColor', 'animation']
  },
  [EventType.PAN_ZOOM]: {
    name: 'Pan & Zoom',
    description: 'Pan and zoom to a specific area',
    icon: '🔍',
    requiredFields: ['panZoomConfig'],
    optionalFields: ['duration', 'easing']
  },
  [EventType.SPOTLIGHT]: {
    name: 'Spotlight',
    description: 'Highlight an area with spotlight effect',
    icon: '💡',
    requiredFields: ['spotlightConfig'],
    optionalFields: ['duration', 'animation']
  },
  [EventType.TEXT_ON_IMAGE]: {
    name: 'Text on Image',
    description: 'Overlay text directly on the image',
    icon: '📝',
    requiredFields: ['text'],
    optionalFields: ['fontSize', 'fontFamily', 'textColor', 'backgroundColor']
  }
};

// Trigger Types Configuration
export const TRIGGER_TYPES = {
  [TriggerType.CLICK]: {
    name: 'Click',
    description: 'Trigger on mouse click or tap',
    icon: '👆',
    supportedDevices: ['desktop', 'mobile', 'tablet']
  },
  [TriggerType.HOVER]: {
    name: 'Hover',
    description: 'Trigger on mouse hover (desktop only)',
    icon: '🖱️',
    supportedDevices: ['desktop']
  },
  [TriggerType.TOUCH]: {
    name: 'Touch',
    description: 'Trigger on touch (mobile/tablet only)',
    icon: '👋',
    supportedDevices: ['mobile', 'tablet']
  },
  [TriggerType.AUTO]: {
    name: 'Auto',
    description: 'Trigger automatically after delay',
    icon: '⏰',
    supportedDevices: ['desktop', 'mobile', 'tablet']
  }
};

// Media Types Configuration
export const MEDIA_TYPES = {
  [MediaType.IMAGE]: {
    name: 'Image',
    description: 'Static image file',
    icon: '🖼️',
    supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    maxSize: '10MB'
  },
  [MediaType.VIDEO]: {
    name: 'Video',
    description: 'Video file',
    icon: '🎥',
    supportedFormats: ['mp4', 'webm', 'ogg'],
    maxSize: '100MB'
  },
  [MediaType.YOUTUBE]: {
    name: 'YouTube',
    description: 'YouTube video',
    icon: '📹',
    supportedFormats: ['youtube.com', 'youtu.be'],
    maxSize: 'N/A'
  }
};

// Animation Types Configuration
export const ANIMATION_TYPES = {
  [AnimationType.FADE_IN]: {
    name: 'Fade In',
    description: 'Gradually fade in',
    duration: 500,
    easing: 'ease-out'
  },
  [AnimationType.SLIDE_UP]: {
    name: 'Slide Up',
    description: 'Slide in from bottom',
    duration: 400,
    easing: 'ease-out'
  },
  [AnimationType.SLIDE_DOWN]: {
    name: 'Slide Down',
    description: 'Slide in from top',
    duration: 400,
    easing: 'ease-out'
  },
  [AnimationType.SLIDE_LEFT]: {
    name: 'Slide Left',
    description: 'Slide in from right',
    duration: 400,
    easing: 'ease-out'
  },
  [AnimationType.SLIDE_RIGHT]: {
    name: 'Slide Right',
    description: 'Slide in from left',
    duration: 400,
    easing: 'ease-out'
  },
  [AnimationType.BOUNCE]: {
    name: 'Bounce',
    description: 'Bounce in effect',
    duration: 600,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },
  [AnimationType.ZOOM_IN]: {
    name: 'Zoom In',
    description: 'Scale up from center',
    duration: 400,
    easing: 'ease-out'
  },
  [AnimationType.ZOOM_OUT]: {
    name: 'Zoom Out',
    description: 'Scale down to center',
    duration: 400,
    easing: 'ease-in'
  }
};

// Default Configuration Values
export const HOTSPOT_DEFAULTS = {
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
    animation: AnimationType.FADE_IN,
    duration: 500,
    delay: 0
  }
};

export const PROJECT_DEFAULTS = {
  settings: {
    autoSave: true,
    version: '1.0.0',
    theme: 'light' as const,
    analytics: true
  }
};

export const SLIDE_DEFAULTS = {
  transition: 'fade',
  duration: 1000
};

// Google Sheets Configuration
export const SHEETS_CONFIG: SheetsConfig = {
  projects: {
    range: 'Projects!A1:H',
    columns: [
      { name: 'id', index: 0, type: 'string' },
      { name: 'title', index: 1, type: 'string' },
      { name: 'description', index: 2, type: 'string' },
      { name: 'createdAt', index: 3, type: 'date' },
      { name: 'updatedAt', index: 4, type: 'date' },
      { name: 'spreadsheetId', index: 5, type: 'string' },
      { name: 'settings', index: 6, type: 'json' }
    ]
  },
  slides: {
    range: 'Slides!A1:H',
    columns: [
      { name: 'id', index: 0, type: 'string' },
      { name: 'projectId', index: 1, type: 'string' },
      { name: 'order', index: 2, type: 'number' },
      { name: 'title', index: 3, type: 'string' },
      { name: 'mediaType', index: 4, type: 'enum' },
      { name: 'mediaUrl', index: 5, type: 'string' },
      { name: 'duration', index: 6, type: 'number' },
      { name: 'transition', index: 7, type: 'string' }
    ]
  },
  hotspots: {
    range: 'Hotspots!A1:L',
    columns: [
      { name: 'id', index: 0, type: 'string' },
      { name: 'slideId', index: 1, type: 'string' },
      { name: 'x', index: 2, type: 'number' },
      { name: 'y', index: 3, type: 'number' },
      { name: 'width', index: 4, type: 'number' },
      { name: 'height', index: 5, type: 'number' },
      { name: 'eventType', index: 6, type: 'enum' },
      { name: 'triggerType', index: 7, type: 'enum' },
      { name: 'config', index: 8, type: 'json' },
      { name: 'order', index: 9, type: 'number' },
      { name: 'isVisible', index: 10, type: 'boolean' }
    ]
  },
  analytics: {
    range: 'Analytics!A1:F',
    columns: [
      { name: 'id', index: 0, type: 'string' },
      { name: 'projectId', index: 1, type: 'string' },
      { name: 'slideId', index: 2, type: 'string' },
      { name: 'hotspotId', index: 3, type: 'string' },
      { name: 'timestamp', index: 4, type: 'date' },
      { name: 'action', index: 5, type: 'string' }
    ]
  }
};

// Validation Rules
export const VALIDATION_RULES = {
  project: {
    title: {
      minLength: 1,
      maxLength: 100,
      required: true
    },
    description: {
      minLength: 0,
      maxLength: 500,
      required: false
    }
  },
  slide: {
    title: {
      minLength: 1,
      maxLength: 100,
      required: true
    },
    mediaUrl: {
      required: true,
      pattern: /^https?:\/\/.+/
    }
  },
  hotspot: {
    x: {
      min: 0,
      max: 10000,
      required: true
    },
    y: {
      min: 0,
      max: 10000,
      required: true
    },
    width: {
      min: 10,
      max: 1000,
      required: true
    },
    height: {
      min: 10,
      max: 1000,
      required: true
    },
    text: {
      minLength: 1,
      maxLength: 1000,
      required: false
    }
  }
};

// UI Configuration
export const UI_CONFIG = {
  canvas: {
    minWidth: 400,
    minHeight: 300,
    maxWidth: 1920,
    maxHeight: 1080,
    defaultZoom: 1,
    minZoom: 0.1,
    maxZoom: 5
  },
  sidebar: {
    width: 300,
    minWidth: 250,
    maxWidth: 400
  },
  configPanel: {
    width: 320,
    minWidth: 280,
    maxWidth: 400
  },
  hotspot: {
    minSize: 10,
    maxSize: 200,
    defaultSize: 50,
    snapGrid: 5
  },
  Z_INDEX: {
    CANVAS: 1,
    HOTSPOT: 10,
    SELECTED_HOTSPOT: 20,
    POPUP: 100,
    MODAL: 1000,
    TOOLTIP: 2000
  },
  zIndex: {
    canvas: 1,
    hotspot: 10,
    selectedHotspot: 20,
    popup: 100,
    modal: 1000,
    tooltip: 2000
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  },
  // Legacy backward compatibility
  MAX_HOTSPOTS_PER_SLIDE: 50,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  MIN_ZOOM_LEVEL: 0.1,
  MAX_ZOOM_LEVEL: 5
};

// Color Palette
export const COLORS = {
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent'
};

// Error Messages
export const ERROR_MESSAGES = {
  PROJECT_NOT_FOUND: 'Project not found',
  SLIDE_NOT_FOUND: 'Slide not found',
  HOTSPOT_NOT_FOUND: 'Hotspot not found',
  INVALID_MEDIA_URL: 'Invalid media URL',
  SHEETS_API_ERROR: 'Google Sheets API error',
  VALIDATION_ERROR: 'Validation error',
  PERMISSION_DENIED: 'Permission denied',
  NETWORK_ERROR: 'Network error',
  UNKNOWN_ERROR: 'Unknown error occurred'
};

// API Endpoints (for reference)
export const API_ENDPOINTS = {
  projects: '/projects',
  slides: '/slides',
  hotspots: '/hotspots',
  media: '/media',
  analytics: '/analytics'
};

// API Configuration
export const API_CONFIG = {
  YOUTUBE_EMBED_URL: 'https://www.youtube.com/embed/'
};

// Tooltip Positions
export const TOOLTIP_POSITIONS = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
};

// Project Status
export const PROJECT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
};

// Maintain backward compatibility with old property names
export const LEGACY_CONFIG = {
  MAX_HOTSPOTS_PER_SLIDE: 50,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  MIN_ZOOM_LEVEL: 0.1,
  MAX_ZOOM_LEVEL: 5,
  PROJECTS_SHEET: 'Projects',
  SLIDES_SHEET: 'Slides',
  HOTSPOTS_SHEET: 'Hotspots',
  ANALYTICS_SHEET: 'Analytics'
};

// Legacy SHEETS_CONFIG for backward compatibility
export const LEGACY_SHEETS_CONFIG = {
  PROJECTS_SHEET: 'Projects',
  SLIDES_SHEET: 'Slides',
  HOTSPOTS_SHEET: 'Hotspots',
  ANALYTICS_SHEET: 'Analytics'
};
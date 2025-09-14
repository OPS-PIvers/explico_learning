// Shared utility functions for Explico Learning
// Used by both client and server-side code

import {
  Project,
  Slide,
  Hotspot,
  CreateProjectRequest,
  CreateSlideRequest,
  CreateHotspotRequest,
  MediaType,
  EventType,
  TriggerType,
  ExplicoError,
  ErrorCode
} from '../types';
import { VALIDATION_RULES, HOTSPOT_DEFAULTS, PROJECT_DEFAULTS, SLIDE_DEFAULTS } from '../constants';

// ID Generation
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generateProjectId(): string {
  return `proj_${generateId()}`;
}

export function generateSlideId(): string {
  return `slide_${generateId()}`;
}

export function generateHotspotId(): string {
  return `hotspot_${generateId()}`;
}

// Validation Functions
export function validateProject(data: Partial<Project>): boolean {
  if (!data.title || data.title.length < VALIDATION_RULES.project.title.minLength) {
    return false;
  }
  if (data.title.length > VALIDATION_RULES.project.title.maxLength) {
    return false;
  }
  if (data.description && data.description.length > VALIDATION_RULES.project.description.maxLength) {
    return false;
  }
  return true;
}

export function validateSlide(data: Partial<Slide>): boolean {
  if (!data.title || data.title.length < VALIDATION_RULES.slide.title.minLength) {
    return false;
  }
  if (data.title.length > VALIDATION_RULES.slide.title.maxLength) {
    return false;
  }
  if (!data.mediaUrl || !VALIDATION_RULES.slide.mediaUrl.pattern.test(data.mediaUrl)) {
    return false;
  }
  return true;
}

export function validateHotspot(data: Partial<Hotspot>): boolean {
  const rules = VALIDATION_RULES.hotspot;

  if (typeof data.x !== 'number' || data.x < rules.x.min || data.x > rules.x.max) {
    return false;
  }
  if (typeof data.y !== 'number' || data.y < rules.y.min || data.y > rules.y.max) {
    return false;
  }
  if (typeof data.width !== 'number' || data.width < rules.width.min || data.width > rules.width.max) {
    return false;
  }
  if (typeof data.height !== 'number' || data.height < rules.height.min || data.height > rules.height.max) {
    return false;
  }

  return true;
}

export function validateMediaUrl(url: string, mediaType: MediaType): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  switch (mediaType) {
    case MediaType.YOUTUBE:
      return /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/.test(url);
    case MediaType.IMAGE:
      return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
    case MediaType.VIDEO:
      return /^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
    default:
      return /^https?:\/\/.+/.test(url);
  }
}

// Data Transformation Functions
export function createProjectFromRequest(request: CreateProjectRequest): Omit<Project, 'id'> {
  return {
    title: request.title.trim(),
    description: request.description?.trim() || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    spreadsheetId: '',
    settings: {
      ...PROJECT_DEFAULTS.settings,
      ...request.settings
    }
  };
}

export function createSlideFromRequest(request: CreateSlideRequest): Omit<Slide, 'id'> {
  return {
    projectId: request.projectId,
    title: request.title.trim(),
    mediaType: request.mediaType,
    mediaUrl: request.mediaUrl.trim(),
    order: request.order || 0,
    ...SLIDE_DEFAULTS
  };
}

export function createHotspotFromRequest(request: CreateHotspotRequest): Omit<Hotspot, 'id'> {
  return {
    slideId: request.slideId,
    x: request.x,
    y: request.y,
    width: request.width,
    height: request.height,
    eventType: request.eventType,
    triggerType: request.triggerType,
    config: {
      ...HOTSPOT_DEFAULTS.config,
      ...request.config
    },
    order: 0,
    isVisible: true
  };
}

// URL Processing Functions
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

export function getYouTubeThumbnailUrl(url: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string | null {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/${quality}default.jpg` : null;
}

// Array Utility Functions
export function reorderArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...array];
  const [movedItem] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, movedItem);
  return result;
}

export function updateArrayItem<T extends { id: string }>(array: T[], id: string, updates: Partial<T>): T[] {
  return array.map(item =>
    item.id === id ? { ...item, ...updates } : item
  );
}

export function removeArrayItem<T extends { id: string }>(array: T[], id: string): T[] {
  return array.filter(item => item.id !== id);
}

export function findArrayItem<T extends { id: string }>(array: T[], id: string): T | undefined {
  return array.find(item => item.id === id);
}

// Date Utility Functions
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function isDateString(value: string): boolean {
  return !isNaN(Date.parse(value));
}

// Coordinate and Geometry Utilities
export function clampCoordinate(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isPointInBounds(x: number, y: number, bounds: { x: number, y: number, width: number, height: number }): boolean {
  return x >= bounds.x &&
         x <= bounds.x + bounds.width &&
         y >= bounds.y &&
         y <= bounds.y + bounds.height;
}

export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

// Error Handling Utilities
export function createError(code: ErrorCode, message?: string, details?: any): ExplicoError {
  return new ExplicoError(message || code, code, details);
}

export function isExplicoError(error: any): error is ExplicoError {
  return error instanceof ExplicoError;
}

// Deep Clone Utility (for immutable updates)
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

// Debounce Utility (useful for auto-save functionality)
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

// Throttle Utility (useful for performance-sensitive operations)
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}

// String Utilities
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// JSON Utilities (safe parsing for Google Sheets data)
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '{}';
  }
}
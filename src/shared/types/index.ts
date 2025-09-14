// Shared TypeScript type definitions for Explico Learning
// Used by both client and server-side code

export interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  spreadsheetId: string;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  autoSave: boolean;
  version: string;
  theme: 'light' | 'dark';
  analytics: boolean;
}

export interface Slide {
  id: string;
  projectId: string;
  order: number;
  title: string;
  mediaType: MediaType;
  mediaUrl: string;
  duration?: number;
  transition: string;
}

export interface Hotspot {
  id: string;
  slideId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  eventType: EventType;
  triggerType: TriggerType;
  config: HotspotConfig;
  order: number;
  isVisible: boolean;
}

export interface HotspotConfig {
  text?: string;
  title?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fontSize?: number;
  fontFamily?: string;
  opacity?: number;
  animation?: AnimationType;
  duration?: number;
  delay?: number;
  panZoomConfig?: PanZoomConfig;
  spotlightConfig?: SpotlightConfig;
}

export interface PanZoomConfig {
  targetX: number;
  targetY: number;
  zoomLevel: number;
  duration: number;
  easing: string;
}

export interface SpotlightConfig {
  radius: number;
  opacity: number;
  color: string;
  blur: number;
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  YOUTUBE = 'youtube'
}

export enum EventType {
  TEXT_POPUP = 'text_popup',
  PAN_ZOOM = 'pan_zoom',
  SPOTLIGHT = 'spotlight',
  TEXT_ON_IMAGE = 'text_on_image'
}

export enum TriggerType {
  CLICK = 'click',
  HOVER = 'hover',
  TOUCH = 'touch',
  AUTO = 'auto'
}

export enum AnimationType {
  FADE_IN = 'fadeIn',
  SLIDE_UP = 'slideUp',
  SLIDE_DOWN = 'slideDown',
  SLIDE_LEFT = 'slideLeft',
  SLIDE_RIGHT = 'slideRight',
  BOUNCE = 'bounce',
  ZOOM_IN = 'zoomIn',
  ZOOM_OUT = 'zoomOut'
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface CreateProjectRequest {
  title: string;
  description: string;
  settings?: Partial<ProjectSettings>;
}

export interface UpdateProjectRequest {
  id: string;
  title?: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
}

export interface CreateSlideRequest {
  projectId: string;
  title: string;
  mediaType: MediaType;
  mediaUrl: string;
  order?: number;
}

export interface CreateHotspotRequest {
  slideId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  eventType: EventType;
  triggerType: TriggerType;
  config: Partial<HotspotConfig>;
}

// Google Sheets data structure
export interface SheetsConfig {
  projects: {
    range: string;
    columns: ProjectColumn[];
  };
  slides: {
    range: string;
    columns: SlideColumn[];
  };
  hotspots: {
    range: string;
    columns: HotspotColumn[];
  };
  analytics: {
    range: string;
    columns: AnalyticsColumn[];
  };
}

export interface ProjectColumn {
  name: keyof Project;
  index: number;
  type: 'string' | 'date' | 'json';
}

export interface SlideColumn {
  name: keyof Slide;
  index: number;
  type: 'string' | 'number' | 'enum';
}

export interface HotspotColumn {
  name: keyof Hotspot;
  index: number;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'json';
}

export interface AnalyticsColumn {
  name: string;
  index: number;
  type: 'string' | 'number' | 'date';
}

// Component Props interfaces
export interface ProjectDashboardProps {
  initialProjects?: Project[];
  onProjectSelect?: (project: Project) => void;
  onProjectCreate?: (project: CreateProjectRequest) => void;
}

export interface HotspotEditorProps {
  projectId: string;
  initialSlides?: Slide[];
  initialHotspots?: Hotspot[];
  onSave?: (hotspots: Hotspot[]) => void;
}

export interface MainCanvasProps {
  slide?: Slide;
  hotspots: Hotspot[];
  selectedHotspot?: Hotspot;
  isEditMode: boolean;
  onHotspotSelect?: (hotspot: Hotspot) => void;
  onHotspotCreate?: (request: CreateHotspotRequest) => void;
  onHotspotUpdate?: (hotspot: Hotspot) => void;
  onHotspotDelete?: (id: string) => void;
}

export interface ConfigPanelProps {
  hotspot?: Hotspot;
  onUpdate?: (hotspot: Hotspot) => void;
  onDelete?: (id: string) => void;
}

export interface SidebarProps {
  slides: Slide[];
  activeSlide?: Slide;
  onSlideSelect?: (slide: Slide) => void;
  onSlideReorder?: (slides: Slide[]) => void;
  onSlideCreate?: (request: CreateSlideRequest) => void;
  onSlideDelete?: (id: string) => void;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Error types
export class ExplicoError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExplicoError';
  }
}

export enum ErrorCode {
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  SLIDE_NOT_FOUND = 'SLIDE_NOT_FOUND',
  HOTSPOT_NOT_FOUND = 'HOTSPOT_NOT_FOUND',
  INVALID_MEDIA_URL = 'INVALID_MEDIA_URL',
  SHEETS_API_ERROR = 'SHEETS_API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}
# Explico Learning - Business Logic Services

This document outlines the business logic services that power the Google Apps Script hotspot editor.

## Service Architecture Overview

```
ProjectManager (Orchestrator)
    ├── HotspotManager (Hotspot CRUD & State)
    ├── MediaHandler (Background Media)
    ├── EventTypeHandlers (Hotspot Events)
    └── GoogleSheetsAPI (Data Persistence)
```

## Core Services

### 1. **ProjectManager.js** - Master Orchestrator
**Purpose**: Coordinates all services and manages project lifecycle

**Key Features**:
- Project CRUD operations (create, open, save, delete, duplicate)
- Slide management and ordering
- Component coordination and event handling  
- Auto-save functionality with debouncing
- Import/export capabilities
- Analytics calculation
- Service initialization and dependency injection

**Key Methods**:
- `initialize(services)` - Setup with service dependencies
- `createNewProject(data)` - Create project with initial slide
- `openProject(projectId)` - Load project and sync to components
- `saveCurrentProject()` - Persist all changes to sheets
- `selectSlide(slideId)` - Switch slides and load hotspots
- `updateSlideBackground(id, url, type)` - Change slide media

### 2. **HotspotManager.js** - Hotspot State Management
**Purpose**: Manages hotspot CRUD operations and real-time synchronization

**Key Features**:
- Local hotspot storage with Google Sheets sync
- Real-time component synchronization (Canvas ↔ ConfigPanel ↔ Sequencer)
- Change queuing with auto-save and debouncing
- Drag-and-drop position updates with optimized saves
- Hotspot validation and error handling
- Selection management and multi-component coordination

**Key Methods**:
- `createHotspot(config)` - Create hotspot with validation
- `updateHotspot(id, updates)` - Update with component sync
- `selectHotspot(id)` - Select across all components
- `reorderHotspot(id, fromIndex, toIndex)` - Sequence management
- `loadSlideHotspots(slideId)` - Load from sheets with caching

### 3. **EventTypeHandlers.js** - Hotspot Event Logic
**Purpose**: Handles different hotspot event types and their visual behaviors

**Supported Event Types**:
- **Text on Image**: Tooltip overlays with positioning
- **Text Popup**: Modal dialogs with close handlers
- **Pan/Zoom**: Background transformations with banners
- **Spotlight**: Radial gradient overlays with click-to-dismiss

**Key Features**:
- Smooth CSS animations and transitions
- Event cleanup and memory management
- Position-aware tooltip placement
- YouTube and video media support
- Keyboard shortcuts (ESC to dismiss)
- Multiple simultaneous events handling

**Key Methods**:
- `handleHotspotEvent(hotspot, canvas, element)` - Main event dispatcher
- `handleTextOnImage(hotspot, canvas, element)` - Tooltip rendering
- `handlePanZoom(hotspot, canvas, element)` - Transform effects
- `clearActiveEvent(hotspotId)` - Clean event cleanup

### 4. **MediaHandler.js** - Background Media Management
**Purpose**: Processes and validates background media (images, videos, YouTube)

**Key Features**:
- Multi-format support (images, videos, YouTube URLs)
- Automatic media type detection
- Thumbnail generation for all media types
- File upload validation with size/type checking
- Media caching and preloading
- URL validation and metadata extraction
- Error handling with fallback thumbnails

**Key Methods**:
- `processMediaUrl(url)` - Validate and analyze media
- `processFileUpload(file)` - Handle drag-and-drop uploads
- `getThumbnailUrl(url)` - Generate or retrieve thumbnails
- `preloadMedia(urls)` - Batch preload for performance
- `validateFileUpload(file)` - Check size and type limits

### 5. **GoogleSheetsAPI.js** - Data Persistence Layer
**Purpose**: Complete Google Apps Script integration with Google Sheets

**Sheet Structure**:
- **Projects**: Project metadata, settings, analytics
- **Slides**: Slide data, media URLs, ordering
- **Hotspots**: Complete hotspot configurations
- **Analytics**: Event tracking and metrics

**Key Features**:
- Automatic sheet creation with headers
- Batch operations for performance
- Row-based CRUD with ID lookup
- JSON serialization for complex objects
- Retry logic with error handling
- Column mapping with constants
- Relationship management (cascading deletes)

**Key Methods**:
- `initialize(spreadsheetId)` - Setup sheets structure
- `createProject/updateProject/getProject` - Project operations
- `saveHotspots(hotspots)` - Batch hotspot persistence
- `getHotspotsBySlide(slideId)` - Load with ordering
- `recordAnalytics(eventData)` - Track user interactions

## Service Integration Flow

### 1. **Application Startup**
```javascript
// Initialize all services
const projectManager = new ProjectManager();
await projectManager.initialize({
  sheetsAPI: new GoogleSheetsAPI(),
  hotspotManager: new HotspotManager(),
  mediaHandler: new MediaHandler(),
  eventTypeHandlers: new EventTypeHandlers()
});

// Set component references
projectManager.setComponents({
  dashboard, header, sidebar, canvas, configPanel, sequencer
});
```

### 2. **Project Loading Flow**
```
User clicks project → ProjectManager.openProject() → GoogleSheetsAPI.getProject()
   ↓
Load slides → GoogleSheetsAPI.getSlidesByProject() → Update Sidebar
   ↓
Select first slide → HotspotManager.setActiveSlide() → Load hotspots
   ↓
Update Canvas → MediaHandler.processMediaUrl() → Set background
   ↓
Sync all components → Real-time preview ready
```

### 3. **Hotspot Creation Flow**
```
User clicks canvas → HotspotManager.createHotspot() → Validate config
   ↓
Update Canvas → HotspotRenderer.createHotspot() → Visual hotspot
   ↓
Update ConfigPanel → Show hotspot settings → Real-time updates
   ↓
Update Sequencer → Add to timeline → Sequence management
   ↓
Auto-save → GoogleSheetsAPI.saveHotspots() → Persist changes
```

### 4. **Real-time Preview Flow**
```
User changes config → ConfigPanel.updateConfig() → HotspotManager.updateHotspot()
   ↓
Canvas updates → HotspotRenderer.updateHotspot() → Visual changes
   ↓
Event preview → EventTypeHandlers.handleHotspotEvent() → Live preview
   ↓
Debounced save → GoogleSheetsAPI.saveHotspots() → Background persistence
```

## Error Handling Strategy

### 1. **Validation Levels**
- **Client-side**: Form validation, file size/type checking
- **Service-level**: Data consistency, relationship integrity
- **API-level**: Google Sheets access, network errors

### 2. **Graceful Degradation**
- Local caching when sheets unavailable
- Fallback thumbnails for media errors
- Component sync recovery on errors
- User feedback with actionable messages

### 3. **Recovery Mechanisms**
- Automatic retry with exponential backoff
- Change queue persistence across sessions
- Component state restoration
- Conflict resolution for concurrent edits

## Performance Optimizations

### 1. **Caching Strategy**
- Media metadata and thumbnails cached in memory
- Hotspot data cached per slide with dirty tracking
- Component state caching to minimize re-renders
- Google Sheets response caching with TTL

### 2. **Batch Operations**
- Hotspot saves batched by slide
- Media preloading for better UX
- Bulk sheet operations for large datasets
- Debounced saves to reduce API calls

### 3. **Memory Management**
- Event cleanup to prevent memory leaks
- Object URL lifecycle management
- Component reference cleanup on destroy
- Service instance cleanup and disposal

## Google Apps Script Integration

### 1. **Authentication**
- Leverages built-in Google account authentication
- Session-based user identification
- Automatic permission handling for sheets access

### 2. **Deployment**
- Services work entirely within GAS environment
- No external API dependencies beyond Google services
- Spreadsheet-per-project data architecture
- Built-in version control through Google Sheets

### 3. **Scalability**
- Designed for Google Apps Script execution limits
- Efficient batch operations under API quotas
- Optimized for typical walkthrough project sizes
- Memory-conscious for GAS runtime constraints

This service architecture provides a robust, scalable foundation for the hotspot editor with proper separation of concerns, error handling, and Google Apps Script optimization.
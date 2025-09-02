# Explico Learning - Component Architecture

This document outlines the reusable component architecture created for the Google Apps Script hotspot editor web app.

## Project Structure

```
/workspaces/explico_learning/
├── components/          # Reusable UI components
├── services/           # Business logic services (to be created)
├── utils/              # Shared utilities and constants
├── templates/          # HTML templates (to be created)
└── editor/             # Original HTML files (to be refactored)
```

## Core Components

### 1. UI Foundation Components

#### **FormControls.js** - Reusable Form Controls
- `createTextInput()` - Text input with validation
- `createNumberInput()` - Number input with min/max constraints
- `createColorInput()` - Color picker
- `createSelect()` - Dropdown select
- `createToggle()` - Toggle switch
- `createSlider()` - Range slider with live value display
- `createButtonGroup()` - Multiple choice button group
- `createTextarea()` - Multi-line text input
- `validateField()` - Form validation utilities

#### **StatusBadge.js** - Status Indicators
- `create()` - Basic status badge (active/inactive/draft/archived)
- `createCompletionBadge()` - Completion rate badge
- `createPriorityBadge()` - Priority level badge
- `createCountBadge()` - Notification count badge
- `createCustomBadge()` - Custom styled badge

#### **ProgressBar.js** - Progress Indicators
- `create()` - Standard progress bar
- `createSegmented()` - Multi-segment progress bar
- `createCircular()` - Circular progress indicator
- `createLoading()` - Indeterminate loading bar
- `createSteps()` - Step-based progress indicator

### 2. Layout Components

#### **AppHeader.js** - Application Header
Features:
- Brand logo and title
- Save/Share buttons with loading states
- User avatar with dropdown
- Notification indicator
- Custom action buttons support

Usage:
```javascript
const header = new AppHeader({
  title: 'My Walkthrough Editor',
  onSave: async () => { /* save logic */ },
  onShare: () => { /* share logic */ }
});
document.body.appendChild(header.render());
```

#### **Sidebar.js** - Slide Navigation Sidebar
Features:
- Collapsible slide thumbnails
- Drag-and-drop reordering
- Add/delete slide buttons
- Active slide highlighting
- Responsive collapse

Usage:
```javascript
const sidebar = new Sidebar({
  slides: slidesArray,
  onSlideSelect: (slideId) => { /* handle selection */ },
  onSlideAdd: () => { /* add new slide */ }
});
```

#### **MainCanvas.js** - Main Preview Canvas
Features:
- Multi-media background support (image/video/YouTube)
- Interactive hotspot rendering
- Zoom and pan controls
- Grid and ruler overlays
- Hotspot creation mode
- Keyboard shortcuts

Usage:
```javascript
const canvas = new MainCanvas({
  backgroundUrl: 'https://example.com/image.jpg',
  backgroundType: MEDIA_TYPES.IMAGE,
  onHotspotCreate: (hotspot) => { /* handle new hotspot */ }
});
```

#### **ConfigPanel.js** - Hotspot Configuration Panel
Features:
- Dynamic form generation based on event type
- Real-time configuration updates
- Validation and error display
- Event type specific controls
- Auto-save with dirty state tracking

Usage:
```javascript
const configPanel = new ConfigPanel({
  onConfigChange: (property, value, hotspot) => {
    // Update hotspot in real-time
    canvas.updateHotspot(hotspot.id, { [property]: value });
  }
});
```

#### **WalkthroughSequencer.js** - Hotspot Timeline
Features:
- Visual timeline with draggable nodes
- Sequence reordering
- Progress tracking
- Context menus for hotspot actions
- Keyboard navigation support

Usage:
```javascript
const sequencer = new WalkthroughSequencer({
  hotspots: hotspotsArray,
  onSequenceChange: (newIndex) => { /* handle sequence change */ },
  onHotspotReorder: (from, to) => { /* update order */ }
});
```

#### **ProjectDashboard.js** - Project Management Dashboard
Features:
- Searchable project table
- Sorting and filtering
- Project actions menu (edit/duplicate/delete)
- Progress visualization
- Empty state handling

### 3. Interactive Components

#### **HotspotRenderer.js** - Hotspot Visualization Engine
Features:
- Dynamic hotspot creation and positioning
- Multiple event types (click/hover/touch)
- Drag-and-drop repositioning (editor mode)
- Visual styling with animations
- Tooltip management
- Export/import capabilities

Key Methods:
- `createHotspot(config, container)` - Create new hotspot
- `updateHotspot(id, updates)` - Update hotspot properties
- `selectHotspot(id)` - Select for editing
- `setEditorMode(boolean)` - Toggle editor/viewer mode

## Shared Resources

### **utils/constants.js** - Configuration Constants
- Event types (`EVENT_TYPES`)
- Trigger types (`TRIGGER_TYPES`)
- Default configurations (`HOTSPOT_DEFAULTS`, `PROJECT_DEFAULTS`)
- Google Sheets column mappings (`SHEETS_CONFIG`)
- Validation rules (`VALIDATION_RULES`)
- Error/success messages

### **utils/styles.css** - CSS Variables & Utilities
- CSS custom properties for colors, spacing, sizing
- Utility classes for layout and styling
- Component-specific styles
- Responsive breakpoints
- Animation definitions

## Integration Example

Here's how to integrate all components for a complete editor:

```javascript
// Initialize components
const header = new AppHeader({
  title: 'Walkthrough Editor',
  onSave: saveProject,
  onShare: shareProject
});

const sidebar = new Sidebar({
  slides: project.slides,
  onSlideSelect: selectSlide,
  onSlideAdd: addSlide
});

const canvas = new MainCanvas({
  backgroundUrl: currentSlide.backgroundUrl,
  onHotspotCreate: createHotspot
});

const configPanel = new ConfigPanel({
  onConfigChange: updateHotspot
});

const sequencer = new WalkthroughSequencer({
  hotspots: currentSlide.hotspots,
  onSequenceChange: updateSequence
});

// Layout assembly
const app = document.createElement('div');
app.className = 'app-container flex flex-col h-screen font-primary';

app.appendChild(header.render());

const main = document.createElement('main');
main.className = 'layout-editor flex-1 p-6';

main.appendChild(sidebar.render());
main.appendChild(canvas.render());
main.appendChild(configPanel.render());

app.appendChild(main);
app.appendChild(sequencer.render());

document.body.appendChild(app);
```

## Event Communication

Components communicate through callback functions and custom events:

1. **Hotspot Selection Flow**:
   - User clicks hotspot in canvas
   - Canvas calls `onHotspotSelect`
   - App updates config panel
   - Config panel displays hotspot settings

2. **Configuration Updates**:
   - User changes setting in config panel
   - Config panel calls `onConfigChange`
   - App updates canvas hotspot
   - Canvas re-renders with new styling

3. **Sequence Changes**:
   - User drags hotspot in sequencer
   - Sequencer calls `onHotspotReorder`
   - App updates hotspot order
   - Canvas and config panel sync

## Next Steps

The remaining implementation tasks include:

1. **Business Logic Services** (services/ directory):
   - HotspotManager - CRUD operations
   - MediaHandler - Background media management
   - EventTypeHandlers - Specific event behaviors
   - GoogleSheetsAPI - Data persistence
   - ProjectManager - Project-level operations

2. **Refactored HTML Pages**:
   - Convert existing HTML files to use components
   - Create base templates for different page types
   - Implement proper Google Apps Script integration

3. **Testing & Integration**:
   - Component unit tests
   - Integration testing
   - Performance optimization
   - Cross-browser compatibility

This component architecture provides a solid foundation for building a scalable, maintainable hotspot editor with real-time preview capabilities and Google Sheets integration.
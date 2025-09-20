/**
 * HotspotManager Service for Explico Learning
 * Manages hotspot CRUD operations, state synchronization, and component coordination
 */

import { Hotspot, EventType, TriggerType } from '../../shared/types';
import { UI_CONFIG, HOTSPOT_DEFAULTS, VALIDATION_RULES } from '../../shared/constants';
import { GoogleSheetsAPI } from '../../server/services/GoogleSheetsAPI';
import { EventTypeHandlers } from './EventTypeHandlers';

interface HotspotManagerOptions {
  autoSave: boolean;
  validateOnUpdate: boolean;
  maxHotspots: number;
}

interface ComponentReferences {
  canvas?: any;
  configPanel?: any;
  sequencer?: any;
}

interface Dependencies {
  sheetsAPI?: GoogleSheetsAPI;
  eventTypeHandlers?: EventTypeHandlers;
}

interface ChangeQueueItem {
  action: 'create' | 'update' | 'delete' | 'reorder';
  data: any;
  previousState?: any;
  timestamp: number;
}

interface HotspotPosition {
  x: number;
  y: number;
}

export class HotspotManager {
  private options: HotspotManagerOptions;
  private hotspots: Map<string, Map<string, Hotspot>>;
  private activeSlideId: string | null;
  private selectedHotspotId: string | null;
  private eventListeners: Map<string, Function[]>;
  private changeQueue: ChangeQueueItem[];
  private isProcessingChanges: boolean;

  // Component references
  private canvas: any | null;
  private configPanel: any | null;
  private sequencer: any | null;

  // Services
  private sheetsAPI: GoogleSheetsAPI | null;
  private eventTypeHandlers: EventTypeHandlers | null;

  // Timeouts
  private processChangesTimeout: NodeJS.Timeout | null;
  private debouncedSaveTimeouts: { [key: string]: NodeJS.Timeout };

  constructor(options: Partial<HotspotManagerOptions> = {}) {
    this.options = {
      autoSave: true,
      validateOnUpdate: true,
      maxHotspots: UI_CONFIG.MAX_HOTSPOTS_PER_SLIDE,
      ...options,
    };

    this.hotspots = new Map(); // Map<slideId, Map<hotspotId, hotspotData>>
    this.activeSlideId = null;
    this.selectedHotspotId = null;
    this.eventListeners = new Map();
    this.changeQueue = [];
    this.isProcessingChanges = false;

    // Component references
    this.canvas = null;
    this.configPanel = null;
    this.sequencer = null;

    // Services
    this.sheetsAPI = null;
    this.eventTypeHandlers = null;

    // Timeouts
    this.processChangesTimeout = null;
    this.debouncedSaveTimeouts = {};
  }

  /**
   * Initialize the hotspot manager
   */
  initialize(dependencies: Dependencies = {}): void {
    this.sheetsAPI = dependencies.sheetsAPI || null;
    this.eventTypeHandlers = dependencies.eventTypeHandlers || null;

    // Set up auto-save if enabled
    if (this.options.autoSave) {
      this.setupAutoSave();
    }
  }

  /**
   * Set component references for coordination
   */
  setComponents(components: ComponentReferences = {}): void {
    this.canvas = components.canvas || null;
    this.configPanel = components.configPanel || null;
    this.sequencer = components.sequencer || null;

    this.setupComponentEventHandlers();
  }

  /**
   * Set up component event handlers
   */
  private setupComponentEventHandlers(): void {
    if (this.canvas && this.canvas.hotspotRenderer) {
      this.canvas.hotspotRenderer.setEventHandlers({
        onHotspotCreate: (config: Partial<Hotspot>) => this.createHotspot(config),
        onHotspotSelect: (id: string) => this.selectHotspot(id),
        onHotspotUpdate: (id: string, updates: Partial<Hotspot>) => this.updateHotspot(id, updates),
        onPositionChange: (id: string, position: HotspotPosition) =>
          this.updateHotspotPosition(id, position),
      });
    }

    if (this.configPanel && this.configPanel.options) {
      this.configPanel.options.onConfigChange = (
        property: string,
        value: any,
        hotspot: Hotspot
      ) => {
        this.updateHotspot(hotspot.id, { [property]: value });
      };
    }

    if (this.sequencer && this.sequencer.options) {
      this.sequencer.options.onHotspotReorder = (
        fromIndex: number,
        toIndex: number,
        hotspot: Hotspot
      ) => {
        this.reorderHotspot(hotspot.id, fromIndex, toIndex);
      };
    }
  }

  /**
   * Set active slide
   */
  setActiveSlide(slideId: string): void {
    if (this.activeSlideId === slideId) return;

    // Save any pending changes for current slide
    this.processPendingChanges();

    this.activeSlideId = slideId;
    this.selectedHotspotId = null;

    // Initialize hotspots map for slide if doesn't exist
    if (!this.hotspots.has(slideId)) {
      this.hotspots.set(slideId, new Map());
    }

    // Update components
    this.syncComponentsWithSlide(slideId);

    // Emit event
    this.emit('slideChanged', { slideId, hotspots: this.getSlideHotspots(slideId) });
  }

  /**
   * Create a new hotspot
   */
  async createHotspot(config: Partial<Hotspot> = {}): Promise<Hotspot> {
    if (!this.activeSlideId) {
      throw new Error('No active slide set');
    }

    const slideHotspots = this.hotspots.get(this.activeSlideId)!;

    // Check maximum hotspots limit
    if (slideHotspots.size >= this.options.maxHotspots) {
      throw new Error(`Maximum ${this.options.maxHotspots} hotspots allowed per slide`);
    }

    // Generate ID if not provided
    const hotspotId = config.id || this.generateHotspotId();

    // Create hotspot with defaults
    const hotspot: Hotspot = {
      ...HOTSPOT_DEFAULTS,
      ...config,
      id: hotspotId,
      slideId: this.activeSlideId,
      order: slideHotspots.size,
    } as Hotspot;

    // Validate hotspot
    if (this.options.validateOnUpdate) {
      this.validateHotspot(hotspot);
    }

    // Add to local storage
    slideHotspots.set(hotspotId, hotspot);

    // Update components
    this.syncHotspotToComponents(hotspot, 'create');

    // Queue for auto-save
    this.queueChange('create', hotspot);

    // Emit event
    this.emit('hotspotCreated', hotspot);

    return hotspot;
  }

  /**
   * Update hotspot configuration
   */
  async updateHotspot(hotspotId: string, updates: Partial<Hotspot> = {}): Promise<Hotspot> {
    const hotspot = this.getHotspot(hotspotId);
    if (!hotspot) {
      throw new Error(`Hotspot ${hotspotId} not found`);
    }

    const previousState = { ...hotspot };

    // Apply updates
    Object.assign(hotspot, updates);

    // Validate updated hotspot
    if (this.options.validateOnUpdate) {
      this.validateHotspot(hotspot);
    }

    // Update components
    this.syncHotspotToComponents(hotspot, 'update');

    // Queue for auto-save
    this.queueChange('update', hotspot, previousState);

    // Emit event
    this.emit('hotspotUpdated', { hotspot, previousState, updates });

    return hotspot;
  }

  /**
   * Update hotspot position (optimized for drag operations)
   */
  updateHotspotPosition(hotspotId: string, position: HotspotPosition): void {
    const hotspot = this.getHotspot(hotspotId);
    if (!hotspot) return;

    hotspot.x = position.x;
    hotspot.y = position.y;

    // Update canvas immediately (no validation needed for position)
    if (this.canvas) {
      this.canvas.updateHotspot(hotspotId, { position });
    }

    // Debounced save for position changes
    this.debouncedSave(hotspotId);

    // Emit event
    this.emit('hotspotPositionChanged', { hotspotId, position });
  }

  /**
   * Delete a hotspot
   */
  async deleteHotspot(hotspotId: string): Promise<boolean> {
    const hotspot = this.getHotspot(hotspotId);
    if (!hotspot) {
      throw new Error(`Hotspot ${hotspotId} not found`);
    }

    const slideHotspots = this.hotspots.get(this.activeSlideId!)!;

    // Remove from local storage
    slideHotspots.delete(hotspotId);

    // Update order of remaining hotspots
    this.reorderHotspots();

    // Clear selection if this hotspot was selected
    if (this.selectedHotspotId === hotspotId) {
      this.selectHotspot(null);
    }

    // Update components
    this.syncHotspotToComponents(hotspot, 'delete');

    // Queue for auto-save
    this.queueChange('delete', hotspot);

    // Emit event
    this.emit('hotspotDeleted', hotspot);

    return true;
  }

  /**
   * Select a hotspot for editing
   */
  selectHotspot(hotspotId: string | null): void {
    const previousSelection = this.selectedHotspotId;

    if (hotspotId && !this.getHotspot(hotspotId)) {
      console.warn(`Hotspot ${hotspotId} not found, cannot select`);
      return;
    }

    this.selectedHotspotId = hotspotId;

    // Update components
    if (this.canvas) {
      this.canvas.selectHotspot(hotspotId);
    }

    if (this.configPanel) {
      const hotspot = hotspotId ? this.getHotspot(hotspotId) : null;
      this.configPanel.setHotspot(hotspot);
    }

    if (this.sequencer) {
      const hotspots = this.getSlideHotspots(this.activeSlideId!);
      const index = hotspots.findIndex((h) => h.id === hotspotId);
      if (index !== -1) {
        this.sequencer.setCurrentIndex(index);
      }
    }

    // Emit event
    this.emit('hotspotSelectionChanged', {
      selectedId: hotspotId,
      previousId: previousSelection,
      hotspot: hotspotId ? this.getHotspot(hotspotId) : null,
    });
  }

  /**
   * Reorder hotspot in sequence
   */
  reorderHotspot(hotspotId: string, fromIndex: number, toIndex: number): void {
    const hotspots = this.getSlideHotspots(this.activeSlideId!);

    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= hotspots.length ||
      toIndex >= hotspots.length
    ) {
      return;
    }

    // Update order values
    const reorderedHotspots = [...hotspots];
    const [movedHotspot] = reorderedHotspots.splice(fromIndex, 1);
    reorderedHotspots.splice(toIndex, 0, movedHotspot);

    // Update order property for all hotspots
    reorderedHotspots.forEach((hotspot, index) => {
      hotspot.order = index;
    });

    // Update components
    this.syncSequencerWithHotspots(reorderedHotspots);

    // Queue for auto-save
    this.queueChange('reorder', { hotspots: reorderedHotspots });

    // Emit event
    this.emit('hotspotsReordered', { fromIndex, toIndex, hotspots: reorderedHotspots });
  }

  /**
   * Get hotspot by ID
   */
  getHotspot(hotspotId: string): Hotspot | null {
    if (!this.activeSlideId) return null;
    const slideHotspots = this.hotspots.get(this.activeSlideId);
    return slideHotspots ? slideHotspots.get(hotspotId) || null : null;
  }

  /**
   * Get all hotspots for a slide
   */
  getSlideHotspots(slideId: string): Hotspot[] {
    const slideHotspots = this.hotspots.get(slideId);
    if (!slideHotspots) return [];

    return Array.from(slideHotspots.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Get selected hotspot
   */
  getSelectedHotspot(): Hotspot | null {
    return this.selectedHotspotId ? this.getHotspot(this.selectedHotspotId) : null;
  }

  /**
   * Load hotspots for a slide from storage
   */
  async loadSlideHotspots(slideId: string): Promise<Hotspot[]> {
    if (!this.sheetsAPI) {
      console.warn('GoogleSheetsAPI not available, using local storage only');
      return this.getSlideHotspots(slideId);
    }

    try {
      const hotspots = await this.sheetsAPI.getHotspotsBySlide(slideId);

      // Store in local cache
      const slideHotspotsMap = new Map<string, Hotspot>();
      hotspots.forEach((hotspot) => {
        slideHotspotsMap.set(hotspot.id, hotspot);
      });
      this.hotspots.set(slideId, slideHotspotsMap);

      // Update components if this is the active slide
      if (slideId === this.activeSlideId) {
        this.syncComponentsWithSlide(slideId);
      }

      return hotspots;
    } catch (error) {
      console.error('Failed to load hotspots from sheets:', error);
      return this.getSlideHotspots(slideId);
    }
  }

  /**
   * Save hotspots to storage
   */
  async saveSlideHotspots(slideId: string | null = null): Promise<boolean> {
    const targetSlideId = slideId || this.activeSlideId;
    if (!targetSlideId) return false;

    if (!this.sheetsAPI) {
      console.warn('GoogleSheetsAPI not available, changes saved locally only');
      return true;
    }

    try {
      const hotspots = this.getSlideHotspots(targetSlideId);
      await this.sheetsAPI.saveHotspots(hotspots);

      // Clear change queue for this slide
      this.changeQueue = this.changeQueue.filter((change) => change.data.slideId !== targetSlideId);

      return true;
    } catch (error) {
      console.error('Failed to save hotspots to sheets:', error);
      return false;
    }
  }

  /**
   * Validate hotspot configuration
   */
  private validateHotspot(hotspot: Hotspot): void {
    const errors: string[] = [];

    // Required fields
    if (!hotspot.id) errors.push('Hotspot ID is required');
    if (!hotspot.slideId) errors.push('Slide ID is required');

    // Position validation
    if (typeof hotspot.x !== 'number' || typeof hotspot.y !== 'number') {
      errors.push('Valid position coordinates are required');
    }

    // Size validation
    if (hotspot.width && (hotspot.width < 16 || hotspot.width > 100)) {
      errors.push('Hotspot size must be between 16 and 100 pixels');
    }

    // Event type specific validation
    if (hotspot.eventType) {
      switch (hotspot.eventType) {
        case EventType.TEXT_ON_IMAGE:
        case EventType.TEXT_POPUP:
          if (!hotspot.config.tooltipContent || hotspot.config.tooltipContent.trim().length === 0) {
            errors.push('Tooltip content is required for text events');
          }
          break;

        case EventType.PAN_ZOOM:
          if (
            hotspot.config.zoomLevel &&
            (hotspot.config.zoomLevel < UI_CONFIG.MIN_ZOOM_LEVEL ||
              hotspot.config.zoomLevel > UI_CONFIG.MAX_ZOOM_LEVEL)
          ) {
            errors.push(
              `Zoom level must be between ${UI_CONFIG.MIN_ZOOM_LEVEL} and ${UI_CONFIG.MAX_ZOOM_LEVEL}`
            );
          }
          break;
      }
    }

    if (errors.length > 0) {
      throw new Error(`Hotspot validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Sync hotspot to components
   */
  private syncHotspotToComponents(hotspot: Hotspot, action: 'create' | 'update' | 'delete'): void {
    if (this.canvas) {
      switch (action) {
        case 'create':
          this.canvas.addHotspot(hotspot);
          break;
        case 'update':
          this.canvas.updateHotspot(hotspot.id, hotspot);
          break;
        case 'delete':
          this.canvas.removeHotspot(hotspot.id);
          break;
      }
    }

    if (this.sequencer && this.activeSlideId) {
      const hotspots = this.getSlideHotspots(this.activeSlideId);
      this.sequencer.setHotspots(hotspots);
    }

    if (this.configPanel && this.selectedHotspotId === hotspot.id) {
      this.configPanel.setHotspot(action === 'delete' ? null : hotspot);
    }
  }

  /**
   * Sync components with slide hotspots
   */
  private syncComponentsWithSlide(slideId: string): void {
    const hotspots = this.getSlideHotspots(slideId);

    if (this.canvas) {
      this.canvas.setHotspots(hotspots);
    }

    if (this.sequencer) {
      this.sequencer.setHotspots(hotspots);
    }

    if (this.configPanel) {
      this.configPanel.setHotspot(null); // Clear selection on slide change
    }
  }

  /**
   * Sync sequencer with hotspots array
   */
  private syncSequencerWithHotspots(hotspots: Hotspot[]): void {
    if (this.sequencer) {
      this.sequencer.setHotspots(hotspots);
    }
  }

  /**
   * Generate unique hotspot ID
   */
  private generateHotspotId(): string {
    return `hotspot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reorder hotspots after deletion
   */
  private reorderHotspots(): void {
    if (!this.activeSlideId) return;

    const hotspots = this.getSlideHotspots(this.activeSlideId);
    hotspots.forEach((hotspot, index) => {
      hotspot.order = index;
    });
  }

  /**
   * Queue change for auto-save
   */
  private queueChange(action: string, data: any, previousState: any = null): void {
    this.changeQueue.push({
      action: action as any,
      data,
      previousState,
      timestamp: Date.now(),
    });

    if (this.options.autoSave) {
      this.processChangesDelayed();
    }
  }

  /**
   * Process pending changes with debouncing
   */
  private processChangesDelayed(): void {
    if (this.processChangesTimeout) {
      clearTimeout(this.processChangesTimeout);
    }

    this.processChangesTimeout = setTimeout(() => {
      this.processPendingChanges();
    }, 1000); // 1 second debounce
  }

  /**
   * Process all pending changes
   */
  private async processPendingChanges(): Promise<void> {
    if (this.isProcessingChanges || this.changeQueue.length === 0) return;

    this.isProcessingChanges = true;

    try {
      await this.saveSlideHotspots();
    } catch (error) {
      console.error('Failed to process pending changes:', error);
    } finally {
      this.isProcessingChanges = false;
    }
  }

  /**
   * Debounced save for position changes
   */
  private debouncedSave(hotspotId: string): void {
    if (this.debouncedSaveTimeouts[hotspotId]) {
      clearTimeout(this.debouncedSaveTimeouts[hotspotId]);
    }

    this.debouncedSaveTimeouts[hotspotId] = setTimeout(() => {
      const hotspot = this.getHotspot(hotspotId);
      if (hotspot) {
        this.queueChange('update', hotspot);
      }
    }, 500); // 500ms debounce for position changes
  }

  /**
   * Set up auto-save functionality
   */
  private setupAutoSave(): void {
    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.processPendingChanges();
    });

    // Periodic save every 30 seconds
    setInterval(() => {
      if (this.changeQueue.length > 0) {
        this.processPendingChanges();
      }
    }, 30000);
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get statistics about current hotspots
   */
  getStatistics(): object {
    const activeSlideHotspots = this.getSlideHotspots(this.activeSlideId || '');

    return {
      totalSlides: this.hotspots.size,
      activeSlide: this.activeSlideId,
      hotspotsInActiveSlide: activeSlideHotspots.length,
      selectedHotspot: this.selectedHotspotId,
      pendingChanges: this.changeQueue.length,
      maxHotspotsPerSlide: this.options.maxHotspots,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.hotspots.clear();
    this.activeSlideId = null;
    this.selectedHotspotId = null;
    this.changeQueue = [];
    this.clearTimeouts();
  }

  /**
   * Clear all timeouts
   */
  private clearTimeouts(): void {
    if (this.processChangesTimeout) {
      clearTimeout(this.processChangesTimeout);
      this.processChangesTimeout = null;
    }

    Object.values(this.debouncedSaveTimeouts).forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.debouncedSaveTimeouts = {};
  }

  /**
   * Destroy the hotspot manager
   */
  destroy(): void {
    this.processPendingChanges();
    this.clearTimeouts();
    this.clear();
    this.eventListeners.clear();
  }
}

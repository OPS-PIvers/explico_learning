/**
 * HotspotManager Service for Explico Learning
 * Manages hotspot CRUD operations, state synchronization, and component coordination
 */

function HotspotManager(options) {
  options = options || {};
  this.options = {
    autoSave: true,
    validateOnUpdate: true,
    maxHotspots: UI_CONFIG.MAX_HOTSPOTS_PER_SLIDE
  };
  this.options = Object.assign(this.options, options);

  this.hotspots = {}; // Replaced Map with Object
  this.activeSlideId = null;
  this.selectedHotspotId = null;
  this.eventListeners = {}; // Replaced Map with Object
  this.changeQueue = [];
  this.isProcessingChanges = false;

  // Component references
  this.canvas = null;
  this.configPanel = null;
  this.sequencer = null;

  // Services
  this.sheetsAPI = null;
  this.eventTypeHandlers = null;
}
  
  /**
   * Initialize the hotspot manager
   * @param {Object} dependencies - Service dependencies
   */
HotspotManager.prototype.initialize = function(dependencies) {
  dependencies = dependencies || {};
  this.sheetsAPI = dependencies.sheetsAPI;
  this.eventTypeHandlers = dependencies.eventTypeHandlers;

  // The call to setupAutoSave is removed because it contains browser-specific APIs.
};

HotspotManager.prototype.setComponents = function(components) {
  components = components || {};
  this.canvas = components.canvas;
  this.configPanel = components.configPanel;
  this.sequencer = components.sequencer;

  this.setupComponentEventHandlers();
};

HotspotManager.prototype.setupComponentEventHandlers = function() {
  var self = this;
  if (this.canvas) {
    this.canvas.hotspotRenderer.setEventHandlers({
      onHotspotCreate: function(config) { self.createHotspot(config); },
      onHotspotSelect: function(id) { self.selectHotspot(id); },
      onHotspotUpdate: function(id, updates) { self.updateHotspot(id, updates); },
      onPositionChange: function(id, position) { self.updateHotspotPosition(id, position); }
    });
  }

  if (this.configPanel) {
    this.configPanel.options.onConfigChange = function(property, value, hotspot) {
      var update = {};
      update[property] = value;
      self.updateHotspot(hotspot.id, update);
    };
  }

  if (this.sequencer) {
    this.sequencer.options.onHotspotReorder = function(fromIndex, toIndex, hotspot) {
      self.reorderHotspot(hotspot.id, fromIndex, toIndex);
    };
  }
};
  
  /**
   * Set active slide
   * @param {string} slideId - Slide ID
   */
HotspotManager.prototype.setActiveSlide = function(slideId) {
  if (this.activeSlideId === slideId) return;

  this.processPendingChanges();

  this.activeSlideId = slideId;
  this.selectedHotspotId = null;

  if (!this.hotspots.hasOwnProperty(slideId)) {
    this.hotspots[slideId] = {};
  }

  this.syncComponentsWithSlide(slideId);

  this.emit('slideChanged', { slideId: slideId, hotspots: this.getSlideHotspots(slideId) });
};

HotspotManager.prototype.createHotspot = function(config) {
  config = config || {};
  if (!this.activeSlideId) {
    throw new Error('No active slide set');
  }

  var slideHotspots = this.hotspots[this.activeSlideId];
  var slideHotspotCount = Object.keys(slideHotspots).length;

  if (slideHotspotCount >= this.options.maxHotspots) {
    throw new Error('Maximum ' + this.options.maxHotspots + ' hotspots allowed per slide');
  }

  var hotspotId = config.id || this.generateHotspotId();

  var hotspot = Object.assign({}, HOTSPOT_DEFAULTS, config, {
    id: hotspotId,
    slideId: this.activeSlideId,
    order: slideHotspotCount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  if (this.options.validateOnUpdate) {
    this.validateHotspot(hotspot);
  }

  slideHotspots[hotspotId] = hotspot;

  this.syncHotspotToComponents(hotspot, 'create');

  this.queueChange('create', hotspot);

  this.emit('hotspotCreated', hotspot);

  return hotspot;
};

HotspotManager.prototype.updateHotspot = function(hotspotId, updates) {
  updates = updates || {};
  var hotspot = this.getHotspot(hotspotId);
  if (!hotspot) {
    throw new Error('Hotspot ' + hotspotId + ' not found');
  }

  var previousState = Object.assign({}, hotspot);

  Object.assign(hotspot, updates, {
    updatedAt: new Date().toISOString()
  });

  if (this.options.validateOnUpdate) {
    this.validateHotspot(hotspot);
  }

  this.syncHotspotToComponents(hotspot, 'update');

  this.queueChange('update', hotspot, previousState);

  this.emit('hotspotUpdated', { hotspot: hotspot, previousState: previousState, updates: updates });

  return hotspot;
};

HotspotManager.prototype.updateHotspotPosition = function(hotspotId, position) {
  var hotspot = this.getHotspot(hotspotId);
  if (!hotspot) return;

  hotspot.position = Object.assign({}, position);
  hotspot.updatedAt = new Date().toISOString();

  if (this.canvas) {
    this.canvas.updateHotspot(hotspotId, { position: position });
  }

  this.debouncedSave(hotspotId);

  this.emit('hotspotPositionChanged', { hotspotId: hotspotId, position: position });
};

HotspotManager.prototype.deleteHotspot = function(hotspotId) {
  var hotspot = this.getHotspot(hotspotId);
  if (!hotspot) {
    throw new Error('Hotspot ' + hotspotId + ' not found');
  }

  var slideHotspots = this.hotspots[this.activeSlideId];

  delete slideHotspots[hotspotId];

  this.reorderHotspots();

  if (this.selectedHotspotId === hotspotId) {
    this.selectHotspot(null);
  }

  this.syncHotspotToComponents(hotspot, 'delete');

  this.queueChange('delete', hotspot);

  this.emit('hotspotDeleted', hotspot);

  return true;
};

HotspotManager.prototype.selectHotspot = function(hotspotId) {
  var previousSelection = this.selectedHotspotId;

  if (hotspotId && !this.getHotspot(hotspotId)) {
    console.warn('Hotspot ' + hotspotId + ' not found, cannot select');
    return;
  }

  this.selectedHotspotId = hotspotId;

  if (this.canvas) {
    this.canvas.selectHotspot(hotspotId);
  }

  if (this.configPanel) {
    var hotspot = hotspotId ? this.getHotspot(hotspotId) : null;
    this.configPanel.setHotspot(hotspot);
  }

  if (this.sequencer) {
    var hotspots = this.getSlideHotspots(this.activeSlideId);
    var index = -1;
    for (var i = 0; i < hotspots.length; i++) {
        if(hotspots[i].id === hotspotId) {
            index = i;
            break;
        }
    }
    if (index !== -1) {
      this.sequencer.setCurrentIndex(index);
    }
  }

  this.emit('hotspotSelectionChanged', {
    selectedId: hotspotId,
    previousId: previousSelection,
    hotspot: hotspotId ? this.getHotspot(hotspotId) : null
  });
};

HotspotManager.prototype.reorderHotspot = function(hotspotId, fromIndex, toIndex) {
  var hotspots = this.getSlideHotspots(this.activeSlideId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex >= hotspots.length || toIndex >= hotspots.length) {
    return;
  }

  var reorderedHotspots = [].concat(hotspots);
  var movedHotspot = reorderedHotspots.splice(fromIndex, 1)[0];
  reorderedHotspots.splice(toIndex, 0, movedHotspot);

  reorderedHotspots.forEach(function(hotspot, index) {
    hotspot.order = index;
    hotspot.updatedAt = new Date().toISOString();
  });

  this.syncSequencerWithHotspots(reorderedHotspots);

  this.queueChange('reorder', { hotspots: reorderedHotspots });

  this.emit('hotspotsReordered', { fromIndex: fromIndex, toIndex: toIndex, hotspots: reorderedHotspots });
};

HotspotManager.prototype.getHotspot = function(hotspotId) {
  if (!this.activeSlideId) return null;
  var slideHotspots = this.hotspots[this.activeSlideId];
  return slideHotspots ? slideHotspots[hotspotId] : null;
};

HotspotManager.prototype.getSlideHotspots = function(slideId) {
  var slideHotspots = this.hotspots[slideId];
  if (!slideHotspots) return [];

  var hotspotsArray = [];
  for (var id in slideHotspots) {
      if(slideHotspots.hasOwnProperty(id)) {
        hotspotsArray.push(slideHotspots[id]);
      }
  }
  
  return hotspotsArray.sort(function(a, b) {
    return (a.order || 0) - (b.order || 0);
  });
};

HotspotManager.prototype.getSelectedHotspot = function() {
  return this.selectedHotspotId ? this.getHotspot(this.selectedHotspotId) : null;
};

HotspotManager.prototype.loadSlideHotspots = function(slideId) {
  if (!this.sheetsAPI) {
    console.warn('GoogleSheetsAPI not available, using local storage only');
    return this.getSlideHotspots(slideId);
  }

  try {
    var hotspots = this.sheetsAPI.getHotspotsBySlide(slideId);

    var slideHotspotsMap = {};
    hotspots.forEach(function(hotspot) {
      slideHotspotsMap[hotspot.id] = hotspot;
    });
    this.hotspots[slideId] = slideHotspotsMap;

    if (slideId === this.activeSlideId) {
      this.syncComponentsWithSlide(slideId);
    }

    return hotspots;
  } catch (error) {
    console.error('Failed to load hotspots from sheets:', error);
    return this.getSlideHotspots(slideId);
  }
};

HotspotManager.prototype.saveSlideHotspots = function(slideId) {
  var targetSlideId = slideId || this.activeSlideId;
  if (!targetSlideId) return false;

  if (!this.sheetsAPI) {
    console.warn('GoogleSheetsAPI not available, changes saved locally only');
    return true;
  }

  try {
    var hotspots = this.getSlideHotspots(targetSlideId);
    this.sheetsAPI.saveHotspots(hotspots);

    this.changeQueue = this.changeQueue.filter(function(change) {
      return change.data.slideId !== targetSlideId;
    });

    return true;
  } catch (error) {
    console.error('Failed to save hotspots to sheets:', error);
    return false;
  }
};

HotspotManager.prototype.validateHotspot = function(hotspot) {
  var errors = [];

  if (!hotspot.id) errors.push('Hotspot ID is required');
  if (!hotspot.slideId) errors.push('Slide ID is required');
  if (!hotspot.name || hotspot.name.trim().length === 0) {
    errors.push('Hotspot name is required');
  }

  var nameRule = VALIDATION_RULES.HOTSPOT_NAME;
  if (hotspot.name && hotspot.name.length > nameRule.maxLength) {
    errors.push('Hotspot name must be ' + nameRule.maxLength + ' characters or less');
  }

  if (!hotspot.position || typeof hotspot.position.x !== 'number' || typeof hotspot.position.y !== 'number') {
    errors.push('Valid position coordinates are required');
  }

  if (hotspot.size && (hotspot.size < 16 || hotspot.size > 100)) {
    errors.push('Hotspot size must be between 16 and 100 pixels');
  }

  if (hotspot.eventType) {
    switch (hotspot.eventType) {
      case EVENT_TYPES.TEXT_ON_IMAGE:
      case EVENT_TYPES.TEXT_POPUP:
        if (!hotspot.tooltipContent || hotspot.tooltipContent.trim().length === 0) {
          errors.push('Tooltip content is required for text events');
        }
        break;

      case EVENT_TYPES.PAN_ZOOM:
        if (hotspot.zoomLevel && (hotspot.zoomLevel < UI_CONFIG.MIN_ZOOM_LEVEL || hotspot.zoomLevel > UI_CONFIG.MAX_ZOOM_LEVEL)) {
          errors.push('Zoom level must be between ' + UI_CONFIG.MIN_ZOOM_LEVEL + ' and ' + UI_CONFIG.MAX_ZOOM_LEVEL);
        }
        break;
    }
  }

  if (errors.length > 0) {
    throw new Error('Hotspot validation failed: ' + errors.join(', '));
  }
};

HotspotManager.prototype.syncHotspotToComponents = function(hotspot, action) {
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
    var hotspots = this.getSlideHotspots(this.activeSlideId);
    this.sequencer.setHotspots(hotspots);
  }

  if (this.configPanel && this.selectedHotspotId === hotspot.id) {
    this.configPanel.setHotspot(action === 'delete' ? null : hotspot);
  }
};

HotspotManager.prototype.syncComponentsWithSlide = function(slideId) {
  var hotspots = this.getSlideHotspots(slideId);

  if (this.canvas) {
    this.canvas.setHotspots(hotspots);
  }

  if (this.sequencer) {
    this.sequencer.setHotspots(hotspots);
  }

  if (this.configPanel) {
    this.configPanel.setHotspot(null);
  }
};

HotspotManager.prototype.syncSequencerWithHotspots = function(hotspots) {
  if (this.sequencer) {
    this.sequencer.setHotspots(hotspots);
  }
};

HotspotManager.prototype.generateHotspotId = function() {
  return 'hotspot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

HotspotManager.prototype.reorderHotspots = function() {
  if (!this.activeSlideId) return;

  var hotspots = this.getSlideHotspots(this.activeSlideId);
  hotspots.forEach(function(hotspot, index) {
    hotspot.order = index;
  });
};

HotspotManager.prototype.queueChange = function(action, data, previousState) {
  previousState = previousState || null;
  this.changeQueue.push({
    action: action,
    data: data,
    previousState: previousState,
    timestamp: Date.now()
  });

  if (this.options.autoSave) {
    this.processChangesDelayed();
  }
};

HotspotManager.prototype.processChangesDelayed = function() {
  var self = this;
  if (this.processChangesTimeout) {
    clearTimeout(this.processChangesTimeout);
  }

  this.processChangesTimeout = setTimeout(function() {
    self.processPendingChanges();
  }, 1000);
};

HotspotManager.prototype.processPendingChanges = function() {
  if (this.isProcessingChanges || this.changeQueue.length === 0) return;

  this.isProcessingChanges = true;

  try {
    this.saveSlideHotspots();
  } catch (error) {
    console.error('Failed to process pending changes:', error);
  } finally {
    this.isProcessingChanges = false;
  }
};

HotspotManager.prototype.debouncedSave = function(hotspotId) {
  var self = this;
  if (this.debouncedSaveTimeouts) {
    clearTimeout(this.debouncedSaveTimeouts[hotspotId]);
  } else {
    this.debouncedSaveTimeouts = {};
  }

  this.debouncedSaveTimeouts[hotspotId] = setTimeout(function() {
    var hotspot = self.getHotspot(hotspotId);
    if (hotspot) {
      self.queueChange('update', hotspot);
    }
  }, 500);
};

HotspotManager.prototype.setupAutoSave = function() {
  // This function is intentionally left empty because its previous content
  // (window.addEventListener and setInterval) is not compatible with the
  // Google Apps Script server-side environment.
};

HotspotManager.prototype.on = function(event, callback) {
  if (!this.eventListeners.hasOwnProperty(event)) {
    this.eventListeners[event] = [];
  }
  this.eventListeners[event].push(callback);
};

HotspotManager.prototype.off = function(event, callback) {
  var listeners = this.eventListeners[event];
  if (listeners) {
    var index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
};

HotspotManager.prototype.emit = function(event, data) {
  var self = this;
  var listeners = this.eventListeners[event];
  if (listeners) {
    listeners.forEach(function(callback) {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event listener for ' + event + ':', error);
      }
    });
  }
};

HotspotManager.prototype.getStatistics = function() {
  var activeSlideHotspots = this.getSlideHotspots(this.activeSlideId || '');

  return {
    totalSlides: Object.keys(this.hotspots).length,
    activeSlide: this.activeSlideId,
    hotspotsInActiveSlide: activeSlideHotspots.length,
    selectedHotspot: this.selectedHotspotId,
    pendingChanges: this.changeQueue.length,
    maxHotspotsPerSlide: this.options.maxHotspots
  };
};

HotspotManager.prototype.clear = function() {
  this.hotspots = {};
  this.activeSlideId = null;
  this.selectedHotspotId = null;
  this.changeQueue = [];
  this.clearTimeouts();
};

HotspotManager.prototype.clearTimeouts = function() {
  if (this.processChangesTimeout) {
    clearTimeout(this.processChangesTimeout);
    this.processChangesTimeout = null;
  }

  if (this.debouncedSaveTimeouts) {
    for(var id in this.debouncedSaveTimeouts) {
        if(this.debouncedSaveTimeouts.hasOwnProperty(id)) {
            clearTimeout(this.debouncedSaveTimeouts[id]);
        }
    }
    this.debouncedSaveTimeouts = {};
  }
};

HotspotManager.prototype.destroy = function() {
  this.processPendingChanges();
  this.clearTimeouts();
  this.clear();
  this.eventListeners = {};
};
}
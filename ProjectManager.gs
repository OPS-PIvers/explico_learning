/**
 * ProjectManager Service for Explico Learning
 * Orchestrates project-level operations and coordinates all other services
 */

function ProjectManager(options) {
  options = options || {};
  this.options = {
    autoSave: true,
    maxProjects: 50,
    defaultThumbnailSize: { width: 240, height: 135 }
  };
  this.options = Object.assign(this.options, options);

  this.currentProject = null;
  this.currentSlide = null;
  this.isInitialized = false;
  this.eventListeners = {}; // Replaced Map with Object

  // Service instances
  this.sheetsAPI = null;
  this.hotspotManager = null;
  this.mediaHandler = null;
  this.eventTypeHandlers = null;

  // Component references (set by application)
  this.dashboard = null;
  this.header = null;
  this.sidebar = null;
  this.canvas = null;
  this.configPanel = null;
  this.sequencer = null;
}
  
  /**
   * Initialize the project manager with services
   * @param {Object} services - Service instances
   * @returns {Promise<void>}
   */
ProjectManager.prototype.initialize = function(services) {
  services = services || {};
  try {
    // Initialize services
    this.sheetsAPI = services.sheetsAPI || new GoogleSheetsAPI();
    this.mediaHandler = services.mediaHandler || new MediaHandler();
    this.eventTypeHandlers = services.eventTypeHandlers || new EventTypeHandlers();
    this.hotspotManager = services.hotspotManager || new HotspotManager();
    
    // Initialize hotspot manager with dependencies
    this.hotspotManager.initialize({
      sheetsAPI: this.sheetsAPI,
      eventTypeHandlers: this.eventTypeHandlers
    });
    
    this.isInitialized = true;

    // Set up event listeners
    this.setupEventListeners();

    console.log('ProjectManager initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ProjectManager:', error);
    throw error;
  }
};

ProjectManager.prototype.setComponents = function(components) {
  components = components || {};
  this.dashboard = components.dashboard;
  this.header = components.header;
  this.sidebar = components.sidebar;
  this.canvas = components.canvas;
  this.configPanel = components.configPanel;
  this.sequencer = components.sequencer;

  // Pass components to hotspot manager
  if (this.hotspotManager) {
    this.hotspotManager.setComponents({
      canvas: this.canvas,
      configPanel: this.configPanel,
      sequencer: this.sequencer
    });
  }
  
  this.setupComponentEventHandlers();
};

  /**
   * Setup component event handlers
   */
ProjectManager.prototype.setupComponentEventHandlers = function() {
  var self = this;
  if (this.dashboard) {
    this.dashboard.options.onProjectSelect = function(project) { return self.openProject(project.id); };
    this.dashboard.options.onProjectCreate = function() { return self.createNewProject(); };
    this.dashboard.options.onProjectEdit = function(project) { return self.openProject(project.id); };
    this.dashboard.options.onProjectDelete = function(project) { return self.deleteProject(project.id); };
    this.dashboard.options.onProjectDuplicate = function(project) { return self.duplicateProject(project.id); };
  }
  
  if (this.header) {
    this.header.options.onSave = function() { return self.saveCurrentProject(); };
    this.header.options.onShare = function() { return self.shareCurrentProject(); };
  }
  
  if (this.sidebar) {
    this.sidebar.options.onSlideSelect = function(slideId) { return self.selectSlide(slideId); };
    this.sidebar.options.onSlideAdd = function() { return self.createNewSlide(); };
    this.sidebar.options.onSlideDelete = function(slideId) { return self.deleteSlide(slideId); };
    this.sidebar.options.onSlideReorder = function(fromIndex, toIndex) { return self.reorderSlides(fromIndex, toIndex); };
  }
};

ProjectManager.prototype.setupEventListeners = function() {
  var self = this;
  if (this.hotspotManager) {
    this.hotspotManager.on('hotspotCreated', function(hotspot) {
      self.emit('hotspotCreated', hotspot);
      if (self.options.autoSave) {
        self.debouncedSave();
      }
    });
    
    this.hotspotManager.on('hotspotUpdated', function(data) {
      self.emit('hotspotUpdated', data);
      if (self.options.autoSave) {
        self.debouncedSave();
      }
    });
    
    this.hotspotManager.on('hotspotDeleted', function(hotspot) {
      self.emit('hotspotDeleted', hotspot);
      if (self.options.autoSave) {
        self.debouncedSave();
      }
    });
  }
};
  
ProjectManager.prototype.createNewProject = function(projectData) {
  this.ensureInitialized();
  projectData = projectData || {};

  var project = Object.assign({}, PROJECT_DEFAULTS, {
    name: projectData.name || 'New Walkthrough',
    description: projectData.description || '',
    createdBy: this.getCurrentUser()
  }, projectData);

  try {
    var createdProject = this.sheetsAPI.createProject(project);

    if (!this.sheetsAPI.getSpreadsheetId()) {
      this.sheetsAPI.initialize(createdProject.id);
    }

    var initialSlide = this.createSlide({
      projectId: createdProject.id,
      name: 'Slide 1',
      order: 0
    });

    createdProject.slides = [initialSlide];

    this.emit('projectCreated', createdProject);
    return createdProject;
  } catch (error) {
    console.error('Failed to create project:', error);
    throw error;
  }
};

ProjectManager.prototype.openProject = function(projectId) {
  this.ensureInitialized();

  try {
    this.sheetsAPI.initialize(projectId);

    var project = this.sheetsAPI.getProject(projectId);
    if (!project) {
      throw new Error('Project ' + projectId + ' not found');
    }

    project.slides = this.sheetsAPI.getSlidesByProject(projectId);

    this.currentProject = project;
    this.currentSlide = project.slides[0] || null;

    this.syncProjectToComponents();

    if (this.currentSlide) {
      this.selectSlide(this.currentSlide.id);
    }

    this.emit('projectOpened', project);
    return project;
  } catch (error) {
    console.error('Failed to open project:', error);
    throw error;
  }
};

ProjectManager.prototype.saveCurrentProject = function() {
  if (!this.currentProject) {
    console.warn('No current project to save');
    return false;
  }

  try {
    this.currentProject.updatedAt = new Date().toISOString();

    this.sheetsAPI.updateProject(this.currentProject.id, this.currentProject);

    if (this.currentSlide && this.hotspotManager) {
      this.hotspotManager.saveSlideHotspots(this.currentSlide.id);
    }

    if (this.header) {
      this.header.setDirty(false);
    }

    this.emit('projectSaved', this.currentProject);
    return true;
  } catch (error) {
    console.error('Failed to save project:', error);
    this.emit('projectSaveError', error);
    return false;
  }
};

ProjectManager.prototype.deleteProject = function(projectId) {
  this.ensureInitialized();

  try {
    this.sheetsAPI.deleteProject(projectId);

    if (this.currentProject && this.currentProject.id === projectId) {
      this.currentProject = null;
      this.currentSlide = null;
      this.clearComponents();
    }

    this.emit('projectDeleted', projectId);
    return true;
  } catch (error) {
    console.error('Failed to delete project:', error);
    throw error;
  }
};

ProjectManager.prototype.duplicateProject = function(projectId) {
  this.ensureInitialized();
  var self = this;

  try {
    var originalProject = this.sheetsAPI.getProject(projectId);
    if (!originalProject) {
      throw new Error('Project ' + projectId + ' not found');
    }

    var duplicatedProjectData = Object.assign({}, originalProject, {
      name: originalProject.name + ' (Copy)',
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined
    });
    var duplicatedProject = this.createNewProject(duplicatedProjectData);

    var originalSlides = this.sheetsAPI.getSlidesByProject(projectId);
    for (var i = 0; i < originalSlides.length; i++) {
      var slide = originalSlides[i];
      var duplicatedSlideData = Object.assign({}, slide, {
        id: undefined,
        projectId: duplicatedProject.id,
        createdAt: undefined,
        updatedAt: undefined
      });
      var duplicatedSlide = this.createSlide(duplicatedSlideData);

      var originalHotspots = this.sheetsAPI.getHotspotsBySlide(slide.id);
      var duplicatedHotspots = originalHotspots.map(function(hotspot) {
        return Object.assign({}, hotspot, {
          id: undefined,
          slideId: duplicatedSlide.id,
          createdAt: undefined,
          updatedAt: undefined
        });
      });

      if (duplicatedHotspots.length > 0) {
        this.sheetsAPI.saveHotspots(duplicatedHotspots);
      }
    }

    this.emit('projectDuplicated', { original: originalProject, duplicate: duplicatedProject });
    return duplicatedProject;
  } catch (error) {
    console.error('Failed to duplicate project:', error);
    throw error;
  }
};

ProjectManager.prototype.getAllProjects = function() {
  this.ensureInitialized();

  try {
    var projects = this.sheetsAPI.getAllProjects();

    for (var i = 0; i < projects.length; i++) {
      var project = projects[i];
      project.analytics = this.calculateProjectAnalytics(project.id);
    }

    return projects;
  } catch (error) {
    console.error('Failed to get all projects:', error);
    throw error;
  }
};

ProjectManager.prototype.createSlide = function(slideData) {
  slideData = slideData || {};
  if (!this.currentProject && !slideData.projectId) {
    throw new Error('No current project or project ID provided');
  }

  var slideName = slideData.name || 'Slide ' + (((this.currentProject && this.currentProject.slides) ? this.currentProject.slides.length : 0) + 1);
  var order = slideData.order !== undefined ? slideData.order : ((this.currentProject && this.currentProject.slides) ? this.currentProject.slides.length : 0);

  var slide = Object.assign({}, SLIDE_DEFAULTS, {
    projectId: slideData.projectId || this.currentProject.id,
    name: slideName,
    order: order
  }, slideData);

  try {
    var createdSlide = this.sheetsAPI.createSlide(slide);

    if (this.currentProject && createdSlide.projectId === this.currentProject.id) {
      this.currentProject.slides = this.currentProject.slides || [];
      this.currentProject.slides.push(createdSlide);
      this.syncSlidesToSidebar();
    }

    this.emit('slideCreated', createdSlide);
    return createdSlide;
  } catch (error) {
    console.error('Failed to create slide:', error);
    throw error;
  }
};

ProjectManager.prototype.selectSlide = function(slideId) {
  if (!this.currentProject) {
    throw new Error('No current project loaded');
  }

  var slide = null;
  for (var i = 0; i < this.currentProject.slides.length; i++) {
    if (this.currentProject.slides[i].id === slideId) {
      slide = this.currentProject.slides[i];
      break;
    }
  }

  if (!slide) {
    throw new Error('Slide ' + slideId + ' not found');
  }

  try {
    this.currentSlide = slide;

    if (this.hotspotManager) {
      this.hotspotManager.setActiveSlide(slideId);
      this.hotspotManager.loadSlideHotspots(slideId);
    }

    if (this.canvas) {
      this.updateCanvasBackground(slide);
    }

    if (this.sidebar) {
      this.sidebar.selectSlide(slideId);
    }

    this.emit('slideSelected', slide);
    return slide;
  } catch (error) {
    console.error('Failed to select slide:', error);
    throw error;
  }
};

ProjectManager.prototype.deleteSlide = function(slideId) {
  if (!this.currentProject) {
    throw new Error('No current project loaded');
  }
  var self = this;
  try {
    this.sheetsAPI.deleteHotspotsBySlide(slideId);

    this.sheetsAPI.deleteRowById(SHEETS_CONFIG.SLIDES_SHEET, slideId);

    this.currentProject.slides = this.currentProject.slides.filter(function(s) {
      return s.id !== slideId;
    });

    if (this.currentSlide && this.currentSlide.id === slideId) {
      var nextSlide = this.currentProject.slides[0];
      if (nextSlide) {
        this.selectSlide(nextSlide.id);
      } else {
        this.currentSlide = null;
        this.clearCanvas();
      }
    }

    this.syncSlidesToSidebar();

    this.emit('slideDeleted', slideId);
    return true;
  } catch (error) {
    console.error('Failed to delete slide:', error);
    throw error;
  }
};

ProjectManager.prototype.updateSlideBackground = function(slideId, backgroundUrl, backgroundType) {
  try {
    var mediaInfo = this.mediaHandler.processMediaUrl(backgroundUrl);
    if (!mediaInfo.isValid) {
      throw new Error(mediaInfo.error || 'Invalid media URL');
    }

    var updatedSlide = this.sheetsAPI.updateSlide(slideId, {
      backgroundUrl: backgroundUrl,
      backgroundType: backgroundType || mediaInfo.type
    });

    if (this.currentProject) {
      var slideIndex = -1;
      for (var i = 0; i < this.currentProject.slides.length; i++) {
          if (this.currentProject.slides[i].id === slideId) {
              slideIndex = i;
              break;
          }
      }
      if (slideIndex !== -1) {
        this.currentProject.slides[slideIndex] = updatedSlide;
      }
    }

    if (this.currentSlide && this.currentSlide.id === slideId) {
      this.currentSlide = updatedSlide;
      this.updateCanvasBackground(updatedSlide);
    }

    this.syncSlidesToSidebar();

    this.emit('slideBackgroundUpdated', updatedSlide);
    return updatedSlide;
  } catch (error) {
    console.error('Failed to update slide background:', error);
    throw error;
  }
};

ProjectManager.prototype.updateCanvasBackground = function(slide) {
  if (!this.canvas || !slide.backgroundUrl) return;

  try {
    this.canvas.setBackground(slide.backgroundUrl, slide.backgroundType);
  } catch (error) {
    console.error('Failed to update canvas background:', error);
  }
};

ProjectManager.prototype.reorderSlides = function(fromIndex, toIndex) {
  if (!this.currentProject || !this.currentProject.slides) {
    return false;
  }

  try {
    var slides = [].concat(this.currentProject.slides);
    var movedSlide = slides.splice(fromIndex, 1)[0];
    slides.splice(toIndex, 0, movedSlide);

    for (var i = 0; i < slides.length; i++) {
      slides[i].order = i;
      this.sheetsAPI.updateSlide(slides[i].id, { order: i });
    }

    this.currentProject.slides = slides;
    this.syncSlidesToSidebar();

    this.emit('slidesReordered', { fromIndex: fromIndex, toIndex: toIndex, slides: slides });
    return true;
  } catch (error) {
    console.error('Failed to reorder slides:', error);
    throw error;
  }
};

ProjectManager.prototype.calculateProjectAnalytics = function(projectId) {
  try {
    var analytics = this.sheetsAPI.getAnalytics(projectId);

    var views = analytics.filter(function(a) { return a.eventType === 'view'; }).length;
    var completions = analytics.filter(function(a) { return a.eventType === 'complete'; }).length;
    var completionRate = views > 0 ? (completions / views) * 100 : 0;

    return {
      views: views,
      completionRate: Math.round(completionRate),
      averageTime: 0, // TODO: Calculate from analytics
      lastViewed: analytics.length > 0 ? analytics[0].timestamp : null
    };
  } catch (error) {
    console.error('Failed to calculate analytics:', error);
    return {
      views: 0,
      completionRate: 0,
      averageTime: 0,
      lastViewed: null
    };
  }
};

ProjectManager.prototype.shareCurrentProject = function() {
  if (!this.currentProject) {
    console.warn('No current project to share');
    return;
  }

  // TODO: Implement sharing functionality
  console.log('Sharing project:', this.currentProject.id);
  this.emit('projectShared', this.currentProject);
};

ProjectManager.prototype.exportProject = function(format) {
  format = format || 'json';
  if (!this.currentProject) {
    throw new Error('No current project to export');
  }

  try {
    var projectData = {
      project: this.currentProject,
      slides: this.sheetsAPI.getSlidesByProject(this.currentProject.id),
      hotspots: {}
    };

    for (var i = 0; i < projectData.slides.length; i++) {
      var slide = projectData.slides[i];
      projectData.hotspots[slide.id] = this.sheetsAPI.getHotspotsBySlide(slide.id);
    }

    switch (format.toLowerCase()) {
      case 'json':
        return new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });

      default:
        throw new Error('Unsupported export format: ' + format);
    }
  } catch (error) {
    console.error('Failed to export project:', error);
    throw error;
  }
};

ProjectManager.prototype.importProject = function(projectData) {
  var self = this;
  try {
    var newProject = this.createNewProject(
      Object.assign({}, projectData.project, {
        id: undefined,
        name: projectData.project.name + ' (Imported)'
      })
    );

    for (var i = 0; i < (projectData.slides || []).length; i++) {
      var slide = projectData.slides[i];
      var newSlide = this.createSlide(
        Object.assign({}, slide, {
          id: undefined,
          projectId: newProject.id
        })
      );

      var slideHotspots = projectData.hotspots[slide.id] || [];
      if (slideHotspots.length > 0) {
        var newHotspots = slideHotspots.map(function(hotspot) {
          return Object.assign({}, hotspot, {
            id: undefined,
            slideId: newSlide.id
          });
        });

        this.sheetsAPI.saveHotspots(newHotspots);
      }
    }

    this.emit('projectImported', newProject);
    return newProject;
  } catch (error) {
    console.error('Failed to import project:', error);
    throw error;
  }
};

ProjectManager.prototype.syncProjectToComponents = function() {
  if (!this.currentProject) return;

  if (this.header) {
    this.header.setTitle(this.currentProject.name);
  }

  this.syncSlidesToSidebar();
};

ProjectManager.prototype.syncSlidesToSidebar = function() {
  if (!this.sidebar || !this.currentProject) return;

  this.sidebar.setSlides(this.currentProject.slides || []);
};

ProjectManager.prototype.clearComponents = function() {
  if (this.canvas) {
    this.canvas.clearHotspots();
    this.canvas.setBackground('', MEDIA_TYPES.IMAGE);
  }

  if (this.sidebar) {
    this.sidebar.setSlides([]);
  }

  if (this.configPanel) {
    this.configPanel.setHotspot(null);
  }

  if (this.sequencer) {
    this.sequencer.setHotspots([]);
  }
};

ProjectManager.prototype.clearCanvas = function() {
  if (this.canvas) {
    this.canvas.clearHotspots();
    this.canvas.setBackground('', MEDIA_TYPES.IMAGE);
  }
};

ProjectManager.prototype.getCurrentUser = function() {
  return Session.getActiveUser().getEmail();
};

ProjectManager.prototype.debouncedSave = function() {
  var self = this;
  if (this.saveTimeout) {
    clearTimeout(this.saveTimeout);
  }

  this.saveTimeout = setTimeout(function() {
    self.saveCurrentProject();
  }, 2000);
};

ProjectManager.prototype.on = function(event, callback) {
  if (!this.eventListeners.hasOwnProperty(event)) {
    this.eventListeners[event] = [];
  }
  this.eventListeners[event].push(callback);
};

ProjectManager.prototype.off = function(event, callback) {
  var listeners = this.eventListeners[event];
  if (listeners) {
    var index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
};

ProjectManager.prototype.emit = function(event, data) {
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

ProjectManager.prototype.ensureInitialized = function() {
  if (!this.isInitialized) {
    throw new Error('ProjectManager not initialized. Call initialize() first.');
  }
};

ProjectManager.prototype.getCurrentProject = function() {
  return this.currentProject;
};

ProjectManager.prototype.getCurrentSlide = function() {
  return this.currentSlide;
};

ProjectManager.prototype.getStats = function() {
  return {
    initialized: this.isInitialized,
    currentProject: this.currentProject ? this.currentProject.id : null,
    currentSlide: this.currentSlide ? this.currentSlide.id : null,
    hotspotManagerStats: this.hotspotManager ? this.hotspotManager.getStatistics() : null,
    mediaHandlerStats: this.mediaHandler ? this.mediaHandler.getCacheStats() : null,
    sheetsAPIStats: this.sheetsAPI ? this.sheetsAPI.getStats() : null
  };
};

ProjectManager.prototype.destroy = function() {
  if (this.saveTimeout) {
    clearTimeout(this.saveTimeout);
  }

  if (this.hotspotManager) {
    this.hotspotManager.destroy();
  }

  if (this.mediaHandler) {
    this.mediaHandler.destroy();
  }

  if (this.eventTypeHandlers) {
    this.eventTypeHandlers.destroy();
  }

  if (this.sheetsAPI) {
    this.sheetsAPI.destroy();
  }

  this.currentProject = null;
  this.currentSlide = null;
  this.isInitialized = false;
  this.eventListeners = {};
};
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Slide, Hotspot, HotspotEditorProps, CreateHotspotRequest } from '../../shared/types';
import { MainCanvas } from './MainCanvas';
import { Sidebar } from './Sidebar';
import { ConfigPanel } from './ConfigPanel';
import { AppHeader } from './AppHeader';
import { LoadingSpinner } from './common/LoadingSpinner';
import { ErrorMessage } from './common/ErrorMessage';
import { ErrorBoundary } from './common/ErrorBoundary';
import { ToastContainer } from './common/Toast';
import { SkipLink, LiveRegion } from './common/A11y';
import { useAutoSave } from '../hooks/useAutoSave';
import { useToast } from '../hooks/useToast';
import { useKeyboardShortcuts, createEditorShortcuts, createSlideNavigationShortcuts } from '../hooks/useKeyboardShortcuts';
import { useHelpPanel } from './common/HelpPanel';

// Import Google Apps Script types
import '../types/google-apps-script';

interface EditorState {
  project: Project | null;
  slides: Slide[];
  hotspots: Hotspot[];
  activeSlide: Slide | null;
  selectedHotspot: Hotspot | null;
  loading: boolean;
  error: string | null;
  isEditMode: boolean;
  hasUnsavedChanges: boolean;
  sidebarWidth: number;
  configPanelWidth: number;
}

export const HotspotEditor: React.FC<HotspotEditorProps> = ({
  projectId,
  initialSlides = [],
  initialHotspots = [],
  onSave
}) => {
  const [state, setState] = useState<EditorState>({
    project: null,
    slides: initialSlides,
    hotspots: initialHotspots,
    activeSlide: null,
    selectedHotspot: null,
    loading: true,
    error: null,
    isEditMode: true,
    hasUnsavedChanges: false,
    sidebarWidth: 300,
    configPanelWidth: 320
  });

  // Auto-save implementation
  const saveProjectData = useCallback(async (data: { slides: Slide[], hotspots: Hotspot[] }) => {
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(() => resolve())
          .withFailureHandler((error: any) => reject(new Error(error.message || 'Failed to save slides')))
          .saveSlides(projectId, data.slides);
      }),
      new Promise<void>((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(() => resolve())
          .withFailureHandler((error: any) => reject(new Error(error.message || 'Failed to save hotspots')))
          .saveHotspots(projectId, data.hotspots);
      })
    ]);
  }, [projectId]);

  // Auto-save hook
  const autoSave = useAutoSave({
    data: { slides: state.slides, hotspots: state.hotspots },
    onSave: saveProjectData,
    delay: 2000,
    enabled: state.hasUnsavedChanges && !state.loading,
    onSuccess: () => {
      setState(prev => ({ ...prev, hasUnsavedChanges: false }));
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  });

  // Load project data
  const loadProjectData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const data = await new Promise<{
        project: Project;
        slides: Slide[];
        hotspots: Hotspot[];
      }>((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler((result: any) => {
            // Process dates
            const processedData = {
              project: {
                ...result.project,
                createdAt: new Date(result.project.createdAt),
                updatedAt: new Date(result.project.updatedAt)
              },
              slides: result.slides,
              hotspots: result.hotspots
            };
            resolve(processedData);
          })
          .withFailureHandler((error: any) => {
            reject(new Error(error.message || 'Failed to load project data'));
          })
          .getProjectData(projectId);
      });

      setState(prev => ({
        ...prev,
        project: data.project,
        slides: data.slides,
        hotspots: data.hotspots,
        activeSlide: data.slides[0] || null,
        loading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load project data'
      }));
    }
  }, [projectId]);

  // Toast notifications
  const toast = useToast();

  // Manual save
  const handleSaveNow = useCallback(async () => {
    try {
      await autoSave.saveNow();
      toast.showSuccess('Project saved successfully');
    } catch (error) {
      console.error('Manual save failed:', error);
      toast.showError('Failed to save project');
    }
  }, [autoSave, toast]);

  // Navigate to next slide
  const goToNextSlide = useCallback(() => {
    if (!state.activeSlide) return;
    const currentIndex = state.slides.findIndex(s => s.id === state.activeSlide!.id);
    if (currentIndex < state.slides.length - 1) {
      handleSlideSelect(state.slides[currentIndex + 1]);
    }
  }, [state.activeSlide, state.slides]);

  // Navigate to previous slide
  const goToPrevSlide = useCallback(() => {
    if (!state.activeSlide) return;
    const currentIndex = state.slides.findIndex(s => s.id === state.activeSlide!.id);
    if (currentIndex > 0) {
      handleSlideSelect(state.slides[currentIndex - 1]);
    }
  }, [state.activeSlide, state.slides]);

  // Navigate to first slide
  const goToFirstSlide = useCallback(() => {
    if (state.slides.length > 0) {
      handleSlideSelect(state.slides[0]);
    }
  }, [state.slides]);

  // Navigate to last slide
  const goToLastSlide = useCallback(() => {
    if (state.slides.length > 0) {
      handleSlideSelect(state.slides[state.slides.length - 1]);
    }
  }, [state.slides]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedHotspot: null }));
  }, []);

  // Keyboard shortcuts
  const editorShortcuts = createEditorShortcuts({
    save: handleSaveNow,
    undo: () => toast.showInfo('Undo feature coming soon'),
    redo: () => toast.showInfo('Redo feature coming soon'),
    delete: () => {
      if (state.selectedHotspot) {
        handleHotspotDelete(state.selectedHotspot.id);
      }
    },
    escape: clearSelection,
    copy: () => toast.showInfo('Copy feature coming soon'),
    paste: () => toast.showInfo('Paste feature coming soon'),
    selectAll: () => toast.showInfo('Select all feature coming soon'),
    toggleMode: () => setState(prev => ({ ...prev, isEditMode: !prev.isEditMode })),
    zoomIn: () => toast.showInfo('Zoom in feature coming soon'),
    zoomOut: () => toast.showInfo('Zoom out feature coming soon'),
    resetZoom: () => toast.showInfo('Reset zoom feature coming soon')
  });

  const navigationShortcuts = createSlideNavigationShortcuts({
    nextSlide: goToNextSlide,
    prevSlide: goToPrevSlide,
    firstSlide: goToFirstSlide,
    lastSlide: goToLastSlide
  });

  const allShortcuts = [...editorShortcuts, ...navigationShortcuts];

  useKeyboardShortcuts({
    shortcuts: allShortcuts,
    enabled: !state.loading
  });

  // Add missing slide handlers
  const handleSlideReorder = useCallback((slides: Slide[]) => {
    setState(prev => ({
      ...prev,
      slides,
      hasUnsavedChanges: true
    }));
  }, []);

  const handleSlideCreate = useCallback((slideData: any) => {
    toast.showInfo('Create slide functionality coming soon');
  }, [toast]);

  const handleSlideDelete = useCallback((slideId: string) => {
    if (confirm('Are you sure you want to delete this slide?')) {
      toast.showInfo('Delete slide functionality coming soon');
    }
  }, [toast]);

  // Help panel
  const helpPanel = useHelpPanel(allShortcuts.map(shortcut => ({
    ...shortcut,
    displayKey: shortcut.key // Add the missing displayKey property
  })));

  // Handle slide selection
  const handleSlideSelect = useCallback((slide: Slide) => {
    setState(prev => ({
      ...prev,
      activeSlide: slide,
      selectedHotspot: null
    }));
  }, []);

  // Handle hotspot selection
  const handleHotspotSelect = useCallback((hotspot: Hotspot) => {
    setState(prev => ({ ...prev, selectedHotspot: hotspot }));
  }, []);

  // Handle hotspot creation
  const handleHotspotCreate = useCallback((request: CreateHotspotRequest) => {
    const newHotspot: Hotspot = {
      id: `hotspot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      slideId: request.slideId,
      x: request.x,
      y: request.y,
      width: request.width,
      height: request.height,
      eventType: request.eventType,
      triggerType: request.triggerType,
      config: request.config,
      order: state.hotspots.filter(h => h.slideId === request.slideId).length,
      isVisible: true
    };

    setState(prev => ({
      ...prev,
      hotspots: [...prev.hotspots, newHotspot],
      selectedHotspot: newHotspot,
      hasUnsavedChanges: true
    }));
  }, [state.hotspots]);

  // Handle hotspot update
  const handleHotspotUpdate = useCallback((updatedHotspot: Hotspot) => {
    setState(prev => ({
      ...prev,
      hotspots: prev.hotspots.map(h =>
        h.id === updatedHotspot.id ? updatedHotspot : h
      ),
      selectedHotspot: updatedHotspot,
      hasUnsavedChanges: true
    }));
  }, []);

  // Handle hotspot delete
  const handleHotspotDelete = useCallback((hotspotId: string) => {
    if (!confirm('Are you sure you want to delete this hotspot?')) {
      return;
    }

    setState(prev => ({
      ...prev,
      hotspots: prev.hotspots.filter(h => h.id !== hotspotId),
      selectedHotspot: prev.selectedHotspot?.id === hotspotId ? null : prev.selectedHotspot,
      hasUnsavedChanges: true
    }));
  }, []);

  // Get hotspots for active slide
  const activeSlideHotspots = React.useMemo(() => {
    return state.activeSlide
      ? state.hotspots.filter(h => h.slideId === state.activeSlide!.id)
      : [];
  }, [state.hotspots, state.activeSlide]);

  // Load project data on mount
  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            handleSaveNow();
            break;
          case 'z':
            event.preventDefault();
            // TODO: Implement undo
            break;
        }
      }
      if (event.key === 'Delete' && state.selectedHotspot) {
        handleHotspotDelete(state.selectedHotspot.id);
      }
      if (event.key === 'Escape') {
        setState(prev => ({ ...prev, selectedHotspot: null }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveNow, state.selectedHotspot, handleHotspotDelete]);

  if (state.loading) {
    return <LoadingSpinner message="Loading project..." />;
  }

  if (state.error) {
    return (
      <ErrorMessage
        message={state.error}
        onRetry={loadProjectData}
      />
    );
  }

  if (!state.project) {
    return <ErrorMessage message="Project not found" />;
  }

  // Live region announcements
  const [liveMessage, setLiveMessage] = useState('');

  // Update live message for screen readers
  useEffect(() => {
    if (state.activeSlide) {
      setLiveMessage(`Active slide: ${state.activeSlide.title}`);
    }
  }, [state.activeSlide]);

  useEffect(() => {
    if (state.selectedHotspot) {
      setLiveMessage(`Selected hotspot: ${state.selectedHotspot.config.text || 'Hotspot'}`);
    } else if (liveMessage.includes('Selected hotspot')) {
      setLiveMessage('Selection cleared');
    }
  }, [state.selectedHotspot]);

  return (
    <ErrorBoundary>
      <div className="hotspot-editor">
        <SkipLink targetId="main-content">Skip to main content</SkipLink>

        <LiveRegion>{liveMessage}</LiveRegion>

        <AppHeader
          project={state.project}
          hasUnsavedChanges={state.hasUnsavedChanges}
          isSaving={autoSave.isSaving}
          lastSaved={autoSave.lastSaved}
          onSaveNow={handleSaveNow}
          onToggleEditMode={() =>
            setState(prev => ({ ...prev, isEditMode: !prev.isEditMode }))
          }
          isEditMode={state.isEditMode}
        />

        <div className="editor-content" role="main">
          <Sidebar
            slides={state.slides}
            activeSlide={state.activeSlide || undefined}
            onSlideSelect={handleSlideSelect}
            onSlideReorder={handleSlideReorder}
            onSlideCreate={handleSlideCreate}
            onSlideDelete={handleSlideDelete}
            width={state.sidebarWidth}
          />

          <div id="main-content" className="main-content">
            <MainCanvas
              slide={state.activeSlide || undefined}
              hotspots={activeSlideHotspots}
              selectedHotspot={state.selectedHotspot || undefined}
              isEditMode={state.isEditMode}
              onHotspotSelect={handleHotspotSelect}
              onHotspotCreate={handleHotspotCreate}
              onHotspotUpdate={handleHotspotUpdate}
              onHotspotDelete={handleHotspotDelete}
            />
          </div>

          <ConfigPanel
            hotspot={state.selectedHotspot || undefined}
            onUpdate={handleHotspotUpdate}
            onDelete={handleHotspotDelete}
            width={state.configPanelWidth}
          />
        </div>

        {/* Status indicators */}
        <div className="editor-status" role="status" aria-live="polite">
          {autoSave.isSaving && (
            <div className="status-item saving">
              <span className="spinner-small" aria-hidden="true" />
              Saving...
            </div>
          )}
          {autoSave.isError && (
            <div className="status-item error">
              <span aria-hidden="true">⚠️</span> Save failed
            </div>
          )}
          {autoSave.lastSaved && !autoSave.isSaving && !state.hasUnsavedChanges && (
            <div className="status-item saved">
              <span aria-hidden="true">✓</span> Saved {autoSave.lastSaved.toLocaleTimeString()}
            </div>
          )}
          {state.hasUnsavedChanges && !autoSave.isSaving && (
            <div className="status-item unsaved">
              <span aria-hidden="true">•</span> Unsaved changes
            </div>
          )}
          <div className="status-item hotspots-count">
            {activeSlideHotspots.length} hotspot{activeSlideHotspots.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Toast notifications */}
        <ToastContainer toasts={toast.toasts} onRemoveToast={toast.removeToast} />

        {/* Help panel */}
        {helpPanel.helpPanel}
      </div>
    </ErrorBoundary>
  );
};
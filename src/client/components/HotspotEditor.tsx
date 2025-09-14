import React, { useState, useEffect, useCallback } from 'react';
import { Project, Slide, Hotspot, HotspotEditorProps } from '../../shared/types';
import { MainCanvas } from './MainCanvas';
import { Sidebar } from './Sidebar';
import { ConfigPanel } from './ConfigPanel';
import { AppHeader } from './AppHeader';
import { LoadingSpinner } from './common/LoadingSpinner';
import { ErrorMessage } from './common/ErrorMessage';

// Import Google Apps Script types
import '../types/google-apps-script';

interface EditorState {
  project: Project | null;
  slides: Slide[];
  hotspots: Hotspot[];
  activeSlide: Slide | null;
  selectedHotspot: Hotspot | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isEditMode: boolean;
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
    saving: false,
    error: null,
    isEditMode: true,
    sidebarWidth: 300,
    configPanelWidth: 320
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

  // Save hotspots to server
  const saveHotspots = useCallback(async (hotspots?: Hotspot[]) => {
    const hotspotsToSave = hotspots || state.hotspots;
    try {
      setState(prev => ({ ...prev, saving: true, error: null }));

      await new Promise<void>((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(() => resolve())
          .withFailureHandler((error: any) => {
            reject(new Error(error.message || 'Failed to save hotspots'));
          })
          .saveHotspots(projectId, hotspotsToSave);
      });

      setState(prev => ({ ...prev, saving: false }));

      if (onSave) {
        onSave(hotspotsToSave);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save hotspots'
      }));
    }
  }, [projectId, state.hotspots, onSave]);

  // Auto-save debounced
  const debouncedSave = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (hotspots: Hotspot[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          saveHotspots(hotspots);
        }, 1000);
      };
    })(),
    [saveHotspots]
  );

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
  const handleHotspotCreate = useCallback((request: any) => {
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

    const updatedHotspots = [...state.hotspots, newHotspot];
    setState(prev => ({
      ...prev,
      hotspots: updatedHotspots,
      selectedHotspot: newHotspot
    }));

    debouncedSave(updatedHotspots);
  }, [state.hotspots, debouncedSave]);

  // Handle hotspot update
  const handleHotspotUpdate = useCallback((updatedHotspot: Hotspot) => {
    const updatedHotspots = state.hotspots.map(h =>
      h.id === updatedHotspot.id ? updatedHotspot : h
    );

    setState(prev => ({
      ...prev,
      hotspots: updatedHotspots,
      selectedHotspot: updatedHotspot
    }));

    debouncedSave(updatedHotspots);
  }, [state.hotspots, debouncedSave]);

  // Handle hotspot delete
  const handleHotspotDelete = useCallback((hotspotId: string) => {
    const updatedHotspots = state.hotspots.filter(h => h.id !== hotspotId);
    setState(prev => ({
      ...prev,
      hotspots: updatedHotspots,
      selectedHotspot: prev.selectedHotspot?.id === hotspotId ? null : prev.selectedHotspot
    }));

    debouncedSave(updatedHotspots);
  }, [state.hotspots, debouncedSave]);

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
            saveHotspots();
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveHotspots, state.selectedHotspot, handleHotspotDelete]);

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

  return (
    <div className="hotspot-editor">
      <AppHeader
        project={state.project}
        isSaving={state.saving}
        onSave={() => saveHotspots()}
        onToggleEditMode={() =>
          setState(prev => ({ ...prev, isEditMode: !prev.isEditMode }))
        }
        isEditMode={state.isEditMode}
      />

      <div className="editor-content">
        <Sidebar
          slides={state.slides}
          activeSlide={state.activeSlide || undefined}
          onSlideSelect={handleSlideSelect}
          width={state.sidebarWidth}
        />

        <div className="main-content">
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
    </div>
  );
};
import { useState, useCallback, useEffect } from 'react';
import { Slide, Hotspot, Project, MediaType } from '../../shared/types';

export interface EditorState {
  project: Project | null;
  slides: Slide[];
  hotspots: Hotspot[];
  activeSlide: Slide | null;
  selectedHotspot: Hotspot | null;
  isEditMode: boolean;
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

interface UseEditorStateOptions {
  projectId: string;
  onDataChange?: (data: { slides: Slide[], hotspots: Hotspot[] }) => void;
}

export function useEditorState({ projectId, onDataChange }: UseEditorStateOptions) {
  const [state, setState] = useState<EditorState>({
    project: null,
    slides: [],
    hotspots: [],
    activeSlide: null,
    selectedHotspot: null,
    isEditMode: true,
    loading: true,
    error: null,
    hasUnsavedChanges: false
  });

  // Load project data
  const loadProjectData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const projectData = await new Promise<{
        project: Project;
        slides: Slide[];
        hotspots: Hotspot[];
      }>((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler((result: any) => {
            resolve({
              project: {
                ...result.project,
                createdAt: new Date(result.project.createdAt),
                updatedAt: new Date(result.project.updatedAt)
              },
              slides: result.slides.map((slide: any) => ({
                ...slide,
                createdAt: slide.createdAt ? new Date(slide.createdAt) : new Date(),
                updatedAt: slide.updatedAt ? new Date(slide.updatedAt) : new Date()
              })),
              hotspots: result.hotspots.map((hotspot: any) => ({
                ...hotspot,
                createdAt: hotspot.createdAt ? new Date(hotspot.createdAt) : new Date(),
                updatedAt: hotspot.updatedAt ? new Date(hotspot.updatedAt) : new Date()
              }))
            });
          })
          .withFailureHandler((error: any) => {
            reject(new Error(error.message || 'Failed to load project data'));
          })
          .getProjectData(projectId);
      });

      setState(prev => ({
        ...prev,
        project: projectData.project,
        slides: projectData.slides,
        hotspots: projectData.hotspots,
        activeSlide: projectData.slides[0] || null,
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

  // Set active slide
  const setActiveSlide = useCallback((slide: Slide | null) => {
    setState(prev => ({
      ...prev,
      activeSlide: slide,
      selectedHotspot: null
    }));
  }, []);

  // Set selected hotspot
  const setSelectedHotspot = useCallback((hotspot: Hotspot | null) => {
    setState(prev => ({ ...prev, selectedHotspot: hotspot }));
  }, []);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setState(prev => ({ ...prev, isEditMode: !prev.isEditMode }));
  }, []);

  // Create hotspot (optimistic update)
  const createHotspot = useCallback((hotspotData: Partial<Hotspot>) => {
    if (!state.activeSlide) return null;

    const tempId = `temp_${Date.now()}`;
    const newHotspot: Hotspot = {
      id: tempId,
      slideId: state.activeSlide.id,
      x: hotspotData.x || 0,
      y: hotspotData.y || 0,
      width: hotspotData.width || 50,
      height: hotspotData.height || 50,
      eventType: hotspotData.eventType || 'text_popup',
      triggerType: hotspotData.triggerType || 'click',
      config: hotspotData.config || { text: 'New hotspot' },
      order: state.hotspots.filter(h => h.slideId === state.activeSlide!.id).length,
      isVisible: true,
      ...hotspotData
    } as Hotspot;

    setState(prev => {
      const updatedHotspots = [...prev.hotspots, newHotspot];
      onDataChange?.({ slides: prev.slides, hotspots: updatedHotspots });
      return {
        ...prev,
        hotspots: updatedHotspots,
        selectedHotspot: newHotspot,
        hasUnsavedChanges: true
      };
    });

    return newHotspot;
  }, [state.activeSlide, state.hotspots, onDataChange]);

  // Update hotspot (optimistic update)
  const updateHotspot = useCallback((hotspotData: Partial<Hotspot> & { id: string }) => {
    setState(prev => {
      const updatedHotspots = prev.hotspots.map(hotspot =>
        hotspot.id === hotspotData.id
          ? { ...hotspot, ...hotspotData, updatedAt: new Date() }
          : hotspot
      );
      onDataChange?.({ slides: prev.slides, hotspots: updatedHotspots });
      return {
        ...prev,
        hotspots: updatedHotspots,
        selectedHotspot: prev.selectedHotspot?.id === hotspotData.id
          ? { ...prev.selectedHotspot, ...hotspotData }
          : prev.selectedHotspot,
        hasUnsavedChanges: true
      };
    });
  }, [onDataChange]);

  // Delete hotspot (optimistic update)
  const deleteHotspot = useCallback((hotspotId: string) => {
    setState(prev => {
      const updatedHotspots = prev.hotspots.filter(h => h.id !== hotspotId);
      onDataChange?.({ slides: prev.slides, hotspots: updatedHotspots });
      return {
        ...prev,
        hotspots: updatedHotspots,
        selectedHotspot: prev.selectedHotspot?.id === hotspotId ? null : prev.selectedHotspot,
        hasUnsavedChanges: true
      };
    });
  }, [onDataChange]);

  // Create slide
  const createSlide = useCallback((slideData: Partial<Slide>) => {
    if (!state.project) return null;

    const tempId = `temp_${Date.now()}`;
    const newSlide: Slide = {
      id: tempId,
      projectId: state.project.id,
      order: state.slides.length,
      title: slideData.title || 'Untitled Slide',
      mediaType: slideData.mediaType || MediaType.IMAGE,
      mediaUrl: slideData.mediaUrl || '',
      duration: slideData.duration || 1000,
      transition: slideData.transition || 'fade',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...slideData
    };

    setState(prev => {
      const updatedSlides = [...prev.slides, newSlide];
      onDataChange?.({ slides: updatedSlides, hotspots: prev.hotspots });
      return {
        ...prev,
        slides: updatedSlides,
        activeSlide: newSlide,
        hasUnsavedChanges: true
      };
    });

    return newSlide;
  }, [state.project, state.slides, onDataChange]);

  // Update slide
  const updateSlide = useCallback((slideData: Partial<Slide> & { id: string }) => {
    setState(prev => {
      const updatedSlides = prev.slides.map(slide =>
        slide.id === slideData.id
          ? { ...slide, ...slideData, updatedAt: new Date() }
          : slide
      );
      onDataChange?.({ slides: updatedSlides, hotspots: prev.hotspots });
      return {
        ...prev,
        slides: updatedSlides,
        activeSlide: prev.activeSlide?.id === slideData.id
          ? { ...prev.activeSlide, ...slideData }
          : prev.activeSlide,
        hasUnsavedChanges: true
      };
    });
  }, [onDataChange]);

  // Delete slide
  const deleteSlide = useCallback((slideId: string) => {
    setState(prev => {
      const updatedSlides = prev.slides.filter(s => s.id !== slideId);
      const updatedHotspots = prev.hotspots.filter(h => h.slideId !== slideId);

      onDataChange?.({ slides: updatedSlides, hotspots: updatedHotspots });

      return {
        ...prev,
        slides: updatedSlides,
        hotspots: updatedHotspots,
        activeSlide: prev.activeSlide?.id === slideId
          ? (updatedSlides[0] || null)
          : prev.activeSlide,
        selectedHotspot: prev.hotspots.some(h => h.slideId === slideId && h.id === prev.selectedHotspot?.id)
          ? null
          : prev.selectedHotspot,
        hasUnsavedChanges: true
      };
    });
  }, [onDataChange]);

  // Reorder slides
  const reorderSlides = useCallback((newOrder: Slide[]) => {
    const updatedSlides = newOrder.map((slide, index) => ({
      ...slide,
      order: index,
      updatedAt: new Date()
    }));

    setState(prev => {
      onDataChange?.({ slides: updatedSlides, hotspots: prev.hotspots });
      return {
        ...prev,
        slides: updatedSlides,
        hasUnsavedChanges: true
      };
    });
  }, [onDataChange]);

  // Clear unsaved changes flag
  const markAsSaved = useCallback(() => {
    setState(prev => ({ ...prev, hasUnsavedChanges: false }));
  }, []);

  // Get hotspots for active slide
  const activeSlideHotspots = state.activeSlide
    ? state.hotspots.filter(h => h.slideId === state.activeSlide!.id)
    : [];

  // Load data on mount
  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  return {
    ...state,
    activeSlideHotspots,
    actions: {
      loadProjectData,
      setActiveSlide,
      setSelectedHotspot,
      toggleEditMode,
      createHotspot,
      updateHotspot,
      deleteHotspot,
      createSlide,
      updateSlide,
      deleteSlide,
      reorderSlides,
      markAsSaved
    }
  };
}
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Slide, Hotspot, MainCanvasProps, CreateHotspotRequest } from '../../shared/types';
import { HOTSPOT_DEFAULTS } from '../../shared/constants';

export const MainCanvas: React.FC<MainCanvasProps> = ({
  slide,
  hotspots,
  selectedHotspot,
  isEditMode,
  onHotspotSelect,
  onHotspotCreate,
  onHotspotUpdate,
  onHotspotDelete
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isCreating, setIsCreating] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Handle canvas click for creating hotspots
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!isEditMode || !slide || !onHotspotCreate) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Clear selection when clicking empty area
    if (e.target === canvasRef.current && onHotspotSelect) {
      onHotspotSelect(null as any);
      return;
    }

    // Start creating hotspot
    if (!isCreating) {
      setIsCreating(true);
      setDragStart({ x, y });
    }
  }, [isEditMode, slide, isCreating, onHotspotCreate, onHotspotSelect]);

  // Current mouse position for preview
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number } | null>(null);

  // Handle mouse move for hotspot creation
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (isCreating && dragStart) {
      setCurrentMouse({ x: currentX, y: currentY });
    }
  }, [isCreating, dragStart]);

  // Handle mouse up for hotspot creation
  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isCreating || !dragStart || !slide || !onHotspotCreate) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    const width = Math.max(Math.abs(currentX - dragStart.x), HOTSPOT_DEFAULTS.width);
    const height = Math.max(Math.abs(currentY - dragStart.y), HOTSPOT_DEFAULTS.height);

    // Only create if the user actually dragged (minimum size)
    if (width >= 20 && height >= 20) {
      const request: CreateHotspotRequest = {
        slideId: slide.id,
        x,
        y,
        width,
        height,
        eventType: HOTSPOT_DEFAULTS.eventType,
        triggerType: HOTSPOT_DEFAULTS.triggerType,
        config: { ...HOTSPOT_DEFAULTS.config }
      };

      onHotspotCreate(request);
    }

    // Reset creation state
    setIsCreating(false);
    setDragStart(null);
    setCurrentMouse(null);
  }, [isCreating, dragStart, slide, onHotspotCreate]);

  // Handle hotspot click
  const handleHotspotClick = useCallback((e: React.MouseEvent, hotspot: Hotspot) => {
    e.stopPropagation();
    if (onHotspotSelect) {
      onHotspotSelect(hotspot);
    }
  }, [onHotspotSelect]);

  // Update canvas size based on slide dimensions
  useEffect(() => {
    if (slide) {
      // This would normally get actual image dimensions
      setCanvasSize({ width: 800, height: 600 });
    }
  }, [slide]);

  if (!slide) {
    return (
      <div className="main-canvas-empty">
        <p>Select a slide to start editing hotspots</p>
      </div>
    );
  }

  return (
    <div className="main-canvas-container">
      <div className="canvas-toolbar">
        <div className="canvas-info">
          <h3>{slide.title}</h3>
          <span className="hotspot-count">{hotspots.length} hotspots</span>
        </div>
        <div className="canvas-controls">
          <button
            className={`btn ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              // This would be handled by parent component
              console.log('Toggle edit mode');
            }}
          >
            {isEditMode ? 'Edit Mode' : 'Preview Mode'}
          </button>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="main-canvas"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundImage: slide.mediaType === 'image' ? `url(${slide.mediaUrl})` : 'none',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        {/* Video/YouTube handling */}
        {slide.mediaType === 'video' && (
          <video
            src={slide.mediaUrl}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            controls={!isEditMode}
          />
        )}

        {slide.mediaType === 'youtube' && (
          <iframe
            src={slide.mediaUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
            title={slide.title}
          />
        )}

        {/* Render hotspots */}
        {hotspots.map(hotspot => (
          <div
            key={hotspot.id}
            className={`hotspot ${selectedHotspot?.id === hotspot.id ? 'selected' : ''}`}
            style={{
              position: 'absolute',
              left: hotspot.x,
              top: hotspot.y,
              width: hotspot.width,
              height: hotspot.height,
              border: `2px solid ${selectedHotspot?.id === hotspot.id ? '#007bff' : '#28a745'}`,
              backgroundColor: 'rgba(0, 123, 255, 0.1)',
              cursor: isEditMode ? 'pointer' : 'default',
              zIndex: selectedHotspot?.id === hotspot.id ? 20 : 10
            }}
            onClick={(e) => handleHotspotClick(e, hotspot)}
            title={hotspot.config.text || `Hotspot ${hotspot.id}`}
          >
            {isEditMode && (
              <div className="hotspot-label">
                {hotspot.config.text || 'Hotspot'}
              </div>
            )}
          </div>
        ))}

        {/* Creation preview */}
        {isCreating && dragStart && currentMouse && (
          <div
            className="hotspot-preview"
            style={{
              position: 'absolute',
              left: Math.min(dragStart.x, currentMouse.x),
              top: Math.min(dragStart.y, currentMouse.y),
              width: Math.abs(currentMouse.x - dragStart.x),
              height: Math.abs(currentMouse.y - dragStart.y),
              border: '2px dashed #007bff',
              backgroundColor: 'rgba(0, 123, 255, 0.1)',
              pointerEvents: 'none',
              zIndex: 25
            }}
          >
            <div className="hotspot-preview-label">
              {Math.abs(currentMouse.x - dragStart.x)}×{Math.abs(currentMouse.y - dragStart.y)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
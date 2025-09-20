import React, { useState, useCallback } from 'react';
import { Slide, SidebarProps, CreateSlideRequest } from '../../shared/types';
import { CreateSlideModal } from './common/CreateSlideModal';

export const Sidebar: React.FC<SidebarProps & { width?: number }> = ({
  slides,
  activeSlide,
  onSlideSelect,
  onSlideReorder,
  onSlideCreate,
  onSlideDelete,
  width = 300
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draggedSlide, setDraggedSlide] = useState<Slide | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, slide: Slide) => {
    setDraggedSlide(slide);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedSlide) return;

    const currentIndex = slides.findIndex(s => s.id === draggedSlide.id);
    if (currentIndex === targetIndex) return;

    const newSlides = [...slides];
    const [removed] = newSlides.splice(currentIndex, 1);
    newSlides.splice(targetIndex, 0, removed);

    // Update order property
    const reorderedSlides = newSlides.map((slide, index) => ({
      ...slide,
      order: index
    }));

    onSlideReorder?.(reorderedSlides);
    setDraggedSlide(null);
  }, [draggedSlide, slides, onSlideReorder]);

  // Handle slide creation
  const handleSlideCreate = useCallback((slideData: CreateSlideRequest) => {
    onSlideCreate?.(slideData);
    setShowCreateModal(false);
  }, [onSlideCreate]);

  // Handle slide deletion
  const handleSlideDelete = useCallback((e: React.MouseEvent, slide: Slide) => {
    e.stopPropagation();
    onSlideDelete?.(slide.id);
  }, [onSlideDelete]);

  return (
    <div className="sidebar" style={{ width }}>
      <div className="sidebar-header">
        <h3>Slides</h3>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => setShowCreateModal(true)}
          title="Add new slide"
        >
          + Add Slide
        </button>
      </div>

      <div className="slides-list">
        {slides.length === 0 ? (
          <div className="empty-slides">
            <p>No slides yet</p>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create First Slide
            </button>
          </div>
        ) : (
          slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`slide-item ${activeSlide?.id === slide.id ? 'active' : ''} ${
                dragOverIndex === index ? 'drag-over' : ''
              }`}
              draggable
              onClick={() => onSlideSelect?.(slide)}
              onDragStart={(e) => handleDragStart(e, slide)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              title={`Slide ${index + 1}: ${slide.title}`}
            >
              <div className="slide-drag-handle">
                ⋮⋮
              </div>

              <div className="slide-preview">
                <img
                  src={slide.mediaUrl}
                  alt={slide.title}
                  className="slide-thumbnail"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9Ijc1IiB2aWV3Qm94PSIwIDAgMTAwIDc1IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9Ijc1IiBmaWxsPSIjZjBmMGYwIi8+CjxwYXRoIGQ9Ik00MCA0MEwzNSAzNUwzMCAzNUwyNSA0MEwyNSA0NUwzMCA1MEwzNSA1MEw0MCA0NVY0MFoiIGZpbGw9IiNjY2MiLz4KPHN2Zz4K';
                  }}
                  loading="lazy"
                />
                <div className="slide-number">{index + 1}</div>
              </div>

              <div className="slide-info">
                <h4 className="slide-title">{slide.title}</h4>
                <span className="slide-type">{slide.mediaType}</span>
              </div>

              <div className="slide-actions">
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={(e) => handleSlideDelete(e, slide)}
                  title="Delete slide"
                  aria-label={`Delete slide ${slide.title}`}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateSlideModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleSlideCreate}
        />
      )}
    </div>
  );
};
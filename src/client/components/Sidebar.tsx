import React from 'react';
import { Slide, SidebarProps } from '../../shared/types';

export const Sidebar: React.FC<SidebarProps & { width?: number }> = ({
  slides,
  activeSlide,
  onSlideSelect,
  onSlideReorder,
  onSlideCreate,
  onSlideDelete,
  width = 300
}) => {
  return (
    <div className="sidebar" style={{ width }}>
      <div className="sidebar-header">
        <h3>Slides</h3>
        <button className="btn btn-sm btn-primary" onClick={() => console.log('Add slide')}>
          + Add Slide
        </button>
      </div>

      <div className="slides-list">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`slide-item ${activeSlide?.id === slide.id ? 'active' : ''}`}
            onClick={() => onSlideSelect?.(slide)}
          >
            <div className="slide-preview">
              <img
                src={slide.mediaUrl}
                alt={slide.title}
                className="slide-thumbnail"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/api/placeholder/100/75';
                }}
              />
              <div className="slide-number">{index + 1}</div>
            </div>
            <div className="slide-info">
              <h4 className="slide-title">{slide.title}</h4>
              <span className="slide-type">{slide.mediaType}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
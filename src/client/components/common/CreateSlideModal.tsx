import React, { useState } from 'react';
import { CreateSlideRequest, MediaType } from '../../../shared/types';

interface CreateSlideModalProps {
  onClose: () => void;
  onCreate: (slideData: CreateSlideRequest) => void;
}

export const CreateSlideModal: React.FC<CreateSlideModalProps> = ({
  onClose,
  onCreate
}) => {
  const [formData, setFormData] = useState<CreateSlideRequest>({
    projectId: '', // Will be set by parent
    title: '',
    mediaType: MediaType.IMAGE,
    mediaUrl: '',
    order: 0
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateSlideRequest, string>>>({});

  const handleInputChange = (field: keyof CreateSlideRequest, value: string | MediaType | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateSlideRequest, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.mediaUrl.trim()) {
      newErrors.mediaUrl = 'Media URL is required';
    } else {
      // Basic URL validation
      try {
        new URL(formData.mediaUrl);
      } catch {
        newErrors.mediaUrl = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onCreate(formData);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isYouTubeUrl = (url: string): boolean => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getVideoId = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : '';
  };

  const getYouTubeEmbedUrl = (url: string): string => {
    const videoId = getVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const handleMediaTypeChange = (mediaType: MediaType) => {
    setFormData(prev => ({ ...prev, mediaType }));

    // Auto-detect YouTube URLs
    if (mediaType === MediaType.YOUTUBE && formData.mediaUrl && isYouTubeUrl(formData.mediaUrl)) {
      setFormData(prev => ({
        ...prev,
        mediaUrl: getYouTubeEmbedUrl(prev.mediaUrl)
      }));
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Slide</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="slide-title">Slide Title *</label>
              <input
                id="slide-title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder="Enter slide title..."
                autoFocus
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label>Media Type *</label>
              <div className="media-type-selector">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="mediaType"
                    value={MediaType.IMAGE}
                    checked={formData.mediaType === MediaType.IMAGE}
                    onChange={() => handleMediaTypeChange(MediaType.IMAGE)}
                  />
                  <span>🖼️ Image</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="mediaType"
                    value={MediaType.VIDEO}
                    checked={formData.mediaType === MediaType.VIDEO}
                    onChange={() => handleMediaTypeChange(MediaType.VIDEO)}
                  />
                  <span>🎥 Video</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="mediaType"
                    value={MediaType.YOUTUBE}
                    checked={formData.mediaType === MediaType.YOUTUBE}
                    onChange={() => handleMediaTypeChange(MediaType.YOUTUBE)}
                  />
                  <span>📹 YouTube</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="media-url">
                {formData.mediaType === MediaType.YOUTUBE ? 'YouTube URL' : 'Media URL'} *
              </label>
              <input
                id="media-url"
                type="url"
                value={formData.mediaUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  handleInputChange('mediaUrl', url);

                  // Auto-detect and convert YouTube URLs
                  if (formData.mediaType === MediaType.YOUTUBE && isYouTubeUrl(url)) {
                    handleInputChange('mediaUrl', getYouTubeEmbedUrl(url));
                  }
                }}
                className={`form-input ${errors.mediaUrl ? 'error' : ''}`}
                placeholder={
                  formData.mediaType === MediaType.YOUTUBE
                    ? 'https://www.youtube.com/watch?v=...'
                    : 'https://example.com/image.jpg'
                }
              />
              {errors.mediaUrl && <span className="error-message">{errors.mediaUrl}</span>}

              {formData.mediaType === MediaType.YOUTUBE && (
                <small className="form-help">
                  Paste any YouTube URL - it will be automatically converted to an embed URL
                </small>
              )}
            </div>

            {/* Preview */}
            {formData.mediaUrl && !errors.mediaUrl && (
              <div className="form-group">
                <label>Preview</label>
                <div className="media-preview">
                  {formData.mediaType === MediaType.IMAGE && (
                    <img
                      src={formData.mediaUrl}
                      alt="Preview"
                      style={{ maxWidth: '200px', maxHeight: '150px' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  {formData.mediaType === MediaType.YOUTUBE && getVideoId(formData.mediaUrl) && (
                    <iframe
                      src={getYouTubeEmbedUrl(formData.mediaUrl)}
                      width="200"
                      height="113"
                      frameBorder="0"
                      allowFullScreen
                      title="YouTube preview"
                    />
                  )}
                  {formData.mediaType === MediaType.VIDEO && (
                    <video
                      src={formData.mediaUrl}
                      width="200"
                      height="113"
                      controls
                      onError={(e) => {
                        (e.target as HTMLVideoElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Slide
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
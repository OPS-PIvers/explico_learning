import React, { useState } from 'react';
import { CreateProjectRequest } from '../../../shared/types';
import { validateProject } from '../../../shared/utils';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (request: CreateProjectRequest) => void;
  isLoading?: boolean;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  onClose,
  onCreate,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Project title is required';
    } else if (formData.title.length < 1) {
      newErrors.title = 'Project title must be at least 1 character';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Project title must be less than 100 characters';
    }

    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Check if project data is valid using shared validation
    if (!validateProject({ title: formData.title, description: formData.description })) {
      if (!newErrors.title) {
        newErrors.title = 'Invalid project title';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create project request
    const request: CreateProjectRequest = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      settings: {
        autoSave: true,
        theme: 'light',
        analytics: true,
      },
    };

    onCreate(request);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content create-project-modal">
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="close-btn" onClick={onClose} disabled={isLoading}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="project-title" className="form-label">
              Project Title *
            </label>
            <input
              id="project-title"
              type="text"
              className={`form-input ${errors.title ? 'error' : ''}`}
              placeholder="Enter project title..."
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              maxLength={100}
              disabled={isLoading}
              autoFocus
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="project-description" className="form-label">
              Description
            </label>
            <textarea
              id="project-description"
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              placeholder="Enter project description (optional)..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              maxLength={500}
              disabled={isLoading}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
            <span className="character-count">{formData.description.length}/500</span>
          </div>
        </form>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isLoading || !formData.title.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

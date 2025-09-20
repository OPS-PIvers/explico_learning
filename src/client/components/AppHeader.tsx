import React from 'react';
import { Project } from '../../shared/types';

interface AppHeaderProps {
  project: Project | null;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
  onSaveNow?: () => void;
  onToggleEditMode: () => void;
  isEditMode: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  project,
  hasUnsavedChanges = false,
  isSaving = false,
  lastSaved,
  onSaveNow,
  onToggleEditMode,
  isEditMode
}) => {
  const handleBackToDashboard = () => {
    const dashboardUrl = `${window.location.origin}${window.location.pathname}`;
    window.location.href = dashboardUrl;
  };

  if (!project) {
    return (
      <header className="app-header">
        <div className="header-left">
          <button
            className="btn btn-ghost"
            onClick={handleBackToDashboard}
            title="Back to Dashboard"
          >
            ← Back
          </button>
          <div className="project-info">
            <h1 className="project-title">Loading...</h1>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="btn btn-ghost"
          onClick={handleBackToDashboard}
          title="Back to Dashboard"
        >
          ← Back
        </button>
        <div className="project-info">
          <h1 className="project-title">{project.title}</h1>
          {project.description && (
            <p className="project-description">{project.description}</p>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="save-status">
          {isSaving && (
            <span className="saving-indicator">
              <span className="spinner-sm"></span>
              Saving...
            </span>
          )}
          {!isSaving && hasUnsavedChanges && (
            <span className="unsaved-indicator">
              • Unsaved changes
            </span>
          )}
          {!isSaving && !hasUnsavedChanges && lastSaved && (
            <span className="saved-indicator">
              ✓ Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="header-actions">
          <button
            className={`btn mode-toggle ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={onToggleEditMode}
            title={isEditMode ? 'Switch to Preview Mode' : 'Switch to Edit Mode'}
          >
            {isEditMode ? '✏️ Edit Mode' : '👁️ Preview'}
          </button>

          {onSaveNow && (
            <button
              className={`btn ${hasUnsavedChanges ? 'btn-success' : 'btn-secondary'}`}
              onClick={onSaveNow}
              disabled={isSaving}
              title="Save Changes (Ctrl+S)"
            >
              {isSaving ? 'Saving...' : '💾 Save Now'}
            </button>
          )}

          <div className="dropdown">
            <button className="btn btn-secondary dropdown-toggle">
              ⚙️ Options
            </button>
            <div className="dropdown-menu">
              <button className="dropdown-item">Export Project</button>
              <button className="dropdown-item">Import Slides</button>
              <hr className="dropdown-divider" />
              <button className="dropdown-item">Project Settings</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
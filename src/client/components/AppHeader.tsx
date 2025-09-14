import React from 'react';
import { Project } from '../../shared/types';

interface AppHeaderProps {
  project: Project;
  isSaving: boolean;
  onSave: () => void;
  onToggleEditMode: () => void;
  isEditMode: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  project,
  isSaving,
  onSave,
  onToggleEditMode,
  isEditMode
}) => {
  const handleBackToDashboard = () => {
    const dashboardUrl = `${window.location.origin}${window.location.pathname}`;
    window.location.href = dashboardUrl;
  };

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
        </div>

        <div className="header-actions">
          <button
            className={`btn mode-toggle ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={onToggleEditMode}
            title={isEditMode ? 'Switch to Preview Mode' : 'Switch to Edit Mode'}
          >
            {isEditMode ? '✏️ Edit Mode' : '👁️ Preview'}
          </button>

          <button
            className="btn btn-success"
            onClick={onSave}
            disabled={isSaving}
            title="Save Changes (Ctrl+S)"
          >
            {isSaving ? 'Saving...' : '💾 Save'}
          </button>

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
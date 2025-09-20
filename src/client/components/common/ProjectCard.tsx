import React from 'react';
import { Project } from '../../../shared/types';
import { formatDate } from '../../../shared/utils';

interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
  onDelete: (project: Project) => void;
  className?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpen,
  onDelete,
  className = '',
}) => {
  const handleOpen = () => {
    onOpen(project);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(project);
  };

  return (
    <div className={`project-card ${className}`} onClick={handleOpen}>
      <div className="project-card-header">
        <h3 className="project-title">{project.title}</h3>
        <button className="delete-btn" onClick={handleDelete} title="Delete project">
          ×
        </button>
      </div>

      <div className="project-card-body">
        {project.description && <p className="project-description">{project.description}</p>}
      </div>

      <div className="project-card-footer">
        <div className="project-meta">
          <span className="created-date">Created: {formatDate(project.createdAt)}</span>
          <span className="updated-date">Updated: {formatDate(project.updatedAt)}</span>
        </div>
        <div className="project-actions">
          <button className="btn btn-primary btn-sm">Open Editor</button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { Project, CreateProjectRequest } from '../../shared/types';
import { ProjectCard } from './common/ProjectCard';
import { CreateProjectModal } from './common/CreateProjectModal';
import { LoadingSpinner } from './common/LoadingSpinner';
import { ErrorMessage } from './common/ErrorMessage';

// Import Google Apps Script types
import '../types/google-apps-script';

interface ProjectDashboardState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  showCreateModal: boolean;
  searchQuery: string;
  sortBy: 'name' | 'date' | 'updated';
}

export const ProjectDashboard: React.FC = () => {
  const [state, setState] = useState<ProjectDashboardState>({
    projects: [],
    loading: true,
    error: null,
    showCreateModal: false,
    searchQuery: '',
    sortBy: 'updated'
  });

  // Load projects from Google Apps Script
  const loadProjects = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Use Google Apps Script API
      const projects = await new Promise<Project[]>((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler((result: Project[]) => {
            // Convert date strings back to Date objects
            const processedProjects = result.map(project => ({
              ...project,
              createdAt: new Date(project.createdAt),
              updatedAt: new Date(project.updatedAt)
            }));
            resolve(processedProjects);
          })
          .withFailureHandler((error: any) => {
            reject(new Error(error.message || 'Failed to load projects'));
          })
          .getProjects();
      });

      setState(prev => ({
        ...prev,
        projects,
        loading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load projects'
      }));
    }
  }, []);

  // Create new project
  const handleCreateProject = useCallback(async (request: CreateProjectRequest) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const newProject = await new Promise<Project>((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler((result: Project) => {
            const processedProject = {
              ...result,
              createdAt: new Date(result.createdAt),
              updatedAt: new Date(result.updatedAt)
            };
            resolve(processedProject);
          })
          .withFailureHandler((error: any) => {
            reject(new Error(error.message || 'Failed to create project'));
          })
          .createProject(request.title, request.description);
      });

      setState(prev => ({
        ...prev,
        projects: [...prev.projects, newProject],
        loading: false,
        showCreateModal: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create project'
      }));
    }
  }, []);

  // Delete project
  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(() => resolve())
          .withFailureHandler((error: any) => {
            reject(new Error(error.message || 'Failed to delete project'));
          })
          .deleteProject(projectId);
      });

      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== projectId)
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete project'
      }));
    }
  }, []);

  // Open project editor
  const handleOpenProject = useCallback((project: Project) => {
    const editorUrl = `${window.location.origin}${window.location.pathname}?page=editor&project=${project.id}`;
    window.open(editorUrl, '_blank');
  }, []);

  // Filter and sort projects
  const filteredAndSortedProjects = React.useMemo(() => {
    let filtered = state.projects;

    // Filter by search query
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query)
      );
    }

    // Sort projects
    return filtered.sort((a, b) => {
      switch (state.sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'updated':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        default:
          return 0;
      }
    });
  }, [state.projects, state.searchQuery, state.sortBy]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="project-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Explico Learning</h1>
            <p>Interactive Walkthrough Projects</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
              disabled={state.loading}
            >
              + Create Project
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="content-header">
          <div className="search-controls">
            <input
              type="text"
              className="search-input"
              placeholder="Search projects..."
              value={state.searchQuery}
              onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
            />
          </div>
          <div className="sort-controls">
            <label htmlFor="sort-select">Sort by:</label>
            <select
              id="sort-select"
              className="sort-select"
              value={state.sortBy}
              onChange={(e) => setState(prev => ({ ...prev, sortBy: e.target.value as 'name' | 'date' | 'updated' }))}
            >
              <option value="updated">Last Updated</option>
              <option value="date">Date Created</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {state.loading && <LoadingSpinner message="Loading projects..." />}

        {state.error && (
          <ErrorMessage
            message={state.error}
            onRetry={loadProjects}
          />
        )}

        {!state.loading && !state.error && (
          <>
            {filteredAndSortedProjects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-content">
                  <h3>No projects found</h3>
                  {state.searchQuery ? (
                    <p>No projects match your search criteria.</p>
                  ) : (
                    <p>Get started by creating your first interactive walkthrough project.</p>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
                  >
                    Create First Project
                  </button>
                </div>
              </div>
            ) : (
              <div className="projects-grid">
                {filteredAndSortedProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={() => handleOpenProject(project)}
                    onDelete={() => handleDeleteProject(project.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {state.showCreateModal && (
        <CreateProjectModal
          onClose={() => setState(prev => ({ ...prev, showCreateModal: false }))}
          onCreate={handleCreateProject}
          isLoading={state.loading}
        />
      )}
    </div>
  );
};
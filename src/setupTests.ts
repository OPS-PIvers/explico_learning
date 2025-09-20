// Jest setup for testing React components
import '@testing-library/jest-dom';

// Mock Google Apps Script global objects
Object.defineProperty(window, 'google', {
  value: {
    script: {
      run: {
        withSuccessHandler: jest.fn(),
        withFailureHandler: jest.fn(),
        getProjects: jest.fn(),
        createProject: jest.fn(),
        deleteProject: jest.fn(),
        getProjectData: jest.fn(),
        saveHotspots: jest.fn(),
        saveSlides: jest.fn(),
      },
    },
  },
  writable: true,
});

// Mock window.projectId for editor tests
Object.defineProperty(window, 'projectId', {
  value: 'test-project-id',
  writable: true,
});

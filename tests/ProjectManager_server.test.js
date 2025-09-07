/**
 * Test function for ProjectManager_server.duplicateProject
 * To run this test, you need to:
 * 1. Load the ProjectManager_server.js and GoogleSheetsAPI.js scripts in your Apps Script project.
 * 2. Create a mock of the GoogleSheetsAPI class.
 * 3. Run this function from the Apps Script editor.
 */
function test_duplicateProject() {
  // Mock GoogleSheetsAPI
  class MockGoogleSheetsAPI {
    constructor() {
      this.registryInitialized = false;
      this.initialized = false;
      this.spreadsheetId = null;
      this.projects = {
          'proj_1': {
              id: 'proj_1',
              name: 'Original Project',
              description: 'Original Description',
              settings: { setting1: 'value1' },
              spreadsheetId: 'ssid_1'
          }
      };
      this.slides = {
          'ssid_1': [{ id: 'slide_1', projectId: 'proj_1', name: 'Slide 1' }]
      };
      this.hotspots = {
          'slide_1': [{ id: 'hotspot_1', slideId: 'slide_1', name: 'Hotspot 1' }]
      };
    }
    async initializeRegistry() { this.registryInitialized = true; return true; }
    async getAllProjects() {
      return Object.values(this.projects);
    }
    async initialize(spreadsheetId) {
      this.initialized = true;
      this.spreadsheetId = spreadsheetId;
      return true;
    }
    async getProject(projectId) {
      return this.projects[projectId] || null;
    }
    async getSlidesByProject(projectId) {
        const project = this.projects[projectId];
        if (project) {
            return this.slides[project.spreadsheetId] || [];
        }
        return [];
    }
    async getHotspotsBySlide(slideId) {
      return this.hotspots[slideId] || [];
    }
    async createProjectSpreadsheet(projectName) { return 'ssid_2'; }
    async createProject(projectData) {
        const newId = 'proj_' + Math.random().toString(36).substr(2, 9);
        const newProject = { ...projectData, id: newId };
        this.projects[newId] = newProject;
        return newProject;
    }
    async createSlide(slideData) {
        const newId = 'slide_' + Math.random().toString(36).substr(2, 9);
        const newSlide = { ...slideData, id: newId };
        if (!this.slides[this.spreadsheetId]) {
            this.slides[this.spreadsheetId] = [];
        }
        this.slides[this.spreadsheetId].push(newSlide);
        return newSlide;
    }
    async saveHotspots(hotspots) {
        for (const hotspot of hotspots) {
            if (!this.hotspots[hotspot.slideId]) {
                this.hotspots[hotspot.slideId] = [];
            }
            this.hotspots[hotspot.slideId].push(hotspot);
        }
        return true;
    }
    async addProjectToRegistry(project) {
        this.projects[project.id] = project;
        return true;
    }
  }

  // Replace the real GoogleSheetsAPI with our mock
  GoogleSheetsAPI = MockGoogleSheetsAPI;

  const originalCreateNewProject = ProjectManager_server.prototype.createNewProject;
  ProjectManager_server.prototype.createNewProject = async function(projectData) {
      const sheetsAPI = new GoogleSheetsAPI();
      const spreadsheetId = await sheetsAPI.createProjectSpreadsheet(projectData.name);
      await sheetsAPI.initialize(spreadsheetId);
      const projectWithSpreadsheetId = { ...projectData, spreadsheetId };
      const createdProject = await sheetsAPI.createProject(projectWithSpreadsheetId);
      await sheetsAPI.initializeRegistry();
      await sheetsAPI.addProjectToRegistry(createdProject);
      return createdProject;
  };

  const projectManager = new ProjectManager_server();

  console.log('Test started for duplicateProject...');

  projectManager.duplicateProject('proj_1').then(p => {
    console.log('New project created:', JSON.stringify(p, null, 2));
    let success = true;
    if (p.name === 'Original Project (Copy)') {
      console.log('SUCCESS: Project name is correct.');
    } else {
      console.error('FAILURE: Project name is incorrect.');
      success = false;
    }
    if (p.spreadsheetId === 'ssid_2') {
        console.log('SUCCESS: New spreadsheet ID is correct.');
    } else {
        console.error('FAILURE: New spreadsheet ID is incorrect.');
        success = false;
    }

    // We can't easily check the contents of the new slides and hotspots without more complex mocking,
    // but we can check that the new project was created.

    if (success) {
        console.log('TEST PASSED');
    } else {
        console.log('TEST FAILED');
    }

  }).catch(e => {
    console.error('FAILURE: An error occurred during duplication.', e);
    console.log('TEST FAILED');
  }).finally(() => {
      // Restore original methods
      ProjectManager_server.prototype.createNewProject = originalCreateNewProject;
  });
}

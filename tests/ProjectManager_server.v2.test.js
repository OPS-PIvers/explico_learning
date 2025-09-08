// Mock GoogleSheetsAPI for testing ProjectManager_server
class MockGoogleSheetsAPIForV2 {
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
                spreadsheetId: 'ssid_1',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
            }
        };
        this.slides = {
            'ssid_1': [{
                id: 'slide_1',
                projectId: 'proj_1',
                name: 'Slide 1',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
            }]
        };
        this.hotspots = {
            'slide_1': [{
                id: 'hotspot_1',
                slideId: 'slide_1',
                name: 'Hotspot 1',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z',
            }]
        };
        this.savedHotspots = [];
    }

    // Mocked methods
    async initializeRegistry() { this.registryInitialized = true; return true; }
    async getAllProjects() { return Object.values(this.projects); }
    async initialize(spreadsheetId) {
        this.initialized = true;
        this.spreadsheetId = spreadsheetId;
        return true;
    }
    async getProject(projectId) {
        return Object.values(this.projects).find(p => p.id === projectId) || null;
    }
    async getSlidesByProject(projectId) {
        const project = Object.values(this.projects).find(p => p.id === projectId);
        return project ? this.slides[project.spreadsheetId] || [] : [];
    }
    async getHotspotsBySlide(slideId) { return this.hotspots[slideId] || []; }
    async createProjectSpreadsheet(projectName) { return 'ssid_' + this.generateId('ss'); }

    generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}_${timestamp}_${random}`;
    }

    async createProject(projectData) {
        const newId = this.generateId('proj');
        const newProject = { ...projectData, id: newId };
        this.projects[newId] = newProject;
        return newProject;
    }
    async createSlide(slideData) {
        const newId = this.generateId('slide');
        const newSlide = { ...slideData, id: newId };
        if (!this.slides[this.spreadsheetId]) {
            this.slides[this.spreadsheetId] = [];
        }
        this.slides[this.spreadsheetId].push(newSlide);
        return newSlide;
    }
    async saveHotspots(hotspots) {
        this.savedHotspots.push(...hotspots);
        return true;
    }
    async addProjectToRegistry(project) {
        this.projects[project.id] = project;
        return true;
    }
}

function assert(condition, message) {
    if (!condition) {
        console.error('FAILURE: ' + message);
        throw new Error('Assertion failed: ' + message);
    }
    console.log('SUCCESS: ' + message);
}

/**
 * Test function for ProjectManager_server.duplicateProject
 */
async function test_duplicateProject_hotspot_ids() {
    console.log('--- Running test_duplicateProject_hotspot_ids ---');

    // Setup: Replace the real GoogleSheetsAPI with our mock
    const OriginalGoogleSheetsAPI = GoogleSheetsAPI;
    GoogleSheetsAPI = MockGoogleSheetsAPIForV2;

    const projectManager = new ProjectManager_server();

    try {
        // Execute
        const duplicatedProject = await projectManager.duplicateProject('proj_1');

        // Verify
        assert(duplicatedProject, 'Duplicated project should be created.');
        assert(duplicatedProject.name === 'Original Project (Copy)', 'Duplicated project name should be correct.');

        // Crucially, inspect the hotspots that were "saved"
        const mockApi = projectManager.sheetsAPIForTest || new MockGoogleSheetsAPIForV2(); // A bit of a hack to get the instance
        const savedHotspots = mockApi.savedHotspots;

        assert(savedHotspots && savedHotspots.length > 0, 'Hotspots should be saved.');

        const originalHotspot = new MockGoogleSheetsAPIForV2().hotspots['slide_1'][0];
        const newHotspot = savedHotspots[0];

        assert(newHotspot.id, 'New hotspot must have an ID.');
        assert(newHotspot.id !== originalHotspot.id, 'New hotspot ID must be different from the original.');

        console.log('TEST PASSED');

    } catch (e) {
        console.error('TEST FAILED:', e.message);
    } finally {
        // Teardown
        GoogleSheetsAPI = OriginalGoogleSheetsAPI;
    }
}

// Helper to run tests in Apps Script environment
function runV2Tests() {
    test_duplicateProject_hotspot_ids();
    test_duplicateProject_hotspot_ids_are_unique();
}

let lastSavedHotspots = [];

// A new mock class to support the new test
class MockGoogleSheetsAPIForV2_NewTest extends MockGoogleSheetsAPIForV2 {
    async saveHotspots(hotspots) {
        lastSavedHotspots = hotspots;
        return super.saveHotspots(hotspots);
    }
}

async function test_duplicateProject_hotspot_ids_are_unique() {
    console.log('--- Running test_duplicateProject_hotspot_ids_are_unique ---');

    // Setup: Replace the real GoogleSheetsAPI with our new mock
    const OriginalGoogleSheetsAPI = GoogleSheetsAPI;
    GoogleSheetsAPI = MockGoogleSheetsAPIForV2_NewTest;

    const projectManager = new ProjectManager_server();

    try {
        // Execute
        await projectManager.duplicateProject('proj_1');

        // Verify
        assert(lastSavedHotspots && lastSavedHotspots.length > 0, 'Hotspots should be saved.');

        const originalHotspot = new MockGoogleSheetsAPIForV2().hotspots['slide_1'][0];
        const newHotspot = lastSavedHotspots[0];

        assert(newHotspot.id, 'New hotspot must have an ID.');
        assert(newHotspot.id !== originalHotspot.id, 'New hotspot ID must be different from the original.');
        assert(newHotspot.slideId !== originalHotspot.slideId, 'New hotspot slideId must be different from the original.');

        console.log('TEST PASSED');

    } catch (e) {
        console.error('TEST FAILED:', e.message);
    } finally {
        // Teardown
        GoogleSheetsAPI = OriginalGoogleSheetsAPI;
        lastSavedHotspots = []; // Reset for next test run
    }
}

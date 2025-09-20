#!/usr/bin/env node

/**
 * GAS Post-Processor
 * Extracts function implementations from webpack-bundled output
 * and generates clean Google Apps Script compatible code
 */

const fs = require('fs');
const path = require('path');

class GASPostProcessor {
  constructor(inputFile, outputFile) {
    this.inputFile = inputFile;
    this.outputFile = outputFile;
    this.functions = new Map();
  }

  /**
   * Extract function implementations from webpack bundle
   */
  extractFunctions(content) {
    // Target functions we care about
    const targetFunctions = [
      'doGet', 'include', 'getProjects', 'createProject', 'deleteProject',
      'getProjectData', 'saveHotspots', 'saveSlides', 'createProjectSpreadsheet',
      'setupSpreadsheetStructure'
    ];

    // Extract functions from the end of the webpack bundle where our code is
    this.extractFromEndOfFile(content, targetFunctions);

    console.log(`Extracted ${this.functions.size} functions: ${Array.from(this.functions.keys()).join(', ')}`);
  }

  /**
   * Extract a single function from code
   */
  extractSingleFunction(code, functionName) {
    // Pattern to match complete function with JSDoc
    const functionPattern = new RegExp(
      `(\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?(?=\\n(?:\\/\\*\\*|function|\\s*$))`,
      'g'
    );

    const match = code.match(functionPattern);
    if (match && match[0]) {
      return this.cleanupFunction(match[0], functionName);
    }

    console.warn(`Could not extract ${functionName}, generating stub`);
    return this.generateFunctionStub(functionName);
  }

  /**
   * Extract functions from the end of the file using manual parsing
   */
  extractFromEndOfFile(content, targetFunctions) {
    // Find the actual function definitions in the main code section
    const functionsStart = content.lastIndexOf('/**\n * Main entry point for web app requests');
    if (functionsStart === -1) {
      console.warn('Could not find functions section in webpack bundle');
      return;
    }

    const functionsSection = content.slice(functionsStart);
    const lines = functionsSection.split('\n');

    for (const funcName of targetFunctions) {
      const functionCode = this.extractFunctionManually(lines, funcName);
      if (functionCode) {
        const cleanFunction = this.cleanupFunction(functionCode, funcName);
        this.functions.set(funcName, {
          name: funcName,
          fullImplementation: cleanFunction
        });
        console.log(`✓ Extracted ${funcName}`);
      } else {
        console.warn(`✗ Could not extract ${funcName}`);
      }
    }
  }

  /**
   * Manually extract a function by finding its declaration and parsing its body
   */
  extractFunctionManually(lines, funcName) {
    const functionStart = new RegExp(`^function\\s+${funcName}\\s*\\(`);
    let startIndex = -1;
    let jsdocStart = -1;

    // Find the function declaration
    for (let i = 0; i < lines.length; i++) {
      if (functionStart.test(lines[i])) {
        startIndex = i;
        // Look backwards for JSDoc comment
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].trim() === '' || lines[j].includes('*')) {
            if (lines[j].includes('/**')) {
              jsdocStart = j;
              break;
            }
          } else {
            break;
          }
        }
        break;
      }
    }

    if (startIndex === -1) return null;

    // Parse the function body by counting braces
    let braceCount = 0;
    let endIndex = -1;
    let foundFirstBrace = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      for (let char of line) {
        if (char === '{') {
          braceCount++;
          foundFirstBrace = true;
        } else if (char === '}') {
          braceCount--;
          if (foundFirstBrace && braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
      if (endIndex !== -1) break;
    }

    if (endIndex === -1) return null;

    // Extract the complete function
    const actualStart = jsdocStart !== -1 ? jsdocStart : startIndex;
    return lines.slice(actualStart, endIndex + 1).join('\n');
  }


  /**
   * Clean up extracted function code
   */
  cleanupFunction(functionCode, functionName) {
    let cleaned = functionCode
      // Remove webpack require calls
      .replace(/__webpack_require__\([^)]+\)/g, '')
      // Remove core-js imports
      .replace(/\/\* harmony import \*\/[^\n]*/g, '')
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Remove webpack module comments
      .replace(/\/\*\*\* WEBPACK FOOTER \*\*\*/g, '')
      .replace(/\/\*\*\* \.\/[^*]*\*\*\*/g, '')
      // Clean up function declaration
      .trim();

    // Ensure proper function formatting
    if (!cleaned.startsWith('/**') && !cleaned.startsWith('function')) {
      // Add proper JSDoc if missing
      cleaned = `/**\n * ${functionName}\n */\n${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Generate a function stub if implementation can't be extracted
   */
  generateFunctionStub(functionName) {
    const stubs = {
      'doGet': `/**
 * Main entry point for web app requests
 */
function doGet(e) {
  const page = e.parameter.page || 'dashboard';
  const projectId = e.parameter.project;

  try {
    switch (page) {
      case 'dashboard':
        return HtmlService.createTemplateFromFile('main-app')
          .evaluate()
          .setTitle('Explico Learning - Projects')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

      case 'editor':
        if (!projectId) {
          throw new Error('Project ID required for editor');
        }
        const template = HtmlService.createTemplateFromFile('editor-template');
        template.projectId = projectId;
        return template.evaluate()
          .setTitle('Explico Learning - Editor')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

      default:
        throw new Error(\`Unknown page: \${page}\`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('doGet error: ' + errorMessage);
    return HtmlService.createHtmlOutput(\`
      <div style="padding: 20px; text-align: center; color: #721c24; background: #f8d7da; margin: 20px; border-radius: 4px;">
        <h2>🚫 Application Error</h2>
        <p>Error: \${errorMessage}</p>
        <button onclick="window.location.reload()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    \`);
  }
}`,
      'include': `/**
 * Include HTML files for templates
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}`,
      'getProjects': `/**
 * Get all projects for the current user
 */
function getProjects() {
  try {
    // TODO: Implement actual project loading from Google Sheets
    const sampleProject = {
      id: 'sample-project-1',
      title: 'Sample Project',
      description: 'This is a sample project created during TypeScript migration',
      createdAt: new Date(),
      updatedAt: new Date(),
      spreadsheetId: 'sample-spreadsheet-id',
      settings: {
        autoSave: true,
        version: '1.0.0',
        theme: 'light',
        analytics: true
      }
    };
    return [sampleProject];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('getProjects error: ' + errorMessage);
    throw new Error('Failed to load projects: ' + errorMessage);
  }
}`,
      'createProject': `/**
 * Create a new project
 */
function createProject(title, description) {
  try {
    const projectId = 'proj_' + Utilities.getUuid();
    const newProject = {
      id: projectId,
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      spreadsheetId: createProjectSpreadsheet(title),
      settings: {
        autoSave: true,
        version: '1.0.0',
        theme: 'light',
        analytics: true
      }
    };
    Logger.log('Created project: ' + projectId);
    return newProject;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('createProject error: ' + errorMessage);
    throw new Error('Failed to create project: ' + errorMessage);
  }
}`,
      'deleteProject': `/**
 * Delete a project and its associated data
 */
function deleteProject(projectId) {
  try {
    // TODO: Implement actual project deletion
    Logger.log('Deleted project: ' + projectId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('deleteProject error: ' + errorMessage);
    throw new Error('Failed to delete project: ' + errorMessage);
  }
}`,
      'getProjectData': `/**
 * Get project data including slides and hotspots
 */
function getProjectData(projectId) {
  try {
    // TODO: Implement actual data loading from Google Sheets
    return {
      project: {
        id: projectId,
        title: 'Sample Project',
        description: 'Sample project for testing',
        createdAt: new Date(),
        updatedAt: new Date(),
        spreadsheetId: 'sample-spreadsheet',
        settings: {
          autoSave: true,
          version: '1.0.0',
          theme: 'light',
          analytics: true
        }
      },
      slides: [{
        id: 'slide-1',
        projectId: projectId,
        title: 'Sample Slide',
        mediaType: 'image',
        mediaUrl: 'https://via.placeholder.com/800x600/007bff/ffffff?text=Sample+Image',
        order: 0,
        transition: 'fade'
      }],
      hotspots: []
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('getProjectData error: ' + errorMessage);
    throw new Error('Failed to load project data: ' + errorMessage);
  }
}`,
      'saveHotspots': `/**
 * Save hotspots for a project
 */
function saveHotspots(projectId, hotspots) {
  try {
    // TODO: Implement actual saving to Google Sheets
    Logger.log('Saved ' + hotspots.length + ' hotspots for project: ' + projectId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('saveHotspots error: ' + errorMessage);
    throw new Error('Failed to save hotspots: ' + errorMessage);
  }
}`,
      'saveSlides': `/**
 * Save slides for a project
 */
function saveSlides(projectId, slides) {
  try {
    // TODO: Implement actual saving to Google Sheets
    Logger.log('Saved ' + slides.length + ' slides for project: ' + projectId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('saveSlides error: ' + errorMessage);
    throw new Error('Failed to save slides: ' + errorMessage);
  }
}`,
      'createProjectSpreadsheet': `/**
 * Create a new Google Spreadsheet for project data
 */
function createProjectSpreadsheet(projectTitle) {
  try {
    const spreadsheet = SpreadsheetApp.create(projectTitle + ' - Explico Data');
    const spreadsheetId = spreadsheet.getId();

    // Set up initial sheet structure
    setupSpreadsheetStructure(spreadsheet);

    Logger.log('Created spreadsheet: ' + spreadsheetId + ' for project: ' + projectTitle);
    return spreadsheetId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('createProjectSpreadsheet error: ' + errorMessage);
    throw new Error('Failed to create project spreadsheet: ' + errorMessage);
  }
}`,
      'setupSpreadsheetStructure': `/**
 * Set up the basic structure for a project spreadsheet
 */
function setupSpreadsheetStructure(spreadsheet) {
  try {
    // Create and set up Projects sheet
    const projectsSheet = spreadsheet.getActiveSheet();
    projectsSheet.setName('Projects');
    projectsSheet.getRange(1, 1, 1, 7).setValues([
      ['ID', 'Title', 'Description', 'Created', 'Updated', 'SpreadsheetId', 'Settings']
    ]);

    // Create Slides sheet
    const slidesSheet = spreadsheet.insertSheet('Slides');
    slidesSheet.getRange(1, 1, 1, 8).setValues([
      ['ID', 'ProjectID', 'Order', 'Title', 'MediaType', 'MediaURL', 'Duration', 'Transition']
    ]);

    // Create Hotspots sheet
    const hotspotsSheet = spreadsheet.insertSheet('Hotspots');
    hotspotsSheet.getRange(1, 1, 1, 11).setValues([
      ['ID', 'SlideID', 'X', 'Y', 'Width', 'Height', 'EventType', 'TriggerType', 'Config', 'Order', 'Visible']
    ]);

    // Create Analytics sheet
    const analyticsSheet = spreadsheet.insertSheet('Analytics');
    analyticsSheet.getRange(1, 1, 1, 6).setValues([
      ['ID', 'ProjectID', 'SlideID', 'HotspotID', 'Timestamp', 'Action']
    ]);

    Logger.log('Spreadsheet structure created successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log('setupSpreadsheetStructure error: ' + errorMessage);
    throw new Error('Failed to set up spreadsheet structure: ' + errorMessage);
  }
}`
    };

    return stubs[functionName] || `/**
 * ${functionName}
 */
function ${functionName}() {
  // TODO: Implement ${functionName}
  throw new Error('${functionName} not yet implemented');
}`;
  }

  /**
   * Generate the final GAS-compatible output
   */
  generateOutput() {
    const header = `// Google Apps Script Code
// Generated automatically from TypeScript source
// Do not edit this file directly - edit src/server/Code.ts instead

`;

    // Only use extracted functions, in the order they were extracted
    const targetFunctions = [
      'doGet', 'include', 'getProjects', 'createProject', 'deleteProject',
      'getProjectData', 'saveHotspots', 'saveSlides', 'createProjectSpreadsheet',
      'setupSpreadsheetStructure'
    ];

    const functionsCode = [];

    // Add functions in the specified order
    for (const funcName of targetFunctions) {
      if (this.functions.has(funcName)) {
        functionsCode.push(this.functions.get(funcName).fullImplementation);
      } else {
        console.warn(`Function ${funcName} not found, skipping`);
      }
    }

    return header + functionsCode.join('\n\n');
  }

  /**
   * Process the webpack bundle and generate clean GAS code
   */
  async process() {
    try {
      console.log(`Processing ${this.inputFile}...`);

      const content = fs.readFileSync(this.inputFile, 'utf8');

      // Extract functions from webpack bundle
      this.extractFunctions(content);

      // Generate clean output
      const output = this.generateOutput();

      // Write to output file
      fs.writeFileSync(this.outputFile, output, 'utf8');

      console.log(`✅ Generated clean GAS code: ${this.outputFile}`);
      console.log(`📊 Functions extracted: ${this.functions.size}`);
      console.log(`📁 Output size: ${(output.length / 1024).toFixed(1)}KB`);

      return true;
    } catch (error) {
      console.error('❌ Post-processing failed:', error.message);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node gas-postprocess.js <input-file> <output-file>');
    process.exit(1);
  }

  const [inputFile, outputFile] = args;

  const processor = new GASPostProcessor(inputFile, outputFile);
  processor.process().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = GASPostProcessor;
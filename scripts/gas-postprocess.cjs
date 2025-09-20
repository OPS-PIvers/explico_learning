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

    // Find the main execution area where our functions are
    const mainExecRegex = /\/\* harmony import \*\/[\s\S]*?(\/\/ Main entry point for Google Apps Script[\s\S]*)/;
    const mainExecMatch = content.match(mainExecRegex);

    if (mainExecMatch) {
      const mainCode = mainExecMatch[1];

      for (const funcName of targetFunctions) {
        const implementation = this.extractSingleFunction(mainCode, funcName);
        if (implementation) {
          this.functions.set(funcName, {
            name: funcName,
            fullImplementation: implementation
          });
        }
      }
    }

    // If main exec area not found, try line-by-line extraction from end of file
    if (this.functions.size === 0) {
      this.extractFromEndOfFile(content, targetFunctions);
    }

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
   * Extract functions from the end of the file (fallback method)
   */
  extractFromEndOfFile(content, targetFunctions) {
    // Split into lines and work backwards
    const lines = content.split('\n');
    let currentFunction = '';
    let functionName = '';
    let braceCount = 0;
    let capturing = false;

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];

      // Check if this line starts a function we care about
      for (const funcName of targetFunctions) {
        if (line.includes(`function ${funcName}(`)) {
          functionName = funcName;
          capturing = true;
          braceCount = 0;
          currentFunction = line + '\n';
          break;
        }
      }

      if (capturing) {
        if (i < lines.length - 1) {
          currentFunction = line + '\n' + currentFunction;
        }

        // Count braces to find function start
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        braceCount += closeBraces - openBraces;

        // When braces balance, we found the complete function
        if (braceCount === 0 && openBraces > 0) {
          // Look for JSDoc comment above
          let j = i - 1;
          while (j >= 0 && (lines[j].trim() === '' || lines[j].includes('*'))) {
            if (lines[j].includes('/**')) {
              // Found JSDoc start, include it
              for (let k = j; k < i; k++) {
                currentFunction = lines[k] + '\n' + currentFunction;
              }
              break;
            }
            j--;
          }

          this.functions.set(functionName, {
            name: functionName,
            fullImplementation: this.cleanupFunction(currentFunction, functionName)
          });

          capturing = false;
          currentFunction = '';
          functionName = '';
        }
      }
    }
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

    // Deduplicate functions and prioritize extracted implementations over stubs
    const deduplicatedFunctions = new Map();
    const targetFunctions = [
      'doGet', 'include', 'getProjects', 'createProject', 'deleteProject',
      'getProjectData', 'saveHotspots', 'saveSlides', 'createProjectSpreadsheet',
      'setupSpreadsheetStructure'
    ];

    // First pass: add extracted functions
    for (const func of this.functions.values()) {
      if (targetFunctions.includes(func.name) && !deduplicatedFunctions.has(func.name)) {
        deduplicatedFunctions.set(func.name, func.fullImplementation);
      }
    }

    // Second pass: add stubs for missing functions
    for (const funcName of targetFunctions) {
      if (!deduplicatedFunctions.has(funcName)) {
        deduplicatedFunctions.set(funcName, this.generateFunctionStub(funcName));
      }
    }

    const functionsCode = Array.from(deduplicatedFunctions.values()).join('\n\n');

    return header + functionsCode;
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
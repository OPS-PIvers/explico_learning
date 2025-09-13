# TypeScript + React Migration Plan for Explico Learning

## Executive Summary

This document outlines the complete migration strategy to convert the Explico Learning Google Apps Script web app from vanilla JavaScript to TypeScript and React, while maintaining the existing build and deployment pipeline with `clasp`.

## Current Architecture Analysis

### Existing Structure
```
/workspaces/explico_learning/
├── Code.gs                    # Main entry point and routing
├── constants.gs               # Configuration constants
├── build.sh                   # Build script (copies to dist/)
├── components/                # Basic JS components (4 files)
├── services/                  # Business logic services (6 files)  
├── templates/                 # HTML templates (3 files)
├── utils/                     # Utilities and CSS
└── dist/                      # Built files for GAS deployment
```

### Key Files to Migrate
- **Server-side (.gs files)**: 8 total files
- **Client-side (.js files)**: 10 total files  
- **Templates (.html files)**: 3 templates
- **Styles**: 1 CSS file

## Migration Strategy

### Phase 1: Development Environment Setup

#### 1.1 Install Development Dependencies
```bash
npm init -y
npm install --save-dev typescript @types/node webpack webpack-cli
npm install --save-dev gas-webpack-plugin html-webpack-plugin
npm install --save-dev @babel/core @babel/preset-env @babel/preset-react
npm install --save-dev @babel/preset-typescript babel-loader
npm install --save-dev css-loader style-loader
npm install --save react react-dom @types/react @types/react-dom
```

#### 1.2 TypeScript Configuration
Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["ES2017", "DOM"],
    "module": "ESNext", 
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 1.3 Webpack Configuration
Create `webpack.config.js`:
```javascript
const GasPlugin = require('gas-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'Code': './src/server/Code.ts',
    'constants': './src/server/constants.ts',
    'main-app': './src/client/main-app.tsx',
    'editor-template': './src/client/editor-template.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new GasPlugin({
      // Specify server-side entry points
      include: ['Code', 'constants', '**/server/**']
    }),
    new HtmlWebpackPlugin({
      template: './src/templates/main-app.html',
      filename: 'main-app.html',
      chunks: ['main-app']
    }),
    new HtmlWebpackPlugin({
      template: './src/templates/editor-template.html', 
      filename: 'editor-template.html',
      chunks: ['editor-template']
    })
  ]
};
```

#### 1.4 Update Package.json Scripts
```json
{
  "scripts": {
    "build": "webpack",
    "dev": "webpack --watch",
    "deploy": "npm run build && clasp push --force",
    "type-check": "tsc --noEmit"
  }
}
```

### Phase 2: File Structure Reorganization

#### 2.1 New TypeScript Project Structure
```
/workspaces/explico_learning/
├── src/
│   ├── server/                    # Server-side GAS code (.gs files)
│   │   ├── Code.ts               # Main routing logic
│   │   ├── constants.ts          # Configuration
│   │   ├── services/             # Business logic services
│   │   │   ├── ProjectManager.ts
│   │   │   ├── HotspotManager.ts 
│   │   │   ├── GoogleSheetsAPI.ts
│   │   │   ├── MediaHandler.ts
│   │   │   └── EventTypeHandlers.ts
│   │   └── types/                # TypeScript type definitions
│   │       └── index.ts
│   ├── client/                    # Client-side React code  
│   │   ├── components/           # React components
│   │   │   ├── ProjectDashboard.tsx
│   │   │   ├── HotspotEditor.tsx
│   │   │   ├── MainCanvas.tsx
│   │   │   ├── ConfigPanel.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── common/           # Shared components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Client utilities
│   │   ├── styles/              # CSS/styled-components
│   │   ├── main-app.tsx         # Dashboard entry point
│   │   └── editor-template.tsx  # Editor entry point
│   ├── shared/                   # Code shared between client/server
│   │   ├── types/               # Shared TypeScript types
│   │   ├── constants/           # Shared constants
│   │   └── utils/               # Shared utilities
│   └── templates/               # HTML templates
├── dist/                        # Built files (webpack output)
├── webpack.config.js
├── tsconfig.json
├── package.json
└── build.sh                    # Updated build script
```

### Phase 3: Migration Implementation

#### 3.1 Type Definitions
Create comprehensive TypeScript interfaces:
```typescript
// src/shared/types/index.ts
export interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  spreadsheetId: string;
}

export interface Hotspot {
  id: string;
  slideId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  eventType: EventType;
  triggerType: TriggerType;
  config: HotspotConfig;
}

export interface Slide {
  id: string;
  projectId: string;
  order: number;
  mediaType: 'image' | 'video' | 'youtube';
  mediaUrl: string;
  title: string;
}

export enum EventType {
  TEXT_POPUP = 'text_popup',
  PAN_ZOOM = 'pan_zoom', 
  SPOTLIGHT = 'spotlight',
  TEXT_ON_IMAGE = 'text_on_image'
}

export enum TriggerType {
  CLICK = 'click',
  HOVER = 'hover',
  TOUCH = 'touch'
}
```

#### 3.2 Server-Side Migration
Convert existing `.gs` files to TypeScript:

**Code.ts** (Main entry point):
```typescript
// src/server/Code.ts
import { ProjectManager } from './services/ProjectManager';
import { PROJECT_ROUTES } from './constants';

declare const HtmlService: GoogleAppsScript.HTML.HtmlService;
declare const DriveApp: GoogleAppsScript.Drive.DriveApp;

function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  const page = e.parameter.page || 'dashboard';
  const projectId = e.parameter.project;

  try {
    switch (page) {
      case 'dashboard':
        return HtmlService.createTemplateFromFile('main-app')
          .evaluate()
          .setTitle('Explico Learning - Projects');
      
      case 'editor':
        if (!projectId) {
          throw new Error('Project ID required for editor');
        }
        const template = HtmlService.createTemplateFromFile('editor-template');
        template.projectId = projectId;
        return template.evaluate()
          .setTitle('Explico Learning - Editor');
      
      default:
        throw new Error(`Unknown page: ${page}`);
    }
  } catch (error) {
    return HtmlService.createHtmlOutput(`Error: ${error.toString()}`);
  }
}

function include(filename: string): string {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Export server functions for client access
global.getProjects = (): Project[] => ProjectManager.getInstance().getProjects();
global.createProject = (title: string, description: string): Project => 
  ProjectManager.getInstance().createProject(title, description);
```

#### 3.3 Client-Side React Migration
Convert HTML/JS to React components:

**Main Dashboard Component**:
```tsx
// src/client/components/ProjectDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Project } from '../../shared/types';

declare const google: {
  script: {
    run: {
      getProjects(): Promise<Project[]>;
      createProject(title: string, description: string): Promise<Project>;
    }
  }
};

export const ProjectDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectList = await google.script.run.getProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async (title: string, description: string) => {
    try {
      const newProject = await google.script.run.createProject(title, description);
      setProjects(prev => [...prev, newProject]);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading projects...</div>;
  }

  return (
    <div className="project-dashboard">
      <header>
        <h1>Explico Learning Projects</h1>
        <button onClick={() => createNewProject('New Project', '')}>
          Create Project
        </button>
      </header>
      
      <div className="projects-grid">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
};
```

#### 3.4 Service Layer Migration
Convert service classes to TypeScript:

```typescript
// src/server/services/ProjectManager.ts
import { GoogleSheetsAPI } from './GoogleSheetsAPI';
import { Project } from '../../shared/types';

export class ProjectManager {
  private static instance: ProjectManager;
  private sheetsAPI: GoogleSheetsAPI;

  private constructor() {
    this.sheetsAPI = GoogleSheetsAPI.getInstance();
  }

  public static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  public getProjects(): Project[] {
    return this.sheetsAPI.getAllProjects();
  }

  public createProject(title: string, description: string): Project {
    const project: Omit<Project, 'id'> = {
      title,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      spreadsheetId: this.createProjectSpreadsheet(title)
    };
    
    return this.sheetsAPI.createProject(project);
  }

  private createProjectSpreadsheet(title: string): string {
    // Implementation for creating Google Spreadsheet
    const spreadsheet = SpreadsheetApp.create(`${title} - Explico Data`);
    return spreadsheet.getId();
  }
}
```

### Phase 4: Build System Updates

#### 4.1 Updated Build Script
Replace `build.sh` with npm scripts and update for TypeScript/React:

```bash
#!/bin/bash
# build.sh - Updated for TypeScript/React

echo "Building Explico Learning TypeScript/React App..."

# Clean dist directory
rm -rf dist
mkdir -p dist

# Run webpack build
npm run build

# Copy appsscript.json (required for clasp)
cp appsscript.json dist/

# Rename webpack output files to .gs extension for server files
for file in dist/Code.js dist/constants.js; do
  if [ -f "$file" ]; then
    mv "$file" "${file%.js}.gs"
  fi
done

# Copy additional GAS service files compiled by webpack
for file in dist/services/*.js; do
  if [ -f "$file" ]; then
    mv "$file" "${file%.js}.gs"
  fi
done

echo "Build completed successfully!"
echo "Ready for: clasp push --force"
```

#### 4.2 Package.json Configuration
Complete package.json with all necessary dependencies and scripts:

```json
{
  "name": "explico-learning-typescript",
  "version": "1.0.0", 
  "description": "Explico Learning - TypeScript/React Migration",
  "main": "dist/Code.gs",
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/**/*.{ts,tsx}",
    "test": "jest",
    "deploy": "npm run build && clasp push --force",
    "deploy-new": "npm run build && clasp push --force && clasp deploy"
  },
  "devDependencies": {
    "@types/google-apps-script": "^1.0.83",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0", 
    "@babel/preset-react": "^7.23.0",
    "@babel/preset-typescript": "^7.23.0",
    "babel-loader": "^9.1.0",
    "css-loader": "^6.8.0",
    "gas-webpack-plugin": "^2.6.0",
    "html-webpack-plugin": "^5.5.0",
    "style-loader": "^3.3.0",
    "typescript": "^5.2.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

### Phase 5: Migration Execution Plan

#### 5.1 Migration Order
1. **Setup Phase** (Day 1)
   - Install dependencies
   - Create webpack and TypeScript configs
   - Set up new folder structure

2. **Type Definitions** (Day 2)
   - Create comprehensive type definitions
   - Define interfaces for all data structures
   - Set up shared types between client/server

3. **Server-Side Migration** (Days 3-4)
   - Migrate Code.gs to TypeScript
   - Convert service classes to TypeScript  
   - Add proper type annotations
   - Test server functionality

4. **Client-Side Migration** (Days 5-7)
   - Create React components from HTML/JS
   - Implement state management with React hooks
   - Convert form controls to React components
   - Style with CSS modules or styled-components

5. **Integration & Testing** (Days 8-9)
   - Test client-server communication
   - Verify all existing functionality works
   - Fix any TypeScript compilation errors
   - Test build and deployment pipeline

6. **Optimization** (Day 10)
   - Bundle size optimization
   - Code splitting for better performance
   - Add error boundaries and loading states

### Phase 6: Deployment & Testing

#### 6.1 Testing Strategy
- **Local Development**: Use webpack dev server for client-side testing
- **GAS Testing**: Deploy to test Apps Script project first
- **Production Deploy**: Use existing clasp deployment pipeline

#### 6.2 Rollback Plan
- Keep existing codebase in `legacy/` folder
- Maintain current `build.sh` as backup
- Use git branches for migration work

## Benefits of Migration

### Developer Experience
- **Type Safety**: Catch errors at compile time
- **Better IDE Support**: IntelliSense, auto-completion
- **Modern Tooling**: Webpack, hot reload, debugging
- **Component Reusability**: React component architecture

### Maintainability  
- **Clear Separation**: Client/server code organization
- **Modular Architecture**: Service-oriented design
- **Code Documentation**: TypeScript interfaces serve as documentation
- **Testing**: Better unit testing capabilities

### Performance
- **Bundle Optimization**: Tree shaking, code splitting
- **Modern JavaScript**: ES2017+ features
- **Efficient Rendering**: React virtual DOM
- **Better Caching**: Webpack asset optimization

## Risk Assessment

### High Risk
- **GAS Compatibility**: Ensure webpack output works with Google Apps Script runtime
- **Bundle Size**: Keep output size reasonable for GAS limits
- **Global Functions**: Maintain proper global function exposure for GAS

### Medium Risk  
- **Build Complexity**: More complex build pipeline
- **Learning Curve**: Team needs TypeScript/React knowledge
- **Debugging**: More complex debugging in GAS environment

### Mitigation Strategies
- Incremental migration with fallback options
- Extensive testing at each phase
- Documentation of new development workflow
- Training on TypeScript/React best practices

## Timeline

**Total Estimated Duration**: 2 weeks

- **Week 1**: Setup, types, server migration, basic React components
- **Week 2**: Client-side completion, integration, testing, deployment

This plan provides a comprehensive roadmap for migrating Explico Learning to a modern TypeScript/React architecture while maintaining compatibility with Google Apps Script and the existing deployment pipeline.
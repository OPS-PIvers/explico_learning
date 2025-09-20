// Main entry point for Hotspot Editor
// This file is loaded by editor-template.html template

import React from 'react';
import { createRoot } from 'react-dom/client';
import { HotspotEditor } from './components/HotspotEditor';
import './styles/editor-template.css';

// Get project ID from global variable set by server
declare global {
  var projectId: string;
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-root');
  if (!container) {
    throw new Error('App root element not found');
  }

  // Get project ID from global variable or URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = window.projectId || urlParams.get('project') || '';

  if (!projectId) {
    throw new Error('Project ID not found');
  }

  const root = createRoot(container);
  root.render(<HotspotEditor projectId={projectId} />);
});

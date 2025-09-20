// Main entry point for Project Dashboard
// This file is loaded by main-app.html template

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProjectDashboard } from './components/ProjectDashboard';
import './styles/main-app.css';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-root');
  if (!container) {
    throw new Error('App root element not found');
  }

  const root = createRoot(container);
  root.render(<ProjectDashboard />);
});

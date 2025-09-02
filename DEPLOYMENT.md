# Explico Learning - Google Apps Script Deployment

## 🚀 Successfully Deployed!

The Explico Learning Hotspot Editor has been successfully deployed to Google Apps Script as a web application.

### 📍 Access URLs

**Web App URL:**  
https://script.google.com/macros/s/AKfycbw9ZicNfjF7nSt_lCpYoI3MXEi_McVLAW3dzBClcTVz-QgsJ_nPDTRsQA0ELCK5fyde/exec

**Google Apps Script Editor:**  
https://script.google.com/d/1YiQsdE97f3dM50Y26dgjqPUCjIIbMGWX5U2yVha8fu1264DtIj0VJWh_/edit

### 🎯 Navigation

- **Dashboard:** `https://[webapp-url]/exec` (default)
- **Project Editor:** `https://[webapp-url]/exec?page=editor&project=[project-id]`

## 🏗️ Architecture

### Backend (Google Apps Script)
- **Code.gs** - Main server-side functions and routing
- **Service Files (.gs)** - Business logic services
- **Component Files (.gs)** - UI component definitions

### Frontend (HTML Templates)
- **project-dashboard.html** - Project management interface
- **hotspot-editor.html** - Hotspot creation and editing interface
- **styles.html** - Shared CSS styles
- **constants.gs** - Application configuration

### Data Storage
- **Google Sheets** - Project data, slides, hotspots, analytics
- **Google Drive** - Media file storage (images, videos)

## ✅ Features Deployed

### Core Functionality
- ✅ Project dashboard with CRUD operations
- ✅ Hotspot editor with real-time preview
- ✅ Multi-media background support (images, videos, YouTube)
- ✅ Component-based architecture
- ✅ Google Sheets data persistence
- ✅ File upload and media management

### User Interface
- ✅ Responsive design with Tailwind CSS
- ✅ Material Design icons
- ✅ Real-time form validation
- ✅ Drag-and-drop hotspot positioning
- ✅ Modal dialogs and notifications

### Technical Features
- ✅ Event-driven component communication
- ✅ Auto-save functionality
- ✅ Error handling and user feedback
- ✅ Google authentication integration
- ✅ Spreadsheet auto-creation

## 🔐 Permissions Required

The web app requires the following Google OAuth scopes:
- `https://www.googleapis.com/auth/spreadsheets` - Read/write spreadsheets
- `https://www.googleapis.com/auth/drive` - Access Google Drive
- `https://www.googleapis.com/auth/drive.file` - Create/manage files
- `https://www.googleapis.com/auth/userinfo.email` - User identification
- `https://www.googleapis.com/auth/script.external_request` - External API calls

## 🛠️ Development Commands

```bash
# Push code changes
clasp push --force

# Deploy new version
clasp deploy --description "Version description"

# View deployments
clasp deployments

# Open in browser
clasp open
```

## 📝 Usage Instructions

1. **Access the Dashboard:** Visit the web app URL to see the project dashboard
2. **Create Project:** Click "New Project" to create your first walkthrough project
3. **Add Slides:** Use the "Add Slide" button to add background media
4. **Create Hotspots:** Click on slides in the editor to add interactive hotspots
5. **Configure Events:** Use the configuration panel to set up hotspot behaviors
6. **Preview:** Test your walkthrough with the preview functionality

## 🔍 Troubleshooting

### Common Issues
1. **Permission Denied:** Make sure all OAuth scopes are approved
2. **File Not Found:** Check that include statements reference correct file names
3. **Spreadsheet Errors:** Ensure Google Sheets API permissions are granted

### Debug Mode
- Check browser console for JavaScript errors
- View Google Apps Script logs in the GAS editor
- Test individual functions in the GAS debugger

## 📊 Project Structure

```
/workspaces/explico_learning/
├── Code.gs                     # Main server-side functions
├── appsscript.json            # Project configuration
├── project-dashboard.html      # Dashboard interface
├── hotspot-editor.html        # Editor interface
├── styles.html                # CSS styles
├── constants.gs               # Configuration constants
├── [Component].gs files       # UI components (10 files)
├── [Service].gs files         # Business logic (5 files)
└── .clasp.json               # Deployment configuration
```

## 🎉 Ready to Use!

The Explico Learning Hotspot Editor is now fully deployed and ready for creating interactive walkthrough experiences!
# Automated Deployment Setup Guide

This guide explains how to set up automated deployment for the Explico Learning project using GitHub Actions.

## Overview

The automated workflow will:
1. ✅ **Build** - Run `./build.sh` to package files into `dist/`
2. ✅ **Deploy** - Push code to Google Apps Script using `clasp push --force`  
3. ✅ **Update** - Create or update deployment with timestamp

## Prerequisites

Before setting up automation, you need:
- ✅ Google Apps Script project created and configured
- ✅ `clasp` installed and authenticated locally
- ✅ GitHub repository with the workflow file

## Setup Steps

### 1. Get Your Local Clasp Credentials

First, make sure you're authenticated with clasp locally:

```bash
# If not already logged in
clasp login

# Verify you're logged in
clasp list
```

### 2. Extract Credentials

Get your clasp credentials file:

```bash
# On Linux/macOS
cat ~/.clasprc.json

# On Windows
type %APPDATA%\npm\node_modules\@google\clasp\.clasprc.json
```

Copy the entire JSON content (it should look like this):
```json
{
  "token": {
    "access_token": "ya29.a0...",
    "refresh_token": "1//...",
    "scope": "...",
    "token_type": "Bearer",
    "expiry_date": 1234567890
  },
  "oauth2ClientSettings": {
    "clientId": "...",
    "clientSecret": "...",
    "redirectUri": "..."
  },
  "isLocalCreds": false
}
```

### 3. Set Up GitHub Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add these secrets:

#### Required Secret:
- **Name**: `CLASPRC_JSON`  
- **Value**: The entire content from your `.clasprc.json` file

#### Optional Secret (for existing deployments):
- **Name**: `DEPLOYMENT_ID`
- **Value**: Your specific deployment ID (if you want to update an existing deployment rather than create new ones)

### 4. Find Your Deployment ID (Optional)

If you want to update an existing deployment rather than create new ones:

```bash
# List your deployments
clasp deployments

# Look for output like:
# - AKfycbw... @1 - My deployment description
```

Copy the deployment ID (the part after the dash, before the @) and add it as the `DEPLOYMENT_ID` secret.

### 5. Test the Workflow

The workflow will automatically run when you push to the `main` branch:

```bash
git add .
git commit -m "Test automated deployment"
git push origin main
```

### 6. Monitor the Deployment

1. Go to your GitHub repository
2. Click the **"Actions"** tab
3. Click on your latest workflow run
4. Watch the progress of each step:
   - ✅ Checkout code
   - ✅ Set up Node.js
   - ✅ Install clasp
   - ✅ Authenticate clasp
   - ✅ **Build project files** (NEW!)
   - ✅ Push code to Apps Script
   - ✅ Update deployment
   - ✅ Clean up credentials

## Workflow Details

### What the Build Step Does

The build step runs `./build.sh` which:
- Copies all `.gs` files to `dist/`
- Copies all `.html` files to `dist/`
- Copies `appsscript.json` to `dist/`
- Copies `.clasp.json` to `dist/`

### What Happens on Each Push

1. **Trigger**: Push to `main` branch
2. **Build**: `./build.sh` packages files
3. **Deploy**: `clasp push --force` uploads to Google Apps Script
4. **Update**: Creates/updates deployment with timestamp

### Branch Configuration

Currently configured for `main` branch. To add other branches:

```yaml
on:
  push:
    branches:
      - main
      - develop  # Add this line
      - staging  # Add this line
```

## Troubleshooting

### Common Issues

**❌ "Invalid JSON in credentials"**
- Check that you copied the entire `.clasprc.json` file
- Ensure no extra characters or line breaks

**❌ "Build script not executable"**  
- The workflow automatically runs `chmod +x ./build.sh`
- This should be handled automatically

**❌ "clasp push failed"**
- Check that your local `.clasp.json` has the correct script ID
- Ensure the Google Apps Script project exists

**❌ "Deployment failed"**
- If using `DEPLOYMENT_ID`, ensure it's valid
- Try without `DEPLOYMENT_ID` to create a new deployment

### Debug Steps

1. Check the GitHub Actions logs in the "Actions" tab
2. Verify secrets are set correctly in repository settings
3. Test locally:
   ```bash
   ./build.sh
   clasp push --force
   clasp deploy --description "Test"
   ```

## Security Notes

- ✅ Credentials are stored securely in GitHub Secrets
- ✅ Credentials are cleaned up after each run
- ✅ Secrets are not exposed in logs
- ✅ Only repository administrators can access secrets

## What's New

The updated workflow now includes:
- 🔧 **Build step** - Automatically runs `./build.sh`
- 📁 **Build verification** - Lists files in `dist/` for debugging
- 🚀 **Better logging** - Clear status messages with emojis
- ✅ **Error handling** - Proper exit codes and validation

Your workflow is now complete! Every push to `main` will automatically build, deploy, and update your Google Apps Script project.
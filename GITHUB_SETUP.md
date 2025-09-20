# GitHub Actions Setup for Google Apps Script Deployment

## Required GitHub Secrets

To enable automatic deployment to Google Apps Script when you push to main, you need to set up these secrets in your GitHub repository:

### 1. Get Your Clasp Credentials

Run this command locally to get your clasp credentials:
```bash
cat ~/.clasprc.json
```

Copy the entire JSON content.

### 2. Get Your Google Apps Script IDs

From your CLAUDE.md file, you have:
- **Script ID**: `1YiQsdE97f3dM50Y26dgjqPUCjIIbMGWX5U2yVha8fu1264DtIj0VJWh_`
- **Deployment ID**: `AKfycbxCGDHOw8f5W__3NGcx0KoamGyh5mQpgWC2WoKMJAU`

### 3. Add GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

#### `CLASP_CREDENTIALS`
```json
{
  "token": {
    "access_token": "your_access_token_here",
    "refresh_token": "your_refresh_token_here",
    "scope": "https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.webapp.deploy https://www.googleapis.com/auth/logging.read https://www.googleapis.com/auth/script.external_request https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/service.management",
    "token_type": "Bearer",
    "expiry_date": 1234567890123
  },
  "oauth2ClientSettings": {
    "clientId": "your_client_id_here.apps.googleusercontent.com",
    "clientSecret": "your_client_secret_here",
    "redirectUri": "http://localhost"
  },
  "isLocalCreds": false
}
```

#### `GAS_SCRIPT_ID`
```
1YiQsdE97f3dM50Y26dgjqPUCjIIbMGWX5U2yVha8fu1264DtIj0VJWh_
```

#### `GAS_DEPLOYMENT_ID`
```
AKfycbxCGDHOw8f5W__3NGcx0KoamGyh5mQpgWC2WoKMJAU
```

## Workflow Behavior

### On Push to Main Branch:
1. ✅ Run quality checks (TypeScript, ESLint, Prettier, Tests)
2. ✅ Build TypeScript → Clean GAS code
3. ✅ Push code to Google Apps Script
4. ✅ **Update existing deployment** (same URL)
5. ✅ Show deployment URLs in GitHub Actions logs

### On Pull Request:
1. ✅ Run quality checks only (no deployment)
2. ✅ Validate build process
3. ✅ Ensure code quality before merge

## Manual Override

If you need to deploy without pushing to main:
```bash
# Local deployment (recommended for development)
npm run deploy:dev

# Full production deployment locally
npm run deploy
```

## Security Notes

- GitHub Actions will only run on your repository
- Secrets are encrypted and only accessible during workflow execution
- The workflow uses official GitHub Actions (setup-node@v4, checkout@v4)
- No sensitive data is logged or exposed

## Troubleshooting

If deployment fails:
1. Check that your clasp credentials haven't expired
2. Verify the Script ID and Deployment ID are correct
3. Ensure your Google account has access to the Apps Script project
4. Check GitHub Actions logs for specific error messages

## URL Stability

Your web app URL will always remain the same:
```
https://script.google.com/macros/s/AKfycbxCGDHOw8f5W__3NGcx0KoamGyh5mQpgWC2WoKMJAU/exec
```

The GitHub workflow ensures the existing deployment is updated, never creating new URLs.
#!/bin/bash

echo "Building Explico Learning TypeScript/React App..."

# Clean dist directory
rm -rf dist
mkdir -p dist

# Build client files with webpack
echo "Building client files with webpack..."
npm ci --production=false
npm run build

if [ $? -ne 0 ]; then
    echo "Client build failed! Check the errors above."
    exit 1
fi

# Server-side TypeScript is now compiled by webpack with gas-webpack-plugin
# The bundled Code.js will be automatically renamed to Code.gs
echo "Server-side TypeScript will be compiled by webpack..."

# constants.gs is no longer needed - all constants are inlined in Code.gs

# Copy appsscript.json (required for clasp)
echo "Copying configuration files..."
cp appsscript.json dist/

# Rename webpack-generated Code.js to Code.gs for Google Apps Script compatibility
if [ -f "dist/Code.js" ]; then
    echo "Renaming Code.js to Code.gs..."
    mv dist/Code.js dist/Code.gs
else
    echo "Warning: Code.js not found! TypeScript compilation may have failed."
fi

# Remove other standalone JavaScript files and chunks (they should be inlined in HTML)
echo "Removing client-side JavaScript files and webpack chunks..."
rm -f dist/main-app.js dist/editor-template.js dist/*.js.LICENSE.txt
# Remove webpack chunk files but keep Code.gs
find dist -name "*.js" -not -name "Code.gs" -delete

# Ensure HTML files are in place (webpack should have created them)
if [ -f "dist/main-app.html" ] && [ -f "dist/editor-template.html" ]; then
    echo "HTML templates processed successfully"
else
    echo "Warning: HTML templates may not have been generated correctly"
fi

# List generated files
echo "Generated files in dist/:"
ls -la dist/

echo "Build completed successfully!"
echo "Ready for deployment with: clasp push --force"
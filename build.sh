#!/bin/bash

echo "Building Explico Learning TypeScript/React App..."

# Clean dist directory
rm -rf dist
mkdir -p dist

# Run webpack build (this includes type checking and linting)
echo "Running webpack build..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed! Check the errors above."
    exit 1
fi

# Copy appsscript.json (required for clasp)
echo "Copying configuration files..."
cp appsscript.json dist/

# Rename webpack output files to .gs extension for server files
echo "Processing server-side files..."
for file in dist/Code.js dist/constants.js; do
  if [ -f "$file" ]; then
    echo "Renaming $(basename "$file") to $(basename "$file" .js).gs"
    mv "$file" "${file%.js}.gs"
  fi
done

# Process server services compiled by webpack
if [ -d "dist/services" ]; then
  echo "Processing service files..."
  for file in dist/services/*.js; do
    if [ -f "$file" ]; then
      echo "Renaming $(basename "$file") to $(basename "$file" .js).gs"
      mv "$file" "${file%.js}.gs"
    fi
  done
fi

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
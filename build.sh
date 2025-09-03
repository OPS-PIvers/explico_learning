#!/bin/bash

# Create dist directory if it doesn't exist
rm -rf dist
mkdir -p dist

# Copy and rename .js files to .gs
for file in services/*.js; do
  cp "$file" "dist/$(basename "$file" .js).gs"
done

cp templates/*.html dist/
cp appsscript.json dist/
echo "<style>" > dist/styles.html
cat styles.css >> dist/styles.html
echo "</style>" >> dist/styles.html
cp utils/styles.css dist/
cp Code.gs dist/
cp constants.gs dist/
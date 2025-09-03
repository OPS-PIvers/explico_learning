#!/bin/bash

# Create dist directory if it doesn't exist
# Create dist directory if it doesn't exist
rm -rf dist
mkdir -p dist

# Copy and rename .js files to .gs for server-side
for file in services/*.js; do
  cp "$file" "dist/$(basename "$file" .js).gs"
done

# Create .html files for client-side JS
for file in services/*.js; do
  echo "<script>" > "dist/js_$(basename "$file" .js).html"
  cat "$file" >> "dist/js_$(basename "$file" .js).html"
  echo "</script>" >> "dist/js_$(basename "$file" .js).html"
done

for file in components/*.js; do
  echo "<script>" > "dist/js_$(basename "$file" .js).html"
  cat "$file" >> "dist/js_$(basename "$file" .js).html"
  echo "</script>" >> "dist/js_$(basename "$file" .js).html"
done

cp templates/*.html dist/
cp appsscript.json dist/
echo "<style>" > dist/styles.html
cat styles.css >> dist/styles.html
echo "</style>" >> dist/styles.html
cp utils/styles.css dist/
cp Code.gs dist/
cp constants.gs dist/
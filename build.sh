#!/bin/bash

# Create dist directory if it doesn't exist
mkdir -p dist

# Copy files to dist
cp services/*.js dist/
cp templates/*.html dist/
cp appsscript.json dist/
cp styles.css dist/
cp utils/styles.css dist/
cp Code.gs dist/
cp constants.gs dist/

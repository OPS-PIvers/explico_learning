#!/bin/bash
# Clear the dist directory
rm -rf dist/*

# Copy the necessary files to the dist directory
cp Code.gs dist/
cp constants.gs dist/
cp *.html dist/
cp appsscript.json dist/
cp .clasp.json dist/
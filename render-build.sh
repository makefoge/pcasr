#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
mkdir -p public
cp -r index.html styles.css app.js public/ 
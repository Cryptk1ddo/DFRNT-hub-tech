#!/bin/bash

# FocusForge Deployment Script
echo "🚀 Starting FocusForge deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your Firebase configuration:"
    echo "cp env.example .env"
    echo "Then edit .env with your Firebase project details."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Build failed! Please check for errors."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy to GitHub Pages
echo "🚀 Deploying to GitHub Pages..."
npm run deploy

echo "🎉 Deployment completed!"
echo "Your app should be available at: https://cryptk1ddo.github.io/DFRNT-hub-tech"
echo ""
echo "Note: It may take a few minutes for changes to appear." 
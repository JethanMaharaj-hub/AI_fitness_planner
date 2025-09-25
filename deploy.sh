#!/bin/bash

# AI Fitness Planner - Vercel Deployment Script

echo "🏋️ Deploying AI Fitness Planner to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Vercel
    echo "🚀 Deploying to Vercel..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo ""
        echo "📱 Your PWA is now live!"
        echo "🔗 Check your Vercel dashboard for the URL"
        echo ""
        echo "📋 Post-deployment checklist:"
        echo "  ✅ Test PWA installation on mobile"
        echo "  ✅ Verify timers work with wake lock"
        echo "  ✅ Test offline functionality"
        echo "  ✅ Check service worker registration"
    else
        echo "❌ Deployment failed. Check the error messages above."
        exit 1
    fi
else
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi
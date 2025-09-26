#!/bin/bash

# Verify GitHub Repository Setup
# This script checks if everything is ready for GitHub Actions deployment

set -e

echo "🔍 Verifying GitHub repository setup..."

# Check if repository structure exists
REPO_DIR="../village-platform-github-repo"
if [ ! -d "$REPO_DIR" ]; then
    echo "❌ Repository directory not found: $REPO_DIR"
    echo "   Run: ./scripts/prepare-github-repo.sh"
    exit 1
fi

echo "✅ Repository directory found: $REPO_DIR"

# Check required files
echo "📋 Checking required files..."

# Check GitHub Actions workflow
if [ -f "$REPO_DIR/.github/workflows/deploy-village-platform-complete.yml" ]; then
    echo "✅ GitHub Actions workflow found"
else
    echo "❌ GitHub Actions workflow missing"
    exit 1
fi

# Check Village Platform source
if [ -d "$REPO_DIR/village-platform" ]; then
    echo "✅ Village Platform source code found"
    
    # Check backend
    if [ -d "$REPO_DIR/village-platform/backend" ]; then
        echo "✅ Backend source found"
    else
        echo "❌ Backend source missing"
        exit 1
    fi
    
    # Check frontend
    if [ -d "$REPO_DIR/village-platform/frontend" ]; then
        echo "✅ Frontend source found"
    else
        echo "❌ Frontend source missing"
        exit 1
    fi
else
    echo "❌ Village Platform source code missing"
    exit 1
fi

# Check Kubernetes manifests
if [ -d "$REPO_DIR/k8s" ]; then
    echo "✅ Kubernetes manifests directory found"
else
    echo "❌ Kubernetes manifests directory missing"
    exit 1
fi

# Check README
if [ -f "$REPO_DIR/README.md" ]; then
    echo "✅ README.md found"
else
    echo "❌ README.md missing"
    exit 1
fi

# Check setup guide
if [ -f "$REPO_DIR/GITHUB_SETUP.md" ]; then
    echo "✅ GitHub setup guide found"
else
    echo "❌ GitHub setup guide missing"
    exit 1
fi

echo ""
echo "🎉 All files are ready for GitHub repository setup!"
echo ""
echo "📋 Next steps:"
echo "1. Go to: $REPO_DIR"
echo "2. Follow the instructions in GITHUB_SETUP.md"
echo "3. Create GitHub repository"
echo "4. Add AWS secrets"
echo "5. Push code to trigger deployment"
echo ""
echo "📖 Detailed guide: GITHUB_REPOSITORY_SETUP_STEPS.md"
echo ""
echo "🚀 Your Village Platform will be deployed automatically via GitHub Actions!"
#!/bin/bash

# GV Playground GitHub Repository Setup Script
# This script helps set up the GitHub repository and configure remote origin

set -e

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${BLUE}🚀 GV Playground GitHub Repository Setup${NC}"
echo "=============================================="
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "Not in a git repository. Please run this script from the gv-playground directory."
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
print_status "Current branch: $CURRENT_BRANCH"

# Check if remote origin exists
if git remote get-url origin >/dev/null 2>&1; then
    REMOTE_URL=$(git remote get-url origin)
    print_status "Remote origin already exists: $REMOTE_URL"
    print_warning "If you want to change the remote URL, please run:"
    echo "  git remote set-url origin <new-url>"
    exit 0
fi

echo ""
print_status "Setting up GitHub repository..."
echo ""

# Get repository information
echo "Please provide the following information:"
echo ""

read -p "GitHub username: " GITHUB_USERNAME
read -p "Repository name (default: gv-playground): " REPO_NAME
REPO_NAME=${REPO_NAME:-gv-playground}

# Construct repository URL
REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo ""
print_status "Repository URL: $REPO_URL"
echo ""

# Confirm setup
read -p "Do you want to proceed with this setup? (y/N): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    print_warning "Setup cancelled."
    exit 0
fi

echo ""
print_status "Adding remote origin..."
git remote add origin "$REPO_URL"

print_status "Fetching remote information..."
git fetch origin 2>/dev/null || print_warning "Remote repository doesn't exist yet. You'll need to create it on GitHub first."

print_status "Setting upstream branch..."
git branch --set-upstream-to=origin/$CURRENT_BRANCH $CURRENT_BRANCH 2>/dev/null || print_warning "Could not set upstream. This is normal for new repositories."

echo ""
print_success "Remote origin configured successfully!"
echo ""

# Display next steps
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Create the repository on GitHub:"
echo "   - Go to https://github.com/new"
echo "   - Repository name: $REPO_NAME"
echo "   - Description: GV Playground - Full-stack application with microservices architecture"
echo "   - Make it Public or Private (your choice)"
echo "   - Don't initialize with README, .gitignore, or license (we already have these)"
echo "   - Click 'Create repository'"
echo ""
echo "2. Push your code to GitHub:"
echo "   git push -u origin $CURRENT_BRANCH"
echo ""
echo "3. Configure GitHub Secrets:"
echo "   - Go to https://github.com/$GITHUB_USERNAME/$REPO_NAME/settings/secrets/actions"
echo "   - Add the following secrets:"
echo "     - AWS_ACCESS_KEY_ID"
echo "     - AWS_SECRET_ACCESS_KEY"
echo ""
echo "4. Trigger GitHub Actions:"
echo "   - Go to https://github.com/$GITHUB_USERNAME/$REPO_NAME/actions"
echo "   - Select 'Deploy GV Playground' workflow"
echo "   - Click 'Run workflow'"
echo ""

print_success "GitHub repository setup script completed!"
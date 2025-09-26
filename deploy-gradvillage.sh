#!/bin/bash

# GradVillage Application Deployment Script
# This script helps deploy the GradVillage application to AWS using GitHub Actions

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

echo -e "${BLUE}🚀 GradVillage Application Deployment to AWS${NC}"
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
if ! git remote get-url origin >/dev/null 2>&1; then
    print_error "No remote origin configured. Please run ./setup-github-repo.sh first."
    exit 1
fi

REMOTE_URL=$(git remote get-url origin)
print_status "Remote origin: $REMOTE_URL"

echo ""
print_status "Starting GradVillage deployment process..."
echo ""

# Step 1: Create GitHub Repository
echo -e "${BLUE}📋 Step 1: Create GitHub Repository${NC}"
echo "=================================="
echo ""
echo "1. Go to https://github.com/new"
echo "2. Repository name: gv-playground"
echo "3. Description: GradVillage - Full-stack application with microservices architecture"
echo "4. Make it Public or Private (your choice)"
echo "5. Don't initialize with README, .gitignore, or license (we already have these)"
echo "6. Click 'Create repository'"
echo ""

read -p "Have you created the GitHub repository? (y/N): " REPO_CREATED
if [[ ! $REPO_CREATED =~ ^[Yy]$ ]]; then
    print_warning "Please create the GitHub repository first, then run this script again."
    exit 0
fi

# Step 2: Push code to GitHub
echo ""
echo -e "${BLUE}📋 Step 2: Push Code to GitHub${NC}"
echo "=============================="
echo ""

print_status "Pushing code to GitHub..."
if git push -u origin $CURRENT_BRANCH; then
    print_success "Code pushed to GitHub successfully!"
else
    print_error "Failed to push code to GitHub. Please check your repository URL and permissions."
    exit 1
fi

# Step 3: Configure GitHub Secrets
echo ""
echo -e "${BLUE}📋 Step 3: Configure GitHub Secrets${NC}"
echo "=================================="
echo ""

# Get AWS credentials
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    print_error "AWS credentials not found in environment variables."
    echo "Please export your AWS credentials first:"
    echo "export AWS_ACCESS_KEY_ID=\"your-access-key\""
    echo "export AWS_SECRET_ACCESS_KEY=\"your-secret-key\""
    exit 1
fi

echo "Configure the following secrets in your GitHub repository:"
echo ""
echo "1. Go to: https://github.com/silvesterruban/gv-playground/settings/secrets/actions"
echo ""
echo "2. Add these secrets:"
echo ""
echo -e "${YELLOW}AWS_ACCESS_KEY_ID:${NC}"
echo "$AWS_ACCESS_KEY_ID"
echo ""
echo -e "${YELLOW}AWS_SECRET_ACCESS_KEY:${NC}"
echo "$AWS_SECRET_ACCESS_KEY"
echo ""

read -p "Have you configured the GitHub secrets? (y/N): " SECRETS_CONFIGURED
if [[ ! $SECRETS_CONFIGURED =~ ^[Yy]$ ]]; then
    print_warning "Please configure the GitHub secrets first, then run this script again."
    exit 0
fi

# Step 4: Trigger GitHub Actions Deployment
echo ""
echo -e "${BLUE}📋 Step 4: Trigger GitHub Actions Deployment${NC}"
echo "=========================================="
echo ""

print_status "Triggering GitHub Actions deployment..."

# Extract repository name from URL
REPO_NAME=$(echo $REMOTE_URL | sed 's/.*github.com[:/]\([^/]*\)\/\([^.]*\).*/\1\/\2/')
print_status "Repository: $REPO_NAME"

echo ""
echo "You can trigger the deployment in two ways:"
echo ""
echo "1. Automatic (Recommended):"
echo "   - The workflows will automatically trigger on push to main/develop branches"
echo "   - Go to: https://github.com/$REPO_NAME/actions"
echo "   - Watch the 'Deploy GV Playground' workflow run"
echo ""
echo "2. Manual:"
echo "   - Go to: https://github.com/$REPO_NAME/actions"
echo "   - Select 'Deploy GV Playground' workflow"
echo "   - Click 'Run workflow'"
echo "   - Select environment: gv-playground"
echo "   - Click 'Run workflow'"
echo ""

# Step 5: Monitor Deployment
echo -e "${BLUE}📋 Step 5: Monitor Deployment${NC}"
echo "=============================="
echo ""

print_status "Deployment monitoring information:"
echo ""
echo "🔗 GitHub Actions: https://github.com/$REPO_NAME/actions"
echo "🔗 Application URL: http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com"
echo "🔗 EKS Cluster: gv-playground-eks-cluster"
echo "🔗 ECR Backend: 898307279366.dkr.ecr.us-east-1.amazonaws.com/gv-playground-backend"
echo "🔗 ECR Frontend: 898307279366.dkr.ecr.us-east-1.amazonaws.com/gv-playground-frontend"
echo ""

# Step 6: Verify Deployment
echo -e "${BLUE}📋 Step 6: Verify Deployment${NC}"
echo "=============================="
echo ""

print_status "After the deployment completes, verify:"
echo ""
echo "1. Check GitHub Actions workflow status"
echo "2. Verify EKS cluster: kubectl get nodes"
echo "3. Check application pods: kubectl get pods"
echo "4. Test application: curl http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com"
echo "5. Check LoadBalancer services: kubectl get services"
echo ""

# Summary
echo -e "${GREEN}🎉 GradVillage Deployment Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Monitor the GitHub Actions workflow"
echo "2. Wait for deployment to complete (usually 10-15 minutes)"
echo "3. Verify the application is accessible"
echo "4. Check the deployment summary in GitHub Actions"
echo ""
echo "If you encounter any issues:"
echo "1. Check the workflow logs in GitHub Actions"
echo "2. Verify AWS credentials and permissions"
echo "3. Check EKS cluster status"
echo "4. Review the troubleshooting guide in GITHUB_SECRETS_SETUP.md"
echo ""

print_success "GradVillage deployment process initiated!"
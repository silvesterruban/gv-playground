#!/bin/bash

# Prepare GitHub Repository for Village Platform Deployment
# This script helps you organize your repository structure

set -e

echo "🚀 Preparing GitHub repository for Village Platform deployment..."

# Check if we're in the right directory
if [ ! -f "infrastructure/main.tf" ]; then
    echo "❌ Please run this script from the gv-playground directory"
    exit 1
fi

echo "📁 Current directory: $(pwd)"

# Create a temporary directory for the GitHub repo structure
REPO_DIR="../village-platform-github-repo"
echo "📂 Creating repository structure in: $REPO_DIR"

# Create the repository directory
mkdir -p "$REPO_DIR"

# Copy the Village Platform source code
echo "📋 Copying Village Platform source code..."
if [ -d "../gradVillageTerraform/village-platform" ]; then
    cp -r "../gradVillageTerraform/village-platform" "$REPO_DIR/"
    echo "✅ Village Platform source code copied"
else
    echo "⚠️  Village Platform source not found at ../gradVillageTerraform/village-platform"
    echo "   Please ensure the Village Platform code is available"
fi

# Copy GitHub Actions workflow
echo "📋 Copying GitHub Actions workflow..."
mkdir -p "$REPO_DIR/.github/workflows"
cp ".github/workflows/deploy-village-platform-complete.yml" "$REPO_DIR/.github/workflows/"
echo "✅ GitHub Actions workflow copied"

# Copy Kubernetes manifests
echo "📋 Copying Kubernetes manifests..."
mkdir -p "$REPO_DIR/k8s"
cp "k8s/village-platform-real.yaml" "$REPO_DIR/k8s/" 2>/dev/null || echo "⚠️  village-platform-real.yaml not found"
cp "k8s/village-platform-lb.yaml" "$REPO_DIR/k8s/" 2>/dev/null || echo "⚠️  village-platform-lb.yaml not found"
echo "✅ Kubernetes manifests copied"

# Create README for the repository
echo "📋 Creating repository README..."
cat > "$REPO_DIR/README.md" << 'EOF'
# Village Platform - GV Playground Deployment

This repository contains the Village Platform application deployed to the GV Playground EKS cluster.

## Architecture

- **Backend**: Node.js/Express API with Prisma ORM
- **Frontend**: React application
- **Database**: PostgreSQL on AWS RDS
- **Infrastructure**: AWS EKS, ECR, ALB
- **CI/CD**: GitHub Actions

## Quick Start

1. Set up GitHub repository secrets (see GITHUB_SETUP.md)
2. Push to main branch to trigger deployment
3. Access the application via LoadBalancer URL

## Deployment

The application is automatically deployed via GitHub Actions when you push to the main branch.

## Monitoring

- Check deployment status in GitHub Actions tab
- Monitor pods: `kubectl get pods`
- Check services: `kubectl get services`

## Support

For deployment issues, check:
1. GitHub Actions logs
2. Kubernetes pod logs
3. AWS EKS cluster status
EOF

# Create GitHub setup guide
echo "📋 Creating GitHub setup guide..."
cat > "$REPO_DIR/GITHUB_SETUP.md" << 'EOF'
# GitHub Repository Setup Guide

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it: `village-platform-gv-playground`
3. Make it private (recommended for production)
4. Don't initialize with README (we already have one)

## Step 2: Add Repository Secrets

Go to your repository → Settings → Secrets and variables → Actions

Add these secrets:

### AWS_ACCESS_KEY_ID
- Value: Your AWS access key ID
- Example: `YOUR_AWS_ACCESS_KEY_ID`

### AWS_SECRET_ACCESS_KEY  
- Value: Your AWS secret access key
- Example: `YOUR_AWS_SECRET_ACCESS_KEY`

### AWS_SESSION_TOKEN
- Value: Your AWS session token (if using temporary credentials)
- Example: `YOUR_AWS_SESSION_TOKEN`

## Step 3: Push Code to Repository

```bash
cd village-platform-github-repo
git init
git add .
git commit -m "Initial commit: Village Platform for GV Playground"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/village-platform-gv-playground.git
git push -u origin main
```

## Step 4: Monitor Deployment

1. Go to your repository on GitHub
2. Click on "Actions" tab
3. Watch the "Deploy Village Platform to GV Playground" workflow
4. Wait for all steps to complete (usually 5-10 minutes)

## Step 5: Access Your Application

After successful deployment, the workflow will show the LoadBalancer URL in the logs.

You can also get it manually:
```bash
kubectl get service village-platform-lb
```

## Troubleshooting

### Common Issues:

1. **AWS Credentials Expired**
   - Update the secrets in GitHub with fresh credentials
   - Re-run the workflow

2. **ECR Authentication Failed**
   - Ensure ECR repositories exist in AWS
   - Check AWS permissions

3. **Kubernetes Deployment Failed**
   - Check if EKS cluster is accessible
   - Verify kubeconfig is updated

### Check Deployment Status:
```bash
# Check pods
kubectl get pods -l app=village-backend-real
kubectl get pods -l app=village-frontend-real

# Check services
kubectl get services

# Check logs
kubectl logs -l app=village-backend-real
kubectl logs -l app=village-frontend-real
```
EOF

echo ""
echo "✅ Repository structure prepared in: $REPO_DIR"
echo ""
echo "📋 Next steps:"
echo "1. Go to $REPO_DIR"
echo "2. Follow the instructions in GITHUB_SETUP.md"
echo "3. Create a GitHub repository"
echo "4. Add the secrets"
echo "5. Push the code"
echo ""
echo "🎉 Your Village Platform will be deployed automatically!"
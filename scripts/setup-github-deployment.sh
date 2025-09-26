#!/bin/bash

# Setup GitHub Actions Deployment for Village Platform
# This script helps you prepare for GitHub Actions deployment

set -e

echo "🚀 Setting up GitHub Actions deployment for Village Platform..."

# Check if we're in the right directory
if [ ! -f "infrastructure/main.tf" ]; then
    echo "❌ Please run this script from the gv-playground directory"
    exit 1
fi

# Check if AWS credentials are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ AWS credentials not set. Please export them first:"
    echo "export AWS_ACCESS_KEY_ID=\"your-access-key\""
    echo "export AWS_SECRET_ACCESS_KEY=\"your-secret-key\""
    echo "export AWS_SESSION_TOKEN=\"your-session-token\""
    exit 1
fi

echo "✅ AWS credentials found"

# Update kubeconfig
echo "📋 Updating kubeconfig..."
aws eks update-kubeconfig --region us-east-1 --name playground-eks-cluster

# Create Kubernetes secrets
echo "🔐 Creating Kubernetes secrets..."
kubectl create secret generic village-platform-secrets \
  --from-literal=database-url="postgresql://village_user:VillagePassword123@playground-postgres.c8qj8qj8qj8q.us-east-1.rds.amazonaws.com:5432/village_db" \
  --from-literal=jwt-secret="village-jwt-secret-key-2024" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Kubernetes secrets created"

# Display GitHub setup instructions
echo ""
echo "🎯 Next steps for GitHub Actions deployment:"
echo ""
echo "1. Go to your GitHub repository"
echo "2. Navigate to Settings → Secrets and variables → Actions"
echo "3. Add these secrets:"
echo "   - AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY: $AWS_SECRET_ACCESS_KEY"
echo "   - AWS_SESSION_TOKEN: $AWS_SESSION_TOKEN"
echo ""
echo "4. Copy the workflow file to your repository:"
echo "   cp .github/workflows/deploy-village-platform-complete.yml /path/to/your/repo/.github/workflows/"
echo ""
echo "5. Commit and push to trigger deployment:"
echo "   git add ."
echo "   git commit -m 'Add Village Platform deployment workflow'"
echo "   git push origin main"
echo ""
echo "6. Monitor the deployment in GitHub Actions tab"
echo ""
echo "📖 For detailed instructions, see: GITHUB_ACTIONS_SETUP.md"
echo ""
echo "🎉 Setup complete! Your Village Platform will be deployed automatically via GitHub Actions."
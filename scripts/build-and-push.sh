#!/bin/bash

# Build and Push Docker Images for GV Playground
# This script builds and pushes both backend and frontend images to ECR

set -e

# Configuration
AWS_REGION="us-east-1"
ECR_REGISTRY="898307279366.dkr.ecr.us-east-1.amazonaws.com"
BACKEND_REPO="gv-playground-backend"
FRONTEND_REPO="gv-playground-frontend"
IMAGE_TAG=${1:-latest}

echo "🚀 Building and pushing Docker images for GV Playground"
echo "📦 Image tag: $IMAGE_TAG"
echo "🏷️  ECR Registry: $ECR_REGISTRY"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' or set AWS credentials."
    exit 1
fi

# Login to ECR
echo "🔐 Logging in to Amazon ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Create ECR repositories if they don't exist
echo "📁 Creating ECR repositories if they don't exist..."
aws ecr describe-repositories --repository-names $BACKEND_REPO --region $AWS_REGION > /dev/null 2>&1 || \
    aws ecr create-repository --repository-name $BACKEND_REPO --region $AWS_REGION

aws ecr describe-repositories --repository-names $FRONTEND_REPO --region $AWS_REGION > /dev/null 2>&1 || \
    aws ecr create-repository --repository-name $FRONTEND_REPO --region $AWS_REGION

# Build and push backend
echo "🔧 Building backend image..."
cd backend
docker build -t $ECR_REGISTRY/$BACKEND_REPO:$IMAGE_TAG .
docker build -t $ECR_REGISTRY/$BACKEND_REPO:latest .
echo "📤 Pushing backend image..."
docker push $ECR_REGISTRY/$BACKEND_REPO:$IMAGE_TAG
docker push $ECR_REGISTRY/$BACKEND_REPO:latest
cd ..

# Build and push frontend
echo "🎨 Building frontend image..."
cd frontend
docker build -t $ECR_REGISTRY/$FRONTEND_REPO:$IMAGE_TAG .
docker build -t $ECR_REGISTRY/$FRONTEND_REPO:latest .
echo "📤 Pushing frontend image..."
docker push $ECR_REGISTRY/$FRONTEND_REPO:$IMAGE_TAG
docker push $ECR_REGISTRY/$FRONTEND_REPO:latest
cd ..

echo "✅ All images built and pushed successfully!"
echo ""
echo "📋 Image URLs:"
echo "   Backend:  $ECR_REGISTRY/$BACKEND_REPO:$IMAGE_TAG"
echo "   Frontend: $ECR_REGISTRY/$FRONTEND_REPO:$IMAGE_TAG"
echo ""
echo "🚀 Ready to deploy to EKS!"
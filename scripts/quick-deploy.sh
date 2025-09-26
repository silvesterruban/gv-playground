#!/bin/bash

# Quick Deploy Script for GV Playground
# This script deploys the applications using existing ECR images

set -e

echo "🚀 Quick Deploy to GV Playground"
echo "================================"

# Configuration
AWS_REGION="us-east-1"
EKS_CLUSTER_NAME="playground-eks-cluster"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please set AWS credentials."
    exit 1
fi

echo "✅ AWS credentials configured"

# Update kubeconfig
echo "🔧 Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER_NAME

# Check if kubectl can connect
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo "❌ Cannot connect to EKS cluster"
    exit 1
fi

echo "✅ Connected to EKS cluster"

# Check if secrets exist
if ! kubectl get secret village-secrets > /dev/null 2>&1; then
    echo "⚠️  Creating secrets..."
    kubectl create secret generic village-secrets \
      --from-literal=database-url="postgresql://gvplayground:gvplayground123@playground-postgres.c69qc6wichwr.us-east-1.rds.amazonaws.com:5432/gvplayground" \
      --from-literal=jwt-secret="gv-playground-jwt-secret-key-2024" \
      --from-literal=aws-access-key-id="YOUR_AWS_ACCESS_KEY_ID" \
      --from-literal=aws-secret-access-key="YOUR_AWS_SECRET_ACCESS_KEY"
fi

echo "✅ Secrets configured"

# Deploy applications
echo "🔧 Deploying backend..."
kubectl apply -f k8s/backend-deployment.yaml

echo "🎨 Deploying frontend..."
kubectl apply -f k8s/frontend-deployment.yaml

echo "🌐 Deploying ingress..."
kubectl apply -f k8s/ingress.yaml

# Wait for deployments
echo "⏳ Waiting for deployments..."
kubectl rollout status deployment/village-backend --timeout=300s
kubectl rollout status deployment/village-frontend --timeout=300s

# Get status
echo ""
echo "📊 Deployment Status:"
echo "===================="
kubectl get pods -l app=village-backend
kubectl get pods -l app=village-frontend

echo ""
echo "🔗 Services:"
echo "============"
kubectl get services

echo ""
echo "🌐 Ingress:"
echo "==========="
kubectl get ingress village-platform-ingress

# Get application URL
INGRESS_URL=$(kubectl get ingress village-platform-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
if [ "$INGRESS_URL" != "pending" ] && [ -n "$INGRESS_URL" ]; then
    echo "📱 Frontend: http://$INGRESS_URL"
    echo "🔧 Backend API: http://$INGRESS_URL/api"
    echo "🏥 Health Check: http://$INGRESS_URL/api/health"
else
    echo "⏳ Ingress is still being provisioned. Check status with:"
    echo "   kubectl get ingress village-platform-ingress"
fi

echo ""
echo "🔍 Useful commands:"
echo "   kubectl get pods"
echo "   kubectl logs -l app=village-backend"
echo "   kubectl logs -l app=village-frontend"
echo "   kubectl describe ingress village-platform-ingress"
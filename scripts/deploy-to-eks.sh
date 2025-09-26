#!/bin/bash

# Deploy Village Platform to EKS
# This script deploys the backend and frontend applications to the EKS cluster

set -e

# Configuration
AWS_REGION="us-east-1"
EKS_CLUSTER_NAME="playground-eks-cluster"
NAMESPACE="default"

echo "🚀 Deploying Village Platform to EKS"
echo "🏗️  Cluster: $EKS_CLUSTER_NAME"
echo "🌍 Region: $AWS_REGION"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' or set AWS credentials."
    exit 1
fi

# Update kubeconfig
echo "🔧 Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER_NAME

# Check if kubectl can connect to the cluster
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo "❌ Cannot connect to EKS cluster. Please check your AWS credentials and cluster status."
    exit 1
fi

echo "✅ Connected to EKS cluster"

# Create secrets if they don't exist
echo "🔐 Setting up secrets..."
if ! kubectl get secret village-secrets > /dev/null 2>&1; then
    echo "⚠️  village-secrets not found. Please create it with:"
    echo "   kubectl create secret generic village-secrets \\"
    echo "     --from-literal=database-url='your-database-url' \\"
    echo "     --from-literal=jwt-secret='your-jwt-secret' \\"
    echo "     --from-literal=aws-access-key-id='your-access-key' \\"
    echo "     --from-literal=aws-secret-access-key='your-secret-key'"
    echo ""
    echo "   Or set the following environment variables and run this script again:"
    echo "   export DATABASE_URL='your-database-url'"
    echo "   export JWT_SECRET='your-jwt-secret'"
    echo "   export AWS_ACCESS_KEY_ID='your-access-key'"
    echo "   export AWS_SECRET_ACCESS_KEY='your-secret-key'"
    exit 1
fi

# Deploy backend
echo "🔧 Deploying backend..."
kubectl apply -f k8s/backend-deployment.yaml

# Deploy frontend
echo "🎨 Deploying frontend..."
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy ingress
echo "🌐 Deploying ingress..."
kubectl apply -f k8s/ingress.yaml

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl rollout status deployment/village-backend --timeout=300s
kubectl rollout status deployment/village-frontend --timeout=300s

# Get deployment status
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
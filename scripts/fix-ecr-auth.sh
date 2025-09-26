#!/bin/bash

# Fix ECR Authentication for EKS Nodes
# This script creates an ECR authentication token and applies it to the EKS cluster

set -e

echo "🔧 Fixing ECR Authentication for EKS Nodes"
echo "=========================================="

# Configuration
AWS_REGION="us-east-1"
EKS_CLUSTER_NAME="playground-eks-cluster"
ECR_REGISTRY="898307279366.dkr.ecr.us-east-1.amazonaws.com"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please set AWS credentials."
    exit 1
fi

echo "✅ AWS credentials configured"

# Update kubeconfig
echo "🔧 Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER_NAME

# Create ECR authentication secret
echo "🔐 Creating ECR authentication secret..."

# Get ECR login token
ECR_TOKEN=$(aws ecr get-login-password --region $AWS_REGION)

# Create docker config secret
kubectl create secret docker-registry ecr-registry-secret \
  --docker-server=$ECR_REGISTRY \
  --docker-username=AWS \
  --docker-password=$ECR_TOKEN \
  --docker-email=admin@village-platform.com \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ ECR authentication secret created"

# Create service account with ECR access
echo "🔧 Creating service account with ECR access..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ecr-access-sa
  namespace: default
imagePullSecrets:
- name: ecr-registry-secret
EOF

echo "✅ Service account created"

# Update deployments to use the service account
echo "🔧 Updating deployments to use ECR authentication..."

# Update backend deployment
kubectl patch deployment village-backend-real -p '{"spec":{"template":{"spec":{"serviceAccountName":"ecr-access-sa"}}}}' || echo "Backend deployment not found, will create new one"

# Update frontend deployment  
kubectl patch deployment village-frontend-real -p '{"spec":{"template":{"spec":{"serviceAccountName":"ecr-access-sa"}}}}' || echo "Frontend deployment not found, will create new one"

echo "✅ Deployments updated with ECR authentication"

# Deploy the real Village Platform
echo "🚀 Deploying real Village Platform..."

kubectl apply -f k8s/village-platform-real.yaml

echo "⏳ Waiting for deployments..."
kubectl rollout status deployment/village-backend-real --timeout=300s
kubectl rollout status deployment/village-frontend-real --timeout=300s

# Get status
echo ""
echo "📊 Deployment Status:"
echo "===================="
kubectl get pods -l app=village-backend-real
kubectl get pods -l app=village-frontend-real

echo ""
echo "🔗 Services:"
echo "============"
kubectl get services

echo ""
echo "🌐 Load Balancer:"
echo "================="
kubectl get service village-platform-real-lb

# Get application URL
INGRESS_URL=$(kubectl get service village-platform-real-lb -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")

echo ""
echo "🎉 ECR Authentication Fixed!"
echo "============================"
if [ "$INGRESS_URL" != "pending" ] && [ -n "$INGRESS_URL" ]; then
    echo "📱 Your Village Platform: http://$INGRESS_URL"
    echo "🔧 Backend API: http://$INGRESS_URL/api"
    echo "🏥 Health Check: http://$INGRESS_URL/health"
else
    echo "⏳ LoadBalancer is still being provisioned. Check status with:"
    echo "   kubectl get service village-platform-real-lb"
fi

echo ""
echo "🔍 Useful commands:"
echo "   kubectl get pods"
echo "   kubectl logs -l app=village-backend-real"
echo "   kubectl logs -l app=village-frontend-real"
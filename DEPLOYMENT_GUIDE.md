# GV Playground Deployment Guide

This guide will help you deploy your existing Village Platform applications from `gradVillageTerraform/village-platform` to the GV Playground infrastructure.

## 🏗️ Infrastructure Overview

Your GV Playground includes:
- ✅ **EKS Cluster**: `playground-eks-cluster` with 2 nodes
- ✅ **ECR Repositories**: For storing Docker images
- ✅ **RDS Database**: PostgreSQL instance
- ✅ **Application Load Balancer**: For routing traffic
- ✅ **VPC & Networking**: Secure network configuration

## 📋 Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Docker** installed and running
3. **kubectl** installed
4. **Node.js 18+** for local development

## 🚀 Quick Start

### Step 1: Copy Your Applications

```bash
# Copy backend application
cp -r /Users/rubansilvester/projects/gradVillageTerraform/village-platform/backend/* /Users/rubansilvester/projects/gv-playground/backend/

# Copy frontend application  
cp -r /Users/rubansilvester/projects/gradVillageTerraform/village-platform/frontend/* /Users/rubansilvester/projects/gv-playground/frontend/
```

### Step 2: Build and Push Docker Images

```bash
cd /Users/rubansilvester/projects/gv-playground
./scripts/build-and-push.sh
```

### Step 3: Deploy to EKS

```bash
# Set up secrets first
kubectl create secret generic village-secrets \
  --from-literal=database-url="postgresql://username:password@playground-postgres.xyz.us-east-1.rds.amazonaws.com:5432/gvplayground" \
  --from-literal=jwt-secret="your-jwt-secret" \
  --from-literal=aws-access-key-id="your-access-key" \
  --from-literal=aws-secret-access-key="your-secret-key"

# Deploy applications
./scripts/deploy-to-eks.sh
```

## 🔧 Manual Steps

### 1. Copy Application Code

```bash
# Backend
rsync -av --exclude=node_modules --exclude=.git \
  /Users/rubansilvester/projects/gradVillageTerraform/village-platform/backend/ \
  /Users/rubansilvester/projects/gv-playground/backend/

# Frontend
rsync -av --exclude=node_modules --exclude=.git \
  /Users/rubansilvester/projects/gradVillageTerraform/village-platform/frontend/ \
  /Users/rubansilvester/projects/gv-playground/frontend/
```

### 2. Build Docker Images

```bash
# Backend
cd backend
docker build -t 898307279366.dkr.ecr.us-east-1.amazonaws.com/gv-playground-backend:latest .

# Frontend
cd frontend
docker build -t 898307279366.dkr.ecr.us-east-1.amazonaws.com/gv-playground-frontend:latest .
```

### 3. Push to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 898307279366.dkr.ecr.us-east-1.amazonaws.com

# Push images
docker push 898307279366.dkr.ecr.us-east-1.amazonaws.com/gv-playground-backend:latest
docker push 898307279366.dkr.ecr.us-east-1.amazonaws.com/gv-playground-frontend:latest
```

### 4. Deploy to Kubernetes

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name playground-eks-cluster

# Deploy applications
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods
kubectl get services
kubectl get ingress
```

## 🔄 CI/CD Pipeline

The GitHub Actions workflows are configured to:

1. **On Push to Main**: Automatically build, test, and deploy
2. **Manual Deploy**: Use the "Manual Deploy to Playground" workflow
3. **Pull Requests**: Run tests and build validation

### GitHub Secrets Required

Set these secrets in your GitHub repository:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
DATABASE_URL
JWT_SECRET
```

## 🏥 Health Checks

- **Backend Health**: `http://your-alb-url/api/health`
- **Frontend**: `http://your-alb-url/`
- **Kubernetes**: `kubectl get pods`

## 🔍 Troubleshooting

### Common Issues

1. **Image Pull Errors**: Check ECR permissions and image tags
2. **Pod Startup Issues**: Check logs with `kubectl logs <pod-name>`
3. **Database Connection**: Verify DATABASE_URL in secrets
4. **Ingress Not Working**: Check ALB controller and target groups

### Useful Commands

```bash
# Check pod status
kubectl get pods -o wide

# View logs
kubectl logs -l app=village-backend
kubectl logs -l app=village-frontend

# Describe resources
kubectl describe pod <pod-name>
kubectl describe ingress village-platform-ingress

# Port forward for local testing
kubectl port-forward service/village-backend-service 3001:3001
kubectl port-forward service/village-frontend-service 8080:80
```

## 📊 Monitoring

- **CloudWatch**: Application logs and metrics
- **Kubernetes Dashboard**: `kubectl proxy` then visit `http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/`

## 🔐 Security

- All images run as non-root users
- Secrets are stored in Kubernetes secrets
- Network policies can be applied for additional security
- ALB provides SSL termination

## 🎯 Next Steps

1. Set up monitoring and alerting
2. Configure SSL certificates
3. Implement blue-green deployments
4. Add database migrations
5. Set up log aggregation

---

**Need Help?** Check the logs and use the troubleshooting commands above. The infrastructure is fully operational and ready for your applications!
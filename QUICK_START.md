# 🚀 GV Playground - Quick Start Guide

## ⚡ Deploy in 3 Steps

### Step 1: Set Fresh AWS Credentials
```bash
export AWS_ACCESS_KEY_ID="your-fresh-key"
export AWS_SECRET_ACCESS_KEY="your-fresh-secret"
export AWS_SESSION_TOKEN="your-fresh-token"
```

### Step 2: Choose Deployment Method

#### Option A: GitHub Actions (Recommended)
1. Create GitHub repo
2. Push code: `git push origin main`
3. Set secrets in GitHub
4. Watch automated deployment

#### Option B: Quick Local Deploy
```bash
./scripts/quick-deploy.sh
```

#### Option C: Full Build & Deploy
```bash
./scripts/build-and-push.sh
./scripts/deploy-to-eks.sh
```

### Step 3: Access Your Application
- **Frontend**: `http://your-alb-url/`
- **Backend**: `http://your-alb-url/api`
- **Health**: `http://your-alb-url/api/health`

## 🔧 Quick Commands

```bash
# Check status
kubectl get pods
kubectl get services
kubectl get ingress

# View logs
kubectl logs -l app=village-backend
kubectl logs -l app=village-frontend

# Check cluster
aws eks describe-cluster --name playground-eks-cluster
```

## 📊 Infrastructure URLs
- **EKS Cluster**: `playground-eks-cluster`
- **Database**: `playground-postgres.c69qc6wichwr.us-east-1.rds.amazonaws.com`
- **ECR Registry**: `898307279366.dkr.ecr.us-east-1.amazonaws.com`

## 🎯 What You Get
- ✅ **2 Backend Pods**: Village Platform API
- ✅ **2 Frontend Pods**: React/Expo App
- ✅ **PostgreSQL Database**: With Village Platform schema
- ✅ **Load Balancer**: Auto-scaling traffic
- ✅ **CI/CD Pipelines**: Automated deployment
- ✅ **Monitoring**: Health checks & logging

---

**Ready to deploy!** 🎉
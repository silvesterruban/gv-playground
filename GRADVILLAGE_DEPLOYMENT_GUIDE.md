# GradVillage Application Deployment Guide

This guide will help you deploy the GradVillage application to AWS using GitHub Actions from the GitHub repository.

## 🚀 Quick Start

### Option 1: Automated Deployment Script
```bash
./deploy-gradvillage.sh
```

### Option 2: Manual Step-by-Step Process
Follow the detailed steps below.

## 📋 Prerequisites

- ✅ AWS credentials configured locally
- ✅ EKS cluster already deployed (gv-playground-eks-cluster)
- ✅ ECR repositories created
- ✅ GitHub Actions workflows configured

## 🔧 Step-by-Step Deployment Process

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Fill in the repository details:
   - **Repository name**: `gv-playground`
   - **Description**: `GradVillage - Full-stack application with microservices architecture`
   - **Visibility**: Public or Private (your choice)
   - **Initialize repository**: ❌ Don't check any of these boxes

5. Click "Create repository"

### Step 2: Push Code to GitHub

```bash
# Push the current branch to GitHub
git push -u origin feature/terraform-environment-agnostic

# Or push to main branch for automatic deployment
git checkout main
git merge feature/terraform-environment-agnostic
git push origin main
```

### Step 3: Configure GitHub Secrets

1. Go to your repository: `https://github.com/silvesterruban/gv-playground`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

#### Add Required Secrets:

**Secret 1: AWS_ACCESS_KEY_ID**
- **Name**: `AWS_ACCESS_KEY_ID`
- **Secret**: `YOUR_AWS_ACCESS_KEY_ID`

**Secret 2: AWS_SECRET_ACCESS_KEY**
- **Name**: `AWS_SECRET_ACCESS_KEY`
- **Secret**: `YOUR_AWS_SECRET_ACCESS_KEY`

### Step 4: Trigger GitHub Actions Deployment

#### Automatic Deployment (Recommended)
- Push to `main` or `develop` branches
- Workflows will automatically trigger

#### Manual Deployment
1. Go to **Actions** tab in your repository
2. Select **"Deploy GV Playground"** workflow
3. Click **"Run workflow"**
4. Select environment: `gv-playground`
5. Click **"Run workflow"**

## 🔍 Deployment Workflows

### 1. Terraform Environment-Agnostic Deployment
- **Purpose**: Deploy/update infrastructure
- **Triggers**: Push to main branches, PRs, manual dispatch
- **Duration**: ~5-10 minutes

### 2. Build and Push to ECR
- **Purpose**: Build and push Docker images
- **Triggers**: Changes to backend/frontend code
- **Duration**: ~3-5 minutes

### 3. Deploy GV Playground (Main Workflow)
- **Purpose**: Complete end-to-end deployment
- **Triggers**: Push to main branches, manual dispatch
- **Duration**: ~10-15 minutes

## 📊 Monitoring Deployment

### GitHub Actions Dashboard
- **URL**: `https://github.com/silvesterruban/gv-playground/actions`
- **Monitor**: Real-time workflow execution
- **Logs**: Detailed deployment logs

### AWS Resources
- **EKS Cluster**: `gv-playground-eks-cluster`
- **Application Load Balancer**: `gv-playground-alb-727046293.us-east-1.elb.amazonaws.com`
- **ECR Repositories**: 
  - Backend: `898307279366.dkr.ecr.us-east-1.amazonaws.com/gv-playground-backend`
  - Frontend: `898307279366.dkr.ecr.us-east-1.amazonaws.com/gv-playground-frontend`

### Kubernetes Resources
```bash
# Check cluster status
kubectl get nodes

# Check application pods
kubectl get pods

# Check services
kubectl get services

# Check deployments
kubectl get deployments
```

## 🎯 Expected Deployment Results

### Infrastructure
- ✅ EKS cluster with 2 nodes running
- ✅ Application Load Balancer active
- ✅ RDS PostgreSQL database
- ✅ ECR repositories with images

### Applications
- ✅ Backend API running on EKS
- ✅ Frontend application running on EKS
- ✅ Simple backend (mock) for testing
- ✅ All services accessible via LoadBalancer

### Health Checks
- ✅ Backend API health endpoint
- ✅ Frontend application accessibility
- ✅ Database connectivity
- ✅ LoadBalancer external access

## 🔗 Application URLs

### Production URLs
- **Main Application**: http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com
- **Backend API**: http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com/api
- **Frontend**: http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com

### Testing Endpoints
- **Health Check**: http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com/api/health
- **Student Registration**: http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com/api/auth/register/student
- **Student Login**: http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com/api/auth/login/student

## 🧪 Testing the Deployment

### 1. Health Check
```bash
curl http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com/api/health
```

### 2. Student Registration
```bash
curl -X POST http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com/api/auth/register/student \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student","email":"test@gradvillage.com","password":"testpass123"}'
```

### 3. Student Login
```bash
curl -X POST http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com/api/auth/login/student \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gradvillage.com","password":"testpass123"}'
```

### 4. Frontend Access
Open in browser: http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com

## 🔧 Troubleshooting

### Common Issues

1. **"Repository not found"**
   - Verify the GitHub repository exists
   - Check repository URL and permissions

2. **"AWS credentials not found"**
   - Verify GitHub secrets are configured correctly
   - Check secret names match exactly (case-sensitive)

3. **"Workflow not triggering"**
   - Check if the workflow file is in `.github/workflows/`
   - Verify the trigger conditions are met

4. **"Deployment failed"**
   - Check GitHub Actions logs for detailed error information
   - Verify AWS resource limits and permissions
   - Check EKS cluster status

### Debugging Commands

```bash
# Check EKS cluster status
aws eks describe-cluster --name gv-playground-eks-cluster --region us-east-1

# Check EKS nodes
kubectl get nodes

# Check application pods
kubectl get pods -o wide

# Check services
kubectl get services

# Check pod logs
kubectl logs -l app=village-backend-real
kubectl logs -l app=village-frontend-real

# Check LoadBalancer status
kubectl describe service village-frontend-lb
```

## 📈 Post-Deployment

### 1. Verify Application Functionality
- Test student registration and login
- Test donor registration and login
- Test admin functionality
- Verify frontend-backend integration

### 2. Monitor Application Health
- Check pod status regularly
- Monitor resource usage
- Review application logs
- Test LoadBalancer accessibility

### 3. Scale if Needed
- Increase EKS node count if needed
- Scale application replicas
- Monitor performance metrics

## 🎉 Success Criteria

The deployment is successful when:

- ✅ All GitHub Actions workflows complete successfully
- ✅ EKS cluster has 2 nodes running
- ✅ All application pods are in "Running" state
- ✅ LoadBalancer is accessible externally
- ✅ Backend API responds to health checks
- ✅ Frontend application loads in browser
- ✅ Student/donor registration and login work
- ✅ Database connectivity is established

## 🔗 Useful Links

- **GitHub Repository**: https://github.com/silvesterruban/gv-playground
- **GitHub Actions**: https://github.com/silvesterruban/gv-playground/actions
- **AWS EKS Console**: https://console.aws.amazon.com/eks/home?region=us-east-1
- **AWS ECR Console**: https://console.aws.amazon.com/ecr/repositories?region=us-east-1
- **Application URL**: http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com

## 🆘 Support

If you encounter issues:

1. Check the GitHub Actions workflow logs
2. Review the troubleshooting section above
3. Verify AWS credentials and permissions
4. Check EKS cluster and pod status
5. Review the comprehensive setup guide in `GITHUB_SECRETS_SETUP.md`
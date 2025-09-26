# GitHub Actions Setup for Village Platform Deployment

## Overview
This guide will help you set up GitHub Actions to automatically build and deploy your Village Platform to the GV Playground EKS cluster.

## Prerequisites
- GitHub repository with the Village Platform code
- AWS credentials with appropriate permissions
- EKS cluster already deployed (playground-eks-cluster)

## Step 1: Configure GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add these secrets:

### Required Secrets:
1. **AWS_ACCESS_KEY_ID**: Your AWS access key
2. **AWS_SECRET_ACCESS_KEY**: Your AWS secret key  
3. **AWS_SESSION_TOKEN**: Your AWS session token (if using temporary credentials)

### How to get AWS credentials:
```bash
# Option 1: Use AWS CLI to get temporary credentials
aws sts get-session-token --duration-seconds 3600

# Option 2: Use your existing credentials from the terminal
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_SESSION_TOKEN
```

## Step 2: Repository Structure

Ensure your repository has this structure:
```
your-repo/
├── .github/
│   └── workflows/
│       └── deploy-village-platform-complete.yml
├── village-platform/
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   └── frontend/
│       ├── Dockerfile
│       ├── package.json
│       └── src/
└── gv-playground/
    └── k8s/
        └── village-platform-secrets.yaml
```

## Step 3: Create Kubernetes Secrets

First, create the required Kubernetes secrets in your EKS cluster:

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name playground-eks-cluster

# Create secrets (replace with your actual values)
kubectl create secret generic village-platform-secrets \
  --from-literal=database-url="postgresql://username:password@your-rds-endpoint:5432/village_db" \
  --from-literal=jwt-secret="your-jwt-secret-key"
```

## Step 4: Trigger the Workflow

### Option A: Push to main branch
```bash
git add .
git commit -m "Deploy Village Platform via GitHub Actions"
git push origin main
```

### Option B: Manual trigger
1. Go to your GitHub repository
2. Click on "Actions" tab
3. Select "Deploy Village Platform to GV Playground"
4. Click "Run workflow"

## Step 5: Monitor the Deployment

1. Go to the Actions tab in your GitHub repository
2. Click on the running workflow
3. Monitor each step:
   - ✅ Checkout code
   - ✅ Configure AWS credentials
   - ✅ Login to Amazon ECR
   - ✅ Build and push backend image
   - ✅ Build and push frontend image
   - ✅ Update kubeconfig
   - ✅ Deploy applications
   - ✅ Wait for deployment to be ready

## Step 6: Access Your Application

After successful deployment, the workflow will output the LoadBalancer URL. You can also get it manually:

```bash
kubectl get service village-platform-lb
```

The Village Platform will be accessible at the LoadBalancer URL.

## Troubleshooting

### Common Issues:

1. **AWS Credentials Expired**
   - Update the secrets in GitHub with fresh credentials
   - Re-run the workflow

2. **ECR Authentication Failed**
   - Ensure the ECR repositories exist
   - Check AWS permissions for ECR access

3. **Kubernetes Deployment Failed**
   - Check if the EKS cluster is accessible
   - Verify the kubeconfig is updated correctly

4. **Image Pull Back Off**
   - The workflow handles ECR authentication automatically
   - Check if the images were built and pushed successfully

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

## Benefits of GitHub Actions Approach

1. **No Local Docker Required**: Builds happen in GitHub's runners
2. **Automatic ECR Authentication**: Handled by AWS actions
3. **Consistent Environment**: Same build environment every time
4. **Easy Rollbacks**: Can easily revert to previous versions
5. **Audit Trail**: Full history of deployments in GitHub

## Next Steps

After successful deployment:
1. Set up monitoring and logging
2. Configure custom domain (optional)
3. Set up automated testing in the pipeline
4. Configure blue-green deployments for zero downtime

## Support

If you encounter issues:
1. Check the GitHub Actions logs
2. Verify AWS credentials and permissions
3. Ensure EKS cluster is running and accessible
4. Check Kubernetes resources and logs
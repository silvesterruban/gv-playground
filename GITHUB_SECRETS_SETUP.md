# GitHub Secrets Configuration Guide

This guide will help you configure the necessary secrets for the GV Playground GitHub Actions workflows.

## 🔐 Required Secrets

The following secrets must be configured in your GitHub repository for the workflows to function properly:

### 1. AWS_ACCESS_KEY_ID
- **Description**: AWS Access Key ID for deployment operations
- **Usage**: Used by GitHub Actions to authenticate with AWS services
- **Required for**: All workflows (Terraform, ECR, EKS deployment)

### 2. AWS_SECRET_ACCESS_KEY
- **Description**: AWS Secret Access Key for deployment operations
- **Usage**: Used by GitHub Actions to authenticate with AWS services
- **Required for**: All workflows (Terraform, ECR, EKS deployment)

## 🚀 Setup Instructions

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Fill in the repository details:
   - **Repository name**: `gv-playground`
   - **Description**: `GV Playground - Full-stack application with microservices architecture`
   - **Visibility**: Public or Private (your choice)
   - **Initialize repository**: ❌ Don't check any of these boxes (we already have files)

5. Click "Create repository"

### Step 2: Configure Remote Origin

Run the setup script:
```bash
./setup-github-repo.sh
```

Or manually configure:
```bash
git remote add origin https://github.com/YOUR_USERNAME/gv-playground.git
git push -u origin feature/terraform-environment-agnostic
```

### Step 3: Configure GitHub Secrets

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

#### Add AWS_ACCESS_KEY_ID:
- **Name**: `AWS_ACCESS_KEY_ID`
- **Secret**: Your AWS Access Key ID (e.g., `YOUR_AWS_ACCESS_KEY_ID`)
- Click **Add secret**

#### Add AWS_SECRET_ACCESS_KEY:
- **Name**: `AWS_SECRET_ACCESS_KEY`
- **Secret**: Your AWS Secret Access Key (e.g., `YOUR_AWS_SECRET_ACCESS_KEY`)
- Click **Add secret**

### Step 4: Verify Secrets Configuration

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see both secrets listed:
   - ✅ AWS_ACCESS_KEY_ID
   - ✅ AWS_SECRET_ACCESS_KEY

## 🔧 AWS Credentials Setup

### Option 1: Use Current AWS Credentials

If you have AWS credentials that are working locally, you can use those:

```bash
# Get your current AWS credentials
echo "AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID"
echo "AWS_SECRET_ACCESS_KEY: $AWS_SECRET_ACCESS_KEY"
```

### Option 2: Create New IAM User (Recommended)

For better security, create a dedicated IAM user for GitHub Actions:

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Create user**
3. User name: `github-actions-gv-playground`
4. Attach policies:
   - `AmazonEKSClusterPolicy`
   - `AmazonEKSWorkerNodePolicy`
   - `AmazonEKS_CNI_Policy`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonVPCFullAccess`
   - `AmazonS3FullAccess`
   - `IAMFullAccess`

5. Create access key and use those credentials

## 🚀 Triggering Workflows

### Automatic Triggers

Workflows will automatically trigger on:
- Push to `main` or `develop` branches
- Pull requests affecting relevant files
- Changes to infrastructure, backend, or frontend code

### Manual Triggers

You can manually trigger workflows:

1. Go to **Actions** tab in your repository
2. Select the workflow you want to run:
   - **Terraform Environment-Agnostic Deployment**
   - **Build and Push to ECR**
   - **Deploy GV Playground**
3. Click **Run workflow**
4. Select the environment and options
5. Click **Run workflow**

## 🔍 Troubleshooting

### Common Issues

1. **"AWS credentials not found"**
   - Verify secrets are configured correctly
   - Check secret names match exactly (case-sensitive)
   - Ensure AWS credentials have proper permissions

2. **"Repository not found"**
   - Verify the repository URL is correct
   - Check if the repository exists on GitHub
   - Ensure you have push access to the repository

3. **"Workflow not triggering"**
   - Check if the workflow file is in the correct location (`.github/workflows/`)
   - Verify the workflow syntax is correct
   - Check if the trigger conditions are met

### Debugging Commands

```bash
# Check remote configuration
git remote -v

# Check current branch
git branch --show-current

# Check git status
git status

# Push to GitHub
git push -u origin feature/terraform-environment-agnostic
```

## 📋 Workflow Overview

### 1. Terraform Environment-Agnostic Deployment
- **Purpose**: Deploy infrastructure using Terraform
- **Triggers**: Push to main branches, PRs, manual dispatch
- **Environments**: gv-playground, dev, staging, prod

### 2. Build and Push to ECR
- **Purpose**: Build and push Docker images to ECR
- **Triggers**: Changes to backend/frontend code
- **Features**: Multi-architecture builds, security scanning

### 3. Deploy GV Playground
- **Purpose**: Complete end-to-end deployment
- **Triggers**: Push to main branches, manual dispatch
- **Features**: Infrastructure + application deployment

## 🎯 Next Steps

After configuring secrets:

1. **Push your code**: `git push -u origin feature/terraform-environment-agnostic`
2. **Trigger deployment**: Go to Actions tab and run "Deploy GV Playground"
3. **Monitor progress**: Watch the workflow execution in real-time
4. **Verify deployment**: Check the deployment summary and health checks

## 🔗 Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Amazon EKS Documentation](https://docs.aws.amazon.com/eks/)

## 🆘 Support

If you encounter issues:

1. Check the workflow logs in GitHub Actions
2. Verify AWS credentials and permissions
3. Review the troubleshooting section above
4. Check AWS CloudWatch logs for detailed error information
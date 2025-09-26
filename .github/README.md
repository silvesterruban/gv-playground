# GV Playground GitHub Actions

This directory contains GitHub Actions workflows for the GV Playground project, providing comprehensive CI/CD capabilities for infrastructure and application deployment.

## 🚀 Workflows Overview

### 1. Terraform Environment-Agnostic Deployment (`terraform-environment-agnostic.yml`)

**Purpose**: Deploy infrastructure using environment-agnostic Terraform configuration.

**Triggers**:
- Push to `main`, `develop`, or `feature/terraform-environment-agnostic` branches
- Pull requests affecting infrastructure files
- Manual workflow dispatch

**Features**:
- Multi-environment support (gv-playground, dev, staging, prod)
- Terraform plan, apply, and destroy operations
- Security scanning with Trivy
- Infrastructure validation and verification
- EKS cluster connectivity testing

**Manual Deployment**:
```bash
# Deploy to gv-playground environment
gh workflow run terraform-environment-agnostic.yml -f environment=gv-playground -f action=apply

# Plan deployment to staging
gh workflow run terraform-environment-agnostic.yml -f environment=staging -f action=plan
```

### 2. Build and Push to ECR (`build-and-push-ecr.yml`)

**Purpose**: Build and push Docker images to Amazon ECR.

**Triggers**:
- Push to main branches affecting backend/frontend code
- Pull requests affecting application code
- Manual workflow dispatch

**Features**:
- Multi-architecture builds (linux/amd64)
- Docker layer caching for faster builds
- Automatic image tagging with environment and commit SHA
- Container security scanning
- EKS deployment integration

**Manual Build**:
```bash
# Build for gv-playground environment
gh workflow run build-and-push-ecr.yml -f environment=gv-playground
```

### 3. Deploy GV Playground (`deploy-gv-playground.yml`)

**Purpose**: Complete end-to-end deployment of infrastructure and applications.

**Triggers**:
- Push to `main` or `develop` branches
- Manual workflow dispatch

**Features**:
- Infrastructure deployment with Terraform
- Docker image building and pushing
- Kubernetes application deployment
- Health checks and verification
- Comprehensive deployment reporting

**Manual Deployment**:
```bash
# Full deployment to gv-playground
gh workflow run deploy-gv-playground.yml -f environment=gv-playground

# Skip infrastructure, only deploy applications
gh workflow run deploy-gv-playground.yml -f environment=gv-playground -f skip_infrastructure=true
```

## 🔧 Environment Configuration

### Required Secrets

The following secrets must be configured in your GitHub repository:

```bash
AWS_ACCESS_KEY_ID          # AWS access key for deployment
AWS_SECRET_ACCESS_KEY      # AWS secret key for deployment
```

### Environment-Specific Settings

Each environment has its own configuration:

- **gv-playground**: Development environment with full features
- **dev**: Basic development environment
- **staging**: Pre-production testing environment
- **prod**: Production environment with enhanced security

## 📋 Deployment Process

### 1. Infrastructure Deployment

1. **Terraform Init**: Initialize Terraform with environment-specific backend
2. **Terraform Plan**: Generate execution plan
3. **Terraform Apply**: Deploy infrastructure resources
4. **Verification**: Verify EKS cluster and other resources

### 2. Application Deployment

1. **Docker Build**: Build backend and frontend images
2. **ECR Push**: Push images to Amazon ECR
3. **Kubernetes Deploy**: Deploy applications to EKS
4. **Health Check**: Verify application health and accessibility

### 3. Post-Deployment

1. **Service Verification**: Check all services are running
2. **Load Balancer Test**: Verify external accessibility
3. **Database Connectivity**: Test database connections
4. **Monitoring Setup**: Ensure monitoring is active

## 🔍 Monitoring and Troubleshooting

### Health Checks

The workflows include comprehensive health checks:

- **EKS Cluster**: Node status and connectivity
- **Applications**: Pod health and service availability
- **Load Balancer**: External accessibility
- **Database**: Connection and query testing

### Common Issues

1. **AWS Credentials Expired**: Re-export credentials and retry
2. **EKS Node Group Issues**: Check subnet configuration and IAM roles
3. **Docker Build Failures**: Verify Dockerfile and dependencies
4. **Kubernetes Deployment Issues**: Check resource limits and image availability

### Debugging Commands

```bash
# Check EKS cluster status
kubectl get nodes
kubectl get pods --all-namespaces

# Check application logs
kubectl logs -l app=village-backend-real
kubectl logs -l app=village-frontend-real

# Check service status
kubectl get services
kubectl describe service village-frontend-lb
```

## 🚀 Quick Start

### 1. First-Time Setup

1. Configure AWS credentials in GitHub Secrets
2. Ensure ECR repositories exist
3. Run infrastructure deployment:
   ```bash
   gh workflow run terraform-environment-agnostic.yml -f environment=gv-playground -f action=apply
   ```

### 2. Application Deployment

1. Build and push images:
   ```bash
   gh workflow run build-and-push-ecr.yml -f environment=gv-playground
   ```

2. Deploy applications:
   ```bash
   gh workflow run deploy-gv-playground.yml -f environment=gv-playground
   ```

### 3. Verification

1. Check deployment status in GitHub Actions
2. Verify EKS cluster: `kubectl get nodes`
3. Test application: `curl http://gv-playground-alb-727046293.us-east-1.elb.amazonaws.com`

## 📊 Workflow Status

Monitor workflow execution in the GitHub Actions tab:

- **Green**: Successful deployment
- **Yellow**: In progress
- **Red**: Failed deployment (check logs for details)

## 🔐 Security Features

- **Container Scanning**: Trivy vulnerability scanning
- **Infrastructure Scanning**: Terraform security checks
- **Secret Management**: Secure handling of AWS credentials
- **Environment Isolation**: Separate environments for different stages

## 📚 Additional Resources

- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)

## 🆘 Support

For issues or questions:

1. Check the workflow logs in GitHub Actions
2. Review the troubleshooting section above
3. Check AWS CloudWatch logs for detailed error information
4. Verify all required secrets are configured correctly
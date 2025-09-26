# 🚀 GV Playground Deployment Guide

This guide covers deploying the GV Playground to AWS using the complete CI/CD pipeline.

## 📋 Prerequisites

### AWS Account Setup
- AWS Account with billing enabled
- AWS CLI configured with appropriate permissions
- Domain name (optional but recommended)
- SSL certificate (for production)

### Required AWS Services
- **EKS** - Kubernetes cluster
- **RDS** - PostgreSQL database
- **ECR** - Container registry
- **ALB** - Application load balancer
- **VPC** - Network infrastructure
- **CloudWatch** - Monitoring and logging

## 🏗️ Infrastructure Deployment

### 1. Setup Terraform State
```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://gv-playground-terraform-state
aws s3api put-bucket-versioning --bucket gv-playground-terraform-state --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket gv-playground-terraform-state --server-side-encryption-configuration '{
  "Rules": [
    {
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }
  ]
}'
```

### 2. Configure Terraform Variables
```bash
cd infrastructure
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your configuration
nano terraform.tfvars
```

### 3. Deploy Infrastructure
```bash
# Initialize Terraform
terraform init

# Plan the deployment
terraform plan -var="environment=dev" -var="rds_password=your-secure-password"

# Apply the infrastructure
terraform apply -var="environment=dev" -var="rds_password=your-secure-password"
```

### 4. Configure kubectl
```bash
# Get EKS cluster info
aws eks update-kubeconfig --region us-east-1 --name dev-eks-cluster

# Verify connection
kubectl cluster-info
```

## 🐳 Container Deployment

### 1. Build and Push Images
```bash
# Configure AWS credentials
aws configure

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
cd backend
docker build -t 123456789012.dkr.ecr.us-east-1.amazonaws.com/gv-playground-backend:latest .
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/gv-playground-backend:latest

# Build and push frontend
cd ../frontend
docker build -t 123456789012.dkr.ecr.us-east-1.amazonaws.com/gv-playground-frontend:latest .
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/gv-playground-frontend:latest
```

### 2. Deploy Applications
```bash
# Create namespace
kubectl create namespace gv-playground

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml
```

### 3. Verify Deployment
```bash
# Check pod status
kubectl get pods -n gv-playground

# Check services
kubectl get services -n gv-playground

# Check ingress
kubectl get ingress -n gv-playground

# View logs
kubectl logs -f deployment/backend -n gv-playground
```

## 🔄 CI/CD Pipeline Deployment

### 1. GitHub Repository Setup
```bash
# Create GitHub repository
gh repo create gv-playground --public

# Add remote origin
git remote add origin https://github.com/yourusername/gv-playground.git

# Push code
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2. Configure GitHub Secrets
Add the following secrets to your GitHub repository:

```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_ACCOUNT_ID=123456789012
RDS_PASSWORD=your-secure-password
DATABASE_URL=postgresql://gvplayground:password@rds-endpoint:5432/gvplayground
JWT_SECRET=your-jwt-secret
DOMAIN_NAME=your-domain.com
```

### 3. Branch Protection Rules
1. Go to repository Settings → Branches
2. Add rule for `main` branch:
   - Require pull request reviews
   - Require status checks to pass
   - Require branches to be up to date
   - Restrict pushes to matching branches

### 4. Environment Protection
1. Go to repository Settings → Environments
2. Create `production` environment
3. Add protection rules:
   - Required reviewers
   - Wait timer
   - Deployment branches

## 🚀 Deployment Workflows

### Development Workflow
1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make Changes and Test**
   ```bash
   # Make your changes
   npm test
   docker-compose up --build
   ```

3. **Create Pull Request**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin feature/new-feature
   ```

4. **Merge to Develop**
   - Create PR to `develop` branch
   - GitHub Actions runs CI checks
   - Review and merge

### Staging Deployment
1. **Automatic Deployment**
   - Merge to `develop` triggers staging deployment
   - GitHub Actions builds and deploys to staging
   - Integration tests run automatically

2. **Manual Testing**
   - Test application in staging environment
   - Verify all features work correctly
   - Check performance and monitoring

### Production Deployment
1. **Create Production PR**
   - Create PR from `develop` to `main`
   - Include staging test results
   - Get required approvals

2. **Deploy to Production**
   - Merge to `main` triggers production deployment
   - Manual confirmation required
   - Database migrations run automatically
   - Health checks performed

## 📊 Monitoring and Observability

### 1. CloudWatch Dashboard
```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard --dashboard-name "GV-Playground-Production" --dashboard-body file://monitoring/cloudwatch-dashboard.json
```

### 2. Prometheus and Grafana
```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring/

# Access Grafana
kubectl port-forward service/grafana 3000:3000 -n gv-playground
# Open http://localhost:3000 (admin/admin123)
```

### 3. Log Aggregation
```bash
# View application logs
kubectl logs -f deployment/backend -n gv-playground

# View CloudWatch logs
aws logs describe-log-groups
aws logs tail /aws/eks/gv-playground-eks-cluster/cluster --follow
```

## 🔒 Security Configuration

### 1. SSL/TLS Setup
```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names "*.your-domain.com" \
  --validation-method DNS

# Update ingress with certificate ARN
kubectl patch ingress gv-playground-ingress -n gv-playground -p '{
  "metadata": {
    "annotations": {
      "alb.ingress.kubernetes.io/certificate-arn": "arn:aws:acm:us-east-1:123456789012:certificate/your-cert-id"
    }
  }
}'
```

### 2. Secrets Management
```bash
# Create Kubernetes secrets
kubectl create secret generic backend-secrets \
  --from-literal=DATABASE_URL="postgresql://user:pass@host:5432/db" \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  -n gv-playground
```

### 3. Network Policies
```bash
# Apply network policies
kubectl apply -f k8s/network-policies.yaml
```

## 🚨 Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n gv-playground

# Check events
kubectl get events -n gv-playground

# Check logs
kubectl logs <pod-name> -n gv-playground
```

#### Database Connection Issues
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier gv-playground-postgres

# Test connection
kubectl run test-pod --image=postgres:15 --rm -it -- psql -h <rds-endpoint> -U gvplayground -d gvplayground
```

#### Load Balancer Issues
```bash
# Check ALB status
aws elbv2 describe-load-balancers --names gv-playground-alb

# Check target health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

#### CI/CD Pipeline Issues
```bash
# Check GitHub Actions logs
# Go to repository → Actions tab → Select workflow run

# Check ECR images
aws ecr describe-images --repository-name gv-playground-backend
```

### Performance Optimization

#### Auto-scaling Configuration
```bash
# Enable cluster autoscaler
kubectl apply -f k8s/cluster-autoscaler.yaml

# Configure HPA
kubectl apply -f k8s/hpa.yaml
```

#### Resource Optimization
```bash
# Check resource usage
kubectl top pods -n gv-playground
kubectl top nodes

# Adjust resource limits
kubectl edit deployment backend -n gv-playground
```

## 📈 Scaling and Optimization

### Horizontal Scaling
```bash
# Scale backend deployment
kubectl scale deployment backend --replicas=5 -n gv-playground

# Scale frontend deployment
kubectl scale deployment frontend --replicas=3 -n gv-playground
```

### Database Scaling
```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier gv-playground-postgres-read \
  --source-db-instance-identifier gv-playground-postgres
```

### Cost Optimization
```bash
# Use Spot instances for non-critical workloads
kubectl apply -f k8s/spot-instances.yaml

# Enable cluster autoscaler
kubectl apply -f k8s/cluster-autoscaler.yaml
```

## 🔄 Backup and Recovery

### Database Backup
```bash
# Create manual backup
aws rds create-db-snapshot \
  --db-instance-identifier gv-playground-postgres \
  --db-snapshot-identifier gv-playground-backup-$(date +%Y%m%d)
```

### Application Backup
```bash
# Backup Kubernetes resources
kubectl get all -n gv-playground -o yaml > gv-playground-backup.yaml

# Backup Terraform state
aws s3 cp s3://gv-playground-terraform-state/eks-cluster/dev/terraform.tfstate ./terraform-backup.tfstate
```

## 📚 Next Steps

1. **Monitor Application Performance**
   - Set up alerting for critical metrics
   - Monitor cost and optimize resources
   - Regular security audits

2. **Implement Advanced Features**
   - Service mesh (Istio)
   - Advanced monitoring (Jaeger, Zipkin)
   - Multi-region deployment

3. **Security Hardening**
   - Network policies
   - Pod security policies
   - Regular security scans

4. **Disaster Recovery**
   - Multi-region backup
   - Automated failover
   - Recovery testing

---

**Your GV Playground is now deployed and ready for learning! 🎉**

This deployment provides a production-ready environment for practicing modern DevOps practices with real AWS infrastructure.
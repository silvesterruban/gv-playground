# Village Platform Deployment Solutions

## Current Status
Your GV Playground infrastructure is 100% deployed and ready. The Village Platform applications are experiencing ECR authentication issues when trying to pull images from the private ECR registry.

## Solution Options

### Option 1: GitHub Actions (Recommended) 🚀

**Benefits:**
- No local Docker required
- Automatic ECR authentication
- Consistent build environment
- Full CI/CD pipeline

**Steps:**
1. **Set up GitHub Repository Secrets:**
   ```
   Go to: GitHub Repo → Settings → Secrets and variables → Actions
   Add these secrets:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY  
   - AWS_SESSION_TOKEN
   ```

2. **Copy the workflow file:**
   ```bash
   cp .github/workflows/deploy-village-platform-complete.yml /path/to/your/repo/.github/workflows/
   ```

3. **Trigger deployment:**
   ```bash
   git add .
   git commit -m "Deploy Village Platform via GitHub Actions"
   git push origin main
   ```

### Option 2: Fix ECR Authentication Locally 🔧

**When you have fresh AWS credentials:**

1. **Update kubeconfig:**
   ```bash
   aws eks update-kubeconfig --region us-east-1 --name playground-eks-cluster
   ```

2. **Run the ECR fix script:**
   ```bash
   ./scripts/fix-ecr-auth.sh
   ```

3. **Deploy the applications:**
   ```bash
   kubectl apply -f k8s/village-platform-real.yaml
   ```

### Option 3: Use Public Images (Quick Test) ⚡

**For immediate testing:**

1. **Deploy with public images:**
   ```bash
   kubectl apply -f k8s/working-deployment.yaml
   ```

2. **Get the LoadBalancer URL:**
   ```bash
   kubectl get service village-frontend-working-service
   ```

## Current Infrastructure Status ✅

- ✅ **EKS Cluster**: playground-eks-cluster (Running)
- ✅ **RDS Database**: playground-postgres (Running)
- ✅ **ECR Repositories**: village-backend, village-frontend (Created)
- ✅ **VPC & Networking**: Complete
- ✅ **Security Groups**: Configured
- ✅ **IAM Roles**: Set up with proper permissions

## Access URLs

### LoadBalancer Services:
- **Test Application**: `http://a59f9adbe04e349849f0332f10b75242-10faf1a4af53e9b1.elb.us-east-1.amazonaws.com`
- **Village Platform**: Will be available after successful deployment

### EKS Cluster:
```bash
# Get cluster info
aws eks describe-cluster --name playground-eks-cluster --region us-east-1

# Access cluster
kubectl get nodes
kubectl get pods --all-namespaces
```

## Troubleshooting

### ECR Authentication Issues:
```bash
# Check ECR repositories
aws ecr describe-repositories --region us-east-1

# Check EKS node group IAM role
aws iam get-role --role-name playground-eks-node-group-role
```

### Pod Status Issues:
```bash
# Check pod details
kubectl describe pod <pod-name>

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp

# Check logs
kubectl logs <pod-name>
```

## Next Steps

1. **Choose your deployment method** (GitHub Actions recommended)
2. **Set up monitoring** with Prometheus/Grafana
3. **Configure custom domain** (optional)
4. **Set up automated backups**
5. **Implement blue-green deployments**

## Support Commands

```bash
# Check all resources
kubectl get all

# Check services
kubectl get services

# Check ingress
kubectl get ingress

# Check secrets
kubectl get secrets

# Check configmaps
kubectl get configmaps
```

## Cost Optimization

Your current setup includes:
- EKS cluster with 2 nodes (t3.medium)
- RDS PostgreSQL (db.t3.micro)
- ALB and NLB
- ECR storage

**Estimated monthly cost**: ~$150-200

To reduce costs:
- Use smaller instance types
- Enable cluster autoscaling
- Use spot instances for non-production workloads
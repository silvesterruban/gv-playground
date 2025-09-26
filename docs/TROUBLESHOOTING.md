# 🔧 GV Playground Troubleshooting Guide

This guide helps you resolve common issues when working with the GV Playground project.

## 🚨 Common Issues

### Local Development Issues

#### Backend Won't Start

**Symptoms:**
- Backend server fails to start
- Port 3001 already in use
- Database connection errors

**Solutions:**

1. **Port Already in Use:**
   ```bash
   # Find process using port 3001
   lsof -i :3001
   
   # Kill the process
   kill -9 <PID>
   
   # Or use a different port
   PORT=3002 npm run dev
   ```

2. **Database Connection Issues:**
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps postgres
   
   # Restart PostgreSQL
   docker-compose restart postgres
   
   # Check database connection
   docker-compose exec postgres psql -U gvplayground -d gvplayground_db
   ```

3. **Environment Variables Missing:**
   ```bash
   # Copy environment file
   cp backend/env.example backend/.env
   
   # Edit with your configuration
   nano backend/.env
   ```

#### Frontend Build Fails

**Symptoms:**
- React build errors
- TypeScript compilation errors
- Missing dependencies

**Solutions:**

1. **Clear Node Modules:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **TypeScript Errors:**
   ```bash
   # Check TypeScript configuration
   npx tsc --noEmit
   
   # Fix type issues
   npm run type-check
   ```

3. **Build Issues:**
   ```bash
   # Clear build cache
   rm -rf build
   npm run build
   ```

#### Docker Issues

**Symptoms:**
- Docker build fails
- Container won't start
- Permission errors

**Solutions:**

1. **Docker Build Issues:**
   ```bash
   # Clean Docker cache
   docker system prune -a
   
   # Rebuild without cache
   docker-compose build --no-cache
   ```

2. **Permission Issues:**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   
   # Make scripts executable
   chmod +x scripts/*.sh
   ```

3. **Container Won't Start:**
   ```bash
   # Check container logs
   docker-compose logs backend
   docker-compose logs frontend
   
   # Restart services
   docker-compose restart
   ```

### AWS Deployment Issues

#### Terraform Issues

**Symptoms:**
- Terraform plan/apply fails
- Resource conflicts
- State file issues

**Solutions:**

1. **State File Issues:**
   ```bash
   # Initialize Terraform
   cd infrastructure
   terraform init
   
   # Refresh state
   terraform refresh
   
   # Import existing resources
   terraform import aws_vpc.main vpc-12345678
   ```

2. **Resource Conflicts:**
   ```bash
   # Check existing resources
   aws ec2 describe-vpcs
   aws eks list-clusters
   
   # Use different names
   terraform plan -var="environment=dev2"
   ```

3. **Permission Issues:**
   ```bash
   # Check AWS credentials
   aws sts get-caller-identity
   
   # Configure credentials
   aws configure
   ```

#### EKS Issues

**Symptoms:**
- kubectl connection fails
- Pods not starting
- Service discovery issues

**Solutions:**

1. **kubectl Connection:**
   ```bash
   # Update kubeconfig
   aws eks update-kubeconfig --region us-east-1 --name dev-eks-cluster
   
   # Test connection
   kubectl cluster-info
   kubectl get nodes
   ```

2. **Pods Not Starting:**
   ```bash
   # Check pod status
   kubectl get pods -n gv-playground
   
   # Describe pod for details
   kubectl describe pod <pod-name> -n gv-playground
   
   # Check events
   kubectl get events -n gv-playground
   ```

3. **Service Discovery:**
   ```bash
   # Check services
   kubectl get services -n gv-playground
   
   # Test service connectivity
   kubectl run test-pod --image=busybox --rm -it -- nslookup backend-service
   ```

#### RDS Issues

**Symptoms:**
- Database connection timeouts
- Authentication failures
- Performance issues

**Solutions:**

1. **Connection Issues:**
   ```bash
   # Check RDS status
   aws rds describe-db-instances --db-instance-identifier dev-postgres
   
   # Test connection
   kubectl run test-pod --image=postgres:15 --rm -it -- psql -h <rds-endpoint> -U gvplayground -d gvplayground
   ```

2. **Security Group Issues:**
   ```bash
   # Check security groups
   aws ec2 describe-security-groups --group-ids <sg-id>
   
   # Update security group rules
   aws ec2 authorize-security-group-ingress --group-id <sg-id> --protocol tcp --port 5432 --source-group <eks-sg-id>
   ```

### CI/CD Pipeline Issues

#### GitHub Actions Failures

**Symptoms:**
- Workflow fails
- Build errors
- Deployment issues

**Solutions:**

1. **Check Workflow Logs:**
   - Go to GitHub repository → Actions tab
   - Click on failed workflow run
   - Review logs for specific errors

2. **Common Build Issues:**
   ```bash
   # Test locally
   npm test
   npm run build
   
   # Check environment variables
   echo $NODE_ENV
   echo $DATABASE_URL
   ```

3. **Docker Build Issues:**
   ```bash
   # Test Docker build locally
   docker build -t test-backend ./backend
   docker build -t test-frontend ./frontend
   ```

#### ECR Push Issues

**Symptoms:**
- Image push fails
- Authentication errors
- Repository not found

**Solutions:**

1. **Authentication Issues:**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   
   # Check ECR repositories
   aws ecr describe-repositories
   ```

2. **Repository Issues:**
   ```bash
   # Create ECR repository
   aws ecr create-repository --repository-name gv-playground-backend
   aws ecr create-repository --repository-name gv-playground-frontend
   ```

### Database Issues

#### Prisma Issues

**Symptoms:**
- Migration failures
- Schema sync issues
- Connection errors

**Solutions:**

1. **Migration Issues:**
   ```bash
   # Reset database
   npx prisma migrate reset
   
   # Generate Prisma client
   npx prisma generate
   
   # Push schema changes
   npx prisma db push
   ```

2. **Schema Issues:**
   ```bash
   # Check schema
   npx prisma validate
   
   # Format schema
   npx prisma format
   ```

3. **Connection Issues:**
   ```bash
   # Test connection
   npx prisma db pull
   
   # Check environment variables
   echo $DATABASE_URL
   ```

### Performance Issues

#### Slow Response Times

**Symptoms:**
- API responses are slow
- Frontend loading issues
- Database queries timeout

**Solutions:**

1. **Database Performance:**
   ```bash
   # Check database connections
   kubectl exec -it <backend-pod> -- npx prisma db pull
   
   # Monitor database metrics
   aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name DatabaseConnections
   ```

2. **Application Performance:**
   ```bash
   # Check pod resources
   kubectl top pods -n gv-playground
   
   # Scale up if needed
   kubectl scale deployment backend --replicas=3 -n gv-playground
   ```

3. **Network Issues:**
   ```bash
   # Check service endpoints
   kubectl get endpoints -n gv-playground
   
   # Test connectivity
   kubectl run test-pod --image=busybox --rm -it -- wget -O- http://backend-service:3001/api/health
   ```

## 🔍 Debugging Tools

### Logs and Monitoring

1. **Application Logs:**
   ```bash
   # Backend logs
   kubectl logs -f deployment/backend -n gv-playground
   
   # Frontend logs
   kubectl logs -f deployment/frontend -n gv-playground
   ```

2. **System Logs:**
   ```bash
   # CloudWatch logs
   aws logs describe-log-groups
   aws logs tail /aws/eks/dev-eks-cluster/cluster --follow
   ```

3. **Prometheus Metrics:**
   ```bash
   # Port forward to Prometheus
   kubectl port-forward service/prometheus 9090:9090 -n gv-playground
   
   # Access Grafana
   kubectl port-forward service/grafana 3000:3000 -n gv-playground
   ```

### Health Checks

1. **Application Health:**
   ```bash
   # Check health endpoints
   curl http://localhost:3001/api/health
   curl http://localhost:3001/api/health/detailed
   ```

2. **Kubernetes Health:**
   ```bash
   # Check cluster health
   kubectl get nodes
   kubectl get pods --all-namespaces
   ```

3. **AWS Health:**
   ```bash
   # Check EKS cluster
   aws eks describe-cluster --name dev-eks-cluster
   
   # Check RDS instance
   aws rds describe-db-instances --db-instance-identifier dev-postgres
   ```

## 🆘 Getting Help

### Before Asking for Help

1. **Check the logs** - Most issues can be identified from logs
2. **Search existing issues** - Check GitHub issues and documentation
3. **Try the solutions** - Work through the troubleshooting steps
4. **Gather information** - Collect relevant logs and error messages

### When Creating an Issue

Include the following information:

1. **Environment:**
   - Operating system
   - Node.js version
   - Docker version
   - Kubernetes version

2. **Error Details:**
   - Complete error message
   - Stack trace
   - Steps to reproduce

3. **Logs:**
   - Application logs
   - System logs
   - CI/CD pipeline logs

4. **Configuration:**
   - Environment variables (without secrets)
   - Configuration files
   - Deployment manifests

### Useful Commands

```bash
# System information
uname -a
node --version
npm --version
docker --version
kubectl version

# Application status
kubectl get all -n gv-playground
docker-compose ps
npm list

# Resource usage
kubectl top nodes
kubectl top pods -n gv-playground
docker stats
```

## 📚 Additional Resources

- [Kubernetes Troubleshooting](https://kubernetes.io/docs/tasks/debug-application-cluster/)
- [Docker Troubleshooting](https://docs.docker.com/config/troubleshooting/)
- [AWS EKS Troubleshooting](https://docs.aws.amazon.com/eks/latest/userguide/troubleshooting.html)
- [Terraform Troubleshooting](https://www.terraform.io/docs/cli/commands/plan.html)

---

**Remember: Most issues have simple solutions. Take a systematic approach and check the logs first! 🔍**
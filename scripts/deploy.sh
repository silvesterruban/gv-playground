#!/bin/bash

# GV Playground Deployment Script
# This script automates the deployment process to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
ENVIRONMENT="dev"
AWS_REGION="us-east-1"
SKIP_INFRASTRUCTURE=false
SKIP_BUILD=false
SKIP_DEPLOY=false
DRY_RUN=false

# Function to show help
show_help() {
    echo "GV Playground Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -e, --environment       Environment (dev/staging/production) [default: dev]"
    echo "  -r, --region            AWS region [default: us-east-1]"
    echo "  --skip-infrastructure   Skip infrastructure deployment"
    echo "  --skip-build            Skip Docker build and push"
    echo "  --skip-deploy           Skip Kubernetes deployment"
    echo "  --dry-run               Show what would be deployed without making changes"
    echo ""
    echo "Examples:"
    echo "  $0                      # Deploy to dev environment"
    echo "  $0 -e staging           # Deploy to staging environment"
    echo "  $0 -e production        # Deploy to production environment"
    echo "  $0 --dry-run            # Show deployment plan"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command -v aws >/dev/null 2>&1; then
        missing_deps+=("AWS CLI")
    fi
    
    if ! command -v terraform >/dev/null 2>&1; then
        missing_deps+=("Terraform")
    fi
    
    if ! command -v kubectl >/dev/null 2>&1; then
        missing_deps+=("kubectl")
    fi
    
    if ! command -v docker >/dev/null 2>&1; then
        missing_deps+=("Docker")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install the missing dependencies and run this script again."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials not configured or invalid"
        print_status "Please run 'aws configure' to set up your credentials"
        exit 1
    fi
    
    print_success "All prerequisites are satisfied"
}

# Function to get AWS account ID
get_aws_account_id() {
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    print_status "AWS Account ID: $AWS_ACCOUNT_ID"
    print_status "ECR Registry: $ECR_REGISTRY"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    if [ "$SKIP_INFRASTRUCTURE" = true ]; then
        print_warning "Skipping infrastructure deployment"
        return
    fi
    
    print_status "Deploying infrastructure..."
    
    cd infrastructure
    
    # Initialize Terraform
    print_status "Initializing Terraform..."
    terraform init
    
    # Plan deployment
    print_status "Planning infrastructure deployment..."
    if [ "$DRY_RUN" = true ]; then
        terraform plan -var="environment=$ENVIRONMENT" -var="rds_password=placeholder"
        print_warning "Dry run completed. No changes made."
        cd ..
        return
    fi
    
    # Apply infrastructure
    print_status "Applying infrastructure..."
    terraform apply -auto-approve -var="environment=$ENVIRONMENT" -var="rds_password=${RDS_PASSWORD:-placeholder}"
    
    # Get outputs
    EKS_CLUSTER_NAME=$(terraform output -raw eks_cluster_name)
    ALB_DNS_NAME=$(terraform output -raw alb_dns_name)
    
    print_success "Infrastructure deployed successfully"
    print_status "EKS Cluster: $EKS_CLUSTER_NAME"
    print_status "ALB DNS: $ALB_DNS_NAME"
    
    cd ..
}

# Function to configure kubectl
configure_kubectl() {
    print_status "Configuring kubectl..."
    
    aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER_NAME
    
    # Verify connection
    if kubectl cluster-info >/dev/null 2>&1; then
        print_success "kubectl configured successfully"
    else
        print_error "Failed to configure kubectl"
        exit 1
    fi
}

# Function to build and push Docker images
build_and_push_images() {
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping Docker build and push"
        return
    fi
    
    print_status "Building and pushing Docker images..."
    
    # Login to ECR
    print_status "Logging in to ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
    
    # Build and push backend
    print_status "Building backend image..."
    cd backend
    docker build -t $ECR_REGISTRY/gv-playground-backend:latest .
    docker push $ECR_REGISTRY/gv-playground-backend:latest
    cd ..
    
    # Build and push frontend
    print_status "Building frontend image..."
    cd frontend
    docker build -t $ECR_REGISTRY/gv-playground-frontend:latest .
    docker push $ECR_REGISTRY/gv-playground-frontend:latest
    cd ..
    
    print_success "Docker images built and pushed successfully"
}

# Function to deploy applications
deploy_applications() {
    if [ "$SKIP_DEPLOY" = true ]; then
        print_warning "Skipping Kubernetes deployment"
        return
    fi
    
    print_status "Deploying applications to Kubernetes..."
    
    # Create namespace
    kubectl create namespace gv-playground --dry-run=client -o yaml | kubectl apply -f -
    
    # Update image references in deployment files
    sed -i.bak "s|123456789012.dkr.ecr.us-east-1.amazonaws.com|$ECR_REGISTRY|g" k8s/backend-deployment.yaml
    sed -i.bak "s|123456789012.dkr.ecr.us-east-1.amazonaws.com|$ECR_REGISTRY|g" k8s/frontend-deployment.yaml
    
    if [ "$DRY_RUN" = true ]; then
        print_status "Dry run - showing what would be deployed:"
        kubectl apply -f k8s/ --dry-run=client
        print_warning "Dry run completed. No changes made."
        return
    fi
    
    # Deploy backend
    print_status "Deploying backend..."
    kubectl apply -f k8s/backend-deployment.yaml
    
    # Deploy frontend
    print_status "Deploying frontend..."
    kubectl apply -f k8s/frontend-deployment.yaml
    
    # Deploy ingress
    print_status "Deploying ingress..."
    kubectl apply -f k8s/ingress.yaml
    
    # Wait for deployments
    print_status "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/backend -n gv-playground
    kubectl wait --for=condition=available --timeout=300s deployment/frontend -n gv-playground
    
    print_success "Applications deployed successfully"
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Get ALB DNS name
    ALB_DNS_NAME=$(aws elbv2 describe-load-balancers --region $AWS_REGION --query "LoadBalancers[?contains(LoadBalancerName, '$ENVIRONMENT-alb')].DNSName" --output text)
    
    if [ -z "$ALB_DNS_NAME" ]; then
        print_warning "Could not find ALB DNS name, skipping health checks"
        return
    fi
    
    APP_URL="http://$ALB_DNS_NAME"
    
    # Wait for application to be ready
    print_status "Waiting for application to be ready..."
    for i in {1..30}; do
        if curl -f "$APP_URL/api/health" >/dev/null 2>&1; then
            print_success "Application is ready!"
            break
        fi
        echo "Waiting for application... ($i/30)"
        sleep 10
    done
    
    # Run health checks
    print_status "Running health checks..."
    
    # Backend health check
    if curl -f "$APP_URL/api/health" >/dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
    fi
    
    # Frontend health check
    if curl -f "$APP_URL/health" >/dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
    fi
    
    print_status "Application URL: $APP_URL"
}

# Function to show deployment summary
show_deployment_summary() {
    print_success "Deployment completed successfully!"
    echo ""
    print_status "Deployment Summary:"
    print_status "  Environment: $ENVIRONMENT"
    print_status "  Region: $AWS_REGION"
    print_status "  EKS Cluster: $EKS_CLUSTER_NAME"
    print_status "  ECR Registry: $ECR_REGISTRY"
    
    if [ -n "$ALB_DNS_NAME" ]; then
        print_status "  Application URL: http://$ALB_DNS_NAME"
    fi
    
    echo ""
    print_status "Next steps:"
    print_status "1. Monitor application logs: kubectl logs -f deployment/backend -n gv-playground"
    print_status "2. Check application status: kubectl get pods -n gv-playground"
    print_status "3. View application metrics in CloudWatch"
    print_status "4. Set up monitoring and alerting"
}

# Main function
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -r|--region)
                AWS_REGION="$2"
                shift 2
                ;;
            --skip-infrastructure)
                SKIP_INFRASTRUCTURE=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-deploy)
                SKIP_DEPLOY=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
        print_error "Invalid environment: $ENVIRONMENT"
        print_status "Valid environments: dev, staging, production"
        exit 1
    fi
    
    print_status "Starting deployment to $ENVIRONMENT environment..."
    
    # Run deployment steps
    check_prerequisites
    get_aws_account_id
    deploy_infrastructure
    
    if [ "$DRY_RUN" = false ]; then
        configure_kubectl
        build_and_push_images
        deploy_applications
        run_health_checks
        show_deployment_summary
    fi
}

# Run main function with all arguments
main "$@"
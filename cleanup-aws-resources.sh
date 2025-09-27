#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status messages
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

echo -e "🧹 AWS Resources Cleanup Script"
echo "================================"
echo ""

# Set AWS region
AWS_REGION="us-east-1"
ENVIRONMENT="gv-playground"

print_status "Starting cleanup of AWS resources for environment: $ENVIRONMENT"
echo ""

# Function to delete EKS cluster
delete_eks_cluster() {
    local cluster_name="$1"
    print_status "Deleting EKS cluster: $cluster_name"
    
    # Delete node groups first
    aws eks list-nodegroups --cluster-name "$cluster_name" --region "$AWS_REGION" --query 'nodegroups[]' --output text | while read nodegroup; do
        if [ -n "$nodegroup" ]; then
            print_status "Deleting node group: $nodegroup"
            aws eks delete-nodegroup --cluster-name "$cluster_name" --nodegroup-name "$nodegroup" --region "$AWS_REGION" || true
        fi
    done
    
    # Wait for node groups to be deleted
    print_status "Waiting for node groups to be deleted..."
    sleep 30
    
    # Delete the cluster
    aws eks delete-cluster --name "$cluster_name" --region "$AWS_REGION" || true
    print_success "EKS cluster deletion initiated: $cluster_name"
}

# Function to delete Load Balancer
delete_load_balancer() {
    local lb_name="$1"
    print_status "Deleting Load Balancer: $lb_name"
    
    # Get load balancer ARN
    local lb_arn=$(aws elbv2 describe-load-balancers --names "$lb_name" --region "$AWS_REGION" --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null)
    
    if [ "$lb_arn" != "None" ] && [ -n "$lb_arn" ]; then
        # Delete target groups first
        aws elbv2 describe-target-groups --load-balancer-arn "$lb_arn" --region "$AWS_REGION" --query 'TargetGroups[].TargetGroupArn' --output text | while read tg_arn; do
            if [ -n "$tg_arn" ] && [ "$tg_arn" != "None" ]; then
                print_status "Deleting target group: $tg_arn"
                aws elbv2 delete-target-group --target-group-arn "$tg_arn" --region "$AWS_REGION" || true
            fi
        done
        
        # Delete load balancer
        aws elbv2 delete-load-balancer --load-balancer-arn "$lb_arn" --region "$AWS_REGION" || true
        print_success "Load Balancer deletion initiated: $lb_name"
    else
        print_warning "Load Balancer not found: $lb_name"
    fi
}

# Function to delete RDS instance
delete_rds_instance() {
    local db_identifier="$1"
    print_status "Deleting RDS instance: $db_identifier"
    
    # Check if instance exists
    if aws rds describe-db-instances --db-instance-identifier "$db_identifier" --region "$AWS_REGION" >/dev/null 2>&1; then
        aws rds delete-db-instance --db-instance-identifier "$db_identifier" --skip-final-snapshot --region "$AWS_REGION" || true
        print_success "RDS instance deletion initiated: $db_identifier"
    else
        print_warning "RDS instance not found: $db_identifier"
    fi
}

# Function to delete ECR repositories
delete_ecr_repositories() {
    local repos=("$@")
    for repo in "${repos[@]}"; do
        print_status "Deleting ECR repository: $repo"
        
        # Delete all images first
        aws ecr list-images --repository-name "$repo" --region "$AWS_REGION" --query 'imageIds[]' --output json | jq -r '.[] | @base64' | while read image; do
            if [ -n "$image" ]; then
                image_data=$(echo "$image" | base64 --decode)
                aws ecr batch-delete-image --repository-name "$repo" --image-ids "$image_data" --region "$AWS_REGION" || true
            fi
        done
        
        # Delete repository
        aws ecr delete-repository --repository-name "$repo" --force --region "$AWS_REGION" || true
        print_success "ECR repository deletion initiated: $repo"
    done
}

# Function to delete IAM roles
delete_iam_roles() {
    local roles=("$@")
    for role in "${roles[@]}"; do
        print_status "Deleting IAM role: $role"
        
        # Detach policies first
        aws iam list-attached-role-policies --role-name "$role" --query 'AttachedPolicies[].PolicyArn' --output text | while read policy_arn; do
            if [ -n "$policy_arn" ] && [ "$policy_arn" != "None" ]; then
                aws iam detach-role-policy --role-name "$role" --policy-arn "$policy_arn" || true
            fi
        done
        
        # Delete role
        aws iam delete-role --role-name "$role" || true
        print_success "IAM role deletion initiated: $role"
    done
}

# Function to delete S3 bucket
delete_s3_bucket() {
    local bucket_name="$1"
    print_status "Deleting S3 bucket: $bucket_name"
    
    # Delete all objects first
    aws s3 rm "s3://$bucket_name" --recursive || true
    
    # Delete bucket
    aws s3 rb "s3://$bucket_name" --force || true
    print_success "S3 bucket deletion initiated: $bucket_name"
}

# Function to delete CloudWatch log group
delete_cloudwatch_log_group() {
    local log_group_name="$1"
    print_status "Deleting CloudWatch log group: $log_group_name"
    
    aws logs delete-log-group --log-group-name "$log_group_name" --region "$AWS_REGION" || true
    print_success "CloudWatch log group deletion initiated: $log_group_name"
}

# Main cleanup process
print_status "Starting cleanup process..."

# 1. Delete EKS cluster
delete_eks_cluster "${ENVIRONMENT}-eks-cluster"

# 2. Delete Load Balancer
delete_load_balancer "${ENVIRONMENT}-alb"

# 3. Delete RDS instance
delete_rds_instance "${ENVIRONMENT}-postgres"

# 4. Delete ECR repositories
delete_ecr_repositories "${ENVIRONMENT}-backend" "${ENVIRONMENT}-frontend"

# 5. Delete IAM roles
delete_iam_roles "${ENVIRONMENT}-eks-cluster-role" "${ENVIRONMENT}-eks-node-group-role"

# 6. Delete S3 bucket
delete_s3_bucket "${ENVIRONMENT}-terraform-state"

# 7. Delete CloudWatch log group
delete_cloudwatch_log_group "/aws/eks/${ENVIRONMENT}-eks-cluster/cluster"

print_success "Cleanup process completed!"
print_warning "Note: Some resources may take a few minutes to be fully deleted."
print_status "You can now run the deployment again with a clean slate."

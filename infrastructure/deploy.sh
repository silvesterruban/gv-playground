#!/bin/bash

# GV Playground - Environment Agnostic Terraform Deployment Script
# Usage: ./deploy.sh <environment> [action]
# Example: ./deploy.sh dev plan
# Example: ./deploy.sh prod apply

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
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

# Function to show usage
show_usage() {
    echo "Usage: $0 <environment> [action]"
    echo ""
    echo "Environments:"
    echo "  gv-playground - GV Playground environment"
    echo "  dev      - Development environment"
    echo "  staging  - Staging environment"
    echo "  prod     - Production environment"
    echo ""
    echo "Actions:"
    echo "  plan     - Show execution plan (default)"
    echo "  apply    - Apply changes"
    echo "  destroy  - Destroy infrastructure"
    echo "  init     - Initialize terraform"
    echo ""
    echo "Examples:"
    echo "  $0 gv-playground plan"
    echo "  $0 dev plan"
    echo "  $0 staging apply"
    echo "  $0 prod destroy"
}

# Check if environment is provided
if [ $# -lt 1 ]; then
    print_error "Environment is required"
    show_usage
    exit 1
fi

ENVIRONMENT=$1
ACTION=${2:-plan}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(gv-playground|dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Valid environments: gv-playground, dev, staging, prod"
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(init|plan|apply|destroy)$ ]]; then
    print_error "Invalid action: $ACTION"
    print_error "Valid actions: init, plan, apply, destroy"
    exit 1
fi

# Set environment-specific variables
ENV_DIR="environments/$ENVIRONMENT"
TFVARS_FILE="$ENV_DIR/terraform.tfvars"
WORKSPACE_NAME="gv-playground-$ENVIRONMENT"

print_info "Deploying to $ENVIRONMENT environment"
print_info "Action: $ACTION"
print_info "Workspace: $WORKSPACE_NAME"

# Check if terraform.tfvars exists
if [ ! -f "$TFVARS_FILE" ]; then
    print_error "Terraform variables file not found: $TFVARS_FILE"
    exit 1
fi

# Initialize terraform if needed
if [ "$ACTION" = "init" ] || [ ! -d ".terraform" ]; then
    print_info "Initializing Terraform..."
    terraform init
    print_success "Terraform initialized"
fi

# Create or select workspace
print_info "Setting up workspace: $WORKSPACE_NAME"
terraform workspace select "$WORKSPACE_NAME" 2>/dev/null || terraform workspace new "$WORKSPACE_NAME"
print_success "Workspace set to: $WORKSPACE_NAME"

# Execute terraform command
case $ACTION in
    "plan")
        print_info "Running terraform plan for $ENVIRONMENT..."
        terraform plan -var-file="$TFVARS_FILE" -out="$ENVIRONMENT.tfplan"
        print_success "Plan completed. Review the plan above."
        print_info "To apply: $0 $ENVIRONMENT apply"
        ;;
    "apply")
        print_warning "Applying changes to $ENVIRONMENT environment..."
        if [ -f "$ENVIRONMENT.tfplan" ]; then
            terraform apply "$ENVIRONMENT.tfplan"
        else
            terraform apply -var-file="$TFVARS_FILE" -auto-approve
        fi
        print_success "Infrastructure deployed to $ENVIRONMENT!"
        ;;
    "destroy")
        print_warning "DESTROYING $ENVIRONMENT environment infrastructure!"
        print_warning "This action cannot be undone!"
        read -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            terraform destroy -var-file="$TFVARS_FILE" -auto-approve
            print_success "Infrastructure destroyed for $ENVIRONMENT"
        else
            print_info "Destroy cancelled"
        fi
        ;;
    "init")
        print_success "Terraform initialized"
        ;;
esac

# Show outputs if apply was successful
if [ "$ACTION" = "apply" ]; then
    print_info "Infrastructure outputs:"
    terraform output
fi

print_success "Deployment script completed!"
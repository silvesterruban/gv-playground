# GV Playground - Environment Agnostic Terraform Infrastructure

This directory contains the environment-agnostic Terraform configuration for the GV Playground project, supporting multiple environments with consistent infrastructure patterns.

## 🏗️ Architecture

The infrastructure is designed to be environment-agnostic, allowing you to deploy the same infrastructure pattern across different environments (gv-playground, dev, staging, prod) with environment-specific configurations.

## 📁 Directory Structure

```
infrastructure/
├── main.tf                    # Main Terraform configuration
├── variables.tf               # Variable definitions
├── outputs.tf                 # Output definitions
├── deploy.sh                  # Deployment script
├── environments/              # Environment-specific configurations
│   ├── gv-playground/
│   │   └── terraform.tfvars   # GV Playground environment config
│   ├── dev/
│   │   └── terraform.tfvars   # Development environment config
│   ├── staging/
│   │   └── terraform.tfvars   # Staging environment config
│   └── prod/
│       └── terraform.tfvars   # Production environment config
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **kubectl** for Kubernetes management

### Deploy GV Playground Environment

```bash
# Navigate to infrastructure directory
cd infrastructure

# Make deployment script executable
chmod +x deploy.sh

# Initialize Terraform
./deploy.sh gv-playground init

# Plan the deployment
./deploy.sh gv-playground plan

# Apply the infrastructure
./deploy.sh gv-playground apply
```

## 🌍 Supported Environments

### GV Playground Environment
- **Purpose**: Main development and testing environment
- **Configuration**: Balanced resources for development
- **Node Group**: 2 desired, 4 max, 1 min nodes
- **Instance Types**: t3.medium
- **RDS**: db.t3.micro with 20GB storage
- **NAT Gateway**: Enabled

### Development Environment
- **Purpose**: Local development and testing
- **Configuration**: Minimal resources for cost optimization
- **Node Group**: 1 desired, 2 max, 1 min nodes
- **Instance Types**: t3.small
- **RDS**: db.t3.micro with 20GB storage
- **NAT Gateway**: Disabled (cost optimization)

### Staging Environment
- **Purpose**: Pre-production testing
- **Configuration**: Production-like setup
- **Node Group**: 2 desired, 4 max, 1 min nodes
- **Instance Types**: t3.medium
- **RDS**: db.t3.small with 50GB storage
- **NAT Gateway**: Enabled

### Production Environment
- **Purpose**: Production workloads
- **Configuration**: High availability and performance
- **Node Group**: 3 desired, 10 max, 2 min nodes
- **Instance Types**: t3.medium, t3.large
- **RDS**: db.t3.medium with 100GB storage
- **NAT Gateway**: Enabled

## 🛠️ Deployment Commands

### Basic Commands

```bash
# Initialize Terraform
./deploy.sh <environment> init

# Show execution plan
./deploy.sh <environment> plan

# Apply changes
./deploy.sh <environment> apply

# Destroy infrastructure
./deploy.sh <environment> destroy
```

### Examples

```bash
# Deploy GV Playground environment
./deploy.sh gv-playground apply

# Plan staging deployment
./deploy.sh staging plan

# Destroy development environment
./deploy.sh dev destroy
```

## 🔧 Configuration

### Environment Variables

Each environment has its own `terraform.tfvars` file with environment-specific settings:

- **Node Group Configuration**: Desired, min, max node counts
- **Instance Types**: EC2 instance types for worker nodes
- **RDS Configuration**: Database instance class and storage
- **VPC Configuration**: CIDR blocks and availability zones
- **Tags**: Environment-specific resource tags

### Customization

To customize an environment:

1. Edit the corresponding `terraform.tfvars` file in `environments/<environment>/`
2. Run `./deploy.sh <environment> plan` to see changes
3. Run `./deploy.sh <environment> apply` to apply changes

## 📊 Infrastructure Components

### Core Infrastructure
- **VPC**: Virtual Private Cloud with public/private subnets
- **EKS Cluster**: Managed Kubernetes cluster
- **Node Groups**: Auto-scaling worker node groups
- **RDS**: PostgreSQL database instance
- **Load Balancers**: Application Load Balancers for services

### Networking
- **Internet Gateway**: For public subnet internet access
- **NAT Gateway**: For private subnet internet access (configurable)
- **Route Tables**: Custom routing for subnets
- **Security Groups**: Network security rules

### Security
- **IAM Roles**: Service roles for EKS and node groups
- **Security Groups**: Network-level security
- **VPC Endpoints**: Secure AWS service access

## 🔍 Monitoring and Logging

The infrastructure includes:
- **CloudWatch Logs**: Centralized logging
- **CloudWatch Metrics**: Resource monitoring
- **EKS Control Plane Logging**: Kubernetes audit logs

## 🚨 Important Notes

### Security
- **Database Passwords**: Change default passwords in production
- **Access Keys**: Use IAM roles instead of access keys when possible
- **Network Security**: Review security group rules

### Cost Optimization
- **Development Environment**: NAT Gateway disabled for cost savings
- **Auto Scaling**: Configured to scale based on demand
- **Instance Types**: Choose appropriate instance types for workload

### Backup and Recovery
- **RDS Backups**: Automated backups enabled
- **EKS Snapshots**: Consider implementing cluster backups
- **Terraform State**: Store state in S3 with versioning

## 🆘 Troubleshooting

### Common Issues

1. **Terraform State Lock**: If state is locked, check for running operations
2. **AWS Limits**: Check AWS service limits for your account
3. **Network Issues**: Verify VPC and subnet configurations
4. **Authentication**: Ensure AWS credentials are properly configured

### Getting Help

1. Check Terraform logs for detailed error messages
2. Verify AWS service status
3. Review security group and network ACL configurations
4. Check IAM permissions for required services

## 📝 Contributing

When making changes to the infrastructure:

1. Test changes in development environment first
2. Update documentation for any new variables or resources
3. Follow naming conventions for resources
4. Add appropriate tags to all resources

## 🔄 Version Control

- **Branch**: `feature/terraform-environment-agnostic`
- **State Management**: Use Terraform workspaces for environment isolation
- **Backup**: Regular state file backups recommended
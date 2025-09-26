# 🏗️ GV Playground Infrastructure Plan

## 📊 Terraform Infrastructure Overview

Based on the Terraform configuration, here's what will be created in AWS:

## 🌐 Network Architecture

```
Internet Gateway
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    VPC (10.0.0.0/16)                       │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Public AZ-1   │    │   Public AZ-2   │                │
│  │  (10.0.1.0/24)  │    │  (10.0.2.0/24)  │                │
│  │                 │    │                 │                │
│  │  ┌───────────┐  │    │  ┌───────────┐  │                │
│  │  │   ALB     │  │    │  │   ALB     │  │                │
│  │  │  Target   │  │    │  │  Target   │  │                │
│  │  │  Groups   │  │    │  │  Groups   │  │                │
│  │  └───────────┘  │    │  └───────────┘  │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Private AZ-1   │    │  Private AZ-2   │                │
│  │ (10.0.10.0/24)  │    │ (10.0.11.0/24)  │                │
│  │                 │    │                 │                │
│  │  ┌───────────┐  │    │  ┌───────────┐  │                │
│  │  │   EKS     │  │    │  │   EKS     │  │                │
│  │  │  Nodes    │  │    │  │  Nodes    │  │                │
│  │  └───────────┘  │    │  └───────────┘  │                │
│  │                 │    │                 │                │
│  │  ┌───────────┐  │    │  ┌───────────┐  │                │
│  │  │   RDS     │  │    │  │   RDS     │  │                │
│  │  │  Subnet   │  │    │  │  Subnet   │  │                │
│  │  └───────────┘  │    │  └───────────┘  │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
│  ┌─────────────────┐                                       │
│  │   Private AZ-3  │                                       │
│  │ (10.0.12.0/24)  │                                       │
│  │                 │                                       │
│  │  ┌───────────┐  │                                       │
│  │  │   EKS     │  │                                       │
│  │  │  Nodes    │  │                                       │
│  │  └───────────┘  │                                       │
│  │                 │                                       │
│  │  ┌───────────┐  │                                       │
│  │  │   RDS     │  │                                       │
│  │  │  Subnet   │  │                                       │
│  │  └───────────┘  │                                       │
│  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
    NAT Gateway
```

## 🏗️ Infrastructure Components

### 1. **VPC & Networking**
- **VPC**: `10.0.0.0/16` CIDR block
- **Public Subnets**: 3 subnets across 3 AZs (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)
- **Private Subnets**: 3 subnets across 3 AZs (10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24)
- **Internet Gateway**: For public internet access
- **NAT Gateway**: For private subnet internet access
- **Route Tables**: Separate routing for public and private subnets

### 2. **EKS Cluster**
- **Cluster Name**: `{environment}-eks-cluster`
- **Kubernetes Version**: 1.28
- **Node Group**: Auto-scaling group with t3.medium instances
- **Security Groups**: 
  - EKS Cluster SG (port 443 for API server)
  - EKS Node Group SG (inter-node communication)
- **IAM Roles**:
  - EKS Cluster Service Role
  - EKS Node Group Role with required policies

### 3. **RDS PostgreSQL Database**
- **Instance Class**: db.t3.micro (configurable)
- **Storage**: 20GB initial, up to 100GB auto-scaling
- **Multi-AZ**: Available across 3 AZs
- **Security Group**: Restricted to EKS cluster access
- **Backup**: 7 days retention (production), 1 day (dev/staging)
- **Monitoring**: Enhanced monitoring for production

### 4. **Application Load Balancer (ALB)**
- **Type**: Application Load Balancer
- **Subnets**: Public subnets for internet access
- **Target Groups**:
  - Backend (port 3001)
  - Frontend (port 80)
- **Health Checks**: HTTP health checks for both services
- **Security Group**: Ports 80 and 443 open

### 5. **ECR Container Registry**
- **Repositories**:
  - `gv-playground-backend`
  - `gv-playground-frontend`
- **Lifecycle Policies**: Image retention and cleanup
- **Access**: EKS cluster can pull images

### 6. **S3 Bucket**
- **Purpose**: Terraform state storage
- **Features**:
  - Versioning enabled
  - Server-side encryption
  - Public access blocked
- **Name**: `gv-playground-terraform-state`

### 7. **CloudWatch**
- **Log Groups**: EKS cluster logs
- **Retention**: 30 days (production), 7 days (dev/staging)
- **Monitoring**: RDS enhanced monitoring for production

## 🔒 Security Features

### Network Security
- **Private Subnets**: EKS nodes and RDS in private subnets
- **Security Groups**: Restrictive rules for each component
- **NAT Gateway**: Private subnet internet access without direct exposure

### IAM Security
- **Least Privilege**: Minimal required permissions
- **Service Roles**: Dedicated roles for EKS and RDS
- **Policy Attachments**: Required AWS managed policies

### Data Security
- **Encryption**: S3 bucket encryption
- **Backup**: Automated RDS backups
- **Access Control**: Security groups restrict database access

## 📊 Resource Summary

| Component | Count | Type | Purpose |
|-----------|-------|------|---------|
| VPC | 1 | Network | Isolated network environment |
| Public Subnets | 3 | Network | Internet-facing resources |
| Private Subnets | 3 | Network | Internal resources |
| Internet Gateway | 1 | Network | Internet access |
| NAT Gateway | 1 | Network | Private subnet internet access |
| EKS Cluster | 1 | Compute | Kubernetes orchestration |
| EKS Node Group | 1 | Compute | Worker nodes (2-4 instances) |
| RDS Instance | 1 | Database | PostgreSQL database |
| ALB | 1 | Load Balancer | Application load balancing |
| ECR Repositories | 2 | Container | Docker image storage |
| S3 Bucket | 1 | Storage | Terraform state |
| Security Groups | 5 | Security | Network access control |
| IAM Roles | 3 | Security | Service permissions |

## 🚀 Deployment Flow

1. **Network Setup**: VPC, subnets, gateways, route tables
2. **Security Setup**: Security groups, IAM roles and policies
3. **EKS Cluster**: Kubernetes cluster creation
4. **Node Group**: Worker nodes provisioning
5. **RDS Database**: PostgreSQL instance setup
6. **Load Balancer**: ALB and target groups
7. **Container Registry**: ECR repositories
8. **Storage**: S3 bucket for state management
9. **Monitoring**: CloudWatch log groups

## 💰 Cost Considerations

### Development Environment
- **EKS Cluster**: ~$73/month
- **Node Group (2x t3.medium)**: ~$60/month
- **RDS (db.t3.micro)**: ~$15/month
- **ALB**: ~$16/month
- **NAT Gateway**: ~$45/month
- **Total**: ~$209/month

### Production Environment
- **EKS Cluster**: ~$73/month
- **Node Group (4x t3.medium)**: ~$120/month
- **RDS (db.t3.small)**: ~$25/month
- **ALB**: ~$16/month
- **NAT Gateway**: ~$45/month
- **Enhanced Monitoring**: ~$10/month
- **Total**: ~$289/month

## 🎯 Next Steps

1. **Configure AWS Credentials**: Set up AWS CLI or environment variables
2. **Review Variables**: Update `terraform.tfvars` with your values
3. **Run Terraform Plan**: `terraform plan -var-file="terraform.tfvars"`
4. **Apply Infrastructure**: `terraform apply -var-file="terraform.tfvars"`
5. **Configure kubectl**: `aws eks update-kubeconfig --region us-east-1 --name dev-eks-cluster`
6. **Deploy Applications**: Use the Kubernetes manifests in the `k8s/` directory

---

**This infrastructure provides a production-ready, scalable, and secure environment for the GV Playground application! 🚀**
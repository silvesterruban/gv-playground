# 🏗️ GV Playground Terraform Plan - Infrastructure Diagram

## 📊 **Terraform Plan Summary**
- **Total Resources**: 46 resources to be created
- **Environment**: Development (dev)
- **Region**: us-east-1
- **Estimated Cost**: ~$200-300/month

## 🌐 **Network Architecture Diagram**

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

## 🏗️ **Infrastructure Components Breakdown**

### **1. Networking (12 resources)**
- **VPC**: `dev-vpc` (10.0.0.0/16)
- **Internet Gateway**: `dev-igw`
- **Public Subnets**: 3 subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)
- **Private Subnets**: 3 subnets (10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24)
- **NAT Gateway**: 1 gateway with Elastic IP
- **Route Tables**: 1 public, 1 private
- **Route Table Associations**: 6 associations

### **2. EKS Cluster (8 resources)**
- **EKS Cluster**: `dev-eks-cluster` (Kubernetes 1.28)
- **EKS Node Group**: Auto-scaling (1-4 nodes, t3.medium)
- **IAM Roles**: 2 roles (cluster + node group)
- **IAM Policy Attachments**: 4 policy attachments
- **Security Groups**: 2 security groups (cluster + node group)

### **3. RDS Database (3 resources)**
- **RDS Instance**: `dev-postgres` (PostgreSQL 15.4, db.t3.micro)
- **DB Subnet Group**: Multi-AZ subnet group
- **Security Group**: RDS security group (port 5432)

### **4. Application Load Balancer (5 resources)**
- **ALB**: `dev-alb` (Application Load Balancer)
- **Target Groups**: 2 target groups (backend:3001, frontend:80)
- **Listener**: HTTP listener on port 80
- **Listener Rule**: Backend routing (/api/*)
- **Security Group**: ALB security group (ports 80, 443)

### **5. Container Registry (4 resources)**
- **ECR Repositories**: 2 repositories (backend, frontend)
- **Lifecycle Policies**: 2 policies (keep last 10 images)

### **6. Storage & State (4 resources)**
- **S3 Bucket**: `gv-playground-terraform-state`
- **S3 Versioning**: Enabled
- **S3 Encryption**: AES256 server-side encryption
- **S3 Public Access Block**: All public access blocked

### **7. Monitoring (1 resource)**
- **CloudWatch Log Group**: EKS cluster logs (7-day retention)

## 🔒 **Security Architecture**

### **Network Security**
```
Internet → ALB (Ports 80/443) → EKS Nodes → RDS (Port 5432)
    │           │                    │
    │           │                    ▼
    │           │              Private Subnets
    │           │                    │
    │           │                    ▼
    │           │              NAT Gateway
    │           │                    │
    │           │                    ▼
    │           │              Internet Gateway
    │           │
    │           ▼
    │    Public Subnets
    │
    ▼
Internet Gateway
```

### **Security Groups**
1. **ALB Security Group**: 
   - Inbound: 80 (HTTP), 443 (HTTPS) from 0.0.0.0/0
   - Outbound: All traffic

2. **EKS Cluster Security Group**:
   - Inbound: 443 (HTTPS) from EKS node group
   - Outbound: All traffic

3. **EKS Node Group Security Group**:
   - Inbound: All traffic from EKS cluster, self-referencing
   - Outbound: All traffic

4. **RDS Security Group**:
   - Inbound: 5432 (PostgreSQL) from EKS node group
   - Outbound: All traffic

## 📊 **Resource Details**

### **EKS Configuration**
- **Cluster Name**: `dev-eks-cluster`
- **Kubernetes Version**: 1.28
- **Node Group**: `dev-node-group`
- **Instance Type**: t3.medium
- **Scaling**: 1-4 nodes (desired: 2)
- **Update Strategy**: 25% max unavailable

### **RDS Configuration**
- **Engine**: PostgreSQL 15.4
- **Instance Class**: db.t3.micro
- **Storage**: 20GB initial, up to 100GB
- **Backup**: 1 day retention (dev)
- **Multi-AZ**: Available across 3 AZs

### **ALB Configuration**
- **Type**: Application Load Balancer
- **Scheme**: Internet-facing
- **Target Groups**:
  - Backend: Port 3001, Health check: `/api/health`
  - Frontend: Port 80, Health check: `/`
- **Routing**: `/api/*` → Backend, Default → Frontend

## 💰 **Cost Estimation**

### **Monthly Costs (Development)**
- **EKS Cluster**: ~$73/month
- **EKS Nodes (2x t3.medium)**: ~$60/month
- **RDS (db.t3.micro)**: ~$15/month
- **ALB**: ~$16/month
- **NAT Gateway**: ~$45/month
- **Data Transfer**: ~$10/month
- **ECR Storage**: ~$5/month
- **S3 Storage**: ~$1/month
- **CloudWatch Logs**: ~$5/month

**Total Estimated Cost**: ~$230/month

## 🚀 **Deployment Flow**

1. **Network Setup** (12 resources)
   - VPC, subnets, gateways, route tables

2. **Security Setup** (6 resources)
   - Security groups, IAM roles and policies

3. **EKS Cluster** (8 resources)
   - Cluster, node group, security groups

4. **Database** (3 resources)
   - RDS instance, subnet group, security group

5. **Load Balancer** (5 resources)
   - ALB, target groups, listeners

6. **Container Registry** (4 resources)
   - ECR repositories, lifecycle policies

7. **Storage & Monitoring** (5 resources)
   - S3 bucket, CloudWatch logs

## 📋 **Key Outputs**

After deployment, you'll get:
- **EKS Cluster Endpoint**: For kubectl configuration
- **ALB DNS Name**: Application URL
- **RDS Endpoint**: Database connection string
- **ECR Repository URLs**: For pushing Docker images
- **VPC and Subnet IDs**: For additional resources

## 🎯 **Next Steps**

1. **Review the Plan**: All 46 resources look correct
2. **Apply Infrastructure**: `terraform apply -var-file="terraform.tfvars"`
3. **Configure kubectl**: Use the provided command
4. **Deploy Applications**: Use Kubernetes manifests
5. **Monitor Resources**: Check CloudWatch and EKS console

---

**This infrastructure provides a production-ready, scalable, and secure environment for the GV Playground application! 🚀**
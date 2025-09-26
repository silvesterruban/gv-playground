# 🏗️ GV Playground Infrastructure - Visual Architecture

## 🌐 **Complete Infrastructure Overview**

```
                    ┌─────────────────────────────────────────┐
                    │              INTERNET                   │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │         Internet Gateway                │
                    │            (dev-igw)                    │
                    └─────────────────┬───────────────────────┘
                                      │
    ┌─────────────────────────────────┼─────────────────────────────────┐
    │                                 │                                 │
    │            VPC (10.0.0.0/16)    │                                 │
    │                                 │                                 │
    │  ┌─────────────────────────────┼─────────────────────────────┐   │
    │  │                             │                             │   │
    │  │        PUBLIC SUBNETS       │                             │   │
    │  │                             │                             │   │
    │  │  ┌─────────┐  ┌─────────┐  │  ┌─────────┐                │   │
    │  │  │ AZ-1a   │  │ AZ-1b   │  │  │ AZ-1c   │                │   │
    │  │  │10.0.1.0 │  │10.0.2.0 │  │  │10.0.3.0 │                │   │
    │  │  │  /24    │  │  /24    │  │  │  /24    │                │   │
    │  │  │         │  │         │  │  │         │                │   │
    │  │  │ ┌─────┐ │  │ ┌─────┐ │  │  │ ┌─────┐ │                │   │
    │  │  │ │ ALB │ │  │ │ ALB │ │  │  │ │ ALB │ │                │   │
    │  │  │ │Target│ │  │ │Target│ │  │  │ │Target│ │                │   │
    │  │  │ │Groups│ │  │ │Groups│ │  │  │ │Groups│ │                │   │
    │  │  │ └─────┘ │  │ └─────┘ │  │  │ └─────┘ │                │   │
    │  │  └─────────┘  └─────────┘  │  └─────────┘                │   │
    │  └─────────────────────────────┼─────────────────────────────┘   │
    │                                 │                                 │
    │  ┌─────────────────────────────┼─────────────────────────────┐   │
    │  │                             │                             │   │
    │  │       PRIVATE SUBNETS       │                             │   │
    │  │                             │                             │   │
    │  │  ┌─────────┐  ┌─────────┐  │  ┌─────────┐                │   │
    │  │  │ AZ-1a   │  │ AZ-1b   │  │  │ AZ-1c   │                │   │
    │  │  │10.0.10.0│  │10.0.11.0│  │  │10.0.12.0│                │   │
    │  │  │  /24    │  │  /24    │  │  │  /24    │                │   │
    │  │  │         │  │         │  │  │         │                │   │
    │  │  │ ┌─────┐ │  │ ┌─────┐ │  │  │ ┌─────┐ │                │   │
    │  │  │ │ EKS │ │  │ │ EKS │ │  │  │ │ EKS │ │                │   │
    │  │  │ │Nodes│ │  │ │Nodes│ │  │  │ │Nodes│ │                │   │
    │  │  │ └─────┘ │  │ └─────┘ │  │  │ └─────┘ │                │   │
    │  │  │         │  │         │  │  │         │                │   │
    │  │  │ ┌─────┐ │  │ ┌─────┐ │  │  │ ┌─────┐ │                │   │
    │  │  │ │ RDS │ │  │ │ RDS │ │  │  │ │ RDS │ │                │   │
    │  │  │ │Subnet│ │  │ │Subnet│ │  │  │ │Subnet│ │                │   │
    │  │  │ └─────┘ │  │ └─────┘ │  │  │ └─────┘ │                │   │
    │  │  └─────────┘  └─────────┘  │  └─────────┘                │   │
    │  └─────────────────────────────┼─────────────────────────────┘   │
    │                                 │                                 │
    │  ┌─────────────────────────────┼─────────────────────────────┐   │
    │  │                             │                             │   │
    │  │         NAT GATEWAY         │                             │   │
    │  │                             │                             │   │
    │  │  ┌─────────────────────────┼─────────────────────────┐   │   │
    │  │  │                         │                         │   │   │
    │  │  │    Elastic IP + NAT     │                         │   │   │
    │  │  │                         │                         │   │   │
    │  │  └─────────────────────────┼─────────────────────────┘   │   │
    │  └─────────────────────────────┼─────────────────────────────┘   │
    └─────────────────────────────────┼─────────────────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │         Internet Gateway                │
                    │            (dev-igw)                    │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │              INTERNET                   │
                    └─────────────────────────────────────────┘
```

## 🔧 **Component Details**

### **Application Load Balancer (ALB)**
```
┌─────────────────────────────────────────────────────────────┐
│                    ALB (dev-alb)                           │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Listener      │    │   Target Groups │                │
│  │   Port 80       │    │                 │                │
│  │                 │    │  ┌───────────┐  │                │
│  │  ┌───────────┐  │    │  │ Backend   │  │                │
│  │  │ Default   │──┼────┼──│ Port 3001 │  │                │
│  │  │ Frontend  │  │    │  │ /api/health│  │                │
│  │  └───────────┘  │    │  └───────────┘  │                │
│  │                 │    │                 │                │
│  │  ┌───────────┐  │    │  ┌───────────┐  │                │
│  │  │ /api/*    │──┼────┼──│ Frontend  │  │                │
│  │  │ Backend   │  │    │  │ Port 80   │  │                │
│  │  └───────────┘  │    │  │ /         │  │                │
│  │                 │    │  └───────────┘  │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### **EKS Cluster Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                EKS Cluster (dev-eks-cluster)               │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                Control Plane                           ││
│  │                                                         ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                ││
│  │  │   API   │  │  etcd   │  │ Scheduler│                ││
│  │  │ Server  │  │         │  │         │                ││
│  │  └─────────┘  └─────────┘  └─────────┘                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                Worker Nodes                            ││
│  │                                                         ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                ││
│  │  │ Node 1  │  │ Node 2  │  │ Node 3  │                ││
│  │  │t3.medium│  │t3.medium│  │t3.medium│                ││
│  │  │         │  │         │  │         │                ││
│  │  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │                ││
│  │  │ │Backend│ │  │ │Frontend│ │  │ │Backend│ │                ││
│  │  │ │ Pod  │ │  │ │ Pod  │ │  │ │ Pod  │ │                ││
│  │  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │                ││
│  │  └─────────┘  └─────────┘  └─────────┘                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### **RDS Database**
```
┌─────────────────────────────────────────────────────────────┐
│                RDS PostgreSQL (dev-postgres)               │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                Primary Instance                        ││
│  │                                                         ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                ││
│  │  │   AZ-1a │  │   AZ-1b │  │   AZ-1c │                ││
│  │  │         │  │         │  │         │                ││
│  │  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │                ││
│  │  │ │ DB  │ │  │ │ DB  │ │  │ │ DB  │ │                ││
│  │  │ │Subnet│ │  │ │Subnet│ │  │ │Subnet│ │                ││
│  │  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │                ││
│  │  └─────────┘  └─────────┘  └─────────┘                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Database: gvplayground                                     │
│  Engine: PostgreSQL 15.4                                    │
│  Instance: db.t3.micro                                      │
│  Storage: 20GB (up to 100GB)                               │
└─────────────────────────────────────────────────────────────┘
```

### **Container Registry (ECR)**
```
┌─────────────────────────────────────────────────────────────┐
│                    ECR Repositories                        │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Backend       │    │   Frontend      │                │
│  │   Repository    │    │   Repository    │                │
│  │                 │    │                 │                │
│  │  ┌───────────┐  │    │  ┌───────────┐  │                │
│  │  │   Image   │  │    │  │   Image   │  │                │
│  │  │   Tags    │  │    │  │   Tags    │  │                │
│  │  │           │  │    │  │           │  │                │
│  │  │ v1.0.0    │  │    │  │ v1.0.0    │  │                │
│  │  │ latest    │  │    │  │ latest    │  │                │
│  │  │ dev       │  │    │  │ dev       │  │                │
│  │  └───────────┘  │    │  └───────────┘  │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
│  Lifecycle Policy: Keep last 10 images                     │
│  Scan on Push: Enabled                                     │
└─────────────────────────────────────────────────────────────┘
```

### **Storage & State Management**
```
┌─────────────────────────────────────────────────────────────┐
│                    S3 Bucket                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │            gv-playground-terraform-state               ││
│  │                                                         ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │                Terraform State                     │││
│  │  │                                                     │││
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │││
│  │  │  │   Dev   │  │ Staging │  │   Prod  │            │││
│  │  │  │ State   │  │ State   │  │ State   │            │││
│  │  │  └─────────┘  └─────────┘  └─────────┘            │││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Versioning: Enabled                                        │
│  Encryption: AES256                                         │
│  Public Access: Blocked                                     │
└─────────────────────────────────────────────────────────────┘
```

## 🔒 **Security Flow**

```
Internet Request Flow:
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Client  │───▶│   ALB   │───▶│  EKS    │───▶│   RDS   │
│         │    │ (80/443)│    │ Nodes   │    │ (5432)  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     │              │              │              │
     ▼              ▼              ▼              ▼
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│   Any   │    │  Public │    │ Private │    │ Private │
│   IP    │    │ Subnets │    │ Subnets │    │ Subnets │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

## 📊 **Resource Summary Table**

| Component | Count | Type | Purpose | Cost/Month |
|-----------|-------|------|---------|------------|
| VPC | 1 | Network | Isolated environment | $0 |
| Public Subnets | 3 | Network | Internet-facing resources | $0 |
| Private Subnets | 3 | Network | Internal resources | $0 |
| Internet Gateway | 1 | Network | Internet access | $0 |
| NAT Gateway | 1 | Network | Private subnet internet | ~$45 |
| EKS Cluster | 1 | Compute | Kubernetes orchestration | ~$73 |
| EKS Nodes | 2-4 | Compute | Worker nodes | ~$60 |
| RDS Instance | 1 | Database | PostgreSQL database | ~$15 |
| ALB | 1 | Load Balancer | Application routing | ~$16 |
| ECR Repositories | 2 | Container | Docker image storage | ~$5 |
| S3 Bucket | 1 | Storage | Terraform state | ~$1 |
| Security Groups | 4 | Security | Network access control | $0 |
| IAM Roles | 2 | Security | Service permissions | $0 |
| CloudWatch Logs | 1 | Monitoring | EKS cluster logs | ~$5 |

**Total Estimated Monthly Cost: ~$220**

## 🚀 **Deployment Commands**

```bash
# 1. Initialize Terraform
terraform init

# 2. Plan the infrastructure
terraform plan -var-file="terraform.tfvars"

# 3. Apply the infrastructure
terraform apply -var-file="terraform.tfvars"

# 4. Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name dev-eks-cluster

# 5. Verify deployment
kubectl get nodes
kubectl get pods --all-namespaces
```

## 🎯 **Key Benefits**

✅ **High Availability**: Multi-AZ deployment across 3 availability zones  
✅ **Scalability**: Auto-scaling EKS node group (1-4 nodes)  
✅ **Security**: Private subnets, security groups, IAM roles  
✅ **Cost Effective**: Development-optimized instance sizes  
✅ **Production Ready**: Proper networking, monitoring, and backup  
✅ **Container Native**: ECR for image storage, EKS for orchestration  
✅ **Infrastructure as Code**: Complete Terraform automation  

---

**This infrastructure provides a robust, scalable, and secure foundation for the GV Playground application! 🚀**
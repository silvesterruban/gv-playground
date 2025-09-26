# GV Playground Terraform Variables
# Copy this file to terraform.tfvars and update the values

# Environment Configuration
environment = "playground"
aws_region  = "us-east-1"

# Kubernetes Configuration
kubernetes_version = "1.28"

# Node Group Configuration
node_group_desired_size = 2
node_group_max_size     = 4
node_group_min_size     = 1
node_group_instance_types = ["t3.medium"]

# RDS Configuration
rds_instance_class        = "db.t3.micro"
rds_allocated_storage     = 20
rds_max_allocated_storage = 100
rds_username              = "gvplayground"
rds_password              = "your-secure-password-here"

# Additional Tags
tags = {
  Project     = "gv-playground"
  Environment = "dev"
  Owner       = "your-name"
  CostCenter  = "learning"
}
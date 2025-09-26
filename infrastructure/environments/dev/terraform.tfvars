# Development Environment Configuration
environment = "dev"
aws_region  = "us-east-1"

# Development-specific overrides
node_group_desired_size = 1
node_group_max_size     = 2
node_group_min_size     = 1
node_group_instance_types = ["t3.small"]

# RDS Configuration for dev
rds_instance_class        = "db.t3.micro"
rds_allocated_storage     = 20
rds_max_allocated_storage = 50
rds_username              = "gvplayground"
rds_password              = "dev-password-123"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = 2
enable_nat_gateway = false  # Cost optimization for dev

# Additional Tags
tags = {
  Owner       = "development-team"
  CostCenter  = "development"
  Purpose     = "development-and-testing"
}
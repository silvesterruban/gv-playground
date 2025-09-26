# Production Environment Configuration
environment = "prod"
aws_region  = "us-east-1"

# Production-specific overrides
node_group_desired_size = 3
node_group_max_size     = 10
node_group_min_size     = 2
node_group_instance_types = ["t3.medium", "t3.large"]

# RDS Configuration for production
rds_instance_class        = "db.t3.medium"
rds_allocated_storage     = 100
rds_max_allocated_storage = 1000
rds_username              = "gvplayground"
rds_password              = "prod-secure-password-789"

# VPC Configuration
vpc_cidr = "10.2.0.0/16"
availability_zones = 3
enable_nat_gateway = true

# Additional Tags
tags = {
  Owner       = "production-team"
  CostCenter  = "production"
  Purpose     = "production-workloads"
  Compliance  = "required"
}
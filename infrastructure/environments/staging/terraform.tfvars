# Staging Environment Configuration
environment = "staging"
aws_region  = "us-east-1"

# Staging-specific overrides
node_group_desired_size = 2
node_group_max_size     = 4
node_group_min_size     = 1
node_group_instance_types = ["t3.medium"]

# RDS Configuration for staging
rds_instance_class        = "db.t3.small"
rds_allocated_storage     = 50
rds_max_allocated_storage = 100
rds_username              = "gvplayground"
rds_password              = "staging-password-456"

# VPC Configuration
vpc_cidr = "10.1.0.0/16"
availability_zones = 2
enable_nat_gateway = true

# Additional Tags
tags = {
  Owner       = "staging-team"
  CostCenter  = "staging"
  Purpose     = "pre-production-testing"
}
# GV Playground Environment Configuration
environment = "gv-playground"
aws_region  = "us-east-1"

# GV Playground-specific configuration
node_group_desired_size = 2
node_group_max_size     = 4
node_group_min_size     = 1
node_group_instance_types = ["t3.medium"]

# RDS Configuration for gv-playground
rds_instance_class        = "db.t3.micro"
rds_allocated_storage     = 20
rds_max_allocated_storage = 100
rds_username              = "gvplayground"
rds_password              = "gvplayground123"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = 2
enable_nat_gateway = true

# Additional Tags
tags = {
  Owner       = "gv-playground-team"
  CostCenter  = "gv-playground"
  Purpose     = "gv-playground-development"
  Environment = "gv-playground"
}
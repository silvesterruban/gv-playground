# GV Playground - Environment Agnostic Terraform Variables

variable "environment" {
  description = "Environment name (gv-playground, dev, staging, prod)"
  type        = string
  default     = "gv-playground"
  
  validation {
    condition     = contains(["gv-playground", "dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: gv-playground, dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "gv-playground"
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "node_group_desired_size" {
  description = "Desired number of nodes in the node group"
  type        = number
  default     = 2
}

variable "node_group_max_size" {
  description = "Maximum number of nodes in the node group"
  type        = number
  default     = 4
}

variable "node_group_min_size" {
  description = "Minimum number of nodes in the node group"
  type        = number
  default     = 1
}

variable "node_group_instance_types" {
  description = "Instance types for the node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_username" {
  description = "RDS master username"
  type        = string
  default     = "gvplayground"
}

variable "rds_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_vpn_gateway" {
  description = "Enable VPN Gateway"
  type        = bool
  default     = false
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in VPC"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Environment-specific configurations
locals {
  environment_config = {
    gv-playground = {
      node_group_desired_size = 2
      node_group_max_size     = 4
      node_group_min_size     = 1
      rds_instance_class      = "db.t3.micro"
      rds_allocated_storage   = 20
      enable_nat_gateway      = true
    }
    dev = {
      node_group_desired_size = 1
      node_group_max_size     = 2
      node_group_min_size     = 1
      rds_instance_class      = "db.t3.micro"
      rds_allocated_storage   = 20
      enable_nat_gateway      = false
    }
    staging = {
      node_group_desired_size = 2
      node_group_max_size     = 4
      node_group_min_size     = 1
      rds_instance_class      = "db.t3.small"
      rds_allocated_storage   = 50
      enable_nat_gateway      = true
    }
    prod = {
      node_group_desired_size = 3
      node_group_max_size     = 10
      node_group_min_size     = 2
      rds_instance_class      = "db.t3.medium"
      rds_allocated_storage   = 100
      enable_nat_gateway      = true
    }
  }
  
  config = local.environment_config[var.environment]
  
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      CreatedBy   = "terraform-environment-agnostic"
    },
    var.tags
  )
}
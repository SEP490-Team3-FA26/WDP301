terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: remote state on S3 (uncomment when ready)
  # backend "s3" {
  #   bucket = "wdp301-tf-state"
  #   key    = "infra/terraform.tfstate"
  #   region = "ap-southeast-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

# ─────────────────────────────────────────────────────────────
# Security Group Module
# ─────────────────────────────────────────────────────────────
module "security_group" {
  source      = "./modules/security-group"
  name        = "${var.project_name}-sg-${var.environment}"
  environment = var.environment
  tags        = local.common_tags
}

# ─────────────────────────────────────────────────────────────
# EC2 Module
# ─────────────────────────────────────────────────────────────
module "ec2" {
  source            = "./modules/ec2"
  name              = "${var.project_name}-${var.environment}"
  instance_type     = var.instance_type
  key_name          = var.key_name
  security_group_id = module.security_group.sg_id
  environment       = var.environment
  tags              = local.common_tags
}

# ─────────────────────────────────────────────────────────────
# Locals
# ─────────────────────────────────────────────────────────────
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = "DevOps"
  }
}

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
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

data "aws_caller_identity" "current" {}

# ─────────────────────────────────────────────────────────────
# Locals
# ─────────────────────────────────────────────────────────────
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  account_id  = data.aws_caller_identity.current.account_id

  # S3 bucket names must be globally unique → suffix with account id
  images_bucket = "${var.project_name}-images-${var.environment}-${local.account_id}"
  logs_bucket   = "${var.project_name}-logs-${var.environment}-${local.account_id}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = "DevOps"
  }
}

# ─────────────────────────────────────────────────────────────
# ECR — container image registry
# ─────────────────────────────────────────────────────────────
module "ecr" {
  source       = "./modules/ecr"
  repositories = var.ecr_repositories
  tags         = local.common_tags
}

# ─────────────────────────────────────────────────────────────
# S3 — images (private, served via presigned URLs) + logs
# ─────────────────────────────────────────────────────────────
module "s3_images" {
  source               = "./modules/s3-bucket"
  bucket_name          = local.images_bucket
  versioning           = false
  force_destroy        = var.environment == "dev"
  cors_allowed_origins = var.cors_allowed_origins
  tags                 = merge(local.common_tags, { Purpose = "images" })
}

module "s3_logs" {
  source          = "./modules/s3-bucket"
  bucket_name     = local.logs_bucket
  versioning      = false
  force_destroy   = var.environment == "dev"
  expiration_days = var.logs_expiration_days
  tags            = merge(local.common_tags, { Purpose = "logs" })
}

# ─────────────────────────────────────────────────────────────
# SQS — email job queue (+ DLQ)
# ─────────────────────────────────────────────────────────────
module "sqs_email" {
  source                     = "./modules/sqs"
  name                       = "${local.name_prefix}-email"
  environment                = var.environment
  visibility_timeout_seconds = 60 # >= lambda timeout
  tags                       = local.common_tags
}

# ─────────────────────────────────────────────────────────────
# SES — verified sending identities
# ─────────────────────────────────────────────────────────────
module "ses" {
  source = "./modules/ses"
  # When a domain is verified it covers every address @domain (incl. the
  # From), so we only verify the explicit extra identities (e.g. test
  # recipients while in sandbox). With NO domain, the From must itself be
  # verified as an individual email identity.
  email_identities = var.ses_domain_identity != "" ? var.ses_email_identities : distinct(concat([var.ses_from_email], var.ses_email_identities))
  domain_identity  = var.ses_domain_identity
  tags             = local.common_tags
}

# ─────────────────────────────────────────────────────────────
# Lambda — consume SQS, send mail via SES
# ─────────────────────────────────────────────────────────────
module "lambda_email" {
  source         = "./modules/lambda"
  name           = "${local.name_prefix}-email-sender"
  source_dir     = "${path.module}/lambda/email-sender"
  sqs_queue_arn  = module.sqs_email.queue_arn
  ses_region     = var.aws_region
  ses_from_email = var.ses_from_email
  tags           = local.common_tags
}

# ─────────────────────────────────────────────────────────────
# IAM — EC2 instance profile (ECR pull + S3 + SQS send)
# ─────────────────────────────────────────────────────────────
module "iam_ec2" {
  source         = "./modules/iam-ec2"
  name           = local.name_prefix
  s3_bucket_arns = [module.s3_images.bucket_arn, module.s3_logs.bucket_arn]
  sqs_queue_arn  = module.sqs_email.queue_arn
  tags           = local.common_tags
}

# ─────────────────────────────────────────────────────────────
# Security Group
# ─────────────────────────────────────────────────────────────
module "security_group" {
  source      = "./modules/security-group"
  name        = "${var.project_name}-sg-${var.environment}"
  environment = var.environment
  tags        = local.common_tags
}

# ─────────────────────────────────────────────────────────────
# EC2 — runs the backend via docker-compose (images from ECR)
# ─────────────────────────────────────────────────────────────
module "ec2" {
  source                = "./modules/ec2"
  name                  = local.name_prefix
  instance_type         = var.instance_type
  key_name              = var.key_name
  security_group_id     = module.security_group.sg_id
  instance_profile_name = module.iam_ec2.instance_profile_name
  aws_region            = var.aws_region
  environment           = var.environment
  tags                  = local.common_tags
}

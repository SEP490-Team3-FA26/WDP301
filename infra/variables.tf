variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project identifier prefix for all resources"
  type        = string
  default     = "wdp301"
}

variable "environment" {
  description = "Deployment environment (dev | prod)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be 'dev' or 'prod'."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3a.large"
}

variable "key_name" {
  description = "Name of the EC2 key pair (must already exist in AWS)"
  type        = string
}

# ─────────────────────────────────────────────────────────────
# ECR
# ─────────────────────────────────────────────────────────────
variable "ecr_repositories" {
  description = "ECR repository names to create (one per image)"
  type        = list(string)
  default     = ["wdp301-backend", "wdp301-frontend"]
}

# ─────────────────────────────────────────────────────────────
# SES (email)
# ─────────────────────────────────────────────────────────────
variable "ses_from_email" {
  description = "Default From address for outgoing email (must be SES-verified)"
  type        = string
}

variable "ses_email_identities" {
  description = "Email addresses to verify in SES (include ses_from_email). While in sandbox, recipients must also be verified."
  type        = list(string)
  default     = []
}

variable "ses_domain_identity" {
  description = "Optional domain to verify in SES (empty = skip)"
  type        = string
  default     = ""
}

# ─────────────────────────────────────────────────────────────
# Misc
# ─────────────────────────────────────────────────────────────
variable "cors_allowed_origins" {
  description = "Allowed origins for the images bucket CORS (e.g. frontend URL)"
  type        = list(string)
  default     = ["*"]
}

variable "logs_expiration_days" {
  description = "Auto-delete objects in the logs bucket after N days"
  type        = number
  default     = 30
}

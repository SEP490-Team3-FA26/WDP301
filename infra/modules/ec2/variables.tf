# ─────────────────────────────────────────────────────────────
# EC2 Module — variables.tf
# ─────────────────────────────────────────────────────────────
variable "name" { type = string }
variable "instance_type" { type = string }
variable "key_name" { type = string }
variable "security_group_id" { type = string }
variable "environment" { type = string }

# IAM instance profile (grants ECR/S3/SQS access without static keys)
variable "instance_profile_name" {
  type    = string
  default = null
}

# AWS region — used by user-data to log docker into ECR
variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "tags" {
  type    = map(string)
  default = {}
}

# Ubuntu 22.04 LTS AMI — ap-southeast-1 (update for other regions)
variable "ami_id" {
  type    = string
  default = "ami-0df7a207adb9748c7"
}

variable "root_volume_size" {
  type    = number
  default = 20
}

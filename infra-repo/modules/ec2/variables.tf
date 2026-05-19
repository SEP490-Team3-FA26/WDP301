# ─────────────────────────────────────────────────────────────
# EC2 Module — variables.tf
# ─────────────────────────────────────────────────────────────
variable "name"              { type = string }
variable "instance_type"     { type = string }
variable "key_name"          { type = string }
variable "security_group_id" { type = string }
variable "environment"       { type = string }
variable "tags"              { type = map(string); default = {} }

# Ubuntu 22.04 LTS AMI — ap-southeast-1 (update for other regions)
variable "ami_id" {
  type    = string
  default = "ami-0df7a207adb9748c7"
}

variable "root_volume_size" {
  type    = number
  default = 20
}

# ─────────────────────────────────────────────────────────────
# ECR Module — one repository per service image
# ─────────────────────────────────────────────────────────────
variable "repositories" {
  description = "List of ECR repository names to create"
  type        = list(string)
}

variable "image_retention_count" {
  description = "How many tagged images to keep per repo"
  type        = number
  default     = 10
}

variable "tags" {
  type    = map(string)
  default = {}
}

resource "aws_ecr_repository" "this" {
  for_each = toset(var.repositories)

  name                 = each.value
  image_tag_mutability = "MUTABLE"
  force_delete         = true # allow `terraform destroy` even with images present

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(var.tags, { Name = each.value })
}

# Keep the repo tidy: expire untagged + cap tagged image count
resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep only the last ${var.image_retention_count} tagged images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.image_retention_count
        }
        action = { type = "expire" }
      }
    ]
  })
}

output "repository_urls" {
  description = "Map of repo name -> repository URL (use as image registry)"
  value       = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}

output "repository_arns" {
  value = { for k, r in aws_ecr_repository.this : k => r.arn }
}

output "registry_id" {
  description = "ECR registry account id (for docker login)"
  value       = values(aws_ecr_repository.this)[0].registry_id
}

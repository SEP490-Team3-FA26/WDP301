# ─────────────────────────────────────────────────────────────
# EC2 / network
# ─────────────────────────────────────────────────────────────
output "ec2_public_ip" {
  description = "Public IP of the EC2 instance — point your DNS here"
  value       = module.ec2.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = module.ec2.instance_id
}

output "security_group_id" {
  description = "ID of the security group"
  value       = module.security_group.sg_id
}

output "ssh_command" {
  description = "Ready-to-use SSH command"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${module.ec2.public_ip}"
}

# ─────────────────────────────────────────────────────────────
# ECR — use these as image registry URLs in CI/CD
# ─────────────────────────────────────────────────────────────
output "ecr_repository_urls" {
  description = "Map of repo name -> ECR URL"
  value       = module.ecr.repository_urls
}

output "ecr_registry" {
  description = "ECR registry host (for docker login)"
  value       = "${module.ecr.registry_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

# ─────────────────────────────────────────────────────────────
# S3
# ─────────────────────────────────────────────────────────────
output "s3_images_bucket" {
  description = "Bucket for image storage (set as S3_IMAGES_BUCKET in backend)"
  value       = module.s3_images.bucket_name
}

output "s3_logs_bucket" {
  description = "Bucket for application logs (set as S3_LOGS_BUCKET in backend)"
  value       = module.s3_logs.bucket_name
}

# ─────────────────────────────────────────────────────────────
# SQS — backend publishes email jobs here
# ─────────────────────────────────────────────────────────────
output "sqs_email_queue_url" {
  description = "Set as SQS_EMAIL_QUEUE_URL in the backend"
  value       = module.sqs_email.queue_url
}

output "sqs_email_queue_arn" {
  value = module.sqs_email.queue_arn
}

output "sqs_email_dlq_url" {
  value = module.sqs_email.dlq_url
}

# ─────────────────────────────────────────────────────────────
# Lambda / SES
# ─────────────────────────────────────────────────────────────
output "lambda_email_function" {
  value = module.lambda_email.function_name
}

output "ses_domain_verification_token" {
  description = "TXT record value for _amazonses.<domain> (null if no domain)"
  value       = module.ses.domain_verification_token
}

output "ses_dkim_tokens" {
  description = "CNAME records for DKIM (empty if no domain)"
  value       = module.ses.dkim_tokens
}

# ─────────────────────────────────────────────────────────────
# Handy summary block for filling the backend .env
# ─────────────────────────────────────────────────────────────
output "backend_env_hints" {
  description = "Copy these into the EC2 backend .env"
  value       = <<-EOT
    AWS_REGION=${var.aws_region}
    S3_IMAGES_BUCKET=${module.s3_images.bucket_name}
    S3_LOGS_BUCKET=${module.s3_logs.bucket_name}
    SQS_EMAIL_QUEUE_URL=${module.sqs_email.queue_url}
    SES_FROM_EMAIL=${var.ses_from_email}
  EOT
}

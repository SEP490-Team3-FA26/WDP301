aws_region    = "ap-southeast-1"
project_name  = "wdp301"
environment   = "prod"
instance_type = "t3a.large"
key_name      = "YOUR_KEY_PAIR_NAME"

# ECR repos (one per docker image)
ecr_repositories = ["wdp301-backend", "wdp301-frontend"]

# SES — verify the From address (+ domain recommended for prod).
ses_from_email       = "no-reply@yourdomain.com"
ses_email_identities = ["no-reply@yourdomain.com"]
# ses_domain_identity = "yourdomain.com"   # recommended for prod

# CORS origins for the images bucket (your real frontend domain)
cors_allowed_origins = ["https://yourdomain.com"]

logs_expiration_days = 90

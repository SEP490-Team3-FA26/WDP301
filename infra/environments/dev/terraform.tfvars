aws_region    = "ap-southeast-1"
project_name  = "wdp301"
environment   = "dev"
instance_type = "t3.small"
key_name      = "wdp301-key"

# ECR repos — chỉ backend (frontend deploy bởi Vercel)
ecr_repositories = ["wdp301-backend"]

# SES — verify the whole domain (covers any @abcpharmacy.store sender).
ses_from_email      = "no-reply@abcpharmacy.store"
ses_domain_identity = "abcpharmacy.store"
# While SES is in SANDBOX you can only send TO verified addresses — add any
# real mailbox you want to test with here (e.g. your gmail). Leave empty once
# production access is granted (then you can send to anyone).
ses_email_identities = []

# CORS origins for the images bucket = domain Vercel của frontend
cors_allowed_origins = ["https://abcpharmacy.store", "https://www.abcpharmacy.store", "http://localhost:3000"]

logs_expiration_days = 14

# ─────────────────────────────────────────────────────────────
# Reusable S3 Bucket Module
#   - Encrypted (SSE-S3), versioning optional
#   - Public access blocked by default (serve via presigned URL / CDN)
#   - Optional lifecycle expiration (handy for logs)
# ─────────────────────────────────────────────────────────────
variable "bucket_name" { type = string }

variable "versioning" {
  type    = bool
  default = false
}

variable "force_destroy" {
  type    = bool
  default = false
}

# Days after which objects expire. 0 = never expire.
variable "expiration_days" {
  type    = number
  default = 0
}

# CORS allowed origins (e.g. frontend URL). Empty = no CORS rule.
variable "cors_allowed_origins" {
  type    = list(string)
  default = []
}

variable "tags" {
  type    = map(string)
  default = {}
}

resource "aws_s3_bucket" "this" {
  bucket        = var.bucket_name
  force_destroy = var.force_destroy
  tags          = merge(var.tags, { Name = var.bucket_name })
}

resource "aws_s3_bucket_ownership_controls" "this" {
  bucket = aws_s3_bucket.this.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = var.versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  count  = var.expiration_days > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id

  rule {
    id     = "expire-objects"
    status = "Enabled"
    filter {}
    expiration { days = var.expiration_days }
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}

resource "aws_s3_bucket_cors_configuration" "this" {
  count  = length(var.cors_allowed_origins) > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

output "bucket_id" { value = aws_s3_bucket.this.id }
output "bucket_arn" { value = aws_s3_bucket.this.arn }
output "bucket_name" { value = aws_s3_bucket.this.bucket }
output "bucket_regional_domain_name" { value = aws_s3_bucket.this.bucket_regional_domain_name }

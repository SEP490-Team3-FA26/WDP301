# ─────────────────────────────────────────────────────────────
# SES Module — verified identities for sending email
#
# Sandbox note: a brand-new SES account is in SANDBOX mode — you can
# only send TO verified identities, and at low rate. To send to anyone,
# open the AWS console -> SES -> "Request production access" (~24h).
#
#   - email_identities: simplest, verify each From/To address
#   - domain_identity:  verify a whole domain (lets you send from any
#                       address @domain). Requires adding DNS records.
# ─────────────────────────────────────────────────────────────
variable "email_identities" {
  description = "Email addresses to verify (e.g. no-reply@yourdomain.com)"
  type        = list(string)
  default     = []
}

variable "domain_identity" {
  description = "Optional domain to verify for sending (empty = skip)"
  type        = string
  default     = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}

# ── Email-address identities ──────────────────────────────────
# After apply, AWS sends a confirmation link to each address — click it.
resource "aws_ses_email_identity" "this" {
  for_each = toset(var.email_identities)
  email    = each.value
}

# ── Domain identity (optional) ────────────────────────────────
resource "aws_ses_domain_identity" "this" {
  count  = var.domain_identity != "" ? 1 : 0
  domain = var.domain_identity
}

resource "aws_ses_domain_dkim" "this" {
  count  = var.domain_identity != "" ? 1 : 0
  domain = aws_ses_domain_identity.this[0].domain
}

output "email_identity_arns" {
  value = { for k, v in aws_ses_email_identity.this : k => v.arn }
}

output "domain_verification_token" {
  description = "Add this as a TXT record _amazonses.<domain> to verify the domain"
  value       = var.domain_identity != "" ? aws_ses_domain_identity.this[0].verification_token : null
}

output "dkim_tokens" {
  description = "Add these as CNAME records (<token>._domainkey.<domain>) for DKIM"
  value       = var.domain_identity != "" ? aws_ses_domain_dkim.this[0].dkim_tokens : []
}

# ─────────────────────────────────────────────────────────────
# SQS Module — email queue + dead-letter queue
#   Producer: backend (auth-service) sends email jobs
#   Consumer: Lambda (email-sender) -> SES
# ─────────────────────────────────────────────────────────────
variable "name" { type = string } # base name, e.g. wdp301-email-dev
variable "environment" { type = string }

# Visibility timeout MUST be >= Lambda timeout (AWS requirement).
variable "visibility_timeout_seconds" {
  type    = number
  default = 60
}

variable "max_receive_count" {
  type    = number
  default = 5
}

variable "message_retention_seconds" {
  type    = number
  default = 345600 # 4 days
}

variable "tags" {
  type    = map(string)
  default = {}
}

# Dead-letter queue: messages that fail max_receive_count times land here
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.name}-dlq"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true
  tags                      = merge(var.tags, { Name = "${var.name}-dlq" })
}

resource "aws_sqs_queue" "main" {
  name                       = var.name
  visibility_timeout_seconds = var.visibility_timeout_seconds
  message_retention_seconds  = var.message_retention_seconds
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(var.tags, { Name = var.name })
}

output "queue_url" { value = aws_sqs_queue.main.url }
output "queue_arn" { value = aws_sqs_queue.main.arn }
output "queue_name" { value = aws_sqs_queue.main.name }
output "dlq_url" { value = aws_sqs_queue.dlq.url }
output "dlq_arn" { value = aws_sqs_queue.dlq.arn }

# ─────────────────────────────────────────────────────────────
# IAM Module — EC2 instance profile
#   Lets the backend on EC2 (no static keys) to:
#     - pull images from ECR
#     - read/write the images + logs S3 buckets
#     - send email jobs to the SQS queue
#     - be managed via SSM Session Manager (optional, handy)
# ─────────────────────────────────────────────────────────────
variable "name" { type = string }
variable "s3_bucket_arns" { type = list(string) } # images + logs
variable "sqs_queue_arn" { type = string }

variable "enable_ssm" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "${var.name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
  tags               = var.tags
}

# ── App permissions: ECR pull + S3 + SQS send ─────────────────
data "aws_iam_policy_document" "app" {
  statement {
    sid    = "ECRPull"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
    ]
    resources = ["*"] # GetAuthorizationToken requires *
  }

  statement {
    sid    = "S3Objects"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = concat(
      var.s3_bucket_arns,
      [for arn in var.s3_bucket_arns : "${arn}/*"],
    )
  }

  statement {
    sid    = "SQSSend"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
    ]
    resources = [var.sqs_queue_arn]
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "${var.name}-ec2-app-policy"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.app.json
}

# ── Optional: SSM Session Manager (shell without SSH keys) ─────
resource "aws_iam_role_policy_attachment" "ssm" {
  count      = var.enable_ssm ? 1 : 0
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "this" {
  name = "${var.name}-ec2-profile"
  role = aws_iam_role.this.name
  tags = var.tags
}

output "instance_profile_name" { value = aws_iam_instance_profile.this.name }
output "role_arn" { value = aws_iam_role.this.arn }

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ─────────────────────────────────────────────────────────────
# Elastic IP — persists across reboots
# ─────────────────────────────────────────────────────────────
resource "aws_eip" "this" {
  instance = aws_instance.this.id
  domain   = "vpc"
  tags     = merge(var.tags, { Name = "${var.name}-eip" })
}

# ─────────────────────────────────────────────────────────────
# EC2 Instance
# ─────────────────────────────────────────────────────────────
resource "aws_instance" "this" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = tolist(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids = [var.security_group_id]
  iam_instance_profile   = var.instance_profile_name

  # instance_market_options {
  #   market_type = "spot"
  # }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = true
  }

  # Bootstrap user data: Docker engine + compose plugin + AWS CLI,
  # plus a helper to log docker into ECR using the instance role.
  user_data = <<-EOF
    #!/bin/bash
    set -e
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -yq curl wget git unzip ca-certificates gnupg lsb-release

    # --- Docker Engine + compose plugin (official repo) ---
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    usermod -aG docker ubuntu

    # --- AWS CLI v2 ---
    ARCH=$(uname -m); [ "$ARCH" = "aarch64" ] && AWS_ARCH=aarch64 || AWS_ARCH=x86_64
    curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$${AWS_ARCH}.zip" -o /tmp/awscliv2.zip
    unzip -q /tmp/awscliv2.zip -d /tmp && /tmp/aws/install --update

    # --- App directory ---
    mkdir -p /opt/wdp301 && chown ubuntu:ubuntu /opt/wdp301

    # --- ECR login helper (uses the EC2 instance role) ---
    cat > /usr/local/bin/ecr-login <<'SCRIPT'
    #!/bin/bash
    aws ecr get-login-password --region ${var.aws_region} \
      | docker login --username AWS --password-stdin \
        "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${var.aws_region}.amazonaws.com"
    SCRIPT
    chmod +x /usr/local/bin/ecr-login

    echo "Bootstrap complete $(date)" >> /var/log/user-data.log
  EOF

  user_data_replace_on_change = true

  metadata_options {
    http_tokens   = "required" # IMDSv2 only
    http_endpoint = "enabled"
  }

  tags = merge(var.tags, { Name = var.name })
}

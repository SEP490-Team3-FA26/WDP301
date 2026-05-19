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

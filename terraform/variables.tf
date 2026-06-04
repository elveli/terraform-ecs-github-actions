variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "Base CIDR block for the VPC"
  type        = string
  default     = "10.42.0.0/16" 
}

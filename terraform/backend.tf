terraform {
  backend "s3" {
    bucket         = "my-org-tf-state-12345"
    key            = "ecs-hello-world/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }
}

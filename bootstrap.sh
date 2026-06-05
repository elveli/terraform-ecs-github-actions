#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 AWS ECS Fargate & GitHub Actions Auto-Bootstrapper"
echo "=========================================================="
echo "This script will automatically:"
echo "  1. Create an S3 Bucket & DynamoDB table for Terraform state"
echo "  2. Configure AWS OIDC for passwordless GitHub Actions"
echo "  3. Generate your GitHub Actions workflow file"
echo "  4. Setup your Terraform Backend"
echo ""

# Get user inputs
read -p "Enter your GitHub repository (e.g. octocat/my-ecs-app): " GITHUB_REPO
read -p "Enter AWS Region [us-east-1]: " INPUT_REGION
AWS_REGION=${INPUT_REGION:-us-east-1}

read -p "Enter a globally unique name for your Terraform state S3 bucket (e.g. my-org-tf-state-12345): " TF_STATE_BUCKET

echo ""
echo "⚙️  Initializing Bootstrap Terraform..."
cd bootstrap
terraform init

echo ""
echo "⚙️  Applying Bootstrap Configuration to AWS..."
terraform apply -var="github_repo=$GITHUB_REPO" -var="aws_region=$AWS_REGION" -var="bucket_name=$TF_STATE_BUCKET" -auto-approve

ROLE_ARN=$(terraform output -raw github_actions_role_arn)
cd ..

echo ""
echo "📝 Generating GitHub Actions Workflow..."
mkdir -p .github/workflows
sed "s|YOUR_ROLE_ARN_HERE|$ROLE_ARN|g; s|YOUR_REGION_HERE|$AWS_REGION|g" github-actions-template/deploy.yml > .github/workflows/deploy.yml

echo "📝 Generating main Terraform Backend Configuration..."
cat <<EOF > terraform/backend.tf
terraform {
  backend "s3" {
    bucket         = "$TF_STATE_BUCKET"
    key            = "ecs-hello-world/terraform.tfstate"
    region         = "$AWS_REGION"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }
}
EOF

echo "=========================================================="
echo "✅ Setup Complete! Your repository is fully configured."
echo "=========================================================="
echo "Next steps:"
echo "  1. git add ."
echo "  2. git commit -m 'Initial bootstrap setup'"
echo "  3. git push origin main"
echo "  4. Go to the Actions tab in GitHub and run the deployment pipeline!"
echo ""

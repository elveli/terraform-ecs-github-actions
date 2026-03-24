# ECS Fargate Spot Deployer

A simple GitHub Actions and Terraform project to deploy a containerized Hello World app to AWS ECS using Fargate Spot instances.

## Features
* **Infrastructure as Code**: Uses Terraform to provision AWS resources.
* **Cost-Effective**: Deploys to AWS ECS using Fargate Spot capacity providers.
* **CI/CD Ready**: Includes a GitHub Actions workflow for manual deployment and destruction.

## Prerequisites
* An AWS Account.
* An IAM User with permissions to create VPCs, ECS Clusters, IAM Roles, and Security Groups.

## Setup Instructions

1. **Add AWS Secrets to GitHub**
   Go to your repository's **Settings > Secrets and variables > Actions** and add the following repository secrets:
   * `AWS_ACCESS_KEY_ID`: Your AWS access key.
   * `AWS_SECRET_ACCESS_KEY`: Your AWS secret key.

2. **(Optional) Configure Remote State**
   By default, this project uses local Terraform state, which means state is lost between GitHub Actions runs. For continuous use, uncomment the `backend "s3"` block in `terraform/main.tf` and configure an S3 bucket and DynamoDB table.

## Usage

This project uses a `workflow_dispatch` trigger, allowing you to run it manually from the GitHub UI.

1. Go to the **Actions** tab in your GitHub repository.
2. Select the **Deploy ECS App with Terraform** workflow from the left sidebar.
3. Click the **Run workflow** dropdown.
4. Select the action you want to perform:
   * `apply`: Provisions or updates the infrastructure.
   * `destroy`: Tears down all provisioned resources.
5. Click the green **Run workflow** button.

## Resources Created
* VPC with public subnets
* ECS Cluster
* Fargate Spot Capacity Provider strategy
* Security Group (allowing port 80)
* IAM Task Execution Role
* ECS Task Definition (running `nginxdemos/hello`)
* ECS Service

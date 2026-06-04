/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, Copy, Terminal, Github, Cloud, FileCode2, ArrowRight } from 'lucide-react';

export default function App() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const files = [
    {
      name: 'README.md',
      icon: <FileCode2 className="w-5 h-5 text-gray-600" />,
      description: 'Project documentation and setup instructions.',
      code: `# AWS ECS Fargate Spot GitHub Actions Deployer

This repository contains everything you need to deploy a simple "Hello World" Docker container to AWS ECS using Fargate Spot instances, orchestrated by GitHub Actions and Terraform.

It uses **OIDC (OpenID Connect)**, which means you do not need to store long-lived AWS IAM secrets in GitHub.

---

## 🛠️ What Files to Edit Before Deploying

Before you can run the GitHub Action, you need to configure the project for your specific AWS and GitHub environments.

### 1. \`terraform/oidc.tf\` (Run this locally FIRST)
GitHub Actions needs an IAM Role to assume. You must create this role *once* from your local machine before the pipeline can deploy the rest of the application.
* **Edit:** Change the \`github_repo\` variable default value to your actual org/repo (e.g., \`timo/my-ecs-repo\`).
* **Action:** Ensure your AWS CLI is configured locally, then use target applying so you *only* build the OIDC role for now:
  \`\`\`bash
  cd terraform
  terraform init
  terraform apply -target=aws_iam_role.github_actions -target=aws_iam_openid_connect_provider.github -target=aws_iam_role_policy_attachment.github_actions_admin
  \`\`\`
* **Result:** Terraform will output a \`github_actions_role_arn\`. Copy this for the next step.

### 2. \`github-actions-template/deploy.yml\` (The Pipeline)
* **Edit:** Paste the \`github_actions_role_arn\` (from Step 1) into the \`AWS_ROLE_ARN\` environment variable.
* **Edit (Optional):** Change \`AWS_REGION\` if you don't want to use \`us-east-1\`.
* **Action:** Move this file into the official GitHub Actions folder path within your repo: \`.github/workflows/deploy.yml\`.

### 3. \`terraform/main.tf\` (Crucial for CI/CD)
By default, this repository uses *local* state. If GitHub Actions runs twice using local state on ephemeral runners, it will forget what it built the first time and fail.
* **Edit:** Uncomment the \`backend "s3" { ... }\` block at the top of the file.
* **Edit:** Replace \`bucket = "my-terraform-state-bucket"\` with the name of an actual, existing S3 bucket in your AWS account. *(Note: You must create this bucket manually in AWS first if you haven't already).*

### 4. \`terraform/variables.tf\` (Infrastructure Config)
* **Edit (Optional):** Update the \`aws_region\` default to match if you changed it in the pipeline workflow.
* **Edit (Optional):** Update \`vpc_cidr\` to your desired VPC IP range if you want to change it from the default \`10.42.0.0/16\`.

---

## 🚀 How to Deploy

Once you have made the edits above, committed, and pushed the code to your GitHub repository:

1. Go to the **Actions** tab in your GitHub repository.
2. Select the **Deploy ECS App with Terraform** workflow on the left.
3. Click the **Run workflow** button on the right.
4. Keep the action set to **\`apply\`** and click the green check button.
5. GitHub Actions will securely assume your AWS role via OIDC and deploy the VPC, ECS Cluster, and Fargate tasks automatically.

---

## 🗑️ How to Tear Down / Destroy

To avoid AWS charges, you can cleanly tear down the infrastructure directly from GitHub Actions:

1. Go to the **Actions** tab > **Deploy ECS App with Terraform**.
2. Click **Run workflow**.
3. Change the action dropdown from \`apply\` to **\`destroy\`**.
4. Click Run. Terraform will securely delete all the AWS resources it created.`
    },
    {
      name: 'github-actions-template/deploy.yml',
      icon: <Github className="w-5 h-5 text-gray-700" />,
      description: 'GitHub Actions workflow. (Move this to .github/workflows/ after exporting)',
      code: `name: Deploy ECS App with Terraform

on:
  workflow_dispatch:
    inputs:
      action:
        description: 'Terraform Action to perform'
        required: true
        default: 'apply'
        type: choice
        options:
          - apply
          - destroy

env:
  AWS_REGION: "us-east-1"
  # Replace with your actual AWS Account ID and Role Name
  AWS_ROLE_ARN: "arn:aws:iam::123456789012:role/GitHubActionsECSRole"

permissions:
  id-token: write # This is required for requesting the OIDC JWT
  contents: read  # This is required for actions/checkout

jobs:
  terraform:
    name: 'Terraform'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./terraform

    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Configure AWS credentials via OIDC
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: \${{ env.AWS_ROLE_ARN }}
        aws-region: \${{ env.AWS_REGION }}

    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v3

    - name: Terraform Init
      run: terraform init

    - name: Terraform Plan
      if: github.event.inputs.action == 'apply'
      run: terraform plan -out=tfplan

    - name: Terraform Apply
      if: github.event.inputs.action == 'apply'
      run: terraform apply -auto-approve tfplan

    - name: Terraform Destroy
      if: github.event.inputs.action == 'destroy'
      run: terraform destroy -auto-approve`
    },
    {
      name: 'terraform/oidc.tf',
      icon: <FileCode2 className="w-5 h-5 text-purple-600" />,
      description: 'Terraform configuration to set up the AWS OIDC Provider and IAM Role.',
      code: `# This file sets up the OIDC Provider and IAM Role for GitHub Actions.
# NOTE: You must apply this locally ONCE using your personal AWS credentials 
# before GitHub Actions can use the OIDC role to deploy the rest of the infrastructure.

variable "github_repo" {
  description = "GitHub repository in the format org/repo (e.g., my-org/my-repo)"
  type        = string
  default     = "YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]
}

resource "aws_iam_role" "github_actions" {
  name = "GitHubActionsECSRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:\${var.github_repo}:*"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_actions_admin" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}`
    },
    {
      name: 'terraform/variables.tf',
      icon: <FileCode2 className="w-5 h-5 text-gray-500" />,
      description: 'Terraform input variables, including a configurable VPC CIDR block.',
      code: `variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "Base CIDR block for the VPC"
  type        = string
  default     = "10.42.0.0/16" 
}`
    },
    {
      name: 'terraform/main.tf',
      icon: <FileCode2 className="w-5 h-5 text-blue-600" />,
      description: 'Terraform configuration for VPC, ECS Cluster, Fargate Spot, and Task Definition.',
      code: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  name = "hello-world-vpc"
  cidr = var.vpc_cidr
  azs             = ["\${var.aws_region}a", "\${var.aws_region}b"]
  public_subnets  = [cidrsubnet(var.vpc_cidr, 8, 1), cidrsubnet(var.vpc_cidr, 8, 2)]
  map_public_ip_on_launch = true
}

resource "aws_ecs_cluster" "main" {
  name = "hello-world-cluster"
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  default_capacity_provider_strategy {
    base              = 0
    weight            = 1
    capacity_provider = "FARGATE_SPOT"
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "hello-world-ecs-tasks-sg"
  vpc_id      = module.vpc.vpc_id
  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "hello-world-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "hello_world" {
  family                   = "hello-world-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  container_definitions = jsonencode([{
    name      = "hello-world"
    image     = "nginxdemos/hello:latest"
    essential = true
    portMappings = [{ containerPort = 80, hostPort = 80, protocol = "tcp" }]
  }])
}

resource "aws_ecs_service" "hello_world" {
  name            = "hello-world-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.hello_world.arn
  desired_count   = 1
  network_configuration {
    subnets          = module.vpc.public_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
  }
}`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Cloud className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ECS Fargate Spot Deployer</h1>
              <p className="text-gray-500">Your GitHub Actions & Terraform setup is ready.</p>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm">1</span>
                Export
              </div>
              <p className="text-sm text-gray-600">Export this project to GitHub. It should work now!</p>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm">2</span>
                Move Workflow
              </div>
              <p className="text-sm text-gray-600">In your repo, move <code>github-actions-template/deploy.yml</code> to <code>.github/workflows/deploy.yml</code>.</p>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm">3</span>
                Apply OIDC
              </div>
              <p className="text-sm text-gray-600">Run <code>terraform apply</code> locally on <code>oidc.tf</code> to create the IAM Role.</p>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm">4</span>
                Run Action
              </div>
              <p className="text-sm text-gray-600">Update <code>AWS_ROLE_ARN</code> in the workflow, push, and run it from the Actions tab.</p>
            </div>
          </div>
        </div>

        {/* Files */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Terminal className="w-5 h-5" /> Generated Files
          </h2>
          
          {files.map((file, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  {file.icon}
                  <div>
                    <h3 className="font-mono text-sm font-semibold">{file.name}</h3>
                    <p className="text-xs text-gray-500">{file.description}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleCopy(file.code, file.name)}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy code"
                >
                  {copied === file.name ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="p-4 overflow-x-auto bg-gray-900">
                <pre className="text-sm text-gray-300 font-mono">
                  <code>{file.code}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Important Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800">
          <h4 className="font-semibold mb-2">Important Note on Terraform State</h4>
          <p className="text-sm">
            This simple example uses local state. If you run this in GitHub Actions multiple times, the state is lost between runs. For a production setup, you should uncomment the <code>backend "s3"</code> block in <code>main.tf</code> and configure an AWS S3 bucket and DynamoDB table to store your Terraform state remotely.
          </p>
        </div>

      </div>
    </div>
  );
}


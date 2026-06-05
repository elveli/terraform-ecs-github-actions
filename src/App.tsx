/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, Copy, Terminal, Github, Cloud, FileCode2, Command } from 'lucide-react';

export default function App() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const files = [
    {
      name: 'bootstrap.sh',
      icon: <Terminal className="w-5 h-5 text-green-600" />,
      description: 'Run this once locally to fully automate OIDC, S3 state backend setup, and YAML injection.',
      code: `#!/bin/bash
set -e

echo "🚀 AWS ECS Fargate & GitHub Actions Auto-Bootstrapper"
read -p "Enter your GitHub repository (e.g. octocat/my-ecs-app): " GITHUB_REPO
read -p "Enter AWS Region [us-east-1]: " INPUT_REGION
AWS_REGION=\${INPUT_REGION:-us-east-1}
read -p "Enter a globally unique name for your Terraform state S3 bucket: " TF_STATE_BUCKET

cd bootstrap
terraform init
terraform apply -var="github_repo=$GITHUB_REPO" -var="aws_region=$AWS_REGION" -var="bucket_name=$TF_STATE_BUCKET" -auto-approve

ROLE_ARN=$(terraform output -raw github_actions_role_arn)
cd ..

mkdir -p .github/workflows
sed "s|YOUR_ROLE_ARN_HERE|$ROLE_ARN|g; s|YOUR_REGION_HERE|$AWS_REGION|g" github-actions-template/deploy.yml > .github/workflows/deploy.yml

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
echo "✅ Setup Complete!"`
    },
    {
      name: 'README.md',
      icon: <FileCode2 className="w-5 h-5 text-gray-600" />,
      description: 'Project documentation and setup instructions.',
      code: `# AWS ECS Fargate Spot GitHub Actions Deployer

This repository contains everything you need to deploy a simple "Hello World" Docker container to AWS ECS using Fargate Spot instances, orchestrated by GitHub Actions and Terraform.

It uses **OIDC (OpenID Connect)**, which means you do not need to store long-lived AWS IAM secrets in GitHub.

---

## 🛠️ Quickstart Bootstrapping

We have fully automated the setup process. You no longer need to manually copy ARNs, move template files, or manually setup your Terraform S3 backend.

To configure OIDC, your Remote Backend, and your workflows all at once, open your terminal at the root of this project and run:

\`\`\`bash
bash bootstrap.sh
\`\`\`

**The script will prompt you for:**
1. Your GitHub respository name (e.g., \`octocat/my-ecs-demo\`).
2. Your desired AWS region.
3. A name for a new S3 bucket to securely store your Terraform state.

The script then provisions the AWS OIDC identity, creates the state bucket with DynamoDB locking, configures your GitHub Actions YAML file, and generates \`terraform/backend.tf\`. 

---

## 🚀 How to Deploy

Once you have run the \`bootstrap.sh\` script, committed, and pushed the code to your GitHub repository:

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
4. Click Run. Terraform will securely delete all the AWS resources it created.

---

## 🔍 Troubleshooting & Verification

**Important Note:** This project deploys to **AWS ECS (Elastic Container Service)**, which is Amazon's native container orchestration service, **NOT** Kubernetes (EKS). Therefore, tools like \`kubectl\` are not used here. Instead, you use the AWS CLI or the AWS Management Console to inspect your deployments.

Here are the equivalent AWS CLI commands to verify your deployment (similar to common \`kubectl\` commands):

### 1. View Clusters (Like \`kubectl get nodes / namespaces\`)
Check that your ECS cluster deployed successfully:
\`\`\`bash
aws ecs list-clusters
\`\`\`

### 2. View Services (Like \`kubectl get deployments\`)
List the services running in your cluster to ensure the \`hello-world-service\` is active:
\`\`\`bash
aws ecs list-services --cluster hello-world-cluster
\`\`\`
To see detailed status of the service (desired vs. running count):
\`\`\`bash
aws ecs describe-services --cluster hello-world-cluster --services hello-world-service
\`\`\`

### 3. View Tasks (Like \`kubectl get pods\`)
In ECS, containers run inside "Tasks" (equivalent to Pods). To list running tasks:
\`\`\`bash
aws ecs list-tasks --cluster hello-world-cluster
\`\`\`
To get the details of a specific task (replace \`<TASK_ID>\` with an ID from the output above):
\`\`\`bash
aws ecs describe-tasks --cluster hello-world-cluster --tasks <TASK_ID>
\`\`\`

### 4. Get the Public App URL (Like \`kubectl get svc\`)
If your task is running, it will have a public IP address (since we put it in a public subnet for this demo). To find it using the CLI:
1. Copy the "Network Interface ID" (eni-xxxxxx) from the \`describe-tasks\` output above.
2. Query EC2 for the public IP attached to that ENI:
\`\`\`bash
aws ec2 describe-network-interfaces --network-interface-ids eni-xxxxxxxxxxxxxxxxx --query 'NetworkInterfaces[0].Association.PublicIp' --output text
\`\`\`
3. Open \`http://<THAT_IP>\` in your browser!

**(Pro Tip: It is usually much faster to just log into the AWS Console > ECS > Clusters > Tasks > click the Task ID > look for "Public IP" under the Networking tab!).**

### Common Issues
* **Tasks keep stopping/restarting (Like \`CrashLoopBackOff\`):** This usually means the Docker container is crashing on startup. Check the AWS CloudWatch logs for your ECS Task.
* **Cannot reach the IP:** Ensure you are accessing over HTTP (port 80), not HTTPS (port 443), as the security group currently only opens port 80.`
    },
    {
      name: 'github-actions-template/deploy.yml',
      icon: <Github className="w-5 h-5 text-gray-700" />,
      description: 'GitHub Actions workflow template. The bootstrap script automatically configures this.',
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
  AWS_REGION: "YOUR_REGION_HERE"
  AWS_ROLE_ARN: "YOUR_ROLE_ARN_HERE"

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
      name: 'bootstrap/main.tf',
      icon: <FileCode2 className="w-5 h-5 text-purple-600" />,
      description: 'Terraform configuration to set up OIDC, S3 State Bucket, and DynamoDB locking.',
      code: `variable "github_repo" { type = string }
variable "aws_region" { type = string default = "us-east-1" }
variable "bucket_name" { type = string }

provider "aws" { region = var.aws_region }

resource "aws_s3_bucket" "terraform_state" { bucket = var.bucket_name }
resource "aws_s3_bucket_versioning" "enabled" { 
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute { name = "LockID" type = "S" }
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
    Statement = [{ Action = "sts:AssumeRoleWithWebIdentity", Effect = "Allow", Principal = { Federated = aws_iam_openid_connect_provider.github.arn }, Condition = { StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }, StringLike = { "token.actions.githubusercontent.com:sub" = "repo:\${var.github_repo}:*" } } }]
  })
}

resource "aws_iam_role_policy_attachment" "github_actions_admin" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "github_actions_role_arn" { value = aws_iam_role.github_actions.arn }`
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
      description: 'Main Terraform configuration covering networking, IAM execution role, and Fargate ECS layout.',
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
  name = "ecs-fargate-spot-vpc"
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
              <p className="text-gray-500">Fully Automated AWS Bootstrapping & GitHub Actions Setup.</p>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm">1</span>
                Export
              </div>
              <p className="text-sm text-gray-600">Export this project to GitHub. The template is ready to go!</p>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm">2</span>
                Run Bootstrap Script
              </div>
              <p className="text-sm text-gray-600">Open your terminal in the repo folder and run <code>bash bootstrap.sh</code>. It does everything for you.</p>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm">3</span>
                Push & Run Actions
              </div>
              <p className="text-sm text-gray-600">Commit the script changes to GitHub. Go to Actions tab and click "Run workflow"!</p>
            </div>
          </div>
        </div>

        {/* Files */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Command className="w-5 h-5" /> Generated Code
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

        {/* Note */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-green-800">
          <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Ready for Production</h4>
          <p className="text-sm">
            This workspace now generates the full AWS native CI/CD workflow, utilizing secure passwordless OIDC, and configures a remote S3 state backend. Run <code>bash bootstrap.sh</code> to configure it to your specific AWS account in seconds.
          </p>
        </div>

      </div>
    </div>
  );
}


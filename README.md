# AWS ECS Fargate Spot GitHub Actions Deployer

This repository contains everything you need to deploy a simple "Hello World" Docker container to AWS ECS using Fargate Spot instances, orchestrated by GitHub Actions and Terraform.

It uses **OIDC (OpenID Connect)**, which means you do not need to store long-lived AWS IAM secrets in GitHub.

---

## 🚀 Quickstart Bootstrapping

We have fully automated the setup process. You no longer need to manually copy ARNs, manually set the `github_repo` variable, move template files, or manually setup your Terraform S3 backend.

To configure OIDC, your Remote Backend, and your workflows all at once, open your terminal at the root of this project and run:

```bash
bash bootstrap.sh
```

**The script will prompt you for:**
1. Your GitHub repository name (e.g., `octocat/my-ecs-demo`). *(This handles the github_repo variable for you!)*
2. Your desired AWS region.
3. A globally unique name for a new S3 bucket to securely store your Terraform state.

The script will automatically provision the AWS OIDC identity, create the state bucket with DynamoDB locking, configure your GitHub Actions YAML file, and generate `terraform/backend.tf`.

---

## ☁️ How to Deploy

Once you have run the `bootstrap.sh` script, committed the generated files, and pushed the code to your GitHub repository:

1. Go to the **Actions** tab in your GitHub repository.
2. Select the **Deploy ECS App with Terraform** workflow on the left.
3. Click the **Run workflow** button on the right.
4. Keep the action set to **`apply`** and click the green button.
5. GitHub Actions will securely assume your AWS role via OIDC and deploy the VPC, ECS Cluster, and Fargate tasks automatically.

---

## 🗑️ How to Tear Down / Destroy

To avoid AWS charges, you can cleanly tear down the infrastructure directly from GitHub Actions:

1. Go to the **Actions** tab > **Deploy ECS App with Terraform**.
2. Click **Run workflow**.
3. Change the action dropdown from `apply` to **`destroy`**.
4. Click Run. Terraform will securely delete all the AWS resources it created.

---

## 🔍 Troubleshooting & Verification

**Important Note:** This project deploys to **AWS ECS (Elastic Container Service)**, which is Amazon's native container orchestration service, **NOT** Kubernetes (EKS). Therefore, tools like `kubectl` are not used here. Instead, you use the AWS CLI or the AWS Management Console to inspect your deployments.

Here are the equivalent AWS CLI commands to verify your deployment (similar to common `kubectl` commands):

### 1. View Clusters (Like `kubectl get nodes / namespaces`)
```bash
aws ecs list-clusters
```

### 2. View Services (Like `kubectl get deployments`)
```bash
aws ecs list-services --cluster hello-world-cluster
aws ecs describe-services --cluster hello-world-cluster --services hello-world-service
```

### 3. View Tasks (Like `kubectl get pods`)
```bash
aws ecs list-tasks --cluster hello-world-cluster
aws ecs describe-tasks --cluster hello-world-cluster --tasks <TASK_ID>
```

### 4. Get the Public App URL (Like `kubectl get svc`)
1. Copy the "Network Interface ID" (eni-xxxxxx) from the `describe-tasks` output above.
2. Query EC2 for the public IP attached to that ENI:
```bash
aws ec2 describe-network-interfaces --network-interface-ids eni-xxxxxxxxxxxxxxxxx --query 'NetworkInterfaces[0].Association.PublicIp' --output text
```
3. Open `http://<THAT_IP>` in your browser!

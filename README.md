# AWS ECS Fargate Spot GitHub Actions Deployer

This repository contains everything you need to deploy a simple "Hello World" Docker container to AWS ECS using Fargate Spot instances, orchestrated by GitHub Actions and Terraform.

It uses **OIDC (OpenID Connect)**, which means you do not need to store long-lived AWS IAM secrets in GitHub.

---

## 🛠️ What Files to Edit Before Deploying

Before you can run the GitHub Action, you need to configure the project for your specific AWS and GitHub environments.

### 1. `terraform/oidc.tf` (Run this locally FIRST)
GitHub Actions needs an IAM Role to assume. You must create this role *once* from your local machine before the pipeline can deploy the rest of the application.
* **Edit:** Change the `github_repo` variable default value to your actual org/repo (e.g., `timo/my-ecs-repo`).
* **Action:** Ensure your AWS CLI is configured locally, then use target applying so you *only* build the OIDC role for now:
  ```bash
  cd terraform
  terraform init
  terraform apply -target=aws_iam_role.github_actions -target=aws_iam_openid_connect_provider.github -target=aws_iam_role_policy_attachment.github_actions_admin
  ```
* **Result:** Terraform will output a `github_actions_role_arn`. Copy this for the next step.

### 2. `github-actions-template/deploy.yml` (The Pipeline)
* **Edit:** Paste the `github_actions_role_arn` (from Step 1) into the `AWS_ROLE_ARN` environment variable.
* **Edit (Optional):** Change `AWS_REGION` if you don't want to use `us-east-1`.
* **Action:** Move this file into the official GitHub Actions folder path within your repo: `.github/workflows/deploy.yml`.

### 3. `terraform/main.tf` (Crucial for CI/CD)
By default, this repository uses *local* state. If GitHub Actions runs twice using local state on ephemeral runners, it will forget what it built the first time and fail.
* **Edit:** Uncomment the `backend "s3" { ... }` block at the top of the file.
* **Edit:** Replace `bucket = "my-terraform-state-bucket"` with the name of an actual, existing S3 bucket in your AWS account. *(Note: You must create this bucket manually in AWS first if you haven't already).*

### 4. `terraform/variables.tf` (Infrastructure Config)
* **Edit (Optional):** Update the `aws_region` default to match if you changed it in the pipeline workflow.
* **Edit (Optional):** Update `vpc_cidr` to your desired VPC IP range if you want to change it from the default `10.42.0.0/16`.

---

## 🚀 How to Deploy

Once you have made the edits above, committed, and pushed the code to your GitHub repository:

1. Go to the **Actions** tab in your GitHub repository.
2. Select the **Deploy ECS App with Terraform** workflow on the left.
3. Click the **Run workflow** button on the right.
4. Keep the action set to **`apply`** and click the green check button.
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
Check that your ECS cluster deployed successfully:
```bash
aws ecs list-clusters
```

### 2. View Services (Like `kubectl get deployments`)
List the services running in your cluster to ensure the `hello-world-service` is active:
```bash
aws ecs list-services --cluster hello-world-cluster
```
To see detailed status of the service (desired vs. running count):
```bash
aws ecs describe-services --cluster hello-world-cluster --services hello-world-service
```

### 3. View Tasks (Like `kubectl get pods`)
In ECS, containers run inside "Tasks" (equivalent to Pods). To list running tasks:
```bash
aws ecs list-tasks --cluster hello-world-cluster
```
To get the details of a specific task (replace `<TASK_ID>` with an ID from the output above):
```bash
aws ecs describe-tasks --cluster hello-world-cluster --tasks <TASK_ID>
```

### 4. Get the Public App URL (Like `kubectl get svc`)
If your task is running, it will have a public IP address (since we put it in a public subnet for this demo). To find it using the CLI:
1. Copy the "Network Interface ID" (eni-xxxxxx) from the `describe-tasks` output above.
2. Query EC2 for the public IP attached to that ENI:
```bash
aws ec2 describe-network-interfaces --network-interface-ids eni-xxxxxxxxxxxxxxxxx --query 'NetworkInterfaces[0].Association.PublicIp' --output text
```
3. Open `http://<THAT_IP>` in your browser!

**(Pro Tip: It is usually much faster to just log into the AWS Console > ECS > Clusters > Tasks > click the Task ID > look for "Public IP" under the Networking tab!).**

### Common Issues
* **Tasks keep stopping/restarting (Like `CrashLoopBackOff`):** This usually means the Docker container is crashing on startup. Check the AWS CloudWatch logs for your ECS Task.
* **Cannot reach the IP:** Ensure you are accessing over HTTP (port 80), not HTTPS (port 443), as the security group currently only opens port 80.

# This file sets up the OIDC Provider and IAM Role for GitHub Actions.
# NOTE: You must apply this locally ONCE using your personal AWS credentials 
# before GitHub Actions can use the OIDC role to deploy the rest of the infrastructure.

variable "github_repo" {
  description = "GitHub repository in the format org/repo (e.g., my-org/my-repo)"
  type        = string
  default     = "YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"
}

# 1. Create the OIDC Provider for GitHub Actions
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"] # GitHub's OIDC thumbprints
}

# 2. Create the IAM Role that GitHub Actions will assume
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
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
          }
        }
      }
    ]
  })
}

# 3. Attach AdministratorAccess (or scope this down for production!)
resource "aws_iam_role_policy_attachment" "github_actions_admin" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "github_actions_role_arn" {
  description = "The ARN of the IAM Role for GitHub Actions to assume"
  value       = aws_iam_role.github_actions.arn
}

variable "project_name" {
  type        = string
  description = "Project name used as prefix for all resources"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, prod)"
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be dev or prod"
  }
}

variable "region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "remote_state_bucket" {
  type        = string
  description = "S3 bucket name for remote state (from bootstrap_state)"
}

variable "cors_allow_origins" {
  type        = list(string)
  description = "CORS allowed origins for API Gateway"
  default     = ["*"]
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default     = {}
}

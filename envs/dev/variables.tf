variable "project_name" {
  type    = string
  default = "fp-aws-serverless-sample-1"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "tags" {
  type = map(string)
  default = {
    Project     = "fp-aws-serverless-sample-1"
    Environment = "dev"
  }
}

variable "cors_allow_origins" {
  type    = list(string)
  default = ["*"]
}

# Latency injection controls for dev
variable "inject_latency_post_pct" {
  type    = number
  default = 0
}

variable "inject_latency_post_ms" {
  type    = number
  default = 0
}

variable "inject_latency_get_pct" {
  type    = number
  default = 0
}

variable "inject_latency_get_ms" {
  type    = number
  default = 0
}

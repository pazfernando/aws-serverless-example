variable "project_name" {
  type    = string
  default = "fp-aws-serverless-sample-1"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "tags" {
  type    = map(string)
  default = {}
}

# Remote state backend configuration
terraform {
  backend "s3" {
    bucket         = "fp-aws-serverless-sample-1-tf-state"
    key            = "stateful/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "fp-aws-serverless-sample-1-tf-locks"
    encrypt        = true
  }
}

# Configure your remote state after running the bootstrap stack
# Example:
# terraform {
#   backend "s3" {
#     bucket         = "tf-state-your-bucket"
#     key            = "fp-aws-serverless-sample-1/dev/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "tf-locks-your-table"
#     encrypt        = true
#   }
# }

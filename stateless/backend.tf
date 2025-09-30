# Configure your remote state after running the bootstrap stack
# Uncomment and update with your bootstrap_state outputs
# terraform {
#   backend "s3" {
#     bucket         = "fp-aws-serverless-sample-1-tf-state"
#     key            = "stateless/ENV_NAME/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "fp-aws-serverless-sample-1-tf-locks"
#     encrypt        = true
#   }
# }

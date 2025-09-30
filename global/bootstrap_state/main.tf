locals {
  bucket_name = "${var.project_name}-tf-state"
  table_name  = "${var.project_name}-tf-locks"
}

resource "aws_s3_bucket" "state" {
  bucket        = local.bucket_name
  force_destroy = true
  tags          = var.tags
}

resource "aws_dynamodb_table" "locks" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute { 
    name = "LockID" 
    type = "S" 
  }

  tags = var.tags
}
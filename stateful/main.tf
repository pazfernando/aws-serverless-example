locals {
  name_site_bucket = "${var.project_name}-site-${var.environment}"
  name_logs_bucket = "${var.project_name}-logs-${var.environment}"
  dynamodb_table_name = "${var.project_name}-visits-${var.environment}"
}

# Logging bucket shared
resource "aws_s3_bucket" "logs" {
  bucket        = local.name_logs_bucket
  force_destroy = true
  tags          = var.tags
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule { object_ownership = "BucketOwnerPreferred" }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket                  = aws_s3_bucket.logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Static site bucket
module "s3_site" {
  source              = "../modules/s3_static_site"
  bucket_name         = local.name_site_bucket
  logging_bucket_name = local.name_logs_bucket
  tags                = var.tags
}

data "aws_s3_bucket" "site" {
  bucket = module.s3_site.bucket_id
}

# CloudFront in front of S3 with OAC
module "cdn" {
  source                         = "../modules/cloudfront_distribution"
  project_name                   = var.project_name
  name                           = "site"
  s3_bucket_regional_domain_name = data.aws_s3_bucket.site.bucket_regional_domain_name
  logging_bucket_domain_name     = aws_s3_bucket.logs.bucket_domain_name
  tags                           = var.tags
}

# Allow CloudFront to read from the S3 bucket (OAC SourceArn)
resource "aws_s3_bucket_policy" "site" {
  bucket = module.s3_site.bucket_id
  policy = data.aws_iam_policy_document.allow_cf.json
}

data "aws_iam_policy_document" "allow_cf" {
  statement {
    sid = "AllowCloudFrontServicePrincipalReadOnly"
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions = ["s3:GetObject"]
    resources = ["${module.s3_site.bucket_arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [module.cdn.distribution_arn]
    }
  }
}

# DynamoDB table for application data
module "visits_table" {
  source     = "../modules/dynamodb_table"
  table_name = local.dynamodb_table_name
  tags       = var.tags
}

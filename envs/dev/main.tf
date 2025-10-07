locals {
  name_site_bucket     = "${var.project_name}-site-dev"
  name_logs_bucket     = "${var.project_name}-logs"
  lambda_src_dir       = "${path.root}/../../functions/crud-visit"
  lambda_function_name = "crud-visit"
  dynamodb_table_name  = "${var.project_name}-visits"
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

module "s3_site" {
  source              = "../../modules/s3_static_site"
  bucket_name         = local.name_site_bucket
  logging_bucket_name = local.name_logs_bucket
  tags                = var.tags
}
data "aws_s3_bucket" "site" {
  bucket = module.s3_site.bucket_id
}

# CloudFront in front of S3 with OAC
module "cdn" {
  source                         = "../../modules/cloudfront_distribution"
  project_name                   = var.project_name
  name                           = "site"
  s3_bucket_regional_domain_name = data.aws_s3_bucket.site.bucket_regional_domain_name
  logging_bucket_domain_name     = "${aws_s3_bucket.logs.bucket_domain_name}"
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

# DynamoDB table
module "visits_table" {
  source     = "../../modules/dynamodb_table"
  table_name = local.dynamodb_table_name
  tags       = var.tags
}

# Lambda for CRUD
module "crud_lambda" {
  source             = "../../modules/lambda_function"
  project_name       = var.project_name
  function_name      = local.lambda_function_name
  source_dir         = local.lambda_src_dir
  runtime            = "nodejs20.x"
  handler            = "index.handler"
  environment        = {
    TABLE_NAME = module.visits_table.table_name
    REGION     = var.region,
    INJECT_LATENCY_POST_PCT = tostring(var.inject_latency_post_pct)
    INJECT_LATENCY_POST_MS  = tostring(var.inject_latency_post_ms)
    INJECT_LATENCY_GET_PCT  = tostring(var.inject_latency_get_pct)
    INJECT_LATENCY_GET_MS   = tostring(var.inject_latency_get_ms)
    AWS_LAMBDA_EXEC_WRAPPER     = "/opt/otel-instrument"
    OTEL_TRACES_EXPORTER        = "otlp"
    OTEL_EXPORTER_OTLP_PROTOCOL = "grpc"
    OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4317"
    OTEL_PROPAGATORS            = "xray"
  }
  dynamodb_table_arn = module.visits_table.table_arn
  enable_dynamodb_access = true
  layers            = [
    "arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroJs:9"
  ]
  tags               = var.tags
}

# API Gateway for Lambda proxy
module "http_api" {
  source               = "../../modules/api_gateway_http"
  project_name         = var.project_name
  name                 = "api"
  lambda_invoke_arn    = module.crud_lambda.function_arn
  lambda_function_name = module.crud_lambda.function_name
  cors_allow_origins   = var.cors_allow_origins
  tags                 = var.tags
}

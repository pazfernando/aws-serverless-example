locals {
  lambda_src_dir       = "${path.root}/../functions/crud-visit"
  lambda_function_name = "crud-visit"
}

# Data source to read stateful outputs
data "terraform_remote_state" "stateful" {
  backend = "s3"
  config = {
    bucket = var.remote_state_bucket
    key    = "stateful/${var.environment}/terraform.tfstate"
    region = var.region
  }
}

# Lambda for CRUD operations
module "crud_lambda" {
  source             = "../modules/lambda_function"
  project_name       = var.project_name
  function_name      = local.lambda_function_name
  source_dir         = local.lambda_src_dir
  runtime            = "nodejs20.x"
  handler            = "index.handler"
  environment        = {
    TABLE_NAME = data.terraform_remote_state.stateful.outputs.dynamodb_table_name
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
  dynamodb_table_arn = data.terraform_remote_state.stateful.outputs.dynamodb_table_arn
  enable_dynamodb_access = true
  layers            = [
    "arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroJs:9"
  ]
  tags               = var.tags
}

# API Gateway for Lambda proxy
module "http_api" {
  source               = "../modules/api_gateway_http"
  project_name         = var.project_name
  name                 = "api"
  lambda_invoke_arn    = module.crud_lambda.function_arn
  lambda_function_name = module.crud_lambda.function_name
  cors_allow_origins   = var.cors_allow_origins
  tags                 = var.tags
}

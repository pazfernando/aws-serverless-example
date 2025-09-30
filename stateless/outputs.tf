output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.http_api.api_endpoint
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.crud_lambda.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = module.crud_lambda.function_arn
}

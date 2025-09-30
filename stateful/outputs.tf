output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = module.cdn.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cdn.distribution_id
}

output "site_bucket_id" {
  description = "S3 bucket ID for static site"
  value       = module.s3_site.bucket_id
}

output "site_bucket_arn" {
  description = "S3 bucket ARN for static site"
  value       = module.s3_site.bucket_arn
}

output "logs_bucket_id" {
  description = "S3 bucket ID for logs"
  value       = aws_s3_bucket.logs.id
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = module.visits_table.table_name
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = module.visits_table.table_arn
}

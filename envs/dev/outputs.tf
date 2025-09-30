output "cloudfront_domain" { value = module.cdn.domain_name }
output "api_endpoint" { value = module.http_api.api_endpoint }
output "site_bucket" { value = module.s3_site.bucket_id }
output "dynamodb_table" { value = module.visits_table.table_name }

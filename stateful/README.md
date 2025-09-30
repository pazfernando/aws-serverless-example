# Stateful Infrastructure

This layer contains all resources that store persistent data:

- **S3 Buckets**: Static site content and logs
- **CloudFront**: CDN for content distribution
- **DynamoDB**: Application data storage

## Resources

- S3 bucket for static site (`{project_name}-site-{env}`)
- S3 bucket for logs (`{project_name}-logs-{env}`)
- CloudFront distribution with OAC
- DynamoDB table (`{project_name}-visits-{env}`)

## Deployment

### 1. Configure environment variables

```bash
cd stateful
cp environments/dev.tfvars.example environments/dev.tfvars
# Edit environments/dev.tfvars as needed
```

### 2. Initialize and deploy

```bash
# For dev environment
terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars

# For prod environment
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

## Outputs

This layer exports outputs that are consumed by the stateless layer:

- `cloudfront_domain` - CloudFront distribution domain
- `site_bucket_id` - S3 bucket for static content
- `dynamodb_table_name` - DynamoDB table name
- `dynamodb_table_arn` - DynamoDB table ARN

## Important Notes

⚠️ **Careful with destroy operations!** This layer contains data. Always backup before destroying:

```bash
# Backup S3 content
aws s3 sync s3://your-bucket ./backup/

# Export DynamoDB data
aws dynamodb scan --table-name your-table > backup/table.json
```

## Teardown

⚠️ **IMPORTANT**: Destroy in reverse order! Always destroy the **stateless** layer first before destroying this stateful layer.

```bash
# Step 1: Destroy stateless layer first
cd ../stateless
terraform destroy -var-file=environments/dev.tfvars -auto-approve

# Step 2: Then destroy stateful layer
cd ../stateful
terraform destroy -var-file=environments/dev.tfvars -auto-approve
```

This prevents dependency errors since the stateless layer depends on resources in this layer.

## Remote State

Outputs from this layer are stored in S3 backend and consumed by the stateless layer via `terraform_remote_state` data source.

# Stateless Infrastructure

This layer contains ephemeral compute resources without persistent state:

- **Lambda Functions**: Code execution without state
- **API Gateway**: HTTP routing

## Resources

- Lambda function for CRUD operations
- API Gateway HTTP API
- IAM roles and policies

## Dependencies

This layer depends on the **stateful** layer and reads its outputs via `terraform_remote_state`:

- DynamoDB table name and ARN (for Lambda environment variables and permissions)

## Deployment

### 1. Ensure stateful layer is deployed first

```bash
cd ../stateful
terraform apply -var-file=environments/dev.tfvars
```

### 2. Configure environment variables

```bash
cd ../stateless
cp environments/dev.tfvars.example environments/dev.tfvars
# Edit environments/dev.tfvars - ensure remote_state_bucket matches bootstrap output
```

### 3. Initialize and deploy

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

- `api_endpoint` - API Gateway URL
- `lambda_function_name` - Lambda function name
- `lambda_function_arn` - Lambda function ARN

## Development Workflow

This layer can be destroyed and recreated without data loss:

```bash
terraform destroy -var-file=environments/dev.tfvars
# Make code changes
terraform apply -var-file=environments/dev.tfvars
```

Perfect for rapid iteration and CI/CD pipelines.

## Teardown

✅ This stateless layer should be destroyed **FIRST** before destroying the stateful layer:

```bash
# Step 1: Destroy this stateless layer
cd stateless
terraform destroy -var-file=environments/dev.tfvars -auto-approve

# Step 2: Then destroy stateful layer
cd ../stateful
terraform destroy -var-file=environments/dev.tfvars -auto-approve
```

This prevents dependency errors since this layer depends on the stateful layer's outputs.

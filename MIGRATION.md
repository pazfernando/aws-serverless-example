# Migration Guide: Old Structure → New Hybrid Architecture

## What Changed?

The project has been reorganized from environment-based to a hybrid layer-based architecture:

### Old Structure (envs/dev/)
```
envs/dev/
  ├── main.tf          # All resources together
  ├── variables.tf
  ├── outputs.tf
  └── backend.tf
```

### New Structure
```
├── stateful/         # Persistent data layer
│   ├── main.tf       # S3, CloudFront, DynamoDB
│   └── environments/
│       ├── dev.tfvars
│       └── prod.tfvars.example
└── stateless/        # Ephemeral compute layer
    ├── main.tf       # Lambda, API Gateway
    └── environments/
        ├── dev.tfvars
        └── prod.tfvars.example
```

## Why This Change?

**Separation of Concerns:**
- **Stateful**: Resources with data (S3, DynamoDB, CloudFront) - rarely change
- **Stateless**: Code/compute (Lambda, API Gateway) - frequently updated

**Benefits:**
1. ✅ Safe to destroy/recreate stateless without data loss
2. ✅ Independent deployment cycles
3. ✅ Better for CI/CD (deploy code without touching data)
4. ✅ Easier disaster recovery
5. ✅ Clear backup strategy (only stateful needs backup)

## Migration Steps

### If You Have Active Infrastructure

**Option A: Clean Migration (Recommended for dev)**

1. Export data:
```bash
# Backup DynamoDB
aws dynamodb scan --table-name fp-aws-serverless-sample-1-visits > backup.json

# Backup S3
aws s3 sync s3://fp-aws-serverless-sample-1-site-dev ./s3-backup/
```

2. Destroy old infrastructure:
```bash
cd envs/dev
terraform destroy -auto-approve
```

3. Deploy new infrastructure:
```bash
# Deploy stateful
cd ../../stateful
terraform init
terraform apply -var-file=environments/dev.tfvars

# Deploy stateless
cd ../stateless
terraform init
terraform apply -var-file=environments/dev.tfvars
```

4. Restore data if needed

**Option B: State Migration (Advanced)**

Use `terraform state mv` to migrate resources to new state files. Contact DevOps team for assistance.

### If Starting Fresh

Simply follow the deployment instructions in the main README.md

## Key Differences

### Variable Changes

**Old (envs/dev/terraform.tfvars):**
```hcl
project_name = "fp-aws-serverless-sample-1"
region = "us-east-1"
```

**New (stateful/environments/dev.tfvars):**
```hcl
project_name = "fp-aws-serverless-sample-1"
environment  = "dev"  # NEW: explicit environment
region = "us-east-1"
```

**New (stateless/environments/dev.tfvars):**
```hcl
project_name = "fp-aws-serverless-sample-1"
environment  = "dev"
region = "us-east-1"
remote_state_bucket = "fp-aws-serverless-sample-1-tf-state"  # NEW: required
```

### Resource Naming

Bucket names now include environment suffix:
- Old: `fp-aws-serverless-sample-1-site-dev` (hardcoded)
- New: `fp-aws-serverless-sample-1-site-${var.environment}` (dynamic)

## Deployment Order

**IMPORTANT:** Always deploy in this order:

1. `global/bootstrap_state` (once)
2. `stateful/` (when data resources change)
3. `stateless/` (for code updates)

## Rollback Plan

If issues arise:
1. Keep old `envs/` directory until confirmed working
2. State files are separate, so rollback is clean
3. Can run both old and new in parallel (with different names)

## Questions?

- Check `stateful/README.md` for stateful layer details
- Check `stateless/README.md` for stateless layer details
- Run tests: `cd tests && ./run-post-tests.sh`
